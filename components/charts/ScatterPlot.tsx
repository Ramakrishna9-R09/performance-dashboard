'use client';

import { memo, useRef } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { drawGrid } from '@/lib/canvasUtils';
import { CATEGORY_COLORS } from '@/lib/types';
import type { Domain } from '@/hooks/useViewDomain';

const PAD = { l: 46, r: 10, t: 10, b: 22 };
const MAX_GLYPHS = 4000;
const NAMES = ['alpha', 'beta', 'gamma', 'delta'] as const;

/**
 * Scatter plot: stride-sampled to a hard glyph budget so draw cost is
 * O(4000) regardless of dataset size. fillRect glyphs (no arc paths).
 */
export const ScatterPlot = memo(function ScatterPlot({ domain }: { domain: Domain }) {
  const { store, config } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useChartRenderer(canvasRef, (ctx, { w, h }) => {
    const t0 = performance.now();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, PAD.l, PAD.r, PAD.t, PAD.b);

    const n = Math.min(config.targetPoints, store.len);
    if (n < 2) return 0;
    const plotW = w - PAD.l - PAD.r;
    const plotH = h - PAD.t - PAD.b;
    const stride = Math.max(1, Math.ceil(n / MAX_GLYPHS));
    const enabled = new Set(config.categories);
    const span = Math.max(1e-9, domain.max - domain.min);

    for (let i = 0; i < n; i += stride) {
      const p = store.at(store.len - n + i);
      const cat = NAMES[store.cats[p]];
      if (!enabled.has(cat)) continue;
      const x = PAD.l + (i / Math.max(1, n - 1)) * plotW;
      const y = PAD.t + (1 - (store.values[p] - domain.min) / span) * plotH;
      ctx.fillStyle = CATEGORY_COLORS[cat];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x, y, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;

    const ms = performance.now() - t0;
    store.perf.lastRenderMs = ms;
    return ms;
  });

  return <canvas ref={canvasRef} role="img" aria-label="Scatter plot" />;
});

export default ScatterPlot;
