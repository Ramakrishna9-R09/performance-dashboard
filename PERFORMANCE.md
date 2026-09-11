# PERFORMANCE.md — how this dashboard stays at 60fps

## Design budgets

| Budget | Target | Where enforced |
|---|---|---|
| Frame total | ≤ 16.6ms | rAF loops skip hidden/off-screen canvases |
| Chart render | ≤ 3ms @100k | LOD + glyph budgets (see below) |
| React commits during stream | 0 per tick | stream writes ring buffer only |
| HUD updates | 2Hz isolated state | `usePerformanceMonitor` |
| DOM nodes (table) | ~30 @100k rows | `useVirtualization` |
| Heap growth | ~0 / hour | fixed 120k ring buffer, reused column buffers |

## Benchmarks

### Data-layer throughput (measured on this machine, Node v24.16.0, production `lib/` code compiled as-is)

| Workload (100,000 points) | Median |
|---|---|
| `generateInitialDataset` (seeded, deterministic) | 21.52ms |
| `bucketize` → 120 buckets (bar chart path) | **0.77ms** |
| `bucketize` → 2048 buckets (pixel-LOD path) | 1.27ms |
| `aggregateByTime` (1min windows) | 0.65ms |
| Line-chart LOD scan → 800 pixel columns | **0.57ms** |

Takeaway: the per-frame math over the full 100k window costs **~0.6ms — 4% of a 16.6ms frame**. That is why the rAF loop can redraw every frame while heavy aggregates still run at 2Hz in the worker, never on the hot path. Reproduce: compile `lib/*.ts` with `tsc` and time the functions above.

### In-app measurement (production build required)

- HUD shows live **FPS** (rAF counting), **frame ms** (EMA), **chart render ms** (measured around each draw), **heap MB** (`performance.memory`, Chromium only).
- Procedure: `npm run build && npm start` → 100k + Stress → record 10s in Chrome Performance panel.
- Expected: 55–60fps @10–25k on desktop; 30fps+ @100k; render ≤3ms; heap flat (±2MB) over 30+ min.

## React optimization techniques

- **State collocation:** the 100ms stream never touches React state — it writes a `SeriesStore` ring buffer held in a ref. UI state (paused, chart, range) changes only on user input.
- **Context split:** `DataProvider` memoizes its context value; the monitor owns its 2Hz state so charts/controls never re-render from metrics.
- **Stable loops:** `useChartRenderer` stores the draw closure in a ref — the rAF loop is created once, always calls the latest draw, no effect churn.
- **Concurrent transitions:** chart-tab and range switches are wrapped in `useTransition` with a pending shimmer, so heavy re-mounts never block typing, scrolling, or the stream.
- **Memoized subtrees:** `ChartCard`, charts, table, and panels are `React.memo`; domain updates (2Hz) re-render only the chart stage.
- **Virtualization:** fixed 28px rows + overscan + rAF-gated scroll handler.
- **No per-frame allocation:** reused `Float32Array` column buffers; stride sampling instead of `.filter/.map` chains.

## Next.js performance features

- **SSR seed data:** the Server Component generates 10k deterministic points; the client hydrates with data already present (no loading waterfall, better LCP).
- **Streaming:** `Suspense` boundary + `loading.tsx` skeleton; `error.tsx` isolates failures.
- **Route handler:** `/api/data` generates datasets server-side (keeps generation out of the client bundle path on re-seed).
- **Zero chart/state deps:** client bundle = React + Next runtime only.

## Canvas integration

- One canvas per chart, DPR-aware via `setupCanvas` (capped at 2x), sized by `ResizeObserver`.
- **LOD:** line chart reduces the window to per-pixel min/max/avg columns; scatter caps at 4k `fillRect` glyphs (no arc paths); heatmap repaints ~112 cached cells.
- **SVG hybrid:** axes/ticks/labels are an SVG overlay with a measured viewBox (crisp text), data stays on canvas.
- **Visibility discipline:** `IntersectionObserver` + `document.hidden` checks skip draws for off-screen/hidden tabs; all listeners/loops torn down in effect cleanups (StrictMode-safe).
- **Worker path:** bar-chart bucketing posts transferable `Float64Array` copies to `aggregator.worker.ts` at 2Hz with automatic sync fallback (`bucketize`) on any failure.

## Scaling strategy

- **100k+ points:** LOD keeps draw O(pixels); raise stride caps, lower worker cadence to 1Hz, freeze heatmap when hidden.
- **1M points:** move the ring buffer into a `SharedArrayBuffer` + worker-owned aggregation, render from bucket caches only (never raw scan per frame); consider WebGL for scatter.
- **Server vs client:** SSR for seed/config HTML; all streaming + rendering client-side (canvases can't SSR). For collaboration/offline: persist ring snapshots to IndexedDB, sync via WebSocket deltas, Service Worker caches shell + last snapshot.
- **10ms ingestion:** batch ticks in the worker, transfer snapshots at 10Hz, keep React commits at 2Hz.
