import type { Dota2Player, Dota2TeamKey, GameModeInfo, TeamScore } from './dota2'

export interface MatchRecord {
  uuid: string
  createdAt: number
  updatedAt: number
  matchId: string
  playerId?: string
  gameMode?: GameModeInfo
  winner?: Dota2TeamKey | undefined
  teamScore?: TeamScore
  players?: Dota2Player[]
}

export interface PlayerRecord {
  uuid: string
  createdAt: number
  updatedAt: number
  playerId: string
  name?: string
  nameList: string[]
  heroList: string[]
  matchList: string[]
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

export interface SettingsRecord {
  id: string
  createdAt: number
  updatedAt: number
  language: 'zh-CN' | 'en-US'
  ratingLabels: Record<RatingLabelKey, string>
}

export interface ExportedDatabase {
  matches: MatchRecord[]
  players: PlayerRecord[]
  comments: CommentRecord[]
  // settings: SettingsRecord | null
}

