---
name: convert-to-bare
description: Convert an existing flat git repo to the Poooof bare-repo worktree layout (ProjectName/{.bare, main/, stream folders}) so the workstream skills work there. Safe build-new-then-swap with a full backup; carries over .env and all local-only files; audits branches for unmerged work before discarding. User-invoked, confirm-first, destructive.
argument-hint: [path to the repo folder]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(ls:*), Bash(test:*), Bash(cp:*), Bash(mv:*), Bash(mkdir:*), Bash(printf:*), Bash(ln:*), Bash(rm:*), Bash(du:*), Bash(diff:*), Bash(nc:*), Bash(npm:*), Bash(node:*), Read, Write, AskUserQuestion
---

# Convert a flat repo to the bare-repo workstream layout

Turn an existing normal git clone (`Project/` with a hidden `.git` and code at top level) into the Poooof
bare-repo layout (`Project/{.bare, .git, main/}` + per-stream folders), so `poooof:start-stream` /
`finish-stream` work there. This is **destructive** (it restructures folders) so the method is *build a new
layout beside the old, verify, swap with the old kept as a backup, and only delete after an explicit audit*.
Plain language; the operator may not be a developer. **Confirm-first at every destructive step.**

## Inputs
- **Repo path:** `$ARGUMENTS` — the existing flat repo folder (e.g. `/Users/me/Projects/Acme`). If empty, ask.
- The repo must have a **git remote** (`origin`) with the work pushed — the new layout is built from `origin`.

## Steps

1. **Preconditions + assess (read-only).** From the repo:
   ```
   git -C "<repo>" rev-parse --is-inside-work-tree     # must be a working tree (flat repo)
   git -C "<repo>" remote get-url origin                # must exist
   git -C "<repo>" fetch -q origin
   git -C "<repo>" status --short                       # note uncommitted TRACKED changes
   ```
   If it's already bare-repo (`<repo>/.bare` + `<repo>/main` exist), stop — nothing to do. If there are
   uncommitted tracked changes, tell the operator to commit/stash them first (the conversion builds from
   `origin`, so unpushed tracked work would be lost). Determine `MAIN` = the repo's default branch (usually
   `main`; check `git -C "<repo>" symbolic-ref --short refs/remotes/origin/HEAD` or ask).

2. **Find everything that must be preserved (the part people forget).** Local-only files are NOT on `origin`
   and would be lost. Find them:
   ```
   git -C "<repo>" status --ignored --short | grep -vE 'node_modules|\.DS_Store'
   ```
   This surfaces `.env`, `.env.*`, and any untracked/ignored folders (data, assets, `Marketing/`, notes…).
   List them for the operator and confirm which to carry over (default: ALL of them except `node_modules` and
   caches). `node_modules` is rebuilt with `npm install`, don't copy it.

3. **Audit local branches for unmerged work (before anything is discarded).** A flat repo often has local-only
   branches. Check each one's content against origin with patch-id (catches same-content-different-sha):
   ```
   for b in $(git -C "<repo>" for-each-ref --format='%(refname:short)' refs/heads/); do
     uniq=$(git -C "<repo>" cherry "origin/<MAIN>" "$b" 2>/dev/null | grep -c '^+')
     echo "$b: $uniq unique commit(s)"
   done
   ```
   Any branch with `> 0` unique commits has work not on `origin` — **report it and stop** until the operator
   decides (merge/push it first, or confirm it's disposable). Branches with `0` are safe to drop.

4. **Confirm the plan (confirm-first, destructive).** Tell the operator exactly what will happen: build a new
   `<repo>-new` from `origin/<MAIN>`, carry over `<the preserved files>`, verify, then rename `<repo>` →
   `<repo>-OLD` (backup) and `<repo>-new` → `<repo>`. Nothing is deleted until they confirm the new one works.
   Use AskUserQuestion. Proceed only on yes.

5. **Build the new bare layout from origin.**
   ```
   NEW="<repo>-new"; URL=$(git -C "<repo>" remote get-url origin)
   mkdir -p "$NEW"
   git clone --bare -q "$URL" "$NEW/.bare"
   git -C "$NEW/.bare" config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'   # bare-clone gotcha
   git -C "$NEW/.bare" fetch -q origin
   printf 'gitdir: ./.bare\n' > "$NEW/.git"
   git -C "$NEW" worktree add ./main "<MAIN>"
   # root signpost (route agents opened at the root into main/):
   cp "${CLAUDE_PLUGIN_ROOT}/skills/new-project/bare-root-signpost.md" "$NEW/CLAUDE.md" \
     2>/dev/null || true
   [ -f "$NEW/CLAUDE.md" ] || printf '# Bare-repo root — work in main/, not here. cd main and follow its CLAUDE.md.\n' > "$NEW/CLAUDE.md"
   ln -sf CLAUDE.md "$NEW/AGENTS.md"
   ```

6. **Carry over the preserved files** (from step 2) into `"$NEW/main/"` — `.env`, every other local-only file
   /folder, e.g. `cp "<repo>/.env" "$NEW/main/.env"`, `cp -R "<repo>/Marketing" "$NEW/main/Marketing"`. Then,
   if it's a Node project, `cd "$NEW/main" && npm install`.

7. **Verify the new layout BEFORE swapping.**
   ```
   git -C "$NEW/main" status --short            # clean (ignored files don't show)
   git -C "$NEW/main" rev-parse --short HEAD     # == origin/<MAIN>
   git -C "$NEW/main" diff --stat origin/<MAIN>..HEAD   # empty = identical to origin
   ```
   If it's a Node project, run a boot/import check or the non-DB tests. Confirm the preserved files are present.

8. **Swap (with backup) + repair the worktree links.** Worktree links store ABSOLUTE paths, so after the move
   they must be repaired or git breaks:
   ```
   cd "<parent of repo>"
   mv "<repo>" "<repo>-OLD"
   mv "<repo>-new" "<repo>"
   git -C "<repo>/.bare" worktree repair "<repo>/main"    # pass the NEW path explicitly
   git -C "<repo>/main" status --short                    # must work now
   git -C "<repo>/main" worktree list
   ```

9. **Final verify + report.** Confirm `git` works from `<repo>/main`, HEAD == `origin/<MAIN>`, and every
   preserved file is present. Tell the operator the new layout is ready and the old one is backed up at
   `<repo>-OLD`. **Do NOT delete the backup yet.**

10. **Cleanup — only after the operator confirms the new layout works.** Re-scan the backup for any local-only
    files not yet carried (`git -C "<repo>-OLD" status --ignored --short | grep -vE 'node_modules|DS_Store'`),
    re-run the branch audit (step 3) on the backup, and only when both are clear delete `<repo>-OLD` (and any
    stale sibling worktree folders). Ask before deleting.

## Rules
- Confirm-first before the swap and before any deletion. Never delete the backup until the operator confirms.
- Build-new-then-swap — never mutate the original in place.
- Preserve ALL local-only files (`.env`, data, assets), not just `.env`. Scan `git status --ignored`.
- Never discard a branch with unique commits (`git cherry` shows `+`) without the operator's explicit OK.
- After moving worktree folders, always `git worktree repair <newpath>` (absolute-path links break on move).
