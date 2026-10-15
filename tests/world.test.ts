import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { hashSeed, heightAt, moistureAt } from '../src/world/noise';
import { getBiomeAt, getBiomeColor } from '../src/world/biomes';
import { CHUNK_FLOAT_COUNT, CHUNK_INDEX_COUNT } from '../src/world/types';

describe('Procedural World & Noise Determinism', () => {
  it('hashSeed creates deterministic 32-bit uints', () => {
    const s1 = hashSeed('dreamland-world');
    const s2 = hashSeed('dreamland-world');
    const s3 = hashSeed('other-world');

    expect(s1).toBe(s2);
    expect(s1).not.toBe(s3);
    expect(s1).toBeGreaterThanOrEqual(0);
  });

  it('determinism: same seed yields identical height samples across 100 coordinates', () => {
    const seed = hashSeed('pink-seed-42');
    const samples1: number[] = [];
    const samples2: number[] = [];

    for (let x = -50; x < 50; x += 10) {
      for (let z = -50; z < 50; z += 10) {
        samples1.push(heightAt(x * 12.3, z * 14.7, seed));
        samples2.push(heightAt(x * 12.3, z * 14.7, seed));
      }
    }

    expect(samples1).toEqual(samples2);

    // Different seed must yield distinct samples
    const otherSeed = hashSeed('different-seed-99');
    const otherSamples: number[] = [];
    for (let x = -50; x < 50; x += 10) {
      for (let z = -50; z < 50; z += 10) {
        otherSamples.push(heightAt(x * 12.3, z * 14.7, otherSeed));
      }
    }
    expect(samples1).not.toEqual(otherSamples);
  });

  it('biome thresholds and colors map properly', () => {
    expect(getBiomeAt(0.1)).toBe('CRYSTAL_LAGOON');
    expect(getBiomeAt(0.25)).toBe('PEARL_BEACH');
    expect(getBiomeAt(0.5)).toBe('DREAM_MEADOW');
    expect(getBiomeAt(0.65)).toBe('SAKURA_GROVE');
    expect(getBiomeAt(0.95)).toBe('CANDY_HIGHLANDS');

    // Spatial coordinate sampling
    expect(getBiomeAt(0, 0, 12345)).toBeDefined();

    const col = getBiomeColor(0.5, 0.2);
    expect(col).toHaveLength(3);
    expect(col[0]).toBeGreaterThan(0);

    const moist = moistureAt(25, -40, 12345);
    expect(Number.isFinite(moist)).toBe(true);
    expect(moist).toBeGreaterThanOrEqual(0);
    expect(moist).toBeLessThanOrEqual(1);
  });

  it('altitude clamp: height values are finite and within reasonable flight bounds', () => {
    const seed = hashSeed('flight-check');
    for (let i = 0; i < 50; i++) {
      const h = heightAt(i * 37.1, i * -23.4, seed);
      expect(Number.isFinite(h)).toBe(true);
      expect(h).toBeGreaterThan(-10);
      expect(h).toBeLessThan(40);
    }
  });

  it('main-thread chunk BufferGeometry build time is well below 4 ms', () => {
    const pos = new Float32Array(CHUNK_FLOAT_COUNT);
    const col = new Float32Array(CHUNK_FLOAT_COUNT);
    const norm = new Float32Array(CHUNK_FLOAT_COUNT);
    const indices = new Uint16Array(CHUNK_INDEX_COUNT);

    const start = performance.now();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(4.0);
    geom.dispose();
  });
});
