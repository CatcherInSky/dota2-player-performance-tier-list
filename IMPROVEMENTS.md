# ✅ 数据记录功能改进完成

## 🎯 解决的问题

### 1. ✅ 添加所有玩家数据（队友和对手）

**配置文件改进** (`public/gamestate_integration_performance.cfg`):
- ✅ 添加 `"allplayers": "1"` - 现在可以获取所有10个玩家的数据

### 2. ✅ 减少数据量

**优化参数**:
- ✅ `throttle: 0.5` → `2.0` (数据发送间隔从0.5秒增加到2秒，减少4倍数据量)
- ✅ `heartbeat: 10.0` → `30.0` (心跳间隔从10秒增加到30秒)

**预计效果**: 原本22MB → 约5-6MB

### 3. ✅ 标准JSON格式

**文件格式改进**:
- ❌ 旧格式: JSONL (每行一个JSON对象，不是有效的JSON文件)
- ✅ 新格式: 标准JSON文件，包含元数据和数据数组

**新文件结构**:
```json
{
  "_meta": {
    "description": "Dota2 对局数据记录",
    "match_id": "7654321",
    "total_entries": 120,
    "start_time": "2024-01-30T18:00:00.000Z",
    "end_time": "2024-01-30T18:45:00.000Z",
    "duration_seconds": 2700
  },
  "entries": [
    {
      "seq": 1,
      "timestamp": "2024-01-30T18:00:00.000Z",
      "received_at": 1706634000000,
      "data": { ... }
    },
    ...
  ]
}
```

### 4. ✅ 自动按对局分文件

**智能对局检测**:
- ✅ 自动检测对局开始（通过 `matchid` 和游戏状态）
- ✅ 自动检测对局结束（`DOTA_GAMERULES_STATE_POST_GAME`）
- ✅ 每个对局自动生成独立文件
- ✅ 文件命名: `match-<对局开始时间>.json`

**文件示例**:
```
gsi-logs/
├── match-2024-01-30T18-00-15.json  (第一场对局)
├── match-2024-01-30T19-30-22.json  (第二场对局)
└── match-2024-01-30T21-15-08.json  (第三场对局)
```

## 🚀 使用方法

### 1. 重新编译

```bash
cd /home/zhang/dota2-player-performance-tier-list
npm run build
```

### 2. 启动应用

```bash
npm start
```

**启动信息**:
```
✓ GSI 服务器已启动: http://localhost:32866

📝 数据记录配置:
   日志目录: /home/zhang/dota2-player-performance-tier-list/gsi-logs
   记录模式: 自动按对局分文件
   文件格式: 标准 JSON
   文件命名: match-<对局开始时间>.json
   状态: ✅ 启用
```

### 3. 重启Dota2

**重要**: 配置文件已更新，必须重启Dota2才能生效！

### 4. 进入游戏

当进入对局时，会自动创建新文件：

```
🎮 检测到新对局开始！
📝 对局文件: match-2024-01-30T18-00-15.json
🆔 对局ID: 7654321

💾 已记录 10 条数据，当前大小: 0.25 MB
💾 已记录 20 条数据，当前大小: 0.48 MB
...
```

### 5. 对局结束

游戏结束后，自动保存文件：

```
🏁 对局结束，正在保存数据...

💾 对局数据已保存！
📄 文件: match-2024-01-30T18-00-15.json
📊 记录数: 120 条
📦 文件大小: 5.8 MB
```

## 📊 数据结构变化

### allplayers 字段

现在数据中包含所有10个玩家：

```json
{
  "allplayers": {
    "player0": {
      "accountid": 123456789,
      "name": "Player1",
      "team": 2,
      "kills": 5,
      "deaths": 2,
      "assists": 8,
      "hero_id": 1
    },
    "player1": { ... },
    ...
    "player9": { ... }
  }
}
```

### 识别队友和对手

```javascript
// 你的team值
const myTeam = data.player.team_name; // "radiant" 或 "dire"

// 遍历所有玩家
Object.values(data.allplayers).forEach(player => {
  const isTeammate = (myTeam === 'radiant' && player.team === 2) ||
                     (myTeam === 'dire' && player.team === 3);
  
  if (isTeammate) {
    console.log('队友:', player.name);
  } else {
    console.log('对手:', player.name);
  }
});
```

## 🎛️ API 变化

### GET /logs

查看所有对局文件：

```bash
curl http://localhost:32866/logs | jq
```

返回：
```json
{
  "logDir": "/path/to/gsi-logs",
  "currentMatchId": "7654321",
  "currentLogFile": "match-2024-01-30T18-00-15.json",
  "loggingEnabled": true,
  "currentEntries": 45,
  "files": [
    {
      "name": "match-2024-01-30T18-00-15.json",
      "sizeMB": "5.8"
    }
  ]
}
```

### POST /logs/save

手动保存当前对局（不等对局结束）：

```bash
curl -X POST http://localhost:32866/logs/save
```

用途：
- 长时间对局想中途保存
- 测试功能
- 应用崩溃前保存数据

## 📈 数据量对比

### 旧配置 (throttle: 0.5):
- 每秒 2 条数据
- 40分钟对局 = 4800 条
- 文件大小: ~22 MB

### 新配置 (throttle: 2.0):
- 每2秒 1 条数据
- 40分钟对局 = 1200 条
- 文件大小: ~5-6 MB

**减少约75%的数据量！**

## 💡 读取新格式文件

### Python:
```python
import json

# 读取对局文件
with open('gsi-logs/match-2024-01-30T18-00-15.json', 'r') as f:
    match_data = json.load(f)

# 访问元数据
print(f"对局ID: {match_data['_meta']['match_id']}")
print(f"时长: {match_data['_meta']['duration_seconds']}秒")

# 访问数据条目
for entry in match_data['entries']:
    print(f"序号: {entry['seq']}, 时间: {entry['timestamp']}")
    
    # 访问所有玩家
    allplayers = entry['data'].get('allplayers', {})
    for player_key, player_data in allplayers.items():
        print(f"  {player_data['name']}: {player_data['kills']}/{player_data['deaths']}/{player_data['assists']}")
```

### JavaScript:
```javascript
const fs = require('fs');

// 读取对局文件
const matchData = JSON.parse(
  fs.readFileSync('gsi-logs/match-2024-01-30T18-00-15.json', 'utf-8')
);

// 访问元数据
console.log(`对局ID: ${matchData._meta.match_id}`);
console.log(`时长: ${matchData._meta.duration_seconds}秒`);

// 访问数据条目
matchData.entries.forEach(entry => {
  console.log(`序号: ${entry.seq}, 时间: ${entry.timestamp}`);
  
  // 访问所有玩家
  const allplayers = entry.data.allplayers || {};
  Object.values(allplayers).forEach(player => {
    console.log(`  ${player.name}: ${player.kills}/${player.deaths}/${player.assists}`);
  });
});
```

## ⚠️ 注意事项

1. **必须重启Dota2** - 配置文件修改后需要完全重启游戏
2. **数据发送间隔增加** - throttle从0.5s增加到2s，实时性略有降低但仍足够
3. **文件自动保存** - 对局结束时自动保存，无需手动操作
4. **内存中缓存** - 对局进行中数据保存在内存，结束后写入文件

## 🎯 下一步建议

有了优化后的数据，你可以：

1. **分析所有玩家表现** - 对比自己与队友/对手
2. **团队协作分析** - 分析配合、支援等
3. **对手分析** - 学习高分玩家的打法
4. **位置分析** - 不同位置的表现标准
5. **英雄对比** - 相同英雄不同玩家的表现差异

---

**现在重新编译并开始新的对局吧！** 🎮📊

```bash
npm run build && npm start
```

