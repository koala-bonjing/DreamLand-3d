import * as THREE from 'three';
import {
  CHUNK_SIZE,
  CHUNK_SEGMENTS,
  CHUNK_INDEX_COUNT,
  ChunkBuildRequest,
  ChunkBuildResponse
} from './types';
import { PropManager } from './props';

export interface ChunkManagerOptions {
  scene: THREE.Scene;
  seed: number;
  ringRadius?: number; // default: 2 (A15 mode)
  workerUrl?: URL;
}

interface LoadedChunk {
  cx: number;
  cz: number;
  mesh: THREE.Mesh;
}

function createSharedChunkIndices(): Uint16Array {
  const indices = new Uint16Array(CHUNK_INDEX_COUNT);
  let idx = 0;
  const stride = CHUNK_SEGMENTS + 1;
  for (let iz = 0; iz < CHUNK_SEGMENTS; iz++) {
    for (let ix = 0; ix < CHUNK_SEGMENTS; ix++) {
      const a = iz * stride + ix;
      const b = (iz + 1) * stride + ix;
      const c = (iz + 1) * stride + (ix + 1);
      const d = iz * stride + (ix + 1);

      indices[idx++] = a;
      indices[idx++] = b;
      indices[idx++] = d;

      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }
  return indices;
}

export class ChunkManager {
  public scene: THREE.Scene;
  public seed: number;
  public ringRadius: number;
  public props: PropManager;

  private worker: Worker | null = null;
  private sharedMaterial: THREE.MeshLambertMaterial;
  private sharedIndexAttr: THREE.BufferAttribute;

  private loadedChunks = new Map<string, LoadedChunk>();
  private pendingRequests = new Set<string>();
  private incomingQueue: ChunkBuildResponse[] = [];
  private bufferPool: ArrayBuffer[] = [];

  private currentCenterCx = NaN;
  private currentCenterCz = NaN;
  private requestCounter = 0;

  constructor(options: ChunkManagerOptions) {
    this.scene = options.scene;
    this.seed = options.seed;
    this.ringRadius = options.ringRadius ?? 2;

    this.sharedMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });

    const indices = createSharedChunkIndices();
    this.sharedIndexAttr = new THREE.BufferAttribute(indices, 1);
    this.props = new PropManager(this.scene);

    if (typeof Worker !== 'undefined') {
      const url = options.workerUrl ?? new URL('./worker.ts', import.meta.url);
      this.worker = new Worker(url, { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage;
    }
  }

  public setRingRadius(radius: number): void {
    this.ringRadius = radius;
  }

  public getLoadedCount(): number {
    return this.loadedChunks.size;
  }

  public update(playerX: number, playerZ: number): void {
    const centerCx = Math.floor((playerX + CHUNK_SIZE * 0.5) / CHUNK_SIZE);
    const centerCz = Math.floor((playerZ + CHUNK_SIZE * 0.5) / CHUNK_SIZE);

    if (centerCx !== this.currentCenterCx || centerCz !== this.currentCenterCz) {
      this.currentCenterCx = centerCx;
      this.currentCenterCz = centerCz;
      this.refreshRing(centerCx, centerCz);
      this.pruneDistantChunks(centerCx, centerCz);
    }

    // Rate-limit main-thread geometry builds: at most 1 chunk per frame
    this.processBuildQueue(1);
  }

  private getKey(cx: number, cz: number): string {
    return `${cx}:${cz}`;
  }

  private refreshRing(centerCx: number, centerCz: number): void {
    if (!this.worker) return;

    // Collect requested coordinates and sort nearest-first
    const requested: Array<{ cx: number; cz: number; distSq: number }> = [];

    for (let dx = -this.ringRadius; dx <= this.ringRadius; dx++) {
      for (let dz = -this.ringRadius; dz <= this.ringRadius; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = this.getKey(cx, cz);

        if (!this.loadedChunks.has(key) && !this.pendingRequests.has(key)) {
          requested.push({ cx, cz, distSq: dx * dx + dz * dz });
        }
      }
    }

    requested.sort((a, b) => a.distSq - b.distSq);

    // Dispatch worker build requests
    for (const item of requested) {
      const key = this.getKey(item.cx, item.cz);
      this.pendingRequests.add(key);
      this.requestCounter++;

      let posBuf: ArrayBuffer | undefined;
      let colBuf: ArrayBuffer | undefined;
      let normBuf: ArrayBuffer | undefined;

      const transferables: ArrayBuffer[] = [];
      if (this.bufferPool.length >= 3) {
        posBuf = this.bufferPool.pop();
        colBuf = this.bufferPool.pop();
        normBuf = this.bufferPool.pop();
        if (posBuf && colBuf && normBuf) {
          transferables.push(posBuf, colBuf, normBuf);
        }
      }

      const req: ChunkBuildRequest = {
        type: 'BUILD_CHUNK',
        requestId: this.requestCounter,
        cx: item.cx,
        cz: item.cz,
        seed: this.seed,
        positionsBuffer: posBuf,
        colorsBuffer: colBuf,
        normalsBuffer: normBuf
      };

      this.worker.postMessage(req, transferables);
    }
  }

  private handleWorkerMessage = (e: MessageEvent<ChunkBuildResponse>): void => {
    const res = e.data;
    if (res.type !== 'CHUNK_BUILT') return;

    const key = this.getKey(res.cx, res.cz);
    this.pendingRequests.delete(key);

    // Check if chunk is still within hysteresis distance before queuing
    const dx = Math.abs(res.cx - this.currentCenterCx);
    const dz = Math.abs(res.cz - this.currentCenterCz);
    if (dx <= this.ringRadius + 1 && dz <= this.ringRadius + 1) {
      this.incomingQueue.push(res);
    } else {
      // Stale or distant chunk: recycle buffers directly to pool
      this.recycleBuffers(res);
    }
  };

  private processBuildQueue(limit = 1): void {
    let builds = 0;
    while (this.incomingQueue.length > 0 && builds < limit) {
      const res = this.incomingQueue.shift()!;
      const key = this.getKey(res.cx, res.cz);

      if (this.loadedChunks.has(key)) {
        this.recycleBuffers(res);
        continue;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(res.positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(res.colors, 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(res.normals, 3));
      geom.setIndex(this.sharedIndexAttr);

      const mesh = new THREE.Mesh(geom, this.sharedMaterial);
      mesh.position.set(res.cx * CHUNK_SIZE, 0, res.cz * CHUNK_SIZE);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      this.scene.add(mesh);
      this.loadedChunks.set(key, { cx: res.cx, cz: res.cz, mesh });
      builds++;
    }

    if (builds > 0) {
      this.props.updateChunks(Array.from(this.loadedChunks.values()), this.seed);
    }
  }

  private pruneDistantChunks(centerCx: number, centerCz: number): void {
    const unloadDist = this.ringRadius + 1; // Hysteresis buffer
    let pruned = 0;

    for (const [key, chunk] of this.loadedChunks.entries()) {
      const dx = Math.abs(chunk.cx - centerCx);
      const dz = Math.abs(chunk.cz - centerCz);

      if (dx > unloadDist || dz > unloadDist) {
        this.scene.remove(chunk.mesh);

        const geom = chunk.mesh.geometry;
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const colAttr = geom.attributes.color as THREE.BufferAttribute;
        const normAttr = geom.attributes.normal as THREE.BufferAttribute;

        if (posAttr?.array?.buffer) this.bufferPool.push(posAttr.array.buffer as ArrayBuffer);
        if (colAttr?.array?.buffer) this.bufferPool.push(colAttr.array.buffer as ArrayBuffer);
        if (normAttr?.array?.buffer) this.bufferPool.push(normAttr.array.buffer as ArrayBuffer);

        geom.dispose();
        this.loadedChunks.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      this.props.updateChunks(Array.from(this.loadedChunks.values()), this.seed);
    }
  }

  private recycleBuffers(res: ChunkBuildResponse): void {
    this.bufferPool.push(res.positions.buffer as ArrayBuffer);
    this.bufferPool.push(res.colors.buffer as ArrayBuffer);
    this.bufferPool.push(res.normals.buffer as ArrayBuffer);
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    for (const chunk of this.loadedChunks.values()) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
    }
    this.loadedChunks.clear();
    this.incomingQueue = [];
    this.bufferPool = [];
    this.sharedMaterial.dispose();
    this.props.dispose();
  }
}
