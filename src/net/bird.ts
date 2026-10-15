import * as THREE from 'three';

export interface BirdSkinColors {
  body: number;
  wings: number;
  beak: number;
}

export const SKIN_PALETTES: Record<string, BirdSkinColors> = {
  dove: { body: 0xffffff, wings: 0xf5f0f5, beak: 0xffaa44 },
  flamingo: { body: 0xff85b3, wings: 0xff6699, beak: 0x331122 },
  finch: { body: 0xd9c2f5, wings: 0xbfa3e6, beak: 0xffcc33 },
  butterfly: { body: 0xb8f0c8, wings: 0xa0e6b5, beak: 0x55aa77 }
};

export class RemoteBird {
  public mesh: THREE.Group;
  private leftWing: THREE.Mesh;
  private rightWing: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private beakMesh: THREE.Mesh;

  private flapTime = 0;

  constructor(scene: THREE.Scene, skin = 'flamingo') {
    this.mesh = new THREE.Group();
    const colors = SKIN_PALETTES[skin] || SKIN_PALETTES.flamingo;

    // Body (low-poly cone/cylinder fuselage, ≤ 24 triangles)
    const bodyGeom = new THREE.ConeGeometry(0.55, 1.8, 6);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: colors.body, flatShading: true });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.mesh.add(this.bodyMesh);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.18, 0.5, 4);
    beakGeom.rotateX(-Math.PI / 2);
    beakGeom.translate(0, 0, 1.1);
    const beakMat = new THREE.MeshLambertMaterial({ color: colors.beak, flatShading: true });
    this.beakMesh = new THREE.Mesh(beakGeom, beakMat);
    this.mesh.add(this.beakMesh);

    // Wings (≤ 12 triangles each)
    const wingGeom = new THREE.ConeGeometry(0.7, 1.6, 3);
    wingGeom.rotateZ(Math.PI / 2);
    wingGeom.scale(1, 0.15, 1);
    const wingMat = new THREE.MeshLambertMaterial({ color: colors.wings, flatShading: true });

    this.leftWing = new THREE.Mesh(wingGeom, wingMat);
    this.leftWing.position.set(-0.8, 0.1, 0);
    this.mesh.add(this.leftWing);

    const rightWingGeom = wingGeom.clone();
    this.rightWing = new THREE.Mesh(rightWingGeom, wingMat);
    this.rightWing.position.set(0.8, 0.1, 0);
    this.mesh.add(this.rightWing);

    // Initial scale and visibility
    this.mesh.scale.setScalar(1.2);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public setSkin(skinId: string): void {
    const colors = SKIN_PALETTES[skinId] || SKIN_PALETTES.dove;
    (this.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(colors.body);
    (this.beakMesh.material as THREE.MeshLambertMaterial).color.setHex(colors.beak);
    (this.leftWing.material as THREE.MeshLambertMaterial).color.setHex(colors.wings);
    (this.rightWing.material as THREE.MeshLambertMaterial).color.setHex(colors.wings);
  }

  public update(dt: number, speed: number): void {
    if (!this.mesh.visible) return;

    // Flap wings faster when moving
    const flapFreq = 4.0 + Math.min(speed, 30.0) * 0.4;
    this.flapTime += dt * flapFreq;

    const angle = Math.sin(this.flapTime) * 0.45;
    this.leftWing.rotation.z = angle;
    this.rightWing.rotation.z = -angle;
  }

  public dispose(): void {
    this.bodyMesh.geometry.dispose();
    this.beakMesh.geometry.dispose();
    this.leftWing.geometry.dispose();
    this.rightWing.geometry.dispose();
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
