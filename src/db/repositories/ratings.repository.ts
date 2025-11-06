/**
 * Ratings Repository
 * 评分表操作封装
 */

import { db, Rating } from '../database';

export class RatingsRepository {
  /**
   * 创建评分记录
   */
  async create(rating: Omit<Rating, 'uuid'>): Promise<string> {
    const uuid = this.generateUUID();
    await db.ratings.add({
      ...rating,
      uuid,
    });
    return uuid;
  }

  /**
   * 更新评分记录
   */
  async update(uuid: string, updates: Partial<Rating>): Promise<void> {
    await db.ratings.update(uuid, updates);
  }

  /**
   * 根据 UUID 查找评分
   */
  async findById(uuid: string): Promise<Rating | undefined> {
    return await db.ratings.get(uuid);
  }

  /**
   * 根据 player_id 查找评分
   */
  async findByPlayerId(playerId: string | number): Promise<Rating[]> {
    return await db.ratings
      .where('player_id')
      .equals(playerId)
      .toArray();
  }

  /**
   * 根据 account_id 查找评分
   */
  async findByAccountId(accountId: string | number): Promise<Rating[]> {
    return await db.ratings
      .where('account_id')
      .equals(accountId)
      .toArray();
  }

  /**
   * 根据 match_id 查找评分
   */
  async findByMatchId(matchId: string | number): Promise<Rating[]> {
    return await db.ratings
      .where('match_id')
      .equals(matchId)
      .toArray();
  }

  /**
   * 根据 player_id 和 account_id 查找评分
   * 使用复合索引 [player_id+account_id]
   */
  async findByPlayerIdAndAccountId(
    playerId: string | number,
    accountId: string | number
  ): Promise<Rating[]> {
    return await db.ratings
      .where('[player_id+account_id]')
      .equals([playerId, accountId])
      .toArray();
  }

  /**
   * 根据 player_id 和 match_id 查找评分
   */
  async findByPlayerIdAndMatchId(
    playerId: string | number,
    matchId: string | number
  ): Promise<Rating | undefined> {
    return await db.ratings
      .where('player_id')
      .equals(playerId)
      .and((rating) => rating.match_id === matchId)
      .first();
  }

  /**
   * 根据 account_id 和 match_id 查找评分
   */
  async findByAccountIdAndMatchId(
    accountId: string | number,
    matchId: string | number
  ): Promise<Rating[]> {
    return await db.ratings
      .where('account_id')
      .equals(accountId)
      .and((rating) => rating.match_id === matchId)
      .toArray();
  }

  /**
   * 根据 player_id、account_id 和 match_id 查找评分
   */
  async findByPlayerIdAndAccountIdAndMatchId(
    playerId: string | number,
    accountId: string | number,
    matchId: string | number
  ): Promise<Rating[]> {
    return await db.ratings
      .where('[player_id+account_id]')
      .equals([playerId, accountId])
      .and((rating) => rating.match_id === matchId)
      .toArray();
  }

  /**
   * 查找所有评分
   */
  async findAll(): Promise<Rating[]> {
    return await db.ratings.toArray();
  }

  /**
   * 按 created_at 降序排序查找评分
   */
  async findAllOrderByCreatedAt(limit?: number): Promise<Rating[]> {
    let query = db.ratings.orderBy('created_at').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return await query.toArray();
  }

  /**
   * 获取玩家的上次评分（按 created_at 降序，取第一条）
   */
  async getLastRatingByPlayerId(playerId: string | number): Promise<Rating | undefined> {
    return await db.ratings
      .where('player_id')
      .equals(playerId)
      .orderBy('created_at')
      .reverse()
      .first();
  }

  /**
   * 获取账户对玩家的上次评分
   */
  async getLastRatingByPlayerIdAndAccountId(
    playerId: string | number,
    accountId: string | number
  ): Promise<Rating | undefined> {
    return await db.ratings
      .where('[player_id+account_id]')
      .equals([playerId, accountId])
      .orderBy('created_at')
      .reverse()
      .first();
  }

  /**
   * 计算玩家的平均评分
   */
  async getAverageRatingByPlayerId(playerId: string | number): Promise<number | null> {
    const ratings = await this.findByPlayerId(playerId);
    if (ratings.length === 0) {
      return null;
    }
    const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
    return sum / ratings.length;
  }

  /**
   * 计算玩家的中位数评分
   */
  async getMedianRatingByPlayerId(playerId: string | number): Promise<number | null> {
    const ratings = await this.findByPlayerId(playerId);
    if (ratings.length === 0) {
      return null;
    }
    const scores = ratings.map((r) => r.score).sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    if (scores.length % 2 === 0) {
      return (scores[mid - 1] + scores[mid]) / 2;
    } else {
      return scores[mid];
    }
  }

  /**
   * 删除评分记录
   */
  async delete(uuid: string): Promise<void> {
    await db.ratings.delete(uuid);
  }

  /**
   * 删除所有评分记录
   */
  async deleteAll(): Promise<void> {
    await db.ratings.clear();
  }

  /**
   * 生成 UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const ratingsRepository = new RatingsRepository();

