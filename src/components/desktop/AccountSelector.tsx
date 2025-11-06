/**
 * 账号切换组件
 * 从 accounts 表查询所有记录，按 updated_at 降序排序，默认选中最近使用的账号
 */

import { useState, useEffect } from 'react';
import { accountsRepository } from '../../db/repositories/accounts.repository';
import type { Account } from '../../db/database';

interface AccountSelectorProps {
  onAccountChange?: (account: Account) => void;
}

export function AccountSelector({ onAccountChange }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // 按 updated_at 降序排序
      const allAccounts = await accountsRepository.findAllOrderByUpdatedAt();
      setAccounts(allAccounts);

      // 默认选中最近使用的账号（第一条）
      if (allAccounts.length > 0) {
        const firstAccount = allAccounts[0];
        setSelectedAccountId(firstAccount.uuid);
        onAccountChange?.(firstAccount);
      }
    } catch (error) {
      console.error('[AccountSelector] Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (uuid: string) => {
    setSelectedAccountId(uuid);
    const account = accounts.find((a) => a.uuid === uuid);
    if (account) {
      onAccountChange?.(account);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-400">加载账号中...</div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-gray-400">暂无账号数据</div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="account-select" className="text-sm text-gray-300 whitespace-nowrap">
        账号:
      </label>
      <select
        id="account-select"
        value={selectedAccountId || ''}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      >
        {accounts.map((account) => (
          <option key={account.uuid} value={account.uuid}>
            {account.name} ({account.account_id})
          </option>
        ))}
      </select>
    </div>
  );
}

