# Run G: the limit stop through a named pipe, and hand-offs up the chain (report)

**Outcome: done.** At `LIMIT NEAR | HAND OVER` the session watch now starts a limit-stop server, and every agent of
the session hears `STOP FOR LIMIT` from the context-guard hook at its next tool call. The main session no longer
messages leads to stop, except as a fallback when the server did not start. Both suites are green. The mutation
check caught 44 of 49 mutants; 3 small test gaps are left (below). F's three survivors are now caught. Nothing is
committed. The context guard warned me at 322k, so I closed without closing those gaps.

## What changed for the user

- **The stop reaches every agent at its next tool call**, a lead waiting on its worker included. Example: lead
  `ksef-import` waits on worker `W3`; the five-hour limit reads 95%. `W3`'s next tool call brings `STOP FOR LIMIT |
  the five-hour usage limit is at 95% and resets at 15:00, so this session hands over...`; it writes a `## Hand-off`
  section in its progress file and ends with `WORKER STOPPED | W3 | hand-off: <progress file>`. The lead's next
  tool call brings the lead's text; it writes its own `## Hand-off` and ends with `LEAD STOPPED | <lead file>`.
- **Hand-offs go up the chain**: worker (progress file), lead (lead file, listing each worker's hand-off), main
  (the session hand-over, listing each lead's hand-off). The next session starts each lead from its hand-off, and
  the lead starts each half-done worker from that worker's hand-off.
- **Told again, more firmly**: after 5 more tool calls an agent gets `STOP FOR LIMIT | AGAIN | ...`.
- **Roles**: `task-lead` gets the lead text. Helper types (`usageLimits.ignoreAgentTypes`, such as code-searcher)
  are told to return what they found. Every other type, workflow agents and unknown types included, gets the
  worker text.
- **Fallback**: if the server says `LIMIT STOP SERVER NOT STARTED`, the watch tells main to send `STOP FOR LIMIT`
  by message, as before. Either way main waits for `LEAD STOPPED` until a time the watch prints (now + 15 minutes),
  then stops each silent lead with `TaskStop` and says so in the hand-over.
- **Nothing on disk** except one log line per event in `%USERPROFILE%\.claude\state\limit-stop.log`. The server
  keeps what it told whom in memory, and ends by itself 30 minutes after the reset.
- The watch's hand-over output is now **three lines** (it was two): the marker, the server's own line unchanged
  (`LIMIT STOP SERVER STARTED | process <pid> | pipe <pipe> | ends <time>`, `RUNNING ALREADY`, or `NOT STARTED |
  <why>`), then the steps.

## Files

In `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`. A hash check against my baseline list
shows these 13 and no others:

- New: `scripts\limit-stop-server.mjs` (modes `start` and `serve`), `lib\limit-stop.mjs` (pipe name, settings,
  one query), `tests\scripts\limit-stop-server.test.mjs`.
- Changed: `hooks\context-guard.mjs`, `lib\config.mjs` (`requirePathSetting`), `orchestration.config.json` (new
  `limitStop` section), `scripts\watch-session.ps1` (the LIMIT NEAR part and a `-StopServerScript` parameter),
  `tests\hooks\context-guard.test.mjs`, `tests\lib\basics.test.mjs`, `tests\limit-scripts.tests.ps1`, `SKILL.md`,
  `references\usage-limits.md`, `references\start-messages.md`.
- Left unchanged on purpose: `team-rules\SKILL.md`, `references\worker-rules.md` and
  `references\lead-brief-template.md`. None of them describes the stop message.
- Outside the diff: nothing is left. The live check created `%USERPROFILE%\.claude\state\limit-stop.log`, which
  did not exist before; I deleted it and stopped the live server (pid 12748, mine). My scratch folder
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad\G`
  keeps only scripts, result files and mutant logs.

## Settings added (`limitStop`, each with a `_why`)

| Setting | Default | Why |
| --- | --- | --- |
| `pipePrefix` | `claude-limit-stop` | Pipe name is `<prefix>-<session id>`. Tests use their own prefix. |
| `connectTimeoutMs` | 300 | A hung server cannot slow a tool call. With no server the connect fails in under 1 ms. |
| `repeatAfterCalls` | 5 | When an agent is told again. |
| `endMarginMinutes` | 30 | Covers main's fallback wait and the relaunch. |
| `startCheckSeconds` | 10 | How long `start` waits for the pipe to answer. |
| `leadStopFallbackMinutes` | 15 | How long main waits for leads before `TaskStop`. |
| `leadAgentTypes` | `["task-lead"]` | Which agent types get the lead text. |
| `logFile` | `%USERPROFILE%\.claude\state\limit-stop.log` | Where the server logs. |

## Text the shared files need (not mine to edit)

1. `agents\task-lead.md`, section 11: replace steps 1-5 with this. "A hook adds `STOP FOR LIMIT | ...` to your
   context after your next tool call, and to each worker's after theirs; the text says what to do. Send your
   workers nothing. While a worker still runs, end your turn with `WAITING FOR WORKER | <run>`. When none runs, add
   a section `## Hand-off` at the end of your lead file: your plan and where it stands, each run with its state and
   its worker's hand-off path, the register ids still open, the next runs in order. End with `LEAD STOPPED | <lead
   file>`. Only if the main session sends `STOP FOR LIMIT` as a message (the server did not start), send each
   running worker `STOP FOR LIMIT | close now: add a "## Hand-off" section at the end of your progress file, then
   end with WORKER STOPPED | <run> | hand-off: <progress file>.`" For a successor's workers, add: "start each
   half-done run's fresh worker with: its predecessor stopped for the usage limit; read the `## Hand-off` section of
   `<progress file>` first and carry on from its exact next step." Line 224 can stay as it is: the message is still
   the fallback.
2. `agents\software-developer.md`, the `STOP FOR LIMIT` bullet of section 7: "**At `STOP FOR LIMIT`** (added by a
   hook after a tool call, or your lead's message): finish the one command or edit you are in and start no other,
   not even the suite. Add a section `## Hand-off` at the end of your progress file: what is done, how it was
   checked, what is on disk but unchecked, what is left, the exact next step, and the files you own. Then end with
   `WORKER STOPPED | <run> | hand-off: <progress file>`; no report. At `STOP FOR LIMIT | AGAIN`, stop at once." The
   project worker types (xpp-porter, navigator-builder) copy that bullet word for word.
3. `README.md`, Layout: add `limit-stop-server.mjs` to the `orchestrate-agents/scripts/` line.

## Checks (all after the last code change)

- Final suites, through run-heavy: Node 101 of 101. PowerShell 78 passed, 0 failed. The baseline was 79 and 74.
- Parser: 0 errors on `watch-session.ps1`, `watch-agent.ps1` and the test file. `node --check` is clean on all 23
  `.mjs` files.
- Hook time with no server, 20 runs on a 2 MB transcript: median 72 and 75 ms before, 79 and 78 ms after. That is
  about 5 ms more per tool call.
- Live check on the real scripts and settings, with a made-up session `deadbeef-0000-4000-8000-00000000c0de`:
  - `start`, run from a Claude Code background task, printed STARTED with pid 12748. The task ended at once, and
    the server still answered a minute later.
  - The hook, called as an agent of that session, printed the worker text and wrote nothing to stderr. A second
    call printed nothing.
  - An agent of another session got nothing.
  - The server used 35 MB of memory (22 MB private) and opened no window.
- Measured on the way: a server started with `Start-Process ... -WindowStyle Hidden` from a background task dies
  with that task. A Node `spawn` with `detached`, `stdio: 'ignore'` and `unref` survives it. So the server detaches
  itself from Node.
- Mutation check: 51 mutants, 49 run, 44 caught. F's E17, E42 and F16 are all caught now:
  - E17 and E42 by a sharper test of the existing behaviour.
  - F16 by a settings entry under the empty name. Without such an entry, F16 changes nothing.
- The 5 survivors:
  - S09: the server's line-length guard. Test gap: no test sends a valid request over 64 KB.
  - S15: `start` noticing that its child died at once. Only a race or a crash reaches that branch.
  - S16: `start` stopping a server whose pipe did not answer in time. Test gap: a case with
    `startCheckSeconds` 0 would catch it.
  - S22: the server's answer without its line end. It changes nothing with today's client.
  - L02: the hook taking the answer at the line end. Test gap: no test server keeps the connection open after
    answering.
- Not run: S12 and S13. They switch off an argument check, like S11, and so hang the suite (see issues).

**Not tested:**
- A real usage-limit stop and real agents: out of scope.
- The new wording for the agent files: they are not mine to edit.
- The three test gaps above: I stopped at the context warning.

## Risky or open points

- **A weekly hand-over keeps a 35 MB process alive until the weekly reset plus 30 minutes**, which may be days.
  Example: weekly at 98% on Monday, reset on Thursday, so the server idles three days. Recommendation: also exit
  when the session's Claude Code process is gone. The watch already knows its id (`CLAUDE_PID`).
- **`SESSION NEAR CAP` still stops leads by message**, so the stop still arrives late there. Recommendation: main
  runs `limit-stop-server.mjs start` itself in that case too.
- **A worker inside one long command hears nothing until that command ends.** A run-heavy wait can last an hour.
  The 15-minute fallback with `TaskStop` covers this case.

## What I learned

- The session id in the hook tests is a real session's id (run F's). Every hook test would have asked that real
  session's pipe. So every hook test now sets its own pipe prefix, and every watch run in the PowerShell tests
  uses a stub server.
- A test that runs `serve` with an argument check broken never ends: the child listens for 2 hours, and the test
  waits for it.

DECISIONS TAKEN: The server starts itself detached from Node (start mode), not with Start-Process (measured: Start-Process from a background task dies with the task) | New fixed line WORKER STOPPED | <run> | hand-off: <progress file> for a worker (none existed; it mirrors WORKER DONE) | The hand-off is a "## Hand-off" section at the end of the progress or lead file, not a separate file (the task says "in its progress file") | Helper types get their own short text (return what you found) instead of the worker's | A pipe failure other than "no server" writes one stderr line and leaves the size message unchanged; a size failure still lets the stop text through (each layer fails open) | The server waits for a client's request for connectTimeoutMs too, rather than having a setting of its own | The fallback deadline is now + leadStopFallbackMinutes, printed by the watch, instead of the first going-cold time | When the server did not start, the watch tells main to send STOP FOR LIMIT by message (the old way kept as the fallback) | I stopped my own mutation tasks with TaskStop when they hung, and checked for leftovers by listing node and pwsh processes whose command line points into my scratch copies (nothing was found, so nothing was stopped that way)
INITIATIVES: requirePathSetting in lib\config.mjs (%NAME% paths for Node, like the PowerShell scripts) | Watch output grew from 2 to 3 lines (the server's line passed on unchanged) | Stub server for every watch run and a test pipe prefix for every hook test | The STOP FOR LIMIT message in start-messages.md now also asks for the ## Hand-off section and WORKER STOPPED
ISSUES FOUND: The hook tests used a real session id (F's) without their own pipe prefix: they could have reached a real server (fixed in the tests) | A weekly hand-over leaves a 35 MB server idle until the weekly reset plus 30 minutes (open) | SESSION NEAR CAP still uses the late message (open) | Server tests have no timeout, so a mutant that breaks an argument check hangs the suite for 2 hours (open; it cost the mutation check S12 and S13) | Three test gaps: S09, S16, L02 (open) | lib\limit-stop.mjs exports SESSION_ID_PATTERN, which nothing imports (cosmetic, open) | agents\task-lead.md section 11 and agents\software-developer.md section 7 still describe the stop by message only (text above)
QUESTIONS: Should the server also end when the session's Claude Code process is gone (recommended)? | Should main start the server at SESSION NEAR CAP too?
