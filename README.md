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

When the framework gets improved, pull the latest with:

```
/plugin marketplace update poooof
/plugin update new-project@poooof
```

Because this plugin tracks the repo directly (no pinned version), every push to GitHub becomes the new version automatically.

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
