# Poooof — Backlog

Deferred ideas for the framework itself. Nothing gets forgotten. One line + date; build in order, not ahead.

- **AI-reviewed PR gate (Workstreams Phase 2)** (2026-06-24) — when a stream lands a PR, automatically route it
  to an AI reviewer (Codex via GitHub Action, or a local `codex:rescue` pass at `finish-stream` time) that runs
  tests + reviews the diff, posts findings, and gates merge. Auto-merge only on green checks; keep a human/Claude
  approve step for non-trivial changes (avoid AI auto-approving its own "looks good"). Layers onto the
  `merge_style: pr` path from the workstreams plan.
- **TEAM-WORKFLOW.md Habit 2 still teaches flat `git checkout -b`** (2026-06-24) — Habits 1–4 are the
  universal git-hygiene baseline and Habit 2 shows `git checkout main && git checkout -b feature/x`, which is
  fine for a normal repo but slightly inconsistent with the bare-repo worktree layout (where each branch is its
  own folder). Decide whether to leave it as the general baseline or align it with the worktree model. Low
  priority, doc-only.
