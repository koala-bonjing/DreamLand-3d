# Supabase Realtime Broadcast & Presence Research
Date: 2026-10-15
Sources:
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/presence

Key Findings:
1. Supabase Realtime Broadcast provides low-latency peer messaging over WebSockets without database writes.
2. Room channels are identified by topic: `room:<worldSeed>`.
3. Broadcast player position `{ x, y, z, yaw, t }` throttled to 10 Hz (every 100ms) only when position/yaw changes.
4. Remote client interpolation buffer of 100–150ms masks network jitter and packet arrival gaps.
5. Realtime Presence tracks active room members; room logic rejects connections exceeding 2 players.
6. When document is hidden (`document.visibilityState === 'hidden'`), pause broadcasts and track presence accordingly.
7. Reconnection logic should gracefully handle mobile cellular/Wi-Fi transitions.
8. Environment credentials `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided through `.env` and must never be committed to git.
