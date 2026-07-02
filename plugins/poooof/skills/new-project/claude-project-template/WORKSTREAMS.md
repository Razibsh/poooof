# Workstreams — what's in flight right now
<!-- poooof X.Y.Z -->

> The single dashboard of every active parallel workstream. **Read this FIRST every session.** One row per
> live stream. Updated only when a stream starts or finishes (rare → safe from collisions between sessions).
> If this file and `git worktree list` ever disagree, reconcile before doing anything else.
>
> A "stream" = one feature/task with its own worktree folder + branch. **One task at a time needs no row here**
> — just work on a branch. Rows appear only when two or more tasks run in parallel.

| Stream | Branch | Folder | Owner | Status | Goal | Last touched |
|--------|--------|--------|-------|--------|------|--------------|
| _(none active)_ |  |  |  |  |  |  |

<!--
Status values: active · in-review · blocked · merging
Owner: which agent/session drives it — e.g. "Claude — chat 1", "Codex".
Example row:
| billing | feat/billing | billing/ | Claude — chat 1 | active | Stripe subscriptions | 2026-06-24 |
The start-stream skill adds a row; finish-stream removes it. You normally never edit this by hand.
-->
