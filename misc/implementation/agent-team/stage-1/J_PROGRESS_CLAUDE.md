# Run J: progress

Started 2026-10-25 22:06 (clock). Worker for run J, started by the main session. Task: `J_TASK_CLAUDE.md`.

## Files I own (may change)

- `orchestrate-agents\orchestration.config.json` (retryMinutes, its _why; the new register list)
- `orchestrate-agents\hooks\decision-reminder.mjs`
- every `.ps1` under `orchestrate-agents\scripts` (the `[CmdletBinding()]` line, nothing else unless a caller needs it)
- tests: `orchestrate-agents\tests\limit-scripts.tests.ps1`, `orchestrate-agents\tests\hooks\decision-reminder.test.mjs`
- docs that name the server-error wait or the reminder: `orchestrate-agents\SKILL.md`, `orchestrate-agents\references\*.md`
  (not `limits-and-caps-guide.html`: the main session's page)
- this progress file and `J_REPORT_CLAUDE.md`

Not mine: any `CLAUDE.md`, settings files, `agents\`, `skills\`, `decisions\` entries, the guide page, anything outside
the repo.

## Baseline

- 22:08 hash list of all 129 repo files: scratchpad `J\baseline-hashes.txt`. The repo has no commits (everything
  untracked), so git status proves nothing; the hash list is the proof.
- 22:08 no `ClaudeRelaunch*` scheduled task, no `claude-limit-stop*` pipe.
- Suites 22:09-22:13 through run-heavy: Node 117 of 117 pass; PowerShell 87 passed, 0 failed. (Counts are in the
  background task's output file, not in my log: run-heavy passes the command's output to the console.)

## Measured (2026-10-25, PowerShell 7.6.8, scratch scripts, spike folder removed)

- Bare `param()`: `pwsh -File s.ps1 -DryRunn` exits 0 and runs, `-DryRunn` lands in `$args`; an extra positional
  value too; `-Verbose` lands in `$args`.
- `[CmdletBinding()] param()`: exits 1, nothing ran, stderr `s.ps1: A parameter cannot be found that matches parameter
  name 'DryRunn'.`; extra positional: `A positional parameter cannot be found that accepts argument 'extra'.`;
  in-process `&` and dot-source throw ParameterBindingException.
- `param()` with one `[Parameter()]` and no CmdletBinding: the same as CmdletBinding. So run-heavy.ps1 and
  watch-agent.ps1 (they have `[Parameter(Mandatory = $true)]`) already refuse unknown names.
- A unique prefix still binds in every form: `-Dry` sets `-DryRun`. Only a name that is not a prefix of exactly one
  parameter fails. Docs (about_Functions_CmdletBindingAttribute, about_Functions_Advanced_Parameters, read 22:15) agree.

## Callers checked (D-0007)

- Scanner `J\scan-callers.ps1` (params from each script's syntax tree): 36 `-Name`s written after a script name in
  docs, texts and code (repo outside misc/decisions/skills, plus xpp-agent CLAUDE.md): all exact.
- Scanner `J\scan-names.ps1`: every `-PascalName` in docs and Node code; the only non-params are cmdlet/pwsh ones
  (-Raw, -LiteralPath, -Recurse, -Seconds, -File, -NoProfile, -Path, -Tail, -TotalCount, -CaseSensitive).
- In code: watch-session -> usage-probe passes -ConfigPath -StatePath -FreshMinutes (all real); schedule-relaunch's
  task line passes -ProjectDir -Prompt [-ContextCap] to start-session-in-vscode (all real) plus pwsh's -NoProfile
  -WindowStyle -File; tests' Import-ScriptFunctions passes Command to run-heavy (real). No script reads `$args`.
- No script parameter clashes with a common parameter name.

## Plan

1. D-0006: `watchSession.retryMinutes` 1 -> 10, `_why` texts, I's pinning test, docs naming the server-error wait.
2. D-0007: `[CmdletBinding()]` on the 7 scripts; check callers; test misspelled parameter fails before anything happens.
3. D-0008: config list of registers shown in every chat; hook prints one line per register naming the repo; dedupe;
   nothing when none open. Tests first. Time the hook 20 times before and after.

## Done

- 22:2x D-0006, red then green: config `watchSession.retryMinutes` 10; `_whyRetryMinutes` says ten minutes and why;
  the three one-minute `_why`s now say "as for every relaunch and every wake-up after a reset (a wake after a server
  error waits ... retryMinutes, D-0006)". I's pinning case rewritten: three at 1 ("one minute"), retry at 10 ("ten
  minutes"), none says "every automatic wake-up". `usage-limits.md` line 62: (1) -> (10) with the reason.
  Red: failed on the old `_why` text. Green after.
- 22:2x D-0007, red then green: `[CmdletBinding()]` plus one comment line above `param(` in all 6 scripts
  (run-heavy, schedule-relaunch, start-session-in-vscode, usage-probe, watch-agent, watch-session). New cases in
  `limit-scripts.tests.ps1`, section "Every script: parameter names":
  1. every script: a misspelled parameter fails before a line runs (exit 1, stdout empty, stderr names it); each case
     also carries arguments that keep the script harmless if it ran (missing config, missing project, stub server,
     no real probe). Red: schedule-relaunch printed RELAUNCH NOT SCHEDULED (it ran).
  2. relaunch: a valid dry run plus `-ExpireAfterHrs 2` prints nothing and exits 1. Red: it printed DRY RUN.
  3. every script declares `[CmdletBinding()]` (syntax tree). Red: run-heavy had none.
  4. round trip: the task's argument line (Get-RelaunchArguments, limit and cap) binds to the real start script in a
     dry run (pwsh's own `-WindowStyle Hidden` left out, so the test's console is not hidden). Passes on old code too
     (a guard; mutation check to show it bites).
  5. the watch's call of usage-probe.ps1 passes only probe parameters (syntax tree). A guard too.
  Hard links: every edited file has 1 name; `~\.claude\skills\orchestrate-agents` is a junction to this folder.
- 22:18-22:21 full PowerShell suite after D-0006/D-0007: 92 passed, 0 failed (87 + 5 new).
- Seen 22:21: `decisions\OPEN_DECISIONS_CLAUDE.md` and `RESOLVED_...` were rewritten at 22:18:57 by someone else
  (most likely the main session moving D-0004); the open file now holds only its header. Not mine; it will show in
  my hash diff.
- Hook timing BEFORE (22:21, real hook, real registers, read-only, 20 runs each, both registers empty): chat in
  xpp-agent median 64 ms (max 76); chat in the agent repo median 71 ms (max 89).
- 22:2x D-0008, red then green:
  - `lib\decision-register.mjs`: `summaryLine(location, label = 'Decision register')`; register.mjs unchanged.
  - `hooks\decision-reminder.mjs`: own register, then `register.showInEveryChat` folders in order; key = root,
    lower case on Windows; one line each `Decision register of <folder name> (<root>): ...`; then the instruction on
    its own line. Bad entry (not a string, not absolute, not an existing folder): left out, one stderr line. Setting
    missing / not a list: own line still shows, one stderr line. Unreadable register: left out, one stderr line
    naming its file (a test caught the bare `EISDIR` message first; fixed).
  - Config `register.showInEveryChat` = ["C:\\Repos\\My projects\\software-developer-agent"] with `_why`.
  - Tests: `decision-reminder.test.mjs` rewritten, 11 cases, every case but the bad-input ones runs a skill copy
    naming only scratch repos (the real hook would read the real agent register). Lib test: 1 new case (label).
    Red: 7 failures on the missing feature. Green: 11 of 11 hook, 28 of 28 for hook + lib.
  - SKILL.md "The reminder" bullet updated.
- Hook timing AFTER (22:23, same method): xpp-agent median 66 ms (max 78); agent repo median 65 ms (max 77).
  The extra register costs nothing measurable on this data (both empty).
- 22:2x tests added after reading my own tests: relative entry whose folder exists beside the hook's cwd; an
  unreadable register (its open file is a folder). The second caught a bare EISDIR stderr line; hook now names the file.
- 22:26 parser 0 errors over 7 .ps1; node --check 0 failures over 23 .mjs; config valid JSON.
- 22:29 real material: copy of the real RESOLVED register (8 entries) as a scratch repo's open file; chat in real
  xpp-agent: one line naming the scratch team repo, 8 open; chat inside that repo: the same single line. Scratch removed.
- Doc check: only `limits-and-caps-guide.html` (main session's) still says one minute for the server error: lines
  577-578 and 599. Nothing else in the repo (outside misc/decisions/skills).
- About 22:28 (time taken from the suite log; I first wrote 22:30 without reading the clock) CONTEXT GUARD at
  322k: closing. Mutation check running (`J\mutate.ps1`, log `J\mutate-1.log`; control 29
  Node tests and 6 PS cases clean; N01-N07 caught at 22:28). Left: read its result, final suites, hash diff, report.
- Mutation: first pass 26 of 27 (N18 survived; harness stopped after S04 on a delete lag); file entry added to the
  bad-entries test; second pass 22:40 S05-S09 5 of 5 and N18 caught. Total 32 of 32, 0 did not load.
- Final: PowerShell 92 passed, 0 failed (22:31-22:34); Node 124 of 124 (22:41, after the last change). Hash diff
  22:42: my files plus decisions\* (22:18:57), K_TASK_CLAUDE.md and limits-and-caps-guide.html, none of them mine.
  No ClaudeRelaunch task, no limit-stop pipe. Report written.
- Not done (cosmetic, left): `assert.deepEqual(lines.length, 2, ...)` in the D-0008 test could be `assert.equal`.
