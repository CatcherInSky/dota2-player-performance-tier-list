import type { MatchRecord } from '../../shared/types/database'
import { Dota2Team } from '../../shared/types/dota2'

type Translate = (key: string) => string

export function normalizePlayerTeam(team: unknown): Dota2Team | null {
  if (team === Dota2Team.RADIANT || team === Dota2Team.DIRE || team === Dota2Team.NONE) {
    return team
  }
  if (team === 2) return Dota2Team.RADIANT
  if (team === 3) return Dota2Team.DIRE
  return null
}

export function formatMatchResult(match: MatchRecord, t: Translate): string {
  if (!match?.winner) {
    return t('matches.unknown')
  }

  if (match.winner === Dota2Team.NONE) {
    return t('matches.winner.none')
  }

  const playerTeam = normalizePlayerTeam(match.players?.find((player) => player.steamId === match.playerId)?.team ?? null)

  if (playerTeam && (playerTeam === Dota2Team.RADIANT || playerTeam === Dota2Team.DIRE)) {
    if (match.winner === playerTeam) {
      return t('matches.win')
    }
    return t('matches.lose')
  }

  return t(`matches.winner.${match.winner}`)
}

