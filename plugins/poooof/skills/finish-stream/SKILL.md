---
name: finish-stream
description: Finish a parallel workstream — verify it's merged to main, promote its locked decisions into DECISIONS.md, reconcile ROADMAP.md/BACKLOG.md (check off + promote the delivered phase, advance the current-phase header), then remove the worktree, delete the branch, and clear its WORKSTREAMS.md row. Defaults to a PR (review + test gate); a project can opt into fast-forward. User-invoked.
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
   - **Overlap pre-check (when other streams are active).** If `WORKSTREAMS.md` lists other active streams,
     run `poooof:check-streams` first. If `<name>` shares any file with another active stream, tell the
     operator those streams will conflict at *their* merge and should rebase onto `main` after this one
     lands. This is a heads-up, not a blocker — landing this stream is still safe.

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

4b. **Harness streams (a `.harness/` folder exists) — do this BEFORE any cleanup.** The run's whole
   record lives in that folder; removing the worktree destroys it.
   - **Refuse to finish an unreviewed run.** If `poooof:harness-report` hasn't reviewed it, stop and run
     that first. An autonomous run must never be merged-and-swept in one motion.
   - **Archive the record:** copy the newest `.harness/RUN-REPORT-*.md` and the final `.harness/STATUS.md`
     into `main/docs/harness/<name>-<date>.md`, so the reasoning outlives the worktree. Append anything
     learned about *running the harness itself* to `main/docs/harness/CONTEXT-LOG.md` (create if absent).
   - **Carry the leftovers forward:** every "For the operator" line and every unmet criterion becomes a
     BACKLOG entry or a spawned task — none of it may vanish with the folder.
   - **Record the undo path** in the docs commit: `revert with: git revert -m 1 <merge-sha>`.

5. **Promote decisions.** Open `$STREAM/STATUS.md` → `## Decision log`. Move the locked / cross-cutting
   decisions into `main/DECISIONS.md` (under its list), each as a `- <decision> — <why> (<date>, from <name>)`
   line. Commit on main: `git -C "$ROOT/main" add DECISIONS.md && git -C "$ROOT/main" commit -q -m "docs(decisions): promote from <name>"`.

6. **Reconcile `ROADMAP.md` (and `BACKLOG.md`).** The stream just finished — make the roadmap *show* it,
   the same way every other completed phase shows it. In `main/ROADMAP.md`: check off (`[x]`) the phase /
   items this stream delivered, add a one-line ✅ verified-on note (date + PR), and **if the phase was
   sitting in a "Later" / backlog bucket, promote it to a proper done section** alongside the other
   finished phases (don't leave it stranded in the rough list). Then **advance the "current position" /
   "current phase" header** to the next real phase. If the stream cleared or added backlog items, update
   `main/BACKLOG.md` too. Commit on main:
   `git -C "$ROOT/main" add ROADMAP.md BACKLOG.md && git -C "$ROOT/main" commit -q -m "docs(roadmap): mark <name> done"`.
   **A finished stream that isn't reflected in `ROADMAP.md` is not finished.**

7. **Clean up the worktree + branch.**
   ```
   cd "$ROOT/main"
   git worktree remove "$ROOT/<name>"            # add --force only if it refuses due to untracked build files
   git branch -D "feat/<name>"
   git push origin --delete "feat/<name>" 2>/dev/null || true
   ```

8. **Clear the WORKSTREAMS.md row + report.** In `$ROOT/main/WORKSTREAMS.md`, delete the `<name>` row (restore
   the `| _(none active)_ |` placeholder if it was the last one). Commit on main and push if `origin` exists.
   Tell the operator the stream is merged + cleaned, and confirm `git worktree list` no longer shows it.

## Rules
- **One stream per PR** — never fold two streams (or two harness runs) into one. A single merge commit
  per stream is what makes `git revert -m 1 <merge-sha>` undo exactly one piece of work.
- A stream isn't done until `ROADMAP.md` reflects it — never skip the roadmap reconciliation (step 6).
- Never clean up before the branch is actually merged into `main` (verify with `merge-base --is-ancestor`).
- Default to PR; only fast-forward when the project's `merge_style` says so.
- Refuse on failing tests or an uncommitted stream — surface the problem instead of forcing through.
