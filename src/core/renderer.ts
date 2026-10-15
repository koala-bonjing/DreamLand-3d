import * as THREE from 'three';
import { QualityConfig } from '../config/budget';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  config: QualityConfig;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export class EngineRenderer {
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private config: QualityConfig;
  private currentPixelRatio: number;
  private onContextLost?: () => void;
  private onContextRestored?: () => void;

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    this.config = options.config;
    this.onContextLost = options.onContextLost;
    this.onContextRestored = options.onContextRestored;

    this.currentPixelRatio = Math.min(
      Math.max(window.devicePixelRatio || 1, this.config.pixelRatioMin),
      this.config.pixelRatioMax
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false
    });

    this.renderer.setPixelRatio(this.currentPixelRatio);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.5, 300);

    this.bindEvents();
    this.resize();
  }

  public setPixelRatio(ratio: number): void {
    const clamped = Math.min(Math.max(ratio, this.config.pixelRatioMin), this.config.pixelRatioMax);
    if (Math.abs(clamped - this.currentPixelRatio) >= 0.01) {
      this.currentPixelRatio = clamped;
      this.renderer.setPixelRatio(clamped);
    }
  }

  public getPixelRatio(): number {
    return this.currentPixelRatio;
  }

  public updateConfig(newConfig: QualityConfig): void {
    this.config = newConfig;
    this.setPixelRatio(this.currentPixelRatio);
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height, false);
  }

  public render(scene: THREE.Scene): void {
    this.renderer.render(scene, this.camera);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    console.warn('[EngineRenderer] WebGL context lost.');
    this.onContextLost?.();
  };

  private handleContextRestored = (): void => {
    console.info('[EngineRenderer] WebGL context restored.');
    this.resize();
    this.onContextRestored?.();
  };

  private handleOrientationOrResize = (): void => {
    // Delay slightly for mobile browser chrome reflow / safe areas
    requestAnimationFrame(() => this.resize());
  };

  private bindEvents(): void {
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    window.addEventListener('resize', this.handleOrientationOrResize);
    window.addEventListener('orientationchange', this.handleOrientationOrResize);
  }

  public dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    window.removeEventListener('resize', this.handleOrientationOrResize);
    window.removeEventListener('orientationchange', this.handleOrientationOrResize);

    this.renderer.dispose();
  }
}
