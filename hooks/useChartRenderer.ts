'use client';

import { useEffect, useRef } from 'react';
import { setupCanvas, type CanvasSize } from '@/lib/canvasUtils';

export type DrawFn = (ctx: CanvasRenderingContext2D, size: CanvasSize) => number | void;

export interface RendererPerf {
  lastMs: number;
  frames: number;
}

/**
 * Owns the canvas lifecycle: DPR-aware sizing via ResizeObserver plus a
 * single rAF loop. Skips work when the tab is hidden or the element is
 * off-screen (IntersectionObserver), and always cleans up on unmount.
 */
export function useChartRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  draw: DrawFn,
  deps: unknown[] = [],
): RendererPerf {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const perfRef = useRef<RendererPerf>({ lastMs: 0, frames: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let visible = true;
    let size = { w: 0, h: 0 };

    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      size = { w: Math.floor(rect.width), h: Math.floor(rect.height) };
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const t0 = performance.now();
      drawRef.current(setup.ctx, setup.size);
      const ms = performance.now() - t0;
      perfRef.current.lastMs = ms;
      perfRef.current.frames += 1;
      void size;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return perfRef.current;
}
