/**
 * Background Controller
 * 管理应用生命周期、窗口、游戏事件等
 */

/// <reference path="../types/overwolf.d.ts" />

import { dataCache } from './data-cache';
import { accountsRepository } from '../db/repositories/accounts.repository';
import { matchesRepository } from '../db/repositories/matches.repository';
import { playersRepository } from '../db/repositories/players.repository';
import { db } from '../db/database';
import { getAccountId, getAccountName, getPlayerId, getPlayerName, getMatchId, getHeroName, getHeroId, formatKDA } from '../utils/data-extraction';
import { validateMatchData, validateAccountData, checkMatchIdExists } from '../utils/data-validation';
interface ScoreboardStats {
  kills: number;
  deaths: number;
  assists: number;
  gpm?: number;
  xpm?: number;
}
import type { Dota2InfoUpdates } from '../types/dota2-gep';
import { Dota2MatchState } from '../types/dota2-gep';

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
      // console.log('QQQ1onGameInfoUpdated', JSON.stringify(info))
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

class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Map<string, OWWindow> = new Map();
  private _gameListener: OWGameListener;
  private _windowsVisible = true;
  private _eventsListening = false;
  private _cachedPlayers: any[] | null = null;

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
      if (gameInfo && this.isDota2Game(gameInfo)) {
        console.log('[Background] Dota 2 is running (startup detection)');
        await this.startGameEventsListener();
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
    this._windowsVisible = !this._windowsVisible;

    for (const [name, window] of this._windows) {
      if (name === WINDOWS.BACKGROUND) continue;

      if (this._windowsVisible) {
        await window.restore();
      } else {
        await window.minimize();
      }
    }
  }

  private async getCurrentGameInfo() {
    return new Promise<overwolf.games.RunningGameInfo | null>((resolve) => {
      overwolf.games.getRunningGameInfo((result: overwolf.games.GetRunningGameInfoResult) => {
        // console.log('QQQ2getRunningGameInfo', JSON.stringify(result))
        if (result && result.success && result.isRunning) {
          resolve(result as overwolf.games.RunningGameInfo);
        } else {
          resolve(null);
        }
      });
    });
  }

  private isDota2Game(info: { classId?: number; id?: number } | null | undefined): boolean {
    if (!info) {
      return false;
    }

    const classId = (info as any).classId ?? (info as any).id;
    return classId === DOTA2_GAME_ID;
  }

  private async onGameStarted(info: overwolf.games.GameInfoUpdatedEvent) {
    console.log('[Background] Game started:', info);

    if (this.isDota2Game(info.gameInfo)) {
      console.log('[Background] Dota 2 detected');
      
      // 启动游戏事件监听
      await this.startGameEventsListener();
      
      // 可以选择性地打开桌面窗口或游戏内窗口
      // await this.openDesktopWindow();
    }
  }

  private async onGameEnded(info: overwolf.games.GameInfoUpdatedEvent) {
    console.log('[Background] Game ended:', info);

    if (this.isDota2Game(info.gameInfo)) {
      console.log('[Background] Dota 2 closed');
      
      // 关闭游戏内窗口
      const ingameWindow = this._windows.get(WINDOWS.INGAME);
      if (ingameWindow) {
        await ingameWindow.close();
      }

      // 打开桌面窗口
      await this.openDesktopWindow();

      this._eventsListening = false;
    }
  }

  private async startGameEventsListener() {
    if (this._eventsListening) {
      console.log('[Background] Game events listener already running');
      return;
    }

    console.log('[Background] Starting game events listener');
    this._eventsListening = true;

    // 设置所需的游戏事件特性
    // 根据 Overwolf documentation, these are the key features we need for Dota 2
    const requiredFeatures = [
      'game_state',
      'game_state_changed',
      'match_state_changed',
      'match_ended',
      'match_info',
      'roster',
      'me',
    ];

    overwolf.games.events.setRequiredFeatures(requiredFeatures, (result: overwolf.games.events.SetRequiredFeaturesResult) => {
      console.log('QQQ3setRequiredFeatures', JSON.stringify(result))
      console.log('[Background] Set required features result:', result);
      console.log('[Background] Supported features:', result.supportedFeatures);

      // 如果设置成功，立即获取一次当前数据
      if (result.success) {
        // 获取当前游戏信息
        overwolf.games.events.getInfo((info: any) => {
          console.log('[Background] GetInfo result:', JSON.stringify(info, null, 2));
          if (info && info.res) {
            this.sendPlayerInfoToIngame(info.res);
          }
        });
      } else {
        console.error('[Background] Failed to set required features:', JSON.stringify(result));
        this._eventsListening = false;
      }
    });

    // 监听游戏事件
    overwolf.games.events.onNewEvents.addListener((events: overwolf.games.events.NewGameEventsEvent) => {
      console.log('[Background] New game events:', events);
console.log('QQQ4onNewEvents', JSON.stringify(events))
      if (events && events.events) {
        for (const event of events.events) {
          this.handleGameEvent(event);
        }
      }
    });

    // 监听游戏信息更新
    overwolf.games.events.onInfoUpdates2.addListener((info: overwolf.games.events.InfoUpdates2Event) => {
      console.log('QQQ5onInfoUpdates2', JSON.stringify(info))
      console.log('[Background] Game info update (full):', JSON.stringify(info, null, 2));

      // 处理游戏状态变化
      if (info && info.info) {
        // 更新缓存
        dataCache.updateCache(info.info as Dota2InfoUpdates);

        const rawMatchState = (info.info as any)?.match_state;
        const matchState = typeof rawMatchState === 'string' ? rawMatchState : rawMatchState?.match_state;
        const gameStateValue = info.info.game_state?.game_state || info.info.game_state;
        const rosterCount = Array.isArray((info.info as any)?.roster?.players)
          ? (info.info as any).roster.players.length
          : 0;

        this.pushLogEvent('infoUpdates2', {
          gameState: gameStateValue,
          matchState,
          rosterCount,
          hasMe: Boolean((info.info as any)?.me),
        });

        // 检查 game_state
        if (info.info.game_state) {
          if (gameStateValue) {
            this.handleGameStateChange(gameStateValue);
          }
        }

        // 检查 match_state（策略/赛后阶段）
        if (matchState) {
          this.handleGameStateChange(matchState);
        }

        // 处理账户信息更新
        this.handleAccountUpdate(info.info as Dota2InfoUpdates);

        // 传递玩家信息到 ingame 窗口
        this.sendPlayerInfoToIngame(info.info);
      }
    });


    // overwolf.packages.gep.on('new-game-event', (...args) => {
    //   console.log('QQQ6new-game-event', JSON.stringify(args))
    //   // your code here
    // });
    // overwolf.packages.gep.on('new-info-update', (...args) => {
      
    //   console.log('QQQ7new-info-update', JSON.stringify(args))
    //   // your code here
    // });
    // setInterval(async () => {
    //   overwolf.games.events.getInfo((info) => {

    //     console.log('QQQ8getInfo', JSON.stringify(info))
    //   });
    // }, 10000)
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

    // Parse player information from different possible data sources
    // According to Dota 2 GEP documentation, roster is the main source

    // 1. Try to get players from roster.players (most reliable)
    if (gameInfo.roster && gameInfo.roster.players) {
      const rosterPlayers = this.normalizePlayers(gameInfo.roster.players);
      console.log('[Background] Found roster.players:', rosterPlayers);
      if (Array.isArray(rosterPlayers)) {
        rosterPlayers.forEach((player: any, index: number) => {
          // Handle different data structures from GEP
          const playerData = {
            playerId: player.playerId || player.account_id || player.steamId || `player_${index}`,
            playerName: player.player_name || player.name || player.playerName || '未知',
            steamId: player.steamid || player.steam_id || player.steamId || player.steamId,
            heroName: player.hero || player.heroName,
            heroId: player.hero_id,
            team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined),
            role: player.role,
            rank: player.rank,
            index: player.index || index,
            teamSlot: player.team_slot
          };

          // Only add if we have meaningful data
          if (playerData.playerId && playerData.playerId !== 'player_0') {
            players.push(playerData);
          }
        });
      }
    }

    // 2. Try to get players from match_info.players if roster is not available
    if (players.length === 0 && gameInfo.match_info && gameInfo.match_info.players) {
      const matchPlayers = this.normalizePlayers(gameInfo.match_info.players);
      console.log('[Background] Found match_info.players:', matchPlayers);
      if (Array.isArray(matchPlayers)) {
        matchPlayers.forEach((player: any, index: number) => {
          const playerData = {
            playerId: player.playerId || player.account_id || player.steamId || `player_${index}`,
            playerName: player.player_name || player.name || player.playerName || '未知',
            steamId: player.steamid || player.steam_id || player.steamId || player.steamId,
            heroName: player.hero || player.heroName,
            heroId: player.hero_id,
            team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined),
            role: player.role,
            rank: player.rank,
            index: player.index || index,
            teamSlot: player.team_slot
          };

          if (playerData.playerId && playerData.playerId !== 'player_0') {
            players.push(playerData);
          }
        });
      }
    }

    // 3. Try to parse players from raw roster data (if it's a string)
    if (players.length === 0 && gameInfo.roster && typeof gameInfo.roster === 'string') {
      try {
        const rosterData = JSON.parse(gameInfo.roster);
        if (Array.isArray(rosterData.players)) {
          console.log('[Background] Found parsed roster.players:', rosterData.players);
          rosterData.players.forEach((player: any, index: number) => {
            const playerData = {
              playerId: player.playerId || player.account_id || player.steamId || `player_${index}`,
              playerName: player.player_name || player.name || player.playerName || '未知',
              steamId: player.steamid || player.steam_id || player.steamId || player.steamId,
              heroName: player.hero || player.heroName,
              heroId: player.hero_id,
              team: player.team || (player.team_name === 'radiant' ? 'radiant' : player.team_name === 'dire' ? 'dire' : undefined),
              role: player.role,
              rank: player.rank,
              index: player.index || index,
              teamSlot: player.team_slot
            };

            if (playerData.playerId && playerData.playerId !== 'player_0') {
              players.push(playerData);
            }
          });
        }
      } catch (e) {
        console.error('[Background] Failed to parse roster string:', e);
      }
    }

    console.log('[Background] Extracted players:', players);

    if (players.length > 0) {
      this._cachedPlayers = players;
      await this.openIngameWindow('strategy');
      this.sendMessageToWindow(WINDOWS.INGAME, {
        type: 'PLAYER_INFO',
        players,
      });
      this.pushLogEvent('sendPlayerInfo', { count: players.length });
    } else {
      this._cachedPlayers = null;
      this.pushLogEvent('sendPlayerInfoSkipped', { reason: 'empty_players' });
    }
  }

  private normalizePlayers(rawPlayers: any): any[] | null {
    if (Array.isArray(rawPlayers)) {
      return rawPlayers;
    }

    if (typeof rawPlayers === 'string') {
      try {
        const parsed = JSON.parse(rawPlayers);
        if (Array.isArray(parsed)) {
          return parsed;
        }

        if (parsed && Array.isArray(parsed.players)) {
          return parsed.players;
        }
      } catch (error) {
        console.error('[Background] Failed to parse players string:', error);
      }
    }

    if (rawPlayers && typeof rawPlayers === 'object' && Array.isArray(rawPlayers.players)) {
      return rawPlayers.players;
    }

    return null;
  }

  private extractScoreboardPlayers(rawScoreboard: any): any[] {
    if (!rawScoreboard) {
      return [];
    }

    let data = rawScoreboard;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.error('[Background] Failed to parse scoreboard string:', error);
        return [];
      }
    }

    if (Array.isArray(data)) {
      return data;
    }

    let players: any[] = [];
    if (Array.isArray(data.players)) {
      players = players.concat(data.players);
    }
    if (Array.isArray(data.radiant)) {
      players = players.concat(data.radiant);
    }
    if (Array.isArray(data.dire)) {
      players = players.concat(data.dire);
    }

    return players;
  }

  private buildScoreboardStats(info: Dota2InfoUpdates): Map<string, ScoreboardStats> {
    const map = new Map<string, ScoreboardStats>();
    const rawScoreboard = (info.match_info as any)?.scoreboard ?? (info as any)?.scoreboard;
    const players = this.extractScoreboardPlayers(rawScoreboard);

    players.forEach((player: any) => {
      const stats: ScoreboardStats = {
        kills: this.pickNumber(player.kills, player.stats?.kills) ?? 0,
        deaths: this.pickNumber(player.deaths, player.stats?.deaths) ?? 0,
        assists: this.pickNumber(player.assists, player.stats?.assists) ?? 0,
      };

      const gpm = this.pickNumber(
        player.gpm,
        player.gold_per_min,
        player.gold_per_minute,
        player.goldPerMinute,
        player.goldPerMin,
        player.gold_for_min,
        player.goldForMinute
      );
      const xpm = this.pickNumber(
        player.xpm,
        player.xp_per_min,
        player.xp_per_minute,
        player.xpPerMinute,
        player.experience_per_min,
        player.experience_per_minute,
        player.expPerMinute
      );

      if (gpm !== undefined) {
        stats.gpm = gpm;
      }
      if (xpm !== undefined) {
        stats.xpm = xpm;
      }

      const identifiers = this.normalizeIdentifiers([
        player.playerId,
        player.player_id,
        player.account_id,
        player.accountId,
        player.id,
        player.steamId,
        player.steam_id,
        player.steamid,
      ]);

      identifiers.forEach((id) => {
        map.set(id, stats);
      });
    });

    return map;
  }

  private resolvePlayerStats(statsMap: Map<string, ScoreboardStats>, player: any): ScoreboardStats | undefined {
    const identifiers = this.normalizeIdentifiers([
      player.playerId,
      player.account_id,
      player.player_id,
      player.accountId,
      player.id,
      player.steamId,
      player.steam_id,
      player.steamid,
    ]);

    for (const id of identifiers) {
      const stats = statsMap.get(id);
      if (stats) {
        return stats;
      }
    }
    return undefined;
  }

  private normalizeIdentifiers(candidates: Array<string | number | undefined | null>): string[] {
    const result = new Set<string>();
    candidates.forEach((candidate) => {
      if (candidate === undefined || candidate === null) {
        return;
      }
      const asString = String(candidate);
      if (asString && asString !== 'undefined' && asString !== 'null') {
        result.add(asString);
      }
      const numeric = Number(candidate);
      if (!Number.isNaN(numeric) && numeric !== 0) {
        result.add(String(numeric));
        const steam32 = this.convertSteam64To32(numeric);
        if (steam32 !== null) {
          result.add(String(steam32));
        }
      }
    });
    return Array.from(result);
  }

  private convertSteam64To32(value: number): number | null {
    const STEAM_64_OFFSET = 76561197960265728;
    if (value > STEAM_64_OFFSET) {
      return value - STEAM_64_OFFSET;
    }
    return null;
  }

  private pickNumber(...values: any[]): number | undefined {
    for (const value of values) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const num = Number(value);
      if (!Number.isNaN(num)) {
        return num;
      }
    }
    return undefined;
  }

  private async handleGameEvent(event: any) {
    console.log('[Background] Handling game event:', event);
    this.pushLogEvent('onNewEvents', event);

    switch (event.name) {
      case 'game_state_changed':
        const gameState = event.data;
        if (typeof gameState === 'string') {
          await this.handleGameStateChange(gameState);
        } else if (gameState && gameState.game_state) {
          await this.handleGameStateChange(gameState.game_state);
        }
        break;

      case 'match_state_changed':
        if (event.data && event.data.match_state) {
          const matchState = event.data.match_state;
          console.log('[Background] Match state changed to:', matchState);
          await this.handleGameStateChange(matchState);
        }
        break;

      case 'match_ended':
        if (event.data && event.data.winner) {
          console.log('[Background] Match ended. Winner:', event.data.winner);
          await this.handleMatchEnded(event.data);
        }
        break;

      case 'game_over':
        console.log('[Background] Game over event received');
        // game_over 事件可能没有 winner 字段，使用空对象
        await this.handleMatchEnded(event.data || {});
        break;

      case 'kill':
        if (event.data && event.data.kills) {
          console.log('[Background] Kill event - Kills:', event.data.kills, 'Kill streak:', event.data.kill_streak);
        }
        break;

      case 'assist':
        if (event.data && event.data.assists) {
          console.log('[Background] Assist event - Assists:', event.data.assists);
        }
        break;

      case 'death':
        if (event.data && event.data.deaths) {
          console.log('[Background] Death event - Deaths:', event.data.deaths);
        }
        break;

      case 'cs':
        if (event.data && event.data.last_hits) {
          console.log('[Background] CS event - Last hits:', event.data.last_hits, 'Denies:', event.data.denies);
        }
        break;

      case 'xpm':
        if (event.data && event.data.xpm) {
          console.log('[Background] XPM event - XPM:', event.data.xpm);
        }
        break;

      case 'gpm':
        if (event.data && event.data.gpm) {
          console.log('[Background] GPM event - GPM:', event.data.gpm);
        }
        break;

      case 'gold':
        if (event.data && event.data.gold) {
          console.log('[Background] Gold event - Gold:', event.data.gold);
        }
        break;

      default:
        console.log('[Background] Unhandled game event:', event.name);
    }
  }

  private async handleGameStateChange(gameState: string) {
    if (!gameState) {
      return;
    }

    console.log('[Background] Game state changed:', gameState);

    const normalized = gameState.toString().toUpperCase();

    const isStrategyPhase =
      normalized.includes('STRATEGY') ||
      normalized.includes('HERO_SELECTION') ||
      normalized.includes('HERO_PICK') ||
      normalized.includes('PRE_GAME') ||
      normalized === 'PREGAME';

    const isPostGamePhase =
      normalized.includes('POST') ||
      normalized.includes('END') ||
      normalized.includes('RESULT');

    if (isStrategyPhase) {
      console.log('[Background] Strategy phase detected - opening ingame window');
      await this.openIngameWindow('strategy');
      return;
    }

    if (isPostGamePhase) {
      console.log('[Background] Post game phase detected - opening ingame window');
      await this.openIngameWindow('postgame');
      return;
    }

    if (normalized === Dota2MatchState.STRATEGY_TIME || normalized === Dota2MatchState.POST_GAME) {
      // Already handled by checks above, but keep fallback for exact matches
      const mode = normalized === Dota2MatchState.STRATEGY_TIME ? 'strategy' : 'postgame';
      await this.openIngameWindow(mode);
      return;
    }

    console.log('[Background] Game state ignored:', gameState);
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
      this._windowsVisible = true;
      await desktopWindow.restore();
      console.log('[Background] Desktop window restored successfully');
    } catch (error) {
      console.error('[Background] Failed to open desktop window:', error);
    }
  }

  private async openIngameWindow(mode: 'strategy' | 'postgame') {
    const ingameWindow = this._windows.get(WINDOWS.INGAME);
    if (ingameWindow) {
      this._windowsVisible = true;
      // 通过 window.name 传递模式信息
      // 在游戏内窗口中可以通过 URL 参数或其他方式接收
      const state = await ingameWindow.getWindowState();
      if (state.success && state.window_state_ex === 'closed') {
        await ingameWindow.restore();
      } else {
        await ingameWindow.bringToFront();
      }

      await this.delay(200);

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

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private pushLogEvent(category: string, data: any) {
    try {
      const safeData = JSON.parse(JSON.stringify(data));
      this.sendMessageToWindow(WINDOWS.DESKTOP, {
        type: 'LOG_EVENT',
        category,
        timestamp: Date.now(),
        data: safeData,
      });
    } catch (error) {
      this.sendMessageToWindow(WINDOWS.DESKTOP, {
        type: 'LOG_EVENT',
        category,
        timestamp: Date.now(),
        data: { message: '无法序列化日志数据', error: String(error) },
      });
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

  /**
   * 处理账户信息更新
   * 在 onInfoUpdates2 监听器中调用
   */
  private async handleAccountUpdate(info: Dota2InfoUpdates): Promise<void> {
    if (!info.me || !info.me.steam_id) {
      return;
    }
    try {
      const accountId = getAccountId(info.me);
      const accountName = getAccountName(info.me);

      if (!accountId) {
        console.warn('[Background] No account_id found, skipping account update');
        return;
      }

      // 验证数据
      const validation = validateAccountData({
        account_id: accountId,
        name: accountName,
      });

      if (!validation.valid) {
        console.error('[Background] Account data validation failed:', validation.errors);
        return;
      }

      // 更新或创建账户记录
      const now = Math.floor(Date.now() / 1000);
      await accountsRepository.upsert({
        account_id: accountId,
        name: accountName,
        created_at: now,
        updated_at: now,
      });

      console.log('[Background] Account updated:', accountId, accountName);
    } catch (error) {
      console.error('[Background] Error updating account:', error);
    }
  }

  /**
   * 处理比赛结束事件
   */
  private async handleMatchEnded(eventData: any): Promise<void> {
    try {
      console.log('[Background] Handling match_ended event');

      // 1. 立即切换到 postgame 模式
      await this.openIngameWindow('postgame');
      console.log('[Background] Switched ingame window to postgame mode');

      // 2. 立即调用 getInfo() 获取最新快照
      console.log('[Background] Calling getInfo() to fetch latest game data...');
      const latestInfo = await this.getInfoSnapshot();
      
      if (latestInfo) {
        console.log('[Background] getInfo() returned data:', {
          hasMatchInfo: !!latestInfo.match_info,
          hasRoster: !!latestInfo.roster,
          hasMe: !!latestInfo.me,
          rosterPlayersCount: latestInfo.roster?.players ? (Array.isArray(latestInfo.roster.players) ? latestInfo.roster.players.length : 0) : 0,
        });
      } else {
        console.warn('[Background] getInfo() returned null, using cached data');
      }
      
      // 3. 如果数据不完整，等待 onInfoUpdates2 更新（最多 5 秒）
      let useData: Dota2InfoUpdates | null = latestInfo;
      
      if (!latestInfo || !this.isDataComplete(latestInfo)) {
        console.log('[Background] Data incomplete, waiting for onInfoUpdates2 update...');
        const cachedInfo = await this.waitForInfoUpdate(5000);
        if (cachedInfo) {
          useData = cachedInfo;
          console.log('[Background] Using cached info after wait');
        } else {
          useData = latestInfo; // 使用不完整数据，记录警告
          console.warn('[Background] Using incomplete data after timeout');
        }
      }

      // 4. 如果没有数据，尝试使用缓存（即使不完整）
      if (!useData) {
        const cached = dataCache.getCachedInfo();
        if (cached) {
          useData = cached;
          console.warn('[Background] Using cached data as fallback');
        } else {
          console.error('[Background] No data available for match_ended, cannot write to database');
          return;
        }
      }

      // 5. 验证数据完整性（仅记录警告，不阻止写入）
      const validation = validateMatchData(useData);
      if (!validation.valid) {
        console.warn('[Background] Match data validation failed, but will attempt to write anyway:', validation.errors);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach((warning) => console.warn('[Background] Match data warning:', warning));
      }

      // 6. 获取或生成 match_id
      let matchId: string | number | null = null;
      if (useData.match_info) {
        matchId = getMatchId(useData.match_info);
      }
      if (!matchId) {
        // 如果没有 match_id，生成一个基于时间的占位符
        matchId = `temp_${Date.now()}`;
        console.warn('[Background] No match_id found, using temporary ID:', matchId);
      }

      // 7. 检查 match_id 是否已存在（避免重复记录）
      const exists = await checkMatchIdExists(matchId, matchesRepository);
      if (exists) {
        console.log('[Background] Match already exists, skipping:', matchId);
        // 即使已存在，也发送消息给 ingame 窗口
        this.sendMatchInfoToIngame(useData, eventData);
        return;
      }

      // 8. 使用事务创建记录（即使数据不完整也写入）
      console.log('[Background] Writing match and player records to database...');
      await this.createMatchRecords(useData, eventData);
      console.log('[Background] Match and player records written successfully');

      // 9. 发送 MATCH_INFO 消息给 ingame 窗口
      this.sendMatchInfoToIngame(useData, eventData);

      console.log('[Background] Match ended handling completed');
    } catch (error) {
      console.error('[Background] Error handling match_ended:', error);
      // 即使出错，也尝试切换到 postgame 模式
      try {
        await this.openIngameWindow('postgame');
      } catch (e) {
        console.error('[Background] Failed to open ingame window:', e);
      }
    }
  }

  /**
   * 获取当前游戏信息快照
   */
  private async getInfoSnapshot(): Promise<Dota2InfoUpdates | null> {
    return new Promise((resolve) => {
      overwolf.games.events.getInfo((result: any) => {
        if (result && result.res) {
          console.log('[Background] getInfo() succeeded, received data');
          resolve(result.res as Dota2InfoUpdates);
        } else {
          console.warn('[Background] getInfo() failed or returned no data:', result);
          // 如果 getInfo 失败，尝试使用缓存
          const cached = dataCache.getCachedInfo();
          if (cached) {
            console.log('[Background] Using cached data as fallback');
          } else {
            console.warn('[Background] No cached data available');
          }
          resolve(cached);
        }
      });
    });
  }

  /**
   * 等待 onInfoUpdates2 更新（最多等待指定毫秒数）
   */
  private async waitForInfoUpdate(timeoutMs: number): Promise<Dota2InfoUpdates | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkCache = () => {
        const cached = dataCache.getCachedInfo();
        if (cached && this.isDataComplete(cached)) {
          resolve(cached);
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          resolve(null);
          return;
        }

        // 继续等待
        setTimeout(checkCache, 100);
      };

      checkCache();
    });
  }

  /**
   * 检查数据是否完整
   */
  private isDataComplete(info: Dota2InfoUpdates): boolean {
    if (!info.match_info || !info.roster || !info.roster.players) {
      return false;
    }

    if (!Array.isArray(info.roster.players) || info.roster.players.length !== 10) {
      return false;
    }

    const matchId = getMatchId(info.match_info);
    if (!matchId) {
      return false;
    }

    return true;
  }

  /**
   * 创建比赛和玩家记录（使用事务）
   */
  private async createMatchRecords(info: Dota2InfoUpdates, eventData: any): Promise<void> {
    let matchId: string | number | null = null;
    if (info.match_info) {
      matchId = getMatchId(info.match_info);
    }
    const accountId = info.me ? getAccountId(info.me) : null;
    const now = Math.floor(Date.now() / 1000);

    // 如果没有 match_id，生成一个基于时间的占位符（允许数据不完整时写入）
    if (!matchId) {
      matchId = `temp_${Date.now()}`;
      console.warn('[Background] No match_id found in createMatchRecords, using temporary ID:', matchId);
    }

    const matchOwnerId = accountId ?? 'spectator';

    // 计算 start_time（从 end_time - duration 推算）
    const endTime = now;
    const duration = info.match_info?.duration || 0;
    const startTime = endTime - duration;

    // 准备比赛记录数据
    const matchData: any = {
      match_id: matchId,
      player_id: matchOwnerId,
      game_mode: this.getGameMode(info),
      match_mode: info.match_info?.game_mode || info.match_info?.mode || 'unknown',
      start_time: startTime,
      end_time: endTime,
      winner: eventData?.winner || 'unknown',
    };

    // 处理玩家数据
    let players = info.roster?.players ? [...info.roster!.players!] : [];
    if ((!players || players.length === 0) && this._cachedPlayers) {
      players = this._cachedPlayers;
    }
    const playerRecords: any[] = [];
    const scoreboardStats = this.buildScoreboardStats(info);

    if (!players || players.length === 0) {
      console.warn('[Background] No roster players available, skipping player write');
      players = [];
    }

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerIndex = i + 1;
      
      const playerId = getPlayerId(player);
      const playerName = getPlayerName(player);
      const heroName = getHeroName(player);
      const heroId = getHeroId(player);
      const stats = this.resolvePlayerStats(scoreboardStats, player);
      const kills = stats?.kills ?? this.pickNumber(player.kills) ?? 0;
      const deaths = stats?.deaths ?? this.pickNumber(player.deaths) ?? 0;
      const assists = stats?.assists ?? this.pickNumber(player.assists) ?? 0;
      const gpm = stats?.gpm;
      const xpm = stats?.xpm;

      // 添加到比赛记录
      (matchData as any)[`player_${playerIndex}_id`] = playerId;
      (matchData as any)[`player_${playerIndex}_kda`] = formatKDA(kills, deaths, assists);
      if (gpm !== undefined) {
        (matchData as any)[`player_${playerIndex}_gpm`] = gpm;
      }
      if (xpm !== undefined) {
        (matchData as any)[`player_${playerIndex}_xpm`] = xpm;
      }
      (matchData as any)[`player_${playerIndex}_hero_id`] = heroId;
      (matchData as any)[`player_${playerIndex}_hero_name`] = heroName;

      // 准备玩家记录
      playerRecords.push({
        player_id: playerId,
        current_name: playerName,
        previous_names: [],
        first_seen: now,
        last_seen: now,
      });
    }

    // 使用事务创建记录
    await db.transaction('rw', [db.matches, db.players, db.accounts], async () => {
      // 创建比赛记录
      await matchesRepository.create(matchData);

      // 更新或创建玩家记录
      for (const playerRecord of playerRecords) {
        await playersRepository.upsert(playerRecord);
      }

      // 更新账户记录（如果账户信息发生变化）
      if (info.me && info.me.steam_id) {
        await this.handleAccountUpdate(info);
      }
    });

    console.log('[Background] Match and player records created successfully');
    this._cachedPlayers = null;
  }

  /**
   * 获取游戏模式
   */
  private getGameMode(info: Dota2InfoUpdates): string {
    if (info.game_state) {
      const gameState = typeof info.game_state === 'string' 
        ? info.game_state 
        : (info.game_state as any).game_state;
      return gameState || 'idle';
    }
    return 'idle';
  }

  /**
   * 发送 MATCH_INFO 消息给 ingame 窗口
   */
  private sendMatchInfoToIngame(info: Dota2InfoUpdates, eventData: any): void {
    let matchId: string | number | null = null;
    if (info.match_info) {
      matchId = getMatchId(info.match_info);
    }
    
    // 如果没有 match_id，使用占位符（允许数据不完整时发送消息）
    if (!matchId) {
      matchId = `temp_${Date.now()}`;
    }

    const matchInfo = {
      type: 'MATCH_INFO',
      match_id: matchId,
      match_mode: info.match_info?.game_mode || info.match_info?.mode || 'unknown',
      winner: eventData?.winner || 'unknown',
      start_time: info.match_info?.start_time,
      end_time: info.match_info?.end_time,
    };

    this.sendMessageToWindow(WINDOWS.INGAME, matchInfo);
  }

  public async run() {
    console.log('[Background] Running...');
  }
}

// 启动 Background Controller
BackgroundController.instance().run();


