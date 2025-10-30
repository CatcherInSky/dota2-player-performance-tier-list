import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { CfgManager } from './cfg-manager';
import { GSIServer, GSIEvent } from './server';

// 为 CommonJS 环境定义 __dirname（如果不存在）
declare const __dirname: string;

/**
 * Electron 主进程
 */
class Application {
  private mainWindow: BrowserWindow | null = null;
  private gsiServer: GSIServer;
  private readonly PORT = 3000;

  constructor() {
    this.gsiServer = new GSIServer(this.PORT);
    this.setupApp();
  }

  private setupApp(): void {
    // 当 Electron 完成初始化时创建窗口
    app.whenReady().then(() => {
      this.initialize();
    });

    // 当所有窗口关闭时退出（macOS 除外）
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private async initialize(): Promise<void> {
    console.log('='.repeat(50));
    console.log('Dota2 Performance Tracker MVP 启动中...');
    console.log('='.repeat(50));

    // 1. 检查并创建/更新 GSI 配置文件
    try {
      const cfgPath = CfgManager.ensureCfgFile(this.PORT);
      console.log(`配置文件路径: ${cfgPath}`);
    } catch (error) {
      console.error('配置文件处理失败:', error);
    }

    // 2. 启动 GSI 服务器
    try {
      await this.gsiServer.start();
      
      // 监听 GSI 事件
      this.gsiServer.on('gsi-event', (event: GSIEvent) => {
        // 当收到新事件时，通知渲染进程更新界面
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('gsi-event', event);
        }
      });
    } catch (error) {
      console.error('启动服务器失败:', error);
    }

    // 3. 创建窗口
    this.createWindow();

    console.log('='.repeat(50));
    console.log('✓ 初始化完成！');
    console.log('提示: 启动 Dota2 游戏后，游戏数据将自动发送到此应用');
    console.log('='.repeat(50));
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: 'Dota2 Performance Tracker MVP'
    });

    // 加载 HTML 文件
    this.mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

    // 打开开发者工具（方便调试）
    this.mainWindow.webContents.openDevTools();

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private async cleanup(): Promise<void> {
    console.log('正在清理资源...');
    await this.gsiServer.stop();
  }
}

// 创建应用实例
new Application();
