import { useCallback, useEffect, useRef, useState } from 'react';

type UseLuxuryGalleryOptions = {
  length: number;
  initialIndex?: number;
  onIndexChange?: (idx: number) => void;
  allowLoop?: boolean;
};

export function useLuxuryGallery(opts: UseLuxuryGalleryOptions) {
  const { length, initialIndex = 0, onIndexChange, allowLoop = true } = opts;

  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), Math.max(0, length - 1)));
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastTouch = useRef<{ time: number; x: number; y: number } | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<number | null>(null);

  useEffect(() => { setIndex(i => Math.min(i, Math.max(0, length - 1))); }, [length]);

  const clampIndex = useCallback((i: number) => {
    if (allowLoop && length > 0) return (i + length) % length;
    return Math.min(Math.max(0, i), Math.max(0, length - 1));
  }, [allowLoop, length]);

  const setIndexSafe = useCallback((i: number) => {
    const v = clampIndex(i);
    setIndex(v);
    onIndexChange?.(v);
    // reset transform when switching images
    setScale(1); setTx(0); setTy(0);
  }, [clampIndex, onIndexChange]);

  const next = useCallback(() => setIndexSafe(index + 1), [index, setIndexSafe]);
  const prev = useCallback(() => setIndexSafe(index - 1), [index, setIndexSafe]);

  // Zoom controls
  const zoomTo = useCallback((s: number, centerX = 0, centerY = 0) => {
    // keep scale within reasonable bounds
    const ns = Math.min(Math.max(1, s), 5);
    setScale(ns);
    // when zooming to >1, keep transforms limited (simple approach)
    if (ns === 1) { setTx(0); setTy(0); }
  }, []);

  // Pointer handlers (using Pointer events approach idea; components attach native handlers)
  const onPointerDown = useCallback((ev: PointerEvent) => {
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  }, []);

  const onPointerMove = useCallback((ev: PointerEvent) => {
    if (!pointers.current.has(ev.pointerId)) return;
    const prev = pointers.current.get(ev.pointerId)!;
    const dx = ev.clientX - prev.x;
    const dy = ev.clientY - prev.y;
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.current.size === 1) {
      // single pointer -> pan if zoomed
      if (scale > 1) {
        setTx(t => t + dx);
        setTy(t => t + dy);
      }
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const ddx = pts[0].x - pts[1].x; const ddy = pts[0].y - pts[1].y;
      const dist = Math.hypot(ddx, ddy);
      // simple pinch scaling handled by component-level handlers using gallery.zoomTo
    }
  }, [scale]);

  const onPointerUp = useCallback((ev: PointerEvent) => {
    pointers.current.delete(ev.pointerId);
    try { (ev.target as Element).releasePointerCapture?.(ev.pointerId); } catch (e) {}
  }, []);

  useEffect(() => {
    // Attach global pointer handlers to support multi-touch/pinch on the element via ref in component
    // Components should attach element-level pointer handlers; we keep lightweight in hook.
    return () => { pointers.current.clear(); };
  }, []);

  // Touch helpers for tap/swipe/multi-tap reset
  const handleTap = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (lastTouch.current && now - lastTouch.current.time < 400) {
      tapCount.current += 1;
    } else { tapCount.current = 1; }
    lastTouch.current = { time: now, x, y };
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => { tapCount.current = 0; tapTimer.current = null; }, 500);
    if (tapCount.current >= 3) {
      // reset
      zoomTo(1);
      tapCount.current = 0;
      if (tapTimer.current) { window.clearTimeout(tapTimer.current); tapTimer.current = null; }
    } else if (tapCount.current === 1) {
      // single tap toggles zoom to a deep zoom
      if (scale === 1) zoomTo(3, x, y);
      else zoomTo(1);
    }
  }, [scale, zoomTo]);

  // Simple wheel zoom for desktop
  const onWheelZoom = useCallback((deltaY: number, clientX?: number, clientY?: number) => {
    const factor = deltaY > 0 ? 0.95 : 1.05;
    zoomTo(scale * factor, clientX || 0, clientY || 0);
  }, [scale, zoomTo]);

  return {
    index, setIndex: setIndexSafe, next, prev,
    scale, tx, ty, setScale, setTx, setTy, zoomTo,
    onPointerDown, onPointerMove, onPointerUp,
    handleTap, onWheelZoom,
  } as const;
}

export default useLuxuryGallery;
