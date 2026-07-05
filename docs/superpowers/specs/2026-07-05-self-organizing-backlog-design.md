# Self-organizing backlog — design

**Date:** 2026-07-05
**Status:** approved (Razi, in chat) — implementing

## Problem

A flat markdown `BACKLOG.md` has no enforced order. Ideas get appended anywhere, dates go
missing, and after a few months it's an unreadable pile — the operator's live pain on his
real projects (Shyft / Airtable / desktop). Two halves to fix: **stop new rot** (a convention
the agent maintains automatically) and **clean existing messes** (a one-time reorganize).

## Decision

Restructure the framework's backlog into a **dated, newest-first, status-grouped** format, keep
it that way with agent rules + an automatic tidy pass, and add a standalone `poooof:tidy` command
that both maintains a backlog on demand and migrates an existing messy one. Linear stays a
**per-project trial** (not baked into the shared template yet — see the deferred "optional Linear
mode" backlog item); the shared framework change is markdown-only, so the free framework works
standalone.

## The format

`BACKLOG.md` becomes three status sections; every line is `- YYYY-MM-DD [area] idea — context`,
newest at the top of each section:

```
## 📥 Inbox — newest first
- 2026-07-05 [billing] idea — context

## 🔨 Promoted to a phase
- 2026-06-24 [ui] idea — context → Roadmap Phase 3 (2026-06-28)

## ✅ Done / shipped
- 2026-04-02 [infra] idea — context → shipped v1.2 (2026-04-15)
```

Read top-down for "what's newest," scan `[area]` tags for "everything about X." Nothing is ever
deleted — items move down the lifecycle (Inbox → Promoted → Done) with a dated arrow note.

## Components

1. **Template `BACKLOG.md`** — reshaped to the three-section format above with an updated header
   that states the convention (dated, newest-first, area-tagged, never-deleted).
2. **Template `CLAUDE.md` rule 2 (idea capture)** — capture inserts at the **top of Inbox** with
   today's date + `[area]`; promotion/ship **moves** the line to the right section with a dated
   arrow. Keep it one sentence longer, not a wall.
3. **`poooof:tidy` skill** — user-invoked. Re-sorts each section newest-first, ensures every item
   has a date (infer from `git log`/context when missing) + an `[area]`, dedupes, and — run against
   an *old-format* backlog — migrates it into the three-section layout. Non-destructive: only moves
   and annotates lines, never drops an item; shows a diff before committing.
4. **`poooof:handoff` integration** — the handoff ritual runs the same tidy pass so every save also
   leaves the backlog clean. One added line in `handoff/SKILL.md`.
5. **Docs** — README (install list + skills tree + short section) and both plugin manifests +
   marketplace.json gain `tidy`.

Out of scope (unchanged): `DECISIONS.md` (already a dated table), `STATUS.md` (overwrite-latest),
`ROADMAP.md` (phase-ordered). Linear-in-template (deferred to after the trial).

## Applying to existing projects

`poooof:tidy` is the migrator. Run it once per project the operator is working on; it converts that
repo's flat backlog to the new format with a reviewable diff. For the Linear trial, that project's
*own* `CLAUDE.md` also gets a light "on capture, also create a Linear issue and append its ID"
rule — project-local, not in the shared template. Shyft handles paying clients — apply there only
with the operator present and diff-first.

## Verify

- Template `BACKLOG.md` parses as the new 3-section format; example lines follow `YYYY-MM-DD [area]`.
- `poooof:tidy` SKILL.md frontmatter valid; JSON manifests still parse.
- Dry-run tidy on a scrambled sample backlog reorders newest-first, groups by status, preserves
  every item (line count of real items unchanged).
