import { db } from '../shared/db'
import type {
  CommentFilters,
  CommentWithPlayer,
  MatchFilters,
  PaginatedResult,
  PlayerFilters,
  PlayerWithStats,
} from '../shared/types/api'
import type { CommentRecord, MatchRecord, PlayerRecord } from '../shared/types/database'
import type { GlobalMatchData } from '../shared/types/dota2'
import { Dota2Team } from '../shared/types/dota2'
import { generateId } from '../shared/utils/id'
import { Logger } from '../shared/utils/logger'

const DEFAULT_PAGE_SIZE = 20

export class DataService {
  private logger = new Logger({ namespace: 'DataService' })

  async ensureMatchRecord(state: GlobalMatchData): Promise<MatchRecord | null> {
    const matchId = state.match_info.pseudo_match_id
    if (!matchId) {
      this.logger.warn('Cannot ensure match record without match_id')
      return null
    }

    const existing = await db.matches.where('matchId').equals(matchId).first()
    const timestamp = Date.now()
    const matchRecord: MatchRecord = {
      uuid: existing?.uuid ?? generateId(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      matchId,
      playerId: state.me.steam_id,
      gameMode: state.match_info.game_mode,
      win: this.computeWin(state),
      teamScore: state.match_info.team_score,
      players: state.roster.players,
    }

    await db.matches.put(matchRecord)
    this.logger.debug('Upserted match record', matchRecord)
    return matchRecord
  }

  async finalizeMatch(state: GlobalMatchData): Promise<MatchRecord | null> {
    const match = await this.ensureMatchRecord(state)
    if (!match) return null

    match.updatedAt = Date.now()
    match.win = this.computeWin(state)
    match.teamScore = state.match_info.team_score

    await db.matches.put(match)
    this.logger.info('Finalized match record', match.matchId)
    return match
  }

  async syncPlayers(state: GlobalMatchData) {
    const players = state.roster.players ?? []
    if (!players.length) return

    const matchId = state.match_info.pseudo_match_id
    const timestamp = Date.now()

    await db.transaction('readwrite', db.players, async () => {
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
    })
  }

  async ensureCommentPlaceholders(matchId: string, players: GlobalMatchData['roster']['players']) {
    if (!players?.length) return
    const timestamp = Date.now()

    await db.transaction('readwrite', db.comments, async () => {
      for (const player of players) {
        if (!player.steamId) continue
        const existing = await db.comments.where('[matchId+playerId]').equals([matchId, player.steamId]).first()
        if (existing) continue
        const record: CommentRecord = {
          uuid: generateId(),
          createdAt: timestamp,
          updatedAt: timestamp,
          playerId: player.steamId,
          matchId,
          score: 3,
          comment: '',
        }
        await db.comments.put(record)
      }
    })
  }

  async saveComment(payload: { matchId: string; playerId: string; score: number; comment: string }) {
    const { matchId, playerId, score, comment } = payload
    if (!playerId) {
      throw new Error('playerId is required')
    }
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

  async getMatches(filters: MatchFilters = {}): Promise<PaginatedResult<MatchRecord>> {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, matchId, gameMode, win, startTime, endTime } = filters
    let collection = db.matches.orderBy('updatedAt')

    if (matchId) {
      collection = db.matches.where('matchId').equals(matchId)
    }

    const all = await collection.reverse().toArray()
    const filtered = all.filter((match) => {
      if (gameMode && match.gameMode?.game_mode !== gameMode) return false
      if (startTime && match.updatedAt < startTime) return false
      if (endTime && match.updatedAt > endTime) return false
      if (win && win !== 'unknown') {
        if (win === 'win' && match.win !== true) return false
        if (win === 'lose' && match.win !== false) return false
      }
      return true
    })

    return this.paginate(filtered, page, pageSize)
  }

  async getPlayers(filters: PlayerFilters = {}): Promise<PaginatedResult<PlayerWithStats>> {
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

    return this.paginate(
      filtered.filter((player): player is PlayerWithStats => Boolean(player)),
      page,
      pageSize,
    )
  }

  async getComments(filters: CommentFilters = {}): Promise<PaginatedResult<CommentWithPlayer>> {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, playerId, matchId, score, startTime, endTime } = filters
    let collection = db.comments.orderBy('updatedAt')

    if (playerId) {
      collection = db.comments.where('playerId').equals(playerId)
    }
    if (matchId) {
      collection = db.comments.where('matchId').equals(matchId)
    }

    const all = await collection.reverse().toArray()
    const filtered = await Promise.all(
      all
        .filter((comment) => {
          if (typeof score === 'number' && comment.score !== score) return false
          if (startTime && comment.updatedAt < startTime) return false
          if (endTime && comment.updatedAt > endTime) return false
          return true
        })
        .map(async (comment) => {
          const player = await db.players.where('playerId').equals(comment.playerId).first()
          const enriched: CommentWithPlayer = {
            ...comment,
            playerName: player?.name ?? player?.nameList?.[0],
          }
          return enriched
        }),
    )

    return this.paginate(filtered, page, pageSize)
  }

  async getPlayerHistory(playerId: string) {
    const [player, comments] = await Promise.all([
      db.players.where('playerId').equals(playerId).first(),
      db.comments.where('playerId').equals(playerId).toArray(),
    ])

    if (!player) {
      return { player: null, comments }
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

    return { player: detailed, comments }
  }

  private computeWin(state: GlobalMatchData): boolean | null {
    if (!state.game.winner) return null
    if (!state.me.team) return null

    if (state.game.winner === state.me.team) {
      return true
    }
    if (state.game.winner === DotaTeamOpposite(state.me.team)) {
      return false
    }
    return null
  }

  private paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
    const total = items.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      items: items.slice(start, end),
      page,
      pageSize,
      total,
    }
  }
}

function DotaTeamOpposite(team: GlobalMatchData['me']['team']): GlobalMatchData['me']['team'] {
  switch (team) {
    case 'radiant':
      return Dota2Team.DIRE
    case 'dire':
      return Dota2Team.RADIANT
    default:
      return Dota2Team.NONE
  }
}

