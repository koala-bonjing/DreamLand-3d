import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { hash2D, heightAt } from './noise';
import { getBiomeAt } from './biomes';
import { CHUNK_SIZE } from './types';

interface VoxelBoxDef {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  hex: number;
}

function mergeVoxelBoxes(boxes: VoxelBoxDef[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  const geos = boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    g.translate(b.x, b.y, b.z);
    totalVerts += g.attributes.position.count;
    totalIndices += g.index!.count;
    return { g, hex: b.hex };
  });

  const positions = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(totalIndices);

  let vertOffset = 0;
  let idxOffset = 0;
  const col = new THREE.Color();

  for (const item of geos) {
    const posAttr = item.g.attributes.position;
    const normAttr = item.g.attributes.normal;
    const idxAttr = item.g.index!;
    col.setHex(item.hex);

    for (let i = 0; i < posAttr.count; i++) {
      const p = (vertOffset + i) * 3;
      positions[p] = posAttr.getX(i);
      positions[p + 1] = posAttr.getY(i);
      positions[p + 2] = posAttr.getZ(i);

      const ny = normAttr.getY(i);
      const shade = ny > 0.5 ? 1.05 : ny < -0.5 ? 0.82 : 0.94;
      colors[p] = Math.min(1, col.r * shade);
      colors[p + 1] = Math.min(1, col.g * shade);
      colors[p + 2] = Math.min(1, col.b * shade);

      normals[p] = normAttr.getX(i);
      normals[p + 1] = normAttr.getY(i);
      normals[p + 2] = normAttr.getZ(i);
    }

    for (let i = 0; i < idxAttr.count; i++) {
      indices[idxOffset + i] = idxAttr.getX(i) + vertOffset;
    }

    vertOffset += posAttr.count;
    idxOffset += idxAttr.count;
    item.g.dispose();
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  return geom;
}

// Multi-layered Voxel Cherry Blossom / Mint Macaron tree
function createVoxelTreeGeometry(canopyColorHex: number, accentColorHex: number): THREE.BufferGeometry {
  const boxes: VoxelBoxDef[] = [
    // Slender wooden voxel trunk
    { w: 0.45, h: 2.0, d: 0.45, x: 0, y: 1.0, z: 0, hex: PALETTE.treeTrunk },
    // Tier 1: lower broad canopy
    { w: 3.2, h: 1.0, d: 3.2, x: 0, y: 2.3, z: 0, hex: canopyColorHex },
    // Tier 2: middle canopy
    { w: 2.4, h: 0.9, d: 2.4, x: 0, y: 3.1, z: 0, hex: accentColorHex },
    // Tier 3: cute top crown
    { w: 1.4, h: 0.8, d: 1.4, x: 0, y: 3.8, z: 0, hex: canopyColorHex }
  ];
  return mergeVoxelBoxes(boxes);
}

function createFlowerGeometry(): THREE.BufferGeometry {
  const geom = new THREE.ConeGeometry(0.35, 0.8, 5);
  geom.rotateX(Math.PI);
  geom.translate(0, 0.4, 0);
  return geom;
}

function createDreamhouseGeometry(): THREE.BufferGeometry {
  const boxes: VoxelBoxDef[] = [
    // Main walls
    { w: 3.2, h: 2.4, d: 3.2, x: 0, y: 1.2, z: 0, hex: PALETTE.dreamhouseWall },
    // Voxel roof tiers
    { w: 3.6, h: 0.6, d: 3.6, x: 0, y: 2.7, z: 0, hex: PALETTE.dreamhouseRoof },
    { w: 2.6, h: 0.6, d: 2.6, x: 0, y: 3.3, z: 0, hex: PALETTE.dreamhouseRoof },
    { w: 1.4, h: 0.6, d: 1.4, x: 0, y: 3.9, z: 0, hex: PALETTE.dreamhouseRoof },
    // Golden door accent
    { w: 0.8, h: 1.2, d: 0.1, x: 0, y: 0.6, z: 1.62, hex: 0xffe66d }
  ];
  return mergeVoxelBoxes(boxes);
}

// Discoverable Landmark: Pastel Voxel Gazebo
function createGazeboGeometry(): THREE.BufferGeometry {
  const boxes: VoxelBoxDef[] = [
    // Stepped white & rose-quartz base platform (5x1x5)
    { w: 5.4, h: 0.5, d: 5.4, x: 0, y: 0.25, z: 0, hex: 0xf4acb7 },
    { w: 4.6, h: 0.5, d: 4.6, x: 0, y: 0.75, z: 0, hex: 0xffffff },
    // 4 corner pillars (0.5x4x0.5 in #fff0f5)
    { w: 0.5, h: 3.6, d: 0.5, x: -1.7, y: 2.8, z: -1.7, hex: 0xfff0f5 },
    { w: 0.5, h: 3.6, d: 0.5, x: 1.7, y: 2.8, z: -1.7, hex: 0xfff0f5 },
    { w: 0.5, h: 3.6, d: 0.5, x: -1.7, y: 2.8, z: 1.7, hex: 0xfff0f5 },
    { w: 0.5, h: 3.6, d: 0.5, x: 1.7, y: 2.8, z: 1.7, hex: 0xfff0f5 },
    // Tiered pagoda / cupcake voxel roof
    { w: 5.2, h: 0.5, d: 5.2, x: 0, y: 4.8, z: 0, hex: 0xff69b4 },
    { w: 3.8, h: 0.5, d: 3.8, x: 0, y: 5.3, z: 0, hex: 0xff85c0 },
    { w: 2.4, h: 0.5, d: 2.4, x: 0, y: 5.8, z: 0, hex: 0xffadd6 },
    // Star finial on top (#ffe66d)
    { w: 0.7, h: 0.7, d: 0.7, x: 0, y: 6.4, z: 0, hex: 0xffe66d }
  ];
  return mergeVoxelBoxes(boxes);
}

// Discoverable Landmark: Malibu Beach Wooden Voxel Dock
function createDockGeometry(): THREE.BufferGeometry {
  const boxes: VoxelBoxDef[] = [
    // Pastel boardwalk planks extending out over SEA_LEVEL (10m long)
    { w: 3.2, h: 0.35, d: 9.6, x: 0, y: 0.18, z: 4.8, hex: 0xdeb887 },
    { w: 0.25, h: 0.45, d: 9.6, x: -1.5, y: 0.25, z: 4.8, hex: 0xf4acb7 },
    { w: 0.25, h: 0.45, d: 9.6, x: 1.5, y: 0.25, z: 4.8, hex: 0xf4acb7 },
    // Support posts extending down into water / seabed
    { w: 0.4, h: 2.5, d: 0.4, x: -1.3, y: -1.1, z: 1.5, hex: 0x8b5a2b },
    { w: 0.4, h: 2.5, d: 0.4, x: 1.3, y: -1.1, z: 1.5, hex: 0x8b5a2b },
    { w: 0.4, h: 2.5, d: 0.4, x: -1.3, y: -1.1, z: 8.0, hex: 0x8b5a2b },
    { w: 0.4, h: 2.5, d: 0.4, x: 1.3, y: -1.1, z: 8.0, hex: 0x8b5a2b },
    // Cute voxel bollards / lantern posts (#ffe66d)
    { w: 0.3, h: 0.8, d: 0.3, x: -1.3, y: 0.65, z: 0.5, hex: 0xffe66d },
    { w: 0.3, h: 0.8, d: 0.3, x: 1.3, y: 0.65, z: 0.5, hex: 0xffe66d },
    { w: 0.3, h: 0.8, d: 0.3, x: -1.3, y: 0.65, z: 9.0, hex: 0xffe66d },
    { w: 0.3, h: 0.8, d: 0.3, x: 1.3, y: 0.65, z: 9.0, hex: 0xffe66d }
  ];
  return mergeVoxelBoxes(boxes);
}

export class PropManager {
  private meshTreesPink: THREE.InstancedMesh;
  private meshTreesMint: THREE.InstancedMesh;
  private meshTreesLilac: THREE.InstancedMesh;
  private meshFlowers: THREE.InstancedMesh;
  private meshHouses: THREE.InstancedMesh;
  private meshGazebos: THREE.InstancedMesh;
  private meshDocks: THREE.InstancedMesh;

  private dummy = new THREE.Object3D();
  private maxTrees = 700;
  private maxFlowers = 1200;
  private maxHouses = 30;
  private maxGazebos = 25;
  private maxDocks = 25;

  constructor(scene: THREE.Scene) {
    const treePinkGeom = createVoxelTreeGeometry(PALETTE.treeCanopyPink, 0xffd1e6);
    const treeMintGeom = createVoxelTreeGeometry(PALETTE.treeCanopyMint, 0x98f5e1);
    const treeLilacGeom = createVoxelTreeGeometry(PALETTE.treeCanopyLilac, 0xc8a2ff);
    const flowerGeom = createFlowerGeometry();
    const houseGeom = createDreamhouseGeometry();
    const gazeboGeom = createGazeboGeometry();
    const dockGeom = createDockGeometry();

    const matTree = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const matFlower = new THREE.MeshLambertMaterial({ color: PALETTE.flowerPetal, flatShading: true });
    const matHouse = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const matGazebo = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const matDock = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    this.meshTreesPink = new THREE.InstancedMesh(treePinkGeom, matTree, this.maxTrees);
    this.meshTreesMint = new THREE.InstancedMesh(treeMintGeom, matTree, this.maxTrees);
    this.meshTreesLilac = new THREE.InstancedMesh(treeLilacGeom, matTree, this.maxTrees);
    this.meshFlowers = new THREE.InstancedMesh(flowerGeom, matFlower, this.maxFlowers);
    this.meshHouses = new THREE.InstancedMesh(houseGeom, matHouse, this.maxHouses);
    this.meshGazebos = new THREE.InstancedMesh(gazeboGeom, matGazebo, this.maxGazebos);
    this.meshDocks = new THREE.InstancedMesh(dockGeom, matDock, this.maxDocks);

    // Disable frustum culling so instances distributed across chunk rings are never culled
    this.meshTreesPink.frustumCulled = false;
    this.meshTreesMint.frustumCulled = false;
    this.meshTreesLilac.frustumCulled = false;
    this.meshFlowers.frustumCulled = false;
    this.meshHouses.frustumCulled = false;
    this.meshGazebos.frustumCulled = false;
    this.meshDocks.frustumCulled = false;

    // Initial count is 0
    this.meshTreesPink.count = 0;
    this.meshTreesMint.count = 0;
    this.meshTreesLilac.count = 0;
    this.meshFlowers.count = 0;
    this.meshHouses.count = 0;
    this.meshGazebos.count = 0;
    this.meshDocks.count = 0;

    scene.add(this.meshTreesPink);
    scene.add(this.meshTreesMint);
    scene.add(this.meshTreesLilac);
    scene.add(this.meshFlowers);
    scene.add(this.meshHouses);
    scene.add(this.meshGazebos);
    scene.add(this.meshDocks);
  }

  public getLandmarkCount(): number {
    return this.meshHouses.count + this.meshGazebos.count + this.meshDocks.count;
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
    let countGazebos = 0;
    let countDocks = 0;

    for (const chunk of activeChunks) {
      const originX = chunk.cx * CHUNK_SIZE;
      const originZ = chunk.cz * CHUNK_SIZE;
      const chunkSeed = (seed + chunk.cx * 73856093 ^ chunk.cz * 19349663) >>> 0;
      const biome = getBiomeAt(originX, originZ, seed);

      // 1. Rare Dreamhouse check (approx 1 in 15 chunks)
      const houseChance = hash2D(chunk.cx, chunk.cz, seed + 9999);
      if (houseChance < 0.07 && countHouses < this.maxHouses) {
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

      // 2. Discoverable Pastel Voxel Gazebo (~1 in 12 chunks in DREAM_MEADOW or SAKURA_GROVE)
      if ((biome === 'DREAM_MEADOW' || biome === 'SAKURA_GROVE') && countGazebos < this.maxGazebos) {
        const gazeboChance = hash2D(chunk.cx, chunk.cz, seed + 8888);
        if (gazeboChance < 0.085) {
          const gx = originX + (hash2D(chunk.cx, chunk.cz, seed + 303) - 0.5) * (CHUNK_SIZE - 14);
          const gz = originZ + (hash2D(chunk.cx, chunk.cz, seed + 404) - 0.5) * (CHUNK_SIZE - 14);
          const gy = heightAt(gx, gz, seed);
          if (gy >= 2.0 && gy <= 10.0) {
            this.dummy.position.set(gx, gy, gz);
            this.dummy.rotation.set(0, gazeboChance * Math.PI * 2, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.meshGazebos.setMatrixAt(countGazebos++, this.dummy.matrix);
          }
        }
      }

      // 3. Discoverable Malibu Beach Wooden Voxel Dock (~1 in 10 chunks on PEARL_BEACH)
      if (biome === 'PEARL_BEACH' && countDocks < this.maxDocks) {
        const dockChance = hash2D(chunk.cx, chunk.cz, seed + 7777);
        if (dockChance < 0.10) {
          const dx = originX + (hash2D(chunk.cx, chunk.cz, seed + 505) - 0.5) * (CHUNK_SIZE - 12);
          const dz = originZ + (hash2D(chunk.cx, chunk.cz, seed + 606) - 0.5) * (CHUNK_SIZE - 12);
          const dy = heightAt(dx, dz, seed);
          if (dy >= -1.0 && dy <= 1.0) {
            this.dummy.position.set(dx, 0, dz);
            this.dummy.rotation.set(0, dockChance * Math.PI * 2, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.meshDocks.setMatrixAt(countDocks++, this.dummy.matrix);
          }
        }
      }

      // 4. Multi-layered Voxel Trees (12 per chunk)
      for (let i = 0; i < 12; i++) {
        const rx = (hash2D(i, 0, chunkSeed) - 0.5) * (CHUNK_SIZE - 6);
        const rz = (hash2D(i, 1, chunkSeed) - 0.5) * (CHUNK_SIZE - 6);
        const wx = originX + rx;
        const wz = originZ + rz;
        const wy = heightAt(wx, wz, seed);

        if (wy >= 2.0 && wy <= 18.0) {
          const typeVal = hash2D(i, 2, chunkSeed);
          const scale = 0.85 + hash2D(i, 3, chunkSeed) * 0.35;
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

      // 5. Flowers (20 per chunk)
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
    this.meshGazebos.count = countGazebos;
    this.meshDocks.count = countDocks;

    this.meshTreesPink.instanceMatrix.needsUpdate = true;
    this.meshTreesMint.instanceMatrix.needsUpdate = true;
    this.meshTreesLilac.instanceMatrix.needsUpdate = true;
    this.meshFlowers.instanceMatrix.needsUpdate = true;
    this.meshHouses.instanceMatrix.needsUpdate = true;
    this.meshGazebos.instanceMatrix.needsUpdate = true;
    this.meshDocks.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.meshTreesPink.geometry.dispose();
    this.meshTreesMint.geometry.dispose();
    this.meshTreesLilac.geometry.dispose();
    this.meshFlowers.geometry.dispose();
    this.meshHouses.geometry.dispose();
    this.meshGazebos.geometry.dispose();
    this.meshDocks.geometry.dispose();
  }
}
