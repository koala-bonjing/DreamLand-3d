/**
 * Deterministic integer hash & noise utilities.
 * ZERO Math.random() usage — all calculations derive from 32-bit uint seed.
 */

export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/**
 * Fast 2D integer hash returning uniform [0, 1) using Murmur3 bit-mixing
 */
export function hash2D(x: number, z: number, seed: number): number {
  let n = (Math.imul(x, 0x1f1f1f1f) ^ Math.imul(z, 0x5b5b5b5b) ^ seed) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Bilinear interpolated 2D value noise
 */
export function valueNoise2D(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;

  // Smoothstep s-curve
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);

  const n00 = hash2D(xi, zi, seed);
  const n10 = hash2D(xi + 1, zi, seed);
  const n01 = hash2D(xi, zi + 1, seed);
  const n11 = hash2D(xi + 1, zi + 1, seed);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);

  return nx0 + v * (nx1 - nx0);
}

/**
 * 3-octave Fractional Brownian Motion (fBm)
 */
export function fbm2D(x: number, z: number, seed: number, octaves = 3): number {
  let total = 0;
  let freq = 1;
  let amp = 0.5;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * freq, z * freq, seed + i * 1013) * amp;
    maxAmp += amp;
    freq *= 2.0;
    amp *= 0.5;
  }

  return total / maxAmp;
}

/**
 * Deterministic height function shared identically by Worker and Player physics.
 * Scale: 64m chunks. Output height in world units (meters).
 */
export function heightAt(wx: number, wz: number, seed: number): number {
  // Base rolling landscape (frequency 0.006)
  const base = fbm2D(wx * 0.006, wz * 0.006, seed, 3);

  // Ridges and billows (frequency 0.015)
  const ridgeSeed = (seed + 7919) >>> 0;
  const ridge = fbm2D(wx * 0.015, wz * 0.015, ridgeSeed, 2);

  // Map into height range: water at <= 0m, pink meadows at 4-12m, hills at 12-20m, peaks at >20m
  const elevation = (base - 0.28) * 26 + (ridge - 0.5) * 8;

  return Number(elevation.toFixed(3));
}

/**
 * Secondary moisture layer for biome variation
 */
export function moistureAt(wx: number, wz: number, seed: number): number {
  const moistureSeed = (seed + 104729) >>> 0;
  return fbm2D(wx * 0.004, wz * 0.004, moistureSeed, 2);
}
