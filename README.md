# Dreamland 3D 🦩

A cozy 3D first-person exploring game for two. Fly over an endless, procedurally generated pastel-pink world, collect hearts, take photos, and (later) see each other live. Built to run smoothly on a budget Android phone (Samsung Galaxy A15 is the floor device).

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck + lint + test + build + perf-budget check
```
Benchmark page: `/bench` (see below).

## Test on the real phone (do this early and often)
1. Same Wi-Fi: `npm run dev -- --host`, open the LAN URL on the phone.
2. Or push to Vercel and open the preview URL.
3. Live profiling: enable USB debugging on the phone, open `chrome://inspect` on the PC.

## Benchmark (`/bench`)
Runs a ladder of scenes (terrain chunks, instanced trees, fog) at several quality levels and reports p50/p95 frame time, FPS, draw calls, and triangles. Optional 3-minute heat test shows thermal throttling. Copy the JSON result and use it to set `src/config/budget.ts`.
URL params: `?scale=1.25&fog=90&trees=3000&auto=1`

## Project structure
See the layout block in `AGENTS.md`. Plan and status: `IMPLEMENTATION_PLAN.md`, `PROGRESS.md`.

## Same world, two phones
The world is generated from a text seed. Enter the same world name on both phones to explore the same place. Live presence (seeing each other) arrives in Phase 7 via Supabase Realtime.

## Controls
- Phone: left thumb moves, right thumb looks, 💨 boosts. Optional tilt-to-look.
- Desktop: WASD + mouse (click to lock pointer), Space boosts.

## Roadmap
P0 bootstrap · P1 benchmark · P2 engine core · P3 world streaming · P4 look · P5 flight and controls · P6 gameplay · P7 multiplayer · P8 PWA and deploy.

## Working with AI agents
Rules: `AGENTS.md` (always loaded) · Skills: `SKILLS.md` + `.agents/skills/` (loaded on demand). The setup is designed to save tokens: small always-on rules, one phase per conversation, cached research in `docs/research/`.
