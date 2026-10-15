import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import * as THREE from 'three';
import { RemoteBird } from './bird';

export interface PlayerTransform {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  skin: string;
  t: number;
}

export class TransformInterpolator {
  private buffer: PlayerTransform[] = [];
  private readonly delayMs = 120; // 120ms buffer for 10Hz network updates

  public push(t: PlayerTransform): void {
    this.buffer.push(t);
    // Keep last 15 samples
    if (this.buffer.length > 15) {
      this.buffer.shift();
    }
  }

  public sample(renderTime: number, outPos: THREE.Vector3): { yaw: number; pitch: number; speed: number } | null {
    if (this.buffer.length === 0) return null;

    const targetTime = renderTime - this.delayMs;

    // Find two bounding frames
    let p0 = this.buffer[0];
    let p1 = this.buffer[this.buffer.length - 1];

    if (targetTime <= p0.t) {
      outPos.set(p0.x, p0.y, p0.z);
      return { yaw: p0.yaw, pitch: p0.pitch, speed: 0 };
    }

    if (targetTime >= p1.t) {
      outPos.set(p1.x, p1.y, p1.z);
      return { yaw: p1.yaw, pitch: p1.pitch, speed: 0 };
    }

    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].t <= targetTime && this.buffer[i + 1].t >= targetTime) {
        p0 = this.buffer[i];
        p1 = this.buffer[i + 1];
        break;
      }
    }

    const span = p1.t - p0.t;
    const factor = span > 0 ? Math.min(Math.max((targetTime - p0.t) / span, 0), 1) : 0;

    outPos.set(
      p0.x + (p1.x - p0.x) * factor,
      p0.y + (p1.y - p0.y) * factor,
      p0.z + (p1.z - p0.z) * factor
    );

    // Shortest-path yaw lerp
    let dyaw = p1.yaw - p0.yaw;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    const yaw = p0.yaw + dyaw * factor;
    const pitch = p0.pitch + (p1.pitch - p0.pitch) * factor;

    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    const speed = span > 0 ? (dist / span) * 1000 : 0;

    return { yaw, pitch, speed };
  }
}

export class RealtimeManager {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private interpolator = new TransformInterpolator();
  public remoteBird: RemoteBird;

  private lastBroadcastTime = 0;
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private lastYaw = 0;
  private isConnected = false;
  private isPeerPresent = false;
  private currentSkin = 'dove';

  public onPeerStatusChange?: (present: boolean) => void;

  constructor(scene: THREE.Scene, initialSkin = 'dove') {
    this.currentSkin = initialSkin;
    this.remoteBird = new RemoteBird(scene, initialSkin);

    const env = import.meta.env as Record<string, string | undefined>;
    const url = env.VITE_SUPABASE_URL || env.VITE_PUBLIC_SUPABASE_URL || env.VITE_STORAGE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_PUBLIC_SUPABASE_ANON_KEY || env.VITE_STORAGE_ANON_KEY;

    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key);
      } catch (err) {
        console.warn('[Realtime] Supabase init skipped (solo mode):', err);
      }
    }
  }

  public joinRoom(roomSeed: string, playerSkin: string): void {
    this.currentSkin = playerSkin;
    if (!this.client) return;

    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    const topic = `room:${roomSeed}`;
    this.channel = this.client.channel(topic, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: `player_${Math.random().toString(36).substring(2, 7)}` }
      }
    });

    // Listen for peer movement
    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const transform = payload as PlayerTransform;
      this.interpolator.push(transform);
      if (transform.skin) {
        this.remoteBird.setSkin(transform.skin);
      }
      if (!this.isPeerPresent) {
        this.isPeerPresent = true;
        this.remoteBird.mesh.visible = true;
        this.onPeerStatusChange?.(true);
      }
    });

    // Presence join/leave
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel?.presenceState();
      const count = state ? Object.keys(state).length : 0;
      this.isPeerPresent = count > 1;
      this.remoteBird.mesh.visible = this.isPeerPresent;
      this.onPeerStatusChange?.(this.isPeerPresent);
    });

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.isConnected = true;
        await this.channel?.track({ online: true, skin: this.currentSkin });
      }
    });
  }

  public updatePlayer(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    now: number
  ): void {
    if (!this.channel || !this.isConnected) return;
    if (document.visibilityState === 'hidden') return;

    // 10 Hz rate limiter (every 100ms)
    if (now - this.lastBroadcastTime < 100) return;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dz = z - this.lastZ;
    const dyaw = yaw - this.lastYaw;

    // Send only if moved or rotated
    if (dx * dx + dy * dy + dz * dz > 0.04 || Math.abs(dyaw) > 0.02) {
      this.lastBroadcastTime = now;
      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;
      this.lastYaw = yaw;

      const payload: PlayerTransform = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        z: Number(z.toFixed(2)),
        yaw: Number(yaw.toFixed(3)),
        pitch: Number(pitch.toFixed(3)),
        skin: this.currentSkin,
        t: now
      };

      this.channel.send({
        type: 'broadcast',
        event: 'pos',
        payload
      }).catch(() => {});
    }
  }

  public update(dt: number, now: number): void {
    if (!this.remoteBird.mesh.visible) return;

    const dummyPos = this.remoteBird.mesh.position;
    const sample = this.interpolator.sample(now, dummyPos);

    if (sample) {
      this.remoteBird.mesh.rotation.set(sample.pitch, sample.yaw, 0);
      this.remoteBird.update(dt, sample.speed);
    }
  }

  public dispose(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.remoteBird.dispose();
  }
}
