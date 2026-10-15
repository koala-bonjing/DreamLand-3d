import { PALETTE } from '../config/palette';
import { continentalnessAt, moistureAt } from './noise';

export type BiomeType =
  | 'CRYSTAL_LAGOON'
  | 'PEARL_BEACH'
  | 'DREAM_MEADOW'
  | 'SAKURA_GROVE'
  | 'CANDY_HIGHLANDS'
  | 'DeepWater'
  | 'Water'
  | 'Sand'
  | 'PinkMeadow'
  | 'MintGrass'
  | 'LilacHills'
  | 'PearlPeaks';

function hexToRgb(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return [r, g, b];
}

const COLOR_DEEP_WATER = hexToRgb(0x7ec6f0);
const COLOR_WATER = hexToRgb(PALETTE.water);
const COLOR_SAND = hexToRgb(PALETTE.sand);
const COLOR_PINK_MEADOW = hexToRgb(PALETTE.pinkMeadow);
const COLOR_MINT_GRASS = hexToRgb(PALETTE.grass);
const COLOR_LILAC_HILLS = hexToRgb(PALETTE.hills);
const COLOR_PEARL_PEAKS = hexToRgb(PALETTE.peaks);

// Relative Voxel Biome colors
const COLOR_CORAL_SAND = hexToRgb(PALETTE.coralSand);
const COLOR_CORAL_REEF_PINK = hexToRgb(PALETTE.coralReefPink);
const COLOR_CORAL_REEF_TEAL = hexToRgb(PALETTE.coralReefTeal);
const COLOR_PEARL_BEACH_TOP = hexToRgb(PALETTE.pearlBeachTop);
const COLOR_PEARL_BEACH_SIDE = hexToRgb(PALETTE.pearlBeachSide);
const COLOR_DREAM_MEADOW_TOP = hexToRgb(PALETTE.dreamMeadowTop);
const COLOR_DREAM_MEADOW_SIDE = hexToRgb(PALETTE.dreamMeadowSide);
const COLOR_SAKURA_LAVENDER = hexToRgb(PALETTE.sakuraLavender);
const COLOR_SAKURA_MINT = hexToRgb(PALETTE.sakuraMint);
const COLOR_HIGHLANDS_ROSE = hexToRgb(PALETTE.highlandsRoseQuartz);
const COLOR_HIGHLANDS_SIDE = hexToRgb(PALETTE.highlandsSide);
const COLOR_SNOW_PEAK_TOP = hexToRgb(PALETTE.snowPeakTop);
const COLOR_SNOW_PEAK_SIDE = hexToRgb(PALETTE.snowPeakSide);

/**
 * Maps world coordinates (or legacy normalized height [0, 1]) to Biome classification
 */
export function getBiomeAt(
  xOrNormHeight: number,
  z?: number,
  seed = 12345
): BiomeType {
  if (z === undefined) {
    if (xOrNormHeight < 0.15) return 'CRYSTAL_LAGOON';
    if (xOrNormHeight < 0.36) return 'PEARL_BEACH';
    if (xOrNormHeight < 0.58) return 'DREAM_MEADOW';
    if (xOrNormHeight < 0.74) return 'SAKURA_GROVE';
    return 'CANDY_HIGHLANDS';
  }

  const c = continentalnessAt(xOrNormHeight, z, seed);
  if (c < -0.25) return 'CRYSTAL_LAGOON';
  if (c < -0.05) return 'PEARL_BEACH';
  if (c < 0.35) {
    const rawM = moistureAt(xOrNormHeight, z, seed);
    const m = (rawM - 0.5) * 1.2;
    return m <= 0.15 ? 'DREAM_MEADOW' : 'SAKURA_GROVE';
  }
  return 'CANDY_HIGHLANDS';
}

/**
 * Returns RGB color for a 1x1 voxel block face based on relative biome and top vs side cliff.
 */
export function getVoxelBlockColor(
  wx: number,
  wy: number,
  wz: number,
  isSide: boolean,
  seed: number
): [number, number, number] {
  const c = continentalnessAt(wx, wz, seed);

  // 1. Crystal Lagoon (Seascape): underwater depths -8 to -2
  if (c < -0.25) {
    const reefPattern = ((Math.floor(wx) ^ Math.floor(wz)) & 3);
    if (reefPattern === 1) return COLOR_CORAL_REEF_PINK;
    if (reefPattern === 2) return COLOR_CORAL_REEF_TEAL;
    return COLOR_CORAL_SAND;
  }

  // 2. Malibu Pearl Beach: shoreline -1 to 1 around SEA_LEVEL
  if (c < -0.05) {
    return isSide ? COLOR_PEARL_BEACH_SIDE : COLOR_PEARL_BEACH_TOP;
  }

  // 3. Coastal & Mid-Elevation Landmasses
  if (c < 0.35) {
    const rawM = moistureAt(wx, wz, seed);
    const m = (rawM - 0.5) * 1.2;

    if (m <= 0.15) {
      // Dream Meadow: Rosy Pink grass top, warm terracotta side
      return isSide ? COLOR_DREAM_MEADOW_SIDE : COLOR_DREAM_MEADOW_TOP;
    }
    // Sakura & Mint Grove: Pastel Lavender and Mint turf
    if (isSide) {
      return COLOR_DREAM_MEADOW_SIDE;
    }
    return m > 0.25 ? COLOR_SAKURA_MINT : COLOR_SAKURA_LAVENDER;
  }

  // 4. Sugar Crystal Highlands: terraced plateaus and steep cliffs
  if (wy >= 17) {
    // Sparkly Frosting Snow peaks above y = 17
    return isSide ? COLOR_SNOW_PEAK_SIDE : COLOR_SNOW_PEAK_TOP;
  }
  return isSide ? COLOR_HIGHLANDS_SIDE : COLOR_HIGHLANDS_ROSE;
}

/**
 * Returns RGB vertex color components for normalized height & moisture (legacy helper)
 */
export function getBiomeColor(normHeight: number, moisture: number): [number, number, number] {
  if (normHeight < 0.15) return COLOR_DEEP_WATER;
  if (normHeight < 0.30) return COLOR_WATER;
  if (normHeight < 0.36) return COLOR_SAND;

  if (normHeight < 0.58) {
    return moisture > 0.6 ? COLOR_MINT_GRASS : COLOR_PINK_MEADOW;
  }
  if (normHeight < 0.74) {
    return moisture < 0.4 ? COLOR_PINK_MEADOW : COLOR_MINT_GRASS;
  }
  if (normHeight < 0.88) {
    return COLOR_LILAC_HILLS;
  }
  return COLOR_PEARL_PEAKS;
}

export function normalizeHeightForBiome(wy: number): number {
  if (wy <= 0) {
    return Math.max(0, 0.30 + (wy / 4.0) * 0.30);
  }
  if (wy <= 1.2) {
    return 0.30 + (wy / 1.2) * 0.06;
  }
  if (wy <= 9.0) {
    return 0.36 + ((wy - 1.2) / 7.8) * 0.22;
  }
  if (wy <= 15.0) {
    return 0.58 + ((wy - 9.0) / 6.0) * 0.16;
  }
  if (wy <= 21.0) {
    return 0.74 + ((wy - 15.0) / 6.0) * 0.14;
  }
  return Math.min(1.0, 0.88 + ((wy - 21.0) / 6.0) * 0.12);
}
