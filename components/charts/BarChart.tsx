'use client';

import { memo, useRef } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { useBucketCache } from '@/hooks/useBucketCache';
import { drawGrid } from '@/lib/canvasUtils';
import type { Domain } from '@/hooks/useViewDomain';

const PAD = { l: 46, r: 10, t: 10, b: 22 };

/**
 * Bar chart over async buckets: the aggregation Web Worker refills the
 * cache at 2Hz (sync single-pass fallback), the rAF loop only draws.
 */
export const BarChart = memo(function BarChart({ domain }: { domain: Domain }) {
  const { store, config } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const buckets = useBucketCache(store, config.targetPoints, config.categories, 120);

  useChartRenderer(canvasRef, (ctx, { w, h }) => {
    const t0 = performance.now();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, PAD.l, PAD.r, PAD.t, PAD.b);

    const b = buckets.current;
    const count = b.count;
    if (!count) return 0;
    const plotW = w - PAD.l - PAD.r;
    const plotH = h - PAD.t - PAD.b;
    const slot = plotW / count;
    const bw = Math.max(1, slot * 0.62);
    const yOf = (v: number) => PAD.t + (1 - (v - domain.min) / Math.max(1e-9, domain.max - domain.min)) * plotH;

    for (let i = 0; i < count; i++) {
      if (!Number.isFinite(b.avg[i])) continue;
      const x = PAD.l + i * slot + (slot - bw) / 2;
      const yAvg = yOf(b.avg[i]);
      const yMin = yOf(Number.isFinite(b.min[i]) ? b.min[i] : b.avg[i]);
      const yMax = yOf(Number.isFinite(b.max[i]) ? b.max[i] : b.avg[i]);
      // whisker
      ctx.strokeStyle = 'rgba(168,136,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + bw / 2, yMin);
      ctx.lineTo(x + bw / 2, yMax);
      ctx.stroke();
      // bar
      const grad = ctx.createLinearGradient(0, yAvg, 0, PAD.t + plotH);
      grad.addColorStop(0, '#d3ff53');
      grad.addColorStop(1, 'rgba(211,255,83,0.25)');
      ctx.fillStyle = grad;
      const top = Math.min(yAvg, PAD.t + plotH);
      ctx.fillRect(x, top, bw, Math.max(1, PAD.t + plotH - top));
    }

    const ms = performance.now() - t0;
    store.perf.lastRenderMs = ms;
    return ms;
  });

  return <canvas ref={canvasRef} role="img" aria-label="Bar chart" />;
});

export default BarChart;
