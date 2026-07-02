# Poooof v1.4.0 — `adopt` skill + context-aware framework (design)

**Date:** 2026-07-02
**Status:** approved in conversation; this document is the written record.

## Goal

Two gaps, one release:

1. **The framework can only be born, not adopted.** `new-project` scaffolds fresh projects; nothing
   installs the framework docs into an *existing* project, and template improvements never reach
   already-created projects. Fix: a new `poooof:adopt` skill with a fresh-adoption mode and an
   upgrade mode, plus version stamps so staleness is detectable.
2. **The framework ignores persistent memory.** Projects using claude-mem get recent-session
   observations injected at session start, but nothing tells the agent to reconcile them against the
   framework docs — so a crashed session's context sits unused. Fix: template CLAUDE.md rules
   (zero code, works in Claude Code and Codex, no-op when claude-mem is absent).

Also: the template gains an ops-project variant (RUNBOOK.md), and the README documents `adopt` and
recommends claude-mem as an optional companion.

## Non-goals (explicitly out of scope)

- No hook code for memory awareness (decided: template rule only).
- No transcript/conversation storage — claude-mem remains the flight recorder; poooof docs remain
  the curated system of record.
- No mechanical version-to-version template diffs. The installed plugin carries only the current
  template, so upgrade merges are content-based (agent judgment + operator diff review). The
  version stamp detects adoption and staleness; it does not drive a patch algorithm.
- No changes to `start-stream` / `finish-stream` / `check-streams` / `convert-to-bare` behavior.

## Component 1 — `poooof:adopt` skill

New skill at `plugins/poooof/skills/adopt/SKILL.md`, namespaced `poooof:adopt`. User-invoked only
(`disable-model-invocation: true`), same conventions as the other skills (template resolved via
`${CLAUDE_PLUGIN_ROOT}` in Claude Code, `$SKILL_DIR` in Codex; every path double-quoted).

Run inside an existing project (flat repo or bare layout — resolve the doc directory the way
`check-sync.js` does: prefer `<root>/main` when the layout is bare). The skill auto-detects mode:

- Any framework-managed doc carries a poooof version stamp → **upgrade mode**.
- Otherwise → **fresh adoption mode**.

### Fresh adoption mode

1. **Read the project first.** Code structure, `git log`, existing README/docs/CLAUDE.md. Build
   pre-filled guesses for the interview (stack, what the project does, visible decisions, work
   already completed).
2. **Interview, one topic at a time** (mirrors `new-project` steps 6–7), opening with **project
   shape**: *building* (software with phases) or *operating* (servers/infra/recurring ops).
   - *Building* → standard template docs; ROADMAP phases with `verify:` criteria, done work
     pre-checked from git history.
   - *Operating* → same docs, but ROADMAP is framed as loose objectives rather than strict phases,
     and the project also gets `RUNBOOK.md` (Component 2). CLAUDE.md's testing section becomes a
     "safety / dry-run discipline" section (how to verify without touching production).
3. **Install files in three tiers:**
   - **Straight copies:** `TEAM-WORKFLOW.md`, `WORKSTREAMS.md`, `.claude/settings.json`,
     `.gitignore` entries the project lacks.
   - **Interview-generated:** `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`, `BACKLOG.md`
     (+ `RUNBOOK.md` for ops shape) — written to describe the project *as it is today*, not as
     blanks. DECISIONS.md is seeded with choices visible in the code/history, confirmed in the
     interview.
   - **Merges (never clobber):** if the project already has `CLAUDE.md`, `AGENTS.md`, or
     `.claude/settings.json`, fold the framework content into the existing file — framework
     workflow rules added, project's own content preserved — and show the operator the diff
     before committing. Same for a pre-existing README: leave it alone entirely.
4. **Stamp every framework-managed doc** (see Version stamps below).
5. **Commit** with a clear message; push only if the operator confirms.
6. **Offer, confirm-first:** chain into `poooof:convert-to-bare` for the parallel-streams layout.
   Declining is a fully valid stopping point — docs-only adoption is complete on its own.

### Upgrade mode

1. Read the stamps; report the project's framework version vs the installed plugin version.
2. For each framework-managed doc, merge the **current** template's framework boilerplate into the
   project's doc: refresh the standard sections (workflow rules, file-header guidance, TEAM-WORKFLOW
   content), preserve all project-specific content. Add whole docs the project is missing
   (e.g. RUNBOOK.md is offered if the project is ops-shaped and lacks it; WORKSTREAMS.md if absent).
3. Show the operator a diff of every change **before** committing. Nothing is committed unseen.
4. Update all stamps to the installed plugin version; commit.

If the project is already on the current version, say so and stop (no-op).

### Version stamps

An HTML comment on the second line of each framework-managed doc (after the `#` title):

```
<!-- poooof 1.4.0 -->
```

- Template files carry the placeholder `<!-- poooof X.Y.Z -->`; `new-project` (new small step) and
  `adopt` replace `X.Y.Z` with the installed plugin's version, read from
  `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` (Codex: the equivalent manifest). One source
  of truth — release bumps never touch the template docs' stamps.
- Framework-managed docs: `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`, `BACKLOG.md`,
  `WORKSTREAMS.md`, `TEAM-WORKFLOW.md`, `RUNBOOK.md`. (`.claude/settings.json` is JSON — no stamp;
  it's a straight copy whose drift is visible by diff.)
- Merged docs (pre-existing CLAUDE.md that got framework sections folded in) get the stamp too —
  they're now framework-managed.

## Component 2 — `RUNBOOK.md` template file

New optional file in `claude-project-template/`: procedures for repeatable operational work
("deploy a new app", "provision a server", "restore a backup"). Shape:

- Header comment: what belongs here (any procedure done more than once), what doesn't (one-off
  state → STATUS.md; decisions → DECISIONS.md).
- Per-procedure format: name, when to use, numbered steps, verify step, last-validated date.
- Rule (stated in the file header and in the CLAUDE.md promotion rule): when a session figures out
  a procedure for the first time, it gets written here before the session ends.

`new-project` does **not** copy RUNBOOK.md by default (build-shaped projects rarely need it at
birth; YAGNI) — it is installed by `adopt` for ops-shaped projects, or by hand any time. The
template file exists so both skills copy from one source of truth.

## Component 3 — template CLAUDE.md context rules

Two tight additions to the numbered workflow rules (kept short; the template is already long):

1. **Session-start memory reconcile** — extends rule 1 (and the abrupt-end sentence in rule 8):
   > If persistent-memory context (e.g. claude-mem) appears at session start, check it against
   > `STATUS.md` and `WORKSTREAMS.md` before other work. If memory shows work, decisions, or an
   > unfinished task the docs don't reflect — a crashed or abruptly-ended session — say so and
   > reconcile the docs first (update STATUS.md / the decision log from what memory shows, visibly,
   > not silently).

   Phrased so that with no memory plugin installed there is nothing to check and the rule is a
   no-op. Works identically in Codex if a memory system injects context there.
2. **Promotion rule** — generalizes rules 2/8/9 into an explicit principle:
   > Chat history and automatic memory (claude-mem) are recovery nets, not the system of record.
   > Before a session ends, every durable fact must live in its typed home: a decision →
   > `DECISIONS.md` (or the stream's decision log), current state → `STATUS.md`, an idea →
   > `BACKLOG.md`, a repeatable procedure → `RUNBOOK.md` (if the project has one). If it matters
   > and it only exists in the conversation, it isn't saved.

Wording lands in the template verbatim during implementation; the two rules above are the approved
content. The "Key files" list gains a RUNBOOK.md line marked *(ops projects — optional)*.

## Component 4 — README updates

- **Optional companions:** add claude-mem alongside Superpowers and Context7 — recommended, not
  required; one line on why (automatic session memory; the framework's session-start reconcile rule
  uses it to recover context after a crash, and the docs remain the curated source of truth).
- **New section "Adopt it in an existing project":** documents `poooof:adopt` — fresh adoption
  (read → interview → three-tier install → optional `convert-to-bare` chain) and upgrade mode
  (stamp detection, diff review). Replaces the current framing where `convert-to-bare` is the only
  existing-project path; `convert-to-bare` remains documented as the layout half.
- **Commands list** (install section + "What's inside" tree): add `poooof:adopt`.
- The "template improvements only flow template → new project" caveat is updated: improvements now
  reach existing projects via `/poooof:adopt`.

## Component 5 — release

- Bump `plugins/poooof/.claude-plugin/plugin.json` and `plugins/poooof/.codex-plugin/plugin.json`
  to **1.4.0**.
- Marketplace listing blurbs updated if they enumerate commands.

## Verification plan

1. **Fresh adopt, build shape:** scratch repo with real code + a pre-existing CLAUDE.md →
   run `poooof:adopt` → interview produces docs describing actual state; existing CLAUDE.md content
   preserved in the merge; diff shown; stamps present; declining `convert-to-bare` leaves a working
   flat repo.
2. **Fresh adopt, ops shape:** scratch repo shaped like an ops project → RUNBOOK.md installed,
   ROADMAP objective-framed.
3. **Upgrade:** take a project stamped `<!-- poooof 1.3.0 -->` (hand-stamp a copy of an old
   scaffold) → `adopt` detects staleness, refreshes framework sections, preserves project content,
   diff shown, stamps now 1.4.0. Re-run → reports up-to-date, no-op.
4. **new-project regression:** scaffold a fresh project → stamps present, new CLAUDE.md rules
   present, everything else unchanged.
5. **No claude-mem:** confirm nothing in the new rules breaks or nags when no memory context is
   injected (rule reads as a conditional; nothing to verify at runtime beyond wording).

## Build order

1. Template changes (stamps, CLAUDE.md rules, RUNBOOK.md) — everything else depends on them.
2. `adopt` skill.
3. README + marketplace text.
4. Version bump + release.
