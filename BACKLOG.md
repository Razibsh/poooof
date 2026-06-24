# Poooof — Backlog

Deferred ideas for the framework itself. Nothing gets forgotten. One line + date; build in order, not ahead.

- **AI-reviewed PR gate (Workstreams Phase 2)** (2026-06-24) — when a stream lands a PR, automatically route it
  to an AI reviewer (Codex via GitHub Action, or a local `codex:rescue` pass at `finish-stream` time) that runs
  tests + reviews the diff, posts findings, and gates merge. Auto-merge only on green checks; keep a human/Claude
  approve step for non-trivial changes (avoid AI auto-approving its own "looks good"). Layers onto the
  `merge_style: pr` path from the workstreams plan.
