/**
 * 数据验证函数
 * 验证数据完整性和格式
 */

import type { Dota2InfoUpdates, Dota2RosterPlayer } from '../types/dota2-gep';
import { getPlayerId, getMatchId } from './data-extraction';

/**
 * 验证比赛数据完整性
 */
export function validateMatchData(info: Dota2InfoUpdates): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查 match_info
  if (!info.match_info) {
    errors.push('match_info 缺失');
  } else {
    // 检查 match_id
    const matchId = getMatchId(info.match_info);
    if (!matchId) {
      errors.push('match_id 缺失');
    }
  }

  // 检查 roster.players
  if (!info.roster || !info.roster.players) {
    errors.push('roster.players 缺失');
  } else if (!Array.isArray(info.roster.players)) {
    errors.push('roster.players 不是数组');
  } else if (info.roster.players.length !== 10) {
    errors.push(`roster.players 数量不正确: ${info.roster.players.length}, 期望: 10`);
  } else {
    // 验证每个玩家都有必要的字段
    info.roster.players.forEach((player, index) => {
      const playerId = getPlayerId(player);
      if (!playerId || (typeof playerId === 'string' && playerId.startsWith('temp_'))) {
        errors.push(`玩家 ${index + 1} player_id 缺失或无效`);
      }
    });
  }

  // 检查 me 信息
  if (!info.me) {
    errors.push('me 信息缺失');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证玩家数据完整性
 */
export function validatePlayerData(player: Dota2RosterPlayer): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查 player_id
  const playerId = getPlayerId(player);
  if (!playerId || (typeof playerId === 'string' && playerId.startsWith('temp_'))) {
    errors.push('player_id 缺失或无效');
  }

  // player_name 可以为空（会使用默认值）

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证评分数据完整性
 */
export function validateRatingData(data: {
  player_id?: string | number;
  account_id?: string | number;
  match_id?: string | number;
  score?: number;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查必要字段
  if (!data.player_id) {
    errors.push('player_id 缺失');
  }

  if (!data.account_id) {
    errors.push('account_id 缺失');
  }

  if (!data.match_id) {
    errors.push('match_id 缺失');
  }

  // 检查 score
  if (data.score === undefined || data.score === null) {
    errors.push('score 缺失');
  } else if (!Number.isInteger(data.score) || data.score < 1 || data.score > 5) {
    errors.push(`score 无效: ${data.score}, 期望: 1-5`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证账户数据完整性
 */
export function validateAccountData(data: {
  account_id?: string | number;
  name?: string;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.account_id) {
    errors.push('account_id 缺失');
  }

  if (!data.name || !data.name.trim()) {
    errors.push('name 缺失或为空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 检查 match_id 是否已存在（避免重复记录）
 */
export async function checkMatchIdExists(
  matchId: string | number,
  matchesRepository: { exists: (id: string | number) => Promise<boolean> }
): Promise<boolean> {
  return await matchesRepository.exists(matchId);
}

