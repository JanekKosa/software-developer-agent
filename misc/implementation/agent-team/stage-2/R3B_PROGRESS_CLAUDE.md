# R3b progress: the Decision answers watch, every 30 minutes and at once when everything is answered

Worker, started 2026-10-26 19:09. Task: `R3B_TASK_CLAUDE.md`. `<orch>` = `orchestrate-agents`.
Scratch copy of `<orch>`: `C:\Users\user\AppData\Local\Temp\r3b-orch`.

## Files I own

- `<orch>\scripts\watch-decision-answers.ps1`
- `<orch>\tests\scripts\watch-decision-answers.test.mjs`
- `<orch>\lib\decision-register.mjs` (the option of handOverAnswers and module comment)
- `<orch>\scripts\register.mjs` (the `--when-all-answered` flag and usage comment only)
- the handover tests in `<orch>\tests\lib\decision-register.test.mjs` and `<orch>\tests\scripts\register.test.mjs`
- `<orch>\orchestration.config.json` (`decisionAnswersWatch` section only)
- `<orch>\SKILL.md` (Starting work step 2, and the one sentence in "The decision register")

## Read (19:01-19:09)

All of section 1 of the task. Notes:
- handOverAnswers runs loadAll inside withRegisterWrite (under the lock), so the open entries loaded there can be
  checked under the same lock. statusOf(entry) = Status value || waiting-for-user (empty or missing Status counts
  as waiting).
- SKILL.md: neither place states "every 15 minutes" in words; step 2 says "It ends when answers given in the
  Decisions pane wait"; the decision-register sentence says "whichever comes first: the decision answers watch or the
  reminder ...". The interval phrase will be inserted there.

## Plan

1. Point 1 (register): test first (module + CLI), then `handOverAnswers(location, now, { whenAllAnswered })` checking
   `files.open.entries.some(e => statusOf(e) === WAITING_FOR_USER)` inside the lock; CLI flag `--when-all-answered`
   allowed for handover only.
2. Point 2 (watch): settings 30 / lookSeconds 5; loop with full handover at start, a look every LookSeconds that runs
   `handover --when-all-answered` only when the open file's or log's (size, time) changed, and full handover each
   EveryMinutes since start (timer not reset by looks).
3. Invariant on copy of real decisions\, mutation check, full suite in scratch, copy into <orch>, suite in <orch>.

## Log

- 19:10 Baseline hashes of `<orch>` (42 files) and `decisions\` (3 files): scratchpad `hashes-before.csv`. No links in
  `<orch>`. Real register now has open entries (OPEN file 5474 bytes, 19:07). Copied `<orch>` to
  `C:\Users\user\AppData\Local\Temp\r3b-orch` (robocopy, 42 files).
- 19:13 Baseline suite in the scratch copy via run-heavy: **213 of 213 pass**, 1:55, peak 321 MB. Node v24.13.0.

- (before 19:27; time not read) Point 1 done in the scratch copy. RED seen first: the 2 new module tests (handed over with D-2 waiting) and
  the CLI tests (Unknown option '--when-all-answered', exit 2). Then `handOverAnswers(..., { whenAllAnswered })`
  checks `files.open.entries.some(statusOf(e) === WAITING_FOR_USER)` inside withRegisterWrite after loadAll;
  register.mjs: option `when-all-answered` (boolean), allowed for handover only; usage line + comment paragraph;
  module comment 2 lines. GREEN: the two register test files 80 of 80.
  Tests added: module "whenAllAnswered hands nothing ... then every waiting record", "counts no Status / empty /
  followed up; plain unchanged"; "without a register" gets a whenAllAnswered line; CLI "prints nothing while ...
  then exactly what handover prints" (with --root from another folder), "checks under the lock ... entry added while
  it waits" (lock held by the test, entry appended by hand after 1.5 s, then released); wrong use gets
  `handover --when-all-answered yes` and `answer ... --when-all-answered`.

- 19:27 (read) Point 2 built in the scratch copy. RED first: 6 new/changed watch tests failed against the old script (one
  cancelled by its 60 s timeout). Then the new script, the settings (everyMinutes 30, lookSeconds 5 + _why, _about,
  _whyFailuresBeforeStop updated; LF, no BOM, ASCII, JSON parses), SKILL.md (2 places, words added, lines reflowed).
  GREEN: watch file 16 of 16 in 57 s (old file about 46 s for 12 tests). One test of mine was wrong first (answered
  D-1 before the watch's start look, which handed it over at once); fixed with the sensor + waitForLook.
  Spike (before 19:27): `node --input-type=module -e <code> <skill> <root>` gives process.argv.slice(1) = the two args; it
  printed the real register's two paths (read only).
- 19:27 Full suite in scratch started (run-heavy, log `C:\Users\user\AppData\Local\Temp\r3b-node-scratch1.log`).

- 19:29 Full suite in scratch: **221 of 221 pass**, 2:23 (baseline 1:55). To cut time: merged the "one of two
  answered ends at the period" test into the old "nothing waiting ... interval from the settings" test (now two
  entries, lookSeconds 0.25, period 3.6 s, lower bound 1.5 s after the answer); the stand-in test also covers a failed
  look between the full ones (retried at the next look, counted, three in a row end it); T1 waits 1.2 s instead of
  1.5 s. Watch file: 15 of 15 in 52 s (old 12 tests about 46 s).
- Mutation runner: scratchpad `mutate.ps1` (17 mutants, fresh copy `C:\Users\user\AppData\Local\Temp\r3b-mut` each,
  exact replacement that must match once, caught = fail or cancelled > 0); invariant driver: scratchpad
  `invariant.mjs`. Mutation run started in the background through run-heavy, log
  `C:\Users\user\AppData\Local\Temp\r3b-mutate.log`.

- 19:51 Mutation run 1 done (18:11, peak 357 MB): 15 of 17 caught. Survivors M12 (sleep ignores the next full look)
  and M14 (stamp by size only). Added: the "silent crash" test's second watch passes -LookSeconds 30 and asserts it
  ends in under 15 s; the stand-in test rewrites the open file at the same size and expects a look. 19:56 both caught
  (run 2, 2:53). Watch file on the correct code 15 of 15, 56 s (19:52).
- 19:56 Invariant (scratchpad `invariant.mjs`) on a copy of the real `decisions\` copied 19:32 (real register had no
  open entry then: OPEN 382 bytes, log 10 records all processed, 29 resolved). Added D-28..D-32 in the copy with the
  scratch register.mjs (5 synthetic entries, the user's example). Answered all 5 one after another, 2.5 s apart, watch
  with -LookSeconds 1 and the default 30 min: still running after each of the first 4; ended exit 0 552 ms after the
  5th, printing all 5 in order, words exact; started again it kept waiting (first look + 3.5 s). 0 differences: the
  resolved file byte-identical (29 entries), open header, 10 earlier log records; the 5 answered entries differ only
  in their Status line; 5 records added with the exact words, handed over, not processed. Ran while mutation run 3
  was loading the machine.
- 19:56 Mutation run 3 started (M4 M5 M6 M9 M10 M11 M13 again, against the final stand-in test).
- 19:57:27 Copied the 8 files into `<orch>` in one command; hashes equal the scratch copy; 8 of 42 changed vs the
  19:10 baseline, nothing else. All 8 LF, no BOM, non-ASCII byte counts unchanged. Full suite in `<orch>` queued
  through run-heavy (log `C:\Users\user\AppData\Local\Temp\r3b-node-live.log`).

- 20:03 Mutation run 3: the 7 re-run mutants all caught again (7:14). Total: 17 of 17 caught.
- 20:05 Full suite in `<orch>`: **220 of 220**, 2:05, peak 312 MB (it waited 6:00 for run 3's slot).
- 20:06 Manual check: register settings without `register.openFile` -> the watch ended at once, exit 1, but the
  FAILED line carried node's whole stack trace. Fix (test first, seen failing): the inline locate module catches
  and writes only the message. 20:08:31 my chained command copied the new test and the not-yet-fixed script into
  `<orch>` because the Edit had failed (fresh copy not read); `<orch>`'s watch test file failed one test until
  20:09:41, when the fixed script (watch file 15 of 15 in scratch) was copied in. The script live in that minute was
  the earlier working version.
- 20:11:53 Final full suite in `<orch>` after the last change: **220 of 220**, 2:06, last line
  `HEAVY COMMAND DONE | exit 0 | waited 0:00 | ran 2:06 | peak 268 MB in its processes | free memory at its lowest
  3245 MB | slot 1 of 1`. limit-stop-server timing tests did not fail in any full run.
- 20:12 Scratch folders, logs and my scratchpad files deleted; no process left. Real `decisions\` last written
  19:21:43 (by the lead, before my 19:32 copy); I never wrote there.
- Context guard at 320k reached during the fix; closing.

## Design decisions (point 2)

- The watch learns the open file's and the log's paths once at start by running node with a short inline module
  that imports `lib\config.mjs` and `lib\decision-register.mjs` (registerLocation) beside register.mjs: one source
  of truth for the repo root (worktrees, .git files) and file names, instead of a PowerShell copy of findRepoRoot.
- Loop of ticks, the first at once: a full handover when due (at start, then every EveryMinutes on a fixed schedule
  from the start, never reset by looks); else a `--when-all-answered` look when the (size, write time) of the open
  file or the log differs from what was last seen. The stamp is read before the run. Sleep = min(LookSeconds, time
  to the next full).
- A look that fails (exit 1 / crash) leaves its trigger in place (a full stays due; the stamp is not taken as seen),
  so it is tried again at the next tick; counts toward FailuresBeforeStop as before; a good look resets the count.
  `_whyFailuresBeforeStop` loses "30 minutes at the default interval", which is no longer true.
