import Dexie from 'dexie'
import { db } from '../db'
import type { PlayerFilters } from '../../shared/types/api'
import type { PlayerWithStats } from '../../shared/types/api'
import type { PlayerRecord } from '../../shared/types/database'
import type { GlobalMatchData } from '../../shared/types/dota2'
import { generateId } from '../../shared/utils/id'
import { paginate, DEFAULT_PAGE_SIZE } from './pagination'
import { filterRosterPlayers } from '../../shared/utils/roster'

export class PlayersRepository {
  async syncFromMatch(state: GlobalMatchData): Promise<void> {
    const players = filterRosterPlayers(state.roster.players)
    if (!players.length) return

    const matchId = state.match_info.pseudo_match_id
    const timestamp = Date.now()

    const executor = async () => {
      for (const player of players) {
        if (!player.steamId) continue
        const existing = await db.players.where('playerId').equals(player.steamId).first()
        const matchList = existing?.matchList ?? []
        if (matchId && !matchList.includes(matchId)) {
          matchList.push(matchId)
        }
        const nameList = existing?.nameList ?? []
        if (player.name && !nameList.includes(player.name)) {
          nameList.push(player.name)
        }
        const heroList = existing?.heroList ?? []
        if (player.hero && !heroList.includes(player.hero)) {
          heroList.push(player.hero)
        }

        const record: PlayerRecord = {
          uuid: existing?.uuid ?? generateId(),
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          playerId: player.steamId,
          name: player.name ?? existing?.name,
          nameList,
          heroList,
          matchList,
        }
        await db.players.put(record)
      }
    }

    if (Dexie.currentTransaction) {
      await executor()
    } else {
      await db.transaction('readwrite', db.players, executor)
    }
  }

  async update(playerId: string, updates: Partial<PlayerRecord>): Promise<void> {
    await db.players.where('playerId').equals(playerId).modify((record) => {
      Object.assign(record, updates, { updatedAt: Date.now() })
    })
  }

  async getById(playerId: string): Promise<PlayerRecord | undefined> {
    return db.players.where('playerId').equals(playerId).first()
  }

  async query(filters: PlayerFilters = {}) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, keyword, hero, startTime, endTime } = filters
    const collection = db.players.orderBy('updatedAt')
    const all = await collection.reverse().toArray()

    const filtered = await Promise.all(
      all
        .filter((player) => {
          if (keyword) {
            const haystack = [player.name, ...player.nameList].join(' ').toLowerCase()
            if (!haystack.includes(keyword.toLowerCase())) return false
          }
          if (hero && !player.heroList.some((h) => h.toLowerCase().includes(hero.toLowerCase()))) return false
          return true
        })
        .map(async (player) => {
          const comments = await db.comments.where('playerId').equals(player.playerId).toArray()
          const scores = comments.map((comment) => comment.score)
          const averageScore = scores.length ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length : null
          const matchRecords = player.matchList.length
            ? await db.matches.where('matchId').anyOf(player.matchList).toArray()
            : []
          const timestamps = matchRecords.map((match) => match.updatedAt).sort((a, b) => a - b)

          const firstEncounter = timestamps[0]
          const lastEncounter = timestamps[timestamps.length - 1]

          if (startTime && (!lastEncounter || lastEncounter < startTime)) return null
          if (endTime && (!firstEncounter || firstEncounter > endTime)) return null

          const enriched: PlayerWithStats = {
            ...player,
            encounterCount: player.matchList.length,
            averageScore,
            firstEncounter,
            lastEncounter,
          }
          return enriched
        }),
    )

    return paginate(
      filtered.filter((player): player is PlayerWithStats => Boolean(player)),
      page,
      pageSize,
    )
  }

  async getHistory(playerId: string) {
    const [player, comments] = await Promise.all([
      db.players.where('playerId').equals(playerId).first(),
      db.comments.where('playerId').equals(playerId).toArray(),
    ])

    if (!player) {
      return { player: null, comments, matches: [] }
    }

    const matchRecords = player.matchList.length
      ? await db.matches.where('matchId').anyOf(player.matchList).toArray()
      : []
    const timestamps = matchRecords.map((match) => match.updatedAt).sort((a, b) => a - b)
    const scores = comments.map((comment) => comment.score)
    const averageScore = scores.length ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length : null

    const detailed: PlayerWithStats = {
      ...player,
      encounterCount: player.matchList.length,
      firstEncounter: timestamps[0],
      lastEncounter: timestamps[timestamps.length - 1],
      averageScore,
    }

    return { player: detailed, comments, matches: matchRecords }
  }
}


