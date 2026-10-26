# Agent team stage 1, builder C second pass: report

Written 2026-10-25 by builder C (second pass). Progress file: `C2_PROGRESS_CLAUDE.md` beside this one. The first
pass's report is `C_REPORT_CLAUDE.md`; its new "Second pass" section is a short version of this file.

**Outcome: done.** Both review findings hold up when checked, and both are fixed in the documents. Neither was
rejected. The test suites' results are under "Checks".

## Finding 1: the user's words were changed on their way into the register

**What was wrong.** `SKILL.md` told the main session to resolve an item with `--answer "<the user's words>"`. In
PowerShell, double quotes are not a safe container. Example: the user answers *go with B, it costs $5 a month*; the
register would have recorded *go with B, it costs  a month*. Measured on 2026-10-25 through my own PowerShell tool
(pwsh 7.6.8, which runs commands through `Invoke-Expression`), against a scratch echo script:

- `$5` vanished, and `$(Get-Date)` in the words was **executed** and its output recorded.
- Curly double quotes split the argument in two (`register.mjs` would refuse the extra argument).
- A backtick-n became a real line break.

**What changed.**

- `SKILL.md`, "The decision register": the resolve command now takes the words from a single-quoted here-string
  (`$answer = @'`, the words, `'@`, then `--answer $answer`), with one sentence saying why double quotes are wrong.
- One corner remains: a line of the words that itself starts with `'@` (or a curly quote and `@`) ends the
  here-string early. The command then fails to parse and nothing runs, so nothing wrong is written. The page names
  the fallback: save the words with the Write tool and pass `--answer (Get-Content -Raw -LiteralPath '<file>')`.
- `start-messages.md`, "Pass the user's answer": points at that form.
- Leads are not affected: they write `entry.json` with the Write tool (`task-lead.md`), never through the shell.

**Not taken: an `--answer-file` option.** The reviewer offered it as an alternative. `register.mjs` is builder A's
file, and I may not message other agents. Recommendation for the main session: ask for it later. It would make the
file route the main one and remove the `'@` corner.

## Finding 2: nothing watched the session during a limit hand-over

**What was wrong.** After `LIMIT NEAR | HAND OVER` the watch has ended, and the documents said not to start it
again. Stopping the leads and writing the hand-over can take a quarter of an hour. If the real limit stopped the
session in that time, nothing would wake it after the reset: `autoContinueAtUsageLimit` is off, and no relaunch was
scheduled yet. The watch's own code already covers this case once it runs: a restarted watch stays quiet while a
hand-over decision is on record (`watch-session.ps1` line 502), and turns a hard stop into `SESSION RESET COLD`
(lines 466-474 with line 327). The wait for leads also had a deadline in words only.

Example: at 14:20 the watch prints `LIMIT NEAR`, going cold at 14:55. Lead A is waiting on its worker and does not
answer. Before: the main session waits with no watch running; at 14:40 the limit stops it, and it sleeps until
someone looks. Now: a fresh watch is running, and wakes the session after the reset with `SESSION RESET COLD`. At
14:55 the deadline wakes the main session, which stops lead A and hands it over from its files.

**What changed.** In `usage-limits.md` the `LIMIT NEAR` steps are now eight:

- New first, the watch is started again at once.
- New second, a deadline is set. It is a background PowerShell task that sleeps until the first "going cold" time,
  and its ending wakes the session.
- When the deadline comes, a lead that is still silent is stopped with `TaskStop`.
- After the relaunch is scheduled, the watch is stopped with `TaskStop`.
- `schedule-relaunch.ps1` is never run twice.
- If the watch ends during the hand-over, the session acts on its line as usual, but does not restart it after
  `SESSION NEAR CAP`.
- `SESSION RESET COLD` now also covers "a hand-over was decided before the stop".

`SKILL.md` matches: the start rule ("Start it again every time it ends, except after `SESSION NEAR CAP` and
`SESSION RESET COLD`. After `LIMIT NEAR` start it again too, and stop it with `TaskStop` once the relaunch is
scheduled.") and a shorter limit bullet.

**Initiatives (not asked for by the finding), each easy to take back:**

- A lead that misses the deadline is stopped with `TaskStop`. Otherwise it works on beside the fresh lead the new
  session starts from the same lead file: two agents on the same files.
- The watch is stopped also when the relaunch could not be scheduled. The session has nothing left to do, and the
  user starts the new chat by hand.

## Paths

Changed (all in `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`): `SKILL.md`,
`references\usage-limits.md`, `references\start-messages.md`. The other nine files of mine are byte-identical to the
start of this pass (SHA-256 compared): `task-lead.md`, `software-developer.md`, `code-searcher.md`, `README.md`,
`CLAUDE.md`, `install.ps1`, `lessons.md`, `worker-rules.md`, `lead-brief-template.md`.

Outside the diff: none. The scratch folder of this pass (in the session scratchpad) is deleted (see "Checks").

## Text the shared files need

- **`watch-session.ps1` (builder B's): nothing left.** At 09:56 its header (lines 16-18) and its line after
  `LIMIT NEAR` already say to start the watch again at once (builder B's second pass). They match my steps. One
  small gap remains: neither says to stop the watch once the relaunch is scheduled. That is step 7 of
  `usage-limits.md`, so builder B may want to add it.
- **xpp-agent `CLAUDE.md`, "Session Watch" (the main session's).** Besides the stale path the first pass reported,
  replace "Start the watch again every time it ends, except after a hand-over, and after every restart of Claude
  Code or VS Code, which kills it." with: "Start the watch again every time it ends, except after
  `SESSION NEAR CAP` and `SESSION RESET COLD`, which lead straight to a hand-over. After `LIMIT NEAR | HAND OVER`
  start it again too, and stop it with `TaskStop` once the relaunch is scheduled. Start it again after every
  restart of Claude Code or VS Code, which kills it." Its marker list also lacks `LIMIT NEAR | HAND OVER` and
  `SESSION RESET COLD`.

## Settings added

None. The deadline snippet has no tunable value: it sleeps once until the printed time.

## Checks

All after my last edit (09:35), on 2026-10-25:

- **Quoting, before the fix:** with double quotes, 3 of 6 cases arrived changed. The other 3 passed only because I
  escaped them by hand.
- **Quoting, after the fix:** with the here-string, 10 of 10 cases arrived byte for byte. They covered `$`, curly
  and straight quotes, backticks, `&`, backslashes, two lines, `'@` mid-line and Polish letters.
- **End to end:** I resolved 7 items through `register.mjs` on a scratch register, 6 from a here-string and 1 from
  a file. All 7 hold the exact words, with line breaks turned into spaces. The file has CRLF line endings only. The
  comparer caught a planted swap (2 of 2).
- **The `'@` corner:** the command failed to parse and nothing ran.
- **The deadline:** it ended at once for a past time, in both time forms. Started in the background with a 09:30
  deadline, it ended at 09:30:00 and its end reached me.
- **The watch:** builder B's test "restarted after LIMIT NEAR, a limit stop during the hand-over ends in SESSION
  RESET COLD after the reset" passes.
- **Full suites,** both through `run-heavy.ps1`:
  - `node --test`: 71 of 71 pass.
  - `pwsh -NoProfile -File tests\limit-scripts.tests.ps1`: 50 passed, 0 failed.
  - Both ran against builders A's and B's files while their second passes were still running.
- **The three changed documents:** no non-ASCII characters, LF line endings, and every named path exists.
  `SKILL.md` is now 15,431 bytes, up from 14,498.
- **Clean-up:** my scratch folder is deleted and all my background tasks have ended.

**Not tested:**

- A real limit hand-over, end to end. It needs a live limit.
- `TaskStop` on a lead, and whether it stops that lead's worker. No agent may be started in this task.
- The here-string typed by a main session. I typed it through the same PowerShell tool the main session uses, but
  not as that session.

## Risks, each with a recommendation

1. **`TaskStop` on a lead may not stop its running worker.** Not verified. Example: lead A is stopped at 14:55
   while its worker still edits files; the new session's worker for the same task would then share files with it.
   Recommendation: before the first real limit hand-over, check once on a scratch task whether stopping a lead stops
   its worker (the worker's transcript stops growing). If not, the step must also stop the worker by its id.
2. **The context-cap hand-over still runs without a watch.** After `SESSION NEAR CAP` the watch cannot be
   restarted, because it would end again at once. A limit stop during that hand-over wakes nothing. This was so
   before and is unchanged. Recommendation: leave it. The user starts that next session by hand anyway.

## Learned

- The PowerShell tool runs a command through `Invoke-Expression`: a parse error in it names that. So `$(...)` in a
  double-quoted argument runs as code before the program starts.
- A single-quoted here-string carries straight and curly quotes, `$`, backticks, `&`, backslashes and line breaks to
  a Node program byte for byte (pwsh 7.6.8, `PSNativeCommandArgumentPassing` = `Windows`).
- A background task started by a workflow subagent reports its end to that subagent as a task notification.
- The watch now prints a time with its date when it is not today (builder B's `Format-Clock`). So the deadline
  snippet cannot misread a time just after midnight.
- `run-heavy.ps1` passes its command's output to the console directly. A `*>` redirect of the call captures only
  run-heavy's own lines; the test results appear in the tool's output.

```
DECISIONS TAKEN: resolve form = single-quoted here-string (other: ask builder A for --answer-file; why: register.mjs is not mine and I may not message agents) | deadline = one background sleep until the printed time (other: a polling loop; why: no interval value to hardcode)
INITIATIVES: TaskStop of a lead that misses the limit deadline | watch stopped also after RELAUNCH NOT SCHEDULED | no restart of the watch after SESSION NEAR CAP during a limit hand-over
ISSUES FOUND: watch-session.ps1 header and LIMIT NEAR line already say to restart the watch (builder B2, seen 09:56) but not to stop it once the relaunch is scheduled | xpp-agent CLAUDE.md Session Watch restart rule and marker list are stale
QUESTIONS: Should register.mjs gain --answer-file? | Should a probe check whether TaskStop of a lead also stops its worker, before the first real limit hand-over?
```
