/**
 * 显示玩家简单评价组件（策略阶段）
 * 显示友方胜率/敌方胜率、评分、词云
 */

import { useState, useEffect } from 'react';
import { calculateAllyWinRate, calculateEnemyWinRate } from '../../utils/win-rate-calculator';
import { getLastRating, getAverageRating, roundRating, getRatingText } from '../../utils/rating-calculator';
import { accountsRepository } from '../../db/repositories/accounts.repository';
import { ratingsRepository } from '../../db/repositories/ratings.repository';
import type { Account, Rating } from '../../db/database';

interface Player {
  playerId?: string | number;
  playerName?: string;
  heroName?: string;
  team?: string;
}

interface PlayerSimpleRatingProps {
  players: Player[];
}

interface PlayerStats {
  player: Player;
  allyWinRate: number | null;
  enemyWinRate: number | null;
  lastRating: Rating | null;
  averageRating: number | null;
  topComments: string[];
}

export function PlayerSimpleRating({ players }: PlayerSimpleRatingProps) {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentAccount();
  }, []);

  useEffect(() => {
    if (currentAccount && players.length > 0) {
      loadPlayerStats();
    }
  }, [currentAccount, players]);

  const loadCurrentAccount = async () => {
    try {
      const account = await accountsRepository.getCurrentAccount();
      setCurrentAccount(account || null);
    } catch (error) {
      console.error('[PlayerSimpleRating] Error loading current account:', error);
    }
  };

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      const stats: PlayerStats[] = [];

      for (const player of players) {
        if (!player.playerId) continue;

        const playerId = player.playerId;
        const accountId = currentAccount?.account_id;

        // 并行计算所有统计数据
        const [allyWinRate, enemyWinRate, lastRating, averageRating, topComments] = await Promise.all([
          accountId ? calculateAllyWinRate(playerId, accountId) : Promise.resolve(null),
          accountId ? calculateEnemyWinRate(playerId, accountId) : Promise.resolve(null),
          accountId ? getLastRating(playerId, accountId) : getLastRating(playerId),
          getAverageRating(playerId),
          getTopComments(playerId),
        ]);

        stats.push({
          player,
          allyWinRate,
          enemyWinRate,
          lastRating,
          averageRating: roundRating(averageRating),
          topComments,
        });
      }

      setPlayerStats(stats);
    } catch (error) {
      console.error('[PlayerSimpleRating] Error loading player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopComments = async (playerId: string | number): Promise<string[]> => {
    try {
      const ratings = await ratingsRepository.findByPlayerId(playerId);
      const comments = ratings
        .filter((r) => r.comment && r.comment.trim())
        .map((r) => r.comment!.trim())
        .slice(0, 5); // 取前5条评论作为简单展示
      return comments;
    } catch (error) {
      console.error('[PlayerSimpleRating] Error getting top comments:', error);
      return [];
    }
  };

  const handlePlayerClick = (playerId: string | number) => {
    // 打开 desktop 窗口并跳转到玩家详情
    if (typeof overwolf !== 'undefined') {
      overwolf.windows.obtainDeclaredWindow('desktop', (result) => {
        if (result.success) {
          overwolf.windows.restore(result.window.id, () => {
            // 发送消息给 desktop 窗口
            overwolf.windows.sendMessage(result.window.id, 'desktop', {
              type: 'NAVIGATE_TO_PLAYER',
              playerId,
            });
          });
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-sm">加载玩家数据中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold mb-4">玩家评价</h2>
      {playerStats.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">暂无玩家数据</div>
      ) : (
        <div className="space-y-2">
          {playerStats.map((stat, index) => (
            <PlayerCard
              key={index}
              stat={stat}
              onClick={() => stat.player.playerId && handlePlayerClick(stat.player.playerId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ stat, onClick }: { stat: PlayerStats; onClick: () => void }) {
  const { player, allyWinRate, enemyWinRate, lastRating, averageRating, topComments } = stat;

  const teamColor = player.team === 'radiant' ? 'border-green-500' : 
                    player.team === 'dire' ? 'border-red-500' : 
                    'border-gray-500';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded bg-white/10 border-l-2 ${teamColor} cursor-pointer hover:bg-white/15 transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm">{player.playerName || '未知玩家'}</div>
          {player.heroName && (
            <div className="text-xs text-gray-400 mt-1">英雄: {player.heroName}</div>
          )}

          {/* 胜率 */}
          <div className="mt-2 text-xs space-y-1">
            {allyWinRate !== null && (
              <div className="text-green-400">友方胜率: {allyWinRate.toFixed(1)}%</div>
            )}
            {enemyWinRate !== null && (
              <div className="text-red-400">敌方胜率: {enemyWinRate.toFixed(1)}%</div>
            )}
            {allyWinRate === null && enemyWinRate === null && (
              <div className="text-gray-500">暂无胜率数据</div>
            )}
          </div>

          {/* 评分 */}
          <div className="mt-2 text-xs">
            {lastRating && (
              <div className="text-yellow-400">
                上次评分: {'★'.repeat(lastRating.score)}{'☆'.repeat(5 - lastRating.score)} ({getRatingText(lastRating.score)})
              </div>
            )}
            {averageRating !== null && (
              <div className="text-gray-300 mt-1">
                平均评分: {averageRating.toFixed(1)} ({getRatingText(averageRating)})
              </div>
            )}
            {!lastRating && averageRating === null && (
              <div className="text-gray-500">暂无评分数据</div>
            )}
          </div>

          {/* 常用评价（简单展示） */}
          {topComments.length > 0 && (
            <div className="mt-2 text-xs">
              <div className="text-gray-400 mb-1">常用评价:</div>
              <div className="flex flex-wrap gap-1">
                {topComments.slice(0, 3).map((comment, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-700/50 rounded text-xs">
                    {comment.length > 10 ? comment.substring(0, 10) + '...' : comment}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

