import * as THREE from 'three';
import { BUDGET_TIERS, DEFAULT_TIER } from './config/budget';
import { PALETTE } from './config/palette';

const container = document.getElementById('app');
if (container) {
  const tier = BUDGET_TIERS[DEFAULT_TIER];
  const color = new THREE.Color(PALETTE.fog);
  container.setAttribute('data-tier', tier.name);
  container.setAttribute('data-bg', color.getHexString());
}
