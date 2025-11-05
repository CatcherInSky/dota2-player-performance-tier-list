import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { onMessageReceived } from './utils/overwolf';

interface Player {
  steamId?: string;
  playerId?: string;
  playerName?: string;
  heroName?: string;
  team?: string;
}

function IngameApp() {
  const [gameState, setGameState] = useState<string>('未知');
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // 监听来自 background 的消息
    onMessageReceived((message) => {
      console.log('[Ingame] Received message:', message);
      
      if (message.type === 'DISPLAY_MODE') {
        setGameState(message.mode === 'strategy' ? '策略阶段' : '赛后阶段');
      }
      
      // 接收玩家信息
      if (message.type === 'PLAYER_INFO') {
        console.log('[Ingame] Player info:', message.players);
        setPlayers(message.players || []);
      }
    });

    // 监听游戏信息更新（直接从 ingame 窗口监听）
    if (typeof overwolf !== 'undefined') {
      overwolf.games.events.onInfoUpdates2.addListener((info: any) => {
        console.log('[Ingame] Info update:', info);
        if (info && info.info) {
          updatePlayersFromGameInfo(info.info);
        }
      });
    }
  }, []);

  const updatePlayersFromGameInfo = (gameInfo: any) => {
    const playerList: Player[] = [];
    
    // 尝试从不同的字段获取玩家信息
    // Dota 2 GEP 可能在 roster 或 match_info 中提供玩家数据
    if (gameInfo.roster) {
      Object.entries(gameInfo.roster).forEach(([key, value]: [string, any]) => {
        playerList.push({
          playerId: value.playerId || key,
          playerName: value.name || value.playerName || '未知',
          steamId: value.steamId,
          heroName: value.heroName,
          team: value.team
        });
      });
    }
    
    if (gameInfo.players) {
      Object.entries(gameInfo.players).forEach(([key, value]: [string, any]) => {
        playerList.push({
          playerId: value.playerId || key,
          playerName: value.name || value.playerName || '未知',
          steamId: value.steamId,
          heroName: value.heroName,
          team: value.team
        });
      });
    }
    
    if (playerList.length > 0) {
      setPlayers(playerList);
    }
  };

  return (
    <div className="min-h-screen bg-black/85 text-white p-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold">In-Game Overlay</h1>
        <p className="text-xs text-gray-400">{gameState}</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-300">玩家列表 ({players.length})</h2>
        {players.length === 0 ? (
          <div className="text-gray-500 text-xs">等待玩家数据...</div>
        ) : (
          <div className="space-y-1.5">
            {players.map((player, index) => (
              <div 
                key={index} 
                className={`p-2 rounded bg-white/10 border-l-2 ${
                  player.team === 'radiant' ? 'border-green-500' : 
                  player.team === 'dire' ? 'border-red-500' : 
                  'border-gray-500'
                }`}
              >
                <div className="text-sm font-medium">{player.playerName || `玩家 ${index + 1}`}</div>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {player.playerId && <div>ID: {player.playerId}</div>}
                  {player.steamId && <div>Steam: {player.steamId}</div>}
                  {player.heroName && <div className="text-yellow-400">英雄: {player.heroName}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/10 text-xs text-gray-500">
        Alt+Shift+D 隐藏
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IngameApp />
  </React.StrictMode>,
);
