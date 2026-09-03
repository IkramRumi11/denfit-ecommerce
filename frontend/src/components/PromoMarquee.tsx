import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentAPI } from '../api';

const DEFAULT_MESSAGES = ['📢 Free shipping on orders over ₨5,000'];

type PromoMarqueeProps = {
  text?: string;
};

export default function PromoMarquee({ text }: PromoMarqueeProps): JSX.Element | null {
  const [messages, setMessages] = useState<string[]>(() => (text ? [text] : DEFAULT_MESSAGES));
  const [enabled, setEnabled] = useState<boolean>(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(4);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

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
        // Fallback silently to default messages
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Timer for rotating multiple messages
  useEffect(() => {
    if (!enabled || messages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [enabled, messages, intervalSeconds]);

  if (!enabled || messages.length === 0) {
    return null;
  }

  // Single message display (no unnecessary rotation)
  if (messages.length === 1) {
    return (
      <aside aria-label="Announcement" className="bg-slate-500 text-white w-full overflow-hidden select-none border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-center text-center">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-white truncate">
            {messages[0]}
          </p>
        </div>
      </aside>
    );
  }

  // Multiple messages with smooth 1-by-1 centered transition
  const currentMsg = messages[currentIndex % messages.length] || messages[0];

  return (
    <aside aria-label="Announcement" className="bg-slate-500 text-white w-full overflow-hidden select-none border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-center text-center relative">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs sm:text-sm font-medium tracking-wide text-white truncate max-w-[90vw]"
          >
            {currentMsg}
          </motion.p>
        </AnimatePresence>
      </div>
    </aside>
  );
}