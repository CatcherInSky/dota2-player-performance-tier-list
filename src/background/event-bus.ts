import type { CommentRecord, MatchRecord, PlayerRecord, SettingsRecord } from '../shared/types/database'
import type { GlobalMatchData } from '../shared/types/dota2'
import { EventBus } from '../shared/utils/event-bus'

export interface BackgroundEvents extends Record<string, unknown> {
  'match:start': {
    match: MatchRecord | null
    state: GlobalMatchData
  }
  'match:update': {
    match: MatchRecord | null
    state: GlobalMatchData
  }
  'match:end': {
    match: MatchRecord | null
    state: GlobalMatchData
  }
  'data:matches': MatchRecord[]
  'data:players': PlayerRecord[]
  'data:comments': CommentRecord[]
  'settings:updated': SettingsRecord
}

export const backgroundEventBus = new EventBus<BackgroundEvents>()

