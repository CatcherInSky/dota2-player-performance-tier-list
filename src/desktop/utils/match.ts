import type { MatchRecord } from '../../shared/types/database'
import { Dota2Team } from '../../shared/types/dota2'

type Translate = (key: string) => string

/**
 * 标准化玩家队伍标识
 * 将数字ID（2=Radiant, 3=Dire）或字符串key转换为Dota2Team枚举值
 * @returns 标准化后的队伍枚举值，如果无效则返回null
 */
export function normalizePlayerTeam(team: unknown): Dota2Team | null {
  if (team === Dota2Team.RADIANT || team === Dota2Team.DIRE || team === Dota2Team.NONE) {
    return team
  }
  if (team === 2) return Dota2Team.RADIANT
  if (team === 3) return Dota2Team.DIRE
  return null
}

/**
 * 格式化比赛结果显示文本
 * - 如果winner为空，显示"未知"
 * - 如果有playerTeam（自己的队伍）：
 *   - winner === playerTeam → "胜利"
 *   - winner !== playerTeam → "失败"
 * - 如果没有playerTeam，显示winner原始值（radiant/dire）
 * @returns 格式化后的结果显示文本
 */
export function formatMatchResult(match: MatchRecord, t: Translate): string {
  if (!match?.winner) {
    return t('matches.unknown')
  }

  if (match.winner === Dota2Team.NONE) {
    return t('matches.winner.none')
  }

  // 优先使用match.me.team，如果没有则从players数组中查找
  const playerTeam = match.me?.team
    ? normalizePlayerTeam(match.me.team)
    : normalizePlayerTeam(match.players?.find((player) => player.steamId === match.playerId)?.team ?? null)

  if (playerTeam && (playerTeam === Dota2Team.RADIANT || playerTeam === Dota2Team.DIRE)) {
    if (match.winner === playerTeam) {
      return t('matches.win')
    }
    return t('matches.lose')
  }

  return t(`matches.winner.${match.winner}`)
}

