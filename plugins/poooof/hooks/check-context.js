#!/usr/bin/env node
// UserPromptSubmit hook: notice when a session has grown long and get the handoff
// written BEFORE the context is lost.
//
// Why this exists: the operator's recurring fear is that a long chat ends (or
// auto-compacts) with knowledge that never reached a file, so the next session pays to
// rediscover it. The framework already has the cure — `poooof:handoff` — but it only
// ran if a human remembered to type it, which under real time pressure they don't.
//
// PreCompact would be the obvious place to hook this, but it fires OUTSIDE the
// reasoning loop and cannot inject an instruction the agent will act on (verified
// against the hooks docs, 2026-08-18). UserPromptSubmit can. So we watch the
// transcript file grow and, at calibrated sizes, tell the agent to save.
//
// Thresholds are calibrated on real sessions, not guessed: in a heavy project the
// median session transcript is ~6 MB while the sessions that actually hurt run
// 20-90 MB. So the first nudge sits well above a normal session and the second lands
// before the expensive zone. Override with POOOOF_HANDOFF_MB.
//
// It only ever READS (one stat) and injects context. It never edits, commits, or
// blocks. Every failure path is silent (fail-open): a save nudge is a convenience,
// never something that should disrupt a session.

'use strict';

const fs = require('fs');
const path = require('path');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.dirname(__dirname);
const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(pluginRoot, '.cache');
const cacheFile = path.join(dataDir, 'context-check.json');

const MB = 1024 * 1024;
const WARN_MB = Number(process.env.POOOOF_HANDOFF_MB) > 0
  ? Number(process.env.POOOOF_HANDOFF_MB)
  : 12;
const URGENT_MB = WARN_MB * 2.5;

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { return null; }
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) { return {}; }
}

function writeCache(c) {
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(c));
  } catch (e) { /* cache is best-effort */ }
}

function main() {
  const input = readStdin();
  if (!input || !input.transcript_path || !input.session_id) return;

  let sizeMb;
  try { sizeMb = fs.statSync(input.transcript_path).size / MB; } catch (e) { return; }

  const stage = sizeMb >= URGENT_MB ? 'urgent' : (sizeMb >= WARN_MB ? 'warn' : null);
  if (!stage) return;

  // Fire once per stage per session — a nudge on every prompt would be noise, and
  // noise is exactly how the previous reminders got ignored.
  const cache = readCache();
  const seen = cache[input.session_id];
  if (seen === stage || seen === 'urgent') return;
  cache[input.session_id] = stage;

  // Keep the cache from growing without bound across many sessions.
  const keys = Object.keys(cache);
  if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete cache[k];
  writeCache(cache);

  const rounded = sizeMb.toFixed(0);
  const body = stage === 'urgent'
    ? `🧳 poooof context watch — this session's transcript is ~${rounded} MB, well into the range where ` +
      'every further tool call is expensive and an auto-compact may drop detail.\n' +
      '**Invoke the `poooof:handoff` skill now**, before continuing: write the current state, decisions, ' +
      'ideas and roadmap check-offs to their files and commit the paperwork. Then tell the operator it is ' +
      'safe to clear and continue in a fresh session — files on disk survive `/clear`, this chat does not.\n' +
      'If a handoff was already saved since the last real change, say so in one line and carry on.'
    : `🧳 poooof context watch — this session's transcript has passed ~${rounded} MB, so it is now long ` +
      'enough that losing it would cost real re-discovery.\n' +
      '**Invoke the `poooof:handoff` skill at the next natural pause** (a task finishing, a stream reaching ' +
      'a stopping point) so the durable facts reach STATUS.md / DECISIONS.md / BACKLOG.md / ROADMAP.md. ' +
      'Do not interrupt work mid-step to do it, and do not mention this notice otherwise.';

  process.stdout.write(JSON.stringify({
    systemMessage: stage === 'urgent'
      ? `🧳 poooof: session ~${rounded} MB — saving a handoff before continuing.`
      : `🧳 poooof: session ~${rounded} MB — will save a handoff at the next pause.`,
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: body },
  }));
}

try { main(); } catch (e) { /* fail-open: never disrupt a session */ }
