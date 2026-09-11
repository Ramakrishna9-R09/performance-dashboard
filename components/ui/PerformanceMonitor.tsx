'use client';

import { memo, useEffect, useRef } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const HISTORY = 90;

/**
 * Performance HUD: FPS + frame/render time + heap + points, sampled at 2Hz
 * into isolated state, plus a live FPS history sparkline on mini-canvas.
 */
export const PerformanceMonitor = memo(function PerformanceMonitor() {
  const { store, config } = useDashboard();
  const m = usePerformanceMonitor(store, config.targetPoints);
  const graphRef = useRef<HTMLCanvasElement | null>(null);
  const histRef = useRef<number[]>([]);

  useEffect(() => {
    histRef.current.push(m.fps);
    if (histRef.current.length > HISTORY) histRef.current.shift();
    const canvas = graphRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = (canvas.width = canvas.clientWidth * 2);
    const h = (canvas.height = 68);
    ctx.clearRect(0, 0, w, h);
    // 60fps target line
    ctx.strokeStyle = 'rgba(211,255,83,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const y60 = h - (60 / 90) * h;
    ctx.moveTo(0, y60);
    ctx.lineTo(w, y60);
    ctx.stroke();
    ctx.setLineDash([]);
    // history area
    ctx.beginPath();
    histRef.current.forEach((fps, i) => {
      const x = (i / (HISTORY - 1)) * w;
      const y = h - Math.min(1, fps / 90) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#d3ff53';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [m.fps]);

  const fpsClass = m.fps >= 55 ? 'good' : m.fps >= 30 ? '' : 'warn';

  return (
    <section className="perf-strip" aria-label="Performance metrics">
      <div className="metric">
        <span>fps</span>
        <strong className={fpsClass}>{m.fps}</strong>
        <canvas ref={graphRef} aria-hidden="true" />
      </div>
      <div className="metric">
        <span>frame time</span>
        <strong>{m.frameMs.toFixed(1)}<small style={{ fontSize: 12 }}>ms</small></strong>
      </div>
      <div className="metric">
        <span>chart render</span>
        <strong>{m.renderMs.toFixed(2)}<small style={{ fontSize: 12 }}>ms</small></strong>
      </div>
      <div className="metric">
        <span>js heap</span>
        <strong>{m.heapMB < 0 ? 'n/a' : `${m.heapMB.toFixed(0)}MB`}</strong>
      </div>
      <div className="metric">
        <span>points in view</span>
        <strong>{m.points.toLocaleString()}</strong>
      </div>
      <div className="metric">
        <span>status</span>
        <strong className={config.paused ? '' : 'good'} style={{ fontSize: 18 }}>
          {config.paused ? '⏸ paused' : '● live'}
        </strong>
      </div>
    </section>
  );
});
