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

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
    grad.addColorStop(0, 'rgba(255, 240, 248, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 230, 242, 0.55)');
    grad.addColorStop(1, 'rgba(255, 230, 242, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export class CloudManager {
  private clouds: THREE.Sprite[] = [];
  private group = new THREE.Group();
  private texture: THREE.CanvasTexture | null = null;
  private material: THREE.SpriteMaterial | null = null;

  constructor(scene: THREE.Scene, count = 8) {
    const safeCount = Math.min(count, 10); // A15 limit: ≤ 10 transparent sprites

    if (typeof document !== 'undefined') {
      this.texture = createCloudTexture();
      this.material = new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });

      for (let i = 0; i < safeCount; i++) {
        const sprite = new THREE.Sprite(this.material);
        const scale = 24 + (i % 3) * 8;
        sprite.scale.set(scale, scale * 0.45, 1);
        sprite.position.set(
          (Math.sin(i * 1.3) * 120),
          38 + (i % 4) * 3,
          (Math.cos(i * 1.3) * 120)
        );
        this.clouds.push(sprite);
        this.group.add(sprite);
      }
    }
    scene.add(this.group);
  }

  public update(dt: number, cameraX: number, cameraZ: number): void {
    const windSpeed = 3.5; // m/s
    const radius = 130;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += windSpeed * dt;

      // Wrap around camera
      if (c.position.x - cameraX > radius) {
        c.position.x -= radius * 2;
      } else if (c.position.x - cameraX < -radius) {
        c.position.x += radius * 2;
      }

      if (c.position.z - cameraZ > radius) {
        c.position.z -= radius * 2;
      } else if (c.position.z - cameraZ < -radius) {
        c.position.z += radius * 2;
      }
    }
  }

  public dispose(): void {
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
    this.clouds = [];
  }
}
