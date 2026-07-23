# Gates — how the run proves itself

A **gate** is a command with an exit code. Not a vibe, not the agent's summary. The whole harness rests
on this: the run may only call a criterion met when a command it ran returned 0.

## Discovering a project's gates

Propose, then confirm with the operator, then store in `.harness/gates.json` so later runs skip the
question:

```json
{ "lint": "npm run lint", "unit": "npm test", "build": "npm run build", "e2e": "npm run e2e" }
```

Where to look, in order:
1. `.harness/gates.json` — already answered.
2. The project's `CLAUDE.md` / `AGENTS.md` "Testing" section — usually states them explicitly.
3. `package.json` scripts (`lint`/`test`/`build`/`e2e`), `Makefile` targets, `pyproject.toml`
   (`pytest`, `ruff`), `Cargo.toml` (`cargo test`, `cargo clippy`), `go.mod` (`go test ./...`).
4. Ask.

**A project with no gate cannot host an unattended run.** Say so plainly rather than running blind —
the loop's only feedback is the exit code. Offer to write one test first, as its own small run.

## Exit-code hygiene — the mistake that looks green

```bash
npm run lint | tail -5        # ← reports TAIL's exit code. Always 0. Always "passing".
set -o pipefail; npm run lint | tail -5   # ← correct
```

This once reported a green lint while the test runner wasn't even installed. Put `set -o pipefail` in
the gate commands and in the HARNESS.md instructions.

## Unit vs browser tests — where TDD is even possible

Some projects deliberately keep unit tests DOM-free (no jsdom), which means **UI behaviour can only be
proven in an e2e/browser test**. That matters for two reasons:

- "Write a failing test first" may mean an e2e test, which is slower and needs the app to boot.
- Those are exactly the gates that need **auth/secrets** — and the agent cannot self-serve those.
  Provision them attended, before the run (see the skill's preflight step).

## The baseline is part of the gate

Record every gate's result on the **base commit** into `.harness/BASELINE.md`, including which tests are
**already red**. A run that doesn't know the baseline will either try to fix inherited breakage
(out of scope, burns iterations) or conclude it broke something it didn't.

```markdown
| Gate | Baseline state |
|---|---|
| `npm run lint` | ✅ 0 errors (4 pre-existing warnings) |
| `npm test` | ✅ 1129 passed / 21 skipped |
| `npm run build` | ✅ |
| `npm run e2e` | ❌ 2 RED (smoke: lead-intake, global-search) — inherited, NOT this run's, do not touch |
```

Also record **known flakes** and what to do about them ("one retry is legitimate; twice red is real"),
so the run doesn't chase a network blip — and doesn't excuse a real failure as flake.

## Side effects

If a gate writes data (test records in a shared base, files, queue jobs), note it in the baseline so
the operator isn't surprised, and so nobody "cleans up" something the suite needs.
