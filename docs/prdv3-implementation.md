# PRDv3 实施说明

## 目录结构

```
/public                 # Overwolf 打包输出所需静态资源（由 Vite 在构建时复制）
/src
  /background           # 后台窗口逻辑（事件循环、数据库、IPC、窗口管理）
  /desktop              # 桌面窗口 React 应用
    /modules            # 桌面端业务组件与页面
  /ingame               # 游戏内覆盖层 React 应用
    /modules            # Ingame 业务组件
  /shared               # 共享类型、数据库、i18n、Hook、样式与工具方法
docs/prdv3-implementation.md
manifest.json           # Overwolf Manifest（编译时复制到 dist）
```

## 核心模块概览

### 背景窗口 `src/background`
- `app.ts`：应用入口，负责初始化、事件监听、热键处理和 API 暴露。
- `data-service.ts`：IndexedDB（Dexie）数据存取层，实现比赛 / 玩家 / 评分的 CRUD 与分页过滤。
- `match-tracker.ts`：维护 `GlobalMatchData`，解析 `onInfoUpdates2` 与 `onNewEvents`，识别起止信号。
- `window-manager.ts`：封装窗口的显示、隐藏、透明度调节、拖拽等能力。
- `settings-service.ts`：读取、更新、重置应用设置（语言、评分文案等）。
- `event-bus.ts`：跨窗口共享的事件总线。

### Shared
- `shared/db/index.ts`：Dexie 数据库定义，与 PRDv3 中的 `matches / players / comments / settings` 表结构保持一致。
- `shared/types`：统一的数据模型，包括 Dota2 事件、数据库表结构、API 过滤器等。
- `shared/api/background.ts`：前台窗口可调用的 `backgroundApi` 类型与事件声明。
- `shared/hooks`：`useBackgroundApi`、`useBackgroundEvents` 等跨窗口通信 Hook。
- `shared/i18n`：语言上下文与翻译文案，默认中文，可在设置页切换英文。
- `shared/styles/global.css`：Tailwind 基础样式与自定义组件样式（按钮、标签页等）。

### Desktop 桌面端
- `DesktopApp.tsx`：React Router 集成的主入口，包含顶部导航、设置对话框与三个主要 Tab。
- `HomePage`：比赛 / 玩家 / 评价三大列表，支持筛选、分页、排序字段展示。
- `MatchDetailPage`：展示比赛比分、胜负、参赛选手。
- `PlayerDetailPage`：展示玩家昵称、曾用名、英雄列表以及全部评分记录。
- Settings 对话框：配置语言、评分文案、导入导出及清空数据操作。

### Ingame 覆盖层
- `IngameApp.tsx`：根据背景窗口事件切换“历史展示”与“评分编辑”模式。
  - 历史模式：显示最近 5 条评分记录。
  - 编辑模式：星级评分 + 文本评价，实时保存到 IndexedDB。
  - 支持拖拽、透明度调节、关闭窗口等操作。

## 事件与数据流

1. **游戏检测**
   - `overwolf.games.onGameInfoUpdated` 监听 Dota 2 启动/退出。
   - 启动后调用 `setRequiredFeatures` 并注册 `onInfoUpdates2`、`onNewEvents`。
2. **赛事追踪**
   - `match-tracker` 持续合并 `match_info / roster / me / game_state` 等信息。
   - 当检测到策略阶段或对局开始事件 → 创建比赛与玩家记录，弹出 Ingame 历史视图。
   - 当检测到 `match_ended`/`game_over` → 更新比赛结果、生成评价占位并进入编辑模式。
3. **数据存储**
   - 所有写操作通过 Dexie 事务保证一致性。
   - 导入/导出使用统一 JSON Schema，清空数据会重置设置并广播更新事件。
4. **跨窗口通信**
   - 背景窗口通过 `backgroundApi` 暴露方法；桌面和 Ingame 通过 `useBackgroundApi` 获取。
   - 事件 (`match:start`, `match:end`, `settings:updated` 等) 通过共享 EventBus 派发。

## UI & 交互亮点

- TailwindCSS + shadcn/ui（Radix Tabs & Dialog）组合实现轻量 UI。
- 桌面端支持鼠标四/五键前进后退，顶部导航按钮满足 PRD 的窗口操作需求。
- 设置对话框不加入路由历史，符合“设置页不计入路由历史”的要求。
- Ingame 提供可调透明度、拖拽、评分标签自定义等能力。

## TODO / 后续拓展建议

- 增加 Vitest 单元测试覆盖 `match-tracker` 与 `data-service`。
- 引入日志导出功能，结合 `overwolf.extensions.log` 上报。
- 评估云端同步方案与潜在的 50MB IndexedDB 限制。

