/** Exponential moving average for stable HUD numbers. */
export class Ema {
  private v = 0;
  private init = false;
  constructor(private readonly alpha = 0.12) {}
  push(x: number): number {
    this.v = this.init ? this.v + this.alpha * (x - this.v) : x;
    this.init = true;
    return this.v;
  }
  get value(): number {
    return this.v;
  }
}

export function getHeapMB(): number {
  const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
  if (perf.memory && typeof perf.memory.usedJSHeapSize === 'number') {
    return perf.memory.usedJSHeapSize / 1048576;
  }
  return -1;
}

/** Measure sync fn duration in ms (for render-time instrumentation). */
export function measure<T>(fn: () => T): { result: T; ms: number } {
  const t0 = performance.now();
  const result = fn();
  return { result, ms: performance.now() - t0 };
}
