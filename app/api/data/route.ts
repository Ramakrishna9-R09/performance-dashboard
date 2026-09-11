import { NextRequest, NextResponse } from 'next/server';
import { generateInitialDataset } from '@/lib/dataGenerator';

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * GET /api/data?count=10000&seed=7
 * Server-side synthetic time-series generation. Used by the dashboard to
 * re-seed without shipping generation cost to the client bundle path.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = clampInt(searchParams.get('count'), 10000, 1000, 100000);
  const seed = clampInt(searchParams.get('seed'), 1, 1, 1_000_000_000);

  const t0 = Date.now();
  const points = generateInitialDataset(count, seed);
  const tookMs = Date.now() - t0;

  return NextResponse.json({ count: points.length, tookMs, points });
}
