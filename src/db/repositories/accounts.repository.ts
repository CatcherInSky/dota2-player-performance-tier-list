/**
 * Accounts Repository
 * 账户表操作封装
 */

import { db, Account } from '../database';

export class AccountsRepository {
  /**
   * 创建账户记录
   */
  async create(account: Omit<Account, 'uuid'>): Promise<string> {
    const uuid = this.generateUUID();
    await db.accounts.add({
      ...account,
      uuid,
    });
    return uuid;
  }

  /**
   * 更新账户记录
   */
  async update(uuid: string, updates: Partial<Account>): Promise<void> {
    await db.accounts.update(uuid, updates);
  }

  /**
   * 根据 UUID 查找账户
   */
  async findById(uuid: string): Promise<Account | undefined> {
    return await db.accounts.get(uuid);
  }

  /**
   * 根据 account_id 查找账户
   */
  async findByAccountId(accountId: string | number): Promise<Account | undefined> {
    return await db.accounts.where('account_id').equals(accountId).first();
  }

  /**
   * 查找所有账户
   */
  async findAll(): Promise<Account[]> {
    return await db.accounts.toArray();
  }

  /**
   * 按 updated_at 降序排序查找账户
   */
  async findAllOrderByUpdatedAt(limit?: number): Promise<Account[]> {
    let query = db.accounts.orderBy('updated_at').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return await query.toArray();
  }

  /**
   * 获取当前账户（最近使用的账户）
   * 按 updated_at 降序排序，取第一条
   */
  async getCurrentAccount(): Promise<Account | undefined> {
    return await db.accounts
      .orderBy('updated_at')
      .reverse()
      .first();
  }

  /**
   * 检查 account_id 是否已存在
   */
  async exists(accountId: string | number): Promise<boolean> {
    const account = await this.findByAccountId(accountId);
    return account !== undefined;
  }

  /**
   * 更新或创建账户记录
   * 如果 account_id 存在则更新，否则创建
   */
  async upsert(account: Omit<Account, 'uuid'>): Promise<string> {
    const existing = await this.findByAccountId(account.account_id);
    
    if (existing) {
      // 更新现有记录
      await this.update(existing.uuid, {
        name: account.name,
        updated_at: account.updated_at,
      });
      return existing.uuid;
    } else {
      // 创建新记录
      return await this.create(account);
    }
  }

  /**
   * 删除账户记录
   */
  async delete(uuid: string): Promise<void> {
    await db.accounts.delete(uuid);
  }

  /**
   * 删除所有账户记录
   */
  async deleteAll(): Promise<void> {
    await db.accounts.clear();
  }

  /**
   * 生成 UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const accountsRepository = new AccountsRepository();

