import React, { useEffect, useState } from 'react';
import { useDatabase } from '@renderer/shared/hooks/useDatabase';
import { RatingStars } from '@renderer/shared/components/RatingStars';
import { truncateText } from '@renderer/shared/utils/format';
import type { Player } from '@shared/types/database';
import type { RosterPlayer } from '@shared/types/gep';

interface RecordModeProps {
  rosterPlayers: RosterPlayer[];
  localSteamId: string;
  onHide?: () => void;
}

export function RecordMode({ rosterPlayers, localSteamId, onHide }: RecordModeProps) {
  const { getPlayerStats } = useDatabase();
  const [playerData, setPlayerData] = useState<
    Map<string, { player: RosterPlayer; stats: any }>
  >(new Map());

  useEffect(() => {
    loadPlayerStats();
  }, [rosterPlayers, localSteamId]);

  async function loadPlayerStats() {
    const data = new Map();

    for (const player of rosterPlayers) {
      if (player.steamid === localSteamId) continue; // 跳过自己

      const stats = await getPlayerStats(player.steamid, localSteamId);
      data.set(player.steamid, { player, stats });
    }

    setPlayerData(data);
  }

  // 按队伍分组
  const radiantPlayers = Array.from(playerData.values()).filter(
    (p) => p.player.team === 'radiant'
  );
  const direPlayers = Array.from(playerData.values()).filter(
    (p) => p.player.team === 'dire'
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">玩家历史评分 - 策略时间</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Alt+` 隐藏</span>
          {onHide && (
            <button
              onClick={onHide}
              className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded transition-colors text-sm"
            >
              隐藏
            </button>
          )}
        </div>
      </div>

      {/* 天辉队伍 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-radiant mb-3">天辉 (Radiant)</h2>
        <div className="grid grid-cols-5 gap-3">
          {radiantPlayers.map(({ player, stats }) => (
            <PlayerCard key={player.steamid} player={player} stats={stats} />
          ))}
        </div>
      </div>

      {/* 夜魇队伍 */}
      <div>
        <h2 className="text-lg font-semibold text-dire mb-3">夜魇 (Dire)</h2>
        <div className="grid grid-cols-5 gap-3">
          {direPlayers.map(({ player, stats }) => (
            <PlayerCard key={player.steamid} player={player} stats={stats} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  stats,
}: {
  player: RosterPlayer;
  stats: any;
}) {
  const getRatingColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score <= 2) return 'text-red-400';
    if (score === 3) return 'text-gray-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-3">
      {/* 英雄名（简化显示） */}
      <div className="text-xs text-gray-500 mb-1 truncate">{player.hero}</div>

      {/* 玩家昵称 */}
      <div className="text-white font-medium mb-2 truncate" title={player.player_name}>
        {player.player_name || '匿名玩家'}
      </div>

      {/* 评分 */}
      {stats ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <RatingStars
              value={Math.round(stats.avgScore)}
              readonly
              size="sm"
            />
          </div>
          <div className={`text-center font-bold ${getRatingColor(stats.avgScore)}`}>
            {stats.avgScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400 text-center">
            {stats.count === 1 ? '首次遇到' : `${stats.count}次`}
          </div>
          {stats.lastComment && (
            <div className="text-xs text-gray-500 text-center">
              上次: {truncateText(stats.lastComment, 10)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-gray-500 text-xl mb-1">--</div>
          <div className="text-xs text-gray-600">首次遇到</div>
        </div>
      )}
    </div>
  );
}

