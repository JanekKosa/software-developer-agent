# R3 progress: the decision answers watch

Worker, started 2026-10-26 17:31. Task: `R3_TASK_CLAUDE.md`. Report: `R3_REPORT_CLAUDE.md`.

## Files I own

- `<orch>\scripts\watch-decision-answers.ps1` (new)
- `<orch>\tests\scripts\watch-decision-answers.test.mjs` (new)
- `<orch>\orchestration.config.json` (new section `decisionAnswersWatch` only, after `watchSession`)
- `<orch>\SKILL.md` ("Starting work": a new step; "The decision register": one sentence)

## Baseline (17:32)

- Repo has no commits; everything is untracked, so `git status` proves nothing. Hash list of `<orch>` and
  `decisions\` (42 files) in my scratchpad: `hashes-before.csv`.
- No links under `<orch>` or `decisions\` (`dir /AL /S /B`: none).
- Scratch copy of `<orch>`: `C:\Users\user\AppData\Local\Temp\r3-orch` (39 files), made 17:32.
- Node v24.13.0, PowerShell 7.6.9.

## Facts read (not measured yet)

- `register.mjs handover [--root <dir>]`: exit 0 + 'DECISION ANSWERS | ...' block, or exit 0 and nothing; exit 1 busy
  lock or broken log (stderr `register: ...`); exit 2 wrong use (`--root` not a folder). stdout ends with a line break.
- Busy test pattern: skill copy via `makeSkillCopy` with `register.lockWaitSeconds = 0.5`, lock file
  `decisions\.lock` holding `<pid> <iso>\n`, flag wx. `makeSkillCopy` skips `.ps1` files: the test copies the watch
  script into the copy itself.

## Plan

1. Tests first (red), in the scratch copy. 2. Script (green). 3. Config section. 4. SKILL.md lines. 5. Suite in scratch.
6. Invariant on a copy of the real `decisions\`. 7. Mutation check. 8. Copy into `<orch>`, suite there, hash compare.

## Measured (spike, 17:36, Node 24.13.0, pwsh 7.6.9, scratch copy with lockWaitSeconds 0.5)

- `handover` on a register whose lock is held: exit 1 even when nothing waits (stderr `register: the decision
  register is busy: <path>\.lock stayed taken for 0.5 s. Nothing was written; run the command again.`), 567 ms.
- `--root` missing or a file: exit 2, `register: --root <path> is not an existing folder`. A repo without a register:
  exit 0, nothing. A normal look: 60-75 ms.
- `pwsh -NoProfile -File` with `[CmdletBinding()]`: `-Bogus` gives exit 1 and `A parameter cannot be found that
  matches parameter name 'Bogus'.` on stderr. **`-EveryMinute` (a prefix of `-EveryMinutes`) is accepted**: PowerShell
  binds unambiguous prefixes, so the misspelling test must use a non-prefix (`-EveryMinuts`).
- pwsh start 290-450 ms. pwsh at `C:\Program Files\PowerShell\7\pwsh.exe`, node at `C:\Program Files\nodejs\node.exe`.
- `file-lock.mjs` judges a stale lock by its mtime (older than lockStaleSeconds, 60 s). A test can plant a lock dated
  10 minutes back as a sensor: the next look removes it, so the test knows a look happened.

## Log

- 17:33 baseline suite in the scratch copy: 192 of 192 pass, 1:10, peak 319 MB.
- 17:40 red: 11 tests written; 10 fail because the script is missing (pwsh exit 64 / copy ENOENT). The dot-source
  test passed with no script (a failed dot-source only writes stderr): it now also requires empty stderr.
- 17:43 green: script and config section written in the scratch copy; 11 of 11 pass (reset test 18.7 s, busy 6.3 s).
  No `oa-daw-*` folders left in Temp.

- 17:47 SKILL.md in scratch: "Starting work" new step 2 (later steps renumbered 3-5; nothing refers to those
  numbers, checked by grep), "The decision register" one sentence after "(D-18).".
- 17:49 whole suite in the scratch copy: 203 of 203 pass, 1:58 (was 1:10), peak 351 MB.
- Not run: `tests\limit-scripts.tests.ps1` (the lead said not to read it; I do not run what I have not read, and it
  may touch scheduled tasks or pipes). My change to the config is one added section.
- Text a later run must add (not my file): `references\usage-limits.md`, where the session watch is stopped with
  TaskStop at a hand-over, should stop the decision answers watch too.

- 17:49 refactor: `Get-LookFailure` no longer one-lines stderr (the catch already does; the duplicate could never
  be caught by a test). Test file 11 of 11 again.
- 17:49 mutation run started in the background (`scratchpad\mutate.ps1`, results in `scratchpad\mutation-results.txt`).
- 17:51 invariant (`scratchpad\invariant.mjs`) on a copy of the real `decisions\` in `Temp\r3-inv\repo` (with
  `.git`): real register has no open entry and 2 answers, both processed (D-20, D-21); added D-22 in the copy; the
  watch (-EveryMinutes 0.05) ran 8 s (about 3 looks) silent; answered D-22 pane-style (no flag) with 3 lines and
  non-ASCII; it ended 2186 ms later, exit 0, printed exactly as expected; the log record holds the words exactly,
  handedOverAt set, processedAt null; a second watch ran 8 s silent, stopped by its pid. **0 differences on 26**
  (2 log records, 23 resolved entries, 1 open-file header); the old log bytes are the start of the new log. The
  script copy used had hash E0D000E7...06D1 (copied during the mutation run: to be confirmed equal to the restored
  original).

- 18:17 mutation run done (17 mutants, list in `scratchpad\mutation-results.txt`). The runner read only the fail
  count; node:test reports a timed-out test as "cancelled", so M1, M5, M6b, M10 were printed SURVIVED but each has
  failing (✖) tests: caught. Truly survived: M15 (`-gt` instead of `-ge`: one failure too many) and M16 (a silent
  failure gives an empty reason). Restore verified by hash after every mutant (original 4D1129...F63C).
- The 17:51 invariant ran on a mutant (its copy E0D000... is not the original 4D1129...): discarded.
- 18:19 added test "a look that fails with another exit code and says nothing is counted; the FAILED line names the
  exit code" (stand-in register.mjs that exits 3 silently; FailuresBeforeStop 1 with a 1-minute interval must end
  < 15 s; FailuresBeforeStop 2 must take >= 1.2 s). Passes on the original; re-run of M15 and M16: both caught
  (M16 fail, M15 cancelled by the 60 s timeout). **17 of 17 caught.**
- 18:20 invariant again with the original script (hash checked 4D1129...): **0 differences on 26**, silent over about
  3 looks, ended 1728 ms after the pane-style answer of D-22, words exact, second watch silent 8 s, stopped by pid.
- 18:21 real background task in this Claude Code session (PowerShell tool, run_in_background, description "Decision
  answers watch"), scratch repo `Temp\r3-bg`: (1) D-1 waiting with Polish letters, curly quotes, emoji, two lines:
  ended at once, exit 0; the task output file = the watch's bytes exactly + Claude Code's own "\n[exited with code
  0]\n" (525 bytes, no BOM). (2) nothing waiting at start, D-2 answered 7 s later: ended exit 0, output only D-2,
  nothing before it. Latency not measured there (my own tool-call delay); the tests and invariant measure it.

- 18:22 live `<orch>` and `decisions\` checked against the baseline first: 42 of 42 unchanged; the scratch copy
  differed from live only in my four files. Copied the four in one step; hashes equal to the scratch versions.
- 18:24 whole suite in live `<orch>` through run-heavy: **204 of 204 pass**; `HEAVY COMMAND DONE | exit 0 | waited
  0:00 | ran 1:50 | peak 320 MB in its processes | free memory at its lowest 2951 MB | slot 1 of 1`.
- 18:24 hash compare: 40 of 42 baseline files unchanged, CHANGED config + SKILL.md, ADDED my script + test file;
  `decisions\` unchanged. No `oa-daw-*` folders, no watch processes left. Deleted `Temp\r3-orch`, `r3-inv`, `r3-bg`,
  `r3-*.log` and my scratchpad files (the other scratchpad files are not mine).
- 18:25 comment-only fix of the script header (an invalid setting and a crash named too); then my test file in live
  `<orch>`: 12 of 12 pass; parses; LF, no BOM, ASCII.
- DONE. Report: `R3_REPORT_CLAUDE.md`.

## The contract (as built)

- Parameters: `-Root` (relative counts from PowerShell's current location; default `(Get-Location).ProviderPath`),
  `-EveryMinutes` [double] > 0, `-FailuresBeforeStop` [int] >= 1, `-ConfigPath`. A passed parameter needs no key.
- Settings: `decisionAnswersWatch.everyMinutes` 15, `.failuresBeforeStop` 3, each with `_why...`, `_about`.
- stdout: nothing while waiting. Answers: handover's stdout bytes unchanged, then
  `Start the Decision answers watch again (description "Decision answers watch").` + LF, exit 0. Failure: one line
  `DECISION ANSWERS WATCH FAILED | <reason on one line>` + LF, exit 1. Written as raw UTF-8 bytes to stdout.
- Exit codes of handover: 0 with bytes = end; 0 empty = good look (count back to 0); 2 = FAILED at once; any other
  (1, a crash) = counted; FailuresBeforeStop in a row = FAILED. node missing, a missing/invalid setting = FAILED at once.
- Node is found with `Get-Command node -CommandType Application` (PATH only, not the current folder).
