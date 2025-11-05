# Overwolf Native App 平台限制

## ⚠️ 重要：Overwolf Native App 与 Electron 的区别

### ❌ Overwolf 不支持的功能

以下是 Electron 支持但 **Overwolf Native App 不支持**的功能：

#### 1. **系统托盘（System Tray）** ❌
- Overwolf 应用**没有**系统托盘图标
- 应用通过 Overwolf 客户端管理，不在 Windows 任务栏右下角显示
- 用户通过 Overwolf 客户端来启动/关闭应用

#### 2. **右键菜单（Context Menu）** ❌
- 无法创建系统托盘的右键菜单
- 菜单功能需要在应用窗口内实现

#### 3. **独立进程** ❌
- Overwolf 应用运行在 Overwolf 平台内
- 不是独立的可执行文件
- 依赖 Overwolf 客户端

#### 4. **Node.js 完整功能** ⚠️
- 只能使用 Overwolf 提供的 API
- 不能使用 Node.js 的 `fs`, `path`, `child_process` 等模块
- 不能直接访问系统资源

---

## ✅ Overwolf 支持的功能

### 窗口管理
- ✅ 多窗口支持（桌面窗口、游戏内窗口）
- ✅ 窗口显示/隐藏
- ✅ 窗口位置和大小控制
- ✅ 透明窗口
- ✅ 置顶窗口

### 游戏集成
- ✅ 游戏事件监听（GEP）
- ✅ 游戏状态检测
- ✅ 游戏内覆盖显示
- ✅ 自动启动（游戏启动时）

### 用户交互
- ✅ 热键支持
- ✅ 窗口内菜单
- ✅ 拖动窗口
- ✅ 自定义标题栏

### 数据存储
- ✅ LocalStorage
- ✅ IndexedDB
- ✅ 应用本地文件存储

---

## 🔄 功能对比表

| 功能 | Electron | Overwolf Native | 说明 |
|------|----------|----------------|------|
| **系统托盘** | ✅ | ❌ | Overwolf 通过客户端管理 |
| **独立运行** | ✅ | ❌ | 需要 Overwolf 客户端 |
| **Node.js** | ✅ | ❌ | 只能用 Overwolf API |
| **游戏集成** | ⚠️ 困难 | ✅ 原生支持 | Overwolf 专为游戏设计 |
| **游戏内覆盖** | ⚠️ 困难 | ✅ 原生支持 | 透明窗口，性能优秀 |
| **打包大小** | ~150MB | ~8MB | Overwolf 更轻量 |
| **自动更新** | 需要自己实现 | ✅ Overwolf 提供 | 自动更新机制 |
| **商店分发** | Steam 等 | ✅ Overwolf Appstore | 专门的游戏应用商店 |

---

## 🎯 应用管理方式

### Electron 应用
```
用户 → 系统托盘图标 → 右键菜单 → 控制应用
       ↓
    任务栏图标
```

### Overwolf 应用
```
用户 → Overwolf 客户端 → 应用列表 → 启动/关闭
       ↓
    游戏启动时自动运行（可选）
       ↓
    应用窗口
```

---

## 📝 MVP 功能实现对比

### 原 mvp.md 中的需求

| 需求 | Electron | Overwolf Native | 状态 |
|------|----------|----------------|------|
| 窗口1：启动后打开 | ✅ | ✅ | 已实现 |
| 窗口2：游戏状态触发 | ✅ | ✅ | 已实现 |
| **任务栏右下角图标** | ✅ | ❌ **不支持** | 需求需要调整 |
| **右键菜单：退出/打开** | ✅ | ❌ **不支持** | 需求需要调整 |
| 热键：Alt+~ 隐藏窗口 | ✅ | ✅ | 已实现 |

---

## 🔧 建议的调整方案

### 替代系统托盘的方案

#### 方案 1：使用主窗口菜单（推荐）
在主窗口添加菜单栏或汉堡菜单：
- 设置
- 关闭应用
- 显示/隐藏游戏内窗口

#### 方案 2：使用 Overwolf Dock
Overwolf 客户端有一个停靠栏，应用图标会显示在那里

#### 方案 3：使用热键
- Alt+Shift+D：显示/隐藏所有窗口（已实现）
- 可以添加更多自定义热键

---

## 💡 推荐的用户体验

### 应用启动
1. 用户启动 Dota 2
2. Overwolf 自动启动应用
3. 显示主窗口（可选）

### 应用控制
1. **在应用内添加菜单** - 替代托盘右键菜单
2. **使用热键** - 快速控制窗口显示
3. **Overwolf 客户端** - 完全关闭应用

### 应用退出
```typescript
// 在窗口中添加退出按钮
<button onClick={() => window.close()}>关闭窗口</button>

// 完全退出应用（关闭所有窗口）
import { closeWindow } from './utils/overwolf';
closeWindow(); // 关闭当前窗口
```

---

## 📚 参考资源

- [Overwolf 窗口管理](https://overwolf.github.io/docs/api/overwolf-windows)
- [Overwolf 热键](https://overwolf.github.io/docs/api/overwolf-settings-hotkeys)
- [Overwolf 应用生命周期](https://overwolf.github.io/docs/topics/lifecycle)

---

## ✅ 总结

**Overwolf Native App 的优势：**
- ✅ 游戏集成更好
- ✅ 性能更优
- ✅ 打包更小
- ✅ 自动更新
- ✅ 官方商店支持

**需要注意的限制：**
- ❌ 没有系统托盘
- ❌ 不能独立运行
- ❌ 只能用 Overwolf API

**建议：**
接受平台限制，使用 Overwolf 推荐的应用管理方式，专注于游戏内功能。

