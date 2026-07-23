#!/usr/bin/env node
// SessionStart hook: keep the project docs in sync with git reality, automatically.
//
// Why this exists: poooof's docs (ROADMAP.md / WORKSTREAMS.md) are kept current by
// agents following the skill rules — but a step can be missed (e.g. a stream merges
// on GitHub and nobody promotes the phase to "done" in ROADMAP.md). That drift is
// invisible until a human notices. This hook makes the FRAMEWORK notice instead: it
// compares the docs against git on every session start and, when they disagree,
// injects an instruction so the agent reconciles them FIRST — before other work,
// without the operator having to ask.
//
// It only ever READS (git + two markdown files) and injects context. It never edits,
// commits, or pushes anything — the agent does the actual reconciliation as a visible
// step. Every failure path is silent (fail-open): a sync nudge is a convenience, never
// something that should disrupt a session or fire on a non-poooof repo.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.dirname(__dirname);
const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(pluginRoot, '.cache');
const cacheFile = path.join(dataDir, 'sync-check.json');

// Run a git command in `cwd`; return { code, out }. Never throws.
function git(args, cwd) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
    });
    return { code: 0, out: out.trim() };
  } catch (e) {
    return { code: typeof e.status === 'number' ? e.status : 1, out: '' };
  }
}

// Resolve the project's doc directory (where ROADMAP.md / WORKSTREAMS.md live) and a
// git working directory to query. Handles the bare-repo + worktree layout (docs live
// in <root>/main) as well as a plain flat repo. Returns null if this isn't a project
// we should touch.
function resolve() {
  const cwd = process.cwd();
  const common = git(['rev-parse', '--git-common-dir'], cwd);
  if (common.code !== 0) return null; // not a git repo
  const commonAbs = path.resolve(cwd, common.out);
  const root = path.basename(commonAbs) === '.bare' ? path.dirname(commonAbs) : null;

  const top = git(['rev-parse', '--show-toplevel'], cwd);
  const candidates = [];
  if (root) candidates.push(path.join(root, 'main'));
  if (top.code === 0) candidates.push(top.out);
  if (root) candidates.push(root);
  candidates.push(cwd);

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'WORKSTREAMS.md')) || fs.existsSync(path.join(dir, 'ROADMAP.md'))) {
        // Pick a git working dir: prefer a real worktree (the doc dir if it has .git,
        // else the resolved toplevel).
        const gitCwd = fs.existsSync(path.join(dir, '.git')) ? dir : (top.code === 0 ? top.out : dir);
        return { docDir: dir, gitCwd };
      }
    } catch (e) { /* keep looking */ }
  }
  return null;
}

// The repo's primary integration branch.
function mainBranch(cwd) {
  for (const b of ['main', 'master']) {
    if (git(['rev-parse', '--verify', '--quiet', b], cwd).code === 0) return b;
  }
  return 'main';
}

// Parse the active stream rows out of WORKSTREAMS.md. Returns [{ name, branch }].
function activeStreams(docDir) {
  let text;
  try {
    text = fs.readFileSync(path.join(docDir, 'WORKSTREAMS.md'), 'utf8');
  } catch (e) {
    return [];
  }
  // Strip HTML comment blocks first — the template keeps an example table row inside
  // a <!-- ... --> comment, which must never be read as a real active stream.
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim());
    // drop the leading/trailing empties from the split
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 2) continue;
    const name = cells[0];
    const branch = cells[1];
    if (/^stream$/i.test(name)) continue;          // header
    if (/^-+$/.test(name)) continue;               // divider
    // Placeholder row — tolerate any "_(none …)_" wording, not just the canonical
    // "_(none active)_". Writing "_(none registered)_" used to be parsed as a real stream, so the
    // hook told the operator to finish-stream a stream that never existed.
    if (/_\(\s*none\b[^)]*\)_/i.test(name)) continue;
    if (!branch || /^-+$/.test(branch)) continue;
    rows.push({ name, branch });
  }
  return rows;
}

// feat/* branches that have already landed on main — both locally merged branches and
// those merged via a GitHub PR (parsed from recent merge-commit subjects).
function mergedFeatureBranches(gitCwd, main) {
  const set = new Set();
  const local = git(['branch', '--merged', main, '--format=%(refname:short)'], gitCwd);
  if (local.code === 0) {
    for (const b of local.out.split('\n')) {
      const t = b.trim();
      if (/^feat\//.test(t)) set.add(t);
    }
  }
  const merges = git(['log', '--merges', '-n', '40', '--pretty=%s', main], gitCwd);
  if (merges.code === 0) {
    for (const subj of merges.out.split('\n')) {
      let m = subj.match(/from\s+\S+\/(feat\/[A-Za-z0-9._-]+)/); // "...from owner/feat/x"
      if (!m) m = subj.match(/Merge branch '\s*(feat\/[A-Za-z0-9._-]+)\s*'/);
      if (m) set.add(m[1]);
    }
  }
  return [...set];
}

// Is `branch` already an ancestor of `main` (i.e. merged)? A branch that no longer
// exists (cleaned up post-merge) counts as merged too.
function isMerged(branch, main, gitCwd) {
  if (git(['rev-parse', '--verify', '--quiet', branch], gitCwd).code !== 0) return true; // gone
  return git(['merge-base', '--is-ancestor', branch, main], gitCwd).code === 0;
}

// Does ROADMAP.md mention this branch's feature at all? Cheap keyword presence on the
// segment after feat/ (e.g. feat/freeze-cancel -> tokens "freeze","cancel"). Absent
// entirely is a strong signal the merged work was never reflected.
function reflectedInRoadmap(branch, roadmap) {
  const seg = branch.replace(/^feat\//, '');
  const tokens = seg.split(/[-_]/).filter(t => t.length >= 4);
  const probes = tokens.length ? tokens : [seg];
  const hay = roadmap.toLowerCase();
  return probes.some(t => hay.includes(t.toLowerCase()));
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) { return { surfaced: [] }; }
}
function writeCache(c) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(c));
  } catch (e) { /* best-effort */ }
}

function main() {
  const ctx = resolve();
  if (!ctx) return; // not a poooof project — stay silent
  const { docDir, gitCwd } = ctx;
  const mainRef = mainBranch(gitCwd);

  const findings = [];

  // Check 1 (strong, self-clearing): a stream still listed active whose branch has
  // already merged into main. finish-stream didn't fully run — roadmap is likely stale
  // and the row should be cleared. Re-surfaces every session until the row is gone.
  for (const s of activeStreams(docDir)) {
    if (isMerged(s.branch, mainRef, gitCwd)) {
      findings.push(`- Stream **${s.name}** (\`${s.branch}\`) is merged into ${mainRef} but still listed **active** in WORKSTREAMS.md → run \`poooof:finish-stream ${s.name}\` to reconcile ROADMAP.md and clear the row.`);
    }
  }

  // Check 2 (cached once per branch): a feature branch merged into main whose feature
  // isn't mentioned in ROADMAP.md at all — likely shipped without being marked done.
  let roadmap = '';
  try { roadmap = fs.readFileSync(path.join(docDir, 'ROADMAP.md'), 'utf8'); } catch (e) { /* no roadmap */ }
  const cache = readCache();
  const surfaced = new Set(cache.surfaced || []);
  if (roadmap) {
    for (const branch of mergedFeatureBranches(gitCwd, mainRef)) {
      if (surfaced.has(branch)) continue;
      if (!reflectedInRoadmap(branch, roadmap)) {
        findings.push(`- Merged branch \`${branch}\` isn't reflected in ROADMAP.md → mark its phase/item done (check it off, promote out of "Later", advance the current-position header), then commit + push.`);
        surfaced.add(branch);
      }
    }
  }
  writeCache({ surfaced: [...surfaced] });

  // Check 3 (read-only sync awareness): unpushed commits on main = work not backed up.
  const ahead = git(['rev-list', '--count', `@{upstream}..${mainRef}`], gitCwd);
  if (ahead.code === 0 && /^\d+$/.test(ahead.out) && Number(ahead.out) > 0) {
    findings.push(`- ${mainRef} has **${ahead.out} commit(s) not pushed** to origin → back up with \`git push\` when you're at a clean stopping point.`);
  }

  if (!findings.length) return; // everything in sync — stay silent

  const body =
    '📋 poooof doc-sync — these are out of step with git and should be reconciled before other work ' +
    '(this is the framework keeping ROADMAP.md / WORKSTREAMS.md honest, so any agent picks up an accurate picture):\n' +
    findings.join('\n') +
    '\nReconcile the above now, then continue with the session.';

  process.stdout.write(JSON.stringify({
    systemMessage: `📋 poooof: doc-sync drift detected (${findings.length}) — reconciling before other work.`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: body },
  }));
}

try { main(); } catch (e) { /* fail-open: never disrupt a session */ }
