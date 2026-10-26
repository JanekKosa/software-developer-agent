# Run K2 progress (carries on from run K's hand-off, steps 1, 2 and 4)

Started 2026-10-25 23:13. Started by the main session (no lead). Never commit. Work only in the scratch copy
`<scratch>\K\repo` (`<scratch>` = `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`).
Nothing installed into the live repo.

## Files I own (all in `<scratch>\K\repo\orchestrate-agents\`)

- `tests\hooks\context-guard.test.mjs` (step 1)
- `hooks\context-guard.mjs` (step 2)
- `orchestration.config.json` (step 4)
- Read only: `lib\limit-stop.mjs`, `scripts\limit-stop-server.mjs` (K's contract; changed only if a step needs it, said here)

## State on disk at start (23:13)

Newest in the scratch copy: `tests\hooks\context-guard.test.mjs` 23:06:26 (K's two unchecked `makeWorld` edits),
`scripts\limit-stop-server.mjs` and `lib\limit-stop.mjs` 23:05:27, `tests\scripts\limit-stop-server.test.mjs`
23:00:47. `hooks\context-guard.mjs` 20:17:01 (untouched by K). No links in the tree. `<scratch>\K\orig` is K's copy
of the skill folder before its changes (the hook at `orig\hooks\context-guard.mjs`).

Read: the task file, K's `## Hand-off`, the lib and the server in full, the hook in full, the hook test by range
(1-125, 225-261, 300-637), the config's `limitStop` part. Not read (the main session said "and no more"): the
vendored skills my agent file lists, the repo's CLAUDE.md files.

Commands: Node suite `node --test` in `orchestrate-agents\`; one file `node --test tests\hooks\context-guard.test.mjs`;
PS suite `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` (about 2 min). Heavy ones through the live repo's
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600 -Command '...'`. The test output goes to files in
`<scratch>\K2-out\` (`--test-reporter=tap`, then grep `^not ok|^# (tests|pass|fail)`).

## Plan (written about 23:20)

Step 1, tests first (hook test): agent failed answer -> `LIMIT STOP SERVER FAILED | hh:mm:ss | this hook got an error
...` + the size text, a log line `error for agent <id> (<type>): <reason>`; log not writable -> the "could not be
written" variant; main: server killed -> FAILED once ("it is gone ..."), then nothing; an agent's logged error
reaches main's next call; after `stop` nothing; main's own failed query -> FAILED; another session's lines tell
nothing; NOT STARTED at the cap -> the FAILED line inside SESSION NEAR CAP; new SESSION NEAR CAP wording (no
deadline, stop command, watch restart); the server's new cap-main ending; serve tests pass `--claude-pid`.
Step 2, hook: as K's hand-off step 2. Step 4, config: drop the four old keys, add `logTailKB` 256, update the notes.
Proof: the hook test file red first, then green; the whole Node suite at the end; `node --check`; mutation check of
the changed hook lines.

## Done (23:13-23:38; the times I first wrote here were guessed and ran ahead of the clock, corrected at 23:38)

- Baseline of the hook test file with K's two `makeWorld` edits: 33 tests, 28 pass, 5 fail (25 end to end, 27 main
  past warn, 29 cannot start, 30 usage-limit server, 32 CLAUDE_PID), all from K's server changes.
- Measured (Node 24.13.0, this machine): a directory opened as a log reads as empty (fstat 0, a zero read gives 0, no
  error); a log path under a file is ENOENT; appending to a directory is EISDIR; an ACL deny of read data `(RD)`
  gives EPERM on open for read while append and delete still work. So the "log cannot be read" test denies `(RD)`
  with icacls on its scratch log and removes the deny in a finally.
- Step 1 written, red: 42 tests, 31 pass, 11 fail (the new and changed ones). The two that pass against the old hook
  ("after stop ... nothing", "another session's lines") guard against telling too much, so they pass by design.
  Added later, before the code: "an agent id the server would refuse is never sent" (red shown by its mutant).
- Step 2: hook rewritten as K's step 2, plus the agent-id check. Step 4: config's four old keys and their notes gone,
  `logTailKB` 256 added, `_about`, `_whyConnectTimeoutMs`, `_whyProcessCheckSeconds`, `_whyStartCheckSeconds`,
  `_whyLogFile` updated. Lib: `formatStamp` exported, `AGENT_ID_PATTERN` added; the server's `parseRequest` uses it
  instead of its own copy of the pattern.
- Measured: reading a 256 KB window of a 1 MB log for one session, median 1.35 ms, max 5.9 ms of 20 (script
  `<scratch>\K2-out\time-log-read.mjs`).
- Green: `node --check` of hook, lib, server; config parses; hook test file 44 of 44 (two tests added after the first
  green run: main past warn with its own failure, order FAILED then SESSION NEAR CAP; pipePrefix missing in main).
- Whole Node suite (before the last two tests were added): 144 tests, 143 pass; the 1 failure is
  `decision-reminder.test.mjs` "the shipped settings show this repo's register in every chat": it compares the
  config's `decisionRegister.showInEveryChat` (the live repo path) with the repo it runs in (the scratch copy), so it
  fails only in a scratch copy.
- Mutation check of the hook's changed lines (`<scratch>\K2-out\mutate.mjs`, a copy of the skill folder, removed
  after): 24 of 24 caught, none survived.
- Hook time with no server (`<scratch>\K\time-hook.mjs`, 20 runs each, twice): before (K's orig) main 71/76 ms median,
  agent 74/75; after main 67/68, agent 68/68. No slowdown. The real log `%USERPROFILE%\.claude\state\limit-stop.log`
  does not exist; nothing wrote it.

## Decisions

- CLAUDE_PID missing or not a number at the cap: the hook starts no server and says why in its own words
  ("CLAUDE_PID, the id of the session's Claude Code process, is not set, and the server needs it to end with the
  session"), instead of K's plan (spawn the server and pass on its "--claude-pid is missing"). Reason: the main
  session reads it, and the raw argument name says nothing about what to fix; it also saves a Node start.
- A failed query still writes its one stderr line as before (kept for the transcript view); a log that cannot be
  written or read adds one more.
- An agent id the server would refuse (not `[\w-]{1,128}`) is never sent: before, a refused request was only a
  stderr line; now a failed query alarms the main session, so a request the hook built wrongly must not look like a
  failure of the server.
- A log that cannot be read counts as no lines, so the main session's own failed query still reaches it (then on
  every call, since the told line cannot be read back either: repeated rather than silent).
- An agent whose queries keep failing is told on each failing call (one line each) and each failure is logged; the
  main session is told once per server.

## Closing (23:38-23:45)

- Last runs, after the last change: Node suite 145 tests, 144 pass, the 1 failure the location artifact above; PS
  suite 74 pass, 18 fail, all "watch run" tests. With `limitStop.leadStopFallbackMinutes` put back for one run
  (config copied aside, restored, hash compared equal), `-Only 'watch run*'` gave 23 passed, 0 failed: the 18 come
  only from the removed key, which the watch still reads.
- Diff read line by line (hook and config against `<scratch>\K\orig`): nothing left over.
- Removed: `<scratch>\K2-out` (my scripts and test output), and two `%TEMP%\oa-guard-*` folders of 23:18 and 23:19
  that my failing baseline and red runs left (each held only a `limit-stop.log`: a server that outlived its test
  wrote its last line after the test's cleanup and made the folder again). No limit-stop server process runs.

## Hand-off (for K3)

**Done and checked** (steps 1, 2 and 4 of K's hand-off, nothing of them left): the hook tests (44 in
`tests\hooks\context-guard.test.mjs`, red first, all green), the hook (`hooks\context-guard.mjs`), the config. Hook
mutation check 24 of 24 caught. Hook time with no server unchanged (main 71-76 ms median before, 67-68 after; agent
74-75 before, 68 after). `node --check` of hook, lib and server clean; config parses.

**Exact state of the scratch copy** (`<scratch>\K\repo\orchestrate-agents`), beyond K's own changes:
- `hooks\context-guard.mjs`: rewritten as K's step 2 (see "The hook's texts" below).
- `tests\hooks\context-guard.test.mjs`: K's two `makeWorld` edits kept; tests changed and added as K's step 1.
- `orchestration.config.json`: `repeatAfterCalls`, `endMarginMinutes`, `capEndMinutes`, `leadStopFallbackMinutes` and
  their `_why` gone; `logTailKB` 256 added with `_whyLogTailKB`; `_about`, `_whyConnectTimeoutMs`,
  `_whyProcessCheckSeconds`, `_whyStartCheckSeconds`, `_whyLogFile` rewritten.
- `lib\limit-stop.mjs`: `formatStamp` now exported; new `AGENT_ID_PATTERN` (`/^[\w-]{1,128}$/`).
- `scripts\limit-stop-server.mjs`: `parseRequest` uses `AGENT_ID_PATTERN` (one line and the import); nothing else.
- Red until your step 3: the PS suite's 18 "watch run" tests, because `watch-session.ps1` line 591 still reads
  `limitStop.leadStopFallbackMinutes` (WATCH FAILED). Proved to be the only cause (see Closing).
- Still red anywhere a scratch copy runs: `decision-reminder.test.mjs` "the shipped settings show this repo's
  register in every chat" (compares the live repo path with the scratch root); passes in the live repo.
- Not mine, left for you: `tests\scripts\limit-stop-server.test.mjs` lines 50-53 still set the four old keys in its
  `makeWorld` (dead now; the test "the settings runs before K needed are not needed any more" deletes them anyway).
- Do not install a part: same as K said.

**The hook's texts, for the watch to match:**
- SESSION NEAR CAP (once, at contextCaps.main.warn): `SESSION NEAR CAP | the context is at <N>k tokens at <HH:mm>
  (warning size <W>k). Finish the edit in progress, write the hand-over, schedule the next chat and end the session.
  <server part> After the hand-over, run & '<skill>\scripts\schedule-relaunch.ps1' -ProjectDir <project folder>
  -HandoverPath <hand-over file> -ContextCap, which starts a new chat with Read <hand-over> and carry on, and in the
  same step stop the limit-stop server: node '<skill>\scripts\limit-stop-server.mjs' stop --session <id>. The session
  watch ends with SESSION NEAR CAP too; both mean the same. Start it again then: it stays quiet, and wakes you if the
  limit-stop server fails.`
- `<server part>` when STARTED or RUNNING ALREADY: `The limit-stop server tells every lead and worker of this session
  to stop at its next tool call (<the server's line>): send them no stop message, and wait for LEAD STOPPED from each
  running lead, with no deadline, before you write the hand-over.`
- `<server part>` when NOT STARTED: `LIMIT STOP SERVER FAILED | <HH:mm:ss> | it did not start: <why>. <SERVER_FALLBACK>`,
  `<why>` being the text after `LIMIT STOP SERVER NOT STARTED | `. When CLAUDE_PID is missing or not a number the
  hook starts nothing and `<why>` is its own: `CLAUDE_PID, the id of the session's Claude Code process, is not set,
  and the server needs it to end with the session` (or `is "junk", not a process id, and ...`).
- The hook promises that the restarted watch stays quiet and wakes the session on a failure: your step 3 must make
  that true (cap record at SESSION NEAR CAP, `check` each loop, FAILED printed and the watch ends).
- Main session, any time a server failed: `LIMIT STOP SERVER FAILED | <HH:mm:ss, or the whole stamp on another day> |
  <what>. <SERVER_FALLBACK>`, once per server, from `findServerFailure` with asker `the main session`. Order of the
  main session's texts: the server's stop text, the FAILED line, SESSION NEAR CAP.
- Agent whose query failed: `LIMIT STOP SERVER FAILED | <HH:mm:ss> | this hook got an error from it: <reason>; the
  main session hears of it. Carry on with what the last STOP FOR LIMIT text said, if you got one.` (or the "could not
  be written to its log ... say so in your final message" variant), before its CONTEXT GUARD text.
- Log lines the hook writes: `error for agent <id> (<type, or no type>): <reason>`, `error for the main session:
  <reason>`, `told the main session that the server failed (by the context-guard hook)`. The check's lines say `(by
  the session watch)`; either told line silences the other side for that server. If both find a failure in the same
  second, both may tell (not handled; harmless).
- The hook never sends an agent id outside `AGENT_ID_PATTERN` (stderr line, no query, no alarm).

**For the docs (your step 5)**: the CLAUDE_PID wording, the agent's one line, "told once per server", and that a
log that cannot be read makes the main session's own failure repeat on every call.
