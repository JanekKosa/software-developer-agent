# Run K: the main session always knows when the helper fails, and waits for its leads without a deadline (task file)

Same rules as runs D to J: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never edit
any `CLAUDE.md`, any Claude or VS Code settings file, the files under `agents\`, or anything outside that repo (put
the text those need in your report); never start, stop or message agents or sessions other than processes you
started yourself; never open a `vscode://` link, never send keystrokes, and never register a real scheduled task
except one you remove in the same step and say so; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`.

Read first, and no more: `J_REPORT_CLAUDE.md` (this folder; run J changed the scripts just before you), the
"DECISIONS TAKEN" line of `G_REPORT_CLAUDE.md`, the config, `references\usage-limits.md`, then the files you change.
Progress file `K_PROGRESS_CLAUDE.md`, report `K_REPORT_CLAUDE.md` (this folder). Plan for about 90 tool calls.

## The user's answers on run G's choices (2026-10-25, register D-0004)

- On "each part fails safe" (a pipe failure writes one stderr line and the size message still comes): "Well if the
  helper fials thats no good, main agent needs to be informed thatt it failed instead of having a fallback. Maybe
  use the fallback after the main agent knows that helper failed."
- On "the main session waits for its leads until now + 15 minutes, then TaskStop": "15mins? no lets not have a
  limit here."
- On "the old stop message kept as a fallback when the server did not start": "Same as point 4".
- Choices 1, 2, 3 and 8 stand (`WORKER STOPPED`, the `## Hand-off` section, the helper-agent text, the server
  starting itself from Node).

## Points

1. **The main session learns of every failure of the helper, within about a minute, busy or idle.** A failure is:
   it did not start; it stopped answering or exited while a hand-over is under way; or an agent's hook got an error
   from it other than "no server". Busy: the main session's hook says so at its next tool call. Idle: something must
   wake it (the session watch is the only thing that can wake an idle session; it may need to keep running, or be
   restarted, during a context-cap hand-over too). The text names what failed, with the time, and only then gives
   the fallback: send `STOP FOR LIMIT` by message to every lead that has not ended with `LEAD STOPPED`, and tell the
   user in the final message that the helper failed. No fallback runs before the main session has been told.
   An agent whose hook hits such an error is told too, in one line, to carry on with what the last stop text said,
   if any. Design how the agents' errors reach the main session without a signal file on disk (the user chose the
   pipe so nothing is left on disk); the helper's existing log may say what happened.
2. **No deadline for the leads.** Remove `limitStop.leadStopFallbackMinutes`, the deadline the watch prints, and the
   `TaskStop` of silent leads from every text and doc. The main session waits for every lead's `LEAD STOPPED`. Say
   in `references\usage-limits.md` what then happens when the usage limit runs out first (the watch's
   `SESSION RESET COLD` after the reset, hand-over from the files) and what the user sees.
3. **No repeat for workers and leads either.** The user, 2026-10-25: "also just like the lead the worker has no time
   limit to create the handover, i think telling the lead/worker that the limit is near gives it enough incetive to
   create the handover". Each agent is told once. Remove `STOP FOR LIMIT | AGAIN`, `limitStop.repeatAfterCalls` and
   every text and doc line about being told again. The size cap's own `CONTEXT GUARD | STOP NOW` is a different
   thing and stays.
4. **The helper lives as long as the hand-over** (the main session's addition, following the same answer). Today it
   ends at a fixed time (30 minutes after the reset, or 60 after its start at the context cap), which could cut off
   a long hand-over: a lead that is told only when its worker returns after that time would hear nothing. Instead
   it ends when the session's Claude Code process is gone, or when the main session ends it after writing the
   hand-over (a new `stop` command, run in the step that schedules the relaunch). Remove `endMarginMinutes` and
   `capEndMinutes` if nothing else needs them; say in your report if a fixed end is still needed anywhere.
5. **Docs:** `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`. Put the text that
   `agents\task-lead.md`, `agents\software-developer.md` and xpp-agent's `CLAUDE.md` need in your report.

## Checks

- Tests first: the helper not started, killed during a hand-over, answering garbage, and an agent's hook error, each
  reaching the main session's hook text and the watch's line; no deadline and no repeat in any text; the helper
  still answering after its old end time, and gone after `stop` or when the process is gone.
- Both suites green at the end; the parser; `node --check`; hook time with no server, 20 runs, before and after.
- A live check without agents: start the helper for a made-up session, kill it, and show the main session's text
  and the watch's line.
- A mutation check of the changed lines; the doc check, including any sentence of
  `orchestrate-agents\references\limits-and-caps-guide.html` your change makes untrue (list them; do not edit it).
