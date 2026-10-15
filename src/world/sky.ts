import * as THREE from 'three';

const skyVertexShader = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
varying vec3 vWorldPosition;
void main() {
  float h = normalize(vWorldPosition).y;
  float factor = clamp(h * 1.8, 0.0, 1.0);
  gl_FragColor = vec4(mix(bottomColor, topColor, factor), 1.0);
}
`;

export class SkyDome {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  public cloudManagerRef?: CloudManager;

  constructor(scene: THREE.Scene, initialTop: THREE.Color, initialBottom: THREE.Color) {
    const geometry = new THREE.SphereGeometry(220, 16, 12);
    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: {
        topColor: { value: initialTop.clone() },
        bottomColor: { value: initialBottom.clone() }
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    scene.add(this.mesh);
  }

  public update(cameraX: number, cameraZ: number, top: THREE.Color, bottom: THREE.Color): void {
    this.mesh.position.set(cameraX, 0, cameraZ);
    this.material.uniforms.topColor.value.copy(top);
    this.material.uniforms.bottomColor.value.copy(bottom);
  }

  public getCloudCount(): number {
    return this.cloudManagerRef ? this.cloudManagerRef.getCloudCount() : 50;
  }

  public getPetalCount(): number {
    return this.cloudManagerRef ? this.cloudManagerRef.getPetalCount() : 250;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

function createVoxelCloudGeometry(): THREE.BufferGeometry {
  const boxes = [
    { w: 18, h: 4.5, d: 11, x: 0, y: 0, z: 0 },
    { w: 12, h: 3.8, d: 9, x: -6, y: -0.2, z: 2 },
    { w: 13, h: 3.6, d: 9, x: 6, y: -0.3, z: -2 },
    { w: 9, h: 3.2, d: 8, x: 1, y: 2.8, z: 0 }
  ];

  let totalVerts = 0;
  let totalIndices = 0;
  const geos = boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    g.translate(b.x, b.y, b.z);
    totalVerts += g.attributes.position.count;
    totalIndices += g.index!.count;
    return g;
  });

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const idx = g.index!;

    for (let i = 0; i < p.count; i++) {
      const o = (vOff + i) * 3;
      pos[o] = p.getX(i);
      pos[o + 1] = p.getY(i);
      pos[o + 2] = p.getZ(i);
      norm[o] = n.getX(i);
      norm[o + 1] = n.getY(i);
      norm[o + 2] = n.getZ(i);
    }
    for (let i = 0; i < idx.count; i++) {
      indices[iOff + i] = idx.getX(i) + vOff;
    }
    vOff += p.count;
    iOff += idx.count;
    g.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

export class CloudManager {
  private cloudMesh: THREE.InstancedMesh;
  private cloudCount = 50;
  private cloudPositions: Float32Array; // x, y, z, scale per cloud
  private dummy = new THREE.Object3D();

  // Falling Sakura / Sparkle Petals
  private petalPoints: THREE.Points;
  private petalCount = 250;
  private petalPositions: Float32Array;
  private petalPhases: Float32Array;
  private petalSpeeds: Float32Array;
  private animTime = 0;

  constructor(scene: THREE.Scene, _count = 50) {
    const cloudGeom = createVoxelCloudGeometry();
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xfff0f8,
      flatShading: true
    });

    this.cloudMesh = new THREE.InstancedMesh(cloudGeom, cloudMat, this.cloudCount);
    this.cloudMesh.frustumCulled = false;

    this.cloudPositions = new Float32Array(this.cloudCount * 4);
    for (let i = 0; i < this.cloudCount; i++) {
      const angle = (i / this.cloudCount) * Math.PI * 2 + (i % 5);
      const dist = 30 + (i % 7) * 18;
      const x = Math.sin(angle) * dist;
      const z = Math.cos(angle) * dist;
      const y = 32 + (i % 6) * 2.2;
      const scale = 0.8 + (i % 4) * 0.25;

      const offset = i * 4;
      this.cloudPositions[offset + 0] = x;
      this.cloudPositions[offset + 1] = y;
      this.cloudPositions[offset + 2] = z;
      this.cloudPositions[offset + 3] = scale;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.cloudMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.cloudMesh);

    // Sakura / Sparkle particle system
    const petalGeom = new THREE.BufferGeometry();
    this.petalPositions = new Float32Array(this.petalCount * 3);
    const petalColors = new Float32Array(this.petalCount * 3);
    this.petalPhases = new Float32Array(this.petalCount);
    this.petalSpeeds = new Float32Array(this.petalCount);

    const petalPalette = [
      new THREE.Color(0xff85c0), // Rose pink
      new THREE.Color(0xffffff), // Sparkly white
      new THREE.Color(0xffe66d)  // Golden sparkle
    ];

    for (let i = 0; i < this.petalCount; i++) {
      const p = i * 3;
      this.petalPositions[p + 0] = (Math.random() - 0.5) * 40;
      this.petalPositions[p + 1] = 10 + (Math.random() - 0.5) * 25;
      this.petalPositions[p + 2] = (Math.random() - 0.5) * 40;

      const col = petalPalette[i % petalPalette.length];
      petalColors[p + 0] = col.r;
      petalColors[p + 1] = col.g;
      petalColors[p + 2] = col.b;

      this.petalPhases[i] = i * 0.45;
      this.petalSpeeds[i] = 1.2 + (i % 4) * 0.4;
    }

    petalGeom.setAttribute('position', new THREE.BufferAttribute(this.petalPositions, 3));
    petalGeom.setAttribute('color', new THREE.BufferAttribute(petalColors, 3));

    const petalMat = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    this.petalPoints = new THREE.Points(petalGeom, petalMat);
    this.petalPoints.frustumCulled = false;
    scene.add(this.petalPoints);
  }

  public getCloudCount(): number {
    return this.cloudCount;
  }

  public getPetalCount(): number {
    return this.petalCount;
  }

  public update(dt: number, cameraX: number, cameraZ: number, playerY = 16): void {
    this.animTime += dt;
    const windSpeed = 3.0; // m/s
    const radius = 160;

    // 1. Drift Voxel Clouds
    for (let i = 0; i < this.cloudCount; i++) {
      const o = i * 4;
      let x = this.cloudPositions[o + 0] + windSpeed * dt;
      const y = this.cloudPositions[o + 1];
      let z = this.cloudPositions[o + 2];
      const scale = this.cloudPositions[o + 3];

      // Wrap around player radius (160 units)
      if (x - cameraX > radius) {
        x -= radius * 2;
      } else if (x - cameraX < -radius) {
        x += radius * 2;
      }

      if (z - cameraZ > radius) {
        z -= radius * 2;
      } else if (z - cameraZ < -radius) {
        z += radius * 2;
      }

      this.cloudPositions[o + 0] = x;
      this.cloudPositions[o + 2] = z;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.cloudMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;

    // 2. Flutter Falling Sakura Petals
    const posAttr = this.petalPoints.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = this.petalPositions;

    for (let i = 0; i < this.petalCount; i++) {
      const p = i * 3;
      const speed = this.petalSpeeds[i];
      const phase = this.petalPhases[i];

      posArray[p + 1] -= speed * dt;
      posArray[p + 0] += Math.sin(this.animTime * 2.2 + phase) * 0.04;
      posArray[p + 2] += Math.cos(this.animTime * 1.8 + phase) * 0.04;

      // Wrap back to top of volume around player
      if (posArray[p + 1] < playerY - 12) {
        posArray[p + 1] = playerY + 13;
      }
      if (posArray[p + 0] - cameraX > 20) {
        posArray[p + 0] -= 40;
      } else if (posArray[p + 0] - cameraX < -20) {
        posArray[p + 0] += 40;
      }

      if (posArray[p + 2] - cameraZ > 20) {
        posArray[p + 2] -= 40;
      } else if (posArray[p + 2] - cameraZ < -20) {
        posArray[p + 2] += 40;
      }
    }
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.cloudMesh.geometry.dispose();
    (this.cloudMesh.material as THREE.Material).dispose();
    this.petalPoints.geometry.dispose();
    (this.petalPoints.material as THREE.Material).dispose();
  }
}
