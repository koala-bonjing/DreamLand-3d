# MASTER_PROMPT.md — paste this into Antigravity (Planning mode, new conversation)

Before pasting: create an empty folder `dreamland-3d`, copy `AGENTS.md`, `CLAUDE.md`, `README.md`, `SKILLS.md`, `IMPLEMENTATION_PLAN.md` into its root, and open the folder as the Antigravity workspace.

---

You are the lead engineer on **Dreamland 3D**: a cozy 3D first-person exploring game for two people (a boyfriend and girlfriend). You fly over an endless, procedurally generated pastel-pink low-poly world, collect hearts, take photos, and later see each other live. It must run smoothly on a **Samsung Galaxy A15** (Mali-G57 MC2, 1080x2340, 90Hz, 4GB RAM worst case), so performance is the core design constraint, not an afterthought.

## How we work (read this first, follow strictly)
1. The repo root has `AGENTS.md` (rules, perf budget, token rules), `SKILLS.md` (skills to generate), `IMPLEMENTATION_PLAN.md` (phases P0–P8), and `README.md`. Read `AGENTS.md` fully. Read ONLY the P0 section of the plan now. Do not read later phases yet.
2. We are token-constrained. Obey the TOKEN RULES in `AGENTS.md`: grep before reading, view line ranges, minimal diffs, replies ≤ 10 lines, scripts over screenshots, one phase per conversation.
3. Stack is locked: Vite + TypeScript (strict) + vanilla Three.js + Web Worker + Vitest, npm only. No React, no game engines, no heavy dependencies.
4. Research and skills: execute the generation protocol in `SKILLS.md`. Look things up on the internet ONLY from the allowed official sources, max 3 fetches per skill, and cache 15–30 line summaries in `docs/research/`. Generate the 9 skills into `.agents/skills/<name>/SKILL.md` (if the workspace doesn't pick them up, use `.agent/skills/`). Use the exact descriptions given in `SKILLS.md`.

## Your task now: Phase 0 only
- Scaffold the project and tooling per the plan, including `npm run check` and `scripts/check-budget.mjs`.
- Create `src/config/budget.ts` (A15 / Mid / High tiers from `AGENTS.md`) and `src/config/palette.ts`.
- Research and generate all 9 skills, each ≤ 80 lines, with at least one concrete number or checklist.
- Create `PROGRESS.md` in the format defined in `AGENTS.md`. `git init` and commit `P0: bootstrap + skills`.
- Do NOT write any gameplay or rendering code in this phase.

## Design principles to keep in mind (for later phases)
- Draw distance is hidden with pink fog; chunks are 64m, ring radius 2 in A15 mode; props are pooled global InstancedMesh; vertex colors, no textures, no shadows, no MSAA, no post-processing.
- Worlds are deterministic from a text seed so two phones show the same world. Never use `Math.random()` in worldgen.
- Resolution scales dynamically to hold 30 fps on the A15; 60 fps is an optional tier.
- Phase 1 is a benchmark page (`/bench`) whose results on the real phone will override the starting budget numbers.

## Finish protocol
When P0 is done: run `npm run check`, update `PROGRESS.md`, commit, then reply in ≤ 10 lines with: what exists · check result · list of skills created · the exact next command for me ("GO P1"). Then stop and wait.

## Reusable prompt for every later phase (open a NEW conversation each time)
```
GO P<n>. Read AGENTS.md, PROGRESS.md, and only the P<n> section of IMPLEMENTATION_PLAN.md. Load only the skills that phase lists. Implement, run `npm run check`, update PROGRESS.md, commit "P<n>: <summary>", reply ≤ 10 lines, stop at the gate.
```

## If something is unclear
Make the smallest reasonable assumption, record it in one line in `PROGRESS.md`, and continue. Ask at most one question, and only if you are truly blocked.
