import { heightAt } from './noise';
import { getVoxelBlockColor } from './biomes';
import {
  ChunkBuildRequest,
  ChunkBuildResponse,
  CHUNK_SIZE,
  CHUNK_SEGMENTS,
  CHUNK_FLOAT_COUNT
} from './types';

self.onmessage = (e: MessageEvent<ChunkBuildRequest>) => {
  const req = e.data;
  if (req.type !== 'BUILD_CHUNK') return;

  const { requestId, cx, cz, seed } = req;

  const positions = req.positionsBuffer
    ? new Float32Array(req.positionsBuffer)
    : new Float32Array(CHUNK_FLOAT_COUNT);

  const colors = req.colorsBuffer
    ? new Float32Array(req.colorsBuffer)
    : new Float32Array(CHUNK_FLOAT_COUNT);

  const normals = req.normalsBuffer
    ? new Float32Array(req.normalsBuffer)
    : new Float32Array(CHUNK_FLOAT_COUNT);

  const worldOriginX = cx * CHUNK_SIZE;
  const worldOriginZ = cz * CHUNK_SIZE;

  let vertIdx = 0;
  for (let iz = 0; iz <= CHUNK_SEGMENTS; iz++) {
    const fracZ = iz / CHUNK_SEGMENTS;
    const lz = (fracZ - 0.5) * CHUNK_SIZE;
    const wz = worldOriginZ + lz;

    for (let ix = 0; ix <= CHUNK_SEGMENTS; ix++) {
      const fracX = ix / CHUNK_SEGMENTS;
      const lx = (fracX - 0.5) * CHUNK_SIZE;
      const wx = worldOriginX + lx;

      const wy = Math.floor(heightAt(wx, wz, seed));

      const offset = vertIdx * 3;
      positions[offset + 0] = lx;
      positions[offset + 1] = wy;
      positions[offset + 2] = lz;

      // Sample cardinal neighbors for exposed cliff faces and step-base ambient occlusion
      const hL = Math.floor(heightAt(wx - 1, wz, seed));
      const hR = Math.floor(heightAt(wx + 1, wz, seed));
      const hD = Math.floor(heightAt(wx, wz - 1, seed));
      const hU = Math.floor(heightAt(wx, wz + 1, seed));

      const minNeighbor = Math.min(hL, hR, hD, hU);
      const maxNeighbor = Math.max(hL, hR, hD, hU);

      // Exposed cliff face where neighbor height < current height
      const isSide = minNeighbor < wy;

      // Baked bottom-vertex Ambient Occlusion (0.78 multiplier at step bases)
      const ao = maxNeighbor > wy ? 0.78 : 1.0;

      // Subtle 0.95 vs 1.0 checkerboard tint for readable 1x1 voxel blocks
      const checker = ((Math.floor(wx) + Math.floor(wz)) & 1) ? 0.95 : 1.0;

      const rgb = getVoxelBlockColor(wx, wy, wz, isSide, seed);

      colors[offset + 0] = rgb[0] * checker * ao;
      colors[offset + 1] = rgb[1] * checker * ao;
      colors[offset + 2] = rgb[2] * checker * ao;

      // Analytical normal from stepped height difference
      const dhdx = (hR - hL) * 0.5;
      const dhdz = (hU - hD) * 0.5;
      const len = Math.hypot(-dhdx, 1.0, -dhdz);

      normals[offset + 0] = -dhdx / len;
      normals[offset + 1] = 1.0 / len;
      normals[offset + 2] = -dhdz / len;

      vertIdx++;
    }
  }

  const response: ChunkBuildResponse = {
    type: 'CHUNK_BUILT',
    requestId,
    cx,
    cz,
    positions,
    colors,
    normals
  };

  (self as unknown as Worker).postMessage(response, [
    positions.buffer,
    colors.buffer,
    normals.buffer
  ]);
};
