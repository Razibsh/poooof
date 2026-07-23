#!/usr/bin/env bash
set -euo pipefail

# run-harness.sh — autonomous run driver (poooof:start-harness-run).
#
# Drives a headless coding agent in a FILE-STATE loop: each iteration is a fresh agent that reads
# .harness/{SPEC,ACCEPTANCE,BASELINE,STATUS}.md + git history, does ONE small sprint, and exits.
# Nothing depends on a single session holding context, so an 8-hour run is just many short ones.
#
# NEVER pushes, merges, or deploys. Isolated worktree branch only.

### ---- config (override via env) ----
TASK_SLUG="${TASK_SLUG:-task}"
MAX_ITERS="${MAX_ITERS:-25}"          # hard cap on iterations
MAX_HOURS="${MAX_HOURS:-8}"           # hard wall-clock cap

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"      # .../.harness
WORKTREE_DIR="$(cd "$HARNESS_DIR/.." && pwd)"     # worktree root
cd "$WORKTREE_DIR"
LOG_DIR="$HARNESS_DIR/logs"
STOP_FILE="$HARNESS_DIR/STOP"                     # `touch` this to stop after the current iteration
STATUS_FILE="$HARNESS_DIR/STATUS.md"
DEADLINE=$(( $(date +%s) + MAX_HOURS * 3600 ))
mkdir -p "$LOG_DIR"

### ---- safety: never run on a shared/protected branch ----
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
  main|master|production|staging|develop)
    echo "REFUSING: the harness must not run on '$BRANCH'." >&2; exit 1 ;;
esac
echo "Harness starting on branch: $BRANCH  (task: $TASK_SLUG, caps: ${MAX_HOURS}h / ${MAX_ITERS} iters)"

### ---- preflight (these are the two that have actually bitten) ----
if [[ -f package.json && ! -d node_modules ]]; then
  echo "No node_modules in this worktree — installing (a fresh worktree is an empty shell)."
  npm ci
fi
if [[ ! -f "$HARNESS_DIR/BASELINE.md" ]]; then
  echo "REFUSING: no .harness/BASELINE.md. Without a recorded baseline the run cannot tell its own" >&2
  echo "          breakage from inherited breakage. Record it, then re-launch." >&2
  exit 1
fi

### ---- optional shared services: reuse what's up, only stop what WE started ----
# Set HARNESS_SERVICE_PORT + HARNESS_SERVICE_UP/DOWN to have the driver manage a DB/dev server.
SERVICE_STARTED_BY_US=0
if [[ -n "${HARNESS_SERVICE_PORT:-}" && -n "${HARNESS_SERVICE_UP:-}" ]]; then
  if (exec 3<>"/dev/tcp/127.0.0.1/${HARNESS_SERVICE_PORT}") 2>/dev/null; then
    exec 3>&- 3<&- 2>/dev/null || true
    echo "Service already on :${HARNESS_SERVICE_PORT} — reusing it (will NOT stop it)."
  else
    echo "Starting service on :${HARNESS_SERVICE_PORT}."
    eval "$HARNESS_SERVICE_UP"
    SERVICE_STARTED_BY_US=1
  fi
fi
cleanup() {
  if [[ "$SERVICE_STARTED_BY_US" == "1" && -n "${HARNESS_SERVICE_DOWN:-}" ]]; then
    eval "$HARNESS_SERVICE_DOWN" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

ITER=0
while :; do
  # ---- stop conditions, checked before each iteration ----
  [[ -f "$STOP_FILE" ]] && { echo "STOP file present — halting."; break; }
  (( $(date +%s) >= DEADLINE )) && { echo "Time cap (${MAX_HOURS}h) reached — halting."; break; }
  (( ITER >= MAX_ITERS )) && { echo "Iteration cap (${MAX_ITERS}) reached — halting."; break; }
  if grep -qE '^STATUS:[[:space:]]*(DONE|BLOCKED)' "$STATUS_FILE" 2>/dev/null; then
    echo "Terminal $(grep -E '^STATUS:' "$STATUS_FILE" | tail -1) — halting."; break
  fi

  ITER=$((ITER + 1))
  ts="$(date +%Y%m%d-%H%M%S)"
  echo "=== iteration $ITER  ($ts) ==="

  # One sprint. bypassPermissions is required for an unattended run; the blast radius is contained
  # by the branch + the rules in HARNESS.md (no push/merge/prod), not by tool-gating.
  claude -p \
    --permission-mode bypassPermissions \
    --add-dir "$WORKTREE_DIR" \
    --append-system-prompt "$(cat "$HARNESS_DIR/HARNESS.md")" \
    --output-format stream-json --verbose \
    "Iteration $ITER. Read .harness/ACCEPTANCE.md, .harness/BASELINE.md, .harness/STATUS.md (and SPEC.md if present). Do the NEXT smallest step toward the first unmet criterion, following the harness rules exactly. Run the real gates. Then update .harness/STATUS.md. One sprint only." \
    > "$LOG_DIR/iter-$ITER-$ts.jsonl" 2>&1 \
    || echo "(agent exited non-zero on iter $ITER — continuing to the next iteration)"
done

### ---- post-run report ----
REPORT="$HARNESS_DIR/RUN-REPORT-$(date +%Y%m%d-%H%M).md"
{
  echo "# Harness run report — $TASK_SLUG"
  echo
  echo "- Branch: \`$BRANCH\`"
  echo "- Iterations run: $ITER"
  echo "- Ended: $(date)"
  echo "- Final STATUS: $(grep -E '^STATUS:' "$STATUS_FILE" 2>/dev/null | tail -1 || echo 'n/a')"
  echo
  echo "## Commits this run (branch vs main)"
  git log --oneline main..HEAD || true
  echo
  echo "## Files changed"
  git diff --stat main..HEAD || true
  echo
  echo "## Final gate re-check"
  echo "(compare against .harness/BASELINE.md — inherited failures are NOT from this run)"
  if [[ -n "${HARNESS_GATES:-}" ]]; then
    if eval "$HARNESS_GATES"; then echo "GATES: PASS"; else echo "GATES: FAIL — review before doing anything with this branch"; fi
  else
    echo "(HARNESS_GATES not set — re-run the project's gates manually)"
  fi
} > "$REPORT" 2>&1
echo "Report written: $REPORT"
echo "Done. Nothing was pushed or merged. Review the branch, then run poooof:harness-report."
