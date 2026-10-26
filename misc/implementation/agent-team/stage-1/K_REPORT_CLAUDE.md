# Run K: the main session learns when the limit-stop server fails, and waits for its leads without a deadline (report)

**Outcome: partly done, stopped at the context guard's warning (320k of 400k) at 23:00, after about 45 tool calls.**
The server and its shared library are rebuilt and tested in a scratch copy: 30 of 30 server tests pass, 22 of them
failed first. The hook, the session watch, the settings file and the three docs are not changed yet. **Nothing is
installed.** The live repo has only my progress file and this report. Nothing is committed.

The rest of the run is planned step by step in the `## Hand-off` section of
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-1\K_PROGRESS_CLAUDE.md`, so a
fresh worker can finish it from the scratch copy.

## What is built (scratch copy only)

The scratch copy is at
`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad\K\repo\orchestrate-agents`.
An untouched copy for diffs is in `...\scratchpad\K\orig`.

- **Each agent is told once.** A worker that makes 7 tool calls after the stop gets its text on the first call and
  nothing on the next 6. `STOP FOR LIMIT | AGAIN` is gone (the user's point 3).
- **The server has no end time** (point 4). It ends when the session's Claude Code process is gone, or when the
  main session runs a new command after the hand-over: `node '<orch>\scripts\limit-stop-server.mjs' stop --session
  <id>`. `stop` waits until the pipe is really gone before it says `LIMIT STOP SERVER STOPPED`. A server whose reset
  was 31 minutes ago still answers. Before, it would have refused to start.
- **No deadline in the server's text for the main session** (point 2). It now reads "Wait for LEAD STOPPED from every
  running lead, with no deadline; if you are told LIMIT STOP SERVER FAILED meanwhile, do what it says". It ends with
  the stop command, with the real session id filled in.
- **How a failure reaches the main session.** No new file is used. The server's existing log is the channel:
  - Any hook whose question to the server fails (no answer in time, garbage, a cut answer) writes one line to it,
    for example `error for agent a2222222 (task-lead): no answer within 300 ms`. "No server at all" writes nothing,
    as before.
  - One function in `lib\limit-stop.mjs` reads the session's lines and decides whether the main session must be told.
    The failure is either such an error line, a server that logged a pipe failure, or a server that started
    listening, never logged an end, and whose pipe is gone now (killed). It is told once per hand-over: the teller
    logs that it told.
  - A new `check` mode prints the result in one line, for the watch to run each minute. Example after a kill:
    `LIMIT STOP SERVER FAILED | 23:05:12 | it is gone: it listened from 23:04:58 as process 4242 and logged no end.
    Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended with
    LEAD STOPPED, and wait for each one's LEAD STOPPED, with no deadline. Tell the user in your final message that
    the limit-stop server failed, and what failed.`
- **The server refuses to start when it cannot write its log.** The log is the only way a failure reaches the main
  session. Start then says `NOT STARTED | its log <path> cannot be written, ...`.
- **`--claude-pid` is required now.** Without an end time, the session's process is what ends a server whose main
  session never runs `stop`. Without it, start says `NOT STARTED | --claude-pid is missing`.
- **Deliberate differences:** the STARTED line ends `| until stop or the end of Claude Code process <pid>` instead of
  `| ends <time>`. The log line `told <id> (...) the first time` is now `told <id> (...)`. Both the hook and the watch
  match only the start of the server's lines, so they are not affected.

## Files

- Changed in the scratch copy: `lib\limit-stop.mjs`, `scripts\limit-stop-server.mjs`,
  `tests\scripts\limit-stop-server.test.mjs` (rewritten), and in `tests\hooks\context-guard.test.mjs` only the test
  world (on disk, not run green yet).
- Live repo: `K_PROGRESS_CLAUDE.md` and this report only. The hash list of all 132 files from 22:54 is in
  `...\scratchpad\K\baseline-hashes.txt`.
- Outside the diff: nothing. No server running, no scheduled task, no live `limit-stop.log`. Node processes are the
  same six as at the start.

## Text the shared files need

Not prepared. The docs and the agent files depend on the hook and watch texts, which are not written yet. The
successor writes it. The hand-off lists what changes: the deadline, `TaskStop` of silent leads, "told again", the
stop command, and restarting the watch at the cap.

## Settings

Nothing has changed in `orchestration.config.json` yet. Planned:
- Remove `repeatAfterCalls`, `endMarginMinutes`, `capEndMinutes` and `leadStopFallbackMinutes`. The new server no
  longer reads them; a test proves it runs without them.
- Add `logTailKB` (256): how much of the end of the log is read for the session's lines.

## Checks

- Red first: 22 of 30 server tests failed on the old server, for the missing feature.
- Green: 30 of 30 server tests (23:03, through run-heavy).
- Whole scratch suite at 23:07-23:11:
  - Node 128 of 134. The 6 failures are expected: five hook tests, because the hook is not rebuilt yet, and the
    register test that always fails in a copy (it pins the setting to the repo the skill sits in, J's report).
  - PowerShell 92 of 92. Its files are unchanged in the copy.
- Hook time before, 20 runs each, no server, 2 MB transcripts: main session median 67 ms, agent median 67 ms.

**Not run:** the hook and watch changes, the parser, the mutation check, the live check, the doc check, hook time
after, and the list of untrue sentences in `limits-and-caps-guide.html`. All are next steps in the hand-off.

## Risky or open points

- **A process id can be reused.** Windows may give the id of a closed Claude Code to a new process. The server then
  lives until that process ends or `stop` runs. There is no fixed end any more to catch this. Recommendation: accept
  it; the main session runs `stop` in its last step.
- **A spurious timeout counts as a failure.** Under load, one slow answer (over 300 ms) makes the main session use
  the fallback. Leads then hear the stop twice, which does no harm. This follows the user's words: "main agent needs
  to be informed".
- **The cap hand-over needs the watch restarted.** This is not built yet. The plan is a hand-over record that the
  watch writes at `SESSION NEAR CAP`, so a restarted watch only checks the server.

## What I learned

- This task does not fit one worker run. The reading-in alone (a 41 KB watch, two large test files, the server)
  brought me near the cap after about 45 calls. The task file planned for about 90. Recommendation: give the hook,
  the watch and the docs to separate runs.

DECISIONS TAKEN: The failure channel is the server's existing log, read by the main session's hook and by a new check mode for the watch (not a new marker file, which the user ruled out) | --claude-pid is required, so no server is left without an end (the other choice, living until stop, could leave one running until reboot) | The main session is told once per hand-over, the teller logs that it told (not on every tool call) | The server refuses to start when its log cannot be written, since the log carries its failures | Errors logged after a normal stop do not count (a stop can cut a hook's question short) | An agent whose hook question fails is told on every such call (remembering per agent would need a file) | stop waits until the pipe is gone before it says STOPPED
INITIATIVES: A {"role":"check"} request that counts for no one | The log line "told <id> (...) the first time" became "told <id> (...)" | The STARTED line's "ends <time>" became "until stop or the end of Claude Code process <pid>" | A timing script for the hook, kept in the scratch folder
ISSUES FOUND: The task is too big for one worker run: the context guard warned after about 45 of the planned 90 calls | The register test fails in any copy of the repo, a known artefact (J), not a defect of this run
QUESTIONS: none
