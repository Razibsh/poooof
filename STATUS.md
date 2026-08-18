# Status — session handoff

**Last updated:** 2026-08-18 — v1.7.0: made the handoff **automatic** instead of something a human had
to remember. Branch `feat/automatic-handoff`, commit `2aed6d3`. **Committed, NOT pushed.**

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
**Not pushed.** Installed projects pull the plugin from the public GitHub repo, so v1.7.0 is inert
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
