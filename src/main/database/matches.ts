/**
 * 比赛数据操作
 * 基于 PRD 7.3 章节
 */

import { db } from './db';
import type { Match } from '@shared/types/database';
import type { RosterPlayer, Team } from '@shared/types/gep';

/**
 * 记录比赛数据
 */
export async function recordMatch(params: {
  matchId: string;
  gameMode: string;
  startTime: number;
  result: 'win' | 'lose' | 'unknown';
  playerTeam: Team;
  radiantScore?: number;
  direScore?: number;
  rosterPlayers: RosterPlayer[];
}): Promise<void> {
  const {
    matchId,
    gameMode,
    startTime,
    result,
    playerTeam,
    radiantScore,
    direScore,
    rosterPlayers,
  } = params;

  // 1. 创建比赛记录
  await db.matches.add({
    id: matchId,
    game_mode: gameMode,
    start_time: startTime,
    end_time: Date.now(),
    duration: Math.floor((Date.now() - startTime) / 1000),
    result,
    player_team: playerTeam,
    radiant_score: radiantScore,
    dire_score: direScore,
    created_at: Date.now(),
  });

  // 2. 记录所有玩家信息
  for (const player of rosterPlayers) {
    await db.match_players.add({
      id: `${matchId}_${player.steamid}`,
      match_id: matchId,
      steam_id: player.steamid,
      team: player.team,
      hero: player.hero,
      hero_id: parseInt(player.hero_id),
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      level: player.level,
    });
  }
}

/**
 * 获取最近的比赛列表
 */
export async function getRecentMatches(limit: number = 10): Promise<Match[]> {
  return await db.matches.orderBy('created_at').reverse().limit(limit).toArray();
}

/**
 * 获取所有比赛
 */
export async function getAllMatches(): Promise<Match[]> {
  return await db.matches.orderBy('created_at').reverse().toArray();
}

