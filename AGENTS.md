# AGENTS.md — Dreamland 3D

Cozy 3D first-person flying/exploring web game for 2 players. Pastel pink low-poly, procedural, shared world seed.
**Floor device: Samsung Galaxy A15** (Mali-G57 MC2, 1080x2340, 90Hz, 4GB RAM worst case). If it runs here, it runs everywhere.

## Stack (locked, ask before changing)
Vite + TypeScript (strict) + Three.js (vanilla; no React/R3F in the game loop) · Web Worker for chunk gen · Vitest · later: Supabase Realtime, vite-plugin-pwa · deploy: Vercel · package manager: npm only.

## Perf budget (starting values; Phase 1 benchmark results override). Keep in `src/config/budget.ts`
| | A15 mode (default) | Mid | High |
|---|---|---|---|
| pixel ratio | 1.0–1.5 (start 1.25) | 1.5–2 | min(dpr,2) |
| target fps | 30 | 60 | 60 |
| triangles on screen | ≤ 60k | ≤ 120k | ≤ 250k |
| draw calls | ≤ 60 | ≤ 120 | ≤ 200 |
| fog far / chunk ring radius | 90–100m / 2 | 160m / 3 | 240m / 4 |
| transparent sprites | ≤ 10 small | ≤ 20 | ≤ 40 |
| JS heap | ≤ 150MB | ≤ 250MB | ≤ 400MB |
Always off: shadow maps, MSAA, post-processing, dynamic lights, large textures. Prefer vertex colors, pooled InstancedMesh, fog for draw distance.

## TOKEN RULES (highest priority)
1. Read order, then STOP reading: `PROGRESS.md` → current phase in `IMPLEMENTATION_PLAN.md` → only the files you will edit. Never load the whole plan or repo.
2. Skills (`.agents/skills/*/SKILL.md`, fallback `.agent/skills/`): load one only when its description matches the task.
3. Search before reading (grep/list). View line ranges, not whole files.
4. Minimal diffs. Never reprint unchanged code or restate the plan.
5. Replies ≤ 10 lines: what changed · how verified · next step. No pleasantries, no explaining basics.
6. Batch independent tool calls. One install command. Don't restart the dev server repeatedly.
7. Verify with scripts (`npm run check`, headless tests), not screenshot or browser-agent loops. Browser only at phase gates.
8. Web research: official docs only (list in `SKILLS.md`), max 3 fetches per topic, then save a 15–30 line summary to `docs/research/<topic>.md` with URL and date. Check that folder before searching again.
9. One phase per conversation. At phase end: update `PROGRESS.md` (≤ 15 lines), commit, report, stop. Wait for "GO P<n>".
10. Don't ask what a file can answer. Ask only at phase gates or for a blocking ambiguity (max 1 question).

## Code rules
- TS strict. No `any` without a comment.
- No allocations in per-frame code (reuse vectors/arrays; no `new` in update/render). No `console.log` in hot paths.
- Dispose geometries/materials/textures you remove. Pool chunk buffers.
- Fixed-timestep simulation, interpolated render.
- Worldgen is deterministic: seed-derived only, never `Math.random()`.
- Constants live in `src/config/` (`budget.ts`, `palette.ts`). Modules ≤ 300 lines.
- New dependency needs a one-line justification in `PROGRESS.md`. Default: zero-dep.

## Done means
`npm run check` passes (typecheck + lint + test + build + `scripts/check-budget.mjs`), phase acceptance criteria met, `PROGRESS.md` updated, committed.

## Layout
```
src/core    loop, renderer, quality tiers, dynamic resolution
src/world   noise, biomes, chunks, worker, props
src/player  controls, camera, bird
src/net     realtime (Phase 7)
src/ui      hud, menu, photo mode
src/config  budget.ts, palette.ts
bench/      benchmark page (Phase 1)
docs/research/  cached web findings
scripts/    check-budget.mjs
```

## PROGRESS.md format (≤ 15 lines)
`Phase: P<n> · Status: in-progress|done · Last: <1 line> · Next: <1 line> · Perf: <latest p95 ms / fps / draw calls / tris> · Deps: <added> · Blockers: <none|text>`
