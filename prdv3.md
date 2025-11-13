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

# 数据库
## 远程数据源(暂时不用考虑)
https://api.opendota.com/api/matches


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
winner 计算字段，通过winner+players中steamId和me一致的玩家的team对比得知玩家是否胜利，如果没有结果显示为空 boolean
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


# Overwolf API 能力清单
- **窗口管理**：`overwolf.windows.*` 用于创建、显示、定位窗口，包含 `dragResize`, `setPosition`, `getCurrentWindow` 等。
- **游戏状态**：`overwolf.games.launchers.*` 可获取 Steam/Dota 2 启动与版本信息，用于辅助启动监控。
- **热键管理**：`overwolf.settings.hotkeys` 支持动态更新热键、监听触发；manifest 中需预设默认快捷键。
- **存储方案**：`overwolf.extensions.io`, `overwolf.settings`, IndexedDB 组合实现；background 提供统一的 CRUD service。
- **用户配置**：`overwolf.settings.*` 读取语言、系统主题，配合 i18n 切换。
- **日志调试**：`overwolf.extensions.log` 输出调试文件，可结合 Sentry 或自研上报（需确认许可证）。

# 构建与发布要求
- 使用 `vite build` 生成 `dist`，再通过 `overwolf-tools-cli`（参考 `front-app`）完成打包上传。
- CI 建议：`pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test` → `pnpm build` → `overwolf-tools-cli upload`。
- `manifest.json` 中的 `support_email`, `legal` 等字段需提前确认，减少审核轮次。
- 发布前在 Overwolf QA Checklist 上逐项核对：窗口锚点、热键冲突、首次启动向导、权限申请提示。

# 质量保障
- **测试**：使用 `vitest` 模拟 onNewEvents/onInfoUpdates2，验证 GlobalMatchData 合并逻辑；对 IndexedDB CRUD 编写集成测试。
- **性能**：background CPU 占用 <5%，内存 <150MB；ingame 渲染帧率 ≥ 55fps。
- **异常处理**：捕获所有 `overwolf` API 回调错误并写入日志，提供“导出调试包”按钮。
- **数据一致性**：IndexedDB 写入使用事务，保证 matches/players/comments 外键一致；导入 JSON 前做 schema 校验。

# 上线与运营
- 首次启动引导用户配置 Dota 2 启动参数 `-gamestateintegration`；检测 Steam 语言以提供中文/英文文案。
- 当检测到 Overwolf 客户端版本 <0.235 时提示升级。
- 数据导入/导出需提示风险，导入冲突时以导入文件为准并提供覆盖确认。
- 计划未来引入广告/词云功能时需重新评估窗口布局与性能。

# 风险与未决问题
- Overwolf 客户端更新可能改变 GEP 字段结构，需对 GlobalMatchData 加入 schema 版本管理。
- Dota 2 自定义模式可能导致 `pseudo_match_id` 缺失，需确认 fallback（如时间戳 + 队伍信息）。
- IndexedDB 50MB 限制可能不满足长期存储需求，是否需要远程同步方案待评估。
- manifest 中增加的权限是否影响商店审核，需要提前与 Overwolf 支持确认。
- 尚未规划移动端或 Web companion，是否需要在本期 PRD 中明确范围界定。

# 参考资料
- Overwolf Native SDK 简介：https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction
- Overwolf API 概览：https://dev.overwolf.com/ow-native/reference/ow-api-overview
- 游戏事件 API：https://dev.overwolf.com/ow-native/reference/games/events
- Dota 2 GEP 支持：https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2
- GEP 介绍：https://dev.overwolf.com/ow-native/live-game-data-gep/live-game-data-gep-intro
- 官方前端示例：https://github.com/overwolf/front-app
- Dota 2 事件示例：https://github.com/overwolf/events-sample-apps/tree/master/dota-events-sample-app-master
# 其他
## 国际化能力
当设置页切换语言时，修改background中的设置值，然后通知desktop和ingame修改语言相关选项

## 词云
暂时搁置

## 广告接入
暂时搁置



# 注意
检查依赖库，使用商业友好协议的依赖


# 问题修复

4 接收到开始信号 ingame没有自动弹出
5. 使用热键只打开desktop 没有打开ingame，逻辑是，如果有desktop或者有ingame，按快捷键隐藏全部，如果都没有，则打开全部
6. 主页的数据要实时刷新

12 desktop打开应该在home

14. ingame评价组件应该是自动保存的 不需要手动点击保存按钮
15. desktop和ingame数据应该自动刷新
16. 游戏结束之后清空了评分数据
17. 控制台图片偏小



# 新UI修改


2. history和comment打开时，优先查询最新的matches，再根据matches中的player字段，查询玩家历史评论或者显示评论编辑组件
3. desktop 默认路由是home，目前/desktop路径的内容是空的，可以删掉


5. 每个玩家卡片为108宽 90高，评论编辑展示内容：玩家名称，玩家英雄对应的图片、评分组件和输入框

6. 历史卡片展示的内容：玩家名称、玩家英雄对应的图片、查询历史评分计算平均分（没有就显示暂无数据）


先打开dota2再打开app有监听问题
响应式布局

现在来修改卡片样式

现在修改history和comment卡片样式
卡片不在固定宽高，每张卡片将总页面10等分
@index.tsx (161-163) 用户名称超长换行而不是省略号
英雄图片使用@dota2 这里面的 @观战.json (23) assets\dota2\npc_dota_hero_lich.webp使用这张图片 找不到才用问号
以上是公共区域
下面是各自的区域

评论组件的下半部分，第一行星星评分组件没有问题
第二行评分对应文案没有问题，但是字体可以适当放大，而且切换评分的时候，增加一个短暂的css动画：scale1.2 -> scale1 持续0.1秒
第三行是input输入框没有问题，最后一行player.status没必要展示，机制上保证保存成功即可

历史组件的下半部分：
第一行应该是胜率，根据玩家id查询包含该玩家的比赛，根据该玩家所在的team字段和winner字段对照判断是否胜利，然后计算胜率（相关计算函数模块可以提取到utils）
第一行展示 胜率：${计算}%
第二行展示平均评分，根据玩家id查询所有评价，然后计算平均分，根据平均分展示对应文案，比如是3分文案是普通人，假如是3.0-3.5 显示普通人 3.5-4.0 显示 普通人+
第二行展示 评价：${评价} ${平均分} 
第三行展示 所有评论拼接到一起，超长换行，但是如果超出div就显示... 鼠标移上去再展示全部


来修复历史和评论页面的玩家卡片排列顺序吧
team radiant 的5个在左边 team dire的5个在右边
同一个team里面



# 进阶
打开时根据游戏信息中的尺寸信息重新更新desktop history comment窗口大小位置
设置窗口title 
英文评价
快捷键失效
重新检查图片命名

绿色 #29880e 红色 #dd3d1d 黄色 #ffff2c 蓝色 #317595