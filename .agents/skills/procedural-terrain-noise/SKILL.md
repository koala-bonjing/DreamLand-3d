---
name: procedural-terrain-noise
description: Seeded deterministic terrain, noise, and biomes. Use when touching worldgen, heightmaps, biomes, seeds, prop placement, or anything that must look identical on two phones.
---
# Procedural Terrain & Noise

## Rules
1. Never use `Math.random()`; all randomness must derive from 32-bit integer hashing.
2. Convert string world seeds to 32-bit uint using Mulberry32 or Murmur3 hash.
3. Terrain uses 3-octave fBm (frequency * 2, amplitude * 0.5) over integer-grid value noise.
4. Biome thresholds: Deep Water (<0.15), Water (0.15–0.30), Sand (0.30–0.36), Pink Meadow (0.36–0.58), Mint Grass (0.58–0.74), Lilac Hills (0.74–0.88), Pearl Peaks (>0.88).
5. Secondary moisture noise layer modulates foliage density and floral biome variants.
6. Prop placement is computed deterministically per cell via `cellHash(cellX, cellZ, seed)`.
7. `heightAt(x, z)` must be a pure, side-effect-free function shared by worker and player.
8. Determinism test required: assert identical sample hashes for identical seeds and differences for distinct seeds.

## Snippets

### Seed String Hash
```ts
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}
```

### Deterministic 2D Value Noise
```ts
export function hash2D(x: number, z: number, seed: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263) + seed;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
```

## Pitfalls
- Calling `Math.random()` breaks multiplayer world sync immediately.
- Mismatched noise octaves between player physics `heightAt` and worker geometry causes sinking or floating.

## Sources
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays (2026-10-15)
