import express, { Express, Request, Response } from 'express';
import { EventEmitter } from 'events';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { MatchLog, LogEntry, GSIData } from './gsi-types';

/**
 * Dota2 GSI 事件数据结构
 */
export interface GSIEvent {
  timestamp: string;
  data: any;
}

/**
 * GSI HTTP 服务器
 * 监听来自 Dota2 的 Game State Integration 数据
 */
export class GSIServer extends EventEmitter {
  private app: Express;
  private server: Server | null = null;
  private port: number;
  private events: GSIEvent[] = [];
  private logDir: string;
  private currentLogFile: string | null = null;
  private logEnabled: boolean = true;
  private logCounter: number = 0;
  private currentMatchId: string | null = null;
  private lastGameState: string | null = null;
  private matchStartTime: string | null = null;
  private fileWriteStream: fs.WriteStream | null = null;
  private isFirstEntry: boolean = true;
  private lastDataHash: string = '';
  private skipCounter: number = 0;

  constructor(port: number = 3000) {
    super();
    this.port = port;
    this.app = express();
    
    // 设置日志目录
    this.logDir = path.join(__dirname, '../../gsi-logs');
    this.ensureLogDir();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`📁 创建日志目录: ${this.logDir}`);
    }
  }

  /**
   * 检测对局开始并创建新日志文件
   * 使用流式写入,避免内存积压
   */
  private startNewMatch(matchId: string, timestamp: string): void {
    // 如果有旧对局，先关闭
    if (this.currentMatchId) {
      this.closeMatchFile();
    }

    // 开始新对局
    this.currentMatchId = matchId;
    this.matchStartTime = timestamp;
    this.logCounter = 0;
    this.isFirstEntry = true;
    this.lastDataHash = '';
    this.skipCounter = 0;
    
    const matchTimestamp = new Date(timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const logFileName = `match-${matchTimestamp}.json`;
    this.currentLogFile = path.join(this.logDir, logFileName);
    
    console.log(`\n🎮 检测到新对局开始！`);
    console.log(`📝 对局文件: ${logFileName}`);
    console.log(`🆔 对局ID: ${matchId}\n`);

    // 创建写入流并写入文件头和 metadata占位符
    this.fileWriteStream = fs.createWriteStream(this.currentLogFile, { flags: 'w' });
    
    // 写入JSON开头 (metadata稍后更新)
    this.fileWriteStream.write('{\n');
    this.fileWriteStream.write('  "_meta": {\n');
    this.fileWriteStream.write(`    "description": "Dota2 对局数据记录",\n`);
    this.fileWriteStream.write(`    "match_id": "${matchId}",\n`);
    this.fileWriteStream.write(`    "total_entries": 0,\n`);
    this.fileWriteStream.write(`    "start_time": "${timestamp}",\n`);
    this.fileWriteStream.write(`    "end_time": "${timestamp}",\n`);
    this.fileWriteStream.write(`    "duration_seconds": 0\n`);
    this.fileWriteStream.write('  },\n');
    this.fileWriteStream.write('  "entries": [\n');
  }

  /**
   * 关闭当前对局文件(流式写入模式)
   */
  private closeMatchFile(): void {
    if (!this.fileWriteStream || !this.currentLogFile) {
      return;
    }

    try {
      // 关闭 entries 数组
      this.fileWriteStream.write('\n  ]\n');
      this.fileWriteStream.write('}\n');
      this.fileWriteStream.end();

      // 等待文件写入完成
      this.fileWriteStream.on('finish', () => {
        if (this.currentLogFile) {
          // 更新metadata
          this.updateMetadata();
          
          const fileSize = fs.statSync(this.currentLogFile).size;
          const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
          
          console.log(`\n💾 对局数据已保存！`);
          console.log(`📄 文件: ${path.basename(this.currentLogFile)}`);
          console.log(`📊 实际记录数: ${this.logCounter} 条`);
          console.log(`⏭️  跳过重复: ${this.skipCounter} 条`);
          console.log(`📦 文件大小: ${fileSizeMB} MB\n`);
        }
      });

      this.fileWriteStream = null;
    } catch (error) {
      console.error('❌ 关闭对局文件失败:', error);
    }
  }

  /**
   * 更新文件的metadata (对局结束后)
   */
  private updateMetadata(): void {
    if (!this.currentLogFile) return;

    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const lastEntry = this.getLastGameTime();
      
      // 替换metadata部分
      const updatedContent = content.replace(
        /"total_entries": 0/,
        `"total_entries": ${this.logCounter}`
      ).replace(
        /"end_time": "[^"]+"/,
        `"end_time": "${new Date().toISOString()}"`
      ).replace(
        /"duration_seconds": 0/,
        `"duration_seconds": ${lastEntry}`
      );

      fs.writeFileSync(this.currentLogFile, updatedContent, 'utf-8');
    } catch (error) {
      console.error('❌ 更新metadata失败:', error);
    }
  }

  /**
   * 获取最后一条记录的游戏时间
   */
  private getLastGameTime(): number {
    if (!this.currentLogFile) return 0;
    
    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const match = content.match(/"game_time":\s*(\d+)/g);
      if (match && match.length > 0) {
        const lastMatch = match[match.length - 1];
        const time = lastMatch.match(/\d+/);
        return time ? parseInt(time[0]) : 0;
      }
    } catch (error) {
      // 忽略
    }
    return 0;
  }

  /**
   * 保存对局数据到文件 (兼容手动保存)
   */
  private saveMatchData(): void {
    this.closeMatchFile();
  }

  /**
   * 计算数据的简单哈希(用于去重)
   * 只计算关键字段,忽略频繁变化但不重要的字段
   */
  private calculateDataHash(data: any): string {
    const keyData = {
      game_time: data.map?.game_time,
      clock_time: data.map?.clock_time,
      game_state: data.map?.game_state,
      kills: data.player?.kills,
      deaths: data.player?.deaths,
      assists: data.player?.assists,
      last_hits: data.player?.last_hits,
      level: data.hero?.level,
      health: data.hero?.health,
      mana: data.hero?.mana,
      xpos: data.hero?.xpos,
      ypos: data.hero?.ypos,
      radiant_score: data.map?.radiant_score,
      dire_score: data.map?.dire_score
    };
    return JSON.stringify(keyData);
  }

  /**
   * 检查数据是否有实质性变化
   */
  private hasSignificantChange(data: any, currentHash: string): boolean {
    // 重要事件始终记录
    if (data.events && data.events.length > 0) {
      return true;
    }

    // 游戏状态变化始终记录
    const gameState = data.map?.game_state;
    if (gameState !== this.lastGameState) {
      return true;
    }

    // 数据哈希不同表示有变化
    if (currentHash !== this.lastDataHash) {
      return true;
    }

    return false;
  }

  /**
   * 记录 GSI 数据 (流式写入 + 智能去重)
   */
  private logToFile(data: any, timestamp: string): void {
    if (!this.logEnabled) return;

    try {
      // 检测对局状态
      const gameState = data.map?.game_state;
      const matchId = data.map?.matchid || '0';
      
      // 检测对局开始（从非游戏状态进入游戏状态，且matchid不为0）
      const isGameInProgress = gameState?.includes('GAME_IN_PROGRESS');
      const isPreGame = gameState?.includes('PRE_GAME') || gameState?.includes('HERO_SELECTION') || gameState?.includes('STRATEGY_TIME');
      
      // 如果是新对局（matchid改变或首次进入游戏）
      if ((isGameInProgress || isPreGame) && matchId !== '0') {
        if (this.currentMatchId !== matchId) {
          this.startNewMatch(matchId, timestamp);
        }
      }
      
      // 如果对局结束
      if (gameState === 'DOTA_GAMERULES_STATE_POST_GAME' && this.currentMatchId) {
        // 写入最后一条数据
        this.writeLogEntry(data, timestamp);
        
        // 关闭文件并重置
        console.log('\n🏁 对局结束，正在保存数据...');
        this.closeMatchFile();
        this.currentMatchId = null;
        this.matchStartTime = null;
        return;
      }

      // 记录数据到当前对局 (流式写入 + 智能去重)
      if (this.currentMatchId && this.fileWriteStream) {
        const currentHash = this.calculateDataHash(data);
        
        // 检查是否有实质性变化
        if (this.hasSignificantChange(data, currentHash)) {
          this.writeLogEntry(data, timestamp);
          this.lastDataHash = currentHash;

          // 每 50 条记录显示一次统计
          if (this.logCounter % 50 === 0) {
            const fileSize = fs.statSync(this.currentLogFile!).size;
            const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
            console.log(`💾 已记录 ${this.logCounter} 条 (跳过 ${this.skipCounter} 条重复)，当前大小: ${fileSizeMB} MB`);
          }
        } else {
          // 跳过重复数据
          this.skipCounter++;
        }
      }
      
      this.lastGameState = gameState;
    } catch (error) {
      console.error('❌ 记录日志失败:', error);
    }
  }

  /**
   * 写入单条日志到流 (流式写入)
   */
  private writeLogEntry(data: any, timestamp: string): void {
    if (!this.fileWriteStream) return;

    this.logCounter++;
    const logEntry: LogEntry = {
      seq: this.logCounter,
      timestamp: timestamp,
      received_at: Date.now(),
      data: data
    };

    // 如果不是第一条,添加逗号
    if (!this.isFirstEntry) {
      this.fileWriteStream.write(',\n');
    } else {
      this.isFirstEntry = false;
    }

    // 写入条目 (缩进2空格)
    const entryJson = JSON.stringify(logEntry, null, 2);
    const indentedEntry = entryJson.split('\n').map(line => '    ' + line).join('\n');
    this.fileWriteStream.write(indentedEntry);
  }

  /**
   * 切换日志记录状态
   */
  toggleLogging(enabled: boolean): void {
    this.logEnabled = enabled;
    console.log(`📝 日志记录已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 手动保存当前对局（用于测试或强制保存）
   */
  saveCurrentMatch(): void {
    if (this.currentMatchId && this.logCounter > 0) {
      console.log('\n💾 手动保存当前对局数据...');
      this.saveMatchData();
      console.log('✓ 保存完成，继续记录...\n');
    } else {
      console.log('⚠️  当前没有对局数据可保存');
    }
  }

  private setupMiddleware(): void {
    // 记录所有请求（包括来源IP）
    this.app.use((req, res, next) => {
      const timestamp = new Date().toLocaleTimeString();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      console.log(`\n[${timestamp}] 收到请求: ${req.method} ${req.path}`);
      console.log(`  ├─ 来源IP: ${ip}`);
      console.log(`  ├─ Content-Type: ${req.headers['content-type'] || 'none'}`);
      console.log(`  └─ User-Agent: ${req.headers['user-agent'] || 'none'}`);
      next();
    });
    
    // 使用更宽松的JSON解析器来兼容Dota2发送的数据
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(express.text({ type: 'text/plain' }));
  }

  private setupRoutes(): void {
    // 健康检查端点
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        port: this.port,
        eventsCount: this.events.length,
        timestamp: new Date().toISOString()
      });
    });

    // GSI 数据接收端点（Dota2 会发送 POST 请求到这里）
    this.app.post('/', (req: Request, res: Response) => {
      try {
        console.log('\n' + '='.repeat(60));
        console.log(`[GSI 请求 #${this.logCounter + 1}] 时间: ${new Date().toLocaleTimeString()}`);
        console.log(`[GSI 请求] Headers:`, {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
          'user-agent': req.headers['user-agent']
        });
        
        // 打印请求体的前 500 个字符用于调试
        const bodyPreview = JSON.stringify(req.body, null, 2).substring(0, 500);
        console.log(`[GSI 请求] Body (preview):`, bodyPreview);
        console.log('='.repeat(60) + '\n');

        const timestamp = new Date().toISOString();
        const event: GSIEvent = {
          timestamp: timestamp,
          data: req.body
        };

        // 🆕 记录数据到文件
        this.logToFile(req.body, timestamp);

        // 保存所有事件（不仅仅是游戏数据）
        this.events.push(event);
        
        // 限制事件数量（保留最近 100 条）
        if (this.events.length > 100) {
          this.events.shift(); // 删除最旧的事件
        }

        // 发出事件通知
        this.emit('gsi-event', event);

        // 详细分析数据结构
        if (req.body) {
          const keys = Object.keys(req.body);
          console.log(`[GSI 数据] 包含的字段: ${keys.join(', ')}`);
          
          // 🔍 重点检查 allplayers 字段
          if (req.body.allplayers) {
            const playerCount = Object.keys(req.body.allplayers).length;
            console.log(`\n🎮 [ALLPLAYERS] 检测到! 包含 ${playerCount} 个玩家:`);
            
            Object.entries(req.body.allplayers).forEach(([key, playerData]: [string, any]) => {
              console.log(`  ${key}:`);
              console.log(`    ├─ accountid: ${playerData.accountid || 'N/A'}`);
              console.log(`    ├─ name: ${playerData.name || 'N/A'}`);
              console.log(`    ├─ team: ${playerData.team || 'N/A'} (2=天辉, 3=夜魇)`);
              console.log(`    ├─ hero_id: ${playerData.hero_id || 'N/A'}`);
              console.log(`    ├─ kills: ${playerData.kills ?? 'N/A'}`);
              console.log(`    ├─ deaths: ${playerData.deaths ?? 'N/A'}`);
              console.log(`    ├─ assists: ${playerData.assists ?? 'N/A'}`);
              console.log(`    └─ level: ${playerData.level || 'N/A'}`);
            });
            console.log('');
          } else {
            console.log('⚠️  [ALLPLAYERS] 未检测到 allplayers 字段!');
          }

          // 🔍 检查 draft 字段
          if (req.body.draft) {
            console.log(`\n📋 [DRAFT] 检测到选人阶段数据:`);
            if (req.body.draft.activeteam !== undefined) {
              console.log(`  当前选人方: ${req.body.draft.activeteam} (2=天辉, 3=夜魇)`);
            }
            if (req.body.draft.pick !== undefined) {
              console.log(`  当前是否选人: ${req.body.draft.pick}`);
            }
            console.log('');
          }
          
          if (req.body.player) {
            console.log(`[GSI 数据] Player: ${req.body.player.name || 'unknown'} | Team: ${req.body.player.team_name || 'unknown'}`);
          }
          if (req.body.hero) {
            console.log(`[GSI 数据] Hero: ${req.body.hero.name || 'unknown'} | Level: ${req.body.hero.level || 0}`);
          }
        }

        res.status(200).send('OK');
      } catch (error) {
        console.error('❌ 处理 GSI 数据时出错:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // 测试端点
    this.app.get('/test', (req: Request, res: Response) => {
      res.status(200).send(`
        <html>
        <body>
          <h1>Dota2 GSI Server is Running!</h1>
          <p>Port: ${this.port}</p>
          <p>Events received: ${this.events.length}</p>
          <p>Server time: ${new Date().toISOString()}</p>
          <form method="POST" action="/">
            <h3>Send Test Data:</h3>
            <textarea name="test" rows="10" cols="50">{"test": "data"}</textarea>
            <br><button type="submit">Send POST Request</button>
          </form>
        </body>
        </html>
      `);
    });

    // 获取所有事件的端点
    this.app.get('/events', (req: Request, res: Response) => {
      res.status(200).json({
        count: this.events.length,
        events: this.events
      });
    });

    // 日志管理端点
    this.app.get('/logs', (req: Request, res: Response) => {
      try {
        const files = fs.readdirSync(this.logDir)
          .filter(f => f.endsWith('.json'))
          .map(f => {
            const filePath = path.join(this.logDir, f);
            const stats = fs.statSync(filePath);
            return {
              name: f,
              path: filePath,
              size: stats.size,
              sizeMB: (stats.size / 1024 / 1024).toFixed(2),
              created: stats.birthtime,
              modified: stats.mtime
            };
          })
          .sort((a, b) => b.created.getTime() - a.created.getTime());

        res.status(200).json({
          logDir: this.logDir,
          currentMatchId: this.currentMatchId,
          currentLogFile: this.currentLogFile ? path.basename(this.currentLogFile) : null,
          loggingEnabled: this.logEnabled,
          currentEntries: this.logCounter,
          files: files
        });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // 切换日志记录
    this.app.post('/logs/toggle', (req: Request, res: Response) => {
      this.toggleLogging(!this.logEnabled);
      res.status(200).json({ 
        enabled: this.logEnabled,
        message: `日志记录已${this.logEnabled ? '启用' : '禁用'}`
      });
    });

    // 手动保存当前对局
    this.app.post('/logs/save', (req: Request, res: Response) => {
      this.saveCurrentMatch();
      res.status(200).json({ 
        message: '当前对局已保存',
        matchId: this.currentMatchId,
        entries: this.logCounter
      });
    });
  }

  /**
   * 获取 WSL IP 地址（如果在 WSL 环境）
   */
  private getWSLIP(): string | null {
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      
      // 查找 eth0 接口（WSL 通常使用这个）
      if (interfaces.eth0) {
        for (const iface of interfaces.eth0) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    } catch (error) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          const wslIP = this.getWSLIP();
          
          console.log(`✓ GSI 服务器已启动: http://localhost:${this.port}`);
          console.log(`\n📡 可用端点:`);
          console.log(`   - POST http://localhost:${this.port}/               (GSI 数据接收)`);
          console.log(`   - GET  http://localhost:${this.port}/health         (健康检查)`);
          console.log(`   - GET  http://localhost:${this.port}/test           (测试页面)`);
          console.log(`   - GET  http://localhost:${this.port}/events         (查看事件)`);
          console.log(`   - GET  http://localhost:${this.port}/logs           (日志文件管理)`);
          console.log(`   - POST http://localhost:${this.port}/logs/toggle    (切换日志记录)`);
          console.log(`   - POST http://localhost:${this.port}/logs/save      (手动保存当前对局)`);
          
          console.log(`\n📝 数据记录配置:`);
          console.log(`   日志目录: ${this.logDir}`);
          console.log(`   记录模式: 自动按对局分文件`);
          console.log(`   文件格式: 标准 JSON`);
          console.log(`   文件命名: match-<对局开始时间>.json`);
          console.log(`   状态: ${this.logEnabled ? '✅ 启用' : '❌ 禁用'}`);
          
          if (wslIP) {
            console.log(`\n⚠️  检测到 WSL 环境！`);
            console.log(`   WSL IP 地址: ${wslIP}`);
            console.log(`   如果 Dota2 在 Windows 运行，配置文件应该使用:`);
            console.log(`   "uri" "http://${wslIP}:${this.port}/"`);
            console.log(`\n   请更新配置文件并重启 Dota2！`);
          }
          
          console.log(`\n💡 测试服务器:`);
          console.log(`   1. 浏览器访问: http://localhost:${this.port}/test`);
          if (wslIP) {
            console.log(`   2. Windows 浏览器访问: http://${wslIP}:${this.port}/test`);
          }
          console.log(`\n🎮 Dota2 GSI 调试步骤:`);
          console.log(`   1. 确保 Dota2 已完全关闭`);
          console.log(`   2. 确认配置文件使用正确的 IP 地址`);
          console.log(`   3. 重新启动 Dota2`);
          console.log(`   4. 进入训练模式或真人对战（不是主菜单）`);
          console.log(`   5. 观察此窗口是否收到数据\n`);
          
          resolve();
        });

        if (this.server) {
          this.server.on('error', (error: Error) => {
            console.error('❌ 服务器错误:', error);
            reject(error);
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('✓ GSI 服务器已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取所有事件
   */
  getEvents(): GSIEvent[] {
    return this.events;
  }
}

