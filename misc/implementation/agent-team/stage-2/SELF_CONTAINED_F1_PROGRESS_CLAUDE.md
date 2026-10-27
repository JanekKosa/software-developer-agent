# Run F1 progress: register entries in points (the register's side)

Task: `SELF_CONTAINED_F1_TASK_CLAUDE.md`; spec: `SELF_CONTAINED_F_CONTRACT_CLAUDE.md` (both in this folder).
Started 2026-10-27 12:56 (Get-Date).

## Files I own

- `orchestrate-agents\lib\decision-register.mjs`
- `orchestrate-agents\scripts\register.mjs`
- `orchestrate-agents\tests\lib\decision-register.test.mjs`, `tests\lib\decision-register-migrate.test.mjs`,
  `tests\scripts\register.test.mjs`, `tests\hooks\decision-reminder.test.mjs`, and a new
  `tests\lib\decision-register-points.test.mjs`
- this progress file and `SELF_CONTAINED_F1_REPORT_CLAUDE.md`

## Baseline (before any change)

- `git status --short -- orchestrate-agents decisions` at 12:58: `decision-register.mjs` and `register.mjs` are
  unchanged from HEAD (10abe9f). Modified by others: decisions\* (3 files), SKILL.md, hooks\context-guard.mjs,
  hooks\decision-reminder.mjs, orchestration.config.json, references\agent-team-guide.html,
  scripts\watch-usage-and-context.ps1, tests\hooks\context-guard.test.mjs, tests\hooks\decision-reminder.test.mjs;
  untracked lib\agent-team.mjs, scripts\team-on.mjs, tests\lib\agent-team.test.mjs.
- SHA-256 of the real register at 12:58 (read-only for me):
  - ANSWERS_LOG_CLAUDE.jsonl 24C110803C15F33A8132C9B5B7FC22CEFA75282D74EF08AED436CB2D697DE59C
  - OPEN_DECISIONS_CLAUDE.md 0CB1437E357063035C1B1CEC62063CF8220F6CCDBC484E49DAD1F86BDA9BAC1B
  - RESOLVED_DECISIONS_CLAUDE.md 92B2D49FF4AA7666394AC91803D05309C56B20DF099AB029D2A0D4DB81602049
  (Get-FileHash sorts by name; order above is alphabetical.)
- Full Node suite at 13:01, through run-heavy, in `C:\Repos\...\orchestrate-agents`: **229 tests, 229 pass, 0 fail**
  (log in scratchpad `baseline-suite.log`). Note: the scratchpad folder is shared with another agent (its
  `checks.ps1` ran there); my scratch files go in `scratchpad\f1\`.

## Findings from reading (before changing anything)

- Every register reader matches field lines by `startsWith('- <Field>: ')` (fieldValue, setStatus, migrate's Status
  check, oldLayoutLine, isResolvedCopyOf) or by an anchored regex (HEADING `^## `, RAISED `^- Raised:`). A point line
  starts with two spaces, so none of them can take it as a field or a heading today. So point 2 needs tests, likely
  no reader code.
- Two existing tests pin today's one-line Options layout and must change with the contract:
  decision-register.test.mjs ~line 136 and register.test.mjs ~line 321.

## Plan

1. Point 1, test first: new file `tests\lib\decision-register-points.test.mjs` (validation, formatEntryLines, the
   contract sample through `register.mjs add --file`), watch it fail, then change `validateEntry` and
   `formatEntryLines`, update the two Options tests, update the usage comment.
2. Point 2: tests on a scratch register holding old and new entries for list, summary, openItems, the prompt hook,
   answer, close, follow-up, handover, migrate.
3. Invariant on scratch copies of the real register (old lib copy vs new lib).
4. Mutation check (>= 10 mutants) on a scratch copy of the library.

## Log

### 13:11 Point 1 done (input and writing), point 2 tests written

- RED first: new `tests\lib\decision-register-points.test.mjs` (13 tests): 11 failed for the right reason (Options on
  one line, `text.replace is not a function`, `field what must be non-empty text`), 2 reader tests passed at once
  (the readers already take points; their worth is shown by the mutation check).
- Library (`decision-register.mjs`), three Edits each leaving it working: `POINT_PREFIX = '  - '` constant with why;
  validate rules 'points' (text or point list) for what/example/recommendation/meanwhile and 'pointList' for options
  (evidence keeps 'list'); `formatEntryLines` uses new `fieldLines(prefix, value)`; new `pointText` (oneLine, then
  drop one leading `- ` or `* `) and `isPointList`. ENTRY_FIELDS changed last.
- Messages: points field `field <name> must be non-empty text or a list of one or more non-empty points`; options
  keep `field options must be a list of one or more non-empty texts`; raisedBy/task keep `... must be non-empty text`.
- Existing tests changed because the Options layout changed (contract): decision-register.test.mjs layout test
  (Options lines) and 'new files are CRLF...' (line indices 15/16 -> 17/18); register.test.mjs follow-up block test
  (Options regex).
- Usage comment added to `register.mjs` (paragraph "add reads one entry from a JSON file: ...").
- Hook test added at the end of `tests\hooks\decision-reminder.test.mjs` ("an entry written in points is named by its
  first point alone..."): passes.
- Five register test files at 13:11: 118 tests, 118 pass (before the hook test). Hook test alone: 1 pass.

Decisions taken (to report):
- Options also lose a typed leading `- `/`* ` (the contract says it for points; options are one point per line). An
  option that is blank once its mark is dropped (`"- "`) is now refused; before it was written as `- .`.
- A point that is blank once its mark is dropped (`"- "`) is refused like a blank point.
- Mark dropped only at the very start, once, after line breaks became spaces: `" - x"` keeps it, `"- - x"` keeps the
  second.
- Strings are untouched (no mark dropped), as the contract says "exactly as today".

### 13:16 Invariant done (scratch `scratchpad\f1\inv\`, script `invariant.ps1`, log `invariant.log`)

- Old library = today's lib helpers + HEAD's decision-register.mjs, written byte-exact through cmd redirection
  (74632 bytes, blob e7cdcfd6... = HEAD's). A first try through a PowerShell pipe re-wrote line endings (76087 bytes):
  redone, do not pipe git show through PowerShell.
- Real register copied (Copy-Item) into a scratch git repo: 0 open entries, 55 resolved entries, 62 log records.
- Readers (list --open/--resolved/--answered/all, list per id for all 55 ids, summaryLine, openItems, itemLabel,
  answers, answers --json, unprocessedAnswers), old vs new: **0 differences on 55 entries** (337061 characters of JSON
  identical); the copy's hashes unchanged by the readers.
- formatEntryLines on 55 string-only entries built from the real entries' text (Options split back at
  `<.!?> <Letter|number>: `; 44 of them have 2+ options; urgency 'medium' where an entry has none): **55 of 55 give
  identical lines except Options**, and the options texts joined equal the old Options line. 0 skipped.
- The contract sample added with the real script to a second copy (id D-54): list prints exactly the contract block
  (Raised 2026-10-27 13:15); summary, openItems (what = first point), answer, list --answered, handover (label = first
  point), follow-up, answer, close (whole entry with all point lines into the resolved file), list --resolved,
  migrate ("already in the current layout; nothing to change") all exit 0. Old and new readers identical on that copy
  before and after the close (56 entries).

### 13:18 Real register hashes changed, not by me

- At 13:18 all three real register files have new SHA-256 values (075BA26A..., 9C322A95..., 080D41C5...), the same
  lengths (16270, 457, 99512) and LastWriteTime 12:58:26 for all three: written by another process right after my
  12:58 baseline hash (another agent's checks.ps1 held the heavy slot from 12:58:01). None of my commands wrote there
  (every write of mine names a scratch path or --root); nothing has written them since 12:58:26. Re-check at the end
  against the 13:18 values.
- Mutation check started 13:17 in the background through run-heavy (`scratchpad\f1\mut\mutate.mjs`, log
  `mutate.log`): 24 mutants.

### 13:31 Mutation check done: 24 of 24 caught

- Run 1 (13:20-13:23, log `mutate-run1.log`): unmutated copy passes all five files; 23 of 24 caught; survivor "the mark
  dropped before the line breaks become spaces" (no test had a mark followed by a line break).
- Added test "a point's line breaks become spaces before its list mark is looked for..." (`"-\nHead"` -> `Head`,
  option `"-\rA: one"` -> `A: one.`); passes on the live code (points file 14 of 14).
- Run 2 (13:28-13:31, after the new test): **24 of 24 caught**, 0 not counted (every mutant loads), all caught by the
  three in-process files; copy's library restored. Mutants: point not indented; first point not on the field line;
  `- Options: ` with a trailing space; options joined on one line; one-point list written as a list; blank point
  accepted; non-string point accepted; fieldValue taking a `  - ` line as a field; oldLayoutLine reading points (migrate
  refusing/converting); leading `- ` kept; every `- ` dropped; mark dropped after leading spaces; point keeps line
  breaks; mark dropped before line breaks become spaces; text field loses its `- `; options without full stop; options
  keep their mark; migrate's Status check taking a point; the Final answer check taking a point; setStatus taking a
  point; evidence written as points; raisedBy taking a list; options taking a single text; meanwhile refusing a list.

### 13:38 Closed

- Whole suite 13:33 through run-heavy: 244 of 244 pass (229 baseline + 15 new: 14 in the points file, 1 hook test).
- Five register files 13:36 through run-heavy: 120 of 120 pass.
- Real register hashes at 13:36 equal the 13:18 values (075BA26A, 9C322A95, 080D41C5); LastWriteTime still 12:58:26.
- Scratch removed: `scratchpad\f1\` (no links in it), `scratchpad\baseline-suite.log`, `scratchpad\f1-register-tests.log`;
  no `oa-points*` or `oa-remind-points*` folders left in %TEMP%. No process of mine is running.
- Report: `SELF_CONTAINED_F1_REPORT_CLAUDE.md`. Every check ran in full; nothing is left half done.
