/**
 * 国际化 Hook
 */

import { useState, useCallback } from 'react';
import { t, setLanguage, getLanguage, getTranslations, type Language } from '@shared/i18n';

export function useI18n() {
  const [currentLang, setCurrentLang] = useState<Language>(getLanguage());

  const translate = useCallback((key: string, params?: Record<string, string | number>) => {
    return t(key, params);
  }, [currentLang]); // 依赖currentLang以触发重新渲染

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setCurrentLang(lang);
  }, []);

  const translations = getTranslations();

  return {
    t: translate,
    currentLang,
    changeLanguage,
    translations,
  };
}

