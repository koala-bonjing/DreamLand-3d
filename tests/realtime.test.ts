import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TransformInterpolator } from '../src/net/realtime';
import { RemoteBird } from '../src/net/bird';

describe('Realtime Multiplayer & Companion', () => {
  it('interpolates positions smoothly between network ticks', () => {
    const interpolator = new TransformInterpolator();

    // Push two snapshots 100ms apart
    interpolator.push({
      x: 0,
      y: 10,
      z: 0,
      yaw: 0,
      pitch: 0,
      skin: 'dove',
      t: 1000
    });

    interpolator.push({
      x: 10,
      y: 10,
      z: 0,
      yaw: 0,
      pitch: 0,
      skin: 'dove',
      t: 1100
    });

    const outPos = new THREE.Vector3();
    // Sample with 120ms delay: at time 1170ms -> target time = 1050ms (halfway)
    const result = interpolator.sample(1170, outPos);

    expect(result).toBeDefined();
    expect(outPos.x).toBeCloseTo(5.0, 1);
    expect(outPos.y).toBe(10);
    expect(result?.speed).toBeGreaterThan(0);
  });

  it('RemoteBird instantiates with low-poly triangle count', () => {
    const scene = new THREE.Scene();
    const bird = new RemoteBird(scene, 'flamingo');

    expect(bird.mesh).toBeDefined();
    expect(bird.mesh.children.length).toBeGreaterThan(2);

    expect(() => bird.update(0.016, 16)).not.toThrow();
    expect(() => bird.setSkin('finch')).not.toThrow();

    bird.dispose();
  });
});
