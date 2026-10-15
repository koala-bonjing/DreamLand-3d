import * as THREE from 'three';
import { FlightControls } from './controls';
import { heightAt } from '../world/noise';

export class FlightCamera {
  public camera: THREE.PerspectiveCamera;
  public position = new THREE.Vector3(0, 16, 0);
  public velocity = new THREE.Vector3();
  public yaw = 0; // horizontal rotation
  public pitch = -0.15; // vertical rotation (slight downward tilt)

  private forwardDir = new THREE.Vector3();
  private rightDir = new THREE.Vector3();
  private targetVelocity = new THREE.Vector3();

  private baseSpeed = 16.0; // m/s
  private boostSpeed = 28.0; // m/s
  private bobTime = 0;

  constructor(camera: THREE.PerspectiveCamera, initialPos?: THREE.Vector3) {
    this.camera = camera;
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();

    if (initialPos) {
      this.position.copy(initialPos);
    }
  }

  public update(dt: number, controls: FlightControls, seed: number): void {
    controls.update();
    const look = controls.consumeLookDeltas();

    // 1. Update orientation
    this.yaw += look.yaw;
    this.pitch = Math.max(-0.95, Math.min(0.95, this.pitch + look.pitch)); // clamp [-55°, +55°]

    // Level horizon: zero roll!
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

    if (fwd !== 0 || strafe !== 0) {
      this.targetVelocity.addScaledVector(this.forwardDir, fwd * speed);
      this.targetVelocity.addScaledVector(this.rightDir, strafe * speed * 0.7);
    } else {
      // Natural forward glide if no inputs
      this.targetVelocity.addScaledVector(this.forwardDir, speed * 0.65);
    }

    // 3. Smooth velocity (inertia)
    const smoothFactor = Math.min(dt * 6.0, 1.0);
    this.velocity.lerp(this.targetVelocity, smoothFactor);

    // 4. Update position
    this.position.addScaledVector(this.velocity, dt);

    // 5. Altitude clamping (at least 2m above ground and 1.5m above water)
    const terrainY = heightAt(this.position.x, this.position.z, seed);
    const minAltitude = Math.max(terrainY + 2.0, 1.5);
    if (this.position.y < minAltitude) {
      this.position.y = minAltitude;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    // 6. Gentle bobbing
    this.bobTime += dt;
    const bobOffset = Math.sin(this.bobTime * 3.2) * 0.12;

    this.camera.position.set(
      this.position.x,
      this.position.y + bobOffset,
      this.position.z
    );

    // Look at target point ahead
    this.camera.lookAt(
      this.camera.position.x + this.forwardDir.x * 20,
      this.camera.position.y + this.forwardDir.y * 20,
      this.camera.position.z + this.forwardDir.z * 20
    );
  }
}
