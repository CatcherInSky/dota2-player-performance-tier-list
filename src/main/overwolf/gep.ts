/**
 * Overwolf GEP (Game Events Provider) 服务
 * 参考: https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/dota-2
 */

import type { GEPInfoUpdate, GEPEvent } from '@shared/types/gep';

type InfoUpdateCallback = (info: GEPInfoUpdate) => void;
type EventCallback = (event: GEPEvent) => void;

export class GEPService {
  private infoUpdateListeners: InfoUpdateCallback[] = [];
  private eventListeners: EventCallback[] = [];
  private isRunning: boolean = false;

  // Dota 2 需要的 features
  private readonly REQUIRED_FEATURES = [
    'game_state',
    'match_state_changed', 
    'roster',
    'match_info',
    'me',
    'match_ended',
    'kill',
    'death',
    'assist',
    'level',
  ];

  /**
   * 启动 GEP 监听
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[GEP] Already running');
      return;
    }

    console.log('[GEP] Starting...');

    try {
      // TODO: 实现真实的 Overwolf API 调用
      // await this.setRequiredFeatures();
      // await this.registerEventListeners();
      
      this.isRunning = true;
      console.log('[GEP] Started successfully');
      
      // 开发环境模拟
      if (import.meta.env.DEV) {
        this.startMockEvents();
      }
    } catch (error) {
      console.error('[GEP] Failed to start:', error);
      throw error;
    }
  }

  /**
   * 停止 GEP 监听
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[GEP] Stopping...');
    
    // TODO: 移除 Overwolf 事件监听器
    // overwolf.games.events.onInfoUpdates2.removeListener(this.handleInfoUpdate);
    // overwolf.games.events.onNewEvents.removeListener(this.handleNewEvent);
    
    this.isRunning = false;
    this.infoUpdateListeners = [];
    this.eventListeners = [];
    
    console.log('[GEP] Stopped');
  }

  /**
   * 设置需要的游戏特性
   */
  private async setRequiredFeatures(): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: 实现 Overwolf API 调用
      // overwolf.games.events.setRequiredFeatures(this.REQUIRED_FEATURES, (result) => {
      //   if (result.success) {
      //     console.log('[GEP] Required features set:', result);
      //     resolve();
      //   } else {
      //     console.error('[GEP] Failed to set required features:', result);
      //     reject(new Error(result.error || 'Failed to set required features'));
      //   }
      // });
      
      // 开发环境模拟
      console.log('[GEP] DEV: Required features set:', this.REQUIRED_FEATURES);
      resolve();
    });
  }

  /**
   * 注册事件监听器
   */
  private async registerEventListeners(): Promise<void> {
    // TODO: 实现 Overwolf API 调用
    // overwolf.games.events.onInfoUpdates2.addListener(this.handleInfoUpdate.bind(this));
    // overwolf.games.events.onNewEvents.addListener(this.handleNewEvent.bind(this));
    
    console.log('[GEP] Event listeners registered');
  }

  /**
   * 处理 Info 更新
   */
  private handleInfoUpdate(info: any): void {
    console.log('[GEP] Info update:', info);
    
    // 触发所有监听器
    this.infoUpdateListeners.forEach(listener => {
      try {
        listener(info);
      } catch (error) {
        console.error('[GEP] Error in info update listener:', error);
      }
    });
  }

  /**
   * 处理新事件
   */
  private handleNewEvent(event: any): void {
    console.log('[GEP] New event:', event);
    
    // 触发所有监听器
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[GEP] Error in event listener:', error);
      }
    });
  }

  /**
   * 订阅 Info 更新
   */
  onInfoUpdate(callback: InfoUpdateCallback): void {
    this.infoUpdateListeners.push(callback);
  }

  /**
   * 订阅游戏事件
   */
  onEvent(callback: EventCallback): void {
    this.eventListeners.push(callback);
  }

  /**
   * 开发环境：模拟事件
   */
  private startMockEvents(): void {
    console.log('[GEP] Starting mock events for development');
    
    // 模拟策略时间
    setTimeout(() => {
      this.handleNewEvent({
        name: 'match_state_changed',
        data: {
          match_state: 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
        },
      });
      
      // 模拟 roster 数据
      this.handleInfoUpdate({
        feature: 'roster',
        info: {
          roster: {
            players: [
              {
                steamid: '76561197960287930',
                account_id: 27930,
                hero: 'npc_dota_hero_axe',
                hero_id: 2,
                team: 'radiant',
                player_name: '测试玩家1',
                pro: 0,
              },
              {
                steamid: '76561197960287931',
                account_id: 27931,
                hero: 'npc_dota_hero_pudge',
                hero_id: 14,
                team: 'radiant',
                player_name: '测试玩家2',
                pro: 0,
              },
              {
                steamid: 'local_player',
                account_id: 27932,
                hero: 'npc_dota_hero_crystal_maiden',
                hero_id: 5,
                team: 'radiant',
                player_name: '你',
                pro: 0,
              },
            ],
          },
        },
      });
      
      // 模拟本地玩家
      this.handleInfoUpdate({
        feature: 'me',
        info: {
          me: {
            steam_id: 'local_player',
            team: 'radiant',
            hero: 'npc_dota_hero_crystal_maiden',
          },
        },
      });
    }, 3000);
  }
}
