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

- **Stream:** `$ARGUMENTS`. If empty, list every worktree with a `.harness/RUN-REPORT-*.md` and its
  final `STATUS:` line, then ask which to review. Multiple runs are reviewed **one at a time** — they
  are independent and must stay that way.

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

### 5. Surface what only a human can judge

Repeat, verbatim, the run's **"Design calls for the operator"** and **"For the operator"** sections.
Those are the decisions it made alone — wording, layout, defaults, where data lands. Don't bury them in
a summary; accepting or rejecting them is the operator's actual job here.

Then say plainly: **what would they have to use to know this is good?** Gates can't judge product feel.
Name the two-minute check (open the page, ask the assistant, try it on a phone).

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
