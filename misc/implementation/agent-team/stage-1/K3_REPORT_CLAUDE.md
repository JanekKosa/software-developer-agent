# Run K3 report: the session watch now wakes the main session when the limit-stop server fails

**Outcome: done.** Step 3 of run K's hand-off (the session watch and its tests) is built and checked in the scratch
copy, and the dead settings in the Node server test are gone. PowerShell suite green, Node suite green except the
one known scratch-copy failure, mutation check 29 of 29 caught. Nothing is installed or committed; the live repo
holds only this report and `K3_PROGRESS_CLAUDE.md`, whose `## Hand-off` gives K4 the exact texts the docs must
describe and the doc lines this change makes untrue.

## What is different now

- **No deadline for the leads.** The watch no longer reads `limitStop.leadStopFallbackMinutes` or prints "until
  23:15, then TaskStop each lead still silent". It says "Wait for LEAD STOPPED from every running lead, with no
  deadline." A settings file without the four old keys runs.
- **A server that did not start is told before the fallback.** After the server's NOT STARTED line the watch prints
  its own `LIMIT STOP SERVER FAILED | 00:04:31 | it did not start: <why>. Only now the fallback: ...`; the fallback
  is the lib's `SERVER_FALLBACK` word for word.
- **A server that dies during a hand-over wakes the session.** The restarted watch runs `limit-stop-server.mjs check`
  at each look (every minute). On FAILED it ends with that line and "Start this watch again now; it does not report
  this failure twice." Example: the server is killed at 00:20; at the next look the idle main session is woken with
  the FAILED line.
- **A check that cannot check also wakes it**, with that line and "The session watch cannot tell whether the
  limit-stop server still works. Start this watch again now: it checks again at its next look." (decision 1).
- **The watch is started again at the context cap too.** At SESSION NEAR CAP it first writes a cap hand-over to its
  decision file (window `context-cap`, no reset), so the restarted watch stays quiet and only checks the server.
- **Every hand-over line names the server's stop**: LIMIT NEAR, SESSION NEAR CAP and SESSION RESET COLD add "and in
  the same step stop the limit-stop server: node '<skill>\scripts\limit-stop-server.mjs' stop --session <id>".
- **During a hand-over the watch announces nothing else** (no SESSION NEAR CAP, no new usage decision), and while the
  usage limit stops the session it runs no check.

## Files (scratch copy `<scratch>\K\repo\orchestrate-agents`)

`<scratch>` is `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`.

- `scripts\watch-session.ps1`: the behaviour above. Its node call is now one helper shared by the start and the
  check, with the same rule as before (the last line must match, else a NOT STARTED or NOT CHECKED line).
- `tests\limit-scripts.tests.ps1`: the stand-in server answers `start` and `check`; 9 cases changed, 8 added.
- `tests\scripts\limit-stop-server.test.mjs`: the four dead keys at lines 50-53 removed.
- Outside the diff: backups of the three files before my change, the suite outputs and the mutation script, all in
  `<scratch>\K3\` (the scratch copy has no `.git`). No process of mine runs (no limit-stop server, listed at 01:09).
  An empty test folder that one mutation run left in `%TEMP%` (00:45) was removed; most likely a clean-up race, not
  checked further.

No settings added; the watch reads no `limitStop` setting now.

## Checks (all after the last change)

- PowerShell suite (01:04-01:08): 100 passed, 0 failed. Before my change: 74 passed, 18 failed (WATCH FAILED on the
  missing key).
- Node suite (`node --test --test-concurrency=1 'tests/**/*.test.mjs'`): 145 tests, 144 pass; the failure is the
  known scratch-copy one ("the shipped settings show this repo's register in every chat"). `node --check` clean.
- Red first: with the tests written and only the old setting's read removed, 38 passed and 13 failed, each for the
  expected reason.
- A case with the real server, run from a private copy of scripts and lib with its own pipe prefix and log: quiet
  while it runs; killed, the watch ends with FAILED and the restart line; the stop command exactly as printed stops a
  second server; both watches started again stay quiet.
- Both PowerShell files parse with 0 errors.
- Mutation check (`<scratch>\K3\mutate.ps1`): 29 of 29 caught, every mutant parsed and loaded. One was not applied in
  the main run (a slip in my script) and was run again alone: caught. Two cases added beforehand each catch a mutant
  no other case does (RUNNING ALREADY at the cap; the not-started time given in UTC).

**Not tested:** a live main session woken by the watch (no sessions may be started; K4's live check covers it); the
docs (K4); hook timing (I changed no hook or server code).

## Risky or undecided points

- **A check that keeps failing wakes the main session about once a minute.** Example: the log is locked for ten
  minutes during a cap hand-over; the idle main session is woken about ten times. I chose this over silence because
  the user wants the main session told. Recommendation: keep it; the case is rare.
- **A session that handed over keeps a quiet watch**, even after the reset has passed. Example: a hand-over at 14:00
  for a 15:00 reset; at 15:30 the window trips again in the same chat; the watch stays quiet. Under the protocol the
  session ended at the hand-over, and usage-limits.md step 7 stops that watch with TaskStop.
- The usage path's old guard "a hand-over on record is never announced twice" can no longer be reached. I left it:
  harmless, and outside the change.

## What I learned

- The scratch config's `limitStop.logFile` is the machine's live log (`%USERPROFILE%\.claude\state\limit-stop.log`),
  and the server reads the settings beside its own folder. Any check with the real server must use a private skill
  copy, as the new case does.
- usage-limits.md step 7 (TaskStop the restarted watch once the relaunch is scheduled) matters more now: that watch
  runs a node check every minute until stopped.

DECISIONS TAKEN: (1) a check that cannot check ends the watch with its line and "Start this watch again now", not silence as K's hand-off said, because the user wants the main session told; (2) any hand-over on record, cap or usage and even past its reset, puts the watch in check-only mode, not only a usage hand-over with its reset ahead, because the server now lives as long as the hand-over; (3) `Read-DecisionRecord` does not return `Window` as K's hand-off listed, because nothing reads it; (4) the FAILED line for a server that did not start is a line of its own before the steps (four lines), not the start of one long line, so `LIMIT STOP SERVER FAILED |` starts a line wherever it comes from; (5) the stop clause uses the hook's wording "and in the same step stop the limit-stop server: node '...' stop --session <id>", not K's shorter form
INITIATIVES: (1) a PowerShell case that runs the real limit-stop server from a private skill copy (start, kill, check, the printed stop command); (2) the watch's node call moved into one helper shared by start and check, behaviour unchanged; (3) the watch's header comment rewritten for the new lines and the server's missing end time
ISSUES FOUND: (1) the scratch copy's `limitStop.logFile` is the machine's live log, so a check with the real server needs a private skill copy (done in the new case); (2) doc lines made untrue by this change are listed for K4 in my progress file's hand-off (SKILL.md 146-167, usage-limits.md 86-150, start-messages.md 33, limits-and-caps-guide.html 568); (3) a check that cannot check wakes an idle main session about once a minute while the cause lasts
QUESTIONS: none
