# IMPLEMENTATION_PLAN.md

Work ONE phase per conversation. Read only your phase. Each phase ends with: `npm run check` green → `PROGRESS.md` updated → commit `P<n>: <summary>` → stop and wait for "GO P<n+1>".
Perf numbers refer to **A15 mode** (see AGENTS.md). "Gate" = a measurement the user runs on the real phone.

## P0 — Bootstrap + skills (no gameplay)
**Goal:** clean repo, tooling, and all skills generated.
- Scaffold Vite + TS strict; deps: `three`, `@types/three`, `vitest`, `typescript`, `eslint` (minimal). Add `.gitignore`, `tsconfig`, folder layout from AGENTS.md.
- Scripts: `dev`, `build`, `test`, `typecheck`, `lint`, `check` (all of them + `scripts/check-budget.mjs`).
- `scripts/check-budget.mjs`: fail if gzipped main bundle > 250 KB (excl. lazy chunks) or `budget.ts` values exceed A15 limits.
- Create `src/config/budget.ts` (tiers from AGENTS.md) and `palette.ts` (tokens from `pastel-lowpoly-art` spec).
- Generate the 9 skills per `SKILLS.md` protocol + research cache. Create `PROGRESS.md`. `git init` + first commit.
**Accept:** `npm run check` passes · 9 SKILL.md files ≤ 80 lines each · `docs/research/` has a summary per researched skill · PROGRESS.md exists.

## P1 — Benchmark page (`/bench`) ★ GATE A
**Goal:** measure what the A15 can really do before designing anything.
- Separate entry `bench/index.html` (lazy, not in game bundle). Scene: noise terrain chunks, pooled InstancedMesh trees, pink fog, sky color, no shadows.
- Scenario ladder: pixel ratio {1.0, 1.25, 1.5} × fog far {60, 90, 130} × trees {500, 1500, 3000} × chunk ring {1, 2, 3}. Each: 2s warmup + 8s measure. Auto-run with `?auto=1`; manual picker otherwise.
- Record p50/p95/p99 frame ms, avg fps, draw calls, triangles, JS heap if available. Cheap overlay (update 2×/s).
- Heat test: 3 min at the recommended scenario, sample every 30s, report fps drop.
- Result card: pass/fail per tier (30fps: p95 ≤ 33ms · 60fps: p95 ≤ 16.7ms), recommended settings, "Copy JSON" button.
- Phone-friendly UI (big buttons, no scrolling while running).
**Accept:** runs on desktop Chrome without errors · JSON schema documented in the skill · `npm run check` green.
**★ Gate A (user):** run on the A15, send the JSON. Agent then updates `budget.ts` with measured values and records them in PROGRESS.md. No further phase starts before this.

## P2 — Engine core
**Goal:** a solid, boring foundation.
- `src/core/renderer.ts`: antialias off, `powerPreference: 'high-performance'`, pixel ratio clamp from tier, resize + orientation + safe-area handling, context-lost/restored.
- `src/core/loop.ts`: fixed-timestep sim (accumulator, max 5 steps), interpolated render, pause on hidden tab, optional 30fps cap.
- `src/core/quality.ts`: tiers from budget; pure `resolutionScaler(emaMs, current, cfg)` with hysteresis (unit tested); runtime auto-downgrade, never auto-upgrade within 30s.
**Accept:** scaler tests pass · rotating phone keeps correct aspect · no allocations in loop (verified by reading code and a 60s bench run with flat heap).

## P3 — World generation + streaming
**Goal:** endless deterministic terrain with no hitches.
- `src/world/noise.ts` (seed hash, value noise, fBm), `biomes.ts`, `heightAt(x,z)` shared by worker and player.
- Worker builds chunk typed arrays (positions/heights, vertex colors, normals or flat shading); main thread wraps in pooled BufferGeometry. Chunk 64m, 32×32 verts.
- `ChunkManager`: ring radius from tier, nearest-first, ≤ 1 geometry build/frame, cancel stale requests, hysteresis unload.
- Test world: free camera that glides forward.
**Accept:** determinism tests (same seed ⇒ same sample hash; different seed ⇒ different) · main-thread chunk build < 4 ms · tris ≤ 60k and terrain draw calls ≤ 25 in A15 mode · 60s fly-through shows p99 frame < 50 ms in `/bench`-style overlay.
**★ Gate B (user):** fly 2 minutes on the A15, report fps feel + overlay numbers.

## P4 — Look: sky, fog, water, props, day cycle
**Goal:** it looks like Dreamland.
- Sky gradient dome (1 draw), fog color synced to horizon, hemisphere light only.
- Water: one plane, cheap shimmer. Clouds: ≤ 10 small sprites.
- Props: pooled global InstancedMesh for trees (pink/mint/lilac canopies), flowers, rare Dreamhouse; placement by per-cell hash; all procedural geometry within tri budgets.
- Day → dusk → night cycle via uniforms (light + fog + sky lerp), 80s loop default, configurable.
**Accept:** total draw calls ≤ 60 · tris ≤ 60k · transparent sprites ≤ 10 · 60s p95 ≤ 33 ms on desktop throttled run; screenshot at three times of day saved to `docs/shots/`.
**★ Gate C (user):** A15 feel check + "does it look pretty?" review.

## P5 — First-person flight + mobile controls
**Goal:** it feels good to fly.
- Camera at bird eye height, level horizon, FOV 72, gentle bob, smoothed velocity, boost.
- Left joystick moves/steers, right drag looks, boost button; keyboard + pointer lock on desktop; optional tilt-to-look toggle (gyro).
- Altitude clamp: `y ≥ heightAt(x,z) + 2`. Soft world-feel: speed lines are OFF by default (perf).
- Prevent scroll, zoom, long-press menus; handle safe areas.
**Accept:** 2-finger use works (move + look) · no camera snap on pointer cancel · inputs don't allocate · `npm run check` green.
**★ Gate D (user):** comfort test on the A15 (nausea check: horizon, FOV, acceleration).

## P6 — Gameplay loop
**Goal:** a reason to explore.
- Collectible hearts (deterministic placement, shared seed, local collected set), pulse + sparkle burst (pooled Points), milestone toasts every 10.
- Menu: pick character skin (bird/butterfly/etc. as simple low-poly or emoji sprite fallback), world name input + 🎲, share link `#seed`.
- Photo mode: hide HUD, capture canvas to PNG (`preserveDrawingBuffer` only during capture), save/share via download or Web Share.
- HUD: hearts count, tiny compass, FPS toggle (hidden by default).
**Accept:** same seed ⇒ same heart positions on two devices · photo works on Android Chrome · budget still green.

## P7 — Multiplayer (Supabase Realtime)
**Goal:** see each other.
- Channel `room:<seed>`; Presence for join/leave; Broadcast `pos` at 10 Hz when moved; interpolation buffer 100–150 ms; remote bird mesh ≤ 150 tris; cap 2 players; reconnect + hidden-tab handling.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`.env.example` only; never commit real values).
- Offline/solo fallback if channel fails.
**Accept:** two browser tabs see each other · bandwidth ≈ 10 msgs/s/player · solo mode unaffected · no secrets in repo.
**★ Gate E (user):** you + her on real phones, 5 min session, report lag/rubber-banding.

## P8 — PWA, polish, deploy
- `vite-plugin-pwa`, manifest (theme `#ffd9ec`, maskable icon), fullscreen + landscape lock after user gesture, offline app shell.
- Vercel deploy, `vercel.json` immutable cache for hashed assets, README final pass.
- Final budget audit on A15 (heat test again). Add "Performance mode" toggle (30/60 fps).
**Accept:** installable on Android · offline loads menu · final `/bench` JSON stored in `docs/perf/final.json` · `npm run check` green.

## Backlog (not in v1)
Love notes/markers saved per world (Supabase table + RLS) · walking mode · weather · sound (small WebAudio loops) · more characters.
