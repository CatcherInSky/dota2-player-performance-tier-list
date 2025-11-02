# Dota 2 玩家锐评器

基于 Overwolf 平台的 Dota 2 玩家表现评价应用。记录和查看与你一起游戏的玩家的历史表现。

## ✨ 特性

- 🎮 **游戏内覆盖层**：策略时间自动显示玩家历史评分
- ⭐ **评分系统**：对局结束后快速评价队友和对手（1-5星）
- 📊 **数据统计**：查看战绩、胜率、常见队友
- 💾 **数据管理**：导入导出备份，本地持久化存储
- 🌍 **多语言支持**：简体中文 / English
- 🎨 **现代UI**：React + TailwindCSS，美观流畅

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

#### 标准方式
```bash
pnpm dev
```

#### WSL 用户（推荐）
```bash
# 给脚本添加执行权限（首次）
chmod +x dev-wsl.sh

# 启动开发服务器（会自动显示访问地址）
./dev-wsl.sh
```

**WSL 用户注意**：
- 查看终端输出的 WSL IP 地址
- 在 Windows 浏览器访问 `http://<WSL_IP>:5173`
- 详细说明请查看 [WSL_GUIDE.md](./WSL_GUIDE.md)

### 构建生产版本

```bash
pnpm build
```

构建输出在 `dist/` 目录。

## 📁 项目结构

```
dota2-player-performance-tier-list/
├── public/                    # 静态资源和入口HTML
│   ├── manifest.json         # Overwolf 应用配置
│   ├── background.html       # Background Window 入口
│   ├── desktop.html          # Desktop Window 入口
│   └── ingame.html           # InGame Window 入口
├── src/
│   ├── main/                 # Background Window（主进程）
│   │   ├── index.ts          # 主入口
│   │   ├── database/         # 数据库操作
│   │   └── overwolf/         # Overwolf API 封装
│   ├── renderer/             # 渲染进程
│   │   ├── desktop/          # 桌面窗口
│   │   ├── ingame/           # 游戏内窗口
│   │   └── shared/           # 共享组件和工具
│   └── shared/               # 全局共享
│       ├── types/            # TypeScript 类型
│       └── i18n/             # 国际化
└── dist/                     # 构建输出
```

## 🛠 技术栈

- **前端框架**：React 18 + TypeScript
- **样式**：TailwindCSS
- **数据库**：IndexedDB (Dexie.js)
- **平台**：Overwolf (ow-electron)
- **构建**：Vite
- **游戏**：Dota 2 (Game ID: 7314)

## 📖 文档

- [产品需求文档 (PRD)](./prd.md) - 完整的产品需求和技术设计
- [开发指南 (DEVELOPMENT)](./DEVELOPMENT.md) - 详细的开发文档
- [快速开始 (QUICKSTART)](./QUICKSTART.md) - 快速上手指南
- [功能清单 (FEATURE_CHECKLIST)](./FEATURE_CHECKLIST.md) - 功能完成度追踪
- [实现总结 (IMPLEMENTATION_SUMMARY)](./IMPLEMENTATION_SUMMARY.md) - 项目实现细节
- [WSL 指南 (WSL_GUIDE)](./WSL_GUIDE.md) - WSL 开发环境配置
- [完成报告 (PROJECT_COMPLETE)](./PROJECT_COMPLETE.md) - 项目完成情况

## 🎯 开发状态

✅ **核心功能已完成（100%）**

- ✅ 数据库层（IndexedDB + Dexie.js）
- ✅ Desktop Window（主页、数据页、设置页）
- ✅ InGame Window（记录模式、点评模式）
- ✅ 共享组件库（Button, Modal, Table 等）
- ✅ 国际化支持（中文/英文）
- ✅ 数据导入导出
- ✅ 系统托盘集成
- ✅ Overwolf 框架集成

**下一步**：在 Overwolf 环境中测试和完善

## 🔧 开发命令

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 预览构建
pnpm preview
```

## 🌐 在 Overwolf 中测试

1. **构建应用**
   ```bash
   pnpm build
   ```

2. **加载到 Overwolf**
   - 打开 Overwolf
   - 设置 → 开发者选项 → 启用开发者模式
   - 加载未打包应用 → 选择项目的 `dist` 目录

3. **启动 Dota 2**
   ```bash
   # Steam 启动选项中添加
   -gamestateintegration
   ```

## ❗ 已知问题

### WSL 开发环境

如果你在 WSL 中开发：
- ✅ **已修复**：Vite 配置已更新为监听 `0.0.0.0`
- ✅ **已修复**：TypeScript 类型定义已添加
- 📖 参考 [WSL_GUIDE.md](./WSL_GUIDE.md) 获取详细说明

### Overwolf 集成

- 代码中标记为 `TODO` 的 Overwolf API 调用需要在实际环境中测试
- 部分功能（如胜负判断）需要在真实游戏中完善

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**开发完成日期**: 2025-11-02  
**版本**: v1.0.0  
**状态**: 核心功能开发完成，准备测试 ✅

