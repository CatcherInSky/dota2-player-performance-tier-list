/**
 * 胜率计算工具
 * 计算友方胜率、敌方胜率、自己的胜率
 */

import { matchesRepository } from '../db/repositories/matches.repository';
import type { Match } from '../db/database';

/**
 * 获取玩家所在队伍
 */
function getPlayerTeam(match: Match, playerId: string | number): 'radiant' | 'dire' | null {
  // player_1_id 到 player_5_id 为天辉
  for (let i = 1; i <= 5; i++) {
    if ((match as any)[`player_${i}_id`] === playerId) {
      return 'radiant';
    }
  }
  // player_6_id 到 player_10_id 为夜魇
  for (let i = 6; i <= 10; i++) {
    if ((match as any)[`player_${i}_id`] === playerId) {
      return 'dire';
    }
  }
  return null;
}

/**
 * 计算友方胜率（同队胜率）
 */
export async function calculateAllyWinRate(
  playerId: string | number,
  accountId: string | number
): Promise<number | null> {
  try {
    // 查找所有包含该玩家的比赛
    const allMatches = await matchesRepository.findAll();
    const playerMatches = allMatches.filter((match) => {
      for (let i = 1; i <= 10; i++) {
        if ((match as any)[`player_${i}_id`] === playerId) {
          return true;
        }
      }
      return false;
    });

    if (playerMatches.length === 0) {
      return null;
    }

    // 筛选出同队的比赛
    const allyMatches = playerMatches.filter((match) => {
      const playerTeam = getPlayerTeam(match, playerId);
      const accountTeam = getPlayerTeam(match, accountId);
      return playerTeam !== null && accountTeam !== null && playerTeam === accountTeam;
    });

    if (allyMatches.length === 0) {
      return null;
    }

    // 计算胜率
    const wins = allyMatches.filter((match) => {
      const playerTeam = getPlayerTeam(match, playerId);
      return match.winner === playerTeam;
    }).length;

    return (wins / allyMatches.length) * 100;
  } catch (error) {
    console.error('[WinRateCalculator] Error calculating ally win rate:', error);
    return null;
  }
}

/**
 * 计算敌方胜率（对战胜率）
 */
export async function calculateEnemyWinRate(
  playerId: string | number,
  accountId: string | number
): Promise<number | null> {
  try {
    // 查找所有包含该玩家的比赛
    const allMatches = await matchesRepository.findAll();
    const playerMatches = allMatches.filter((match) => {
      for (let i = 1; i <= 10; i++) {
        if ((match as any)[`player_${i}_id`] === playerId) {
          return true;
        }
      }
      return false;
    });

    if (playerMatches.length === 0) {
      return null;
    }

    // 筛选出对战的比赛
    const enemyMatches = playerMatches.filter((match) => {
      const playerTeam = getPlayerTeam(match, playerId);
      const accountTeam = getPlayerTeam(match, accountId);
      return playerTeam !== null && accountTeam !== null && playerTeam !== accountTeam;
    });

    if (enemyMatches.length === 0) {
      return null;
    }

    // 计算胜率（敌方胜利 = 玩家失败）
    const enemyWins = enemyMatches.filter((match) => {
      const playerTeam = getPlayerTeam(match, playerId);
      return match.winner !== playerTeam;
    }).length;

    return (enemyWins / enemyMatches.length) * 100;
  } catch (error) {
    console.error('[WinRateCalculator] Error calculating enemy win rate:', error);
    return null;
  }
}

/**
 * 计算自己的胜率
 */
export async function calculateSelfWinRate(
  accountId: string | number
): Promise<number | null> {
  try {
    // 查找所有包含该账户的比赛（作为 player_id）
    const matches = await matchesRepository.findByPlayerId(accountId);

    if (matches.length === 0) {
      return null;
    }

    // 计算胜率
    const wins = matches.filter((match) => {
      const accountTeam = getPlayerTeam(match, accountId);
      return match.winner === accountTeam;
    }).length;

    return (wins / matches.length) * 100;
  } catch (error) {
    console.error('[WinRateCalculator] Error calculating self win rate:', error);
    return null;
  }
}

