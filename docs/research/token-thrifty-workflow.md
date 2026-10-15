# Token-Thrifty Engineering Workflow Research
Date: 2026-10-15
Sources:
- https://antigravity.google/docs
- AGENTS.md project specification

Key Findings:
1. Token exhaustion degrades model attention and reasoning quality; strict token discipline is critical.
2. Read order must always be: PROGRESS.md -> current phase in IMPLEMENTATION_PLAN.md -> only specific targeted files.
3. Search before reading: grep line ranges instead of loading full repository files or directories.
4. Minimal diffs: edit only relevant lines; never restate untouched code or repeat plan documents.
5. Communication budget: replies must stay <= 10 lines (what changed, how verified, next step).
6. Never run automated visual screenshot loops in background; use fast terminal scripts (`npm run check`) for verification.
7. Web research constraint: maximum 3 fetches per skill, always caching 15-30 line summaries into `docs/research/`.
8. Fresh conversations: enforce one phase per chat session, resetting context to prevent token bloat.
9. Format all phase-end commits as `P<n>: <summary>`.
