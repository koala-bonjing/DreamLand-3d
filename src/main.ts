import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { EngineLoop } from './core/loop';
import { QualityManager } from './core/quality';
import { ChunkManager } from './world/chunkManager';
import { DayCycle } from './world/dayCycle';
import { SkyDome, CloudManager } from './world/sky';
import { WaterPlane } from './world/water';
import { FlightControls } from './player/controls';
import { FlightCamera } from './player/camera';
import { hashSeed } from './world/noise';

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
  const dayCycle = new DayCycle(20);

  scene.background = dayCycle.current.fogColor;
  const fog = new THREE.Fog(dayCycle.current.fogColor.getHex(), 45, quality.config.fogFar);
  scene.fog = fog;

  const sky = new SkyDome(scene, dayCycle.current.skyZenith, dayCycle.current.skyHorizon);
  const clouds = new CloudManager(scene, 8);
  const water = new WaterPlane(scene, 320);

  const hemi = new THREE.HemisphereLight(
    dayCycle.current.hemiSky,
    dayCycle.current.hemiGround,
    0.95
  );
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(dayCycle.current.dirColor, dayCycle.current.dirIntensity);
  dirLight.position.set(40, 60, 20);
  scene.add(dirLight);

  const seed = hashSeed('dreamland-shared-seed');
  const chunks = new ChunkManager({
    scene,
    seed,
    ringRadius: quality.config.chunkRingRadius
  });

  // Flight Controls & Camera
  const controls = new FlightControls(container);
  const flightCamera = new FlightCamera(renderer.camera);

  let lastFrameTime = performance.now();
  let lastOverlayTime = performance.now();
  let frameCount = 0;

  const loop = new EngineLoop({
    fixedTimestep: 1 / 60,
    maxSubSteps: 5,
    onUpdate: (dt) => {
      // Update flight physics
      flightCamera.update(dt, controls, seed);

      // Update atmosphere & day/night cycle
      dayCycle.update(dt);
      fog.color.copy(dayCycle.current.fogColor);
      scene.background = dayCycle.current.fogColor;
      sky.update(flightCamera.position.x, flightCamera.position.z, dayCycle.current.skyZenith, dayCycle.current.skyHorizon);
      clouds.update(dt, flightCamera.position.x, flightCamera.position.z);
      water.update(dt, flightCamera.position.x, flightCamera.position.z);

      hemi.color.copy(dayCycle.current.hemiSky);
      hemi.groundColor.copy(dayCycle.current.hemiGround);
      dirLight.color.copy(dayCycle.current.dirColor);
      dirLight.intensity = dayCycle.current.dirIntensity;

      // Stream world chunks
      chunks.update(flightCamera.position.x, flightCamera.position.z);
    },
    onRender: (_alpha) => {
      const now = performance.now();
      const frameMs = now - lastFrameTime;
      lastFrameTime = now;

      if (quality.recordFrame(frameMs, now)) {
        renderer.setPixelRatio(quality.currentScale);
      }

      renderer.render(scene);

      frameCount++;
      if (now - lastOverlayTime >= 500) {
        const elapsed = now - lastOverlayTime;
        const fps = Math.round((frameCount * 1000) / elapsed);
        const ms = (elapsed / frameCount).toFixed(1);
        const calls = renderer.renderer.info.render.calls;
        const tris = renderer.renderer.info.render.triangles;
        const speed = flightCamera.velocity.length().toFixed(1);
        const alt = flightCamera.position.y.toFixed(1);
        overlay.textContent = `FPS: ${fps} (${ms}ms) | Alt: ${alt}m | Spd: ${speed}m/s | Chunks: ${chunks.getLoadedCount()} | Draws: ${calls} | Tris: ${tris.toLocaleString()}`;
        frameCount = 0;
        lastOverlayTime = now;
      }
    }
  });

  loop.start();
}
