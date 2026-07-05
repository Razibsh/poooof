# <PROJECT NAME>
<!-- poooof X.Y.Z -->

<!-- This is the single most important file. Every agent reads it first.
     Fill in every `> FILL IN` block below, then delete the HTML comments —
     except the poooof version-stamp comment on line 2, which stays. -->

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

1. **Start of every session:** read `WORKSTREAMS.md` first (what parallel streams are in flight + who owns
   them). If you're in a stream worktree, read that stream's `STATUS.md` next (where it stands). Then read
   `ROADMAP.md` and work ONLY on the current phase of the stream you own.
   If persistent-memory context (e.g. **claude-mem**) appears at session start, check it against
   `STATUS.md` and `WORKSTREAMS.md` before other work: if memory shows work, decisions, or an
   unfinished task the docs don't reflect — likely a crashed or abruptly-ended session — say so and
   reconcile the docs first (per rule 8: against `git log` and reality — memory can be stale or
   wrong), visibly, not silently. (No memory plugin installed → nothing to check; skip.)
2. **Idea capture is automatic and unprompted:** whenever the operator mentions an idea, wish,
   or future feature in conversation — even casually, even mid-task — capture it to `BACKLOG.md`
   immediately and say it's captured. They should never have to say "note this". Keep the backlog
   self-organizing: insert at the **top of `## 📥 Inbox`** as `- YYYY-MM-DD [area] idea — context`
   (newest first, always dated + area-tagged). When an item becomes a phase or ships, **move** its
   line to `## 🔨 Promoted` / `## ✅ Done` with a dated arrow — never delete it. Run `/poooof:tidy`
   if the file ever drifts. Do NOT build backlog items out of order.
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
9. **Log decisions as they happen.** Whenever a meaningful choice is made (an approach picked, a tradeoff
   settled, a constraint discovered), append one dated line to the `## Decision log` in the current stream's
   `STATUS.md` — automatically, without being asked. On merge, promote the locked/cross-cutting ones into
   `DECISIONS.md`. Nothing important should live only in the chat.
10. **Chat and automatic memory are recovery nets, not the system of record.** Before a session
    ends, every durable fact must live in its typed home: a decision → `DECISIONS.md` (or the
    stream's decision log), current state → `STATUS.md`, an idea → `BACKLOG.md`, a repeatable
    procedure → `RUNBOOK.md` (if the project has one; otherwise a note in `docs/`). If it matters
    and it only exists in the conversation, it isn't saved.

## Working with other agents / a teammate

If more than one person or AI agent will touch this repo, read `TEAM-WORKFLOW.md`. The short rules:
never commit straight to `main`; one branch per task; one agent per branch at a time; small frequent
merges; every change goes through a pull request before it reaches `main`.

**Parallel-work rule (apply automatically):** Casual chat, questions, and exploration **never** need a
worktree — don't create one just because a topic came up. The trigger is **real feature work**: you're
brainstorming / spec'ing / planning a feature the operator intends to build, or you're about to write code or
a design doc for it. The moment that starts, **check for collision signals before producing anything**:
- Is `main/` already on a *feature* branch, or does it hold uncommitted changes? (run `git status` / `git branch --show-current`)
- Are other streams active? (`git worktree list` / `WORKSTREAMS.md`)
- Is the operator starting this while another task is still unfinished?

If **any** signal says work is already in flight, do **not** pile onto that branch — propose a stream
(confirm-first): *"this is real feature work and something else is already in progress — I'll run
`poooof:start-stream <name>`, ok?"* and wait for a yes. If `main/` is clean and nothing else is in flight, you
may proceed in place and create the stream at the build hand-off (when code starts). **Never do feature work
in a `main/` that's already on another feature's branch or holds another feature's uncommitted changes** —
that is the exact two-sessions-one-folder collision the streams exist to prevent. When a stream is done and
merged, run `poooof:finish-stream` to clean up. The bare-repo layout, the two skills, and the `WORKSTREAMS.md`
dashboard are described in `TEAM-WORKFLOW.md` → "Working in parallel".

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
- `WORKSTREAMS.md` — dashboard of active parallel streams. Read first when running more than one at once.
- `DECISIONS.md` — locked decisions with reasons.
- `BACKLOG.md` — everything deferred. Nothing gets forgotten.
- `STATUS.md` — latest session handoff: what's done, verified, and next. Overwritten each session.
- `TEAM-WORKFLOW.md` — how a small team + multiple agents collaborate here.
- `RUNBOOK.md` — repeatable operational procedures (ops projects; absent otherwise).
- `Ref/` — read-only source of product truth (research, spec, mockups), if the project has one.
- `docs/` — per-feature specs (spec → plan → verify) for non-trivial features.
> FILL IN: add any project-specific reference folders (e.g. a read-only "gold" reference from a v1).
