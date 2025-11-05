# Dota 2 Player Performance Tier List

一个基于 **Overwolf Native App** 的 Dota 2 玩家表现分析应用。

## 🎯 项目特点

- ✅ **Overwolf 原生应用** - 无需 Electron，更轻量
- ✅ **React 18 + TypeScript** - 现代化前端技术栈
- ✅ **TailwindCSS** - 美观的 UI 设计
- ✅ **Vite** - 快速的开发体验
- ✅ **Game Events API** - 实时监听 Dota 2 游戏事件

## 技术栈

- **平台**: Overwolf Native App
- **前端框架**: React 18+ + TypeScript
- **UI 框架**: TailwindCSS
- **数据库**: IndexedDB (Dexie.js)
- **游戏数据**: Overwolf GEP (Game Events Provider)
- **构建工具**: Vite

## 功能特性

### ✅ 已实现的功能

1. **桌面窗口（窗口1）**: 应用启动后自动打开，显示应用状态和调试控制
2. **游戏内窗口（窗口2）**: 
   - 在 `DOTA_GAMERULES_STATE_STRATEGY_TIME` 状态时弹出，显示策略阶段内容
   - 在 `DOTA_GAMERULES_STATE_POST_GAME` 状态时弹出，显示赛后分析内容
3. **热键支持**: 按 `Alt+Shift+D` 隐藏/显示所有窗口
4. **游戏事件监听**: 自动监听 Dota 2 游戏状态变化
5. **Background Controller**: 管理应用生命周期和窗口

## 快速开始

### 前置要求

- Node.js 18+ (推荐使用 LTS 版本)
- npm 或 yarn
- **Overwolf 客户端** ([下载 Overwolf](https://www.overwolf.com/))

### 安装步骤

#### 1. 克隆仓库并安装依赖

\`\`\`bash
git clone <repository-url>
cd dota2-player-performance-tier-list
npm install
\`\`\`

#### 2. 开发模式

\`\`\`bash
# 启动 Vite 开发服务器
npm run dev
\`\`\`

在浏览器中打开 http://localhost:5173 进行开发。

**注意**: 开发模式下某些 Overwolf API 功能无法使用，需要在 Overwolf 中运行才能测试完整功能。

#### 3. 构建应用

\`\`\`bash
npm run build
\`\`\`

构建产物会生成在 `dist/` 目录。

#### 4. 在 Overwolf 中加载

1. 打开 Overwolf
2. 右键点击 Overwolf 图标 → Settings
3. 进入 Support → Development options
4. 点击 "Load unpacked extension"
5. 选择项目的 `dist/` 文件夹

应用会自动加载并运行！

## 项目结构

\`\`\`
dota2-player-performance-tier-list/
├── public/                # 公共资源
├── assets/               # 应用图标和资源
├── src/
│   ├── background/       # Background controller
│   │   └── background.ts # 后台逻辑，管理窗口和事件
│   ├── utils/            # 工具函数
│   │   └── overwolf.ts   # Overwolf API 封装
│   ├── types/            # TypeScript 类型定义
│   │   └── overwolf.d.ts # Overwolf 类型
│   ├── App.tsx          # 桌面窗口（主窗口）
│   ├── ingame.tsx       # 游戏内窗口
│   ├── main.tsx         # 桌面窗口入口
│   └── index.css        # 全局样式
├── background.html       # Background controller 入口
├── index.html           # 桌面窗口 HTML
├── ingame.html          # 游戏内窗口 HTML
├── manifest.json        # Overwolf 应用配置
├── vite.config.ts       # Vite 配置
├── tailwind.config.js   # TailwindCSS 配置
└── package.json         # 项目配置
\`\`\`

## 开发指南

### 调试游戏事件

由于游戏事件需要在游戏运行时触发，在开发时可以：

1. 使用桌面窗口中的"调试控制"按钮模拟游戏状态
2. 在 Overwolf 中运行应用并启动 Dota 2 测试真实事件

### 查看日志

- **Background 日志**: 在 Overwolf Developer Tools 中查看 background 窗口的控制台
- **窗口日志**: 右键窗口 → "Inspect" 打开开发者工具

### 修改窗口

- **桌面窗口**: 编辑 `src/App.tsx`
- **游戏内窗口**: 编辑 `src/ingame.tsx`
- **Background 逻辑**: 编辑 `src/background/background.ts`

## Overwolf 配置

### manifest.json 关键配置

- **game_targeting**: 针对 Dota 2 (ID: 7314)
- **game_events**: 监听游戏事件
- **permissions**: GameInfo, Hotkeys
- **windows**: 定义三个窗口（background, desktop, ingame）
- **hotkeys**: Alt+Shift+D 切换窗口显示

## 常见问题

### Q: 如何在 Overwolf 中调试？

A: 
1. 在 Overwolf 中加载应用
2. 右键窗口 → Inspect 打开开发者工具
3. 对于 background 窗口，在 Overwolf Settings → Support → Developer Console 查看

### Q: 游戏事件没有触发？

A: 
1. 确保 Dota 2 正在运行
2. 检查 manifest.json 中的 game_ids 配置
3. 查看 background 日志确认事件监听已启动
4. 确保在 manifest.json 中配置了 required_features

### Q: 热键不工作？

A: 
1. 检查 manifest.json 中的 hotkeys 配置
2. 确保热键没有与其他应用冲突
3. 可以在 Overwolf Settings → Hotkeys 中修改

### Q: 窗口显示异常？

A: 
1. 检查 manifest.json 中的窗口配置
2. 确保 transparent 和 native_window 设置正确
3. 查看 CSS 样式是否有问题

## 下一步计划

- [ ] 集成真实的 Overwolf GEP API 获取游戏数据
- [ ] 实现 IndexedDB 数据持久化
- [ ] 添加玩家评分和标签功能
- [ ] 实现 Tier List 可视化界面
- [ ] 优化 UI/UX
- [ ] 添加设置页面
- [ ] 多语言支持

## 参考资料

- [Overwolf 官方文档](https://overwolf.github.io/docs/start/getting-started)
- [Overwolf API 参考](https://overwolf.github.io/docs/api/overwolf-api-overview)
- [Dota 2 Game Events](https://overwolf.github.io/docs/api/live-game-data/supported-games/dota-2)
- [Overwolf 示例应用](https://github.com/overwolf/front-app)
- [Overwolf Types](https://www.npmjs.com/package/@overwolf/types)

## 许可证

MIT License

---

**准备好开始开发了吗？** 查看 [启动说明.md](./启动说明.md) 获取详细的开发指南！
