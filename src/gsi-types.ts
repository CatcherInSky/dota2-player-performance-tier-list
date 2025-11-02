/**
 * Dota 2 Game State Integration (GSI) TypeScript 类型定义
 * 基于实际日志文件生成
 */

// ==================== 元数据 ====================

/**
 * 对局元数据
 */
export interface MatchMeta {
  /** 描述 */
  description: string;
  /** 对局ID */
  match_id: string;
  /** 总记录数 */
  total_entries: number;
  /** 开始时间 (ISO 8601) */
  start_time: string;
  /** 结束时间 (ISO 8601) */
  end_time: string;
  /** 对局时长(秒) */
  duration_seconds: number;
}

// ==================== 事件类型 ====================

/**
 * 聊天消息事件
 */
export interface ChatMessageEvent {
  game_time: number;
  event_type: 'chat_message';
  player_id: number;
  channel_type: number;
  message: string;
}

/**
 * 打赏事件
 */
export interface TipEvent {
  game_time: number;
  event_type: 'tip';
  sender_player_id: number;
  receiver_player_id: number;
  tip_amount: number;
}

/**
 * 通用游戏事件
 */
export interface GenericEvent {
  game_time: number;
  event_type: 'generic_event';
  /** JSON字符串,需要解析 */
  data: string;
}

/**
 * 通用游戏事件解析后的数据
 */
export interface GenericEventData {
  type: 
    | 'CHAT_MESSAGE_HERO_KILL'
    | 'CHAT_MESSAGE_TOWER_KILL'
    | 'CHAT_MESSAGE_COURIER_LOST'
    | 'CHAT_MESSAGE_GLYPH_USED'
    | 'CHAT_MESSAGE_EFFIGY_KILL'
    | 'CHAT_MESSAGE_HERO_BANNED';
  value?: number;
  playerid1?: number;
  playerid2?: number;
  playerid3?: number;
  playerid4?: number;
  playerid5?: number;
  playerid6?: number;
  value2?: number;
  value3?: number;
  time?: number;
}

/**
 * 所有事件类型的联合类型
 */
export type GameEvent = ChatMessageEvent | TipEvent | GenericEvent;

// ==================== 游戏数据 ====================

/**
 * 提供者信息(GSI版本信息)
 */
export interface Provider {
  name: string;
  appid: number;
  version: number;
  timestamp: number;
}

/**
 * 地图信息
 */
export interface MapInfo {
  /** 地图名称 */
  name: string;
  /** 对局ID */
  matchid: string;
  /** 游戏时间(秒) */
  game_time: number;
  /** 时钟时间(秒,可为负数表示倒计时) */
  clock_time: number;
  /** 是否白天 */
  daytime: boolean;
  /** 是否夜魔大招夜晚 */
  nightstalker_night: boolean;
  /** 天辉分数 */
  radiant_score: number;
  /** 夜魇分数 */
  dire_score: number;
  /** 游戏状态 */
  game_state: 
    | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD'
    | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
    | 'DOTA_GAMERULES_STATE_STRATEGY_TIME'
    | 'DOTA_GAMERULES_STATE_PRE_GAME'
    | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
    | 'DOTA_GAMERULES_STATE_POST_GAME';
  /** 是否暂停 */
  paused: boolean;
  /** 获胜方 */
  win_team: 'none' | 'radiant' | 'dire';
  /** 自定义游戏名称 */
  customgamename: string;
  /** 守卫购买冷却时间 */
  ward_purchase_cooldown: number;
}

/**
 * 玩家信息
 */
export interface PlayerInfo {
  /** Steam ID */
  steamid: string;
  /** Account ID */
  accountid: string;
  /** 玩家名称 */
  name: string;
  /** 活动状态 */
  activity: string;
  /** 击杀数 */
  kills: number;
  /** 死亡数 */
  deaths: number;
  /** 助攻数 */
  assists: number;
  /** 正补数 */
  last_hits: number;
  /** 反补数 */
  denies: number;
  /** 连杀数 */
  kill_streak: number;
  /** 命令发出数 */
  commands_issued: number;
  /** 击杀列表 */
  kill_list: Record<string, number>;
  /** 队伍名称 */
  team_name: 'radiant' | 'dire';
  /** 玩家槽位 */
  player_slot: number;
  /** 队伍槽位 */
  team_slot: number;
  /** 当前金钱 */
  gold: number;
  /** 可靠金钱 */
  gold_reliable: number;
  /** 不可靠金钱 */
  gold_unreliable: number;
  /** 来自英雄击杀的金钱 */
  gold_from_hero_kills: number;
  /** 来自小兵击杀的金钱 */
  gold_from_creep_kills: number;
  /** 来自收入的金钱 */
  gold_from_income: number;
  /** 来自分享的金钱 */
  gold_from_shared: number;
  /** 每分钟金钱 */
  gpm: number;
  /** 每分钟经验 */
  xpm: number;
}

/**
 * 英雄信息
 */
export interface HeroInfo {
  /** 英雄ID */
  id: number;
  /** 英雄名称 */
  name?: string;
  /** 小天赋 */
  facet?: number;
  /** X坐标 */
  xpos?: number;
  /** Y坐标 */
  ypos?: number;
  /** 等级 */
  level?: number;
  /** 经验值 */
  xp?: number;
  /** 是否存活 */
  alive?: boolean;
  /** 复活秒数 */
  respawn_seconds?: number;
  /** 买活花费 */
  buyback_cost?: number;
  /** 买活冷却 */
  buyback_cooldown?: number;
  /** 当前生命值 */
  health?: number;
  /** 最大生命值 */
  max_health?: number;
  /** 生命值百分比 */
  health_percent?: number;
  /** 当前魔法值 */
  mana?: number;
  /** 最大魔法值 */
  max_mana?: number;
  /** 魔法值百分比 */
  mana_percent?: number;
  /** 是否沉默 */
  silenced?: boolean;
  /** 是否晕眩 */
  stunned?: boolean;
  /** 是否缴械 */
  disarmed?: boolean;
  /** 是否魔法免疫 */
  magicimmune?: boolean;
  /** 是否被变羊 */
  hexed?: boolean;
  /** 是否被静音 */
  muted?: boolean;
  /** 是否被破坏 */
  break?: boolean;
  /** 是否拥有阿哈利姆神杖 */
  aghanims_scepter?: boolean;
  /** 是否拥有阿哈利姆魔晶 */
  aghanims_shard?: boolean;
  /** 是否被烟雾影响 */
  smoked?: boolean;
  /** 永久buff */
  permanent_buffs?: Record<string, { stack_count: number }>;
  /** 是否有debuff */
  has_debuff?: boolean;
  /** 天赋1-8 */
  talent_1?: boolean;
  talent_2?: boolean;
  talent_3?: boolean;
  talent_4?: boolean;
  talent_5?: boolean;
  talent_6?: boolean;
  talent_7?: boolean;
  talent_8?: boolean;
  /** 属性加点等级 */
  attributes_level?: number;
}

/**
 * 技能信息
 */
export interface AbilityInfo {
  /** 技能名称 */
  name: string;
  /** 技能等级 */
  level: number;
  /** 是否可以释放 */
  can_cast: boolean;
  /** 是否被动技能 */
  passive: boolean;
  /** 技能冷却 */
  cooldown: number;
  /** 是否终极技能 */
  ultimate: boolean;
}

/**
 * 物品信息
 */
export interface ItemInfo {
  /** 物品名称 */
  name: string;
  /** 是否可以释放 */
  can_cast?: boolean;
  /** 物品冷却 */
  cooldown?: number;
  /** 是否被动物品 */
  passive?: boolean;
  /** 物品充能数 */
  charges?: number;
}

/**
 * 建筑信息
 */
export interface BuildingInfo {
  /** 建筑生命值 */
  health: number;
  /** 建筑最大生命值 */
  max_health: number;
}

/**
 * 所有玩家信息 (当前缺失,需要配置文件修复后才有)
 */
export interface AllPlayersInfo {
  /** 玩家0-9的数据 */
  [key: `player${number}`]: {
    /** Account ID */
    accountid: number;
    /** 玩家名称 */
    name: string;
    /** 队伍 (2=天辉, 3=夜魇) */
    team: 2 | 3;
    /** 击杀数 */
    kills: number;
    /** 死亡数 */
    deaths: number;
    /** 助攻数 */
    assists: number;
    /** 正补数 */
    last_hits: number;
    /** 反补数 */
    denies: number;
    /** 当前金钱 */
    gold: number;
    /** 等级 */
    level: number;
    /** 英雄ID */
    hero_id: number;
    /** 玩家槽位 */
    player_slot?: number;
    /** 每分钟金钱 */
    gpm?: number;
    /** 每分钟经验 */
    xpm?: number;
  };
}

/**
 * Previously 字段 - 记录数据变化
 */
export interface Previously {
  map?: Partial<MapInfo>;
  player?: Partial<PlayerInfo>;
  hero?: Partial<HeroInfo>;
  events?: {
    event: GameEvent;
  };
}

/**
 * GSI 数据主体
 */
export interface GSIData {
  /** 提供者信息 (并非每条都有) */
  provider?: Provider;
  /** 地图信息 */
  map?: MapInfo;
  /** 玩家信息 */
  player?: PlayerInfo;
  /** 英雄信息 */
  hero?: HeroInfo;
  /** 技能信息 */
  abilities?: Record<string, AbilityInfo>;
  /** 物品信息 */
  items?: Record<string, ItemInfo>;
  /** 建筑信息 */
  buildings?: {
    radiant?: Record<string, BuildingInfo>;
    dire?: Record<string, BuildingInfo>;
  };
  /** 所有玩家信息 (⚠️ 当前缺失) */
  allplayers?: AllPlayersInfo;
  /** 事件列表 */
  events?: GameEvent[];
  /** 上一次数据变化 */
  previously?: Previously;
}

// ==================== 日志条目 ====================

/**
 * 单条日志记录
 */
export interface LogEntry {
  /** 序号 */
  seq: number;
  /** 时间戳 (ISO 8601) */
  timestamp: string;
  /** 接收时间 (Unix毫秒时间戳) */
  received_at: number;
  /** GSI数据 */
  data: GSIData;
}

/**
 * 完整的对局日志文件
 */
export interface MatchLog {
  /** 元数据 */
  _meta: MatchMeta;
  /** 日志条目列表 */
  entries: LogEntry[];
}

// ==================== 辅助类型 ====================

/**
 * 游戏状态枚举
 */
export enum GameState {
  WAIT_FOR_PLAYERS = 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD',
  HERO_SELECTION = 'DOTA_GAMERULES_STATE_HERO_SELECTION',
  STRATEGY_TIME = 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  PRE_GAME = 'DOTA_GAMERULES_STATE_PRE_GAME',
  GAME_IN_PROGRESS = 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
  POST_GAME = 'DOTA_GAMERULES_STATE_POST_GAME'
}

/**
 * 队伍枚举
 */
export enum Team {
  NONE = 'none',
  RADIANT = 'radiant',
  DIRE = 'dire'
}

/**
 * 事件类型枚举
 */
export enum EventType {
  CHAT_MESSAGE = 'chat_message',
  TIP = 'tip',
  GENERIC_EVENT = 'generic_event'
}

