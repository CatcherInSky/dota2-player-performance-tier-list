/**
 * 玩家数据操作
 * 基于 PRD 7.2 章节
 */

import { db } from './db';
import type { Player } from '@shared/types/database';
import type { RosterPlayer } from '@shared/types/gep';

/**
 * 同步玩家数据
 * 每次获取到 roster 数据时调用
 */
export async function syncPlayers(
  rosterPlayers: RosterPlayer[],
  localSteamId: string
): Promise<void> {
  // 过滤掉本地玩家
  const players = rosterPlayers.filter((p) => p.steamid !== localSteamId);

  for (const player of players) {
    const existing = await db.players.get(player.steamid);

    if (!existing) {
      // 首次遇到，创建记录
      await db.players.add({
        steam_id: player.steamid,
        account_id: parseInt(player.account_id),
        current_name: player.player_name || '匿名玩家',
        name_history: [],
        first_seen: Date.now(),
        last_seen: Date.now(),
        review_count: 0,
      });
    } else {
      // 更新昵称和最后见到时间
      const updates: Partial<Player> = {
        last_seen: Date.now(),
      };

      // 检查昵称是否变化
      if (player.player_name && existing.current_name !== player.player_name) {
        const nameHistory = new Set(existing.name_history || []);
        nameHistory.add(existing.current_name);
        nameHistory.delete(player.player_name); // 不包含当前名称

        updates.current_name = player.player_name;
        updates.name_history = Array.from(nameHistory);
      }

      await db.players.update(player.steamid, updates);
    }
  }
}

/**
 * 获取玩家历史评分统计
 */
export async function getPlayerReviewStats(
  steamId: string,
  reviewerSteamId: string
): Promise<{
  avgScore: number;
  count: number;
  lastScore?: number;
  lastComment?: string;
} | null> {
  const reviews = await db.reviews
    .where('[steam_id+reviewer_steam_id]')
    .equals([steamId, reviewerSteamId])
    .toArray();

  if (reviews.length === 0) return null;

  const avgScore = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;
  const lastReview = reviews[reviews.length - 1];

  return {
    avgScore,
    count: reviews.length,
    lastScore: lastReview.score,
    lastComment: lastReview.comment,
  };
}

/**
 * 获取所有玩家
 */
export async function getAllPlayers(): Promise<Player[]> {
  return await db.players.orderBy('last_seen').reverse().toArray();
}

