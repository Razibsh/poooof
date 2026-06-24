# Poooof Workstreams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Poooof framework so every future project supports 3–6 parallel agent sessions with a bare-repo worktree layout, a single `WORKSTREAMS.md` dashboard, per-stream `STATUS.md` (with an append-only decision log), and two push-button skills (`start-stream`, `finish-stream`) — then push to GitHub so it propagates.

**Architecture:** Pure framework/template + skill-authoring change in the `Razibsh/poooof` repo. No application code. Changes are: (a) markdown template files the scaffolder copies into new projects; (b) the `new-project` skill's scaffolding steps; (c) a new `workstream` plugin holding two skills; (d) marketplace + plugin registration for both Claude and Codex. Verification is concrete: scaffold a throwaway project into `/tmp` and assert the structure/files; prove the documented git sequences in scratch repos.

**Tech Stack:** Git ≥ 2.42 worktrees (verified: git 2.50.1, `worktree add --orphan` works), Claude Code / Codex plugin format (`.claude-plugin`, `.codex-plugin`, `.agents/plugins/marketplace.json`), Markdown. Spec: `docs/superpowers/specs/2026-06-24-poooof-workstreams-design.md`.

**Working location:** branch `feat/workstreams` in `/Users/rbs/Razi's Claude/poooof` (already created and checked out; the spec lives there).

**Path conventions:** `REPO` = `/Users/rbs/Razi's Claude/poooof`. `TPL` = `$REPO/plugins/new-project/skills/new-project/claude-project-template`. Always wrap paths with spaces in double quotes.

---

## File Structure

**Template files the scaffolder copies into every new project** (`$TPL/`):
- `WORKSTREAMS.md` — CREATE. The dashboard of active parallel streams. Lives on `main`.
- `STATUS.md` — MODIFY. Reframe as per-stream; add an append-only `## Decision log` section.
- `TEAM-WORKFLOW.md` — MODIFY. Replace the "Working in parallel" section with the bare-repo layout + the two skills.
- `CLAUDE.md` — MODIFY. Session start/end protocol (read/update `WORKSTREAMS.md`), confirm-first worktree trigger, decision-logging rule, cleanup-on-merge + decision promotion, `Key files` list.

**Scaffolder:**
- `plugins/new-project/skills/new-project/SKILL.md` — MODIFY. Steps 3–5 (and 8/10) to scaffold the bare-repo layout, template into `main/`, GitHub from `main/`, and seed `WORKSTREAMS.md`/`STATUS.md`.

**New `workstream` plugin** (`plugins/workstream/`):
- `.claude-plugin/plugin.json` — CREATE.
- `.codex-plugin/plugin.json` — CREATE.
- `skills/start-stream/SKILL.md` — CREATE.
- `skills/finish-stream/SKILL.md` — CREATE.

**Registration:**
- `.claude-plugin/marketplace.json` — MODIFY. Add the `workstream` plugin.
- `.agents/plugins/marketplace.json` — MODIFY. Add the `workstream` plugin (Codex).

**Docs:**
- `README.md` — MODIFY. Document the workstreams model + the two skills + install.

**Verification scratch (never committed):** `/tmp/poooof-*` throwaway dirs.

---

## Task 1: Lock the bare-repo init sequence (de-risk everything)

**Files:** none changed — this produces the verified command block reused in Tasks 6 & 8.

- [ ] **Step 1: Prove the init sequence in a scratch dir**

Run:
```bash
D="/tmp/poooof-init-test-$$"; rm -rf "$D"; mkdir -p "$D" && cd "$D"
git init --bare .bare -q
printf 'gitdir: ./.bare\n' > .git
git symbolic-ref HEAD refs/heads/main
git worktree add --orphan -b main main
ls -a "$D"          # expect: .  ..  .bare  .git  main
test -d "$D/main" && echo "MAIN WORKTREE OK"
```
Expected: directory lists `.bare`, `.git`, `main`; prints `MAIN WORKTREE OK`.

- [ ] **Step 2: Prove first commit + a second worktree work on it**

Run (continuing in `$D`):
```bash
cd "$D/main" && echo "# test" > README.md && git add -A && git commit -q -m "first"
cd "$D" && git worktree add audience -b feat/audience main
git worktree list          # expect main (main) + audience (feat/audience)
cd "$D/audience" && test -f README.md && echo "STREAM WORKTREE INHERITS MAIN OK"
```
Expected: `git worktree list` shows two worktrees; prints `STREAM WORKTREE INHERITS MAIN OK`.

- [ ] **Step 3: Clean up scratch**

Run: `rm -rf "$D"` — no output expected.

- [ ] **Step 4: Record the locked sequence**

The verified create-project sequence (used in Task 6) is:
```bash
mkdir -p "<DEST>"
git -C "<DEST>" init --bare .bare -q
printf 'gitdir: ./.bare\n' > "<DEST>/.git"
git -C "<DEST>" symbolic-ref HEAD refs/heads/main
git -C "<DEST>" worktree add --orphan -b main main
```
The verified add-stream sequence (used in Task 8), run from `<DEST>`:
```bash
git -C "<DEST>" worktree add "<name>" -b "feat/<name>" main
```
No commit needed — this task only validates and records. (Nothing to commit.)

---

## Task 2: Add `WORKSTREAMS.md` to the template

**Files:**
- Create: `$TPL/WORKSTREAMS.md`

- [ ] **Step 1: Create the file**

Create `$TPL/WORKSTREAMS.md` with exactly:
```markdown
# Workstreams — what's in flight right now

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
```

- [ ] **Step 2: Verify it exists and is well-formed**

Run: `grep -c "| Stream | Branch |" "$TPL/WORKSTREAMS.md"`
Expected: `1`.

- [ ] **Step 3: Commit**

```bash
cd "$REPO"
git add "plugins/new-project/skills/new-project/claude-project-template/WORKSTREAMS.md"
git commit -m "feat(template): add WORKSTREAMS.md dashboard for parallel streams"
```

---

## Task 3: Extend `STATUS.md` template (per-stream + append-only decision log)

**Files:**
- Modify: `$TPL/STATUS.md`

- [ ] **Step 1: Replace the intro blockquote to clarify per-stream + two halves**

In `$TPL/STATUS.md`, replace the opening blockquote (the paragraph starting `> The committed home for the end-of-session status block`) with:
```markdown
> The committed handoff for **this stream** (this worktree/branch). Two halves: the **current-state**
> blocks below are *overwritten* every session so they always show where the stream stands; the
> **Decision log** at the bottom is *append-only* — never erase it. Anyone (you tomorrow, a teammate,
> Codex, another agent) can pull the branch and know exactly where things stand and *why*, without chat
> history. Because each stream has its own branch, two sessions never overwrite each other's STATUS.md.
> If this file and `git log` disagree, reconcile before doing anything else.
```

- [ ] **Step 2: Append the decision-log section**

At the END of `$TPL/STATUS.md`, append:
```markdown

## Decision log (append-only — never erase)
> Every meaningful decision in THIS stream, newest at the bottom, each with a one-line "why". The agent
> appends here automatically as decisions happen — you never have to ask. On merge, the locked /
> cross-cutting decisions get promoted into the project `DECISIONS.md`.
- YYYY-MM-DD — <decision> — <why>
```

- [ ] **Step 3: Verify both edits landed**

Run: `grep -c "Decision log (append-only" "$TPL/STATUS.md" && grep -c "two sessions never overwrite" "$TPL/STATUS.md"`
Expected: `1` then `1`.

- [ ] **Step 4: Commit**

```bash
cd "$REPO"
git add "plugins/new-project/skills/new-project/claude-project-template/STATUS.md"
git commit -m "feat(template): STATUS.md is per-stream + gains append-only decision log"
```

---

## Task 4: Rewrite the "Working in parallel" section of `TEAM-WORKFLOW.md`

**Files:**
- Modify: `$TPL/TEAM-WORKFLOW.md` (the section starting `## Working in parallel — give each task its own folder (worktrees)`, ending at the `---` before `## How the agents fit in`)

- [ ] **Step 1: Replace the whole section**

Replace everything from the heading `## Working in parallel — give each task its own folder (worktrees)` up to (but not including) the `---` separator that precedes `## How the agents fit in`, with:
```markdown
## Working in parallel — one folder per stream (worktrees)

The simple default is **one task at a time**: one branch, one folder. But you can run **several tasks at
once** — different chats/agents each building a different feature. The tool that makes this safe is a
**worktree**: another folder holding the same project, locked to its own branch. One chat per folder = they
physically cannot collide.

**The layout (bare repo).** A Poooof project is one folder containing the git engine plus one folder per
branch:

```
ProjectName/
├── .bare/        ← the git engine (hidden; you never open it)
├── main/         ← the LIVE branch (deploys / merges land here)
├── audience/     ← a parallel stream (branch feat/audience)
└── billing/      ← another parallel stream (branch feat/billing)
```

You open `ProjectName/<stream>/` to work that feature, `ProjectName/main/` for the live branch.
`git worktree list` (from any of them) is always the true map.

**You don't type git for this.** Two skills do the whole lifecycle:

- `workstream:start-stream <name>` — makes the folder + branch off the latest `main`, seeds the stream's
  `STATUS.md`, and adds a row to `WORKSTREAMS.md`. The agent proposes this automatically (confirm-first)
  the moment you start a second task while one is unfinished.
- `workstream:finish-stream [name]` — once the feature is done and merged, it promotes the stream's locked
  decisions into `DECISIONS.md`, removes the folder, deletes the branch, and clears the `WORKSTREAMS.md` row.

**`WORKSTREAMS.md` is the dashboard.** It lists every active stream and who owns it. Read it first every
session — it's how any agent (including Codex) sees what's in flight and never grabs a stream someone else
is driving.

Golden rules (mostly enforced by git, so they're hard to break):
- **One branch per worktree** — git won't let the same branch be open in two folders.
- **Never delete a stream folder by hand in Finder** — always `finish-stream` (or `git worktree remove`), so
  git's bookkeeping stays clean.
- **Every stream starts from a fresh `main`** (the skill does this), so features don't inherit each other's
  half-done work.

**When to bother:** only when you're genuinely running 2+ tasks at the same moment. One thing at a time —
even across different days — is simpler as a plain branch on `main`.
```

- [ ] **Step 2: Verify the old sibling layout is gone and the new one is present**

Run: `grep -c "project-trees" "$TPL/TEAM-WORKFLOW.md"; grep -c "one folder per branch" "$TPL/TEAM-WORKFLOW.md" || true; grep -c "workstream:start-stream" "$TPL/TEAM-WORKFLOW.md"`
Expected: first `0` (old layout removed), and `workstream:start-stream` count `1`.

- [ ] **Step 3: Commit**

```bash
cd "$REPO"
git add "plugins/new-project/skills/new-project/claude-project-template/TEAM-WORKFLOW.md"
git commit -m "docs(template): rewrite parallel-work section to bare-repo layout + stream skills"
```

---

## Task 5: Update the template `CLAUDE.md` rules

**Files:**
- Modify: `$TPL/CLAUDE.md` (rule 1 line 23; rule 8 line ~39; the `## Working with other agents / a teammate` section line 45; `## Key files in this repo` line 82)

- [ ] **Step 1: Update rule 1 (session start) — read the dashboard first**

Replace rule 1 (the line beginning `1. **Start of every session:** read `ROADMAP.md` first.`) with:
```markdown
1. **Start of every session:** read `WORKSTREAMS.md` first (what parallel streams are in flight + who owns
   them). If you're in a stream worktree, read that stream's `STATUS.md` next (where it stands). Then read
   `ROADMAP.md` and work ONLY on the current phase of the stream you own.
```

- [ ] **Step 2: Add a decision-logging rule (new rule 9)**

Immediately after rule 8 (the block ending `...reconcile `STATUS.md` and the docs with `git log` and reality.`), add:
```markdown
9. **Log decisions as they happen.** Whenever a meaningful choice is made (an approach picked, a tradeoff
   settled, a constraint discovered), append one dated line to the `## Decision log` in the current stream's
   `STATUS.md` — automatically, without being asked. On merge, promote the locked/cross-cutting ones into
   `DECISIONS.md`. Nothing important should live only in the chat.
```

- [ ] **Step 3: Replace the parallel-work rule in "Working with other agents / a teammate"**

In the `## Working with other agents / a teammate` section, replace the paragraph that begins
`**Parallel-work rule (apply automatically):**` (through the end of that paragraph) with:
```markdown
**Parallel-work rule (apply automatically):** before starting a new task, check `WORKSTREAMS.md` and whether
work is already in progress (uncommitted changes, or the operator opening a *second* task while a first is
unfinished). If a new task would run in parallel, don't pile onto the current branch — say so and propose a
worktree: *"this is a new parallel stream — I'll run `workstream:start-stream <name>`, ok?"* and wait for a
yes (confirm-first). One task at a time needs no worktree — just branch normally. When a stream is done and
merged, run `workstream:finish-stream` to clean up. The bare-repo layout, the two skills, and the
`WORKSTREAMS.md` dashboard are described in `TEAM-WORKFLOW.md` → "Working in parallel".
```

- [ ] **Step 4: Add `WORKSTREAMS.md` to the Key files list**

In `## Key files in this repo`, immediately after the `- `ROADMAP.md`` line, add:
```markdown
- `WORKSTREAMS.md` — dashboard of active parallel streams. Read first when running more than one at once.
```

- [ ] **Step 5: Verify all four edits**

Run:
```bash
grep -c "read `WORKSTREAMS.md` first" "$TPL/CLAUDE.md"
grep -c "Log decisions as they happen" "$TPL/CLAUDE.md"
grep -c "workstream:start-stream <name>" "$TPL/CLAUDE.md"
grep -c "dashboard of active parallel streams" "$TPL/CLAUDE.md"
```
Expected: `1`, `1`, `1`, `1`.

- [ ] **Step 6: Commit**

```bash
cd "$REPO"
git add "plugins/new-project/skills/new-project/claude-project-template/CLAUDE.md"
git commit -m "docs(template): CLAUDE.md rules for dashboard-first sessions, decision logging, stream lifecycle"
```

---

## Task 6: Update `new-project` to scaffold the bare-repo layout

**Files:**
- Modify: `$REPO/plugins/new-project/skills/new-project/SKILL.md` (Steps 2–10 in the `## Steps` section)

- [ ] **Step 1: Rewrite Step 3 (copy template) to target `main/` after bare init**

Replace Step 3 (`3. **Copy the bundled template.**` and its code block) with:
```markdown
3. **Create the bare-repo project skeleton, then copy the template into `main/`.**
   ```
   TEMPLATE="${CLAUDE_PLUGIN_ROOT}/skills/new-project/claude-project-template"
   mkdir -p "<destination>"
   git -C "<destination>" init --bare .bare -q
   printf 'gitdir: ./.bare\n' > "<destination>/.git"
   git -C "<destination>" symbolic-ref HEAD refs/heads/main
   git -C "<destination>" worktree add --orphan -b main main
   cp -R "$TEMPLATE/." "<destination>/main/"
   rm -f "<destination>/main/.DS_Store"
   ```
   Result: `<destination>/` holds `.bare/`, `.git`, and `main/` (the live branch) with the template inside
   `main/`. All project work and docs live under `main/` (and, later, sibling stream folders). This requires
   git ≥ 2.42 for `worktree add --orphan` (verified on git 2.50.1).
```

- [ ] **Step 2: Rewrite Step 4 (first commit) to run inside `main/`**

Replace Step 4 (`4. **Fresh git history.**` and its block) with:
```markdown
4. **First commit (inside `main/`).**
   ```
   cd "<destination>/main"
   git add -A && git commit -q -m "Scaffold <project name> from Poooof template"
   ```
   (The bare repo already exists from Step 3; this just records the first commit on `main`.)
```

- [ ] **Step 3: Update Step 5 (GitHub) to push from `main/`**

In Step 5, replace the `gh repo create` line with:
```
gh repo create "<repo-name>" --private --source="<destination>/main" --remote=origin --push
```
Leave the rest of Step 5 (slug rules, gh-missing fallback) unchanged.

- [ ] **Step 4: Point Steps 6–9 at the `main/` copies**

In Step 6, change "Read the copied `CLAUDE.md`" to "Read `<destination>/main/CLAUDE.md`". In Steps 7–9, where
they edit `ROADMAP.md`/`STATUS.md` and run `git add -A && git commit`, prefix paths with `main/` and run git
from `<destination>/main`. Specifically, in Step 9 replace the block with:
```
cd "<destination>/main"
git add -A && git commit -q -m "Fill in project context + draft Phase 1 roadmap"
```
(If a GitHub remote was created, `git push -q`.)

- [ ] **Step 5: Update Step 8 (seed STATUS.md) + add WORKSTREAMS note**

In Step 8, after seeding `STATUS.md`, add this sentence:
```markdown
   Leave `WORKSTREAMS.md` as the empty-dashboard template copied in — a fresh project has no parallel streams
   yet. (Streams get added later by `workstream:start-stream`.)
```

- [ ] **Step 6: Update Step 10 (report/handoff) for the new layout**

In Step 10, replace the final handoff line with:
```markdown
    > Next: open the new project's `main/` folder and tell your agent —
    > *"Read CLAUDE.md and ROADMAP.md, then let's start Phase 1."*
    > To run a second feature in parallel later, just ask — the agent will set up a worktree stream for you.
```

- [ ] **Step 7: Verify the SKILL.md edits**

Run:
```bash
S="$REPO/plugins/new-project/skills/new-project/SKILL.md"
grep -c "worktree add --orphan -b main main" "$S"
grep -c '<destination>/main' "$S"
grep -c "git init -q && git add -A" "$S"   # OLD line must be gone
```
Expected: `1` (or more), `≥4`, and `0` (old `git init` flow removed).

- [ ] **Step 8: End-to-end scaffold test in /tmp (the real proof)**

Run a non-interactive simulation of the scaffolding mechanics (skip the interview):
```bash
DEST="/tmp/poooof-scaffold-test-$$"; rm -rf "$DEST"
TEMPLATE="$REPO/plugins/new-project/skills/new-project/claude-project-template"
mkdir -p "$DEST"
git -C "$DEST" init --bare .bare -q
printf 'gitdir: ./.bare\n' > "$DEST/.git"
git -C "$DEST" symbolic-ref HEAD refs/heads/main
git -C "$DEST" worktree add --orphan -b main main
cp -R "$TEMPLATE/." "$DEST/main/"
cd "$DEST/main" && git add -A && git commit -q -m "scaffold test"
echo "--- structure ---"; ls -a "$DEST"; echo "--- main/ docs ---"; ls "$DEST/main" | grep -E "WORKSTREAMS|STATUS|CLAUDE|ROADMAP"
test -f "$DEST/main/WORKSTREAMS.md" && echo "WORKSTREAMS PRESENT IN MAIN OK"
git -C "$DEST" worktree list
rm -rf "$DEST"
```
Expected: `.bare`, `.git`, `main` at root; `WORKSTREAMS.md`/`STATUS.md`/`CLAUDE.md`/`ROADMAP.md` inside `main/`;
prints `WORKSTREAMS PRESENT IN MAIN OK`; `worktree list` shows the single `main` worktree.

- [ ] **Step 9: Commit**

```bash
cd "$REPO"
git add "plugins/new-project/skills/new-project/SKILL.md"
git commit -m "feat(new-project): scaffold bare-repo layout with template in main/"
```

---

## Task 7: Create the `workstream` plugin skeleton + register it

**Files:**
- Create: `$REPO/plugins/workstream/.claude-plugin/plugin.json`
- Create: `$REPO/plugins/workstream/.codex-plugin/plugin.json`
- Modify: `$REPO/.claude-plugin/marketplace.json`
- Modify: `$REPO/.agents/plugins/marketplace.json`

- [ ] **Step 1: Create the Claude plugin manifest**

Create `$REPO/plugins/workstream/.claude-plugin/plugin.json`:
```json
{
  "name": "workstream",
  "displayName": "Poooof — Workstreams",
  "description": "Run multiple features in parallel safely: start-stream creates a worktree + branch + STATUS.md and registers it in WORKSTREAMS.md; finish-stream merges, promotes decisions, and cleans up. Built for solo developers driving several Claude/Codex sessions at once.",
  "author": {
    "name": "Razibsh",
    "email": "shyfttothetop@gmail.com"
  },
  "homepage": "https://github.com/Razibsh/poooof",
  "repository": "https://github.com/Razibsh/poooof",
  "license": "MIT",
  "keywords": ["worktree", "parallel", "workflow", "git", "multi-agent"]
}
```

- [ ] **Step 2: Create the Codex plugin manifest**

Create `$REPO/plugins/workstream/.codex-plugin/plugin.json`:
```json
{
  "name": "workstream",
  "version": "1.0.0",
  "description": "Run multiple features in parallel safely: start-stream creates a worktree + branch + STATUS.md and registers it in WORKSTREAMS.md; finish-stream merges, promotes decisions, and cleans up.",
  "author": {
    "name": "Razibsh",
    "email": "shyfttothetop@gmail.com"
  },
  "homepage": "https://github.com/Razibsh/poooof",
  "repository": "https://github.com/Razibsh/poooof",
  "license": "MIT",
  "keywords": ["worktree", "parallel", "workflow", "git", "multi-agent"],
  "skills": "./skills/"
}
```

- [ ] **Step 3: Register in the Claude marketplace**

In `$REPO/.claude-plugin/marketplace.json`, add a second entry to the `plugins` array (after the `new-project` object):
```json
    {
      "name": "workstream",
      "source": "./plugins/workstream",
      "description": "Run multiple features in parallel safely: start-stream + finish-stream manage worktrees, STATUS.md, WORKSTREAMS.md, and the merge/cleanup lifecycle."
    }
```

- [ ] **Step 4: Register in the Codex marketplace**

In `$REPO/.agents/plugins/marketplace.json`, add a second entry to the `plugins` array (after the `new-project` object):
```json
    {
      "name": "workstream",
      "source": {
        "source": "local",
        "path": "./plugins/workstream"
      },
      "category": "Productivity"
    }
```

- [ ] **Step 5: Verify both JSON files are valid and contain both plugins**

Run:
```bash
python3 -c "import json;d=json.load(open('$REPO/.claude-plugin/marketplace.json'));print('claude plugins:',[p['name'] for p in d['plugins']])"
python3 -c "import json;d=json.load(open('$REPO/.agents/plugins/marketplace.json'));print('codex plugins:',[p['name'] for p in d['plugins']])"
python3 -c "import json;json.load(open('$REPO/plugins/workstream/.claude-plugin/plugin.json'));json.load(open('$REPO/plugins/workstream/.codex-plugin/plugin.json'));print('plugin manifests valid')"
```
Expected: both lists print `['new-project', 'workstream']`; prints `plugin manifests valid`.

- [ ] **Step 6: Commit**

```bash
cd "$REPO"
git add plugins/workstream/.claude-plugin/plugin.json plugins/workstream/.codex-plugin/plugin.json .claude-plugin/marketplace.json .agents/plugins/marketplace.json
git commit -m "feat(workstream): add plugin skeleton + register in Claude & Codex marketplaces"
```

---

## Task 8: Author the `start-stream` skill

**Files:**
- Create: `$REPO/plugins/workstream/skills/start-stream/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `$REPO/plugins/workstream/skills/start-stream/SKILL.md`:
```markdown
---
name: start-stream
description: Start a new parallel workstream — create a worktree + branch off the latest main, seed its STATUS.md, and register it in WORKSTREAMS.md. Use when running a second feature while another is unfinished. User-invoked or proposed confirm-first by the agent.
argument-hint: [stream name]
allowed-tools: Bash(git:*), Bash(ls:*), Bash(test:*), Bash(printf:*), Read, Write, Edit, AskUserQuestion
---

# Start a parallel workstream

Create an isolated worktree so a new feature can be built alongside others without collisions. Plain
language; the operator may not be a developer. **Confirm-first**: state the plan and the folder name, then
wait for a yes before creating anything.

## Inputs
- **Stream name:** `$ARGUMENTS` — a short slug (e.g. `billing`, `audience`). If empty, ask what to call it.
  Lowercase, hyphens, no spaces. The branch becomes `feat/<name>`; the folder is `<name>/`.
- **Project root:** the bare-repo project folder that contains `.bare/` and `main/`. If the current folder is
  a worktree of such a project, its root is the parent of `main/`. Confirm by running `git rev-parse --git-common-dir`.

## Steps

1. **Locate the project root and the `main` worktree.**
   ```
   COMMON=$(git rev-parse --git-common-dir)          # .../<Project>/.bare
   ROOT=$(cd "$COMMON/.." && pwd)                     # .../<Project>
   ```
   If there is no `$ROOT/main` folder, tell the operator this project isn't on the bare-repo layout and stop
   (point them at TEAM-WORKFLOW.md). 

2. **Refuse duplicates.** Run `git -C "$ROOT" worktree list`. If a worktree for `feat/<name>` or a folder
   `$ROOT/<name>` already exists, say so and stop (offer a different name).

3. **Confirm the plan (confirm-first).** Tell the operator exactly what will happen:
   *"I'll create `<ROOT>/<name>/` on a new branch `feat/<name>` off the latest `main`, seed its STATUS.md, and
   add it to WORKSTREAMS.md. OK?"* Use AskUserQuestion. Only proceed on yes.

4. **Create the worktree off the latest main.**
   ```
   git -C "$ROOT/main" pull --ff-only 2>/dev/null || true
   git -C "$ROOT" worktree add "<name>" -b "feat/<name>" main
   ```

5. **Seed the stream's STATUS.md.** In `$ROOT/<name>/STATUS.md`, set `**Last updated:**` to today + a
   one-line goal (ask the operator for the goal in one sentence), and set `## Next` to that goal. Leave the
   `## Decision log` heading in place with no entries yet. Commit inside the stream:
   ```
   cd "$ROOT/<name>" && git add STATUS.md && git commit -q -m "chore(stream): seed STATUS for <name>"
   ```

6. **Register the row in WORKSTREAMS.md (on main).** In `$ROOT/main/WORKSTREAMS.md`, replace the
   `| _(none active)_ | ... |` placeholder row if present, else append a new row:
   `| <name> | feat/<name> | <name>/ | <owner> | active | <one-line goal> | <today> |`
   where `<owner>` is the agent/session (ask or infer, e.g. "Claude — chat 1"). Commit on main:
   ```
   cd "$ROOT/main" && git add WORKSTREAMS.md && git commit -q -m "chore(workstreams): register <name>"
   ```
   If `origin` exists, `git push -q` both branches.

7. **Report.** Tell the operator the exact folder to open (`<ROOT>/<name>/`) and that they (or another
   agent/Codex) can now work there independently. Remind them to run `workstream:finish-stream` when it's
   merged.

## Rules
- Confirm-first — never create folders/branches before the operator says yes.
- One branch per worktree; never reuse a name already in `git worktree list`.
- Always branch off the freshly pulled `main` so streams don't inherit each other's half-done work.
```

- [ ] **Step 2: Verify the skill file is well-formed**

Run:
```bash
S="$REPO/plugins/workstream/skills/start-stream/SKILL.md"
head -1 "$S" | grep -qx -- "---" && echo "frontmatter starts OK"
grep -c "allowed-tools:" "$S"; grep -c "worktree add" "$S"
```
Expected: `frontmatter starts OK`; `1`; `≥1`.

- [ ] **Step 3: Prove the documented create sequence works end-to-end**

Run in a scratch bare project (mirrors what the skill does):
```bash
D="/tmp/poooof-start-test-$$"; rm -rf "$D"; mkdir -p "$D"
git -C "$D" init --bare .bare -q; printf 'gitdir: ./.bare\n' > "$D/.git"
git -C "$D" symbolic-ref HEAD refs/heads/main
git -C "$D" worktree add --orphan -b main main
cp -R "$TPL/." "$D/main/"; cd "$D/main" && git add -A && git commit -q -m init
# simulate start-stream:
git -C "$D" worktree add billing -b feat/billing main
test -f "$D/billing/STATUS.md" && echo "STREAM SEEDED OK"
git -C "$D" worktree list
rm -rf "$D"
```
Expected: prints `STREAM SEEDED OK`; `worktree list` shows `main` + `billing`.

- [ ] **Step 4: Commit**

```bash
cd "$REPO"
git add "plugins/workstream/skills/start-stream/SKILL.md"
git commit -m "feat(workstream): add start-stream skill"
```

---

## Task 9: Author the `finish-stream` skill

**Files:**
- Create: `$REPO/plugins/workstream/skills/finish-stream/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `$REPO/plugins/workstream/skills/finish-stream/SKILL.md`:
```markdown
---
name: finish-stream
description: Finish a parallel workstream — verify it's merged to main, promote its locked decisions into DECISIONS.md, then remove the worktree, delete the branch, and clear its WORKSTREAMS.md row. Defaults to a PR (review + test gate); a project can opt into fast-forward. User-invoked.
argument-hint: [stream name]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(ls:*), Bash(test:*), Read, Write, Edit, AskUserQuestion
---

# Finish a parallel workstream

Safely land a finished stream and clean up — the exact lifecycle that, done by hand, is easy to get wrong.
Plain language; the operator may not be a developer.

## Inputs
- **Stream name:** `$ARGUMENTS`. If empty, list active streams from `WORKSTREAMS.md` and ask which one.
- **Project root:** as in start-stream — the folder containing `.bare/` and `main/`
  (`ROOT=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)`).

## Steps

1. **Locate root, stream folder, and branch.** `STREAM="$ROOT/<name>"`, branch `feat/<name>`. If the folder
   or branch is missing, say so and stop.

2. **Safety gate — tests + clean tree.** If the project defines a test command (check `main/CLAUDE.md`
   Testing section / `package.json`), run it inside `$STREAM`. If tests fail, STOP and report — do not merge.
   Refuse if `$STREAM` has uncommitted changes (`git -C "$STREAM" status --porcelain` non-empty) until the
   operator commits or discards them.

3. **Decide merge style (per-project, asked once).** Look for a `merge_style` line in `main/DECISIONS.md`
   (values `pr` or `ff`). If absent, ask the operator once with AskUserQuestion:
   *"Land `<name>` via a Pull Request (recommended — a review + test gate before main), or fast-forward
   straight to main (faster, no gate)?"* Record their choice by appending to `main/DECISIONS.md`:
   `- merge_style: <pr|ff> — how finished streams land on main (set <today>).` and commit it on main.

4. **Land the stream.**
   - **PR style:** push the branch (`git -C "$STREAM" push -u origin "feat/<name>"`), open a PR
     (`gh pr create --fill --head "feat/<name>" --base main`), and tell the operator to review/merge it.
     **Stop here for the merge itself** (a human/second pass merges the PR); resume cleanup (steps 5–7) only
     after it's merged. Verify merged: `git -C "$ROOT/main" pull --ff-only && git -C "$ROOT/main" merge-base --is-ancestor "feat/<name>" main`.
   - **FF style:** `git -C "$ROOT/main" pull --ff-only 2>/dev/null || true; git -C "$ROOT/main" merge --ff-only "feat/<name>"` then `git -C "$ROOT/main" push -q` if `origin` exists.

5. **Promote decisions.** Open `$STREAM/STATUS.md` → `## Decision log`. Move the locked / cross-cutting
   decisions into `main/DECISIONS.md` (under its list), each as a `- <decision> — <why> (<date>, from <name>)`
   line. Commit on main: `git -C "$ROOT/main" add DECISIONS.md && git -C "$ROOT/main" commit -q -m "docs(decisions): promote from <name>"`.

6. **Clean up the worktree + branch.**
   ```
   cd "$ROOT/main"
   git worktree remove "$ROOT/<name>"            # add --force only if it refuses due to untracked build files
   git branch -D "feat/<name>"
   git push origin --delete "feat/<name>" 2>/dev/null || true
   ```

7. **Clear the WORKSTREAMS.md row + report.** In `$ROOT/main/WORKSTREAMS.md`, delete the `<name>` row (restore
   the `| _(none active)_ |` placeholder if it was the last one). Commit on main and push if `origin` exists.
   Tell the operator the stream is merged + cleaned, and confirm `git worktree list` no longer shows it.

## Rules
- Never clean up before the branch is actually merged into `main` (verify with `merge-base --is-ancestor`).
- Default to PR; only fast-forward when the project's `merge_style` says so.
- Refuse on failing tests or an uncommitted stream — surface the problem instead of forcing through.
```

- [ ] **Step 2: Verify the skill file is well-formed**

Run:
```bash
S="$REPO/plugins/workstream/skills/finish-stream/SKILL.md"
head -1 "$S" | grep -qx -- "---" && echo "frontmatter starts OK"
grep -c "merge-base --is-ancestor" "$S"; grep -c "merge_style" "$S"
```
Expected: `frontmatter starts OK`; `≥1`; `≥2`.

- [ ] **Step 3: Prove the ff-merge + cleanup sequence works end-to-end**

Run in a scratch bare project:
```bash
D="/tmp/poooof-finish-test-$$"; rm -rf "$D"; mkdir -p "$D"
git -C "$D" init --bare .bare -q; printf 'gitdir: ./.bare\n' > "$D/.git"
git -C "$D" symbolic-ref HEAD refs/heads/main
git -C "$D" worktree add --orphan -b main main
cp -R "$TPL/." "$D/main/"; cd "$D/main" && git add -A && git commit -q -m init
git -C "$D" worktree add billing -b feat/billing main
cd "$D/billing" && echo "x" > feature.txt && git add -A && git commit -q -m "feat work"
# finish (ff style):
git -C "$D/main" merge --ff-only feat/billing
git -C "$D/main" worktree remove "$D/billing"
git -C "$D/main" branch -D feat/billing
git -C "$D/main" worktree list                 # expect only main
test -f "$D/main/feature.txt" && echo "MERGED + CLEANED OK"
rm -rf "$D"
```
Expected: `worktree list` shows only `main`; prints `MERGED + CLEANED OK`.

- [ ] **Step 4: Commit**

```bash
cd "$REPO"
git add "plugins/workstream/skills/finish-stream/SKILL.md"
git commit -m "feat(workstream): add finish-stream skill"
```

---

## Task 10: Update the README

**Files:**
- Modify: `$REPO/README.md`

- [ ] **Step 1: Read the README to find the right insertion point**

Run: `grep -nE "^#|new-project|install" "$REPO/README.md" | head -40` to locate the plugins/usage section.

- [ ] **Step 2: Add a "Workstreams" section**

After the section that describes `new-project` (or the plugins list), add:
```markdown
## Workstreams — build several features in parallel

The `workstream` plugin lets one person drive 3–6 agent sessions at once (Claude + Codex) without losing
track of anything. A project uses a **bare-repo layout** — one folder per branch:

```
ProjectName/
├── .bare/      ← git engine (hidden)
├── main/       ← the live branch
└── <stream>/   ← one folder per parallel feature
```

Two commands run the whole lifecycle (no git knowledge needed):

- `workstream:start-stream <name>` — creates the stream's folder + branch off the latest `main`, seeds its
  `STATUS.md`, and registers it in `WORKSTREAMS.md`.
- `workstream:finish-stream [name]` — merges it (PR by default), promotes its decisions into `DECISIONS.md`,
  and cleans up the folder + branch + dashboard row.

`WORKSTREAMS.md` (on `main`) is the dashboard of what's in flight and who owns each stream — every agent reads
it first, so two sessions never collide. See a scaffolded project's `TEAM-WORKFLOW.md` for the full guide.

**Install (alongside new-project, same marketplace):**
```
/plugin marketplace add Razibsh/poooof   # if not already added
/plugin install workstream@poooof
```
```

- [ ] **Step 3: Verify**

Run: `grep -c "workstream:start-stream" "$REPO/README.md"; grep -c "Workstreams — build several features" "$REPO/README.md"`
Expected: `≥1`; `1`.

- [ ] **Step 4: Commit**

```bash
cd "$REPO"
git add README.md
git commit -m "docs(readme): document the workstream plugin + bare-repo layout"
```

---

## Task 11: Full dry-run + push to GitHub (propagation)

**Files:** none changed (final integration check + publish).

- [ ] **Step 1: Full scaffold + stream lifecycle in /tmp using the real template**

Run:
```bash
D="/tmp/poooof-e2e-$$"; rm -rf "$D"; mkdir -p "$D"
TPL="$REPO/plugins/new-project/skills/new-project/claude-project-template"
git -C "$D" init --bare .bare -q; printf 'gitdir: ./.bare\n' > "$D/.git"
git -C "$D" symbolic-ref HEAD refs/heads/main
git -C "$D" worktree add --orphan -b main main
cp -R "$TPL/." "$D/main/"; cd "$D/main" && git add -A && git commit -q -m init
# start two streams in parallel:
git -C "$D" worktree add billing -b feat/billing main
git -C "$D" worktree add audience -b feat/audience main
git -C "$D" worktree list   # main + billing + audience
# finish one:
cd "$D/billing" && echo y > f.txt && git add -A && git commit -q -m work
git -C "$D/main" merge --ff-only feat/billing
git -C "$D/main" worktree remove "$D/billing" && git -C "$D/main" branch -D feat/billing
echo "--- final worktrees (expect main + audience) ---"; git -C "$D" worktree list
rm -rf "$D"
```
Expected: mid-run shows three worktrees; final shows `main` + `audience` only. No errors.

- [ ] **Step 2: Run the full self-review greps (all template/skill artifacts present)**

Run:
```bash
test -f "$TPL/WORKSTREAMS.md" && grep -q "Decision log (append-only" "$TPL/STATUS.md" \
 && grep -q "one folder per branch\|bare repo" "$TPL/TEAM-WORKFLOW.md" \
 && grep -q "WORKSTREAMS.md" "$TPL/CLAUDE.md" \
 && test -f "$REPO/plugins/workstream/skills/start-stream/SKILL.md" \
 && test -f "$REPO/plugins/workstream/skills/finish-stream/SKILL.md" \
 && echo "ALL ARTIFACTS PRESENT"
```
Expected: `ALL ARTIFACTS PRESENT`.

- [ ] **Step 3: Update the framework repo's own STATUS.md**

Update `$REPO/STATUS.md` (if present; else skip) with what shipped: bare-repo layout, WORKSTREAMS.md,
per-stream STATUS, start/finish-stream skills; verified via /tmp dry-runs; next = backport to WhatsBot-v2.

- [ ] **Step 4: Push the branch and open the PR (propagation)**

```bash
cd "$REPO"
git push -u origin feat/workstreams
gh pr create --fill --base main --head feat/workstreams
```
Then merge per the operator's choice (PR review, or ff to main) so it reaches `origin/main` — that publish is
what propagates the framework to future projects and other machines.

- [ ] **Step 5: Confirm published**

Run: `git -C "$REPO" log --oneline origin/main -1` after merge.
Expected: the merge/tip commit of this work on `origin/main`.

---

## Self-Review

- **Spec coverage:** bare-repo layout → Tasks 1,4,6,11; `WORKSTREAMS.md` dashboard → Task 2 (+ wired in 5,6,8,9);
  per-stream `STATUS.md` + append-only decision log → Task 3; rules (session start/end, confirm-first trigger,
  decision logging, cleanup-on-merge, promotion) → Task 5; `start-stream`/`finish-stream` skills → Tasks 8,9;
  separate `workstream` plugin in same marketplace (Claude + Codex) → Task 7; merge-style default-PR + per-project
  override → Task 9 Step 3; README → Task 10; push-to-GitHub propagation → Task 11. Backport to WhatsBot-v2 is
  explicitly a separate follow-up (noted in Task 11 Step 3) ✓.
- **Placeholder scan:** every file has its full literal content; no TBD/TODO; the only `<name>`/`<destination>`
  tokens are intentional runtime substitutions documented at each use ✓.
- **Type/name consistency:** branch naming `feat/<name>`, folder `<name>/`, dashboard columns, and the
  `merge_style` key are used identically across Tasks 5, 8, 9, 10; the init sequence in Tasks 1/6/8/9/11 matches
  the verified one from Task 1 ✓.
- **Open item:** none blocking — the bare-repo init sequence was empirically verified (git 2.50.1) in Task 1.
