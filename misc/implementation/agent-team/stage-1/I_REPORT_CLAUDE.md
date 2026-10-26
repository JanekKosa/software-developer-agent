# Run I: wake-ups after one minute, and a new chat after a context-cap hand-over (report)

**Outcome: done.** Every automatic wake-up and relaunch now waits one minute, and each wait is a setting. After a
hand-over at the main session's context cap, the session now schedules the next chat itself, the same way as after
a usage-limit hand-over. Before, the user had to start that chat. Both suites pass on the final files (numbers
below). Nothing is committed.

## What changed for the user

- **One minute everywhere.** In `orchestration.config.json`, each with a new `_why`:
  - `watchSession.resetMarginMinutes` 5 -> 1: the wake after a limit reset.
  - `watchSession.retryMinutes` 10 -> 1: the wake after a server error, or a limit message with no readable reset.
  - `usageLimits.relaunchMarginMinutes` 5 -> 1: the new chat after a limit hand-over.
  - New `relaunch.afterCapMinutes` 1: the new chat after a context-cap hand-over.
  - `usageLimits.resumeMarginMinutes` stays 10, as the task said.
- **A new chat after the context cap.** Example: the main session passes 450k at 15:00. It waits for its leads,
  writes the hand-over at 15:12 and runs the command its texts now print:
  `& '...\orchestrate-agents\scripts\schedule-relaunch.ps1' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`.
  It answers `SCHEDULED | ClaudeRelaunch-xpp-agent-202610251513 at 2026-10-25 15:13 | ...`. At 15:13 a new chat opens in
  that project's VS Code window with `Read <hand-over> and carry on.` The session still ends with that line, so the
  user can send it by hand if the relaunch cannot.
- **The texts say the step.** The watch's `SESSION NEAR CAP` first line now reads "write the hand-over, schedule
  the next chat and end the session", and its third line ends with the command. The hook's `SESSION NEAR CAP` and
  the main session's `STOP FOR LIMIT` text at the cap carry the same command. One helper in `lib\limit-stop.mjs`
  builds it for both Node texts.
- **Every safety stays.** The relaunch is the same task and the same start script: right window in front, else a
  notification. Only the notification's first words change after a cap hand-over: "Claude: the session has handed
  over at its context cap, but the window of xpp-agent was not in front. ..." instead of "the limit has reset".
- **`schedule-relaunch.ps1` takes `-ContextCap`** in place of `-At`: the task runs `relaunch.afterCapMinutes` from
  now. `-At` with `-ContextCap` is refused. Without either it says `-At is required.`, as before. A limit relaunch
  builds byte for byte the same task arguments as before; only its new key is not read.

## Files

All in `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`. A hash check against my baseline of the
whole repo shows these and no others:

- Code: `orchestration.config.json`, `lib\limit-stop.mjs`, `hooks\context-guard.mjs`,
  `scripts\limit-stop-server.mjs`, `scripts\watch-session.ps1`, `scripts\schedule-relaunch.ps1`,
  `scripts\start-session-in-vscode.ps1`.
- Tests: `tests\limit-scripts.tests.ps1`, `tests\hooks\context-guard.test.mjs`,
  `tests\scripts\limit-stop-server.test.mjs`.
- Docs: `SKILL.md`, `references\usage-limits.md`.
- Outside the diff: nothing. No scheduled task was registered. Scratch:
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad\I`
  keeps only my scripts and results.

## Text the shared files need (not mine to edit)

xpp-agent `CLAUDE.md`:

1. "Session Size and Hand-over", bullet 3, last sentence: "It writes the hand-over, listing each lead's hand-off,
   and schedules the next session with the `schedule-relaunch.ps1 ... -ContextCap` command the texts print, which
   opens a new chat in this project's VS Code window one minute later (user, 2026-10-25). It ends with a final
   message that gives the hand-over's path, the relaunch time, and the line `Read <path> and carry on.`"
2. "Session Watch":
   - `SESSION NEAR CAP`: "hand over and schedule the next chat, as above. The watch's second line is the limit-stop
     server's (`RUNNING ALREADY` when the hook started it first), its third the steps with the relaunch command."
   - `LIMIT NEAR`: "after the reset" -> "one minute after the reset".
   - `SESSION RESUMED`: "(or ten minutes have passed since the server error)" -> "(or a minute has passed since the
     server error)".
   - `SESSION RESET COLD`: "to start at once" -> "to start one minute from now".

No agent file needs a change: leads and workers never schedule a relaunch.

`references\limits-and-caps-guide.html` (the main session's page, untouched) is now out of date in three places:
line 598 ("to build (run I)" for the new chat after a cap hand-over), line 599 ("to build (run I); today 5 and 10
minutes"), and line 641 ("describe runs H and I, which are not finished yet"). Its other one-minute sentences are
now true.

## Other waits on the way to a wake-up or relaunch (not changed)

- `watchSession.everySeconds` 60: the watch looks once a minute, so a wake comes 1 to 2 minutes after the reset.
- `relaunch.focusWaitSeconds` 5 and `relaunch.panelLoadSeconds` 20: inside the relaunch, before Enter.
- `limitStop.leadStopFallbackMinutes` 15: the longest wait for the leads before the hand-over is written.
- `relaunch.expireAfterHours` 12: a task missed while the machine slept still runs this long after its time.
- `usageLimits.stateFreshMinutes` 15 and `probeNearEveryMinutes` 3: how late a near limit is noticed.

## Checks

All final numbers are from 20:33 to 20:36, after the last change, through `run-heavy.ps1 -MinFreeMB 600`.

- Suites: Node 117 of 117 pass. PowerShell 87 passed, 0 failed (baseline 80; 7 new cases). Baseline at the start:
  117 and 80.
- Parser: 0 errors over every `.ps1` under `scripts` and `tests`. `node --check`: 0 failures on 23 `.mjs` files.
  The config parses as JSON.
- Red first: before the code, 4 Node tests and 6 PowerShell cases failed, each on the missing words, the missing
  `-ContextCap` or the missing function. The tests that the waits come from the config passed on the old code, as
  they must (the code already read those keys); mutants W04, W05 and R10 show they bite.
- The three waits come from the config, end to end:
  - A watch run with `retryMinutes` 2 wakes after a server error 3 minutes old; with 30 it stays quiet.
  - With `resetMarginMinutes` 1 it wakes after a reset 2 minutes old; with 30 it stays quiet.
  - A relaunch dry run with `-At now` and `relaunchMarginMinutes` 6 is scheduled at now plus 6.
- The cap relaunch, end to end: the test takes the command out of the watch's `SESSION NEAR CAP` line and runs it
  with `-DryRun` and `afterCapMinutes` 37. It is scheduled at now plus 37, and its arguments end in `-ContextCap`.
- The shipped values: a test reads the real config and finds 1 for all four waits, each with a `_why`.
- Mutation check of the changed lines: 30 mutants, 30 caught, 0 that did not load. The first run caught 26 of 29.
  The 3 survivors were the task description and the two notifications in the start script's main part. I added a
  unit test of the new `Get-RelaunchDescription` and a syntax-tree test of every notification; then those 3, and a
  new R11, were caught (4 of 4).
- Doc check: a search of the repo outside `misc`, `decisions`, `skills` and tests finds no 5- or 10-minute
  wake-up or relaunch, and no "the user starts the next session". The 5s and 10s left are other settings.

**Not tested:** a real relaunch (out of scope). A real registered task with `-ContextCap`: the suite's `-RealTask`
case was not run, so no task was registered. The notifications on screen. That a main session follows the new
texts.

## Risky or open points

- **A one-minute retry can wake the session into the same error.** Example: the API is overloaded at 14:00. The
  watch wakes the session at 14:01; the session's turn fails again; the watch has ended, and nothing restarts it
  until the user writes. With 10 minutes the same can happen, only less often. Most likely so (the watch restarts
  only when the session acts); not checked live. The user may still say keep it at 10.
- **The old chat stays open beside the new one.** Its limit-stop server serves only the old session id, so the new
  session's agents never hear it; it ends after `limitStop.capEndMinutes` (60) at the latest.
- **These scripts take unknown parameters silently** (no `[CmdletBinding()]`). My red run showed it: the old
  `schedule-relaunch.ps1` took `-ContextCap` without a word and printed a limit relaunch. A misspelled `-DryRunn`
  would register a real task. `watch-session.ps1` and `start-session-in-vscode.ps1` have the same bare `param()`;
  `usage-probe.ps1` I did not check. Not changed; recommendation: add `[CmdletBinding()]` in a run of its own,
  since it changes how every caller's spelling is checked.

## What I learned

- A PowerShell script whose `param()` has no `[CmdletBinding()]` puts unknown arguments into `$args` and runs on.
- The Monitor tool runs in Bash, which expands `$` inside a double-quoted pwsh command; a waiter is easier as a
  PowerShell call.

DECISIONS TAKEN: schedule-relaunch.ps1 got a -ContextCap switch in place of -At (not "-At now" plus a minutes number copied into the texts), so the script that schedules reads the one setting | The new setting is relaunch.afterCapMinutes, beside the other relaunch settings (not under usageLimits, since no limit is involved) | start-session-in-vscode.ps1 got the same switch, so a cap relaunch's notifications say "the session has handed over at its context cap" (not "the limit has reset", which would be false; not new neutral words, which would change the limit texts) | The session still ends with "Read <hand-over> and carry on", so the user can send it by hand if the relaunch fails | The watch's and the hook's SESSION NEAR CAP first sentence now says "write the hand-over, schedule the next chat and end the session" | One helper, capRelaunchCommand in lib\limit-stop.mjs, builds the command for the hook and the server; the watch builds the same text in PowerShell, and a test runs the watch's command | The cap key is read only with -ContextCap, so a limit relaunch does not need it and its task arguments stay byte for byte the same | -At with -ContextCap is refused; neither still says "-At is required."
INITIATIVES: usage-limits.md now names the wake times under "No line (resume)" and says what the notifications say after a cap hand-over | The task's description in Task Scheduler names its cause (new function Get-RelaunchDescription, extracted so a test reaches it) | A syntax-tree test that every notification of the start script opens with the cause | A test that pins the shipped one-minute values
ISSUES FOUND: A one-minute retry can wake the session into a server error that still holds; the session stops again and no watch is left to wake it (most likely, not checked live; open, the user's call) | schedule-relaunch.ps1, watch-session.ps1 and start-session-in-vscode.ps1 take unknown parameters silently (no [CmdletBinding()]; usage-probe.ps1 not checked), so a misspelled -DryRunn would register a real task; existed before, not changed | limits-and-caps-guide.html lines 598, 599 and 641 still say run I is to build and the waits are 5 and 10 minutes (the main session's page, untouched) | xpp-agent CLAUDE.md still says the user starts the next session after a cap hand-over and that SESSION RESUMED comes ten minutes after a server error (text above) | My progress file had four times written without reading the clock; corrected in the file
QUESTIONS: Keep watchSession.retryMinutes at 1 despite the risk above, or set it back to 10? | Should a separate run add [CmdletBinding()] to the orchestration scripts, so a misspelled parameter fails instead of being ignored?
