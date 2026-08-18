# Status — session handoff

**Last updated:** 2026-08-18 — **v1.7.3 shipped and pushed**. Four releases in one day, all installed
and verified: v1.7.0 made the handoff automatic, v1.7.1–1.7.3 taught doc-sync to see work nobody wrote
down and to stop lying about which branch it was reading.

## v1.7.3 — the main worktree must be on the main branch

Check 6. Every check, every skill and the whole bare-repo layout assume `<root>/main/` **is** main, and
nothing verified it. It was wrong **three times on 2026-08-18** — a feature branch, a merged stream's
worktree holding main hostage, then a docs branch — and each time cost something real: a commit nearly
landed on the wrong branch, Check 3 measured the wrong branch, and a session was blocked from
registering its stream because the row could not be committed to main. Names the folder, the branch it
is really on, and which worktree is holding main.

## v1.7.2 — stop asking the wrong branch whether it is pushed

`@{upstream}` resolves against HEAD, so with the main worktree on a feature branch, Check 3 measured
that branch's backlog and reported it as main's — a confident "123 commit(s) not pushed" for a main
that was 0 ahead. False alarms are not harmless: a check that cries wolf trains everyone to skip the
block, which is the failure mode this framework exists to prevent. Now resolves `main`'s own upstream.

## v1.7.1 — doc-sync sees invisible work

## v1.7.1 — doc-sync sees invisible work

- **Check 4** — a worktree with no `WORKSTREAMS.md` row. The hook only ever looked for the opposite
  (a row whose branch had merged), so an unregistered worktree was invisible. Caught live: a
  `forms-builder/` worktree that went 7 → 16 commits in under an hour with no row and no doc.
- **Check 5** — a stream whose **code moved but whose record did not**. Finds when
  `docs/streams/<name>.md` was last touched (across all refs — the doc lives on main, the code on the
  branch) and counts branch commits landing after it. ≥3, or no doc at all, and it says so at the next
  session start. Override with `POOOOF_STALE_AFTER`.
  First run against the Shyft repo found `messaging-agent-m3` with **24 commits and no stream doc**,
  and `forms-builder` with 4 commits newer than a doc written an hour earlier.

**Why Check 5 matters:** it is the only check that asks whether the work got written down. Nothing can
force good notes — but after this, an agent cannot skip them *silently*. That converts "I hope he
documented it" into "I'll be told if he didn't", which is the only honest guarantee on offer. It is
scoped to existence, never quality: whether a doc is any good is a human's call.

## v1.7.0 — the handoff runs itself

## The problem this release fixes

`poooof:handoff` shipped in v1.5.0 and then, in practice, never ran. Two causes, both now fixed:

1. `handoff` and `tidy` carried `disable-model-invocation: true`, which hides a skill from the agent
   entirely. **The one command that must run at the END of every session was invisible to the only
   participant guaranteed to be present at the end of every session.** It fired only when the operator
   typed it, which under real time pressure means never. It also broke handoff's own step 3, which
   tells the agent to apply `tidy`'s rules but gave it no way to call `tidy`.
2. Nothing watched for the moment it was needed. By the time context is lost it is too late to ask.

**Standing design rule established this session: nothing that depends on either party remembering.**
Every previous revision added one more thing to remember, which is why none of them stuck.

## Done this session
- Dropped `disable-model-invocation` from `skills/handoff` and `skills/tidy`; handoff's description now
  tells the agent to run it **proactively** at a natural pause, not only on request.
- **New `hooks/check-context.js` (UserPromptSubmit)** — stats the transcript file and, past calibrated
  sizes, injects an instruction to run `poooof:handoff`. Fires once per stage per session. Nudge at
  12 MB, urgent at 30 MB, override via `POOOOF_HANDOFF_MB`.
- Rescoped `check-sync.js`'s closing line: "reconcile before the first code or doc **CHANGE**" instead
  of "reconcile now, then continue". The old wording is wrong during a question-answering turn, so it
  got skipped — observed live in a real session before the fix.
- Both manifests → **1.7.0**. The `.codex-plugin` one had silently drifted to 1.5.0 while
  `.claude-plugin` was at 1.6.0; they're aligned again.

## Verified
- `node --check` clean on both hooks; `hooks.json` and both manifests parse.
- `check-context.js` run against **real transcripts**: 90 MB session → urgent instruction; same session
  a second time → silent (no repeat); small session → silent; malformed stdin → silent fail-open.
- Thresholds calibrated on real data, not guessed: in the Shyft project, 45 sessions, median transcript
  **5.6 MB**, worst twelve **21–90 MB**.
- **NOT verified:** the skill-visibility change in a live session. A session loads the plugin at
  startup, so it only takes effect after a release + update + a fresh session.

## 🔴 The thing that blocks everything
**RESOLVED — pushed 2026-08-18.** Installed projects pull the plugin from the public GitHub repo, so v1.7.0 is inert
until it is pushed and `poooof:update` runs. **Awaiting Razi's explicit go-ahead** — publishing to a
public repo is his call, not the agent's. (Note: the v1.5.0 release was pending this same way and the
handoff feature sat unused for six weeks as a result.)

## Next
1. Razi decides: push `feat/automatic-handoff` → merge → release v1.7.0.
2. After update, confirm in a **fresh session** that `poooof:handoff` now appears in the agent's skill
   list — that is the actual proof the fix works.
3. Apply to the Shyft project: the cleanup stream is already open and documented there at
   `main/docs/streams/framework-and-docs-cleanup.md`.

## Facts worth keeping
- **`PreCompact` / `PostCompact` / `SessionEnd` cannot inject context the agent acts on** — they fire
  outside the reasoning loop (hooks docs, verified 2026-08-18). Only `UserPromptSubmit`, `SessionStart`
  and `UserPromptExpansion` add stdout as context the agent sees. A PreCompact hook would look correct
  in config and do nothing. This was the original plan and had to be abandoned.
- Hook stdin carries `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`. The
  transcript file is written asynchronously and can lag the live conversation.
