# Run S3b progress: the switch-over script

Started 2026-10-27 12:23 (clock read).

## Files I own

- `...\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1`
- `...\stage-2\STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`
- `...\stage-2\STATE_FOLDER_TRIM_LOG_CLAUDE.ps1`
- `...\stage-2\STATE_FOLDER_S3B_PROGRESS_CLAUDE.md` (this), `STATE_FOLDER_S3B_REPORT_CLAUDE.md`, `STATE_FOLDER_S3B_LOGS\`
- scratch under my scratchpad and `%TEMP%\s3b-*`

Read-only: live `orchestrate-agents\`, staged copy, base list, real `%TEMP%` team files, `~\.claude\state\`.

## Status

- 12:23 read task, skills, CLAUDE.md, README, S1 report ranges, S2 report range.
- (between 12:23 and 12:30) read staged config, watch mark check, probe age check, live hooks' error paths, base list. Plan below.

## Measured facts (2026-10-27, read-only)

- Readers judge the reading's age by its content `checkedAt`, not file time: `usage-probe.ps1` Get-FreshReadingText
  (staged, lines 207-216) and the watch's Read-UsageReading/Test-ProbeDue. Copying keeps the time anyway.
- Watch mark check (staged watch, Get-OtherWatch 703-709): content `"<PID> <StartTime.Ticks>"`; running = process with
  that id exists, is not the caller, and its StartTime.Ticks equals the mark's.
- Session id check: live `lib\limit-stop.mjs` SESSION_ID_PATTERN `^[A-Za-z0-9-]{1,128}$`.
- Live config (old): onFolder `claude-agent-team-on`, markerFolder `claude-context-guard` (both under os.tmpdir()),
  stateFile/relaunch log/limit-stop log absolute `%USERPROFILE%\.claude\state\...`, pipePrefix `claude-limit-stop`.
- Staged config at 11:44:38: teamState.folder `%USERPROFILE%\.claude\state\software-developer-agent`; onFolder
  `team-on`, markerFolder `context-guard`, stateFile `usage-reading\usage-limits.json`, recordFolder `usage-watch`,
  limitStop.logFile `logs\limit-stop.log`, BUT relaunch.logFile still `%USERPROFILE%\.claude\state\relaunch.log`
  (S3a will change it; until then my rule refuses it for its '%').
- Hooks: both call `loadConfig` then `isTeamOn` first, inside a try whose catch is `reportHookError` = one stderr line,
  exit 0. Old isTeamOn = exists `os.tmpdir()\<onFolder>\<id>`.
- Real old places now: 3 team-on marks, 26 guard markers (no locks), 1 decision record, 5 watch `.txt` marks, no slot
  holders, empty `claude-usage-probe\`, `%TEMP%\team-on` absent; state has limit-stop.log 11409, relaunch.log 1782,
  usage-limits.json 173, and `mcp-discover-verdicts.json` (not the team's: never copied). New root absent.

## Mixed-state spike (run before 12:44, time not read; scratch copies of live = old and staged = new, both hooks, session marked in both places)

Spike script: scratchpad `mix-spike.ps1`; world deleted after. Input: an agent at 330k (above its 320k warn).
- control old / control new: CONTEXT GUARD warning, marker written in the old / new place (the input opens the gate).
- A config first (old code + new config): silent, no stderr, nothing written.
- B config last (new code + old config): no stdout, nothing written, but each hook writes a stderr line
  `orchestration.config.json has no setting 'teamState.folder'` (exit 0). So "config last" is refuted.
- C new everything but old `lib\agent-team.mjs` (the gate): silent, nothing written.
- D new config + new libs, old hooks: silent. F new config + new lib\config.mjs only: silent.
- E new config + new hooks, old libs: context-guard exits 1 with a SyntaxError (missing export `requireStatePath`).
Order chosen: config first, then `lib\config.mjs`, other `lib\*`, then the rest (hooks, scripts, docs, tests), and the
gate `lib\agent-team.mjs` last. Every prefix of that order is like A, F, D or C: silent and writes nothing, so a
copy that stops half-way leaves the team silent, and a second `-Apply` finishes it.

## Point 1 and 2 build (done by 12:44, clock read)

- Red run (before 12:44): every case failed because the scripts did not exist (`STATE_FOLDER_S3B_LOGS\red-run.log`).
- Script, trim script written. Run 1: one real defect: `$Matches` overwritten by the session id check before the id was
  read (fixed: id taken at once), and a `$var:` string in the trim script. Run 2: three test-side faults (one-element
  result unrolled; SKIP asserted on apply output, which prints only actions). Run 3: CASES 26 of 26 passed
  (`run-3.log`), helper process stopped by id, run folder removed.
- Output contract: dry run `PLAN COPY | a -> b`, `SAME | a -> b`, `SKIP | path (why)`, `PLAN CODE | rel (why)`,
  `CODE KEPT | rel (why)`, `CUTOVER REFUSED | why`, last `CUTOVER DRY RUN | n state files and m code files to copy, s
  already the same; nothing written[; -Apply would refuse for k reasons]`. Apply: `COPIED`, `SAME`, `CODE`, `CUTOVER
  DONE | n state files, m code files`, `NEXT | ...`; failure `CUTOVER FAILED | ...` exit 2. RemoveOld: `REMOVED`,
  `KEPT | path (why)`, `REMOVED FOLDER`, `KEPT FOLDER`, `REMOVE OLD DONE | n files removed, k kept`. Exit 0/1/2.
- Initiative: -RemoveOld refuses unless the live config resolves every new place as the staged one does (else an
  early -RemoveOld would delete the old marks the old gate still reads, and silence every chat).

## Closing (12:52, clock read)

- Mutation pass: CASES 26 of 26, MUTANTS 22 of 22 caught (`mutate-1.log`); run-heavy: exit 0, ran 7:40, slot 1 of 1.
- Trim on a scratch copy of the real log: 11409 -> 841 bytes, 60 test lines removed, hash 021D...F6DE; real unchanged.
- Cleanup checked: no `%TEMP%\s3b-*`, no slot holder, helper PINGs 1168/16840/13816 gone, my scratchpad files deleted.
- Report written: `STATE_FOLDER_S3B_REPORT_CLAUDE.md`. Nothing left half done.

## Plan

1. Tests first (`STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`): scratch worlds under `%TEMP%\s3b-*`; the script runs
   in-process (`&`) with every place passed and USERPROFILE/TEMP/TMP pointed into scratch; one case runs it as a child
   `pwsh -File` for the real exit code. `-ScriptPath` lets the mutation pass point it at mutants.
2. Script: plan -> checks (all reasons) -> refuse or (dry run print | apply: state, then code). Code order: decided by
   the mixed-state spike (scratch copies, both hooks, both mixes).
3. Trim script + its tests on scratch copies of the real log.
4. Mutation pass, real dry run with before/after snapshots, report.

## Real dry run (12:45:24 to 12:45:42, clock read) and mutation pass (started 12:44:30 via run-heavy)

- Snapshots before/after (158 lines: old team places, live folder, staged copy, ~\.claude\state, base list):
  0 differences. Kept as `STATE_FOLDER_S3B_LOGS\real-snapshot-before.txt` / `-after.txt`; plan in `real-dry-run.log`.
- Plan: 3 switch marks, 26 guard markers, 1 decision record, the reading, limit-stop.log = 32 state files; relaunch.log
  NOT planned (staged relaunch.logFile still has '%', refused); 19 code files (18 changed + tests\lib\state-path.test.mjs
  new), 0 conflicts, 0 kept; order config, lib\config.mjs, lib\limit-stop.mjs, rest, lib\agent-team.mjs last.
- Skips: 5 watch marks (56c67d3d... runs, PID 12880 = the main session's watch), 1 slot holder (my own run-heavy run).
- Refusals (expected): relaunch.logFile '%'; the running watch of session 56c67d3d-b3c0-43be-a82c-b3a9cdc23274.
- Staged copy at the dry run: config 11:44:38, newest staged file watch-usage-and-context.ps1 11:56:22; S3a had not
  yet written to it.