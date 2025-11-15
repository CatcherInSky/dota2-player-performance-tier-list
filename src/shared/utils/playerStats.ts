import type { CommentRecord, MatchRecord } from '../types/database'
import { Dota2Team, Dota2TeamId, type Dota2TeamKey } from '../types/dota2'

export interface PlayerHistoryStats {
  winRate: number | null
  wins: number
  totalMatches: number
  averageScore: number | null
  comments: CommentRecord[]
}

/**
 * 标准化队伍标识
 * 将数字类型的队伍ID（Dota2TeamId）转换为字符串类型的队伍key（Dota2TeamKey）
 * @returns 标准化后的队伍key，如果无效则返回null
 */
export function normalizeTeam(team: number | Dota2TeamKey | undefined | null): Dota2TeamKey | null {
  if (team == null) return null
  if (typeof team === 'string') {
    if (team === Dota2Team.RADIANT || team === Dota2Team.DIRE) return team
    return null
  }
  if (team === Dota2TeamId.RADIANT) return Dota2Team.RADIANT
  if (team === Dota2TeamId.DIRE) return Dota2Team.DIRE
  return null
}

export function getPlayerTeam(match: MatchRecord, playerId: string): Dota2TeamKey | null {
  const rosterPlayer = match.players?.find((player) => player.steamId === playerId)
  return normalizeTeam(rosterPlayer?.team)
}

/**
 * 计算玩家的胜率
 * 遍历所有比赛记录，统计该玩家所在队伍的胜利场数和总场数
 * @returns 包含wins、totalMatches、winRate的对象
 */
export function calculateWinRate(matches: MatchRecord[], playerId: string): {
  wins: number
  totalMatches: number
  winRate: number | null
} {
  if (!matches?.length) {
    return { wins: 0, totalMatches: 0, winRate: null }
  }

  let wins = 0
  let totalMatches = 0

  matches.forEach((match) => {
    const playerTeam = getPlayerTeam(match, playerId)
    const winner = match.winner ?? null
    if (!playerTeam || !winner || winner === Dota2Team.NONE) {
      return
    }
    totalMatches += 1
    if (winner === playerTeam) {
      wins += 1
    }
  })

  return {
    wins,
    totalMatches,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : null,
  }
}

/**
 * 计算平均评分
 * @returns 平均分（1-5），如果没有评价则返回null
 */
export function calculateAverageScore(comments: CommentRecord[]): number | null {
  if (!comments?.length) return null
  const scores = comments.map((comment) => comment.score).filter((score): score is number => typeof score === 'number')
  if (!scores.length) return null
  const total = scores.reduce((acc, score) => acc + score, 0)
  return total / scores.length
}

/**
 * 构建玩家历史统计数据
 * 整合比赛记录和评价记录，计算胜率、平均分等统计数据
 * @returns 包含wins、totalMatches、winRate、averageScore、comments的对象
 */
export function buildPlayerHistoryStats(
  matches: MatchRecord[] | undefined,
  comments: CommentRecord[] | undefined,
  playerId: string,
): PlayerHistoryStats {
  const safeMatches = matches ?? []
  const safeComments = comments ?? []
  const { wins, totalMatches, winRate } = calculateWinRate(safeMatches, playerId)
  const averageScore = calculateAverageScore(safeComments)
  return {
    wins,
    totalMatches,
    winRate,
    averageScore,
    comments: safeComments,
  }
}

/**
 * 合并评价文本
 * 将所有评价记录的comment字段合并为一个字符串，用分隔符连接
 * @returns 包含合并后的文本和是否有内容的标志
 */
export function joinComments(
  comments: CommentRecord[] | undefined,
  separator = ' / ',
): { text: string; hasContent: boolean } {
  const items =
    comments
      ?.map((comment) => (comment.comment ?? '').trim())
      .filter((item) => item.length > 0) ?? []
  if (!items.length) {
    return { text: '--', hasContent: false }
  }
  return { text: items.join(separator), hasContent: true }
}
