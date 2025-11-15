import type {
  Dota2Player,
  Dota2TeamKey,
  GameModeInfo,
  TeamScore,
  Dota2GameState,
  Dota2MatchState,
  Dota2PlayerRole,
} from './dota2'

export interface HeroStat {
  hero: string
  totalGames: number
  wins: number
}

export interface MatchStat {
  matchId: string
  team: Dota2TeamKey
  role?: number | Dota2PlayerRole
  isWin: boolean
  timestamp: number
}

export interface MatchRecord {
  uuid: string
  createdAt: number
  updatedAt: number
  matchId: string
  playerId?: string
  gameMode?: GameModeInfo
  winner?: Dota2TeamKey | undefined
  teamScore?: TeamScore
  gameState?: Dota2GameState
  matchState?: Dota2MatchState
  me?: { steam_id?: string; team?: Dota2TeamKey }
  players?: Dota2Player[]
}

export interface PlayerRecord {
  uuid: string
  createdAt: number
  updatedAt: number
  playerId: string
  name?: string
  nameList: string[]
  heroList: HeroStat[]
  matchList: MatchStat[]
}

export interface CommentRecord {
  uuid: string
  createdAt: number
  updatedAt: number
  playerId: string
  matchId: string
  score: number
  comment: string
}

export type RatingLabelKey = 1 | 2 | 3 | 4 | 5

export type Language = 'zh-CN' | 'en-US'

export type RatingLabelsByLanguage = Record<Language, Record<RatingLabelKey, string>>

export interface SettingsRecord {
  id: string
  createdAt: number
  updatedAt: number
  language: Language
  ratingLabels: RatingLabelsByLanguage
}

export interface ExportedDatabase {
  matches: MatchRecord[]
  players: PlayerRecord[]
  comments: CommentRecord[]
  // settings: SettingsRecord | null
}

