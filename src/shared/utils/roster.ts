import type { Dota2Player } from '../types/dota2'

export function isValidRosterPlayer(player: Dota2Player | null | undefined): player is Dota2Player {
  if (!player) return false
  if (typeof player.player_index === 'number' && player.player_index >= 10) return false
  if (!player.hero || typeof player.hero !== 'string') return false
  if (player.hero.trim().length === 0) return false
  return true
}

export function filterRosterPlayers(players: Dota2Player[] | undefined | null): Dota2Player[] {
  if (!players?.length) return []
  return players.filter((player) => isValidRosterPlayer(player))
}


