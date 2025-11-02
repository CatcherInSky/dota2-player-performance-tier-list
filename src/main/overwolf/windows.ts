/**
 * Overwolf 窗口管理服务
 * 基于 PRD 8.3.2 章节
 */

export type WindowName = 'background' | 'desktop' | 'ingame';
export type IngameMode = 'record' | 'review';

export class WindowManager {
  async showDesktop(): Promise<void> {
    // TODO: 集成 Overwolf API
    // await overwolf.windows.restore('desktop');
    console.log('Show desktop window');
  }

  async hideDesktop(): Promise<void> {
    // await overwolf.windows.minimize('desktop');
    console.log('Hide desktop window');
  }

  async showInGame(mode: IngameMode): Promise<void> {
    // 传递模式参数给 ingame 窗口
    // await overwolf.windows.sendMessage('ingame', 'setMode', mode);
    // await overwolf.windows.restore('ingame');
    console.log(`Show ingame window in ${mode} mode`);
  }

  async hideInGame(): Promise<void> {
    // await overwolf.windows.minimize('ingame');
    console.log('Hide ingame window');
  }

  async closeInGame(): Promise<void> {
    // await overwolf.windows.close('ingame');
    console.log('Close ingame window');
  }
}

export const windowManager = new WindowManager();

