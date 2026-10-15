# Benchmark Harness & Frame Timing Research
Date: 2026-10-15
Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
- https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- https://threejs.org/docs/#api/en/renderers/WebGLRenderer.info

Key Findings:
1. `performance.now()` offers sub-millisecond precision for frame delta calculations.
2. JIT compilation and shader compilation cause initial stutters; require a 2s warmup before recording.
3. 8-second measurement window captures typical variance and percentile distributions (p50, p95, p99).
4. For 30 FPS target, p95 frame time must remain ≤ 33.3ms; for 60 FPS, p95 ≤ 16.7ms.
5. Three.js `renderer.info.render` provides realtime counts for draw calls, triangles, and textures.
6. DOM overlay updates must be throttled to 2Hz (every 500ms) to avoid layout thrashing.
7. Sustained thermal throttling on mobile (e.g. Mali GPUs) typically emerges around 2-3 minutes; a 3-minute sustained stress test sampled every 30s detects thermal throttling.
8. Output standardized JSON to allow easy copy-paste reporting from mobile devices.
