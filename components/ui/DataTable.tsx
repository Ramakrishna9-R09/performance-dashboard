'use client';

import { memo, useMemo } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { useVirtualization } from '@/hooks/useVirtualization';
import { formatTime } from '@/lib/canvasUtils';

const ROW_H = 28;
const VIEW_H = 340;

/**
 * Virtualized data table: renders ~30 rows regardless of dataset size.
 * Re-renders at 1Hz (liveTick) — never per stream tick.
 */
export const DataTable = memo(function DataTable() {
  const { store, config, liveTick } = useDashboard();
  const n = Math.min(config.targetPoints, store.len);
  const { start, end, offsetY, totalHeight, onScroll } = useVirtualization(n, ROW_H, VIEW_H);

  const rows = useMemo(() => {
    const out: { t: string; v: string; c: string }[] = [];
    for (let i = start; i < end; i++) {
      const logical = store.len - 1 - (i + (store.len - n));
      void liveTick;
      const r = store.row(Math.max(0, logical));
      out.push({ t: formatTime(r.t), v: r.v.toFixed(2), c: r.c });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, n, start, end, liveTick]);

  return (
    <section className="card" aria-label="Data table">
      <h2>Live records</h2>
      <p className="hint">
        Virtualized · {n.toLocaleString()} rows, {end - start} mounted · latest first.
      </p>
      <div className="table-scroll" onScroll={onScroll} role="grid" aria-label="Data points">
        <div className="table-head" role="row">
          <span>time</span>
          <span>value</span>
          <span>category</span>
        </div>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {rows.map((r, i) => (
              <div className="table-row" role="row" key={start + i}>
                <span>{r.t}</span>
                <span>{r.v}</span>
                <span>{r.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
