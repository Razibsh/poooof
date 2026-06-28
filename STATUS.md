# Status — session handoff

**Last updated:** 2026-06-28 — v1.3.1: self-healing update-check cache (clears stale nudges). v1.2.0: onboarding auto-update. Every scaffolded project now ships `main/.claude/settings.json` (registers the poooof marketplace + enables the plugin + `autoUpdate`), so collaborators who open a project and trust the folder get the framework auto-installed and kept current. v1.1.0 (below): doc-sync automation + parallel-stream conflict safety.

## Done this session (v1.3.1)
- Fixed a stale update-nudge that lingered after updating. The update-check cache stores `update_available` as a snapshot from the worker's last run (refreshes only every ~6h), so right after an update it kept claiming a newer version was available. `hooks/check-update.js` now **self-heals the cache** every session start: it already knows the true installed version, so it rewrites the cache's `installed`/`update_available` fields the moment they're wrong (preserving `checked` so the worker still refreshes on schedule). This clears naive cache readers — e.g. a statusline segment that trusts `update_available` verbatim — instead of making them wait hours. The banner itself already re-compared, so it was unaffected; the fix is for downstream readers. Also patched Razi's `~/.claude/statusline.js` to re-compare `cache.latest` against the installed version (read from `installed_plugins.json`) rather than trusting the cached boolean.

## Done this session (v1.3.0)
- New skill `poooof:update` — one-command update: refreshes the marketplace catalog then updates the plugin (`claude plugin marketplace update poooof && claude plugin update poooof@poooof`; Codex: `codex plugin marketplace upgrade poooof`), then tells the operator to restart. `disable-model-invocation: true` (user-invoked). Solves the "/plugin opens a menu instead of updating" confusion. Descriptions + README "Stay up to date" + command lists updated.

## Done this session (v1.2.1)
- Nudge message now spells out both steps (`/plugin marketplace update poooof` then `/plugin update poooof@poooof`) — the catalog can be stale, so "update plugin" alone reads an old version and reports "nothing new." Learned the hard way during a live update.

## Done this session (v1.2.0)
- New `claude-project-template/.claude/settings.json`: `extraKnownMarketplaces` (poooof, `autoUpdate:true`) + `enabledPlugins` (`poooof@poooof`). Copied into every new project's `main/` by `new-project` (cp `-R "$TEMPLATE/."` includes dotfiles; `.claude/` isn't gitignored so it's committed and travels to teammates). `new-project` step 3 documents it.
- Auto-update for clients is now an onboarding side-effect of opening+trusting a scaffolded project — no manual `/plugin` steps. README "Sharing with clients" updated.
- Plugin bumped to 1.2.0 (both manifests).

## Done earlier this session (v1.1.0)
**Doc-sync automation**
- `finish-stream` step 6: reconcile ROADMAP.md (check off + promote delivered phase out of "Later", advance the current-position header) + BACKLOG.md, before clearing the WORKSTREAMS row. New rule: "A stream isn't done until ROADMAP.md reflects it."
- New `hooks/check-sync.js` (SessionStart, wired in `hooks.json`): read-only drift detector. Check 1 — a WORKSTREAMS active row whose branch is already merged into main (self-clearing). Check 2 — a merged `feat/*` branch not reflected in ROADMAP.md (cached once per branch). Check 3 — unpushed commits on main. Injects an `additionalContext` instruction so the agent reconciles first thing; silent when in sync; fail-open on non-poooof repos.
- Tested: fires on both drift checks in a throwaway repo; silent on a clean project; strips the template's `<!-- example row -->` so it isn't read as an active stream.

**Parallel-stream conflict safety** (from a reviewer's notes)
- New skill `poooof:check-streams` — lists every file edited by 2+ active worktree branches so same-file merge conflicts are caught before merge. Reads branches from `git worktree list` (git is truth); portable bash 3.2; read-only. Tested: flags shared files, ignores disjoint ones, runs from any worktree, clean "nothing to check" path.
- `finish-stream` step 2: overlap pre-check — runs check-streams when other streams are active and warns which still-active streams will conflict (heads-up, not a blocker).
- Doc fix: clarified in TEAM-WORKFLOW + README that worktrees prevent *working* collisions, not *merge* conflicts on the same file; pick disjoint-file streams and run check-streams before merge.

- Plugin stays at 1.1.0 (Claude + Codex manifests); descriptions + README/marketplace list check-streams.

**Outside the repo (Razi's machine):** removed the lingering GSD statusline ghost — `~/.claude/statusline.js` de-GSD'd (context meter kept verbatim, GSD update/state code removed) and given a poooof "update available" segment; stale `~/.cache/gsd` cache neutralized. Backup at `statusline.js.gsd-backup-*`.

## Previously done
- Bare-repo project layout in `new-project` scaffolding (`.bare/` + `main/` + per-stream folders).
- New `WORKSTREAMS.md` dashboard + per-stream `STATUS.md` with append-only decision log (template).
- Rewrote TEAM-WORKFLOW "Working in parallel" + CLAUDE.md rules (dashboard-first sessions, decision logging, confirm-first worktrees, cleanup-on-merge).
- New `workstream` plugin with `start-stream` + `finish-stream` skills; registered in Claude + Codex marketplaces.
- README documents the workstream model + install.

## Verified
- Bare-repo init + worktree sequence proven on git 2.50.1.
- End-to-end /tmp dry-run: scaffold → two parallel streams → finish one → cleanup, all clean.
- All template/skill artifacts present (self-review greps pass).

## Next
- Merge `feat/workstreams` to `main` (publish → propagates to future projects).
- Backport the bare-repo layout + WORKSTREAMS.md to the WhatsBot-v2 project (separate follow-up).
- BACKLOG: AI-reviewed PR gate (Workstreams Phase 2).

## Open / blocked
- None.

## Docs in sync?
- yes — spec + plan in docs/superpowers/, BACKLOG.md updated.
