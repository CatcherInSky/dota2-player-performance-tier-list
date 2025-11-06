// Dota 2 GEP data types used by Overwolf

export type Dota2GameState =
  | "playing"
  | "spectating"
  | "idle"
  | "loading"
  | "menu"
  | "unknown";

export type Dota2MatchState =
  | "DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD"
  | "DOTA_GAMERULES_STATE_HERO_SELECTION"
  | "DOTA_GAMERULES_STATE_STRATEGY_TIME"
  | "DOTA_GAMERULES_STATE_PRE_GAME"
  | "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"
  | "DOTA_GAMERULES_STATE_POST_GAME"
  | "DOTA_GAMERULES_STATE_TEAM_SHOWCASE"
  | "UNKNOWN";

export type Dota2Team = "radiant" | "dire" | "unknown";

export type Dota2GameMode =
  | "AllPick"
  | "AllPickRanked"
  | "SingleDraft"
  | "RandomDraft"
  | "AllRandom"
  | "LeastPlayed"
  | "LimitedHeroes"
  | "CaptainsMode"
  | "CaptainsDraft"
  | "unknown";

export interface Dota2RosterPlayer {
  playerId?: string | number; // unified id we compute when possible
  account_id?: string | number;
  steamId?: string;
  steam_id?: string;
  steamid?: string;
  index?: number; // 0..9
  team?: Dota2Team;
  team_name?: "radiant" | "dire" | string;
  team_slot?: number; // 0..4 per team
  player_name?: string;
  playerName?: string;
  name?: string;
  hero?: string; // e.g. 'npc_dota_hero_axe'
  heroName?: string;
  hero_id?: number;
  role?: string;
  rank?: string | number;
  // KDA fields - may come from roster or events
  kills?: number;
  deaths?: number;
  assists?: number;
  // Economic fields
  gpm?: number; // gold per minute
  xpm?: number; // experience per minute
  // Level - may not be available in all GEP versions
  level?: number;
}

export interface Dota2RosterInfo {
  players?: Dota2RosterPlayer[];
}

export interface Dota2MatchInfo {
  match_id?: string | number; // may not be provided by GEP
  pseudo_match_id?: string | number; // GEP provides this instead of match_id in some cases
  duration?: number; // seconds
  mode?: Dota2GameMode | string; // game mode, fallback to string for unknown modes
  game_mode?: Dota2GameMode | string; // GEP may provide this field name instead of mode
  winner?: Dota2Team | string;
  start_time?: number; // epoch seconds
  end_time?: number; // epoch seconds
}

export interface Dota2MeInfo {
  name?: string;
  steam_id?: string;
  hero?: string;
  hero_id?: number;
  team?: Dota2Team;
  kills?: number;
  deaths?: number;
  assists?: number;
  gpm?: number;
  xpm?: number;
  level?: number;
}

export interface Dota2GameInfo {
  game_state?: Dota2GameState;
  [key: string]: unknown;
}

export interface Dota2GepInternalVersionInfo {
  local_version?: string;
  public_version?: string;
}

export interface Dota2GepInternal {
  version_info?: Dota2GepInternalVersionInfo;
  [key: string]: unknown;
}

export interface Dota2InfoUpdates {
  game_state?: { game_state?: Dota2GameState } | Dota2GameState;
  game?: Dota2GameInfo; // alternative structure where game_state is nested under game
  roster?: Dota2RosterInfo;
  match_info?: Dota2MatchInfo;
  me?: Dota2MeInfo;
  gep_internal?: Dota2GepInternal; // GEP internal information, including version info
  [key: string]: unknown; // allow other features
}

export interface Dota2KillEvent {
  kills?: number;
  kill_streak?: number;
}

export interface Dota2AssistEvent {
  assists?: number;
}

export interface Dota2DeathEvent {
  deaths?: number;
}

export interface Dota2CSEvent {
  last_hits?: number;
  denies?: number;
}

export interface Dota2XpmEvent {
  xpm?: number;
}

export interface Dota2GpmEvent {
  gpm?: number;
}

export interface Dota2GoldEvent {
  gold?: number;
}

export interface Dota2MatchStateChangedEvent {
  match_state?: Dota2MatchState | string;
  match_id?: string | number; // may be provided in some cases
}

export interface Dota2MatchEndedEvent {
  winner?: Dota2Team | string;
}

export interface Dota2GameStateChangedEvent {
  game_state?: Dota2GameState | string;
}

export type Dota2EventPayloads =
  | { name: "kill"; data: Dota2KillEvent }
  | { name: "assist"; data: Dota2AssistEvent }
  | { name: "death"; data: Dota2DeathEvent }
  | { name: "cs"; data: Dota2CSEvent }
  | { name: "xpm"; data: Dota2XpmEvent }
  | { name: "gpm"; data: Dota2GpmEvent }
  | { name: "gold"; data: Dota2GoldEvent }
  | { name: "match_state_changed"; data: Dota2MatchStateChangedEvent }
  | { name: "match_ended"; data: Dota2MatchEndedEvent }
  | { name: "game_state_changed"; data: Dota2GameStateChangedEvent }
  | { name: string; data: Record<string, unknown> };

export interface Dota2InfoUpdatesEvent {
  info: Dota2InfoUpdates;
}
