import { db } from '../db'
import type { MatchFilters, PaginatedResult } from '../../shared/types/api'
import type { MatchRecord } from '../../shared/types/database'
import type { GlobalMatchData, Dota2Player } from '../../shared/types/dota2'
import { generateId } from '../../shared/utils/id'
import { Logger } from '../../shared/utils/logger'
import { DEFAULT_PAGE_SIZE } from './pagination'
import { Dota2Team } from '../../shared/types/dota2'
import { filterRosterPlayers } from '../../shared/utils/roster'

interface UpsertOptions {
  allowCreate?: boolean
}

/**
 * MatchesRepository - 比赛数据仓库
 * 负责比赛记录的创建、更新、查询等数据库操作
 */
export class MatchesRepository {
  private logger = new Logger({ namespace: 'MatchesRepository' })

  /**
   * 从GlobalMatchData创建或更新比赛记录
   * - 如果记录不存在且allowCreate=true，则创建新记录
   * - 如果记录已存在且winner为空，则更新记录
   * - 如果记录已存在且winner不为空，则返回现有记录（不再更新）
   * @param state - 全局比赛数据
   * @param options - 选项（allowCreate: 是否允许创建新记录）
   * @returns 比赛记录
   */
  async createOrUpdateFromState(state: GlobalMatchData, options: UpsertOptions = {}): Promise<MatchRecord> {
    const { allowCreate = true } = options
    const matchId = state.match_info.pseudo_match_id
    if (!matchId) {
      throw new Error('Missing match_id in GlobalMatchData')
    }

    const existing = await db.matches.where('matchId').equals(matchId).first()
    if (!existing && !allowCreate) {
      throw new Error(`Match record ${matchId} not found and creation not allowed`)
    }

    if (existing && existing.winner != null) {
      return existing
    }

    const timestamp = Date.now()
    const rosterPlayers = this.filterPlayers(state.roster.players)

    const record: MatchRecord = {
      uuid: existing?.uuid ?? generateId(),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      matchId,
      playerId: state.me.steam_id,
      gameMode: state.match_info.game_mode,
      winner: state.game.winner ?? undefined,
      teamScore: state.match_info.team_score,
      gameState: state.game.game_state,
      matchState: state.game.match_state,
      me: state.me.steam_id || state.me.team ? { steam_id: state.me.steam_id, team: state.me.team } : undefined,
      players: rosterPlayers,
    }

    await db.matches.put(record)
    this.logger.debug('Upserted match record', record)
    return record
  }

  /**
   * 最终化比赛记录（比赛结束时调用）
   * 确保所有数据完整（winner, teamScore, gameState, matchState, me, players等）
   * @param state - 全局比赛数据
   * @returns 最终化的比赛记录
   */
  async finalizeFromState(state: GlobalMatchData): Promise<MatchRecord> {
    const record = await this.createOrUpdateFromState(state, { allowCreate: true })

    if (record.winner != null) {
      return record
    }

    record.updatedAt = Date.now()
    record.winner = state.game.winner ?? record.winner
    record.teamScore = state.match_info.team_score
    record.gameState = state.game.game_state ?? record.gameState
    record.matchState = state.game.match_state ?? record.matchState
    record.me = state.me.steam_id || state.me.team ? { steam_id: state.me.steam_id, team: state.me.team } : record.me
    record.players = this.filterPlayers(state.roster.players)
    await db.matches.put(record)
    this.logger.info('Finalized match record', record.matchId)
    return record
  }

  async update(matchId: string, updates: Partial<MatchRecord>): Promise<void> {
    await db.matches.where('matchId').equals(matchId).modify((record) => {
      if (record.winner != null) {
        return
      }
      Object.assign(record, updates, { updatedAt: Date.now() })
    })
  }

  async getByMatchId(matchId: string): Promise<MatchRecord | undefined> {
    return db.matches.where('matchId').equals(matchId).first()
  }

  /**
   * 查询比赛记录（支持分页和筛选）
   * 支持的筛选条件：matchId, gameMode, winner, startTime, endTime, gameState
   * @param filters - 筛选条件（包含分页参数）
   * @returns 分页结果
   */
  async query(filters: MatchFilters = {}): Promise<PaginatedResult<MatchRecord>> {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      matchId,
      gameMode,
      winner,
      startTime,
      endTime,
      gameState,
    } = filters
    const offset = (page - 1) * pageSize

    let collection = matchId
      ? db.matches.where('matchId').equals(matchId)
      : db.matches.orderBy('updatedAt').reverse()

    collection = collection.filter((match) => {
      if (matchId && match.matchId !== matchId) return false
      if (gameMode && match.gameMode?.game_mode !== gameMode && match.gameMode?.lobby_type !== gameMode) return false
      if (startTime && match.updatedAt < startTime) return false
      if (endTime && match.updatedAt > endTime) return false
      if (gameState && match.gameState !== gameState) return false
      if (winner) {
        if (winner === 'unknown') {
          if (match.winner != null) return false
        } else if (winner === Dota2Team.NONE) {
          if (match.winner && match.winner !== Dota2Team.NONE) return false
        } else if (match.winner !== winner) {
          return false
        }
      }
      return true
    })

    const total = await collection.clone().count()
    const items = await collection.offset(offset).limit(pageSize).toArray()

    return {
      items,
      page,
      pageSize,
      total,
    }
  }

  private filterPlayers(players?: Dota2Player[] | null): Dota2Player[] {
    return filterRosterPlayers(players)
  }
}

