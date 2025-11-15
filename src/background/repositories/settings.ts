import Dexie from 'dexie'
import { db, createDefaultSettingsRecord, DEFAULT_SETTINGS_TEMPLATE, SETTINGS_ID } from '../db'
import type { Language, RatingLabelKey, SettingsRecord } from '../../shared/types/database'
import { Logger } from '../../shared/utils/logger'

const SUPPORTED_LANGUAGES: Language[] = ['zh-CN', 'en-US']

/**
 * SettingsRepository - 设置数据仓库
 * 负责应用设置的读取、更新、重置等数据库操作
 */
export class SettingsRepository {
  private logger = new Logger({ namespace: 'SettingsRepository' })

  /**
   * 获取设置记录
   * 如果记录不存在则创建默认设置
   * 如果记录存在但ratingLabels格式为旧版本，则自动迁移到新格式
   * @returns 设置记录
   */
  async get(): Promise<SettingsRecord> {
    const existing = await db.settings.get(SETTINGS_ID)
    if (existing) {
      if (!isLocalizedRatingLabels(existing.ratingLabels)) {
        const defaults = cloneRatingLabels(DEFAULT_SETTINGS_TEMPLATE.ratingLabels)
        const activeLanguage = existing.language ?? 'zh-CN'
        const legacy = existing.ratingLabels as unknown as Record<RatingLabelKey, string>
        defaults[activeLanguage] = {
          ...defaults[activeLanguage],
          ...legacy,
        }
        const migrated: SettingsRecord = {
          ...existing,
          ratingLabels: defaults,
          updatedAt: Date.now(),
        }
        await db.settings.put(migrated)
        this.logger.info('Settings migrated to localized rating labels', migrated)
        return migrated
      }
      return existing
    }

    const defaults = createDefaultSettingsRecord()
    await db.settings.put(defaults)
    return defaults
  }

  /**
   * 更新设置记录
   * 支持部分更新，会自动合并ratingLabels（支持按语言分组）
   * @param payload - 要更新的设置字段
   * @returns 更新后的设置记录
   */
  async update(payload: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const executor = async () => {
      const current = await this.get()
      let mergedRatingLabels = cloneRatingLabels(current.ratingLabels)

      if (payload.ratingLabels) {
        const source = payload.ratingLabels as SettingsRecord['ratingLabels']
        const hasLanguageBuckets = SUPPORTED_LANGUAGES.some((lang) => Object.prototype.hasOwnProperty.call(source, lang))

        if (hasLanguageBuckets) {
          for (const language of SUPPORTED_LANGUAGES) {
            if (source[language]) {
              mergedRatingLabels[language] = {
                ...mergedRatingLabels[language],
                ...source[language],
              }
            }
          }
        } else {
          const activeLanguage = payload.language ?? current.language
          mergedRatingLabels = {
            ...mergedRatingLabels,
            [activeLanguage]: {
              ...mergedRatingLabels[activeLanguage],
              ...(source as unknown as Record<RatingLabelKey, string>),
            },
          }
        }
      }

      const next: SettingsRecord = {
        ...current,
        ...payload,
        ratingLabels: mergedRatingLabels,
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

function isLocalizedRatingLabels(value: unknown): value is SettingsRecord['ratingLabels'] {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return SUPPORTED_LANGUAGES.every((lang) => Object.prototype.hasOwnProperty.call(value, lang))
}

function cloneRatingLabels(source: SettingsRecord['ratingLabels']): SettingsRecord['ratingLabels'] {
  const clone = {} as SettingsRecord['ratingLabels']
  for (const language of SUPPORTED_LANGUAGES) {
    clone[language] = { ...(source[language] ?? {}) }
  }
  return clone
}

