import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAutoScrollCarouselOptions {
  interval?: number;
  autoPlay?: boolean;
}

export function useAutoScrollCarousel({ interval = 3500, autoPlay = true }: UseAutoScrollCarouselOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    moved: false,
    resumeTimer: null as any,
  });

  const scrollNext = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 0) return;

    // Loop back smoothly to beginning if at or near the end
    if (container.scrollLeft >= maxScrollLeft - 20) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    const item = container.querySelector('[data-carousel-item]') as HTMLElement | null;
    const step = item ? item.getBoundingClientRect().width : container.clientWidth * 0.75;
    container.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  const scrollPrev = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (maxScrollLeft <= 0) return;

    // Loop back smoothly to end if at or near the start
    if (container.scrollLeft <= 20) {
      container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      return;
    }

    const item = container.querySelector('[data-carousel-item]') as HTMLElement | null;
    const step = item ? item.getBoundingClientRect().width : container.clientWidth * 0.75;
    container.scrollBy({ left: -step, behavior: 'smooth' });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchState.current.resumeTimer) {
      clearTimeout(touchState.current.resumeTimer);
    }
    setIsPaused(true);
    const touch = e.touches[0];
    touchState.current.startX = touch.clientX;
    touchState.current.startY = touch.clientY;
    touchState.current.moved = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchState.current.startX);
    const dy = Math.abs(touch.clientY - touchState.current.startY);
    if (dx > 10 || dy > 10) {
      touchState.current.moved = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchState.current.resumeTimer) {
      clearTimeout(touchState.current.resumeTimer);
    }
    touchState.current.resumeTimer = setTimeout(() => {
      setIsPaused(false);
    }, interval);

    setTimeout(() => {
      touchState.current.moved = false;
    }, 150);
  }, [interval]);

  const hasSwiped = useCallback(() => {
    return touchState.current.moved;
  }, []);

  useEffect(() => {
    if (!autoPlay || isPaused) return;
    const id = setInterval(() => {
      scrollNext();
    }, interval);
    return () => clearInterval(id);
  }, [autoPlay, isPaused, interval, scrollNext]);

  useEffect(() => {
    return () => {
      if (touchState.current.resumeTimer) {
        clearTimeout(touchState.current.resumeTimer);
      }
    };
  }, []);

  return {
    ref: containerRef,
    containerRef,
    scrollNext,
    scrollPrev,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    hasSwiped,
    isPaused,
  };
}

export default useAutoScrollCarousel;
