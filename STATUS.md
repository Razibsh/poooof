# Status — session handoff

**Last updated:** 2026-07-03 — v1.4.0 released: poooof:adopt (install/upgrade framework in existing projects), version stamps, claude-mem-aware template rules, RUNBOOK.md for ops projects.

## Done this session (v1.4.0)
- v1.4.0 implemented: new skill `poooof:adopt` (install/upgrade framework in existing projects), version stamps (`<!-- poooof X.Y.Z -->`) on framework-managed docs, claude-mem-aware template rules in CLAUDE.md and ROADMAP, new `RUNBOOK.md` for ops-shaped projects, README + plugin manifests updated, marketplace description aligned.

## Previously done
- Bare-repo project layout in `new-project` scaffolding (`.bare/` + `main/` + per-stream folders).
- New `WORKSTREAMS.md` dashboard + per-stream `STATUS.md` with append-only decision log (template).
- Rewrote TEAM-WORKFLOW "Working in parallel" + CLAUDE.md rules (dashboard-first sessions, decision logging, confirm-first worktrees, cleanup-on-merge).
- New `workstream` plugin with `start-stream` + `finish-stream` skills; registered in Claude + Codex marketplaces.
- README documents the workstream model + install.

## Verified
- 4 end-to-end scenarios passed: fresh build-shape adopt with CLAUDE.md merge, ops-shape adopt, upgrade + legacy pre-stamp routing + no-op re-run, new-project regression.

## Next
- Push release.
- Run /poooof:adopt on the two June-2026 projects and the ops project.

## Open / blocked
- None.

## Docs in sync?
- yes — spec + plan in docs/superpowers/, BACKLOG.md updated.
