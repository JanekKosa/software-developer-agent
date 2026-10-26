# Run K4 report (worker; started by the main session directly)

**Outcome: partly done.** The fix, the docs and every check in the scratch copy are finished and green. **Nothing
is installed**: the context guard warned at 321k of 400k before the install, and the task says not to install
then. The install, the live suites and the live check are ready as two scripts; the exact steps are at the end.
The live repo has only my progress file and this report. Nothing is committed.

## What changed for the user

- **A watch that cannot check no longer wakes an idle main session every minute.** During a hand-over the restarted
  session watch checks the limit-stop server at each look. Before, a check that could not run (for example the
  server's log locked: `LIMIT STOP SERVER NOT CHECKED | its log ... cannot be read: EBUSY`) ended the watch at every
  look, so the main session got a new turn about once a minute while the cause lasted. Now the watch reports a line
  once; a watch started again stays quiet and keeps checking while the same line comes back, and speaks again only
  when the line changes (for example to `EPERM`, or to `LIMIT STOP SERVER FAILED`), or when it cleared (a FINE check)
  and comes back. The same holds for a FAILED line the server could not mark as told.
  - The line reported is kept in the watch's own decision record (`%TEMP%\claude-session-watch-<id>.decision.json`,
    key `reportedCheck`); a new hand-over starts without one. No new file.
  - A record that cannot be written hides nothing: the line is then reported again at each restart, as before, and a
    clear that failed counts as done for that watch, so a comeback is still told.
  - The sentence after NOT CHECKED now reads: "Start this watch again now: it checks again at each look and says no
    more of this until the cause changes, or clears and comes back."
- **The docs say what runs K to K3 built**: no deadline for the leads and no `TaskStop` of a silent lead; every agent
  is told once; the server has no end time and the main session stops it in the step that schedules the relaunch;
  the watch is started again after `SESSION NEAR CAP` too; the fallback runs only after `LIMIT STOP SERVER FAILED`;
  what happens, and what the user sees, when the usage limit runs out before the leads stop.

## The text the files I may not edit need

**`agents\task-lead.md`, section 11.** Replace the paragraph "Only if the main session sends `STOP FOR LIMIT` as a
message (the hook's server did not start), send each running worker, ..." (lines 261-263) with:

> Only if the main session sends `STOP FOR LIMIT` as a message (it does so only after it was told that the
> limit-stop server failed), send each running worker, by `SendMessage` to its id: `STOP FOR LIMIT | close now: add
> a "## Hand-off" section at the end of your progress file, then end with WORKER STOPPED | <run> | hand-off:
> <progress file>.` If the hook gave you `STOP FOR LIMIT` already, carry on with steps 1 to 4 as before.
>
> You are told once, and there is no deadline: take the steps the hand-off needs. If the hook adds
> `LIMIT STOP SERVER FAILED | <time> | this hook got an error from it: ...`, carry on with what the last
> `STOP FOR LIMIT` text said, if you got one; when the line says the main session may not hear of it, say so in your
> hand-off.

and in line 250 write "a hook adds `STOP FOR LIMIT | ...` to your context once, after your next tool call".

**`agents\software-developer.md`, section 7.** Replace "At `STOP FOR LIMIT | AGAIN`, stop at once." (line 193) with:

> You are told once, and there is no deadline: take the few calls the hand-off needs. A line
> `LIMIT STOP SERVER FAILED | <time> | this hook got an error from it: ...` means the stop service broke: carry on
> with what the last `STOP FOR LIMIT` said, if you got one, and when the line says the main session may not hear of
> it, say so in your final message.

**xpp-agent `CLAUDE.md`** (`C:\Repos\My projects\xpp-agent\CLAUDE.md`):

- Line 39, from "The session sends no stop message" to the end of the bullet, becomes: "It starts the session watch
  again at once (the hand-over on record keeps it quiet; it wakes the session if the limit-stop server fails). The
  session sends no stop message unless a `LIMIT STOP SERVER FAILED` line tells it that the server failed; only then
  it sends `STOP FOR LIMIT` to every lead that has not ended with `LEAD STOPPED`, and tells the user in its final
  message. It waits for each lead's `LEAD STOPPED`, with no deadline (user, 2026-10-25). It writes the hand-over,
  listing each lead's hand-off, and schedules the next session with the `schedule-relaunch.ps1 ... -ContextCap`
  command the texts print, which opens a new chat in this project's VS Code window one minute later (user,
  2026-10-25); in the same step it stops the limit-stop server with the `stop` command the texts print, then stops
  the watch (`TaskStop`). It ends with a final message that gives the hand-over's path, the relaunch time, and the
  line `Read <path> and carry on.`"
- Line 47 (`SESSION NEAR CAP`): "... The watch's second line is the limit-stop server's (`RUNNING ALREADY` when the
  hook started it first); when it did not start, a `LIMIT STOP SERVER FAILED` line follows; the last line gives the
  steps with the relaunch and stop commands."
- Line 48 (`LIMIT NEAR | HAND OVER`), the middle: "The limit-stop server the watch started tells every lead and
  worker to stop, once (send `STOP FOR LIMIT` by message only after a `LIMIT STOP SERVER FAILED` line); start the
  watch again, wait for every `LEAD STOPPED` with no deadline, write the hand-over, and schedule the new session with
  `schedule-relaunch.ps1`, stopping the limit-stop server in the same step; ..."
- A new bullet after line 48: "- `LIMIT STOP SERVER FAILED`: the limit-stop server did not start, died or stopped
  answering during a hand-over, or an agent's hook got an error from it (user, 2026-10-25: the session must know
  before any fallback). The line names what failed and when; only then do the fallback it names: send
  `STOP FOR LIMIT` to every lead that has not ended with `LEAD STOPPED`, wait for each, and tell the user in the final
  message. Start the watch again. `LIMIT STOP SERVER NOT CHECKED`: the watch could not check; start it again: it says
  the same cause only once."
- Line 50 (`SESSION RESET COLD`): add "and stops the limit-stop server in the same step" after "one minute from now".
- Line 53 becomes: "- Start the watch again every time it ends, and after every restart of Claude Code or VS Code,
  which kills it. After `LIMIT NEAR` and `SESSION NEAR CAP` start it again at once: the hand-over on record keeps it
  quiet, but it wakes the session if the limit-stop server fails, or after the reset when the limit stops the session
  in the middle of the hand-over; stop it (`TaskStop`) once the relaunch is scheduled. After `SESSION RESET COLD` do
  not start it again. It stops by itself when the chat is closed, and so does the limit-stop server, which otherwise
  lives until the session stops it after the hand-over."

## The guide page (`orchestrate-agents\references\limits-and-caps-guide.html`): sentences now untrue

Not edited (the main session's page). Line numbers of the live file:

- 568-570, "The helper service does not start: The watch says so. The main chat sends "STOP FOR LIMIT" to each lead
  by message instead." Now the main chat is first told `LIMIT STOP SERVER FAILED` with what failed and when, sends
  the message only to the leads that have not ended with `LEAD STOPPED`, and tells the user.
- 571-572, "A lead stays silent for 15 minutes: The main chat stops it directly. That stops its worker too. The
  hand-over then names their progress files instead of their hand-offs." There is no deadline and no direct stop.
- 574, "The 15-minute rule above covers it." No such rule now: the worker gets the time its command takes.
- Incomplete rather than untrue: 456 (the main chat also stops the server in the same step), 623 (the watch also
  checks the helper during a hand-over), and the failure list has no case for the helper dying during a hand-over or
  an agent's hook getting an error from it, nor for "the usage limit runs out before the leads stop".
- Out of date for other reasons, not this change: 279 ("the watch starts [it]": since run H the hook starts it at the
  cap too) and 608-610 (D-0004 was answered on 2026-10-25).

## Files

Changed by me in the scratch copy (`<scratch>\K\repo\orchestrate-agents`, `<scratch>` =
`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`):
`scripts\watch-session.ps1`, `tests\limit-scripts.tests.ps1`, `SKILL.md`, `references\usage-limits.md`,
`references\start-messages.md`. README names no removed setting, so it is unchanged.

The full set to install (runs K to K4; checked by hashing scratch against live and K's originals): those five plus
`hooks\context-guard.mjs`, `lib\limit-stop.mjs`, `orchestration.config.json`, `scripts\limit-stop-server.mjs`,
`tests\hooks\context-guard.test.mjs`, `tests\scripts\limit-stop-server.test.mjs`: 11 files. Must not be copied: the
scratch register `decisions\OPEN_DECISIONS_CLAUDE.md` is older than the live one.

Created in `<scratch>\K4`: `compare.ps1`, `mutate.ps1`, `install.ps1`, `live-check.ps1`, and the run outputs. No
settings added; no process left running; no test folder or pipe left (listed at 02:03).

## Checks (scratch copy, after the last change, 01:58-02:03, through run-heavy)

- Red first: the new "started again" case failed with "quiet: expected 0, got 2" before the fix; the unit and
  read-only cases failed on the missing `Set-ReportedCheck`.
- PowerShell suite: 104 passed, 0 failed (100 before plus my 4 cases).
- Node suite: 145 tests, 144 pass, 1 fails: the known scratch-copy failure "the shipped settings show this repo's
  register in every chat".
- `node --check` of both hooks, the lib, the server and both Node test files: clean. PowerShell parser: 0 errors in
  the 6 scripts and the test file. The config parses.
- Hook time with no server, 20 runs: main median 66 ms, agent median 66 ms, no output (K2 measured 67-68 after,
  71-76 before K).
- Mutation check of my lines: 14 of 15 caught. The survivor: comparing the lines without letter case (`-eq` for
  `-ceq`); no test has two lines that differ only in case.
- Doc check: a grep of the scratch repo outside `misc` for `STOP FOR LIMIT | AGAIN`, the four removed keys, "TaskStop
  each lead", the old NOT CHECKED sentence and "Do not start the watch again" finds only the tests that prove the
  keys are gone, one intended "not told again", "do not start the watch again" after `SESSION RESET COLD`, and
  `agents\software-developer.md` line 193 (text above).

**Not tested:** the install, both suites in the live repo, and the live check with the installed server (not
installed, see the outcome). The survivor N14 has no test.

## Risky or undecided points

- **A watch already running keeps the old code.** It read the removed key at its start, so it will not fail, but it
  prints the old steps (deadline, TaskStop) and never checks the server. Example: the user's main session started
  its watch at 22:00; after the install it still says "Wait for LEAD STOPPED until 02:30". Recommendation: the main
  session restarts its watch right after the install.
- **A cause whose text changes at every check** (for example an error with a time in it) is still reported at every
  look, as before. None of today's NOT CHECKED texts carries one.
- **The live check writes the machine's log.** `%USERPROFILE%\.claude\state\limit-stop.log` does not exist now
  (02:03); the check creates it with a few lines for two made-up sessions. Recommendation: remove it after the
  check only if every line names one of those sessions.

## For whoever installs (the exact steps)

1. `& '<scratch>\K4\install.ps1' -Mode install`: hash list before, a backup of the 11 live files to
   `<scratch>\K4\live-backup`, the 11 copies in one step, hash list after, and the list of changed files (expect
   exactly the 11; a register change would be another session's).
2. Both suites in the live repo through `run-heavy.ps1 -MinFreeMB 600`; both must be fully green. On any failure:
   `& '<scratch>\K4\install.ps1' -Mode restore` at once.
3. `pwsh -NoProfile -File '<scratch>\K4\live-check.ps1' -Work '<scratch>\K4\live'`: starts the installed server for
   two made-up sessions, kills each, runs the hook as the main session and the watch, twice each, prints their texts
   and the log lines, and stops only its own processes, by id.

## What I learned

- No limit-stop pipe was open on the machine at 01:35, so installing all files at once breaks no running hand-over.
- The guard warned after about 75 tool calls; the reading-in of the three earlier runs cost about a third.

DECISIONS TAKEN: The reported line lives in the watch's decision record (key `reportedCheck`), not in a new file -
a new file was the other choice; the record is the hand-over's own state, read at every look, and a new hand-over
starts clean. | A FAILED line is held to the same rule as NOT CHECKED - the other choice was NOT CHECKED only; the
main session's words were "the same failure only once", and a FAILED line repeats when the server cannot log that
it told. | A record that cannot be written fails open (the line may repeat) - the other choice was silence; a missed
report is worse than a repeat. | Not installed after the context warning - the task says so.
INITIATIVES: The docs also say to stop the restarted watch with TaskStop after a cap hand-over (it would otherwise
check a stopped server each minute until the chat closes). | Docs say what `LIMIT STOP SERVER NOT STOPPED` means
(do not retry; the server ends with the Claude Code process). | The test stub reads its check line from a file, so
a case can change it while a watch runs.
ISSUES FOUND: A watch already running keeps the old texts until restarted (user's main session) - restart it after
the install. | Guide page lines 568-574 are untrue, 279 and 608-610 out of date (list above). |
`agents\software-developer.md` line 193 still names `STOP FOR LIMIT | AGAIN`. | Mutant N14 survives (no case-only
test).
QUESTIONS: none