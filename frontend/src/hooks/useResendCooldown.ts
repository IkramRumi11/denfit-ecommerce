import { useEffect, useRef, useState, useCallback } from 'react';

// Hook to manage a resend-verification cooldown per email with persistence
export default function useResendCooldown(initialEmail?: string) {
  const [remaining, setRemaining] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const emailRef = useRef<string | undefined>(initialEmail?.toLowerCase());

  useEffect(() => {
    emailRef.current = initialEmail?.toLowerCase();
    if (!emailRef.current) return;
    try {
      const v = localStorage.getItem(`resendCooldown:${emailRef.current}`);
      if (!v) return;
      const expiry = Number(v);
      if (Number.isNaN(expiry)) return;
      const remainingSec = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      if (remainingSec > 0) start(remainingSec, emailRef.current);
    } catch (e) {
      // Ignore localStorage errors (e.g., user denied storage or safari private mode)
      console.debug('useResendCooldown: localStorage read failed', e);
    }
  }, [initialEmail, start]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const start = useCallback((secs: number, email?: string) => {
    const normalized = (email || emailRef.current || '').toLowerCase();
    setRemaining(secs);
    try {
      if (normalized) {
        const expiry = Date.now() + secs * 1000;
        localStorage.setItem(`resendCooldown:${normalized}`, String(expiry));
      }
    } catch (e) {
      console.debug('useResendCooldown: localStorage write failed', e);
    }

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          try {
            if (normalized) localStorage.removeItem(`resendCooldown:${normalized}`);
          } catch (e) {
            console.debug('useResendCooldown: localStorage remove failed', e);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const clear = useCallback(() => {
    setRemaining(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (emailRef.current) localStorage.removeItem(`resendCooldown:${emailRef.current}`);
    } catch (e) {
      console.debug('useResendCooldown: localStorage remove failed', e);
    }
  }, []);

  return { remaining, start, clear, isCooling: remaining > 0 } as const;
}
