export const PALETTE = {
  // Biome & terrain tokens
  grass: 0xb8f0c8,
  pinkMeadow: 0xffd1e6,
  hills: 0xd9c2f5,
  peaks: 0xfff0fa,
  water: 0x9fdcf7,
  sand: 0xfde8c9,

  // Atmospheric tokens
  fog: 0xffd9ec,
  skyZenithDay: 0xffe6f2,
  skyHorizonDay: 0xffd9ec,
  skyZenithDusk: 0xb28dbe,
  skyHorizonDusk: 0xfcb08d,
  skyZenithNight: 0x1f1a3a,
  skyHorizonNight: 0x3d305d,

  // Props & collectibles
  heart: 0xff3d97,
  treeTrunk: 0xd4b8a5,
  treeCanopyPink: 0xffb8d9,
  treeCanopyMint: 0xb8f0c8,
  treeCanopyLilac: 0xd9c2f5,
  flowerStem: 0x98dfa8,
  flowerPetal: 0xffa4d4,
  dreamhouseWall: 0xfff0f7,
  dreamhouseRoof: 0xff70aa,

  // Relative Voxel Biomes & Seascape tokens
  coralSand: 0xffe5ec,
  coralReefPink: 0xff66b2,
  coralReefTeal: 0x72efdd,
  pearlBeachTop: 0xfff5e4,
  pearlBeachSide: 0xffd6ba,
  dreamMeadowTop: 0xff85b3,
  dreamMeadowSide: 0xd48c9e,
  sakuraLavender: 0xc8a2ff,
  sakuraMint: 0x98f5e1,
  highlandsRoseQuartz: 0xf4acb7,
  highlandsSide: 0xe295a3,
  snowPeakTop: 0xffffff,
  snowPeakSide: 0xfce4ec
} as const;

export type PaletteColor = keyof typeof PALETTE;
