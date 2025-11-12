import Dexie from 'dexie'
import { db, createDefaultSettingsRecord, SETTINGS_ID } from '../db'
import type { SettingsRecord } from '../../shared/types/database'
import { Logger } from '../../shared/utils/logger'

export class SettingsRepository {
  private logger = new Logger({ namespace: 'SettingsRepository' })

  async get(): Promise<SettingsRecord> {
    const existing = await db.settings.get(SETTINGS_ID)
    if (existing) {
      return existing
    }

    const defaults = createDefaultSettingsRecord()
    await db.settings.put(defaults)
    return defaults
  }

  async update(payload: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const executor = async () => {
      const current = await this.get()
      const next: SettingsRecord = {
        ...current,
        ...payload,
        ratingLabels: payload.ratingLabels ?? current.ratingLabels,
        updatedAt: Date.now(),
      }
      await db.settings.put(next)
      this.logger.info('Settings updated', next)
      return next
    }

    if (Dexie.currentTransaction) {
      return executor()
    }

    return db.transaction('readwrite', db.settings, executor)
  }

  async reset(): Promise<SettingsRecord> {
    const executor = async () => {
      await db.settings.clear()
      const defaults = createDefaultSettingsRecord()
      await db.settings.put(defaults)
      return defaults
    }

    if (Dexie.currentTransaction) {
      return executor()
    }
    return db.transaction('readwrite', db.settings, executor)
  }
}

