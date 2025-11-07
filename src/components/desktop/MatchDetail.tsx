/**
 * 比赛详情组件
 * 显示指定比赛的详细信息
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchesRepository } from '../../db/repositories/matches.repository';
import { playersRepository } from '../../db/repositories/players.repository';
import type { Account, Match } from '../../db/database';

interface MatchDetailProps {
  currentAccount?: Account | null;
}

interface PlayerInfo {
  id: string | number;
  name: string;
  heroName: string | null;
  heroId: number | null;
  kda: string;
  gpm: number | null;
  xpm: number | null;
  team: 'radiant' | 'dire';
}

export function MatchDetail({ currentAccount = null }: MatchDetailProps) {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId) {
      loadMatchDetail(matchId);
    }
  }, [matchId]);

  const loadMatchDetail = async (id: string) => {
    try {
      setLoading(true);
      const matchData = await matchesRepository.findByMatchId(id);
      
      if (!matchData) {
        console.error('[MatchDetail] Match not found:', id);
        return;
      }

      setMatch(matchData);

      // 获取玩家信息
      const playerInfos: PlayerInfo[] = [];
      for (let i = 1; i <= 10; i++) {
        const playerId = (matchData as any)[`player_${i}_id`];
        if (!playerId) continue;

        // 查找玩家名称
        const player = await playersRepository.findByPlayerId(playerId);
        const playerName = player?.current_name || `玩家 ${i}`;

        const team: 'radiant' | 'dire' = i <= 5 ? 'radiant' : 'dire';
        
        playerInfos.push({
          id: playerId,
          name: playerName,
          heroName: (matchData as any)[`player_${i}_hero_name`] || null,
          heroId: (matchData as any)[`player_${i}_hero_id`] || null,
          kda: (matchData as any)[`player_${i}_kda`] || '0/0/0',
          gpm: (matchData as any)[`player_${i}_gpm`] || null,
          xpm: (matchData as any)[`player_${i}_xpm`] || null,
          team,
        });
      }

      setPlayers(playerInfos);
    } catch (error) {
      console.error('[MatchDetail] Error loading match detail:', error);
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

  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>;
  }

  if (!match) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">比赛未找到</p>
        <button
          onClick={() => navigate('/overview')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          返回总览
        </button>
      </div>
    );
  }

  const radiantPlayers = players.filter((p) => p.team === 'radiant');
  const direPlayers = players.filter((p) => p.team === 'dire');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">比赛详情</h2>
        
        {/* 比赛基本信息 */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">比赛 ID:</span>
              <span className="ml-2 font-mono">{match.match_id}</span>
            </div>
            <div>
              <span className="text-gray-400">时间:</span>
              <span className="ml-2">{formatTime(match.end_time)}</span>
            </div>
            <div>
              <span className="text-gray-400">模式:</span>
              <span className="ml-2">{match.match_mode}</span>
            </div>
            <div>
              <span className="text-gray-400">时长:</span>
              <span className="ml-2">{formatDuration(match.start_time, match.end_time)}</span>
            </div>
            <div>
              <span className="text-gray-400">胜负:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                match.winner === 'radiant' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {match.winner === 'radiant' ? '天辉胜利' : '夜魇胜利'}
              </span>
            </div>
          </div>
        </div>

        {/* 玩家信息表格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 天辉队伍 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-green-400">天辉 (Radiant)</h3>
            <div className="space-y-2">
              {radiantPlayers.map((player, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`/player/${player.id}`)}
                  className={`p-3 rounded bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors ${
                    currentAccount && player.id === currentAccount.account_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.heroName || '未知英雄'}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>KDA: {player.kda}</div>
                      {player.gpm !== null && <div>GPM: {player.gpm}</div>}
                      {player.xpm !== null && <div>XPM: {player.xpm}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 夜魇队伍 */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-red-400">夜魇 (Dire)</h3>
            <div className="space-y-2">
              {direPlayers.map((player, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`/player/${player.id}`)}
                  className={`p-3 rounded bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors ${
                    currentAccount && player.id === currentAccount.account_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.heroName || '未知英雄'}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>KDA: {player.kda}</div>
                      {player.gpm !== null && <div>GPM: {player.gpm}</div>}
                      {player.xpm !== null && <div>XPM: {player.xpm}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

