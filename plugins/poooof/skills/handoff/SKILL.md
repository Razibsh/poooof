---
name: handoff
description: Flush every durable fact from this chat into the project's tracking files and confirm it's safe to clear — the "save before I /clear" command. Runs the framework's end-of-session ritual in one shot: refresh STATUS.md (done / verified / next), make sure decisions, ideas, and roadmap check-offs are all written to their typed homes, commit the paperwork, confirm any memory plugin captured the session, then print exactly what was saved and where plus a "safe to clear" green light. Use when nearing the context limit and wanting to continue in a fresh chat, or when the operator says "save", "handoff", "did we save everything", or "can I clear". User-invoked only.
disable-model-invocation: true
argument-hint: (none)
allowed-tools: Read, Write, Edit, Bash(git:*), Bash(command -v:*), Bash(ls:*)
---

# Handoff — save everything durable, then confirm it's safe to clear

The operator is about to clear the chat (usually near the context limit) and continue in a fresh session. Their
recurring fear is that something from this conversation won't survive. This command removes that fear by doing
the framework's end-of-session ritual **the same way every time** and ending with an explicit green light — so
they never again have to ask "did we save everything?"

**The key fact to reassure them with: clearing the chat does NOT touch files on disk.** `STATUS.md`,
`DECISIONS.md`, `BACKLOG.md`, `ROADMAP.md` are real files — `/clear` only wipes the chat's working memory, never
the filesystem. So the whole job here is to move every durable fact **out of this chat and into those files**
before the chat memory is gone. Once it's in a file, it's safe.

## What to do

Work top to bottom. Keep it honest — never report something as saved that you didn't actually write.

### 1. Locate the target docs
Read `WORKSTREAMS.md` if it exists. If this session is inside a **stream worktree**, that stream's `STATUS.md`
is the target and its decision log is where decisions go. Otherwise the repo-root `STATUS.md` is the target.
If the project has **no poooof docs at all** (no `STATUS.md`), say so plainly and fall back: write a short
`HANDOFF.md` at the repo root with the same content, and lean on the memory plugin (if any). Don't pretend the
framework is there when it isn't.

### 2. Reconcile before you write
Compare what this chat actually did against the current `STATUS.md`, `git log`, and the real working tree. If
the chat and the docs disagree, the docs win only after you check reality — memory and chat can be stale or
wrong. Note anything you had to reconcile.

### 3. Route every durable fact to its typed home
Scan this whole conversation and make sure each of these is written down. Only touch a file if there's something
new for it:

- **Current state → `STATUS.md`** (overwrite — it holds the latest state, not a history): what was done this
  session, what was actually **verified** (vs merely attempted), what's **next**, any **uncommitted work in
  progress**, and a one-line "docs updated" confirmation.
- **Decisions → `DECISIONS.md`** (or the stream's decision log): any meaningful choice made this session — an
  approach picked, a tradeoff settled, a constraint discovered — that isn't already logged. One dated line each.
- **Ideas → `BACKLOG.md`**: any idea, wish, or "later" the operator mentioned that isn't captured yet. One line
  + date each.
- **Progress → `ROADMAP.md`**: check off any item whose verify criterion was genuinely observed this session.
- **Repeatable procedure → `RUNBOOK.md`**: only if the project has one and this session established a new repeatable op.

### 4. Commit the paperwork
Stage and commit **the framework docs you changed** with a clear message (e.g. `docs: session handoff — <2–4 word gist>`).
Committing is what lets the docs travel to teammates and survive lost git history — but the docs already survive
`/clear` the moment they're written to disk, so this step is about durability, not about the clear.

Do **not** sweep uncommitted *code* into this commit. If there's work-in-progress code, leave it as-is, record
it under "uncommitted work in progress" in `STATUS.md`, and mention it in the report below — don't commit the
operator's code for them as a side effect of a save.

### 5. Confirm memory capture
If a memory plugin is active (e.g. **claude-mem** — check for its context at session start, or `command -v` its
CLI), note that it captures observations automatically and the session is covered. If none is installed, say so:
the files are the record.

### 6. Report and give the green light
Print exactly this shape, filled in with what you really did:

```
🧳 Handoff — <project>[ · <stream>]

Saved to disk (survives /clear):
  • STATUS.md   — <one-line summary of the state you wrote>
  • DECISIONS.md — <N new decision(s) logged | no new decisions>
  • BACKLOG.md   — <N idea(s) captured | none>
  • ROADMAP.md   — <item(s) checked off | none checked off>
Committed:      <short sha + message | not committed (why)>
Memory:         <claude-mem observations captured | no memory plugin — files are your record>
Uncommitted WIP: <one-line summary | none>

Next session: open a fresh chat and say "resume" — STATUS.md picks you up from exactly here.

✅ Safe to clear. (I can't press /clear for you — that part's yours.)
```

## The one honest limit
A slash command can't run `/clear` for you — clearing is a client action. That's a feature, not a bug: the save
and the clear stay separate, so you never clear before the ✅ appears.
