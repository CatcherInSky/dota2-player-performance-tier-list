# Dota2 Player Performance Tracker - MVP 版本

这是一个最小可行产品（MVP）版本，用于技术调研和原型验证。

## 📋 功能清单

本 MVP 实现了以下核心功能：

- ✅ **自动创建 GSI 配置文件**: 在 Dota2 指定目录自动创建 Game State Integration 配置文件
- ✅ **后台服务器监听**: 启动 HTTP 服务器监听端口 3000，接收来自 Dota2 的实时游戏数据
- ✅ **事件数据展示**: 简洁的界面实时显示所有接收到的游戏事件
- ✅ **打包为 EXE**: 可以打包成单个可执行文件

## 🏗️ 技术栈

- **Electron**: 跨平台桌面应用框架
- **TypeScript**: 类型安全的 JavaScript
- **Express**: HTTP 服务器框架
- **Node.js**: 后端运行时

## 📦 项目结构

```
dota2-player-performance-tier-list/
├── src/
│   ├── main.ts           # Electron 主进程
│   ├── preload.ts        # 预加载脚本
│   ├── server.ts         # GSI HTTP 服务器
│   ├── cfg-manager.ts    # Dota2 配置文件管理
│   └── index.html        # 前端界面
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md            # 项目说明
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

### 3. 打包为 EXE

```bash
npm run package
```

打包后的文件将生成在 `release/` 目录中。

## 🎮 使用流程

### 步骤 1: 启动应用
运行 `npm run dev` 或双击打包后的 `.exe` 文件

### 步骤 2: 自动配置
应用会自动在 Dota2 配置目录创建 GSI 配置文件：
- 路径: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\`
- 文件名: `gamestate_integration_performance.cfg`

### 步骤 3: 启动 Dota2
启动 Dota2 游戏，游戏会自动开始向应用发送数据

### 步骤 4: 查看数据
在应用界面中实时查看接收到的游戏事件数据

## 📊 界面功能说明

### 状态栏
- **服务器状态**: 显示 GSI 服务器运行状态
- **监听端口**: 显示监听的端口号（默认 3000）
- **事件总数**: 显示累计接收的事件数量
- **最后更新**: 显示最后一次收到数据的时间

### 操作按钮
- **清空事件**: 清空所有已接收的事件数据
- **刷新列表**: 刷新事件显示列表
- **导出数据**: 将所有事件导出为 JSON 文件到桌面

### 数据展示
- **最新事件**: 显示最近接收到的事件详情
- **所有事件**: 列表显示最近 20 条事件（最新的在上面）

## 🔧 核心原理

### Game State Integration (GSI)

Dota2 的 GSI 功能允许游戏向外部应用发送实时游戏数据。工作流程：

1. 在 Dota2 配置目录放置 `.cfg` 配置文件
2. 配置文件指定接收数据的 HTTP 端点
3. Dota2 游戏运行时自动发送 POST 请求到指定端点
4. 应用接收并处理这些数据

### 配置文件示例

```
"Dota 2 Integration Configuration"
{
  "uri"               "http://localhost:3000/"
  "timeout"           "5.0"
  "buffer"            "0.1"
  "throttle"          "0.1"
  "heartbeat"         "30.0"
  "data"
  {
    "provider"        "1"
    "map"             "1"
    "player"          "1"
    "hero"            "1"
    "abilities"       "1"
    "items"           "1"
    "draft"           "1"
    "wearables"       "1"
  }
}
```

## 📝 接收的数据类型

GSI 会发送包含以下信息的 JSON 数据：

- **provider**: 游戏提供者信息（玩家信息、Steam ID 等）
- **map**: 地图信息（游戏模式、比赛状态等）
- **player**: 玩家状态（金钱、击杀、死亡等）
- **hero**: 英雄信息（等级、生命值、魔法值等）
- **abilities**: 技能信息（冷却时间、等级等）
- **items**: 物品信息
- **draft**: 选人阶段信息
- **wearables**: 装饰品信息

## ⚠️ 已知限制（MVP 版本）

- ✗ 没有数据持久化（重启后数据丢失）
- ✗ 没有数据库
- ✗ 没有 Overlay 叠加层功能
- ✗ 没有玩家评分功能
- ✗ 没有精美的 UI 设计
- ✗ 仅支持 Windows 平台

## 🔜 下一步计划

基于此 MVP，完整版本将添加：

1. ✨ **数据库集成**: 持久化存储所有玩家和比赛数据
2. ✨ **玩家评分系统**: 对队友和对手进行评分
3. ✨ **Overlay 功能**: 在游戏内显示信息叠加层
4. ✨ **智能识别**: 在选人/结算界面自动识别玩家
5. ✨ **数据分析**: 统计和分析玩家表现
6. ✨ **美化界面**: 现代化的 UI/UX 设计

## 🐛 调试技巧

### 检查配置文件是否创建成功
查看以下路径是否存在配置文件：
```
C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration_performance.cfg
```

### 检查服务器是否正常运行
打开浏览器访问: `http://localhost:3000/health`
应该看到服务器状态信息

### 查看控制台日志
应用会在控制台输出详细的日志信息，包括：
- 服务器启动状态
- 接收到的 GSI 数据
- 错误信息

## 📚 参考资源

- [Valve GSI 官方文档](https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Game_State_Integration)
- [Dota2 GSI 示例](https://github.com/antonpup/Dota2GSI)
- [参考项目: dota2-helper](https://github.com/pjmagee/dota2-helper)

## 💡 技术调研要点

通过此 MVP，你可以验证以下技术要点：

1. ✅ **GSI 可行性**: 验证 Dota2 GSI 功能是否稳定可用
2. ✅ **数据结构**: 了解 Dota2 发送的数据格式和内容
3. ✅ **Electron 适用性**: 验证 Electron 是否适合此项目
4. ✅ **开发难度**: 评估完整功能的开发工作量
5. ✅ **性能表现**: 测试应用的性能和资源占用

## 📄 许可证

MIT License

## 🤝 贡献

这是一个 MVP 原型项目，欢迎提出改进建议！

