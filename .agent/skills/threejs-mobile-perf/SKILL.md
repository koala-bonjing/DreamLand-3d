---
name: threejs-mobile-perf
description: Performance rules for Three.js on low-end Android (Mali GPUs). Use whenever creating or changing the renderer, materials, meshes, lights, fog, sprites, or anything affecting frame time, draw calls, triangles, or memory.
---
# Three.js Mobile Performance

## Rules
1. Never enable shadows, post-processing, MSAA (`antialias: false`), or dynamic lights.
2. Clamp `pixelRatio` to 1.0–1.25 on A15; scale resolution dynamically via EMA frame time.
3. Keep draw calls ≤ 60 and triangles ≤ 60k in A15 mode. Read via `renderer.info.render`.
4. Use vertex colors and shared materials; avoid texture sampling in world chunks.
5. Pool `InstancedMesh` for props; never create per-chunk individual meshes.
6. Cap transparent sprites at ≤ 10 to avoid Mali tile-fillrate thrashing.
7. Zero allocations in `tick()` / render loop; reuse scratch `Vector3` / `Matrix4`.
8. Set `fogFar` at 90–100m to aggressively cull terrain and props outside ring radius.
9. Always dispose geometries, materials, and chunk buffers when tearing down.
10. Handle `webglcontextlost` and `webglcontextrestored` on the canvas.

## Snippets

### Dynamic Resolution Scaler
```ts
export function calcScale(emaMs: number, current: number): number {
  if (emaMs > 34 && current > 0.75) return Math.max(0.75, current - 0.05);
  if (emaMs < 28 && current < 1.25) return Math.min(1.25, current + 0.05);
  return current;
}
```

### Disposal Checklist
```ts
export function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
```

## Pitfalls
- Allocating `new THREE.Vector3()` in update loops triggers GC frame drops.
- Alpha blending on mobile Mali GPUs causes severe fillrate stalls.
- Forgetting geometry disposal leaks GPU memory until context drops.

## Sources
- https://threejs.org/manual/#en/optimizing-lots-of-objects (2026-10-15)
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices (2026-10-15)
