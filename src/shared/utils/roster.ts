import type { Dota2Player } from '../types/dota2'

/**
 * 判断玩家是否为有效的roster玩家
 * 检查条件：玩家存在、player_index < 10、hero存在且非空
 * @returns true表示玩家有效，false表示玩家无效
 */
export function isValidRosterPlayer(player: Dota2Player | null | undefined): player is Dota2Player {
  if (!player) return false
  if (typeof player.player_index === 'number' && player.player_index >= 10) return false
  if (!player.hero || typeof player.hero !== 'string') return false
  if (player.hero.trim().length === 0) return false
  return true
}

/**
 * 过滤有效的roster玩家
 * 移除无效玩家（player_index >= 10、hero为空等）
 * @returns 有效的玩家列表
 */
export function filterRosterPlayers(players: Dota2Player[] | undefined | null): Dota2Player[] {
  if (!players?.length) return []
  return players.filter((player) => isValidRosterPlayer(player))
}


