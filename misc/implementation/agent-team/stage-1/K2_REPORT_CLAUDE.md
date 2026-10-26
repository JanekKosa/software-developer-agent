# Run K2 report: the hook tells the main session and the agents when the limit-stop server fails

**Outcome: done for my part (steps 1, 2 and 4 of run K's hand-off), in the scratch copy only.** Nothing is
installed in the live repo and nothing is committed. Run K3 still has to do the session watch, the docs, the last
checks and the install. Until K3 changes the watch, 18 of its tests fail in the scratch copy, as planned.

## What is different now (in the scratch copy)

The context-guard hook (the small program that runs after every tool call) now speaks up when the limit-stop
server (the helper that tells every agent to stop before a usage limit or the context cap) breaks.

- **An agent whose hook gets a bad answer or no answer from the server** is told in one line, then gets its usual
  size message. Example: `LIMIT STOP SERVER FAILED | 23:41:07 | this hook got an error from it: the answer is not
  JSON; the main session hears of it. Carry on with what the last STOP FOR LIMIT text said, if you got one.` The
  error is also written to the server's log file. If that write fails, the line says so and asks the agent to put it
  in its final message.
- **The main session hears of every failure at its next tool call, once per server.** That covers a server that
  died during a hand-over, a server whose pipe failed, and any hook that got an error from it, its own included. The
  line names what failed and when, and only then gives the fallback. Example: `LIMIT STOP SERVER FAILED | 23:40:12 |
  it is gone: it listened from 23:39:58 as process 4242 and logged no end. Only now the fallback: send STOP FOR LIMIT
  by message ... with no deadline. Tell the user in your final message that the limit-stop server failed, and what
  failed.`
- **No signal file.** These failures travel through the log the server already kept, as the user wanted. The hook
  reads only the end of it (256 KB). That takes about 1.4 ms.
- **At the context cap, SESSION NEAR CAP has no deadline any more.** It says to wait for every lead with no
  deadline. It gives the command that stops the server in the same step as the relaunch. It says to start the
  session watch again, which then stays quiet and wakes the session if the server fails. If the server did not
  start, the message carries the FAILED line with the reason in place of the old "send STOP FOR LIMIT" sentence.
- **Config:** the four old settings are gone (`repeatAfterCalls`, `endMarginMinutes`, `capEndMinutes`,
  `leadStopFallbackMinutes`). A new one, `limitStop.logTailKB` = 256, sets how much of the log end the hook and the
  watch's check read. 256 KB holds the whole current hand-over and many before it. The notes on four other settings
  were brought up to date.

## Files changed (all under `<scratch>\K\repo\orchestrate-agents\`)

- `hooks\context-guard.mjs`: rewritten as K planned.
- `tests\hooks\context-guard.test.mjs`: 11 tests added and 6 changed, 44 in all now.
- `orchestration.config.json`: the `limitStop` block only.
- `lib\limit-stop.mjs`: `formatStamp` is now exported, and a new `AGENT_ID_PATTERN` was added.
- `scripts\limit-stop-server.mjs`: one line now uses that shared pattern in place of its own copy.

`<scratch>` is `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`.
My progress file with the hand-off for K3 is
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-1\K2_PROGRESS_CLAUDE.md`.

Cleaned up: my output folder `<scratch>\K2-out`, and two `%TEMP%\oa-guard-*` folders that my failing baseline runs
left behind. No limit-stop server process is running. The user's real log (`%USERPROFILE%\.claude\state\limit-stop.log`)
does not exist, and nothing wrote it.

## Checks (all run after the last change)

- Hook tests: red first (42 tests, 11 failing against the old hook), then 44 of 44 pass.
- Whole Node suite: 145 tests, 144 pass. The one failure only happens in a scratch copy. That test compares the
  configured register path (the live repo) with the folder it runs in.
- PowerShell suite: 74 pass, 18 fail, all of them "watch run" tests. The watch still reads the removed
  `leadStopFallbackMinutes`. To prove that this is the only cause, I put the key back for one run: all 23 watch-run
  tests passed. Then I restored the config and compared its hash.
- Mutation check of the hook's changed lines: 24 of 24 caught.
- Hook time with no server, 20 runs, done twice: before 71 to 76 ms median for the main session and 74 to 75 ms for
  an agent; after 67 to 68 ms and 68 ms. No slowdown.
- `node --check` passes on the hook, the lib and the server, and the config parses.

**Not tested:** the live check with a made-up session and the watch's line, because that is K3's step 6 and needs
the new watch. The hook's half is covered by a test that starts the real server, kills it, and reads the main
session's text. Nothing was tried in a real Claude Code session.

## Risky or open points

- **An agent whose queries keep failing is told on every failing call.** Example: a hung server and a worker that
  makes 40 more tool calls means 40 lines of about 60 tokens each. The main session is told only once. I kept it
  simple. A once-per-agent marker could be added if it proves noisy.
- **If the log cannot be read, the main session's own failure repeats on every call.** The "already told" line cannot
  be read back either. I chose repeating over silence.
- **The hook and the watch's check could both tell in the same second.** That gives the main session two identical
  FAILED lines, which does no harm.

## What I learned

- On Windows, a directory opened as a file reads as empty without an error. A path under a file reads as missing.
  So a "log cannot be read" test needs an ACL that denies only reading the data. Appending and deleting then still
  work (measured).
- A server that outlives its test writes its last log line after the test's cleanup. That makes the scratch folder
  again (seen twice, in failing runs only).

DECISIONS TAKEN: CLAUDE_PID missing or not a number at the cap: the hook starts no server and says why in its own words, not K's plan of passing on the server's "--claude-pid is missing" (the main session reads it, and the raw argument name says nothing about what to fix) | a failed query still writes its stderr line as before, plus one more when the log cannot be written or read (kept for the transcript view) | an agent id the server would refuse is never sent (otherwise a request the hook built wrongly would now alarm the main session as a server failure) | a log that cannot be read counts as no lines, so the main session's own failure still reaches it, repeated each call (repeated rather than silent) | an agent is told on each failing call, the main session once per server (simplest; no new marker) | I skipped reading the vendored skills and the repo's CLAUDE.md files that my agent file asks for, because the main session said "and no more"
INITIATIVES: added `AGENT_ID_PATTERN` to `lib\limit-stop.mjs` and made the server's `parseRequest` use it (one source of truth for the id the hook now checks) | exported `formatStamp` from the lib | added tests beyond K's list: an agent with no type, a refused agent id, a log that cannot be read (icacls deny on a scratch file, removed in a finally), the main session's own failure together with SESSION NEAR CAP, and pipePrefix missing in the main session | removed two leftover `%TEMP%\oa-guard-*` folders from my own failing runs
ISSUES FOUND: `tests\scripts\limit-stop-server.test.mjs` lines 50-53 still set the four removed keys (dead, harmless; for K3) | a limit-stop server that outlives its test re-creates the test's deleted scratch folder when it logs its end (appendLimitStopLog makes the folder), leaving `%TEMP%\oa-*` folders after failing runs; older ones from earlier runs are still there (19:44-19:48, 23:07, and oa-stop 18:05, 19:34, 23:02), left alone as not mine | `decision-reminder.test.mjs` "the shipped settings show this repo's register" fails in any scratch copy because it compares the live repo path with the scratch root | the PS suite stays red (18 watch-run tests) until K3 drops the watch's read of `leadStopFallbackMinutes`
QUESTIONS: none
