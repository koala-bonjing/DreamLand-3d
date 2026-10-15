import * as THREE from 'three';
import { PALETTE } from '../src/config/palette';
import { ScenarioConfig } from './types';

export class BenchScene {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private chunkGroup = new THREE.Group();
  private treeMesh: THREE.InstancedMesh | null = null;
  private animFrameId = 0;
  private startTime = performance.now();
  private currentRing = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setClearColor(PALETTE.fog, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(PALETTE.fog, 20, 100);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.5, 300);
    this.camera.position.set(0, 25, 45);
    this.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(PALETTE.skyZenithDay, PALETTE.grass, 1.2);
    this.scene.add(hemi);
    this.scene.add(this.chunkGroup);

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  public applyScenario(cfg: ScenarioConfig): void {
    this.renderer.setPixelRatio(cfg.pixelRatio);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = Math.max(10, cfg.fogFar * 0.35);
      this.scene.fog.far = cfg.fogFar;
    }

    if (this.currentRing !== cfg.chunkRing) {
      this.buildTerrain(cfg.chunkRing);
      this.currentRing = cfg.chunkRing;
    }

    this.updateTrees(cfg.trees);
  }

  private buildTerrain(ring: number): void {
    // Clear old chunk geometries
    while (this.chunkGroup.children.length > 0) {
      const child = this.chunkGroup.children.pop() as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (child.material) (child.material as THREE.Material).dispose();
    }

    const chunkSize = 64;
    const segs = 31; // 32x32 vertices = 31 segments
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });

    for (let cx = -ring; cx <= ring; cx++) {
      for (let cz = -ring; cz <= ring; cz++) {
        const geom = new THREE.PlaneGeometry(chunkSize, chunkSize, segs, segs);
        geom.rotateX(-Math.PI / 2);

        const posAttr = geom.attributes.position;
        const colAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3);
        const col1 = new THREE.Color(PALETTE.pinkMeadow);
        const col2 = new THREE.Color(PALETTE.grass);
        const col3 = new THREE.Color(PALETTE.hills);

        for (let i = 0; i < posAttr.count; i++) {
          const wx = posAttr.getX(i) + cx * chunkSize;
          const wz = posAttr.getZ(i) + cz * chunkSize;
          const h =
            Math.sin(wx * 0.03) * 3 +
            Math.cos(wz * 0.03) * 3 +
            Math.sin((wx + wz) * 0.015) * 6;
          posAttr.setY(i, h);

          const factor = Math.min(Math.max((h + 8) / 16, 0), 1);
          const c = factor < 0.5 ? col2.clone().lerp(col1, factor * 2) : col1.clone().lerp(col3, (factor - 0.5) * 2);
          colAttr.setXYZ(i, c.r, c.g, c.b);
        }

        geom.setAttribute('color', colAttr);
        geom.computeVertexNormals();

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(cx * chunkSize, 0, cz * chunkSize);
        this.chunkGroup.add(mesh);
      }
    }
  }

  private updateTrees(count: number): void {
    if (this.treeMesh) {
      this.scene.remove(this.treeMesh);
      this.treeMesh.geometry.dispose();
      (this.treeMesh.material as THREE.Material).dispose();
      this.treeMesh = null;
    }

    if (count <= 0) return;

    // Low-poly cone tree: ≤ 36 triangles
    const geom = new THREE.ConeGeometry(1.8, 4.5, 6);
    geom.translate(0, 2.25, 0);
    const mat = new THREE.MeshLambertMaterial({
      color: PALETTE.treeCanopyPink,
      flatShading: true
    });

    this.treeMesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    const spread = (this.currentRing + 0.8) * 64;

    for (let i = 0; i < count; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const r = Math.sqrt(i / count) * spread;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = Math.sin(x * 0.03) * 3 + Math.cos(z * 0.03) * 3;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.7 + (i % 5) * 0.15);
      dummy.updateMatrix();
      this.treeMesh.setMatrixAt(i, dummy.matrix);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.treeMesh);
  }

  public render(time: number): void {
    const elapsed = (time - this.startTime) * 0.0003;
    this.camera.position.x = Math.sin(elapsed) * 50;
    this.camera.position.z = Math.cos(elapsed) * 50;
    this.camera.position.y = 22 + Math.sin(elapsed * 1.5) * 6;
    this.camera.lookAt(0, 4, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.buildTerrain(-1);
    this.updateTrees(0);
    this.renderer.dispose();
  }
}
