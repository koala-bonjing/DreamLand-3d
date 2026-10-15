import { heightAt, moistureAt } from './noise';
import { getBiomeColor, normalizeHeightForBiome } from './biomes';
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

      const wy = heightAt(wx, wz, seed);

      const offset = vertIdx * 3;
      positions[offset + 0] = lx;
      positions[offset + 1] = wy;
      positions[offset + 2] = lz;

      // Accurate biome mapping matching terrain elevation
      const normH = normalizeHeightForBiome(wy);
      const moist = moistureAt(wx, wz, seed);
      const rgb = getBiomeColor(normH, moist);

      colors[offset + 0] = rgb[0];
      colors[offset + 1] = rgb[1];
      colors[offset + 2] = rgb[2];

      // Analytical normal from height difference
      const dhdx = (heightAt(wx + 1, wz, seed) - heightAt(wx - 1, wz, seed)) * 0.5;
      const dhdz = (heightAt(wx, wz + 1, seed) - heightAt(wx, wz - 1, seed)) * 0.5;
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
