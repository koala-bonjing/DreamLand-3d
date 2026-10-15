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
 * Continentalness macro noise (-0.5 to 0.5+) defining geographic elevation bands.
 */
export function continentalnessAt(wx: number, wz: number, seed: number): number {
  return (fbm2D(wx * 0.004, wz * 0.004, seed, 3) - 0.5) * 1.35;
}

/**
 * Secondary moisture layer (freq = 0.009) for biome variation [0, 1].
 */
export function moistureAt(wx: number, wz: number, seed: number): number {
  const moistureSeed = (seed + 104729) >>> 0;
  return fbm2D(wx * 0.009, wz * 0.009, moistureSeed, 2);
}

/**
 * Deterministic height function shared identically by Worker and Player physics.
 * Spatially coherent elevation model quantized to integer voxel steps.
 */
export function heightAt(wx: number, wz: number, seed: number): number {
  const c = continentalnessAt(wx, wz, seed);
  const rawM = moistureAt(wx, wz, seed);
  const m = (rawM - 0.5) * 1.2;

  let y = 0;
  if (c < -0.25) {
    // Crystal Lagoon: underwater depths -8 to -2
    const t = Math.max(0, Math.min(1, (c - (-0.45)) / 0.20));
    y = -8 + t * 6;
  } else if (c < -0.05) {
    // Malibu Pearl Beach: shoreline -1 to 1 around SEA_LEVEL
    const t = (c - (-0.25)) / 0.20;
    y = -1 + t * 2;
  } else if (c < 0.35) {
    // Coastal & Mid-Elevation Landmasses: Dream Meadow or Sakura Grove
    const t = (c - (-0.05)) / 0.40;
    if (m <= 0.15) {
      y = 2 + t * 6;
    } else {
      y = 3 + t * 7;
    }
  } else {
    // Sugar Crystal Highlands: terraced plateaus and steep cliffs 11 to 24
    const t = Math.min(1, (c - 0.35) / 0.20);
    y = 11 + t * 13;
  }

  const detail = (fbm2D(wx * 0.02, wz * 0.02, seed + 7919, 2) - 0.5) * 1.0;
  return Math.floor(y + detail);
}
