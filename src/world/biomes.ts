import { PALETTE } from '../config/palette';

export type BiomeType =
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

/**
 * Maps normalized height [0, 1] to Biome classification
 */
export function getBiomeAt(normHeight: number): BiomeType {
  if (normHeight < 0.15) return 'DeepWater';
  if (normHeight < 0.30) return 'Water';
  if (normHeight < 0.36) return 'Sand';
  if (normHeight < 0.58) return 'PinkMeadow';
  if (normHeight < 0.74) return 'MintGrass';
  if (normHeight < 0.88) return 'LilacHills';
  return 'PearlPeaks';
}

/**
 * Returns RGB vertex color components for normalized height & moisture
 */
export function getBiomeColor(normHeight: number, moisture: number): [number, number, number] {
  if (normHeight < 0.15) return COLOR_DEEP_WATER;
  if (normHeight < 0.30) return COLOR_WATER;
  if (normHeight < 0.36) return COLOR_SAND;

  if (normHeight < 0.58) {
    // Pink meadow with moisture-based tint toward grass
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
