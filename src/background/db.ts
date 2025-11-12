import Dexie, { type Table } from 'dexie'
import type { CommentRecord, ExportedDatabase, MatchRecord, PlayerRecord, SettingsRecord } from '../shared/types/database'

export const SETTINGS_ID = 'app-settings'

export const DEFAULT_SETTINGS_TEMPLATE: Pick<SettingsRecord, 'id' | 'language' | 'ratingLabels'> = {
  id: SETTINGS_ID,
  language: 'zh-CN',
  ratingLabels: {
    1: '拉',
    2: '菜鸟',
    3: 'NPC',
    4: '顶级',
    5: '夯',
  },
}

export function createDefaultSettingsRecord(): SettingsRecord {
  const now = Date.now()
  return {
    ...DEFAULT_SETTINGS_TEMPLATE,
    createdAt: now,
    updatedAt: now,
  }
}

export class DotaDexie extends Dexie {
  matches!: Table<MatchRecord, string>
  players!: Table<PlayerRecord, string>
  comments!: Table<CommentRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('dota2-player-performance')

    this.version(1).stores({
      matches: 'uuid, matchId, playerId, updatedAt, gameMode, winner',
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
        winner?: MatchRecord['winner']
        teamScore?: MatchRecord['teamScore']
        players?: MatchRecord['players']
      },
    )
  }

  async export(): Promise<ExportedDatabase> {
    const [matches, players, comments] = await Promise.all([
      this.matches.toArray(),
      this.players.toArray(),
      this.comments.toArray(),
      // this.settings.get(SETTINGS_ID),
    ])

    return {
      matches,
      players,
      comments,
    }
  }

  async import(payload: ExportedDatabase) {
    const { matches, players, comments } = payload

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
}

export const db = new DotaDexie()

