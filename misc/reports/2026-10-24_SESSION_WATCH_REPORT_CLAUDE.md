# Session watch and the 500k session cap

## Session 1: a watch that hands a session over near 500k and wakes it after the usage limit

**When:** 2026-10-24, 10:21 to about 10:45, one session outside any stage (session `306fa217`). The first request
arrived at 08:47 and was itself stopped by the usage limit until 10:10.
**Plan followed:** none written; the user's two requests in chat. **Plan for the next session:** none needed.

### Short version

Every main session in this repo now starts a small background script as its first step. The script does two jobs:

- It tells the session when its context passes 450 thousand tokens. The session then writes a hand-over for the
  next session and stops, before it reaches 500 thousand.
- When the usage limit stops the session, it waits until the limit resets and then wakes the session, so the work
  goes on without anyone typing "continue".

Example: the limit stops a session at 08:47 with *"resets 10:10am"*. The script sees that in the session's log,
waits, and ends at 10:15. Its ending wakes the session, which carries on where it stopped.

### What is different now

- **Sessions stay under 500 thousand tokens and hand over by themselves.** The rule, what a hand-over holds and
  where it goes are in `CLAUDE.md`, "Session Size and Hand-over". Inside a stage the hand-over is the next
  continuation plan, as before. Outside a stage it goes into a new folder, `misc/handovers/`.
- **Sessions continue by themselves after the usage limit or a server error.** `CLAUDE.md`, "Session Watch", says
  to start `Docs/Skills/orchestrate-agents/scripts/watch-session.ps1` first in every main session. It takes no
  arguments. It wakes the session 5 minutes after the reset time the limit message names, or 10 minutes after a
  server error. It never wakes for an expired sign-in, because waiting does not cure that.
- **The earlier "no token limit" for the main orchestrator is withdrawn.** The `orchestrate-agents` skill says so,
  and points to the new script in its "Watching sizes" and "When things go wrong" parts. The memories that said
  the opposite were rewritten.
- **The global instructions gained two facts**, found while building this: a script can read its own session id
  from `CLAUDE_CODE_SESSION_ID`, and a turn stopped by the limit leaves a record whose token count is 0, which
  the old "take the last usage record" advice would have read as the context size. The global pair was synced
  (hook log 10:40:34, both files identical).

### Decisions

- **Mine: the script lives in the `orchestrate-agents` skill**, beside `watch-agent.ps1`. The skill is linked into
  `~/.claude/skills`, so every project can reach it.
- **Mine: warn at 450 thousand**, leaving 50 thousand for finishing the edit and writing the hand-over. All the
  numbers are script parameters.
- **Mine: the 20-minute `CronCreate` timer stays only as a second net for runs left alone overnight.** As the
  everyday watch it would wake an idle session every 20 minutes even when nothing is wrong, and each wake re-reads
  the whole context. The script costs nothing until the session is stopped.
- **Mine: one watch per session.** Starting it a second time ends the second one at once with
  `WATCH ALREADY RUNNING`, so a session that lost track cannot be woken twice.
- **Mine: hand-overs outside a stage go into a new folder, `misc/handovers/`.** The misc folder rules now say
  four folders, not three.

### What was checked

- 32 scratch tests, all passing. They cover reading the reset time (including the night of 24 to 25 October when
  the clocks go back, an unknown time zone and a message with no time), the wake rules, reading the end of a
  log whose first line is cut, and a slice of the real overnight log (limit at 02:25 local, "resets 5am", wake
  computed as 05:05).
- End-to-end runs of the script on fake logs: near the cap, quiet, limit already reset, limit followed by a
  normal reply, server errors old and new, expired sign-in, stopped above the cap, missing log, a second watch,
  the leftover marker of a killed watch, and a closed chat (the watch ends silently).
- A timed run: a limit that "resets 10:38am" ended the watch at 10:38:00.
- A run on this real session read 231 thousand tokens.
- The watch is running for this session now: about 51 MB of memory and well under a second of processor time
  per minute.

### What was not checked

- **The wake after a real usage limit has not been seen live.** A background script ending is the same signal
  `watch-agent.ps1` already relies on to wake the main session, but it has not been tried right after a turn the
  limit refused.
- **It wakes once per stop.** If that wake still meets the limit, nothing wakes the session again. That is why the
  timer stays for unattended runs.
- The full hand-over path (near the cap, hand-over written, next session started from it) has not been run end
  to end.

### Questions for the user

None blocking. One offer: when a session hands over, it could also open a new Claude tab with the start line
already typed in. The VS Code Claude extension has a link for that (it fills the box; you press Enter). Not built.

### Concerns

- Each open chat now keeps one extra PowerShell process alive (about 51 MB private memory), on a machine with
  7.8 GB.

### What is left

Nothing for this request.

### Committed?

Only the script, at the user's request: `da3dc96` on `main`, not pushed. The rest is not committed. The working tree also holds other sessions' uncommitted work: the misc-folder restructure in `CLAUDE.md`,
two earlier additions to the `orchestrate-agents` skill, the `mcp/xpp-mcp` index files, and more. This session's
files are `CLAUDE.md` (the two new sections and the `misc/handovers/` lines), the skill's three small edits, the
new `watch-session.ps1`, this report, and outside the repo the global instructions and the memories.
