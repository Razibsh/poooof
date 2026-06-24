# Team Workflow — humans + AI agents on one repo

How a small team works on the same project without stepping on each other or breaking the work —
whether the "team" is you + a partner, you + Codex, or all of you and Claude Code at once.

This is written in plain language on purpose. You don't need to be a professional developer to
run it. The whole thing rests on four habits.

---

## The one thing to understand first

There are two kinds of "memory" in how we work, and only one of them travels to a teammate:

- **The committed files** (`ROADMAP.md`, `DECISIONS.md`, `BACKLOG.md`, `CLAUDE.md`, and the code
  itself) live *in the repo*. When your partner pulls the repo, they get all of it. Their Claude
  or Codex reads the same `CLAUDE.md` and follows the same rules. **This is shared memory.**
- **The agent's session memory** (the "I remember what we did yesterday" feeling) lives in a
  database *on your own machine*. Your partner's agent cannot see it.

So the trick to a team staying in sync is simple: **push the important context into the repo.**
That's exactly what the doc-discipline in `CLAUDE.md` does — every decision, every plan change,
every captured idea ends up in a file that travels. Don't rely on an agent "remembering"; rely on
the files.

---

## Habit 1 — Git is the single source of truth

Everyone (every human, every agent) does the same loop:

```
git pull            # get everyone's latest work before you start
…do your work…
git push            # share your work when it's ready
```

Nothing important lives only on one laptop. If it's not pushed, it doesn't exist as far as the
team is concerned. Pull before you start; push when you're done.

## Habit 2 — Never work on `main` directly. One branch per task.

`main` is the "always-working" version of the project. You never edit it directly. Instead, each
task gets its own **branch** — a private copy you can change freely without affecting anyone else.

```
git checkout main
git pull
git checkout -b feature/short-description    # e.g. feature/client-billing
…do the work, commit as you go…
git push -u origin feature/short-description
```

- You work on `feature/billing`, your partner on `feature/onboarding`, Codex on `fix/qr-bug`.
- Because you're each on a different branch, **you physically cannot overwrite each other's work**
  while you're working. Branches are cheap, private, and disposable.
- **One agent per branch at a time.** The real collision risk with AI isn't two humans — it's two
  agents editing the *same files at the same moment*. Give each agent its own task and branch and
  don't overlap them. (If one person wants to run two agents at once, `git worktree` gives each a
  separate folder — ask your agent to set it up.)

## Habit 3 — Every change reaches `main` through a Pull Request

When a branch is done, you don't merge it into `main` yourself in the dark. You open a **Pull
Request (PR)** on GitHub. A PR is a "please review and merge this" proposal. It does two things:

1. **Something reviews it before it lands** — a human, or even another AI pass. This is your safety
   net against an agent confidently shipping something wrong. Don't merge your own PR without a
   second set of eyes (human or AI) when the change is non-trivial.
2. **Automated tests run on it** (if set up — see Habit 4), so broken code gets caught before it
   becomes everyone's problem.

```
# after pushing your branch:
gh pr create --fill          # opens the PR
# …review happens…
gh pr merge --squash         # merge once approved + tests green
```

Turn on **branch protection** for `main` in the GitHub repo settings so `main` *can only* be
updated through a PR. That one setting makes the whole system hard to break by accident.

## Habit 4 — Small, frequent merges beat big ones

The thing that actually causes "we messed up each other's work" is a branch that lives for two
weeks and drifts far from `main`. Merging it back becomes a nightmare ("merge conflicts").

The fix is boring and reliable: **keep branches short and merge often** — ideally daily-ish. A
branch that's a day old merges cleanly. A branch that's three weeks old fights you. When in doubt,
split a big task into smaller ones that each become their own quick branch + PR.

(Optional but worth it: set up **CI** — GitHub Actions that run your test command automatically on
every PR. Then "are the tests green?" is answered for you, not something anyone has to remember.)

---

## Working in parallel — one folder per stream (worktrees)

The simple default is **one task at a time**: one branch, one folder. But you can run **several tasks at
once** — different chats/agents each building a different feature. The tool that makes this safe is a
**worktree**: another folder holding the same project, locked to its own branch. One chat per folder = they
physically cannot collide.

**The layout (bare repo).** A Poooof project is one folder containing the git engine plus one folder per
branch:

```
ProjectName/
├── .bare/        ← the git engine (hidden; you never open it)
├── main/         ← the LIVE branch (deploys / merges land here)
├── audience/     ← a parallel stream (branch feat/audience)
└── billing/      ← another parallel stream (branch feat/billing)
```

You open `ProjectName/<stream>/` to work that feature, `ProjectName/main/` for the live branch.
`git worktree list` (from any of them) is always the true map.

**You don't type git for this.** Two skills do the whole lifecycle:

- `workstream:start-stream <name>` — makes the folder + branch off the latest `main`, seeds the stream's
  `STATUS.md`, and adds a row to `WORKSTREAMS.md`. The agent proposes this automatically (confirm-first)
  the moment you start a second task while one is unfinished.
- `workstream:finish-stream [name]` — once the feature is done and merged, it promotes the stream's locked
  decisions into `DECISIONS.md`, removes the folder, deletes the branch, and clears the `WORKSTREAMS.md` row.

**`WORKSTREAMS.md` is the dashboard.** It lists every active stream and who owns it. Read it first every
session — it's how any agent (including Codex) sees what's in flight and never grabs a stream someone else
is driving.

Golden rules (mostly enforced by git, so they're hard to break):
- **One branch per worktree** — git won't let the same branch be open in two folders.
- **Never delete a stream folder by hand in Finder** — always `finish-stream` (or `git worktree remove`), so
  git's bookkeeping stays clean.
- **Every stream starts from a fresh `main`** (the skill does this), so features don't inherit each other's
  half-done work.

**When to bother:** only when you're genuinely running 2+ tasks at the same moment. One thing at a time —
even across different days — is simpler as a plain branch on `main`.

---

## How the agents fit in

- **Shared rules:** `CLAUDE.md` (and its `AGENTS.md` symlink) are committed, so every agent —
  yours, your partner's, Claude, Codex — starts from the same instructions. Update them in the repo,
  everyone gets the update on their next `pull`.
- **Shared plan:** `ROADMAP.md` + `BACKLOG.md` mean two agents won't grab the same task. Assign work
  by pointing each agent at a specific roadmap item or issue.
- **Shared decisions:** `DECISIONS.md` stops Agent B from "fixing" something Agent A deliberately
  chose. If it's locked with a reason, no agent re-litigates it.

## A day in the life (concrete)

1. **Morning:** `git checkout main && git pull`. Read `ROADMAP.md` to see the current phase.
2. **Pick a task**, make a branch for it: `git checkout -b feature/x`.
3. **Tell your agent** what to build; it works on that branch, committing small steps, updating the
   docs as it goes.
4. **When it's done and tested**, push and open a PR: `git push -u origin feature/x && gh pr create --fill`.
5. **Review** (you, your partner, or an AI review pass). Fix anything flagged on the same branch.
6. **Merge** the PR into `main`. Delete the branch. Everyone else pulls and gets your work.
7. Repeat. Because each task was small, conflicts are rare and `main` is always working.

---

## If you only remember one paragraph

`main` stays sacred and always-working. Every task is a short-lived branch. Changes reach `main`
only through a reviewed pull request. Merge small and often. And whatever context matters —
decisions, plans, rules — goes into a committed file, because that's the only memory your teammate
and their agent will actually share.
