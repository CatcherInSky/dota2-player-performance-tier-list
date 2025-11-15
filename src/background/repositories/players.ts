import Dexie from 'dexie'
import { db } from '../db'
import type { PlayerFilters } from '../../shared/types/api'
import type { PlayerWithStats } from '../../shared/types/api'
import type { PlayerRecord, HeroStat, MatchStat } from '../../shared/types/database'
import type { GlobalMatchData, Dota2TeamKey } from '../../shared/types/dota2'
import { generateId } from '../../shared/utils/id'
import { paginate, DEFAULT_PAGE_SIZE } from './pagination'
import { filterRosterPlayers } from '../../shared/utils/roster'

/**
 * PlayersRepository - 玩家数据仓库
 * 负责玩家记录的同步、更新、查询等数据库操作
 */
export class PlayersRepository {
  /**
   * 从比赛数据同步玩家信息
   * 对于每个玩家：
   * - 更新name和nameList（如果名称不在列表中则添加）
   * - 更新heroList统计（总场数、胜利场数）
   * - 更新matchList统计（比赛ID、队伍、位置、是否胜利、时间戳）
   * @param state - 全局比赛数据
   */
  async syncFromMatch(state: GlobalMatchData): Promise<void> {
    const players = filterRosterPlayers(state.roster.players)
    if (!players.length) return

    const matchId = state.match_info.pseudo_match_id
    const matchWinner = state.game.winner
    const timestamp = Date.now()

    const executor = async () => {
      for (const player of players) {
        if (!player.steamId) continue
        const existing = await db.players.where('playerId').equals(player.steamId).first()

        // 更新name和nameList
        const nameList = existing?.nameList ?? []
        if (player.name && !nameList.includes(player.name)) {
          nameList.push(player.name)
        }

        // 更新heroList统计
        const heroList: HeroStat[] = existing?.heroList ?? []
        if (player.hero) {
          const heroIndex = heroList.findIndex((h) => h.hero === player.hero)
          const isWin = matchWinner && player.team && matchWinner === player.team

          if (heroIndex >= 0) {
            // 更新现有英雄统计
            heroList[heroIndex].totalGames += 1
            if (isWin) {
              heroList[heroIndex].wins += 1
            }
          } else {
            // 添加新英雄统计
            heroList.push({
              hero: player.hero,
              totalGames: 1,
              wins: isWin ? 1 : 0,
            })
          }
        }

        // 更新matchList统计
        const matchList: MatchStat[] = existing?.matchList ?? []
        if (matchId) {
          const matchIndex = matchList.findIndex((m) => m.matchId === matchId)
          const isWin = !!(matchWinner && player.team && matchWinner === player.team)

          const matchStat: MatchStat = {
            matchId,
            team: (player.team as Dota2TeamKey) || 'none',
            role: player.role,
            isWin,
            timestamp,
          }

          if (matchIndex >= 0) {
            // 更新现有比赛统计
            matchList[matchIndex] = matchStat
          } else {
            // 添加新比赛统计
            matchList.push(matchStat)
          }
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

  /**
   * 查询玩家记录（支持分页和筛选）
   * 支持的筛选条件：keyword（名称/ID模糊匹配）, matchId, hero, startTime, endTime
   * 会计算并返回：encounterCount, averageScore, teammateGames, opponentGames等统计数据
   * @param filters - 筛选条件（包含分页参数）
   * @returns 分页结果（包含丰富的统计信息）
   */
  async query(filters: PlayerFilters = {}) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, keyword, matchId, startTime, endTime, hero } = filters
    const collection = db.players.orderBy('updatedAt')
    const all = await collection.reverse().toArray()

    const filtered = await Promise.all(
      all
        .filter((player) => {
          if (keyword) {
            const haystack = [player.name, player.playerId, ...player.nameList].join(' ').toLowerCase()
            if (!haystack.includes(keyword.toLowerCase())) return false
          }
          if (matchId && !player.matchList.some((m) => m.matchId === matchId)) return false
          if (hero && !player.heroList.some((h) => h.hero.toLowerCase().includes(hero.toLowerCase()))) return false
          return true
        })
        .map(async (player) => {
          const comments = await db.comments.where('playerId').equals(player.playerId).toArray()
          const scores = comments.map((comment) => comment.score)
          const averageScore = scores.length ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length : null

          // 从matchList获取时间戳
          const timestamps = (player.matchList || []).map((m) => {
            if (typeof m === 'string') return Date.now() // 旧格式，使用当前时间作为占位符
            return m.timestamp
          }).sort((a, b) => a - b)
          const firstEncounter = timestamps[0]
          const lastEncounter = timestamps[timestamps.length - 1]

          if (startTime && (!lastEncounter || lastEncounter < startTime)) return null
          if (endTime && (!firstEncounter || firstEncounter > endTime)) return null

          // 计算队友/对手统计
          let teammateGames = 0
          let teammateWins = 0
          let opponentGames = 0
          let opponentWins = 0

          if (player.matchList && player.matchList.length > 0) {
            // 提取有效的matchIds
            const matchIds: string[] = []
            for (const item of player.matchList) {
              if (typeof item === 'string') {
                if (item) matchIds.push(item)
              } else if (item && typeof item === 'object' && 'matchId' in item) {
                const matchId = item.matchId
                if (matchId && typeof matchId === 'string') {
                  matchIds.push(matchId)
                }
              }
            }

            if (matchIds.length > 0) {
              const matches = await db.matches.where('matchId').anyOf(matchIds).toArray()
              
              for (const matchStat of player.matchList) {
                if (typeof matchStat === 'string') continue // 跳过旧格式
                if (!matchStat || typeof matchStat !== 'object' || !('matchId' in matchStat)) continue
                
                const match = matches.find((m) => m.matchId === matchStat.matchId)
                if (!match || !match.me?.team) continue

                if (matchStat.team === match.me.team) {
                  teammateGames++
                  if (matchStat.isWin) teammateWins++
                } else {
                  opponentGames++
                  if (matchStat.isWin) opponentWins++
                }
              }
            }
          }

          const teammateWinRate = teammateGames > 0 ? (teammateWins / teammateGames) * 100 : null
          const opponentWinRate = opponentGames > 0 ? (opponentWins / opponentGames) * 100 : null

          const enriched: PlayerWithStats = {
            ...player,
            encounterCount: player.matchList?.length || 0,
            averageScore,
            firstEncounter,
            lastEncounter,
            teammateGames,
            teammateWins,
            teammateWinRate,
            opponentGames,
            opponentWins,
            opponentWinRate,
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

  /**
   * 获取玩家的完整历史记录
   * 包括：玩家基本信息、所有评价记录、所有遭遇的比赛记录
   * @param playerId - 玩家Steam ID
   * @returns 包含player、comments、matches的对象
   */
  async getHistory(playerId: string) {
    try {
      console.log('[PlayersRepository.getHistory] Querying player:', playerId)
      const player = await db.players.where('playerId').equals(playerId).first()
      
      if (!player) {
        console.warn('[PlayersRepository.getHistory] Player not found:', playerId)
        // 检查数据库中是否有任何玩家
        const allPlayers = await db.players.limit(5).toArray()
        console.log('[PlayersRepository.getHistory] Sample players in DB:', allPlayers.map((p) => p.playerId))
        return { player: null, comments: [], matches: [] }
      }

      console.log('[PlayersRepository.getHistory] Player found:', {
        playerId: player.playerId,
        name: player.name,
        matchListLength: player.matchList?.length || 0,
        matchListType: Array.isArray(player.matchList) ? (player.matchList.length > 0 ? typeof player.matchList[0] : 'empty') : 'not-array',
      })

      // 安全地提取 matchIds，处理旧数据格式（可能是 string[] 或 MatchStat[]）
      const matchIds: string[] = []
      if (Array.isArray(player.matchList)) {
        for (const item of player.matchList) {
          if (typeof item === 'string') {
            // 旧格式：string[]
            if (item) matchIds.push(item)
          } else if (item && typeof item === 'object' && 'matchId' in item) {
            // 新格式：MatchStat[]
            const matchId = item.matchId
            if (matchId && typeof matchId === 'string') {
              matchIds.push(matchId)
            }
          }
        }
      }

      const comments = await db.comments.where('playerId').equals(playerId).toArray()

      console.log('[PlayersRepository.getHistory] Found comments:', comments.length, 'valid matchIds:', matchIds.length, 'matchIds:', matchIds)

      const matchRecords = matchIds.length > 0
        ? await db.matches.where('matchId').anyOf(matchIds).toArray()
        : []
      
      const timestamps = (player.matchList || []).map((m) => m.timestamp).sort((a, b) => a - b)
      const scores = comments.map((comment) => comment.score)
      const averageScore = scores.length ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length : null

      const detailed: PlayerWithStats = {
        ...player,
        encounterCount: player.matchList?.length || 0,
        firstEncounter: timestamps[0],
        lastEncounter: timestamps[timestamps.length - 1],
        averageScore,
      }

      console.log('[PlayersRepository.getHistory] Returning data:', {
        player: !!detailed,
        comments: comments.length,
        matches: matchRecords.length,
      })

      return { player: detailed, comments, matches: matchRecords }
    } catch (error) {
      console.error('[PlayersRepository.getHistory] Error:', error)
      throw error
    }
  }
}


