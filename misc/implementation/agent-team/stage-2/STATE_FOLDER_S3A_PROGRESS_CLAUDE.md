# S3a progress: the relaunch log, the slot holders, '%' refused, and the mutation check

Started 2026-10-27 12:55. Task: `STATE_FOLDER_S3A_TASK_CLAUDE.md`. "The copy" =
`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`.

## Files I own (in the copy unless said)

- `orchestration.config.json` (only `relaunch.logFile`, new `runHeavy.holderFolder`, their `_why`)
- `scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`
- the one rule line in `scripts\usage-probe.ps1` and `scripts\watch-usage-and-context.ps1`
- `lib\config.mjs` (the `%` only), `tests\lib\state-path.test.mjs`, `tests\limit-scripts.tests.ps1`
- repo root `agent-team-files.html`: the two "does not exist yet" places only
- my progress, report, logs (`...\stage-2\STATE_FOLDER_S3A_LOGS\`)
- `schedule-relaunch.ps1`: checked 12:57, it neither builds nor passes the log path (line 103-108 passes only
  -ProjectDir, -Prompt, -ContextCap). Left alone.

## Baseline (12:58:50)

- Real root `C:\Users\user\.claude\state\software-developer-agent`: absent.
- `~\.claude\state\`: limit-stop.log 11409 (11:06:50, 61544C7214A6), mcp-discover-verdicts.json 750 (10:08:41),
  relaunch.log 1782 (09:36:11, B1F21F66160F), usage-limits.json 173 (12:58:34, live watch rewrites it).
- `%TEMP%\xpp-agent-heavy-command-slot-1.txt`: the live run-heavy's, held by process 11072 since 12:58:01 for a
  `checks.ps1` in the shared scratchpad (not mine; most likely S4).
- Live `orchestrate-agents\`: 0 differences of 45 against the base list.
- All my files: LF, no BOM.
- Check script: scratchpad `real-check.ps1`.

## Plan

Point 1:
- config: `relaunch.logFile` = `logs\\relaunch.log`; new `runHeavy.holderFolder` = `heavy-commands`; `_why` texts say
  "under teamState.folder", no `%`.
- start script: S2's three functions copied in (with the `%` rule), `Expand-ConfigPath` dropped (only use was the
  log path). `$LogPath = Get-StatePath (Read-OrchestrationConfig $ConfigPath) 'relaunch.logFile'`.
- run-heavy: same three functions; new `-HolderFolder` (full path, as given); `Get-HeavySettings` adds
  `HolderFolder` (passed, else `Get-StatePath ... 'runHeavy.holderFolder'`); the folder is created in the settings
  step, so a broken setting or an uncreatable folder is HEAVY COMMAND NOT RUN before any slot; `Get-HolderFile`
  gives `<HolderFolder>\slot-<n>.txt`; mutex name unchanged.
- Tests avoid the real mutex: unit cases dot-source; the end-to-end holder cases run with `-WaitMinutes 0`, which
  gives up before the first try for a slot and prints the holder lines read from the holder folder (no mutex is
  created at all). The one existing real-run case (slots 2, slot 2 while the live run-heavy holds 1) also copies
  its holder file during the run, so the write site is checked without a new mutex use.

Point 2: `%` added to the refused characters in Node and the four PowerShell copies; table case `%TEMP%\x` now
refused, `%` added to the per-character cases; my two scripts join the 0-difference table check.

Then: red phase in a scratch copy of the copy, green, mutation check, real-material checks, html fix, suites.

## Done

- 13:03 Tests written first (PowerShell + Node), config entries written (they are what the tests pin):
  `relaunch.logFile` = `logs\\relaunch.log`; `runHeavy.holderFolder` = `heavy-commands` (+ `_whyHolderFolder`).
- 13:05-13:07 Red, in scratch `s3a-red\orchestrate-agents` (copy of the copy, new tests + new config, old code):
  PowerShell 11 cases failed, each for the expected reason (no `%` in the reason text, `%TEMP%\x` resolved,
  Get-StatePath missing in my two scripts, log/holder in the old place, broken setting not refused: exit 124 with
  `-WaitMinutes 0`, no slot taken). Pinning cases passed on old code: 'a passed -LogPath wins', the old start cases,
  the old heavy cases. Node: 3 of 10 failed (the `%` cases). Logs `red-ps.log`, `red-node.log`. First attempt
  failed at argument binding (pwsh -File with an array -Only); runner now called with `&`.
- 13:08 Code: `%` in config.mjs, usage-probe.ps1, watch-usage-and-context.ps1 (one line each); start script has the
  three functions, `Expand-ConfigPath` removed; run-heavy has the three functions, `-HolderFolder`, holder folder
  made with `[IO.Directory]::CreateDirectory` inside the settings try (New-Item's error would be non-terminating and
  slip past the catch), `Get-HolderFile` = `<HolderFolder>\slot-<n>.txt`, mutex prefix unchanged.
- 13:11 Green in the copy: my 3 wildcards 25 of 25 ok; Node state-path 10 of 10. Logs `green1-*.log`.
- Table is now 51 cases (S2's 50, `%TEMP%\x` now refused, `%` added to the per-character cases).

- 13:14 Mutation check started in the background (task baua8bcs3) through the live run-heavy: scratchpad
  `s3a-mutate.ps1`, work copy `scratchpad\s3a-mut\orchestrate-agents` (delete after), log
  `STATE_FOLDER_S3A_LOGS\mutation.log`. 20 mutants + M0 baseline. Red copy `s3a-red` deleted 13:14 (0 links).
- 13:15 Page fix: `agent-team-files.html` line 877 ("Not made yet." -> names the one hand-over file) and line 976
  ("does not exist yet ..." -> "holds one hand-over so far, written on 27 October 2026 at 09:35"). Only one literal
  "does not exist yet" existed; line 877 is the second place saying the same. Undoing my two replacements gives the
  original hash 831B10E9653F; LF kept (1046); code/td/tr/li balanced.
- 13:16 Real material: `real-resolve.log`: RESOLVE 0 differences on 2 settings (6 answers: start, run-heavy, Node),
  real root still absent; COPIES 4 copies, 0 differences (368/597/1780 characters each).
- Docs in the copy (S5's) already name `heavy-commands\slot-<n>.txt` and `logs\relaunch.log`: nothing stale found.

- 13:14-13:44 Mutation check. Attempts 1 and 2 died at M1 (my script: `@(@(f,o,n))` flattens; then an
  if-expression assignment unrolled the wrapper again). Attempt 3 (13:25-13:36, `mutation.log`): M0 clean,
  M1-M18 caught as described. M19/M20 as run were NOT what they said: in a list `,` binds before `+`, so their
  second edit replaced the dot rule with itself (M19 ran as "% let through in run-heavy", M20 as a repeat of M16).
  Found by asking why M19 failed the behaviour table: run by hand (m19-detail.log) the real M19 was caught only by
  the four-copies text case, because no table case had a % with an empty or dot part. Added two table cases
  ('a % before an empty part' `a%\\b`, 'a % before a .. part' `%\..`): table now 53. Fixed the script (parentheses,
  a guard that an unchanged file is INVALID), added M21 (% after the dot rule in all four PowerShell copies alike).
  13:41-13:44 (`mutation-m19-m21.log`): M0 clean on 53 cases; M19, M20, M21 caught; M21 only by the new cases.
  RESULT: 21 of 21 caught (M1-M18 from attempt 3, M19-M21 from the rerun). Work copies s3a-mut, -mut2, -mut3 deleted.
- `$HolderFolder` in the heavy unit case got a comment (the analyzer flags it unused; Get-HolderFile reads it).

- 13:44-13:51 Full suites in the copy after the last change: PowerShell 122/122, Node 246/246. Real root absent,
  relaunch.log and limit-stop.log unchanged, usage-limits.json rewritten 13:42 and 13:48 (live watch, most likely).
  Live vs base: 7 differences (register files, SKILL.md), not mine; reported.
- 13:52 Report written: `STATE_FOLDER_S3A_REPORT_CLAUDE.md`. Context warning reached at 13:51; closed.

## Left

- Nothing of the task. Scratch scripts stay in the session scratchpad (s3a-*.ps1, real-check.ps1, enc.ps1); the
  work copies are deleted.

## Test contract (how run-heavy's tests avoid the real slot)

- Unit cases dot-source run-heavy (no mutex).
- `-WaitMinutes 0` runs: Wait-ForSlot's loop never starts, so no named mutex is created; the run prints
  HEAVY COMMAND NOT RUN with the holder lines read from the holder folder. Used for "holder from root", "passed
  -HolderFolder wins", and the broken-setting cases (so code that let a broken setting through would also stop
  with 124 instead of taking a slot).
- The one existing real run (slots 2) now uses its own root and copies the holder file during the run. No new real
  mutex use was added.
