# Run K3: the session watch checks the limit-stop server (progress file)

Started 2026-10-25 23:46 (clock). Worker started directly by the main session; report to it. Never commit.

## Files I own (all in the scratch copy `<scratch>\K\repo\orchestrate-agents\`)

`<scratch>` = `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`

- `scripts\watch-session.ps1`
- `tests\limit-scripts.tests.ps1`
- `tests\scripts\limit-stop-server.test.mjs` (only the dead keys at lines 50-53)

Read-only for me: everything else, the live repo above all (its hook and watch are live). Nothing gets installed.

## Read so far

K_TASK, the Hand-off sections of K and K2 progress files, the three skills, the repo's CLAUDE.md; by range: the
watch (all of its main part and lines 1-80, 150-190, 407-671), the server's header, start, check and stop, the lib's
LOG, SERVER_FALLBACK and serverFailedLine, the PS test harness (1-60, 138-262) and its watch tests (684-1091).

## Baseline (23:50-23:55; the times "23:58" first written here were guessed, corrected at 23:56)

Backups of my three files before any change: `<scratch>\K3\` (watch 23260EE1..., PS tests 6803C10C..., node test
ABF03386... by SHA-256). The scratch copy has no `.git`, so the backups are the diff base.
- PS suite: 74 passed, 18 failed; all 18 are "watch run" cases ending in WATCH FAILED (no key
  `limitStop.leadStopFallbackMinutes`), as K2 said. Output `<scratch>\K3\baseline-ps.txt`.
- Node suite (`node --test --test-concurrency=1 'tests/**/*.test.mjs'`): 145 tests, 144 pass, 1 fails: the known
  "the shipped settings show this repo's register in every chat". Output `<scratch>\K3\baseline-node.txt`.

## Plan (23:50)

Watch (`scripts\watch-session.ps1`):
1. Drop the `limitStop.leadStopFallbackMinutes` read and every "until <time>, then TaskStop" text.
2. One helper `Invoke-StopServer` runs the server in a mode and returns its last line when it matches the mode's
   pattern, else a `<head> | node exited with <code> and said: ...` line (same rule Start-LimitStopServer has today,
   so its behaviour is unchanged). `Start-LimitStopServer` uses it; new `Invoke-LimitStopCheck` uses it for `check`.
3. Decision record: `Write-DecisionRecord` writes `resetsAt`/`percent` null for a window without them;
   `Read-DecisionRecord` reads a null `resetsAt` and returns `Window`.
4. At SESSION NEAR CAP: write a cap record (hand-over, window context-cap, resetsAt null) before starting the server.
5. Each look, after the stop-error branch: a record with decision hand-over -> run `check`; FAILED -> print it and
   `Start this watch again now; it does not report this failure twice.`, exit 0; FINE -> `continue` (no SESSION NEAR
   CAP and no usage part during a hand-over); anything else (NOT CHECKED, no node, odd output) -> print that line and
   a sentence, exit 0 (see decision 1).
6. Steps lines (LIMIT NEAR and cap): "Start this watch again now" first in both; the server sentence when it runs;
   "Wait for LEAD STOPPED from every running lead, with no deadline."; the relaunch "and in the same step stop the
   limit-stop server: node '<StopServerScript>' stop --session <id>". NOT STARTED: a separate line `LIMIT STOP SERVER
   FAILED | <HH:mm:ss> | it did not start: <why>. <SERVER_FALLBACK>` before the steps line (4 lines in all).
   RESET COLD gets the same stop clause after `-At now`.
7. The header comment says the new behaviour (no fixed end; the check; restart at the cap).

Tests (`tests\limit-scripts.tests.ps1`), red first: the stub answers `check` (LIMIT_TESTS_STUB_CHECK_SAYS, default
`LIMIT STOP SERVER FINE | stub`, counts calls in `stub-check-<session>.txt`), writes `stub-args-` only for start, and
its default STARTED line has no "ends"; tests at 786, 815, 865, 917, 944, 950-965, 975-993, 996, 1056 changed; new:
the cap record round trip, restarted at the cap (and during a usage hand-over over the warning size) stays quiet and
checks, FAILED check ends the watch with two lines, a check that cannot check ends it with its line, no check during
a limit stop, the PS fallback text equals the lib's SERVER_FALLBACK (read through node).

Node test: drop the four dead keys at lines 50-53.

## Done (23:56-00:10)

- Tests written first; red run (`-Only 'watch*'`, with only the config read of `leadStopFallbackMinutes` removed so
  the watch starts): 38 passed, 13 failed, each for the expected reason (missing `Write-CapRecord` /
  `Format-NotStartedLine`, old texts, no cap record, no check). Output `<scratch>\K3\red-ps.txt`.
- Watch built as planned (points 1-7). Green run `-Only 'watch*'`: 51 passed, 0 failed (`<scratch>\K3\green-ps.txt`).
- Added a round-trip case with the REAL server (a copy of scripts + lib with its own pipe prefix and log in the work
  folder, so the machine's log and pipes are untouched): quiet while it runs; killed -> the watch ends with FAILED +
  the restart line; the printed stop command, run by Invoke-Expression, stops the other one (STOPPED); both watches
  started again stay quiet. It passes (1 of 1). A first failure was the test's own `$watch` overwriting `$Watch`
  (case-insensitive names); renamed `$watching`.
- Node test: the four dead keys removed.
- Not used from K's hand-off: `Read-DecisionRecord` does not return `Window` (nothing reads it; decision 3).
- Mutation check found nothing yet; before it, two tests added for mutants I expected to survive: RUNNING ALREADY at
  the cap (Test-ServerRuns) and the not-started time given in UTC (ToLocalTime).
- Full suites after the watch and test changes (00:07-00:11): PS 99 passed, 0 failed (`full-ps.txt`); Node 145
  tests, 144 pass, 1 known scratch-copy failure (`full-node.txt`). Two PS cases were added after that run and passed
  on their own (00:13); the closing run covers all.

- Mutation check (00:15-01:04, `<scratch>\K3\mutate.ps1`, each mutant against `-Only 'watch*'`): 29 of 29 caught.
  The main run said "28 of 29" because M23 was not applied (its pair array was flattened by PowerShell); fixed and
  rerun alone: caught (`mutation.txt`, `mutation-m23.txt`). No mutant failed to parse or load.
- Closing run after the last change (01:04-01:08): PS 100 passed, 0 failed (`final-ps.txt`); Node 145 tests, 144
  pass, 1 known scratch-copy failure (`final-node.txt`); both PS files parse with 0 errors; `node --check` of the
  Node server test exit 0.
- Clean-up: no limit-stop-server node process runs (listed 01:09); an empty `%TEMP%\limit-scripts-tests-bfedfd19`
  (created 00:45 during the mutation run, one empty `projects-*` folder, no links) removed; most likely a clean-up race
  in one mutant's run, not checked further. The mutation's skill copy was removed by the script.

## Decisions

1. A check that cannot check (NOT CHECKED, no node, odd output) ends the watch with that line and "The session watch
   cannot tell whether the limit-stop server still works. Start this watch again now: it checks again at its next
   look." Other choice: carry on silently (K's hand-off said "otherwise continue"). Why: the user's words "main agent
   needs to be informed that it failed"; silence would hide that the watch can no longer wake the session on a
   failure. Cost: if the cause lasts, each restart says it again about a minute later.
2. Any hand-over on record (cap or usage, even one whose reset has passed) puts the watch in check-only mode. Other
   choice: only a usage hand-over whose reset is ahead (the old "on record" rule). Why: the server now lives until
   the hand-over ends, not until the reset (task point 4), so the check must too; and nothing is announced twice.
   Effect: a session that handed over and is then used again keeps a quiet watch (the main session stops that watch
   with TaskStop after the relaunch anyway, usage-limits.md step 7).
3. `Read-DecisionRecord` does not return `Window`: nothing reads it (Karpathy: no speculative fields).
4. When the server did not start, the FAILED line is a line of its own (4 lines in all) before the steps line, and
   the steps line then has no server sentence. Other choice: one long third line. Why: the main session and the docs
   can treat `LIMIT STOP SERVER FAILED |` as a line start in all three places it comes from (hook, check, watch).
5. The steps say "and in the same step stop the limit-stop server: node '<script>' stop --session <id>" (the hook's
   wording) rather than K's shorter "and in the same step node '...' stop ...".
6. The watch's copy of SERVER_FALLBACK is held to the lib's by a test that imports the lib with node (exact
   equality), not by a text search of the .mjs file (the JS source escapes the apostrophe).

## Hand-off (for K4)

**Done and checked:** K's step 3 (the watch and its tests) and the dead keys of the Node server test. Nothing of
step 3 is left. Nothing is installed; the live repo has only this file and my report. Checks: see "Done" above
(PS 100/100, Node 144/145 with the known failure, mutation 29 of 29).

**Left for K4 from the checks list:** the docs and doc check, the hook-time run, the live check without agents (the
watch's FAILED line is already shown against the real server by the PS case "with the real limit-stop server ..."),
and the install with a hash list before and after. When installing: the new PS case copies `scripts` and `lib` from
beside the tests into its work folder, so it never touches the machine's pipe or log.

**State of the scratch copy** (`<scratch>\K\repo\orchestrate-agents`), beyond K's and K2's changes:
- `scripts\watch-session.ps1`: changed as below. LF line endings, no BOM (as before).
- `tests\limit-scripts.tests.ps1`: the stub answers `start` and `check`; tests changed and added (see the report).
- `tests\scripts\limit-stop-server.test.mjs`: the four old keys at lines 50-53 removed.
- Backups of my three files before my changes: `<scratch>\K3\` (watch-session.ps1, limit-scripts.tests.ps1,
  limit-stop-server.test.mjs). The diff base, since the scratch copy has no `.git`.
- Still red in a scratch copy only: Node "the shipped settings show this repo's register in every chat".

**The watch's texts, for the docs** (`<StopServerScript>` is `<skill>\scripts\limit-stop-server.mjs`, `<scripts>` the
watch's own folder):
- At SESSION NEAR CAP (3 lines with a running server, 4 without): the marker line (unchanged); the server's own line;
  only when it did not start, `LIMIT STOP SERVER FAILED | <HH:mm:ss> | it did not start: <text after "LIMIT STOP
  SERVER NOT STARTED | ">. <SERVER_FALLBACK>`; then the steps: `Start this watch again now: the hand-over on record
  keeps it quiet, and it wakes you if the limit-stop server fails or, if the limit stops the session first, after the
  reset.` + (server runs) `The limit-stop server tells every agent of this session to stop at its next tool call: send
  no stop message.` + `Wait for LEAD STOPPED from every running lead, with no deadline.` + `Then write the hand-over,
  listing every lead's hand-off, and run & '<scripts>\schedule-relaunch.ps1' -ProjectDir <project folder>
  -HandoverPath <hand-over file> -ContextCap, which starts a new chat with Read <hand-over> and carry on, and in the
  same step stop the limit-stop server: node '<StopServerScript>' stop --session <id>; then end the session. The
  context-guard hook may say SESSION NEAR CAP and STOP FOR LIMIT too; they mean the same.` "Do not start this watch
  again" is gone: the main session starts it again at the cap too.
- Before starting the server at the cap the watch writes the cap hand-over to its decision file
  (`%TEMP%\claude-session-watch-<id>.decision.json`: decision hand-over, window context-cap, percent and resetsAt
  null, no agents).
- At LIMIT NEAR (3 or 4 lines): marker, server line, the FAILED line only when it did not start, then the same opening
  and `Then write the hand-over, listing every lead's hand-off, and run & '<scripts>\schedule-relaunch.ps1'
  -ProjectDir <project folder> -HandoverPath <hand-over file> -At <reset, ISO>, and in the same step stop the
  limit-stop server: node '<StopServerScript>' stop --session <id>.` No deadline, no TaskStop of leads.
- SESSION RESET COLD now ends `... -At now, and in the same step stop the limit-stop server: node '...' stop --session
  <id>. If that hand-over is written and a relaunch is scheduled already, end the session.`
- During any hand-over on record (cap or usage), at each look, after the stop-error branch, it runs `node <StopServerScript> check --session <id>`. FINE: quiet (no SESSION NEAR CAP, no usage decision). FAILED:
  the check's own line, then `Start this watch again now; it does not report this failure twice.`, and the watch ends
  (the check logged "told the main session ... (by the session watch)", so neither it nor the main session's hook
  says it again). NOT CHECKED, no node, or anything else: that line (`LIMIT STOP SERVER NOT CHECKED | <why>`, made by
  the watch when the check did not print one), then `The session watch cannot tell whether the limit-stop server
  still works. Start this watch again now: it checks again at its next look.`, and the watch ends.
- While a usage-limit or server error stops the session, no check runs (the stop-error branch comes first).
- The watch reads no `limitStop` setting any more.

**Doc lines my change makes untrue** (scratch copy line numbers; K4 owns the docs; the guide is only listed):
- `SKILL.md` 146-150 (deadline, TaskStop of a silent lead, "Do not start the watch again" at the cap), 159-167.
- `references\usage-limits.md` 86-104 (step 2's deadline and step 4's TaskStop of leads), 123 (during a usage
  hand-over the restarted watch no longer ends with SESSION NEAR CAP; it can end with LIMIT STOP SERVER FAILED or NOT
  CHECKED), 134 ("Do not start the watch again" at the cap), 137-138, 150.
- `references\start-messages.md` 33 (a lead stopped with TaskStop).
- `references\limits-and-caps-guide.html` 568 ("The helper service does not start: The watch says so. The main chat
  sends STOP...": now it says LIMIT STOP SERVER FAILED first), and any sentence about the watch not being restarted
  at the cap or about a lead deadline (not swept line by line).
- usage-limits.md step 7 (stop the restarted watch with TaskStop once the relaunch is scheduled) stays true and
  matters more now: the restarted watch checks each minute until then.
