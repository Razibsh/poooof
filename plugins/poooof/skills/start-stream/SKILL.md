---
name: start-stream
description: Start a new parallel workstream — create a worktree + branch off the latest main, seed its STATUS.md, and register it in WORKSTREAMS.md. Use when running a second feature while another is unfinished. User-invoked or proposed confirm-first by the agent.
argument-hint: [stream name]
allowed-tools: Bash(git:*), Bash(ls:*), Bash(test:*), Bash(printf:*), Read, Write, Edit, AskUserQuestion
---

# Start a parallel workstream

Create an isolated worktree so a new feature can be built alongside others without collisions. Plain
language; the operator may not be a developer. **Confirm-first**: state the plan and the folder name, then
wait for a yes before creating anything.

## Inputs
- **Stream name:** `$ARGUMENTS` — a short slug (e.g. `billing`, `audience`). If empty, ask what to call it.
  Lowercase, hyphens, no spaces. The branch becomes `feat/<name>`; the folder is `<name>/`.
- **Project root:** the bare-repo project folder that contains `.bare/` and `main/`. If the current folder is
  a worktree of such a project, its root is the parent of `main/`. Confirm by running `git rev-parse --git-common-dir`.

## Steps

1. **Locate the project root and the `main` worktree.**
   ```
   COMMON=$(git rev-parse --git-common-dir)          # .../<Project>/.bare
   ROOT=$(cd "$COMMON/.." && pwd)                     # .../<Project>
   ```
   If there is no `$ROOT/main` folder, tell the operator this project isn't on the bare-repo layout and stop
   (point them at TEAM-WORKFLOW.md). 

2. **Refuse duplicates.** Run `git -C "$ROOT" worktree list`. If a worktree for `feat/<name>` or a folder
   `$ROOT/<name>` already exists, say so and stop (offer a different name).

3. **Confirm the plan (confirm-first).** Tell the operator exactly what will happen:
   *"I'll create `<ROOT>/<name>/` on a new branch `feat/<name>` off the latest `main`, seed its STATUS.md, and
   add it to WORKSTREAMS.md. OK?"* Use AskUserQuestion. Only proceed on yes.

4. **Create the worktree off the latest main.**
   ```
   git -C "$ROOT/main" pull --ff-only 2>/dev/null || true
   git -C "$ROOT" worktree add "<name>" -b "feat/<name>" main
   ```

5. **Seed the stream's STATUS.md.** In `$ROOT/<name>/STATUS.md`, set `**Last updated:**` to today + a
   one-line goal (ask the operator for the goal in one sentence), and set `## Next` to that goal. Leave the
   `## Decision log` heading in place with no entries yet. Commit inside the stream:
   ```
   cd "$ROOT/<name>" && git add STATUS.md && git commit -q -m "chore(stream): seed STATUS for <name>"
   ```

6. **Register the row in WORKSTREAMS.md (on main).** In `$ROOT/main/WORKSTREAMS.md`, replace the
   `| _(none active)_ | ... |` placeholder row if present, else append a new row:
   `| <name> | feat/<name> | <name>/ | <owner> | active | <one-line goal> | <today> |`
   where `<owner>` is the agent/session (ask or infer, e.g. "Claude — chat 1"). Commit on main:
   ```
   cd "$ROOT/main" && git add WORKSTREAMS.md && git commit -q -m "chore(workstreams): register <name>"
   ```
   If `origin` exists, `git push -q` both branches.

7. **Report.** Tell the operator the exact folder to open (`<ROOT>/<name>/`) and that they (or another
   agent/Codex) can now work there independently. Remind them to run `poooof:finish-stream` when it's
   merged.

## Rules
- Confirm-first — never create folders/branches before the operator says yes.
- One branch per worktree; never reuse a name already in `git worktree list`.
- Always branch off the freshly pulled `main` so streams don't inherit each other's half-done work.
