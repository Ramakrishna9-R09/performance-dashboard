'use client';

import { useEffect, useRef, useState } from 'react';
import type { PerformanceMetrics } from '@/lib/types';
import type { SeriesStore } from '@/components/providers/DataProvider';
import { Ema, getHeapMB } from '@/lib/performanceUtils';

/**
 * Samples FPS (rAF counting), frame time (EMA), render time (shared channel
 * written by chart renderers), and JS heap at 2Hz into isolated state —
 * so the monitor re-renders without touching the charts.
 */
export function usePerformanceMonitor(store: SeriesStore, viewPoints: number): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameMs: 0,
    renderMs: 0,
    heapMB: -1,
    points: 0,
    dropped: 0,
  });
  const emaRef = useRef(new Ema(0.1));

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let lastSample = performance.now();
    let lastFrame = performance.now();
    let acc = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      emaRef.current.push(now - lastFrame);
      lastFrame = now;
      frames += 1;
      if (now - lastSample >= 500) {
        const fps = Math.round((frames * 1000) / (now - lastSample));
        acc += 1;
        setMetrics({
          fps,
          frameMs: Math.round(emaRef.current.value * 10) / 10,
          renderMs: Math.round(store.perf.lastRenderMs * 10) / 10,
          heapMB: getHeapMB(),
          points: Math.min(viewPoints, store.len),
          dropped: store.perf.dropped,
        });
        frames = 0;
        lastSample = now;
        void acc;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [store, viewPoints]);

  return metrics;
}
