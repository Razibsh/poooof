# <PROJECT NAME>

<!-- This is the single most important file. Every agent reads it first.
     Fill in every `> FILL IN` block below, then delete the HTML comments. -->

## What this is

> FILL IN: One short paragraph. What does this project do, for whom, and who operates it?
> Name the operator and their level (e.g. "Operator: Razi — not a professional developer;
> explain technical choices in plain language and keep the system simple to operate.").
> If it's a rebuild or has a predecessor, say where the old version lives and whether it's
> off-limits.

## Architecture / stack

> FILL IN: The deliberate technical choices, in plain language. Language + runtime, framework
> (or "no framework, plain code"), database, key external services (APIs, hosting, auth),
> how it deploys. Keep it to the shape of the system — the things a new agent needs to not
> guess wrong. Detailed rationale for each choice goes in DECISIONS.md, not here.

## Development workflow (follow this strictly)

1. **Start of every session:** read `ROADMAP.md` first. Work ONLY on the current phase.
2. **Idea capture is automatic and unprompted:** whenever the operator mentions an idea, wish,
   or future feature in conversation — even casually, even mid-task — append it to `BACKLOG.md`
   immediately (one line + date) and say it's captured. They should never have to say "note this".
   Do NOT build backlog items out of order.
3. **Locked choices** live in `DECISIONS.md`. Don't re-litigate them; if one must change, discuss
   it explicitly and update the file with the new "why".
4. **After completing work:** check off ROADMAP items and commit with clear, small, atomic messages.
   Update ROADMAP/BACKLOG/DECISIONS in the *same commit* as the work they describe.
5. **Verification over claims:** nothing is "done" until tested — a unit test, a real run through
   the system, or both. Every roadmap item has a "verify" criterion. Never claim something works
   without having observed it work.
6. **Keep it simple.** Minimum code that solves the problem. No speculative abstractions, no
   flexibility nobody asked for. The operator must be able to understand the system's shape.
7. **Documentation updates are automatic, not on request.** The operator never has to ask. An item
   isn't "done" until its paperwork (ROADMAP/BACKLOG/DECISIONS) is done — in the same commit.
8. **End every work session by writing the status block into `STATUS.md`** (overwrite it — it holds
   the *latest* state, not a history): what was done, what was verified, what's next, and confirmation
   that docs are updated. `STATUS.md` is committed, so it travels to teammates and survives lost chat
   history. If a session ends abruptly, the first action next session is to reconcile `STATUS.md` and
   the docs with `git log` and reality.

## Working with other agents / a teammate

If more than one person or AI agent will touch this repo, read `TEAM-WORKFLOW.md`. The short rules:
never commit straight to `main`; one branch per task; one agent per branch at a time; small frequent
merges; every change goes through a pull request before it reaches `main`.

**Parallel-work rule (apply automatically):** before starting a new task, check whether work is
already in progress here (uncommitted changes, or the operator is opening a *second* task while a
first is unfinished). If so, don't pile onto the current branch — offer to set up a `git worktree`
so each task gets its own folder and they can't collide. One task at a time needs no worktree; just
branch normally. See `TEAM-WORKFLOW.md` → "Working in parallel".

## Reference material & feature specs (conventions)

- **`Ref/` is the read-only source of product truth.** If the project has research, a spec, an
  ERD, mockups, or a predecessor's docs, they live in `Ref/` and are **never edited** — they're the
  ground truth an agent checks against, not a working area. Cite them; don't change them. (Skip the
  folder entirely if the project has no such material.)
- **Non-trivial features get a short written spec before code.** For anything bigger than a quick
  task, write a one-page spec → plan → verify note in `docs/<feature>.md` first (what it does, the
  approach, how you'll know it works), then build against it. Small tasks don't need this; use
  judgment. The point is that a feature's intent is captured in a file, not only in the conversation.

## Product rules (project law — edit to fit, then treat as non-negotiable)

> FILL IN: The hard constraints that must never be violated, however small. On WhatsBot these were
> things like "Hebrew must sound native, never translated", "never invent prices", "never reveal the
> bot is AI". Yours will differ. Be specific — these are the rules an agent will be judged against.
> Always include this one:

- **Secrets discipline:** `.env` is gitignored; never log, print, or commit keys or tokens.

## Testing

> FILL IN: How tests run (the command), what the safe/dry-run mode is for not hitting production,
> and which parts are highest-risk and must be tested first.

## Key files in this repo

- `ROADMAP.md` — phases + current position. Read first, always.
- `DECISIONS.md` — locked decisions with reasons.
- `BACKLOG.md` — everything deferred. Nothing gets forgotten.
- `STATUS.md` — latest session handoff: what's done, verified, and next. Overwritten each session.
- `TEAM-WORKFLOW.md` — how a small team + multiple agents collaborate here.
- `Ref/` — read-only source of product truth (research, spec, mockups), if the project has one.
- `docs/` — per-feature specs (spec → plan → verify) for non-trivial features.
> FILL IN: add any project-specific reference folders (e.g. a read-only "gold" reference from a v1).
