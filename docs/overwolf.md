# Overwolf 参考与 GEP 摘要（Dota 2）

本文档基于以下 4 篇官方文档作为入门与实现参考：

- OW SDK 介绍：`https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction`
- Dota 2（GEP 支持页）：`https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2`
- OW API 总览：`https://dev.overwolf.com/ow-native/reference/ow-api-overview`
- GEP 介绍：`https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro`

## 核心概念速览

- Overwolf App = 桌面窗口 + In-Game Overlay 窗口，通过 `manifest.json` 声明。
- GEP（Game Events Provider）= 从游戏实时推送事件与信息的机制，提供 `onNewEvents` 与 `onInfoUpdates2` 两种回调流。
- 设置监听前必须声明 `required features`，不同游戏支持的 features 不同（详见 Dota 2 支持页）。
- 典型 API：
  - `overwolf.games.events.setRequiredFeatures([...])`
  - `overwolf.games.events.onNewEvents.addListener(cb)`
  - `overwolf.games.events.onInfoUpdates2.addListener(cb)`
  - `overwolf.games.events.getInfo(cb)`（主动拉取快照）
  - `overwolf.windows.*`（窗口管理）
  - `overwolf.settings.hotkeys.onPressed`（热键）

## Dota 2 - 常用 GEP Features

以下为本项目使用、且在 Dota 2 支持页常见的 features（以实际可用为准）：

- `game_state`：是否在游戏中、观战、空闲等。
- `match_state_changed`：选人/策略/对局中/结算等阶段变化。
- `roster`：玩家与队伍、英雄等阵容信息。
- `match_info`：比赛基础信息（房间、时长、胜者等，依游戏提供为准）。
- `me`：与本机玩家相关的个人数据。
- 战斗与经济：`kill`、`assist`、`death`、`cs`（补刀/反补）、`xpm`、`gpm`、`gold`。
- `match_ended`：比赛结束、胜负。

建议在应用启动或检测到 Dota 2 运行后：

1. 调用 `setRequiredFeatures` 注册所需特性。
2. 若成功，立即 `getInfo` 取一次快照（常用于初始化 UI）。
3. 同时订阅 `onNewEvents` 与 `onInfoUpdates2`。

## 事件与信息流

### onInfoUpdates2 事件机制

**触发时机：**

- **不是循环的**，而是**事件驱动**的
- 当游戏内数据发生变化时，GEP 会主动推送更新
- 常见触发场景：
  - 游戏状态变化（进入游戏、观战、退出等）
  - 比赛阶段变化（选人、策略阶段、游戏进行中、结算等）
  - 玩家数据更新（KDA、GPM、XPM 等数值变化）
  - 阵容信息变化（玩家加入/离开、英雄选择等）
  - 比赛信息更新（时长、胜负等）

**触发频率：**

- 取决于游戏内数据变化的频率
- 通常几秒到几十秒触发一次（当有数据变化时）
- 比赛进行中可能更频繁（玩家数据实时更新）
- 比赛结束后会触发最终快照

**使用建议：**

- 在 `setRequiredFeatures` 成功后，立即调用 `getInfo()` 获取一次初始快照
- 订阅 `onInfoUpdates2` 监听后续更新
- 每次触发时保存完整快照，用于数据库存储

### onNewEvents 事件机制

**触发时机：**

- 也是事件驱动的，不是循环的
- 当特定游戏事件发生时触发（如击杀、死亡、补刀等）
- 频率取决于游戏内事件发生的频率

**事件类型：**

- `kill/assist/death`（含累计数、连杀/连死）
- `cs`（last_hits/denies）
- `xpm/gpm/gold`
- `match_state_changed`、`match_ended`

### 两者配合使用

- 以 `onInfoUpdates2` 提供的结构化快照为主（用于数据库存储）
- 以 `onNewEvents` 驱动增量变化或实时 UI 更新
- 数据库存储统一使用 `onInfoUpdates2` 快照，确保数据一致性

## Dota 2 游戏模式（Game Mode）

`match_info.mode` 字段可能包含以下游戏模式：

- `AllPick` - 全英雄选择
- `AllPickRanked` - 全英雄选择（天梯）
- `SingleDraft` - 单一征召
- `RandomDraft` - 随机征召
- `AllRandom` - 全随机
- `LeastPlayed` - 最少使用
- `LimitedHeroes` - 有限英雄
- `CaptainsMode` - 队长模式
- `CaptainsDraft` - 队长征召

类型定义见 `src/types/dota2-gep.ts` 中的 `Dota2GameMode`。

## 获取游戏版本

根据 Overwolf GEP 文档，可以通过以下方式获取 Dota 2 游戏版本：

### 方法 1：通过 `gep_internal` Feature

- **订阅 Feature**：在 `setRequiredFeatures` 中添加 `'gep_internal'`
- **获取版本信息**：通过 `onInfoUpdates2.info.gep_internal.version_info` 获取
- **字段说明**：
  - `local_version`：本地 GEP 版本号
  - `public_version`：公共 GEP 版本号
- **注意**：`gep_internal` 提供的是 GEP 版本信息，而非游戏版本本身

### 方法 2：通过 `overwolf.games.getGameInfo()` API

- **API 调用**：`overwolf.games.getGameInfo(callback)`
- **获取信息**：从返回的 `gameInfo` 对象中获取游戏相关信息
- **可能包含**：进程命令行参数、游戏路径等，但可能不直接提供版本号

### 方法 3：通过游戏进程信息（间接）

- **API 调用**：`overwolf.games.getRunningGameInfo(callback)`
- **获取信息**：从返回的游戏信息中可能包含版本相关信息
- **限制**：此方法可能不直接提供游戏版本号

**建议**：

- 如果需要 GEP 版本信息，使用方法 1（`gep_internal`）
- 如果需要游戏版本信息，可能需要通过其他方式获取（如解析游戏文件或使用第三方 API，但需注意合规性）

## 窗口与热键（简要）

- 通过 `overwolf.windows` 获取/还原/置顶/拖动窗口，用于实现 In-Game Overlay 的显示与交互。
- 通过 `overwolf.settings.hotkeys` 监听自定义热键，控制显示/隐藏或切换面板。

## 比赛开始/结束判断

**比赛开始判断：**

- 通过 `onNewEvents.match_state_changed` 事件，当 `match_state` 变为 `DOTA_GAMERULES_STATE_GAME_IN_PROGRESS` 时表示比赛开始
- 或通过 `onInfoUpdates2.info.match_info` 中检测到 `match_id` 且比赛状态为进行中
- 可用于 UI 提示或初始化比赛跟踪

**比赛结束判断：**

- **主要方式**：通过 `onNewEvents.match_ended` 事件触发，这是最可靠的比赛结束信号
- **备用方式**：通过 `onNewEvents.match_state_changed` 事件，当 `match_state` 变为 `DOTA_GAMERULES_STATE_POST_GAME` 时表示比赛结束
- **数据收集**：当 `onNewEvents.match_ended` 触发时，立即从 `onInfoUpdates2.info` 收集完整数据并创建数据库记录

**英雄信息获取：**

- GEP 提供：`roster.players[].hero_id`（英雄 ID）和 `roster.players[].hero` 或 `heroName`（英雄名称）
- 英雄选择顺序：GEP 可能不直接提供，可通过以下方式获取：
  - 监听选人阶段（`DOTA_GAMERULES_STATE_HERO_SELECTION`）的 `onInfoUpdates2` 事件，记录玩家选择英雄的时间顺序
  - 或根据 `roster.players[].team_slot` 和 `index` 推断（但可能不准确）

## 本项目中的最小落地要点

- `required features` 建议集合：
  `['game_state','match_state_changed','roster','match_info','me','match_ended','kill','assist','death','cs','xpm','gpm','gold']`
- 进程内合并流程：
  - 应用启动后设置 features → 首次 `getInfo` → 订阅 `onInfoUpdates2` 与 `onNewEvents`。
  - 解析 `roster.players` 作为主数据源，补齐 ID/队伍/英雄等。
  - 使用 `match_state_changed` 与 `game_state` 控制 UI（策略阶段/对局中/赛后被动或自动弹出）。
  - **比赛结束时**：监听 `onNewEvents.match_ended` 事件，触发时从 `onInfoUpdates2.info` 收集完整数据并创建数据库记录。
- 合规提示：数据来源仅自 GEP 与历史本地记录，不调用第三方未授权接口。

## 相关链接（再次列出方便跳转）

- OW SDK 介绍：`https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction`
- GEP 介绍：`https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro`
- OW API 总览：`https://dev.overwolf.com/ow-native/reference/ow-api-overview`
- Dota 2 支持页：`https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2`
