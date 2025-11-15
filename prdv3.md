# 主要参考资料
api 文档
https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction
https://dev.overwolf.com/ow-native/reference/ow-api-overview
https://dev.overwolf.com/ow-native/reference/games/events
https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2
https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro
https://github.com/overwolf/events-sample-apps/tree/master/dota-events-sample-app-master

官方 demo 仓库和编译后代码
https://github.com/overwolf/front-app
https://github.com/overwolf/events-sample-apps/tree/master/dota-events-sample-app-master

# 技术栈

- 平台: Overwolf Native
- 前端框架: React 18+ + TypeScript
- UI 框架: TailwindCSS + shadcn/ui
- 数据库: IndexedDB
- 游戏数据: Overwolf GEP (Game Events Provider)
- 打包工具：vite
- 路由方案：React Router v6（MIT License，商业友好）

## 应用架构
### manifest.json 关键要求
- `manifest_version` ≥ 1.1，`type` 为 `App`。版本号、`meta` 信息需与发布计划保持一致。
- `data.start_window` 指向 background 窗口，对应 `src/background/background.html` 或 `index.html`。
- `meta.permissions` 须声明 `Hotkeys`, `Window`, `FileSystem`, `GameInfo`，后续若需要云同步再评估开启 `Profile`, `ExtensionsIO`。
- 在 `launch_events` 中配置 `game_launch`，`game_ids: [7314]`，确保 Dota 2 启动时打开应用。
- 需显式设定 `externally_connectable.matches`，默认关闭第三方网页通信，降低安全风险。
- 采用 `overwolf.front_app` 示例中的 `manifest.json` 作为基础模板，结合项目窗口需求调整。

### 窗口定义约束
- `background`：隐藏窗口，`resizable=false`，尺寸 400×400，`allow_scripts_to_close_window=true`。
- `desktop`：桌面 UI 窗口，`transparent` + `clickthrough=false`，默认尺寸 1280×720，`in_game_only=false`。
- `ingame`：游戏覆盖窗口，默认 960×540，`grab_focus=true`，`in_game_only=true`，需支持拖拽和透明度调节。
- 所有窗口在 manifest 中开启 `mute=false`、`show_in_taskbar=false`、`disable_shadow=true` 以减小性能开销。

### 代码结构建议
```
/public
  manifest.json
  icon.png
/src
  /background
  /desktop
  /ingame
  /shared (hooks、数据模型、i18n)
docs/prdv3.md（本文件，建议放置于 docs 目录统一管理）
```
参考 `overwolf/front-app` 项目的窗口组织和通信方式，保持构建产物与目录结构一致。

### 开发与构建
- 推荐使用 `pnpm`；如使用需开启 `--shamefully-hoist` 兼容 Overwolf runtime。
- Overwolf Desktop Client 版本需 ≥ 0.235 以支持最新 GEP 能力；在 PRD 中体现版本检查逻辑。
- 使用 `vite` 生成 `dist`，再由 Overwolf CLI 打包。确保 `manifest.json` 与 `dist` 中资源路径一致。





# 事件循环
## GEP支持特性
### onNewEvents
game_state_changed 
match_state_changed
match_ended
### onInfoUpdates2
match_info  
roster  
me  

## 生命周期
### 应用初始化
1. BackgroundApp.init() 被调用，执行以下初始化步骤：
   - 加载settings配置并发出 `settings:updated` 事件
   - 注册游戏启动监控（monitorGameLaunch）
   - 注册热键管理器（HotkeyManager）
   - 创建BackgroundApi并暴露到window对象
   - 显示desktop窗口
   - 创建MatchTracker实例（内部维护空的GlobalMatchData）

### dota2监控
通过 `monitorGameLaunch()` 监听游戏启动/关闭状态：
1. 监听 `overwolf.games.onGameInfoUpdated` 事件
2. 检测Dota2启动：通过 `isDota2Launched()` 判断游戏ID是否为7314（Math.floor(id / 10) === 7314）
3. 游戏启动时：调用 `registerGameListeners()` 注册游戏事件监听器
4. 游戏关闭时：调用 `cleanupGameListeners()` 清理监听器并重置MatchTracker状态

### 游戏监听器注册
`registerGameListeners()` 执行以下操作：
1. 检查 `listenersRegistered` 标志，避免重复注册
2. 注册 `onInfoUpdates2` 监听器 → 处理 `handleInfoUpdate`
3. 注册 `onNewEvents` 监听器 → 处理 `handleNewEvents`
4. 调用 `setRequiredFeatures()` 设置所需特性：
   - match_info, match_state_changed, game_state_changed, roster, me, match_ended, gep_internal, game, match
5. 如果设置失败，2秒后重试
6. 设置 `listenersRegistered = true`

### 比赛监控
通过MatchTracker维护全局比赛对象 GlobalMatchData 来监控当前比赛状态：

#### 数据更新流程
1. **初始化**：MatchTracker创建时初始化空的GlobalMatchData（包含match_info, me, roster, game四个空对象）
2. **持续数据迭代**：
   - `handleInfoUpdate()` 处理 `onInfoUpdates2` 事件：
     - `match_info` feature：更新 `pseudo_match_id`, `game_mode`, `team_score`
     - `me` feature：更新 `steam_id`, `team`
     - `roster` feature：更新 `players` 数组（过滤无效玩家，转换team ID为team key）
   - `handleNewEvents()` 处理 `onNewEvents` 事件：
     - `match_state_changed`：更新 `match_state`，检查起点信号
     - `game_state_changed`：更新 `game_state` 和 `match_state`，检查起点信号
     - `match_ended`：更新 `winner`
   - 数据合并策略：只更新非空值（null, undefined, 空数组, 空字符串除外）

#### 起点信号检测
- **触发条件**：`shouldStart()` 方法判断
  - `match_state` 为 `DOTA_GAMERULES_STATE_STRATEGY_TIME` 或 `DOTA_GAMERULES_STATE_GAME_IN_PROGRESS`
  - 且 `active` 标志为 `false`（确保每局只触发一次）
- **触发时机**：在 `handleNewEvents()` 中处理 `match_state_changed` 或 `game_state_changed` 事件时
- **处理流程**：
  1. 设置 `active = true`，标记比赛已开始
  2. 返回 `'start'` 信号
  3. BackgroundApp接收到信号后：
     - 调用 `matchesRepository.createOrUpdateFromState()` 创建/更新比赛记录
     - 调用 `playersRepository.syncFromMatch()` 同步玩家数据
     - 发出 `match:start` 事件
     - 调用 `windowManager.showHistory()` 显示history窗口（不是ingame窗口）

#### 比赛进行中
- 继续接收 `onInfoUpdates2` 和 `onNewEvents` 事件
- 持续更新GlobalMatchData状态
- 可通过 `matchRepository.createOrUpdateFromState()` 更新比赛记录（如果已存在且未结束）

#### 终点信号检测
- **触发条件**：`shouldEnd()` 方法判断
  - `onNewEvents` 事件中任一事件的 `name` 为 `'game_over'` 或 `'match_ended'`
- **处理流程**：
  1. 返回 `'end'` 信号
  2. BackgroundApp接收到信号后：
     - 调用 `matchesRepository.finalizeFromState()` 最终化比赛记录
     - 调用 `playersRepository.syncFromMatch()` 同步玩家数据
     - 调用 `commentsRepository.ensurePlaceholders()` 为所有玩家创建评价占位符
     - 发出 `match:end` 事件
     - 调用 `windowManager.hideHistory()` 隐藏history窗口
     - 调用 `windowManager.showComment()` 显示comment窗口
     - 调用 `matchTracker.reset()` 重置GlobalMatchData和active标志

#### 循环
比赛结束后，MatchTracker状态被重置，等待下一场比赛的起点信号，重复上述流程（从"持续数据迭代"开始）

### 可改进点

#### 1. 游戏监听器注册时机
- **当前问题**：`registerGameListeners()` 在 `init()` 中被注释掉，只在游戏启动时注册
- **潜在问题**：如果应用启动时Dota2已经在运行，监听器不会被注册
- **建议**：
  - 在 `init()` 中检查Dota2是否已在运行，如果是则立即注册监听器
  - 或者在 `monitorGameLaunch()` 中先检查一次游戏状态

#### 2. 监听器注册失败处理
- **当前问题**：`setRequiredFeatures()` 失败时只重试一次（2秒后），没有最大重试次数限制
- **建议**：
  - 添加最大重试次数限制（如3-5次）
  - 重试间隔可以递增（指数退避）
  - 失败后记录错误日志，通知用户

#### 3. 数据更新错误处理
- **当前问题**：`handleInfoUpdate` 和 `handleNewEvents` 中的错误可能被静默忽略
- **建议**：
  - 添加try-catch包装，记录错误日志
  - 对关键数据更新失败进行重试或降级处理

#### 4. 比赛状态一致性
- **当前问题**：`active` 标志在 `shouldStart()` 中设置，但在某些异常情况下可能不会正确重置
- **建议**：
  - 添加状态机管理，明确状态转换
  - 在 `cleanupGameListeners()` 中确保重置 `active` 标志
  - 添加超时机制：如果长时间没有收到终点信号，自动重置状态

#### 5. 窗口显示逻辑
- **当前问题**：
  - 起点信号时显示 `history` 窗口，但文档中描述为 `ingame` 窗口
  - `showHistory()` 和 `showComment()` 会触发自定义事件，但事件名称可能与实际窗口名称不一致
- **建议**：
  - 统一窗口命名规范（history vs ingame）
  - 明确窗口显示的条件和时机
  - 考虑添加窗口显示失败的回退机制

#### 6. 数据持久化时机
- **当前问题**：比赛记录在起点信号时创建，但可能此时数据还不完整
- **建议**：
  - 考虑延迟创建记录，或先创建占位符
  - 添加数据完整性检查，确保关键字段存在后再创建记录
  - 对不完整的记录添加标记，后续补充

#### 7. 并发处理
- **当前问题**：`handleNewEvents` 是异步函数，但可能被快速连续调用
- **建议**：
  - 添加请求队列或锁机制，避免并发更新导致数据不一致
  - 或者确保状态更新是原子操作

#### 8. 监听器清理
- **当前问题**：`cleanupGameListeners()` 中移除监听器可能失败（removeListener可能不存在）
- **建议**：
  - 添加存在性检查：`overwolf?.games?.events?.onInfoUpdates2?.removeListener?.()`
  - 确保所有监听器都被正确清理，避免内存泄漏

#### 9. 游戏状态检测
- **当前问题**：`isDota2Launched()` 只检查游戏ID，没有验证游戏是否真正可用
- **建议**：
  - 添加游戏状态验证（如检查游戏是否在运行且可访问）
  - 考虑添加游戏版本检查，确保兼容性

#### 10. 事件总线使用
- **当前问题**：`match:start` 和 `match:end` 事件发出后，没有确认是否有监听器处理
- **建议**：
  - 添加事件处理确认机制
  - 或者确保所有需要响应这些事件的组件都已正确注册监听器

#### 11. 错误恢复机制
- **当前问题**：如果比赛处理过程中出现错误，状态可能不一致
- **建议**：
  - 添加事务机制，确保数据操作的原子性
  - 添加错误恢复逻辑，在异常情况下重置状态
  - 记录错误上下文，便于调试和问题追踪

#### 12. 性能优化
- **当前问题**：每次调用 `getState()` 都会进行深拷贝（JSON.parse(JSON.stringify)）
- **建议**：
  - 考虑使用更高效的深拷贝方法（如structuredClone）
  - 或者只在必要时进行深拷贝，添加缓存机制
  - 对于频繁访问的状态，考虑使用不可变数据结构


# 数据

## 数据表

### 比赛表 matches
信息量最大的表，完整记录所有比赛信息，根据GlobalMatchData写入。

#### 索引
- `matchId`：唯一索引（用于快速查找比赛）
- `playerId`：索引（用于查找某玩家的所有比赛）
- `updatedAt`：索引（用于时间范围查询和排序）
- `gameMode`：索引（用于按模式筛选）

#### 表设计

| 字段名 | 类型 | 数据来源 | 说明 |
|---|---|---|---|
| `uuid` | string | 自动生成 | 唯一标识符，创建记录时生成，不可修改 |
| `createdAt` | number | 自动生成 | 创建记录时间，毫秒级时间戳 |
| `updatedAt` | number | 自动更新 | 更新记录时间，毫秒级时间戳 |
| `matchId` | string | `match_info.pseudo_match_id` | 比赛唯一标识符 |
| `playerId` | string? | `me.steam_id` | 我的Steam ID，用于关联玩家表 |
| `gameMode` | GameModeInfo? | `match_info.game_mode` | 游戏模式信息（包含lobby_type和game_mode） |
| `teamScore` | TeamScore? | `match_info.team_score` | 比分信息（Radiant和Dire的分数） |
| `winner` | Dota2TeamKey? | `game.winner` | 获胜队伍（radiant/dire），用于计算胜负 |
| `gameState` | Dota2GameState? | `game.game_state` | 游戏状态，用于判断是否观战 |
| `matchState` | Dota2MatchState? | `game.match_state` | 比赛状态 |
| `me` | { steam_id?: string; team?: Dota2TeamKey }? | `me` | 我的信息（steam_id和team） |
| `players` | Dota2Player[]? | `roster.players` | 所有玩家信息数组，包含steamId、name、hero、team、role、team_slot、player_index等 |

#### 数据更新时机
1. **起点信号时**：调用 `createOrUpdateFromState()` 创建比赛记录（如果不存在）或更新已有记录（如果存在但未结束）
2. **比赛进行中**：持续更新比赛记录，同步最新的GlobalMatchData状态
3. **终点信号时**：调用 `finalizeFromState()` 最终化比赛记录，确保所有数据完整

#### 数据完整性要求
- `matchId` 必须存在，否则无法创建记录
- 如果记录已存在且 `winner` 不为空，表示比赛已结束，不再更新
- `players` 数组会被过滤，只保留有效的玩家数据（有steamId的玩家）

---

### 玩家表 players
存储玩家基础信息和统计数据的表，在比赛结束时根据GlobalMatchData和比赛表数据迭代更新。

#### 索引
- `playerId`：唯一索引（主键）
- `updatedAt`：索引（用于时间范围查询和排序）

#### 表设计

| 字段名 | 类型 | 数据来源 | 说明 |
|---|---|---|---|
| `uuid` | string | 自动生成 | 唯一标识符，创建记录时生成，不可修改 |
| `createdAt` | number | 自动生成 | 创建记录时间，毫秒级时间戳 |
| `updatedAt` | number | 自动更新 | 更新记录时间，毫秒级时间戳 |
| `playerId` | string | `Dota2Player.steamId` | 玩家Steam ID，唯一标识 |
| `name` | string? | `Dota2Player.name` | 当前昵称，每次比赛更新为最新值 |
| `nameList` | string[] | 累积更新 | 曾用名列表，每次遇到新名称时添加 |
| `heroList` | HeroStat[] | 累积更新 | 英雄统计数据列表，包含英雄名称、总场数、胜利场数 |
| `matchList` | MatchStat[] | 累积更新 | 比赛统计数据列表，包含比赛ID、队伍、位置、是否胜利等信息 |

#### 字段结构定义

**HeroStat** 对象结构：
```typescript
interface HeroStat {
  hero: string          // 英雄名称
  totalGames: number    // 总场数
  wins: number          // 胜利场数
}
```

**MatchStat** 对象结构：
```typescript
interface MatchStat {
  matchId: string                    // 比赛ID
  team: Dota2TeamKey                 // 该玩家在比赛中的队伍（radiant/dire）
  role?: number | Dota2PlayerRole    // 位置（位标志）
  isWin: boolean                      // 该玩家是否在该场比赛中获胜（match.winner === player.team）
  timestamp: number                  // 比赛时间（match.updatedAt）
}
```

#### 数据更新时机
1. **起点信号时**：调用 `syncFromMatch()` 同步玩家基础信息（name、nameList）
2. **终点信号时**：调用 `syncFromMatch()` 更新玩家信息，并更新 `heroList` 和 `matchList` 统计数据

#### 数据更新逻辑
- **name**：更新为当前比赛中的最新名称
- **nameList**：如果当前名称不在列表中，则添加
- **heroList**：
  1. 从当前比赛的 `players` 数组中找到该玩家的 `hero`
  2. 如果 `heroList` 中已存在该英雄，则更新统计：
     - `totalGames += 1`
     - 如果该玩家所在队伍获胜（`match.winner === player.team`），则 `wins += 1`
  3. 如果 `heroList` 中不存在该英雄，则添加新记录：`{ hero, totalGames: 1, wins: match.winner === player.team ? 1 : 0 }`
- **matchList**：
  1. 从当前比赛的 `players` 数组中找到该玩家的信息（`player.team`、`player.role`等）
  2. 计算是否胜利：`isWin = match.winner === player.team`（如果`match.winner`或`player.team`为空，则`isWin = false`）
  3. 如果 `matchList` 中已存在该比赛ID，则更新记录（更新 `isWin`、`role`、`team`、`timestamp` 等）
  4. 如果 `matchList` 中不存在该比赛ID，则添加新记录：
     ```typescript
     {
       matchId: match.matchId,
       team: player.team,
       role: player.role,
       isWin: match.winner === player.team,
       timestamp: match.updatedAt
     }
     ```

#### 前端展示支持
玩家表的字段设计支持以下前端需求：
- **筛选**：通过 `name`、`nameList`、`playerId` 支持名称/ID搜索
- **排序**：通过 `updatedAt` 支持时间排序
- **分页**：通过 `updatedAt` 索引支持高效分页
- **统计查询**：
  - 通过 `heroList` 直接获取英雄统计数据（总场数、胜利场数、胜率）
  - 通过 `matchList` 直接获取比赛统计数据（队友/对手场数、胜率等）
  - 无需关联查询比赛表，数据已预计算存储

---

### 评价表 comments
相对独立的表，数据源完全来自用户手动输入。

#### 索引
- `playerId`：索引（用于查找某玩家的所有评分）
- `matchId`：索引（用于查找某比赛的所有评分）
- `updatedAt`：索引（用于时间范围查询和排序）

#### 表设计

| 字段名 | 类型 | 数据来源 | 说明 |
|---|---|---|---|
| `uuid` | string | 自动生成 | 唯一标识符，创建记录时生成，不可修改 |
| `createdAt` | number | 自动生成 | 创建记录时间，毫秒级时间戳 |
| `updatedAt` | number | 自动更新 | 更新记录时间，毫秒级时间戳 |
| `playerId` | string | 用户输入 | 玩家Steam ID |
| `matchId` | string | 用户输入 | 比赛ID |
| `score` | number | 用户输入 | 评分（1-5分），默认3分 |
| `comment` | string | 用户输入 | 文本评论内容 |

#### 数据更新时机
1. **终点信号时**：调用 `ensurePlaceholders()` 为所有玩家创建评价占位符（score=3，comment为空字符串）
2. **用户编辑时**：通过 `saveComment()` 更新评价内容

#### 数据独立性
- 评价表与比赛表、玩家表相对独立
- 评价数据完全由用户手动输入，不依赖GlobalMatchData
- 可以通过 `playerId` 和 `matchId` 关联查询比赛表和玩家表

---

## 前端展示需求与数据映射

### 筛选项

> **说明**：筛选项基于数据库表字段进行查询。GlobalMatchData用于实时游戏数据获取，但筛选逻辑基于已持久化的数据库记录。

| 表 | label | 组件类型 | 含义 | 范围 | 数据表对应字段 | 备注 |
|---|---|---|---|---|---|---|
| 比赛表 | 比赛id | input | 比赛id | - | `matchId` | 精确匹配 |
| 比赛表 | 比赛时间 | date picker | 比赛时间 | 时间范围（单位：天） | `updatedAt` | 支持日期范围选择 |
| 比赛表 | 游戏模式 | select | 游戏模式 | GameMode枚举值 | `gameMode` | 支持多选，查询`gameMode.game_mode`或`gameMode.lobby_type` |
| 比赛表 | 胜负 | select | 胜负 | 胜利/失败/全部 | `winner` + `me.team` | 基于`winner`和`me.team`计算 |
| 比赛表 | 是否观战 | select | 是否观战 | 是/否/全部 | `gameState` | 根据`gameState`判断 |
| 玩家表 | 玩家名称或id | input | 玩家名称或id | - | `name` / `nameList` / `playerId` | 模糊匹配，同时查询name和nameList |
| 玩家表 | 比赛id | input | 比赛id | - | `matchList[].matchId` | 查询`matchList`数组中`matchId`字段 |
| 玩家表 | 玩过英雄 | input | 英雄名称 | - | `heroList[].hero` | 查询`heroList`数组中`hero`字段 |
| 玩家表 | 遭遇时间 | date picker | 遭遇时间 | 时间范围（单位：天） | `updatedAt` | 玩家最近更新时间 |
| 评分表 | 玩家名称或id | input | 玩家名称或id | - | `playerId` (关联players表name) | 模糊匹配，需关联players表查询name和nameList |
| 评分表 | 比赛id | input | 比赛id | - | `matchId` | 精确匹配 |
| 评分表 | 评价时间 | date picker | 评价时间 | 时间范围（单位：天） | `updatedAt` | 支持日期范围选择 |
| 评分表 | 评分 | select | 评分 | 1-5 | `score` | 支持多选 |
| 评分表 | 评论文案 | input | 评论文案 | - | `comment` | 模糊匹配文本内容 |

### 表格内容

> **说明**：
> - 表格数据来源于数据库表（matches/players/comments）
> - 计算字段：需要根据多个数据源进行计算或统计
> - 点击效果：整行可点击的，点击效果统一；特定列可点击的，仅在对应列生效

#### 比赛表

| title | 含义 | 数据表对应字段 | 计算逻辑 | 点击效果 |
|---|---|---|---|---|
| 比赛id | 比赛唯一标识 | `matchId` | 直接显示 | 点击进入比赛详情页 |
| 游戏模式 | 游戏模式 | `gameMode` | 显示`gameMode.game_mode`或`gameMode.lobby_type` | 点击进入比赛详情页 |
| 是否观战 | 是否观战 | `gameState` | 根据`gameState`判断（如`DOTA_GAMERULES_STATE_DISCONNECT`表示观战） | 点击进入比赛详情页 |
| 比赛时间 | 比赛结束时间 | `updatedAt` | 格式化显示日期时间 | 点击进入比赛详情页 |
| 胜负 | 胜负结果 | `winner` + `me.team` | 显示逻辑：<br>1. 如果`winner`为空，显示"unknown"<br>2. 如果`winner`不为空且`me.team`存在：<br>   - `winner === me.team` → "胜利"<br>   - `winner !== me.team` → "失败"<br>3. 如果`me.team`为空，显示winner原始值（radiant/dire） | 点击进入比赛详情页 |
| 英雄图片 | 我的英雄 | `players`数组 | 从`players`数组中找到`steamId === playerId`的玩家，显示其`hero`字段 | 点击进入比赛详情页 |

#### 玩家表

| title | 含义 | 数据表对应字段 | 计算逻辑 | 点击效果 |
|---|---|---|---|---|
| 玩家名称 | 玩家当前名称 | `name` | 直接显示`players.name` | 点击进入玩家详情页 |
| 玩家id | 玩家Steam ID | `playerId` | 直接显示 | 点击进入玩家详情页 |
| 第一次遭遇 | 第一次遭遇时间 | `createdAt` | 格式化显示日期 | 点击进入玩家详情页 |
| 最近遭遇 | 最近遭遇时间 | `updatedAt` | 格式化显示日期 | 点击进入玩家详情页 |
| 遭遇次数 | 遭遇总次数 | `matchList` | `matchList.length` | 点击进入玩家详情页 |
| 平均评分 | 平均评分对应文案 | - | **计算逻辑**：<br>1. 查询comments表，`filter(playerId === 当前玩家id)`<br>2. 计算平均分：`avg(score)`<br>3. 根据配置的评分文案（1-5星对应文案）显示<br>4. 如果没有评分，显示"-" | 点击跳转评价表并筛选该玩家id |
| 最近比赛id | 最近一场比赛id | `matchList` | `matchList[matchList.length - 1].matchId` | 点击进入比赛详情页 |

#### 评分表

| title | 含义 | 数据表对应字段 | 计算逻辑 | 点击效果 |
|---|---|---|---|---|
| 评价时间 | 评价创建/更新时间 | `updatedAt` | 格式化显示日期时间 | - |
| 玩家名称 | 玩家名称 | `playerId` | 关联查询players表，显示`players.name` | 点击进入玩家详情页 |
| 比赛id | 比赛id | `matchId` | 直接显示 | 点击进入比赛详情页 |
| 分数 | 评分分数 | `score` | 显示数字（1-5） | - |
| 评论 | 评论内容 | `comment` | 显示文本，过长时截断显示 | - |

---

## 页面详情数据需求

### 比赛详情

#### 数据来源
- 主数据：matches表（`matchId`查询）
- 关联数据：players表（通过`players`数组）、comments表（`filter by matchId`）

#### 展示内容

##### 基础信息
| 字段 | 数据表字段 | 说明 |
|---|---|---|
| 比赛id | `matchId` | 显示pseudo_match_id |
| 游戏模式 | `gameMode` | 显示GameMode枚举对应的中文名称 |
| 比赛时间 | `updatedAt` | 格式化显示日期时间 |
| 比分 | `teamScore` | 显示格式：Radiant X : Y Dire（从`teamScore[Dota2Team.RADIANT]`和`teamScore[Dota2Team.DIRE]`获取） |
| 胜负 | `winner` + `me.team` | 显示逻辑同表格中的"胜负"列 |
| 是否观战 | `gameState` | 根据`gameState`判断 |

##### 玩家列表
- **数据来源**：`matches.players`数组
- **展示方式**：按team分组显示，Radiant队伍在上方，Dire队伍在下方
- **每行显示**：
  - 玩家名称（`name`）
  - 玩家Steam ID（`steamId`）
  - 英雄图片（`hero`）
  - 位置标识（`role`，需要位运算分解显示所有位置）
  - 玩家评分和评价（关联comments表，`filter by matchId + playerId`）
- **排序**：按`player_index`或`team_slot`排序

##### 交互
- 点击玩家行 → 进入玩家详情页
- 返回按钮 → 返回主页（比赛表）

### 玩家详情

#### 数据来源
- 主数据：players表（`playerId`查询）
- 关联数据：matches表（通过`matchList[].matchId`查询）、comments表（`filter by playerId`）

#### 展示内容

##### 基础信息区域
| 字段 | 数据表字段 | 说明 |
|---|---|---|
| 玩家名称 | `name` | 当前名称 |
| 玩家Steam ID | `playerId` | 显示steamId |
| 曾用名列表 | `nameList` | 以标签形式展示所有曾用名 |

##### 统计信息卡片

###### 遭遇统计
- **遭遇次数**：`matchList.length`
- **第一次遭遇**：`createdAt`（格式化日期）
- **最近遭遇**：`updatedAt`（格式化日期）

###### 队友/对手统计
- **数据来源**：`matchList`数组 + matches表（查询`me.team`）
- **计算逻辑**：
  1. 遍历`matchList`，对于每场比赛：
     - 通过`matchId`查询matches表，获取该场比赛的`me.team`
     - 如果`me.team`为空，跳过该场比赛
     - 如果`matchList[].team === me.team`，则为队友场
     - 如果`matchList[].team !== me.team`，则为对手场
- **队友场数**：统计队友场的总数
- **队友胜率**：在队友场中，统计`isWin === true`的场数，胜率 = 胜利场数 / 队友场数 × 100%
- **对手场数**：统计对手场的总数
- **对手胜率**：在对手场中，统计`isWin === true`的场数，胜率 = 胜利场数 / 对手场数 × 100%

###### 英雄统计
- **数据来源**：`heroList`数组（已预计算统计数据）
- **展示方式**：列表或卡片形式
- **每项显示**：
  - 英雄图片/名称（`heroList[].hero`）
  - 使用次数（`heroList[].totalGames`）
  - 胜利场数（`heroList[].wins`）
  - 胜率（`heroList[].wins / heroList[].totalGames × 100%`）
- **排序**：按使用次数（`totalGames`）降序，最多显示前10个

###### 位置统计
- **数据来源**：`matchList`数组中的`role`字段
- **展示方式**：列表或图表形式
- **计算逻辑**：
  1. 遍历`matchList`，收集所有`role`值
  2. 使用位运算分解`role`，统计每个位置（Dota2PlayerRole）的出现次数
  3. 对于每个位置，统计使用该位置的比赛中的`isWin === true`的场数
- **每项显示**：
  - 位置名称（Dota2PlayerRole枚举对应名称）
  - 使用次数（该位置出现的比赛场数）
  - 胜率（使用该位置且`isWin === true`的场数 / 使用次数 × 100%）
- **排序**：按使用次数降序

> **注意**：位置统计的计算逻辑：
> - `role`是位标志，一个值可能包含多个位置（如role=3表示Carry+Offlaner）
> - 需要使用位运算 `(role & Dota2PlayerRole.CARRY) === Dota2PlayerRole.CARRY` 来判断是否包含某个位置
> - 如果某场比赛的`role`为空，跳过该场比赛

##### 遭遇比赛表
- **数据来源**：根据`matchList[].matchId`查询matches表
- **表格列**：同"比赛表"表格列（标题、含义、对应字段、点击效果）
- **排序**：默认按`matchList[].timestamp`降序（最近遭遇在前），或按matches表的`updatedAt`降序
- **分页**：支持分页显示
- **交互**：点击比赛行 → 进入比赛详情页

##### 评分数据列表
- **数据来源**：comments表（`filter by playerId`）
- **表格列**：同"评分表"表格列（标题、含义、对应字段、点击效果）
- **排序**：默认按`updatedAt`降序（最近评价在前）
- **分页**：支持分页显示
- **交互**：
  - 点击比赛id → 进入比赛详情页
  - 点击评价行 → 可在当前页面展开显示完整评论




#### 设置页（不计入路由历史）
包括以下功能
语言切换radio - 默认中文，点击切换语言
修改评分文案 - 有5个input，对应1星到5星显示的文案，默认（拉 菜鸟 NPC 顶级 夯）


## 词云
暂时搁置

## 广告接入
暂时搁置

# 注意
检查依赖库，使用商业友好协议的依赖

## 缺漏与待补充说明汇总

### 数据库设计相关

1. **game_state字段缺失**
   - **位置**：比赛表中"是否观战"列
   - **问题**：GlobalMatchData中有game.game_state，但数据库设计中未明确是否存储
   - **建议**：在matches表设计中添加game_state字段（存储Dota2GameState枚举值）

2. **players数组存储格式**
   - **位置**：matches表设计
   - **问题**：players字段存储的是Dota2Player[]数组，需要明确存储格式（JSON序列化？）
   - **建议**：明确IndexedDB中数组对象的存储和查询方式

3. **计算字段的存储策略**
   - **位置**：matches.winner字段
   - **问题**：winner是计算字段，需要明确是实时计算还是存储计算结果
   - **建议**：考虑存储计算结果以提高查询性能

### 业务逻辑相关

4. **me为空时的处理逻辑**
   - **位置**：队友/对手场数和胜率计算
   - **问题**：如果某场比赛中me为空，无法判断队友/对手关系
   - **建议**：明确处理策略（跳过该场比赛？统计但不区分？）

5. **role位标志的处理**
   - **位置**：常玩位置统计、比赛详情中位置显示
   - **问题**：role是位标志（1, 2, 4, 8, 16），一个值可能包含多个位置
   - **建议**：提供位运算辅助函数，明确多位置的显示方式（所有位置都显示？只显示主位置？）

6. **英雄和位置胜率计算的数据来源**
   - **位置**：玩家详情中的英雄统计和位置统计
   - **问题**：需要从matches.players中找到该玩家在每场比赛中的hero和role
   - **建议**：明确匹配逻辑（通过steamId匹配），以及hero或role为空时的处理

7. **hero_list vs matches.players的关系**
   - **位置**：玩家表中hero_list字段
   - **问题**：hero_list是数组，是否包含重复英雄？如何与具体比赛关联？
   - **建议**：明确hero_list的更新逻辑（每次比赛后更新？），以及如何确定某场比赛中使用的英雄

### UI/UX相关

8. **表格列的显示策略**
   - **位置**：三个表格的列定义
   - **问题**：某些列（如玩家表中的player_id列）是否显示需要明确
   - **建议**：明确哪些列默认隐藏，哪些列可配置显示/隐藏

9. **计算字段的性能优化**
   - **位置**：队友/对手场数、胜率、常玩英雄/位置等
   - **问题**：这些字段需要遍历多场比赛计算，可能影响性能
   - **建议**：考虑缓存策略或增量计算，或添加统计字段到players表

10. **数据更新和同步机制**
    - **位置**：实时刷新需求
    - **问题**：当新比赛数据写入后，哪些页面需要自动刷新？
    - **建议**：明确页面刷新策略（轮询？事件通知？）

11. **评分文案的国际化**
    - **位置**：平均评分显示、设置页评分文案
    - **问题**：默认文案为中文，英文环境下如何处理？
    - **建议**：评分文案需要支持国际化（i18n）

12. **缺失数据的处理**
    - **位置**：多处（players数组为空、hero为空、role为空等）
    - **问题**：数据不完整时的UI显示策略
   - **建议**：统一制定缺失数据的显示规范（占位符？空状态？）

### 数据一致性问题

13. **match_list的维护**
    - **位置**：players表设计
    - **问题**：match_list需要在创建match时更新players表，需要保证一致性
    - **建议**：使用事务确保数据一致性，或考虑使用关联查询而非冗余存储

14. **name_list和hero_list的更新**
    - **位置**：players表设计
    - **问题**：如何判断name或hero是否为新值？更新频率？
    - **建议**：明确更新策略（每次比赛后检查？去重逻辑？）



# 问题修复

筛选问题
生命周期问题
国际化问题
词云
广告
快捷键
筛选的路由
打开时根据游戏信息中的尺寸信息重新更新desktop history comment窗口大小位置
设置窗口title 


4 接收到开始信号 ingame没有自动弹出

5. 使用热键只打开desktop 没有打开ingame，逻辑是，如果有desktop或者有ingame，按快捷键隐藏全部，如果都没有，则打开全部

6. 主页的数据要实时刷新


15. desktop和ingame数据应该自动刷新


17. 控制台图片偏小



# 新UI修改


# 进阶

打开时根据游戏信息中的尺寸信息重新更新desktop history comment窗口大小位置

设置窗口title 

英文评价

快捷键失效

先打开dota2再打开app有监听问题

重新检查图片命名
