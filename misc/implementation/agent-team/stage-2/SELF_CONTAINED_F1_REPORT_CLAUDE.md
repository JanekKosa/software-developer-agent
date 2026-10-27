# Run F1 report: register entries in points, the register's side

Written 2026-10-27 13:38 by the F1 worker. Task: `SELF_CONTAINED_F1_TASK_CLAUDE.md`; contract:
`SELF_CONTAINED_F_CONTRACT_CLAUDE.md`; details: `SELF_CONTAINED_F1_PROGRESS_CLAUDE.md` (all in this folder).

## Outcome

Done. The register now stores an entry's text as points, one per line, exactly as the contract says. Every reader works
on such entries, and an entry without points reads exactly as before. Nothing is committed.

## What is different

- **What, Example, Recommendation and Meanwhile** take one text (as before) or a list of points. The first point stays
  on the field's line; each further point gets a line of its own, two spaces and `- `. Example: `"what": ["The import
  stops at the first bad row.", "500 rows: row 3 is bad, so 2 are imported."]` is stored as
  `- What: The import stops at the first bad row.` and under it `  - 500 rows: row 3 is bad, so 2 are imported.`
- **Options**, for every new entry, go one per line under a bare `- Options:` line, each with its full stop as before.
  This is the only change for an entry written with plain texts.
- A point loses its line breaks (they become spaces) and one list mark (`- ` or `* `) it was typed with. A list of
  one point is stored exactly like a text.
- **Refused with exit 2, naming the field**: an empty list, a point that is blank or not a text, any other type. For
  example `"example": [""]` gives `register: field example must be non-empty text or a list of one or more non-empty
  points`. Raised by and Task stay text-only; Evidence stays a list on one line.
- **Readers needed no code change.** Every reader (list, summary, the prompt reminder's open items, answer, handover,
  follow-up, close, migrate) finds fields by lines that start with `- <Field>: `, and a point line starts with two
  spaces, so it is never taken for a field. Readers keep taking a field's first line, so the summary and the
  hand-over name an entry by its first point. Close moves the whole entry, point lines included.

## Files

- Changed: `orchestrate-agents\lib\decision-register.mjs` (a `POINT_PREFIX` constant, two validation rules,
  `formatEntryLines`, new `fieldLines`, `pointText`, `isPointList`); `orchestrate-agents\scripts\register.mjs` (usage
  comment only).
- Tests: new `orchestrate-agents\tests\lib\decision-register-points.test.mjs` (14 tests); one test added at the end of
  `tests\hooks\decision-reminder.test.mjs`; three existing assertions updated because the Options layout changed
  (`tests\lib\decision-register.test.mjs`: the layout test and two line numbers in "new files are CRLF ...";
  `tests\scripts\register.test.mjs`: the Options pattern in the follow-up block test).
- Outside the diff: none. My scratch folders (old library copy, register copies, mutation copy) are deleted.
- Settings added: none. The contract makes the new Options layout apply to every new entry, so there is no switch.

## The usage comment written in `register.mjs`

> add reads one entry from a JSON file: kind (question, initiative or issue), blocking (true or false), urgency (high,
> medium or low), raisedBy, task, what, example, options, recommendation, meanwhile, evidence, and optionally parent
> (D-7). raisedBy and task are one text each. what, example, recommendation and meanwhile are each one text (one
> paragraph: its line breaks become spaces) or a list of points, the first point the headline, for example
> "what": ["The import stops at the first bad row.", "500 rows: row 3 is bad, so 2 are imported."]: the first point
> stays on the field's line and each further point goes on a line of its own under it ('  - <point>'). options is a
> list, one option per point; each goes on a line of its own under '- Options:' and gets a full stop unless it ends
> with '.', '!' or '?'. evidence is a list of paths, written on one line. A point's line breaks become spaces and a
> leading '- ' or '* ' it was typed with is dropped. An empty list, a point that is blank or not a text, or a field of
> another type exits 2 naming the field.

## Text a shared file needs (not mine to edit)

`agents\task-lead.md` lines 183-200 show the entry JSON with texts only. Suggested addition after "All eleven fields
are required...": "`what`, `example`, `recommendation` and `meanwhile` may each be a list of points instead of one
text, the first point the headline: `"what": ["The import stops at the first bad row.", "500 rows: row 3 is bad, so 2
are imported."]`. Write a field as points when it holds more than one idea; each option is one point already."

## Checks (all after the last change)

- Whole Node suite (`node --test` in `orchestrate-agents`, through run-heavy), 13:33: **244 of 244 pass**. Before any
  change, 13:01: 229 of 229. 244 = 229 + my 15 new tests, so no other file's count moved.
- The five register files (the four named plus the new one), 13:36: **120 of 120 pass**.
- Test first: the new tests failed for the right reason before the library changed (11 of 13 red; the 2 reader tests
  were green at once because the readers needed no change).
- **Invariant on copies of the real register** (0 open entries, 55 resolved, 62 answers; old library = HEAD's file,
  byte-exact, blob e7cdcfd6): every reader old against new gave **0 differences on 55 entries** (list of each part, list
  of each id, summary, open items, labels, answers, answers as JSON, unprocessed answers; 337,061 characters
  identical). **55 string-only entries** built from the real entries' text gave identical lines in old and new
  `formatEntryLines` except the Options lines, whose options are the same texts (44 of them have 2 or more options).
- **The contract's sample** added to a copy with the real script got id D-54. `list --open --ids D-54` printed
  exactly the contract's block (Raised `2026-10-27 13:15 by lead sample`), from `## D-54 · question · not-blocking`
  through `- What: The pane shows each entry as one block of text.`, `  - The register joins line breaks into
  spaces.`, `- Options:`, `  - A: show points, one per line (one run).`, `  - B: leave it (no cost).` to `- Evidence:
  C:\x\a.md, C:\x\b.md`. Then summary, open items, answer, list --answered, handover (label `D-54 "The pane shows each
  entry as one block of text."`), follow-up, answer, close (the resolved copy holds every point line), list
  --resolved and migrate ("already in the current layout; nothing to change") all exited 0; old and new readers stayed
  identical on that copy.
- **Mutation check**: 24 mutants (all in the contract's list and more). First run 23 of 24; the survivor ("the list
  mark dropped before line breaks become spaces") got a test. Second run: **24 of 24 caught**, every mutant loaded.
- The real register was never written by me. Its files carry new hashes since 12:58:26 (see Issues); unchanged from
  13:18 to 13:36.

**Not tested:** the Decisions pane drawing points (run F2's); an entry in points written to the real register; the
concurrent-writer tests with points entries (they use text entries; the lock code is unchanged).

## Risky or undecided points

- **Options lose a typed list mark too.** The contract says it for points; I treat each option as a point. Example:
  `"options": ["- A: wait"]` is stored as `  - A: wait.`, not `  - - A: wait.`. Side effect: an option of only `"- "`,
  stored before as `- .`, is now refused. Recommendation: keep.
- **The mark is dropped only at the very start, once.** `" - x"` keeps its mark, `"- - x"` keeps the second one.
  Recommendation: keep; a wider rule would also eat text.

## What I learned

- `git show` piped through PowerShell rewrites line endings (74,632 bytes became 76,087). A byte-exact copy needs
  `cmd /c "git show ... > file"`.
- The scratchpad folder is shared with other agents of this session (their `checks.ps1`, `f2`, `s3a`, `s4` folders
  are there). I kept my files in `scratchpad\f1\`.

DECISIONS TAKEN: options are points too, so a typed leading "- " or "* " is dropped from an option (other choice: keep the mark, giving "  - - A: wait."; why: the pane reads the option's letter from the start of the point); a point or option that is blank once its mark is dropped is refused (other choice: store "  - ."; why: the contract refuses blank points); the mark is dropped only at the very start, once, after line breaks become spaces (other choice: trim spaces first or drop every mark; why: the contract's literal words, and a wider rule eats text); no setting to switch the new layout off (other choice: a switch, off by default; why: the contract says Options change for every new entry)
INITIATIVES: added a test of the prompt hook with an entry in points at the end of tests\hooks\decision-reminder.test.mjs; ran 24 mutants, 14 more than the task's ten (evidence written as points, raisedBy taking a list, options taking a text, and others)
ISSUES FOUND: all three real register files (decisions\*) were rewritten at 12:58:26 by another process, same lengths, new hashes, right after my 12:58 baseline hash, not by any command of mine (effect: none seen; worth a look if someone did not expect it); agents\task-lead.md lines 183-200 show the entry JSON with texts only, so leads will not know they may give points until the lead updates it (suggested text above)
QUESTIONS: none
