import type { CommentRecord, MatchRecord } from '../types/database'
import { Dota2Team, Dota2TeamId, type Dota2TeamKey } from '../types/dota2'

export interface PlayerHistoryStats {
  winRate: number | null
  wins: number
  totalMatches: number
  averageScore: number | null
  comments: CommentRecord[]
}

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

export function calculateAverageScore(comments: CommentRecord[]): number | null {
  if (!comments?.length) return null
  const scores = comments.map((comment) => comment.score).filter((score): score is number => typeof score === 'number')
  if (!scores.length) return null
  const total = scores.reduce((acc, score) => acc + score, 0)
  return total / scores.length
}

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
