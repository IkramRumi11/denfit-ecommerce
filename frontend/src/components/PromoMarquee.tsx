import React, { useEffect, useState, useRef } from 'react';
import { contentAPI } from '../api';

const DEFAULT_MESSAGES = ['📢 Free shipping on orders over ₨5,000'];

type PromoMarqueeProps = {
  text?: string;
};

export default function PromoMarquee({ text }: PromoMarqueeProps): JSX.Element | null {
  const [messages, setMessages] = useState<string[]>(() => (text ? [text] : DEFAULT_MESSAGES));
  const [enabled, setEnabled] = useState<boolean>(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(4);
  const [activeMsgIndex, setActiveMsgIndex] = useState<number>(0);

  const textRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number>(0);
  const messagesRef = useRef<string[]>(messages);
  const intervalSecondsRef = useRef<number>(intervalSeconds);

  // Keep refs in sync for RAF loop
  useEffect(() => {
    messagesRef.current = messages;
    activeIndexRef.current = activeMsgIndex;
  }, [messages, activeMsgIndex]);

  useEffect(() => {
    intervalSecondsRef.current = intervalSeconds;
  }, [intervalSeconds]);

  // Fetch live settings
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await contentAPI.getPublicContent();
        const data = (res as any)?.data?.announcements || (res as any)?.announcements;
        if (data && isMounted) {
          if (data.enabled === false) {
            setEnabled(false);
            return;
          }
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            const valid = data.messages.map((m: any) => String(m || '').trim()).filter(Boolean);
            if (valid.length > 0) {
              setMessages(valid);
            }
          }
          if (typeof data.intervalSeconds === 'number' && data.intervalSeconds >= 2) {
            setIntervalSeconds(data.intervalSeconds);
          }
        }
      } catch (err) {
        // Fallback to default
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Continuous forward glide & opposite-side re-entry animation loop
  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const el = textRef.current;
    if (!el) return;

    let phaseStartTime: number | null = null;
    let currentPhase: 'enter' | 'hold' | 'exit' = 'hold';

    // Animation timings in milliseconds
    const ENTER_DURATION = 1200; // Left to center glide
    const EXIT_DURATION = 1200;  // Center to right glide

    const animate = (timestamp: number) => {
      if (!phaseStartTime) phaseStartTime = timestamp;
      const elapsed = timestamp - phaseStartTime;
      const holdDuration = Math.max(2000, (intervalSecondsRef.current || 4) * 1000);

      if (currentPhase === 'hold') {
        // Hold smoothly in center
        el.style.left = '50%';
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%)';

        if (elapsed >= holdDuration) {
          currentPhase = 'exit';
          phaseStartTime = timestamp;
        }
      } else if (currentPhase === 'exit') {
        // Center (50%) to Right (120%+)
        const progress = Math.min(1, elapsed / EXIT_DURATION);
        // easeInQuad
        const ease = progress * progress;
        const left = 50 + ease * 70; // 50% -> 120%
        const opacity = Math.max(0, 1 - progress * 1.4);

        el.style.left = `${left}%`;
        el.style.opacity = opacity.toString();
        el.style.transform = 'translateX(-50%)';

        if (progress >= 1) {
          // Switch to next message before entering from opposite side
          const nextIdx = (activeIndexRef.current + 1) % messagesRef.current.length;
          activeIndexRef.current = nextIdx;
          setActiveMsgIndex(nextIdx);

          currentPhase = 'enter';
          phaseStartTime = timestamp;
        }
      } else if (currentPhase === 'enter') {
        // Left (-20%) to Center (50%)
        const progress = Math.min(1, elapsed / ENTER_DURATION);
        // easeOutQuad
        const ease = 1 - (1 - progress) * (1 - progress);
        const left = -20 + ease * 70; // -20% -> 50%
        const opacity = Math.min(1, progress * 1.5);

        el.style.left = `${left}%`;
        el.style.opacity = opacity.toString();
        el.style.transform = 'translateX(-50%)';

        if (progress >= 1) {
          currentPhase = 'hold';
          phaseStartTime = timestamp;
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, messages]);

  if (!enabled || messages.length === 0) {
    return null;
  }

  const currentMsg = messages[activeMsgIndex % messages.length] || messages[0];

  return (
    <aside
      aria-label="Announcement"
      className="bg-slate-500 text-white w-full overflow-hidden select-none border-b border-white/10"
      style={{ height: '28px' }}
    >
      <div className="max-w-7xl mx-auto h-full px-4 relative flex items-center justify-center overflow-hidden">
        <div
          ref={textRef}
          className="absolute whitespace-nowrap text-[11px] sm:text-xs font-medium tracking-wide text-white"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            willChange: 'left, opacity',
          }}
        >
          {currentMsg}
        </div>
      </div>
    </aside>
  );
}