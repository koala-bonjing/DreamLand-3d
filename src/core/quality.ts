import { QualityConfig, BUDGET_TIERS, DEFAULT_TIER, QualityTier } from '../config/budget';

export interface ScalerResult {
  scale: number;
  changed: boolean;
}

export const UPGRADE_COOLDOWN_MS = 30_000;
export const SCALE_STEP = 0.05;

/**
 * Pure resolution scaler with hysteresis.
 * - Downgrades quickly when EMA exceeds budget threshold (+15%).
 * - Never upgrades within 30s of previous change.
 * - Upgrades only when EMA stays well below budget threshold (-20%).
 */
export function resolutionScaler(
  emaMs: number,
  currentScale: number,
  cfg: QualityConfig,
  lastChangeTime: number,
  now: number
): ScalerResult {
  const targetMs = 1000 / cfg.targetFps;
  const downgradeThreshold = targetMs * 1.15;
  const upgradeThreshold = targetMs * 0.80;

  // Check downgrade
  if (emaMs > downgradeThreshold && currentScale > cfg.pixelRatioMin) {
    const next = Math.max(cfg.pixelRatioMin, Number((currentScale - SCALE_STEP).toFixed(2)));
    if (next !== currentScale) {
      return { scale: next, changed: true };
    }
  }

  // Check upgrade with 30s cooldown
  if (now - lastChangeTime >= UPGRADE_COOLDOWN_MS) {
    if (emaMs < upgradeThreshold && currentScale < cfg.pixelRatioMax) {
      const next = Math.min(cfg.pixelRatioMax, Number((currentScale + SCALE_STEP).toFixed(2)));
      if (next !== currentScale) {
        return { scale: next, changed: true };
      }
    }
  }

  return { scale: currentScale, changed: false };
}

export class QualityManager {
  public currentTier: QualityTier;
  public config: QualityConfig;
  public currentScale: number;
  public emaFrameMs: number;
  public lastScaleChangeTime = 0;
  private readonly emaAlpha = 0.05;

  constructor(tier: QualityTier = DEFAULT_TIER) {
    this.currentTier = tier;
    this.config = BUDGET_TIERS[tier];
    this.currentScale = this.config.pixelRatioInitial;
    this.emaFrameMs = 1000 / this.config.targetFps;
  }

  public setTier(tier: QualityTier): void {
    this.currentTier = tier;
    this.config = BUDGET_TIERS[tier];
    this.currentScale = this.config.pixelRatioInitial;
    this.lastScaleChangeTime = performance.now();
  }

  public recordFrame(frameMs: number, now: number): boolean {
    this.emaFrameMs = this.emaAlpha * frameMs + (1 - this.emaAlpha) * this.emaFrameMs;

    const res = resolutionScaler(
      this.emaFrameMs,
      this.currentScale,
      this.config,
      this.lastScaleChangeTime,
      now
    );

    if (res.changed) {
      this.currentScale = res.scale;
      this.lastScaleChangeTime = now;
      return true;
    }
    return false;
  }
}
