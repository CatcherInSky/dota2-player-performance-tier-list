import type {
  CommentFilters,
  CommentWithPlayer,
  MatchFilters,
  PaginatedResult,
  PlayerFilters,
  PlayerWithStats,
} from '../types/api'
import type { CommentRecord, ExportedDatabase, MatchRecord, SettingsRecord } from '../types/database'
import type { GlobalMatchData } from '../types/dota2'

export interface BackgroundApiEvents {
  'match:start': { match: MatchRecord | null; state: GlobalMatchData }
  'match:update': { match: MatchRecord | null; state: GlobalMatchData }
  'match:end': { match: MatchRecord | null; state: GlobalMatchData }
  'settings:updated': SettingsRecord
}

export interface BackgroundApi {
  windows: {
    showDesktop(): Promise<void>
    hideDesktop(): Promise<void>
    toggleDesktop(): Promise<void>
    showIngame(data?: unknown): Promise<void>
    hideIngame(): Promise<void>
    dragIngame(): Promise<void>
  }
  data: {
    getMatches(filters?: MatchFilters): Promise<PaginatedResult<MatchRecord>>
    getPlayers(filters?: PlayerFilters): Promise<PaginatedResult<PlayerWithStats>>
    getComments(filters?: CommentFilters): Promise<PaginatedResult<CommentWithPlayer>>
    getPlayerHistory(playerId: string): Promise<{ player: PlayerWithStats | null; comments: CommentRecord[] }>
    saveComment(payload: { matchId: string; playerId: string; score: number; comment: string }): Promise<CommentRecord>
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

