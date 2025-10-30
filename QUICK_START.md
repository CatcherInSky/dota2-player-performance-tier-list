# 🚀 快速启动指南

## 第一步：安装依赖

在项目根目录打开命令行，运行：

```bash
npm install
```

等待所有依赖包安装完成（可能需要几分钟）。

## 第二步：运行开发版本

```bash
npm run dev
```

应用会自动：
1. ✅ 编译 TypeScript 代码
2. ✅ 创建 Dota2 GSI 配置文件
3. ✅ 启动 HTTP 服务器（端口 3000）
4. ✅ 打开应用窗口

## 第三步：测试

1. **检查配置文件**
   - 查看控制台输出，确认配置文件路径
   - 默认位置: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration_performance.cfg`

2. **启动 Dota2**
   - 打开 Steam
   - 启动 Dota2 游戏

3. **观察数据**
   - 进入游戏后，应用界面会开始显示实时数据
   - 控制台会输出接收到的 GSI 数据日志

## 第四步：打包为 EXE（可选）

```bash
npm run package
```

打包后的文件在 `release/` 目录中，可以直接分发给其他人使用。

## ⚠️ 常见问题

### Q1: 配置文件创建失败？
**原因**: 可能是 Dota2 安装路径不是默认位置

**解决**: 
1. 手动找到你的 Dota2 安装目录
2. 进入 `game\dota\cfg\` 文件夹
3. 手动创建 `gamestate_integration_performance.cfg` 文件
4. 内容参考 `cfg-manager.ts` 中的配置模板

### Q2: 启动后没有收到数据？
**检查清单**:
- ✓ 应用是否正常运行（端口 3000）
- ✓ 配置文件是否存在
- ✓ Dota2 是否正在运行
- ✓ 是否已经进入游戏（不是主菜单）

### Q3: 端口 3000 被占用？
**解决**: 
修改 `src/main.ts` 中的 `PORT` 常量为其他值（如 3001），
同时修改配置文件中的端口号。

### Q4: npm install 失败？
**可能原因**:
- 网络问题
- Node.js 版本过旧

**解决**:
```bash
# 切换 npm 镜像源
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

## 📝 开发命令

```bash
# 安装依赖
npm install

# 开发模式（自动编译 + 启动）
npm run dev

# 仅编译 TypeScript
npm run build

# 打包为可执行文件
npm run package

# 启动已编译的应用
npm start
```

## 🎯 验证成功的标志

当你看到以下内容时，说明一切正常：

### 控制台输出
```
==================================================
Dota2 Performance Tracker MVP 启动中...
==================================================
✓ GSI 配置文件已创建: C:\...\gamestate_integration_performance.cfg
✓ GSI 服务器已启动: http://localhost:3000
✓ Dota2 现在可以发送数据到这个地址
==================================================
✓ 初始化完成！
提示: 启动 Dota2 游戏后，游戏数据将自动发送到此应用
==================================================
```

### 应用界面
- 状态栏显示"运行中"
- 监听端口显示"3000"
- 开发者工具已打开（方便调试）

### Dota2 游戏内
- 进入游戏后，控制台会实时输出"收到 GSI 数据"
- 应用界面开始显示事件数据

## 💡 下一步

- 📖 阅读 `MVP_README.md` 了解详细功能
- 🔍 查看接收到的数据结构
- 🎮 在不同游戏阶段测试（选人、游戏中、结算等）
- 📊 导出数据分析 GSI 提供的信息
- 🚀 基于此 MVP 规划完整版本功能

## 🆘 需要帮助？

如果遇到问题：
1. 检查控制台错误信息
2. 查看开发者工具 Console 选项卡
3. 确认 Node.js 和 npm 版本是否符合要求（Node.js >= 16）

---

**祝你技术调研顺利！** 🎉

