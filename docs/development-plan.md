# 开发计划文档

## 文档信息

- **创建时间**: 2025-01-XX
- **基于文档**: `prdv2.md`
- **当前代码状态**: MVP 基础框架已搭建

---

## 一、当前代码状态分析

### 1.1 已有功能 ✅

1. **基础框架**

   - ✅ Overwolf Native App 基础结构
   - ✅ React 18 + TypeScript 配置
   - ✅ TailwindCSS 配置
   - ✅ Vite 构建配置
   - ✅ Background Controller 基础实现
   - ✅ 窗口管理（desktop、ingame）
   - ✅ 热键支持（Alt+Shift+D）
   - ✅ 游戏事件监听基础框架

2. **类型定义**

   - ✅ `src/types/dota2-gep.ts` - Dota 2 GEP 数据类型定义完整

3. **基础组件**
   - ✅ `src/App.tsx` - 桌面窗口基础框架（仅测试功能）
   - ✅ `src/ingame.tsx` - 游戏内窗口基础框架（仅显示玩家列表）
   - ✅ `src/background/background.ts` - 后台控制器基础实现

### 1.2 缺失功能 ❌

1. **数据库层**

   - ❌ IndexedDB 数据库初始化（Dexie.js）
   - ❌ 4 个数据表的 Schema 定义
   - ❌ 数据库操作封装（CRUD）
   - ❌ 数据迁移和版本管理

2. **数据收集层**

   - ❌ 数据快照缓存机制
   - ❌ `match_ended` 事件的数据收集逻辑
   - ❌ `onInfoUpdates2` 的数据处理逻辑
   - ❌ 账户表更新逻辑
   - ❌ 玩家表更新逻辑
   - ❌ 比赛表创建逻辑
   - ❌ 数据验证和错误处理

3. **Desktop 窗口功能**

   - ❌ React Router 集成
   - ❌ 路由结构（总览、比赛详情、玩家详情）
   - ❌ 账号切换组件
   - ❌ 总览数据组件（3 个 Tab：比赛、玩家、点评）
   - ❌ 比赛详情组件
   - ❌ 玩家详情组件
   - ❌ 应用说明组件
   - ❌ 设置页面

4. **Ingame 窗口功能**

   - ❌ 策略阶段组件（玩家简单评价）
   - ❌ 赛后阶段组件（编辑评价）
   - ❌ 评分保存逻辑
   - ❌ 词云功能

5. **工具和工具函数**
   - ❌ 字段获取优先级统一函数
   - ❌ 数据验证函数
   - ❌ 错误处理工具
   - ❌ 数据导入/导出功能

---

## 二、开发任务清单

### 阶段一：数据库层（优先级：高）

#### 任务 1.1：安装和配置 Dexie.js

**文件**: `package.json`

**需要修改**:

- ✅ 已安装 `dexie: ^3.2.4`
- ⚠️ 需要确认版本是否最新

**操作**:

```bash
npm install dexie@latest
```

---

#### 任务 1.2：创建数据库 Schema

**新建文件**: `src/db/database.ts`

**需要实现**:

- 定义 4 个数据表：matches, players, accounts, ratings
- 定义所有字段类型
- 创建索引（根据 PRD 第 33-60 行）
- 数据库版本管理

**关键点**:

- matches 表：uuid（主键）、match_id（唯一索引）、player_id（索引）、end_time（索引）、match_mode（索引）
- players 表：uuid（主键）、player_id（唯一索引）、last_seen（索引）
- accounts 表：uuid（主键）、account_id（索引）、updated_at（索引）
- ratings 表：uuid（主键）、player_id（索引）、account_id（索引）、match_id（索引）、created_at（索引）、复合索引 (player_id, account_id)

**参考 PRD**: 第 153-321 行（数据表定义）

---

#### 任务 1.3：创建数据库操作封装

**新建文件**: `src/db/repositories/`

**需要创建的文件**:

- `matches.repository.ts` - 比赛表操作
- `players.repository.ts` - 玩家表操作
- `accounts.repository.ts` - 账户表操作
- `ratings.repository.ts` - 评分表操作

**需要实现的方法**:

- `create()` - 创建记录
- `update()` - 更新记录
- `findById()` - 根据 ID 查找
- `findAll()` - 查找所有
- `findByMatchId()` - 根据 match_id 查找（matches）
- `findByPlayerId()` - 根据 player_id 查找（players, ratings）
- `findByAccountId()` - 根据 account_id 查找（accounts, ratings）
- `getCurrentAccount()` - 获取当前账户（accounts）
- 事务处理封装

**参考 PRD**: 第 86-151 行（数据获取策略、数据一致性保证）

---

### 阶段二：数据收集层（优先级：高）

#### 任务 2.1：创建数据快照缓存机制

**新建文件**: `src/background/data-cache.ts`

**需要实现**:

- 缓存 `onInfoUpdates2` 的最新数据
- 提供 `getCachedInfo()` 方法
- 提供 `updateCache()` 方法
- 缓存过期机制（可选）

**参考 PRD**: 第 130-136 行（数据快照机制）

---

#### 任务 2.2：创建字段获取工具函数

**新建文件**: `src/utils/data-extraction.ts`

**需要实现**:

- `getPlayerId()` - 按优先级获取 player_id（account_id > steamId > steam_id > steamid）
- `getPlayerName()` - 按优先级获取 player_name（player_name > playerName > name）
- `getAccountId()` - 从 me.steam_id 获取
- `getMatchId()` - 从 match_info.pseudo_match_id 获取
- 所有函数都需要空值检查和默认值处理

**参考 PRD**: 第 94-98 行（字段获取优先级）

---

#### 任务 2.3：实现账户表更新逻辑

**修改文件**: `src/background/background.ts`

**需要实现**:

- 在 `onInfoUpdates2` 监听器中处理 `me` 信息
- 根据 `account_id` 查找记录
- 如果不存在，创建新记录
- 如果存在，更新 `name` 和 `updated_at`
- 错误处理

**参考 PRD**: 第 273-309 行（账户表数据更新策略）

---

#### 任务 2.4：实现比赛表创建逻辑

**修改文件**: `src/background/background.ts`

**需要实现**:

- 在 `match_ended` 事件处理中：
  1. 立即调用 `getInfo()` 获取最新快照
  2. 如果数据不完整，等待 `onInfoUpdates2` 更新（最多 5 秒超时）
  3. 或使用缓存的快照
  4. 验证数据完整性（match_id、10 个玩家等）
  5. 使用事务创建 matches 记录
  6. 错误处理和日志记录

**关键点**:

- 数据同步机制（getInfo + 缓存）
- 数据验证（玩家数量、必要字段）
- 事务处理（确保数据一致性）
- 错误处理（缺失字段、格式异常）

**参考 PRD**: 第 89 行、第 130-151 行（数据获取策略、数据一致性保证）

---

#### 任务 2.5：实现玩家表更新逻辑

**修改文件**: `src/background/background.ts`

**需要实现**:

- 在 `match_ended` 事件处理中，从快照的 `roster.players[]` 收集玩家数据
- 对每个玩家：
  1. 根据 `player_id` 查找记录
  2. 如果不存在，创建新记录
  3. 如果存在，更新 `current_name`、`previous_names`、`last_seen`
- 使用事务处理
- 错误处理

**参考 PRD**: 第 237-271 行（玩家表数据更新策略）

---

#### 任务 2.6：实现数据验证函数

**新建文件**: `src/utils/data-validation.ts`

**需要实现**:

- `validateMatchData()` - 验证比赛数据完整性
- `validatePlayerData()` - 验证玩家数据完整性
- `validateRatingData()` - 验证评分数据完整性
- 字段类型验证
- 字段范围验证（如 score 1-5）

**参考 PRD**: 第 62-84 行（错误处理策略）

---

### 阶段三：Desktop 窗口功能（优先级：高）

#### 任务 3.1：安装 React Router

**文件**: `package.json`

**需要修改**:

```bash
npm install react-router-dom@^6.20.0
npm install --save-dev @types/react-router-dom
```

**参考 PRD**: 第 22 行（路由方案：React Router v6）

---

#### 任务 3.2：创建路由结构

**修改文件**: `src/App.tsx`

**需要实现**:

- 使用 `BrowserRouter`
- 路由结构：
  - `/` - 总览数据组件
  - `/match/:matchId` - 比赛详情组件
  - `/player/:playerId` - 玩家详情组件
- 导航功能（前进/后退/Home）
- 鼠标侧键支持（Mouse 4/5）

**参考 PRD**: 第 549-562 行（路由方案）

---

#### 任务 3.3：创建账号切换组件

**新建文件**: `src/components/desktop/AccountSelector.tsx`

**需要实现**:

- 从 `accounts` 表查询所有记录
- 按 `updated_at` 降序排序
- 默认选中最近使用的账号
- 下拉选择组件
- 不可清空（必须选中一个）

**参考 PRD**: 第 596-615 行（账号切换组件）

---

#### 任务 3.4：创建总览数据组件

**新建文件**: `src/components/desktop/OverviewData.tsx`

**需要实现**:

- 3 个 Tab：比赛、玩家、点评
- Tab 1：比赛 table
  - 字段：比赛 id、时间、游戏模式、时长、胜负、队伍、玩家
  - 筛选：时间范围、游戏模式、胜负
  - 排序：各字段排序
  - 点击跳转到比赛详情
- Tab 2：玩家 table
  - 字段：玩家 id、玩家名字、first_seen、last_seen、友方胜率、敌方胜率、上次评分、中位数评分、平均数评分、常用英雄
  - 筛选和排序
  - 点击跳转到玩家详情
- Tab 3：点评 table
  - 字段：比赛 id、玩家 id、所在队伍、队友/对手、英雄、KDA、分数、点评时间、文案
  - 筛选和排序

**关键点**:

- 使用虚拟滚动（大量数据时）
- 复杂查询（胜率计算、评分统计）
- 性能优化

**参考 PRD**: 第 617-679 行（总览数据组件）

---

#### 任务 3.5：创建比赛详情组件

**新建文件**: `src/components/desktop/MatchDetail.tsx`

**需要实现**:

- 从 `matches` 表查询指定 `match_id` 的比赛
- 显示 10 个玩家的信息表格
- 每个玩家显示：名称、英雄、KDA、GPM、XPM、队伍
- 高亮显示当前玩家
- 显示比赛基本信息
- 点击玩家跳转到玩家详情
- 前进/后退/Home 按钮

**参考 PRD**: 第 681-712 行（比赛详情组件）

---

#### 任务 3.6：创建玩家详情组件

**新建文件**: `src/components/desktop/PlayerDetail.tsx`

**需要实现**:

- 友方胜率、敌方胜率（或胜率，如果是自己）
- 评分统计（上次/中位数/平均数）+ 文案
- 常用英雄
- 曾用名列表
- 前进/后退/Home 按钮

**关键点**:

- 胜率计算逻辑（同队/对战判断）
- 评分统计计算
- 常用英雄统计

**参考 PRD**: 第 714-751 行（玩家详情组件）

---

#### 任务 3.7：创建应用说明组件

**新建文件**: `src/components/desktop/AppGuide.tsx`

**需要实现**:

- 应用使用说明
- 简单的 guide 界面
- 纯 UI 组件

**参考 PRD**: 第 582-594 行（应用说明组件）

---

#### 任务 3.8：创建设置页面

**新建文件**: `src/components/desktop/Settings.tsx`

**需要实现**:

- 语言切换（中文/英文）
- ingame 快捷键配置
- 评分文案配置（1 星到 5 星）
- 数据导入按钮
- 数据导出按钮
- 删除全部数据按钮
- 关于信息（版本号、联系邮箱等）

**参考 PRD**: 第 961-1008 行（设置页面、数据导入/导出功能）

---

### 阶段四：Ingame 窗口功能（优先级：高）

#### 任务 4.1：创建策略阶段组件

**新建文件**: `src/components/ingame/PlayerSimpleRating.tsx`

**需要实现**:

- 显示友方胜率/敌方胜率
- 显示评分（上次/平均数）+ 文案
- 显示文字词云（常用评价关键词）
- 点击玩家卡片跳转到 desktop 窗口

**关键点**:

- 胜率计算（从 IndexedDB 查询历史数据）
- 评分统计（从 ratings 表查询）
- 词云功能（需要选择库，检查商业友好协议）
- 中文分词（需要选择库）

**参考 PRD**: 第 809-851 行（显示玩家简单评价组件）

---

#### 任务 4.2：创建赛后阶段组件

**新建文件**: `src/components/ingame/EditRating.tsx`

**需要实现**:

- 编辑即保存（实时保存到 IndexedDB）
- 评分默认三分（1-5 星评分）
- 文字输入框（评论内容）
- 防抖保存（500ms-1000ms）
- 保存状态提示
- 支持为多个玩家评分（10 个玩家）

**关键点**:

- 防抖实现（useDebounce hook）
- 实时保存逻辑
- 数据验证（score 1-5）
- match_id 获取（从 MATCH_INFO 消息或 getInfo()）

**参考 PRD**: 第 853-941 行（编辑评价组件）

---

#### 任务 4.3：修改 ingame.tsx 集成组件

**修改文件**: `src/ingame.tsx`

**需要实现**:

- 根据 `DISPLAY_MODE` 显示不同组件
- `mode === 'strategy'` → `PlayerSimpleRating`
- `mode === 'postgame'` → `EditRating`
- 接收 `PLAYER_INFO` 和 `MATCH_INFO` 消息

**参考 PRD**: 第 943-959 行（组件显示逻辑）

---

### 阶段五：Background 增强（优先级：中）

#### 任务 5.1：增强 match_ended 事件处理

**修改文件**: `src/background/background.ts`

**需要实现**:

- 调用 `getInfo()` 获取最新快照
- 使用缓存机制
- 数据验证
- 创建 matches、players、accounts 记录（使用事务）
- 发送 `MATCH_INFO` 消息给 ingame 窗口
- 错误处理和日志记录

**参考 PRD**: 第 389-407 行（比赛结束事件处理）

---

#### 任务 5.2：增强 onInfoUpdates2 监听器

**修改文件**: `src/background/background.ts`

**需要实现**:

- 缓存最新数据
- 处理 `me` 信息更新（更新 accounts 表）
- 处理 `roster` 信息更新
- 处理 `match_info` 信息更新
- 错误处理

**参考 PRD**: 第 120-128 行（onInfoUpdates2 事件说明）

---

#### 任务 5.3：实现 MATCH_INFO 消息发送

**修改文件**: `src/background/background.ts`

**需要实现**:

- 在 `match_ended` 事件触发时，发送 `MATCH_INFO` 消息
- 消息格式：
  ```typescript
  {
    type: 'MATCH_INFO',
    match_id: string | number,
    match_mode: string,
    winner: 'radiant' | 'dire',
    start_time?: number,
    end_time?: number
  }
  ```

**参考 PRD**: 第 1086-1096 行（MATCH_INFO 消息类型）

---

### 阶段六：工具函数和工具（优先级：中）

#### 任务 6.1：创建错误处理工具

**新建文件**: `src/utils/error-handler.ts`

**需要实现**:

- 错误日志记录
- 用户提示
- 错误分类（数据缺失、格式异常、连接异常、数据库异常）
- 重试机制封装

**参考 PRD**: 第 62-84 行（错误处理策略）

---

#### 任务 6.2：创建数据导入/导出功能

**新建文件**: `src/utils/data-import-export.ts`

**需要实现**:

- `exportData()` - 导出所有表数据为 JSON
- `importData()` - 导入 JSON 数据
- 数据格式验证
- 冲突处理（覆盖/跳过）
- 导入预览

**参考 PRD**: 第 970-1008 行（数据导入/导出功能）

---

#### 任务 6.3：创建胜率计算工具

**新建文件**: `src/utils/win-rate-calculator.ts`

**需要实现**:

- `calculateAllyWinRate()` - 计算友方胜率
- `calculateEnemyWinRate()` - 计算敌方胜率
- `calculateSelfWinRate()` - 计算自己的胜率
- 判断逻辑：同队/对战判断

**参考 PRD**: 第 727-735 行（胜率计算逻辑）

---

#### 任务 6.4：创建评分统计工具

**新建文件**: `src/utils/rating-calculator.ts`

**需要实现**:

- `getLastRating()` - 获取上次评分
- `getMedianRating()` - 计算中位数评分
- `getAverageRating()` - 计算平均评分
- `getRatingText()` - 根据评分值获取文案

**参考 PRD**: 第 736-737 行（评分统计）

---

### 阶段七：UI 组件库（优先级：中）

#### 任务 7.1：安装 shadcn/ui（可选）

**文件**: `package.json`

**需要修改**:

- 如果使用 shadcn/ui，需要安装和配置
- 或者使用自定义组件

**参考 PRD**: 第 18 行（UI 框架：TailwindCSS + shadcn/ui）

---

#### 任务 7.2：创建通用 UI 组件

**新建目录**: `src/components/ui/`

**可能需要创建的组件**:

- `Table.tsx` - 表格组件（支持排序、筛选）
- `Tabs.tsx` - Tab 切换组件
- `Select.tsx` - 下拉选择组件
- `RatingStars.tsx` - 星级评分组件
- `Button.tsx` - 按钮组件
- `Input.tsx` - 输入框组件
- `Modal.tsx` - 模态框组件

---

### 阶段八：测试和优化（优先级：低）

#### 任务 8.1：数据同步测试

**需要测试**:

- `match_ended` 和 `onInfoUpdates2` 的时序关系
- 数据快照机制是否正常工作
- 缓存机制是否有效

---

#### 任务 8.2：性能优化

**需要优化**:

- 大量数据时的查询性能
- 虚拟滚动实现
- 数据分页加载（如果需要）

---

#### 任务 8.3：错误处理测试

**需要测试**:

- 数据缺失场景
- 数据格式异常场景
- GEP 连接异常场景
- 数据库操作异常场景

---

## 三、文件结构规划

### 3.1 新增目录结构

```
src/
├── db/
│   ├── database.ts              # 数据库 Schema 定义
│   └── repositories/
│       ├── matches.repository.ts
│       ├── players.repository.ts
│       ├── accounts.repository.ts
│       └── ratings.repository.ts
├── components/
│   ├── desktop/
│   │   ├── AccountSelector.tsx
│   │   ├── OverviewData.tsx
│   │   ├── MatchDetail.tsx
│   │   ├── PlayerDetail.tsx
│   │   ├── AppGuide.tsx
│   │   └── Settings.tsx
│   ├── ingame/
│   │   ├── PlayerSimpleRating.tsx
│   │   └── EditRating.tsx
│   └── ui/                      # 通用 UI 组件
├── utils/
│   ├── data-extraction.ts       # 字段获取工具
│   ├── data-validation.ts       # 数据验证工具
│   ├── error-handler.ts         # 错误处理工具
│   ├── data-import-export.ts   # 数据导入导出
│   ├── win-rate-calculator.ts   # 胜率计算
│   └── rating-calculator.ts     # 评分统计
├── background/
│   ├── background.ts            # 修改：增强事件处理
│   └── data-cache.ts            # 新建：数据缓存
├── App.tsx                       # 修改：集成路由
├── ingame.tsx                    # 修改：集成组件
└── main.tsx                      # 保持不变
```

---

## 四、开发优先级和时间估算

### 高优先级（必须完成）

| 阶段   | 任务             | 预估时间 | 依赖           |
| ------ | ---------------- | -------- | -------------- |
| 阶段一 | 数据库层         | 2-3 天   | 无             |
| 阶段二 | 数据收集层       | 3-4 天   | 阶段一         |
| 阶段三 | Desktop 窗口功能 | 5-7 天   | 阶段一、阶段二 |
| 阶段四 | Ingame 窗口功能  | 3-4 天   | 阶段一、阶段二 |

**总计**: 13-18 天

### 中优先级（建议完成）

| 阶段   | 任务            | 预估时间 | 依赖           |
| ------ | --------------- | -------- | -------------- |
| 阶段五 | Background 增强 | 1-2 天   | 阶段二         |
| 阶段六 | 工具函数和工具  | 2-3 天   | 阶段一、阶段二 |
| 阶段七 | UI 组件库       | 2-3 天   | 无             |

**总计**: 5-8 天

### 低优先级（可选）

| 阶段   | 任务       | 预估时间 | 依赖     |
| ------ | ---------- | -------- | -------- |
| 阶段八 | 测试和优化 | 持续进行 | 所有阶段 |

---

## 五、关键实现细节

### 5.1 数据同步机制

**实现位置**: `src/background/background.ts` 的 `handleGameEvent()` 方法

**关键代码逻辑**:

```typescript
// 伪代码
async handleMatchEnded() {
  // 1. 立即调用 getInfo() 获取最新快照
  const latestInfo = await getInfo();

  // 2. 如果数据不完整，等待 onInfoUpdates2 更新（最多 5 秒）
  if (!isDataComplete(latestInfo)) {
    const cachedInfo = await waitForInfoUpdate(5000);
    if (cachedInfo) {
      useData = cachedInfo;
    } else {
      useData = latestInfo; // 使用不完整数据，记录警告
    }
  }

  // 3. 验证数据完整性
  if (!validateMatchData(useData)) {
    logError('数据不完整');
    return;
  }

  // 4. 使用事务创建记录
  await db.transaction('rw', [db.matches, db.players, db.accounts], async () => {
    await createMatchRecord(useData);
    await updatePlayerRecords(useData);
    await updateAccountRecord(useData);
  });
}
```

**参考 PRD**: 第 130-151 行

---

### 5.2 字段获取优先级

**实现位置**: `src/utils/data-extraction.ts`

**关键代码逻辑**:

```typescript
function getPlayerId(player: Dota2RosterPlayer): string | number {
  return (
    player.account_id ||
    player.steamId ||
    player.steam_id ||
    player.steamid ||
    `temp_${Date.now()}_${Math.random()}`
  ); // 临时 ID
}

function getPlayerName(player: Dota2RosterPlayer): string {
  return player.player_name || player.playerName || player.name || "未知玩家";
}
```

**参考 PRD**: 第 94-98 行

---

### 5.3 胜率计算逻辑

**实现位置**: `src/utils/win-rate-calculator.ts`

**关键代码逻辑**:

```typescript
async function calculateAllyWinRate(playerId: string, accountId: string) {
  // 1. 查找所有包含该玩家的比赛
  const matches = await db.matches
    .where('player_1_id').equals(playerId)
    .or('player_2_id').equals(playerId)
    // ... player_3_id 到 player_10_id
    .toArray();

  // 2. 判断该玩家所在队伍
  // player_1_id 到 player_5_id 为天辉，player_6_id 到 player_10_id 为夜魇

  // 3. 计算胜率
  const wins = matches.filter(m => {
    const isRadiant = [m.player_1_id, m.player_2_id, ..., m.player_5_id].includes(playerId);
    return (isRadiant && m.winner === 'radiant') || (!isRadiant && m.winner === 'dire');
  }).length;

  return (wins / matches.length) * 100;
}
```

**参考 PRD**: 第 727-735 行

---

## 六、注意事项

### 6.1 技术选型验证

1. **词云库选择**

   - 需要检查商业友好协议
   - 候选：`react-wordcloud`、`wordcloud2.js`
   - 需要验证在 Overwolf 环境中的兼容性

2. **中文分词库选择**

   - 需要检查商业友好协议
   - 候选：`nodejieba`、`segment`
   - 需要验证在浏览器环境中的使用

3. **React Router**
   - ✅ 已确定使用 React Router v6（MIT License）
   - 需要验证在 Overwolf 环境中的兼容性

### 6.2 数据验证点

1. **GEP 字段名称变体**

   - 需要在实际开发中验证字段名称的实际使用情况
   - 可能需要调整优先级顺序

2. **事件时序关系**

   - 需要测试 `match_ended` 和 `onInfoUpdates2` 的时序关系
   - 可能需要调整超时时间（当前 5 秒）

3. **数据完整性**
   - 需要测试各种异常场景
   - 确保错误处理机制有效

### 6.3 性能考虑

1. **大量数据查询**

   - 使用索引优化查询
   - 使用虚拟滚动（超过 1000 条数据）
   - 考虑数据分页加载

2. **实时保存**
   - 使用防抖优化保存频率
   - 避免频繁的数据库操作

---

## 七、开发顺序建议

### 第一步：数据库层（2-3 天）

1. 创建数据库 Schema
2. 创建 Repository 封装
3. 测试基本 CRUD 操作

### 第二步：数据收集层（3-4 天）

1. 实现数据快照缓存
2. 实现字段获取工具函数
3. 实现账户表更新逻辑
4. 实现比赛表创建逻辑
5. 实现玩家表更新逻辑
6. 实现数据验证函数

### 第三步：Desktop 窗口基础功能（3-4 天）

1. 集成 React Router
2. 创建账号切换组件
3. 创建总览数据组件（基础版本）
4. 创建比赛详情组件
5. 创建玩家详情组件

### 第四步：Ingame 窗口功能（3-4 天）

1. 创建策略阶段组件
2. 创建赛后阶段组件
3. 集成到 ingame.tsx

### 第五步：完善和优化（2-3 天）

1. 增强 Background 事件处理
2. 实现数据导入/导出
3. 实现设置页面
4. 错误处理完善
5. 性能优化

---

## 八、检查清单

### 开发前检查

- [ ] 确认所有依赖包版本
- [ ] 确认 PRD 理解无误
- [ ] 准备开发环境

### 开发中检查

- [ ] 每个阶段完成后进行测试
- [ ] 确保数据一致性
- [ ] 确保错误处理完善
- [ ] 确保性能可接受

### 开发后检查

- [ ] 所有功能测试通过
- [ ] 错误处理测试通过
- [ ] 性能测试通过
- [ ] 代码审查
- [ ] 文档更新

---

## 九、参考资源

1. **PRD 文档**: `prdv2.md`
2. **类型定义**: `src/types/dota2-gep.ts`
3. **Overwolf API 文档**:
   - https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction
   - https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2
4. **Dexie.js 文档**: https://dexie.org/
5. **React Router 文档**: https://reactrouter.com/

---

## 十、更新日志

- **2025-01-XX**: 创建开发计划文档
