import type { CommentRecord, MatchRecord, PlayerRecord, SettingsRecord } from '../shared/types/database'
import { EventBus } from '../shared/utils/event-bus'

export interface BackgroundEvents extends Record<string, unknown> {
  'match:start': void
  'match:end': void
  'data:matches': MatchRecord[]
  'data:players': PlayerRecord[]
  'data:comments': CommentRecord[]
  'settings:updated': SettingsRecord
}

export const backgroundEventBus = new EventBus<BackgroundEvents>()

