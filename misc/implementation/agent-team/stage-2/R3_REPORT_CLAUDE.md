# R3 report: the decision answers watch

Worker, 2026-10-26, finished 18:27. Task: `R3_TASK_CLAUDE.md`. Details and timings: `R3_PROGRESS_CLAUDE.md`.

## Outcome

Done, and live in `<orch>` since 18:22. A main session that follows `SKILL.md` now starts a background task
described as "Decision answers watch". It stays silent until the user answers in the Decisions pane, then ends,
printing the answers in the user's exact words. Nothing is committed.

## What is different now

- **New `scripts\watch-decision-answers.ps1`.** It runs `register.mjs handover --root <Root>` at once, then every
  15 minutes. While no answer waits it prints nothing. When answers wait it prints them exactly as `handover`
  printed them, then `Start the Decision answers watch again (description "Decision answers watch").`, and ends with
  exit code 0. Example: D-22 answered in the pane with three lines gives `DECISION ANSWERS | D-22`, the entry line,
  the three lines unchanged, the instruction, and the restart line. `handover` marks what it prints, so a watch
  started again does not print the same answers.
- **Failures.** A look that fails (the register busy, the log unreadable, a crash) is tried again at the next look.
  Three in a row end it with `DECISION ANSWERS WATCH FAILED | <reason on one line>` and exit code 1. A good look
  starts the count again. Wrong use (`-Root` not a folder), node missing from the PATH, or a missing or invalid
  setting end it at once with the same line.
- **Parameters:** `-Root` (default: the current folder; a relative path counts from it), `-EveryMinutes` (above 0,
  fractions allowed), `-FailuresBeforeStop` (at least 1), `-ConfigPath`. A passed parameter wins over the setting
  and needs no setting.
- **Output is written as raw UTF-8 bytes**, not through PowerShell's console encoding, so the user's words (line
  breaks, Polish letters, emoji) arrive unchanged.
- **`SKILL.md`.** "Starting work" has a new step 2 for this watch; the old steps 2-4 are now 3-5, and nothing refers
  to their numbers. "The decision register" has one new sentence on what to do with `DECISION ANSWERS |`.

## Files changed (LF, no BOM, ASCII, like their neighbours)

- New: `<orch>\scripts\watch-decision-answers.ps1`, `<orch>\tests\scripts\watch-decision-answers.test.mjs`.
- Changed: `<orch>\orchestration.config.json` (the `decisionAnswersWatch` section after `watchSession`, nothing
  else), `<orch>\SKILL.md` (the two places above, nothing else).
- Hash check against my 17:32 baseline: 40 of 42 files unchanged, plus those 2 changed and 2 added. `decisions\` is
  unchanged.
- No machine change. Scratch folders, logs and my scratchpad files are deleted. No test folder or watch process is
  left running.

## Settings added

`decisionAnswersWatch`:
- `_about`.
- `everyMinutes` 15: the user's choice, D-13.
- `failuresBeforeStop` 3: a write holds the lock for milliseconds, so one busy look is chance. Three in a row (30
  minutes at the default) means something is stuck.

Each can be passed as a parameter of the same name, which then wins.

## Checks

- **Node suite.**
  - Baseline in the scratch copy: 192 of 192.
  - Live `<orch>` at 18:24, through `run-heavy.ps1`: **204 of 204** (192 plus my 12), 1:50 instead of 1:10.
  - `run-heavy.ps1`'s last line: `HEAVY COMMAND DONE | exit 0 | waited 0:00 | ran 1:50 | peak 320 MB in its processes`.
  - After that I changed only the script's header comment. My test file then passed 12 of 12 in live `<orch>`.
- **My 12 tests** run the script the way the background task does (`pwsh -NoProfile -File`), against scratch repos
  built with the real `register.mjs`. They cover:
  - answers already waiting: printed at once, byte for byte, with CRLF, a lone CR and emoji;
  - `--handed-over` and processed answers never printed; the restart line last;
  - a second watch prints nothing;
  - silent while waiting, then ends within about one interval of a new answer (the interval taken from the settings);
  - a busy register: it keeps going, then ends with FAILED after N busy looks;
  - a good look resets the count;
  - a silent crash is counted, and the reason names the exit code;
  - `-Root` not a folder, and node missing: FAILED at once;
  - a misspelled parameter fails;
  - a missing setting or settings file is named; a passed parameter needs no setting;
  - out-of-range values are refused;
  - it reads the register of `-Root` (also relative), and of the current folder without it;
  - dot-sourced, it only defines its functions.
- **Invariant, on a copy of the real `decisions\`: 0 differences on 26** (2 log records, 23 resolved entries, the
  open file's header).
  - The real register has no open entry, so I added D-22 in the copy. The watch stayed silent for about 3 looks.
  - After a pane-style answer of 3 lines it ended 1.7 s later, with the words exactly.
  - Started again, it stayed silent.
  - A first run was void: I had copied the script while a mutant was applied. Checked by hash and re-run.
- **Mutation check: 17 of 17 caught.** 15 were caught on the first pass: no look at start; restart line left out;
  exit 0 after FAILED; a good look not resetting the count; exit 2 retried; a line printed while waiting; answers
  printed but the watch going on; `-Root` ignored; the first failure ending it; the interval read from the wrong
  key; an interval of 0 accepted; output re-encoded by the console; the reason not put on one line; no early
  return when dot-sourced; a passed parameter not winning. Four of these were caught by tests timing out, which
  `node:test` counts as "cancelled", not "fail". Two survived and are caught by the test I then added: "one failure
  too many before the end" (`-gt` instead of `-ge`) and "a silent failure gives an empty reason".
- **A real background task in this session** (mine, a subagent, on scratch data), started as `SKILL.md` says:
  - With an answer waiting, it ended at once. The task's output file held the watch's bytes exactly (Polish
    letters, curly quotes, emoji), followed by Claude Code's own line `[exited with code 0]`.
  - Started with nothing waiting, it printed nothing until D-2 was answered, then ended printing only D-2.

## Not tested

- A real main session following `SKILL.md`: starting the watch at session start, restarting it, stopping it at a
  hand-over. That cannot be tested here.
- The 15-minute default in real time. The tests use 1.2 s to 6 s intervals and 1 minute.
- `tests\limit-scripts.tests.ps1`. The lead said not to read it, and I do not run what I have not read. It covers
  other scripts.
- A relative `-Root` when PowerShell's location differs from the process folder (Claude Code's shell after
  `Set-Location`). The code resolves against PowerShell's location; under `-File` the two always agree.
- An unreadable answers log. It takes the same exit-1 path as the busy lock, which is tested.

## Text a shared file needs (not mine)

`references\usage-limits.md`, step 7 of the hand-over list ("Stop the watch of step 1 with `TaskStop`"), and any
other hand-over list that stops the session watch. Proposed: "Stop the decision answers watch (Starting work, step 2)
with `TaskStop` too; an answer given later reaches the next session through the reminder."

## Risks and open points

- **The tests depend on timing.** They passed in 3 suite runs and about 20 file runs, many under parallel load
  during the mutation check. Each timing test has a margin of at least 1.3 s, and the look times are observed
  through a sensor rather than guessed: a lock file dated 10 minutes back, which the register removes as stale at
  the next look. Recommendation: keep them.
- **What the main session sees ends with Claude Code's `[exited with code 0]`**, after the restart line. This is
  harmless.
- **A watch stopped in the middle of a look** could mark answers as handed over without printing them. The window
  is milliseconds. The prompt hook then lists them as "handed to you earlier and not yet closed" (R2), so nothing is
  lost.

## Learned

- PowerShell accepts the unambiguous start of a parameter name: `-EveryMinute 1` binds to `-EveryMinutes`. So
  `[CmdletBinding()]` rejects only misspellings that are not such a start; `-EveryMinuts` does fail.
- `handover` on a register whose lock is held exits 1 even when nothing waits.
- A test that times out is "cancelled" in `node:test`, not "fail". A mutation runner must count both.

DECISIONS TAKEN: any exit code of handover other than 0 and 2 (a crash) is counted like 1, not fatal at once, so a passing crash does not stop the watch | output written as raw UTF-8 bytes rather than through PowerShell's output, because the console encoding mangles the words (mutant M11 proved it) | node found on the PATH with Get-Command rather than by .NET, which also searches the current folder | a relative -Root resolved against PowerShell's current location rather than the process folder | the settings file is read even when both parameters are passed, as run-heavy.ps1 does | an interval of 0 or less, or a failure count below 1, ends it with the FAILED line rather than looping without a pause
INITIATIVES: SKILL.md step 2 adds "when it fails twice in a row for the same reason, tell the user what the line says instead", to avoid an endless restart loop on a failure such as node missing (remove the clause to undo) | a -FailuresBeforeStop parameter, which the _about text ("each setting can be passed as a parameter") requires | a test that dot-sourcing defines functions only | ran the watch as a real background task in my own session, on scratch data only
ISSUES FOUND: references\usage-limits.md stops only the session watch at a hand-over, so the decision answers watch would keep running (text proposed above; not my file) | in every script of the skill, "a misspelled parameter fails" (D-0007) does not hold for an unambiguous start of a name, such as -EveryMinute | the real OPEN_DECISIONS_CLAUDE.md header still says answers go to ANSWERED_DECISIONS_CLAUDE.md and that an agent "keeps it open", text out of date since the answers log (seen in a copy; not mine) | the Node suite now takes about 40 s longer (1:10 to 1:50), mostly my reset test (about 19 s)
QUESTIONS: none
