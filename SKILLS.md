# SKILLS.md — skills this project needs

Skills are on-demand knowledge packs. Only the `name` + `description` sit in context; the body loads when a task matches. That is the token saver: keep AGENTS.md tiny, put procedures here.

**Location:** `.agents/skills/<name>/SKILL.md` (current Antigravity). If your Antigravity build does not see them, use `.agent/skills/<name>/SKILL.md` instead. Optional extras go in `<name>/references/*.md`, loaded only when needed.

## Generation protocol (Phase 0, then on demand)
For each skill below:
1. Check `docs/research/` for a cached summary. If present, skip to step 3.
2. Fetch at most 3 pages from the allowed sources (listed per skill). Save a 15–30 line summary to `docs/research/<skill>.md` with URL + date.
3. Write `SKILL.md` from the template. Use the `description` given here verbatim (it is the trigger; edit only to sharpen). Fill the body from the research and the "must contain" list.
4. Self-check: body ≤ 80 lines, ≥ 1 concrete number or checklist, ≤ 3 snippets of ≤ 15 lines each, no copied doc prose.
5. Never inline long research into chat. If a task needs knowledge no skill covers, create ONE new skill with this protocol (max 1 per phase) and note it in `PROGRESS.md`.

**Allowed sources only:** threejs.org (manual, docs), developer.mozilla.org, web.dev, vite.dev, vitest.dev, vite-pwa-org.netlify.app, supabase.com/docs, vercel.com/docs, antigravity.google/docs. Prefer official examples over blog posts. If a source contradicts a skill, the source wins: update the skill.

## Template
```
---
name: <kebab-case>
description: <what it does + when to use; pushy, lists trigger words; <= 300 chars>
---
# <Title>
## Rules        (numbered, imperative, <= 12)
## Snippets     (<= 3, <= 15 lines each, tested)
## Pitfalls     (what broke before / what to avoid)
## Sources      (url + date)
```

## Skill specs

### 1. `threejs-mobile-perf` (Phases 1–8)
**description:** Performance rules for Three.js on low-end Android (Mali GPUs). Use whenever creating or changing the renderer, materials, meshes, lights, fog, sprites, or anything affecting frame time, draw calls, triangles, or memory.
**Must contain:** pixel-ratio clamp + dynamic resolution (EMA frame time, hysteresis, min/max scale); antialias false; no shadows/post; fog as draw-distance tool; vertex colors; shared materials; InstancedMesh with pooled capacity; frustum culling; `renderer.info` reading; dispose checklist; transparent-overdraw warning for Mali; no per-frame allocations; `powerPreference`; context-lost handling.
**Research:** threejs.org manual (disposal, InstancedMesh, WebGLRenderer), MDN WebGL best practices.

### 2. `perf-benchmark-harness` (Phase 1, then every gate)
**description:** How to measure frame time and quality tiers. Use when building or running the /bench page, setting budget.ts, doing a phase perf gate, or whenever the user reports lag, stutter, or heat.
**Must contain:** warmup 2s + measure 8s per scenario; record p50/p95/p99 frame ms, fps, `renderer.info` draw calls/triangles; scenario ladder (scale × fog × trees × chunk ring); sustained heat test (3 min, sample every 30s); result JSON schema; pass rule (30fps tier: p95 ≤ 33ms; 60fps tier: p95 ≤ 16.7ms); tier auto-detect; on-screen overlay that is cheap (update 2×/s).
**Research:** MDN `requestAnimationFrame`, `performance.now`, Three.js `renderer.info`.

### 3. `procedural-terrain-noise` (Phase 3)
**description:** Seeded deterministic terrain, noise, and biomes. Use when touching worldgen, heightmaps, biomes, seeds, prop placement, or anything that must look identical on two phones.
**Must contain:** string → 32-bit seed hash; integer-hash value noise (no Math.random); 3-octave fBm; height → biome thresholds (deep water, water, sand, pink meadow, mint grass, lilac hills, pearl peaks); moisture layer; prop placement via per-cell hash; determinism test pattern (same seed → same hash of a heightmap sample; different seed differs); `heightAt(x,z)` shared by worker and player (used for altitude clamp).
**Research:** none required beyond own notes; optionally MDN typed arrays.

### 4. `chunk-streaming-worker` (Phases 3–4)
**description:** Chunked world streaming with a Web Worker. Use when adding or changing chunk loading, ring updates, worker messages, geometry building, buffer pooling, or when movement causes hitches.
**Must contain:** chunk = 64m, 32×32 verts (≈1.9k tris); ring radius from budget; load order nearest-first; ≤ 1 chunk geometry build per frame; worker request/response protocol with `requestId` + cancel stale; transferable typed arrays (`postMessage(buf,[buf.buffer])`); buffer pool; pooled global InstancedMesh for props (NOT per-chunk meshes); hysteresis on unload; dispose rules.
**Research:** MDN Web Workers + transferable objects, Vite worker import syntax (`new Worker(new URL(...), {type:'module'})`).

### 5. `pastel-lowpoly-art` (Phase 4)
**description:** Art direction and procedural assets for the pink pastel low-poly look. Use when creating colors, sky, fog, water, trees, flowers, houses, hearts, clouds, or the bird model.
**Must contain:** palette tokens (grass `#b8f0c8`, pink meadow `#ffd1e6`, hills `#d9c2f5`, peaks `#fff0fa`, water `#9fdcf7`, sand `#fde8c9`, fog `#ffd9ec`, heart `#ff3d97`); flat shading; all assets procedural (no external models/textures); tri budgets (tree ≤ 40, flower ≤ 8, dreamhouse ≤ 80, bird ≤ 150); sky gradient dome shader; water as one plane with cheap vertex wave or color shimmer; cloud sprites generated on a small canvas; day/dusk/night via uniforms (light + fog color lerp).
**Research:** threejs.org docs for ShaderMaterial, Fog, Sprite.

### 6. `mobile-controls-fp-camera` (Phase 5)
**description:** First-person flight camera and mobile controls. Use when handling touch, joystick, look, gyro, keyboard/mouse, camera smoothing, boost, altitude clamping, or motion comfort.
**Must contain:** Pointer Events with `touch-action:none`, multi-touch pointer ids; left joystick / right look split; deadzone 0.12; smoothed velocity; horizon always level (no roll), FOV 70–75; altitude = max(terrain height + 2m, current); gyro via `DeviceOrientationEvent` (permission pattern for iOS, optional on Android); pointer lock for desktop; safe-area insets; prevent page scroll/zoom.
**Research:** MDN Pointer Events, DeviceOrientationEvent, Pointer Lock API.

### 7. `supabase-realtime-presence` (Phase 7)
**description:** Two-player live presence with Supabase Realtime. Use when adding multiplayer, rooms, remote birds, interpolation, reconnects, or any Supabase client code.
**Must contain:** channel `room:<seed>`; Broadcast `pos` {x,y,z,yaw,t} at 10 Hz only when changed; Presence for join/leave; max 2 players (client-side cap); interpolation buffer 100–150 ms; hidden-tab and reconnect handling; anon key via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; no DB writes in v1; never commit secrets.
**Research:** supabase.com/docs Realtime Broadcast + Presence.

### 8. `pwa-android-deploy` (Phase 8)
**description:** PWA, fullscreen, and Vercel deploy for Android. Use when adding manifest, service worker, install prompt, orientation or fullscreen behavior, caching headers, or deployment.
**Must contain:** `vite-plugin-pwa` config (autoUpdate, precache app shell), manifest (standalone/fullscreen, theme `#ffd9ec`, maskable icon), Fullscreen API + `screen.orientation.lock` only after a user gesture and fullscreen, offline smoke test, Vercel `vercel.json` immutable cache for hashed assets, preview-URL phone test.
**Research:** vite-pwa-org docs, MDN Screen Orientation, vercel.com/docs.

### 9. `token-thrifty-workflow` (always)
**description:** How to work cheaply in this repo. Use at the start of every session, phase start/end, before researching anything, and whenever a reply is getting long.
**Must contain:** AGENTS.md token rules in checklist form; PROGRESS.md update recipe; phase-end commit message format `P<n>: <summary>`; grep-first reading; "no screenshot loops"; research-cache lookup before any web fetch; when to start a fresh conversation (every phase, or after ~40 turns).
**Research:** antigravity.google/docs (skills, rules) for current file locations.

## Which skills to load per phase
P0 `token-thrifty-workflow` · P1 `perf-benchmark-harness`, `threejs-mobile-perf` · P2 `threejs-mobile-perf` · P3 `procedural-terrain-noise`, `chunk-streaming-worker` · P4 `pastel-lowpoly-art`, `threejs-mobile-perf` · P5 `mobile-controls-fp-camera` · P6 `pastel-lowpoly-art` · P7 `supabase-realtime-presence` · P8 `pwa-android-deploy`.
