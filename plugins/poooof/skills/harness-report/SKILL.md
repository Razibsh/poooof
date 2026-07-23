---
name: harness-report
description: Review a finished autonomous harness run — read its report, verify the gates yourself instead of trusting its summary, show what actually changed, surface the decisions it made alone, and give a merge / don't-merge verdict with the exact undo command. Use the morning after a run. User-invoked.
argument-hint: [stream name — omit to list finished runs]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(ls:*), Bash(cat:*), Bash(npm:*), Bash(pnpm:*), Bash(yarn:*), Bash(bash:*), Bash(python3:*), Bash(cargo:*), Bash(make:*), Read, Glob, Grep, AskUserQuestion
---

# Review an autonomous run

The morning job: decide whether last night's work is worth keeping. **Verify — never relay.** A run
that reports all-green has been wrong before, and the report is written by the same agent that did the
work.

## Inputs

- **Stream:** `$ARGUMENTS`. If empty, open with the **morning board** (below), then review runs one at
  a time. Reviewing is one-at-a-time — they are independent and must stay that way — but the operator
  gets the whole night's picture before choosing where to start.

### The morning board — first thing on screen after a multi-run night

Before reviewing anything, one table covering every run: what it was, whether it finished, and the URL
to look at it.

| Run | Task | Status | Look at it | Verdict |
|---|---|---|---|---|
| `<stream-a>` | one line | DONE, 4 iters | http://localhost:3301 | pending |
| `<stream-b>` | one line | DONE, 7 iters | http://localhost:3302 | pending |
| `<stream-c>` | one line | **BLOCKED** — <why> | — | pending |

Status comes from each `.harness/STATUS.md`; ports from each `.harness/PORTS.md`. Lead with the
BLOCKED and no-report ones — a driver that died without writing a report is the case that most looks
like success from a distance.

Boot the DONE ones on their own ports and **open each URL in the browser** so they are ready to click.
Booting N dev servers at once is heavy (~1GB each) — above three, boot them in batches as the operator
works through the list, and say that's what you're doing.

Then review one run properly (steps 1–7), take the operator's decision on it, and move to the next.

## Steps

### 1. Read what it claims

`.harness/RUN-REPORT-*.md` (newest) and `.harness/STATUS.md`: the criteria checklist, the iteration
log, the terminal `STATUS:` line. Note the claims — do not repeat them as fact yet.

### 2. Verify the gates yourself

Re-run the project's gates in the stream worktree, with `set -o pipefail`, and compare against
`.harness/BASELINE.md` — **not** against "all green". Report the numbers you personally observed.

If a gate fails, say which of three it is: (a) this run's doing, (b) a known flake, (c) inherited from
the baseline. Only (a) blocks a merge.

### 3. Check the diff is what was promised

```
git -C <stream> diff --stat main..HEAD
git -C <stream> log --oneline main..HEAD
```

- Does the diff stay inside `ACCEPTANCE.md`'s declared scope? Flag every file outside it.
- Did it edit a **test or guard** that judges its own work? Red flag — read those changes closely and
  say whether the test was made honest or made lenient.
- Is each commit green and self-contained (one milestone each on an epic)?

### 4. Read the code, not just the counts

Passing gates prove the tests pass, not that the work is good. Read the actual change — especially
anything touching money, auth, permissions, or data writes. Say plainly if you find something the run
did not flag.

### 4b. Show it running — reading a diff is not seeing the work

If the change is visible in a running app, **boot that stream on its own preview port** (from
`.harness/PORTS.md`) and give the operator a URL. Three overnight runs = three URLs on three ports,
open side by side; the shared staging domain only ever shows what has already been merged, so it can
show at most one of them.

```
<project preview command> --prefix <stream> -- -p <preview port>   →  http://localhost:<port>
```

Then do the looking yourself first: open the affected screen, drive the actual flow, check the console
for errors, and check a narrow width if it is UI. Attach a screenshot of the real thing. Say plainly
whether it *looks* right — gates cannot judge that, and this is the step where a passing run gets
caught being wrong.

Leave the servers running while the operator reviews; shut them down after the verdict.

### 5. Surface what only a human can judge

Repeat, verbatim, the run's **"Design calls for the operator"** and **"For the operator"** sections.
Those are the decisions it made alone — wording, layout, defaults, where data lands. Don't bury them in
a summary; accepting or rejecting them is the operator's actual job here.

Then give the run's **validation checklist** — the thing the operator actually works through, tied to
that run's URL. Numbered, concrete, each one a click and an expected result. Not "check it works":

> **http://localhost:3302** — <run name>
> 1. Open <path> → the <control> is visible on the row
> 2. Click it, enter <value> → the total updates to <number>
> 3. Reload → the value survived
> 4. Narrow the window to phone width → nothing clipped

Gates can't judge product feel; this is the part only they can do. Keep it to what *this diff* changed
— a checklist long enough to feel like homework won't get done.

### 6. Give a verdict

One of:

- **Merge** — criteria met, gates verified, diff in scope, nothing worrying in the code.
- **Merge with follow-ups** — good, plus N things to fix separately (spawn them, don't inline them).
- **Fix first** — specific, small, worth doing before merge.
- **Discard** — the approach is wrong. Deleting the branch costs nothing; say so without ceremony.

Always state the undo path (step 7) as part of the verdict, so "yes" is never a one-way door.

### 7. Tell them how to undo it — before they merge

**One run = one branch = one PR = one merge commit.** That is what makes an overnight batch reviewable:

| Stage | Undo |
|---|---|
| Not merged | `git worktree remove <stream> --force && git branch -D <branch>` — nothing ever touched `main`. |
| Merged (PR merge commit) | GitHub's **Revert** button on that PR, or `git revert -m 1 <merge-sha>` — undoes that run only. |
| Merged + deployed | Revert as above, then re-deploy. Production is a separate promote; merged ≠ shipped. |

**Never merge two runs in one PR**, and never squash a multi-milestone epic into a single commit — both
destroy exactly the separation that makes a bad night cheap to undo.

### 8. Hand off to the merge

Only on the operator's yes. Open the PR (one run, one PR), let **them** merge it, then run
`poooof:finish-stream <name>` to promote decisions, reconcile the docs, and remove the worktree.

## Rules

- Verify, don't relay. Every number you report is one you ran.
- Review one run at a time; never mix two runs' changes.
- The operator merges. Never merge for them, even on a perfect report.
- Say what's wrong plainly. A discarded run costs one night; a bad merge costs trust.
