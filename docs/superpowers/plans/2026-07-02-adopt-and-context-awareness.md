# Poooof v1.4.0 — `adopt` + context-aware framework: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `poooof:adopt` skill (install/upgrade the framework in existing projects), version stamps, claude-mem-aware context rules in the template, a RUNBOOK.md template file, and README/manifest updates — released as v1.4.0.

**Architecture:** Everything is markdown + JSON — no application code. The template (`plugins/poooof/skills/new-project/claude-project-template/`) is the single source of truth both `new-project` and `adopt` copy from. Stamps are `<!-- poooof X.Y.Z -->` placeholders in template docs, replaced at scaffold/adopt time from the installed plugin manifest. Spec: `docs/superpowers/specs/2026-07-02-adopt-and-context-awareness-design.md`.

**Tech Stack:** Claude Code / Codex plugin skills (SKILL.md), bash snippets inside skills, git.

**Verification model:** This repo has no test suite; each task ends with a concrete read-back/grep check, and Task 7 runs end-to-end scenario checks in scratch repos before release.

---

### Task 1: Version stamps in template docs + `new-project` stamp replacement

**Files:**
- Modify: all 7 template docs in `plugins/poooof/skills/new-project/claude-project-template/` (`CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`, `BACKLOG.md`, `WORKSTREAMS.md`, `TEAM-WORKFLOW.md`)
- Modify: `plugins/poooof/skills/new-project/SKILL.md`

- [ ] **Step 1: Insert the stamp placeholder as line 2 of each template doc.**

In each of the 7 files, insert this as the line immediately after the `#` title line (keep a blank line after the stamp if the title was followed by one):

```markdown
<!-- poooof X.Y.Z -->
```

The literal string `X.Y.Z` is the placeholder — do not put a real version in the template.

- [ ] **Step 2: Verify all 7 stamps are in place.**

Run:
```bash
grep -c '^<!-- poooof X\.Y\.Z -->$' plugins/poooof/skills/new-project/claude-project-template/*.md
```
Expected: each of the 7 `.md` files reports `1`.

- [ ] **Step 3: Add the stamp-replacement step to `new-project` SKILL.md.**

In `plugins/poooof/skills/new-project/SKILL.md`, immediately after the `cp -R "$TEMPLATE/." ...` / `rm -f ... .DS_Store` lines in Step 3's code block, add:

```
# Stamp the framework version into the copied docs (single source of truth: the plugin manifest).
PVER=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1)
for f in "<destination>/main/"*.md; do sed -i '' "s/<!-- poooof X\.Y\.Z -->/<!-- poooof ${PVER} -->/" "$f"; done
```

And add one sentence to the step's prose: *"(Codex: read the version from `$SKILL_DIR/../../.codex-plugin/plugin.json` instead, and use `sed -i` without `''` on Linux.)"*

- [ ] **Step 4: Verify the SKILL.md edit reads coherently.**

Read `plugins/poooof/skills/new-project/SKILL.md` step 3 top-to-bottom; the stamp block must sit after the template copy and before the root-signpost copy.

- [ ] **Step 5: Commit.**

```bash
git add plugins/poooof/skills/new-project
git commit -m "feat(template): version-stamp framework docs at scaffold time"
```

### Task 2: Context rules in template CLAUDE.md

**Files:**
- Modify: `plugins/poooof/skills/new-project/claude-project-template/CLAUDE.md`

- [ ] **Step 1: Extend workflow rule 1 (session start) with the memory reconcile.**

Append to the end of rule 1 (after "…work ONLY on the current phase of the stream you own."):

```markdown
   If persistent-memory context (e.g. **claude-mem**) appears at session start, check it against
   `STATUS.md` and `WORKSTREAMS.md` before other work: if memory shows work, decisions, or an
   unfinished task the docs don't reflect — a crashed or abruptly-ended session — say so and
   reconcile the docs first, visibly, not silently. (No memory plugin installed → nothing to
   check; skip.)
```

- [ ] **Step 2: Add workflow rule 10 (promotion principle).**

After rule 9, add:

```markdown
10. **Chat and automatic memory are recovery nets, not the system of record.** Before a session
    ends, every durable fact must live in its typed home: a decision → `DECISIONS.md` (or the
    stream's decision log), current state → `STATUS.md`, an idea → `BACKLOG.md`, a repeatable
    procedure → `RUNBOOK.md` (if the project has one). If it matters and it only exists in the
    conversation, it isn't saved.
```

- [ ] **Step 3: Add RUNBOOK.md to the "Key files in this repo" list.**

After the `TEAM-WORKFLOW.md` bullet, add:

```markdown
- `RUNBOOK.md` — repeatable operational procedures (ops projects — optional; absent unless the project needs it).
```

- [ ] **Step 4: Verify.**

Run: `grep -n 'claude-mem\|recovery nets\|RUNBOOK' plugins/poooof/skills/new-project/claude-project-template/CLAUDE.md`
Expected: three hits in the right sections (rule 1, rule 10, key-files list).

- [ ] **Step 5: Commit.**

```bash
git add plugins/poooof/skills/new-project/claude-project-template/CLAUDE.md
git commit -m "feat(template): memory-reconcile + promotion rules in CLAUDE.md"
```

### Task 3: RUNBOOK.md template file

**Files:**
- Create: `plugins/poooof/skills/new-project/claude-project-template/RUNBOOK.md`

- [ ] **Step 1: Create the file with exactly this content.**

```markdown
# Runbook — repeatable procedures

<!-- poooof X.Y.Z -->

> Step-by-step procedures for operational work done more than once (deploy an app, provision a
> server, restore a backup, rotate a key). The rule: **the first time a session figures out a
> procedure, it gets written here before the session ends** — the second time should never be
> figured out from scratch. One-off state goes to `STATUS.md`; choices and their reasons go to
> `DECISIONS.md`; this file holds only *how-to*s.
>
> Keep each procedure honest: if a step changed, fix it here in the same commit as the change.
> Stale runbooks are worse than none.

## <Procedure name>

**When to use:** <the situation that calls for this procedure>
**Last validated:** YYYY-MM-DD

1. <step>
2. <step>
3. …

**Verify:** <how you observe it worked — a URL responding, a service healthy, a restore readable>
```

Note: `new-project` does **not** copy this file into new projects by default — it stays in the
template as the source `adopt` (and hands-on operators) copy from. Implementation: add `RUNBOOK.md`
to the `rm -f` cleanup in `new-project` SKILL.md Step 3, right after the `.DS_Store` removal:

```
rm -f "<destination>/main/RUNBOOK.md"   # ops-projects file; installed by poooof:adopt when relevant
```

- [ ] **Step 2: Verify.**

Run: `head -3 plugins/poooof/skills/new-project/claude-project-template/RUNBOOK.md` → title + stamp present.
Run: `grep -n 'RUNBOOK' plugins/poooof/skills/new-project/SKILL.md` → the `rm -f` line exists in Step 3.

- [ ] **Step 3: Commit.**

```bash
git add plugins/poooof/skills/new-project
git commit -m "feat(template): RUNBOOK.md for ops-shaped projects"
```

### Task 4: The `poooof:adopt` skill

**Files:**
- Create: `plugins/poooof/skills/adopt/SKILL.md`

- [ ] **Step 1: Create `plugins/poooof/skills/adopt/SKILL.md` with exactly this content.**

````markdown
---
name: adopt
description: Install the Poooof framework into an EXISTING project (read the project, interview, generate docs that describe it as it is) or upgrade a project's framework docs to the current template version (stamp-detected, diff-reviewed). Docs-only by default; offers convert-to-bare for the parallel-streams layout. User-invoked only.
argument-hint: [path (default: current project)]
disable-model-invocation: true
allowed-tools: Bash(ls:*), Bash(test:*), Bash(cat:*), Bash(head:*), Bash(grep:*), Bash(sed:*), Bash(cp:*), Bash(diff:*), Bash(git:*), Read, Write, Edit, AskUserQuestion
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
  `$SKILL_DIR/../new-project/claude-project-template`.
- **Installed framework version:** read once —
  `PVER=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1)`
  (Codex: `$SKILL_DIR/../../.codex-plugin/plugin.json`). Every stamp this skill writes uses `$PVER`.

> Paths may contain spaces or apostrophes — always double-quote every path in bash.

## Step 0 — resolve the doc directory and detect the mode

1. Resolve where the framework docs live (same logic as the sync hook): if
   `git rev-parse --git-common-dir` ends in `.bare`, docs live in `<root>/main/`; otherwise in
   `git rev-parse --show-toplevel`. Not a git repo → STOP: tell the operator to `git init` first
   (or run `poooof:new-project` if the project doesn't exist yet — that's the wrong tool here only
   when there IS an existing project).
2. Detect mode: `grep -l '<!-- poooof ' <docdir>/*.md 2>/dev/null`.
   - Stamps found → **UPGRADE MODE** (below).
   - No stamps → **FRESH ADOPTION MODE**.
3. Safety: require a clean working tree (`git status --porcelain` empty). Dirty → STOP and ask the
   operator to commit or stash first; this skill's diffs must contain only its own changes.

## FRESH ADOPTION MODE

### 1. Read the project first

Before asking anything: skim the code layout (`ls`, key entrypoints), `git log --oneline -30`,
and any existing `README`/`CLAUDE.md`/docs. Build pre-filled guesses: what the project does, the
stack, decisions visible in the code, work already completed. The interview confirms guesses —
it never asks what the repo already answers.

### 2. Interview (one topic at a time, AskUserQuestion where a choice is closed)

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

Work from the template; stamp every doc you write by replacing `<!-- poooof X.Y.Z -->` with
`<!-- poooof $PVER -->` (add the stamp as line 2 when generating a doc from scratch).

- **Tier A — straight copies** (only if the file does not already exist): `TEAM-WORKFLOW.md`,
  `WORKSTREAMS.md`. For `.gitignore`: append template entries the project lacks (never remove
  existing lines). For `.claude/settings.json`: if absent, copy; if present, MERGE — add the
  `poooof` marketplace under `extraKnownMarketplaces` and `poooof@poooof: true` under
  `enabledPlugins`, preserving everything else in the file.
- **Tier B — interview-generated:** `CLAUDE.md`, `ROADMAP.md`, `STATUS.md`, `DECISIONS.md`,
  `BACKLOG.md` (+ `RUNBOOK.md` for operating shape — copy the template file and leave the example
  procedure block as guidance). Use the template as the skeleton but fill every `> FILL IN` block
  from the interview — these docs must describe the project *as it is today*, never ship as
  blanks. STATUS.md's first entry: Done = "adopted the Poooof framework", Next = whatever the
  interview said is next.
- **Tier C — merges (never clobber):** if `CLAUDE.md` / `AGENTS.md` already exists, fold the
  framework sections into it — add the numbered workflow rules, key-files list, and any missing
  sections; keep ALL existing project content and its ordering where possible. An existing README
  is left completely untouched.

### 4. Review gate, commit, and the layout offer

1. Show the operator `git diff` (and list new files) — walk through what changed in one short
   summary. **Nothing is committed before they confirm.**
2. On confirmation: `git add -A && git commit -m "Adopt Poooof framework (vPVER)"` (substitute the
   real version). Push only if the operator says so.
3. Offer, confirm-first: convert to the parallel-streams layout now? If yes, run
   `poooof:convert-to-bare`. If no: done — docs-only adoption is a complete, valid stopping point.
4. Hand off: *"Next session, open the project and say: Read CLAUDE.md and ROADMAP.md, then let's
   continue."*

## UPGRADE MODE

1. Report versions: project stamps (`grep -h '<!-- poooof ' <docdir>/*.md | sort -u`) vs installed
   `$PVER`. All stamps already `== $PVER` → say "already on the current framework version" and
   STOP (no-op).
2. For each framework-managed doc present in the project, merge the CURRENT template's framework
   boilerplate in: refresh the standard sections (numbered workflow rules, header guidance
   blockquotes, TEAM-WORKFLOW.md body, WORKSTREAMS.md header/format) while preserving ALL
   project-specific content (filled-in sections, roadmap items, decisions, backlog, status,
   dashboard rows). Judgment calls go conservative: when unsure whether text is framework or
   project content, keep it and note it in the summary.
3. Add whole docs the project lacks: `WORKSTREAMS.md`/`TEAM-WORKFLOW.md` if absent; offer
   `RUNBOOK.md` if the project is ops-shaped and lacks it.
4. Update every stamp to `<!-- poooof $PVER -->`.
5. Same review gate as fresh mode: show the full diff, get explicit confirmation, THEN
   `git commit -m "Upgrade Poooof framework docs to vPVER"`. Push only on request.

## Rules

- Never edit the bundled template — read/copy only.
- Never commit without showing the diff and getting a yes.
- Never delete or rewrite project-specific content; merges add and refresh, they don't prune.
- This command installs/upgrades docs only — it writes no application code and changes no layout
  (the layout change is `convert-to-bare`'s job, and only ever confirm-first).
- If anything is ambiguous, ask rather than guess.
````

- [ ] **Step 2: Verify frontmatter parses and conventions match sibling skills.**

Run: `head -8 plugins/poooof/skills/adopt/SKILL.md` — frontmatter has `name`, `description`, `disable-model-invocation: true`, `allowed-tools`, matching the style of `convert-to-bare/SKILL.md`.

- [ ] **Step 3: Commit.**

```bash
git add plugins/poooof/skills/adopt
git commit -m "feat(adopt): poooof:adopt — install/upgrade framework in existing projects"
```

### Task 5: README updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Command list (line ~16).** Replace the enumeration sentence so it reads:

```markdown
This one plugin gives you every command, all namespaced `poooof:` — `poooof:new-project`,
`poooof:adopt`, `poooof:start-stream`, `poooof:finish-stream`, `poooof:check-streams`,
`poooof:update`, `poooof:convert-to-bare`.
```

- [ ] **Step 2: New section after "Use it" — adoption.** Insert:

```markdown
## Already have a project? Adopt the framework

```
/poooof:adopt
```

Run it inside any existing repo. It reads the project first (code, git history, docs), interviews
you to confirm what it found, and installs the framework docs **describing the project as it
actually is** — done work pre-checked in the roadmap, visible decisions seeded into DECISIONS.md.
Anything you already have (a `CLAUDE.md`, `.claude/settings.json`) is merged, never overwritten,
and every change is shown as a diff before it's committed. Ops-shaped projects (servers, deploys,
infra) additionally get a `RUNBOOK.md` for repeatable procedures.

The same command also **upgrades**: framework docs carry a version stamp, and when the template
has improved since a project was scaffolded or adopted, `/poooof:adopt` refreshes the framework
sections while preserving all project content — so template improvements now reach existing
projects. At the end it offers (optional) to convert the repo to the parallel-streams layout via
`poooof:convert-to-bare`.
```

- [ ] **Step 3: Optional companions — add claude-mem.** In "Works standalone — optional companions", add a third bullet:

```markdown
- **[claude-mem](https://github.com/thedotmack/claude-mem)** — persistent memory across sessions.
  Recommended: the framework's session-start rule uses its recalled context to detect a crashed or
  unfinished session and reconcile `STATUS.md` before other work — and the docs stay the curated
  source of record (decisions → DECISIONS.md, state → STATUS.md), with memory as the recovery net.
  Not required: without it, the framework works exactly as before.
```

- [ ] **Step 4: Reframe `convert-to-bare` bullet in the Workstreams section.** Change its lead from "**adopt the framework in an existing project**: safely converts…" to:

```markdown
- `poooof:convert-to-bare [path]` — give an existing repo the parallel-streams **layout**: safely
  converts a normal flat repo to this bare-repo layout (build-new-then-swap with a full backup;
  carries over `.env` and all local-only files; audits branches for unmerged work before
  discarding). For the framework **docs** in an existing project, use `poooof:adopt` — it offers
  this conversion at the end.
```

- [ ] **Step 5: "What's inside" tree — add the two new entries.** `adopt/SKILL.md` line in the skills list (`# poooof:adopt`), and note RUNBOOK.md inside the template folder line if the tree lists template contents.

- [ ] **Step 6: Author section — template→project caveat.** Replace "Editing a project created *by* the command never affects the template — the copy only ever goes one direction, template → new project." with:

```markdown
Editing a project created *by* the command never affects the template — the copy goes one
direction, template → project. To pull template improvements *into* an existing project, run
`/poooof:adopt` there — it refreshes the framework sections and shows you the diff.
```

- [ ] **Step 7: Verify.** `grep -n 'adopt\|claude-mem\|RUNBOOK' README.md` — hits in install list, new section, companions, workstreams bullet, author section; read the new section once top-to-bottom.

- [ ] **Step 8: Commit.**

```bash
git add README.md
git commit -m "docs: document poooof:adopt, recommend claude-mem companion"
```

### Task 6: Version bump + manifest descriptions

**Files:**
- Modify: `plugins/poooof/.claude-plugin/plugin.json`
- Modify: `plugins/poooof/.codex-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.agents/plugins/marketplace.json` (check first — update only if it enumerates commands/description)

- [ ] **Step 1: Bump both plugin manifests** `"version": "1.3.1"` → `"version": "1.4.0"`.

- [ ] **Step 2: Update the three description strings** (both plugin.json files + marketplace.json plugin entry) to include adopt. Use (Claude manifest shown; Codex/marketplace drop nothing but their existing tail differences):

```
A lightweight project framework: scaffold new projects (new-project), adopt or upgrade the framework in existing repos (adopt), run several features in parallel with git-worktree streams (start-stream / finish-stream), catch same-file merge overlap before it bites (check-streams), update itself in one step (update), and convert a repo to the parallel-streams layout (convert-to-bare). Every command is poooof:<name>.
```

Marketplace command enumeration becomes: `poooof:new-project / adopt / start-stream / finish-stream / check-streams / update / convert-to-bare`.

- [ ] **Step 3: Verify.** `grep -rn '"version"\|adopt' plugins/poooof/.claude-plugin plugins/poooof/.codex-plugin .claude-plugin/marketplace.json` — both versions read 1.4.0; all descriptions mention adopt. Validate JSON: `for f in plugins/poooof/.claude-plugin/plugin.json plugins/poooof/.codex-plugin/plugin.json .claude-plugin/marketplace.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "BAD $f"; done` → no BAD lines.

- [ ] **Step 4: Commit.**

```bash
git add plugins/poooof/.claude-plugin plugins/poooof/.codex-plugin .claude-plugin/marketplace.json .agents/plugins/marketplace.json
git commit -m "feat(release): v1.4.0 — adopt skill + context-aware framework"
```

### Task 7: End-to-end verification scenarios

**Files:** none in-repo — scratch dirs under the session scratchpad. The executor role-plays the operator with plausible answers; what's being verified is the mechanics (tiers, stamps, merge preservation, no-op), not interview prose.

- [ ] **Step 1: Fresh adopt, build shape, with pre-existing CLAUDE.md.** Create a scratch repo: a couple of source files, 3 commits, and a `CLAUDE.md` containing one custom project rule. Follow `adopt/SKILL.md` literally. PASS = docs exist and describe the scratch project (not blanks); the custom rule survived the merge; every doc stamped `<!-- poooof 1.4.0 -->`; commit happened only after the diff was produced; repo still flat (declined convert-to-bare).

- [ ] **Step 2: Fresh adopt, ops shape.** Scratch repo shaped like an infra project (a couple of deploy scripts). PASS = `RUNBOOK.md` installed with stamp; ROADMAP framed as objectives, not phases.

- [ ] **Step 3: Upgrade mode.** Take the Step-1 result, hand-edit all stamps to `<!-- poooof 1.3.0 -->` and delete one framework blockquote from ROADMAP.md; re-run adopt. PASS = staleness reported; blockquote restored; project content (roadmap items, custom rule) untouched; stamps now 1.4.0. Re-run again → reports current, changes nothing.

- [ ] **Step 4: new-project regression.** Scaffold a scratch project per `new-project/SKILL.md` steps 1–4 (skip GitHub). PASS = all docs stamped `1.4.0` (no `X.Y.Z` left: `grep -rn 'X\.Y\.Z' <dest>/main` empty); `RUNBOOK.md` absent; CLAUDE.md contains rule 10 and the claude-mem sentence.

- [ ] **Step 5: Fix anything that failed, amend the relevant commits or add fix commits, re-run the failed scenario.**

- [ ] **Step 6: Clean up scratch dirs; report results per scenario.**

### Task 8: Release

- [ ] **Step 1: Push.** `git push` on `main`. (This is the release: version bump is what update-nudge/auto-update users receive.)
- [ ] **Step 2: Post-release note to operator.** Remind: run `/poooof:update` here (or let auto-update pull it), and `/poooof:adopt` is then available for the ops project and the two older poooof projects.

---

## Self-review notes (done at write time)

- **Spec coverage:** stamps→T1, CLAUDE.md rules→T2, RUNBOOK→T3, adopt both modes + three tiers + review gate + convert-to-bare chain→T4, README incl. claude-mem recommendation→T5, manifests/version→T6, verification plan→T7, release→T8. Spec's "marketplace blurbs if they enumerate commands"→T6.
- **No placeholders:** every content edit is written out verbatim. The `X.Y.Z` strings are the *product's* literal placeholder, not a plan gap.
- **Consistency:** stamp format `<!-- poooof X.Y.Z -->` identical across T1/T3/T4/T7; version read command identical in `new-project` and `adopt`; doc-dir resolution in adopt matches `check-sync.js` behavior described in the spec.
