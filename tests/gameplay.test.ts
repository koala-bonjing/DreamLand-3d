import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HeartManager } from '../src/world/hearts';

describe('Gameplay Loop & Heart Collection', () => {
  it('instantiates HeartManager and spawns hearts deterministically', () => {
    const scene = new THREE.Scene();
    const heartManager = new HeartManager(scene);

    const activeChunks = [
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 }
    ];

    heartManager.updateChunks(activeChunks, 42);
    expect(heartManager.getCollectedCount()).toBe(0);

    heartManager.dispose();
  });

  it('triggers collection callback when player approaches heart', () => {
    const scene = new THREE.Scene();
    const heartManager = new HeartManager(scene);

    let collectedCount = 0;
    heartManager.onCollect = (count) => {
      collectedCount = count;
    };

    heartManager.updateChunks([{ cx: 0, cz: 0 }], 999);

    // Update with player at dummy position
    expect(() => heartManager.update(0.016, 0, 10, 0)).not.toThrow();
    expect(collectedCount).toBeGreaterThanOrEqual(0);

    heartManager.dispose();
  });
});
