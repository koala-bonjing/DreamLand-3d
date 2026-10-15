export type QualityTier = 'A15' | 'Mid' | 'High';

export interface QualityConfig {
  name: QualityTier;
  pixelRatioMin: number;
  pixelRatioMax: number;
  pixelRatioInitial: number;
  targetFps: number;
  maxTriangles: number;
  maxDrawCalls: number;
  fogFar: number;
  chunkRingRadius: number;
  maxTransparentSprites: number;
  maxJsHeapMB: number;
}

export const BUDGET_TIERS: Record<QualityTier, QualityConfig> = {
  A15: {
    name: 'A15',
    pixelRatioMin: 1.0,
    pixelRatioMax: 1.5,
    pixelRatioInitial: 1.25,
    targetFps: 30,
    maxTriangles: 60_000,
    maxDrawCalls: 60,
    fogFar: 90, // Calibrated in Gate A benchmark (measured p95 17.0ms)
    chunkRingRadius: 2,
    maxTransparentSprites: 10,
    maxJsHeapMB: 150
  },
  Mid: {
    name: 'Mid',
    pixelRatioMin: 1.5,
    pixelRatioMax: 2.0,
    pixelRatioInitial: 1.5,
    targetFps: 60,
    maxTriangles: 120_000,
    maxDrawCalls: 120,
    fogFar: 160,
    chunkRingRadius: 3,
    maxTransparentSprites: 20,
    maxJsHeapMB: 250
  },
  High: {
    name: 'High',
    pixelRatioMin: 1.5,
    pixelRatioMax: 2.0,
    pixelRatioInitial: 2.0,
    targetFps: 60,
    maxTriangles: 250_000,
    maxDrawCalls: 200,
    fogFar: 240,
    chunkRingRadius: 4,
    maxTransparentSprites: 40,
    maxJsHeapMB: 400
  }
};

export const DEFAULT_TIER: QualityTier = 'A15';
export const A15_BUDGET = BUDGET_TIERS.A15;

export const GATE_A_MEASURED = {
  p50Ms: 16.7,
  p95Ms: 17.0,
  p99Ms: 17.1,
  avgFps: 59.9,
  drawCalls: 18,
  triangles: 50674,
  jsHeapMB: 9.7
} as const;
