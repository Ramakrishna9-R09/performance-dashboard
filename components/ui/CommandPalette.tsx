'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import type { ChartType } from '@/lib/types';

interface Action {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
}

const CHARTS: ChartType[] = ['line', 'bar', 'scatter', 'heatmap'];

/**
 * Ctrl+K command palette: every major action reachable from the keyboard.
 * Fully local state — mounting it never re-renders charts or the stream.
 */
export const CommandPalette = memo(function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config, setConfig, reseed } = useDashboard();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const actions: Action[] = useMemo(
    () => [
      {
        id: 'pause',
        label: config.paused ? 'Resume live stream' : 'Pause live stream',
        hint: 'Space',
        run: () => setConfig({ paused: !config.paused }),
      },
      {
        id: 'stress',
        label: 'Stress test — 100k points',
        hint: '⚡',
        run: () => setConfig({ targetPoints: 100_000, pointsPerTick: 1500, chart: 'heatmap', paused: false }),
      },
      ...CHARTS.map((c, i) => ({
        id: `chart-${c}`,
        label: `Switch to ${c} chart`,
        hint: `${i + 1}`,
        run: () => setConfig({ chart: c }),
      })),
      {
        id: 'reseed',
        label: 'Re-seed from server API',
        hint: '↻',
        run: async () => {
          const seed = Math.floor(Math.random() * 1_000_000);
          const res = await fetch(`/api/data?count=${config.targetPoints}&seed=${seed}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            reseed(json.points);
          }
        },
      },
      {
        id: 'calm',
        label: 'Calm mode — 10k points',
        hint: '10k',
        run: () => setConfig({ targetPoints: 10_000, pointsPerTick: 250 }),
      },
    ],
    [config, setConfig, reseed],
  );

  const hits = actions.filter((a) => a.label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (open) {
      setQ('');
      setIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open ]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  if (!open) return null;

  const choose = (a: Action) => {
    void a.run();
    onClose();
  };

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a command… (pause, stress, line, reseed)"
          aria-label="Command search"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIdx((i) => Math.min(hits.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIdx((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              const a = hits[idx];
              if (a) choose(a);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
        />
        <ul>
          {hits.map((a, i) => (
            <li key={a.id}>
              <button className={i === idx ? 'active' : ''} onClick={() => choose(a)} onMouseEnter={() => setIdx(i)}>
                <span>{a.label}</span>
                <span className="keys">
                  <kbd>{a.hint}</kbd>
                </span>
              </button>
            </li>
          ))}
          {hits.length === 0 && (
            <li>
              <button disabled>No matches</button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
});
