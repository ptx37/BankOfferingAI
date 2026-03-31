import { useState, useEffect, useCallback } from 'react';
import type { Lang } from './i18n';

export type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useAppState() {
  const [theme, setThemeState] = useState<Theme>('light');
  const [lang, setLangState] = useState<Lang>('en');

  // Read persisted values on mount and apply theme to DOM
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme) ?? 'light';
    const savedLang = (localStorage.getItem('lang') as Lang) ?? 'en';
    setThemeState(savedTheme);
    setLangState(savedLang);
    applyTheme(savedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
      return next;
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    // Re-render by forcing a state update; components using useTranslation will re-read localStorage
    window.dispatchEvent(new Event('langchange'));
  }, []);

  return { theme, toggleTheme, lang, setLang };
}
