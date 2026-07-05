# Poooof 🪄

> Type a name, and *poof* — a fully-structured project appears.

Poooof is a plugin for **[Claude Code](https://claude.com/claude-code)** *and* **[Codex CLI](https://developers.openai.com/codex)** that scaffolds a brand-new project from a reusable framework template — or adopts the same framework into a project you already have. Run one command, answer a few questions, and you get a project that's already wired up the way good projects should be — a `CLAUDE.md` your agent reads first, a phased `ROADMAP.md`, status tracking, decision log, and a clean git history — ready to start building Phase 1. The same repo serves both tools from one source of truth.

## Why this exists

Hi, I'm [Razi](https://github.com/Razibsh) 👋 — I'm not a real developer. I'm a *vibe coder*: I build and run
real projects by working with Claude Code and Codex, and the agents write the code. What kept breaking wasn't
the code — it was everything around it: a new session forgetting what the last one decided, ideas mentioned in
chat and never seen again, two sessions stepping on each other's work, me not remembering where a project even
stood. Poooof is the framework I built to fix that for myself: light, plain-language, nothing to learn — the
structure lives in a handful of markdown files your agent maintains *for* you, so decisions stay decided, ideas
land in a backlog, every session picks up exactly where the last one stopped, and parallel work doesn't
collide. If you drive your projects by talking to an agent rather than writing code yourself, this was built
for you.

## Install (one time)

**Claude Code:**

```
/plugin marketplace add Razibsh/poooof
/plugin install poooof@poooof
```

This one plugin gives you every command, all namespaced `poooof:` — `poooof:new-project`,
`poooof:adopt`, `poooof:start-stream`, `poooof:finish-stream`, `poooof:check-streams`,
`poooof:handoff`, `poooof:tidy`, `poooof:update`, `poooof:convert-to-bare`.

**👉 Turn on auto-update now (do this once — recommended).** Then you get every new version automatically at
startup, and never have to update by hand again:

> `/plugin` → **Marketplaces** tab → select **poooof** → **Enable auto-update**

(Auto-update is off by default for third-party marketplaces, so this one toggle is the difference between
"always current" and "manually chasing updates." See [Stay up to date](#stay-up-to-date) for details.)

**Codex CLI:**

```
codex plugin marketplace add Razibsh/poooof
```

then open Codex and run `/plugins` to install/enable **poooof**.

That's it. From now on, `/poooof:new-project` (and the other `poooof:` commands) work in any folder.

## Use it

```
/poooof:new-project
```

It asks for a project name and where to create it, copies the template, sets up git, optionally creates a GitHub repo, then interviews you to fill in the project's context and draft a first-phase plan. The original template is **never touched** — every run copies *from* it into a fresh folder.

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
sections while preserving all project content — so template improvements reach existing
projects too. At the end it offers an optional conversion to the parallel-streams layout
(`poooof:convert-to-bare`).

## Works standalone — optional companions

Poooof needs **nothing but Claude Code (or Codex)** — `/new-project` runs end to end with no other plugins installed, and the template it copies references no external skills. (`gh` is the only extra, and if it's missing the scaffold just continues local-only.)

That said, the framework pairs nicely with a couple of optional add-ons — install them for a richer experience, skip them and nothing breaks:

- **[Superpowers](https://github.com/obra/superpowers)** — adds spec → plan → execute discipline (brainstorming, planning, TDD, structured debugging). The framework's "write a short spec before non-trivial features" rule feels natural with it.
- **[Context7 MCP](https://github.com/upstash/context7)** — gives your agent up-to-date library/framework docs instead of relying on training data.
- **[claude-mem](https://github.com/thedotmack/claude-mem)** — persistent memory across sessions. The framework's session-start rule uses its recalled context to spot a crashed or unfinished session and reconcile `STATUS.md`; the docs stay the curated source of record, with memory as the recovery net.

## Stay up to date

There are two ways to get new versions. Poooof declares a `version` in `plugin.json`, so **a new version ships when that number is bumped** (releases are deliberate, not every commit) — the only question is whether you pull it manually or let Claude Code do it. When a newer version is out and you haven't pulled it, Poooof shows a one-line `⬆ poooof X.Y.Z` nudge at session start.

**Option A — manual (default).** When the nudge appears (or any time), just run:

```
/poooof:update
```

That one command refreshes the catalog **and** updates the plugin in a single step, then tells you to restart — no menus. (Under the hood it runs `claude plugin marketplace update poooof && claude plugin update poooof@poooof`; you can run that shell line directly if you prefer. Note: typing `/plugin …` with a slash opens the interactive manager instead of updating — use `/poooof:update` or the shell command.)

**Option B — automatic (set once, recommended).** Turn on auto-update for this marketplace and Claude Code will fetch + install new versions for you on startup:

1. Run `/plugin`
2. Open the **Marketplaces** tab
3. Select **poooof**
4. Choose **Enable auto-update**

After that, each time you start Claude Code it pulls the latest Poooof and shows a small prompt to run `/reload-plugins` to activate it. No more manual checking.

> Note: updates arrive at **startup** (Option B) or **on demand** (Option A) — there's no mid-session "update available" popup. If you're on Option A and fall behind, Poooof shows a one-line nudge at session start (`⬆ poooof X.Y.Z available — run /plugin update poooof@poooof`) so you know when to pull.

**On Codex CLI**, pull the latest with:

```
codex plugin marketplace upgrade poooof
```

### Sharing with clients / teammates

You **cannot silently push** updates to someone's machine — by design, plugins only update when the user
pulls or has auto-update enabled (plugins run with full user privileges, so updates require their opt-in).
So the trick is a **one-time** setup per person, not a manual chase every release:

- **Each user enables auto-update once** (Install step above). After that, every push you make to GitHub
  reaches them at their next Claude Code startup — zero further action.
- **Onboarding is built in:** every project scaffolded by `poooof:new-project` ships a
  `main/.claude/settings.json` that registers the poooof marketplace, enables the plugin, and sets
  `autoUpdate`. So when a teammate/client **opens a poooof project and trusts the folder**, they're prompted to
  install the framework and it stays current — no manual `/plugin` steps. (The marketplace-register + enable
  works on folder-trust; the `autoUpdate` part is honored where the platform allows it, and the `⬆ poooof`
  startup nudge covers anyone it doesn't auto-update.)
- **For an org/team you administer:** pre-enable it for everyone via managed settings — add `poooof` to
  `extraKnownMarketplaces` with `"autoUpdate": true`. Then teammates get updates automatically without
  toggling anything themselves.

Poooof ships releases by **bumping the `version` field in `plugins/poooof/.claude-plugin/plugin.json`** (and the
Codex manifest) — that bump is what auto-update users receive and what the `⬆ poooof` nudge compares against, so
**remember to bump it on every release.** Keep WIP on stream branches and merge only finished work to `main`, so
each version bump is a deliberate, releasable state — no half-done work reaches anyone.

## What's inside

```
poooof/
├── .claude-plugin/marketplace.json     # Claude Code: makes the repo installable
├── .agents/plugins/marketplace.json    # Codex: makes the repo installable
└── plugins/poooof/                     # one plugin, every command namespaced poooof:
    ├── .claude-plugin/plugin.json      # Claude Code plugin identity
    ├── .codex-plugin/plugin.json       # Codex plugin identity
    └── skills/
        ├── new-project/
        │   ├── SKILL.md                # poooof:new-project
        │   ├── bare-root-signpost.md   # root signpost dropped into bare-repo projects
        │   └── claude-project-template/ # the framework template it copies
        ├── adopt/SKILL.md              # poooof:adopt
        ├── start-stream/SKILL.md       # poooof:start-stream
        ├── finish-stream/SKILL.md      # poooof:finish-stream
        ├── check-streams/SKILL.md      # poooof:check-streams
        ├── handoff/SKILL.md            # poooof:handoff
        ├── tidy/SKILL.md               # poooof:tidy
        ├── update/SKILL.md             # poooof:update
        └── convert-to-bare/SKILL.md    # poooof:convert-to-bare
```

Both Claude Code and Codex read the **same** skills + template — one source of truth. The command resolves the template path per tool (`${CLAUDE_PLUGIN_ROOT}` in Claude Code, the skill's own directory in Codex).

## Workstreams — build several features in parallel

Poooof lets one person drive 3–6 agent sessions at once (Claude + Codex) without losing
track of anything. A project uses a **bare-repo layout** — one folder per branch:

    ProjectName/
    ├── .bare/      ← git engine (hidden)
    ├── main/       ← the live branch
    └── <stream>/   ← one folder per parallel feature

Two commands run the whole lifecycle (no git knowledge needed):

- `poooof:start-stream <name>` — creates the stream's folder + branch off the latest `main`, seeds its
  `STATUS.md`, and registers it in `WORKSTREAMS.md`.
- `poooof:finish-stream [name]` — merges it (PR by default), promotes its decisions into `DECISIONS.md`,
  and cleans up the folder + branch + dashboard row.
- `poooof:check-streams` — lists any file edited by 2+ active streams, so same-file merge conflicts are
  caught *before* you merge (worktrees prevent live collisions, not merge conflicts). Auto-run by
  `finish-stream` when other streams are active.
- `poooof:convert-to-bare [path]` — give an existing repo the parallel-streams **layout**: safely
  converts a normal flat repo to this bare-repo layout (build-new-then-swap with a full backup;
  carries over `.env` and all local-only files; audits branches for unmerged work before
  discarding). For the framework **docs** in an existing project, use `poooof:adopt`.

`WORKSTREAMS.md` (on `main`) is the dashboard of what's in flight and who owns each stream — every agent reads
it first, so two sessions never grab the same stream. (Worktrees keep streams from overwriting each other
*while working* — but two streams that edit the *same file* still conflict at merge; run `poooof:check-streams`
before merging to catch that early.) See a scaffolded project's `TEAM-WORKFLOW.md` for the full guide.

**Root signpost:** a bare-repo project also gets a tiny `CLAUDE.md` + `AGENTS.md` at its *root* (next to
`.bare/` and `main/`). If you open an editor/agent at the root instead of inside `main/`, the signpost routes
the agent into the right worktree — so it always works in the correct folder.

These commands ship in the same `poooof` plugin (see **Install** above) — no extra install.

## Save before you clear — `poooof:handoff`

Long sessions fill up the context window, and the natural move is to clear the chat and continue fresh. The
worry is always the same: *did everything important get saved?* `poooof:handoff` answers it once and for all.
Run it before you clear, and it does the framework's end-of-session ritual in one shot — refreshes `STATUS.md`
(what was done, what's **verified**, what's next), routes any new decisions to `DECISIONS.md`, ideas to
`BACKLOG.md`, and roadmap check-offs to `ROADMAP.md`, commits the paperwork, confirms your memory plugin (if
any) captured the session, then prints exactly what it saved and where — ending with a clear **✅ Safe to
clear**. (Clearing the chat never touches files on disk anyway; the command just guarantees every durable fact
made it *into* a file first.) Next session, open a fresh chat and say "resume" — `STATUS.md` picks you up from
exactly where you stopped.

## Keep the backlog readable — `poooof:tidy`

A flat backlog rots into a wall of text. `BACKLOG.md` in a poooof project is **self-organizing** —
the agent captures every idea as `- YYYY-MM-DD [area] idea — context`, newest on top, grouped by
status (**📥 Inbox → 🔨 Promoted → ✅ Done**), and moves items down the lifecycle instead of
deleting them. If it ever drifts — or you're adopting the framework into a project whose backlog is
already a mess — run `poooof:tidy`: it re-sorts newest-first, dates and area-tags every item
(inferring dates from git history when missing), de-duplicates, and migrates an old flat backlog
into the clean format. It's **non-destructive** (only moves and annotates lines, never drops an
idea) and shows you the diff before committing. The tidy pass also runs automatically inside
`poooof:handoff`, so every save leaves the backlog clean.

## For the author — how to improve the framework

This repo is the single source of truth (the "workshop"). To change the template or the command:

1. Open Claude Code **inside this repo folder**.
2. Edit the template under `plugins/poooof/skills/new-project/claude-project-template/`, or edit a skill's `SKILL.md` to change how its command behaves.
3. Commit and push to GitHub.
4. Everyone gets it on their next update — `/plugin update` (Claude Code) or `codex plugin marketplace upgrade poooof` (Codex).

Editing a project created *by* the command never affects the template — the copy goes one
direction, template → project. To pull template improvements *into* an existing project, run
`/poooof:adopt` there — it refreshes the framework sections and shows you the diff.

## License

MIT
