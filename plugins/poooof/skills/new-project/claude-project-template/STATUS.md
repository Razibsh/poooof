# Status — session handoff
<!-- poooof X.Y.Z -->

> The committed handoff for **this stream** (this worktree/branch). Two halves: the **current-state**
> blocks below are *overwritten* every session so they always show where the stream stands; the
> **Decision log** at the bottom is *append-only* — never erase it. Anyone (you tomorrow, a teammate,
> Codex, another agent) can pull the branch and know exactly where things stand and *why*, without chat
> history. Because each stream has its own branch, two sessions never overwrite each other's STATUS.md.
> If this file and `git log` disagree, reconcile before doing anything else.

**Last updated:** YYYY-MM-DD — <session one-liner>

## Done this session
> What actually got built/changed. Link the commits if useful.
-

## Verified
> What was *observed* to work (test passed, real run, screenshot) — not just "should work".
-

## Next
> The single next thing to pick up. Point at a specific ROADMAP item.
-

## Open / blocked
> Anything half-done, waiting on a decision, or at risk. Empty is a fine answer.
-

## Docs in sync?
> Confirm ROADMAP/DECISIONS/BACKLOG reflect reality as of this commit. (yes / what's stale)
-

## Decision log (append-only — never erase)
> Every meaningful decision in THIS stream, newest at the bottom, each with a one-line "why". The agent
> appends here automatically as decisions happen — you never have to ask. On merge, the locked /
> cross-cutting decisions get promoted into the project `DECISIONS.md`.
- YYYY-MM-DD — <decision> — <why>
