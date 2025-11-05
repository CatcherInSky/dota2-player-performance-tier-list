/**
 * 应用控制器
 * 参考 Overwolf 官方示例架构
 * 负责协调 GEP 事件、窗口管理、数据库操作
 */

import { GEPService } from '../overwolf/gep';
import { WindowManager } from '../overwolf/windows';
import { dbService } from '../database/service';
import { syncPlayers } from '../database/players';
import { recordMatch } from '../database/matches';
import type { GEPInfoUpdate, GEPEvent } from '@shared/types/gep';

export class AppController {
  private gep: GEPService;
  private windowManager: WindowManager;
  private currentMatchId: string = '';
  private localSteamId: string = '';
  private rosterPlayers: any[] = [];

  constructor() {
    this.gep = new GEPService();
    this.windowManager = new WindowManager();
    this.initializeEventHandlers();
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    console.log('[AppController] Initializing...');
    
    try {
      // 启动 GEP 监听
      await this.gep.start();
      console.log('[AppController] GEP started');
      
      // 检查游戏是否正在运行
      await this.checkGameRunning();
      
      console.log('[AppController] Initialization complete');
    } catch (error) {
      console.error('[AppController] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 初始化事件处理器
   */
  private initializeEventHandlers(): void {
    // GEP Info 更新
    this.gep.onInfoUpdate((info: GEPInfoUpdate) => {
      this.handleInfoUpdate(info);
    });

    // GEP 事件
    this.gep.onEvent((event: GEPEvent) => {
      this.handleEvent(event);
    });
  }

  /**
   * 检查游戏是否运行
   */
  private async checkGameRunning(): Promise<void> {
    const DOTA2_GAME_ID = 7314;
    
    // TODO: 实现 Overwolf API 调用
    // const gameInfo = await overwolf.games.getRunningGameInfo();
    // if (gameInfo && gameInfo.id === DOTA2_GAME_ID) {
    //   this.onGameLaunched(gameInfo);
    // } else {
    //   this.onGameClosed();
    // }
    
    // 开发环境模拟
    if (import.meta.env.DEV) {
      console.log('[AppController] DEV mode: Game not running, showing desktop');
      this.windowManager.showDesktop();
    }
  }

  /**
   * 处理 Info 更新
   */
  private handleInfoUpdate(info: GEPInfoUpdate): void {
    console.log('[AppController] Info update:', info);

    // 处理 roster 数据
    if (info.feature === 'roster' && info.info?.roster?.players) {
      this.rosterPlayers = info.info.roster.players;
      console.log('[AppController] Roster updated:', this.rosterPlayers.length, 'players');
    }

    // 处理本地玩家信息
    if (info.feature === 'me' && info.info?.me?.steam_id) {
      this.localSteamId = info.info.me.steam_id;
      console.log('[AppController] Local player:', this.localSteamId);
    }

    // 处理比赛信息
    if (info.feature === 'match_info' && info.info?.match_info?.pseudo_match_id) {
      this.currentMatchId = info.info.match_info.pseudo_match_id;
      console.log('[AppController] Match ID:', this.currentMatchId);
    }
  }

  /**
   * 处理游戏事件
   */
  private handleEvent(event: GEPEvent): void {
    console.log('[AppController] Event:', event);

    if (event.name === 'match_state_changed') {
      const matchState = event.data.match_state;
      console.log('[AppController] Match state changed:', matchState);
      
      this.handleMatchStateChange(matchState);
    }

    if (event.name === 'match_ended') {
      console.log('[AppController] Match ended');
      this.handleMatchEnded();
    }
  }

  /**
   * 处理比赛状态变化
   */
  private async handleMatchStateChange(state: string): Promise<void> {
    // STRATEGY_TIME: 显示记录小窗
    if (state === 'DOTA_GAMERULES_STATE_STRATEGY_TIME') {
      console.log('[AppController] Strategy time - showing record mode');
      
      // 同步玩家数据到数据库
      await this.syncPlayerData();
      
      // 显示记录小窗
      await this.windowManager.showInGame('record', {
        rosterPlayers: this.rosterPlayers,
        localSteamId: this.localSteamId,
      });
    }

    // TEAM_SHOWCASE: 显示点评小窗
    if (state === 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE') {
      console.log('[AppController] Team showcase - showing review mode');
      
      // 记录比赛数据
      await this.saveMatchData();
      
      // 显示点评小窗
      await this.windowManager.showInGame('review', {
        rosterPlayers: this.rosterPlayers,
        localSteamId: this.localSteamId,
        matchId: this.currentMatchId,
      });
    }

    // POST_GAME: 关闭游戏内窗口
    if (state === 'DOTA_GAMERULES_STATE_POST_GAME') {
      console.log('[AppController] Post game - closing ingame window');
      await this.windowManager.hideInGame();
    }
  }

  /**
   * 同步玩家数据到数据库
   */
  private async syncPlayerData(): Promise<void> {
    if (!this.rosterPlayers.length) {
      console.warn('[AppController] No roster data to sync');
      return;
    }

    console.log('[AppController] Syncing player data...');

    try {
      await syncPlayers(this.rosterPlayers, this.localSteamId);
      console.log('[AppController] Player data synced');
    } catch (error) {
      console.error('[AppController] Failed to sync player data:', error);
    }
  }

  /**
   * 保存比赛数据
   */
  private async saveMatchData(): Promise<void> {
    if (!this.currentMatchId) {
      console.warn('[AppController] No match ID to save');
      return;
    }

    console.log('[AppController] Saving match data...');

    try {
      // TODO: 获取完整的比赛数据并保存
      // 这里需要从 GEP 获取更多信息
      
      console.log('[AppController] Match data saved');
    } catch (error) {
      console.error('[AppController] Failed to save match data:', error);
    }
  }

  /**
   * 处理比赛结束
   */
  private async handleMatchEnded(): Promise<void> {
    console.log('[AppController] Handling match end');
    
    // 这里可以做一些清理工作
    // 比赛数据已经在 TEAM_SHOWCASE 阶段保存
  }

  /**
   * 游戏启动
   */
  private onGameLaunched(gameInfo: any): void {
    console.log('[AppController] Game launched:', gameInfo);
    
    // 隐藏桌面窗口，开始监听游戏事件
    this.windowManager.hideDesktop();
  }

  /**
   * 游戏关闭
   */
  private onGameClosed(): void {
    console.log('[AppController] Game closed');
    
    // 显示桌面窗口
    this.windowManager.showDesktop();
    
    // 清理状态
    this.currentMatchId = '';
    this.rosterPlayers = [];
  }

  /**
   * 切换窗口可见性（快捷键）
   */
  async toggleWindow(): Promise<void> {
    // TODO: 根据当前游戏状态决定切换哪个窗口
    console.log('[AppController] Toggle window');
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    console.log('[AppController] Disposing...');
    this.gep.stop();
  }
}

// 单例导出
export const appController = new AppController();

