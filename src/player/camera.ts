import * as THREE from 'three';
import { FlightControls } from './controls';
import { heightAt } from '../world/noise';
import { PlayableVoxelBird } from './birdAvatar';

export class FlightCamera {
  public camera: THREE.PerspectiveCamera;
  public bird: PlayableVoxelBird;
  public position = new THREE.Vector3(0, 16, 0);
  public velocity = new THREE.Vector3();
  public yaw = 0; // horizontal rotation
  public pitch = -0.15; // vertical rotation (slight downward tilt)

  private forwardDir = new THREE.Vector3();
  private rightDir = new THREE.Vector3();
  private targetVelocity = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  private baseSpeed = 16.0; // m/s
  private boostSpeed = 28.0; // m/s
  private bobTime = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    initialPos?: THREE.Vector3,
    bird?: PlayableVoxelBird
  ) {
    this.camera = camera;
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();

    this.bird = bird ?? new PlayableVoxelBird();

    if (initialPos) {
      this.position.copy(initialPos);
    }

    // Initialize camera position behind bird
    this.camera.position.set(this.position.x, this.position.y + 2.2, this.position.z - 6.5);
  }

  public update(dt: number, controls: FlightControls, seed: number): void {
    controls.update();
    const look = controls.consumeLookDeltas();

    // 1. Update orientation
    const turnSteer = controls.state.strafe * dt * 1.5;
    this.yaw += look.yaw - turnSteer;
    this.pitch = Math.max(-0.95, Math.min(0.95, this.pitch + look.pitch));

    const turnRate = (look.yaw - turnSteer) / Math.max(dt, 0.001);

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);

    this.forwardDir.set(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch).normalize();
    this.rightDir.set(cosYaw, 0, -sinYaw).normalize();

    // 2. Compute target velocity
    const speed = controls.state.boost ? this.boostSpeed : this.baseSpeed;
    const fwd = controls.state.forward;
    const strafe = controls.state.strafe;

    this.targetVelocity.set(0, 0, 0);

    if (controls.isGrounded) {
      // Perched / Hopping mode on voxel terrain blocks
      if (controls.state.ascend) {
        // Flap upward to launch into flight
        controls.isGrounded = false;
        this.targetVelocity.y = 10.0;
        this.targetVelocity.addScaledVector(this.forwardDir, speed * 0.7);
      } else if (fwd !== 0 || strafe !== 0) {
        // Cute hopping walk
        const hopSpeed = 6.0;
        this.targetVelocity.addScaledVector(this.forwardDir, fwd * hopSpeed);
        this.targetVelocity.addScaledVector(this.rightDir, strafe * hopSpeed * 0.8);
      }
    } else {
      // Flying mode
      if (fwd !== 0 || strafe !== 0) {
        this.targetVelocity.addScaledVector(this.forwardDir, fwd * speed);
        this.targetVelocity.addScaledVector(this.rightDir, strafe * speed * 0.7);
      } else {
        // Natural forward glide if no inputs
        this.targetVelocity.addScaledVector(this.forwardDir, speed * 0.65);
      }

      // Vertical lift / flap upward
      if (controls.state.ascend) {
        this.targetVelocity.y += 9.0;
      }
      // Swoop / dive downward
      if (controls.state.descend) {
        this.targetVelocity.y -= 8.5;
      }
    }

    // 3. Smooth velocity (inertia)
    const smoothFactor = Math.min(dt * 6.0, 1.0);
    this.velocity.lerp(this.targetVelocity, smoothFactor);

    // 4. Update position
    this.position.addScaledVector(this.velocity, dt);

    // 5. Terrain Collision & Landing: never clip below terrainHeight + 0.6 and at least 1.5m
    const terrainY = heightAt(this.position.x, this.position.z, seed);
    const minGroundY = Math.max(terrainY + 0.6, 1.5);

    if (this.position.y <= minGroundY) {
      this.position.y = minGroundY;
      if (!controls.state.ascend) {
        controls.isGrounded = true;
        if (this.velocity.y < 0) this.velocity.y = 0;
      }
    } else if (controls.isGrounded && !controls.state.ascend) {
      // If grounded and ledge drops below, resume flight
      if (terrainY < this.position.y - 1.6) {
        controls.isGrounded = false;
      } else {
        this.position.y = minGroundY;
      }
    }

    // 6. Update Playable Voxel Bird Avatar
    this.bird.group.position.copy(this.position);
    this.bird.group.rotation.y = this.yaw + Math.PI;

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.bird.updateAnimation(dt, horizSpeed, this.velocity.y, turnRate, controls.isGrounded);

    // 7. 3rd-Person Chase Camera: 6.5 units back, 2.2 units up with spring damping
    const backDist = 6.5;
    const upDist = 2.2;
    const targetCamX = this.position.x - sinYaw * backDist;
    const targetCamZ = this.position.z - cosYaw * backDist;
    let targetCamY = this.position.y + upDist;

    // Prevent camera from clipping through voxel terrain
    const camTerrainY = heightAt(targetCamX, targetCamZ, seed);
    if (targetCamY < camTerrainY + 1.2) {
      targetCamY = camTerrainY + 1.2;
    }

    // Frame-rate independent spring damping
    const damp = 1 - Math.exp(-10 * dt);
    this.camera.position.x += (targetCamX - this.camera.position.x) * damp;
    this.camera.position.y += (targetCamY - this.camera.position.y) * damp;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * damp;

    // Gentle camera breathing bob
    this.bobTime += dt;
    this.camera.position.y += Math.sin(this.bobTime * 2.5) * 0.04;

    // Camera looks slightly above bird center
    this.lookTarget.set(this.position.x, this.position.y + 0.6, this.position.z);
    this.camera.lookAt(this.lookTarget);
  }

  public dispose(): void {
    this.bird.dispose();
  }
}
