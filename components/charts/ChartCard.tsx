'use client';

import { memo } from 'react';
import type { Category, ChartType } from '@/lib/types';
import { useDashboard } from '@/components/providers/DataProvider';
import { useViewDomain } from '@/hooks/useViewDomain';
import { AxisOverlay } from './AxisOverlay';
import LineChart from './LineChart';
import BarChart from './BarChart';
import ScatterPlot from './ScatterPlot';
import Heatmap from './Heatmap';

const TABS: { key: ChartType; label: string }[] = [
  { key: 'line', label: 'Line' },
  { key: 'bar', label: 'Bar' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'heatmap', label: 'Heatmap' },
];

const BLURB: Record<ChartType, string> = {
  line: 'Per-pixel min/max LOD · wheel to zoom, drag to pan, double-click to reset.',
  bar: 'Worker-aggregated buckets (sync fallback) · min/max whiskers per bucket.',
  scatter: 'Stride-sampled to ≤4k glyphs · colored by category.',
  heatmap: 'Time × category density grid · recomputed at 2Hz, drawn every frame.',
};

/**
 * Chart stage: owns the shared value domain + SVG axis overlay, renders the
 * active canvas chart. Memoized so 2Hz domain updates only re-render this
 * subtree — never the controls or table.
 */
export const ChartCard = memo(function ChartCard() {
  const { store, config, setConfig } = useDashboard();
  const domain = useViewDomain(store, config.targetPoints, config.categories);

  return (
    <section className="card" aria-label="Chart">
      <div className="chart-tabs" role="tablist" aria-label="Chart type">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={config.chart === t.key}
            className={`btn${config.chart === t.key ? ' on' : ''}`}
            onClick={() => setConfig({ chart: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="hint">{BLURB[config.chart]}</p>
      <div className="chart-wrap" id="axis-host">
        {config.chart === 'line' && <LineChart domain={domain} />}
        {config.chart === 'bar' && <BarChart domain={domain} />}
        {config.chart === 'scatter' && <ScatterPlot domain={domain} />}
        {config.chart === 'heatmap' && <Heatmap />}
        <AxisOverlay domain={domain} />
      </div>
      {config.chart === 'line' && (
        <p className="zoom-hint">scroll to zoom · drag to pan · double-click resets view</p>
      )}
    </section>
  );
});

export type { Category };
