# Run I progress: one-minute wake-up waits, and a new chat after a context-cap hand-over

Started 2026-10-25 20:07 (Get-Date). Worker started directly by the main session (no lead). Never commit.

## Files I own (planned)

All under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`:

- `orchestration.config.json` (three waits to 1, new setting `relaunch.afterCapMinutes`)
- `scripts\schedule-relaunch.ps1` (a way to say "after a context-cap hand-over": now plus the new setting)
- `scripts\start-session-in-vscode.ps1` (only if the cap relaunch needs its own notification words)
- `scripts\watch-session.ps1` (SESSION NEAR CAP third line: the relaunch step with its command)
- `hooks\context-guard.mjs` (SESSION NEAR CAP text), `scripts\limit-stop-server.mjs` (main text at the cap),
  maybe `lib\limit-stop.mjs` (one shared builder of the cap relaunch command)
- Tests: `tests\limit-scripts.tests.ps1`, `tests\hooks\context-guard.test.mjs`, `tests\scripts\limit-stop-server.test.mjs`
- Docs: `SKILL.md`, `references\usage-limits.md`, any other repo file that says 5 or 10 minutes or that the user
  starts the next chat after a cap hand-over. NOT `references\limits-and-caps-guide.html` (main session's page).

Not mine: any `CLAUDE.md`, `agents\`, settings files, anything outside this repo, xpp-agent.

## Plan (20:20)

1. Config: `watchSession.resetMarginMinutes` 5 -> 1, `watchSession.retryMinutes` 10 -> 1,
   `usageLimits.relaunchMarginMinutes` 5 -> 1, each `_why` updated; new `relaunch.afterCapMinutes` 1 with a `_why`.
   `usageLimits.resumeMarginMinutes` stays 10.
2. `schedule-relaunch.ps1`: new switch `-ContextCap` in place of `-At`: run time = now + `relaunch.afterCapMinutes`
   (reuses Get-RelaunchTime 'now'); `-At` with `-ContextCap` refused; without either, "-At is required." as before.
   The task's arguments get ` -ContextCap` (passed on to the start script) only at the cap, so a limit relaunch's
   arguments stay byte-for-byte the same. Task description names the cause.
3. `start-session-in-vscode.ps1`: same switch; only the three notification texts change their opening ("the limit
   has reset" -> "the session has handed over at its context cap"). Reason: a cap relaunch must not tell the user
   a limit reset that never happened. Safety steps unchanged.
4. Watch SESSION NEAR CAP: line 1 "write the hand-over, schedule the next chat and end the session"; line 3 names
   `& '<scripts>\schedule-relaunch.ps1' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`.
5. Hook SESSION NEAR CAP and the server's main text at the cap: the same command, built once by
   `capRelaunchCommand(skillDir)` in `lib\limit-stop.mjs`.
6. Docs: SKILL.md, usage-limits.md, others found by grep. Guide html untouched; list its untrue sentences.

Proof: red tests first (PS: config-driven waits in watch runs and relaunch dry runs, the shipped values, the
watch's command round trip, the cap notices; Node: hook and server texts carry the command), then both suites,
parser, node --check, mutation check of changed lines, doc grep.

## Log

- 20:07 read task, the three skills, H report, config, schedule-relaunch.ps1, start-session-in-vscode.ps1, the
  watch's SESSION NEAR CAP / RESUMED / RESET COLD parts, the hook's and server's cap texts.
- 20:12 baseline: git status shows every top-level entry untracked (`??`); no links in the repo; 127 files hashed
  to `<scratch>\I\baseline-hashes.txt` (scratch = the session scratchpad). Suites through run-heavy: Node 117 of 117,
  PowerShell 80 passed 0 failed.
- 20:25 tests written first. PS: settings test now reads reset margin 3 and retry 4 from a config copy; new
  'config: every automatic wake-up and relaunch waits one minute'; near-cap watch run expects the new line 1 and the
  command at the end of line 3; new watch run that extracts the printed command and dry-runs it (afterCapMinutes 37
  -> now + 37, arguments end in -ContextCap); new watch run: retry 2 / margin 1 wake, 30 keeps quiet; new relaunch
  dry runs (-At now + relaunchMarginMinutes 6, -At with -ContextCap refused, neither -> "-At is required.", missing
  afterCapMinutes key refused only for -ContextCap); start: Get-RelaunchCause and the cap notice, -ContextCap dry run.
  Node: hook nearCapPattern(world, ...) with the new words and the command; hook's main text ends with the command;
  server capEnding(world).
- 20:16 red (partial read): Node 4 expected failures (3 hook, 1 server), all on the missing words/command. PS so far:
  config one-minute test fails (5), near-cap marker and command tests fail. Rest still running.
- CORRECTION (clock read 20:30:41): the times 20:26, 20:35, 20:46 and 20:47 below were written without reading the
  clock and are wrong. Measured: the mutation check started 20:24:28 (its results file), so the green run ended just
  before it; the red run ended about 20:19.
- (about 20:19) red done: PS exit 6 = 6 failures, all expected (config 5 not 1; watch marker words; watch command missing;
  -At with -ContextCap accepted because the script had no such switch; Get-RelaunchCause missing x2). The
  config-driven wait tests (watch run wake, relaunch -At now + 6) pass on old code, as they must: the code already
  read those keys. Their bite is checked by mutants W04, W05, R10.
- 20:35 code written: lib\limit-stop.mjs capRelaunchCommand(skillDir); hook nearCapMessage and server mainText use
  it; schedule-relaunch -ContextCap (Get-RelaunchBasis, Get-RelaunchArguments adds ' -ContextCap', task
  description by cause); start-session -ContextCap (Get-RelaunchCause, three notices); watch line 1 and
  Format-NearCapSteps with $PSScriptRoot; config 1/1/1 + relaunch.afterCapMinutes 1. Docs: usage-limits.md (resume
  wake times, cap step 4, relaunch times, notification cause), SKILL.md (cap paragraph, the one minute after reset).
  JSON parses; parser 0 errors on 4 ps1; node --check clean on 5 mjs.

- 20:46 green, both through run-heavy: Node 117 of 117 (ran 0:43), PowerShell 85 passed 0 failed (ran 2:39).
  Hash check against the baseline: exactly my 12 files changed plus this progress file; nothing else.
- 20:47 comment fix in schedule-relaunch.ps1 (ConfigPath param names both waits). Mutation check started in the
  background through run-heavy: `<scratch>\I\mutate.ps1` with `<scratch>\I\mutants.ps1` (29 mutants: C01-C04
  config, R01-R10 schedule, T01-T05 start, W01-W05 watch, K01-K02 hook, S01 server, L01-L02 lib); results in
  `<scratch>\I\mutation-results.txt`. Do not edit orchestrate-agents while it runs (it copies the tree per mutant).
  Expected survivors: R08 (task description, only seen with -RealTask), T03/T04 (notifications in the main part,
  no test reaches them without a screen).
- Doc check: grep of the repo outside misc, decisions, skills and tests: no 5- or 10-minute wake or relaunch left,
  no "user starts the next session". Left: the guide html (not mine) lines 598, 599, 641.
- Left: mutation results; final suites after the last change (the comment fix); report.

- 20:30:39 mutation check ended: 29 run, 26 caught, 3 survived (R08 task description, T03/T04 notifications in the
  main part), 0 invalid. Copy of results: `<scratch>\I\mutation-results-first.txt`.
- 20:31 survivors: Get-RelaunchDescription extracted (Register-RelaunchTask calls it) with a unit test; an AST test
  that every Show-Notification in start-session opens with "Claude: $cause" or is $plan.Notice. New mutant R11.
  20:31:57-20:32:31 re-run R08, R11, T03, T04: 4 of 4 caught. relaunch:* 8 passed, start:* 10 passed.
- 20:30 CONTEXT GUARD at 321k: closing.
- 20:33-20:36 final, after the last change: config JSON parses; parser 0 errors over every ps1 under scripts and
  tests; node --check 0 failures on 23 mjs; Node 117 of 117; PowerShell 87 passed 0 failed; hash check: my 12 files,
  this progress file and the report, nothing else; no ClaudeRelaunch task registered. Empty scratch `mut` folder
  removed; `<scratch>\I` keeps scripts, results and mut-logs.
- Done. Report: `I_REPORT_CLAUDE.md`.

## Contract (for anyone matching it)

- Command: `& '<orchestrate-agents>\scripts\schedule-relaunch.ps1' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`
- schedule-relaunch: `-ContextCap` and `-At` exclusive; run time = now + `relaunch.afterCapMinutes`; the task's
  arguments end in ` -ContextCap`; key read only for the cap.
- start-session: `-ContextCap` changes only the notification cause text.
