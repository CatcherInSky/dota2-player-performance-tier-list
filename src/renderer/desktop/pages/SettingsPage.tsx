import React, { useState } from 'react';
import { useSettings } from '@renderer/shared/hooks/useSettings';
import { useDatabase } from '@renderer/shared/hooks/useDatabase';
import { Button } from '@renderer/shared/components/Button';
import { Input } from '@renderer/shared/components/Input';
import { Select } from '@renderer/shared/components/Select';
import { Modal } from '@renderer/shared/components/Modal';
import { exportData, importData } from '@renderer/shared/utils/export';
import { DEFAULT_SETTINGS } from '@shared/types/settings';

export function SettingsPage() {
  const { settings, saveSettings, resetSettings } = useSettings();
  const { deleteAllData } = useDatabase();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExport = async () => {
    try {
      await exportData();
      showMessage('success', '数据导出成功！');
    } catch (error) {
      showMessage('error', `导出失败：${error}`);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const result = await importData(importFile);
      showMessage(
        'success',
        `导入成功！比赛: ${result.imported.matches}, 玩家: ${result.imported.players}, 点评: ${result.imported.reviews}`
      );
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      showMessage('error', `导入失败：${error}`);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllData();
      showMessage('success', '所有数据已删除');
      setShowDeleteModal(false);
    } catch (error) {
      showMessage('error', `删除失败：${error}`);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-400'
              : 'bg-red-900/50 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 基础设置 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">基础设置</h2>
        <div className="space-y-4">
          <Select
            label="语言"
            options={[
              { value: 'zh-CN', label: '简体中文' },
              { value: 'en-US', label: 'English' },
            ]}
            value={settings.language}
            onChange={(e) =>
              saveSettings({ language: e.target.value as 'zh-CN' | 'en-US' })
            }
          />
          <Input
            label="快捷键"
            value={settings.hotkey}
            onChange={(e) => saveSettings({ hotkey: e.target.value })}
            placeholder="例如: Alt+`"
          />
        </div>
      </div>

      {/* 评分文案 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">评分文案</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => saveSettings({ ratingLabels: DEFAULT_SETTINGS.ratingLabels })}
          >
            恢复默认
          </Button>
        </div>
        <div className="space-y-3">
          {([5, 4, 3, 2, 1] as const).map((rating) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-yellow-500 text-xl">
                {'⭐'.repeat(rating)}
              </span>
              <Input
                value={settings.ratingLabels[rating]}
                onChange={(e) =>
                  saveSettings({
                    ratingLabels: {
                      ...settings.ratingLabels,
                      [rating]: e.target.value,
                    },
                  })
                }
                placeholder={`${rating}星文案`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 数据管理 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">数据管理</h2>
        <div className="space-y-3">
          <Button onClick={handleExport} className="w-full">
            导出数据 (JSON)
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
            className="w-full"
          >
            导入数据
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="w-full"
          >
            删除所有数据（危险）
          </Button>
        </div>
      </div>

      {/* 关于 */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">关于</h2>
        <div className="space-y-2 text-gray-300">
          <div className="flex justify-between">
            <span>版本:</span>
            <span className="text-white">v1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Overwolf 应用ID:</span>
            <span className="text-white">Dota2PlayerPerformance</span>
          </div>
          <div className="pt-4">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              查看使用说明
            </a>
          </div>
        </div>
      </div>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除所有数据"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDeleteAll}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-white">
          此操作将删除所有比赛记录、玩家信息和点评数据，且无法恢复。
        </p>
        <p className="text-red-400 mt-2">建议在删除前先导出数据备份。</p>
      </Modal>

      {/* 导入模态框 */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
        }}
        title="导入数据"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleImport} disabled={!importFile}>
              导入
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-white">
            选择之前导出的 JSON 数据文件。相同ID的数据将被覆盖。
          </p>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
          {importFile && (
            <p className="text-sm text-gray-400">
              已选择: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

