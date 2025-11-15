import { Dota2Team } from '../types/dota2'
import type { PlayerViewModel } from '../types/players'

const ROLE_PRIORITY = [1, 4, 2, 8, 16] as const
const ROLE_FALLBACK_WEIGHT = ROLE_PRIORITY.length + 1

function getRoleWeight(role?: number | null): number {
  if (role == null) return ROLE_FALLBACK_WEIGHT
  const idx = ROLE_PRIORITY.indexOf(role as (typeof ROLE_PRIORITY)[number])
  if (idx !== -1) return idx
  return ROLE_FALLBACK_WEIGHT + role / 100
}

function getPlayerIndexWeight(index?: number | null): number {
  if (typeof index === 'number') return index
  return Number.MAX_SAFE_INTEGER
}

function getTeamSlotWeight(slot?: number | null): number {
  if (typeof slot === 'number') return slot
  return Number.MAX_SAFE_INTEGER
}

export type PlayerOrderVariant = 'comment' | 'history'

function sortByPlayerIndex<T extends PlayerViewModel>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      getPlayerIndexWeight(a.playerIndex) - getPlayerIndexWeight(b.playerIndex) ||
      getTeamSlotWeight(a.teamSlot) - getTeamSlotWeight(b.teamSlot),
  )
}

function sortCommentTeam<T extends PlayerViewModel>(list: T[]): T[] {
  const validRoles = list
    .map((player) => (typeof player.role === 'number' ? player.role : null))
    .filter((role): role is number => role != null)

  const rolesAreUnique =
    validRoles.length === list.length &&
    new Set(validRoles).size === list.length &&
    validRoles.every((role) => ROLE_PRIORITY.includes(role as (typeof ROLE_PRIORITY)[number]))

  if (rolesAreUnique) {
    return [...list].sort((a, b) => getRoleWeight(a.role) - getRoleWeight(b.role))
  }

  return sortByPlayerIndex(list)
}

export function sortPlayersForOverlay<T extends PlayerViewModel>(
  players: Array<T & { teamSlot?: number | null }>,
  variant: PlayerOrderVariant = 'comment',
): T[] {
  const radiant = players.filter((player) => player.team === Dota2Team.RADIANT)
  const dire = players.filter((player) => player.team === Dota2Team.DIRE)
  const others = players.filter(
    (player) => player.team !== Dota2Team.RADIANT && player.team !== Dota2Team.DIRE,
  )

  const sortTeam = (teamPlayers: Array<T & { teamSlot?: number | null }>): T[] => {
    if (variant === 'history') {
      return sortByPlayerIndex(teamPlayers)
    }
    return sortCommentTeam(teamPlayers)
  }

  const orderedRadiant = sortTeam(radiant)
  const orderedDire = sortTeam(dire)
  const orderedOthers = sortByPlayerIndex(others)

  return [...orderedRadiant, ...orderedDire, ...orderedOthers]
}

