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
  dreamhouseRoof: 0xff70aa
} as const;

export type PaletteColor = keyof typeof PALETTE;
