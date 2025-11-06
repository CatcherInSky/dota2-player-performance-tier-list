/**
 * Players Repository
 * 玩家表操作封装
 */

import { db, Player } from '../database';

export class PlayersRepository {
  /**
   * 创建玩家记录
   */
  async create(player: Omit<Player, 'uuid'>): Promise<string> {
    const uuid = this.generateUUID();
    await db.players.add({
      ...player,
      uuid,
    });
    return uuid;
  }

  /**
   * 更新玩家记录
   */
  async update(uuid: string, updates: Partial<Player>): Promise<void> {
    await db.players.update(uuid, updates);
  }

  /**
   * 根据 UUID 查找玩家
   */
  async findById(uuid: string): Promise<Player | undefined> {
    return await db.players.get(uuid);
  }

  /**
   * 根据 player_id 查找玩家
   */
  async findByPlayerId(playerId: string | number): Promise<Player | undefined> {
    return await db.players.where('player_id').equals(playerId).first();
  }

  /**
   * 查找所有玩家
   */
  async findAll(): Promise<Player[]> {
    return await db.players.toArray();
  }

  /**
   * 根据 player_id 列表查找玩家
   */
  async findByPlayerIds(playerIds: (string | number)[]): Promise<Player[]> {
    return await db.players
      .where('player_id')
      .anyOf(playerIds)
      .toArray();
  }

  /**
   * 按 last_seen 降序排序查找玩家
   */
  async findAllOrderByLastSeen(limit?: number): Promise<Player[]> {
    let query = db.players.orderBy('last_seen').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return await query.toArray();
  }

  /**
   * 检查 player_id 是否已存在
   */
  async exists(playerId: string | number): Promise<boolean> {
    const player = await this.findByPlayerId(playerId);
    return player !== undefined;
  }

  /**
   * 更新或创建玩家记录
   * 如果 player_id 存在则更新，否则创建
   */
  async upsert(player: Omit<Player, 'uuid'>): Promise<string> {
    const existing = await this.findByPlayerId(player.player_id);
    
    if (existing) {
      // 更新现有记录
      const updates: Partial<Player> = {
        last_seen: player.last_seen,
      };
      
      // 如果昵称发生变化，更新 current_name 和 previous_names
      if (player.current_name !== existing.current_name) {
        updates.current_name = player.current_name;
        
        // 将旧昵称添加到 previous_names（如果不存在）
        const previousNames = existing.previous_names || [];
        if (!previousNames.includes(existing.current_name)) {
          updates.previous_names = [...previousNames, existing.current_name];
        }
      }
      
      await this.update(existing.uuid, updates);
      return existing.uuid;
    } else {
      // 创建新记录
      return await this.create(player);
    }
  }

  /**
   * 删除玩家记录
   */
  async delete(uuid: string): Promise<void> {
    await db.players.delete(uuid);
  }

  /**
   * 删除所有玩家记录
   */
  async deleteAll(): Promise<void> {
    await db.players.clear();
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

export const playersRepository = new PlayersRepository();

