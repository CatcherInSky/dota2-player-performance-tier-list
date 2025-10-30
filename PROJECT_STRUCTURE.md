# 📁 项目结构说明

## 目录树
```
dota2-player-performance-tier-list/
│
├── 📄 package.json                  # 项目配置和依赖
├── 📄 tsconfig.json                 # TypeScript 配置
├── 📄 .gitignore                    # Git 忽略文件
│
├── 📖 readme.md                     # 项目总体说明
├── 📖 mvp.md                        # MVP 需求文档
├── 📖 MVP_README.md                 # MVP 详细文档
├── 📖 QUICK_START.md                # 快速启动指南
├── 📖 TECHNICAL_REVIEW.md           # 技术评审和建议
├── 📖 PROJECT_STRUCTURE.md          # 本文件
│
└── 📁 src/                          # 源代码目录
    ├── 📄 main.ts                   # Electron 主进程入口
    ├── 📄 preload.ts                # 预加载脚本
    ├── 📄 server.ts                 # GSI HTTP 服务器
    ├── 📄 cfg-manager.ts            # Dota2 配置管理
    └── 📄 index.html                # 前端界面

编译后生成:
├── 📁 dist/                         # TypeScript 编译输出
│   ├── main.js
│   ├── preload.js
│   ├── server.js
│   └── cfg-manager.js
│
└── 📁 release/                      # 打包后的可执行文件
    └── Dota2 Performance MVP.exe
```

## 核心文件说明

### 配置文件

#### `package.json`
- **作用**: 定义项目元数据、依赖和脚本
- **关键依赖**:
  - `electron`: 桌面应用框架
  - `express`: HTTP 服务器
  - `typescript`: 编译器
  - `electron-builder`: 打包工具

#### `tsconfig.json`
- **作用**: TypeScript 编译配置
- **关键配置**:
  - `target: ES2020`: 编译目标
  - `module: commonjs`: 模块系统
  - `outDir: ./dist`: 输出目录
  - `rootDir: ./src`: 源码目录

#### `.gitignore`
- **作用**: 告诉 Git 忽略哪些文件
- **忽略内容**:
  - `node_modules/`: 依赖包（不提交）
  - `dist/`: 编译产物（可重新生成）
  - `release/`: 打包产物（可重新生成）

### 源代码文件

#### `src/main.ts` - 主进程 ⚙️
**职责**:
- 应用生命周期管理
- 创建和管理窗口
- 初始化 GSI 服务器
- 创建配置文件
- 处理主进程和渲染进程通信

**关键类**:
```typescript
class Application {
  private mainWindow: BrowserWindow | null;
  private gsiServer: GSIServer;
  
  initialize(): void
  createWindow(): void
  cleanup(): void
}
```

**启动流程**:
1. Electron 就绪
2. 创建 GSI 配置文件
3. 启动 HTTP 服务器
4. 创建应用窗口
5. 加载 HTML 界面

#### `src/server.ts` - GSI 服务器 🌐
**职责**:
- 创建 HTTP 服务器
- 接收 Dota2 发送的 POST 请求
- 存储和管理事件数据
- 提供事件查询 API
- 发出事件通知

**关键类**:
```typescript
export class GSIServer extends EventEmitter {
  private events: GSIEvent[] = [];
  
  start(): Promise<void>
  stop(): Promise<void>
  getEvents(): GSIEvent[]
  clearEvents(): void
}
```

**端点列表**:
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | Dota2 发送 GSI 数据到这里 |
| GET | `/api/events` | 获取所有事件 |
| POST | `/api/events/clear` | 清空事件 |
| GET | `/health` | 健康检查 |

#### `src/cfg-manager.ts` - 配置管理器 📝
**职责**:
- 查找 Dota2 安装目录
- 创建 GSI 配置文件
- 检查配置文件是否存在
- 删除配置文件（清理）

**关键方法**:
```typescript
export class CfgManager {
  static createCfgFile(port: number, customPath?: string): string
  static checkCfgExists(customPath?: string): boolean
  static removeCfgFile(customPath?: string): void
  private static getDota2CfgPath(): string
}
```

**配置文件内容**:
```vdf
"Dota 2 Integration Configuration"
{
  "uri"         "http://localhost:3000/"
  "timeout"     "5.0"
  "buffer"      "0.1"
  "throttle"    "0.1"
  "heartbeat"   "30.0"
  "data"
  {
    "provider"  "1"
    "map"       "1"
    "player"    "1"
    "hero"      "1"
    ...
  }
}
```

#### `src/preload.ts` - 预加载脚本 🔌
**职责**:
- 在渲染进程加载前运行
- 安全地暴露 API 给渲染进程
- 作为主进程和渲染进程的桥梁

**当前实现**: 简化版本（使用 nodeIntegration）

**生产建议**:
```typescript
// 使用 contextBridge 提高安全性
contextBridge.exposeInMainWorld('api', {
  onGSIEvent: (callback) => ipcRenderer.on('gsi-event', callback),
  clearEvents: () => ipcRenderer.send('clear-events'),
});
```

#### `src/index.html` - 前端界面 🎨
**职责**:
- 显示应用 UI
- 展示 GSI 事件数据
- 提供用户交互功能

**主要区域**:
1. **状态栏**: 显示服务器状态、端口、事件数、更新时间
2. **控制按钮**: 清空、刷新、导出
3. **统计卡片**: 总事件、每分钟事件数、会话时长
4. **最新事件**: 显示最近一条完整事件数据
5. **事件列表**: 显示最近 20 条事件

**关键功能**:
```javascript
// 监听 IPC 事件
ipcRenderer.on('gsi-event', (event, gsiEvent) => {
  allEvents.push(gsiEvent);
  updateUI(gsiEvent);
});

// 导出数据
function exportEvents() {
  fs.writeFileSync(filepath, JSON.stringify(allEvents, null, 2));
}
```

## 数据流图

```
┌─────────────┐
│   Dota 2    │
│    Game     │
└──────┬──────┘
       │ POST http://localhost:3000/
       │ (GSI Data)
       ▼
┌─────────────────────────┐
│  GSIServer (server.ts)  │
│  - 接收 HTTP 请求       │
│  - 存储事件数据         │
│  - 发出 'gsi-event'     │
└───────────┬─────────────┘
            │
            │ emit('gsi-event')
            ▼
┌─────────────────────────┐
│  Application (main.ts)  │
│  - 监听服务器事件       │
│  - 转发到渲染进程       │
└───────────┬─────────────┘
            │
            │ IPC: 'gsi-event'
            ▼
┌─────────────────────────┐
│  Renderer (index.html)  │
│  - 更新 UI              │
│  - 显示事件数据         │
└─────────────────────────┘
```

## 编译和打包流程

### 开发流程
```bash
npm run dev
  ↓
1. tsc (编译 TypeScript)
   src/*.ts → dist/*.js
  ↓
2. electron . (启动 Electron)
   加载 dist/main.js
  ↓
3. 应用运行
```

### 打包流程
```bash
npm run package
  ↓
1. npm run build
   tsc → dist/
  ↓
2. electron-builder
   - 复制必要文件
   - 打包 Electron
   - 生成安装程序
  ↓
3. release/
   Dota2 Performance MVP.exe
```

## 运行时目录

### 开发环境
```
项目根目录/
├── src/           # 源代码
├── dist/          # 编译后代码（运行这里）
└── node_modules/  # 依赖
```

### 打包后
```
应用安装目录/
├── Dota2 Performance MVP.exe
├── resources/
│   └── app.asar  # 打包后的应用代码
└── ... (Electron 运行时文件)
```

## 用户数据目录

**Windows**:
```
C:\Users\{用户名}\AppData\Roaming\dota2-player-performance-mvp\
```

**可以存储**:
- 配置文件
- 日志文件
- 缓存数据
- 用户偏好设置

**访问方式**:
```typescript
import { app } from 'electron';
const userDataPath = app.getPath('userData');
```

## 性能考虑

### 内存使用
- **Electron 基础**: ~100-150 MB
- **Node.js 运行时**: ~50 MB
- **事件数据** (1000 条): ~1-5 MB
- **前端渲染**: ~50-100 MB
- **总计**: 约 200-300 MB

### CPU 使用
- **空闲状态**: <1%
- **接收数据**: 1-3%
- **更新 UI**: 2-5%

### 磁盘空间
- **开发环境**: ~500 MB (包含 node_modules)
- **打包后**: ~150-200 MB
- **运行时数据**: <10 MB

## 扩展点

如果要添加新功能，可以在以下位置扩展：

### 1. 新的服务器端点
```typescript
// src/server.ts
this.app.get('/api/stats', (req, res) => {
  // 添加统计 API
});
```

### 2. 新的数据处理模块
```typescript
// src/data-processor.ts
export class DataProcessor {
  analyze(events: GSIEvent[]): Statistics {
    // 数据分析逻辑
  }
}
```

### 3. 新的 UI 页面
```html
<!-- src/stats.html -->
<div class="stats-page">
  <!-- 统计页面 -->
</div>
```

### 4. 数据库集成
```typescript
// src/database.ts
import Database from 'better-sqlite3';

export class EventDatabase {
  private db: Database.Database;
  
  saveEvent(event: GSIEvent): void {
    // 保存到数据库
  }
}
```

## 调试技巧

### 主进程调试
```bash
# 查看控制台输出
npm run dev

# 使用 VSCode 调试
# .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "program": "${workspaceFolder}/dist/main.js"
}
```

### 渲染进程调试
- 应用启动后自动打开 DevTools
- 查看 Console 选项卡
- 使用 Network 选项卡查看请求

### 服务器调试
```bash
# 测试服务器端点
curl http://localhost:3000/health

# 模拟 Dota2 发送数据
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 常见问题定位

### 问题: 应用启动失败
**检查**:
1. `dist/` 目录是否存在
2. TypeScript 是否编译成功
3. 查看控制台错误信息

### 问题: 没有收到 GSI 数据
**检查**:
1. 配置文件是否创建成功
2. 端口是否正确（3000）
3. Dota2 是否正在运行
4. 防火墙是否阻止连接

### 问题: 打包失败
**检查**:
1. `dist/` 目录是否存在所有文件
2. `package.json` 的 build 配置
3. 查看 electron-builder 日志

---

**此文档提供了完整的项目结构说明，便于理解和维护代码。**

