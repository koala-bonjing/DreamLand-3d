---
name: perf-benchmark-harness
description: How to measure frame time and quality tiers. Use when building or running the /bench page, setting budget.ts, doing a phase perf gate, or whenever the user reports lag, stutter, or heat.
---
# Performance Benchmark Harness

## Rules
1. Every benchmark scenario must run 2s warmup before recording, then 8s measurement.
2. Record p50, p95, p99 frame ms, average FPS, draw calls, triangles, and heap memory.
3. Pass criteria: 30 FPS tier requires p95 ≤ 33.3ms; 60 FPS tier requires p95 ≤ 16.7ms.
4. Scenario ladder: scale {1.0, 1.25, 1.5} × fog {60, 90, 130} × trees {500, 1500, 3000} × ring {1, 2, 3}.
5. Heat test: run 3 minutes at recommended scenario; sample metrics every 30s.
6. Overlay stats must throttle DOM updates to 2×/s (every 500ms) to avoid layout thrashing.
7. Provide one-tap "Copy JSON" button formatted for phone clipboard sharing.
8. Auto-recommend the highest tier where p95 meets the frame time budget.

## Snippets

### Result JSON Schema
```ts
export interface FullBenchReport {
  timestamp: string;
  userAgent: string;
  deviceTierEstimate: 'A15' | 'Mid' | 'High' | 'Fail';
  recommendedScenario: { pixelRatio: number; fogFar: number; trees: number; chunkRing: number };
  tierStatus: { tier30fps: boolean; tier60fps: boolean };
  scenarios: Array<{ p50: number; p95: number; p99: number; avgFps: number; drawCalls: number; triangles: number }>;
  heatTest?: { samples: Array<{ timeSec: number; fps: number; p95: number }>; fpsDropPercent: number };
}
```

### Percentile Calculation
```ts
export function calcPercentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return Number(sorted[idx].toFixed(2));
}
```

## Pitfalls
- Sampling without a 2s warmup captures shader compile pauses and pollutes p99.
- Updating DOM on every requestAnimationFrame creates severe layout thrashing.
- Running heat tests with screen sleeping ruins background throttling accuracy.

## Sources
- https://developer.mozilla.org/en-US/docs/Web/API/Performance/now (2026-10-15)
- https://threejs.org/docs/#api/en/renderers/WebGLRenderer.info (2026-10-15)
