# Run I: wake-up times of one minute, and a new chat after a context-cap hand-over (task file)

Same rules as runs D to H: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never edit
any `CLAUDE.md`, any Claude or VS Code settings file, the files under `agents\`, or anything outside that repo (put
the text those need in your report); never start, stop or message agents or sessions other than processes you
started yourself; never open a `vscode://` link, never send keystrokes, and never register a real scheduled task
except one you remove in the same step and say so; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`.

Read first, and no more: `H_REPORT_CLAUDE.md` (this folder; run H changed the hook, the watch and the docs just
before you), the config, `scripts\schedule-relaunch.ps1`, `scripts\start-session-in-vscode.ps1`, the parts of
`scripts\watch-session.ps1` that print `SESSION NEAR CAP`, `SESSION RESUMED` and `SESSION RESET COLD`, then the
files you change. Progress file `I_PROGRESS_CLAUDE.md`, report `I_REPORT_CLAUDE.md` (this folder). Plan for about
70 tool calls.

## The user's request (2026-10-25), in their words

"make the times of when the auto wake/resume is started into a config, and set the default to 1 min, also in case 1
letsd also add the auto resume in a new chat, like in the case where weekly or 5h limit is reached". Case 1 is the
main session nearing its 500k context cap.

## Points

1. **Every automatic wake-up or relaunch waits a configured time, one minute by default.** Today:
   `watchSession.resetMarginMinutes` 5 (wake after a limit reset), `usageLimits.relaunchMarginMinutes` 5 (new chat
   after a reset) and `watchSession.retryMinutes` 10 (wake after a server error, or a limit message with no
   readable reset time). Set all three to 1 and update their `_why` texts. If any other wait starts a wake-up or a
   relaunch, list it in your report with its value; do not change it.
   Not a wake-up time, leave it: `usageLimits.resumeMarginMinutes` (the cache-expiry margin).
2. **A new chat after a context-cap hand-over.** After `SESSION NEAR CAP`, once the main session has written the
   hand-over, it schedules the next chat with `schedule-relaunch.ps1`, exactly as after a limit hand-over, to start
   a configured number of minutes after the hand-over (default 1; a new setting with a `_why`). Make the watch's
   `SESSION NEAR CAP` text and the hook's main-session cap text (run H) say this step, with the command. If
   `schedule-relaunch.ps1` cannot take "now plus N minutes" today, add that. The relaunch keeps every safety it has
   (right window in front, otherwise a notification).
3. **Docs:** `SKILL.md`, `references\usage-limits.md` and any other file in the repo that says the wait is 5 or 10
   minutes, or that a context-cap hand-over needs the user to start the next chat. Put the text the xpp-agent
   `CLAUDE.md` needs ("Session Size and Hand-over", "Session Watch") in your report.

## Checks

- Tests first; both suites green at the end; the parser; `node --check`.
- A test that each of the three waits comes from the config, and that a cap hand-over's relaunch time is now plus
  the new setting.
- A mutation check of the changed lines; the doc check.
- Not in scope: a real relaunch.
