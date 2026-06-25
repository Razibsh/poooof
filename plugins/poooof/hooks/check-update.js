#!/usr/bin/env node
// SessionStart hook: surface a one-line "poooof update available" nudge.
//
// Why this exists: auto-update is OFF by default for third-party marketplaces,
// so users who skipped that toggle silently fall behind. This prints a banner
// at session start when the installed version is older than what's on GitHub.
//
// Unlike GSD's installer model, poooof is a pure plugin — nothing is copied into
// ~/.claude, so there is no "stale hooks" failure mode. The only thing worth
// checking is "is a newer release available?". plugin.json's version IS the
// installed version; the background worker compares it against the same file on
// the repo's main branch.
//
// This hook runs synchronously at every session start, so it must be fast: it
// only reads two small local files and (at most) spawns a detached worker. All
// network I/O happens in that worker. Every failure path is silent (fail-open):
// an update nudge is a convenience, never something that should disrupt a session.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Only refresh the cached "latest version" if it's older than this, to avoid
// hitting GitHub on every single session start.
const REFRESH_AFTER_SECONDS = 6 * 60 * 60;

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.dirname(__dirname);
// CLAUDE_PLUGIN_DATA persists across plugin updates — the right place for cache.
const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(pluginRoot, '.cache');
const cacheFile = path.join(dataDir, 'update-check.json');
const manifestFile = path.join(pluginRoot, '.claude-plugin', 'plugin.json');

// Read the installed version straight from the shipped manifest.
function readInstalledVersion() {
  try {
    return JSON.parse(fs.readFileSync(manifestFile, 'utf8')).version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

// true if a is strictly newer than b. Strips pre-release suffixes (e.g.
// "1.2.0-beta.1" -> "1.2.0") so Number() never yields NaN.
function isNewer(a, b) {
  const pa = String(a || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  const pb = String(b || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) {
    return null;
  }
}

const installed = readInstalledVersion();
const cache = readCache();
const now = Math.floor(Date.now() / 1000);

// Spawn the background refresh worker when the cache is missing or stale.
// Detached + unref'd so it never holds up session start.
if (!cache || typeof cache.checked !== 'number' || now - cache.checked > REFRESH_AFTER_SECONDS) {
  try {
    const child = spawn(process.execPath, [path.join(__dirname, 'check-update-worker.js')], {
      stdio: 'ignore',
      windowsHide: true,
      detached: true,
      env: {
        ...process.env,
        POOOOF_CACHE_FILE: cacheFile,
        POOOOF_DATA_DIR: dataDir,
        POOOOF_INSTALLED: installed,
      },
    });
    child.unref();
  } catch (e) {
    // Best-effort: if we can't spawn, we just won't refresh this session.
  }
}

// Show the banner from whatever the last refresh found. Compare against the
// CURRENT installed version (not the cache's snapshot) so the nudge clears
// itself the moment the user actually updates.
if (cache && cache.latest && isNewer(cache.latest, installed)) {
  process.stdout.write(JSON.stringify({
    systemMessage: `⬆ poooof ${cache.latest} available (you have ${installed}) — run /plugin update poooof@poooof`,
  }));
}
