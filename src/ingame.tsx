/**
 * Ingame 窗口主应用
 * 根据 DISPLAY_MODE 显示不同组件
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { onMessageReceived, dragWindow, dragResizeWindow } from './utils/overwolf';
import { PlayerSimpleRating } from './components/ingame/PlayerSimpleRating';
import { EditRating } from './components/ingame/EditRating';

interface Player {
  steamId?: string;
  playerId?: string | number;
  playerName?: string;
  heroName?: string;
  team?: string;
}

interface MatchInfo {
  match_id?: string | number;
  match_mode?: string;
  winner?: 'radiant' | 'dire';
  start_time?: number;
  end_time?: number;
}

function IngameApp() {
  const [displayMode, setDisplayMode] = useState<'strategy' | 'postgame' | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);

  useEffect(() => {
    // 监听来自 background 的消息
    const unsubscribe = onMessageReceived((message) => {
      console.log('[Ingame] Received message:', message);

      // 处理 DISPLAY_MODE 消息
      if (message.type === 'DISPLAY_MODE') {
        setDisplayMode(message.mode === 'strategy' ? 'strategy' : 'postgame');
      }

      // 处理 PLAYER_INFO 消息
      if (message.type === 'PLAYER_INFO') {
        console.log('[Ingame] Player info:', message.players);
        setPlayers(message.players || []);

        if ((message.players?.length ?? 0) > 0 && !displayMode) {
          setDisplayMode('strategy');
        }
      }

      // 处理 MATCH_INFO 消息
      if (message.type === 'MATCH_INFO') {
        console.log('[Ingame] Match info:', message);
        setMatchInfo({
          match_id: message.match_id,
          match_mode: message.match_mode,
          winner: message.winner,
          start_time: message.start_time,
          end_time: message.end_time,
        });
        // 自动切换到 postgame 模式
        setDisplayMode('postgame');
      }
    });

    // 监听游戏信息更新（直接从 ingame 窗口监听）
    let infoUpdatesListener: ((info: any) => void) | undefined;
    if (typeof overwolf !== 'undefined') {
      infoUpdatesListener = (info: any) => {
        console.log('[Ingame] Info update:', info);
        if (info && info.info) {
          updatePlayersFromGameInfo(info.info);
        }
      };
      overwolf.games.events.onInfoUpdates2.addListener(infoUpdatesListener);

      overwolf.games.events.getInfo((result: any) => {
        if (result && result.res) {
          updatePlayersFromGameInfo(result.res);
        }
      });
    }

    return () => {
      unsubscribe?.();
      if (infoUpdatesListener && typeof overwolf !== 'undefined') {
        overwolf.games.events.onInfoUpdates2.removeListener(infoUpdatesListener);
      }
    };
  }, []);

  const updatePlayersFromGameInfo = (gameInfo: any) => {
    const playerList = extractPlayers(gameInfo);

    if (playerList.length > 0) {
      setPlayers(playerList);
    }

    const infoMatch = gameInfo?.match_info;
    if (infoMatch) {
      setMatchInfo({
        match_id: infoMatch.pseudo_match_id || infoMatch.match_id,
        match_mode: infoMatch.game_mode || infoMatch.mode,
        winner: infoMatch.winner,
        start_time: infoMatch.start_time,
        end_time: infoMatch.end_time,
      });
    }
  };

  const extractPlayers = (gameInfo: any): Player[] => {
    const playerList: Player[] = [];

    const appendPlayers = (source: any[]) => {
      const startIndex = playerList.length;
      source.forEach((player: any, index: number) => {
        playerList.push({
          playerId:
            player.playerId ||
            player.account_id ||
            player.steamId ||
            player.steam_id ||
            player.steamid ||
            `player_${startIndex + index}`,
          playerName: player.player_name || player.name || player.playerName || '未知',
          steamId: player.steamid || player.steam_id || player.steamId,
          heroName: player.hero || player.heroName,
          team:
            player.team ||
            (player.team_name === 'radiant'
              ? 'radiant'
              : player.team_name === 'dire'
              ? 'dire'
              : undefined),
        });
      });
    };

    if (Array.isArray(gameInfo?.roster?.players)) {
      appendPlayers(gameInfo.roster.players);
    }

    if (playerList.length === 0 && Array.isArray(gameInfo?.match_info?.players)) {
      appendPlayers(gameInfo.match_info.players);
    }

    return playerList;
  };

  return (
    <div className="min-h-screen bg-black/85 text-white p-4 relative">
      <div
        className="flex items-center justify-between mb-4 select-none cursor-move"
        onMouseDown={() => dragWindow()}
      >
        <div>
          <h1 className="text-lg font-bold">In-Game Overlay</h1>
          <p className="text-xs text-gray-400">
            {displayMode === 'strategy' ? '策略阶段' : displayMode === 'postgame' ? '赛后阶段' : '等待游戏数据...'}
          </p>
        </div>

        <div className="flex items-center gap-2 cursor-default">
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              dragWindow();
            }}
            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
          >
            拖动
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              dragResizeWindow('BottomRight');
            }}
            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded cursor-se-resize"
          >
            调整大小
          </button>
        </div>
      </div>

      {/* 根据 displayMode 显示不同组件 */}
      {displayMode === 'strategy' && (
        <PlayerSimpleRating players={players} />
      )}

      {displayMode === 'postgame' && (
        <EditRating players={players} matchId={matchInfo?.match_id} />
      )}

      {!displayMode && (
        <div className="text-center py-8 text-gray-400 text-sm">
          等待游戏数据...
        </div>
      )}

      <div className="mt-4 pt-2 border-t border-white/10 text-xs text-gray-500">
        Alt+Shift+D 隐藏
      </div>

      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          dragResizeWindow('BottomRight');
        }}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IngameApp />
  </React.StrictMode>,
);
