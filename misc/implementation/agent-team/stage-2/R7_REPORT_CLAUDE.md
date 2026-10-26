# R7 report: three last corrections from the documentation runs

Worker, 2026-10-26 21:17. Task: `R7_TASK_CLAUDE.md`. Progress file: `R7_PROGRESS_CLAUDE.md` (both in this folder).

**Outcome: done.** All three corrections are in the live files. The Node suite gives 220 of 220 before and after.
Nothing is committed.

## What changed

1. **The hand-over's instruction line** (`orchestrate-agents\lib\decision-register.mjs`, the `HANDOVER_INSTRUCTION`
   constant, line 80). `register.mjs handover`, the prompt hook and the Decision answers watch all print it. It now
   reads, as one line:

   `For each answer: pass it, in the user's words, to the lead it concerns; then close the entry with a summary that
   includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up
   (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in
   double quotes.`

   This is R6b1's proposed text, unchanged. Before, the commands showed `--summary "<text>"` and `--text "<text>"`.
   A main session that copied that and typed a summary such as `Pay $5 extra` would have stored `Pay  extra`.
   The four test files that assert the line each hold their own copy of it; each copy changed the same way:
   `tests\lib\decision-register.test.mjs` (line 591), `tests\scripts\register.test.mjs` (line 143),
   `tests\hooks\decision-reminder.test.mjs` (line 21), `tests\scripts\watch-decision-answers.test.mjs` (line 20).
2. **`orchestrate-agents\references\usage-limits.md` line 200** now quotes the server's log text
   `(by the Usage and context watch)` instead of `(by the session watch)`. Lines 200-201 were rewrapped to stay
   within the file's line width. The quote matches the text that `limit-stop-server.test.mjs` asserts at lines 650
   and 685, and that suite passes.
3. **`agents\task-lead.md`**, the main-session bullet (lines 33-36). "It relays your lines and register entries to
   the user" now reads "It relays your lines to the user (the user reads your register entries in the Decisions
   pane; in the chat it names only a blocking one)". The rest of the bullet is word for word the same. The paragraph
   was rewrapped, so it grew from three lines to four.

All seven files are still UTF-8 without BOM, with LF line endings and a final LF. I checked this before and after
the copy-in. Each live file's hash equals its checked scratch copy.

## Checks (all run after the last change)

- **Node suite** (`node --test` through `run-heavy.ps1`):
  - Scratch copy before the change: 220 of 220. It waited 3:35 behind the lead's run, then ran 2:12.
  - Scratch copy after the change: 220 of 220.
  - Live `orchestrate-agents` after the copy-in: 220 of 220. It ran 2:03.
  - Peak memory from the last run's final line: `peak 321 MB in its processes | free memory at its lowest 2750 MB`.
  - The two timing tests of `limit-stop-server.test.mjs` failed in none of the four runs (the mutation run
    included), so I did not re-run that file alone.
- **Mutation check.** In a scratch copy I put the double quotes back in the library only. The suite then gave 210 of
  220. The 10 failures cover all three printers and all four test files: 4 hook tests, 1 library test, 2 `register`
  tests and 3 watch tests. **1 of 1 caught.** The tests compare the whole line exactly, so any other change to the
  line would fail them too.
- **Real material.** I built a scratch repo with the real `register.mjs`, first in the scratch copy and again with
  the live script after the copy-in. Each time I:
  1. added two entries and answered both;
  2. ran `handover` and took the close and follow-up commands from the printed line;
  3. filled `<id>` and `<outcome>`;
  4. set `$summary` and `$text` with a single-quoted here-string holding `$5 and $(Get-Date)`;
  5. ran the commands as printed, in a fresh `pwsh -File`.

  Both times the stored text was exact: `- Summary: $5 and $(Get-Date)` and `- Follow up: <time>: $5 and $(Get-Date)`.
  All writes went to the scratch repo's `decisions\` folder only.
- **Live files untouched before the copy-in.** I re-hashed all seven just before copying. They were unchanged since
  my 21:03 baseline. The scratch copy differed from the live folder in exactly the six intended files, by 7 lines.

**Not tested:** the PowerShell suite (`tests\limit-scripts.tests.ps1`). It does not assert this line, and the task
named only the Node suite. The prompt hook and the watch were tested only through their Node tests (which run the
real hook and the real watch script). I did not run them in a live session.

## Files changed

- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\decision-register.mjs`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\lib\decision-register.test.mjs`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\register.test.mjs`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\hooks\decision-reminder.test.mjs`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\watch-decision-answers.test.mjs`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\usage-limits.md`
- `C:\Repos\My projects\software-developer-agent\agents\task-lead.md` (live; it reaches every project at the next
  Claude Code start)
- Created: `R7_PROGRESS_CLAUDE.md` and this report.

Nothing outside the diff: I added no settings, links or processes. The scratch folder is deleted.

## Seen and left alone (not my files)

Two other printed messages still show the double-quoted form:

- `lib\decision-register.mjs` line 434: close's error for a blank summary ends `--summary "<text>"`.
- `scripts\register.mjs` line 86: close's usage form, `close --id D-7 --outcome <answered|...|wont-fix> --summary "<text>"`.

`tests\scripts\register.test.mjs` lines 438-439 assert both messages. A main session that hits that error and copies
the form gets the same `$5` loss. My suggested text: in both places, `--summary $summary`, with
`(set $summary in a single-quoted here-string)` added to the error message. Then change the two test patterns to
`--summary \$summary`.

The header comments of `scripts\register.mjs` (lines 9, 13, 15) also show `--answer "<the user's words>"`,
`--still-open "<text>"` and `--words "<text>"`. These are comments only, not printed.

## What I learned

- The four test files deliberately keep their own copy of the line ("so the test does not share the script's
  text"). Every future change to the line touches five files.
- My agent definition says to read three vendored skills at the start. The task said "Do not read anything else",
  and the task message ranks higher, so I did not read them. Beyond the task's list I ran three narrow greps:
  - the server's log text, to check the claimed quote;
  - other places that print `"<text>"`;
  - the watch test's repo helper, to build the scratch repo the way the tests do.

DECISIONS TAKEN: Wrote the task-lead.md clause as "relays your lines to the user (the user reads your register entries in the Decisions pane; in the chat it names only a blocking one)", rather than splitting the bullet into new sentences, because the task allows that clause only; Rewrapped usage-limits.md lines 200-201 and task-lead.md lines 33-36 to keep the files' line width rather than leave one over-long line.
INITIATIVES: none
ISSUES FOUND: lib\decision-register.mjs line 434 (close's blank-summary error) and scripts\register.mjs line 86 (close's usage form) still print --summary "<text>", asserted by register.test.mjs lines 438-439; a main session copying them loses $5 or $(...) in its summary; left alone (not my lines), suggested text in the report; register.mjs header comments lines 9, 13, 15 show double-quoted forms too (comments only).
QUESTIONS: none
