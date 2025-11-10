import type { CommentRecord, MatchRecord, PlayerRecord, SettingsRecord } from './database'

export interface PaginationRequest {
  page?: number
  pageSize?: number
}

export interface MatchFilters extends PaginationRequest {
  matchId?: string
  startTime?: number
  endTime?: number
  gameMode?: string
  win?: 'win' | 'lose' | 'unknown'
}

export interface PlayerFilters extends PaginationRequest {
  keyword?: string
  hero?: string
  startTime?: number
  endTime?: number
}

export interface CommentFilters extends PaginationRequest {
  playerId?: string
  matchId?: string
  score?: number
  startTime?: number
  endTime?: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface PlayerWithStats extends PlayerRecord {
  firstEncounter?: number
  lastEncounter?: number
  encounterCount: number
  averageScore: number | null
}

export interface CommentWithPlayer extends CommentRecord {
  playerName?: string
}

export interface DatabaseSnapshot {
  matches: PaginatedResult<MatchRecord>
  players: PaginatedResult<PlayerWithStats>
  comments: PaginatedResult<CommentWithPlayer>
  settings: SettingsRecord
}

