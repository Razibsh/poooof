---
name: finish-stream
description: Finish a parallel workstream — verify it's merged to main, promote its locked decisions into DECISIONS.md, then remove the worktree, delete the branch, and clear its WORKSTREAMS.md row. Defaults to a PR (review + test gate); a project can opt into fast-forward. User-invoked.
argument-hint: [stream name]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(ls:*), Bash(test:*), Read, Write, Edit, AskUserQuestion
---

# Finish a parallel workstream

Safely land a finished stream and clean up — the exact lifecycle that, done by hand, is easy to get wrong.
Plain language; the operator may not be a developer.

## Inputs
- **Stream name:** `$ARGUMENTS`. If empty, list active streams from `WORKSTREAMS.md` and ask which one.
- **Project root:** as in start-stream — the folder containing `.bare/` and `main/`
  (`ROOT=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)`).

## Steps

1. **Locate root, stream folder, and branch.** `STREAM="$ROOT/<name>"`, branch `feat/<name>`. If the folder
   or branch is missing, say so and stop.

2. **Safety gate — tests + clean tree.** If the project defines a test command (check `main/CLAUDE.md`
   Testing section / `package.json`), run it inside `$STREAM`. If tests fail, STOP and report — do not merge.
   Refuse if `$STREAM` has uncommitted changes (`git -C "$STREAM" status --porcelain` non-empty) until the
   operator commits or discards them.

3. **Decide merge style (per-project, asked once).** Look for a `merge_style` line in `main/DECISIONS.md`
   (values `pr` or `ff`). If absent, ask the operator once with AskUserQuestion:
   *"Land `<name>` via a Pull Request (recommended — a review + test gate before main), or fast-forward
   straight to main (faster, no gate)?"* Record their choice by appending to `main/DECISIONS.md`:
   `- merge_style: <pr|ff> — how finished streams land on main (set <today>).` and commit it on main.

4. **Land the stream.**
   - **PR style:** push the branch (`git -C "$STREAM" push -u origin "feat/<name>"`), open a PR
     (`gh pr create --fill --head "feat/<name>" --base main`), and tell the operator to review/merge it.
     **Stop here for the merge itself** (a human/second pass merges the PR); resume cleanup (steps 5–7) only
     after it's merged. Verify merged: `git -C "$ROOT/main" pull --ff-only && git -C "$ROOT/main" merge-base --is-ancestor "feat/<name>" main`.
   - **FF style:** `git -C "$ROOT/main" pull --ff-only 2>/dev/null || true; git -C "$ROOT/main" merge --ff-only "feat/<name>"` then `git -C "$ROOT/main" push -q` if `origin` exists.

5. **Promote decisions.** Open `$STREAM/STATUS.md` → `## Decision log`. Move the locked / cross-cutting
   decisions into `main/DECISIONS.md` (under its list), each as a `- <decision> — <why> (<date>, from <name>)`
   line. Commit on main: `git -C "$ROOT/main" add DECISIONS.md && git -C "$ROOT/main" commit -q -m "docs(decisions): promote from <name>"`.

6. **Clean up the worktree + branch.**
   ```
   cd "$ROOT/main"
   git worktree remove "$ROOT/<name>"            # add --force only if it refuses due to untracked build files
   git branch -D "feat/<name>"
   git push origin --delete "feat/<name>" 2>/dev/null || true
   ```

7. **Clear the WORKSTREAMS.md row + report.** In `$ROOT/main/WORKSTREAMS.md`, delete the `<name>` row (restore
   the `| _(none active)_ |` placeholder if it was the last one). Commit on main and push if `origin` exists.
   Tell the operator the stream is merged + cleaned, and confirm `git worktree list` no longer shows it.

## Rules
- Never clean up before the branch is actually merged into `main` (verify with `merge-base --is-ancestor`).
- Default to PR; only fast-forward when the project's `merge_style` says so.
- Refuse on failing tests or an uncommitted stream — surface the problem instead of forcing through.
