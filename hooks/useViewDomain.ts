'use client';

import { useEffect, useState } from 'react';
import type { Category } from '@/lib/types';
import type { SeriesStore } from '@/components/providers/DataProvider';

export interface Domain {
  min: number;
  max: number;
  t0: number;
  t1: number;
  n: number;
}

const EMPTY: Domain = { min: 0, max: 1, t0: 0, t1: 1, n: 0 };

/**
 * Shared value domain sampled at 2Hz (stride scan, ~2k samples max) so all
 * charts and the SVG axis overlay map with identical coordinates without
 * per-frame React state churn.
 */
export function useViewDomain(store: SeriesStore, viewN: number, cats: Category[]): Domain {
  const key = cats.join(',');
  const [domain, setDomain] = useState<Domain>(EMPTY);

  useEffect(() => {
    const catSet = new Set(key.split(','));
    const calc = () => {
      const n = Math.min(viewN, store.len);
      if (n < 2) return;
      const stride = Math.max(1, Math.ceil(n / 2000));
      let min = Infinity;
      let max = -Infinity;
      for (let i = store.len - n; i < store.len; i += stride) {
        const p = store.at(i);
        if (!catSet.has(String(store.cats[p]) && catName(store.cats[p]))) continue;
        const v = store.values[p];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (!Number.isFinite(min)) return;
      if (min === max) {
        min -= 1;
        max += 1;
      }
      const pad = (max - min) * 0.08;
      const a = store.at(store.len - n);
      const b = store.at(store.len - 1);
      setDomain({ min: min - pad, max: max + pad, t0: store.times[a], t1: store.times[b], n });
    };
    calc();
    const id = setInterval(calc, 500);
    return () => clearInterval(id);
  }, [store, viewN, key]);

  return domain;
}

const NAMES = ['alpha', 'beta', 'gamma', 'delta'];
function catName(idx: number): string {
  return NAMES[idx] ?? 'alpha';
}
