---
name: chunk-streaming-worker
description: Chunked world streaming with a Web Worker. Use when adding or changing chunk loading, ring updates, worker messages, geometry building, buffer pooling, or when movement causes hitches.
---
# Chunk Streaming Worker

## Rules
1. Chunk dimensions: 64m × 64m with 32×32 vertex grid (1,922 triangles per chunk).
2. Ring radius is driven by tier budget (A15 = 2 rings, Mid = 3, High = 4).
3. Always prioritize chunk load requests nearest-to-camera first.
4. Build at most 1 chunk Three.js BufferGeometry per frame on the main thread.
5. Track requests with monotonic `requestId`; discard stale responses when player moves.
6. Transfer buffers via zero-copy transferable objects: `postMessage(data, [data.positions.buffer, data.colors.buffer])`.
7. Pool typed arrays: return unloaded buffers to worker pool for subsequent chunks.
8. Props populate global pooled `InstancedMesh`; never create individual meshes per chunk.
9. Unload chunks using hysteresis (distance > `ringRadius + 1`) to avoid boundary flapping.
10. Dispose mesh geometry and remove from scene immediately upon chunk eviction.

## Snippets

### Worker Transferable Message
```ts
export function sendChunk(worker: Worker, id: number, pos: Float32Array, col: Float32Array): void {
  worker.postMessage(
    { id, positions: pos, colors: col },
    [pos.buffer, col.buffer]
  );
}
```

### Main Thread Rate-Limited Build
```ts
export function processChunkQueue(queue: ChunkData[], scene: THREE.Scene, limit = 1): void {
  let count = 0;
  while (queue.length > 0 && count < limit) {
    const chunk = queue.shift()!;
    mountChunkGeometry(chunk, scene);
    count++;
  }
}
```

## Pitfalls
- Posting arrays without transferable buffers triggers GC stalls and dropped frames.
- Building multiple geometries in a single frame breaches the 33ms/16ms frame budget.
- Creating meshes per chunk causes draw calls to explode past the 60 budget limit.

## Sources
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects (2026-10-15)
- https://vite.dev/guide/features.html#web-workers (2026-10-15)
