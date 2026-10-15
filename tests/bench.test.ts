import { describe, expect, it } from 'vitest';
import { calcPercentile, evaluateTier, SCENARIO_LADDER } from '../bench/harness';

describe('Benchmark Statistics & Tier Evaluation', () => {
  it('correctly calculates percentiles', () => {
    // 100 samples from 1 to 100
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(calcPercentile(samples, 50)).toBe(51);
    expect(calcPercentile(samples, 95)).toBe(96);
    expect(calcPercentile(samples, 99)).toBe(100);
  });

  it('handles empty or single sample gracefully', () => {
    expect(calcPercentile([], 50)).toBe(0);
    expect(calcPercentile([16.6], 95)).toBe(16.6);
  });

  it('correctly evaluates 30fps and 60fps tiers', () => {
    const tier60 = evaluateTier(16.5);
    expect(tier60.pass60).toBe(true);
    expect(tier60.pass30).toBe(true);

    const tier30 = evaluateTier(32.0);
    expect(tier30.pass60).toBe(false);
    expect(tier30.pass30).toBe(true);

    const tierFail = evaluateTier(35.0);
    expect(tierFail.pass60).toBe(false);
    expect(tierFail.pass30).toBe(false);
  });

  it('SCENARIO_LADDER contains baseline A15 scenario', () => {
    const a15 = SCENARIO_LADDER.find((s) => s.pixelRatio === 1.25 && s.chunkRing === 2);
    expect(a15).toBeDefined();
    expect(a15?.fogFar).toBe(90);
    expect(a15?.trees).toBe(1500);
  });
});
