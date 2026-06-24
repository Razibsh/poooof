# Poooof Workstreams — parallel sessions, zero loss, full handoff

**Date:** 2026-06-24
**Repo:** `Razibsh/poooof` (the framework plugin + bundled project template)
**Status:** design approved by operator (Razi), pending spec review

## Goal (the success test)

Let a solo operator work across **3–6 parallel sessions** (Claude Code, Codex, and other agents),
where:

- every session **stays in sync** through committed files (git is the shared brain),
- **every meaningful decision lands in a document** automatically — the operator never has to say "note this",
- **any agent can pick up any stream cold**, with no reliance on chat memory,
- **nothing is ever forgotten or off the list**,
- the worktree + documentation lifecycle is **one command**, requiring no git knowledge.

This extends the framework that already exists in the template (`TEAM-WORKFLOW.md` worktrees section,
`CLAUDE.md` parallel-work rule, single `STATUS.md`). It revises the worktree *layout* and the *documentation
model*, and adds two helper skills so the workflow is push-button.

## Why now

The operator runs production software solo and wants to parallelize feature work across several agent
sessions. The current framework's worktree guidance uses scattered sibling folders (`project-trees/feature/`)
and a single overwrite-only `STATUS.md` — which a real two-session collision (2026-06-24, WhatsBot-v2) showed
is too loose: branches thrashed, folders scattered, and one status file cannot represent N concurrent streams.

## Decisions (locked with the operator)

1. **Folder layout = bare repo + named worktrees.**
2. **Worktree creation = confirm-first** — the agent proposes and names the worktree, then waits for a yes.
3. **Documentation = a single dashboard + per-stream living status with an append-only decision log.**
4. **Build the two helper skills now** (`start-stream`, `finish-stream`).
5. **Scope = the Poooof framework** (all future projects inherit it); **backport to WhatsBot-v2 after**.
6. **Propagation = push to the `Razibsh/poooof` GitHub repo.** New version becomes available there; each
   machine picks it up on plugin update; every project scaffolded *after* that is born with it. Already-scaffolded
   projects keep their copied template (hence the explicit backport step) — old projects never mutate underfoot.

---

## 1. Folder layout — bare repo

Every project Poooof scaffolds becomes:

```
ProjectName/
├── .bare/        ← the git database (bare clone). Never opened by hand.
├── .git          ← a one-line file pointing at .bare (so git commands work from ProjectName/)
├── main/         ← worktree on the main branch — the LIVE branch; deploys/PR-merges land here
├── <stream-a>/   ← a worktree on branch feat/<stream-a> (one parallel workstream)
└── <stream-b>/   ← a worktree on branch feat/<stream-b>
```

- You open `ProjectName/<stream>/` to work a feature; `ProjectName/main/` for the live branch.
- Worktree folders are named after the **stream** (`audience`, `billing`), not prefixed with the project name —
  the parent folder already namespaces them.
- `git worktree list` (run from any of these folders) is always the authoritative map of what exists.

This **replaces** the current template's `project-trees/feature/` sibling layout. `TEAM-WORKFLOW.md`'s
"Working in parallel" section and `new-project`'s scaffolding step are rewritten to this model.

### Scaffolding change (`new-project` skill)

Current `new-project` does `git init` in one folder. New flow:

1. `mkdir -p "ProjectName"`
2. `git init --bare "ProjectName/.bare"` and write `ProjectName/.git` = `gitdir: ./.bare`
3. `git -C ProjectName worktree add main` after the first commit exists, OR initialize main as the first
   worktree. (Implementation detail for the plan: bare repos have no initial branch/commit, so the sequence is
   create bare → add `main/` worktree on an orphan/initial branch → copy template into `main/` → commit there →
   set `origin` + push.)
4. Copy the template into `main/` (not the project root).
5. GitHub: `gh repo create ... --source=ProjectName/main` (or set remote on the bare repo and push `main`).

All template docs (`ROADMAP.md`, etc.) live in `main/` — the project root holds only `.bare/`, `.git`, and the
worktree folders.

---

## 2. Documentation model

The rule that makes "nothing lost" true: **only committed files travel to other agents**, so everything
important is a committed file. Two levels:

### Project level — on the `main` branch (the shared dashboard)

- **`WORKSTREAMS.md` (NEW):** the single "what's in flight / nothing off the list" view. A table, one row per
  active stream:

  | Stream | Branch | Folder | Owner (agent/session) | Status | Goal (one line) | Last touched |
  |---|---|---|---|---|---|---|

  Status ∈ `active · in-review · blocked · merging`. Updated only at stream **start** and **finish** (rare events
  → near-zero merge-conflict risk). This is the first file every session reads.
- `ROADMAP.md`, `BACKLOG.md`, `DECISIONS.md` — unchanged in purpose (phases / captured ideas / locked decisions).

### Stream level — inside each worktree, on its own branch

- **`STATUS.md` (per stream):** the living "where this stream stands" — goal, Done / Verified / Next / Blocked,
  Docs-in-sync. Overwritten each session so it is always current. Because each worktree is on its **own branch**,
  two sessions physically cannot overwrite each other's `STATUS.md`. (This is the existing `STATUS.md`, now
  explicitly per-stream rather than one-per-repo.)
- **Decision log (NEW, append-only):** a `## Decision log` section at the bottom of the stream's `STATUS.md`
  (kept in one file so there's nothing extra to manage). Every meaningful decision is appended with a date and a
  one-line "why", never erased. On merge, the locked/cross-cutting decisions are **promoted** into the project
  `DECISIONS.md`.

Keeping the decision log inside `STATUS.md` (rather than a separate file) is a deliberate YAGNI choice: one file
per stream to read and update, current-state on top, immutable history below.

---

## 3. The rules (baked into the template `CLAUDE.md` + `TEAM-WORKFLOW.md`)

- **Session start:** read `WORKSTREAMS.md` (what's in flight + who owns what) → then this stream's `STATUS.md`
  (where you left off). Run `git worktree list` if unsure which folder is which.
- **New parallel task while another is unfinished →** the agent says *"this is a new parallel stream — I'll
  create a worktree `<name>` on `feat/<name>`, ok?"*, waits for a yes (confirm-first), creates it, and registers
  a row in `WORKSTREAMS.md`. One task at a time still needs no worktree — just a branch.
- **Decisions** are appended to the stream's `STATUS.md` decision log **as they happen** — automatic, unprompted
  (same spirit as the existing idea-capture rule).
- **Session end:** overwrite `STATUS.md` current-state + update the stream's `WORKSTREAMS.md` row (status +
  last-touched).
- **On merge (finish):** remove the worktree, delete the branch, delete the `WORKSTREAMS.md` row, and promote the
  stream's locked decisions into the project `DECISIONS.md`.
- **Agent-agnostic:** `AGENTS.md` (already a symlink to `CLAUDE.md`) gives Codex and others the identical rules;
  `WORKSTREAMS.md` ownership column prevents two agents grabbing the same stream.
- **Propagation:** changes to the framework are committed and **pushed to `Razibsh/poooof`** as part of the work
  (documented in the framework's own workflow), so the update is available everywhere on next plugin update.

---

## 4. Helper skills (the push-button part)

Two new skills in the `new-project` plugin (or a sibling plugin in the same marketplace):

- **`start-stream <name>`** — from `main/`: pull latest main, `git worktree add ../<name> -b feat/<name> main`,
  seed the stream's `STATUS.md` (goal from the operator), add the `WORKSTREAMS.md` row, commit the registration on
  main, and tell the operator which folder to open. Confirm-first: it states the plan and waits.
- **`finish-stream [name]`** — the safe lifecycle we want every time: verify tests pass in the stream, ensure it's
  merged to `main` (via PR or ff per project setting), promote decisions into `DECISIONS.md`, then
  `git worktree remove` + delete branch (local + origin) + remove the `WORKSTREAMS.md` row. Refuses if tests fail
  or the branch isn't merged. Mirrors the manual lifecycle proven on WhatsBot-v2's `audience` stream.

Both are user-invocable skills with the same plain-language, safety-checked style as `new-project`. They are the
"smart, autonomous, can't-get-messed-up" layer so the operator never types raw git.

---

## 5. What gets built (in `Razibsh/poooof`)

1. **Template** (`plugins/new-project/skills/new-project/claude-project-template/`):
   - add `WORKSTREAMS.md`;
   - extend `STATUS.md` with the append-only `## Decision log` section + per-stream framing;
   - rewrite `TEAM-WORKFLOW.md` "Working in parallel" to the bare-repo layout;
   - update `CLAUDE.md` workflow rules (session-start/end protocol, confirm-first trigger, decision logging,
     cleanup-on-merge, decision promotion) + `Key files` list.
2. **`new-project` skill:** scaffold the bare-repo layout (template into `main/`).
3. **New skills:** `start-stream`, `finish-stream`.
4. **README:** document the workstreams model + the two skills.
5. **Commit + push to `origin/main`** (the propagation step).

Then, separately: **backport to WhatsBot-v2** — convert it to the bare-repo layout and add `WORKSTREAMS.md`
(its own follow-up plan).

## Out of scope (YAGNI)

- Full per-session archived report files (operator chose current-state + decision log instead).
- Any server/daemon to "watch" sessions — git + the dashboard file are the coordination mechanism.
- Auto-merge without review — `finish-stream` still goes through the project's PR/merge setting.

## Open implementation questions for the plan

- Exact bare-repo init sequence that yields a clean `main/` worktree with the first commit (orphan-branch vs
  `git init --bare` + first `worktree add`).
- Whether `start-stream`/`finish-stream` live in the existing `new-project` plugin or a new `workstream` plugin in
  the same marketplace (affects install but not behavior).
- How `finish-stream` decides PR-merge vs fast-forward (project setting vs ask).
