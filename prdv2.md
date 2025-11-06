# 主要参考资料

api 文档
https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction
https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2
https://dev.overwolf.com/ow-native/reference/ow-api-overview
https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro

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
  尽量使用商业友好协议的依赖库

# 数据

## 数据类型

src/types/dota2-gep.ts

## 数据库

### 数据库索引设计

为了优化查询性能，需要为以下字段创建索引：

#### matches 表索引

- `match_id`：唯一索引（用于快速查找比赛）
- `player_id`：索引（用于查找某玩家的所有比赛）
- `end_time`：索引（用于时间范围查询）
- `match_mode`：索引（用于按模式筛选）

#### players 表索引

- `player_id`：唯一索引（主键）
- `last_seen`：索引（用于排序）

#### accounts 表索引

- `account_id`：索引（用于查找账户）
- `updated_at`：索引（用于获取最近使用的账户）

#### ratings 表索引

- `player_id`：索引（用于查找某玩家的所有评分）
- `account_id`：索引（用于查找某账户的所有评分）
- `match_id`：索引（用于查找某比赛的所有评分）
- `created_at`：索引（用于时间排序）
- 复合索引：`(player_id, account_id)` 用于查找某账户对某玩家的评分

### 错误处理策略

1. **数据缺失处理**：

   - 如果 `match_id` 缺失：使用时间戳生成临时 ID，记录警告日志
   - 如果玩家数据缺失：跳过该玩家，记录警告日志
   - 如果关键字段缺失：不创建记录，记录错误日志

2. **数据格式异常处理**：

   - 验证字段类型（如 `match_id` 应该是 string 或 number）
   - 验证字段范围（如 `score` 应该是 1-5）
   - 异常数据记录到错误日志，不写入数据库

3. **GEP 连接异常处理**：

   - 如果 `setRequiredFeatures` 失败：记录错误，提示用户检查游戏状态
   - 如果 `getInfo()` 失败：重试 3 次，失败后使用缓存数据
   - 如果 `onInfoUpdates2` 长时间未更新（超过 5 分钟）：记录警告，提示用户可能的数据延迟

4. **数据库操作异常处理**：
   - IndexedDB 操作失败：记录错误，提示用户
   - 数据写入失败：重试机制（最多 3 次），失败后保存到临时存储（localStorage），待恢复后同步

**数据获取策略说明：**

- **账户表**：通过 `onInfoUpdates2.info.me` 数据触发，当检测到 me 信息变化时，根据 `account_id` 判断是否需要新增或更新记录
- **比赛表**：通过 `onNewEvents.match_ended` 事件触发，创建一条完整记录。**重要**：在 `match_ended` 事件触发时，先调用 `overwolf.games.events.getInfo()` 主动获取最新快照，确保数据同步。如果 `getInfo()` 返回的数据不完整，等待 `onInfoUpdates2` 的下一次更新（最多 5 秒超时）
- **玩家表**：通过 `onNewEvents.match_ended` 事件触发，从最新快照的 `roster.players[]` 收集玩家数据，根据 `player_id` 查找或新增/更新记录
- **评分表**：用户输入数据，不依赖 GEP 事件
- **注意**：`player_X_record_id` 字段不需要存储，需要时通过 `match_id` 和 `player_X_id` 关联查询 `players` 表获取

**字段获取优先级（统一标准）：**

- **`player_id` 获取优先级**：`account_id` > `steamId` > `steam_id` > `steamid`
- **`player_name` 获取优先级**：`player_name` > `playerName` > `name`
- **所有字段获取都需要做空值检查**，如果所有变体都不存在，记录警告并使用默认值（如 `player_id` 使用临时 ID，`player_name` 使用"未知玩家"）

**重要说明：Steam ID 的本质**

- **`account_id`（accounts 表）** 和 **`player_id`（players 表）** 本质上都是 **Steam Account ID**
- 它们只是在不同上下文中使用不同的字段名：
  - `account_id`：表示"当前使用这个应用的账户"（从 `onInfoUpdates2.info.me.steam_id` 获取）
  - `player_id`：表示"在比赛中遇到的玩家"（从 `onInfoUpdates2.info.roster.players[].account_id` 或 `steam_id` 等获取）
- **语义区分**：使用不同名称是为了语义清晰（账户 vs 玩家），但在数据库中它们存储的是相同类型的值（Steam Account ID）
- **特殊情况**：当用户评价自己时，`ratings` 表中的 `account_id` 和 `player_id` 可能是同一个值

**比赛开始/结束判断：**

- **比赛开始判断**：
  - 通过 `onNewEvents.match_state_changed` 事件，当 `match_state` 变为 `DOTA_GAMERULES_STATE_GAME_IN_PROGRESS` 时表示比赛开始
  - 或通过 `onInfoUpdates2.info.match_info` 中检测到 `match_id` 且比赛状态为进行中
- **比赛结束判断**：
  - **主要方式**：通过 `onNewEvents.match_ended` 事件触发，这是最可靠的比赛结束信号
  - **备用方式**：通过 `onNewEvents.match_state_changed` 事件，当 `match_state` 变为 `DOTA_GAMERULES_STATE_POST_GAME` 时表示比赛结束
  - **超时机制**：如果比赛开始后超过 2 小时未收到结束事件，视为异常结束，记录警告日志
  - **数据完整性检查**：收集数据时验证必要字段是否存在（如 `match_id`、`roster.players` 数量是否为 10），缺失时记录警告日志，不创建不完整记录

**`onInfoUpdates2` 事件说明：**

- **不是循环的**，而是**事件驱动**的，当游戏内数据发生变化时 GEP 会主动推送
- **触发时机**：游戏状态变化、比赛阶段变化、玩家数据更新（KDA/GPM/XPM 等）、阵容信息变化、比赛信息更新等
- **触发频率**：取决于数据变化频率，通常几秒到几十秒一次（有变化时），比赛进行中可能更频繁，比赛结束后会触发最终快照
- **使用建议**：
  - 在 `setRequiredFeatures` 成功后立即调用 `getInfo()` 获取初始快照
  - 订阅 `onInfoUpdates2` 监听后续更新，每次触发时缓存最新快照
  - 在 `match_ended` 事件触发时，优先使用缓存的快照，如果缓存不存在或过期，调用 `getInfo()` 主动获取

**数据一致性保证：**

1. **数据快照机制**：

   - 在 `match_ended` 触发时，立即调用 `getInfo()` 获取最新快照
   - 如果 `getInfo()` 返回的数据不完整，等待 `onInfoUpdates2` 的下一次更新（最多 5 秒超时）
   - 维护一个缓存机制：每次 `onInfoUpdates2` 更新时缓存最新数据，`match_ended` 时优先使用缓存

2. **数据验证**：

   - 创建 `matches` 记录前，验证必要字段是否存在（`match_id`、`roster.players` 等）
   - 验证玩家数量是否为 10 人
   - 验证 `match_id` 是否已存在（避免重复记录）

3. **事务处理**：

   - 使用 IndexedDB 事务确保 `matches`、`players`、`accounts` 表的数据一致性
   - 如果任何一步失败，回滚所有操作，记录错误日志

4. **数据修复机制**：
   - 定期检查数据完整性（如每周一次）
   - 发现异常数据时，记录到修复日志

### 比赛表 (matches)

| 名称                | 含义              | 类型             | 获取方式                                                                                           | 枚举类型                              | 其他备注                                                                                                                                                                                        |
| ------------------- | ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| uuid                | 唯一标识符        | string           | 应用生成                                                                                           | -                                     | UUID v4，主键                                                                                                                                                                                   |
| match_id            | 比赛 ID           | string \| number | `onInfoUpdates2.info.match_info.pseudo_match_id` 或 `onNewEvents.game_state_changed.data.match_id` | -                                     | GEP 提供 `pseudo_match_id` 而非 `match_id`，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#match_info)                                                |
| player_id           | 当前玩家 ID       | string \| number | `onInfoUpdates2.info.me.steam_id`                                                                  | -                                     | 发起记录的玩家 Steam ID，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#me)                                                                           |
| game_mode           | 游戏模式          | string           | `onInfoUpdates2.info.game_state` 或 `onInfoUpdates2.info.game.game_state`                          | `'playing' \| 'spectating' \| 'idle'` | 是否在游戏中或观战中，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#game_state_changed)                                                              |
| match_mode          | 比赛模式          | string           | `onInfoUpdates2.info.match_info.game_mode`                                                         | `Dota2GameMode`                       | AllPick/AllPickRanked/SingleDraft 等，见类型定义，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#match_info)                                          |
| start_time          | 开始时间          | number           | `onNewEvents.match_ended` 触发时从 `end_time - match_info.duration` 推算                           | -                                     | GEP 文档未明确提供 start_time，需从 end_time - duration 推算，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#match_info)                              |
| end_time            | 结束时间          | number           | `onNewEvents.match_ended` 触发时记录当前时间                                                       | -                                     | Unix 时间戳（秒），参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#match_ended)                                                                        |
| winner              | 胜负              | string           | `onNewEvents.match_ended.data.winner`                                                              | `'radiant' \| 'dire'`                 | 天辉/夜魇获胜，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#match_ended)                                                                            |
| player_1_id         | 1 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[0].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 天辉队伍第 1 位，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                                               |
| player_2_id         | 2 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[1].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 天辉队伍第 2 位                                                                                                                                                                                 |
| player_3_id         | 3 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[2].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 天辉队伍第 3 位                                                                                                                                                                                 |
| player_4_id         | 4 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[3].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 天辉队伍第 4 位                                                                                                                                                                                 |
| player_5_id         | 5 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[4].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 天辉队伍第 5 位                                                                                                                                                                                 |
| player_6_id         | 6 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[5].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 夜魇队伍第 1 位                                                                                                                                                                                 |
| player_7_id         | 7 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[6].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 夜魇队伍第 2 位                                                                                                                                                                                 |
| player_8_id         | 8 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[7].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 夜魇队伍第 3 位                                                                                                                                                                                 |
| player_9_id         | 9 号玩家 ID       | string \| number | `onInfoUpdates2.info.roster.players[8].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 夜魇队伍第 4 位                                                                                                                                                                                 |
| player_10_id        | 10 号玩家 ID      | string \| number | `onInfoUpdates2.info.roster.players[9].account_id` 或 `steam_id` 或 `steamId`                      | -                                     | 夜魇队伍第 5 位                                                                                                                                                                                 |
| player_1_kda        | 1 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[0].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"，如 "5/3/8"，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                                     |
| player_2_kda        | 2 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[1].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_3_kda        | 3 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[2].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_4_kda        | 4 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[3].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_5_kda        | 5 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[4].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_6_kda        | 6 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[5].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_7_kda        | 7 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[6].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_8_kda        | 8 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[7].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_9_kda        | 9 号玩家 KDA      | string           | `onInfoUpdates2.info.roster.players[8].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_10_kda       | 10 号玩家 KDA     | string           | `onInfoUpdates2.info.roster.players[9].kills/deaths/assists`                                       | -                                     | 格式："K/D/A"                                                                                                                                                                                   |
| player_1_level      | 1 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[0].level`                                                      | -                                     | **此版本不使用** - GEP 文档未明确提供 level 字段，需验证                                                                                                                                        |
| player_2_level      | 2 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[1].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_3_level      | 3 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[2].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_4_level      | 4 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[3].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_5_level      | 5 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[4].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_6_level      | 6 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[5].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_7_level      | 7 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[6].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_8_level      | 8 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[7].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_9_level      | 9 号玩家等级      | number           | `onInfoUpdates2.info.roster.players[8].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_10_level     | 10 号玩家等级     | number           | `onInfoUpdates2.info.roster.players[9].level`                                                      | -                                     | **此版本不使用**                                                                                                                                                                                |
| player_1_gpm        | 1 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[0].gpm`                                                        | -                                     | 每分钟金钱，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                                                    |
| player_2_gpm        | 2 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[1].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_3_gpm        | 3 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[2].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_4_gpm        | 4 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[3].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_5_gpm        | 5 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[4].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_6_gpm        | 6 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[5].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_7_gpm        | 7 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[6].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_8_gpm        | 8 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[7].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_9_gpm        | 9 号玩家 GPM      | number           | `onInfoUpdates2.info.roster.players[8].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_10_gpm       | 10 号玩家 GPM     | number           | `onInfoUpdates2.info.roster.players[9].gpm`                                                        | -                                     | 每分钟金钱                                                                                                                                                                                      |
| player_1_xpm        | 1 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[0].xpm`                                                        | -                                     | 经验每分钟（XPM），GEP 提供 XPM                                                                                                                                                                 |
| player_2_xpm        | 2 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[1].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_3_xpm        | 3 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[2].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_4_xpm        | 4 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[3].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_5_xpm        | 5 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[4].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_6_xpm        | 6 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[5].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_7_xpm        | 7 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[6].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_8_xpm        | 8 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[7].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_9_xpm        | 9 号玩家 XPM      | number           | `onInfoUpdates2.info.roster.players[8].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_10_xpm       | 10 号玩家 XPM     | number           | `onInfoUpdates2.info.roster.players[9].xpm`                                                        | -                                     | 经验每分钟（XPM）                                                                                                                                                                               |
| player_1_hero_id    | 1 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[0].hero_id`                                                    | -                                     | 英雄 ID，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                                                       |
| player_2_hero_id    | 2 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[1].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_3_hero_id    | 3 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[2].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_4_hero_id    | 4 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[3].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_5_hero_id    | 5 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[4].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_6_hero_id    | 6 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[5].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_7_hero_id    | 7 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[6].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_8_hero_id    | 8 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[7].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_9_hero_id    | 9 号玩家英雄 ID   | number           | `onInfoUpdates2.info.roster.players[8].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_10_hero_id   | 10 号玩家英雄 ID  | number           | `onInfoUpdates2.info.roster.players[9].hero_id`                                                    | -                                     | 英雄 ID                                                                                                                                                                                         |
| player_1_hero_name  | 1 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[0].hero` 或 `heroName`                                         | -                                     | 英雄名称，如 'npc_dota_hero_axe'，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                              |
| player_2_hero_name  | 2 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[1].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_3_hero_name  | 3 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[2].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_4_hero_name  | 4 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[3].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_5_hero_name  | 5 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[4].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_6_hero_name  | 6 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[5].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_7_hero_name  | 7 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[6].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_8_hero_name  | 8 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[7].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_9_hero_name  | 9 号玩家英雄名称  | string           | `onInfoUpdates2.info.roster.players[8].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| player_10_hero_name | 10 号玩家英雄名称 | string           | `onInfoUpdates2.info.roster.players[9].hero` 或 `heroName`                                         | -                                     | 英雄名称                                                                                                                                                                                        |
| hero_pick_order     | 英雄选择顺序      | string           | 根据 `onInfoUpdates2.info.roster.players[].team_slot` 或 `index` 推断，或通过监听选人阶段事件记录  | -                                     | **此版本不使用** - JSON 数组，记录 10 个玩家按选择顺序的 player_id，GEP 文档未明确提供，需通过监听选人阶段（`DOTA_GAMERULES_STATE_HERO_SELECTION`）的 `onInfoUpdates2` 事件记录，此版本暂不实现 |

### 玩家表 (players)

**数据更新策略：**

通过 `onNewEvents.match_ended` 事件触发，从 `onInfoUpdates2.info.roster.players[]` 收集所有玩家数据，对每个玩家执行以下操作：

1. **根据 `player_id` 查找记录**：

   - 从 `onInfoUpdates2.info.roster.players[]` 获取 `player_id`，优先级：`account_id` > `steamId` > `steam_id` > `steamid`
   - 如果所有字段都不存在，记录警告并使用临时 ID（格式：`temp_${timestamp}_${index}`）
   - 在 `players` 表中根据 `player_id` 查询是否存在

2. **如果未找到记录（新增）**：

   - 生成新的 `uuid`
   - 设置 `player_id` = 从 GEP 获取的玩家 ID（按优先级获取）
   - 设置 `current_name` = 从 GEP 获取的玩家名称，优先级：`player_name` > `playerName` > `name`，如果都不存在则使用"未知玩家"
   - 设置 `previous_names` = `[]`（空数组）
   - 设置 `first_seen` = 当前时间戳（`onNewEvents.match_ended` 触发时）
   - 设置 `last_seen` = 当前时间戳

3. **如果找到记录（更新）**：
   - 获取最新昵称，优先级：`player_name` > `playerName` > `name`
   - 如果最新昵称与数据库中的 `current_name` 不同，将旧的 `current_name` 添加到 `previous_names` 数组（如果不存在）
   - 更新 `current_name` = 最新昵称
   - 更新 `last_seen` = 当前时间戳（`onNewEvents.match_ended` 触发时）

| 名称           | 含义       | 类型             | 获取方式                                                                     | 枚举类型 | 其他备注                                                                                                                                                                                                                               |
| -------------- | ---------- | ---------------- | ---------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| uuid           | 唯一标识符 | string           | 应用生成                                                                     | -        | UUID v4，主键                                                                                                                                                                                                                          |
| player_id      | 玩家 ID    | string \| number | `onInfoUpdates2.info.roster.players[].account_id` 或 `steam_id` 或 `steamId` | -        | Steam Account ID，唯一标识玩家。**注意**：本质上与 `accounts.account_id` 相同，都是 Steam Account ID，只是在不同上下文中使用不同名称，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster) |
| current_name   | 当前昵称   | string           | `onInfoUpdates2.info.roster.players[].player_name` 或 `name` 或 `playerName` | -        | 玩家当前游戏内昵称，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#roster)                                                                                                                   |
| previous_names | 曾用名列表 | string[]         | 应用本地记录历史                                                             | -        | JSON 数组，存储历史昵称                                                                                                                                                                                                                |
| first_seen     | 第一次遇到 | number           | 应用记录首次遇到时间                                                         | -        | Unix 时间戳（秒）                                                                                                                                                                                                                      |
| last_seen      | 最后遇到   | number           | 应用记录最后遇到时间                                                         | -        | Unix 时间戳（秒），每次遇到更新                                                                                                                                                                                                        |

### 账户表 (accounts)

**数据更新策略（优化方案）：**

通过 `onInfoUpdates2.info.me` 数据触发（应用打开时、开始 Dota 2 时），对当前账户执行以下操作：

1. **根据 `account_id` 查找记录**：

   - 从 `onInfoUpdates2.info.me.steam_id` 获取 `account_id`
   - 从 `onInfoUpdates2.info.me.name` 获取 `name`
   - 在 `accounts` 表中根据 `account_id` 查询是否存在

2. **如果未找到记录（新增）**：

   - 生成新的 `uuid`
   - 设置 `account_id` = 从 GEP 获取的账户 ID
   - 设置 `name` = 从 GEP 获取的账户名称
   - 设置 `created_at` = 当前时间戳
   - 设置 `updated_at` = 当前时间戳

3. **如果找到记录（更新）**：
   - 如果 `name` 发生变化，将旧的 `name` 记录到历史（可选：如果 accounts 表有 `previous_names` 字段）
   - 更新 `name` = 从 GEP 获取的最新账户名称
   - 更新 `updated_at` = 当前时间戳

**获取当前账户**：

- 根据 `account_id` 查询记录，按 `updated_at` 降序排序，取第一条即为当前账户
- 如果同一 `account_id` 有多条记录（历史方案遗留），按 `updated_at` 降序排序，取第一条

| 名称       | 含义       | 类型             | 获取方式                          | 枚举类型 | 其他备注                                                                                                                                                                                                                                         |
| ---------- | ---------- | ---------------- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| uuid       | 唯一标识符 | string           | 应用生成                          | -        | UUID v4，主键                                                                                                                                                                                                                                    |
| account_id | 账户 ID    | string \| number | `onInfoUpdates2.info.me.steam_id` | -        | Steam Account ID，唯一标识账户。**注意**：本质上与 `players.player_id` 相同，都是 Steam Account ID，只是在不同上下文中使用不同名称（账户 vs 玩家），参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#me) |
| name       | 账户名称   | string           | `onInfoUpdates2.info.me.name`     | -        | 账户当前游戏内昵称，参考 [文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2#me)                                                                                                                                 |
| created_at | 创建时间   | number           | 应用记录                          | -        | Unix 时间戳（秒）                                                                                                                                                                                                                                |
| updated_at | 最后使用   | number           | 应用记录                          | -        | Unix 时间戳（秒），每次检测到该账户时更新                                                                                                                                                                                                        |

### 评分表 (ratings)

| 名称       | 含义       | 类型             | 获取方式                   | 枚举类型                | 其他备注                                                                                                                                                       |
| ---------- | ---------- | ---------------- | -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| uuid       | 唯一标识符 | string           | 应用生成                   | -                       | UUID v4，主键                                                                                                                                                  |
| player_id  | 玩家 ID    | string \| number | 关联 `players.player_id`   | -                       | 外键，被评分的玩家                                                                                                                                             |
| account_id | 账号 ID    | string \| number | 关联 `accounts.account_id` | -                       | 外键，发起评分的用户 Steam ID（Steam Account ID），通过查询 `accounts` 表获取当前账户的 `account_id`。**注意**：与 `player_id` 本质相同，都是 Steam Account ID |
| match_id   | 比赛 ID    | string \| number | 关联 `matches.match_id`    | -                       | 外键，该评分对应的比赛，使用 GEP 提供的 `match_id`（`pseudo_match_id`）                                                                                        |
| score      | 分数       | number           | 用户输入                   | `1 \| 2 \| 3 \| 4 \| 5` | 1-5 星评分                                                                                                                                                     |
| created_at | 创建时间   | number           | 应用记录                   | -                       | Unix 时间戳（秒）                                                                                                                                              |
| comment    | 评论       | string           | 用户输入                   | -                       | 文本评论，可选                                                                                                                                                 |

# 事件

## GEP 事件监听机制

根据 [Overwolf GEP 文档](https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro)，所有游戏事件（Game Events）和游戏信息更新（Game Info Updates）都由 **background 进程**监听和管理。

### 事件监听方式

1. **设置所需特性**（`setRequiredFeatures`）：

   - 在 `background.ts` 中调用 `overwolf.games.events.setRequiredFeatures()` 订阅需要的 Game Features
   - 必须在游戏启动后尽快调用，建议在游戏启动时立即设置
   - 参考：[Set Required Features](https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro#set-required-features)

2. **监听新游戏事件**（`onNewEvents`）：

   - 在 `background.ts` 中添加 `overwolf.games.events.onNewEvents` 监听器
   - 用于接收实时游戏事件，如 `kill`、`death`、`match_ended` 等
   - 参考：[Listen for new Game Events](https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro#listen-for-new-game-events)

3. **监听游戏信息更新**（`onInfoUpdates2`）：

   - 在 `background.ts` 中添加 `overwolf.games.events.onInfoUpdates2` 监听器
   - 用于接收游戏状态快照更新，如 `roster`、`match_info`、`me` 等
   - 参考：[Listen for new Game Info updates](https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro#listen-for-new-game-info-updates)

4. **获取当前游戏信息**（`getInfo`）：
   - 在 `background.ts` 中调用 `overwolf.games.events.getInfo()` 主动获取当前游戏状态
   - 建议在 `setRequiredFeatures` 成功后立即调用，获取初始快照
   - 参考：[Obtain current Game Info](https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro#obtain-current-game-info)

### 本应用使用的 GEP Features

根据 [Dota 2 GEP 文档](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2)，本应用订阅以下 Features：

- `game_state`：游戏状态（playing/spectating/idle）
- `game_state_changed`：游戏状态变化事件
- `match_state_changed`：比赛状态变化事件
- `roster`：玩家阵容信息
- `match_info`：比赛信息
- `me`：当前玩家信息
- `match_ended`：比赛结束事件
- `kill`、`assist`、`death`：KDA 相关事件
- `cs`、`xpm`、`gpm`、`gold`：经济和经验相关事件

## 本应用关心的事件

### 1. 策略时间阶段（DOTA_GAMERULES_STATE_STRATEGY_TIME）

**触发时机**：

- 通过 `onNewEvents` 事件中的 `match_state_changed` 事件
- 或通过 `onInfoUpdates2` 事件中的 `match_state_changed` 信息更新
- 当 `match_state` 变为 `DOTA_GAMERULES_STATE_STRATEGY_TIME` 时触发

**处理逻辑**：

- 在 `background.ts` 的 `handleGameStateChange()` 方法中处理
- 调用 `openIngameWindow('strategy')` 打开 ingame 窗口
- 用于在策略时间阶段显示玩家信息，方便用户准备评分

**数据收集**：

- 此时可以从 `onInfoUpdates2.info.roster.players[]` 获取玩家列表
- 用于更新 `accounts` 表（如果账户信息发生变化）

### 2. 比赛结束（match_ended）

**触发时机**：

- 通过 `onNewEvents` 事件中的 `match_ended` 事件触发
- 这是最可靠的比赛结束信号

**处理逻辑**：

- 在 `background.ts` 的 `handleGameEvent()` 方法中处理 `match_ended` 事件
- 通过 `onInfoUpdates2` 检测到 `match_state` 变为 `DOTA_GAMERULES_STATE_POST_GAME` 时
- 调用 `openIngameWindow('postgame')` 打开 ingame 窗口
- 用于在比赛结束后显示比赛结果和评分界面

**数据收集**：

- 从 `onInfoUpdates2.info` 收集完整比赛数据，创建 `matches` 表记录
- 从 `onInfoUpdates2.info.roster.players[]` 收集玩家数据，更新 `players` 表
- 从 `onInfoUpdates2.info.me` 收集当前账户信息，更新 `accounts` 表

### 3. 账户信息更新（me）

**触发时机**：

- 通过 `onInfoUpdates2` 事件中的 `me` 信息更新
- 应用打开时、开始 Dota 2 时触发

**处理逻辑**：

- 在 `background.ts` 的 `onInfoUpdates2` 监听器中处理
- 根据 `account_id` 和 `name` 判断是否需要新增 `accounts` 表记录
- 如果账户信息发生变化，新增记录（保留历史）

## 事件流程图

```
游戏启动
  ↓
background.ts 设置 setRequiredFeatures
  ↓
调用 getInfo() 获取初始快照
  ↓
监听 onNewEvents（实时事件）
  ↓
监听 onInfoUpdates2（状态快照）
  ↓
┌─────────────────────────────────────┐
│ match_state_changed                 │
│ → DOTA_GAMERULES_STATE_STRATEGY_TIME│
│ → 打开 ingame 窗口（策略阶段）      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ match_ended 事件触发                │
│ → DOTA_GAMERULES_STATE_POST_GAME   │
│ → 打开 ingame 窗口（赛后）          │
│ → 收集完整数据写入数据库            │
└─────────────────────────────────────┘
```

# 页面

## desktop

容器：可以调节尺寸和位置 + 快捷键控制显示关闭 + 可以调透明度 + overlay

### 窗口管理功能

根据 Overwolf API，desktop 窗口支持以下功能：

- **调节尺寸和位置**：✅ 支持

  - `resizable: true` 允许用户调整窗口大小
  - `min_size` 设置最小尺寸限制
  - `start_position` 设置初始位置
  - `overwolf.windows.dragMove()` API 允许用户拖动窗口

- **快捷键控制显示关闭**：✅ 支持

  - `hotkeys` 配置中定义快捷键
  - `action: "ToggleWindow"` 内置动作切换窗口显示
  - 或使用 `action-type: "custom"` 在 background 中自定义逻辑（当前实现）

- **透明度调节**：✅ 支持

  - `transparent: true/false` 在 manifest.json 中配置
  - 注意：透明度通常在 manifest.json 中静态配置，运行时动态调整需要验证 API

- **Overlay**：✅ 支持
  - `transparent: true` + `desktop_only: false` 配置为透明覆盖层
  - 注意：desktop 窗口通常设置为 `transparent: false`（非透明），如果需要 overlay 效果可设置为 `true`

详细说明见：[窗口管理功能文档](../docs/window-management.md)

### 页面状态和导航逻辑

#### 页面状态定义

页面根据应用状态和游戏状态显示不同的组件组合：

| 状态   | 条件                                         | 显示组件                    |
| ------ | -------------------------------------------- | --------------------------- |
| 状态 1 | 没打开 dota2                                 | 启动 dota2 组件             |
| 状态 2 | 没有历史数据                                 | 应用说明组件                |
| 状态 3 | 打开 dota2                                   | 账号切换组件                |
| 状态 4 | `game_state === 'idle'`                      | 总览数据组件                |
| 状态 5 | `game_state === 'spectating' \|\| 'playing'` | 总览数据组件 + 比赛详情组件 |
| 状态 6 | 点击玩家                                     | 玩家详情组件                |

#### 导航逻辑

**路由结构**：

```
状态 4 (总览) ←→ 状态 5 (比赛详情) ←→ 状态 6 (玩家详情)
   ↑                    ↑                    ↑
   └────────────────────┴────────────────────┘
                    Home 按钮
```

**导航功能**：

1. **前进/后退按钮**：

   - 使用浏览器历史 API (`window.history.pushState` / `popState`) 或 React Router
   - 维护导航栈：`[状态4] → [状态5] → [状态6]`
   - 前进：`history.forward()` 或导航到下一个状态
   - 后退：`history.back()` 或导航到上一个状态

2. **Home 按钮**：

   - 导航回状态 4（总览数据组件）
   - 清空导航栈或重置到初始状态

3. **鼠标按钮 4/5 支持**：✅ 可实现

   ```typescript
   // 监听鼠标侧键（Mouse 4 = button 3, Mouse 5 = button 4）
   useEffect(() => {
     const handleMouseDown = (e: MouseEvent) => {
       if (e.button === 3) {
         // Mouse 4 (后退)
         e.preventDefault();
         handleGoBack();
       } else if (e.button === 4) {
         // Mouse 5 (前进)
         e.preventDefault();
         handleGoForward();
       }
     };

     window.addEventListener("mousedown", handleMouseDown);
     return () => window.removeEventListener("mousedown", handleMouseDown);
   }, []);
   ```

4. **点击跳转**：
   - 点击总览数据组件（状态 4）中的比赛 → 打开比赛详情（状态 5）
   - 点击总览数据组件（状态 4）或比赛详情（状态 5）中的玩家 → 打开玩家详情（状态 6）

**路由方案**：

使用 **React Router v6**（MIT License，商业友好）

**实现方式**：

- 使用 `BrowserRouter`（desktop 窗口）
- 路由结构：
  - `/` - 总览数据组件（状态 4）
  - `/match/:matchId` - 比赛详情组件（状态 5）
  - `/player/:playerId` - 玩家详情组件（状态 6）
- 使用 `useNavigate()` hook 实现前进/后退/Home 按钮
- 支持浏览器历史 API（前进/后退按钮）
- 支持鼠标侧键（Mouse 4/5）导航

### 主要组件

#### 1. 启动 dota2 组件（暂时不实现）

**显示条件**：没打开 dota2（状态 1）

**功能**：

- 判断有没有带参数 `-gamestateintegration`，没有则为重启 steam（参考 dotaplus）
- 在游戏中：显示"游戏中"状态
- 不在游戏中：点击打开 dota2

**实现可行性**：⚠️ 需验证

- Overwolf 可能不提供直接启动游戏或修改启动参数的 API
- 可能需要通过系统命令或 Overwolf 的扩展功能实现
- 建议：先实现其他功能，此功能后续调研

#### 2. 应用说明组件

**显示条件**：没有历史数据（状态 2）

**功能**：

- 介绍应用怎么使用的一个简单 guide
- 展示使用说明（普通文本占位）

**实现可行性**：✅ 完全支持

- 纯 UI 组件，使用 React + TailwindCSS 实现
- 可以包含图片、文字、链接等

#### 3. 账号切换组件

**显示条件**：打开 dota2（状态 3）

**功能**：

- 读取 `accounts` 数据表进行 select 的组件
- 假如是一台设备多个账号，可以切换展示不同的账号数据
- 默认选中最近使用的账号（按 `updated_at` 降序排序，取第一条）
- 不可清空（必须选中一个账号）

**数据来源**：

- 从 IndexedDB `accounts` 表查询
- 根据 `account_id` 查询所有记录，按 `updated_at` 降序排序

**实现可行性**：✅ 完全支持

- 使用 Dexie.js 查询 IndexedDB
- 使用 React Select 或自定义下拉组件

#### 4. 总览数据组件

**显示条件**：`game_state === 'idle'`（状态 4）或 `game_state === 'spectating' || 'playing'`（状态 5）

**功能**：

- 一个 table 通过 tab 切换，以及常用筛选项+排序

**Tab 1：比赛 table**

| 字段     | 数据来源                                | 说明                                                          |
| -------- | --------------------------------------- | ------------------------------------------------------------- |
| 比赛 id  | `matches.match_id`                      | 显示比赛 ID                                                   |
| 时间     | `matches.end_time`                      | 格式化显示时间                                                |
| 游戏模式 | `matches.match_mode`                    | 显示游戏模式（AllPick/AllPickRanked 等）                      |
| 时长     | `matches.end_time - matches.start_time` | 计算比赛时长                                                  |
| 胜负     | `matches.winner`                        | 显示 'radiant' 或 'dire'                                      |
| 队伍     | 根据 `player_id` 判断                   | 显示当前玩家所在队伍                                          |
| 玩家     | `matches.player_1_id ~ player_10_id`    | 通过关联 `players` 表查询玩家名称，显示所有玩家名称（可展开） |

**Tab 2：玩家 table**

| 字段       | 数据来源               | 说明                                            |
| ---------- | ---------------------- | ----------------------------------------------- |
| 玩家 id    | `players.player_id`    | 显示玩家 ID                                     |
| 玩家名字   | `players.current_name` | 显示当前昵称                                    |
| first_seen | `players.first_seen`   | 格式化显示首次遇到时间                          |
| last_seen  | `players.last_seen`    | 格式化显示最后遇到时间                          |
| 友方胜率   | 计算字段               | 查询与该玩家同队的比赛，计算胜率                |
| 敌方胜率   | 计算字段               | 查询与该玩家对战的比赛，计算胜率                |
| 上次评分   | 计算字段               | 查询 `ratings` 表，按 `created_at` 降序取第一条 |
| 中位数评分 | 计算字段               | 查询 `ratings` 表，计算中位数                   |
| 平均数评分 | 计算字段               | 查询 `ratings` 表，计算平均值                   |
| 常用位置   | 计算字段               | 根据历史比赛数据统计（此版本可能不实现）        |
| 常用英雄   | 计算字段               | 根据历史比赛数据统计最常用英雄                  |

**Tab 3：点评 table**

| 字段      | 数据来源             | 说明                       |
| --------- | -------------------- | -------------------------- |
| 比赛 id   | `ratings.match_id`   | 关联 `matches` 表          |
| 玩家 id   | `ratings.player_id`  | 关联 `players` 表          |
| 所在队伍  | 从 `matches` 表查询  | 根据比赛数据判断           |
| 队友/对手 | 计算字段             | 根据当前账号和玩家 ID 判断 |
| 英雄      | 从 `matches` 表查询  | `player_X_hero_name`       |
| KDA       | 从 `matches` 表查询  | `player_X_kda`             |
| 分数      | `ratings.score`      | 1-5 星评分                 |
| 点评时间  | `ratings.created_at` | 格式化显示时间             |
| 文案      | `ratings.comment`    | 显示评论内容               |

**交互功能**：

- Tab 切换：使用 React Tabs 组件
- 筛选：支持按时间范围、游戏模式、胜负等筛选
- 排序：支持按各字段排序（升序/降序）
- 点击比赛行：跳转到比赛详情（状态 5）
- 点击玩家行：跳转到玩家详情（状态 6）

**实现可行性**：✅ 完全支持

- 使用 React Table 或自定义表格组件
- 使用 Dexie.js 进行复杂查询和计算
- 注意性能优化：大量数据时使用虚拟滚动

#### 5. 比赛详情组件

**显示条件**：点击总览数据组件（状态 4）中的比赛，或 `game_state === 'spectating' || 'playing'`（状态 5）

**功能**：

- 显示历史比赛信息：玩家+英雄+KDA+胜负+GPM XPM
- 所有数据从 IndexedDB `matches` 表查询

**数据展示**：

- 从 IndexedDB `matches` 表查询指定 `match_id` 的比赛记录
- 通过关联 `players` 表查询玩家名称（根据 `player_X_id` 关联 `players.player_id`）

**显示内容**：

- 10 个玩家的信息表格
- 每个玩家显示：玩家名称（从 `players` 表查询）、英雄（`player_X_hero_name`）、KDA（`player_X_kda`）、GPM（`player_X_gpm`）、XPM（`player_X_xpm`）、队伍（天辉/夜魇）
- 高亮显示当前玩家（根据 `matches.player_id` 判断）
- 显示比赛基本信息：比赛 ID（`match_id`）、时间（`end_time`）、模式（`match_mode`）、时长（`end_time - start_time`）、胜负（`winner`）

**交互功能**：

- 点击玩家：跳转到玩家详情（状态 6）
- 前进/后退按钮：导航到上一个/下一个状态
- Home 按钮：返回总览（状态 4）

**实现可行性**：✅ 完全支持

- 从 IndexedDB `matches` 表查询比赛数据
- 通过 `player_X_id` 关联 `players` 表查询玩家名称
- 注意：需要处理玩家名称可能不存在的情况（显示玩家 ID 或"未知玩家"）

#### 6. 玩家详情组件

**显示条件**：点击总览数据组件（状态 4）或比赛详情（状态 5）中的玩家

**功能**：

- 友方胜率 + 敌方胜率（如果是自己就是胜率）
- 评分上次/中位数/平均数+四舍五入对应文案
- 常用位置，常用英雄
- 曾用名列表

**数据计算**：

- **友方胜率**：查询与该玩家同队的比赛，计算胜率
  - 判断逻辑：在 `matches` 表中，查找 `player_id` 字段等于当前玩家 ID 的比赛，然后判断该玩家所在的队伍（通过 `player_1_id` 到 `player_5_id` 为天辉，`player_6_id` 到 `player_10_id` 为夜魇），如果 `winner` 等于该队伍，则计为胜利
  - 计算公式：`(胜利场次 / 总场次) * 100%`
- **敌方胜率**：查询与该玩家对战的比赛，计算胜率
  - 判断逻辑：在 `matches` 表中，查找包含该玩家 ID 的比赛（`player_1_id` 到 `player_10_id` 中包含该玩家），判断该玩家所在的队伍，如果 `winner` 不等于该队伍，则计为失败（敌方胜利）
  - 计算公式：`(敌方胜利场次 / 总场次) * 100%`
- **胜率**（如果是自己）：查询所有包含该玩家的比赛，计算胜率
  - 判断逻辑：在 `matches` 表中，查找 `player_id` 等于当前账户 ID 的比赛，如果 `winner` 等于该玩家所在队伍，则计为胜利
  - 计算公式：`(胜利场次 / 总场次) * 100%`
- **评分统计**：从 `ratings` 表查询，计算上次/中位数/平均数
- **评分文案**：根据评分值显示对应文案（1-5 星对应不同文案）
- **常用位置**：根据历史比赛数据统计（此版本可能不实现）
- **常用英雄**：从 `matches` 表统计最常用英雄（按 `player_X_hero_id` 统计）
- **曾用名列表**：从 `players.previous_names` 数组显示

**交互功能**：

- 前进/后退按钮：导航到上一个/下一个状态
- Home 按钮：返回总览（状态 4）
- 可以查看该玩家的历史比赛列表（可选功能）

**实现可行性**：✅ 完全支持

- 使用 Dexie.js 进行复杂查询和统计
- 注意性能：大量数据时使用索引优化查询

#### 7. 广告位组件

**显示条件**：暂不考虑

**功能**：预留广告位

**实现可行性**：✅ 支持（暂不实现）

## ingame

容器：可以调节尺寸和位置 + 快捷键控制显示关闭 + 自动弹出 + overlay

### 窗口管理功能

根据 Overwolf API，ingame 窗口支持以下功能：

- **调节尺寸和位置**：✅ 支持

  - `resizable: true` 允许用户调整窗口大小
  - `start_position` 设置初始位置
  - `overwolf.windows.dragMove()` API 允许用户拖动窗口

- **快捷键控制显示**：✅ 支持

  - `hotkeys` 配置中定义快捷键
  - `action: "ToggleWindow"` 内置动作切换窗口显示
  - 或使用 `action-type: "custom"` 在 background 中自定义逻辑

- **快捷键控制显示关闭**：✅ 支持

  - `hotkeys` 配置中定义快捷键
  - `action: "ToggleWindow"` 内置动作切换窗口显示
  - 或使用 `action-type: "custom"` 在 background 中自定义逻辑

- **自动弹出**：✅ 支持

  - background 监听游戏事件（`DOTA_GAMERULES_STATE_STRATEGY_TIME`、`match_ended`）
  - 调用 `overwolf.windows.restore()` 自动打开窗口
  - 已实现：`openIngameWindow('strategy')` 和 `openIngameWindow('postgame')`

- **Overlay**：✅ 支持
  - `transparent: true` 配置为透明覆盖层
  - `desktop_only: false` 允许在游戏内显示
  - `show_in_taskbar: false` 不显示在任务栏

详细说明见：[窗口管理功能文档](../docs/window-management.md)

### 组件显示控制

ingame 窗口根据 background 传递的 `DISPLAY_MODE` 参数控制展示的组件：

- **`mode === 'strategy'`**：显示玩家简单评价组件
- **`mode === 'postgame'`**：显示编辑评价组件

### 主要组件

#### 1. 显示玩家简单评价组件（策略阶段）

**显示条件**：`DISPLAY_MODE.mode === 'strategy'`

**功能**：

- **显示友方胜率/敌方胜率**：

  - 根据当前玩家列表，从 IndexedDB 查询历史比赛数据
  - 计算每个玩家的友方胜率（同队）和敌方胜率（对战）
  - 显示格式：`友方: 65% / 敌方: 45%`

- **显示评分（上次/平均数）+ 四舍五入对应文案**：

  - 从 `ratings` 表查询每个玩家的评分记录
  - 上次评分：按 `created_at` 降序取第一条
  - 平均评分：计算所有评分的平均值，四舍五入
  - 评分文案：根据评分值显示对应文案（1-5 星对应不同文案，可在设置中配置）

- **显示文字词云（常用评价关键词）**：
  - 从 `ratings.comment` 字段提取关键词
  - 使用词云库（如 `react-wordcloud` 或 `wordcloud2.js`，需检查商业友好协议）可视化
  - 中文分词：使用中文分词库（如 `nodejieba` 或 `segment`，需检查商业友好协议）处理中文评论
  - 词云更新频率：每次 `PLAYER_INFO` 消息更新时重新计算
  - 显示该玩家最常收到的评价关键词（Top 20）

**交互**：

- 点击玩家卡片：打开玩家详情（跳转到 desktop 窗口）
  - 实现方式：通过 `overwolf.windows.sendMessage()` 发送消息给 desktop 窗口
  - 或使用 `overwolf.windows.restore()` 打开 desktop 窗口并传递参数

**数据来源**：

- 通过 `PLAYER_INFO` 消息接收玩家列表（实时数据）
- 从 IndexedDB 查询历史评分数据计算胜率和平均分
- 从 `ratings` 表查询评论内容生成词云

**实现可行性**：✅ 完全支持

- 数据查询：使用 Dexie.js 进行复杂查询
- 词云可视化：使用第三方库实现
- 窗口间跳转：使用 Overwolf 窗口通信 API

#### 2. 编辑评价组件（赛后阶段）

**显示条件**：`DISPLAY_MODE.mode === 'postgame'`

**功能**：

- **编辑即保存（实时保存到 IndexedDB）**：

  - 用户输入后立即保存，无需点击保存按钮
  - 使用防抖（debounce）优化保存频率（建议 500ms-1000ms）
  - 显示保存状态提示（保存中/已保存）

- **评分默认三分（1-5 星评分）**：

  - 每个玩家默认选中 3 星评分
  - 使用星级评分组件（如 `react-rating-stars-component` 或自定义）
  - 支持点击修改评分

- **文字输入框（评论内容）**：
  - 每个玩家一个评论输入框
  - 支持多行文本输入
  - 可设置最大字符数限制（如 500 字）

**交互**：

- **选择评分后自动保存**：

  - 监听评分变化事件
  - 立即保存到 IndexedDB `ratings` 表
  - 显示保存成功提示

- **输入评论后自动保存（可设置防抖）**：

  - 使用 `useDebounce` hook 或 `lodash.debounce`
  - 用户停止输入后 500ms-1000ms 自动保存
  - 显示保存状态

- **支持为多个玩家评分**：
  - 显示所有 10 个玩家的评分卡片
  - 每个玩家独立的评分和评论输入
  - 可以批量操作（如"全部 3 星"按钮，可选功能）

**数据保存**：

- **保存到 `ratings` 表**：
  - `uuid`: 生成 UUID v4
  - `player_id`: 从 `PLAYER_INFO` 消息获取
  - `account_id`: 从 `accounts` 表查询当前账户（按 `updated_at` 降序排序，取第一条）
  - `match_id`: 从 `MATCH_INFO` 消息获取（推荐），或从 `onInfoUpdates2.info.match_info.pseudo_match_id` 获取（备用）
  - `score`: 用户选择的评分（1-5）
  - `comment`: 用户输入的评论
  - `created_at`: 当前时间戳

**`match_id` 获取方式（明确）**：

1. **通过消息传递**（推荐）：

   - background 在 `match_ended` 事件触发时，发送 `MATCH_INFO` 消息给 ingame 窗口
   - 消息包含 `match_id`（`pseudo_match_id`）
   - 消息格式：
     ```typescript
     {
       type: 'MATCH_INFO',
       match_id: string | number,
       match_mode: string,
       winner: 'radiant' | 'dire'
     }
     ```

2. **通过主动查询**（备用）：

   - ingame 窗口在显示编辑评价组件时，调用 `overwolf.games.events.getInfo()` 获取当前 `match_id`
   - 如果获取失败，使用最近一次 `onInfoUpdates2` 缓存的 `match_id`

3. **数据验证**：
   - 保存评分前，验证 `match_id` 是否存在
   - 如果不存在，记录警告，使用临时 ID（格式：`temp_${timestamp}`）

**数据来源**：

- 通过 `PLAYER_INFO` 消息接收玩家列表（实时数据）
- 通过 `MATCH_INFO` 消息接收比赛信息（用于获取 `match_id`）
- 从 `accounts` 表查询当前账户信息

**实现可行性**：✅ 完全支持

- 使用 Dexie.js 保存到 IndexedDB
- 使用 React Hooks 管理状态和防抖
- 注意：需要确保 `match_id` 在比赛结束后能正确获取

### 组件显示逻辑

```typescript
// ingame.tsx 中的状态管理
const [displayMode, setDisplayMode] = useState<"strategy" | "postgame" | null>(
  null
);
const [players, setPlayers] = useState<Player[]>([]);

// 根据 displayMode 决定显示哪个组件
{
  displayMode === "strategy" && <PlayerSimpleRating players={players} />;
}
{
  displayMode === "postgame" && <EditRating players={players} />;
}
```

## setting（合并 desktop？）

语言：中文/英文
ingame 的快捷键：
评分文案：1 星到 5 星
数据导入、导出、删除全部按钮
关于
版本号 联系邮箱等

### 数据导入/导出功能

#### 数据导出

- **导出格式**：JSON 文件
- **导出内容**：所有表的数据（matches、players、accounts、ratings）
- **导出时机**：用户手动触发
- **文件命名**：`dota2-performance-backup-YYYY-MM-DD.json`
- **文件结构**：
  ```json
  {
    "version": "1.0",
    "exported_at": 1234567890,
    "data": {
      "matches": [...],
      "players": [...],
      "accounts": [...],
      "ratings": [...]
    }
  }
  ```

#### 数据导入

- **导入格式**：JSON 文件（与导出格式一致）
- **导入策略**：
  - 检查数据格式有效性（验证 JSON 结构、字段类型等）
  - 检查数据完整性（验证必要字段是否存在）
  - 合并策略：根据 `uuid` 判断是否已存在，存在则更新，不存在则新增
  - 如果导入的数据与现有数据冲突（如 `match_id` 重复），提示用户选择覆盖或跳过
- **导入时机**：用户手动选择文件
- **导入确认**：显示导入预览（数据条数、冲突情况等），用户确认后执行导入

#### 删除全部数据

- **确认对话框**：防止误操作，需要用户输入确认文字（如"DELETE"）
- **删除范围**：删除所有表的数据（matches、players、accounts、ratings）
- **删除后处理**：删除后无法恢复（除非有备份），提示用户已删除
- **建议**：删除前提示用户先导出备份

## background

### 窗口间通信机制

**background 可以给 ingame 传递参数来控制展示的组件**，通过 Overwolf 的 `overwolf.windows.sendMessage` API 实现。

#### 通信流程

1. **background 发送消息**：

   - 在 `background.ts` 中通过 `sendMessageToWindow()` 方法发送消息
   - 使用 `overwolf.windows.sendMessage(windowId, windowName, message, callback)` API
   - 消息格式为 JSON 对象，包含 `type` 和相应的数据字段

2. **ingame 接收消息**：
   - 在 `ingame.tsx` 中通过 `onMessageReceived()` 监听消息
   - 使用 `overwolf.windows.onMessageReceived.addListener()` 注册监听器
   - 根据消息类型更新组件状态

#### 消息类型定义

当前支持的消息类型：

1. **`DISPLAY_MODE`** - 控制显示模式

   ```typescript
   {
     type: 'DISPLAY_MODE',
     mode: 'strategy' | 'postgame'
   }
   ```

   - `strategy`: 策略阶段模式，显示玩家简单评价组件
   - `postgame`: 赛后阶段模式，显示编辑评价组件

2. **`PLAYER_INFO`** - 传递玩家信息
   ```typescript
   {
     type: 'PLAYER_INFO',
     players: Player[]
   }
   ```
   - `players`: 玩家数组，包含玩家 ID、名称、英雄、队伍等信息

#### 触发时机

- **策略阶段（`DOTA_GAMERULES_STATE_STRATEGY_TIME`）**：

  - background 检测到游戏状态变化
  - 调用 `openIngameWindow('strategy')`
  - 发送 `DISPLAY_MODE` 消息，`mode` 为 `'strategy'`
  - ingame 窗口自动弹出并显示**玩家简单评价组件**

- **赛后阶段（`DOTA_GAMERULES_STATE_POST_GAME`）**：
  - background 检测到 `match_ended` 事件
  - 调用 `openIngameWindow('postgame')`
  - 发送 `DISPLAY_MODE` 消息，`mode` 为 `'postgame'`
  - ingame 窗口自动弹出并显示**编辑评价组件**

#### 实现位置

- **发送方**：`src/background/background.ts`

  - `sendMessageToWindow()` 方法（第 566-582 行）
  - `openIngameWindow()` 方法（第 549-564 行）

- **接收方**：`src/ingame.tsx`

  - `onMessageReceived()` 监听器（第 18-32 行）

- **工具函数**：`src/utils/overwolf.ts`
  - `onMessageReceived()` 封装函数（第 105-112 行）

### 扩展消息类型（未来可添加）

- `UPDATE_PLAYER_STATS` - 更新玩家实时数据（KDA、GPM、XPM 等）
- `MATCH_INFO` - 传递比赛信息（比赛 ID、模式、时长等）
  ```typescript
  {
    type: 'MATCH_INFO',
    match_id: string | number,
    match_mode: string,
    winner: 'radiant' | 'dire',
    start_time?: number,
    end_time?: number
  }
  ```
- `TOGGLE_VISIBILITY` - 控制窗口显示/隐藏
- `RESIZE_WINDOW` - 控制窗口尺寸

# 国际化

中英
英雄名称
界面内容
