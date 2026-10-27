# Run S2 progress: the usage reading, the probe's folder, the watch's records

Worker: software-developer, run S2 of STATE_FOLDER. Task: `STATE_FOLDER_S2_TASK_CLAUDE.md`.

## Files I own (in the copy `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`)

- `orchestration.config.json` (only `usageLimits.stateFile`, `usageLimits.probeWorkingFolder`, new
  `usageAndContextWatch.recordFolder`, their `_why` texts)
- `scripts\usage-probe.ps1`
- `scripts\watch-usage-and-context.ps1`
- `tests\limit-scripts.tests.ps1`
- this file, `STATE_FOLDER_S2_REPORT_CLAUDE.md`, logs in `STATE_FOLDER_S2_LOGS\`

## Log

- 2026-10-27 11:36 started. Read task, three skills, CLAUDE.md, README, S1 contract (33-75, 115-121), sweep sections.
  Real root `C:\Users\user\.claude\state\software-developer-agent` absent at 11:36. `C:\Users\user\.claude\state\`
  holds limit-stop.log (11409, 11:06:50), mcp-discover-verdicts.json (750, 10:08:41), relaunch.log (1782, 09:36:11),
  usage-limits.json (173, 11:35:55).
- 11:40 baseline: live `orchestrate-agents\` vs `STATE_FOLDER_STAGING_BASE_CLAUDE.txt`: 1 difference of 45 (SKILL.md,
  the main session's, known). Copy hashed to scratchpad `copy-start.txt` (46 files).

## Measured facts

- Claude Code 2.1.286 (`C:\Users\user\.local\bin\claude.exe`, 245 MB bundle), read-only string search:
  - project folder name: `function k(e){return e.replace(/[^a-zA-Z0-9]/g,"-")}` and `XA(e)`: names over 200 chars are
    cut to 200 and get `-<hash base 36>`. So `C:\Users\user\.claude\state\software-developer-agent\usage-probe` ->
    `C--Users-user--claude-state-software-developer-agent-usage-probe` (64 chars, no cut). The probe's
    `Get-ProjectFolderName` matches for names up to 200 chars; it lacks the cut (not mine; report).
  - `function yH(){return Boolean(a.CLAUDE_CODE_DISABLE_CLAUDE_MDS||$r("claudeMd",...))}`: the variable the probe sets
    (`Set-ProbeEnvironment`) switches CLAUDE.md loading off as a whole. So moving the probe's folder under `~\.claude`
    cannot load `~\.claude\CLAUDE.md` twice: no CLAUDE.md is loaded at all. Answer found with no model call (2 tool
    calls); the two real calls were not made.
- `~\.claude\projects\`: 19 folders whose newest transcript names a cwd in its first 64 KB; none from a path with a
  '.' or a doubled separator (no `--claude` anywhere). Closest real one: `c--Repos-My-projects-software-developer-agent`
  from `c:\Repos\My projects\software-developer-agent` (':' '\' ' ' each -> '-'). 4 folders' names differ from their
  newest cwd only in the drive letter's case (`C--` vs `c:`): Remove-ProbeTranscript compares with -eq (case-blind), ok.

## Plan (point 1 and 2)

- PowerShell copy of S1's rule in each of the two scripts: `Get-RequiredSetting $config $key` (requireSetting's words)
  and `Get-StatePath $config $key` -> absolute path. Errors name `orchestration.config.json` (Node's constant), not the
  -ConfigPath, so the texts are word for word Node's. Join: `[IO.Path]::GetFullPath([IO.Path]::Join(root, value))`
  (path.join normalises the root the same way; Join-Path would fail on a drive that does not exist). Rules use `\z`,
  not `$` (.NET `$` also matches before a final LF; JS does not).
- probe: default -StatePath / -WorkingFolder from Get-StatePath; Expand-ConfigPath then unused -> removed.
- watch: Get-WatchSettings resolves UsageStatePath and the new RecordFolder via Get-StatePath; new param
  -RecordFolder (passed wins, as the _about says); marker `<folder>\<id>.txt`, record `<folder>\<id>.decision.json`;
  folder made inside the settings try (failure = WATCH FAILED). Expand-ConfigPath then unused -> removed.
- tests: children get USERPROFILE/TEMP/TMP and their working folder on scratch (Start-ScriptProcess); New-TestConfig
  gives every config `teamState.folder` = `<WorkRoot>\team-state` unless the case sets one; fixtures carry
  MarkerPath/DecisionPath; the stub server checks the record in the new place; no %TEMP% clean-up names any more.
- red phase in a scratch copy of the copy (new config + new tests + old scripts), then green in the copy.

## Done

- 11:45 config (copy): stateFile `usage-reading\usage-limits.json`, probeWorkingFolder `usage-probe`, new
  `usageAndContextWatch.recordFolder` `usage-watch`, three `_why` texts.
- 11:50 tests written (copy). 11:52 first red run started in scratchpad `red\`; 11:53 STOPPED by me (task bn7j5mtya)
  at line ~1088: I found 6 later cases that call the script's `Get-DecisionRecordPath $id` in-process, which in the
  OLD code is the real %TEMP%. Stopped before they ran: real %TEMP% still 6 `claude-session-watch-*` files, same names
  and times as at 11:53 (list in Measured facts below), no process left. Fixed: those cases use `$fixture.DecisionPath`;
  the test process itself now sets USERPROFILE/TEMP/TMP to the work folder, so in-process code cannot reach them either.
- 11:55 second red run started (task bhiz7jer8), log `STATE_FOLDER_S2_LOGS\red-ps-suite.log`.

- 11:56 scripts done in the copy (green code): both scripts have Get-RequiredSetting, Get-StatePathFault,
  Get-StatePath (Expand-ConfigPath removed from both, now unused); probe defaults from Get-StatePath; watch has
  -RecordFolder, Get-WatchSettings resolves UsageStatePath and RecordFolder by Get-StatePath, makes the record folder
  in the settings try, Get-DecisionRecordPath/Get-WatchMarkerPath take (folder, session). Both parse, ASCII, LF.
- 11:56 real material: 0 differences on 3 (x3: probe, watch, lib\config.mjs = 9 answers); real reading (173 bytes,
  11:54:22) parses with Read-UsageReading and Get-FreshReadingText; 6 real %TEMP% watch files, 0 refused of 6.
- 11:57 CONTEXT GUARD (322k). Closing. NOT started: the mutation check. Finish it with: copy the copy's `scripts\` to
  scratch, break one rule at a time, run
  `pwsh -NoProfile -File tests\limit-scripts.tests.ps1 -ScriptsRoot <scratch scripts> -Only 'paths under teamState.folder*'`
  (rule mutants) or `-Only 'probe run*'` / `-Only 'watch run*'` (place mutants), through run-heavy.
- 12:04 red (scratch copy, old scripts): 89 passed, 25 failed, every failure a moved place or a missing function.
- 12:14 green in the copy: PowerShell 114 of 114, Node 244 of 244 (logs green-ps-suite.log, green-node-suite.log).
  Before (12:04) and after (12:14): real root absent; ~\.claude\state 4 files (usage-limits.json rewritten by the live
  watch at 11:57 and 12:14:41, content five-hour 35% weekly 92%, live); real %TEMP% same 6 watch files, same times;
  no test folder left. Live orchestrate-agents: 0 differences of 45. Copy: my 4 files + S5's 3 changed.
- 12:15 red scratch copy and my scratch files deleted (3 older scratchpad files from 10:52-10:56 are not mine, kept).
  Report written: STATE_FOLDER_S2_REPORT_CLAUDE.md. Left: the mutation check (command above).

## Real %TEMP% watch files at 11:53 (before any test of mine could write)

claude-session-watch-111d8651-...ca7.txt (24, 26.10 05:20), -56c67d3d-...274.txt (24, 27.10 10:21),
-bf7022c6-...f4f.decision.json (168, 27.10 09:34), -d879e15e-...e44.txt (24, 26.10 20:36), -dad36b3f-...c5b.txt (23,
26.10 13:31), -f45a8524-...736.txt (24, 25.10 17:01).
