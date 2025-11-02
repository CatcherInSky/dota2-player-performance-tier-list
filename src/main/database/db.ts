/**
 * IndexedDB 数据库实例（使用 Dexie.js）
 * 基于 PRD 4.3 章节
 */

import Dexie, { Table } from 'dexie';
import type { Match, Player, MatchPlayer, Review } from '@shared/types/database';

export class AppDatabase extends Dexie {
  matches!: Table<Match, string>;
  players!: Table<Player, string>;
  match_players!: Table<MatchPlayer, string>;
  reviews!: Table<Review, string>;

  constructor() {
    super('Dota2PlayerPerformance');

    this.version(1).stores({
      matches: 'id, match_id, start_time, created_at',
      players: 'steam_id, account_id, current_name, last_seen',
      match_players: 'id, match_id, steam_id, [match_id+steam_id]',
      reviews: 'id, match_id, steam_id, [steam_id+reviewer_steam_id], created_at',
    });
  }
}

// 导出单例实例
export const db = new AppDatabase();

