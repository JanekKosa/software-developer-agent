# Usage limits: resume or hand over

The account has a five-hour usage limit and a weekly one. When one is nearly used up, the session either waits and
resumes with its agents' caches still warm, or hands over to a fresh session that starts after the reset. This page
is the main session's step-by-step. The settings are in `usageLimits`, `usageAndContextWatch` and `relaunch` of
`..\orchestration.config.json`; the numbers below are their values on 2026-10-25.

## Words used here

- **Cache**: the copy of an agent's conversation the API keeps, so a turn re-reads it cheaply instead of paying for
  all of it again. It lasts 1 hour for the main session and for agents whose file sets `cacheTtl: 1h` (leads,
  workers), 5 minutes for others, counted from the agent's last request.
- **Warm / cold**: an agent whose cache is still alive is warm. Waking a cold agent re-writes its whole context
  to the cache. Seen 2026-10-24: after a wait of three and a half hours, waking the 485k main session and five agents of 250k to
  510k used 46% of the fresh five-hour limit in 8 minutes.
- **Reset**: the time the limit window frees up again. The API reports it with the percentage.
- **Named pipe**: a private in-memory channel between two programs on this machine. Nothing is written to disk, so
  nothing is left behind to delete (the user chose it over a flag file, 2026-10-25).
- **The watch**: on this page, the Usage and context watch ("What watches", below). The Decision answers watch is
  always named in full.
- **Limit-stop server**: `scripts\limit-stop-server.mjs`. The watch starts it at a hand-over; at the main session's
  context cap the watch or the context-guard hook starts it, whichever notices first (a second start only says
  `RUNNING ALREADY`). It listens on the pipe `\\.\pipe\<limitStop.pipePrefix>-<session id>`, and the context-guard
  hook asks it after every tool call of every agent of this session, and of the main session, what to tell it. It
  has no end time: it lives until the main session stops it after the hand-over (its `stop` command, in the same
  step that schedules the relaunch), or until the session's Claude Code process is gone.
- **Hand-off**: the section `## Hand-off` an agent writes at the end of its own file before it stops: a worker in
  its progress file, a lead in its lead file. Its successor starts from it.

## What watches

Each watch is a PowerShell script the main session starts with the PowerShell tool and `run_in_background`. The
tool's `description` is the watch's name, the one the user sees in the task list, so give it exactly.

- The **Usage and context watch**, `scripts\watch-usage-and-context.ps1`, which the main session starts first, at
  its beginning, with the description `Usage and context watch`:
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1'` (no
  arguments). Besides the context size, it reads the usage percentages from the file `usageLimits.stateFile` names
  (`%USERPROFILE%\.claude\state\usage-limits.json`) and runs `scripts\usage-probe.ps1` (one tiny Haiku call, about
  7 thousand tokens) when that reading is older than `stateFreshMinutes` (15), or `probeNearEveryMinutes` (3) within
  `probeNearWithinPercent` (10) points of a threshold, and only when the session or one of its agents wrote since
  the reading was taken: an idle session spends nothing, so a weekly reading at 97% does not cost a probe every 3
  minutes for days. The probe calls the API only when the file's reading is older than that same age, so the
  watches of several open sessions share one call.
- The **Decision answers watch**, `scripts\watch-decision-answers.ps1`, which the main session also starts at its
  beginning, from its own repo (it reads only that repo's decision register), with the description
  `Decision answers watch`:
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1'`. It
  hands the user's new answers to the main session and plays no part in the limits; this page names it because
  every hand-over stops it too (step 7).
- The third, the **Agent size and stall watch** (`scripts\watch-agent-size-and-stall.ps1`), watches one agent and
  is not part of a hand-over; `lessons.md` ("Sizes") says when a lead starts it.
- Thresholds: five-hour at 95%, weekly at 98% (the user's choice, 2026-10-25).
- Claude Code's own `autoContinueAtUsageLimit` is off in `settings.json`, so nothing resumes the session behind the
  watch's back. The main session set it; never switch it on from an agent.

## The decision, with one example

At a threshold, the watch takes each warm agent of the session (the main session, every lead and worker, but not
helper types listed in `ignoreAgentTypes`, not workflow agents, and not finished agents, whose `.meta.json` says
`"finished": true`) and works out when its cache runs out. If every
one outlasts the reset by `resumeMarginMinutes` (10), it decides **resume**. Otherwise **hand over**.

Example: at 14:20 the five-hour limit reads 95% and resets at 15:00. The main session's last request was at 14:19
(cache until 15:19). Lead `ksef-import` last asked at 14:18 (until 15:18), its worker at 14:19 (until 15:19). All
three outlast 15:10, so the watch decides resume and keeps quiet. Had a second lead been idle since 13:55, its
cache would end at 14:55, before the reset: the watch decides hand over. An agent already cold is left out; waking
it costs the same either way.

The watch takes the decision again every loop while above the threshold. It can turn from resume to hand-over, as
an idle agent grows colder, never back.

## What the main session does on each line

**No line (resume).** Keep working until the limit stops the session. After the reset, plus
`usageAndContextWatch.resetMarginMinutes` (1), the watch ends with `SESSION RESUMED`: carry on, resume each
cut-off lead with the message in `start-messages.md`, and start the watch again (description
`Usage and context watch`). After a server error it wakes the session `usageAndContextWatch.retryMinutes` (10)
after the stop, so an API that is still overloaded has time to recover (D-0006).

**`LIMIT NEAR | HAND OVER | <window> at <p>% resets <HH:mm> | going cold: <agent type> <id8> at <HH:mm>, ...`**,
followed by the limit-stop server's own line and a line with the steps and the exact relaunch command.

Before it ended, the watch started the limit-stop server. Its line is one of:

- `LIMIT STOP SERVER STARTED | process <pid> | pipe <pipe> | until stop or the end of Claude Code process <pid>`, or
  `LIMIT STOP SERVER RUNNING ALREADY | pipe <pipe>`: every agent of this session hears `STOP FOR LIMIT` once, at its
  next tool call, and is not told again (the user, 2026-10-25: being told the limit is near is incentive enough). A
  worker stops building, writes its hand-off and ends with `WORKER STOPPED | <run> | hand-off: <progress file>`. A
  lead starts nothing new, waits for its workers (it sends them nothing), writes its own hand-off (its plan, each
  worker's hand-off path, the next runs) and ends with `LEAD STOPPED | <lead file>`. Neither has a deadline. A
  helper such as a code-searcher returns what it found. The main session gets its own `STOP FOR LIMIT` text once,
  at its next tool call: the steps below, with no deadline; it means the same as the watch's lines. The server has
  no end time: it ends when you stop it in step 6, or once the session's Claude Code process is gone (checked every
  `limitStop.processCheckSeconds`, 60; the user's choice, 2026-10-25), and logs to the file `limitStop.logFile`
  names (`%USERPROFILE%\.claude\state\limit-stop.log`).
- `LIMIT STOP SERVER NOT STARTED | <why>`: no agent hears anything. The watch's next line tells you so, as
  `LIMIT STOP SERVER FAILED | <HH:mm:ss> | it did not start: <why>. Only now the fallback: ...` (see "When the
  limit-stop server fails", below): send `STOP FOR LIMIT` to every running lead (text in `start-messages.md`). A
  lead waiting on a worker reads it only once that worker returns (measured 2026-10-25), so expect it late.

Then:

1. Start the watch again at once, in the background as at the start (description `Usage and context watch`), and
   note its task id. The hand-over decision
   is on record, so the new watch stays quiet, apart from checking the limit-stop server at each look
   (`limit-stop-server.mjs check`): if the server fails, it wakes you with `LIMIT STOP SERVER FAILED` (see "When the
   limit-stop server fails", below). And if the limit stops the session before step 7, it ends after the reset with
   `SESSION RESET COLD`, which wakes you to finish. Without it nothing would wake the session:
   `autoContinueAtUsageLimit` is off.
2. Send no stop message, unless a `LIMIT STOP SERVER FAILED` line has told you the server failed (then do the
   fallback it names). Each lead's `LEAD STOPPED | <lead file>` wakes you.
3. Wait for every running lead's `LEAD STOPPED`, with no deadline (the user, 2026-10-25: "no lets not have a limit
   here"). A lead can stay silent a long while when its worker sits in one long command, such as a test run waiting
   in `run-heavy.ps1`: the stop reaches an agent only at its next tool call. Skip to step 5 when no lead is running.
4. If the usage limit runs out before the last `LEAD STOPPED`, there is nothing more to do now: see "When the limit
   runs out before the leads stop", below.
5. Write the session hand-over where the project's rules say (in xpp-agent: the stage's next continuation plan, or
   `misc\handovers\`). It is written for a session that has read nothing: the user's request in their own words;
   what is done and how it was checked; what is on disk but unchecked; the decisions with reasons and who made
   them; the register ids still open; every lead with its lead file and whether its hand-off is there (a lead the
   limit cut off before it wrote one has none: say so, and name its workers' progress files instead); each
   worker's task file and progress file as its lead's hand-off lists them; the exact next step; the few files to
   read first.
6. Run the command the watch printed, with your project folder and hand-over file filled in, and in the same step
   stop the limit-stop server with the command printed after it:
   `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\schedule-relaunch.ps1' -ProjectDir <project folder> -HandoverPath <hand-over file> -At <reset, ISO>`
   and `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\limit-stop-server.mjs' stop --session <session id>`.
   The relaunch's last line must start with `SCHEDULED` or `ALREADY SCHEDULED`; `RELAUNCH NOT SCHEDULED` means it
   did not, and the reason follows. Do not run it again; the user then starts the new chat by hand. The stop's line
   is `LIMIT STOP SERVER STOPPED` or `NOT RUNNING`; on `NOT STOPPED | <why>` do not retry: the server ends with the
   session's Claude Code process, and your final message says so.
7. Stop the watch of step 1 with `TaskStop`. Left running, it would go on checking a stopped server each minute
   until the chat is closed. Stop the Decision answers watch with `TaskStop` too, if it is running: this session
   processes no more answers. An answer the user gives later reaches the next session, whose own Decision answers
   watch hands it over when it starts, or whose prompt hook does at the user's next message.
8. End your turn: the hand-over's path, the relaunch time (or why there is none), and the line
   `Read <path> and carry on.`

If the watch ends again before step 7, act on its line: `LIMIT STOP SERVER FAILED` (the fallback, then start it
again), `LIMIT STOP SERVER NOT CHECKED` (start it again), or `SESSION RESET COLD`. While the hand-over is on record
it says nothing else, not even `SESSION NEAR CAP`.

**At the main session's context cap** (the user's choice, 2026-10-25), the same stop runs, without a reset. Once the
main session's context passes `contextCaps.main.warn` (450k), two things notice it: the context-guard hook after the
main session's next tool call, and the Usage and context watch at its next look. Whichever comes first starts the limit-stop
server with `--window context-cap`; the other finds it `RUNNING ALREADY`. Both then say `SESSION NEAR CAP` (the
hook once, the watch as its ending line, followed by the server's line and the steps); they mean the same. Every
lead and worker hears `STOP FOR LIMIT | this session is at its context cap and hands over to a new one. ...` once,
at its next tool call, and the main session its own text, with no deadline. Then:

1. Finish the edit in hand and start nothing new. Start the watch again at once (description
   `Usage and context watch`): before it ended it put the cap
   hand-over on record, so the new watch stays quiet and only checks the limit-stop server at each look, and wakes
   you if the server fails.
2. Send no stop message, unless a `LIMIT STOP SERVER FAILED` line has told you the server failed (then do the
   fallback it names, with `STOP FOR LIMIT` worded for the cap as in `start-messages.md`).
3. Wait for `LEAD STOPPED` from each running lead, with no deadline, as in step 3 above.
4. Write the hand-over, listing each lead's hand-off (step 5 above), and run the command the texts print, with your
   project folder and hand-over file filled in, and in the same step the server's `stop` command they print:
   `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\schedule-relaunch.ps1' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`
   and `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\limit-stop-server.mjs' stop --session <session id>`.
   It schedules the next chat `relaunch.afterCapMinutes` (1) from now, the same way as after a limit hand-over (the
   relaunch, below), and its last lines read as in step 6 above. Then stop both watches with `TaskStop` (step 7) and
   end your turn as in step 8.

Here too the server has no end time: it ends when you stop it in step 4, or once the session's Claude Code process
is gone.

**`SESSION RESET COLD | ...`** (the limit stopped the session, and either some cache ran out on the way or a
hand-over had been decided before the stop): resume no agent. Write the hand-over from the files on disk, or finish
the one you had begun; run `schedule-relaunch.ps1` with `-At now` and, in the same step, the server's `stop`
command the line prints; stop the Decision answers watch with `TaskStop` if it is still running (step 7); end as
in step 8. Do not start the watch again: it would find the same stop and end again at once. If the hand-over is
written and a relaunch is scheduled already, just end.

**When the limit runs out before the leads stop.** There is no deadline for the leads, so the usage limit can run
out while some are still writing their hand-offs. The limit then stops every agent of the session where it stands;
what is on disk stays. Nothing runs until the reset. The watch you started again in step 1 sees the stop and, at the
reset plus `usageAndContextWatch.resetMarginMinutes` (1), ends with `SESSION RESET COLD`, because a hand-over is on
record. Then, as above: resume no agent, write the hand-over from the files on disk (each lead's hand-off where it
wrote one; otherwise its lead file and its workers' progress files, and say that it was cut off), schedule the
relaunch with `-At now`, stop the server and the Decision answers watch, and end. What the user sees: the chat stops with Claude Code's usage-limit message;
after the reset the session wakes by itself, writes the hand-over and ends with `Read <path> and carry on.`; about a
minute later (`usageLimits.relaunchMarginMinutes`) a new chat opens in the project's VS Code window with that line.
Its successor leads start from their files (`start-messages.md`: a lead cut off by the limit).

**When the limit-stop server fails.** A failure is: the server did not start; it exited or stopped answering while
a hand-over is under way; or an agent's hook got an error from it other than "no server" (the user, 2026-10-25: the
main session must know that the helper failed before any fallback runs). You hear of it within about a minute, busy
or idle, as one line that names what failed and when, and only then the fallback:

`LIMIT STOP SERVER FAILED | <HH:mm:ss> | <what failed>. Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended with LEAD STOPPED, and wait for each one's LEAD STOPPED, with no deadline. Tell the user in your final message that the limit-stop server failed, and what failed.`

- Busy: the context-guard hook adds it after your next tool call, after the server's stop text and before
  `SESSION NEAR CAP` when they come together.
- Idle: the watch you started again checks the server at each look and ends with that line, then `Start this watch
  again now; it does not report this failure twice.` Start it again.
- Once per server: whichever tells you first logs `told the main session that the server failed (by the
  context-guard hook)` or `(by the Usage and context watch)` in the server's log, and the other stays quiet (both
  may tell you when they find it in the same second).
- An agent's error reaches you through that log, not through a file of its own: its hook logs `error for agent <id>
  (<type>): <reason>`, and the agent gets one line before its size text, `LIMIT STOP SERVER FAILED | <HH:mm:ss> |
  this hook got an error from it: <reason>; the main session hears of it. Carry on with what the last STOP FOR LIMIT
  text said, if you got one.` When the log cannot be written either, the line says so instead and asks the agent to
  say it in its final message.
- Without `CLAUDE_PID` (the id of the session's Claude Code process, which Claude Code gives its shells and hooks)
  no server starts: the hook does not try, and the server refuses the watch's start (`--claude-pid is missing`).
  `<what failed>` then says `it did not start: ...` and why: the server needs the id to end with the session.
- If the server's log cannot be read, the main session's hook cannot tell whether it told you already, so a failed
  query of its own is said again at every tool call until the log can be read.
- `LIMIT STOP SERVER NOT CHECKED | <why>`, from the watch, is not a failure of the server: the check itself could
  not run (its log cannot be read, a setting is wrong, node is missing), so the server's state is unknown. Start the
  watch again: it checks at each look and says the same cause only once, and wakes you again only when the cause
  changes, or clears and comes back (the main session's addition, 2026-10-26: an idle session is not woken every
  minute). The context-guard hook still tells you of any failure at your tool calls.

## The relaunch

At the reset plus `relaunchMarginMinutes` (1), or `relaunch.afterCapMinutes` (1) after a hand-over at the context
cap (`-ContextCap`), a one-shot Windows scheduled task named
`ClaudeRelaunch-<project folder name>-<yyyyMMddHHmm>` runs `scripts\start-session-in-vscode.ps1`:

1. It brings the VS Code window that has the project open to the front.
2. Only when that window is now in front, it opens a new Claude Code chat with the prompt
   `Read <hand-over> and carry on.` through the `vscode://anthropic.claude-code/open?prompt=...` link. The link
   names no window, so VS Code hands it to its last focused window, which may be another project's. When the
   project's window is not in front, it opens nothing: a Windows notification asks the user to open a Claude chat in
   that project and send the prompt, which it names.
3. It presses Enter only when that window is still in front. Otherwise the prompt waits in the new chat and a
   Windows notification asks the user to press Enter.
4. Every step is logged with the time to the file `relaunch.logFile` names (`%USERPROFILE%\.claude\state\relaunch.log`).

Its notifications say that the limit has reset, or, after a hand-over at the context cap, that the session has
handed over at its context cap.

The first time, VS Code asks "Allow 'Claude Code' to open this URI?"; the user ticks "do not ask again" once. Both
scripts take `-DryRun`, which says what they would do and does nothing.

## The new session

It is a fresh session: the agents of the old one cannot be reached by message ("No transcript found for agent
ID"). It starts its two watches ("What watches", above), reads the hand-over, and starts a fresh lead for each lead of the old one, from its lead
file's hand-off (`start-messages.md`, "A successor lead in a new session"). Each lead restarts its half-done worker
runs with fresh workers, each from its task file and the hand-off in its progress file.
