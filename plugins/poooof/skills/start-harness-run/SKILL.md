---
name: start-harness-run
description: Set up an autonomous overnight coding run — scope the task, create an isolated stream, record a gate baseline, install deps, write the .harness kit, then hand the operator ONE launch command. The agent prepares everything; the human starts it and merges it. User-invoked, confirm-first.
argument-hint: [task description or backlog/roadmap item]
allowed-tools: Bash(git:*), Bash(ls:*), Bash(test:*), Bash(cat:*), Bash(cp:*), Bash(chmod:*), Bash(mkdir:*), Bash(ln:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(bash:*), Bash(python3:*), Bash(cargo:*), Bash(pytest:*), Bash(make:*), Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Start an autonomous harness run

Prepare a task so an agent can build it **unattended** — plan → build → test → commit, looping on its own
— inside a sealed worktree, and hand the operator a single command to start it.

**The division of labour is the whole design** (validated over four real runs, see `references/lessons.md`):

| Human | Agent |
|---|---|
| Says what to build | Scopes it into testable criteria |
| **Pastes the launch command** | Plans, builds, tests, commits, loops |
| **Reviews and merges** | Stops at DONE or BLOCKED and writes a report |

The human launches because the permission layer refuses to let an agent start a permission-bypassing
child process — and that is the right rule, not a workaround. The human merges because an unattended
run must never reach `main`, LIVE, or anyone's money.

Read `references/lessons.md` before the first run in a new project — it is the accumulated field
experience this procedure encodes.

## Inputs

- **Task:** `$ARGUMENTS` — a task description, or a backlog/roadmap item to pull. If empty, read the
  project's `ROADMAP.md`/`BACKLOG.md` and propose 2–3 low-risk candidates for the operator to pick.
- **Project root:** the bare-repo folder containing `.bare/` and `main/` (`git rev-parse --git-common-dir`).
  If the project is not on the bare layout, say so and stop — point at `poooof:convert-to-bare`.

## Steps

### 1. Verify the task against reality — before scoping anything

Read the actual code the task touches, plus `git log` for that area. Tasks rot: a backlog item may be
half-shipped already, or its premise may be stale. Report what you find and re-scope if reality differs.
*(In run 1 the item was ~80% already built; a blind agent would have rebuilt it.)*

### 2. Pick a task the harness can actually finish

Good: one crisp outcome, a gate that can prove it, blast radius limited to files you can name.
**Refuse and re-scope** if the task is only checkable by human taste, needs a decision the operator
hasn't made, or touches money/auth/messaging on a live system. Say plainly why.

### 3. Confirm the plan (confirm-first)

State: the task, the stream name, the scope boundary (which paths may change), the caps, and that
**you will not start it — they will**. Use AskUserQuestion. Only proceed on yes.

### 4. Create the stream

Run `poooof:start-stream <name>` (worktree + branch off latest `main` + registration). Never work in
`main/`, and never in a worktree another session is using — check `git worktree list` first.

### 5. Record the gate BASELINE — the step everything else depends on

Determine the project's gate commands (see `references/gates.md`), then **run them on the base commit,
before any change**, and write the result to `.harness/BASELINE.md`.

Without this the run cannot tell its own breakage from inherited breakage: it will either "fix"
out-of-scope things or loop forever on something it can't fix. A pre-existing failure is recorded as
**known-red and out of scope**, in writing.

Use `set -o pipefail` for every gate. A piped `npm run lint | tail` reports *tail's* exit code — a
suite that isn't even installed will look green.

### 6. Preflight — remove every blocker a sleeping human can't clear

- **Dependencies:** a fresh worktree is an empty shell — install (`npm ci` / `pnpm i` / `poetry install`).
  Run 2 would have died on its first command without this.
- **Env/secrets:** link or copy what the app needs (e.g. `ln -s ../main/.env.local .env.local`).
- **Run every gate once, attended.** Whatever fails for an env/auth reason, the operator must fix now —
  the agent *cannot* self-serve secrets, and shouldn't (the permission layer blocks it by design).
- **Ports/services:** if gates need a DB or dev server, confirm it is up and that the run will **reuse**
  a shared one rather than tearing down something another session is using.

### 7. Write the `.harness` kit

Into `<stream>/.harness/` (and add `.harness/` to that worktree's `info/exclude` so the run can never
commit its own scaffolding into the product):

| File | Contents |
|---|---|
| `HARNESS.md` | The roles + hard rules, injected as the system prompt. Start from `templates/HARNESS.md` and append the project's specifics. |
| `ACCEPTANCE.md` | The task contract: scope in / scope **out** / numbered criteria, each with the check that proves it. |
| `BASELINE.md` | From step 5. |
| `STATUS.md` | Live state: checklist, iteration log, "For the operator" findings, and a terminal `STATUS:` line. |
| `run-harness.sh` | Copy `templates/run-harness.sh`; set the task slug and caps. |
| `SPEC.md` | **Epics only** — written by the run itself in iteration 1 (see below). |

### 8. Epic protocol — for anything bigger than a single-file fix

Instruct the run: **iteration 1 is planner-only and writes a FROZEN `SPEC.md`** — ordered milestones,
each with its own gate, ordered so *every prefix is shippable*. Then one milestone at a time, TDD'd,
gated, each its own green commit.

This is what makes a long run safe: a stall at milestone 4 still leaves three merge-ready milestones
instead of one large mess. *(Run 4 built a five-milestone epic this way in 6 iterations.)*

### 9. Hand over the launch command — and stop

Print exactly one command, and tell them what to expect:

```
cd "<stream folder>" && <ENV=…> MAX_ITERS=<n> MAX_HOURS=<n> caffeinate -i .harness/run-harness.sh 2>&1 | tee .harness/logs/run.out
```

- `caffeinate -i` (macOS) keeps the machine awake; the lid must stay open.
- Kill switch: `touch .harness/STOP`, or close the window.
- Expect `=== iteration 1 ===` within a minute — that is the "it's alive" signal.

**Do not start it yourself.** If you try, the permission layer will refuse — and it is right to.

### 10. Supervise (optional but recommended)

Arm a background monitor on the log that reports each iteration, the final report, **and a driver that
died without producing one** — silence must never be mistaken for success. When it finishes,
**re-run the gates yourself** rather than trusting the run's own summary (`poooof:harness-report`).

## Hard rules to put in HARNESS.md

1. Work only in this worktree. Never touch `main/` or another stream.
2. Never push, merge, checkout main, promote, or deploy. Commit to this branch only.
3. Never print, copy, or commit secrets. Test/staging data only — never production.
4. Stay inside the declared scope. Out-of-scope needs are a **BLOCKED note, not an edit** — but an
   out-of-lane edit *declared up front* in the plan is allowed (test glue, a config line).
5. **Never edit the guard that judges you.** Make the code pass the test; never bend the test. If you
   believe the guard is wrong, that is BLOCKED.
6. Commit only green. Never commit failing work. Never `git add .harness/`.
7. **On a permission denial: record `STATUS: BLOCKED — <what>` and stop.** No retries, no workarounds —
   retrying hardens the blocker and burns the run.
8. Compare gates against `BASELINE.md`, not against "all green".
9. Every invocation updates `STATUS.md`: checklist, one log line, and a terminal `STATUS:` line.
   `DONE` requires all criteria met **and** the gates re-run in that same invocation.
10. Surface, don't bury: anything you decided alone that changes how something **looks or behaves**
    goes under "Design calls for the operator" — those are the human's to own.

## Keep every run separately reviewable — and cheap to undo

Several runs can go in one night. They must never become one tangled morning:

- **One run = one stream = one branch = one PR = one merge commit.** Never merge two runs in one PR,
  and never squash a multi-milestone epic into a single commit.
- **Nothing merges itself.** In the morning the operator has N independent branches. Disliking one
  costs `git worktree remove <stream> --force && git branch -D <branch>` — it never touched `main`.
- **After merging, one run undoes with one command:** GitHub's *Revert* on that PR, or
  `git revert -m 1 <merge-sha>`. That is exactly why each run gets its own PR.
- **Merged ≠ shipped.** Production is a separate promote, so a merge is still not the last word.

Say this to the operator when you hand over the launch command. Knowing the undo path up front is what
makes an unattended run a low-stakes decision instead of a leap.

## Rules

- Confirm-first — nothing is created before the operator says yes.
- The human launches; the human merges. Never automate either.
- No baseline, no run.
- One task per run. "While we're in there" is how unattended runs go wrong.
- One run per PR — reviewability and the one-command undo both depend on it.
