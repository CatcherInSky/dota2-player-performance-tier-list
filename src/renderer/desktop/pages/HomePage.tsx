import React, { useState, useEffect } from 'react';
import { useDatabase } from '@renderer/shared/hooks/useDatabase';
import { formatDate, formatWinRate } from '@renderer/shared/utils/format';
import { RatingStars } from '@renderer/shared/components/RatingStars';
import type { Match, Player } from '@shared/types/database';

export function HomePage() {
  const { getRecentMatchesData, getAllPlayers, getAllReviews } = useDatabase();
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    totalReviews: 0,
  });
  const [frequentPlayers, setFrequentPlayers] = useState<Array<{
    player: Player;
    count: number;
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // 加载最近对局
    const matches = await getRecentMatchesData(10);
    setRecentMatches(matches);

    // 计算统计数据
    const allMatches = await getRecentMatchesData(1000);
    const wins = allMatches.filter((m) => m.result === 'win').length;
    const allReviews = await getAllReviews();

    setStats({
      totalMatches: allMatches.length,
      wins,
      totalReviews: allReviews.length,
    });

    // 加载常见队友/对手
    const players = await getAllPlayers();
    const sortedPlayers = players
      .map((player) => ({
        player,
        count: player.review_count || 0,
      }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setFrequentPlayers(sortedPlayers);
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">总对局</div>
          <div className="text-3xl font-bold text-white">{stats.totalMatches}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">胜率</div>
          <div className="text-3xl font-bold text-green-500">
            {formatWinRate(stats.wins, stats.totalMatches)}
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-1">评分给出</div>
          <div className="text-3xl font-bold text-blue-500">{stats.totalReviews}</div>
        </div>
      </div>

      {/* 最近对局 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">最近对局</h2>
        {recentMatches.length === 0 ? (
          <p className="text-gray-500">暂无对局记录</p>
        ) : (
          <div className="space-y-2">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">
                    {formatDate(match.start_time)}
                  </span>
                  <span className="text-white">{match.game_mode}</span>
                </div>
                <div className="flex items-center gap-4">
                  {match.radiant_score !== undefined &&
                    match.dire_score !== undefined && (
                      <span className="text-gray-400 text-sm">
                        {match.radiant_score} : {match.dire_score}
                      </span>
                    )}
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      match.result === 'win'
                        ? 'bg-green-900/50 text-green-400'
                        : match.result === 'lose'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-gray-900/50 text-gray-400'
                    }`}
                  >
                    {match.result === 'win'
                      ? '胜利'
                      : match.result === 'lose'
                      ? '失败'
                      : '未知'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 常见队友/对手 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">常见队友/对手</h2>
        {frequentPlayers.length === 0 ? (
          <p className="text-gray-500">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {frequentPlayers.map(({ player, count }) => (
              <div
                key={player.steam_id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
              >
                <div>
                  <div className="text-white font-medium">{player.current_name}</div>
                  {player.name_history && player.name_history.length > 0 && (
                    <div className="text-gray-500 text-sm">
                      曾用名: {player.name_history.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {player.avg_score && (
                    <div className="flex items-center gap-2">
                      <RatingStars value={Math.round(player.avg_score)} readonly size="sm" />
                      <span className="text-yellow-500 text-sm">
                        {player.avg_score.toFixed(1)}
                      </span>
                    </div>
                  )}
                  <span className="text-gray-400 text-sm">遇到 {count} 次</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

