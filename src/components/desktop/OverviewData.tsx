/**
 * 总览数据组件
 * 3 个 Tab：比赛、玩家、点评
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesRepository } from '../../db/repositories/matches.repository';
import { playersRepository } from '../../db/repositories/players.repository';
import { ratingsRepository } from '../../db/repositories/ratings.repository';
import type { Match, Player, Rating } from '../../db/database';

type TabType = 'matches' | 'players' | 'ratings';

export function OverviewData() {
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'matches':
          const allMatches = await matchesRepository.findAll();
          // 按 end_time 降序排序
          setMatches(allMatches.sort((a, b) => b.end_time - a.end_time));
          break;
        case 'players':
          const allPlayers = await playersRepository.findAllOrderByLastSeen();
          setPlayers(allPlayers);
          break;
        case 'ratings':
          const allRatings = await ratingsRepository.findAllOrderByCreatedAt();
          setRatings(allRatings);
          break;
      }
    } catch (error) {
      console.error('[OverviewData] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-xl font-bold mb-4">数据总览</h2>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'matches'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          比赛 ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'players'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          玩家 ({players.length})
        </button>
        <button
          onClick={() => setActiveTab('ratings')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ratings'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          点评 ({ratings.length})
        </button>
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {activeTab === 'matches' && (
            <MatchesTable matches={matches} navigate={navigate} formatTime={formatTime} formatDuration={formatDuration} />
          )}
          {activeTab === 'players' && (
            <PlayersTable players={players} navigate={navigate} formatTime={formatTime} />
          )}
          {activeTab === 'ratings' && (
            <RatingsTable ratings={ratings} navigate={navigate} formatTime={formatTime} />
          )}
        </div>
      )}
    </div>
  );
}

function MatchesTable({ matches, navigate, formatTime, formatDuration }: any) {
  if (matches.length === 0) {
    return <div className="p-8 text-center text-gray-400">暂无比赛数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">比赛 ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">时间</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">游戏模式</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">时长</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">胜负</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {matches.map((match: Match) => (
            <tr
              key={match.uuid}
              onClick={() => navigate(`/match/${match.match_id}`)}
              className="hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm">{match.match_id}</td>
              <td className="px-4 py-3 text-sm">{formatTime(match.end_time)}</td>
              <td className="px-4 py-3 text-sm">{match.match_mode}</td>
              <td className="px-4 py-3 text-sm">{formatDuration(match.start_time, match.end_time)}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  match.winner === 'radiant' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {match.winner === 'radiant' ? '天辉' : '夜魇'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayersTable({ players, navigate, formatTime }: any) {
  if (players.length === 0) {
    return <div className="p-8 text-center text-gray-400">暂无玩家数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">玩家 ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">玩家名字</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">首次遇到</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">最后遇到</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {players.map((player: Player) => (
            <tr
              key={player.uuid}
              onClick={() => navigate(`/player/${player.player_id}`)}
              className="hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm">{player.player_id}</td>
              <td className="px-4 py-3 text-sm">{player.current_name}</td>
              <td className="px-4 py-3 text-sm">{formatTime(player.first_seen)}</td>
              <td className="px-4 py-3 text-sm">{formatTime(player.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingsTable({ ratings, navigate, formatTime }: any) {
  if (ratings.length === 0) {
    return <div className="p-8 text-center text-gray-400">暂无评价数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">比赛 ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">玩家 ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">分数</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">点评时间</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">文案</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {ratings.map((rating: Rating) => (
            <tr
              key={rating.uuid}
              className="hover:bg-slate-700 transition-colors"
            >
              <td 
                className="px-4 py-3 text-sm cursor-pointer text-blue-400 hover:underline"
                onClick={() => navigate(`/match/${rating.match_id}`)}
              >
                {rating.match_id}
              </td>
              <td 
                className="px-4 py-3 text-sm cursor-pointer text-blue-400 hover:underline"
                onClick={() => navigate(`/player/${rating.player_id}`)}
              >
                {rating.player_id}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="text-yellow-400">{'★'.repeat(rating.score)}</span>
                <span className="text-gray-500">{'★'.repeat(5 - rating.score)}</span>
              </td>
              <td className="px-4 py-3 text-sm">{formatTime(rating.created_at)}</td>
              <td className="px-4 py-3 text-sm max-w-md truncate">{rating.comment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

