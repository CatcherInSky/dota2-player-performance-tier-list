/**
 * 数据快照缓存机制
 * 缓存 onInfoUpdates2 的最新数据，供 match_ended 事件使用
 */

import type { Dota2InfoUpdates } from '../types/dota2-gep';

interface CachedInfo {
  data: Dota2InfoUpdates;
  timestamp: number; // 缓存时间戳
}

class DataCache {
  private cache: CachedInfo | null = null;
  private readonly MAX_AGE = 5 * 60 * 1000; // 5分钟过期

  /**
   * 更新缓存
   */
  updateCache(info: Dota2InfoUpdates): void {
    this.cache = {
      data: info,
      timestamp: Date.now(),
    };
    console.log('[DataCache] Cache updated at', new Date(this.cache.timestamp).toISOString());
  }

  /**
   * 获取缓存的快照
   */
  getCachedInfo(): Dota2InfoUpdates | null {
    if (!this.cache) {
      return null;
    }

    // 检查缓存是否过期
    const age = Date.now() - this.cache.timestamp;
    if (age > this.MAX_AGE) {
      console.warn('[DataCache] Cache expired, age:', age, 'ms');
      this.cache = null;
      return null;
    }

    return this.cache.data;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
    console.log('[DataCache] Cache cleared');
  }

  /**
   * 检查缓存是否存在且有效
   */
  hasValidCache(): boolean {
    if (!this.cache) {
      return false;
    }

    const age = Date.now() - this.cache.timestamp;
    return age <= this.MAX_AGE;
  }

  /**
   * 获取缓存年龄（毫秒）
   */
  getCacheAge(): number | null {
    if (!this.cache) {
      return null;
    }
    return Date.now() - this.cache.timestamp;
  }
}

// 导出单例
export const dataCache = new DataCache();

