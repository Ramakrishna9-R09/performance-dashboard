/**
 * Aggregation Web Worker: min/max/avg bucketing off the main thread.
 * Input arrays are transferred (zero-copy); result is posted back.
 */
export interface BucketRequest {
  id: number;
  values: Float64Array;
  times: Float64Array;
  buckets: number;
}

export interface BucketResponse {
  id: number;
  min: number[];
  max: number[];
  avg: number[];
  t0: number[];
}

self.onmessage = (e: MessageEvent<BucketRequest>) => {
  const { id, values, times, buckets } = e.data;
  const n = values.length;
  const b = Math.max(1, Math.min(buckets, n || 1));
  const min = new Array<number>(b).fill(Infinity);
  const max = new Array<number>(b).fill(-Infinity);
  const sum = new Array<number>(b).fill(0);
  const cnt = new Array<number>(b).fill(0);
  const t0 = new Array<number>(b).fill(0);
  for (let i = 0; i < n; i++) {
    const k = Math.min(b - 1, Math.floor((i / n) * b));
    const v = values[i];
    if (v < min[k]) min[k] = v;
    if (v > max[k]) max[k] = v;
    if (cnt[k] === 0) t0[k] = times[i];
    sum[k] += v;
    cnt[k] += 1;
  }
  const avg = sum.map((s, k) => (cnt[k] ? s / cnt[k] : 0));
  const res: BucketResponse = { id, min, max, avg, t0 };
  self.postMessage(res);
};
