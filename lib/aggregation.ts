import type { DataPoint } from './types';

export interface MinMaxBuckets {
  min: number[];
  max: number[];
  avg: number[];
  t0: number[];
  count: number;
}

/**
 * Level-of-detail decimation: reduce N points to `buckets` min/max/avg
 * buckets in a single O(N) pass with zero per-point allocation.
 * Works directly on ring-buffer views via indexed accessors.
 */
export function bucketize(
  n: number,
  buckets: number,
  getT: (i: number) => number,
  getV: (i: number) => number,
): MinMaxBuckets {
  const b = Math.max(1, Math.min(buckets, n));
  const min = new Array<number>(b).fill(Infinity);
  const max = new Array<number>(b).fill(-Infinity);
  const sum = new Array<number>(b).fill(0);
  const cnt = new Array<number>(b).fill(0);
  const t0 = new Array<number>(b).fill(0);
  for (let i = 0; i < n; i++) {
    const k = Math.min(b - 1, Math.floor((i / n) * b));
    const v = getV(i);
    if (v < min[k]) min[k] = v;
    if (v > max[k]) max[k] = v;
    if (cnt[k] === 0) t0[k] = getT(i);
    sum[k] += v;
    cnt[k] += 1;
  }
  const avg = sum.map((s, k) => (cnt[k] ? s / cnt[k] : 0));
  return { min, max, avg, t0, count: b };
}

/** Time-period aggregation: fold points into fixed //bucketMs// windows. */
export function aggregateByTime(points: DataPoint[], bucketMs: number): { t: number; avg: number; n: number }[] {
  if (points.length === 0) return [];
  const out: { t: number; avg: number; n: number }[] = [];
  let cur = Math.floor(points[0].t / bucketMs) * bucketMs;
  let sum = 0;
  let n = 0;
  for (const p of points) {
    const b = Math.floor(p.t / bucketMs) * bucketMs;
    if (b !== cur) {
      out.push({ t: cur, avg: sum / n, n });
      cur = b;
      sum = 0;
      n = 0;
    }
    sum += p.v;
    n += 1;
  }
  if (n > 0) out.push({ t: cur, avg: sum / n, n });
  return out;
}
