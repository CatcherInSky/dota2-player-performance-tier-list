参考
api文档
https://dev.overwolf.com/ow-electron/reference/Overwolf-electron-APIs/Overview
https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2
https://www.npmjs.com/package/@overwolf/ow-electron
官方demo仓库和编译后代码
https://github.com/overwolf/front-app
\\wsl.localhost\Ubuntu\home\zhang\front-app\dist

技术栈
- **平台**: Overwolf Native App
- **前端框架**: React 18+ + TypeScript
- **UI 框架**: TailwindCSS + shadcn/ui
- **数据库**: IndexedDB (Dexie.js)
- **游戏数据**: Overwolf GEP (Game Events Provider)
- vite


功能
1. 窗口1：应用启动后打开该窗口，显示1

2. 窗口2：监听game_state_changed，当游戏状态为DOTA_GAMERULES_STATE_STRATEGY_TIME时弹出，显示2，当DOTA_GAMERULES_STATE_POST_GAME时再弹出，显示3


5. 当按下alt+shift+D时，隐藏所有窗口（Overwolf 热键配置）

**注意**：Overwolf Native App 不支持系统托盘功能，应用通过 Overwolf 客户端管理。详见 `Overwolf平台限制说明.md`

