import * as THREE from 'three';
import { PALETTE } from '../config/palette';

const waterVertexShader = `
uniform float uTime;
varying vec3 vWorldPos;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  // Subtle procedural low-frequency wave shimmer
  float wave = sin(wp.x * 0.15 + uTime * 1.8) * cos(wp.z * 0.15 + uTime * 1.2) * 0.22;
  wp.y += wave;
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const waterFragmentShader = `
uniform vec3 uColor;
uniform vec3 uShimmerColor;
uniform float uTime;
varying vec3 vWorldPos;

void main() {
  float shimmer = sin(vWorldPos.x * 0.3 + uTime * 2.0) * cos(vWorldPos.z * 0.3 + uTime * 2.0);
  float factor = clamp(shimmer * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uColor, uShimmerColor, factor * 0.35);
  gl_FragColor = vec4(col, 0.88);
}
`;

export class WaterPlane {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, size = 300) {
    // 24x24 segments = lightweight low-poly wave plane
    const geometry = new THREE.PlaneGeometry(size, size, 24, 24);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.water) },
        uShimmerColor: { value: new THREE.Color(0xbfeeff) }
      },
      transparent: true,
      depthWrite: true
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = -0.3; // Just below sand shoreline
    scene.add(this.mesh);
  }

  public update(dt: number, cameraX: number, cameraZ: number): void {
    this.material.uniforms.uTime.value += dt;
    // Follow camera smoothly in x and z
    this.mesh.position.x = cameraX;
    this.mesh.position.z = cameraZ;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
