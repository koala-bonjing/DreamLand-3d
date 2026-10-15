export interface EngineLoopOptions {
  fixedTimestep?: number; // default: 1/60 (0.0166667)
  maxSubSteps?: number; // default: 5
  fpsCap?: number; // e.g. 30, or 0/undefined for uncapped
  onUpdate: (dt: number) => void;
  onRender: (alpha: number) => void;
}

export class EngineLoop {
  private fixedTimestep: number;
  private maxSubSteps: number;
  private minFrameDeltaMs: number;
  private onUpdate: (dt: number) => void;
  private onRender: (alpha: number) => void;

  private isRunning = false;
  private isPaused = false;
  private animId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private maxAccumulator: number;

  constructor(options: EngineLoopOptions) {
    this.fixedTimestep = options.fixedTimestep ?? 1 / 60;
    this.maxSubSteps = options.maxSubSteps ?? 5;
    this.maxAccumulator = this.fixedTimestep * this.maxSubSteps;
    this.minFrameDeltaMs = options.fpsCap && options.fpsCap > 0 ? 1000 / options.fpsCap : 0;
    this.onUpdate = options.onUpdate;
    this.onRender = options.onRender;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public setFpsCap(fps: number): void {
    this.minFrameDeltaMs = fps > 0 ? 1000 / fps : 0;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.accumulator = 0;
    }
  };

  private tick = (currentTime: number): void => {
    if (!this.isRunning) return;

    this.animId = requestAnimationFrame(this.tick);

    if (this.isPaused) return;

    let deltaMs = currentTime - this.lastTime;
    if (deltaMs < 0) deltaMs = 0;

    // Optional FPS Cap throttling
    if (this.minFrameDeltaMs > 0 && deltaMs < this.minFrameDeltaMs) {
      return;
    }

    this.lastTime = currentTime;

    // Convert ms to seconds
    const deltaSec = deltaMs * 0.001;
    this.accumulator += deltaSec;

    // Prevent spiral of death
    if (this.accumulator > this.maxAccumulator) {
      this.accumulator = this.maxAccumulator;
    }

    // Fixed timestep updates
    let steps = 0;
    while (this.accumulator >= this.fixedTimestep && steps < this.maxSubSteps) {
      this.onUpdate(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
      steps++;
    }

    // Render interpolation factor [0, 1]
    const alpha = this.accumulator / this.fixedTimestep;
    this.onRender(alpha);
  };

  public dispose(): void {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}
