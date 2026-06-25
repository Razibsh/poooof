# ⚠️ Bare-repo root — the project is in `main/`, not here

This folder is a **git bare-repo root**. It holds the git engine (`.bare/`) and one subfolder per branch —
`main/` (the live branch) plus any per-feature **stream** folders. **There is no code at this level**; every
working file lives inside a worktree subfolder.

## For AI agents (Claude, Codex, etc.) — read this first

- **If your working folder is already a worktree** (e.g. `<project>/main/` or `<project>/<stream>/`): ignore
  this file — you're in the right place. Follow THAT folder's `CLAUDE.md`.
- **If your working folder is this root** (you see `.bare/` and `main/` sitting next to you): you opened one
  level too high. **Do not create or edit files here.** Instead:
  1. Run `git worktree list` to see the worktrees (`main` + any active streams).
  2. `cd main` — the default working folder — **or** into the stream folder for the feature the user named.
  3. Read that folder's `CLAUDE.md` and `WORKSTREAMS.md`, then do all work there.
- Never run two sessions in the same worktree folder. Parallel work = a separate stream folder
  (see `main/TEAM-WORKFLOW.md` and the `poooof:start-stream` skill).

## For humans

Open **`main/`** (or a stream folder) in your editor — not this root. Everything you work on is inside
`main/`. The root view is just the map of which branches have folders.
