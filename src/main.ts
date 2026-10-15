import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { EngineLoop } from './core/loop';
import { QualityManager } from './core/quality';
import { PALETTE } from './config/palette';

const container = document.getElementById('app');
if (container) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const quality = new QualityManager();
  const renderer = new EngineRenderer({
    canvas,
    config: quality.config
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.fog);

  let lastFrameTime = performance.now();

  const loop = new EngineLoop({
    fixedTimestep: 1 / 60,
    maxSubSteps: 5,
    onUpdate: (_dt) => {
      // Fixed timestep world update hook (zero allocations)
    },
    onRender: (_alpha) => {
      const now = performance.now();
      const frameMs = now - lastFrameTime;
      lastFrameTime = now;

      if (quality.recordFrame(frameMs, now)) {
        renderer.setPixelRatio(quality.currentScale);
      }

      renderer.render(scene);
    }
  });

  loop.start();
}
