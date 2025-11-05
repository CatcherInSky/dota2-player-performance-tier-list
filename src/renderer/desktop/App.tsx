/**
 * Desktop Window App
 * 使用 Hash Router 实现页面导航
 */

import React from 'react';
import { Router, Route } from '@renderer/shared/router';
import { ErrorBoundary } from '@renderer/shared/components/ErrorBoundary';
import { NavLink } from '@renderer/shared/router';
import { HomePage } from './pages/HomePage';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';

// 路由配置
const routes: Route[] = [
  { path: '/', component: HomePage },
  { path: '/home', component: HomePage },
  { path: '/data', component: DataPage },
  { path: '/settings', component: SettingsPage },
];

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* 头部 */}
        <Header />

        {/* Tab 导航 */}
        <Navigation />

        {/* 内容区域 */}
        <main className="container mx-auto px-8 py-6">
          <Router routes={routes} />
        </main>
      </div>
    </ErrorBoundary>
  );
}

/**
 * 页面头部
 */
function Header() {
  return (
    <div className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dota 2 玩家锐评器</h1>
          
          {/* 窗口控制按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // TODO: 集成 Overwolf API
                // overwolf.windows.minimize('desktop');
                console.log('Minimize window');
              }}
              className="px-3 py-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
              title="最小化"
            >
              <span className="text-lg">−</span>
            </button>
            <button
              onClick={() => {
                // TODO: 集成 Overwolf API
                // overwolf.windows.close('desktop');
                console.log('Close window');
              }}
              className="px-3 py-1 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded transition-colors"
              title="关闭"
            >
              <span className="text-lg">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 导航栏
 */
function Navigation() {
  const tabs = [
    { path: '/home', label: '主页' },
    { path: '/data', label: '数据' },
    { path: '/settings', label: '设置' },
  ];

  return (
    <nav className="bg-gray-800/50 border-b border-gray-700">
      <div className="container mx-auto px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="px-6 py-3 font-medium transition-colors relative text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              activeClassName="!text-blue-500 !bg-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500"
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default App;

