import { db } from './db'
import type { SettingsRecord } from '../shared/types/database'
import { Logger } from '../shared/utils/logger'

export class SettingsService {
  private logger = new Logger({ namespace: 'SettingsService' })

  async getSettings(): Promise<SettingsRecord> {
    return db.getSettings()
  }

  async updateSettings(payload: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const current = await db.getSettings()
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

  async resetToDefaults(): Promise<SettingsRecord> {
    await db.settings.clear()
    return db.getSettings()
  }
}

