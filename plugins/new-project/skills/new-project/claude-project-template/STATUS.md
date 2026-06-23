# Status — session handoff

> The committed home for the end-of-session status block (CLAUDE.md rule #8). One file, always
> overwritten with the *latest* state — not an append-only log. The point: anyone (you tomorrow,
> a teammate, another agent) can pull the repo and know exactly where things stand without reading
> chat history or relying on an agent "remembering". If this file and `git log` ever disagree,
> reconcile them before doing anything else.

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
