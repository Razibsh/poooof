# Status — session handoff

**Last updated:** 2026-07-05 — added `poooof:handoff` command; wired the official Linear MCP into Claude Code (user scope); captured the deferred "optional Linear mode" framework idea.

## Done this session
- New skill **`poooof:handoff`** (`plugins/poooof/skills/handoff/SKILL.md`): user-invoked "save before you clear" command. Runs the end-of-session ritual in one shot — refresh `STATUS.md`, route new decisions/ideas/roadmap check-offs to their typed homes, commit the paperwork, confirm the memory plugin captured the session, then print what was saved + where and an explicit "✅ safe to clear." Committed on `main` (0d2a0b7).
- Docs updated for the new command: both `plugin.json` manifests, `marketplace.json`, README (install list + skills tree + a dedicated "Save before you clear" section).
- Wired the **official Linear MCP** at user scope (`claude mcp add --transport sse linear https://mcp.linear.app/sse -s user`) — OAuth, no API key stored. Shows "Failed to connect" until the browser auth is completed via `/mcp`.
- Captured **"optional Linear mode"** as a deferred framework idea in `BACKLOG.md` (design after Razi's personal Linear trial).

## Verified
- JSON manifests (both plugin.json, marketplace.json) parse clean.
- `handoff/SKILL.md` frontmatter well-formed (name/description/disable-model-invocation/allowed-tools).
- Feature committed to `main` (0d2a0b7); working tree clean apart from this handoff paperwork.
- NOT yet verified: the handoff command executing as an installed slash command (it ships from the working repo → needs a release + `/poooof:update` before it's live in other projects).

## Next
- Finish Linear browser auth: `/mcp` → linear → log in. Then start the personal trial (one Linear project per real project; split model — Linear = backlog/ideas, ROADMAP/STATUS stay in-repo).
- Decide whether to cut a poooof release (patch/minor) so `poooof:handoff` propagates to installed projects — push is not done yet, awaiting Razi's go-ahead.
- After ~2–4 weeks of Linear use, design the "optional Linear mode" framework feature from real usage notes.

## Open / blocked
- Linear MCP connection pending browser OAuth (expected).

## Docs in sync?
- yes — feature + docs committed together (0d2a0b7); BACKLOG.md updated; this STATUS.md is the session handoff.
