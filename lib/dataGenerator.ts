import type { Category, DataPoint } from './types';
import { CATEGORIES } from './types';

export const TICK_MS = 100;
export const INITIAL_COUNT = 10_000;
export const STEP_MS = 100;

/** Deterministic PRNG so SSR output is stable across renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_OFFSET: Record<Category, number> = {
  alpha: 0,
  beta: 14,
  gamma: -10,
  delta: 24,
};

function sampleValue(rand: () => number, t: number, i: number, c: Category): number {
  const drift = Math.sin(i / 900) * 18 + Math.sin(i / 173) * 7;
  const noise = (rand() - 0.5) * 22;
  const spike = rand() > 0.985 ? (rand() - 0.4) * 60 : 0;
  return 120 + drift + noise + spike + CATEGORY_OFFSET[c];
}

/** Full dataset ending at `endTime`, spaced STEP_MS apart. */
export function generateInitialDataset(count: number, seed: number, endTime = Date.now()): DataPoint[] {
  const rand = mulberry32(seed);
  const pts: DataPoint[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const c = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    pts[i] = { t: endTime - (count - 1 - i) * STEP_MS, v: sampleValue(rand, endTime, i, c), c };
  }
  return pts;
}

/** Live tick batch continuing from `fromIndex`/`lastT`. Mutates rng state. */
export function generateTick(
  rand: () => number,
  count: number,
  fromIndex: number,
  lastT: number,
): DataPoint[] {
  const pts: DataPoint[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const idx = fromIndex + i;
    const c = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    pts[i] = { t: lastT + (i + 1) * STEP_MS, v: sampleValue(rand, lastT, idx, c), c };
  }
  return pts;
}
