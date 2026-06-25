# Poooof 🪄

> Type a name, and *poof* — a fully-structured project appears.

Poooof is a plugin for **[Claude Code](https://claude.com/claude-code)** *and* **[Codex CLI](https://developers.openai.com/codex)** that scaffolds a brand-new project from a reusable framework template. Run one command, answer a few questions, and you get a project that's already wired up the way good projects should be — a `CLAUDE.md` your agent reads first, a phased `ROADMAP.md`, status tracking, decision log, and a clean git history — ready to start building Phase 1. The same repo serves both tools from one source of truth.

## Install (one time)

**Claude Code:**

```
/plugin marketplace add Razibsh/poooof
/plugin install poooof@poooof
```

This one plugin gives you every command, all namespaced `poooof:` — `poooof:new-project`,
`poooof:start-stream`, `poooof:finish-stream`, `poooof:convert-to-bare`.

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

## Works standalone — optional companions

Poooof needs **nothing but Claude Code (or Codex)** — `/new-project` runs end to end with no other plugins installed, and the template it copies references no external skills. (`gh` is the only extra, and if it's missing the scaffold just continues local-only.)

That said, the framework pairs nicely with a couple of optional add-ons — install them for a richer experience, skip them and nothing breaks:

- **[Superpowers](https://github.com/obra/superpowers)** — adds spec → plan → execute discipline (brainstorming, planning, TDD, structured debugging). The framework's "write a short spec before non-trivial features" rule feels natural with it.
- **[Context7 MCP](https://github.com/upstash/context7)** — gives your agent up-to-date library/framework docs instead of relying on training data.

## Stay up to date

There are two ways to get new versions. Because this plugin tracks the repo directly (no pinned version), **every push to GitHub becomes the new version automatically** — the only question is whether you pull it manually or let Claude Code do it.

**Option A — manual (default).** Whenever you want the latest, run:

```
/plugin marketplace update poooof
/plugin update poooof@poooof
```

**Option B — automatic (set once, recommended).** Turn on auto-update for this marketplace and Claude Code will fetch + install new versions for you on startup:

1. Run `/plugin`
2. Open the **Marketplaces** tab
3. Select **poooof**
4. Choose **Enable auto-update**

After that, each time you start Claude Code it pulls the latest Poooof and shows a small prompt to run `/reload-plugins` to activate it. No more manual checking.

> Note: updates arrive at **startup** (Option B) or **on demand** (Option A) — there's no mid-session "update available" popup.

**On Codex CLI**, pull the latest with:

```
codex plugin marketplace upgrade poooof
```

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
        ├── start-stream/SKILL.md       # poooof:start-stream
        ├── finish-stream/SKILL.md      # poooof:finish-stream
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
- `poooof:convert-to-bare [path]` — **adopt the framework in an existing project**: safely converts a
  normal flat repo to this bare-repo layout (build-new-then-swap with a full backup; carries over `.env` and
  all local-only files; audits branches for unmerged work before discarding). After it runs, the two skills
  above work in that project.

`WORKSTREAMS.md` (on `main`) is the dashboard of what's in flight and who owns each stream — every agent reads
it first, so two sessions never collide. See a scaffolded project's `TEAM-WORKFLOW.md` for the full guide.

**Root signpost:** a bare-repo project also gets a tiny `CLAUDE.md` + `AGENTS.md` at its *root* (next to
`.bare/` and `main/`). If you open an editor/agent at the root instead of inside `main/`, the signpost routes
the agent into the right worktree — so it always works in the correct folder.

These commands ship in the same `poooof` plugin (see **Install** above) — no extra install.

## For the author — how to improve the framework

This repo is the single source of truth (the "workshop"). To change the template or the command:

1. Open Claude Code **inside this repo folder**.
2. Edit the template under `plugins/poooof/skills/new-project/claude-project-template/`, or edit a skill's `SKILL.md` to change how its command behaves.
3. Commit and push to GitHub.
4. Everyone gets it on their next update — `/plugin update` (Claude Code) or `codex plugin marketplace upgrade poooof` (Codex).

Editing a project created *by* the command never affects the template — the copy only ever goes one direction, template → new project.

## License

MIT
