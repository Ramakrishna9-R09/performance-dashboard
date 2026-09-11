'use client';

import { memo, useState } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { CATEGORIES, CATEGORY_COLORS, type AggKey, type Category } from '@/lib/types';

const AGGS: { key: AggKey; label: string }[] = [
  { key: 'raw', label: 'Raw' },
  { key: '1min', label: '1 min' },
  { key: '5min', label: '5 min' },
  { key: '1hour', label: '1 hour' },
];

/**
 * Data filtering + load controls. All updates are discrete UI state
 * patches — the 100ms stream never flows through React state.
 */
export const FilterPanel = memo(function FilterPanel() {
  const { config, setConfig, reseed } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const toggleCat = (c: Category) => {
    const has = config.categories.includes(c);
    const next = has ? config.categories.filter((x) => x !== c) : [...config.categories, c];
    setConfig({ categories: next.length ? next : [...CATEGORIES] });
  };

  const reseedFromServer = async () => {
    setBusy(true);
    setNote('');
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const res = await fetch(`/api/data?count=${config.targetPoints}&seed=${seed}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      reseed(json.points);
      setNote(`Re-seeded ${json.count.toLocaleString()} pts from server in ${json.tookMs}ms.`);
    } catch (e) {
      setNote(`Re-seed failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const stress = () => {
    setConfig({ targetPoints: 100_000, pointsPerTick: 1500, chart: 'heatmap', paused: false });
    setNote('Stress mode: 100k window · 1.5k pts/tick · heatmap.');
  };

  return (
    <section className="card" aria-label="Filters and load">
      <h2>Stream</h2>
      <p className="hint">100ms simulated ingestion into a fixed ring buffer.</p>
      <div className="row">
        <button className={`btn${config.paused ? ' on' : ''}`} onClick={() => setConfig({ paused: !config.paused })}>
          {config.paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button className="btn danger" onClick={stress}>
          ⚡ Stress 100k
        </button>
      </div>

      <label className="lbl" htmlFor="ppt">
        Points per tick · {config.pointsPerTick}
      </label>
      <input
        id="ppt"
        type="range"
        min={50}
        max={2000}
        step={50}
        value={config.pointsPerTick}
        onChange={(e) => setConfig({ pointsPerTick: Number(e.target.value) })}
      />

      <label className="lbl">Aggregation</label>
      <div className="row">
        {AGGS.map((a) => (
          <button
            key={a.key}
            className={`btn${config.agg === a.key ? ' on' : ''}`}
            onClick={() => setConfig({ agg: a.key })}
          >
            {a.label}
          </button>
        ))}
      </div>

      <label className="lbl">Categories</label>
      {CATEGORIES.map((c) => (
        <label key={c} className="cat-toggle">
          <input type="checkbox" checked={config.categories.includes(c)} onChange={() => toggleCat(c)} />
          <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
          {c}
        </label>
      ))}

      <label className="lbl">Server</label>
      <div className="row">
        <button className="btn" disabled={busy} onClick={reseedFromServer}>
          {busy ? 'Loading…' : '↻ Re-seed from /api/data'}
        </button>
      </div>
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}
    </section>
  );
});
