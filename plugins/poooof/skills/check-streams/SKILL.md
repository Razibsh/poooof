---
name: check-streams
description: Catch merge conflicts before they happen — list every file edited by two or more active stream branches, so overlapping streams are caught early instead of at merge time. Use before merging a stream when 2+ streams are active, when asked "will these streams conflict / collide", or to pick safe parallel tasks. Run standalone or from finish-stream. User-invoked.
argument-hint: [base-ref, default main]
allowed-tools: Bash(git:*), Read
---

# Check streams for merge-conflict risk

Worktrees stop two agents colliding *while they work* — but two branches that edit the **same file** still
conflict when the second one merges. This skill lists every file touched by **2+ active stream branches** so
you can fix the overlap early (give each file one owner, or merge the overlapping streams one after another)
instead of discovering it mid-merge.

Run it **before merging a stream** whenever 2+ streams are active, and when **planning** parallel work (to pick
tasks that touch different files).

## What to do

Run this from anywhere inside the project (any worktree). It reads the branches checked out in worktrees
straight from git — the source of truth — and diffs each against the base branch. Base defaults to `main`;
if `$ARGUMENTS` names a base ref, pass it instead.

```bash
bash -c '
set -euo pipefail
BASE="${1:-main}"
# Pick main/master if the given base does not exist.
git rev-parse --verify --quiet "$BASE" >/dev/null 2>&1 || { git rev-parse --verify --quiet master >/dev/null 2>&1 && BASE=master; }

# Branches currently checked out in worktrees, excluding the base branch.
branches="$(git worktree list --porcelain | awk "/^branch /{sub(\"refs/heads/\",\"\",\$2); print \$2}" | grep -vx "$BASE" || true)"
if [ -z "$branches" ]; then
  echo "No active stream branches other than '"'"'$BASE'"'"'. Nothing to check."
  exit 0
fi

tmp="$(mktemp)"; trap "rm -f \"$tmp\"" EXIT
echo "Active streams (changes vs base '"'"'$BASE'"'"'):"
while IFS= read -r br; do
  [ -n "$br" ] || continue
  files="$(git diff --name-only "$BASE...$br" 2>/dev/null || true)"
  count="$(printf "%s" "$files" | grep -c . || true)"
  echo "  • $br — ${count} changed file(s)"
  printf "%s\n" "$files" | while IFS= read -r f; do
    [ -n "$f" ] && printf "%s\t%s\n" "$f" "$br" >> "$tmp"
  done
done <<BRANCHES
$branches
BRANCHES

echo
shared="$(cut -f1 "$tmp" 2>/dev/null | sort | uniq -d || true)"
if [ -z "$shared" ]; then
  echo "  ✅ No shared files — these streams will merge clean."
  exit 0
fi
echo "  ⚠ CONFLICT RISK — these files are edited by 2+ streams:"
printf "%s\n" "$shared" | while IFS= read -r f; do
  brs="$(awk -F"\t" -v f="$f" "\$1==f{printf \" %s\", \$2}" "$tmp")"
  echo "     • $f  ←$brs"
done
echo
echo "  Fix: give each file ONE owner stream, or merge the overlapping streams sequentially"
echo "  (rebase the later stream onto main after the first one lands)."
' _ $ARGUMENTS
```

## Reading the result

- **"✅ No shared files"** — the active streams touch disjoint files; they'll merge clean in any order.
- **"⚠ CONFLICT RISK"** — the listed files are edited by 2+ streams. They *will* conflict at the second
  merge. Resolve it now, not later:
  - **Give each file one owner** — decide which stream keeps the change; the others drop it.
  - **Or merge sequentially** — land one stream, then `git rebase main` the others so they absorb the change
    before they merge.

This is a **heads-up tool** — it never edits or merges anything. It only reports overlap.
