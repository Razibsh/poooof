#!/usr/bin/env node
// Background worker spawned by check-update.js. Fetches the latest poooof
// version from the repo's main branch and writes it to the cache file the
// SessionStart hook reads next time. Runs detached — its output is never shown
// directly; it only updates the cache. Every failure path is silent.

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const cacheFile = process.env.POOOOF_CACHE_FILE;
const dataDir = process.env.POOOOF_DATA_DIR;
const installed = process.env.POOOOF_INSTALLED || '0.0.0';

// The latest version is whatever plugin.json declares on the repo's main branch.
// When a new version is pushed there, auto-update users get it automatically and
// manual users get nudged by the banner.
const LATEST_URL =
  'https://raw.githubusercontent.com/Razibsh/poooof/main/plugins/poooof/.claude-plugin/plugin.json';

function isNewer(a, b) {
  const pa = String(a || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  const pb = String(b || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function fetchLatest() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      LATEST_URL,
      { headers: { 'User-Agent': 'poooof-update-check' }, timeout: 10000 },
      res => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).version);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

(async () => {
  let latest = null;
  try {
    latest = await fetchLatest();
  } catch (e) {
    return; // Network/parse failure: leave any existing cache untouched.
  }
  if (!latest || !cacheFile) return;

  const result = {
    installed,
    latest,
    update_available: isNewer(latest, installed),
    checked: Math.floor(Date.now() / 1000),
  };

  try {
    if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result));
  } catch (e) {
    // Best-effort: if we can't write, next session simply retries.
  }
})();
