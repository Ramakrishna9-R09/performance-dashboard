'use client';

import { memo, useTransition } from 'react';
import { useDashboard } from '@/components/providers/DataProvider';
import { TARGET_OPTIONS } from '@/lib/types';

/**
 * Time-range selection = sliding window size over the stream.
 * Larger windows raise render load; the HUD shows the fps cost live.
 * Range jumps ride a transition so scrubbing sizes never blocks input.
 */
export const TimeRangeSelector = memo(function TimeRangeSelector() {
  const { config, setConfig, store } = useDashboard();
  const [isPending, startTransition] = useTransition();
  const minutes = Math.round((Math.min(config.targetPoints, store.len) * 100) / 60000);

  return (
    <section className="card" aria-label="Time range">
      <h2>Time range</h2>
      <p className="hint">
        Showing last ~{minutes} min · {Math.min(config.targetPoints, store.len).toLocaleString()} pts in view.
      </p>
      <div className="row">
        {TARGET_OPTIONS.map((n) => (
          <button
            key={n}
            className={`btn${config.targetPoints === n ? ' on' : ''}`}
            onClick={() => startTransition(() => setConfig({ targetPoints: n }))}
          >
            {n >= 1000 ? `${Math.round(n / 1000)}k` : n}
          </button>
        ))}
      </div>
      {isPending && <p className="hint">re-bucketing…</p>}
    </section>
  );
});
