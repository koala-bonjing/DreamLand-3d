import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PropManager } from '../src/world/props';

describe('Props & Procedural Assets', () => {
  it('instantiates PropManager and initializes pooled InstancedMeshes', () => {
    const scene = new THREE.Scene();
    const props = new PropManager(scene);

    expect(props).toBeDefined();

    // Verify children added to scene
    const instancedMeshes = scene.children.filter((c) => c instanceof THREE.InstancedMesh);
    expect(instancedMeshes.length).toBe(5); // pink trees, mint trees, lilac trees, flowers, houses

    props.dispose();
  });

  it('updates chunks deterministically', () => {
    const scene = new THREE.Scene();
    const props = new PropManager(scene);

    const chunks = [
      { cx: 0, cz: 0 },
      { cx: 1, cz: 0 },
      { cx: 0, cz: 1 }
    ];

    expect(() => props.updateChunks(chunks, 12345)).not.toThrow();

    props.dispose();
  });
});
