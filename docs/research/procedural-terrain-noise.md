# Procedural Terrain & Noise Research
Date: 2026-10-15
Sources:
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

Key Findings:
1. `Math.random()` is non-deterministic across browser engines and JS runtimes.
2. MurmurHash3 or Mulberry32 / SplitMix32 generates deterministic 32-bit integers from string seeds.
3. Integer-coordinate hash functions (e.g. xxHash or bit-mixing primes) provide fast 2D value noise without table lookups.
4. Fractional Brownian Motion (fBm) with 3 octaves yields good natural terrain variation while maintaining low CPU cost.
5. Biome categorization maps scalar height and moisture values to discrete terrain types:
   - Deep water: < 0.15
   - Water: 0.15–0.30
   - Sand: 0.30–0.36
   - Pink meadow: 0.36–0.58
   - Mint grass: 0.58–0.74
   - Lilac hills: 0.74–0.88
   - Pearl peaks: > 0.88
6. Prop placement uses per-cell integer hashes to avoid storing persistent world state.
7. Pure `heightAt(x, z, seed)` function must be shareable identically between Web Worker and main thread.
