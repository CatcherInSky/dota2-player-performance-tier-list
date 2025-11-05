/**
 * 数据库服务
 * 封装所有数据库操作
 */

import { db } from './db';
import { recordMatch, getRecentMatches, getAllMatches } from './matches';
import { syncPlayers, getPlayerReviewStats, getAllPlayers } from './players';
import { saveReviews, getPlayerReviews, getAllReviews } from './reviews';
import { deleteAllData, exportAllData, importAllData } from './index';

/**
 * 数据库服务类
 */
export class DatabaseService {
  // 比赛相关
  matches = {
    record: recordMatch,
    getRecent: getRecentMatches,
    getAll: getAllMatches,
  };

  // 玩家相关
  players = {
    sync: syncPlayers,
    getReviewStats: getPlayerReviewStats,
    getAll: getAllPlayers,
  };

  // 点评相关
  reviews = {
    save: saveReviews,
    getByPlayer: getPlayerReviews,
    getAll: getAllReviews,
  };

  // 数据管理
  data = {
    deleteAll: deleteAllData,
    export: exportAllData,
    import: importAllData,
  };

  /**
   * 获取数据库实例
   */
  getDb() {
    return db;
  }

  /**
   * 检查数据库是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await db.open();
      return true;
    } catch (error) {
      console.error('[DatabaseService] Database not available:', error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    const [matchCount, playerCount, reviewCount] = await Promise.all([
      db.matches.count(),
      db.players.count(),
      db.reviews.count(),
    ]);

    return {
      matches: matchCount,
      players: playerCount,
      reviews: reviewCount,
    };
  }
}

// 单例导出
export const dbService = new DatabaseService();

