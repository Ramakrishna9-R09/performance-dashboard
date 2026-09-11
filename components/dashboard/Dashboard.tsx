'use client';

import { memo } from 'react';
import type { DataPoint } from '@/lib/types';
import DataProvider, { useDashboard } from '@/components/providers/DataProvider';
import { ChartCard } from '@/components/charts/ChartCard';
import { FilterPanel } from '@/components/controls/FilterPanel';
import { TimeRangeSelector } from '@/components/controls/TimeRangeSelector';
import { DataTable } from '@/components/ui/DataTable';
import { PerformanceMonitor } from '@/components/ui/PerformanceMonitor';

const StatusPill = memo(function StatusPill() {
  const { config } = useDashboard();
  return (
    <span className={`status-pill${config.paused ? ' paused' : ''}`}>
      {config.paused ? '○ PAUSED' : '● LIVE · 100ms ticks'}
    </span>
  );
});

function Shell() {
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
        <span>SERVER DATA → CLIENT STREAM · `npm install &amp;&amp; npm run dev`</span>
      </footer>
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
