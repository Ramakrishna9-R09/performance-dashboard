'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import { drawGrid, formatTime } from '@/lib/canvasUtils';
import { AGG_BUCKET_MS } from '@/lib/types';
import type { Domain } from '@/hooks/useViewDomain';

const PAD = { l: 46, r: 10, t: 10, b: 22 };
const MAX_COLS = 2048;
const NAMES = ['alpha', 'beta', 'gamma', 'delta'];

/**
 * Line chart with per-pixel min/max LOD over a sliding window plus
 * wheel-zoom + drag-pan. Single O(window) pass per frame into reused
 * column buffers — zero allocation in the hot loop.
 */
export const LineChart = memo(function LineChart({ domain }: { domain: Domain }) {
  const { store, config } = useDashboard();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frac, setFrac] = useState(1);
  const [off, setOff] = useState(0);
  const viewRef = useRef({ frac: 1, off: 0 });
  viewRef.current = { frac, off };
  const colsRef = useRef({
    min: new Float32Array(MAX_COLS),
    max: new Float32Array(MAX_COLS),
    sum: new Float64Array(MAX_COLS),
    cnt: new Uint16Array(MAX_COLS),
  });
  // Hover crosshair state lives in a ref + direct DOM writes: zero React
  // re-renders while the pointer moves at 60Hz.
  const hoverRef = useRef({ x: 0, active: false });
  const tipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let lastX = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFrac((f) => Math.min(1, Math.max(0.02, f * (e.deltaY > 0 ? 1.12 : 0.89))));
      setOff((o) => Math.min(1, Math.max(0, o)));
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      hoverRef.current.x = e.clientX - rect.left;
      hoverRef.current.active = true;
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      setOff((o) => Math.min(1, Math.max(0, o - dx / Math.max(1, rect.width) / viewRef.current.frac)));
    };
    const onLeave = () => {
      hoverRef.current.active = false;
    };
    const onUp = () => {
      dragging = false;
    };
    const onDbl = () => {
      setFrac(1);
      setOff(0);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('dblclick', onDbl);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('dblclick', onDbl);
    };
  }, []);

  useChartRenderer(canvasRef, (ctx, { w, h }) => {
    const t0 = performance.now();
    const { frac: vf, off: vo } = viewRef.current;
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, PAD.l, PAD.r, PAD.t, PAD.b);

    const n = Math.min(config.targetPoints, store.len);
    if (n < 2) return 0;
    const win = Math.max(50, Math.floor(n * vf));
    const startL = store.len - n + Math.min(n - win, Math.floor(vo * (n - win)));
    const plotW = w - PAD.l - PAD.r;
    const plotH = h - PAD.t - PAD.b;
    const cols = Math.max(1, Math.min(MAX_COLS, Math.floor(plotW)));
    const buf = colsRef.current;
    buf.cnt.fill(0, 0, cols);

    const enabled = new Set(config.categories);
    for (let i = 0; i < win; i++) {
      const p = store.at(startL + i);
      if (!enabled.has(NAMES[store.cats[p]] as never)) continue;
      const c = Math.min(cols - 1, Math.floor((i / win) * cols));
      const v = store.values[p];
      if (buf.cnt[c] === 0) {
        buf.min[c] = v;
        buf.max[c] = v;
      } else {
        if (v < buf.min[c]) buf.min[c] = v;
        if (v > buf.max[c]) buf.max[c] = v;
      }
      buf.sum[c] += v;
      buf.cnt[c] += 1;
    }

    // Time aggregation overlays as a smoothed average (window in points).
    const aggMs = AGG_BUCKET_MS[config.agg];
    const smoothWin = aggMs ? Math.max(1, Math.round(aggMs / 100 / Math.max(1, win / cols))) : 1;

    const xOf = (c: number) => PAD.l + ((c + 0.5) / cols) * plotW;
    const yOf = (v: number) => PAD.t + (1 - (v - domain.min) / Math.max(1e-9, domain.max - domain.min)) * plotH;

    // Min/max band
    ctx.beginPath();
    let started = false;
    for (let c = 0; c < cols; c++) {
      if (!buf.cnt[c]) continue;
      const x = xOf(c);
      if (!started) {
        ctx.moveTo(x, yOf(buf.min[c]));
        started = true;
      } else {
        ctx.lineTo(x, yOf(buf.min[c]));
      }
    }
    for (let c = cols - 1; c >= 0; c--) {
      if (!buf.cnt[c]) continue;
      ctx.lineTo(xOf(c), yOf(buf.max[c]));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(211,255,83,0.10)';
    ctx.fill();

    // Smoothed average line
    ctx.beginPath();
    started = false;
    let acc = 0;
    let accN = 0;
    const avgs: number[] = [];
    for (let c = 0; c < cols; c++) {
      avgs.push(buf.cnt[c] ? buf.sum[c] / buf.cnt[c] : NaN);
    }
    for (let c = 0; c < cols; c++) {
      acc = 0;
      accN = 0;
      for (let k = Math.max(0, c - smoothWin + 1); k <= c; k++) {
        if (Number.isFinite(avgs[k])) {
          acc += avgs[k];
          accN += 1;
        }
      }
      if (!accN) continue;
      const x = xOf(c);
      const y = yOf(acc / accN);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#d3ff53';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(211,255,83,0.45)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hover crosshair: vertical guide + value dot + floating readout.
    const hov = hoverRef.current;
    const tip = tipRef.current;
    if (started && hov.active && hov.x >= PAD.l && hov.x <= w - PAD.r && tip) {
      const col = Math.min(cols - 1, Math.max(0, Math.floor(((hov.x - PAD.l) / plotW) * cols)));
      if (buf.cnt[col]) {
        const avg = buf.sum[col] / buf.cnt[col];
        const cx = xOf(col);
        const cy = yOf(avg);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, PAD.t);
        ctx.lineTo(cx, PAD.t + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#d3ff53';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0b0e12';
        ctx.stroke();
        const li = startL + Math.min(win - 1, Math.floor(((col + 0.5) / cols) * win));
        const tp = store.times[store.at(li)] ?? 0;
        tip.style.display = 'block';
        tip.style.left = `${cx}px`;
        tip.style.top = `${cy}px`;
        tip.innerHTML = `<b>${avg.toFixed(2)}</b><small>${formatTime(tp)}</small>`;
      } else {
        tip.style.display = 'none';
      }
    } else if (tip) {
      tip.style.display = 'none';
    }

    const ms = performance.now() - t0;
    store.perf.lastRenderMs = ms;
    return ms;
  });

  return (
    <>
      <canvas ref={canvasRef} role="img" aria-label="Line chart. Hover for values." />
      <div ref={tipRef} className="crosshair-tip" aria-hidden="true" />
    </>
  );
});

export default LineChart;
