# Task: the Decisions pane only in a switched-on chat (D-34)

Written by the main session, 2026-10-27 08:41. For the task lead.

## What it is for

Since 2026-10-26 the agent team runs only in a chat the user switched on with `/software-developer-agent`
(`team-switch\SKILL.md`). That command runs `orchestrate-agents\scripts\team-on.mjs`, which writes the session's marker
`%TEMP%\<agentTeam.onFolder>\<session id>` (`lib\agent-team.mjs`; the folder name is `claude-agent-team-on` in
`orchestration.config.json`). Both hooks do nothing in a session without it. The Decisions pane
(`C:\Repos\My projects\claude-code-extensions\decisions-pane`) does not check it yet, so an ordinary chat in a repo
with waiting decisions still shows the Decisions tab.

## The user's words

- D-32, 2026-10-26 23:12: "If i dont run the team agent, an oridnary chat is an ordinary chat with no processes etc"
- D-34, 2026-10-27 08:39: "Chose A: the pane shows only in a chat switched on with /software-developer-agent (one
  small run in claude-code-extensions: the pane checks the same marker the hooks check)."

## What to build

1. In a chat whose session has no marker, the pane shows nothing: no tab, no opening by itself, no rows. It should
   also not read the register there beyond what the switch check needs.
2. It checks the same marker the hooks check: the same folder setting, read from the team's
   `orchestration.config.json` the pane already reads, and the same rule for a session id (a missing or unsafe id
   counts as off, as `lib\agent-team.mjs` does). Find out how a plugin learns its session id (the `claude-code-mods`
   skill and the mod API's types); if it cannot, say so before building anything else.
3. A chat switched on after the pane loaded (the user types `/software-developer-agent` in an open chat) shows the
   pane from its next look, without a reload.
4. `/decisions-pane` in a chat that is not switched on says, in one line, that the team is not on in this chat and how
   to switch it on, instead of an empty pane.
5. Tests for each point, the pane's README, and the agent repo's two guide pages where they describe the pane
   (`orchestrate-agents\references\agent-team-guide.html`, `agent-team-files.html` at the repo root: its open item
   "The Decisions pane does not check the switch").

## Checks

The baseline, verified by the main session on 2026-10-26 23:25: `node --test` in `orchestrate-agents\`, 229 of 229;
the PowerShell suite 105 passed, 0 failed; the pane's `claude plugin test decisions-pane` 53 of 53 and
`claude plugin validate decisions-pane` passing (2026-10-26 21:45). The pane needs the main session's reload to go
live; say so in the summary.

## Out of scope

Nothing in the hooks, the scripts or the register changes. No other mod in claude-code-extensions changes.
