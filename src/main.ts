import * as THREE from 'three';
import { EngineRenderer } from './core/renderer';
import { EngineLoop } from './core/loop';
import { QualityManager } from './core/quality';
import { ChunkManager } from './world/chunkManager';
import { DayCycle } from './world/dayCycle';
import { SkyDome, CloudManager } from './world/sky';
import { WaterPlane } from './world/water';
import { HeartManager } from './world/hearts';
import { FlightControls } from './player/controls';
import { FlightCamera } from './player/camera';
import { GameHud } from './ui/hud';
import { PhotoMode } from './ui/photoMode';
import { GameMenu } from './ui/menu';
import { RealtimeManager } from './net/realtime';
import { hashSeed } from './world/noise';
import { getBiomeAt } from './world/biomes';

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
  overlay.style.bottom = '12px';
  overlay.style.left = '12px';
  overlay.style.background = 'rgba(255, 255, 255, 0.75)';
  overlay.style.padding = '4px 10px';
  overlay.style.borderRadius = '8px';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '11px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '15';
  container.appendChild(overlay);

  const quality = new QualityManager('A15');
  const renderer = new EngineRenderer({
    canvas,
    config: quality.config
  });

  const scene = new THREE.Scene();
  const dayCycle = new DayCycle(20, 240);

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

  // Parse seed from URL hash if present
  const hashMatch = window.location.hash.match(/seed=([^&]+)/);
  let currentSeedName = hashMatch ? decodeURIComponent(hashMatch[1]) : 'dreamland-shared-seed';
  let seed = hashSeed(currentSeedName);

  let chunks = new ChunkManager({
    scene,
    seed,
    ringRadius: quality.config.chunkRingRadius
  });

  const hearts = new HeartManager(scene);

  // Controls & Camera
  const controls = new FlightControls(container);
  const flightCamera = new FlightCamera(renderer.camera);
  scene.add(flightCamera.bird.group);
  sky.cloudManagerRef = clouds;

  // Multiplayer Realtime (Phase 7)
  let selectedSkin = 'dove';
  const realtime = new RealtimeManager(scene, selectedSkin);
  realtime.joinRoom(currentSeedName, selectedSkin);

  // UI Systems: HUD, Photo Mode, Menu
  const photoMode = new PhotoMode(container, canvas);
  photoMode.onToggleBird = (visible) => {
    flightCamera.bird.setVisible(visible);
  };
  const hud = new GameHud(container, {
    onPhotoClick: () => photoMode.toggle(true),
    onMenuClick: () => menu.toggle(true)
  });

  hud.setHearts(hearts.getCollectedCount());
  hearts.onCollect = (count) => {
    hud.setHearts(count);
    if (count % 10 === 0) {
      hud.showToast(`✨ Milestone! ${count} Hearts Collected! ✨`);
    }
  };

  realtime.onPeerStatusChange = (present) => {
    hud.showToast(present ? '🕊️ Companion joined your world!' : 'Companion left the world.');
  };

  photoMode.onToggle = (active) => {
    hud.setVisible(!active);
    overlay.style.display = active ? 'none' : 'block';
  };

  const menu = new GameMenu(container, {
    currentSeedName,
    currentSkin: selectedSkin,
    onSkinChange: (skinId) => {
      selectedSkin = skinId;
      realtime.joinRoom(currentSeedName, selectedSkin);
    },
    onFpsCapChange: (fps) => {
      loop.setFpsCap(fps);
    },
    onSeedChange: (newSeedName) => {
      currentSeedName = newSeedName;
      seed = hashSeed(newSeedName);
      chunks.dispose();
      chunks = new ChunkManager({
        scene,
        seed,
        ringRadius: quality.config.chunkRingRadius
      });
      flightCamera.position.set(0, 18, 0);
      flightCamera.velocity.set(0, 0, 0);
      realtime.joinRoom(currentSeedName, selectedSkin);
    }
  });

  let lastFrameTime = performance.now();
  let lastOverlayTime = performance.now();
  let frameCount = 0;

  const loop = new EngineLoop({
    fixedTimestep: 1 / 60,
    maxSubSteps: 5,
    fpsCap: 30, // Default to A15 mode battery saver 30 FPS
    onUpdate: (dt) => {
      const now = performance.now();

      flightCamera.update(dt, controls, seed);

      dayCycle.update(dt);
      fog.color.copy(dayCycle.current.fogColor);
      scene.background = dayCycle.current.fogColor;
      sky.update(flightCamera.position.x, flightCamera.position.z, dayCycle.current.skyZenith, dayCycle.current.skyHorizon);
      clouds.update(dt, flightCamera.position.x, flightCamera.position.z, flightCamera.position.y);
      water.update(dt, flightCamera.position.x, flightCamera.position.z);

      hemi.color.copy(dayCycle.current.hemiSky);
      hemi.groundColor.copy(dayCycle.current.hemiGround);
      dirLight.color.copy(dayCycle.current.dirColor);
      dirLight.intensity = dayCycle.current.dirIntensity;

      chunks.update(flightCamera.position.x, flightCamera.position.z);
      hearts.updateChunks(chunks.getActiveChunks(), seed);
      hearts.update(dt, flightCamera.position.x, flightCamera.position.y, flightCamera.position.z);

      // Multiplayer synchronization
      realtime.updatePlayer(
        flightCamera.position.x,
        flightCamera.position.y,
        flightCamera.position.z,
        flightCamera.yaw,
        flightCamera.pitch,
        now
      );
      realtime.update(dt, now);

      hud.setCompass(flightCamera.yaw);

      // Automated testing and browser verification telemetry hook
      (window as unknown as { __DREAMLAND_DEBUG__: unknown }).__DREAMLAND_DEBUG__ = {
        birdPosition: {
          x: flightCamera.bird.group.position.x,
          y: flightCamera.bird.group.position.y,
          z: flightCamera.bird.group.position.z
        },
        cameraPosition: {
          x: renderer.camera.position.x,
          y: renderer.camera.position.y,
          z: renderer.camera.position.z
        },
        birdVisibleInScene: Boolean(flightCamera.bird.group.parent),
        isFlying: !controls.isGrounded,
        currentBiome: getBiomeAt(flightCamera.bird.group.position.x, flightCamera.bird.group.position.z, seed),
        loadedChunks: chunks.getLoadedChunkCount?.() ?? 0,
        landmarkCount: chunks.props.getLandmarkCount?.() ?? 0,
        cloudCount: sky.getCloudCount?.() ?? 0,
        petalCount: sky.getPetalCount?.() ?? 0,
        drawCalls: renderer.renderer.info.render.calls
      };
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
        overlay.textContent = `FPS: ${fps} (${ms}ms) | Alt: ${alt}m | Spd: ${speed}m/s | Draws: ${calls} | Tris: ${tris.toLocaleString()}`;
        frameCount = 0;
        lastOverlayTime = now;
      }
    }
  });

  loop.start();

  (window as unknown as { getBiomeAt: unknown }).getBiomeAt = (x: number, z: number) =>
    getBiomeAt(x, z, seed);

  (window as unknown as { __game: unknown }).__game = {
    scene,
    renderer,
    loop,
    quality,
    chunks,
    chunkManager: chunks,
    propsManager: chunks.props,
    flightCamera,
    bird: flightCamera.bird.group,
    sky,
    clouds,
    controls,
    dayCycle,
    hud,
    menu,
    realtime,
    hearts,
    getBiomeAt: (x: number, z: number) => getBiomeAt(x, z, seed)
  };
}
