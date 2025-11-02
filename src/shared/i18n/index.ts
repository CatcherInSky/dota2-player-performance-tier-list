/**
 * 国际化支持
 */

import { zhCN, type Translations } from './zh-CN';
import { enUS } from './en-US';

type Language = 'zh-CN' | 'en-US';

const translations: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

let currentLanguage: Language = 'zh-CN';

/**
 * 设置当前语言
 */
export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

/**
 * 获取当前语言
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * 获取翻译文本
 * 支持嵌套键，如 'common.confirm'
 * 支持模板插值，如 'home.encountered' + { count: 5 }
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }

  // 模板插值
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  return value;
}

/**
 * 获取所有翻译（用于批量更新UI）
 */
export function getTranslations(): Translations {
  return translations[currentLanguage];
}

export { zhCN, enUS };
export type { Translations, Language };

