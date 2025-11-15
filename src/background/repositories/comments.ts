import Dexie from 'dexie'
import { db } from '../db'
import type { CommentFilters, CommentWithPlayer, PaginatedResult } from '../../shared/types/api'
import type { CommentRecord } from '../../shared/types/database'
import type { GlobalMatchData } from '../../shared/types/dota2'
import { generateId } from '../../shared/utils/id'
import { Logger } from '../../shared/utils/logger'
import { DEFAULT_PAGE_SIZE } from './pagination'
import { filterRosterPlayers } from '../../shared/utils/roster'

export class CommentsRepository {
  private logger = new Logger({ namespace: 'CommentsRepository' })

  async ensurePlaceholders(matchId: string, players: GlobalMatchData['roster']['players']) {
    const validPlayers = filterRosterPlayers(players)
    if (!validPlayers.length) return
    const timestamp = Date.now()

    const executor = async () => {
      const records: CommentRecord[] = []
      for (const player of validPlayers) {
        if (!player?.steamId) continue
        const existing = await db.comments.where('[matchId+playerId]').equals([matchId, player.steamId]).first()
        if (existing) continue
        records.push({
          uuid: generateId(),
          createdAt: timestamp,
          updatedAt: timestamp,
          playerId: player.steamId,
          matchId,
          score: 3,
          comment: '',
        })
      }
      if (records.length) {
        await db.comments.bulkAdd(records)
      }
    }

    if (Dexie.currentTransaction) {
      await executor()
    } else {
      await db.transaction('readwrite', db.comments, executor)
    }
  }

  async save(payload: { matchId: string; playerId: string; score: number; comment: string }) {
    const { matchId, playerId, score, comment } = payload
    if (!playerId) {
      throw new Error('playerId is required')
    }

    const executor = async () => {
      const existing = await db.comments.where('[matchId+playerId]').equals([matchId, playerId]).first()
      const timestamp = Date.now()
      const record: CommentRecord = {
        uuid: existing?.uuid ?? generateId(),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        matchId,
        playerId,
        score,
        comment,
      }

      await db.comments.put(record)
      this.logger.info('Saved comment', matchId, playerId)
      return record
    }

    if (Dexie.currentTransaction) {
      return executor()
    }

    return db.transaction('readwrite', db.comments, executor)
  }

  async getByCompositeKey(matchId: string, playerId: string): Promise<CommentRecord | undefined> {
    return db.comments.where('[matchId+playerId]').equals([matchId, playerId]).first()
  }

  async query(filters: CommentFilters = {}): Promise<PaginatedResult<CommentWithPlayer>> {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, playerId, matchId, score, startTime, endTime } = filters
    const offset = (page - 1) * pageSize

    let collection =
      playerId && matchId
        ? db.comments.where('[matchId+playerId]').equals([matchId, playerId])
        : playerId
          ? db.comments.where('playerId').equals(playerId)
          : matchId
            ? db.comments.where('matchId').equals(matchId)
            : db.comments.orderBy('updatedAt').reverse()

    collection = collection.filter((comment) => {
      if (typeof score === 'number' && comment.score !== score) return false
      if (startTime && comment.updatedAt < startTime) return false
      if (endTime && comment.updatedAt > endTime) return false
      if (filters.comment && !comment.comment.toLowerCase().includes(filters.comment.toLowerCase())) return false
      return true
    })

    const total = await collection.clone().count()
    const items = await collection.offset(offset).limit(pageSize).toArray()
    const enriched = await Promise.all(
      items.map(async (comment) => {
        const player = await db.players.where('playerId').equals(comment.playerId).first()
        const enrichedComment: CommentWithPlayer = {
          ...comment,
          playerName: player?.name ?? player?.nameList?.[0],
        }
        return enrichedComment
      }),
    )

    return {
      items: enriched,
      page,
      pageSize,
      total,
    }
  }
}

