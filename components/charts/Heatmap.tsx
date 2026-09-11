'use client';

import { memo, useRef } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { CATEGORIES } from '@/lib/types';

const PAD = { l: 64, r: 10, t: 10, b: 22 };
const COLS = 28;

/**
 * Heatmap: time × category density. The grid is recomputed at most every
 * 500ms into a reused buffer; every frame only paints ~112 rects.
 */
export const Heatmap = memo(function Heatmap() {
  const { store, config } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef({ cells: new Float32Array(COLS * CATEGORIES.length), max: 1, min: 0, last: 0 });

  useChartRenderer(canvasRef, (ctx, { w, h }) => {
    const t0 = performance.now();
    ctx.clearRect(0, 0, w, h);

    const n = Math.min(config.targetPoints, store.len);
    const g = gridRef.current;
    const now = performance.now();
    if (n > 1 && now - g.last > 500) {
      g.last = now;
      g.cells.fill(0);
      const enabled = new Set(config.categories);
      const stride = Math.max(1, Math.ceil(n / 40_000));
      let max = -Infinity;
      let min = Infinity;
      for (let i = 0; i < n; i += stride) {
        const p = store.at(store.len - n + i);
        const ci = store.cats[p];
        if (!enabled.has(CATEGORIES[ci])) continue;
        const col = Math.min(COLS - 1, Math.floor((i / n) * COLS));
        const k = col * CATEGORIES.length + ci;
        // accumulate mean-centered intensity
        g.cells[k] += store.values[p];
        if (g.cells[k] > max) max = g.cells[k];
        if (g.cells[k] < min) min = g.cells[k];
      }
      // Min-max stretch with gamma: uniform streams still show structure.
      g.max = max;
      g.min = min === Infinity ? 0 : min;
    }

    const plotW = w - PAD.l - PAD.r;
    const plotH = h - PAD.t - PAD.b;
    const cw = plotW / COLS;
    const rh = plotH / CATEGORIES.length;
    const spread = Math.max(1e-9, g.max - g.min);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < CATEGORIES.length; r++) {
        const v = (g.cells[c * CATEGORIES.length + r] - g.min) / spread;
        const a = Math.min(1, Math.max(0, v));
        ctx.fillStyle =
          a <= 0.02 ? 'rgba(255,255,255,0.03)' : `rgba(211,255,83,${(0.08 + a * 0.85).toFixed(3)})`;
        const x = PAD.l + c * cw + 1;
        const y = PAD.t + r * rh + 1;
        ctx.fillRect(x, y, Math.max(1, cw - 2), Math.max(1, rh - 2));
      }
    }

    ctx.fillStyle = '#8b93a7';
    ctx.font = '10px ui-monospace, monospace';
    CATEGORIES.forEach((c, r) => {
      ctx.fillText(c, 8, PAD.t + r * rh + rh / 2 + 3);
    });

    const ms = performance.now() - t0;
    store.perf.lastRenderMs = ms;
    return ms;
  });

  return <canvas ref={canvasRef} role="img" aria-label="Heatmap" />;
});

export default Heatmap;
