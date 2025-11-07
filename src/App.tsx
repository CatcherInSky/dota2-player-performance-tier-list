/**
 * Desktop 窗口主应用
 * 使用 React Router 管理路由
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppGuide } from './components/desktop/AppGuide';
import { OverviewData } from './components/desktop/OverviewData';
import { MatchDetail } from './components/desktop/MatchDetail';
import { PlayerDetail } from './components/desktop/PlayerDetail';
import { Settings } from './components/desktop/Settings';
import { Logs } from './components/desktop/Logs';
import { isOverwolfApp, getRunningGameInfo, onMessageReceived } from './utils/overwolf';
import { matchesRepository } from './db/repositories/matches.repository';

interface LogEntry {
  id: string;
  timestamp: number;
  category: string;
  data: any;
}

function AppContent() {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 检查游戏状态
    const checkGameState = async () => {
      if (isOverwolfApp()) {
        const gameInfo = await getRunningGameInfo();
        if (gameInfo && gameInfo.isRunning) {
          setIsGameRunning(true);
        } else {
          setIsGameRunning(false);
        }
      }
    };

    checkGameState();
    const interval = setInterval(checkGameState, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 检查是否有数据
    const checkData = async () => {
      try {
        const matches = await matchesRepository.findAll();
        setHasData(matches.length > 0);
      } catch (error) {
        console.error('[App] Error checking data:', error);
        setHasData(false);
      }
    };
    checkData();
  }, []);

  // 鼠标侧键支持（Mouse 4/5）
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 3) {
        // Mouse 4 (后退)
        e.preventDefault();
        navigate(-1);
      } else if (e.button === 4) {
        // Mouse 5 (前进)
        e.preventDefault();
        navigate(1);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [navigate]);

  useEffect(() => {
    if (!isOverwolfApp()) {
      return;
    }

    const unsubscribe = onMessageReceived((message) => {
      if (!message || typeof message !== 'object') {
        return;
      }

      setLogs((prev) => {
        const entry: LogEntry = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: message.timestamp || Date.now(),
          category: message.type || message.category || 'message',
          data: message,
        };
        const next = [...prev, entry];
        if (next.length > 500) {
          next.splice(0, next.length - 500);
        }
        return next;
      });

      if (message.type === 'NAVIGATE_TO_PLAYER' && message.playerId) {
        navigate(`/player/${message.playerId}`);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  // 根据状态决定显示哪个组件
  const getDefaultRoute = () => {
    if (!isGameRunning) {
      // 状态 1: 没打开 dota2 - 暂时显示应用说明
      return '/guide';
    }
    if (hasData === false) {
      // 状态 2: 没有历史数据 - 显示应用说明
      return '/guide';
    }
    // 状态 4/5: 有数据 - 显示总览
    return '/overview';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航栏 */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">Dota 2 玩家表现评价</h1>
          </div>
          
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              disabled={location.pathname === '/' || location.pathname === '/overview' || location.pathname === '/guide'}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
            >
              后退
            </button>
            <button
              onClick={() => navigate(1)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            >
              前进
            </button>
            <button
              onClick={() => navigate('/overview')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            >
              设置
            </button>
            <button
              onClick={() => navigate('/logs')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            >
              日志
            </button>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="p-6">
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          <Route path="/guide" element={<AppGuide />} />
          <Route path="/overview" element={<OverviewData />} />
          <Route path="/match/:matchId" element={<MatchDetail />} />
          <Route path="/player/:playerId" element={<PlayerDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/logs" element={<Logs logs={logs} onClear={handleClearLogs} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
