import { useEffect, useMemo } from 'react'

import { DEFAULT_RATING_LABELS, useI18n } from '../../shared/i18n'
import type { BackgroundApi } from '../../shared/types/api'
import type { Language, RatingLabelKey } from '../../shared/types/database'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '../../shared/ui/dialog'
import { InputField } from './FilterCard'

interface SettingsDialogProps {
  api: BackgroundApi | undefined
  open: boolean
  onOpenChange: (state: boolean) => void
}

export function SettingsDialog({ api, open, onOpenChange }: SettingsDialogProps) {
  const { t, language, setLanguage, ratingLabels, settings } = useI18n()

  useEffect(() => {
    if (!api) return
    const defaults = getDefaultLabels(language)
    const stored = settings?.ratingLabels?.[language]
    if (hasAllLabels(stored)) {
      return
    }
    const merged = { ...defaults, ...(stored ?? {}) }
    void api.settings.update({
      ratingLabels: {
        ...(settings?.ratingLabels ?? DEFAULT_RATING_LABELS),
        [language]: merged,
      },
    })
  }, [api, language, settings?.ratingLabels])

  const handleLabelChange = async (star: string, value: string) => {
    if (!api) return
    await api.settings.update({
      ratingLabels: {
        ...(settings?.ratingLabels ?? DEFAULT_RATING_LABELS),
        [language]: {
          ...(settings?.ratingLabels?.[language] ?? getDefaultLabels(language)),
          [Number(star) as RatingLabelKey]: value,
        },
      },
    })
  }

  const ratingInputs = useMemo(
    () =>
      (Object.entries(ratingLabels) as Array<[string, string]>).map(([key, rawValue]) => (
        <InputField
          key={key}
          label={'⭐'.repeat(Number(key))}
          value={rawValue}
          onChange={(next: string) => handleLabelChange(key, next)}
        />
      )),
    [ratingLabels],
  )

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-slate-950/70 backdrop-blur" />
        <DialogContent
          id="desktop-settings-dialog"
          className="fixed inset-0 m-auto flex h-[80vh] w-[min(720px,90vw)] flex-col rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-50 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{t('settings.title')}</DialogTitle>
            <DialogClose className="btn-secondary">{t('ingame.close')}</DialogClose>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.language')}</h3>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={language === 'zh-CN'} onChange={() => setLanguage('zh-CN')} />
                  {t('settings.language.zh')}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={language === 'en-US'} onChange={() => setLanguage('en-US')} />
                  {t('settings.language.en')}
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.ratingLabels')}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{ratingInputs}</div>
            </section>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  )
}

const RATING_KEYS: RatingLabelKey[] = [1, 2, 3, 4, 5]

function getDefaultLabels(language: Language): Record<RatingLabelKey, string> {
  const defaults = DEFAULT_RATING_LABELS[language]
  return RATING_KEYS.reduce<Record<RatingLabelKey, string>>((acc, key) => {
    acc[key] = defaults[key]
    return acc
  }, {} as Record<RatingLabelKey, string>)
}

function hasAllLabels(labels?: Record<RatingLabelKey, string>) {
  if (!labels) return false
  return RATING_KEYS.every((key) => typeof labels[key] === 'string' && labels[key] !== undefined)
}

