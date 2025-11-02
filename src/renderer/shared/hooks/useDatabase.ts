/**
 * 数据库操作 Hook
 */

import { useCallback } from 'react';
import { db } from '@main/database/db';
import { syncPlayers, getPlayerReviewStats } from '@main/database/players';
import { recordMatch, getRecentMatches } from '@main/database/matches';
import { saveReviews, getPlayerReviews } from '@main/database/reviews';
import type { Match, Player, Review } from '@shared/types/database';
import type { ReviewInput } from '@main/database/reviews';
import type { RosterPlayer, Team } from '@shared/types/gep';

export function useDatabase() {
  // 玩家操作
  const syncPlayersData = useCallback(
    async (rosterPlayers: RosterPlayer[], localSteamId: string) => {
      return await syncPlayers(rosterPlayers, localSteamId);
    },
    []
  );

  const getPlayerStats = useCallback(
    async (steamId: string, reviewerSteamId: string) => {
      return await getPlayerReviewStats(steamId, reviewerSteamId);
    },
    []
  );

  const getAllPlayers = useCallback(async () => {
    return await db.players.toArray();
  }, []);

  // 比赛操作
  const recordMatchData = useCallback(
    async (params: {
      matchId: string;
      gameMode: string;
      startTime: number;
      result: 'win' | 'lose' | 'unknown';
      playerTeam: Team;
      radiantScore?: number;
      direScore?: number;
      rosterPlayers: RosterPlayer[];
    }) => {
      return await recordMatch(params);
    },
    []
  );

  const getRecentMatchesData = useCallback(async (limit: number = 10) => {
    return await getRecentMatches(limit);
  }, []);

  const getAllMatches = useCallback(async () => {
    return await db.matches.orderBy('created_at').reverse().toArray();
  }, []);

  // 点评操作
  const saveReviewsData = useCallback(
    async (matchId: string, reviews: ReviewInput[], localSteamId: string) => {
      return await saveReviews(matchId, reviews, localSteamId);
    },
    []
  );

  const getPlayerReviewsData = useCallback(
    async (steamId: string, reviewerSteamId: string) => {
      return await getPlayerReviews(steamId, reviewerSteamId);
    },
    []
  );

  const getAllReviews = useCallback(async () => {
    return await db.reviews.orderBy('created_at').reverse().toArray();
  }, []);

  // 数据删除
  const deleteAllData = useCallback(async () => {
    await db.matches.clear();
    await db.players.clear();
    await db.match_players.clear();
    await db.reviews.clear();
  }, []);

  return {
    // 玩家
    syncPlayersData,
    getPlayerStats,
    getAllPlayers,
    // 比赛
    recordMatchData,
    getRecentMatchesData,
    getAllMatches,
    // 点评
    saveReviewsData,
    getPlayerReviewsData,
    getAllReviews,
    // 其他
    deleteAllData,
  };
}

