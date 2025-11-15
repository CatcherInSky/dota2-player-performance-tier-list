import Dexie, { type Table } from 'dexie'
import type { CommentRecord, ExportedDatabase, MatchRecord, PlayerRecord, SettingsRecord } from '../shared/types/database'

export const SETTINGS_ID = 'app-settings'

export const DEFAULT_SETTINGS_TEMPLATE: Pick<SettingsRecord, 'id' | 'language' | 'ratingLabels'> = {
  id: SETTINGS_ID,
  language: 'zh-CN',
  ratingLabels: {
    'zh-CN': {
      1: '拉',
      2: '菜鸟',
      3: 'NPC',
      4: '顶级',
      5: '夯',
    },
    'en-US': {
      1: 'D',
      2: 'C',
      3: 'B',
      4: 'A',
      5: 'S',
    },
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

/**
 * DotaDexie - IndexedDB数据库类
 * 使用Dexie作为IndexedDB的封装，管理matches、players、comments、settings四个表
 */
export class DotaDexie extends Dexie {
  matches!: Table<MatchRecord, string>
  players!: Table<PlayerRecord, string>
  comments!: Table<CommentRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('dota2-player-performance')

    this.version(21).stores({
      matches: 'uuid, matchId, playerId, updatedAt, gameMode, winner, gameState',
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

  /**
   * 导出数据库所有数据
   * 用于备份和数据迁移
   * @returns 包含所有表数据的导出对象
   */
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

  /**
   * 导入数据库数据
   * 使用事务确保数据一致性
   * @param payload - 要导入的数据（matches, players, comments）
   */
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

  /**
   * 清空所有表的数据
   * 使用事务确保操作的原子性
   */
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

