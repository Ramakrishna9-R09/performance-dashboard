'use client';

import { memo, useEffect, useState } from 'react';
import type { DataPoint } from '@/lib/types';
import DataProvider, { useDashboard } from '@/components/providers/DataProvider';
import { ChartCard } from '@/components/charts/ChartCard';
import { FilterPanel } from '@/components/controls/FilterPanel';
import { TimeRangeSelector } from '@/components/controls/TimeRangeSelector';
import { DataTable } from '@/components/ui/DataTable';
import { PerformanceMonitor } from '@/components/ui/PerformanceMonitor';
import { CommandPalette } from '@/components/ui/CommandPalette';

const StatusPill = memo(function StatusPill() {
  const { config } = useDashboard();
  return (
    <span className={`status-pill${config.paused ? ' paused' : ''}`}>
      {config.paused ? '○ PAUSED' : '● LIVE · 100ms ticks'}
    </span>
  );
});

function Shell() {
  const { config, setConfig } = useDashboard();
  const [palette, setPalette] = useState(false);

  // Global shortcuts: Ctrl/⌘+K palette, Space pause, 1–4 chart switch.
  // Ignored while typing in inputs so forms keep working.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (typing) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setConfig({ paused: !config.paused });
      } else if (e.key >= '1' && e.key <= '4') {
        const charts = ['line', 'bar', 'scatter', 'heatmap'] as const;
        setConfig({ chart: charts[Number(e.key) - 1] });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [config.paused, setConfig]);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            REAL-TIME OPS / <b>60FPS TARGET</b>
          </p>
          <h1>
            10,000+ points, <em>zero jank.</em>
          </h1>
          <p className="sub">
            Canvas rendering with per-pixel LOD, a fixed-capacity ring buffer, virtualized tables, and a
            Web-Worker aggregation path — built from scratch with Next.js App Router + TypeScript. No chart
            libraries.
          </p>
        </div>
        <StatusPill />
      </header>

      <PerformanceMonitor />

      <div className="tech-strip" aria-label="Engineering highlights">
        <span><b>0.57ms</b> LOD SCAN / 100K PTS</span>
        <span>RING BUFFER · <b>FLAT HEAP</b></span>
        <span><b>0</b> REACT COMMITS PER TICK</span>
        <span>WORKER AGGREGATION + SYNC FALLBACK</span>
        <span>VIRTUALIZED 100K → ~30 ROWS</span>
        <span><b>96KB</b> FIRST LOAD · ZERO CHART LIBS</span>
      </div>

      <div className="grid grid-2">
        <div className="controls">
          <FilterPanel />
          <TimeRangeSelector />
        </div>
        <div className="grid grid-charts" style={{ marginTop: 0 }}>
          <ChartCard />
          <DataTable />
        </div>
      </div>

      <footer className="footer">
        <span>NEXT.JS 14 APP ROUTER · TYPESCRIPT · CANVAS + SVG · RING BUFFER + WORKER</span>
        <span>
          <kbd>Ctrl K</kbd> commands · <kbd>Space</kbd> pause · <kbd>1–4</kbd> charts
        </span>
      </footer>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

export default function Dashboard({ initialData }: { initialData: DataPoint[] }) {
  return (
    <DataProvider initialData={initialData}>
      <Shell />
    </DataProvider>
  );
}
