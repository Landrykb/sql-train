'use client';
import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bleepx_dark_mode');
      if (saved === 'true') {
        setDark(true);
        document.documentElement.classList.add('dark');
      }
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem('bleepx_dark_mode', String(next)); } catch { /* ignore */ }
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
