# R6a progress: rename the two older watches in code, tests and settings

Worker: software-developer, started 2026-10-26 20:17 (clock read). Task: `R6A_TASK_CLAUDE.md` in this folder.
`<orch>` = `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.

## Files I own (from the task, section 4)

In `<orch>`: `scripts\watch-session.ps1`, `scripts\watch-agent.ps1` (become forwarders),
`scripts\watch-usage-and-context.ps1`, `scripts\watch-agent-size-and-stall.ps1` (new), `scripts\usage-probe.ps1`,
`scripts\limit-stop-server.mjs`, `scripts\schedule-relaunch.ps1` and `scripts\start-session-in-vscode.ps1` (if they
name a watch), `lib\limit-stop.mjs`, `lib\transcript.mjs`, `hooks\context-guard.mjs`, `orchestration.config.json`,
`tests\limit-scripts.tests.ps1`, `tests\scripts\limit-stop-server.test.mjs`, `tests\hooks\context-guard.test.mjs`,
any other test or code file under `<orch>` with a hit (not: SKILL.md, references\, register code and tests,
watch-decision-answers.ps1 and its test, decision-reminder.mjs).

## Baseline (2026-10-26 20:18)

Old-name hit counts (case-sensitive, repo minus misc\ decisions\ .git node_modules), script
`<scratchpad>\count-hits.ps1`:

- `watch-session.ps1`: README.md 1, orchestration.config.json 1, SKILL.md 1, references\agent-team-guide.html 1,
  references\limits-and-caps-guide.html 1, references\usage-limits.md 2, scripts\usage-probe.ps1 1,
  scripts\watch-session.ps1 1, tests\limit-scripts.tests.ps1 7.
- `watch-agent.ps1`: README.md 1, references\lessons.md 1, scripts\watch-agent.ps1 1, tests\limit-scripts.tests.ps1 5.
- `watchSession`: orchestration.config.json 3, references\usage-limits.md 4, scripts\watch-session.ps1 12,
  tests\limit-scripts.tests.ps1 16.
- `session watch` (display text): config 6, SKILL.md 3, hooks\context-guard.mjs 6, lib\limit-stop.mjs 3,
  lib\transcript.mjs 1, references (agent-team-guide 2, lessons 2, limits-and-caps-guide 3, usage-limits 2),
  scripts\limit-stop-server.mjs 6, scripts\usage-probe.ps1 1, scripts\watch-session.ps1 1,
  tests\limit-scripts.tests.ps1 1, tests\hooks\context-guard.test.mjs 4, tests\scripts\limit-stop-server.test.mjs 7.
- `agent watch`: tests\limit-scripts.tests.ps1 4. `session-watch` (temp-file names, keep): watch-session.ps1 2,
  tests 14.

## Plan

1. Forwarders in `<orch>` (copies byte-exact, then forwarders), prove on a scratch fixture.
2. Rename in a scratch copy `C:\Users\user\AppData\Local\Temp\r6a-orch`, suites there.
3. Copy changed files in one step, suites in `<orch>`, invariant, mutation check, report.

## Done

- 20:21 Node baseline in `<orch>` (untouched): 220 of 220 pass, peak 319 MB.
- 20:22 Untouched copy of `<orch>` at `C:\Users\user\AppData\Local\Temp\r6a-base` (42 files) for the PowerShell
  baseline (running). Note: `scripts\watch-decision-answers.ps1` (written 20:08, after the lead's 15:02 PS baseline) has
  no case in the D-0007 "every script: a misspelled parameter" test, which demands one per .ps1: expect it to fail.
- Spike (scratchpad\spike, measured 2026-10-26 20:25, pwsh 7): the task's form `& ... @args; exit $LASTEXITCODE`
  passes named parameters, switches, `-Name:value`, lists and exit codes, but a misspelled parameter exits **0** under
  `pwsh -File` (direct: 1), because a binding error is statement-terminating and leaves `$LASTEXITCODE` unset. Chosen
  exit expression: `exit $(if ($?) { 0 } elseif ($LASTEXITCODE) { $LASTEXITCODE } else { 1 })` -- same exit code as a
  direct run in all 10 spike cases (exit 3, exit 0, normal end, normal end after a failed native command, throw,
  misspelled, missing value, list ...). No try/trap and no $ErrorActionPreference change, which would alter the
  called script's own error behaviour.
- 20:29 Forwarders in `<orch>`: `watch-usage-and-context.ps1` and `watch-agent-size-and-stall.ps1` are byte copies
  (SHA256 350E4C4B..., 93E92342..., same as the old files); `watch-session.ps1` and `watch-agent.ps1` are 3-line
  forwarders (UTF-8 no BOM, LF). Proof (`scratchpad\prove-forwarders.ps1 -ScriptsRoot <orch>\scripts`, scratch
  fixtures): file mode 0 differences of 9 cases (SESSION NEAR CAP with a stub server, WATCH FAILED x2, misspelled,
  NEAR CAP, WATCH ENDED normal end, WATCH FAILED, misspelled, missing value). In-process: output the same; only
  `$LASTEXITCODE` after a normal end reads 0 instead of empty.

- 20:33 PS baseline on the untouched copy: **103 passed, 1 failed** (the D-0007 every-script test, missing a case for
  watch-decision-answers.ps1), ran 4:36, peak 306 MB. The lead's 104/0 is from before that script existed.
- 20:35-20:50 Rename in scratch copy `C:\Users\user\AppData\Local\Temp\r6a-orch` with
  `scratchpad\apply-replacements.ps1` + `scratchpad\r6a-replacements.ps1` (exact texts, all-or-nothing counts).
  Phase A (tests) first: red run showed 3 PS cases failing on the missing `usageAndContextWatch` key and 7 Node cases
  on the renamed texts; forwarder and D-0007 cases passed (forwarders already in place). Phase B (code, settings),
  phase C (six comment lines rewrapped to 120). All files UTF-8 no BOM, LF; parse and `node --check` clean.
- Test changes: paths `$Watch`/`$AgentWatch` to new names; section titles; `watchSession` keys (16); `agent watch` test
  names -> `agent size and stall watch`; `Get-Forwarders` finds forwarders by their header line (so the suite needs
  no change when the main session deletes them); D-0007 misspelled table: new names, a case for
  watch-decision-answers.ps1 (initiative, fixes the baseline failure), forwarders get their target's case;
  CmdletBinding test skips forwarders; new case 'forwarders: an old file name gives the output and exit code of its
  new script' (clears CLAUDE_CODE_SESSION_ID/CLAUDE_PID so a broken forwarder cannot reach the real session).

- 20:41 Node suite on the copy: 220 of 220. PS suite on the copy running (pre-phase-D test file).
- 20:44 Phase D: the test file clears CLAUDE_CODE_SESSION_ID and CLAUDE_PID once at its top (no test relies on
  them; found in review: the D-0007 case now runs the forwarders, and a forwarder that lost its arguments would take
  the shell's real session id); the forwarder case lost its local save/restore. Control copy without forwarders:
  `C:\Users\user\AppData\Local\Temp\r6a-nofwd` (test file synced after phase D).
- Prepared: `scratchpad\run-mutants.ps1` (14 mutants), `scratchpad\copy-in.ps1` (checks targets unchanged vs
  r6a-base, stages `.r6a-new`, atomic File.Move swap; dry run passed 20:39).

- 20:45 PS suite on the copy (pre-D test file): 105 passed, 0 failed; ran 6:51 with Node, peak 270 MB. After D:
  forwarders*, every script*, probe environment case: 4 of 4 pass.
- **20:46:24 copy-in done** (`copy-in.ps1`): 11 files, targets checked unchanged first, hashes equal after, no
  `.r6a-new` left. `<orch>` now equals the copy except SKILL.md and 5 references (R6b's, in progress).
- 20:46 Invariant after copy-in (repo minus misc, decisions): `watch-session.ps1` 0, `watch-agent.ps1` 0,
  `watchSession` 0 everywhere (the forwarders name only the new files). "session watch": references\lessons.md 1,
  references\usage-limits.md 1 (R6b's files).
- Running (background): final Node + PS suites in `<orch>` (task bx6uqmh99, outputs `%TEMP%\r6a-final-node.txt`,
  `r6a-final-ps.txt`), then queued mutants (`%TEMP%\r6a-mutants.txt`) and the no-forwarders control suite
  (`%TEMP%\r6a-nofwd-ps.txt`) (task bqnoebg2s).

- **20:53 final suites in `<orch>` (after the copy-in): Node 220 of 220; PowerShell 105 passed, 0 failed**; ran
  6:23, peak 311 MB. The two timing tests of limit-stop-server.test.mjs passed, so no lone re-run was needed.
- 20:53 first mutation run aborted on a bug in my runner (`$m.Remove` on a hashtable is its method); fixed, re-queued
  (task b7bpz6biu) with the control suite.

- 20:56 Mutation check: **14 of 14 caught** (see the report for the list).
- 21:00 Control suite without the forwarders: PowerShell 105 passed, 0 failed.
- 21:00 Context guard (321k) reached at 20:54; closed: report written
  (`R6A_REPORT_CLAUDE.md`), scratch folders `%TEMP%\r6a-*` and result files removed (checked by listing). Scripts kept
  in the session scratchpad only (count-hits, file-format, prove-forwarders, apply-replacements, r6a-replacements,
  run-mutants, copy-in). Every check ran in full; nothing is left half done.

## Decisions

- Settings key: only `watch-session.ps1` reads `watchSession` (grep over `<orch>` code: config, the script, tests,
  references only), at line 665, once before its loop. A running watch is not affected by the rename, so the key
  becomes `usageAndContextWatch`.
- `CHECK_ASKER = 'the session watch'` in limit-stop-server.mjs is display text: findServerFailure reads the asker name
  back out of the log line generically (lib\limit-stop.mjs 255-258), so renaming it breaks no parser.
