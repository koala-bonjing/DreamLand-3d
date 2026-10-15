# Chunk Streaming & Web Worker Research
Date: 2026-10-15
Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- https://vite.dev/guide/features.html#web-workers
- https://threejs.org/docs/#api/en/core/BufferGeometry

Key Findings:
1. Vite supports standard Web Worker syntax: `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
2. Standard postMessage copies large typed arrays, inducing GC and latency spikes.
3. Transferable Objects (`worker.postMessage(data, [buffer])`) transfer ArrayBuffer ownership with zero-copy.
4. Terrain chunk size 64m with 32x32 vertices (1024 vertices, 1922 triangles) is optimal for mobile draw call and memory bounds.
5. Building geometry on main thread should be throttled to <= 1 chunk per frame to avoid dropping below 30/60 fps.
6. A monotonic `requestId` allows main thread to cancel or ignore outdated chunk requests as the player moves.
7. Unload chunks with hysteresis: keep loaded until player is `ringRadius + 1` chunks away to prevent thrashing at boundaries.
8. Buffer pooling: recycle Float32Array allocations between unallocated and freshly generated chunks.
9. Props (trees, flowers) must populate pooled global InstancedMesh instances rather than creating separate meshes per chunk.
