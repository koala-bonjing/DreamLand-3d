import { ScenarioConfig, ScenarioResult, HeatSample, HeatTestResult, FullBenchReport } from './types';
import { BenchScene } from './scene';

export const SCENARIO_LADDER: ScenarioConfig[] = [
  { pixelRatio: 1.0, fogFar: 60, trees: 500, chunkRing: 1 },
  { pixelRatio: 1.25, fogFar: 90, trees: 1500, chunkRing: 2 },
  { pixelRatio: 1.5, fogFar: 90, trees: 1500, chunkRing: 2 },
  { pixelRatio: 1.25, fogFar: 130, trees: 3000, chunkRing: 2 },
  { pixelRatio: 1.5, fogFar: 130, trees: 3000, chunkRing: 3 }
];

export function calcPercentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return Number(sorted[idx].toFixed(2));
}

export function evaluateTier(p95: number): { pass30: boolean; pass60: boolean } {
  return {
    pass30: p95 <= 33.3,
    pass60: p95 <= 16.7
  };
}

export class BenchmarkHarness {
  private scene: BenchScene;

  constructor(scene: BenchScene) {
    this.scene = scene;
  }

  public async measureScenario(
    config: ScenarioConfig,
    onProgress?: (phase: 'warmup' | 'measure', secondsLeft: number, currentFps: number) => void
  ): Promise<ScenarioResult> {
    this.scene.applyScenario(config);

    const WARMUP_MS = 2000;
    const MEASURE_MS = 8000;
    const frameDeltas: number[] = [];

    // Warmup phase (2s)
    let start = performance.now();
    let lastTime = start;

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        this.scene.render(now);

        const elapsed = now - start;
        if (elapsed < WARMUP_MS) {
          const fps = delta > 0 ? 1000 / delta : 0;
          onProgress?.('warmup', Math.ceil((WARMUP_MS - elapsed) / 1000), fps);
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    // Measurement phase (8s)
    start = performance.now();
    lastTime = start;

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        frameDeltas.push(delta);
        this.scene.render(now);

        const elapsed = now - start;
        if (elapsed < MEASURE_MS) {
          const fps = delta > 0 ? 1000 / delta : 0;
          onProgress?.('measure', Math.ceil((MEASURE_MS - elapsed) / 1000), fps);
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    const totalDelta = frameDeltas.reduce((acc, v) => acc + v, 0);
    const avgFps = totalDelta > 0 ? Number(((frameDeltas.length * 1000) / totalDelta).toFixed(1)) : 0;

    let heapMB: number | undefined;
    const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize?: number } };
    if (perfWithMemory.memory?.usedJSHeapSize) {
      heapMB = Number((perfWithMemory.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
    }

    return {
      scenario: config,
      p50: calcPercentile(frameDeltas, 50),
      p95: calcPercentile(frameDeltas, 95),
      p99: calcPercentile(frameDeltas, 99),
      avgFps,
      drawCalls: this.scene.renderer.info.render.calls,
      triangles: this.scene.renderer.info.render.triangles,
      jsHeapMB: heapMB
    };
  }

  public async runHeatTest(
    config: ScenarioConfig,
    onProgress?: (secondsLeft: number, latestSample: HeatSample) => void
  ): Promise<HeatTestResult> {
    this.scene.applyScenario(config);

    const DURATION_MS = 180_000; // 3 min
    const SAMPLE_INTERVAL_MS = 30_000; // 30 sec
    const samples: HeatSample[] = [];

    const start = performance.now();
    let windowDeltas: number[] = [];
    let lastTime = start;
    let nextSampleTime = start + SAMPLE_INTERVAL_MS;

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        windowDeltas.push(delta);
        this.scene.render(now);

        const totalElapsed = now - start;

        if (now >= nextSampleTime) {
          const sum = windowDeltas.reduce((a, b) => a + b, 0);
          const fps = sum > 0 ? Number(((windowDeltas.length * 1000) / sum).toFixed(1)) : 0;
          const sample: HeatSample = {
            timeSec: Math.round(totalElapsed / 1000),
            fps,
            p95: calcPercentile(windowDeltas, 95)
          };
          samples.push(sample);
          windowDeltas = [];
          nextSampleTime = now + SAMPLE_INTERVAL_MS;
          onProgress?.(Math.max(0, Math.ceil((DURATION_MS - totalElapsed) / 1000)), sample);
        }

        if (totalElapsed < DURATION_MS) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    const firstFps = samples[0]?.fps || 30;
    const lastFps = samples[samples.length - 1]?.fps || firstFps;
    const fpsDropPercent = Number((((firstFps - lastFps) / firstFps) * 100).toFixed(1));

    return {
      samples,
      fpsDropPercent: Math.max(0, fpsDropPercent)
    };
  }

  public generateReport(results: ScenarioResult[], heatTest?: HeatTestResult): FullBenchReport {
    // Determine recommended scenario: best scenario that holds p95 <= 33.3ms (or fallback to lowest)
    let recommended = results[0].scenario;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].p95 <= 33.3) {
        recommended = results[i].scenario;
        break;
      }
    }

    const a15ScenarioResult = results.find(
      (r) => r.scenario.pixelRatio === 1.25 && r.scenario.chunkRing === 2
    ) || results[0];

    const pass30 = a15ScenarioResult.p95 <= 33.3;
    const pass60 = a15ScenarioResult.p95 <= 16.7;

    let tierEstimate: FullBenchReport['deviceTierEstimate'] = 'Fail';
    if (pass60 && a15ScenarioResult.scenario.pixelRatio >= 1.5) {
      tierEstimate = 'High';
    } else if (pass60) {
      tierEstimate = 'Mid';
    } else if (pass30) {
      tierEstimate = 'A15';
    }

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceTierEstimate: tierEstimate,
      recommendedScenario: recommended,
      tierStatus: {
        tier30fps: pass30,
        tier60fps: pass60
      },
      scenarios: results,
      heatTest
    };
  }
}
