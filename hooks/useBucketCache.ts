'use client';

import { useEffect, useRef } from 'react';
import type { Category } from '@/lib/types';
import type { SeriesStore } from '@/components/providers/DataProvider';
import { bucketize, type MinMaxBuckets } from '@/lib/aggregation';
import type { BucketResponse } from '@/workers/aggregator.worker';

const EMPTY_BUCKETS: MinMaxBuckets = { min: [], max: [], avg: [], t0: [], count: 0 };

/**
 * 2Hz bucket cache for bar/heatmap charts. Prefers the aggregation Web
 * Worker (transferred buffers, zero postMessage allocation on receipt);
 * falls back to synchronous single-pass bucketing if workers are
 * unavailable or error out.
 */
export function useBucketCache(
  store: SeriesStore,
  viewN: number,
  cats: Category[],
  bucketCount: number,
): React.MutableRefObject<MinMaxBuckets> {
  const cache = useRef<MinMaxBuckets>(EMPTY_BUCKETS);
  const workerRef = useRef<Worker | null>(null);
  const workerDead = useRef(false);
  const reqId = useRef(0);
  const argsRef = useRef({ viewN, bucketCount, key: cats.join(',') });
  argsRef.current = { viewN, bucketCount, key: cats.join(',') };

  useEffect(() => {
    if (typeof Worker !== 'undefined' && !workerDead.current && !workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('../workers/aggregator.worker.ts', import.meta.url));
        workerRef.current.onmessage = (e: MessageEvent) => {
          const res = e.data as BucketResponse;
          cache.current = { min: res.min, max: res.max, avg: res.avg, t0: res.t0, count: res.min.length };
        };
        workerRef.current.onerror = () => {
          workerDead.current = true;
          workerRef.current?.terminate();
          workerRef.current = null;
        };
      } catch {
        workerDead.current = true;
      }
    }

    const catSet = () => new Set(argsRef.current.key.split(','));
    const NAMES = ['alpha', 'beta', 'gamma', 'delta'];

    const compute = () => {
      const { viewN: vn, bucketCount: bc } = argsRef.current;
      const n = Math.min(vn, store.len);
      if (n < 2) return;
      const set = catSet();
      const w = workerRef.current;
      if (w && !workerDead.current) {
        // Bound message size: stride-sample to <= 30k points for transfer.
        const stride = Math.max(1, Math.ceil(n / 30_000));
        const m = Math.ceil(n / stride);
        const values = new Float64Array(m);
        const times = new Float64Array(m);
        let j = 0;
        for (let i = store.len - n; i < store.len; i += stride) {
          const p = store.at(i);
          if (!set.has(NAMES[store.cats[p]])) continue;
          values[j] = store.values[p];
          times[j] = store.times[p];
          j += 1;
        }
        const id = ++reqId.current;
        try {
          w.postMessage(
            { id, values: values.subarray(0, j), times: times.subarray(0, j), buckets: bc },
            { transfer: [(values as Float64Array).buffer, (times as Float64Array).buffer] },
          );
          return; // async result lands in cache via onmessage
        } catch {
          workerDead.current = true;
          try {
            w.terminate();
          } catch {
            /* noop */
          }
          workerRef.current = null;
        }
      }
      cache.current = bucketize(
        n,
        bc,
        (i) => store.times[store.at(store.len - n + i)],
        (i) => {
          const p = store.at(store.len - n + i);
          return set.has(NAMES[store.cats[p]]) ? store.values[p] : NaN;
        },
      );
    };

    compute();
    const id = setInterval(compute, 500);
    return () => clearInterval(id);
  }, [store]);

  return cache;
}
