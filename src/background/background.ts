/**
 * Background Controller
 * 管理应用生命周期、窗口、游戏事件等
 */

/// <reference path="../types/overwolf.d.ts" />

/**
 * Overwolf API 类包装器
 * 简化常用 API 调用
 */

// OWWindow 类
class OWWindow {
  constructor(private name: string) {}

  async restore() {
    return new Promise<void>((resolve) => {
      overwolf.windows.obtainDeclaredWindow(this.name, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.restore(result.window.id, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  async close() {
    return new Promise<void>((resolve) => {
      overwolf.windows.obtainDeclaredWindow(this.name, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.close(result.window.id, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  async minimize() {
    return new Promise<void>((resolve) => {
      overwolf.windows.obtainDeclaredWindow(this.name, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.minimize(result.window.id, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  async bringToFront() {
    return new Promise<void>((resolve) => {
      overwolf.windows.obtainDeclaredWindow(this.name, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.bringToFront(result.window.id, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  async getWindowState() {
    return new Promise<any>((resolve) => {
      overwolf.windows.obtainDeclaredWindow(this.name, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.getWindowState(result.window.id, (state: overwolf.windows.GetWindowStateResult) => {
            resolve(state);
          });
        } else {
          resolve({ success: false });
        }
      });
    });
  }
}

// OWGameListener 类
class OWGameListener {
  constructor(private delegate: {
    onGameStarted?: (info: any) => void;
    onGameEnded?: (info: any) => void;
  }) {}

  start() {
    overwolf.games.onGameInfoUpdated.addListener((info: overwolf.games.GameInfoUpdatedEvent) => {
      if (info && info.gameInfo && info.runningChanged) {
        if (info.gameInfo.isRunning) {
          this.delegate.onGameStarted?.(info);
        } else {
          this.delegate.onGameEnded?.(info);
        }
      }
    });
  }
}

// OWHotkeys 类
class OWHotkeys {
  static async onHotkeyDown(
    hotkeyId: string,
    callback: () => void
  ): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      overwolf.settings.hotkeys.onPressed.addListener((event: overwolf.settings.hotkeys.OnPressedEvent) => {
        if (event.name === hotkeyId) {
          callback();
        }
      });
      resolve({ success: true });
    });
  }
}

// 窗口名称常量
const WINDOWS = {
  BACKGROUND: 'background',
  DESKTOP: 'desktop',
  INGAME: 'ingame',
} as const;

// Dota 2 游戏 ID
const DOTA2_GAME_ID = 7314;

// Dota 2 游戏状态
enum Dota2GameState {
  STRATEGY_TIME = 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  POST_GAME = 'DOTA_GAMERULES_STATE_POST_GAME',
}

class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Map<string, OWWindow> = new Map();
  private _gameListener: OWGameListener;

  private constructor() {
    this._gameListener = new OWGameListener({
      onGameStarted: this.onGameStarted.bind(this),
      onGameEnded: this.onGameEnded.bind(this),
    });

    this.init();
  }

  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }
    return BackgroundController._instance;
  }

  private async init() {
    console.log('[Background] Initializing...');

    try {
      // 初始化窗口实例
      this._windows.set(WINDOWS.DESKTOP, new OWWindow(WINDOWS.DESKTOP));
      this._windows.set(WINDOWS.INGAME, new OWWindow(WINDOWS.INGAME));

      console.log('[Background] Windows initialized');

      // 注册热键
      await this.registerHotkeys();

      // 监听游戏事件
      this._gameListener.start();

      console.log('[Background] Listeners started');

      // 立即打开桌面窗口（简化逻辑）
      console.log('[Background] Opening desktop window...');
      await this.openDesktopWindow();

      // 检查当前游戏状态
      const gameInfo = await this.getCurrentGameInfo();
      if (gameInfo && gameInfo.isRunning && gameInfo.id === DOTA2_GAME_ID) {
        console.log('[Background] Dota 2 is running');
        await this.onGameStarted(gameInfo);
      }

      console.log('[Background] Initialized successfully');
    } catch (error) {
      console.error('[Background] Initialization error:', error);
    }
  }

  private async registerHotkeys() {
    const toggleResult = await OWHotkeys.onHotkeyDown('toggle_windows', () => {
      console.log('[Background] Hotkey pressed: toggle_windows');
      this.toggleAllWindows();
    });

    if (toggleResult.success) {
      console.log('[Background] Hotkey registered successfully');
    } else {
      console.error('[Background] Failed to register hotkey:', toggleResult);
    }
  }

  private async toggleAllWindows() {
    for (const [name, window] of this._windows) {
      if (name === WINDOWS.BACKGROUND) continue;

      const state = await window.getWindowState();
      if (state.success && state.window_state_ex !== 'closed') {
        if (state.window_state === 'minimized' || state.window_state === 'hidden') {
          await window.restore();
        } else {
          await window.minimize();
        }
      }
    }
  }

  private async getCurrentGameInfo() {
    return new Promise<overwolf.games.RunningGameInfo | null>((resolve) => {
      overwolf.games.getRunningGameInfo((result: overwolf.games.GetRunningGameInfoResult) => {
        if (result && result.success && result.isRunning) {
          resolve(result as overwolf.games.RunningGameInfo);
        } else {
          resolve(null);
        }
      });
    });
  }

  private async onGameStarted(info: overwolf.games.GameInfoUpdatedEvent) {
    console.log('[Background] Game started:', info);

    if (info.gameInfo?.id === DOTA2_GAME_ID) {
      console.log('[Background] Dota 2 detected');
      
      // 启动游戏事件监听
      this.startGameEventsListener();
      
      // 可以选择性地打开桌面窗口或游戏内窗口
      // await this.openDesktopWindow();
    }
  }

  private async onGameEnded(info: overwolf.games.GameInfoUpdatedEvent) {
    console.log('[Background] Game ended:', info);

    if (info.gameInfo?.id === DOTA2_GAME_ID) {
      console.log('[Background] Dota 2 closed');
      
      // 关闭游戏内窗口
      const ingameWindow = this._windows.get(WINDOWS.INGAME);
      if (ingameWindow) {
        await ingameWindow.close();
      }

      // 打开桌面窗口
      await this.openDesktopWindow();
    }
  }

  private startGameEventsListener() {
    console.log('[Background] Starting game events listener');

    // 设置所需的游戏事件特性
    // 根据 PRD，需要: game_state, match_state_changed, roster, match_info, me, match_ended
    const requiredFeatures = ['game_state', 'match_state_changed', 'roster', 'match_info', 'me'];
    overwolf.games.events.setRequiredFeatures(requiredFeatures, (result: overwolf.games.events.SetRequiredFeaturesResult) => {
      console.log('[Background] Set required features result:', result);
      console.log('[Background] Supported features:', result.supportedFeatures);
      
      // 如果设置成功，立即获取一次当前数据
      if (result.success) {
        this.getCurrentGameInfo();
      }
    });

    // 监听游戏事件
    overwolf.games.events.onNewEvents.addListener((events: overwolf.games.events.NewGameEventsEvent) => {
      console.log('[Background] New game events:', events);
      
      if (events && events.events) {
        for (const event of events.events) {
          this.handleGameEvent(event);
        }
      }
    });

    // 监听游戏信息更新
    overwolf.games.events.onInfoUpdates2.addListener((info: overwolf.games.events.InfoUpdates2Event) => {
      console.log('[Background] Game info update (full):', JSON.stringify(info, null, 2));
      
      // 处理游戏状态变化
      if (info && info.info) {
        // 检查 game_state
        if (info.info.game_state) {
          const gameState = info.info.game_state.game_state || info.info.game_state;
          if (gameState) {
            this.handleGameStateChange(gameState);
          }
        }
        
        // 传递玩家信息到 ingame 窗口
        this.sendPlayerInfoToIngame(info.info);
      }
    });
  }

  // private getCurrentGameEventsInfo() {
  //   // 主动获取当前游戏信息
  //   overwolf.games.events.getInfo((info: any) => {
  //     console.log('[Background] GetInfo result:', JSON.stringify(info, null, 2));
  //     if (info && info.res) {
  //       this.sendPlayerInfoToIngame(info.res);
  //     }
  //   });
  // }

  private async sendPlayerInfoToIngame(gameInfo: any) {
    console.log('[Background] sendPlayerInfoToIngame called with:', JSON.stringify(gameInfo, null, 2));
    const players: any[] = [];
    
    // 尝试多种数据格式来获取玩家信息
    // 1. roster 对象（可能包含 players 数组或直接是对象）
    if (gameInfo.roster) {
      console.log('[Background] Found roster:', gameInfo.roster);
      
      // 如果 roster 有 players 数组
      if (Array.isArray(gameInfo.roster.players)) {
        gameInfo.roster.players.forEach((player: any, index: number) => {
          players.push({
            playerId: player.playerId || player.account_id || `player_${index}`,
            playerName: player.player_name || player.name || player.playerName || '未知',
            steamId: player.steamid || player.steam_id || player.steamId,
            heroName: player.hero || player.heroName,
            heroId: player.hero_id,
            team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined)
          });
        });
      } 
      // 如果 roster 是对象，遍历其属性
      else if (typeof gameInfo.roster === 'object') {
        Object.entries(gameInfo.roster).forEach(([key, value]: [string, any]) => {
          // 跳过非玩家对象（如 players 数组本身）
          if (key === 'players' || Array.isArray(value)) return;
          
          players.push({
            playerId: value.playerId || value.account_id || key,
            playerName: value.player_name || value.name || value.playerName || '未知',
            steamId: value.steamid || value.steam_id || value.steamId,
            heroName: value.hero || value.heroName,
            heroId: value.hero_id,
            team: value.team || (value.team_name === 'radiant' ? 'radiant' : value.team_name === 'dire' ? 'dire' : undefined)
          });
        });
      }
    }
    
    // 2. 直接访问 players 数组
    if (gameInfo.players && Array.isArray(gameInfo.players)) {
      console.log('[Background] Found players array:', gameInfo.players);
      gameInfo.players.forEach((player: any, index: number) => {
        players.push({
          playerId: player.playerId || player.account_id || `player_${index}`,
          playerName: player.player_name || player.name || player.playerName || '未知',
          steamId: player.steamid || player.steam_id || player.steamId,
          heroName: player.hero || player.heroName,
          heroId: player.hero_id,
          team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined)
        });
      });
    }
    
    // 3. 从 match_info 中获取玩家信息
    if (gameInfo.match_info && gameInfo.match_info.players) {
      console.log('[Background] Found players in match_info');
      if (Array.isArray(gameInfo.match_info.players)) {
        gameInfo.match_info.players.forEach((player: any, index: number) => {
          players.push({
            playerId: player.playerId || player.account_id || `player_${index}`,
            playerName: player.player_name || player.name || player.playerName || '未知',
            steamId: player.steamid || player.steam_id || player.steamId,
            heroName: player.hero || player.heroName,
            heroId: player.hero_id,
            team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined)
          });
        });
      }
    }
    
    console.log('[Background] Extracted players:', players);
    
    if (players.length > 0) {
      console.log('[Background] Sending player info to ingame window:', players.length, 'players');
      this.sendMessageToWindow(WINDOWS.INGAME, { 
        type: 'PLAYER_INFO', 
        players 
      });
    } else {
      console.warn('[Background] No players found in game info');
    }
  }

  private async handleGameEvent(event: any) {
    console.log('[Background] Handling game event:', event);
    
    if (event.name === 'game_state_changed') {
      const gameState = event.data;
      await this.handleGameStateChange(gameState);
    }
  }

  private async handleGameStateChange(gameState: string) {
    console.log('[Background] Game state changed:', gameState);

    switch (gameState) {
      case Dota2GameState.STRATEGY_TIME:
        console.log('[Background] Strategy time - opening ingame window');
        await this.openIngameWindow('strategy');
        break;

      case Dota2GameState.POST_GAME:
        console.log('[Background] Post game - opening ingame window');
        await this.openIngameWindow('postgame');
        break;

      default:
        console.log('[Background] Unknown game state:', gameState);
    }
  }

  private async openDesktopWindow() {
    console.log('[Background] openDesktopWindow called');
    const desktopWindow = this._windows.get(WINDOWS.DESKTOP);
    
    if (!desktopWindow) {
      console.error('[Background] Desktop window not found in map');
      return;
    }

    try {
      console.log('[Background] Restoring desktop window...');
      await desktopWindow.restore();
      console.log('[Background] Desktop window restored successfully');
    } catch (error) {
      console.error('[Background] Failed to open desktop window:', error);
    }
  }

  private async openIngameWindow(mode: 'strategy' | 'postgame') {
    const ingameWindow = this._windows.get(WINDOWS.INGAME);
    if (ingameWindow) {
      // 通过 window.name 传递模式信息
      // 在游戏内窗口中可以通过 URL 参数或其他方式接收
      const state = await ingameWindow.getWindowState();
      if (state.success && state.window_state_ex === 'closed') {
        await ingameWindow.restore();
      } else {
        await ingameWindow.bringToFront();
      }
      
      // 可以通过消息传递模式
      this.sendMessageToWindow(WINDOWS.INGAME, { type: 'DISPLAY_MODE', mode });
    }
  }

  private async sendMessageToWindow(windowName: string, message: any) {
    // 使用 Overwolf 的消息传递机制
    const window = this._windows.get(windowName);
    if (window) {
      // 可以使用 localStorage 或 overwolf.windows.sendMessage
      try {
        const windowId = await this.getWindowId(windowName);
        if (windowId) {
          overwolf.windows.sendMessage(windowId, windowName, message, () => {
            console.log('[Background] Message sent to', windowName, message);
          });
        }
      } catch (error) {
        console.error('[Background] Failed to send message:', error);
      }
    }
  }

  private async getWindowId(windowName: string): Promise<string | null> {
    return new Promise((resolve) => {
      overwolf.windows.obtainDeclaredWindow(windowName, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          resolve(result.window.id);
        } else {
          resolve(null);
        }
      });
    });
  }

  public async run() {
    console.log('[Background] Running...');
  }
}

// 启动 Background Controller
BackgroundController.instance().run();

