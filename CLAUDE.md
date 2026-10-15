@AGENTS.md

# Claude-specific notes
- AGENTS.md is the single source of truth. Do not duplicate its rules here.
- Reply terse (caveman-style is fine): code and errors exact, no filler.
- Start each phase in plan mode: read `PROGRESS.md` and only that phase of `IMPLEMENTATION_PLAN.md`, then implement.
- Skills live in `.agents/skills/` (or `.claude/skills/` symlink if you want Claude Code to see them). Same SKILL.md format.
- Use `/compact` at phase end after updating `PROGRESS.md`.
