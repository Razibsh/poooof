---
name: tidy
description: Re-organize a project's BACKLOG.md into the framework's clean format — dated, newest-first, grouped by status (📥 Inbox → 🔨 Promoted → ✅ Done), area-tagged, de-duplicated. Also migrates an old flat/messy backlog into that format in one pass. Non-destructive (only moves and annotates lines, never drops an item) and diff-first. Use when the backlog has drifted into a wall of text, after importing items, or to convert an existing project's backlog to the current layout. User-invoked only.
disable-model-invocation: true
argument-hint: (none — operates on this project's BACKLOG.md)
allowed-tools: Read, Write, Edit, Bash(git:*), Bash(ls:*)
---

# Tidy the backlog

`BACKLOG.md` rots when items get appended anywhere, undated, ungrouped. This restores the
framework's readable format so the operator (and any agent) can see what's going on at a glance —
newest on top, grouped by lifecycle status, every item dated and area-tagged. It also migrates an
**old-format** backlog (flat list, "Ideas (unsorted)", no dates) into the new layout in one pass.

**Iron rule: never lose an item.** You only *move* and *annotate* lines. Every real idea that went
in comes out — just dated, tagged, and in the right section. If you can't confidently date or
categorize one, keep it (put it in Inbox, flag the guess) rather than drop it.

## What to do

1. **Read `BACKLOG.md`.** If there's no such file, say so and stop — nothing to tidy. Note whether
   it's already in the 3-section format or an old/flat one (migration).

2. **Collect every real item.** Ignore the header blurb and the `<!-- poooof X.Y.Z -->` stamp and
   any `<placeholder>` example lines. Everything else that's a real idea is an item to place.

3. **Normalize each item to** `- YYYY-MM-DD [area] idea — context`:
   - **Date:** keep any date already on the line. If missing, infer the *earliest* plausible date
     from `git log` for that line (`git log --diff-filter=A -S'<distinctive text>' --format=%ad --date=short -- BACKLOG.md | tail -1`) or from nearby context; if still unknown, use today and mark it `(date approx)`.
   - **Area:** keep an existing `[area]` tag; otherwise infer a short one from the text (e.g. `[ui]`,
     `[billing]`, `[infra]`, `[docs]`). One word.
   - Keep the idea + context text as-is; don't reword the operator's ideas.

4. **Sort into the three sections, newest first within each:**
   - `## 📥 Inbox — newest first` — not yet started.
   - `## 🔨 Promoted to a phase` — already pulled into the roadmap; keep/add its `→ Roadmap Phase N (date)` arrow.
   - `## ✅ Done / shipped` — delivered; keep/add its `→ shipped <version/phase> (date)` arrow.

5. **De-duplicate.** If two lines are clearly the same idea, merge into one (keep the richer context,
   the earliest date), and mention the merge in your report. When unsure, keep both.

6. **Write the file** in the exact template shape (header blurb + version stamp preserved + the three
   sections). Then **show the operator the diff** (`git diff -- BACKLOG.md`) and a one-line summary:
   items in / items out (must match), how many dated-by-inference, any merges. Do **not** commit until
   they've seen it — then commit with `docs(backlog): tidy — <N> items sorted & dated` if they're happy.

## Sanity check before you finish
Count real items before and after. They must match (minus any merges you explicitly reported). If the
count dropped for any other reason, you lost something — stop and fix it. Never report "tidied" without
this check passing.
