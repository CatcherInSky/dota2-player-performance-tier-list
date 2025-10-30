import express, { Express, Request, Response } from 'express';
import { EventEmitter } from 'events';
import { Server } from 'http';

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

  constructor(port: number = 3000) {
    super();
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // GSI 数据接收端点（Dota2 会发送 POST 请求到这里）
    this.app.post('/', (req: Request, res: Response) => {
      const event: GSIEvent = {
        timestamp: new Date().toISOString(),
        data: req.body
      };

      // 保存事件
      this.events.push(event);

      // 发出事件通知
      this.emit('gsi-event', event);

      console.log(`收到 GSI 数据 [${new Date().toLocaleTimeString()}]`);
      
      res.status(200).send('OK');
    });
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`✓ GSI 服务器已启动: http://localhost:${this.port}`);
          resolve();
        });

        if (this.server) {
          this.server.on('error', (error: Error) => {
            console.error('服务器错误:', error);
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

