import { describe, expect, it } from 'vitest';
import { BUDGET_TIERS, DEFAULT_TIER } from '../src/config/budget';
import { PALETTE } from '../src/config/palette';

describe('Budget Configuration', () => {
  it('default tier should be A15', () => {
    expect(DEFAULT_TIER).toBe('A15');
    expect(BUDGET_TIERS.A15).toBeDefined();
  });

  it('A15 tier should obey floor specs', () => {
    const a15 = BUDGET_TIERS.A15;
    expect(a15.maxTriangles).toBeLessThanOrEqual(60_000);
    expect(a15.maxDrawCalls).toBeLessThanOrEqual(60);
    expect(a15.fogFar).toBeLessThanOrEqual(100);
    expect(a15.chunkRingRadius).toBe(2);
    expect(a15.maxTransparentSprites).toBeLessThanOrEqual(10);
    expect(a15.maxJsHeapMB).toBeLessThanOrEqual(150);
    expect(a15.targetFps).toBe(30);
  });

  it('palette tokens should contain required colors', () => {
    expect(PALETTE.grass).toBe(0xb8f0c8);
    expect(PALETTE.pinkMeadow).toBe(0xffd1e6);
    expect(PALETTE.hills).toBe(0xd9c2f5);
    expect(PALETTE.peaks).toBe(0xfff0fa);
    expect(PALETTE.water).toBe(0x9fdcf7);
    expect(PALETTE.sand).toBe(0xfde8c9);
    expect(PALETTE.fog).toBe(0xffd9ec);
    expect(PALETTE.heart).toBe(0xff3d97);
  });
});
