# Dreamland 3D 🌸🕊️

A cozy 3D first-person flying and exploring game for two. Fly over an endless, procedurally generated pastel-pink low-poly world, collect hearts, take photos, and see each other live via Supabase Realtime. Built and calibrated for budget Android devices (Samsung Galaxy A15 floor target).

## Features
- **Deterministic Procedural World:** Infinite terrain chunks generated on a Web Worker using 3-octave fBm and uniform integer hashing (zero `Math.random()`).
- **Pastel Low-Poly Art:** Procedural flat-shaded biomes (pink meadows, mint grass, sand shores, lilac hills, pearl peaks), sky gradient dome, shimmering water plane, and soft cloud puffs.
- **Flight Physics:** First-person flight camera with level horizon, 72° FOV, gentle bobbing, velocity inertia, boost, and ground/water altitude clamping.
- **Mobile & Desktop Controls:** Touch virtual joystick + drag look on mobile; WASD / arrow keys + pointer lock on desktop.
- **Heart Collectibles:** Deterministic hearts scattered across chunks, sparkle bursts, and milestone toasts.
- **Photo Mode:** One-tap clean HUD hiding, canvas capture to PNG, and Web Share API.
- **2-Player Multiplayer:** Live presence and 10 Hz broadcast over Supabase Realtime with a 120ms interpolation buffer and animated low-poly companion bird.
- **PWA & Offline Ready:** `vite-plugin-pwa` precaching, manifest, maskable icon, and Vercel cache configuration.

## Quick Start
```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck + lint + test + build + check-budget
```

## Performance Benchmark (`/bench`)
Open `/bench` (or `/bench/index.html`) to run the scenario ladder and 3-minute sustained heat test.
Results are saved to `docs/perf/final.json`.

## Multiplayer Setup
Create a `.env` file from `.env.example`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Enter the same World Seed in the in-game menu on both devices to fly together!

## Verification
```bash
npm run check
```
Verifies strict TypeScript typing, ESLint rules, 30 Vitest unit tests, production build, and gzipped bundle budget (≤ 250 KB).
