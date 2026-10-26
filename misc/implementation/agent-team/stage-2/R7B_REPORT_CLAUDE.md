# R7b report: the last double-quoted forms in register.mjs's messages

Worker, 2026-10-26 21:33. Task: `R7B_TASK_CLAUDE.md`. Progress file: `R7B_PROGRESS_CLAUDE.md` (both in this folder).

**Outcome: done.** No printed message and no usage line of the register shows a double-quoted value any more. All
of them now use the R7 form (`--summary $summary`, set in a single-quoted here-string). The Node suite gives 220 of
220 before and after, in the scratch copy and in the live folder. Nothing is committed.

## What changed

1. **Close's error for a blank summary** (`orchestrate-agents\lib\decision-register.mjs` line 434). It now ends:
   `close --id D-1 --outcome answered --summary $summary (set $summary in a single-quoted here-string, never in double quotes)`.
   Before, it ended `--summary "<text>"`.
2. **Close's form, printed when an option is missing** (`orchestrate-agents\scripts\register.mjs` line 86). The full
   message now reads:
   `register: close needs --summary (the form is: close --id D-7 --outcome <answered|accepted|overruled|fixed|wont-fix> --summary $summary; set $summary in a single-quoted here-string, never in double quotes)`.
   The form sits inside brackets in that message, so I used a semicolon rather than a second pair of brackets.
3. **The usage comment at the top of `register.mjs`** (lines 9-21). The five forms now read `--answer $answer`,
   `--summary $summary`, `--text $text`, `--still-open $text` and `--words $words`. Three new lines under the list
   keep what the old placeholders said: what each variable holds, to set each in a single-quoted here-string, and
   why (PowerShell runs `$(...)`, drops `$5` and makes `` `n `` a line break). The file grew by 4 lines.
4. **The two test lines that assert the messages** (`orchestrate-agents\tests\scripts\register.test.mjs` lines
   438-439) now expect the new text, up to the end of the message. Any added or missing words at the end now fail
   the test too.

Example: a main session that blanks the summary and copies the form from the error no longer gets
`--summary "<text>"`. If it had typed `Pay $5 extra` into that form, PowerShell would have stored `Pay  extra`.

## Checks (all run after the last change)

- **Node suite** (`node --test` through `run-heavy.ps1`):
  - scratch copy before the change: 220 of 220 (ran 2:09, peak 356 MB);
  - scratch copy after the change: 220 of 220 (ran 2:05, peak 322 MB);
  - live `orchestrate-agents` after the copy-in: 220 of 220 (ran 2:04, `peak 324 MB in its processes | free memory
    at its lowest 2792 MB`).
  - The timing tests of `limit-stop-server.test.mjs` failed in none of the runs, so I did not re-run that file
    alone.
- **Test first.** With only the two test lines changed, the register tests gave 26 of 27: the "wrong use" test
  failed on the old `"<text>"`. After the code change they gave 27 of 27.
- **Mutation check** (scratch copy, register tests, each file restored byte for byte after each run, by hash):
  1. the old `"<text>"` put back in the error;
  2. the old `"<text>"` put back in the form;
  3. `"$summary"` in double quotes, in the error;
  4. `"$summary"` in double quotes, in the form;
  5. the here-string words dropped from the error;
  6. the here-string words dropped from the form.

  **6 of 6 caught**, each by the "wrong use" test (26 pass, 1 fail). Nothing failed to load.
- **Read back.** From the scratch copy's CLI, in an empty scratch folder, both messages print the text quoted above,
  exit 2 and write no file.
- **Files.** All three files are still UTF-8 without BOM, with LF only and a final LF. I re-hashed the live folder
  (44 files) just before the copy-in: it was unchanged since my 21:20 baseline. After the copy-in exactly my three
  files differed from the baseline, and each equals its checked scratch copy. The live suite run changed no file in
  the folder.
- **Search.** I searched `lib`, `scripts`, `hooks` and `tests` for `"<text>"`, `"<the user's words>"`, `--summary "`
  and any option followed by a double-quoted placeholder. Nothing else prints such a form.

**Not tested:** the usage comment, which no test reads (it is a comment). The PowerShell suite, which asserts
neither message. A real `close` with a here-string in PowerShell: R7 ran that round trip with the same
`--summary $summary` form at about 21:15, and I changed only the printed text, not how options are read.

## Files changed

- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\decision-register.mjs` (1 line)
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs` (6 lines changed, 4 added)
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\register.test.mjs` (2 lines)
- Created: `R7B_PROGRESS_CLAUDE.md` and this report.

Nothing outside the diff: no settings, links or processes. My scratch copy, scripts and logs are deleted. The 29
other items in the session's scratchpad predate my start and are not mine.

## Seen and left alone

- `register.mjs` line 47, `--answer "- go with A"`. It is an example of a literal value, with no `$`, backtick or
  `$(...)`. It shows that a value may start with `-`. Changing it to `$answer` would lose that point.
- `register.mjs` line 11 (close's usage line) is 126 characters, over the file's 120 width. It was longer before (it
  held the long placeholder). The usage lines are left on one line each so they can be copied whole.

## What I learned

- `register.mjs` prints the form as `close needs --<option> (the form is: <form>)`, for any missing option of close,
  not only `--summary`.
- My definition says to read three vendored skills first. The task said "Do not read anything else", and the task
  ranks higher, so I did not read them (as in R7).

DECISIONS TAKEN: Added "; set $summary in a single-quoted here-string, never in double quotes" to close's form too, not only to the error as R7 suggested, because a bare $summary does not say how to set it and the form is what gets copied; named keep-open's value $text (as follow-up, whose old spelling it is) rather than $stillOpen; added 3 comment lines under the usage list saying what $answer, $summary, $text and $words hold, how to set them and why, rather than dropping what the old placeholders of lines 11-12 said; left line 47's literal example --answer "- go with A" alone, because it holds no $ or backtick and shows a value may start with -; anchored the two test patterns to the end of the message, so a change at the end fails too.
INITIATIVES: none
ISSUES FOUND: register.mjs line 11 (close's usage line in the header comment) is 126 characters, over the file's 120 width; it was longer before; left on one line so it can be copied whole.
QUESTIONS: none
