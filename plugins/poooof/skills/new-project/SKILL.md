---
name: new-project
description: Scaffold a new project from the bundled Poooof framework template. Copies the template (so every project inherits the framework), git-inits, optionally creates a GitHub repo, then interviews to fill in CLAUDE.md and draft a Phase 1 roadmap. User-invoked only.
argument-hint: [project name]
disable-model-invocation: true
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(rm:*), Bash(echo:*), Bash(ls:*), Bash(test:*), Bash(git:*), Bash(gh:*), Read, Write, Edit, AskUserQuestion
---

# Initiate a new project from the template

Scaffold a brand-new project from the bundled framework template, then get it to "ready to build Phase 1." Follow the steps in order. Do not skip the safety checks. The operator (the person running this command) may not be a professional developer — keep everything in plain language.

## Inputs

- **Project name:** `$ARGUMENTS` (e.g. `Acme CRM`). If empty, ask for it before doing anything else.
- **Template source (always copy from here, never edit it):** the `claude-project-template/` folder bundled **inside this skill's own directory** (the folder that contains this SKILL.md). This works the same in Claude Code and in Codex — only the way you resolve the skill's directory differs:
  - **Claude Code:** the skill directory is `${CLAUDE_PLUGIN_ROOT}/skills/new-project`, so the template is `${CLAUDE_PLUGIN_ROOT}/skills/new-project/claude-project-template`.
  - **Codex:** set `SKILL_DIR` to the absolute path of the directory containing this SKILL.md, so the template is `$SKILL_DIR/claude-project-template`.

  The template travels with the plugin on any machine, so every new project inherits whatever it currently contains — framework updates propagate automatically. **Never edit the bundled template; only read/copy from it.**
- **Destination:** Ask the operator each run — there is no default. (See step 1.)

> Paths may contain spaces or apostrophes. **Always wrap every path in double quotes** in bash.

## Steps

1. **Confirm name + destination.** If `$ARGUMENTS` was empty, ask for the project name first. Then ask the operator **where** to create the project — which parent folder. Offer their home folder (`~`) as an easy suggestion, but let them choose any folder. Derive a human-readable project folder from the name (e.g. `Acme CRM`) and join it to the chosen parent to form the full destination path. Show the operator the exact destination path you'll create and confirm it's right.

2. **Safety check — never overwrite.** Run `test -d "<destination>" && ls -A "<destination>"`. If the folder already exists and is non-empty, STOP and tell the operator; offer a different name or location. Only proceed when the destination is absent or empty.

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
   rm -f "<destination>/main/RUNBOOK.md"   # ops-projects file; installed by poooof:adopt when relevant
   # Stamp the framework version into the copied docs (single source of truth: the plugin manifest).
   PVER=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1)
   [ -n "$PVER" ] || { echo "poooof: could not read plugin version — leaving X.Y.Z stamps in place" >&2; }
   [ -n "$PVER" ] && for f in "<destination>/main/"*.md; do [ -L "$f" ] || sed -i '' "s/<!-- poooof X\.Y\.Z -->/<!-- poooof ${PVER} -->/" "$f"; done
   # Root signpost: routes any agent opened at the bare-repo root into main/ (or a stream).
   cp "${CLAUDE_PLUGIN_ROOT}/skills/new-project/bare-root-signpost.md" "<destination>/CLAUDE.md"
   ln -sf CLAUDE.md "<destination>/AGENTS.md"
   ```
   Result: `<destination>/` holds `.bare/`, `.git`, `main/` (the live branch, template inside it), and a root
   `CLAUDE.md` + `AGENTS.md` signpost. The template also carries `main/.claude/settings.json`, which registers
   the poooof marketplace + enables the plugin with `autoUpdate` — so anyone who later opens this project and
   trusts the folder gets the framework auto-installed and kept current, no manual setup. (It's copied as-is;
   don't edit it during the interview.) All project work and docs live under `main/` (and, later, sibling stream
   folders). The root signpost is a loose local file (the bare root isn't a git working tree) — it tells an
   agent that opens at the root to `cd main` and follow that folder's rules. This requires git ≥ 2.42 for
   `worktree add --orphan` (verified on git 2.50.1). (Codex: read the version from `$SKILL_DIR/../../.codex-plugin/plugin.json` instead, and use `sed -i` without `''` on Linux.)

4. **First commit (inside `main/`).**
   ```
   cd "<destination>/main"
   git add -A && git commit -q -m "Scaffold <project name> from Poooof template"
   ```
   (The bare repo already exists from Step 3; this just records the first commit on `main`.)

5. **Ask about GitHub** (ask each time). Use AskUserQuestion — "Create a private GitHub repo and push now, or keep it local for now?" If yes:
   ```
   gh repo create "<repo-name>" --private --source="<destination>/main" --remote=origin --push
   ```
   Use a slug for `<repo-name>` (lowercase, hyphens). If `gh` is missing or not authenticated, say so plainly and continue local-only — don't block the scaffold.

6. **Interview to fill in CLAUDE.md.** Read `<destination>/main/CLAUDE.md`. It contains `> FILL IN` blocks: *What this is*, *Architecture / stack*, *Product rules*, *Testing*. Ask the operator about each — conversationally, one topic at a time, not as a wall of questions — and replace each block with their answers in plain language. Replace the `<PROJECT NAME>` title. Delete the HTML `<!-- ... -->` guidance comments as you fill each block — but **keep the `<!-- poooof … -->` version stamp on line 2**; it's how the framework tracks doc versions. **Leave the numbered workflow-rules section unchanged** — those are the standard rules.

7. **Draft ROADMAP Phase 1.** From the interview, replace the ROADMAP placeholders: name Phase 1 and give it 3–6 concrete first tasks, each with a real, observable `verify:` criterion (a test, a real run, a visible result — not "should work"). Keep Phase 2+ as rough one-line candidates. Don't over-plan far phases.

8. **Seed STATUS.md** with the starting state: Done = "scaffolded from template, project context + Phase 1 defined"; Verified = scaffold committed; Next = the first Phase 1 task; Docs in sync = yes.
   Leave `WORKSTREAMS.md` as the empty-dashboard template copied in — a fresh project has no parallel streams
   yet. (Streams get added later by `poooof:start-stream`.)

9. **Commit the filled-in docs.**
   ```
   cd "<destination>/main"
   git add -A && git commit -q -m "Fill in project context + draft Phase 1 roadmap"
   ```
   (If a GitHub remote was created in step 5, `git push -q`.)

10. **Report.** Give the operator: the project path, git status (and whether a GitHub remote exists), and the Phase 1 plan. End with the handoff line:
    > Next: open the new project's `main/` folder and tell your agent —
    > *"Read CLAUDE.md and ROADMAP.md, then let's start Phase 1."*
    > To run a second feature in parallel later, just ask — the agent will set up a worktree stream for you.

## Rules

- Never modify the template folder — read/copy only. All edits happen in the destination.
- This command **only scaffolds and plans**. Do not write any Phase 1 application code now.
- If anything is ambiguous (name, location, stack, a product rule), ask rather than guess.
