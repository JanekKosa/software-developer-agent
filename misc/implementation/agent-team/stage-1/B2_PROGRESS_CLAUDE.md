# Agent team stage 1, builder B second pass: progress

Started 2026-10-25 09:18 (clock read). Task: apply the reviewer's four findings on builder B's work where they hold
up; say which are rejected and why. Plan of record sections 1, 2, 3, 8, 11 read. Previous report and progress read.

## Files I own (under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`)

- `scripts\usage-probe.ps1`
- `scripts\watch-session.ps1` (extend; keep every existing marker and behaviour)
- `scripts\schedule-relaunch.ps1`
- `scripts\start-session-in-vscode.ps1`
- `tests\` PowerShell test scripts for these only (`tests\limit-scripts.tests.ps1`)

Plus, in xpp-agent: this progress file, `B2_REPORT_CLAUDE.md`, and an appended "Second pass" section in
`B_REPORT_CLAUDE.md`.

## Findings to check

1. F1 (major) watch-session.ps1 ~336: rate_limit stop with no readable reset time -> SESSION RESET COLD at stop+10
   min while the reset on record is still days ahead.
2. F2 (major) watch-session.ps1 ~16: header says do not restart the watch after LIMIT NEAR; that leaves the
   hand-over-on-record stop path unreachable.
3. F3 (major) usage-probe.ps1 ~57: usageLimits.probeEffort never read, --effort never passed.
4. F4 (major) start-session-in-vscode.ps1 ~249: opens the vscode:// link even when the project window is not in
   front, so the link goes to the last focused window (maybe another project).

## Baseline (09:20)

- Hashes (first 16 hex of SHA256): schedule-relaunch.ps1 1D34C5ED82EEDF1B, start-session-in-vscode.ps1
  D31A274BB37B6C4F, usage-probe.ps1 054615C1B36A0107, watch-session.ps1 AF30794FB60662C3, limit-scripts.tests.ps1
  B8B878314D7E3BBC; not mine: run-heavy.ps1 0EF9005197A887A4, watch-agent.ps1 2954A38BC6F489BA, register.mjs
  D15992170991BB68.
- Suite: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` -> 42 passed, 0 failed, 33 s.
- `claude --help` (2.1.286) lists `--effort <level>`.

## Verdict on each finding (09:25, from reading the code)

- F1 holds: Get-WakeTime ignores the record, Get-StopDecision uses it, so wake (stop+10) and reset (record, days
  ahead) disagree. Plan: Get-WakeTime takes the record; for a rate_limit stop with no readable reset, wake =
  max(stop+RetryMinutes, record.ResetsAt+ResetMarginMinutes) when record.ResetsAt > stop.At (shared helper
  Get-RecordedReset, also used by Get-StopDecision). No record: unchanged (old behaviour). Format-Clock takes $now
  and prints 'yyyy-MM-dd HH:mm' when the moment is not on now's local date (applies to both new markers; the old
  markers keep their own HH:mm).
- F2 holds: the code already keeps a restarted watch quiet with a hand-over on record and ends in RESET COLD after a
  stop; only the instructions forbid the restart. Plan: header and the LIMIT NEAR instruction line say "start this
  watch again now"; characterization test of the restart scenario. usage-limits.md step 5 and CLAUDE.md text are
  builder C's / main's: exact text goes in the report.
- F3 holds: probeEffort unread, no --effort. Plan: Get-ProbeArguments(model, effort, noPersistence); main reads the
  key (missing key = error naming it); round-trip test with a fake claude that logs its arguments.
- F4 holds by the code (link opened regardless of $inFront); the VS Code routing claim is the reviewer's, not
  re-checked (the fix is safe either way). Plan: Get-ChatStartPlan(inFront, folder, prompt) -> {OpenLink, Notice};
  real run opens nothing when not in front, logs the prompt, shows the notice, exit 1; dry run reports the same
  choice from the current foreground window.

## Done

- 09:26 tests written first; RED run: 39 passed, 10 failed, each for the missing feature (the restart-after-LIMIT
  NEAR characterization test passed, as expected: the behaviour exists, only the instructions forbade it).
- 09:28 fixes applied:
  - probe: Get-ProbeArguments(model, effort, noPersistence) puts `--effort <probeEffort>` after `--model`; main reads
    the config once, both keys through Get-ConfigValue; header names both settings.
  - watch: Get-WakeTime takes the record (5th param); new Get-RecordedReset(stop, record) shared with
    Get-StopDecision; main loop reads the record before the wake time. Format-Clock/Format-AgentList/
    Format-HandOverMarker take $now; date shown when not on now's local day. Header: restart after LIMIT NEAR.
    LIMIT NEAR line 2 now starts "Start this watch again now (...). Then stop every lead with STOP FOR LIMIT, write
    the hand-over and run & '...schedule-relaunch.ps1' -ProjectDir ... -HandoverPath ... -At <ISO>."
  - start: Get-ChatStartPlan(inFront, folder, prompt) -> {OpenLink, Notice}; real run with the window not in front
    logs the prompt, shows the notice, opens nothing, exit 1; dry run reports the same choice from the window in
    front now. Header updated.
- 09:29 GREEN: 49 passed, 0 failed, 73 s.
- 09:30 real probe (scratch -StatePath): exit 0, 9.5 s, five-hour 45%, weekly 52%; file = printed line; no
  transcript kept (the probe's projects folder holds only an empty `memory` folder from 08:25, first pass).
- 09:31 parser: 0 errors in all seven .ps1 files; not-mine hashes unchanged.
- 09:37 mutation check (18 mutants, scratch mut.ps1): 16 caught; W3 (stale record not rejected) survived, S4 (real
  run ignores the plan) survived by design. Added case "stop decision - a reset on record from before the stop does
  not stand in for the reset": fails against W3, passes against the real scripts -> 17 of 18.
- 09:38 final suite after the last change: 50 passed, 0 failed, 43 s. No test folders, mutant folders or
  ClaudeRelaunch tasks left; watch files in TEMP 3 before and 3 after (other sessions').
- 09:39 scratch folder b2 deleted. Final hashes: start-session-in-vscode.ps1 D6B6CFBAB768180D, usage-probe.ps1
  949DA5601F58536E, watch-session.ps1 8911E377849A261B, limit-scripts.tests.ps1 B72A048C969DA338,
  schedule-relaunch.ps1 unchanged 1D34C5ED82EEDF1B.

Tests: new cases (8): probe run passes model and effort; watch wake time with a record; watch stop decision with a
stale record; watch date printing; watch run unreadable message stays quiet; watch run restart after LIMIT NEAR;
start plan; start dry run with no window. Changed (6): probe arguments; probe missing key (both keys); hand-over
marker unit (+now); RESET COLD regex (optional date); LIMIT NEAR run (expected clock helper, line 2 restart); start
dry run (step 3 follows the in-front state). Helpers: New-FakeClaude logs arguments, Format-ExpectedClock,
Write-FixtureDecision.

## Left

Nothing in my files. The report is `B2_REPORT_CLAUDE.md`; the "Second pass" section is appended to
`B_REPORT_CLAUDE.md`.
