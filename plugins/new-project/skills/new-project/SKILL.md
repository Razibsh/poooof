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
- **Template source (always copy from here, never edit it):** `${CLAUDE_PLUGIN_ROOT}/skills/new-project/claude-project-template`
  Claude Code expands `${CLAUDE_PLUGIN_ROOT}` to this plugin's install folder, so the template travels with the plugin on any machine. Copying at runtime is the whole point — every new project inherits whatever the template currently contains, so framework updates propagate automatically. **Never edit the template here; only read/copy from it.**
  > If `${CLAUDE_PLUGIN_ROOT}` is not already expanded to a real path, resolve it with `echo $CLAUDE_PLUGIN_ROOT`, or find the `claude-project-template` folder sitting next to this SKILL.md.
- **Destination:** Ask the operator each run — there is no default. (See step 1.)

> Paths may contain spaces or apostrophes. **Always wrap every path in double quotes** in bash.

## Steps

1. **Confirm name + destination.** If `$ARGUMENTS` was empty, ask for the project name first. Then ask the operator **where** to create the project — which parent folder. Offer their home folder (`~`) as an easy suggestion, but let them choose any folder. Derive a human-readable project folder from the name (e.g. `Acme CRM`) and join it to the chosen parent to form the full destination path. Show the operator the exact destination path you'll create and confirm it's right.

2. **Safety check — never overwrite.** Run `test -d "<destination>" && ls -A "<destination>"`. If the folder already exists and is non-empty, STOP and tell the operator; offer a different name or location. Only proceed when the destination is absent or empty.

3. **Copy the bundled template.**
   ```
   TEMPLATE="${CLAUDE_PLUGIN_ROOT}/skills/new-project/claude-project-template"
   mkdir -p "<destination>"
   cp -R "$TEMPLATE/." "<destination>/"
   rm -f "<destination>/.DS_Store"
   ```
   (The bundled template is already clean — no git history, no template-only files — so a plain copy is all that's needed.)

4. **Fresh git history.**
   ```
   cd "<destination>"
   git init -q && git add -A && git commit -q -m "Scaffold <project name> from Poooof template"
   ```

5. **Ask about GitHub** (ask each time). Use AskUserQuestion — "Create a private GitHub repo and push now, or keep it local for now?" If yes:
   ```
   gh repo create "<repo-name>" --private --source=. --remote=origin --push
   ```
   Use a slug for `<repo-name>` (lowercase, hyphens). If `gh` is missing or not authenticated, say so plainly and continue local-only — don't block the scaffold.

6. **Interview to fill in CLAUDE.md.** Read the copied `CLAUDE.md`. It contains `> FILL IN` blocks: *What this is*, *Architecture / stack*, *Product rules*, *Testing*. Ask the operator about each — conversationally, one topic at a time, not as a wall of questions — and replace each block with their answers in plain language. Replace the `<PROJECT NAME>` title. Delete the HTML `<!-- ... -->` guidance comments as you fill each block. **Leave the numbered workflow-rules section unchanged** — those are the standard rules.

7. **Draft ROADMAP Phase 1.** From the interview, replace the ROADMAP placeholders: name Phase 1 and give it 3–6 concrete first tasks, each with a real, observable `verify:` criterion (a test, a real run, a visible result — not "should work"). Keep Phase 2+ as rough one-line candidates. Don't over-plan far phases.

8. **Seed STATUS.md** with the starting state: Done = "scaffolded from template, project context + Phase 1 defined"; Verified = scaffold committed; Next = the first Phase 1 task; Docs in sync = yes.

9. **Commit the filled-in docs.**
   ```
   git add -A && git commit -q -m "Fill in project context + draft Phase 1 roadmap"
   ```
   (If a GitHub remote was created in step 5, `git push -q`.)

10. **Report.** Give the operator: the project path, git status (and whether a GitHub remote exists), and the Phase 1 plan. End with the handoff line:
    > Next: open the new folder and tell your agent — *"Read CLAUDE.md and ROADMAP.md, then let's start Phase 1."*

## Rules

- Never modify the template folder — read/copy only. All edits happen in the destination.
- This command **only scaffolds and plans**. Do not write any Phase 1 application code now.
- If anything is ambiguous (name, location, stack, a product rule), ask rather than guess.
