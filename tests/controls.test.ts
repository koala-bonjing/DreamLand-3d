import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FlightCamera } from '../src/player/camera';
import { FlightControls } from '../src/player/controls';

describe('Flight Camera & Controls', () => {
  it('instantiates FlightCamera and FlightControls', () => {
    const cam = new THREE.PerspectiveCamera();
    const flightCam = new FlightCamera(cam);

    expect(flightCam.camera.fov).toBe(72);
    expect(flightCam.position.y).toBe(16);
  });

  it('enforces pitch clamping and altitude clamping', () => {
    const cam = new THREE.PerspectiveCamera();
    const flightCam = new FlightCamera(cam, new THREE.Vector3(0, -5, 0));

    const controls = new FlightControls(undefined as unknown as HTMLElement);

    // Seed 42
    flightCam.update(0.016, controls, 42);

    // Minimum altitude is terrain + 2m and at least 1.5m above water
    expect(flightCam.position.y).toBeGreaterThanOrEqual(1.5);

    // Extreme pitch delta should clamp to [-0.95, 0.95]
    controls.state.pitchDelta = 100;
    flightCam.update(0.016, controls, 42);
    expect(flightCam.pitch).toBeLessThanOrEqual(0.95);

    controls.state.pitchDelta = -100;
    flightCam.update(0.016, controls, 42);
    expect(flightCam.pitch).toBeGreaterThanOrEqual(-0.95);
  });
});
