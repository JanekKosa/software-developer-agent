# R7 progress (worker)

Started 2026-10-26 21:02 (clock). Task: `R7_TASK_CLAUDE.md` in this folder.

## Files I own

- `orchestrate-agents\lib\decision-register.mjs`: the `HANDOVER_INSTRUCTION` line (line 80) only.
- The tests that assert it: `tests\lib\decision-register.test.mjs` (line 591), `tests\scripts\register.test.mjs`
  (line 143), `tests\hooks\decision-reminder.test.mjs` (line 21), `tests\scripts\watch-decision-answers.test.mjs`
  (line 20). Each holds its own copy of the line as a constant.
- `orchestrate-agents\references\usage-limits.md`: line 200, `(by the session watch)` only.
- `agents\task-lead.md`: the clause "relays your lines and register entries to the user" (lines 33-34) only.

## Plan

1. Baseline: git status, hashes, encoding and line endings of the 7 files, Node suite in a scratch copy of `<orch>`.
2. In the scratch copy: change the line and the 4 test constants; run the suite.
3. Real-material check with the real `register.mjs` in a scratch repo (close and follow-up with `$5 and $(Get-Date)`).
4. Mutation check: double quotes back in the scratch copy; count failing tests.
5. Edit usage-limits.md and task-lead.md copies; copy all 7 in once; check encoding; suite again in `<orch>`.

## Log

- 21:03 baseline: git shows the whole repo untracked (no diff possible); hashes, BOM, CR/LF of the 7 files in
  scratch `r7\baseline.txt` (all: no BOM, 0 CR, end with LF). No links under `<orch>`. Scratch copies: `r7\orch`
  (unchanged, for the baseline suite) and `r7\orch-new` (edited).
- Baseline suite queued at 21:03 behind the lead's PowerShell test run (slot 1, pid 7176).
- Verified the server's log text by grep: `limit-stop-server.test.mjs` lines 650, 685 assert `(by the Usage and
  context watch)`; `context-guard.test.mjs` 738, 762 assert `(by the context-guard hook)`.
- 21:05 edits made in `r7\orch-new` (5 files, one ordinal replacement each, script `r7\stage-edits.ps1`) and
  `usage-limits.md` (line 200, rewrapped 200-201); `r7\agents\task-lead.md` (lines 33-36, rewrapped).
- 21:06 real-material check (`r7\real-check.ps1`) against `r7\orch-new`: handover printed the new line; the close
  and follow-up commands taken from it, typed with `$summary`/`$text` from a single-quoted here-string holding
  `$5 and $(Get-Date)`, stored `- Summary: $5 and $(Get-Date)` and `- Follow up: <time>: $5 and $(Get-Date)`
  exactly. (First try failed in my own script: `'a' + "'", 'b'` binds the comma first; fixed.)
- Seen, not mine: `lib\decision-register.mjs` line 434 (close's blank-summary error) and `scripts\register.mjs`
  line 86 (close's usage form) still show `--summary "<text>"`; tests `register.test.mjs` 438-439 assert them.

- 21:09 baseline suite in `r7\orch` (unchanged copy): 220 of 220 (waited 3:35 behind the lead's run, ran 2:12, peak
  365 MB).
- 21:12 suite in `r7\orch-new` (edited): 220 of 220 (ran 2:15, peak 338 MB).
- 21:14 mutation, `r7\orch-mut` = edited copy with the double quotes put back in the library only: 210 of 220, 10
  fail (4 in decision-reminder.test.mjs, 1 in decision-register.test.mjs, 2 in register.test.mjs, 3 in
  watch-decision-answers.test.mjs). 1 of 1 mutant caught.
- 21:14 live files re-hashed: unchanged since the baseline. Scratch differs from live in exactly the 6 `<orch>` files
  (7 lines) plus task-lead.md (3 lines -> 4).
- 21:14:56 copied the 7 files in; each hash equals its scratch copy; all still no BOM, 0 CR, end with LF
  (task-lead.md 332 -> 333 LF, one added line).
- 21:17 suite in `<orch>`: 220 of 220 (ran 2:03, peak 321 MB, free memory at its lowest 2750 MB).
- 21:17 real-material check against the live `register.mjs` (scratch repo `r7\real2`): Summary and Follow up hold
  `$5 and $(Get-Date)` exactly; writes only in the scratch repo's `decisions\`.
- Limit-stop-server timing tests did not fail in any of the four runs, so no lone re-run was needed.

- 21:18 report written (`R7_REPORT_CLAUDE.md`); scratch folder `r7` (no links in it) deleted; no process left
  running. Done.

New line text (one line):
`For each answer: pass it, in the user's words, to the lead it concerns; then close the entry with a summary that
includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up
(register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in
double quotes.`
