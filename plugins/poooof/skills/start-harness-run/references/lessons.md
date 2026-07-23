# Field lessons — four unattended runs, all merged and shipped

Where this procedure comes from. Every rule in `SKILL.md` exists because one of these happened.

**The runs:** run 1 supervised (a persistence feature); run 2 first unattended, test-only (repairing a
stale test pack); run 3 first unattended product-code (a mobile layout bug); run 4 the first **epic** —
a five-milestone feature (an assistant that proposes actions for human confirmation) built solo in
**6 iterations / ~46 minutes**. All four merged; all four shipped to production.

## The two rules that produce everything else

**The human launches.** The permission layer refuses to let an agent start a permission-bypassing child
process. That is correct: an unattended, self-approving process is a decision a person should make.
So a setup skill ends by *printing a command*, never by running it.

**The human merges.** The run stops at DONE. Nothing it produces reaches `main`, staging, or production
without a person looking. Every one of the four runs needed a human catch before merge (see below).

## Scoping

1. **Verify the task against reality first.** Run 1's backlog item was ~80% already shipped — the real
   gap was one missed control and zero tests. A blind agent rebuilds what exists.
2. **One task per run.** Both unattended non-epic runs finished in a single iteration because the scope
   was tight. Loop overhead is not the bottleneck; vague scope is.
3. **Epics need plan-first.** Iteration 1 writes a frozen SPEC of ordered milestones, each with its own
   gate, ordered so every prefix is shippable. A stall at milestone 4 then still leaves three
   merge-ready milestones instead of one large mess.

## Setup

4. **A fresh worktree is an empty shell.** No `node_modules`. Run 2 would have died on its first
   command. Install during setup.
5. **Provision every secret before the run.** The classifier blocks the agent from every secret-adjacent
   lookup — by design. One run stalled on a missing test-user id it could not fetch. Run every gate once,
   attended; whatever fails on env/auth, the human fixes now.
6. **Record the baseline.** The full suite turned up failures inherited from `main`. Without the
   baseline the run can't tell its breakage from the project's.
7. **Reuse shared services; only stop what you started.** The first driver would have torn down a
   database another session was using.

## Parallel runs

7b. **Ports are per-run, not per-project.** The first project to try this had six launch-config entries
    all on port 3000 and a test runner hard-defaulting to one port — so three overnight runs could
    neither be *viewed* side by side in the morning nor safely *run* at the same time (two suites on
    one port test each other's app). Assign each run a preview port and a test port, and pass the test
    port into the gates through the project's env var.

7c. **The shared staging domain shows one thing: what's merged.** It can never preview three unmerged
    runs. Morning review is three local URLs, not three deploys.

7d. **A live-port check is not a port ledger.** `lsof` only sees what is LISTENING right now, so a port
    claimed by a stopped stream reads as free — and setting up six runs at midnight, with nothing
    running, is precisely when that hands one port out twice. Verified on the real project: three
    registered ports all looked free. The ledger is the union of *listening now* + *the launch config*
    + *every other stream's `PORTS.md`*, which is why `assign-ports.sh` exists instead of an
    instruction to eyeball it. Each run writes its pair down immediately, or the next run can't see it.

## Behaviour

8. **`set -o pipefail` on every gate.** `npm run lint | tail` reported green while the test runner
   wasn't installed.
9. **On a permission denial: record BLOCKED and stop.** Retrying variants hardens the blocker and burns
   iterations.
10. **Never let the run edit the guard that judges it.** "Make the app pass the test, never bend the
    test." Run 3 had a layout guard and a real bug; the rule is what kept it honest.
11. **The loop investigates, it doesn't just patch.** Run 2 was sent for one known bug and found two,
    including a latent one nobody knew about — it proved a record existed in the database before
    changing the test. That behaviour comes from "make it green for the *right* reason".
12. **An out-of-lane edit declared up front is fine.** Run 4 needed one line in a test config, flagged
    it in its plan before touching it, and verified the change was additive. Forcing a BLOCKED there
    would have been pedantry.

## Review

13. **Supervise, then verify independently.** Watch the log for iterations, the report, **and a driver
    that died without producing one** — silence must never read as success. Then re-run the gates
    yourself; don't trust the run's own summary.
14. **The supervisor still finds things the run didn't.** After run 4 reported all-green, review caught
    a discarded return value that would have made a failed audit silent.
15. **Design calls must be surfaced, not buried.** Run 3's fix traded a documented "one line per row"
    intent for readability — correct by the numbers, but a human's call. Run 4 listed five such
    decisions explicitly. Require that section.
16. **Only a human using the product finds some bugs.** After run 4 passed every gate, the operator
    used it and immediately hit two things no test covered: the agent asked "who is X?" instead of
    looking X up, and a model that *described* an action without emitting it — leaving a confirmation
    prompt with no button. Gates prove correctness, not good product.

## Cost

17. **If the work costs money per action, make the cost visible where the action happens** — and pick
    cheap components by measurement, not by price list. A model 48× cheaper failed silently ~75% of the
    time in a way no benchmark showed; the one that won was ~19× cheaper *and* reliable. Repeat the
    measurement more than once: one candidate passed twice, then failed four times in a row.
