# 数据库缺漏字段和写入逻辑分析

## 一、MatchRecord 缺失字段

### 1.1 `gameState` 字段缺失

**问题描述**：
- PRD中提到需要展示"是否观战"（`game.game_state`）
- GlobalMatchData中有 `game.game_state?: Dota2GameState`
- 但MatchRecord中未存储该字段

**影响**：
- 无法在比赛列表和详情页展示"是否观战"状态
- 无法根据观战状态筛选比赛

**建议修复**：
```typescript
// src/shared/types/database.ts
export interface MatchRecord {
  // ... 现有字段
  gameState?: Dota2GameState  // 新增：是否观战
}
```

**写入逻辑修复**：
```typescript
// src/background/repositories/matches.ts
async createOrUpdateFromState(state: GlobalMatchData, options: UpsertOptions = {}): Promise<MatchRecord> {
  // ...
  const record: MatchRecord = {
    // ... 现有字段
    gameState: state.game.game_state,  // 新增
  }
  // ...
}

async finalizeFromState(state: GlobalMatchData): Promise<MatchRecord> {
  // ...
  record.gameState = state.game.game_state ?? record.gameState  // 新增
  // ...
}
```

### 1.2 `matchState` 字段缺失

**问题描述**：
- GlobalMatchData中有 `game.match_state?: Dota2MatchState`
- 可能对调试和问题追踪有用
- MatchRecord中未存储

**影响**：
- 无法追溯比赛的具体状态（如STRATEGY_TIME、GAME_IN_PROGRESS等）
- 调试时无法知道比赛在哪个状态被记录

**建议修复**（可选，用于调试）：
```typescript
export interface MatchRecord {
  // ...
  matchState?: Dota2MatchState  // 可选：用于调试
}
```

### 1.3 `myTeam` 字段缺失

**问题描述**：
- GlobalMatchData中有 `me.team?: Dota2TeamKey`
- 虽然可以从players数组中查找me的team，但单独存储更高效
- MatchRecord中只有playerId（me的steam_id），没有team

**影响**：
- 计算胜负时需要从players数组中查找me的team，性能较差
- 如果players数组数据不完整，无法判断胜负

**建议修复**：
```typescript
export interface MatchRecord {
  // ...
  myTeam?: Dota2TeamKey  // 新增：我的队伍（radiant/dire）
}
```

**写入逻辑修复**：
```typescript
const record: MatchRecord = {
  // ...
  playerId: state.me.steam_id,
  myTeam: state.me.team,  // 新增
  // ...
}
```

### 1.4 `createdAt` 写入逻辑错误

**问题描述**：
- 当前代码：`createdAt: existing?.createdAt ?? timestamp`
- 如果existing存在，应该保持原值，但代码逻辑是对的
- **但实际上**：如果existing不存在但allowCreate=false，会创建新记录但不会保存，可能造成混乱

**建议修复**：
```typescript
async createOrUpdateFromState(state: GlobalMatchData, options: UpsertOptions = {}): Promise<MatchRecord> {
  const { allowCreate = true } = options
  const matchId = state.match_info.pseudo_match_id
  if (!matchId) {
    throw new Error('Missing match_id in GlobalMatchData')
  }

  const existing = await db.matches.where('matchId').equals(matchId).first()
  
  // 如果存在且已完成（有winner），直接返回
  if (existing && existing.winner != null) {
    return existing
  }

  const timestamp = Date.now()
  const rosterPlayers = this.filterPlayers(state.roster.players)

  // 如果existing存在，保持原有createdAt；否则使用当前时间戳
  const record: MatchRecord = {
    uuid: existing?.uuid ?? generateId(),
    createdAt: existing?.createdAt ?? timestamp,  // ✅ 逻辑正确，但需要确认：existing存在时是否应该更新？
    updatedAt: timestamp,
    matchId,
    playerId: state.me.steam_id,
    gameMode: state.match_info.game_mode,
    winner: state.game.winner ?? undefined,
    teamScore: state.match_info.team_score,
    players: rosterPlayers,
  }

  // 修复：如果没有existing且不允许创建，应该在这里抛出错误
  if (!existing && !allowCreate) {
    throw new Error(`Match record ${matchId} not found and creation not allowed`)
  }

  await db.matches.put(record)
  return record
}
```

## 二、PlayerRecord 写入逻辑问题

### 2.1 `createdAt` 写入逻辑错误

**问题描述**：
```typescript
// src/background/repositories/players.ts:38
createdAt: existing?.createdAt ?? timestamp,
```
- 如果existing存在，应该保持原值（逻辑正确）
- 但如果existing不存在，使用当前timestamp作为createdAt（正确）
- **但问题**：在同步时，如果玩家是新玩家，createdAt应该是第一次遇到的时间，而不是当前时间

**当前逻辑分析**：
- `syncFromMatch` 在比赛开始时和结束时都会被调用
- 如果在比赛开始时就调用，createdAt会是比赛开始时间（合理）
- 如果在比赛结束时才调用，createdAt会是比赛结束时间（不合理，应该是第一次遇到的时间）

**建议修复**：
```typescript
async syncFromMatch(state: GlobalMatchData): Promise<void> {
  const players = filterRosterPlayers(state.roster.players)
  if (!players.length) return

  const matchId = state.match_info.pseudo_match_id
  const timestamp = Date.now()

  const executor = async () => {
    for (const player of players) {
      if (!player.steamId) continue
      const existing = await db.players.where('playerId').equals(player.steamId).first()
      
      // 如果玩家已存在，保持原有createdAt；否则使用当前时间（第一次遇到的时间）
      const createdAt = existing?.createdAt ?? timestamp
      
      const matchList = existing?.matchList ?? []
      if (matchId && !matchList.includes(matchId)) {
        matchList.push(matchId)
      }
      // ... 其他逻辑
      
      const record: PlayerRecord = {
        uuid: existing?.uuid ?? generateId(),
        createdAt,  // ✅ 保持原有逻辑，但需要确认：第一次遇到的时间是什么时候？
        updatedAt: timestamp,
        playerId: player.steamId,
        name: player.name ?? existing?.name,
        nameList,
        heroList,
        matchList,
      }
      await db.players.put(record)
    }
  }
  // ...
}
```

**关键问题**：
- 需要明确：`createdAt` 应该是玩家第一次被记录的时间（比赛开始时间）还是当前时间？
- 建议：应该是比赛开始时间，即第一次调用`syncFromMatch`时的时间

### 2.2 `nameList` 和 `heroList` 的去重逻辑

**当前逻辑**：
```typescript
const nameList = existing?.nameList ?? []
if (player.name && !nameList.includes(player.name)) {
  nameList.push(player.name)
}
```

**问题**：
- 如果玩家改回了之前的名字，会被重复添加吗？不会（因为已经有检查）
- 但如果玩家名字更新为空，然后又有名字，会有问题吗？需要检查

**建议**：
- 当前逻辑基本正确
- 但建议添加：如果current name不在nameList中，即使它和existing.name相同，也应该添加到nameList

## 三、数据库索引问题

### 3.1 索引名称不一致

**PRD中的索引**：
- `match_id`：唯一索引
- `player_id`：索引
- `end_time`：索引（用于时间范围查询）
- `match_mode`：索引（用于按模式筛选）

**实际代码中的索引**：
```typescript
// src/background/db.ts:46
matches: 'uuid, matchId, playerId, updatedAt, gameMode, winner',
```

**对比**：
- ✅ `matchId` 对应 `match_id`（名称一致）
- ✅ `playerId` 对应 `player_id`（名称一致）
- ✅ `updatedAt` 对应 `end_time`（虽然名称不同，但用途一致）
- ✅ `gameMode` 对应 `match_mode`（虽然名称不同，但用途一致）
- ✅ `winner` 索引存在（用于筛选胜负）

**问题**：
- 索引名称与PRD不完全一致（但这不影响功能）
- 实际索引更合理（使用了驼峰命名）

### 3.2 缺失的索引

**建议添加的索引**：
- `gameState`：如果添加了gameState字段，应该添加索引用于筛选
- `myTeam`：如果添加了myTeam字段，可能不需要索引（因为主要用于计算，不常用于筛选）

## 四、winner 字段类型不一致

### 4.1 类型定义问题

**PRD中的描述**：
> winner 计算字段，通过winner+players中steamId和me一致的玩家的team对比得知玩家是否胜利，如果没有结果显示为空 boolean

**实际代码**：
```typescript
winner?: Dota2TeamKey | undefined  // 存储原始值（radiant/dire/none）
```

**问题分析**：
- PRD说winner是boolean（计算字段）
- 实际代码中存储的是Dota2TeamKey（原始值）
- **这是正确的设计**：应该存储原始值，在查询/展示时再计算boolean

**建议**：
- 保持当前设计（存储Dota2TeamKey）
- 但在PRD中明确说明：winner字段存储的是原始值，需要结合myTeam计算胜负
- 或者添加一个计算字段 `isWin?: boolean` 用于快速查询

## 五、数据一致性问题

### 5.1 事务处理

**当前实现**：
```typescript
// players.ts:50-54
if (Dexie.currentTransaction) {
  await executor()
} else {
  await db.transaction('readwrite', db.players, executor)
}
```

**问题**：
- `syncFromMatch` 和 `createOrUpdateFromState` 不在同一个事务中
- 如果match创建成功但players同步失败，数据会不一致

**建议修复**：
```typescript
// src/background/index.ts
// 在比赛开始时，确保match和players在同一个事务中
if (signal === 'start') {
  try {
    await db.transaction('readwrite', db.matches, db.players, async () => {
      const match = await this.matchesRepository.createOrUpdateFromState(state, { allowCreate: true })
      this.currentMatch = match
      await this.playersRepository.syncFromMatch(state)
    })
    backgroundEventBus.emit('match:start')
    await this.windowManager.showHistory()
  } catch (error) {
    this.logger.error('Failed to process match start', error)
  }
}
```

### 5.2 matchList 维护时机

**当前逻辑**：
- `syncFromMatch` 在比赛开始和结束时都会被调用
- 在比赛开始时，matchId可能还没有（pseudo_match_id可能为空）
- 在比赛结束时，matchId应该已经存在

**问题**：
- 如果比赛开始时pseudo_match_id为空，matchList不会更新
- 需要在finalize时再次确保matchList更新

**建议**：
- 在`finalizeFromState`之后，再次调用`syncFromMatch`确保matchList更新（当前代码已有）

## 六、总结

### 必须修复的问题

1. **添加 `gameState` 字段**（PRD要求，用于展示"是否观战"）
2. **添加 `myTeam` 字段**（提高胜负计算性能）
3. **修复事务处理**（确保match和players数据一致性）

### 建议修复的问题

4. **添加 `matchState` 字段**（用于调试）
5. **优化 `createdAt` 逻辑**（明确第一次遇到的时间）
6. **考虑添加 `isWin` 计算字段**（用于快速筛选）

### 需要明确的业务逻辑

7. **winner字段**：保持存储Dota2TeamKey，但在PRD中明确说明
8. **createdAt时间**：明确是比赛开始时间还是第一次同步时间
9. **nameList更新**：当前逻辑是否需要优化（如果玩家改名后又改回原名）

