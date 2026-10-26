# R6a report: the two older watches renamed in code, tests and settings

Worker: software-developer. Started 20:17, copy-in 20:46:24, report 20:57 (2026-10-26, clock read each time).

## Outcome

Done. The Usage and context watch now lives in `scripts\watch-usage-and-context.ps1`, the Agent size and stall watch
in `scripts\watch-agent-size-and-stall.ps1`, and the settings section is `usageAndContextWatch`. The old file names
still work as forwarders until the main session deletes them. Both suites pass in `<orch>` after the copy-in.
Nothing is committed.

## What changed, by effect

- **New file names; the old ones still work.** `watch-session.ps1` and `watch-agent.ps1` are now 3-line forwarders
  (a two-line header comment saying they only forward until the main session has restarted its watches, then the
  call). They went in first, at 20:29, as byte copies plus forwarders, so nothing live broke at any moment. Example:
  the main session restarting `& '...\scripts\watch-session.ps1'` runs `watch-usage-and-context.ps1` with the same
  arguments and gets the same output and exit code.
- **The forwarder's exit line differs from the task's form, on purpose.** I measured the task's
  `exit $LASTEXITCODE`: a misspelled parameter then exits 0, not 1, because a binding error leaves `$LASTEXITCODE`
  unset. The forwarders use `exit $(if ($?) { 0 } elseif ($LASTEXITCODE) { $LASTEXITCODE } else { 1 })`. It gave
  the same exit code as a direct run in all 10 spike cases and all 9 fixture cases: exit 3, exit 0, a normal end
  without `exit` (WATCH ENDED), a normal end after a failed native command, a thrown error, a misspelled parameter,
  a missing value. There is no try/catch, trap or `$ErrorActionPreference` in the forwarder, because each of those
  would change how the called script handles its own errors.
- **Settings key renamed: `watchSession` is now `usageAndContextWatch`.** The keys inside are unchanged; every
  reader, test and `_why` text moved with it. This is safe for the watch running now. Its only reader is the watch
  script itself, which reads the settings once, at its start (old line 665, before the loop). `usage-probe.ps1`,
  the limit-stop server, the hooks and the libs never read that section. `_about` now begins "watch-usage-and-context.ps1,
  the Usage and context watch."
- **Text that names the watch for a person** now says "the Usage and context watch". That covers script headers and
  comments, the limit-stop server's check asker (its "error for" log line and FAILED line), its two "means the same"
  texts, the context-guard hook's SESSION NEAR CAP text, the NOT CHECKED sentence and the `_why` texts. Each script
  header gives the task description beside the command: "Usage and context watch", "Agent size and stall watch".
- **Kept unchanged**, because other code reads them: every line keyword the watches print, the temp files
  `claude-session-watch-<id>.txt` and `.decision.json`, and `decisionAnswersWatch`. The log parser reads the asker
  name back out of the line generically (`lib\limit-stop.mjs`), so renaming the asker breaks nothing.
- **Tests follow the new names and do not need the forwarders.** A helper finds forwarders by their header line, so
  the suite needs no change when they are deleted. A new case checks that each forwarder gives its new script's
  output and exit code (5 fixture runs per pair). The D-0007 misspelled-parameter case now covers both new names and
  both forwarders. The CmdletBinding case skips forwarders, which must have no param block for `@args` to pass
  everything on. The test file now clears `CLAUDE_CODE_SESSION_ID` and `CLAUDE_PID` at its top. No test used them,
  and without this a broken forwarder could have started a watch on the real main session.

## Files

Changed in `<orch>`: `scripts\watch-session.ps1`, `scripts\watch-agent.ps1` (forwarders), `scripts\usage-probe.ps1`,
`scripts\limit-stop-server.mjs`, `lib\limit-stop.mjs`, `lib\transcript.mjs`, `hooks\context-guard.mjs`,
`orchestration.config.json`, `tests\limit-scripts.tests.ps1`, `tests\scripts\limit-stop-server.test.mjs`,
`tests\hooks\context-guard.test.mjs`. New: `scripts\watch-usage-and-context.ps1`,
`scripts\watch-agent-size-and-stall.ps1`. All are UTF-8 without BOM with LF endings, checked before and after.
`schedule-relaunch.ps1` and `start-session-in-vscode.ps1` do not name a watch and are unchanged. Six comment lines
were rewrapped to stay within 120 characters. Outside the diff: nothing installed and no process left. Scratch
folders `%TEMP%\r6a-base`, `r6a-orch`, `r6a-fwd`, `r6a-nofwd` and the result files `%TEMP%\r6a-*.txt` are removed
at the end (see the progress file).

## Checks (all after the last change unless said)

- Baselines before any change: Node 220 of 220 (20:21). PowerShell **103 passed, 1 failed** on an untouched copy
  (20:33). The failing case is D-0007 "every script", because `watch-decision-answers.ps1` (added 20:08) had no case
  in it. The lead's 104/0 baseline is from before that script existed.
- **Final, in `<orch>` after the copy-in: Node 220 of 220; PowerShell 105 passed, 0 failed.** That is 104 old cases
  plus the new forwarder case. Ran 6:23, peak 311 MB (`run-heavy.ps1`'s last line: "peak 311 MB in its processes").
  The two timing tests in `limit-stop-server.test.mjs` passed, so there was no lone re-run.
- Red before green: with the tests changed and the code not, 3 PowerShell cases failed on the missing key and 7
  Node cases failed on the old texts.
- Forwarders against scratch fixtures, run from `<orch>\scripts`: 0 differences in 9 cases (output and exit code).
  In-process (as the PowerShell tool runs a watch) the output is the same. The one difference: after a normal end,
  `$LASTEXITCODE` reads 0 instead of empty.
- Invariant over the repo except `misc\` and `decisions\`. Before (20:18): `watch-session.ps1` 16 hits in 9 files,
  `watch-agent.ps1` 8 in 4 files, `watchSession` 35 in 4 files. Per file, my files held: test file 7/5/16, watch
  script 1/1/12, config 1/0/3, usage-probe 1/0/0. After (20:46): **0, 0, 0 everywhere**; the forwarders name only
  the new files. Leftover "session watch" phrases: `references\lessons.md` 1 and `references\usage-limits.md` 1.
  Those are R6b's files and were still being edited.
- **Mutation check: 14 of 14 caught.** Mutants: a forwarder drops its arguments (2), drops its exit code, uses the
  plain `exit $LASTEXITCODE`, always exits 0; `$Watch` or `$AgentWatch` left at the old name with the forwarders
  removed (2); a reader keeps the old key (2); the settings file keeps the old section; three message texts left
  naming the session watch (server asker, server text, hook text); the NOT CHECKED text.
- Control without the forwarders (as after the main session deletes them): PowerShell 105 passed, 0 failed (21:00). The forwarder case passes there with nothing to check.

**Not tested:** a real restart of the main session's live watch through the forwarder, because only the main
session may touch it. The swap's window is milliseconds: a watch started exactly between the config and script
renames would end with WATCH FAILED and simply be started again.

## Risks and open points

- The swap of config and script is not one transaction. Example: if a restart happened in the same millisecond, the
  new script would read the old config, print WATCH FAILED, and be restarted. Recommendation: none needed.
- The watches' restart lines still say "Start this watch again now" without the description. Facts asked for the
  description wherever a start is described; I put it in the script headers only and left printed lines unchanged.

## Lines the main session must change elsewhere (files not mine)

1. `C:\Users\user\.claude\CLAUDE.md`, section "Agents", first bullet (lines 68-73). It still starts the watch by the
   old name, which works only while the forwarder exists. Replace the six lines with:

   ```
   - **The first action of every main session, in every project, is to start the Usage and context watch** in the
     background: the PowerShell tool with `run_in_background`, description `Usage and context watch`, command
     `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1'`.
     It reads the usage limits and wakes an idle session; what each of its last lines asks for is in the
     `orchestrate-agents` skill, `references/usage-limits.md`. A subagent never starts it. The context-guard hook warns
     every main session at 450k and stops its agents for the hand-over in every project, not only orchestrated ones
     (user, 2026-10-25).
   ```

2. R6b1/R6b2: the key was renamed, so documents say `usageAndContextWatch.<key>`.
3. Information only: `C:\Repos\My projects\claude-code-extensions\misc\implementation\chat-view\CHAT_VIEW_CONTINUATION_PLAN_CLAUDE.md`
   line 82 names `watch-agent.ps1`. It is a written plan, so it stays as it is.
4. After restarting its watches, the main session deletes the two forwarders. Nothing else needs to change.

## Learned

- `& script @args` passes named parameters, switches, `-Name:value` and lists correctly, but a binding error does
  not set `$LASTEXITCODE` (measured with pwsh 7, 2026-10-26).
- `$hashtable.Remove` on a hashtable without a `Remove` key returns the method, not `$null`.

DECISIONS TAKEN: forwarder exits via `$?`/`$LASTEXITCODE` instead of the task's plain `exit $LASTEXITCODE` (that form makes a misspelled parameter exit 0, measured); settings key renamed to usageAndContextWatch rather than kept (only reader reads it once at start); "the session watch" asker in the limit-stop log renamed (display only, parser reads it generically); forwarders found in tests by header line rather than by name (suite survives their deletion).
INITIATIVES: added a D-0007 case for watch-decision-answers.ps1 in limit-scripts.tests.ps1 (fixes the baseline failure; undo = delete that one table line); test file clears CLAUDE_CODE_SESSION_ID and CLAUDE_PID at its top; six comment lines rewrapped to 120.
ISSUES FOUND: PowerShell baseline was 103/1, not 104/0: watch-decision-answers.ps1 (20:08) had no D-0007 case, fixed in my test file; the task's forwarder form would let a misspelled parameter exit 0, avoided; ~/.claude/CLAUDE.md lines 68-73 still name watch-session.ps1 (exact text above).
QUESTIONS: none
