import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { hash2D, heightAt } from './noise';
import { CHUNK_SIZE } from './types';

// Procedural low-poly 3D heart geometry (<= 24 triangles)
function createHeartGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = 0;
  const y = 0;
  shape.moveTo(x + 0.25, y + 0.25);
  shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
  shape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
  shape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 1.0);
  shape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
  shape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
  shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

  const extrudeSettings = {
    depth: 0.25,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  geom.scale(1.2, 1.2, 1.2);
  geom.computeVertexNormals();
  return geom;
}

export interface CollectibleHeart {
  id: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export class HeartManager {
  private hearts = new Map<string, CollectibleHeart>();
  private collectedIds = new Set<string>();
  private instancedMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private maxHearts = 150;
  private animTime = 0;

  // Particle sparkle burst on collection
  private sparklePoints: THREE.Points;
  private sparklePositions: Float32Array;
  private sparkleVelocities: Float32Array;
  private sparkleLife: Float32Array;
  private sparkleActive = false;

  public onCollect?: (totalCount: number) => void;

  constructor(scene: THREE.Scene) {
    // Load local collected hearts from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('dreamland_collected_hearts');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) list.forEach((id) => this.collectedIds.add(id));
        }
      } catch {
        // Ignore storage errors
      }
    }

    const heartGeom = createHeartGeometry();
    const heartMat = new THREE.MeshLambertMaterial({
      color: PALETTE.heart,
      emissive: 0x550022,
      flatShading: true
    });

    this.instancedMesh = new THREE.InstancedMesh(heartGeom, heartMat, this.maxHearts);
    this.instancedMesh.count = 0;
    this.instancedMesh.frustumCulled = false;
    scene.add(this.instancedMesh);

    // Sparkle burst points
    const count = 48;
    this.sparklePositions = new Float32Array(count * 3);
    this.sparkleVelocities = new Float32Array(count * 3);
    this.sparkleLife = new Float32Array(count);

    const sparkleGeom = new THREE.BufferGeometry();
    sparkleGeom.setAttribute('position', new THREE.BufferAttribute(this.sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: 0xffe0ef,
      size: 0.35,
      transparent: true,
      opacity: 0.9
    });

    this.sparklePoints = new THREE.Points(sparkleGeom, sparkleMat);
    this.sparklePoints.visible = false;
    scene.add(this.sparklePoints);
  }

  public getCollectedCount(): number {
    return this.collectedIds.size;
  }

  public updateChunks(activeChunks: Array<{ cx: number; cz: number }>, seed: number): void {
    for (const chunk of activeChunks) {
      const originX = chunk.cx * CHUNK_SIZE;
      const originZ = chunk.cz * CHUNK_SIZE;

      // 3 deterministic hearts per chunk
      for (let i = 0; i < 3; i++) {
        const id = `${chunk.cx}:${chunk.cz}:${i}`;
        if (!this.hearts.has(id)) {
          const rx = (hash2D(i, 40, seed) - 0.5) * (CHUNK_SIZE - 10);
          const rz = (hash2D(i, 41, seed) - 0.5) * (CHUNK_SIZE - 10);
          const hx = originX + rx;
          const hz = originZ + rz;
          const hy = heightAt(hx, hz, seed);

          if (hy >= 1.5) {
            this.hearts.set(id, {
              id,
              x: hx,
              y: hy + 2.8,
              z: hz,
              collected: this.collectedIds.has(id)
            });
          }
        }
      }
    }
  }

  public update(dt: number, playerX: number, playerY: number, playerZ: number): void {
    this.animTime += dt;

    let activeCount = 0;
    const collectRadiusSq = 3.2 * 3.2; // 3.2m collection radius

    for (const heart of this.hearts.values()) {
      if (heart.collected) continue;
      if (activeCount >= this.maxHearts) break;

      // Check collection distance
      const dx = playerX - heart.x;
      const dy = playerY - heart.y;
      const dz = playerZ - heart.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= collectRadiusSq) {
        heart.collected = true;
        this.collectedIds.add(heart.id);
        this.saveCollected();
        this.triggerSparkles(heart.x, heart.y, heart.z);
        this.onCollect?.(this.collectedIds.size);
        continue;
      }

      // Bob & rotate
      const bobY = heart.y + Math.sin(this.animTime * 3.0 + heart.x) * 0.35;
      this.dummy.position.set(heart.x, bobY, heart.z);
      this.dummy.rotation.set(0, this.animTime * 2.2 + heart.z, 0);
      this.dummy.scale.setScalar(1.0 + Math.sin(this.animTime * 4.0) * 0.08);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(activeCount, this.dummy.matrix);
      activeCount++;
    }

    this.instancedMesh.count = activeCount;
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Update sparkle particles
    if (this.sparkleActive) {
      let aliveCount = 0;
      const count = this.sparkleLife.length;
      const posAttr = this.sparklePoints.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        if (this.sparkleLife[i] > 0) {
          this.sparkleLife[i] -= dt * 2.2;
          const idx = i * 3;
          this.sparklePositions[idx] += this.sparkleVelocities[idx] * dt;
          this.sparklePositions[idx + 1] += this.sparkleVelocities[idx + 1] * dt;
          this.sparklePositions[idx + 2] += this.sparkleVelocities[idx + 2] * dt;
          this.sparkleVelocities[idx + 1] -= 2.0 * dt; // gravity
          aliveCount++;
        }
      }

      posAttr.needsUpdate = true;
      if (aliveCount === 0) {
        this.sparkleActive = false;
        this.sparklePoints.visible = false;
      }
    }
  }

  private triggerSparkles(x: number, y: number, z: number): void {
    const count = this.sparkleLife.length;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.sparklePositions[idx] = x;
      this.sparklePositions[idx + 1] = y;
      this.sparklePositions[idx + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const speed = 2.5 + Math.random() * 3.5;

      this.sparkleVelocities[idx] = Math.cos(elevation) * Math.cos(angle) * speed;
      this.sparkleVelocities[idx + 1] = Math.sin(elevation) * speed + 2.0;
      this.sparkleVelocities[idx + 2] = Math.cos(elevation) * Math.sin(angle) * speed;

      this.sparkleLife[i] = 1.0;
    }

    const posAttr = this.sparklePoints.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    this.sparklePoints.visible = true;
    this.sparkleActive = true;
  }

  private saveCollected(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'dreamland_collected_hearts',
          JSON.stringify(Array.from(this.collectedIds))
        );
      } catch {
        // Ignore storage write errors
      }
    }
  }

  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    this.sparklePoints.geometry.dispose();
  }
}
