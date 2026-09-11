export type Category = 'alpha' | 'beta' | 'gamma' | 'delta';

export interface DataPoint {
  /** epoch ms */
  t: number;
  v: number;
  c: Category;
}

export type ChartType = 'line' | 'bar' | 'scatter' | 'heatmap';

export type AggKey = 'raw' | '1min' | '5min' | '1hour';

export interface ViewConfig {
  paused: boolean;
  /** points appended every 100ms tick */
  pointsPerTick: number;
  /** sliding view window (also stress-test load) */
  targetPoints: number;
  chart: ChartType;
  agg: AggKey;
  categories: Category[];
}

export interface PerformanceMetrics {
  fps: number;
  frameMs: number;
  renderMs: number;
  heapMB: number;
  points: number;
  dropped: number;
}

export const CATEGORIES: Category[] = ['alpha', 'beta', 'gamma', 'delta'];

export const CATEGORY_COLORS: Record<Category, string> = {
  alpha: '#d3ff53',
  beta: '#a888ff',
  gamma: '#7df0ff',
  delta: '#f18ae6',
};

export const CATEGORY_INDEX: Record<Category, number> = {
  alpha: 0,
  beta: 1,
  gamma: 2,
  delta: 3,
};

export const AGG_BUCKET_MS: Record<AggKey, number | null> = {
  raw: null,
  '1min': 60_000,
  '5min': 300_000,
  '1hour': 3_600_000,
};

export const TARGET_OPTIONS = [10_000, 25_000, 50_000, 100_000];
