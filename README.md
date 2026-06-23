# Poooof 🪄

> Type a name, and *poof* — a fully-structured project appears.

Poooof is a [Claude Code](https://claude.com/claude-code) plugin that scaffolds a brand-new project from a reusable framework template. Run one command, answer a few questions, and you get a project that's already wired up the way good projects should be — a `CLAUDE.md` your agent reads first, a phased `ROADMAP.md`, status tracking, decision log, and a clean git history — ready to start building Phase 1.

## Install (one time)

In Claude Code, run:

```
/plugin marketplace add Razibsh/poooof
/plugin install new-project@poooof
```

That's it. From now on, `/new-project` works in any folder.

## Use it

```
/new-project
```

It asks for a project name and where to create it, copies the template, sets up git, optionally creates a GitHub repo, then interviews you to fill in the project's context and draft a first-phase plan. The original template is **never touched** — every run copies *from* it into a fresh folder.

## Stay up to date

There are two ways to get new versions. Because this plugin tracks the repo directly (no pinned version), **every push to GitHub becomes the new version automatically** — the only question is whether you pull it manually or let Claude Code do it.

**Option A — manual (default).** Whenever you want the latest, run:

```
/plugin marketplace update poooof
/plugin update new-project@poooof
```

**Option B — automatic (set once, recommended).** Turn on auto-update for this marketplace and Claude Code will fetch + install new versions for you on startup:

1. Run `/plugin`
2. Open the **Marketplaces** tab
3. Select **poooof**
4. Choose **Enable auto-update**

After that, each time you start Claude Code it pulls the latest Poooof and shows a small prompt to run `/reload-plugins` to activate it. No more manual checking.

> Note: updates arrive at **startup** (Option B) or **on demand** (Option A) — there's no mid-session "update available" popup.

## What's inside

```
poooof/
├── .claude-plugin/marketplace.json     # makes this repo installable
└── plugins/new-project/
    ├── .claude-plugin/plugin.json      # the plugin's identity
    └── skills/new-project/
        ├── SKILL.md                    # the /new-project command
        └── claude-project-template/    # the framework template it copies
```

## For the author — how to improve the framework

This repo is the single source of truth (the "workshop"). To change the template or the command:

1. Open Claude Code **inside this repo folder**.
2. Edit the template under `plugins/new-project/skills/new-project/claude-project-template/`, or edit `SKILL.md` to change how the command behaves.
3. Commit and push to GitHub.
4. Everyone (you included) gets it on the next `/plugin update`.

Editing a project created *by* the command never affects the template — the copy only ever goes one direction, template → new project.

## License

MIT
