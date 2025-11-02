/**
 * Overwolf GEP (Game Events Provider) 服务
 * 基于 PRD 8.3.1 章节
 */

import type {
  GEPInfoUpdate,
  RosterData,
  MatchInfo,
  MeInfo,
  MatchState,
  GameState,
} from '@shared/types/gep';

export class GEPService {
  // 暂时添加下划线前缀表示有意未使用（等待集成 Overwolf API）
  private _requiredFeatures = [
    'game_state',
    'match_state_changed',
    'roster',
    'match_info',
    'me',
    'match_ended',
  ];

  private _currentGameState: GameState = 'idle';
  private currentMatchState?: MatchState;
  private rosterData?: RosterData;
  private matchInfo?: MatchInfo;
  private meInfo?: MeInfo;

  private onInfoUpdateCallbacks: Array<(info: GEPInfoUpdate) => void> = [];
  private onEventCallbacks: Array<(event: any) => void> = [];

  async init(): Promise<void> {
    // TODO: 集成 Overwolf API
    // 注册需要的 features
    // await overwolf.games.events.setRequiredFeatures(7314, this._requiredFeatures);

    // 监听事件
    // overwolf.games.events.onInfoUpdates2.addListener(this._handleInfoUpdate);
    // overwolf.games.events.onNewEvents.addListener(this._handleNewEvent);
    
    console.log('GEP Service initialized');
  }

  private _handleInfoUpdate = (info: any): void => {
    // 解析并分发 info 更新
    const update: GEPInfoUpdate = {
      feature: info.feature,
      category: info.category,
      key: info.key,
      value: info.value,
    };

    // 更新内部状态
    if (update.feature === 'roster') {
      this.rosterData = update.value as RosterData;
    } else if (update.feature === 'match_info') {
      this.matchInfo = update.value as MatchInfo;
    } else if (update.feature === 'me') {
      this.meInfo = update.value as MeInfo;
    }

    // 触发回调
    this.onInfoUpdateCallbacks.forEach((cb) => cb(update));
  };

  private _handleNewEvent = (event: any): void => {
    // 触发回调
    this.onEventCallbacks.forEach((cb) => cb(event));
  };

  // 注册回调
  onInfoUpdate(callback: (info: GEPInfoUpdate) => void): void {
    this.onInfoUpdateCallbacks.push(callback);
  }

  onEvent(callback: (event: any) => void): void {
    this.onEventCallbacks.push(callback);
  }

  // 获取当前数据
  getRosterData(): RosterData | undefined {
    return this.rosterData;
  }

  getMatchInfo(): MatchInfo | undefined {
    return this.matchInfo;
  }

  getMeInfo(): MeInfo | undefined {
    return this.meInfo;
  }

  getCurrentMatchState(): MatchState | undefined {
    return this.currentMatchState;
  }
}

export const gepService = new GEPService();

