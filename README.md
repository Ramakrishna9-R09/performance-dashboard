# Performance Dashboard — 10,000+ points at 60fps

Real-time dashboard built with **Next.js 14 App Router + TypeScript**. Canvas charts rendered from scratch (no D3/Chart.js), a fixed-capacity ring buffer for flat memory, virtualized tables, and a Web-Worker aggregation path.

## Setup

```bash
npm install
npm run dev      # http://localhost:3000 (redirects to /dashboard)
npm run build    # production build
npm start        # serve production build
npm run typecheck
```

## Feature overview

- **Charts (canvas, from scratch):** line (per-pixel min/max LOD + wheel zoom, drag pan, double-click reset), bar (worker-aggregated buckets + whiskers), scatter (stride-sampled ≤4k glyphs), heatmap (time × category density).
- **SVG hybrid chrome:** crisp axis ticks/labels rendered as an SVG overlay on top of canvas data.
- **Real-time stream:** new points every 100ms into a 120k ring buffer; adjustable load (50–2,000 pts/tick).
- **Time ranges:** 10k / 25k / 50k / 100k sliding windows + raw / 1min / 5min / 1hour aggregation.
- **Virtualized table:** 100k rows → ~30 mounted DOM nodes, latest-first.
- **Performance HUD:** FPS + history graph, frame time, chart render time, JS heap, points in view, stress-test mode.
- **Route handler (edge):** `GET /api/data?count=&seed=` re-seeds the dashboard from the server.
- **Command palette + shortcuts:** `Ctrl/⌘ K` commands, `Space` pause, `1–4` chart switch, hover crosshair readout on the line chart.

## Screenshots

Capture from the production build (`npm run build && npm start`, 1440px viewport):

| File | Capture |
|---|---|
| `docs/shot-overview.png` | Full `/dashboard` at 10k, line chart, HUD green |
| `docs/shot-stress.png` | After **⚡ Stress 100k**, heatmap active, FPS holding |
| `docs/shot-palette.png` | `Ctrl+K` palette open over the dashboard |

> Live reference (always current): `https://performance-dashboard-beta-ruby.vercel.app/dashboard`

## Performance testing

1. `npm run build && npm start` (always measure production builds).
2. Open `/dashboard`, set range **100k**, press **⚡ Stress 100k**.
3. Watch the HUD: FPS graph (dashed line = 60fps target), render ms, heap over 10+ minutes (should stay flat).
4. Chrome DevTools → Performance: record 10s, confirm long tasks ≈ 0 and scripting/frame < 8ms.
5. React DevTools Profiler: interact (pause, switch charts) — only control-level re-renders; canvas loops bypass React.

See [PERFORMANCE.md](./PERFORMANCE.md) for architecture, budgets, and scaling strategy.

## Browser compatibility

- Chrome / Edge 100+ (full: heap stats, workers, DPR canvas).
- Firefox / Safari 16+: everything except `performance.memory` heap readout (shows `n/a`).
- Mobile/tablet: responsive single-column layout; reduce to 10–25k window for 60fps on low-power GPUs.

## Next.js optimizations used

- **Server Component** (`app/dashboard/page.tsx`) generates the deterministic 10k seed dataset — first paint has data, no fetch waterfall.
- **Streaming** via `Suspense` + `loading.tsx`; `error.tsx` boundary for the dashboard subtree.
- **Client island** (`components/dashboard/Dashboard.tsx`): only interactivity hydrates; server HTML is static shell + data props.
- **Route handler** for data re-seeding (`app/api/data/route.ts`, edge runtime).
- **Concurrent UI:** chart tabs and range switches ride `useTransition` — the old view stays interactive while the new one mounts.
- No external chart/state libraries — client JS stays lean (see build output for bundle sizes).
