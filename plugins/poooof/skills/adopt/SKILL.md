---
name: adopt
description: Install the Poooof framework into an EXISTING project (read the project, interview, generate docs that describe it as it is) or upgrade a project's framework docs to the current template version (stamp-detected, diff-reviewed). Docs-only by default; offers convert-to-bare for the parallel-streams layout. User-invoked only.
argument-hint: [path (default: current project)]
disable-model-invocation: true
allowed-tools: Bash(ls:*), Bash(test:*), Bash(cat:*), Bash(head:*), Bash(grep:*), Bash(sed:*), Bash(cp:*), Bash(ln:*), Bash(diff:*), Bash(git:*), Read, Write, Edit, AskUserQuestion
---

# Adopt the framework in an existing project

Install or upgrade the Poooof framework docs in a project that already exists. The operator may
not be a professional developer — plain language throughout. Never destroy or silently rewrite
anything the project already has: existing content is merged, and every merge is shown as a diff
before committing.

## Inputs

- **Project:** `$ARGUMENTS` if given, else the current directory's project.
- **Template source (read/copy only, never edit):** `claude-project-template/` inside the
  `new-project` skill directory — `${CLAUDE_PLUGIN_ROOT}/skills/new-project/claude-project-template`
  in Claude Code; in Codex set `SKILL_DIR` to this SKILL.md's directory and use
  `$SKILL_DIR/../new-project/claude-project-template`. Verify the template exists —
  `test -f "<template>/CLAUDE.md"` — otherwise STOP and tell the operator the plugin install is
  incomplete (reinstall/update poooof).
- **Installed framework version:** read once —
  `PVER=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1)`
  (Codex: `$SKILL_DIR/../../.codex-plugin/plugin.json`). Every stamp this skill writes uses `$PVER`.
  If `$PVER` comes back empty, STOP and tell the operator the plugin manifest couldn't be read —
  never write a stamp without a version.
- **Framework-managed docs:** `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`,
  `BACKLOG.md`, `WORKSTREAMS.md`, `TEAM-WORKFLOW.md`, `RUNBOOK.md`.

> Paths may contain spaces or apostrophes — always double-quote every path in bash.

## Step 0 — resolve the doc directory and detect the mode

1. Resolve where the framework docs live (same logic as the sync hook): if
   `git rev-parse --git-common-dir` ends in `.bare`, docs live in `<root>/main/`; otherwise in
   `git rev-parse --show-toplevel`. Not a git repo → STOP: tell the operator to `git init` first
   (if the project doesn't exist yet, `poooof:new-project` is the right tool instead).
   All git commands in this skill run as `git -C "<docdir>"` — never rely on the current directory.
2. Detect mode: `grep -l '<!-- poooof ' <docdir>/*.md 2>/dev/null`. (The grep may also match `AGENTS.md` when it's a symlink to CLAUDE.md — fine for detection; never stamp or edit the symlink itself.)
   - Stamps found → **UPGRADE MODE** (below).
   - No stamps but the docdir already has 3+ of the framework-managed docs (not counting
     `CLAUDE.md` and `RUNBOOK.md`, which many non-poooof projects have) → this is a pre-stamp
     poooof project: treat it as **UPGRADE MODE**, and add a line-2 stamp to each framework doc
     as part of the upgrade.
   - No stamps → **FRESH ADOPTION MODE**.
3. Safety: require a clean working tree (`git -C "<docdir>" status --porcelain` empty). Dirty →
   STOP and ask the operator to commit first (offer to write the commit for them); suggest stash
   only if they know what that means. This skill's diffs must contain only its own changes.

## FRESH ADOPTION MODE

### 1. Read the project first

Before asking anything: skim the code layout (`ls`, key entrypoints), `git log --oneline -30`,
and any existing `README`/`CLAUDE.md`/docs. Build pre-filled guesses: what the project does, the
stack, decisions visible in the code, work already completed. The interview confirms guesses —
it never asks what the repo already answers.

### 2. Interview (one topic at a time, AskUserQuestion where a choice is closed; if AskUserQuestion is unavailable, ask as plain numbered questions in chat)

1. **Project shape:** *building* (software built in phases) or *operating* (servers / infra /
   recurring ops work)? This sets the doc variant below.
2. **What this is** — confirm your one-paragraph guess; ask who operates it and their level.
3. **Architecture / stack** — confirm the stack you read from the code.
4. **Product rules** — the hard constraints (always include the secrets-discipline rule).
5. **Testing** (building shape) or **safety / dry-run discipline** (operating shape — how to
   verify without touching production).
6. **Current state** — what's done, what's mid-flight, what's next. For building shape, draft
   ROADMAP phases with done work pre-checked (`- [x]`) from git history; for operating shape,
   frame ROADMAP as current objectives (loose, re-orderable) instead of strict phases.
7. **Known decisions** — confirm the choices you inferred; each gets a dated DECISIONS.md entry
   with its *why*.

### 3. Install files in three tiers

Work from the template — stamp every doc this skill writes or merges: line 2, immediately after
the H1, replacing `<!-- poooof X.Y.Z -->` with `<!-- poooof $PVER -->` (including a Tier-C merged
CLAUDE.md/AGENTS.md).

- **Tier A — straight copies** (only if the file does not already exist): `TEAM-WORKFLOW.md`,
  `WORKSTREAMS.md`. For `.gitignore`: if absent, copy; if present, append template entries the project lacks (never remove
  existing lines). For `.claude/settings.json`: if absent, copy; if present, MERGE — add the
  `poooof` marketplace under `extraKnownMarketplaces` and `poooof@poooof: true` under
  `enabledPlugins`, preserving everything else in the file.
- **Tier B — interview-generated:** `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`,
  `BACKLOG.md` (+ `RUNBOOK.md` for operating shape — copy the template file and leave the example
  procedure block as guidance). Use the template as the skeleton but fill every `> FILL IN` block
  from the interview — these docs must describe the project *as it is today*, never ship as
  blanks. STATUS.md's first entry: Done = "adopted the Poooof framework", Next = whatever the
  interview said is next. If any Tier-B doc already exists with real content, do NOT regenerate
  it — merge Tier-C style: keep all existing entries, refresh only framework boilerplate, and
  confirm gaps in the interview instead of re-asking.
- **Tier C — merges (never clobber):** if `CLAUDE.md` / `AGENTS.md` already exists, fold the
  framework sections into it — add the numbered workflow rules, key-files list, and any missing
  sections; keep ALL existing project content and its ordering where possible. An existing README
  is left completely untouched. If the project has no `AGENTS.md`, create it as a symlink
  (`ln -sf CLAUDE.md AGENTS.md` inside the docdir), matching new-project. If `AGENTS.md` exists
  as a separate real file, leave it untouched, merge framework rules into `CLAUDE.md` only, and
  tell the operator about the split.

### 4. Review gate, commit, and the layout offer

1. Show the operator `git -C "<docdir>" diff` (and list new files) — walk through what changed in
   one short summary. **Nothing is committed before they confirm.**
2. On confirmation: `git -C "<docdir>" add -A && git -C "<docdir>" commit -m "Adopt Poooof framework (v$PVER)"`.
   Push only if the operator says so. (`add -A` is safe because the tree was clean at Step 0; if
   `git -C "<docdir>" status --porcelain` shows files this skill didn't create, add only the
   skill's files by name.)
3. Offer, confirm-first: convert to the parallel-streams layout now? If yes, run
   `poooof:convert-to-bare`. If no: done — docs-only adoption is a complete, valid stopping point.
4. Hand off: *"Next session, open the project and say: Read CLAUDE.md and ROADMAP.md, then let's
   continue."*

## UPGRADE MODE

1. Report versions: project stamps (`grep -h '<!-- poooof ' <docdir>/*.md | sort -u`) vs installed
   `$PVER`. All stamps already `== $PVER` → say "already on the current framework version" and
   STOP (no-op). No stamps at all (legacy route from Step 0) → skip this equality check and
   proceed with the upgrade. Any stamp NEWER than `$PVER` → STOP and tell the operator to update
   the poooof plugin first (`poooof:update`), then re-run.
2. For each framework-managed doc present in the project, merge the CURRENT template's framework
   boilerplate in: refresh the standard sections (numbered workflow rules, header guidance
   blockquotes, TEAM-WORKFLOW.md body, WORKSTREAMS.md header/format) while preserving ALL
   project-specific content (filled-in sections, roadmap items, decisions, backlog, status,
   dashboard rows). Judgment calls go conservative: when unsure whether text is framework or
   project content, keep it and note it in the summary.
3. Add whole docs the project lacks: `WORKSTREAMS.md`/`TEAM-WORKFLOW.md` if absent; offer
   `RUNBOOK.md` if the project is ops-shaped and lacks it.
4. Update every stamp to `<!-- poooof $PVER -->`, and add a line-2 stamp to any framework-managed
   doc that lacks one.
5. Same review gate as fresh mode: show the full diff, get explicit confirmation, THEN
   `git -C "<docdir>" add -A && git -C "<docdir>" commit -m "Upgrade Poooof framework docs to v$PVER"`.
   Push only on request.

## Rules

- Never edit the bundled template — read/copy only.
- Never commit without showing the diff and getting a yes.
- Never delete or rewrite project-specific content; merges add and refresh, they don't prune.
- This command installs/upgrades docs only — it writes no application code and changes no layout
  (the layout change is `convert-to-bare`'s job, and only ever confirm-first).
- If anything is ambiguous, ask rather than guess.
