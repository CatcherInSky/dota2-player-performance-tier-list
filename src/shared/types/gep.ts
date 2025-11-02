/**
 * Overwolf GEP (Game Events Provider) 类型定义
 * 基于 https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/dota-2
 */

export type GameState = 'playing' | 'spectating' | 'idle';

export type MatchState =
  | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD'
  | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
  | 'DOTA_GAMERULES_STATE_STRATEGY_TIME'
  | 'DOTA_GAMERULES_STATE_PRE_GAME'
  | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
  | 'DOTA_GAMERULES_STATE_POST_GAME'
  | 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE';

export type Team = 'radiant' | 'dire';

export interface RosterPlayer {
  steamid: string; // 64位 Steam ID
  account_id: string; // 32位账户ID
  hero: string; // 英雄名称，如 "npc_dota_hero_keeper_of_the_light"
  hero_id: string; // 英雄ID
  team: Team; // 队伍
  player_name: string; // 玩家昵称
  pro: string; // 是否职业选手
  kills?: number;
  deaths?: number;
  assists?: number;
  level?: number;
}

export interface RosterData {
  players: RosterPlayer[];
}

export interface MatchInfo {
  pseudo_match_id: string; // 伪匹配ID
  match_id?: string; // 官方匹配ID（如果有）
  game_mode: string; // 游戏模式
  team_score?: {
    radiant: number;
    dire: number;
  };
}

export interface MeInfo {
  team: Team;
  steam_id: string;
  hero: string;
}

export interface GameStateChangedEvent {
  game_state: GameState;
  match_state?: MatchState;
  match_id?: string;
  player_steam_id?: string;
  player_team?: Team;
}

export interface MatchStateChangedEvent {
  match_state: MatchState;
}

export interface MatchEndedEvent {
  match_id?: string;
  result: 'win' | 'lose' | 'unknown';
  duration: number;
}

// GEP 事件类型
export type GEPEvent =
  | { name: 'game_state_changed'; data: GameStateChangedEvent }
  | { name: 'match_state_changed'; data: MatchStateChangedEvent }
  | { name: 'match_ended'; data: MatchEndedEvent };

// GEP Info 更新类型
export interface GEPInfoUpdate {
  feature: string;
  category: string;
  key: string;
  value: string | RosterData | MatchInfo | MeInfo;
}

