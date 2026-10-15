import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { EngineLoop } from './core/loop';
import { QualityManager } from './core/quality';
import { ChunkManager } from './world/chunkManager';
import { hashSeed, heightAt } from './world/noise';
import { PALETTE } from './config/palette';

const container = document.getElementById('app');
if (container) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  // Overlay for fly-through metrics (A15 monitoring)
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '12px';
  overlay.style.left = '12px';
  overlay.style.background = 'rgba(255, 255, 255, 0.88)';
  overlay.style.padding = '8px 12px';
  overlay.style.borderRadius = '10px';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '12px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '10';
  container.appendChild(overlay);

  const quality = new QualityManager('A15');
  const renderer = new EngineRenderer({
    canvas,
    config: quality.config
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.fog);
  scene.fog = new THREE.Fog(PALETTE.fog, 45, 100);

  // Lighting: Hemisphere for soft ambient + Directional for low-poly facet shading
  const hemi = new THREE.HemisphereLight(PALETTE.skyZenithDay, PALETTE.grass, 0.9);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xfff5ea, 0.7);
  dirLight.position.set(40, 60, 20);
  scene.add(dirLight);

  const seed = hashSeed('dreamland-shared-seed');
  const chunks = new ChunkManager({
    scene,
    seed,
    ringRadius: quality.config.chunkRingRadius
  });

  // Gliding camera flight state
  const flyState = {
    x: 0,
    y: 18,
    z: 0,
    speed: 16 // m/s forward cruise
  };

  renderer.camera.position.set(flyState.x, flyState.y, flyState.z);

  let lastFrameTime = performance.now();
  let lastOverlayTime = performance.now();
  let frameCount = 0;
  let flightTime = 0;

  const loop = new EngineLoop({
    fixedTimestep: 1 / 60,
    maxSubSteps: 5,
    onUpdate: (dt) => {
      flightTime += dt;
      flyState.z += flyState.speed * dt;
      flyState.x = Math.sin(flightTime * 0.12) * 35;

      const groundY = heightAt(flyState.x, flyState.z, seed);
      flyState.y = Math.max(groundY + 12.0, 16.0);

      chunks.update(flyState.x, flyState.z);
    },
    onRender: (_alpha) => {
      const now = performance.now();
      const frameMs = now - lastFrameTime;
      lastFrameTime = now;

      if (quality.recordFrame(frameMs, now)) {
        renderer.setPixelRatio(quality.currentScale);
      }

      renderer.camera.position.set(flyState.x, flyState.y, flyState.z);
      renderer.camera.lookAt(
        flyState.x + Math.sin(flightTime * 0.12) * 8,
        flyState.y - 4.5,
        flyState.z + 32
      );

      renderer.render(scene);

      frameCount++;
      if (now - lastOverlayTime >= 500) {
        const elapsed = now - lastOverlayTime;
        const fps = Math.round((frameCount * 1000) / elapsed);
        const ms = (elapsed / frameCount).toFixed(1);
        const calls = renderer.renderer.info.render.calls;
        const tris = renderer.renderer.info.render.triangles;
        overlay.textContent = `FPS: ${fps} (${ms}ms) | Chunks: ${chunks.getLoadedCount()} | Draws: ${calls} | Tris: ${tris.toLocaleString()} | Pos: (${flyState.x.toFixed(0)}, ${flyState.y.toFixed(0)}, ${flyState.z.toFixed(0)})`;
        frameCount = 0;
        lastOverlayTime = now;
      }
    }
  });

  loop.start();
}
