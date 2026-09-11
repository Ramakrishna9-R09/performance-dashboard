'use client';

import { useCallback, useState } from 'react';

export interface VirtualWindow {
  start: number;
  end: number;
  offsetY: number;
  totalHeight: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

/**
 * Fixed-row-height virtualization: only the visible slice (+overscan) is
 * mounted, so 100k rows cost ~30 DOM nodes. Scroll handler is rAF-gated.
 */
export function useVirtualization(rowCount: number, rowHeight: number, viewportHeight: number, overscan = 8): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [ticking, setTicking] = useState(false);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (ticking) return;
      setTicking(true);
      requestAnimationFrame(() => {
        setScrollTop(e.currentTarget.scrollTop);
        setTicking(false);
      });
    },
    [ticking],
  );

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visible = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const end = Math.min(rowCount, start + visible);

  return { start, end, offsetY: start * rowHeight, totalHeight: rowCount * rowHeight, onScroll };
}
