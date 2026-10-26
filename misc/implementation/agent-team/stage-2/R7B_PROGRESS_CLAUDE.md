# R7b progress: the last double-quoted forms in register.mjs's messages

Worker, started 2026-10-26 21:19. Task: `R7B_TASK_CLAUDE.md` (this folder).

## Files I own

- `orchestrate-agents\lib\decision-register.mjs` line 434 only (close's blank-summary error).
- `orchestrate-agents\scripts\register.mjs` line 86 (close's form) and the usage comment (lines 9-17).
- `orchestrate-agents\tests\scripts\register.test.mjs` lines 438-439 (the two assertions).

## Found (search of lib, scripts, hooks, tests for `"<text>"`, `"<the user's words>"`, `--summary "`, and any `--opt "<`)

- decision-register.mjs:434, register.mjs:9, 11, 12, 13, 15, 86; register.test.mjs:438-439. Nothing in hooks.
- limit-scripts.tests.ps1:1356 passes `"$($claude.Id)"` (a test passing a variable, not a printed form): not mine, fine.
- register.mjs:47 `--answer "- go with A"`: an example of a literal value starting with `-`, no `$`, backtick or
  `$(...)`; it shows that a value may start with `-`. Leave it (decision).

## Plan

- 434: `--summary "<text>"` -> `--summary $summary (set $summary in a single-quoted here-string, never in double quotes)`.
- 86: `--summary "<text>"` -> `--summary $summary; set $summary in a single-quoted here-string, never in double quotes`
  (printed as `close needs --x (the form is: <form>)`; a semicolon avoids nested brackets).
- Usage comment: `$answer`, `$summary`, `$text` (follow-up and keep-open), `$words`; one short note under the list
  keeps the descriptions lines 11-12 carried and says how to set them.
- Tests 438-439: assert the new text, with `\$summary`.
- Proof: suite in scratch (before, after), mutation check (old forms back, one at a time), suite in orch after copy-in.

## Log

- 21:20 baseline: no links under orch; whole repo untracked (git status `?? ./`), so a 44-file SHA256 list of orch
  is the baseline (scratchpad `hashes-before.txt`). Scratch copy made.
- 21:23 suite on the unchanged scratch copy: 220 of 220 (run-heavy: ran 2:09, peak 356 MB).
- Test first: changed register.test.mjs 438-439 to the new text (anchored `\)\n$`); register tests 26 of 27, the
  "wrong use" test fails on the old `"<text>"`. Then changed the code: 27 of 27.
- Note line 21 was 121 chars; reworded "turns `n into a line break" -> "makes `n a line break" (116). Line 11 (close
  usage) is 126, was longer before (it held the long placeholder); usage lines overrun the width by nature.
- 21:27 mutation check (register tests only, 6 mutants, each restored byte for byte): old `"<text>"` back in the
  error / in the form; `"$summary"` in double quotes in each; here-string words dropped from each. 6 of 6 caught,
  each by the "wrong use" test (26 pass, 1 fail). Files restored byte for byte (hash checked).
- 21:29 suite on the changed scratch copy: 220 of 220 (ran 2:05, peak 322 MB). BOM none, CR none, final LF, all 3.
  Only my 3 files differ from live: decision-register.mjs 1 line, register.mjs 6 changed + 4 added, test 2 lines.
- Read back from the scratch CLI in an empty folder: both messages exit 2, print the new text, write nothing.
- 21:29 live unchanged since baseline (0 rows). 21:30 copied the 3 files in; each equals its scratch copy; exactly
  these 3 differ from the baseline.
- 21:32 suite in live orch: 220 of 220 (ran 2:04, peak 324 MB, free at lowest 2792 MB). The run changed no file in
  orch. Scratch copy, scripts, logs deleted; the other 29 scratchpad items predate 21:19, not mine.
- 21:33 report written: `R7B_REPORT_CLAUDE.md`. Done.
