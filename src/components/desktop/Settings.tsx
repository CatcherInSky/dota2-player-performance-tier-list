/**
 * 设置页面
 * 语言切换、快捷键配置、评分文案配置、数据导入/导出等
 */

import { useState } from 'react';
import { matchesRepository } from '../../db/repositories/matches.repository';
import { playersRepository } from '../../db/repositories/players.repository';
import { accountsRepository } from '../../db/repositories/accounts.repository';
import { ratingsRepository } from '../../db/repositories/ratings.repository';

export function Settings() {
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [ratingTexts, setRatingTexts] = useState({
    1: '很差',
    2: '较差',
    3: '一般',
    4: '较好',
    5: '很好',
  });

  const handleExport = async () => {
    try {
      const matches = await matchesRepository.findAll();
      const players = await playersRepository.findAll();
      const accounts = await accountsRepository.findAll();
      const ratings = await ratingsRepository.findAll();

      const data = {
        version: '1.0',
        exported_at: Math.floor(Date.now() / 1000),
        data: {
          matches,
          players,
          accounts,
          ratings,
        },
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dota2-performance-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('数据导出成功！');
    } catch (error) {
      console.error('[Settings] Export error:', error);
      alert('数据导出失败！');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.data || !data.version) {
          alert('无效的数据文件格式！');
          return;
        }

        const confirmed = confirm(
          `准备导入数据：\n` +
          `- 比赛: ${data.data.matches?.length || 0} 条\n` +
          `- 玩家: ${data.data.players?.length || 0} 条\n` +
          `- 账户: ${data.data.accounts?.length || 0} 条\n` +
          `- 评分: ${data.data.ratings?.length || 0} 条\n\n` +
          `是否继续？`
        );

        if (!confirmed) return;

        // 导入数据（简单实现：直接添加，不处理冲突）
        if (data.data.matches) {
          for (const match of data.data.matches) {
            try {
              await matchesRepository.create(match);
            } catch (error) {
              console.warn('[Settings] Failed to import match:', match.uuid, error);
            }
          }
        }

        if (data.data.players) {
          for (const player of data.data.players) {
            try {
              await playersRepository.upsert(player);
            } catch (error) {
              console.warn('[Settings] Failed to import player:', player.uuid, error);
            }
          }
        }

        if (data.data.accounts) {
          for (const account of data.data.accounts) {
            try {
              await accountsRepository.upsert(account);
            } catch (error) {
              console.warn('[Settings] Failed to import account:', account.uuid, error);
            }
          }
        }

        if (data.data.ratings) {
          for (const rating of data.data.ratings) {
            try {
              await ratingsRepository.create(rating);
            } catch (error) {
              console.warn('[Settings] Failed to import rating:', rating.uuid, error);
            }
          }
        }

        alert('数据导入成功！');
        window.location.reload(); // 刷新页面以显示新数据
      } catch (error) {
        console.error('[Settings] Import error:', error);
        alert('数据导入失败！');
      }
    };
    input.click();
  };

  const handleDeleteAll = async () => {
    const confirmed = confirm(
      '警告：此操作将删除所有数据，且无法恢复！\n\n' +
      '请输入 "DELETE" 确认删除：'
    );

    if (confirmed) {
      const input = prompt('请输入 "DELETE" 确认删除：');
      if (input === 'DELETE') {
        try {
          await matchesRepository.deleteAll();
          await playersRepository.deleteAll();
          await accountsRepository.deleteAll();
          await ratingsRepository.deleteAll();
          alert('所有数据已删除！');
          window.location.reload();
        } catch (error) {
          console.error('[Settings] Delete error:', error);
          alert('删除失败！');
        }
      } else {
        alert('确认文字不匹配，操作已取消。');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      <div className="space-y-6">
        {/* 语言设置 */}
        <section className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">语言设置</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setLanguage('zh')}
              className={`px-4 py-2 rounded transition-colors ${
                language === 'zh'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              English
            </button>
          </div>
        </section>

        {/* 评分文案配置 */}
        <section className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">评分文案配置</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((score) => (
              <div key={score} className="flex items-center gap-4">
                <span className="w-20 text-gray-400">{score} 星:</span>
                <input
                  type="text"
                  value={ratingTexts[score as keyof typeof ratingTexts]}
                  onChange={(e) =>
                    setRatingTexts({ ...ratingTexts, [score]: e.target.value })
                  }
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 数据管理 */}
        <section className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">数据管理</h3>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
            >
              导出数据
            </button>
            <button
              onClick={handleImport}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              导入数据
            </button>
            <button
              onClick={handleDeleteAll}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            >
              删除全部数据
            </button>
          </div>
        </section>

        {/* 关于 */}
        <section className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">关于</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">版本:</span>
              <span className="ml-2">0.1.0</span>
            </div>
            <div>
              <span className="text-gray-400">联系邮箱:</span>
              <span className="ml-2">support@example.com</span>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              所有数据存储在本地，不会上传到服务器。
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

