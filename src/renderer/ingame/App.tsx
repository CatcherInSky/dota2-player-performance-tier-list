/**
 * InGame Window App
 * 使用消息通信接收来自 Background Window 的数据
 */

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '@renderer/shared/components/ErrorBoundary';
import { useAppStore } from '@renderer/shared/store';
import { RecordMode } from './RecordMode';
import { ReviewMode } from './ReviewMode';
import type { RosterPlayer } from '@shared/types/gep';

type Mode = 'record' | 'review';

interface WindowMessage {
  type: string;
  mode?: Mode;
  data?: any;
}

function App() {
  const [mode, setMode] = useState<Mode>('record');
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [localSteamId, setLocalSteamId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[InGame] Initializing...');
    
    // 监听来自 Background Window 的消息
    // TODO: 集成 Overwolf API
    // overwolf.windows.onMessageReceived.addListener(handleMessage);
    
    // 请求初始数据
    requestInitialData();
    
    // 开发时使用模拟数据
    if (import.meta.env.DEV) {
      setTimeout(() => {
        handleMessage({
          type: 'setMode',
          mode: 'record',
          data: {
            rosterPlayers: mockPlayers,
            localSteamId: 'mock_local_steam_id',
            matchId: 'mock_match_id',
          },
        });
      }, 1000);
    }

    return () => {
      // TODO: 清理事件监听器
      // overwolf.windows.onMessageReceived.removeListener(handleMessage);
    };
  }, []);

  /**
   * 请求初始数据
   */
  const requestInitialData = () => {
    console.log('[InGame] Requesting initial data from background...');
    
    // TODO: 向 Background Window 请求当前数据
    // overwolf.windows.sendMessage('background', {
    //   type: 'requestIngameData',
    // });
  };

  /**
   * 处理来自 Background Window 的消息
   */
  const handleMessage = (message: WindowMessage) => {
    console.log('[InGame] Received message:', message);

    switch (message.type) {
      case 'setMode':
        if (message.mode && message.data) {
          setMode(message.mode);
          setRosterPlayers(message.data.rosterPlayers || []);
          setLocalSteamId(message.data.localSteamId || '');
          setMatchId(message.data.matchId || '');
          setIsLoading(false);
        }
        break;

      case 'updateRoster':
        if (message.data?.rosterPlayers) {
          setRosterPlayers(message.data.rosterPlayers);
        }
        break;

      case 'close':
        handleClose();
        break;

      default:
        console.warn('[InGame] Unknown message type:', message.type);
    }
  };

  /**
   * 关闭窗口
   */
  const handleClose = () => {
    console.log('[InGame] Closing window');
    
    // TODO: 通知 Background Window 关闭窗口
    // overwolf.windows.sendMessage('background', {
    //   type: 'closeIngame',
    // });
    
    // TODO: 实现 Overwolf API 调用
    // overwolf.windows.hide('ingame');
  };

  /**
   * 隐藏窗口（快捷键）
   */
  const handleHide = () => {
    console.log('[InGame] Hiding window');
    
    // TODO: 实现 Overwolf API 调用
    // overwolf.windows.minimize('ingame');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black/80 text-white">
        {isLoading ? (
          <LoadingScreen mode={mode} />
        ) : (
          <>
            {mode === 'record' && rosterPlayers.length > 0 && (
              <RecordMode
                rosterPlayers={rosterPlayers}
                localSteamId={localSteamId}
                onHide={handleHide}
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
              <EmptyState mode={mode} />
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

/**
 * 加载屏幕
 */
function LoadingScreen({ mode }: { mode: Mode }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
        </div>
        <p className="text-xl mb-2">加载中...</p>
        <p className="text-sm">模式: {mode === 'record' ? '记录' : '点评'}</p>
      </div>
    </div>
  );
}

/**
 * 空状态
 */
function EmptyState({ mode }: { mode: Mode }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 text-center">
        <p className="text-xl mb-2">等待游戏数据...</p>
        <p className="text-sm">当前模式: {mode === 'record' ? '记录' : '点评'}</p>
      </div>
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

