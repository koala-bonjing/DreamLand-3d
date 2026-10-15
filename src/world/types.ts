export const CHUNK_SIZE = 64; // meters
export const CHUNK_SEGMENTS = 31; // 31 segments = 32x32 vertices
export const CHUNK_VERT_COUNT = 32 * 32; // 1024 vertices
export const CHUNK_FLOAT_COUNT = CHUNK_VERT_COUNT * 3; // 3072 floats
export const CHUNK_TRI_COUNT = CHUNK_SEGMENTS * CHUNK_SEGMENTS * 2; // 1922 triangles
export const CHUNK_INDEX_COUNT = CHUNK_TRI_COUNT * 3; // 5766 indices

export interface ChunkBuildRequest {
  type: 'BUILD_CHUNK';
  requestId: number;
  cx: number;
  cz: number;
  seed: number;
  positionsBuffer?: ArrayBuffer;
  colorsBuffer?: ArrayBuffer;
  normalsBuffer?: ArrayBuffer;
}

export interface ChunkBuildResponse {
  type: 'CHUNK_BUILT';
  requestId: number;
  cx: number;
  cz: number;
  positions: Float32Array;
  colors: Float32Array;
  normals: Float32Array;
}
