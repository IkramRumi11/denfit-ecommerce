import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gallery:reducedMotion';

export default function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setReducedMotion(raw === '1');
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, reducedMotion ? '1' : '0'); } catch (e) {}
  }, [reducedMotion]);

  return { reducedMotion, setReducedMotion } as const;
}
