import * as THREE from 'three';
import { PALETTE } from '../config/palette';

export interface DayCycleColors {
  skyZenith: THREE.Color;
  skyHorizon: THREE.Color;
  fogColor: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  dirColor: THREE.Color;
  dirIntensity: number;
}

export class DayCycle {
  public cycleDuration = 80; // seconds for full 24h day loop
  private time = 0; // [0, cycleDuration)

  // Pre-allocated colors to avoid per-frame allocations
  private dayZenith = new THREE.Color(PALETTE.skyZenithDay);
  private dayHorizon = new THREE.Color(PALETTE.skyHorizonDay);
  private duskZenith = new THREE.Color(PALETTE.skyZenithDusk);
  private duskHorizon = new THREE.Color(PALETTE.skyHorizonDusk);
  private nightZenith = new THREE.Color(PALETTE.skyZenithNight);
  private nightHorizon = new THREE.Color(PALETTE.skyHorizonNight);

  private dayHemiGround = new THREE.Color(PALETTE.grass);
  private nightHemiGround = new THREE.Color(0x1a2420);

  public current: DayCycleColors = {
    skyZenith: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    fogColor: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    dirColor: new THREE.Color(),
    dirIntensity: 0.8
  };

  constructor(initialTime = 15) {
    this.time = initialTime;
    this.update(0);
  }

  public setTime(seconds: number): void {
    this.time = ((seconds % this.cycleDuration) + this.cycleDuration) % this.cycleDuration;
    this.update(0);
  }

  public getTime(): number {
    return this.time;
  }

  public getProgress(): number {
    return this.time / this.cycleDuration;
  }

  public update(dt: number): void {
    this.time = (this.time + dt) % this.cycleDuration;
    const progress = this.time / this.cycleDuration; // [0, 1)

    // Phase breakdown:
    // 0.0 - 0.45: Day
    // 0.45 - 0.55: Sunset / Dusk
    // 0.55 - 0.90: Night
    // 0.90 - 1.00: Sunrise / Dawn

    if (progress < 0.45) {
      // Full Day
      this.current.skyZenith.copy(this.dayZenith);
      this.current.skyHorizon.copy(this.dayHorizon);
      this.current.fogColor.copy(this.dayHorizon);
      this.current.hemiSky.copy(this.dayZenith);
      this.current.hemiGround.copy(this.dayHemiGround);
      this.current.dirColor.setHex(0xfff5ea);
      this.current.dirIntensity = 0.8;
    } else if (progress < 0.55) {
      // Day -> Dusk
      const t = (progress - 0.45) / 0.10;
      this.current.skyZenith.lerpColors(this.dayZenith, this.duskZenith, t);
      this.current.skyHorizon.lerpColors(this.dayHorizon, this.duskHorizon, t);
      this.current.fogColor.copy(this.current.skyHorizon);
      this.current.hemiSky.lerpColors(this.dayZenith, this.duskZenith, t);
      this.current.hemiGround.lerpColors(this.dayHemiGround, this.nightHemiGround, t * 0.5);
      this.current.dirColor.setHex(0xfda57d);
      this.current.dirIntensity = 0.8 * (1 - t * 0.4);
    } else if (progress < 0.65) {
      // Dusk -> Night
      const t = (progress - 0.55) / 0.10;
      this.current.skyZenith.lerpColors(this.duskZenith, this.nightZenith, t);
      this.current.skyHorizon.lerpColors(this.duskHorizon, this.nightHorizon, t);
      this.current.fogColor.copy(this.current.skyHorizon);
      this.current.hemiSky.lerpColors(this.duskZenith, this.nightZenith, t);
      this.current.hemiGround.lerpColors(this.nightHemiGround, this.nightHemiGround, 1);
      this.current.dirColor.setHex(0xa39bf0);
      this.current.dirIntensity = 0.48 * (1 - t) + 0.2 * t;
    } else if (progress < 0.90) {
      // Full Night
      this.current.skyZenith.copy(this.nightZenith);
      this.current.skyHorizon.copy(this.nightHorizon);
      this.current.fogColor.copy(this.nightHorizon);
      this.current.hemiSky.copy(this.nightZenith);
      this.current.hemiGround.copy(this.nightHemiGround);
      this.current.dirColor.setHex(0x8a84d4);
      this.current.dirIntensity = 0.2;
    } else {
      // Night -> Sunrise -> Day
      const t = (progress - 0.90) / 0.10;
      this.current.skyZenith.lerpColors(this.nightZenith, this.dayZenith, t);
      this.current.skyHorizon.lerpColors(this.nightHorizon, this.dayHorizon, t);
      this.current.fogColor.copy(this.current.skyHorizon);
      this.current.hemiSky.lerpColors(this.nightZenith, this.dayZenith, t);
      this.current.hemiGround.lerpColors(this.nightHemiGround, this.dayHemiGround, t);
      this.current.dirColor.setHex(0xfff5ea);
      this.current.dirIntensity = 0.2 + t * 0.6;
    }
  }
}
