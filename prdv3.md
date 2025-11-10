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


# 数据库
## 远程数据源(暂时不用考虑)
https://api.opendota.com/api/matches


## 数据类型
```
// Dota 2 GEP data types used by Overwolf

export enum Dota2GameState {
  PLAYING = "playing",
  SPECTATING = "spectating",
  IDLE = "idle",
}

export enum Dota2MatchState {
  WAIT_FOR_PLAYERS_TO_LOAD = "DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD",
  HERO_SELECTION = "DOTA_GAMERULES_STATE_HERO_SELECTION",
  STRATEGY_TIME = "DOTA_GAMERULES_STATE_STRATEGY_TIME",
  PRE_GAME = "DOTA_GAMERULES_STATE_PRE_GAME",
  GAME_IN_PROGRESS = "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
  POST_GAME = "DOTA_GAMERULES_STATE_POST_GAME",
  TEAM_SHOWCASE = "DOTA_GAMERULES_STATE_TEAM_SHOWCASE",
}

export enum Dota2Team {
  RADIANT = "radiant", // 2
  DIRE = "dire", // 3
  // 0 not in a team
}

export enum Dota2GameMode {
  ALL_PICK = "AllPick",
  ALL_PICK_RANKED = "AllPickRanked",
  SINGLE_DRAFT = "SingleDraft",
  RANDOM_DRAFT = "RandomDraft",
  ALL_RANDOM = "AllRandom",
  LEAST_PLAYED = "LeastPlayed",
  LIMITED_HEROES = "LimitedHeroes",
  CAPTAINS_MODE = "CaptainsMode",
  CAPTAINS_DRAFT = "CaptainsDraft",
}


export interface Dota2Event {
  events: {
    name: string;
    data: string; // JSON 字符串化数据
  }[]
}

export interface Dota2EventMatchEnded {
  winner: keyof typeof Dota2Team 
}

interface Dota2InfoUpdates<T, U> {
  feature: T;
  info: U;
}

export interface MatchInfo {
  match_info: {
    pseudo_match_id?: string;
    game_mode?: string; // JSON 字符串化数据
    team_score?: string; // JSON 字符串化数据
  }
}

export interface GameMode {
  lobby_type: string; // 需破解
  game_mode: string; // 和Dota2GameMode类似需破解
}

export interface TeamScore {
  [Dota2Team.RADIANT]: number;
  [Dota2Team.DIRE]: number;
}

export interface Dota2InfoUpdatesMatchInfo extends Dota2InfoUpdates<"match_info", MatchInfo> {}

interface MatchStateChanged {
  game: {
    match_state: keyof typeof Dota2MatchState
  }
}

export interface Dota2InfoUpdatesMatchStateChanged extends Dota2InfoUpdates<"match_state_changed", MatchStateChanged> {}

export interface GameStateChanged {
  game: {
    game_state: keyof typeof Dota2GameState
  }
}


export interface Dota2InfoUpdatesGameStateChanged extends Dota2InfoUpdates<"game_state_changed", GameStateChanged> {}

export interface Dota2Me {
  me: {
    steam_id?: string;
    team?: keyof typeof Dota2Team;
  }
}

export interface Dota2InfoUpdatesMe extends Dota2InfoUpdates<"me", Dota2Me> {}

export interface Dota2Roaster {
  roster: {
    bans?: string; // 不关心
    players?: string; // JSON 字符串化数据
    draft?: string; // 不关心
  }
}

export interface Dota2Player {
  steamId?: string;
  name?: string;
  hero?: string; // 0 not pick
  team?: number; // 2 – Radiant 3 – Dire 0 – Not in a team
  role?: number; // "role" - role type. (1 - Safelane, 2 - Offlane, 4 - Midlane, 8 - Other, 16 - HardSupport, 888)
  team_slot?: number; // 0-4 per team
  player_index?: number; // 0-9
}

export interface Dota2Roster extends Dota2InfoUpdates<"roster",  Dota2Roaster>{}

export interface GlobalMatchData {
  match_info: { 
    pseudo_match_id?: string; // onInfoUpdates2 match_info
    game_mode?: GameMode; // onInfoUpdates2 match_info
    team_score: TeamScore; // onInfoUpdates2 match_info
  }
  me: {
      steam_id?: string; // onInfoUpdates2 me
      team?: keyof typeof Dota2Team; // onInfoUpdates2 me
    }
    roster: {
      players: Dota2Player // onInfoUpdates2 roster
    }
  game: {
      winner: keyof typeof Dota2Team // onNewEvents match_ended
      game_state: keyof typeof Dota2GameState // onNewEvents game_state_changed
  }
}
```

### overwolf类型
@overwolf/types

### dota2类型

## 数据表

### 比赛表 matches
信息量最大的表，根据GlobalMatchData写入
#### 索引
- match_id：唯一索引（用于快速查找比赛）
- player_id：索引（用于查找某玩家的所有比赛）
- end_time：索引（用于时间范围查询）
- match_mode：索引（用于按模式筛选）
#### 表设计

uuid 唯一标识符 创建记录时生成，不可修改 number
created_at 创建记录时间,毫秒级时间戳 number
updated_at 更新记录时间,毫秒级时间戳 number
match_id 比赛id match_info.pseudo_match_id string
me 我的steamid match_info.me.steam_id string
game_mode 游戏模式 match_info.game_mode GameMode
win 计算字段，通过winner+players中steamId和me一致的玩家的team对比得知玩家是否胜利，如果没有结果显示为空 boolean
team_score 比分 match_info.TeamScore  TeamScore
players 队伍 roster.players Dota2Player


### 玩家表 players

#### 索引
- player_id：唯一索引（主键）
- updated_at
#### 表设计

uuid 唯一标识符 创建记录时生成，不可修改 number
created_at 创建记录时间,毫秒级时间戳 number
updated_at 更新记录时间,毫秒级时间戳 number
player_id 玩家id，玩家的steam_id Dota2Player.steamId string
name 当前昵称 Dota2Player.name string
name_list 曾用名列表 Dota2Player.name[] string[]
hero_list Dota2Player.hero[] string[]
match_list 比赛id列表 match_info.pseudo_match_id[] string[]


### 评价表 comments
##### 索引
- player_id：索引（用于查找某玩家的所有评分）
- match_id：索引（用于查找某比赛的所有评分）
- updated_at

#### 表设计
uuid 唯一标识符 创建记录时生成，不可修改 number
created_at 创建记录时间,毫秒级时间戳 number
updated_at 更新记录时间,毫秒级时间戳 number
player_id 玩家id string
match_id 比赛id string
score 评分 用户输入,默认3分 number
comment 文本评论 用户输入 string


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
### dota2监控
启动应用之后overwolf.games.onGameInfoUpdated.addListener 持续监听游戏状态

通过以下方法判断dota2是否在启动中
```
function gameLaunched(gameInfoResult) {
    if (!gameInfoResult) {
        return false;
    }
    if (!gameInfoResult.gameInfo) {
        return false;
    }
    if (!gameInfoResult.runningChanged && !gameInfoResult.gameChanged) {
        return false;
    }
    if (!gameInfoResult.gameInfo.isRunning) {
        return false;
    }
    // NOTE: we divide by 10 to get the game class id without it's sequence number
    if (Math.floor(gameInfoResult.gameInfo.id/10) != 7314) {
        return false;
    }
    console.log("LoL Launched");
    return true;
}
// 还可以通过 gameInfoResult.gameInfo.commandLine 中是否包含 `-gamestateintegration` 判断是否符合overwolf规范
// 还有 gameInfoResult.gameInfo.[width height logicalWidth logicalHeight]等尺寸信息
```
启动中添加监听 + 循环设置支持特性
```
// todo 需要避免重复添加监听 
overwolf.games.events.onError.addListener
overwolf.games.events.onInfoUpdates2.addListener								
overwolf.games.events.onNewEvents.addListener
setFeatures()

function setFeatures() {
    overwolf.games.events.setRequiredFeatures(requestedFeatures, function(info) {
        if (info.status == "error")
        {
            window.setTimeout(setFeatures, 2000);
            return;
        }
    });
}
```

不在启动中移除监听
```
overwolf.games.events.onError.removeListener
overwolf.games.events.onInfoUpdates2.removeListener
overwolf.games.events.onNewEvents.removeListener
```
### 比赛监控
通过维护全局比赛对象 GlobalMatchData 来监控当前比赛状态
1. 初始化应用后 创建空的 GlobalMatchData
2. 持续接收到 Dota2InfoUpdates 和 Dota2Event，解析分析到的数据，不断将接受数据迭代到全局对象中（null undefined [] ''除外）
3. 当接收到起点信号（每局只会触发一次），创建比赛表记录和玩家表记录，一个全局对象只会创建一次，弹出ingame（传入玩家数据展示评分历史）
4. 继续持续迭代全局对象
5. 当接受到终点信号时，最后一次更新比赛表，创建评价表记录，弹出ingame（传入玩家数据展示评分编辑组件），并重置GlobalMatchData
6. 起点信号 onNewEvents JSON.parse(events[0].data).match_state 为 DOTA_GAMERULES_STATE_STRATEGY_TIME 或 DOTA_GAMERULES_STATE_GAME_IN_PROGRESS
7. 终点信号 onNewEvents events[0].name 为 game_over
8. 然后循环345


# 页面


## background
### 功能

#### 窗口管理
根据overwolf.windows提供弹出窗口、关闭窗口、最小化窗口、修改窗口位置和尺寸等基本功能

#### 游戏监听
参考`事件循环`章节

#### 热键绑定
根据overwolf.settings.hotkeys提供热键能力


#### 维护全局对象
维护GlobalMatchData和setting相关数据


#### 数据库接入和维护
background接入数据库、desktop ingame通过background来CURD数据
提供基本的增删查改能力

#### 窗口通信
background和desktop ingame之间的数据传输




## desktop
### 容器功能
可以调节尺寸和位置 + 快捷键控制显示关闭 + 可以调透明度 + overlay
### 路由
可以通过鼠标按钮 4/5前进后退

### 子页面
banner中 包含前进按钮 主页按钮 后退按钮 设置按钮

点击比赛列表中比赛行进入比赛详情 
点击比赛详情或者玩家列表进入对应玩家详情

#### 主页
一个table通过tab切换比赛表 玩家表 和评分表
包含基础分页、筛选、排序功能

比赛表
- 筛选项 
比赛id input match_id
比赛时间 dateTimeRange updated_at
比赛模式 select game_mode
胜负 select winner

- 表格列
比赛id  match_id
游戏模式 game_mode
比赛时间 updated_at
胜负 winner

玩家表
- 筛选项
玩家名称 input（同时查询name和name_list）
遭遇时间 比赛时间 dateTimeRange updated_at
玩过英雄 input(暂定)

- 表格列
名称
id
第一次遭遇
上次遭遇
遭遇次数 match_list长度
平均分 在comments中根据player_id查询计算score

评价表
- 筛选项
分数
比赛id
评价时间
玩家id

- 表格列
评价时间
玩家名称 根据player_id寻找
比赛id
评分
评论内容 comment 

#### 比赛详情
展示
游戏比分 team_score winner game_mode

玩家 根据player_index按顺序展示玩家名称 id 英雄

#### 玩家详情
该玩家的名称 
曾用名列表 
英雄列表
比赛数据列表
评分数据列表


#### 设置页（不计入路由历史）
包括以下功能
导出数据按钮 - 点击以json格式导出数据库所有数据
导入数据按钮 - 点击以json格式导入数据库，增量更新，如果有冲突以导入文件为准
清空数据按钮 - 点击清空数据
语言切换radio - 默认中文，点击切换语言
修改评分文案 - 有5个input，对应1星到5星显示的文案，默认（拉 菜鸟 NPC 顶级 夯）


## ingame
### 容器功能
可以调节尺寸和位置 + 快捷键控制显示关闭 + overlay

当接收到起点信号（每局只会触发一次），弹出ingame（传入玩家数据展示评分历史）
当接受到终点信号时，弹出ingame（传入玩家数据展示评分编辑组件）

### 页面
页面上包含
关闭按钮 点击关闭本页面
切换按钮 切换历史或者编辑模式
#### 评分历史
展示上次评分 评价评分 评分文案

#### 评分编辑
展示star评分组件
展示input comment输入框


# 其他
## 国际化能力
当设置页切换语言时，修改background中的设置值，然后通知desktop和ingame修改语言相关选项

## 词云
暂时搁置

## 广告接入
暂时搁置



# 注意
检查依赖库，使用商业友好协议的依赖