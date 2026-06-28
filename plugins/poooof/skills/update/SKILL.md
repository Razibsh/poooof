---
name: update
description: Update the poooof framework to the latest version in one step — refreshes the marketplace catalog and updates the plugin, with no interactive menus. Use when the operator says "update poooof", runs /poooof:update, or when the "⬆ poooof X.Y.Z available" nudge appears. User-invoked only.
disable-model-invocation: true
allowed-tools: Bash(claude plugin:*), Bash(codex plugin:*), Bash(command -v:*)
---

# Update poooof to the latest version

One command that refreshes the marketplace catalog **and** updates the plugin — skipping the interactive
`/plugin` menus. (Typing `/plugin ...` opens a UI screen; the shell `claude plugin ...` commands below run in
one shot. The catalog refresh must come first, or the update reads a stale catalog and reports "nothing new.")

## What to do

1. **Run the update for the current runtime** (one command):
   - **Claude Code:**
     ```
     claude plugin marketplace update poooof && claude plugin update poooof@poooof
     ```
   - **Codex:**
     ```
     codex plugin marketplace upgrade poooof
     ```
   If you're unsure which runtime you're in, check `command -v claude` and `command -v codex` and use
   whichever exists (prefer `claude` if both do and you were invoked from Claude Code).

2. **Report the result in plain language.** The command prints the outcome (e.g. *"updated from 1.2.0 to
   1.2.1"* or *"already up to date"*). Tell the operator exactly which version they're now on, or that they
   were already current.

3. **Tell them how to activate it.** Updates apply on restart:
   > Updated to **<version>** — fully quit and reopen Claude Code (or run `/reload-plugins`) to activate it.

## Rules
- Only ever update the **poooof** plugin — never touch other plugins or marketplaces.
- Always refresh the catalog first (the `marketplace update` / `upgrade` step). Skipping it is the #1 reason
  an update silently reports "nothing new."
- If the command errors (network, auth, offline), report the error plainly and stop — don't retry
  destructively or fall back to uninstalling.
