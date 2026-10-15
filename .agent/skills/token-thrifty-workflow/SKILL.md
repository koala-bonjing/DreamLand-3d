---
name: token-thrifty-workflow
description: How to work cheaply in this repo. Use at the start of every session, phase start/end, before researching anything, and whenever a reply is getting long.
---
# Token-Thrifty Workflow

## Rules
1. Read order: `PROGRESS.md` → current phase in `IMPLEMENTATION_PLAN.md` → only files to edit. Stop immediately.
2. Grep/search before reading; view line slices, never whole files or entire plans.
3. Keep diffs minimal; never re-print unchanged code or restate the implementation plan.
4. Replies ≤ 10 lines: what changed · how verified · next step. No pleasantries or fluff.
5. Verification via scripts (`npm run check`); no screenshot or browser loops.
6. Check `docs/research/` before fetching web pages; max 3 fetches per topic; save 15–30 line summaries.
7. One phase per conversation. Update `PROGRESS.md` (≤ 15 lines), commit `P<n>: <summary>`, wait for "GO P<n+1>".
8. Start a fresh conversation after each phase gate or when reaching ~40 turns.

## Snippets

### Phase End Git Commit
```bash
git add .
git commit -m "P0: bootstrap + skills"
```

### PROGRESS.md Format
```markdown
Phase: P0 · Status: done · Last: bootstrap + skills · Next: GO P1 · Perf: n/a · Deps: three, vitest · Blockers: none
```

## Pitfalls
- Reading the whole `IMPLEMENTATION_PLAN.md` wastes thousands of tokens on unstarted phases.
- Chatty multi-paragraph responses blow through context limits and degrade instruction following.

## Sources
- https://antigravity.google/docs (2026-10-15)
- AGENTS.md (2026-10-15)
