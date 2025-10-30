# 🎯 从这里开始

欢迎！这是一个 Dota2 玩家性能追踪器的 MVP（最小可行产品）版本。

## 🚀 5 分钟快速启动

### 1️⃣ 安装依赖（首次运行）
```bash
npm install
```
⏱️ 需要 2-5 分钟，取决于网络速度

### 2️⃣ 运行应用
```bash
npm run dev
```
✅ 应用会自动：
- 编译代码
- 创建 Dota2 配置文件
- 启动服务器
- 打开应用窗口

### 3️⃣ 启动 Dota2
打开 Steam → 启动 Dota2 → 进入游戏

### 4️⃣ 查看效果
应用界面会实时显示游戏数据！🎮

---

## 📚 文档导航

根据你的需求选择阅读：

### 🏃 我想快速上手
👉 阅读 [QUICK_START.md](QUICK_START.md)
- 详细的安装和运行步骤
- 常见问题解决方案
- 验证是否成功运行

### 📖 我想了解详细功能
👉 阅读 [MVP_README.md](MVP_README.md)
- 完整的功能说明
- 技术原理解释
- GSI 工作机制
- 接收的数据类型

### 🔍 我想了解代码结构
👉 阅读 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- 目录树和文件说明
- 每个文件的职责
- 数据流图
- 扩展点说明

### ⚠️ 我想了解潜在问题
👉 阅读 [TECHNICAL_REVIEW.md](TECHNICAL_REVIEW.md)
- 潜在风险分析
- 改进建议
- 架构优化方案
- 生产环境 Checklist

### 📦 我想打包发布
```bash
npm run package
```
打包后的文件在 `release/` 目录

---

## 🎯 MVP 实现的功能

- ✅ **自动配置**: 在 Dota2 目录创建 GSI 配置文件
- ✅ **实时监听**: HTTP 服务器接收游戏数据
- ✅ **数据展示**: 清晰展示所有事件数据
- ✅ **导出功能**: 可以导出数据为 JSON
- ✅ **打包 EXE**: 可以打包成独立可执行文件

## ❌ MVP 不包含的功能

这些功能留给完整版本实现：

- ❌ 数据库（数据不持久化）
- ❌ 玩家评分系统
- ❌ Overlay 叠加层
- ❌ 精美的 UI 设计
- ❌ 数据分析和统计

## 🎓 技术栈

- **Electron** - 桌面应用框架
- **TypeScript** - 类型安全的 JavaScript
- **Express** - HTTP 服务器
- **Node.js** - 运行环境

## 📊 项目目录结构

```
├── 📖 START_HERE.md           ← 你在这里
├── 📖 QUICK_START.md          快速启动
├── 📖 MVP_README.md           详细文档
├── 📖 TECHNICAL_REVIEW.md     技术评审
├── 📖 PROJECT_STRUCTURE.md    代码结构
│
├── 📄 package.json            项目配置
├── 📄 tsconfig.json           TS 配置
│
└── 📁 src/                    源代码
    ├── main.ts                主进程
    ├── server.ts              HTTP 服务器
    ├── cfg-manager.ts         配置管理
    └── index.html             前端界面
```

## 🐛 遇到问题？

### 问题 1: npm install 失败
```bash
# 切换国内镜像源
npm config set registry https://registry.npmmirror.com
npm install
```

### 问题 2: 没有收到数据
**检查清单**:
- ✓ 应用是否运行（查看窗口标题栏）
- ✓ Dota2 是否已启动并进入游戏
- ✓ 配置文件是否创建（查看控制台输出）
- ✓ 端口 3000 是否被占用

### 问题 3: 配置文件创建失败
**手动创建**:
1. 找到你的 Dota2 安装目录
2. 进入 `game\dota\cfg\` 文件夹
3. 创建文件 `gamestate_integration_performance.cfg`
4. 复制以下内容：

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

### 更多问题？
查看 [QUICK_START.md](QUICK_START.md) 的常见问题部分

## 💡 下一步

### 技术调研目标

使用这个 MVP，你可以：

1. ✅ **验证 GSI 可行性**: 确认 Dota2 GSI 功能是否稳定
2. ✅ **了解数据结构**: 查看 Dota2 发送的数据格式
3. ✅ **评估技术栈**: 确认 Electron + TypeScript 是否合适
4. ✅ **估算工作量**: 评估完整版本的开发难度

### 建议的调研步骤

#### Day 1: 基础验证
- [ ] 运行 MVP，确认能收到数据
- [ ] 导出数据，分析数据结构
- [ ] 记录不同游戏阶段的数据差异

#### Day 2: 技术深入
- [ ] 阅读技术评审文档
- [ ] 思考完整版本的架构设计
- [ ] 评估需要的额外技术（数据库、Overlay 等）

#### Day 3: 功能规划
- [ ] 设计数据库 Schema
- [ ] 规划用户交互流程
- [ ] 绘制完整版本的功能模块图

## 📈 从 MVP 到完整版本的路线图

```
MVP (当前) ✅
├── 基础 GSI 集成
├── 简单数据展示
└── 可打包为 EXE

    ↓

v0.2 - 数据持久化
├── SQLite 数据库
├── 玩家信息存储
└── 历史记录查询

    ↓

v0.3 - 评分系统
├── 玩家评分功能
├── 标签和备注
└── 搜索和过滤

    ↓

v0.4 - 智能识别
├── 自动识别游戏阶段
├── 选人界面提示
└── 结算界面总结

    ↓

v0.5 - Overlay
├── 游戏内叠加层
├── 实时显示玩家评分
└── 可自定义位置

    ↓

v1.0 - 完整版本
├── 精美 UI
├── 数据统计和分析
├── 导入导出
└── 自动更新
```

## 🎉 准备好了吗？

运行这个命令开始吧：

```bash
npm install && npm run dev
```

---

## 📞 技术支持

- 📖 遇到问题先查看各个文档
- 🐛 发现 Bug 记录在案
- 💡 有想法和建议也记录下来

**祝你技术调研顺利！** 🚀

---

<div align="center">

**Made with ❤️ for Dota2 Players**

*这个 MVP 是你完整项目的起点*

</div>

