# Run K: progress

Started 22:47 (clock read). Task: `K_TASK_CLAUDE.md`. Report: `K_REPORT_CLAUDE.md`. Reporting to the main session.

## Files I own (all under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`)

- Code: `scripts\limit-stop-server.mjs`, `lib\limit-stop.mjs`, `hooks\context-guard.mjs`, `scripts\watch-session.ps1`,
  `orchestration.config.json`.
- Tests: `tests\scripts\limit-stop-server.test.mjs`, `tests\hooks\context-guard.test.mjs`,
  `tests\limit-scripts.tests.ps1`.
- Docs: `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`.
- Not mine, read only: `references\limits-and-caps-guide.html` (list its untrue sentences), `agents\*`, every
  `CLAUDE.md`.

## Baseline (22:47-22:54)

- `git status --short`: the whole repo shows untracked (`??` for every top folder): no commits to compare against,
  so the hash list is the baseline: 132 files hashed into `<scratch>\K\baseline-hashes.txt`.
- No links in the repo (`dir /AL /S /B`: File Not Found). No `limit-stop.log`, no `claude-limit-stop*` pipe, no
  `ClaudeRelaunch` task. Six node processes running, none mine (ids 7184, 11152, 11424, 11628, 14228, 17384).
- This session: CLAUDE_PID=10612, so Claude Code sets it.
- Scratch copy of the repo (no `.git`): `<scratch>\K\repo`. I build there and install at the end (the hook is live).
- `<scratch>` = `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`.

## Plan (22:58)

Design, one source each:
- **Failure channel = the server's existing log** (`limitStop.logFile`), no new file. `lib/limit-stop.mjs` becomes the
  one writer and reader of it (the server's `appendLog` moves there). Lines per session: `listening on ...` starts a
  hand-over's epoch; `stopped by the main session; exiting` and `... process N is gone; exiting` end it normally;
  `the pipe failed: ...` ends it badly; new `error for <who>: <reason>` is written by any hook (agent or main) or the
  watch's check that got a failed answer (not ENOENT); new `told the main session that the server failed (by ...)`
  makes the telling once per epoch.
- `findServerFailure(lines, pipeResult, now)` (pure, in the lib): after the last `listening` line and before a normal
  end: the first `error for` or `pipe failed` line; else, with a listening line and no end, ENOENT now = gone; a
  failed query now = failure. Nothing once `told the main session` is in the epoch.
- Main session's hook: asks the pipe as main (as now), then reads the log tail (new `limitStop.logTailKB`), and adds
  `LIMIT STOP SERVER FAILED | HH:mm:ss | <what>. <fallback>` once, logging the "told" line.
- Agent's hook: a failed answer -> logs `error for agent <id> (<type>)` and adds one line telling it to carry on
  with the last stop text, if any. ENOENT stays silent.
- New server modes: `check --session <id>` (one line, FINE or FAILED; claims the telling) for the watch; `stop
  --session <id>` (asks the server to log and exit, confirms the pipe is gone). New requests `{"role":"check"}`,
  `{"role":"stop"}`.
- Server: told once per agent (no repeat); no end time (`endMarginMinutes`, `capEndMinutes`,
  `leadStopFallbackMinutes`, `repeatAfterCalls` removed); `--claude-pid` required, so it always ends with the
  session; the `listening` line must be written or serve exits 4 (start: NOT STARTED), since it is the channel.
- Watch: no deadline; at SESSION NEAR CAP writes a cap hand-over record (window `context-cap`, no reset) and tells
  main to start it again; with any hand-over on record it only runs `check` each loop (after the stop-error branch)
  and ends with the FAILED line; NOT STARTED is worded failure-first; texts carry the stop command; RESET COLD line
  carries it too.
- Texts: main waits for every LEAD STOPPED with no deadline; fallback only after FAILED.

Proof: red tests first in all three suites; both suites at the end; parser; node --check; hook time 20 runs before
and after; live check (real server in a scratch skill copy, made-up session, killed; main hook text and watch line);
mutation check; doc check incl. the guide page's untrue sentences.

## Done (23:00-23:11), all in the scratch copy `<scratch>\K\repo\orchestrate-agents`, nothing installed

- Hook time BEFORE (installed hook, 20 runs, no server, 2 MB transcripts below warn, script `<scratch>\K\time-hook.mjs
  <hook> <label>`): main median 67 ms (max 169), agent median 67 ms (max 76).
- `tests\scripts\limit-stop-server.test.mjs` rewritten: 30 tests. RED on the old server: 22 of 30 failed (8 passed,
  the unchanged behaviour). The old settings (repeatAfterCalls 2, endMarginMinutes 0, capEndMinutes 0.02,
  leadStopFallbackMinutes 15) are set small in the test world, so a server that still obeyed them fails.
- `lib\limit-stop.mjs`: added `serverStopCommand`, `LOG` texts, `SERVER_FALLBACK`, `logSettings` (reads
  `limitStop.logFile` and new `limitStop.logTailKB`), `appendLimitStopLog`, `assertLogWritable`, `readSessionLog`,
  `findServerFailure`, `describeServer`, `serverFailedLine`, `agentFailedLine`. askLimitStop unchanged.
- `scripts\limit-stop-server.mjs` rewritten: modes start/serve/check/stop; told once (Set), no AGAIN text; no end time;
  `--claude-pid` required; log must be writable before listening (exit 4, start: NOT STARTED naming the log); stop
  request logs `stopped by the main session; exiting` and exits; STARTED line now ends `| until stop or the end of
  Claude Code process <pid>`; main text: no deadline, "if you are told LIMIT STOP SERVER FAILED meanwhile, do what it
  says", the stop command with the session id.
- GREEN: the 30 server tests pass (23:03, run-heavy, 0:23).
- `tests\hooks\context-guard.test.mjs`: only `makeWorld` changed (logTailKB 64, processCheckSeconds 1, no
  capEndMinutes; env CLAUDE_PID = the test process's own pid). No new hook test written yet.

## Checks at the stop (23:07-23:11, run-heavy, scratch copy)

- Node: 128 of 134 pass. Failing: 25, 27, 29, 30, 32 of `context-guard.test.mjs` (the hook is not changed yet: old
  texts; 25 spawns serve without --claude-pid, which the server now refuses; 29 relies on capEndMinutes) and 39 of
  the register tests (the known scratch-copy artefact: it pins the setting to the repo the skill sits in, J's report).
- PowerShell: 92 passed, 0 failed (its files are unchanged in the copy).
- Leftovers: none (node ids as at the baseline, no `oa-test-*` pipe, no live `limit-stop.log`).
- NOT run: parser (no .ps1 changed), mutation check, live check, doc check, hook time after.

## Hand-off

Stopped at the context guard's warning (320k of 400k) after about 45 tool calls; the reading-in (a 41 KB watch, two
big test files) cost most of it. A successor should read only this file, the task file, the scratch copy's new
`lib\limit-stop.mjs` and `scripts\limit-stop-server.mjs` (the contract), and by range the files below.

**Done and checked:** the server and the lib (30 of 30 server tests, red first). **On disk but unchecked:** the two
`makeWorld` edits in the hook test. **Nothing is installed**: the live repo is untouched apart from this file and the
report. Do not install a part: the new server requires `--claude-pid`, which the live watch and hook pass only when
they have one, and its texts no longer match the watch's.

**Left, in order** (all in the scratch copy, then install the whole set):
1. Hook tests, red first (`tests\hooks\context-guard.test.mjs`): agent with a failed answer gets
   `agentFailedLine` + the size text and an `error for agent <id> (<type>): <reason>` log line (rewrite the "broken,
   oversized, cut or late answer" test); a log that cannot be written gives the "could not be written" variant; main
   session: server killed during a hand-over -> FAILED once ("it is gone ..."), then ''; an agent's logged error
   reaches main's next call; after `stop` nothing; main's own failed query -> FAILED; another session's lines tell
   nothing; NOT STARTED at the cap (CLAUDE_PID '') -> SESSION NEAR CAP holds `LIMIT STOP SERVER FAILED | <hh:mm:ss> |
   it did not start: --claude-pid is missing. <SERVER_FALLBACK>`; update `nearCapPattern`, `SERVER_RUNS`, the
   cap-main ending (`..., and in the same step stop this server: node '<server>' stop --session <id>. Then end the
   session.`), test 25 and 30 (serve needs `--claude-pid String(process.pid)`), test 32 ('junk' -> NOT STARTED).
2. Hook code (`hooks\context-guard.mjs`): agent path: on `failed` append the error line (lib) and add
   `agentFailedLine(reason, logged, now)` before the size text; ENOENT silent as now. Main path: after the main
   query, if it failed append `error for the main session: <reason>`; read `readSessionLog`; `findServerFailure(lines,
   asked, 'the main session', now)`; if found, append `told the main session that the server failed (by the
   context-guard hook)` and add `serverFailedLine`; order [stop text, failure line, size text]; a log read error is one
   stderr line. `nearCapMessage`: running -> "..., and wait for LEAD STOPPED from each running lead, with no
   deadline, before you write the hand-over."; not started -> the FAILED line with `it did not start: <why>`; tail:
   relaunch + "and in the same step stop the limit-stop server: <serverStopCommand>. The session watch ends with
   SESSION NEAR CAP too; both mean the same. Start it again then: it stays quiet, and wakes you if the limit-stop
   server fails."
3. Watch (`scripts\watch-session.ps1`) and `tests\limit-scripts.tests.ps1`: drop `leadStopFallbackMinutes`; stub
   server answers `check` (print `LIMIT_TESTS_STUB_CHECK_SAYS`, default `LIMIT STOP SERVER FINE | stub`, count calls
   in `stub-check-<session>.txt`; write `stub-args-` only for start; default STARTED line without "ends");
   `Read-DecisionRecord` takes a null `resetsAt` and returns `Window`; at SESSION NEAR CAP write a cap record
   (`decision hand-over, window context-cap, resetsAt null`) before starting the server; each loop, after the
   stop-error branch: a hand-over record -> `node <StopServerScript> check --session <id>`; FAILED -> print it, then
   `Start this watch again now; it does not report this failure twice.`, exit 0; otherwise `continue` (no SESSION NEAR
   CAP, no usage part during a hand-over). Steps lines: no "until"/"TaskStop each lead"; "Wait for LEAD STOPPED from
   every running lead, with no deadline."; NOT STARTED -> `LIMIT STOP SERVER FAILED | <HH:mm:ss> | it did not start:
   <why>. <the same SERVER_FALLBACK sentence>`; "Start this watch again now" also at the cap; both steps and the RESET
   COLD line add "and in the same step node '<StopServerScript>' stop --session <id>". Tests to change: lines 786, 815,
   865, 917, 944, 950-965, 975-993, 996 (now: a config without the old keys runs), 1056 (delete the cap record
   between its two runs); new: restarted at the cap stays quiet and checks; FAILED check ends the watch with two lines;
   no check during a limit stop; the PS fallback string is contained verbatim in `lib\limit-stop.mjs`.
4. Config: remove `repeatAfterCalls`, `endMarginMinutes`, `capEndMinutes`, `leadStopFallbackMinutes` (+ their
   `_why`); add `logTailKB` 256 with a `_why` (the log tail the main session's hook and the check read for the
   session's lines; a hand-over writes about 15 lines); update `_about`, `_whyProcessCheckSeconds` (no end time now),
   `_whyConnectTimeoutMs` if needed.
5. Docs: SKILL.md (Sizes, Usage limits, The lines), usage-limits.md (no deadline steps 2-4 and the cap steps; the
   server lives until stop or the process ends; FAILED line and fallback; what happens when the limit runs out first:
   the restarted watch's SESSION RESET COLD after the reset, hand-over from files, the user sees ...), start-messages.md
   (fallback only after LIMIT STOP SERVER FAILED; successor without hand-off: cut off by the limit, not TaskStop).
6. Checks: both suites, parser, node --check, hook time after (`node <scratch>\K\time-hook.mjs <hook> after`), live
   check, mutation check, doc check (grep repo outside misc for AGAIN, repeatAfterCalls, leadStopFallback,
   endMarginMinutes, capEndMinutes, "until", "TaskStop each lead"), list the untrue sentences of
   `limits-and-caps-guide.html`, then install with a hash list before and after.
