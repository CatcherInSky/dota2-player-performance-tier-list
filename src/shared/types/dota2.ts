export enum Dota2GameState {
  PLAYING = 'playing',
  SPECTATING = 'spectating',
  IDLE = 'idle',
}

export enum Dota2MatchState {
  WAIT_FOR_PLAYERS_TO_LOAD = 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD',
  HERO_SELECTION = 'DOTA_GAMERULES_STATE_HERO_SELECTION',
  STRATEGY_TIME = 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  PRE_GAME = 'DOTA_GAMERULES_STATE_PRE_GAME',
  GAME_IN_PROGRESS = 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
  POST_GAME = 'DOTA_GAMERULES_STATE_POST_GAME',
  TEAM_SHOWCASE = 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE',
}

export enum Dota2Team {
  NONE = 'none',
  RADIANT = 'radiant',
  DIRE = 'dire',
}

export enum Dota2TeamId {
  NONE = 0,
  RADIANT = 2,
  DIRE = 3,
}

export type Dota2TeamKey = Dota2Team

export enum Dota2GameMode {
  ALL_PICK = 'AllPick',
  ALL_PICK_RANKED = 'AllPickRanked',
  SINGLE_DRAFT = 'SingleDraft',
  RANDOM_DRAFT = 'RandomDraft',
  ALL_RANDOM = 'AllRandom',
  LEAST_PLAYED = 'LeastPlayed',
  LIMITED_HEROES = 'LimitedHeroes',
  CAPTAINS_MODE = 'CaptainsMode',
  CAPTAINS_DRAFT = 'CaptainsDraft',
}

export enum Dota2PlayerRole {
  CARRY = 1,
  OFFLANER = 2,
  MIDLANER = 4,
  SUPPORT = 8,
  HARD_SUPPORT = 16,
}

export interface Dota2EventPayload {
  events: Array<{
    name: string
    data: string
  }>
}

export interface Dota2EventMatchEnded {
  winner?: keyof typeof Dota2Team
}

export interface Dota2InfoUpdates<TFeature extends string, TInfo> {
  feature: TFeature
  info: TInfo
}

export interface MatchInfo {
  match_info: {
    pseudo_match_id?: string
    game_mode?: string
    team_score?: string
  }
}

export interface GameModeInfo {
  lobby_type?: string
  game_mode?: string
}

export interface TeamScore {
  [Dota2Team.RADIANT]?: number
  [Dota2Team.DIRE]?: number
}

export type Dota2InfoUpdatesMatchInfo = Dota2InfoUpdates<'match_info', MatchInfo>

export interface MatchStateChanged {
  game?: {
    match_state?: keyof typeof Dota2MatchState
  }
}

export type Dota2InfoUpdatesMatchStateChanged = Dota2InfoUpdates<
  'match_state_changed',
  MatchStateChanged
>

export interface GameStateChanged {
  game?: {
    game_state?: keyof typeof Dota2GameState
  }
}

export type Dota2InfoUpdatesGameStateChanged = Dota2InfoUpdates<
  'game_state_changed',
  GameStateChanged
>

export interface Dota2MePayload {
  me?: {
    steam_id?: string
    team?: Dota2TeamKey
  }
}

export type Dota2InfoUpdatesMe = Dota2InfoUpdates<'me', Dota2MePayload>

export interface Dota2RosterPayload {
  roster?: {
    bans?: string
    players?: string
    draft?: string
  }
}

export interface Dota2Player {
  steamId?: string
  name?: string
  hero?: string
  team?: number | Dota2TeamKey
  role?: number | Dota2PlayerRole // 位标志: 1=Carry, 2=Offlaner, 4=Midlaner, 8=Support, 16=Hard Support
  team_slot?: number
  player_index?: number
}

export type Dota2InfoUpdatesRoster = Dota2InfoUpdates<'roster', Dota2RosterPayload>

export interface GlobalMatchData {
  match_info: {
    pseudo_match_id?: string
    game_mode?: GameModeInfo
    team_score?: TeamScore
  }
  me: {
    steam_id?: string
    team?: Dota2TeamKey
  }
  roster: {
    players?: Dota2Player[]
  }
  game: {
    winner?: Dota2TeamKey
    game_state?: Dota2GameState
    match_state?: Dota2MatchState
  }
}

