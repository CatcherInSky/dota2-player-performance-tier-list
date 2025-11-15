import Dexie from 'dexie'
import { db, createDefaultSettingsRecord, DEFAULT_SETTINGS_TEMPLATE, SETTINGS_ID } from '../db'
import type { Language, RatingLabelKey, SettingsRecord } from '../../shared/types/database'
import { Logger } from '../../shared/utils/logger'

const SUPPORTED_LANGUAGES: Language[] = ['zh-CN', 'en-US']

export class SettingsRepository {
  private logger = new Logger({ namespace: 'SettingsRepository' })

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

