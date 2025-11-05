import { useState, useEffect } from 'react';
import {
  isOverwolfApp,
  getRunningGameInfo,
  simulateGameStateChange,
} from './utils/overwolf';

function App() {
  const [gameState, setGameState] = useState<string>('未检测到游戏');
  const [isGameRunning, setIsGameRunning] = useState(false);

  useEffect(() => {
    // 检查游戏状态
    const checkGameState = async () => {
      if (isOverwolfApp()) {
        const gameInfo = await getRunningGameInfo();
        if (gameInfo && gameInfo.isRunning) {
          setIsGameRunning(true);
          setGameState('Dota 2 运行中');
        } else {
          setIsGameRunning(false);
          setGameState('Dota 2 未运行');
        }
      } else {
        setGameState('非 Overwolf 环境');
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 3000);
    return () => clearInterval(interval);
  }, []);

  // 模拟游戏状态变化（测试用）
  const handleGameStateChange = async (state: string) => {
    await simulateGameStateChange(state);
    const stateName = state === 'DOTA_GAMERULES_STATE_STRATEGY_TIME' ? '策略阶段' : '赛后阶段';
    setGameState(`模拟: ${stateName}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Dota 2 Performance Tier List</h1>
        <p className="text-sm text-gray-400 mb-6">Desktop Window - MVP</p>

        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">环境:</span>
              <span className="font-mono">{isOverwolfApp() ? 'Overwolf' : 'Browser'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">游戏状态:</span>
              <span className="font-mono text-blue-400">{gameState}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">游戏运行:</span>
              <span className={`font-mono ${isGameRunning ? 'text-green-400' : 'text-gray-500'}`}>
                {isGameRunning ? '是' : '否'}
              </span>
            </div>
          </div>
        </div>

        {isOverwolfApp() && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3 text-gray-300">测试控制</h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleGameStateChange('DOTA_GAMERULES_STATE_STRATEGY_TIME')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                策略阶段
              </button>
              <button
                onClick={() => handleGameStateChange('DOTA_GAMERULES_STATE_POST_GAME')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                赛后阶段
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
