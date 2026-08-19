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
        return { docDir: dir, gitCwd, root };
      }
    } catch (e) { /* keep looking */ }
  }
  return null;
}

// Folders sitting at a bare-repo ROOT that are not worktrees. The root is supposed to be a map of
// branches and nothing else — that is what makes the file picker readable, because every folder in
// it IS a stream and its name IS its branch. One stray folder breaks that, and nothing ever looked.
//
// Found 2026-08-18 in a real project: a `docs/` holding nothing but a .DS_Store, and a `LEGAL-PAGES/`
// holding the live site's privacy policy and terms — in NO git repository at all, unversioned and
// unbacked-up, sitting there for weeks because no check reads the root.
function straysAtRoot(root, gitCwd) {
  if (!root) return [];                                   // flat repo — no bare root to police
  const known = new Set();
  const wt = git(['worktree', 'list', '--porcelain'], gitCwd);
  if (wt.code !== 0) return [];
  for (const line of wt.out.split('\n')) {
    if (line.startsWith('worktree ')) known.add(path.basename(line.slice(9).trim()));
  }
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return []; }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => !n.startsWith('.'))                    // .bare, .claude — infrastructure, not clutter
    .filter((n) => !known.has(n));
}

// One line naming where this session actually is. The operator asked this three separate times:
// in the desktop app the folder and branch are picked when a chat starts and then never shown
// again, and the terminal statusline does not exist there — so a chat gives no clue which worktree
// it is in, and at a bare-repo root every stream folder looks identical in the file picker.
//
// Printed on EVERY session, in sync or not, because "where am I" is not an error condition. It also
// surfaces a folder/branch mismatch immediately, before work happens rather than after.
function locationLine(cwd) {
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  if (top.code !== 0 || !top.out) return null;
  const folder = path.basename(top.out);
  const head = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (head.code !== 0 || !head.out) return null;
  const branch = head.out === 'HEAD' ? 'detached' : head.out;
  // main/main agrees; forms-builder/feat/forms-builder agrees; main/docs/whatever does not.
  const agrees = folder === branch || branch.endsWith('/' + folder);
  return `📍 ${folder} │ ${branch}${agrees ? '' : '  ⚠️ folder and branch disagree'}`;
}

// The main worktree must be sitting on the main branch. Every other check, every skill,
// and the whole bare-repo layout assume `<root>/main/` IS main — and nothing ever verified
// it. On 2026-08-18 it was wrong three times in one day (a feature branch, then a merged
// stream's worktree holding main hostage, then a docs branch), and each time it caused a
// real problem: a commit nearly landed on the wrong branch, Check 3 measured the wrong
// branch's backlog, and a session was blocked from registering its stream.
function mainWorktreeOffMain(gitCwd, docDir, mainRef) {
  if (path.basename(docDir) !== mainRef) return null;   // flat repo, or docs aren't in main/
  const head = git(['rev-parse', '--abbrev-ref', 'HEAD'], docDir);
  if (head.code !== 0 || !head.out || head.out === mainRef) return null;
  if (head.out === 'HEAD') return { on: 'a detached HEAD', holder: null };
  // Who has main checked out instead? Naming them makes the fix obvious.
  let holder = null;
  const wt = git(['worktree', 'list', '--porcelain'], gitCwd);
  if (wt.code === 0) {
    for (const block of wt.out.split(/\n\s*\n/)) {
      const b = block.match(/^branch (.+)$/m);
      const d = block.match(/^worktree (.+)$/m);
      if (b && d && b[1].trim().replace(/^refs\/heads\//, '') === mainRef) {
        const base = path.basename(d[1].trim());
        if (base !== path.basename(docDir)) holder = base;
      }
    }
  }
  return { on: head.out, holder };
}

// Streams whose CODE moved but whose paperwork did not. This is the check that makes
// silence impossible: an agent can decline to document, but it cannot hide the fact.
// For each unmerged stream we find when its `docs/streams/<name>.md` was last touched
// (searched across all refs, since the doc usually lives on main while the code lives on
// the branch) and count how many of the branch's own commits landed after that. Three or
// more means real work has accumulated with no record of it.
//
// Deliberately NOT a judgement about quality — only about existence. Whether the doc is
// any good is a human's call; whether it was updated at all is arithmetic.
function staleStreamDocs(gitCwd, docDir, rows, mainRef) {
  const STALE_AFTER = Number(process.env.POOOOF_STALE_AFTER) > 0
    ? Number(process.env.POOOOF_STALE_AFTER)
    : 3;
  const out = [];
  for (const r of rows) {
    if (git(['rev-parse', '--verify', '--quiet', r.branch], gitCwd).code !== 0) continue; // gone
    if (git(['merge-base', '--is-ancestor', r.branch, mainRef], gitCwd).code === 0) continue; // merged: Check 1 owns it
    const ahead = git(['rev-list', '--count', `${mainRef}..${r.branch}`], gitCwd);
    if (ahead.code !== 0 || !/^\d+$/.test(ahead.out) || Number(ahead.out) === 0) continue;

    const doc = `docs/streams/${r.name}.md`;
    const when = git(['log', '-1', '--format=%ct', '--all', '--', doc], gitCwd);
    if (when.code !== 0 || !/^\d+$/.test(when.out)) {
      out.push({ name: r.name, branch: r.branch, n: ahead.out, noDoc: true });
      continue;
    }
    const newer = git(['rev-list', '--count', `--since=@${when.out}`, `${mainRef}..${r.branch}`], gitCwd);
    if (newer.code === 0 && /^\d+$/.test(newer.out) && Number(newer.out) >= STALE_AFTER) {
      out.push({ name: r.name, branch: r.branch, n: newer.out, noDoc: false });
    }
  }
  return out;
}

// Worktrees that exist on disk but have NO row in WORKSTREAMS.md. This is the mirror of
// Check 1: that one catches a row whose branch already merged, this catches a worktree
// nobody wrote down. An unregistered worktree is invisible to every other session — real
// commits pile up in a folder the tracking docs never mention, which is exactly the drift
// the docs exist to prevent. Seen live 2026-08-18: a 7-commit worktree with no row.
function unregisteredWorktrees(gitCwd, docDir, rows) {
  const out = git(['worktree', 'list', '--porcelain'], gitCwd);
  if (out.code !== 0) return [];
  const docBase = path.basename(docDir);
  const res = [];
  for (const block of out.out.split(/\n\s*\n/)) {
    if (/^bare$/m.test(block)) continue;                     // the .bare repo itself
    const dirM = block.match(/^worktree (.+)$/m);
    const brM = block.match(/^branch (.+)$/m);
    if (!dirM || !brM) continue;                             // detached HEAD = not a stream
    const base = path.basename(dirM[1].trim());
    const branch = brM[1].trim().replace(/^refs\/heads\//, '');
    if (base === docBase) continue;                          // the main worktree itself
    if (branch === 'main' || branch === 'master') continue;
    if (rows.some(r => r.name === base || r.branch === branch)) continue;
    res.push({ base, branch });
  }
  return res;
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
  const { docDir, gitCwd, root } = ctx;
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
  // `@{upstream}` resolves against HEAD, not against mainRef — so in a worktree sitting on
  // some other branch this measured that branch's backlog and reported it as main's. It
  // produced a confident "123 commit(s) not pushed" for a main that was actually 0 ahead
  // (2026-08-18). Ask about the main branch explicitly instead.
  const upstream = git(['rev-parse', '--abbrev-ref', `${mainRef}@{upstream}`], gitCwd);
  const ahead = upstream.code === 0 && upstream.out
    ? git(['rev-list', '--count', `${upstream.out}..${mainRef}`], gitCwd)
    : { code: 1, out: '' };
  if (ahead.code === 0 && /^\d+$/.test(ahead.out) && Number(ahead.out) > 0) {
    findings.push(`- ${mainRef} has **${ahead.out} commit(s) not pushed** to origin → back up with \`git push\` when you're at a clean stopping point.`);
  }

  // Check 4: a worktree on disk that no row in WORKSTREAMS.md mentions. Check 1 catches a
  // row without a live branch; this catches the reverse — a branch without a row.
  for (const w of unregisteredWorktrees(gitCwd, docDir, activeStreams(docDir))) {
    const n = git(['rev-list', '--count', `${mainRef}..${w.branch}`], gitCwd);
    const cnt = (n.code === 0 && /^\d+$/.test(n.out)) ? n.out : '?';
    findings.push(`- Worktree **${w.base}/** (\`${w.branch}\`, ${cnt} commit(s) ahead of ${mainRef}) has **no row in WORKSTREAMS.md** → that work is invisible to every other session. Register it (a row + \`docs/streams/${w.base}.md\`), or run \`poooof:finish-stream\` if it is already done.`);
  }

  // Check 5: a stream whose code moved but whose stream doc did not. Checks 1-4 all watch
  // git-vs-git or git-vs-table; this one watches WORK vs its RECORD, which is the drift a
  // human actually pays for later.
  for (const s of staleStreamDocs(gitCwd, docDir, activeStreams(docDir), mainRef)) {
    findings.push(s.noDoc
      ? `- Stream **${s.name}** (\`${s.branch}\`) has **${s.n} commit(s) and no \`docs/streams/${s.name}.md\`** → the work has no written record at all. Write the stream doc, or run \`poooof:handoff\` from that worktree.`
      : `- Stream **${s.name}** (\`${s.branch}\`) has **${s.n} commit(s) newer than its stream doc** → code moved, the record did not. Run \`poooof:handoff\` from that worktree so the next session inherits the truth.`);
  }

  // Check 6: the main worktree is not on the main branch. Everything else assumes it is.
  const off = mainWorktreeOffMain(gitCwd, docDir, mainRef);
  if (off) {
    findings.push(off.holder
      ? `- The **${path.basename(docDir)}/** folder is on \`${off.on}\`, not \`${mainRef}\` — and **${off.holder}/** is holding \`${mainRef}\`. Other checks and skills assume \`${path.basename(docDir)}/\` IS ${mainRef}. Free the branch (finish that stream, or move it off ${mainRef}) and put this folder back with \`git checkout ${mainRef}\`.`
      : `- The **${path.basename(docDir)}/** folder is on ${off.on === 'a detached HEAD' ? off.on : `\`${off.on}\``}, not \`${mainRef}\` → \`git checkout ${mainRef}\` there when its tree is clean. Commits made here land on the wrong branch, and doc-sync reads the wrong branch's state.`);
  }

  // Check 7: the bare root should be a map of branches — worktrees and nothing else.
  const strays = straysAtRoot(root, gitCwd);
  if (strays.length) {
    findings.push(
      `- The project root holds ${strays.length} folder(s) that are **not worktrees**: ${strays.map((n) => `\`${n}/\``).join(', ')} → at a bare root every folder should BE a stream, so the file picker reads itself. Move each into a worktree (where git will track it) or out of the project. 🔴 A folder here is in **no git repository at all** — nothing versions or backs it up.`,
    );
  }

  const loc = locationLine(process.cwd());

  if (!findings.length) {
    // In sync: still say where we are, and nothing else.
    if (loc) process.stdout.write(JSON.stringify({ systemMessage: loc }));
    return;
  }

  const body =
    '📋 poooof doc-sync — these are out of step with git and should be reconciled before other work ' +
    '(this is the framework keeping ROADMAP.md / WORKSTREAMS.md honest, so any agent picks up an accurate picture):\n' +
    findings.join('\n') +
    '\nReconcile these BEFORE the first code or doc change in this repo — answering a question first is fine, ' +
    'but do not START feature work on a stale picture. Each is a one-command fix.';

  process.stdout.write(JSON.stringify({
    systemMessage: `${loc ? loc + '\n' : ''}📋 poooof: doc-sync drift detected (${findings.length}) — reconciling before other work.`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: body },
  }));
}

try { main(); } catch (e) { /* fail-open: never disrupt a session */ }
