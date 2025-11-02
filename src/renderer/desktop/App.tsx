import React, { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';

type TabType = 'home' | 'data' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 头部 */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-8 py-4">
          <h1 className="text-2xl font-bold">Dota 2 玩家锐评器</h1>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-8">
          <div className="flex gap-1">
            {[
              { key: 'home' as TabType, label: '主页' },
              { key: 'data' as TabType, label: '数据' },
              { key: 'settings' as TabType, label: '设置' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-blue-500 bg-gray-900'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="container mx-auto px-8 py-6">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'data' && <DataPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}

export default App;

