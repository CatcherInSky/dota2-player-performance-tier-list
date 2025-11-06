/**
 * 玩家详情组件
 * 显示玩家的详细信息：胜率、评分统计、常用英雄、曾用名等
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { playersRepository } from '../../db/repositories/players.repository';
import { matchesRepository } from '../../db/repositories/matches.repository';
import { ratingsRepository } from '../../db/repositories/ratings.repository';
import type { Account, Player, Match, Rating } from '../../db/database';

interface PlayerDetailProps {
  currentAccount: Account | null;
}

interface PlayerStats {
  allyWinRate: number | null;
  enemyWinRate: number | null;
  selfWinRate: number | null;
  lastRating: Rating | null;
  medianRating: number | null;
  averageRating: number | null;
  favoriteHeroes: { heroId: number; heroName: string; count: number }[];
}

export function PlayerDetail({ currentAccount }: PlayerDetailProps) {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) {
      loadPlayerDetail(playerId);
    }
  }, [playerId, currentAccount]);

  const loadPlayerDetail = async (id: string | number) => {
    try {
      setLoading(true);
      const playerData = await playersRepository.findByPlayerId(id);
      
      if (!playerData) {
        console.error('[PlayerDetail] Player not found:', id);
        return;
      }

      setPlayer(playerData);

      // 计算统计数据
      const statsData = await calculatePlayerStats(id, currentAccount);
      setStats(statsData);
    } catch (error) {
      console.error('[PlayerDetail] Error loading player detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = async (
    playerId: string | number,
    currentAccount: Account | null
  ): Promise<PlayerStats> => {
    // 查找所有包含该玩家的比赛
    const allMatches = await matchesRepository.findAll();
    const playerMatches = allMatches.filter((match) => {
      for (let i = 1; i <= 10; i++) {
        if ((match as any)[`player_${i}_id`] === playerId) {
          return true;
        }
      }
      return false;
    });

    // 计算胜率
    let allyWinRate: number | null = null;
    let enemyWinRate: number | null = null;
    let selfWinRate: number | null = null;

    if (playerMatches.length > 0) {
      if (currentAccount && playerId === currentAccount.account_id) {
        // 如果是自己，计算自己的胜率
        const wins = playerMatches.filter((match) => {
          const playerTeam = getPlayerTeam(match, playerId);
          return match.winner === playerTeam;
        }).length;
        selfWinRate = (wins / playerMatches.length) * 100;
      } else {
        // 计算友方胜率和敌方胜率
        const allyWins = playerMatches.filter((match) => {
          const playerTeam = getPlayerTeam(match, playerId);
          const currentTeam = currentAccount ? getPlayerTeam(match, currentAccount.account_id) : null;
          return playerTeam === currentTeam && match.winner === playerTeam;
        }).length;

        const enemyWins = playerMatches.filter((match) => {
          const playerTeam = getPlayerTeam(match, playerId);
          const currentTeam = currentAccount ? getPlayerTeam(match, currentAccount.account_id) : null;
          return playerTeam !== currentTeam && match.winner !== playerTeam;
        }).length;

        const allyMatches = playerMatches.filter((match) => {
          const playerTeam = getPlayerTeam(match, playerId);
          const currentTeam = currentAccount ? getPlayerTeam(match, currentAccount.account_id) : null;
          return playerTeam === currentTeam;
        });

        const enemyMatches = playerMatches.filter((match) => {
          const playerTeam = getPlayerTeam(match, playerId);
          const currentTeam = currentAccount ? getPlayerTeam(match, currentAccount.account_id) : null;
          return playerTeam !== currentTeam;
        });

        allyWinRate = allyMatches.length > 0 ? (allyWins / allyMatches.length) * 100 : null;
        enemyWinRate = enemyMatches.length > 0 ? (enemyWins / enemyMatches.length) * 100 : null;
      }
    }

    // 获取评分统计
    const ratings = await ratingsRepository.findByPlayerId(playerId);
    const lastRating = ratings.length > 0 ? ratings.sort((a, b) => b.created_at - a.created_at)[0] : null;
    const medianRating = await ratingsRepository.getMedianRatingByPlayerId(playerId);
    const averageRating = await ratingsRepository.getAverageRatingByPlayerId(playerId);

    // 统计常用英雄
    const heroCounts: Map<number, { heroName: string; count: number }> = new Map();
    playerMatches.forEach((match) => {
      const playerIndex = getPlayerIndex(match, playerId);
      if (playerIndex) {
        const heroId = (match as any)[`player_${playerIndex}_hero_id`];
        const heroName = (match as any)[`player_${playerIndex}_hero_name`] || '未知英雄';
        if (heroId) {
          const existing = heroCounts.get(heroId);
          if (existing) {
            existing.count++;
          } else {
            heroCounts.set(heroId, { heroName, count: 1 });
          }
        }
      }
    });

    const favoriteHeroes = Array.from(heroCounts.entries())
      .map(([heroId, data]) => ({ heroId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      allyWinRate,
      enemyWinRate,
      selfWinRate,
      lastRating,
      medianRating,
      averageRating,
      favoriteHeroes,
    };
  };

  const getPlayerTeam = (match: Match, playerId: string | number): 'radiant' | 'dire' | null => {
    for (let i = 1; i <= 5; i++) {
      if ((match as any)[`player_${i}_id`] === playerId) {
        return 'radiant';
      }
    }
    for (let i = 6; i <= 10; i++) {
      if ((match as any)[`player_${i}_id`] === playerId) {
        return 'dire';
      }
    }
    return null;
  };

  const getPlayerIndex = (match: Match, playerId: string | number): number | null => {
    for (let i = 1; i <= 10; i++) {
      if ((match as any)[`player_${i}_id`] === playerId) {
        return i;
      }
    }
    return null;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const getRatingText = (score: number): string => {
    const texts: Record<number, string> = {
      1: '很差',
      2: '较差',
      3: '一般',
      4: '较好',
      5: '很好',
    };
    return texts[score] || '未知';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>;
  }

  if (!player) {
    return <div className="text-center py-8 text-gray-400">玩家未找到</div>;
  }

  const isSelf = currentAccount && player.player_id === currentAccount.account_id;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">玩家详情</h2>

      {/* 玩家基本信息 */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">{player.current_name}</h3>
          <p className="text-sm text-gray-400">玩家 ID: {player.player_id}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">首次遇到:</span>
            <span className="ml-2">{formatTime(player.first_seen)}</span>
          </div>
          <div>
            <span className="text-gray-400">最后遇到:</span>
            <span className="ml-2">{formatTime(player.last_seen)}</span>
          </div>
        </div>

        {player.previous_names && player.previous_names.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-400 text-sm">曾用名:</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {player.previous_names.map((name, index) => (
                <span key={index} className="px-2 py-1 bg-slate-700 rounded text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 统计数据 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 胜率 */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">胜率统计</h3>
            {isSelf ? (
              <div>
                <div className="text-3xl font-bold text-blue-400">
                  {stats.selfWinRate !== null ? `${stats.selfWinRate.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-400 mt-2">自己的胜率</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {stats.allyWinRate !== null ? `${stats.allyWinRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-400">友方胜率</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {stats.enemyWinRate !== null ? `${stats.enemyWinRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-400">敌方胜率</div>
                </div>
              </div>
            )}
          </div>

          {/* 评分统计 */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">评分统计</h3>
            <div className="space-y-3">
              {stats.lastRating && (
                <div>
                  <div className="text-sm text-gray-400">上次评分</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {'★'.repeat(stats.lastRating.score)}
                    {'☆'.repeat(5 - stats.lastRating.score)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getRatingText(stats.lastRating.score)} - {formatTime(stats.lastRating.created_at)}
                  </div>
                </div>
              )}
              {stats.medianRating !== null && (
                <div>
                  <div className="text-sm text-gray-400">中位数评分</div>
                  <div className="text-xl font-bold">{stats.medianRating.toFixed(1)}</div>
                </div>
              )}
              {stats.averageRating !== null && (
                <div>
                  <div className="text-sm text-gray-400">平均评分</div>
                  <div className="text-xl font-bold">{stats.averageRating.toFixed(1)}</div>
                </div>
              )}
            </div>
          </div>

          {/* 常用英雄 */}
          {stats.favoriteHeroes.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">常用英雄</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {stats.favoriteHeroes.map((hero) => (
                  <div key={hero.heroId} className="bg-slate-700 rounded p-3 text-center">
                    <div className="text-sm font-medium">{hero.heroName}</div>
                    <div className="text-xs text-gray-400 mt-1">{hero.count} 次</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

