'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Category, DataPoint, ViewConfig } from '@/lib/types';
import { CATEGORIES, CATEGORY_INDEX } from '@/lib/types';
import { generateTick, mulberry32, TICK_MS } from '@/lib/dataGenerator';
import { useDataStream } from '@/hooks/useDataStream';

/**
 * Fixed-capacity ring buffer: the memory anchor of the whole dashboard.
 * Capacity is allocated ONCE (no growth, no per-frame allocation), so the
 * heap stays flat no matter how long the stream runs.
 */
export class SeriesStore {
  readonly cap: number;
  readonly times: Float64Array;
  readonly values: Float64Array;
  readonly cats: Uint8Array;
  start = 0;
  len = 0;
  totalAppended = 0;
  /** shared perf channel written by chart renderers, read by the monitor */
  perf = { lastRenderMs: 0, frames: 0, dropped: 0 };

  constructor(cap: number) {
    this.cap = cap;
    this.times = new Float64Array(cap);
    this.values = new Float64Array(cap);
    this.cats = new Uint8Array(cap);
  }

  appendBatch(pts: DataPoint[]): void {
    for (const p of pts) {
      const w = (this.start + this.len) % this.cap;
      if (this.len === this.cap) {
        this.start = (this.start + 1) % this.cap;
      } else {
        this.len += 1;
      }
      this.times[w] = p.t;
      this.values[w] = p.v;
      this.cats[w] = CATEGORY_INDEX[p.c];
      this.totalAppended += 1;
    }
  }

  /** physical index of logical position i (0 = oldest) */
  at(i: number): number {
    return (this.start + i) % this.cap;
  }

  row(i: number): { t: number; v: number; c: Category } {
    const p = this.at(i);
    return { t: this.times[p], v: this.values[p], c: CATEGORIES[this.cats[p]] };
  }
}

interface DashboardContextValue {
  store: SeriesStore;
  config: ViewConfig;
  setConfig: (patch: Partial<ViewConfig>) => void;
  reseed: (points: DataPoint[]) => void;
  liveTick: number;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DataProvider');
  return ctx;
}

const CAPACITY = 120_000;

export default function DataProvider({
  initialData,
  children,
}: {
  initialData: DataPoint[];
  children: React.ReactNode;
}) {
  const storeRef = useRef<SeriesStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new SeriesStore(CAPACITY);
    storeRef.current.appendBatch(initialData);
  }
  const store = storeRef.current;

  const rngRef = useRef<() => number>(() => 0);
  if (rngRef.current === null || (rngRef as { seeded?: boolean }).seeded !== true) {
    rngRef.current = mulberry32(987654321);
    (rngRef as { seeded?: boolean }).seeded = true;
  }
  const indexRef = useRef(initialData.length);
  const lastTRef = useRef(initialData.length ? initialData[initialData.length - 1].t : Date.now());

  const [config, setConfigState] = useState<ViewConfig>({
    paused: false,
    pointsPerTick: 250,
    targetPoints: 10_000,
    chart: 'line',
    agg: 'raw',
    categories: [...CATEGORIES],
  });

  const setConfig = useCallback((patch: Partial<ViewConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }));
  }, []);

  const reseed = useCallback(
    (points: DataPoint[]) => {
      store.start = 0;
      store.len = 0;
      store.totalAppended = 0;
      store.appendBatch(points);
      indexRef.current = points.length;
      lastTRef.current = points.length ? points[points.length - 1].t : Date.now();
    },
    [store],
  );

  const [liveTick, setLiveTick] = useState(0);

  useDataStream({
    paused: config.paused,
    intervalMs: TICK_MS,
    onTick: () => {
      const batch = generateTick(rngRef.current, config.pointsPerTick, indexRef.current, lastTRef.current);
      indexRef.current += batch.length;
      if (batch.length) lastTRef.current = batch[batch.length - 1].t;
      store.appendBatch(batch);
    },
    onSecond: () => setLiveTick((t) => t + 1),
  });

  const value = useMemo(
    () => ({ store, config, setConfig, reseed, liveTick }),
    [store, config, setConfig, reseed, liveTick],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
