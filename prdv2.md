# 主要参考参考
api文档
https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction
https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2

官方demo仓库和编译后代码
https://github.com/overwolf/front-app
\\wsl.localhost\Ubuntu\home\zhang\front-app\dist


#  技术栈
- 平台: Overwolf Native
- 前端框架: React 18+ + TypeScript
- UI 框架: TailwindCSS + shadcn/ui
- 数据库: IndexedDB 
- 游戏数据: Overwolf GEP (Game Events Provider)
- 打包工具：vite
尽量使用商业友好协议的依赖库

# 数据
## 数据类型

## 数据表
### 比赛表
uuid
比赛id
玩家id
游戏模式 playing还是spectating
比赛模式 天梯？快速？allpick？ranked？
开始时间
结束时间
胜负（天辉还是夜魇）
1-10号玩家id（前5天辉 后5夜魇）
1-10号玩家KDA
1-10号玩家的记录id
1-10号玩家的等级
1-10号玩家的金钱 GPM
1-10号玩家的经验 EPM

### 玩家表
uuid
玩家id
当前昵称
曾用名
第一次遇到
最后遇到


### 评分表
uuid
玩家id
账号id（发起点评时的用户账号id）
比赛id
分数
创建时间
评论



# 页面
## desktop
容器：可以调节尺寸和位置、只有缩小没有关闭、可以调透明度看，非overlay

### 主要组件
1. 启动dota2组件
判断有没有带这个参数-gamestateintegration，没有则为重启steam（参考dotaplus）
在游戏中 显示游戏中
不在游戏中 点击打开dota2

2. 应用说明组件
介绍应用怎么使用的一个简单guide，展示使用普通文本占位

3. 账号切换组件
假如是一台设备多个账号，可以切换展示不同的账号数据
默认选中最近使用的账号，不可清空

4. 总览数据组件
一个table通过tab切换，以及常用筛选项+排序
tab1 比赛table
字段：比赛id 时间 游戏模式 时长 胜负 队伍 玩家KDA

tab2 玩家
字段：玩家id 玩家名字  first_seen last_seen 友方胜率 敌法胜率 上次评分 中位数评分 平均数评分 常用位置 常用英雄

tab3 点评
比赛id 玩家id 所在队伍 队友/对手 英雄 KDA 分数 点评时间 文案



5. 比赛详情组件
分为当前比赛和历史比赛两个模式
玩家+英雄+KDA+胜负

6. 玩家详情组件
友方胜率 + 敌方胜率（如果是自己就是胜率）
评分上次/中位数/平均数+四舍五入对应文案
常用位置，常用英雄
曾用名列表

点击玩家进玩家详情 点击比赛进比赛详情
有前进后退按钮，可以用mouse 4 5 前进后退

7. 广告位组件
暂不考虑


页面逻辑受以下条件控制
是否开启dota2

有没有历史数据

game_state： 
playing idle spectating

match_state：
DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD
DOTA_GAMERULES_STATE_HERO_SELECTION
DOTA_GAMERULES_STATE_STRATEGY_TIME
DOTA_GAMERULES_STATE_PRE_GAME
DOTA_GAMERULES_STATE_GAME_IN_PROGRESS
DOTA_GAMERULES_STATE_POST_GAME
DOTA_GAMERULES_STATE_TEAM_SHOWCASE


没有历史数据: 2
没打开dota2： 1
打开doat2: 3
game_state是idle：4
game_state是spectating或者playing：5

## ingame
容器：可以调节尺寸和位置 + 快捷键+按钮控制显示关闭 + 自动弹出 overlay

主要组件：
1. 显示玩家简单评价
友方胜率/敌方胜率
评分上次平均数+四舍五入对应文案
文字词云

点开可以打开玩家详情

2. 编辑评价组件
编辑即保存
评分默认三分
文字输入框


DOTA_GAMERULES_STATE_STRATEGY_TIME
自动弹出1

DOTA_GAMERULES_STATE_POST_GAME
自动弹出2


## setting（合并desktop？）

语言：中文/英文
ingame的快捷键：
评分文案：1星到5星
数据导入、导出、删除全部按钮
关于
版本号 联系邮箱等



## background
后台GEP
全局数据管理
打开应用初始化一次

监听game_state和match_state和dota2打开状况
判断启动项

数据库互动




