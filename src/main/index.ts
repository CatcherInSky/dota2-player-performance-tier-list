/**
 * Background Window 主进程入口
 * 基于 PRD 5.1 章节
 */

import { gepService } from './overwolf/gep';
import { windowManager } from './overwolf/windows';
import { syncPlayers } from './database/players';
import { recordMatch } from './database/matches';
import type { MatchState } from '@shared/types/gep';

class BackgroundController {
  private currentMatchState?: MatchState;
  private matchStartTime: number = 0;
  private localSteamId?: string;

  async init(): Promise<void> {
    console.log('Background Window initializing...');

    // 初始化 GEP 服务
    await gepService.init();

    // 注册事件监听
    this.registerEventListeners();

    console.log('Background Window initialized');
  }

  private registerEventListeners(): void {
    // 监听 Info 更新
    gepService.onInfoUpdate((info) => {
      console.log('GEP Info Update:', info);

      // 处理 me 信息
      if (info.feature === 'me' && info.key === 'steam_id') {
        this.localSteamId = info.value as string;
      }
    });

    // 监听事件
    gepService.onEvent((event) => {
      console.log('GEP Event:', event);

      if (event.name === 'match_state_changed') {
        this.handleMatchStateChanged(event.data.match_state);
      } else if (event.name === 'game_state_changed') {
        this.handleGameStateChanged(event.data);
      } else if (event.name === 'match_ended') {
        this.handleMatchEnded(event.data);
      }
    });
  }

  private handleMatchStateChanged(newState: MatchState): void {
    const prevState = this.currentMatchState;
    this.currentMatchState = newState;

    console.log(`Match state changed: ${prevState} -> ${newState}`);

    // 根据 PRD 3.1 章节
    if (newState === 'DOTA_GAMERULES_STATE_STRATEGY_TIME') {
      // 策略时间：展示记录小窗
      this.onStrategyTime();
    } else if (newState === 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE') {
      // 结算界面：展示点评小窗
      this.onTeamShowcase();
    } else if (newState === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS') {
      // 游戏进行中：记录开始时间
      if (this.matchStartTime === 0) {
        this.matchStartTime = Date.now();
      }
    }
  }

  private handleGameStateChanged(data: any): void {
    console.log('Game state changed:', data);
    // TODO: 处理游戏状态变化
  }

  private handleMatchEnded(data: any): void {
    console.log('Match ended:', data);
    // TODO: 记录比赛数据
  }

  private async onStrategyTime(): Promise<void> {
    console.log('Strategy time started');

    // 获取 roster 数据
    const rosterData = gepService.getRosterData();
    if (!rosterData || !this.localSteamId) {
      console.warn('Roster data or local steam ID not available');
      return;
    }

    // 同步玩家数据
    await syncPlayers(rosterData.players, this.localSteamId);

    // 显示记录小窗
    await windowManager.showInGame('record');
  }

  private async onTeamShowcase(): Promise<void> {
    console.log('Team showcase started');

    // 记录比赛数据
    const matchInfo = gepService.getMatchInfo();
    const meInfo = gepService.getMeInfo();
    const rosterData = gepService.getRosterData();

    if (!matchInfo || !meInfo || !rosterData || !this.localSteamId) {
      console.warn('Match data not complete');
      return;
    }

    // TODO: 确定胜负结果
    const result: 'win' | 'lose' | 'unknown' = 'unknown';

    await recordMatch({
      matchId: matchInfo.pseudo_match_id,
      gameMode: matchInfo.game_mode,
      startTime: this.matchStartTime,
      result,
      playerTeam: meInfo.team,
      radiantScore: matchInfo.team_score?.radiant,
      direScore: matchInfo.team_score?.dire,
      rosterPlayers: rosterData.players,
    });

    // 重置匹配开始时间
    this.matchStartTime = 0;

    // 显示点评小窗
    await windowManager.showInGame('review');
  }
}

// 系统托盘菜单处理函数（由 Overwolf manifest 调用）
// @ts-ignore - Overwolf 全局函数
window.openDesktopWindow = async () => {
  console.log('Opening desktop window from tray menu');
  await windowManager.showDesktop();
};

// @ts-ignore - Overwolf 全局函数
window.openSettings = async () => {
  console.log('Opening settings from tray menu');
  // TODO: 实现直接打开设置页的逻辑
  await windowManager.showDesktop();
};

// @ts-ignore - Overwolf 全局函数
window.exitApp = () => {
  console.log('Closing app from tray menu');
  // TODO: 实现应用清理和关闭逻辑
  // overwolf.windows.close('background');
};

// 启动 Background Window
const controller = new BackgroundController();
controller.init().catch((error) => {
  console.error('Failed to initialize background window:', error);
});

