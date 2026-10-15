import { describe, expect, it } from 'vitest';
import { resolutionScaler, QualityManager, UPGRADE_COOLDOWN_MS } from '../src/core/quality';
import { BUDGET_TIERS } from '../src/config/budget';

describe('Quality & Resolution Scaler', () => {
  const cfg = BUDGET_TIERS.A15; // min: 1.0, max: 1.5, targetFps: 30 (33.3ms)

  it('downgrades resolution when EMA exceeds budget + 15%', () => {
    // 33.3ms * 1.15 = 38.3ms threshold
    const highMs = 40;
    const res = resolutionScaler(highMs, 1.25, cfg, 0, 1000);
    expect(res.changed).toBe(true);
    expect(res.scale).toBe(1.20);
  });

  it('clamps downgrade at pixelRatioMin', () => {
    const res = resolutionScaler(45, 1.0, cfg, 0, 1000);
    expect(res.changed).toBe(false);
    expect(res.scale).toBe(1.0);
  });

  it('refuses auto-upgrade within 30 seconds cooldown', () => {
    // 33.3ms * 0.80 = 26.6ms threshold
    const fastMs = 16.6;
    const res = resolutionScaler(fastMs, 1.10, cfg, 10_000, 25_000); // only 15s elapsed
    expect(res.changed).toBe(false);
    expect(res.scale).toBe(1.10);
  });

  it('permits auto-upgrade after 30 seconds when frame time is low', () => {
    const fastMs = 16.6;
    const res = resolutionScaler(fastMs, 1.10, cfg, 0, UPGRADE_COOLDOWN_MS + 100);
    expect(res.changed).toBe(true);
    expect(res.scale).toBe(1.15);
  });

  it('clamps upgrade at pixelRatioMax', () => {
    const fastMs = 16.6;
    const res = resolutionScaler(fastMs, 1.5, cfg, 0, UPGRADE_COOLDOWN_MS + 100);
    expect(res.changed).toBe(false);
    expect(res.scale).toBe(1.5);
  });

  it('QualityManager records frames and updates scale dynamically', () => {
    const qm = new QualityManager('A15');
    expect(qm.currentScale).toBe(1.25);

    // Simulate heavy lag frame spikes
    let changed = false;
    for (let i = 0; i < 50; i++) {
      if (qm.recordFrame(50, i * 33)) {
        changed = true;
      }
    }
    expect(changed).toBe(true);
    expect(qm.currentScale).toBeLessThan(1.25);
  });
});
