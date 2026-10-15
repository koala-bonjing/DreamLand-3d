# Three.js Mobile Performance Research
Date: 2026-10-15
Sources:
- https://threejs.org/manual/#en/optimizing-lots-of-objects
- https://threejs.org/manual/#en/disposable-objects
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

Key Findings:
1. Low-end mobile GPUs (e.g. Mali-G57 MC2) are fillrate- and tile-bandwidth-constrained.
2. Disable anti-aliasing (`antialias: false`), shadow maps, and post-processing passes.
3. Set `powerPreference: 'high-performance'`.
4. Clamp devicePixelRatio (max 1.25 on low-end) and dynamically scale resolution when frame time exceeds budget.
5. Avoid transparent overdraw: Mali tile memory stalls on layered blending. Max 10 small transparent sprites.
6. Use vertex colors on shared materials to minimize shader switches and draw calls.
7. Merge stationary geometry or use `InstancedMesh` with pre-allocated pooled capacity.
8. Zero per-frame allocations in render/update loops: reuse `Vector3`, `Matrix4`, arrays.
9. Explicitly dispose buffers, geometries, materials, and textures when chunks or objects are removed.
10. Listen for WebGL context lost and restored events (`webglcontextlost`, `webglcontextrestored`).
