# 🔍 对局检测逻辑改进建议

## 当前实现

### 判断条件

```typescript
// 当前的简单判断
const gameState = data.map?.game_state;
const matchId = data.map?.matchid || '0';

if ((isGameInProgress || isPreGame) && matchId !== '0') {
  if (this.currentMatchId !== matchId) {
    this.startNewMatch(matchId, timestamp);
  }
}
```

### 触发时机

- ✅ 选英雄阶段开始
- ✅ 策略时间开始
- ✅ 游戏开始
- ✅ matchId 改变

## 潜在问题场景

### 场景 1: 断线重连

**情况**：
1. 游戏中应用崩溃或重启
2. matchId 不变，但 `currentMatchId` 为 `null`
3. 重新进入游戏时会创建新文件

**结果**：一场对局产生多个文件

**检测方法**：
```typescript
// 检查是否已存在该 matchId 的文件
const existingFile = fs.readdirSync(this.logDir)
  .find(f => f.includes(matchId));
```

### 场景 2: 练习模式/Demo

**情况**：
- 练习模式也有 matchId
- Demo 演示也有 matchId
- 但这些不是真实对局

**检测方法**：
```typescript
// 检查游戏模式
const gameMode = data.map?.game_mode;
const isRealMatch = gameMode !== 'practice' && 
                    gameMode !== 'demo';
```

### 场景 3: 观战模式

**情况**：
- 观战别人的对局
- 有完整的游戏数据和 matchId
- 但你不是玩家

**检测方法**：
```typescript
// 检查玩家活动状态
const activity = data.player?.activity;
const isPlaying = activity === 'playing';
```

### 场景 4: 匹配失败/取消

**情况**：
- 进入选人阶段
- 有人未接受/断开
- 对局取消，但可能已开始记录

**检测方法**：
```typescript
// 检查游戏是否真正开始
const gameTime = data.map?.game_time;
const hasStarted = gameTime > -90; // 超过准备时间
```

## 改进方案

### 方案 A: 保守判断（推荐）

只在游戏真正开始后才记录：

```typescript
private shouldStartNewMatch(data: any, matchId: string): boolean {
  const gameState = data.map?.game_state;
  const gameTime = data.map?.game_time || 0;
  
  // 必须在游戏进行中
  const isInGame = gameState === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS';
  
  // 必须有有效的 matchId
  const hasValidMatchId = matchId !== '0' && matchId !== 'undefined';
  
  // 必须是新的对局
  const isNewMatch = this.currentMatchId !== matchId;
  
  return isInGame && hasValidMatchId && isNewMatch;
}
```

**优点**：
- ✅ 只记录真正开始的对局
- ✅ 避免选人阶段取消的干扰
- ✅ 数据更可靠

**缺点**：
- ❌ 缺失选人阶段数据
- ❌ 缺失策略时间数据

### 方案 B: 完整记录 + 智能检测

记录完整过程，但增加多重验证：

```typescript
private shouldStartNewMatch(data: any, matchId: string): boolean {
  const gameState = data.map?.game_state;
  const gameMode = data.map?.game_mode;
  const activity = data.player?.activity;
  
  // 检查游戏状态
  const isGameRelated = 
    gameState?.includes('GAME_IN_PROGRESS') ||
    gameState?.includes('PRE_GAME') ||
    gameState?.includes('HERO_SELECTION') ||
    gameState?.includes('STRATEGY_TIME');
  
  // 检查是否在玩（不是观战）
  const isPlaying = activity === 'playing';
  
  // 检查是否真实对局（不是练习）
  const isRealMatch = gameMode && 
                     !gameMode.includes('practice') &&
                     !gameMode.includes('demo');
  
  // 检查 matchId 有效性
  const hasValidMatchId = matchId !== '0' && matchId !== 'undefined';
  
  // 检查是否新对局
  const isNewMatch = this.currentMatchId !== matchId;
  
  // 检查是否已存在该对局文件（防止重复）
  const isDuplicate = this.checkDuplicateMatch(matchId);
  
  return isGameRelated && 
         isPlaying && 
         isRealMatch && 
         hasValidMatchId && 
         isNewMatch && 
         !isDuplicate;
}

private checkDuplicateMatch(matchId: string): boolean {
  try {
    const files = fs.readdirSync(this.logDir);
    return files.some(file => {
      if (!file.endsWith('.json')) return false;
      const filePath = path.join(this.logDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data._meta?.match_id === matchId;
    });
  } catch {
    return false;
  }
}
```

**优点**：
- ✅ 记录完整对局过程
- ✅ 多重验证，减少误判
- ✅ 防止重复记录

**缺点**：
- ❌ 逻辑较复杂
- ❌ 需要读取已有文件（性能影响）

### 方案 C: 混合方案（最佳）

从选人开始记录，但游戏取消时删除：

```typescript
private shouldStartNewMatch(data: any, matchId: string): boolean {
  const gameState = data.map?.game_state;
  const activity = data.player?.activity;
  
  // 基本条件
  const isGameRelated = 
    gameState?.includes('HERO_SELECTION') ||
    gameState?.includes('STRATEGY_TIME') ||
    gameState?.includes('PRE_GAME') ||
    gameState?.includes('GAME_IN_PROGRESS');
  
  const isPlaying = activity === 'playing';
  const hasValidMatchId = matchId !== '0';
  const isNewMatch = this.currentMatchId !== matchId;
  
  return isGameRelated && isPlaying && hasValidMatchId && isNewMatch;
}

private logToFile(data: any, timestamp: string): void {
  // ... 现有代码 ...
  
  // 新增：检测对局取消
  if (gameState === 'DOTA_GAMERULES_STATE_DISCONNECT' || 
      gameState === 'DOTA_GAMERULES_STATE_INIT') {
    if (this.currentMatchId && this.logCounter < 10) {
      // 如果记录很少（说明没真正开始），删除数据
      console.log('⚠️  对局取消，清理数据');
      this.currentMatchId = null;
      this.currentMatchData = [];
      return;
    }
  }
  
  // ... 其余代码 ...
}
```

**优点**：
- ✅ 记录完整过程
- ✅ 自动清理取消的对局
- ✅ 逻辑相对简单

## 实际数据示例

### matchId 的值

```typescript
// 不同场景的 matchId
主菜单:     "0"
练习模式:   "0" 或 练习特定ID
观战:       真实对局ID (但你不是玩家)
真实对局:   "7654321" (数字ID)
```

### game_state 的完整流程

```
匹配成功 → WAIT_FOR_PLAYERS_TO_LOAD
         ↓
      HERO_SELECTION (选人开始，matchId 已有效)
         ↓
      STRATEGY_TIME (策略时间)
         ↓
      PRE_GAME (倒计时)
         ↓
      GAME_IN_PROGRESS (游戏开始)
         ↓
      POST_GAME (游戏结束)
```

## 建议采用的方案

**推荐：方案 A（保守判断）+ 手动保存功能**

理由：
1. 简单可靠，不会误判
2. 选人数据价值相对较低
3. 通过手动保存功能弥补特殊情况

实现：
```typescript
// 只在游戏真正开始时创建文件
if (gameState === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' && 
    matchId !== '0' && 
    this.currentMatchId !== matchId) {
  this.startNewMatch(matchId, timestamp);
}
```

## 测试建议

### 测试场景

1. ✅ 正常对局：选人 → 游戏 → 结束
2. ✅ 断线重连：游戏中重启应用
3. ✅ 取消对局：选人阶段有人未接受
4. ✅ 练习模式：确保不记录
5. ✅ 观战模式：确保不记录
6. ✅ 连续对局：两场对局之间切换正确

### 调试日志

添加详细日志查看判断过程：

```typescript
console.log('对局检测:', {
  gameState,
  matchId,
  activity: data.player?.activity,
  gameMode: data.map?.game_mode,
  currentMatchId: this.currentMatchId,
  shouldStart: /* 判断结果 */
});
```

## 需要注意的边缘情况

1. **Turbo 模式**：游戏节奏更快，状态切换更快
2. **Ability Draft**：选人阶段更长
3. **自定义游戏**：可能有特殊的游戏状态
4. **重连**：可能错过部分状态
5. **观战回放**：需要明确排除

---

**当前实现已经基本可用，这些是可选的改进方向。** 

建议先使用当前版本收集数据，根据实际问题再优化！

