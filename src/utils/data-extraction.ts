/**
 * 字段获取工具函数
 * 统一处理字段获取优先级和空值检查
 */

import type { Dota2RosterPlayer, Dota2MeInfo, Dota2MatchInfo } from '../types/dota2-gep';

/**
 * 获取 player_id
 * 优先级：account_id > steamId > steam_id > steamid
 */
export function getPlayerId(player: Dota2RosterPlayer): string | number {
  if (player.account_id !== undefined && player.account_id !== null) {
    return player.account_id;
  }
  if (player.steamId !== undefined && player.steamId !== null) {
    return player.steamId;
  }
  if (player.steam_id !== undefined && player.steam_id !== null) {
    return player.steam_id;
  }
  if (player.steamid !== undefined && player.steamid !== null) {
    return player.steamid;
  }
  
  // 如果所有字段都不存在，生成临时 ID
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn('[DataExtraction] No player_id found, using temp ID:', tempId);
  return tempId;
}

/**
 * 获取 player_name
 * 优先级：player_name > playerName > name
 */
export function getPlayerName(player: Dota2RosterPlayer): string {
  if (player.player_name && player.player_name.trim()) {
    return player.player_name.trim();
  }
  if (player.playerName && player.playerName.trim()) {
    return player.playerName.trim();
  }
  if (player.name && player.name.trim()) {
    return player.name.trim();
  }
  
  // 如果所有字段都不存在，使用默认值
  console.warn('[DataExtraction] No player_name found, using default');
  return '未知玩家';
}

/**
 * 获取 account_id
 * 从 me.steam_id 获取
 */
export function getAccountId(me: Dota2MeInfo): string | number | null {
  if (me.steam_id !== undefined && me.steam_id !== null) {
    return me.steam_id;
  }
  
  console.warn('[DataExtraction] No account_id found in me.steam_id');
  return null;
}

/**
 * 获取 match_id
 * 从 match_info.pseudo_match_id 获取（GEP 提供）
 */
export function getMatchId(matchInfo: Dota2MatchInfo): string | number | null {
  // 优先使用 pseudo_match_id（GEP 提供的）
  if (matchInfo.pseudo_match_id !== undefined && matchInfo.pseudo_match_id !== null) {
    return matchInfo.pseudo_match_id;
  }
  
  // 备用：使用 match_id
  if (matchInfo.match_id !== undefined && matchInfo.match_id !== null) {
    return matchInfo.match_id;
  }
  
  console.warn('[DataExtraction] No match_id found in match_info');
  return null;
}

/**
 * 获取英雄名称
 * 优先级：hero > heroName
 */
export function getHeroName(player: Dota2RosterPlayer): string | null {
  if (player.hero && player.hero.trim()) {
    return player.hero.trim();
  }
  if (player.heroName && player.heroName.trim()) {
    return player.heroName.trim();
  }
  return null;
}

/**
 * 获取英雄 ID
 */
export function getHeroId(player: Dota2RosterPlayer): number | null {
  if (player.hero_id !== undefined && player.hero_id !== null) {
    return player.hero_id;
  }
  return null;
}

/**
 * 格式化 KDA
 * 格式："K/D/A"
 */
export function formatKDA(
  kills?: number,
  deaths?: number,
  assists?: number
): string {
  const k = kills ?? 0;
  const d = deaths ?? 0;
  const a = assists ?? 0;
  return `${k}/${d}/${a}`;
}

/**
 * 获取账户名称
 * 从 me.name 获取
 */
export function getAccountName(me: Dota2MeInfo): string {
  if (me.name && me.name.trim()) {
    return me.name.trim();
  }
  
  console.warn('[DataExtraction] No account name found in me.name');
  return '未知账户';
}

