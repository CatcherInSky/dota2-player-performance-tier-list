/**
 * Matches Repository
 * 比赛表操作封装
 */

import { db, Match } from '../database';

export class MatchesRepository {
  /**
   * 创建比赛记录
   */
  async create(match: Omit<Match, 'uuid'>): Promise<string> {
    const uuid = this.generateUUID();
    await db.matches.add({
      ...match,
      uuid,
    });
    return uuid;
  }

  /**
   * 更新比赛记录
   */
  async update(uuid: string, updates: Partial<Match>): Promise<void> {
    await db.matches.update(uuid, updates);
  }

  /**
   * 根据 UUID 查找比赛
   */
  async findById(uuid: string): Promise<Match | undefined> {
    return await db.matches.get(uuid);
  }

  /**
   * 根据 match_id 查找比赛
   */
  async findByMatchId(matchId: string | number): Promise<Match | undefined> {
    return await db.matches.where('match_id').equals(matchId).first();
  }

  /**
   * 查找所有比赛
   */
  async findAll(): Promise<Match[]> {
    return await db.matches.toArray();
  }

  /**
   * 根据 player_id 查找比赛
   */
  async findByPlayerId(playerId: string | number): Promise<Match[]> {
    return await db.matches
      .where('player_id')
      .equals(playerId)
      .toArray();
  }

  /**
   * 根据 player_id 和时间范围查找比赛
   */
  async findByPlayerIdAndTimeRange(
    playerId: string | number,
    startTime: number,
    endTime: number
  ): Promise<Match[]> {
    return await db.matches
      .where('[player_id+end_time]')
      .between([playerId, startTime], [playerId, endTime], true, true)
      .toArray();
  }

  /**
   * 根据时间范围查找比赛
   */
  async findByTimeRange(startTime: number, endTime: number): Promise<Match[]> {
    return await db.matches
      .where('end_time')
      .between(startTime, endTime, true, true)
      .toArray();
  }

  /**
   * 根据 match_mode 查找比赛
   */
  async findByMatchMode(matchMode: string): Promise<Match[]> {
    return await db.matches
      .where('match_mode')
      .equals(matchMode)
      .toArray();
  }

  /**
   * 检查 match_id 是否已存在
   */
  async exists(matchId: string | number): Promise<boolean> {
    const match = await this.findByMatchId(matchId);
    return match !== undefined;
  }

  /**
   * 删除比赛记录
   */
  async delete(uuid: string): Promise<void> {
    await db.matches.delete(uuid);
  }

  /**
   * 删除所有比赛记录
   */
  async deleteAll(): Promise<void> {
    await db.matches.clear();
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

export const matchesRepository = new MatchesRepository();

