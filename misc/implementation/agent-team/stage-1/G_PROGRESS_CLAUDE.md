# Run G: progress

Started 2026-10-25 17:35 (clock read). Task: `G_TASK_CLAUDE.md` beside this file, plus two facts from the main
session (17:35): run F was cut off before its report, so its `F_PROGRESS_CLAUDE.md` "## Log" was read instead; F's
mutation check runs as pid 14864 until about 17:50 and copies `scripts\watch-session.ps1`, `scripts\watch-agent.ps1`
and `tests\limit-scripts.tests.ps1` fresh per mutant, so those three are not edited until that pid is gone (Node side
first). Repo: `C:\Repos\My projects\software-developer-agent`. No commits. My scratch: `<scratch>\G`, where
`<scratch>` is `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`.

## Files I own

- New: `orchestrate-agents\scripts\limit-stop-server.mjs`, its tests under `orchestrate-agents\tests\`.
- Changed: `orchestrate-agents\hooks\context-guard.mjs` and its test, `orchestrate-agents\orchestration.config.json`,
  `orchestrate-agents\scripts\watch-session.ps1` (LIMIT NEAR part only, after pid 14864 ends),
  `orchestrate-agents\tests\limit-scripts.tests.ps1` (one new case, after pid 14864 ends),
  `orchestrate-agents\SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`,
  `references\worker-rules.md`, `references\lead-brief-template.md`, `team-rules\SKILL.md` (only where they describe
  the old stop message).
- Not mine: any `CLAUDE.md`, settings files, anything outside the repo, `skills\` (vendored), agents and sessions,
  pid 14864.

## Extra point (main session, 17:39)

F's mutation check ended (36 of 39). Close three survivors with a test that fails on the mutant (red first), then
re-run those three mutants: E17 (watch-session Expand-ConfigPath throw -> `$null = 1`), E42 (watch-agent
`if (-not $PSBoundParameters.ContainsKey('WarnTokens')) {` -> `if ($true) {`), F16 (watch-agent
`($type ?? 'default')` -> `$type`). Mutant definitions: F's `<F scratch>\mutants.ps1`.

## Measured

- 17:36 baseline: 89 files, no links, repo has no commits (everything untracked), hash list `<scratch>\G\baseline-hashes.txt`.
- 17:41 baseline suites (through run-heavy): Node 79/79, PowerShell 74/74.
- 17:39 Node v24.13.0, Windows pipes (spike `<scratch>\G\spike-pipe.mjs`): connect with no server = error ENOENT
  (errno -4058) in 0.2-0.8 ms (17 ms the first time); a second listen on a taken name = EADDRINUSE; names match
  case-insensitively; `\\?\pipe\` and `\\.\pipe\` reach the same pipe; a client that connects and ends sends nothing.
- 17:40 `Start-Process node ... -WindowStyle Hidden` from a Claude Code background task: alive at 1.5 s, GONE once the
  task ended (pipe timed out). 17:42 Node `spawn(detached, stdio 'ignore', windowsHide)` + `unref` from a node the
  background task ran: the task ended at once and the child still answered on its pipe 25 s later. So the server
  starts itself detached from Node (a `start` mode), not through Start-Process.
- 17:43 hook time BEFORE (20 runs, 2 MB transcript, below warn, no server, `<scratch>\G\time-hook.mjs` via
  run-heavy): median 72 ms (min 67, max 95); again median 75 ms (min 67, max 112).

## Plan (17:44)

1. `lib\limit-stop.mjs`: pipe path `\\.\pipe\<prefix>-<session>` (both validated), pipe settings, `askLimitStop`
   (one JSON request line, one JSON answer line `{"stop": "..."}`; ENOENT = no server; timeout/broken = failed).
   `lib\config.mjs`: `requirePathSetting` (expands `%NAME%`).
2. `scripts\limit-stop-server.mjs`: `start` (checks args/config, says RUNNING ALREADY if the pipe answers, spawns
   `serve` detached, waits up to startCheckSeconds for the pipe; prints one line STARTED / RUNNING ALREADY /
   NOT STARTED) and `serve` (listens; EADDRINUSE exit 3; per agent: first text, then '' until repeatAfterCalls more
   calls, then the AGAIN text; exits at reset + endMarginMinutes; logs to limitStop.logFile). Roles: lead
   (`limitStop.leadAgentTypes`), helper (`usageLimits.ignoreAgentTypes`), worker (all else).
3. Hook: asks the pipe (started before the size work, awaited after); stop text first, then the size message; a
   pipe failure other than no-server = one stderr line, size message unaffected; a size failure = stderr line as
   today, stop text unaffected.
4. Watch: at LIMIT NEAR runs `node <StopServerScript> start ...` (param for the test stub); second line names the
   server state, the lead fallback time (now + leadStopFallbackMinutes) and, when the server did not start, the old
   message as fallback.
5. Config `limitStop`; docs; the three survivor tests; mutation check; live check; timing after.

## Log

- 17:35 read: task file, the three vendored skills, repo `CLAUDE.md`, README Layout/wiring/Tests, F's progress file.
- 17:36-17:44 read: config, context-guard.mjs, watch-session LIMIT NEAR part, usage-limits.md, start-messages.md,
  worker-rules.md, lead-brief-template.md, SKILL.md lines 60-160, task-lead.md sections 9-11, scratch.mjs,
  config.mjs, hook-io.mjs, context-guard test (helpers and settings cases). Node docs (net IPC, child_process
  detached/windowsHide) read on nodejs.org for v24.
- 17:44-17:57 (the clock was not read between these two; the times I first wrote here were guessed and are removed) point 1+2 DONE (Node server). Tests first: `tests\scripts\limit-stop-server.test.mjs` (12 cases),
  red: 12 of 12 failed (no server: pipe never up, wrong exit codes). Code: `lib\limit-stop.mjs` (pipe path,
  pipeSettings, askLimitStop), `scripts\limit-stop-server.mjs` (start + serve), config `limitStop` section,
  `lib\config.mjs` `requirePathSetting`. Green 12/12 after one test fix (my loop count was one short: told at call
  1, again at call 1 + repeat). No node process left behind.
- point 3 DONE (hook), same span. makeWorld now sets a test pipe prefix for EVERY hook test (the test SESSION id is
  a real session id, F's: without it the hook would ask a real session's pipe). 9 new cases; red: 8 failed, the
  "no server" one passed at once (it guards today's behaviour). Hook: `guardOutput` starts the pipe query, runs the
  size part, awaits; stop text first, '\n\n', size message. Green 25/25.
- `requirePathSetting` test in `tests\lib\basics.test.mjs` written AFTER the code (passes, 16/16); its red
  proof is the mutation check (to do).
- point 4 DONE (watch), same span. Tests: a stub server (`$StubServer`, records its arguments, says what
  LIMIT_TESTS_STUB_SAYS says) now goes into EVERY watch run through `Get-WatchArguments` and the stateFile case (else
  a LIMIT NEAR run would start a real detached server). The old LIMIT NEAR case now expects 3 lines; new: arguments
  + lead deadline from config, NOT STARTED fallback (and an unknown answer is NOT STARTED), WATCH FAILED for a
  missing limitStop key. Code: param `-StopServerScript`, `Start-LimitStopServer`, `Format-HandOverSteps`, the
  setting read at the start. The watch now prints 3 lines at a hand-over: marker, the server's own line, the steps.
  Survivor tests added: E17 (unit Expand-ConfigPath + through Get-WatchSettings), E42 (-WarnTokens passed with a
  config whose type entry differs, with and without -AgentType), F16 (contextCaps "" entry: the unknown type must be
  asked as 'default' by name; F16 is otherwise an equivalent mutant: [string]$null is '' and '' is no entry).
  `*watch*`: 44 passed, 0 failed (not red-checked for the param: every watch run failed on the unknown parameter
  before; the mutation check covers the new functions).
- Note: the times 17:39, 17:41 and 17:43 under Measured are estimates (no clock read then); 17:40:18 and 17:42:41 are from the tasks' own output.
- 17:57:47 LIVE CHECK (real scripts, real config, made-up session deadbeef-0000-4000-8000-00000000c0de, reset +20 min): `node limit-stop-server.mjs start ...` run from a Claude Code background task printed `LIMIT STOP SERVER STARTED | process 12748 | pipe \\.\pipe\claude-limit-stop-deadbeef-... | ends 18:47`; the task ended 0.34 s after it began. 17:58:45 hook as agent a1ive0000000000c0de (software-developer) of that session: the worker STOP FOR LIMIT text (95.2%, resets 18:17), stderr empty; second call: nothing; agent of session deadbeef-...-0000000000aa: nothing, stderr empty. Server: working set 35 MB, private 22.4 MB, no window. Log (real file %USERPROFILE%\.claude\state\limit-stop.log, did not exist before): 2 lines, listening + told. Then I stopped pid 12748 (mine) and deleted that log file (mine); scratch live folder removed.
- 17:59 hook time AFTER (same script, via run-heavy): median 79 ms (min 71, max 105); again median 78 ms (min 70, max 127). Before: 72 / 75 ms. So about +5 ms per tool call with no server.
- 17:59 docs: usage-limits.md done (words, LIMIT NEAR steps, the new session). Next: SKILL.md, start-messages.md; then mutation check, suites, doc check, report.
- 18:03 docs DONE: usage-limits.md (3 new words: named pipe, limit-stop server, hand-off; LIMIT NEAR section rewritten: the server line, no stop message unless NOT STARTED, deadline = the watch's 'until' time from leadStopFallbackMinutes, TaskStop fallback, hand-over lists each lead's hand-off; the new session starts leads from hand-offs), SKILL.md (what main sends leads; the LIMIT NEAR bullet), start-messages.md (Stop for the limit: only when NOT STARTED or at SESSION NEAR CAP, text asks for the ## Hand-off section and WORKER STOPPED; successor in a new session reads the hand-off). team-rules, worker-rules.md and lead-brief-template.md describe no stop message: unchanged. NOT mine and stale: agents\task-lead.md section 11 + line 224, agents\software-developer.md line 188 bullet, README Layout scripts line (exact text goes in the report).
- 18:03 parse check 0 errors on watch-session.ps1, watch-agent.ps1, the test file; node --check clean on 23 .mjs files.
- 18:03 mutation check STARTED in the background through run-heavy: <scratch>\G\mutate.ps1 with <scratch>\G\mutants.ps1 (51 mutants: S01-S22 server, L01-L08 lib, H01-H07 hook, C01-C03 requirePathSetting, W01-W08 watch, plus F's survivors E17, E42, F16; every old text checked to occur exactly once). Results <scratch>\G\mutation-results.txt, logs <scratch>\G\mut-logs\. Do not edit orchestrate-agents files while it runs (it copies the tree per mutant).
- To do after it: un-export SESSION_ID_PATTERN in lib\limit-stop.mjs if nothing imports it; tests for survivors; full suites; final diff review; report.
- 18:04 CONTEXT GUARD (322k of 400k): closing. No new point. Final suites started in the background through run-heavy (<scratch>\G\run-suites.ps1 -Tag final; they wait for the mutation run's slot); outputs <scratch>\G\node-final.txt and ps-final.txt.
- NOT done (each a next step): (a) tests for the expected survivors: S16 (start kills a server whose pipe did not answer: a case with limitStop.startCheckSeconds 0, then check the pipe stays gone), L02 (a server that answers a line and keeps the connection open: the hook must take the line at once, not time out); S15 (start sees its child exit at once) is reachable only by a race or a crash, so no natural test. (b) un-export SESSION_ID_PATTERN in lib\limit-stop.mjs (nothing imports it). Command that re-runs given mutants: pwsh -NoProfile -File <scratch>\G\mutate.ps1 -Only 'S16' (through run-heavy).
- 18:05-18:15 mutation run 1: S01-S10 ran (9 caught, S09 SURVIVED: the server's line-length guard; the oversized test request is not JSON, so it is refused either way). S11 HUNG the suite: with the window check gone, serve with --window '' listens for 2 hours and the test's runNode waits. I stopped my task b3sk8jmvd (TaskStop; no process from my copies left, checked by listing node/pwsh whose command line points into <scratch>\G\mut\). Driver now runs node --test with --test-timeout=60000 and takes a comma list.
- 18:18 FINAL SUITES (after the last code change, through run-heavy): Node 101/101; PowerShell 78 passed, 0 failed.
- 18:18 mutation run 2 started (task b607l05g1): S11-S22, L*, H*, C*, W*, E17, E42, F16 (41) into <scratch>\G\mutation-results-2.txt.
- 18:18-18:35 mutation runs 2 and 3 stalled on mutants that switch off an argument check (S11 window, L06 session id): the server then listens for 2 hours, the test fails on its 60 s timeout (S11's log shows the failure) but node --test waits for the stray child; I stopped my tasks b607l05g1 and bf1xu3nry (TaskStop; 0 processes left in my copies). Run 3 verdicts: S14 S17 S18 S19 S20 S21 L01 L03 L04 L05 caught; S15 S16 S22 L02 SURVIVED. S12, S13 (same hang class as S11) not run; S11 and L06 counted as caught by the test timeout, from their logs.
- 18:35 mutation run 4 started (task, results <scratch>\G\mutation-results-4.txt): L07 L08 H01-H07 C01-C03 W01-W08 E17 E42 F16.
- 18:48 mutation run 4: 23 of 23 caught (L07 L08 H01-H07 C01-C03 W01-W08, and F's E17, E42, F16 now caught).
- MUTATION TOTAL: 49 of 51 run, 44 caught, 5 survived (S09 server line-length guard: test gap; S15 start sees its child exit: race/crash only; S16 start kills a server that did not answer in time: test gap; S22 server answer without newline: equivalent with today's client; L02 hook takes the answer at the newline: test gap), 2 not run (S12, S13: same hang class as S11).
- 18:49 cleanup: mutation copies removed; no node or pwsh process left from my copies. Kept in <scratch>\G: scripts, result files and mutant logs, as evidence. Next: the report.
- 18:50 report written: G_REPORT_CLAUDE.md beside this file. Run closed.
