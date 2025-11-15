import type { Dota2TeamKey, GlobalMatchData } from './dota2'
import type {
  CommentRecord,
  ExportedDatabase,
  MatchRecord,
  PlayerRecord,
  SettingsRecord,
} from './database'

export interface PaginationRequest {
  page?: number
  pageSize?: number
}

export interface MatchFilters extends PaginationRequest {
  matchId?: string
  startTime?: number
  endTime?: number
  gameMode?: string
  winner?: Dota2TeamKey | 'unknown'
  dateRange?: { start?: Date; end?: Date }
}

export interface PlayerFilters extends PaginationRequest {
  keyword?: string
  matchId?: string
  startTime?: number
  endTime?: number
}

export interface CommentFilters extends PaginationRequest {
  playerId?: string
  matchId?: string
  score?: number
  startTime?: number
  endTime?: number
  comment?: string
  dateRange?: { start?: Date; end?: Date }
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface PlayerHistoryResponse {
  player: PlayerWithStats | null
  comments: CommentRecord[]
  matches: MatchRecord[]
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

export type SaveCommentPayload = {
  matchId: string
  playerId: string
  score: number
  comment: string
}

export type BackgroundApiEvents = {
  'match:start': void
  'match:end': void
  'settings:updated': SettingsRecord
}

export type BackgroundApi = {
  windows: {
    showDesktop(): Promise<void>
    hideDesktop(): Promise<void>
    toggleDesktop(): Promise<void>
    showHistory(): Promise<void>
    hideHistory(): Promise<void>
    dragHistory(): Promise<void>
    showComment(): Promise<void>
    hideComment(): Promise<void>
    dragComment(): Promise<void>
  }
  data: {
    getMatches(filters?: MatchFilters): Promise<PaginatedResult<MatchRecord>>
    getPlayers(filters?: PlayerFilters): Promise<PaginatedResult<PlayerWithStats>>
    getComments(filters?: CommentFilters): Promise<PaginatedResult<CommentWithPlayer>>
    getPlayerHistory(playerId: string): Promise<PlayerHistoryResponse>
    saveComment(payload: SaveCommentPayload): Promise<CommentRecord>
  }
  match: {
    getCurrent(): Promise<{ state: GlobalMatchData; match: MatchRecord | null }>
  }
  settings: {
    get(): Promise<SettingsRecord>
    update(payload: Partial<SettingsRecord>): Promise<SettingsRecord>
    export(): Promise<ExportedDatabase>
    import(payload: ExportedDatabase): Promise<void>
    clear(): Promise<void>
  }
  events: {
    on<EventKey extends keyof BackgroundApiEvents>(
      event: EventKey,
      listener: (payload: BackgroundApiEvents[EventKey]) => void,
    ): () => void
  }
}

declare global {
  interface Window {
    backgroundApi?: BackgroundApi
  }
}