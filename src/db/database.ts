/**
 * IndexedDB 数据库 Schema 定义
 * 使用 Dexie.js 管理数据库
 */

import Dexie, { Table } from 'dexie';

// 数据表类型定义
export interface Match {
  uuid: string; // UUID v4, 主键
  match_id: string | number; // 比赛 ID (pseudo_match_id)
  player_id: string | number; // 当前玩家 ID (发起记录的玩家 Steam ID)
  game_mode: string; // 'playing' | 'spectating' | 'idle'
  match_mode: string; // AllPick/AllPickRanked/SingleDraft 等
  start_time: number; // Unix 时间戳（秒）
  end_time: number; // Unix 时间戳（秒）
  winner: 'radiant' | 'dire'; // 天辉/夜魇获胜
  
  // 玩家 ID (1-10)
  player_1_id?: string | number;
  player_2_id?: string | number;
  player_3_id?: string | number;
  player_4_id?: string | number;
  player_5_id?: string | number;
  player_6_id?: string | number;
  player_7_id?: string | number;
  player_8_id?: string | number;
  player_9_id?: string | number;
  player_10_id?: string | number;
  
  // 玩家 KDA (1-10)
  player_1_kda?: string; // 格式: "K/D/A"
  player_2_kda?: string;
  player_3_kda?: string;
  player_4_kda?: string;
  player_5_kda?: string;
  player_6_kda?: string;
  player_7_kda?: string;
  player_8_kda?: string;
  player_9_kda?: string;
  player_10_kda?: string;
  
  // 玩家 GPM (1-10)
  player_1_gpm?: number;
  player_2_gpm?: number;
  player_3_gpm?: number;
  player_4_gpm?: number;
  player_5_gpm?: number;
  player_6_gpm?: number;
  player_7_gpm?: number;
  player_8_gpm?: number;
  player_9_gpm?: number;
  player_10_gpm?: number;
  
  // 玩家 XPM (1-10)
  player_1_xpm?: number;
  player_2_xpm?: number;
  player_3_xpm?: number;
  player_4_xpm?: number;
  player_5_xpm?: number;
  player_6_xpm?: number;
  player_7_xpm?: number;
  player_8_xpm?: number;
  player_9_xpm?: number;
  player_10_xpm?: number;
  
  // 玩家英雄 ID (1-10)
  player_1_hero_id?: number;
  player_2_hero_id?: number;
  player_3_hero_id?: number;
  player_4_hero_id?: number;
  player_5_hero_id?: number;
  player_6_hero_id?: number;
  player_7_hero_id?: number;
  player_8_hero_id?: number;
  player_9_hero_id?: number;
  player_10_hero_id?: number;
  
  // 玩家英雄名称 (1-10)
  player_1_hero_name?: string;
  player_2_hero_name?: string;
  player_3_hero_name?: string;
  player_4_hero_name?: string;
  player_5_hero_name?: string;
  player_6_hero_name?: string;
  player_7_hero_name?: string;
  player_8_hero_name?: string;
  player_9_hero_name?: string;
  player_10_hero_name?: string;
}

export interface Player {
  uuid: string; // UUID v4, 主键
  player_id: string | number; // Steam Account ID, 唯一索引
  current_name: string; // 当前昵称
  previous_names: string[]; // 曾用名列表 (JSON 数组)
  first_seen: number; // Unix 时间戳（秒）
  last_seen: number; // Unix 时间戳（秒）
}

export interface Account {
  uuid: string; // UUID v4, 主键
  account_id: string | number; // Steam Account ID, 索引
  name: string; // 账户名称
  created_at: number; // Unix 时间戳（秒）
  updated_at: number; // Unix 时间戳（秒）
}

export interface Rating {
  uuid: string; // UUID v4, 主键
  player_id: string | number; // 被评分的玩家 ID, 索引
  account_id: string | number; // 发起评分的账户 ID, 索引
  match_id: string | number; // 比赛 ID, 索引
  score: 1 | 2 | 3 | 4 | 5; // 1-5 星评分
  created_at: number; // Unix 时间戳（秒）
  comment?: string; // 评论内容（可选）
}

/**
 * 数据库类
 */
export class Dota2PerformanceDB extends Dexie {
  matches!: Table<Match, string>;
  players!: Table<Player, string>;
  accounts!: Table<Account, string>;
  ratings!: Table<Rating, string>;

  constructor() {
    super('Dota2PerformanceDB');
    
    // 定义数据库 Schema
    this.version(1).stores({
      // matches 表
      matches: 'uuid, match_id, player_id, end_time, match_mode, [player_id+end_time]',
      
      // players 表
      players: 'uuid, player_id, last_seen',
      
      // accounts 表
      accounts: 'uuid, account_id, updated_at',
      
      // ratings 表
      ratings: 'uuid, player_id, account_id, match_id, created_at, [player_id+account_id]',
    });
  }
}

// 导出数据库实例
export const db = new Dota2PerformanceDB();

