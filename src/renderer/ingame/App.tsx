import React, { useState, useEffect } from 'react';
import { RecordMode } from './RecordMode';
import { ReviewMode } from './ReviewMode';
import type { RosterPlayer } from '@shared/types/gep';

type Mode = 'record' | 'review';

function App() {
  const [mode, setMode] = useState<Mode>('record');
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [localSteamId, setLocalSteamId] = useState('');
  const [matchId, setMatchId] = useState('');

  useEffect(() => {
    // 监听来自 Background Window 的消息
    // TODO: 集成 Overwolf API
    // overwolf.windows.onMessageReceived.addListener(handleMessage);
    
    // 开发时使用模拟数据
    if (import.meta.env.DEV) {
      setLocalSteamId('mock_local_steam_id');
      setMatchId('mock_match_id');
      setRosterPlayers(mockPlayers);
    }
  }, []);

  const handleMessage = (message: any) => {
    if (message.type === 'setMode') {
      setMode(message.mode);
    } else if (message.type === 'setRosterData') {
      setRosterPlayers(message.rosterPlayers);
      setLocalSteamId(message.localSteamId);
    } else if (message.type === 'setMatchId') {
      setMatchId(message.matchId);
    }
  };

  const handleClose = () => {
    // TODO: 通知 Background Window 关闭窗口
    // overwolf.windows.sendMessage('background', 'closeInGame');
    console.log('Close ingame window');
  };

  return (
    <div className="min-h-screen bg-black/80 text-white">
      {mode === 'record' && rosterPlayers.length > 0 && (
        <RecordMode
          rosterPlayers={rosterPlayers}
          localSteamId={localSteamId}
        />
      )}
      {mode === 'review' && rosterPlayers.length > 0 && (
        <ReviewMode
          rosterPlayers={rosterPlayers}
          localSteamId={localSteamId}
          matchId={matchId}
          onClose={handleClose}
        />
      )}
      {rosterPlayers.length === 0 && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-400 text-center">
            <p className="text-xl mb-2">等待游戏数据...</p>
            <p className="text-sm">当前模式: {mode === 'record' ? '记录' : '点评'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 开发模拟数据
const mockPlayers: RosterPlayer[] = [
  {
    steamid: '76561197960287930',
    account_id: '27930',
    hero: 'npc_dota_hero_axe',
    hero_id: '2',
    team: 'radiant',
    player_name: '测试玩家1',
    pro: '0',
  },
  {
    steamid: '76561197960287931',
    account_id: '27931',
    hero: 'npc_dota_hero_pudge',
    hero_id: '14',
    team: 'radiant',
    player_name: '测试玩家2',
    pro: '0',
  },
  {
    steamid: '76561197960287932',
    account_id: '27932',
    hero: 'npc_dota_hero_invoker',
    hero_id: '74',
    team: 'radiant',
    player_name: '测试玩家3',
    pro: '0',
  },
  {
    steamid: 'mock_local_steam_id',
    account_id: '27933',
    hero: 'npc_dota_hero_crystal_maiden',
    hero_id: '5',
    team: 'radiant',
    player_name: '你',
    pro: '0',
  },
  {
    steamid: '76561197960287934',
    account_id: '27934',
    hero: 'npc_dota_hero_earthshaker',
    hero_id: '7',
    team: 'radiant',
    player_name: '测试玩家5',
    pro: '0',
  },
  {
    steamid: '76561197960287935',
    account_id: '27935',
    hero: 'npc_dota_hero_lion',
    hero_id: '52',
    team: 'dire',
    player_name: '测试玩家6',
    pro: '0',
  },
  {
    steamid: '76561197960287936',
    account_id: '27936',
    hero: 'npc_dota_hero_shadow_fiend',
    hero_id: '11',
    team: 'dire',
    player_name: '测试玩家7',
    pro: '0',
  },
  {
    steamid: '76561197960287937',
    account_id: '27937',
    hero: 'npc_dota_hero_mirana',
    hero_id: '9',
    team: 'dire',
    player_name: '测试玩家8',
    pro: '0',
  },
  {
    steamid: '76561197960287938',
    account_id: '27938',
    hero: 'npc_dota_hero_antimage',
    hero_id: '1',
    team: 'dire',
    player_name: '测试玩家9',
    pro: '0',
  },
  {
    steamid: '76561197960287939',
    account_id: '27939',
    hero: 'npc_dota_hero_drow_ranger',
    hero_id: '6',
    team: 'dire',
    player_name: '测试玩家10',
    pro: '0',
  },
];

export default App;

