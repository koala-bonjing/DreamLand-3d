import * as THREE from 'three';

export class PlayableVoxelBird {
  public readonly group = new THREE.Group();
  private readonly bodyGroup = new THREE.Group();
  private readonly wingL = new THREE.Group();
  private readonly wingR = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly material: THREE.MeshLambertMaterial;
  private animTime = 0;

  constructor() {
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    const makeVoxelBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      hex: number
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(x, y, z);
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const c = new THREE.Color(hex);
      for (let i = 0; i < count; i++) {
        const ny = geo.attributes.normal.getY(i);
        const shade = ny > 0.5 ? 1.06 : ny < -0.5 ? 0.82 : 0.94;
        colors[i * 3] = Math.min(1, c.r * shade);
        colors[i * 3 + 1] = Math.min(1, c.g * shade);
        colors[i * 3 + 2] = Math.min(1, c.b * shade);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.geometries.push(geo);
      return new THREE.Mesh(geo, this.material);
    };

    // Torso & Soft Pastel Belly
    this.bodyGroup.add(makeVoxelBox(0.65, 0.5, 0.95, 0, 0, 0, 0xff85c0)); // Rose Pink Body
    this.bodyGroup.add(makeVoxelBox(0.55, 0.2, 0.8, 0, -0.2, 0, 0xfff0f8)); // Cream-White Belly

    // Head, Cheeks, Beak & Little Golden Crown/Crest
    this.bodyGroup.add(makeVoxelBox(0.52, 0.48, 0.52, 0, 0.38, -0.38, 0xffa6d2)); // Head
    this.bodyGroup.add(makeVoxelBox(0.18, 0.14, 0.28, 0, 0.32, -0.72, 0xffe66d)); // Golden Beak
    this.bodyGroup.add(makeVoxelBox(0.16, 0.2, 0.16, 0, 0.68, -0.35, 0xffe66d)); // Crown Crest
    this.bodyGroup.add(makeVoxelBox(0.56, 0.12, 0.12, 0, 0.42, -0.46, 0x2b1b28)); // Eyes bar
    this.bodyGroup.add(makeVoxelBox(0.6, 0.1, 0.14, 0, 0.3, -0.44, 0xff4da6)); // Rosy Blush Cheeks

    // Articulated Left Wing
    this.wingL.position.set(-0.32, 0.12, -0.05);
    this.wingL.add(makeVoxelBox(0.75, 0.12, 0.65, -0.38, 0, 0, 0xffadd6));
    this.wingL.add(makeVoxelBox(0.45, 0.1, 0.45, -0.82, 0, 0.05, 0xffffff)); // Wingtip feathers

    // Articulated Right Wing
    this.wingR.position.set(0.32, 0.12, -0.05);
    this.wingR.add(makeVoxelBox(0.75, 0.12, 0.65, 0.38, 0, 0, 0xffadd6));
    this.wingR.add(makeVoxelBox(0.45, 0.1, 0.45, 0.82, 0, 0.05, 0xffffff)); // Wingtip feathers

    // Tail Feathers
    this.tail.position.set(0, 0.05, 0.48);
    this.tail.add(makeVoxelBox(0.45, 0.12, 0.45, 0, 0, 0.2, 0xc8a2ff));
    this.tail.add(makeVoxelBox(0.3, 0.1, 0.3, 0, 0.04, 0.45, 0xffe66d));

    this.bodyGroup.add(this.wingL, this.wingR, this.tail);
    this.group.add(this.bodyGroup);
  }

  public updateAnimation(
    dt: number,
    horizontalSpeed: number,
    verticalVelocity: number,
    turnRate: number,
    isGrounded: boolean
  ): void {
    this.animTime += dt;

    if (isGrounded) {
      // Fold wings neatly when perched on a voxel block
      this.wingL.rotation.z = THREE.MathUtils.lerp(this.wingL.rotation.z, -0.65, dt * 10);
      this.wingR.rotation.z = THREE.MathUtils.lerp(this.wingR.rotation.z, 0.65, dt * 10);
      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, 0, dt * 10);
      this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, 0, dt * 10);

      // Cute hopping bob when moving on the ground
      if (horizontalSpeed > 0.5) {
        this.bodyGroup.position.y = Math.abs(Math.sin(this.animTime * 12)) * 0.18;
      } else {
        this.bodyGroup.position.y = Math.sin(this.animTime * 2.5) * 0.03; // Gentle breathing idle
      }
    } else {
      // Flying: Flap faster when climbing, glide smoothly when descending
      const isGliding = verticalVelocity < -0.5;
      const flapFreq = verticalVelocity > 0.5 ? 16 : isGliding ? 3 : 10;
      const flapAmp = isGliding ? 0.15 : 0.75;
      const flapAngle = Math.sin(this.animTime * flapFreq) * flapAmp;

      this.wingL.rotation.z = flapAngle;
      this.wingR.rotation.z = -flapAngle;

      // Bank into turns (Roll) & Pitch with climb/dive
      const targetRoll = THREE.MathUtils.clamp(-turnRate * 0.45, -0.65, 0.65);
      const targetPitch = THREE.MathUtils.clamp(verticalVelocity * 0.06, -0.5, 0.5);

      this.bodyGroup.rotation.z = THREE.MathUtils.lerp(this.bodyGroup.rotation.z, targetRoll, dt * 8);
      this.bodyGroup.rotation.x = THREE.MathUtils.lerp(this.bodyGroup.rotation.x, targetPitch, dt * 8);
      this.bodyGroup.position.y = Math.cos(this.animTime * flapFreq) * 0.06;
      this.tail.rotation.x = -targetPitch * 0.5 + Math.sin(this.animTime * 6) * 0.08;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    this.material.dispose();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
