'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/utils/constants';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
    setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((p) => (p === 'dark' ? 'light' : 'dark')) }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
