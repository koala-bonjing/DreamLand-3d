---
name: supabase-realtime-presence
description: Two-player live presence with Supabase Realtime. Use when adding multiplayer, rooms, remote birds, interpolation, reconnects, or any Supabase client code.
---
# Supabase Realtime Presence

## Rules
1. Subscribe to channel `room:<seed>` to automatically partition worlds by seed.
2. Broadcast player transform `{ x, y, z, yaw, t }` at max 10 Hz and only when transformed.
3. Use Realtime Presence to track peers; enforce client-side limit of 2 players maximum.
4. Smooth remote bird movement with an interpolation buffer of 100–150ms.
5. Pause state broadcasts and mark player inactive when tab visibility is hidden.
6. Handle disconnects and reconnects automatically without crashing the local simulation.
7. Credentials must come from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never hardcode or commit secrets.
8. No database writes or row mutations in v1; use purely transient WebSockets.
9. Keep remote player mesh low-poly (≤ 150 triangles).

## Snippets

### Position Broadcast Throttler
```ts
export class TransformBroadcaster {
  private lastTime = 0;
  shouldSend(now: number, changed: boolean): boolean {
    if (!changed) return false;
    if (now - this.lastTime >= 100) {
      this.lastTime = now;
      return true;
    }
    return false;
  }
}
```

### Interpolation Buffer Sample
```ts
export function interpolate(p0: THREE.Vector3, p1: THREE.Vector3, factor: number, out: THREE.Vector3): void {
  out.lerpVectors(p0, p1, Math.min(Math.max(factor, 0), 1));
}
```

## Pitfalls
- Broadcasting on every animation frame saturates mobile network buffers and triggers lag.
- Committing real Supabase service/anon keys to git leaks project credentials.

## Sources
- https://supabase.com/docs/guides/realtime/broadcast (2026-10-15)
- https://supabase.com/docs/guides/realtime/presence (2026-10-15)
