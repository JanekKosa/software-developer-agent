# R5 report: migrate converts old registers to the answers log

## Outcome

Done (2026-10-26 19:05). `register.mjs migrate` now brings a register of any of the three old layouts to today's layout: every answer
kept inside an entry moves to `ANSWERS_LOG_CLAUDE.jsonl`, each closed entry gets one Final answer line with the
user's last answer word for word, and Still open lines become Follow up lines. Proved on copies of the three real
registers (0 differences each) and with 18 of 18 mutants caught. No real register was touched; the main session
runs the conversion (commands at the end).

## What is different now (by effect)

- **Answers inside entries move to the log.** Each `- Answered: <t>: "<words>"` line leaves its entry and becomes a
  log record `{id, answeredAt: t, answer: words, handedOverAt: null, processedAt: P}`. P is the entry's Resolved
  time for a closed entry, the run's time for an open one.
- **The oldest layout's words move too.** `- Resolved: <t>, <outcome>: "<words>"` becomes a record (processed at
  t) and, in the entry, `- Final answer: <t>: "<words>"` then `- Resolved: <t>, <outcome>`.
- **One Final answer per closed entry, its last answer**, placed right before the Resolved line; none added when the
  entry already has one; no Summary is invented (D-19).
- **Still open becomes Follow up**, text unchanged, no time added.
- **Time order in the log.** New records go in before the first stored record of the same minute or later; stored
  records stay byte for byte and in order. So `close`, which copies the id's last record, never takes an old answer
  for a newer one.
- **Never twice.** A record with the same id, time and words is not added again. Writes go log, then resolved file,
  then open file; a run cut short at any point finishes on the next run without a duplicate. A converted register
  answers "already in the current layout; nothing to change".
- **A line it cannot read stops it before anything is written** (even the fold of an old answered file): exit 1,
  stderr names the file, the line number and the line. Words are never dropped or guessed.
- **Old descriptions:** the middle layout's two descriptions are now recognised and replaced (the oldest were
  already). The answers-log layout wrote today's texts from the start, so there was nothing to add for it.
- **Guards.** `migrate` writes with its own guard, `checkAnswersLogInsertions`: records may be inserted anywhere,
  but every stored record must stay, unchanged in all fields, in its relative order. Every other writer keeps the
  strict guard.
- **Report**, one line per changed file, for example (this repo's register, copy):
  `ANSWERS_LOG_CLAUDE.jsonl: 22 records added`, `OPEN_DECISIONS_CLAUDE.md: description updated`,
  `RESOLVED_DECISIONS_CLAUDE.md: 22 answers moved to the log, 21 Final answer lines added, 1 Still open line renamed, description updated`.

Example from this repo's register (copy): D-13-1 held `- Answered: 2026-10-26 14:38: "Other: we need to discuss
it ..."` (its words hold inner quotes, `"explain further"`), a Still open line, and `- Answered: 2026-10-26 14:47:
"Other: i have a btter idea, lets create a answers log ..."`. After: `- Follow up: Your question first: ...`,
`- Final answer: 2026-10-26 14:47: "Other: i have a btter idea, ..."`, `- Resolved: 2026-10-26 14:59, answered`;
the log holds both answers, processed 14:59, between D-13 (14:20) and D-15 (15:14).

## Files changed (all LF, no BOM)

- `orchestrate-agents\lib\decision-register.mjs`: `migrateRegister(location, now)` (now takes the time), new
  exported `checkAnswersLogInsertions`, helpers for reading old lines, converting an entry and merging by time;
  `writeAnswersLog` takes the guard, `withRegisterWrite` an optional pre-check; module comment.
- `orchestrate-agents\scripts\register.mjs`: `migrate` passes the time; usage comment says what it converts and
  that an unreadable line exits 1.
- `orchestrate-agents\tests\lib\decision-register.test.mjs`: every `migrateRegister` call passes a time; the
  oldest-layout test now expects the Final answer and two log records.
- `orchestrate-agents\tests\lib\decision-register-migrate.test.mjs` (new, 8 tests).
- `orchestrate-agents\tests\scripts\register.test.mjs`: 1 new test through the real script.
- Outside the diff: none. Scratch folders deleted (see Checks).

## Shared file that needs a change (not mine)

`orchestrate-agents\SKILL.md`, where it describes `migrate`, should say: "migrate also moves the answers kept inside
old entries to the answers log, in time order and each once (Answered lines, and the words of an old Resolved line),
gives each closed entry a Final answer line with its last answer (no Summary), and renames Still open lines to
Follow up. A line it cannot read stops it with exit 1 and nothing changed. Safe to run again." The `register.mjs`
usage comment holds the full text.

## Settings added

None.

## Checks

- Node suite before: 204 tests, 204 pass (lead 18:30; mine in scratch 18:39). After, in `<orch>`, after the copy
  (19:03): 213 tests, 213 pass (9 new). The two timing tests of `limit-stop-server.test.mjs` passed both times.
- New tests were red first: the missing guard export, then four assertion failures on the missing conversion.
- **Invariant, real material, with the final `register.mjs` in `<orch>`** (copies, each in its own scratch repo;
  an independent script computed the expected files from the spec, sharing no code with the module):
  - software-developer-agent: 14 Answered lines, 8 Resolved lines with words, 1 Still open, 2 log records before;
    22 records added (= 14 + 8), each word-for-word; 21 Final answers, each the entry's last answer; 0 differences
    on 371 lines.
  - xpp-agent (counts only): 0 Answered, 22 Resolved with words, 0 Still open, 3 records before; 22 added; 22 Final
    answers; 0 differences on 410 lines.
  - claude-code-extensions (counts only): nothing old in its entries, 1 record; 0 added; only the open file's
    description changes; 0 differences on 21 lines.
  - For each: no old line left; old records unchanged and in order; added records before the first stored record
    of the same minute or later; second `migrate` "nothing to change"; a run cut after the log, and one cut after
    the resolved file, finish with results byte-equal to the first run; `list`, `list --answered`, `answers`,
    `answers --json`, `summary`, then `answer` + `close` on a probe entry all exit 0, the close with the probe's
    Final answer.
- **Mutation check, 18 of 18 caught** (scratch copy, the three register test files, a mutant counted only when tests
  ran and at least one failed): Answered line left in place; Final answer from the first answer; Final answer added
  when one exists; records appended at the end; same-minute tie reversed; dedupe dropped; Answered words cut at the
  first inner quote; Resolved words cut likewise; a malformed line read as any other line; the pre-check dropped;
  Still open not renamed; the migrate guard letting a record change; the insertion guard as every writer's default;
  the strict guard loosened in itself; open file written before the resolved file; log written after the files;
  open-entry answers processed at no time; middle-layout descriptions not recognised. The last two writer-guard
  mutants are caught by tests added after the first build: the write order (a folder in place of the temp file
  stops a write part way) and the strict guard's wiring (the guard's re-read of the log mocked in one test).
- Peak memory (run-heavy, last line): baseline 348 MB, mutation run 390 MB, scratch suite 321 MB, `<orch>` suite
  322 MB (free memory at its lowest 1258 MB).
- Untouched: the three real `decisions` folders were only copied. xpp-agent's and claude-code-extensions' files
  hash the same as at 18:37. This repo's files changed at 18:58:11 by normal register use (D-22 to D-25 answered
  18:54 to 18:57, processed 18:58), before my code reached `<orch>` at 19:00; they still hold the old description and
  the 14 Answered lines, so no migrate ran on them.
- Cleanup: scratch copies `r5-orch`, `r5-mut`, `r5-real`, `r5-real-pristine` and the run logs deleted, checked by a
  listing. The check scripts stay in my session scratchpad for a re-run:
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f\scratchpad\invariant.mjs`
  (`node invariant.mjs <register.mjs> <copy repo root> counts`; it writes to the copy).

Not tested: the conversion on the live registers (not this run's, task section 7); an old Resolved line with words
in the open file and a closed entry with both a Final answer and old Resolved words (neither occurs in the real
registers; the code handles them, no test pins them).

## Risky or undecided points

- The live registers keep changing (this repo's register gained D-22 to D-25 at 18:58, after my copy). Those are
  in today's layout and stay as they are. The main session should copy each `decisions` folder as a backup right
  before running `migrate`, so a surprise can be undone.
- `migrateRegister` now needs the time as its second argument, like the other commands. Only `register.mjs` calls
  it (checked in `<orch>` and the pane folder's top level).
- "answers moved to the log" counts lines taken out of entries; "records added" counts new records. They differ
  when an answer was already in the log (not added twice). Example: an entry line whose answer the log holds already
  gives "1 answer moved" and "0 records added".

## Commands for the main session (one per real register)

```
node "C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs" migrate --root "C:\Repos\My projects\software-developer-agent"
node "C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs" migrate --root "C:\Repos\My projects\xpp-agent"
node "C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs" migrate --root "C:\Repos\My projects\claude-code-extensions"
```

Each prints its report; a second run must print "nothing to change".

## Learned

- The middle layout's open description names the answered file and a "keeps it open" step; R1's headers equal
  today's (the claude-code-extensions resolved file, written 16:05, matches today's text exactly).
- xpp-agent's register is almost all oldest layout (22 of 24 closed entries hold the words in the Resolved line).

DECISIONS TAKEN: an unreadable old line exits 1 (not 2), because it needs a hand fix like a broken log | its check runs before the fold of an old answered file, so a failed run changes nothing at all (other choice: fold first) | the Final answer is the entry's last answer in file order, old Resolved words included; none is added when the entry has one | a closed entry with no Resolved line gets the Final answer at its end and its records count as processed at the run's time (other choice: refuse it) | an old Resolved line's outcome is read as any lowercase word with hyphens, not only today's five | a blank Still open line counts as unreadable; Still open text is kept byte for byte, trailing spaces included | the report counts "answers moved" (lines taken out) apart from "records added" (an answer already in the log is not added again); report order fold, log, open, resolved, while writes go log, resolved, open | migrateRegister takes the time as a required argument like the other commands | nothing added for generation 3's descriptions, which are today's
INITIATIVES: a new test file (decision-register-migrate.test.mjs, 8 tests) instead of growing the 1,069-line lib test file | two tests the task did not list: the write order with a run stopped by a failed write, and the strict guard's wiring for the other writers (one test mocks fs.readFileSync for the guard's re-read) | 7 mutants beyond the 11 listed | withRegisterWrite got an optional pre-check and writeAnswersLog a guard parameter
ISSUES FOUND: SKILL.md's description of migrate is now out of date (not my file; text above) | this repo's live register changed during my run by normal use (D-22 to D-25 at 18:58); not a defect, but the conversion will see more entries than my copy had
QUESTIONS: none
