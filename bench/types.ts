export interface ScenarioConfig {
  pixelRatio: number;
  fogFar: number;
  trees: number;
  chunkRing: number;
}

export interface ScenarioResult {
  scenario: ScenarioConfig;
  p50: number;
  p95: number;
  p99: number;
  avgFps: number;
  drawCalls: number;
  triangles: number;
  jsHeapMB?: number;
}

export interface HeatSample {
  timeSec: number;
  fps: number;
  p95: number;
}

export interface HeatTestResult {
  samples: HeatSample[];
  fpsDropPercent: number;
}

export interface FullBenchReport {
  timestamp: string;
  userAgent: string;
  deviceTierEstimate: 'A15' | 'Mid' | 'High' | 'Fail';
  recommendedScenario: ScenarioConfig;
  tierStatus: {
    tier30fps: boolean;
    tier60fps: boolean;
  };
  scenarios: ScenarioResult[];
  heatTest?: HeatTestResult;
}
