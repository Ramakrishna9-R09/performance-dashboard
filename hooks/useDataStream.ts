'use client';

import { useEffect, useRef } from 'react';

interface StreamOptions {
  paused: boolean;
  intervalMs: number;
  onTick: () => void;
  /** 1Hz liveness callback (cheap UI heartbeats only) */
  onSecond?: () => void;
}

/**
 * Fixed-interval data pump. The interval reads config through a ref so the
 * timer is created ONCE — no re-subscription churn when sliders move.
 * All data flows into the ring buffer; React state is never touched per tick.
 */
export function useDataStream({ paused, intervalMs, onTick, onSecond }: StreamOptions): void {
  const cbRef = useRef({ onTick, onSecond, paused });
  cbRef.current = { onTick, onSecond, paused };

  useEffect(() => {
    let seconds = 0;
    const id = setInterval(() => {
      const cb = cbRef.current;
      if (cb.paused || document.hidden) return;
      cb.onTick();
      seconds += 1;
      if (seconds % Math.max(1, Math.round(1000 / intervalMs)) === 0) {
        cb.onSecond?.();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
