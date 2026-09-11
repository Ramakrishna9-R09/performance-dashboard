'use client';

import { memo, useEffect, useState } from 'react';
import { formatCompact, formatTime, niceTicks } from '@/lib/canvasUtils';
import type { Domain } from '@/hooks/useViewDomain';

interface Props {
  domain: Domain;
}

/**
 * SVG chrome over canvas data: crisp value + time labels that scale with
 * the container via a measured viewBox (no blurry preserveAspectRatio text).
 */
export const AxisOverlay = memo(function AxisOverlay({ domain }: Props) {
  const [size, setSize] = useState({ w: 800, h: 340 });

  useEffect(() => {
    const host = document.getElementById('axis-host');
    if (!host) return;
    const ro = new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      setSize({ w: Math.max(50, Math.floor(r.width)), h: Math.max(50, Math.floor(r.height)) });
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const padL = 46;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const { w, h } = size;
  const ticks = niceTicks(domain.min, domain.max, 4);
  const yOf = (v: number) => padT + (1 - (v - domain.min) / Math.max(1e-9, domain.max - domain.min)) * (h - padT - padB);

  return (
    <svg className="axes" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {ticks.map((t) => (
        <text key={t} x={4} y={yOf(t) + 3} fontSize="9.5" fill="#8b93a7" fontFamily="ui-monospace,monospace">
          {formatCompact(t)}
        </text>
      ))}
      {[0, 0.33, 0.66, 1].map((f) => {
        const t = domain.t0 + (domain.t1 - domain.t0) * f;
        const x = padL + f * (w - padL - padR);
        return (
          <text
            key={f}
            x={Math.min(w - 44, Math.max(padL - 10, x - 20))}
            y={h - 7}
            fontSize="9.5"
            fill="#697183"
            fontFamily="ui-monospace,monospace"
          >
            {domain.n > 1 ? formatTime(t) : '--:--:--'}
          </text>
        );
      })}
    </svg>
  );
});
