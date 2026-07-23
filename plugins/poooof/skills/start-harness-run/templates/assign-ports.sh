#!/usr/bin/env bash
set -euo pipefail

# assign-ports.sh — hand a new run a preview port and a test port that nobody else owns.
#
# Run from the project root (the folder holding .bare/ and main/). Prints two free ports.
#
# Why this is a script and not "just check with lsof": lsof only sees ports that are LISTENING
# RIGHT NOW. A port claimed by a stream whose server happens to be stopped looks free — so setting
# up six runs at midnight, when nothing is running, would hand the same port out twice. The claim
# ledger is the union of three sources, and all three must be consulted:
#
#   1. lsof            — what is listening this second
#   2. .claude/launch.json — what the project has registered (running or not)
#   3. */.harness/PORTS.md — what every other run has already been promised
#
# Sources 2 and 3 are the ones that matter for parallel setup, and they are exactly what a
# live-port check misses.

PREVIEW_BASE="${PREVIEW_BASE:-3300}"
TEST_BASE="${TEST_BASE:-3400}"
SCAN=200

claimed() {
  # 1. listening now
  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '{print $9}' | sed 's/.*://' | grep -E '^[0-9]+$' || true
  # 2. registered in the project's launch config
  if [[ -f .claude/launch.json ]]; then
    grep -oE '"port"[[:space:]]*:[[:space:]]*[0-9]+' .claude/launch.json | grep -oE '[0-9]+' || true
  fi
  # 3. promised to any other run (including ones not launched yet)
  grep -rhoE '^\| *(preview|test) *\| *[0-9]+' */.harness/PORTS.md 2>/dev/null |
    grep -oE '[0-9]+$' || true
}

CLAIMED="$(claimed | sort -un)"
is_free() { ! grep -qx "$1" <<<"$CLAIMED"; }

pick() {
  local base=$1 p
  for (( p = base + 1; p <= base + SCAN; p++ )); do
    if is_free "$p"; then echo "$p"; return 0; fi
  done
  echo "No free port in ${base}..$((base + SCAN))" >&2; return 1
}

PREVIEW="$(pick "$PREVIEW_BASE")"
CLAIMED="$CLAIMED
$PREVIEW"                     # so preview and test can never collide with each other
TEST="$(pick "$TEST_BASE")"

echo "preview=$PREVIEW"
echo "test=$TEST"
echo
echo "Write these into <stream>/.harness/PORTS.md so the NEXT run sees them as taken:"
echo
echo "| role    | port |"
echo "|---------|------|"
echo "| preview | $PREVIEW |"
echo "| test    | $TEST |"
