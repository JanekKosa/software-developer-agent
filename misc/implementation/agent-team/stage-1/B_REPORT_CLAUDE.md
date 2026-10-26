# Agent team stage 1, builder B: report

Written 2026-10-25 by builder B (software-developer), plan sections 1, 2, 3, 8 and 11. Details and measurements are
in `B_PROGRESS_CLAUDE.md` beside this file.

## Outcome

Done. All four usage-limit scripts are built, the watch is extended without changing its old answers, and every
check below passed after the last change. The real relaunch (opening the link, pressing Enter, focusing a window,
the notification) and a real limit stop were not tried, by instruction.

## What now works

- **usage-probe.ps1** asks the API for the limit percentages with one tiny Haiku call and writes the answer to the
  shared state file. Real run on 2026-10-25 08:25, 3.5 s:
  `{"checkedAt":"2026-10-25T08:25:08+01:00","fiveHour":{"percent":18.0,"resetsAt":"2026-10-25T12:10:00+01:00"},"weekly":{"percent":48.0,"resetsAt":"2026-10-31T07:00:00+01:00"}}`.
  The call runs in `%TEMP%\claude-usage-probe` without the variables that bind a shell to its Claude Code session
  (the session id and the messaging socket and token are in every tool shell; a child that inherits them could
  reach the calling session). It keeps no transcript (`--no-session-persistence`, found in `claude --help`).
- **watch-session.ps1** keeps its four old markers and adds two. Example: five-hour at 96%, resets in 30 minutes,
  margin 10. The main session (1-hour cache) lasts 59 more minutes, so it is fine. A worker that answered a minute
  ago (5-minute cache) runs out in 4 minutes, so the watch ends with:
  `LIMIT NEAR | HAND OVER | five-hour at 96% resets 09:02 | going cold: software-developer a1b2c3d4 at 08:36`,
  then one line saying what to do. Below that threshold, or when every warm agent outlives the reset plus the
  margin, it writes the decision file and stays quiet. After a limit stop, at the wake time it prints
  `SESSION RESET COLD | ...` instead of `SESSION RESUMED` when an agent that was warm at the stop has gone cold.
- **schedule-relaunch.ps1** registers a one-shot task for the current user: interactive only, no elevation. The
  task deletes itself once it expires. It accepts `-At now`, and a repeat for the same minute prints
  `ALREADY SCHEDULED` and does no harm.
- **start-session-in-vscode.ps1** carries out the four steps of plan 8.4 and logs each one with the time.

## Deliberate differences from the plan

- `start-session-in-vscode.ps1 -DryRun` only looks. It does not run `code <folder>`, and it does not focus a window
  or press Alt. The plan said a dry run skips only steps 3 and 4. But the window unlock in step 2 is a keystroke,
  which my task forbids, and focusing a window changes the user's screen while they work.
- A reading whose reset time has already passed does not count as over the threshold. Without this rule, a reading
  taken just before a reset would cause a false hand-over in the minutes after it.
- When a hand-over is already on record for a reset that is still ahead, the watch stays quiet. It never goes back
  to resume, and it never wakes the session a second time.
- After a limit stop, "warm" is judged at the moment of the stop. "Cold by the reset" uses the same deadline as the
  live decision (reset plus resumeMarginMinutes). A server-error stop keeps the old SESSION RESUMED.
- `schedule-relaunch.ps1` refuses a hand-over file that does not exist. A time up to 24 hours in the past runs at
  now plus the margin.
- `LIMIT NEAR` is two lines, as the plan says. The other markers are one line each. So "the last line starts with
  the marker" no longer holds for this one marker.

## Files

Created under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`: `scripts\usage-probe.ps1`,
`scripts\schedule-relaunch.ps1`, `scripts\start-session-in-vscode.ps1`, `tests\limit-scripts.tests.ps1`. Changed:
`scripts\watch-session.ps1` (new parameters, five new function groups, the cold check at wake time and the limit
check after the context check; `Get-ContextTokens` now calls the new `Get-ReplyTokens`, with the same sum). Nothing
is committed.

Changes on the machine that no diff shows:

- The real probe run created two empty folders, which are left in place: `%TEMP%\claude-usage-probe` and
  `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-usage-probe`. The probe wrote its reading to my
  scratchpad, not to `~\.claude\state`.
- One scheduled task, `ClaudeRelaunch-run6-202710250937`, was registered and then removed. There were 0
  `ClaudeRelaunch-*` tasks before and 0 after.
- The watch now leaves `%TEMP%\claude-session-watch-<session>.decision.json` behind on purpose, so that a
  restarted watch never takes back a hand-over. The tests remove their own copies.

## Text the shared files need (not mine to edit)

- **xpp-agent `CLAUDE.md`, "Session Watch"**: the command is now
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-session.ps1'` (the old
  `Docs\Skills` path is deleted in the working tree). Add two markers: "`LIMIT NEAR | HAND OVER`: stop every lead
  with STOP FOR LIMIT, write the hand-over, run `schedule-relaunch.ps1` with the `-At` the next line gives, and do
  not start the watch again" and "`SESSION RESET COLD`: do not resume agents; write the hand-over from disk and run
  `schedule-relaunch.ps1 -At now`". Also say that LIMIT NEAR is followed by one instruction line.
- **SKILL.md (builder C)**: the same two markers, and the relaunch commands
  `schedule-relaunch.ps1 -ProjectDir <folder> -HandoverPath <file> -At <ISO|now> [-DryRun]` and
  `start-session-in-vscode.ps1 -ProjectDir <folder> -Prompt <text> [-DryRun]`.

## Settings added (script parameters, each with a comment saying why)

- watch: `-ConfigPath` (the config beside the skill), `-UsageStatePath` (`~\.claude\state\usage-limits.json`),
  `-UsageReadingPath` (test seam: read this file and never probe), `-ShortCacheMinutes 5`, `-LongCacheMinutes 60`
  (the API's two cache lifetimes) and `-CacheLookbackReplies 20` (plan 8.2).
- probe: `-TimeoutSeconds 120`, plus `-StatePath`, `-WorkingFolder`, `-ClaudePath` and `-SessionVariables`.
- relaunch: `-MaxPastHours 24` (plan 8.3) and `-ExpireAfterHours 12`, so a PC that was asleep still runs the task
  when it wakes. Start script: `-LogPath` and `-NotifySeconds 15`.

## Checks (after the last change)

- Mutation check: 26 of 26 caught. Each mutant broke one rule in a copy of a script, and counted as caught only when a test failed while the copy still loaded. The first pass caught 25. The survivor counted a cache that expires at the very moment of the decision as warm; an added edge assertion now catches it.
- Test file: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` gave 42 passed, 0 failed in 32 s at 08:46, after the last change. The opt-in `-RealTask` case was run on its own and passed.
- My review found that the probe hid a failed write of the state file: it printed the reading and exited 0. A test with a fake `claude` (a batch file that prints a recorded stream) showed the fault, and it is fixed: the probe now exits 1 with a reason. failed 31 of 39 cases. The 8 that passed were old markers and "stays quiet"
  cases.
- Replay of the original watch (saved before any change) and the new one on 8 fixture scenarios: 7 match exactly
  in exit code and output. The one difference is the intended new marker: a limit stop where a worker went cold now
  gives SESSION RESET COLD instead of SESSION RESUMED.
- Real probe: run twice. The second run came after the last probe change, at 08:47: exit 0 in 6.6 s, five-hour 25%, weekly 49%. The file matched the printed line, and no transcript was kept. The `--help` check finds the flag, and an invented flag is not found.
- Real scheduled task: registered a year ahead, read back (Interactive, Limited, ends 12 h after its start),
  repeated (ALREADY SCHEDULED), removed, and confirmed gone.
- Start script, read-only: it found `code.cmd` beside the running `Code.exe`, listed the one VS Code window and
  matched `xpp-agent` in its title. The dry run logged every step.

**Not tested:** opening the `vscode://` link, pressing Enter, focusing a window, the Alt unlock, the notification,
running `code <folder>`, a scheduled task actually firing, and a real limit stop. All of these were left out by
instruction, or need a real reset to happen.

## Risks and open points

- **Probe cost near the weekly threshold.** Within 10 points of a threshold, the plan's rule probes every 3
  minutes. With the weekly window at 90% on Tuesday and its reset on Friday, any running watch probes 20 times an
  hour for days, at about 7 thousand tokens each. My recommendation: probe at the normal interval when the window
  near its threshold resets more than a day away. That needs a decision and maybe a config key.
- **The weekly limit's stop message is unverified.** The reset time is read from "resets 10:10am"-style text. If
  the weekly message reads "resets Oct 31, 7am", no time is found, and the watch falls back to the reset on record
  or the 10-minute retry (the old behaviour). I did not check this, because no weekly stop was at hand.
- **Finished subagents count.** A meta file can say `"finished":true`. The plan does not exclude those agents, so a
  finished worker that answered three minutes ago can still cause a hand-over. Should finished agents be left out?
- **The settings helper is copied** into all four scripts (two small functions). A shared `scripts\config.ps1`
  would remove the copies, but that file is not mine to create.
- **`%NAME%` in a project path** would be expanded by cmd.exe when `code.cmd` runs (every `.cmd` goes through
  cmd.exe). The folder is always quoted, so `&` and spaces are safe.
- Once the main session's own cache (1 hour) runs out before the reset, every limit hit with the reset more than
  about 50 minutes away becomes a hand-over. That follows the user's rule, but it will be the usual case.

## Learned (not in the plan)

- Every tool shell carries `CLAUDE_CODE_MESSAGING_SOCKET`, `CLAUDE_CODE_MESSAGING_TOKEN` and
  `CLAUDE_CODE_CHILD_SESSION`.
- `--max-turns` is not listed by `claude --help` 2.1.286, but it still works.
- `[ordered]@{...}.GetEnumerator()` is a parse error ("Unexpected token"). Wrap the literal in parentheses.

## Second pass (2026-10-25, 09:18-09:40)

A reviewer checked this work and raised four findings. All four held up, all four are fixed, and none was rejected.
The full report is `B2_REPORT_CLAUDE.md` beside this file.

- **A limit stop with no readable reset time** now waits for a later reset on record, plus the margin, before it
  wakes the session. Before, it woke the session 10 minutes after the stop and said the limit had reset, even when
  the record put the reset three days ahead. With no record, nothing changes.
- **The two new markers print a date** when a time is not today, for example `resets 2026-10-28 07:00`.
- **After LIMIT NEAR the session restarts the watch.** The script header says so, and so does the marker's second
  line, which now begins "Start this watch again now". This replaces "do not start the watch again" in the text for
  the shared files above. The corrected text is in `B2_REPORT_CLAUDE.md`.
- **The probe passes `--effort <usageLimits.probeEffort>`** (`low`). A real run at 09:30 gave exit 0.
- **The relaunch opens the chat link only when the project's window is in front.** Otherwise it opens nothing,
  logs the prompt, shows a notification asking the user to start the chat in that project, and exits 1.
- Checks after the last change: 50 passed, 0 failed (43 s). Mutation check on the new rules: 17 of 18 caught. The
  survivor is the real run's branch of the start script, which no test can run.
- The numbers in the Checks section above stay as the first pass wrote them. One sentence there is garbled: "...
  exits 1 with a reason. failed 31 of 39 cases. The 8 that passed...". The "31 of 39" belongs to the first pass's
  RED run, which had 31 failed and 8 passed.
