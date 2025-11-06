/**
 * 评分统计工具
 * 获取上次评分、中位数评分、平均评分、评分文案
 */

import { ratingsRepository } from '../db/repositories/ratings.repository';
import type { Rating } from '../db/database';

/**
 * 获取上次评分
 */
export async function getLastRating(
  playerId: string | number,
  accountId?: string | number
): Promise<Rating | null> {
  try {
    if (accountId) {
      return await ratingsRepository.getLastRatingByPlayerIdAndAccountId(playerId, accountId);
    } else {
      return await ratingsRepository.getLastRatingByPlayerId(playerId);
    }
  } catch (error) {
    console.error('[RatingCalculator] Error getting last rating:', error);
    return null;
  }
}

/**
 * 计算中位数评分
 */
export async function getMedianRating(
  playerId: string | number
): Promise<number | null> {
  try {
    return await ratingsRepository.getMedianRatingByPlayerId(playerId);
  } catch (error) {
    console.error('[RatingCalculator] Error getting median rating:', error);
    return null;
  }
}

/**
 * 计算平均评分
 */
export async function getAverageRating(
  playerId: string | number
): Promise<number | null> {
  try {
    return await ratingsRepository.getAverageRatingByPlayerId(playerId);
  } catch (error) {
    console.error('[RatingCalculator] Error getting average rating:', error);
    return null;
  }
}

/**
 * 根据评分值获取文案
 */
export function getRatingText(score: number, customTexts?: Record<number, string>): string {
  const defaultTexts: Record<number, string> = {
    1: '很差',
    2: '较差',
    3: '一般',
    4: '较好',
    5: '很好',
  };

  const texts = customTexts || defaultTexts;
  return texts[score] || '未知';
}

/**
 * 四舍五入评分
 */
export function roundRating(rating: number | null): number | null {
  if (rating === null) {
    return null;
  }
  return Math.round(rating);
}

