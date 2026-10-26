# R1 progress: the answers log in the decision register

Worker: software-developer. Task: `R1_TASK_CLAUDE.md` in this folder. Started 2026-10-26 15:12.

## Files I own

- `orchestrate-agents\lib\decision-register.mjs`
- `orchestrate-agents\scripts\register.mjs`
- `orchestrate-agents\hooks\decision-reminder.mjs` (ANSWERED_INSTRUCTION only)
- `orchestrate-agents\orchestration.config.json` (`register` section only)
- `orchestrate-agents\SKILL.md` (section "The decision register" only)
- `orchestrate-agents\tests\lib\decision-register.test.mjs`, `tests\scripts\register.test.mjs`,
  `tests\hooks\decision-reminder.test.mjs`, new test files under `tests\`
- This progress file and `R1_REPORT_CLAUDE.md`

Development happens in the scratch copy `C:\Users\user\AppData\Local\Temp\r1-orch`; `<orch>` is live.

## Status

- 15:12 Read task, skills, repo CLAUDE.md and README. No CLAUDE.md inside orchestrate-agents.
- 15:20 Baseline: `<orch>` has no links; git shows every top folder untracked (so git cannot prove anything
  unchanged): hash list of the 39 files of `<orch>` saved to the scratchpad `orch-before.csv`. Copied `<orch>` to
  `C:\Users\user\AppData\Local\Temp\r1-orch`. Baseline suite in the copy through run-heavy: 154 tests, 154 pass
  (waited 9:39 for a slot held by an xpp-agent job, ran 1:17).

## Plan (written before changing code)

All in `decision-register.mjs` (no new lib file: new lib files are not in my list).

- Location: `answersLogPath` from required setting `register.answersLogFile`; log name and its temp pattern join
  `excludeLines` (after the three Markdown files).
- Log: `loadAnswersLog` parses every line (blank or bad JSON or a record without string id/answeredAt/answer: plain
  Error naming file and line). Each record keeps its stored line (`raw`) and is written back byte-equal unless a
  command changed it; changed or new records are written with `JSON.stringify` in the fixed key order. New file
  CRLF, existing file keeps `detectEol`. Every write: re-read the disk under the lock, run the guard (exported pure
  function `checkAnswersLogChange`), then `writeTextAtomic`.
- Fold (every writer, first thing under the lock): parse the answered file (every non-blank line under a heading
  must be a well-formed `- Answered:` line, else plain Error naming file and line, nothing written); records not
  already in the log as it stood before the fold (same id, answeredAt, answer) are appended in file order; log
  written; answered file deleted. Header-only answered file: deleted. Read-only view = log records plus the
  answered file's records by the same rule.
- Commands: answer (open file, then log record); close needs `--summary`, needs an unprocessed record, resolved =
  base + Final answer (last record of the id, any state) + Summary + Resolved; then marks processed; order
  resolved, open, log; crash handling kept (isResolvedCopyOf unchanged: it only asks "open lines without Status,
  more lines, Resolved last", which also covers a copy the old code left). follow-up (and keep-open as its old
  spelling): append Follow up, status waiting-for-user, then mark processed; re-run detects the entry already
  ending with the same Follow up text and waiting for the user. answers: search with --ids/--words/--json.
  list --answered: blocks built from unprocessed records, grouped by id in order of the first one.
- Proof: TDD in the copy, single test files run directly; full suite through run-heavy; then the invariant on a
  copy of the real `decisions\`, then the mutation check.

## Done

- (Correction, 15:48: the times "15:58", "16:20" and "16:35" below were written without reading the clock and are
  wrong; all three steps happened before 15:47. The log records of the invariant run say 15:45.)
- 15:58 Point 1 and 2 in the module (copy only): lib tests rewritten first (23 failed red against stubs, for the
  missing behaviour), module rewritten; `tests\lib\decision-register.test.mjs` 38 of 38 pass.
  Decisions taken while building (each goes in the report):
  - The log's ids count for the next free id (an old test said "the answered file counts too"; without it a new
    entry could reuse an id that already has answers). So `add` reads the log, and a broken log stops `add` too.
  - A record a command does not change is written back as its stored line, byte for byte; a changed record is
    written in the fixed key order with any hand-added key kept after the five.
  - Every writer (not only `add`) now ensures the info/exclude lines, so the new log file never shows up in git in a
    client repo whose register predates it.
  - A malformed line in an old answered file (anything under a heading that is not `- Answered: <time>: "<words>"`)
    stops every command that reads it, naming file and line; nothing is dropped.
  - `migrate` reports a fold in one line (`ANSWERED_DECISIONS_CLAUDE.md: N answers moved to ..., file deleted`).
  - A blank line in the log is "not valid JSON": refused like any broken line.
  - `answers` text blocks are one blank line apart; output line breaks follow the log's (CRLF for a new log).
- 16:20 (copy) CLI tests rewritten first (19 of 19 red: old register.mjs imports the removed keepEntryOpen),
  register.mjs rewritten, settings (`answersLogFile`, `_whyNames`; still LF, no BOM, ASCII), hook text (test red
  2 of 11 first, then 11 of 11), SKILL.md section (table, command block, words note, Processing bullets).
  Whole suite in the copy through run-heavy: 169 tests, 168 pass; the 1 failure is `limit-stop-server.test.mjs`
  "an agent's hook error in the log is FAILED" (a timing assertion; that file never loads the register code);
  re-run alone: 30 of 30 pass.
- Stale text outside my files: `agents\task-lead.md` section 8 (lines 158-163) still names the answered file and
  "keep it open". Exact replacement goes in the report.
- 16:35 Invariant (scratchpad `invariant.mjs`, real `decisions\` copied read-only to
  `C:\Users\user\AppData\Local\Temp\r1-inv\real-decisions`): the real register had NO open entry by then (D-15 and
  all others resolved between 15:12 and 15:40 by someone else; open file 382 bytes = header only, answered file
  header only, resolved 23,849 bytes with 21 entries). So the sequence ran on a synthetic entry added to the copy
  (D-20). Result: ALL CHECKS PASS; 0 differences on 21 entries; open file byte-identical to the real one after
  the close; resolved file starts with the real 23,849 bytes. Fold on a second copy: 2 records once, file gone,
  re-run and crash re-run add nothing.
- After the invariant: CONTEXT GUARD at 323k. Stopped building. Checked `<orch>` against the baseline hash list:
  0 files changed by anyone since 15:20; exactly my 8 files differ in the copy. 15:47:24 copied the 8 files into
  `<orch>` in one step; hashes equal. Whole suite in `<orch>` started through run-heavy (log
  `C:\Users\user\AppData\Local\Temp\r1-node-orch.log`).

## Checks: ran in full, in part, not at all

- Ran in full: lib tests (38), CLI tests (19), hook tests (11) in the copy; whole suite in the copy (169, 168 + 1
  timing flake in limit-stop-server that passes alone); invariant on real material; the whole suite in `<orch>`
  (result in the report).
- NOT run: the mutation check (stopped by the context guard before it started). To finish it: copy `<orch>` to a
  scratch folder (never mutate `<orch>`), then for each mutant edit only the scratch `lib\decision-register.mjs`,
  check it still loads (`node -e "import('file:///<scratch>/lib/decision-register.mjs')"`), run
  `node --test tests/lib/decision-register.test.mjs tests/scripts/register.test.mjs tests/hooks/decision-reminder.test.mjs`
  in the scratch folder, count caught when a test fails, restore. Mutants (find -> replace in the module):
  1. guard lets a record drop: `if (after.length < before.length) {` -> `if (false) {`, and after
     `const next = after[i];` add `if (next === undefined) { return; }`.
  2. close does not mark processed: delete the last `markProcessed(location, log, unprocessed, stamp);` in closeEntry.
  3. follow-up does not set waiting-for-user: delete `setStatus(item, WAITING_FOR_USER);` in followUpEntry.
  4. fold duplicates on re-run: notYetInLog returns `oldRecords` unfiltered.
  5. `--words` case-sensitive: drop both `.toLowerCase()` in listAnswers.
  6. close copies the first answer: `records[records.length - 1]` -> `records[0]`.
  7. list --answered shows processed: `view.records.filter(isUnprocessed)` -> `view.records`.
  Worth adding: answer stores `oneLine(answer)`; guard allows time -> other time; follow-up re-run check ignores the
  status; storedLine ignores raw; fold does not delete the file; blank log lines skipped; allEntries without log
  ids; exclude lines only in add.
- 15:49 Whole suite in `<orch>`: 169 of 169 pass (run-heavy: ran 1:22, peak 224 MB). Scratch folders r1-orch,
  r1-inv and the r1-*.log files deleted. Report written: `R1_REPORT_CLAUDE.md`.
- No type-check exists for this project (plain .mjs, no tsc or jsconfig); `node --test` loading every file is the
  only syntax check.
