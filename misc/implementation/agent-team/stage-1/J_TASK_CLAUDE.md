# Run J: the user's answers D-0006 to D-0008 (task file)

Same rules as runs D to I: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never edit
any `CLAUDE.md`, any Claude or VS Code settings file, the files under `agents\`, or anything outside that repo (put
the text those need in your report); never start, stop or message agents or sessions other than processes you
started yourself; never open a `vscode://` link, never send keystrokes, and never register a real scheduled task
except one you remove in the same step and say so; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`.

Read first, and no more: `I_REPORT_CLAUDE.md` (this folder), the entries D-0006 to D-0008 in
`decisions\RESOLVED_DECISIONS_CLAUDE.md`, the config, then the files you change. Progress file
`J_PROGRESS_CLAUDE.md`, report `J_REPORT_CLAUDE.md` (this folder). Plan for about 70 tool calls.

The user, 2026-10-25, on the recommendations below: "I ACCEPT ALL but D-0004".

## Points

1. **D-0006: one minute after a limit reset, ten after a server error.** Set `watchSession.retryMinutes` back to
   10 (it covers a server error and a limit message with no readable reset time). `resetMarginMinutes`,
   `relaunchMarginMinutes` and `relaunch.afterCapMinutes` stay 1. Update the `_why` texts, run I's test that pins
   the shipped values, and every doc line that names the server-error wait. Put the text xpp-agent's `CLAUDE.md`
   needs ("Session Watch", `SESSION RESUMED`) in your report.
2. **D-0007: the orchestration scripts refuse a misspelled parameter.** Add `[CmdletBinding()]` (or whatever makes
   PowerShell refuse an unknown parameter; read the docs first) to every `.ps1` under `orchestrate-agents\scripts`.
   Check every caller still passes only known parameters: the scripts themselves, the scheduled task's arguments,
   the tests, and every command printed in a text or written in a doc. Test that a misspelled parameter fails
   before anything happens, for `schedule-relaunch.ps1` at least.
3. **D-0008: the prompt reminder always shows the agent team's register too.** Today `hooks\decision-reminder.mjs`
   reads only the register of the chat's own repo. Add a config list of registers to show in every chat (default:
   this repo's), so a chat in xpp-agent sees open agent-team items. One line per register, each saying which repo;
   no line twice when the chat runs in this repo; nothing when none has open items. Tests.

## Checks

- Tests first; both suites green at the end; the parser; `node --check`.
- Time the reminder hook 20 times before and after.
- A mutation check of the changed lines; the doc check.
