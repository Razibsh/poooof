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
- **stream-guard SessionStart hook (folder claim/lock)** (2026-06-28) — from a reviewer's notes: a hook that
  "claims" a worktree folder per session and warns when a *second* session opens the same folder, so two agents
  never silently share one folder. Known refinement before shipping: it currently false-warns when the *same*
  person restarts Claude in that folder (session id changes on restart) — fix with a stale-lock heartbeat or a
  stable window id instead of session id. Deferred because it's more invasive (writes `.stream-lock`) and noisier
  than `check-streams`; ship only once the restart false-positive is solved.
- **`start-stream`: handle node_modules per worktree** (2026-06-28) — from a reviewer's notes: each new worktree
  folder has no `node_modules` (deps aren't shared), so `npm ci` fails until installed there. `start-stream`
  could offer to run install (or symlink/reflink `node_modules` from `main/`) per new stream. Generalize beyond
  node (Python venv, etc.) or keep it node-only + a one-liner in the skill. Low/medium priority.
- 2026-07-03: Update-nudge text in `hooks/check-update.js` (~line 116) tells users to run `/plugin marketplace update` + `/plugin update` — but README warns the slash form opens the interactive manager and says to use `/poooof:update`. Fix the nudge string to recommend `/poooof:update`, and align the README quote of it (~line 96).
