import Dexie, { type Table } from 'dexie'
import type {
  CommentRecord,
  ExportedDatabase,
  MatchRecord,
  PlayerRecord,
  RatingLabelKey,
  SettingsRecord,
} from '../../shared/types/database'

const SETTINGS_ID = 'app-settings'

export class DotaDexie extends Dexie {
  matches!: Table<MatchRecord, string>
  players!: Table<PlayerRecord, string>
  comments!: Table<CommentRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('dota2-player-performance')

    this.version(1).stores({
      matches: 'uuid, matchId, playerId, updatedAt, gameMode',
      players: 'uuid, playerId, updatedAt',
      comments: 'uuid, playerId, matchId, updatedAt, [matchId+playerId]',
      settings: 'id',
    })

    this.matches.mapToClass(
      class implements MatchRecord {
        uuid!: string
        createdAt!: number
        updatedAt!: number
        matchId!: string
        playerId?: string
        gameMode?: MatchRecord['gameMode']
        win?: boolean | null
        teamScore?: MatchRecord['teamScore']
        players?: MatchRecord['players']
      },
    )
  }

  async export(): Promise<ExportedDatabase> {
    const [matches, players, comments, settings] = await Promise.all([
      this.matches.toArray(),
      this.players.toArray(),
      this.comments.toArray(),
      this.settings.get(SETTINGS_ID),
    ])

    return {
      matches,
      players,
      comments,
      settings: settings ?? null,
    }
  }

  async import(payload: ExportedDatabase) {
    const { matches, players, comments, settings } = payload

    await this.transaction(
      'readwrite',
      this.matches,
      this.players,
      this.comments,
      this.settings,
      async () => {
        if (matches?.length) {
          await this.matches.bulkPut(matches)
        }
        if (players?.length) {
          await this.players.bulkPut(players)
        }
        if (comments?.length) {
          await this.comments.bulkPut(comments)
        }
        if (settings) {
          await this.settings.put(settings)
        }
      },
    )
  }

  async clearAll() {
    await this.transaction(
      'readwrite',
      this.matches,
      this.players,
      this.comments,
      this.settings,
      async () => {
        await Promise.all([
          this.matches.clear(),
          this.players.clear(),
          this.comments.clear(),
          this.settings.clear(),
        ])
      },
    )
  }

  async getSettings(): Promise<SettingsRecord> {
    const now = Date.now()
    const existing = await this.settings.get(SETTINGS_ID)
    if (existing) {
      return existing
    }

    const defaultSettings: SettingsRecord = {
      id: SETTINGS_ID,
      createdAt: now,
      updatedAt: now,
      language: 'zh-CN',
      ratingLabels: {
        1: '拉',
        2: '菜鸟',
        3: 'NPC',
        4: '顶级',
        5: '夯',
      },
    }

    await this.settings.put(defaultSettings)
    return defaultSettings
  }

  async updateSettings(partial: Partial<Omit<SettingsRecord, 'id'>>) {
    const current = await this.getSettings()
    const updated: SettingsRecord = {
      ...current,
      ...partial,
      ratingLabels: partial.ratingLabels ?? current.ratingLabels,
      updatedAt: Date.now(),
    }

    await this.settings.put(updated)
  }

  static DEFAULT_RATING_LABELS: Record<RatingLabelKey, string> = {
    1: '拉',
    2: '菜鸟',
    3: 'NPC',
    4: '顶级',
    5: '夯',
  }
}

export const db = new DotaDexie()


