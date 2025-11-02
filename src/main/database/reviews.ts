/**
 * 点评数据操作
 * 基于 PRD 7.4 章节
 */

import { db } from './db';
import type { Review } from '@shared/types/database';

export interface ReviewInput {
  steam_id: string;
  score?: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

/**
 * 保存玩家点评
 */
export async function saveReviews(
  matchId: string,
  reviews: ReviewInput[],
  localSteamId: string
): Promise<void> {
  for (const review of reviews) {
    if (!review.score) continue; // 跳过未评分的玩家

    // 保存点评
    await db.reviews.add({
      id: `${matchId}_${review.steam_id}`,
      match_id: matchId,
      steam_id: review.steam_id,
      reviewer_steam_id: localSteamId,
      score: review.score,
      comment: review.comment || '',
      created_at: Date.now(),
    });

    // 更新玩家统计（冗余字段）
    const playerReviews = await db.reviews
      .where('[steam_id+reviewer_steam_id]')
      .equals([review.steam_id, localSteamId])
      .toArray();

    const avgScore =
      playerReviews.reduce((sum, r) => sum + r.score, 0) / playerReviews.length;

    await db.players.update(review.steam_id, {
      avg_score: avgScore,
      review_count: playerReviews.length,
      last_review_score: review.score,
      last_review_comment: review.comment,
    });
  }
}

/**
 * 获取玩家的所有点评
 */
export async function getPlayerReviews(
  steamId: string,
  reviewerSteamId: string
): Promise<Review[]> {
  return await db.reviews
    .where('[steam_id+reviewer_steam_id]')
    .equals([steamId, reviewerSteamId])
    .toArray();
}

/**
 * 获取所有点评
 */
export async function getAllReviews(): Promise<Review[]> {
  return await db.reviews.orderBy('created_at').reverse().toArray();
}

