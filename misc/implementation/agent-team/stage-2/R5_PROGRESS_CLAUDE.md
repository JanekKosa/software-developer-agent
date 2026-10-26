# R5 progress: migrate converts old registers to the answers log

Started 2026-10-26 18:33. Task: `R5_TASK_CLAUDE.md` in this folder.

## Files I own

- `orchestrate-agents\lib\decision-register.mjs`
- `orchestrate-agents\scripts\register.mjs` (comments and the `migrate` branch)
- `orchestrate-agents\tests\lib\decision-register.test.mjs`
- `orchestrate-agents\tests\scripts\register.test.mjs`
- new test files under `orchestrate-agents\tests\`

Not mine: every real `decisions\` folder, SKILL.md, hook, .ps1, skills\, agents\, references\, the pane repo.

## Done

(Times corrected at 18:51 from the clock and file times; the first versions of 18:40 and later were guessed.)

- 18:33 read task, skills, CLAUDE.md, README, R1 report sections.
- 18:35 read the module parts, register.mjs, the migrate tests and helpers.
- 18:37 baseline: `<orch>` hashes in scratchpad `orch-hashes-before.csv`; real registers' hashes in
  `real-<repo>-hashes-before.csv`; scratch copy `C:\Users\user\AppData\Local\Temp\r5-orch`; register copies in
  `C:\Users\user\AppData\Local\Temp\r5-real\{sda,xpp,cce}` (each with a `.git` folder). No links in `<orch>`.
- Shapes (counts only): sda resolved 23 entries, 14 Answered, 8 Resolved-with-words, 1 Still open, 2 gen-3;
  log 2. xpp resolved 24 entries, 0 Answered, 22 Resolved-with-words, 2 gen-3, 1 Follow up block; log 3.
  cce resolved 1 gen-3 entry; log 1. All open files: no Answered or Still open lines. All CRLF, no BOM.
- Old descriptions measured on the copies: gen 2 open "...not yet closed, newest last. Each waits for the user
  (Status: waiting-for-user) until the user answers, then for an agent (Status: waiting-for-agent), with the answer
  in ANSWERED_DECISIONS_CLAUDE.md. The agent closes it, which moves it to RESOLVED_DECISIONS_CLAUDE.md, or keeps it
  open, which sets it back to waiting-for-user."; gen 2 resolved "...that are closed, newest last. Each holds the
  user's answers, each with its time and words, and ends with a Resolved line that gives the outcome.". Gen 3
  resolved (cce, written 16:05 after R1) equals today's resolvedHeader; R1B's progress says openHeader was not changed
  after R1, so gen 3 = today's.

## Plan (what changes, why, how proved)

- `migrateRegister(location, now)`: a pre-check under the lock, before the exclude lines and the fold, scans the open
  and resolved files' lines from the first heading on; a line starting `- Answered:`, `- Still open:`, or `- Resolved:`
  holding a `"` that does not parse throws (plain Error, exit 1) naming file, line number and line; nothing written.
- Per entry: Answered lines leave and become records (processedAt = entry's last Resolved time in the resolved file,
  `now` in the open file); Resolved with words becomes Final answer + Resolved (record processedAt = its time); a
  resolved entry gets the Final answer of its last answer (file order) right before its last Resolved line unless it
  has one; Still open -> Follow up, text unchanged.
- New records: dedupe against the log (id, answeredAt, answer), stable-sorted by answeredAt, merged: each goes before
  the first remaining existing record with answeredAt >= its own. Written with a new guard
  `checkAnswersLogInsertions` (existing records a subsequence, byte-equal); every other writer keeps the strict one.
- Write order log, resolved, open. Report: per file the counts, plus `ANSWERS_LOG_CLAUDE.jsonl: N records added`.
- Descriptions: gen-2 texts added to the recognised old ones.
- Proof: failing tests first in the scratch copy, then the invariant on the three copies, then the mutation check.

## Built (in the scratch copy only, 18:44)

- Baseline in scratch, finished 18:39: 204 tests, 204 pass (run-heavy: ran 2:04, peak 348 MB).
- New test file `tests\lib\decision-register-migrate.test.mjs` (6 tests): red first (missing export, then 4
  assertion failures on the missing conversion), now green.
- `decision-register.mjs`: `checkAnswersLogInsertions` (exported), `isSameRecord`, `writeAnswersLog(..., check)`,
  `withRegisterWrite(..., precheck)`, `migrateRegister(location, now)` rewritten, helpers `counted`,
  `oldLayoutLine`, `requireReadableOldLines`, `convertOldLines`, `mergeByTime`; constants `FINAL_ANSWER_PREFIX`,
  `RESOLVED_PREFIX`, `OLD_RESOLVED_LINE`, `OLD_STILL_OPEN_LINE`, `RESOLVED_TIME`, `MALFORMED`,
  `OLD_OPEN_DESCRIPTIONS`, `OLD_RESOLVED_DESCRIPTIONS`; module comment.
- `register.mjs`: `migrateRegister(location, new Date())`, usage comment (malformed line: exit 1).
- Existing lib tests: every `migrateRegister(loc)` call gets a time; the gen-1 test now expects the Final answer
  and two log records. New CLI test in `register.test.mjs`. The three register files: 81 of 81 pass (scratch).
- Contract decisions: a resolved entry without a Resolved line gets its Final answer at its end and its records
  processedAt = migrate time; an entry with a Final answer line already gets none; malformed line -> plain Error,
  exit 1 (like a broken log); report order: fold line, log line, open, resolved (writes: log, resolved, open).

## Invariant on the copies (18:47, scratch register.mjs, script `scratchpad\invariant.mjs`)

- Independent expectation (own parsing, no shared code) vs the real script's result; then second migrate, cut after
  the log (both files restored), cut after the resolved file (open restored), list, list --answered, answers,
  answers --json, summary, and answer + close on a probe entry.
- sda: before 14 Answered, 8 Resolved-with-words, 1 Still open, 2 log records, 27 entries; 22 records added
  (0 already in the log), 21 Final answers checked; 0 differences on 371 lines.
- xpp (counts only): 0 Answered, 22 Resolved-with-words, 0 Still open, 3 log records, 31 entries; 22 records added,
  22 Final answers checked; 0 differences on 410 lines.
- cce (counts only): nothing old in entries, 1 log record, 1 entry; 0 records added (only the open description);
  0 differences on 21 lines.
- Pristine copies kept in `C:\Users\user\AppData\Local\Temp\r5-real-pristine` for re-runs; delete at the end.

## Tests added after the build (18:49)

- write order with a run stopped by a failed write (a folder in the temp file's place), and the strict guard's
  wiring for the other writers (answer, with `fs.readFileSync` mocked for the guard's re-read). Both green.

## Choices for the report block

- unreadable old line: exit 1 (plain Error), not 2; pre-check before the fold and the exclude lines.
- Final answer = last answer in file order (Answered lines and a Resolved line with words alike); none added when
  the entry has one; a resolved entry without a Resolved line gets it at its end, records processedAt = run time.
- old Resolved outcome read as `[a-z-]+`, not only today's five outcomes; a blank Still open line is unreadable;
  Still open text kept verbatim (trailing spaces too).
- report: "answers moved to the log" counts lines taken out of entries (an answer already in the log counts but is
  not added), "records added" counts new log records; report order fold, log, open, resolved; writes log, resolved,
  open.
- generation 3's descriptions are today's: nothing added for them.

## Finished (19:05)

- Mutation check 18:50 to 18:58: 18 of 18 caught (list in the report); peak 390 MB.
- Scratch suite 18:58: 213 of 213 pass. `<orch>` unchanged since baseline (41 files, same hashes); the five files
  copied in one step at 19:00:21, hashes equal; `<orch>` suite 19:03: 213 of 213 pass, peak 322 MB.
- Invariant re-run 19:01 with `<orch>`'s register.mjs on fresh copies: 0 differences (sda 371 lines, xpp 410,
  cce 21). A first re-run attempt hit a half-failed Remove-Item ("directory is not empty"); its writes stayed inside
  `r5-real` (checked by listing), and the copies were rebuilt with `rd /s /q` before the counted run.
- Real registers: xpp and cce hash as at baseline; sda changed 18:58:11 by normal use (D-22 to D-25), not by me.
- Scratch folders and logs deleted; scripts kept in the session scratchpad.
- Report: `R5_REPORT_CLAUDE.md`.

## Left

- Nothing in this run. For the main session: run migrate on the three real registers (commands in the report) after
  backing up each `decisions` folder; SKILL.md's migrate text needs the update named in the report.
