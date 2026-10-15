import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { hash2D, heightAt } from './noise';
import { CHUNK_SIZE } from './types';

// Procedural Geometries
function createTreeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 5);
  trunk.translate(0, 0.8, 0);

  const canopy = new THREE.ConeGeometry(1.6, 3.4, 6);
  canopy.translate(0, 3.0, 0);

  // Merge trunk & canopy into single geometry
  const posCount = trunk.attributes.position.count + canopy.attributes.position.count;
  const positions = new Float32Array(posCount * 3);
  const colors = new Float32Array(posCount * 3);

  const tPos = trunk.attributes.position;
  const cPos = canopy.attributes.position;

  const trunkCol = new THREE.Color(PALETTE.treeTrunk);
  let pIdx = 0;
  for (let i = 0; i < tPos.count; i++) {
    positions[pIdx] = tPos.getX(i);
    positions[pIdx + 1] = tPos.getY(i);
    positions[pIdx + 2] = tPos.getZ(i);
    colors[pIdx] = trunkCol.r;
    colors[pIdx + 1] = trunkCol.g;
    colors[pIdx + 2] = trunkCol.b;
    pIdx += 3;
  }

  const canopyCol = new THREE.Color(0xffffff); // Tinted per instance/material
  for (let i = 0; i < cPos.count; i++) {
    positions[pIdx] = cPos.getX(i);
    positions[pIdx + 1] = cPos.getY(i);
    positions[pIdx + 2] = cPos.getZ(i);
    colors[pIdx] = canopyCol.r;
    colors[pIdx + 1] = canopyCol.g;
    colors[pIdx + 2] = canopyCol.b;
    pIdx += 3;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const tIdx = trunk.index!;
  const cIdx = canopy.index!;
  const indices = new Uint16Array(tIdx.count + cIdx.count);
  for (let i = 0; i < tIdx.count; i++) {
    indices[i] = tIdx.getX(i);
  }
  const offset = tPos.count;
  for (let i = 0; i < cIdx.count; i++) {
    indices[tIdx.count + i] = cIdx.getX(i) + offset;
  }
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();

  trunk.dispose();
  canopy.dispose();
  return geom;
}

function createFlowerGeometry(): THREE.BufferGeometry {
  const geom = new THREE.ConeGeometry(0.35, 0.8, 5);
  geom.rotateX(Math.PI);
  geom.translate(0, 0.4, 0);
  return geom;
}

function createDreamhouseGeometry(): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(3.2, 2.4, 3.2);
  box.translate(0, 1.2, 0);

  const roof = new THREE.ConeGeometry(2.8, 1.8, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 3.1, 0);

  const posCount = box.attributes.position.count + roof.attributes.position.count;
  const positions = new Float32Array(posCount * 3);
  const colors = new Float32Array(posCount * 3);

  const bPos = box.attributes.position;
  const rPos = roof.attributes.position;

  const wallCol = new THREE.Color(PALETTE.dreamhouseWall);
  const roofCol = new THREE.Color(PALETTE.dreamhouseRoof);

  let pIdx = 0;
  for (let i = 0; i < bPos.count; i++) {
    positions[pIdx] = bPos.getX(i);
    positions[pIdx + 1] = bPos.getY(i);
    positions[pIdx + 2] = bPos.getZ(i);
    colors[pIdx] = wallCol.r;
    colors[pIdx + 1] = wallCol.g;
    colors[pIdx + 2] = wallCol.b;
    pIdx += 3;
  }
  for (let i = 0; i < rPos.count; i++) {
    positions[pIdx] = rPos.getX(i);
    positions[pIdx + 1] = rPos.getY(i);
    positions[pIdx + 2] = rPos.getZ(i);
    colors[pIdx] = roofCol.r;
    colors[pIdx + 1] = roofCol.g;
    colors[pIdx + 2] = roofCol.b;
    pIdx += 3;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const bIdx = box.index!;
  const rIdx = roof.index!;
  const indices = new Uint16Array(bIdx.count + rIdx.count);
  for (let i = 0; i < bIdx.count; i++) {
    indices[i] = bIdx.getX(i);
  }
  const offset = bPos.count;
  for (let i = 0; i < rIdx.count; i++) {
    indices[bIdx.count + i] = rIdx.getX(i) + offset;
  }
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();

  box.dispose();
  roof.dispose();
  return geom;
}

export class PropManager {
  private meshTreesPink: THREE.InstancedMesh;
  private meshTreesMint: THREE.InstancedMesh;
  private meshTreesLilac: THREE.InstancedMesh;
  private meshFlowers: THREE.InstancedMesh;
  private meshHouses: THREE.InstancedMesh;

  private dummy = new THREE.Object3D();
  private maxTrees = 700;
  private maxFlowers = 1200;
  private maxHouses = 30;

  constructor(scene: THREE.Scene) {
    const treeGeom = createTreeGeometry();
    const flowerGeom = createFlowerGeometry();
    const houseGeom = createDreamhouseGeometry();

    const matPink = new THREE.MeshLambertMaterial({ color: PALETTE.treeCanopyPink, flatShading: true });
    const matMint = new THREE.MeshLambertMaterial({ color: PALETTE.treeCanopyMint, flatShading: true });
    const matLilac = new THREE.MeshLambertMaterial({ color: PALETTE.treeCanopyLilac, flatShading: true });
    const matFlower = new THREE.MeshLambertMaterial({ color: PALETTE.flowerPetal, flatShading: true });
    const matHouse = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    this.meshTreesPink = new THREE.InstancedMesh(treeGeom, matPink, this.maxTrees);
    this.meshTreesMint = new THREE.InstancedMesh(treeGeom, matMint, this.maxTrees);
    this.meshTreesLilac = new THREE.InstancedMesh(treeGeom, matLilac, this.maxTrees);
    this.meshFlowers = new THREE.InstancedMesh(flowerGeom, matFlower, this.maxFlowers);
    this.meshHouses = new THREE.InstancedMesh(houseGeom, matHouse, this.maxHouses);

    // Initial count is 0
    this.meshTreesPink.count = 0;
    this.meshTreesMint.count = 0;
    this.meshTreesLilac.count = 0;
    this.meshFlowers.count = 0;
    this.meshHouses.count = 0;

    scene.add(this.meshTreesPink);
    scene.add(this.meshTreesMint);
    scene.add(this.meshTreesLilac);
    scene.add(this.meshFlowers);
    scene.add(this.meshHouses);
  }

  public updateChunks(
    activeChunks: Array<{ cx: number; cz: number }>,
    seed: number
  ): void {
    let countPink = 0;
    let countMint = 0;
    let countLilac = 0;
    let countFlowers = 0;
    let countHouses = 0;

    for (const chunk of activeChunks) {
      const originX = chunk.cx * CHUNK_SIZE;
      const originZ = chunk.cz * CHUNK_SIZE;

      // Deterministic props per chunk using cell hash
      const chunkSeed = (seed + chunk.cx * 73856093 ^ chunk.cz * 19349663) >>> 0;

      // 1. Rare Dreamhouse check (approx 1 in 15 chunks)
      const houseChance = hash2D(chunk.cx, chunk.cz, seed + 9999);
      if (houseChance < 0.08 && countHouses < this.maxHouses) {
        const hx = originX + (hash2D(chunk.cx, chunk.cz, seed + 101) - 0.5) * (CHUNK_SIZE - 12);
        const hz = originZ + (hash2D(chunk.cx, chunk.cz, seed + 202) - 0.5) * (CHUNK_SIZE - 12);
        const hy = heightAt(hx, hz, seed);
        if (hy >= 3.0 && hy <= 14.0) {
          this.dummy.position.set(hx, hy, hz);
          this.dummy.rotation.set(0, houseChance * Math.PI * 2, 0);
          this.dummy.scale.setScalar(1.0);
          this.dummy.updateMatrix();
          this.meshHouses.setMatrixAt(countHouses++, this.dummy.matrix);
        }
      }

      // 2. Trees (12 per chunk)
      for (let i = 0; i < 12; i++) {
        const rx = (hash2D(i, 0, chunkSeed) - 0.5) * (CHUNK_SIZE - 6);
        const rz = (hash2D(i, 1, chunkSeed) - 0.5) * (CHUNK_SIZE - 6);
        const wx = originX + rx;
        const wz = originZ + rz;
        const wy = heightAt(wx, wz, seed);

        if (wy >= 2.5 && wy <= 18.0) {
          const typeVal = hash2D(i, 2, chunkSeed);
          const scale = 0.8 + hash2D(i, 3, chunkSeed) * 0.4;
          this.dummy.position.set(wx, wy, wz);
          this.dummy.rotation.set(0, typeVal * Math.PI * 2, 0);
          this.dummy.scale.setScalar(scale);
          this.dummy.updateMatrix();

          if (typeVal < 0.45 && countPink < this.maxTrees) {
            this.meshTreesPink.setMatrixAt(countPink++, this.dummy.matrix);
          } else if (typeVal < 0.75 && countMint < this.maxTrees) {
            this.meshTreesMint.setMatrixAt(countMint++, this.dummy.matrix);
          } else if (countLilac < this.maxTrees) {
            this.meshTreesLilac.setMatrixAt(countLilac++, this.dummy.matrix);
          }
        }
      }

      // 3. Flowers (20 per chunk)
      for (let i = 0; i < 20; i++) {
        if (countFlowers >= this.maxFlowers) break;
        const rx = (hash2D(i, 10, chunkSeed) - 0.5) * (CHUNK_SIZE - 4);
        const rz = (hash2D(i, 11, chunkSeed) - 0.5) * (CHUNK_SIZE - 4);
        const wx = originX + rx;
        const wz = originZ + rz;
        const wy = heightAt(wx, wz, seed);

        if (wy >= 1.5 && wy <= 15.0) {
          this.dummy.position.set(wx, wy, wz);
          this.dummy.rotation.set(0, hash2D(i, 12, chunkSeed) * Math.PI * 2, 0);
          this.dummy.scale.setScalar(0.7 + hash2D(i, 13, chunkSeed) * 0.5);
          this.dummy.updateMatrix();
          this.meshFlowers.setMatrixAt(countFlowers++, this.dummy.matrix);
        }
      }
    }

    this.meshTreesPink.count = countPink;
    this.meshTreesMint.count = countMint;
    this.meshTreesLilac.count = countLilac;
    this.meshFlowers.count = countFlowers;
    this.meshHouses.count = countHouses;

    this.meshTreesPink.instanceMatrix.needsUpdate = true;
    this.meshTreesMint.instanceMatrix.needsUpdate = true;
    this.meshTreesLilac.instanceMatrix.needsUpdate = true;
    this.meshFlowers.instanceMatrix.needsUpdate = true;
    this.meshHouses.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.meshTreesPink.geometry.dispose();
    this.meshFlowers.geometry.dispose();
    this.meshHouses.geometry.dispose();
  }
}
