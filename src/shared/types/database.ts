/**
 * 数据库类型定义
 * 基于 PRD 4.2 章节
 */

export interface Match {
  id: string; // 主键，使用 pseudo_match_id 或自生成 UUID
  match_id?: string; // Dota2 官方 Match ID（如果可获取）
  game_mode: string; // 游戏模式
  start_time: number; // 游戏开始时间戳
  end_time?: number; // 游戏结束时间戳
  duration?: number; // 游戏时长（秒）
  result: 'win' | 'lose' | 'unknown'; // 本方胜负
  player_team: 'radiant' | 'dire'; // 本地玩家所在队伍
  radiant_score?: number; // 天辉击杀数
  dire_score?: number; // 夜魇击杀数
  created_at: number; // 记录创建时间
}

export interface Player {
  steam_id: string; // 主键，64位 Steam ID
  account_id: number; // 32位账户ID
  current_name: string; // 当前昵称
  name_history: string[]; // 曾用名列表（不包含当前名称，去重）
  first_seen: number; // 首次遇到时间戳
  last_seen: number; // 最后遇到时间戳
  // 冗余统计字段（优化查询性能）
  avg_score?: number; // 平均评分
  review_count?: number; // 被评价总次数
  last_review_score?: number; // 最后一次评分
  last_review_comment?: string; // 最后一次评论
}

export interface MatchPlayer {
  id: string; // 主键，`${match_id}_${steam_id}`
  match_id: string; // 外键，关联 matches.id
  steam_id: string; // 外键，关联 players.steam_id
  team: 'radiant' | 'dire'; // 所在队伍
  hero: string; // 英雄名称（如 npc_dota_hero_pudge）
  hero_id: number; // 英雄ID
  kills?: number; // 击杀数
  deaths?: number; // 死亡数
  assists?: number; // 助攻数
  level?: number; // 最终等级
}

export interface Review {
  id: string; // 主键，`${match_id}_${steam_id}`
  match_id: string; // 外键，关联 matches.id
  steam_id: string; // 被评价的玩家 Steam ID
  reviewer_steam_id: string; // 评价者 Steam ID（本地玩家）
  score: 1 | 2 | 3 | 4 | 5; // 评分（1-5星）
  comment: string; // 评论文本
  created_at: number; // 评价创建时间
}

// 导出数据格式
export interface ExportData {
  version: string; // 数据格式版本，如 "1.0"
  export_time: number;
  app_version: string;
  data: {
    matches: Match[];
    players: Player[];
    match_players: MatchPlayer[];
    reviews: Review[];
  };
  metadata: {
    total_matches: number;
    total_players: number;
    total_reviews: number;
  };
}

