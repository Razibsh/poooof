# Status — session handoff

**Last updated:** 2026-07-05 — shipped `poooof:handoff` + self-organizing backlog (`poooof:tidy`); wired the official Linear MCP (auth pending); dogfooded tidy on this repo's own backlog.

## Done this session
- **`poooof:handoff`** (`skills/handoff/SKILL.md`): user-invoked "save before you clear" — runs the end-of-session ritual (refresh STATUS, route decisions/ideas/roadmap to their homes, tidy the backlog, confirm memory capture) and prints a "✅ safe to clear" green light. Commit 0d2a0b7.
- **Self-organizing backlog + `poooof:tidy`** (`skills/tidy/SKILL.md`): template `BACKLOG.md` reshaped into dated, newest-first, area-tagged sections (📥 Inbox → 🔨 Promoted → ✅ Done); template `CLAUDE.md` rule 2 updated so capture inserts at top of Inbox and items move (never delete) on promote/ship. `poooof:tidy` re-sorts/dates/tags/dedupes and migrates an old flat backlog; non-destructive with an item-count check + diff before commit; also runs inside `poooof:handoff`. Commit 2cbcb78. Spec: `docs/superpowers/specs/2026-07-05-self-organizing-backlog-design.md`.
- **Dogfooded** `tidy` on this repo's own backlog: flat 7-item list → 3-section format, 7 in / 7 out, the shipped "self-organizing" idea correctly moved to ✅ Done. Commit e99fd74.
- **Linear MCP** added at user scope (SSE, OAuth, no key stored). Connection pending browser auth.
- Docs updated across README + both plugin manifests + marketplace.json for both new commands.

## Verified
- JSON manifests parse; both new skills' frontmatter well-formed.
- `tidy` ran for real on this repo's backlog: item count preserved (7→7), three sections present.
- NOT yet verified: `handoff`/`tidy` as installed slash commands (ship from working repo → need a release + `/poooof:update` before live in other projects).

## Next
- **Release** so `poooof:handoff` + `poooof:tidy` reach installed projects — version bump + push, awaiting Razi's go-ahead (suggest v1.5.0, new features). Not pushed yet.
- **Apply to Razi's current project(s)** (Shyft / Airtable / desktop): run `poooof:tidy` on each repo's backlog (diff-first; Shyft = paying clients, do with Razi present) and add the tidy convention. Needs to be done *in* each repo — this session is the framework repo. Awaiting the project path.
- **Linear trial**: finish `/mcp` → linear browser auth; then set up one Linear project for the current project + add a project-local "on capture, also create a Linear issue + append its ID" rule (kept out of the shared template until the trial proves worth paying for).

## Open / blocked
- Linear MCP connection pending browser OAuth (expected).
- Applying to other projects blocked on their repo path(s).

## Docs in sync?
- yes — features + docs committed together; this STATUS.md current; backlog tidied.
