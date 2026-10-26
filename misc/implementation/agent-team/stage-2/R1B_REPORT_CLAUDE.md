# R1b report: a follow-up may hold anything, and the mutation check of the answers log

Worker: software-developer, 2026-10-26, 15:55 to 16:34. Task: `R1B_TASK_CLAUDE.md`. Progress:
`R1B_PROGRESS_CLAUDE.md`.

## Outcome

Done. A follow-up now keeps several lines, as given, and has been live in `<orch>` since 16:30. The whole suite
passes in `<orch>`: 176 of 176. The invariant passes. The mutation check caught all 31 mutants; one of them was caught
only after I added a test for it. Nothing is committed.

## What is different now

- **A follow-up keeps its line breaks.** `follow-up --id D-7 --text` and `keep-open --still-open` write the first
  line after the time and every further line indented by two spaces. An empty line becomes exactly two spaces, so
  the entry stays one block. CRLF, LF and a lone CR all break a line. Blank lines at the start and end are dropped,
  and a text that is blank after that is refused, as before. Example: the text `Sure?` / (empty) / `- Options: C`
  becomes
  `- Follow up: 2026-10-26 09:10: Sure?`, then `  ` (two spaces), then `  - Options: C`.
- **A difference from the old behaviour, on purpose (D-15).** Before, a text of several lines was flattened onto
  one line (`what should 4 be?`). Now it keeps its lines (`what should 4`, then `  be?`). Two old lib tests
  expected the flattening. I changed them to the block layout and dropped neither.
- **Lines of a follow-up are text, never fields.** Every field reader matches only at the start of a line. A
  continuation line always starts with two spaces. So `  - Options: C`, `  - Status: ...`, `  - What: ...` and
  `  ## D-9 ...` change nothing for `list`, `summary`, the prompt hook's open items, `migrate` or `close`.
- **A re-run after a crash still adds nothing.** The check compares the whole block, ignoring the time. A re-run
  with the same text (extra blank lines at the ends included) is recognised. One that differs in any later line, or
  has fewer lines, gets a block of its own.
- **`close` copies the whole block** into the resolved entry, and still recognises a close that a crash cut short.
- **Texts.** The `register.mjs` usage comment and the follow-up bullet of `SKILL.md` ("Processing an answer") now
  say: a follow-up may hold anything you need (several lines, an example); it never changes the entry's options;
  changed options are a new child entry (`add` with `"parent": "D-7"`); pass several lines in `$text` with the same
  here-string as `--answer`. Nothing else in `SKILL.md` changed. I also updated the module comment and the
  `followUpEntry` and `FOLLOW_UP_LINE` comments.

**The contract the pane must read (run 3):** first line `- Follow up: <yyyy-MM-dd HH:mm>: <first line>`. Every
further line of the text is two spaces plus the line, and an empty line is exactly two spaces. Lines use the open
file's line endings. A line starting `- ` at column 0 is a field. A line starting with two spaces continues the
Follow up block above it.

## Files changed

In `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`: `lib\decision-register.mjs`,
`scripts\register.mjs` (usage comment only), `SKILL.md` (one bullet), `tests\lib\decision-register.test.mjs`,
`tests\scripts\register.test.mjs`. A hash list of all 39 files shows that only these five changed since my 15:55
baseline. None of them is hard-linked.

Outside the diff: my scratch folders and logs in TEMP were deleted, and none is left. My helper scripts
(`mutate.mjs`, `invariant.mjs`, `heredoc-check.ps1`) stay only in my session's scratchpad. No process is left
running.

## Checks

- **Tests, before and after.** Before: 169, all pass (the lead's baseline). After: 176, all pass, in the dev copy
  (run-heavy: ran 1:09, peak 297 MB) and in `<orch>` after the copy-in. The lib tests went from 38 to 44 and the CLI
  tests from 19 to 20; the hook tests stayed at 11.
- **Run-heavy's last line in `<orch>`:** `exit 0 | waited 0:00 | ran 1:04 | peak 288 MB in its processes | free
  memory at its lowest 981 MB`. The timing test in `limit-stop-server.test.mjs` did not fail this time.
- **Red first.** The 8 new or changed tests failed against the old module, each because the text was flattened.
  Then they passed.
- **The invariant**, with the new `register.mjs --root` on a scratch repo:
  - The setup had five entries: D-1 (the target), D-2 answered, D-3 open and blocking, D-4 closed, and D-1-1, a
    child, answered.
  - D-1 went through: answer; a follow-up of 5 lines (an empty line, `- Options: C ...`, Polish, German and
    Chinese letters, an emoji); answer; a one-line follow-up; answer; close with a summary.
  - Result: 8 of 8 checks pass. The resolved entry holds both blocks byte for byte, matched against a hand-written
    expectation, right before the Final answer. Its Options line is unchanged. The summary after each follow-up
    equals the summary before it.
  - Readers of the other entries: 0 differences on 25 calls (exit code, stdout and stderr compared).
  - The invariant ran with the dev copy's script, which is hash-equal to what went into `<orch>`.
- **The PowerShell path in `SKILL.md`.** A `$text = @'...'@` holding `"no fallback"`, `$5`, a backtick-n, an empty
  line, `- Options: C` and Polish letters arrived through `register.mjs` byte for byte.

**Mutation check: 31 of 31 caught.** Each mutant changed only the scratch module, which loaded each time and was
restored byte for byte afterwards. Each failing test fits its mutant.

- **Run 1's seven, all caught:**
  - the guard lets a record drop;
  - `close` does not mark the answers processed;
  - `follow-up` does not set the entry back to waiting for the user;
  - the fold adds the old answers again on a re-run;
  - `--words` matches case;
  - `close` copies the first answer;
  - `list --answered` shows processed answers.
- **Run 1's eight "worth adding", all caught:**
  - `answer` flattens the words;
  - the guard lets a time change to another time;
  - the re-run check ignores the status;
  - a record's stored line is ignored;
  - the fold does not delete the old file;
  - blank log lines are skipped;
  - the next id ignores the log's ids;
  - exclude lines are written only by `add`.
- **Point 1's sixteen (the task asked for at least three):**
  - continuation lines written without the indent;
  - an empty line inside the text dropped;
  - the re-run check compares only the block's first line;
  - the re-run check compares only the entry's last Follow up line;
  - blank lines kept at the start;
  - blank lines kept at the end;
  - a lone CR does not break a line;
  - only empty lines, not whitespace-only ones, count as blank at the ends;
  - `close` drops the continuation lines;
  - an indented heading starts an entry;
  - an empty line written as empty, not as two spaces;
  - the block written as one line joined with CRLF;
  - a field reader takes the last line with the field, indented or not;
  - `setStatus` rewrites the last Status line, indented or not;
  - the old flattening;
  - `migrate` takes an indented Status line for the entry's own.

  The last one was **not caught** at first. I added the lib test "migrate gives an entry without a Status line
  one, even when its follow-up text holds a Status line". It fails against the mutant (1 fail of 75) and passes
  against the real code. 15 of the 16 were caught without it.

**Not tested:**

- The Decisions pane against multi-line blocks. It is run 3's work and not mine.
- The real register. The task forbids it.
- No type-check exists for this project (plain `.mjs`).

## Risks

- **An editor that strips trailing spaces.** It would turn a two-space line into an empty line. The register still
  reads the entry as one block, because it splits entries only at headings. But a reader that splits entries at
  blank lines would cut the entry there. Example: the text `Sure?` / (empty) / `C?` would show as two pieces in such
  a reader. Recommendation: the pane should split at headings, as the register does.
- **The new-file description of the open file** still says "adds a Follow up line". It is still right for a one-line
  follow-up. Changing it would need a third old description in `migrate`, so I left it.

## Learned

- On this machine the Write tool strips the trailing spaces of a whitespace-only line. A test file or script that
  needs such a line must build it in code (`'  '`).
- The three register test files took 23 to 114 s per mutant run; all 31 mutants took about 20 minutes.

DECISIONS TAKEN: blank at the start or end of a follow-up means whitespace-only, the same test as the refusal (other: only empty lines; why: a text of spaces and breaks would otherwise give a Follow up line of spaces) | a whitespace-only line inside the text keeps its own spaces after the two-space indent (other: make it exactly two spaces; why: keep the text as given; the contract's two spaces are for an empty line) | the re-run check compares the whole block after blank lines are dropped, ignoring the time (other: compare the raw text; why: a re-run with extra blank lines at the ends is the same follow-up) | the open file's new-file description left as is (other: reword it; why: migrate would need a third old description) | the invariant ran with the dev copy's script, hash-equal to `<orch>`'s, while the mutants ran (other: after the copy-in; why: saved a cycle; same bytes)
INITIATIVES: 16 point-1 mutants instead of the 3 asked | hostile lines in the tests beyond `- Options:` (`## D-9` heading, `- Status:`, `- What:`, `- Raised:`, `- Recommendation:`), plus a migrate check | a PowerShell here-string check of the SKILL.md path | blank refusal also tested with line breaks and a tab | module, FOLLOW_UP_LINE and followUpEntry comments updated
ISSUES FOUND: nine `oa-*` test scratch folders from earlier runs (25.10 18:05 to 26.10 15:39) are left in TEMP; not mine, left alone | a reader that splits entries at blank lines would cut a block whose two-space line was stripped by an editor (the pane should split at headings) | the Write tool strips trailing spaces of whitespace-only lines (it cost one false result in my own check script)
QUESTIONS: none
