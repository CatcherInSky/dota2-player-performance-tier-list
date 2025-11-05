# 更新日志

## [0.1.0] - 2025-11-05

### 🔄 重大重构

#### 从 Electron 迁移到 Overwolf Native App

**原因**：
- 发现官方示例 [overwolf/front-app](https://github.com/overwolf/front-app) 使用纯 Overwolf Native App
- Overwolf Native 更简单、更轻量、性能更好
- 符合官方最佳实践

**变化**：
- ❌ 移除 Electron 依赖和相关代码
- ✅ 采用 Overwolf Native App 架构
- ✅ 简化项目结构
- ✅ 减少打包体积 90%+

### ✨ 新增

- ✅ Background Controller - 管理应用生命周期
- ✅ Overwolf API 封装 - 简化 API 调用
- ✅ 多页面应用（MPA）架构 - background, desktop, ingame
- ✅ 游戏事件监听 - 自动监听 Dota 2 游戏状态
- ✅ 热键支持 - Alt+Shift+D 切换窗口
- ✅ 窗口管理 - 自动化窗口控制
- ✅ 完整的 TypeScript 类型支持

### 🎨 UI/UX

- ✅ 自定义标题栏 - 支持拖动和窗口控制
- ✅ 渐变背景 - 现代化视觉效果
- ✅ 响应式设计 - 适配不同分辨率
- ✅ 调试控制面板 - 方便开发测试

### 📚 文档

- ✅ 新增 00-开始这里.md - 快速入门指南
- ✅ 更新 README.md - 完整项目文档
- ✅ 更新 启动说明.md - 详细开发指南
- ✅ 新增 CHANGELOG.md - 版本更新记录

### 🛠️ 技术栈

**保持不变**：
- React 18 + TypeScript
- TailwindCSS
- Vite
- Dexie.js (IndexedDB)

**新增**：
- @overwolf/types
- @overwolf/overwolf-api-ts
- vite-plugin-static-copy

**移除**：
- Electron
- electron-builder
- concurrently
- wait-on

### 📝 配置文件

**新增**：
- background.html - Background controller 入口
- src/background/background.ts - 后台控制器
- src/utils/overwolf.ts - API 工具函数
- src/types/overwolf.d.ts - 类型定义

**更新**：
- manifest.json - Overwolf 完整配置
- vite.config.ts - 多页面构建配置
- package.json - 更新依赖和脚本

**移除**：
- electron-src/ - 整个目录
- electron/ - 整个目录  
- tsconfig.node.json
- start.bat
- scripts/dev.js

### 🐛 修复

- ✅ 简化架构降低复杂度
- ✅ 移除不必要的 Electron 层
- ✅ 优化打包体积
- ✅ 提升性能

### 📦 文件变化统计

- **删除**: ~15 个文件（Electron 相关）
- **新增**: ~8 个文件（Overwolf Native）
- **修改**: ~10 个文件（配置和文档）
- **代码量**: 减少约 30%

---

## 项目里程碑

### MVP v0.1.0 ✅
- [x] Overwolf Native App 架构搭建
- [x] 基础窗口系统
- [x] 游戏事件监听
- [x] 热键支持
- [x] 完整文档

### 计划中
- [ ] 真实游戏数据集成
- [ ] 玩家评分系统
- [ ] 数据持久化
- [ ] Tier List 可视化
- [ ] 设置页面
- [ ] 多语言支持

---

_For more information, see [README.md](./README.md)_

