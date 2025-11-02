/**
 * 应用设置类型定义
 */

export type Language = 'zh-CN' | 'en-US';

export interface RatingLabels {
  5: string; // 默认："夯"
  4: string; // 默认："顶级"
  3: string; // 默认："普通人"
  2: string; // 默认："NPC"
  1: string; // 默认："拉"
}

export interface AppSettings {
  language: Language;
  hotkey: string; // 默认："Alt+Oem3"
  ratingLabels: RatingLabels;
  recordBotGames: boolean; // 是否记录人机对局
  autoBackup: boolean; // 是否自动备份
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  hotkey: 'Alt+Oem3',
  ratingLabels: {
    5: '夯',
    4: '顶级',
    3: '普通人',
    2: 'NPC',
    1: '拉',
  },
  recordBotGames: false,
  autoBackup: true,
};

