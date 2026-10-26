# R6b1 report: SKILL.md, agents\task-lead.md and the README say what is true now

Worker R6b1, 2026-10-26 20:40 (Get-Date). Progress file: `R6B1_PROGRESS_CLAUDE.md` in this folder.

## Outcome

Done. The three files were copied in at 20:37:45, each in one step. Every register command in `SKILL.md` was run
against scratch repos and does what the text says. Nothing is committed (the repo has no commits yet).

## What changed, by effect

**`orchestrate-agents\SKILL.md`**
- Starting work: step 1 starts the **Usage and context watch** (`watch-usage-and-context.ps1`), step 2 the
  **Decision answers watch**, each with its exact description beside the command and the user's D-16 words. One
  line names the third watch, the Agent size and stall watch, as a fallback started per `references/lessons.md`.
- Step 2 says what the watch really does: hand-over at start, every 30 minutes, and at once when no open entry waits
  for the user (user's words, the 5-answers example), the 5-second look, a follow-up holding that back, the failure
  line, and D-25.
- The decision register is one text: the three files (the log replaces the answered file), entries and ids, how an
  answer reaches you (chat with `--handed-over`; pane via watch or reminder, exactly once), the reminder's lines,
  processing (close with a summary holding the final answer, or follow up), what a follow-up may hold (D-15 quoted;
  example: a question back is a follow-up, a new option "C" is child entry D-7-1), the full command block (now with
  `add`, `handover [--when-all-answered]`, `$summary`, `$text`), the here-string rule, `--root`, `migrate` per R5.
- Every "session watch" names the Usage and context watch. Every hand-over stops **both** watches with `TaskStop`
  (R3); after `SESSION RESET COLD` neither is restarted; after a Claude Code restart both are started again.
- Durable files: the register row names the three files and the answers log.
- Corrected after testing: the reminder's answers come under "the user's answers, handed to you now:".

**`agents\task-lead.md`**: section 8 names the three files (R1's text, plus "never deleted"); a lead never records
an answer, closes an entry or follows it up. Three other search hits fixed: `parent` no longer calls a child "a
follow-up to an answered question" (a child is for changed options); section 13 says "follow it up"; section 1
says the main session records chat answers and closes or follows up entries.

**`README.md`**: the script list names the three watch files.

All three stay UTF-8 without BOM, LF only, ASCII (read back after the copy).

## The invariant

- **24 of 24 command forms work**; 23 ran exactly as written (plus `--root`, or from a scratch repo), one with added
  isolation parameters. Register: `add`; `list` in 7 forms; `answers` in 5; `summary`; `answer --handed-over` with
  the here-string (`$5`, `$(Get-Date)`, backtick-n, curly quotes stored exactly); the `Get-Content -Raw` fallback
  with a line starting `'@`; `handover` and `--when-all-answered`; `close` with all 5 outcomes; two-line
  `follow-up`; `keep-open --still-open`; `migrate`. All exit 0 with the stated effects. The block taken straight
  from the live file and run as a script: 9 of 9 lines exit 0.
- `migrate` on a hand-made older register did each thing the text claims; a second run changed nothing; an
  unreadable line gave exit 1, named file and line, changed nothing.
- Decision answers watch (`-EveryMinutes 1 -LookSeconds 1`): held back while one entry waited for the user; ended
  0.3 s after the last answer; handed over at start and at the 1-minute look; with a broken log ended `DECISION
  ANSWERS WATCH FAILED` after 3 s; each printout ends with the restart line SKILL.md quotes.
- Usage and context watch, isolated (fake session, scratch folders, stub server): ran 20 s, stopped by its own id,
  left nothing behind.
- **Paths: 57 of 57 exist** (47 by an automated pass, 10 by hand); the new watch files were in place by 20:34.
  Absent on purpose: `ANSWERED_DECISIONS_CLAUDE.md` and the README's left-out test fixtures.

## Consistency check

The nine old names and phrases in the live files: 4 hits, each on purpose. SKILL.md 213 and 217 (the old answered
file and `Still open:` lines that `migrate` converts); task-lead.md 251 and 272 ("register ids still open", plain
English). `keep-open` appears once, as the old spelling.

Each fact: watch names and descriptions, start, timing, failure, D-25, TaskStop: SKILL Starting work, Sizes, Usage
limits. Forwarders: named nowhere. Settings key: my files name only `decisionAnswersWatch.everyMinutes`, untouched by
R6a's rename. Printed lines: unchanged. Files and log: register table, task-lead section 8, durable files. Pane or
chat, exactly once, the reminder: "How an answer reaches you". Close, Final answer, follow-up, D-15: "Processing",
task-lead `parent`. Commands, here-strings, `migrate`: the block and what follows. The pane's own behaviour and D-24
need no line here.

## Not checked

- The Usage and context watch started bare: from here it would attach to the live main session (its session id
  comes from the environment) and could start the limit-stop server against the running agents.
- That watch's own lines (`LIMIT NEAR`, ...): only its name changed in the text.
- `migrate` folding an old answered file, and a cut-short run finishing later: I did not know the old file's layout.
- The `run-heavy.ps1` and `schedule-relaunch.ps1` lines: unchanged; the second schedules a real relaunch.
- The test suites: no test reads these files, and R6a is changing the tests now.

## Files

Changed: `orchestrate-agents\SKILL.md`, `agents\task-lead.md`, `README.md`; created this report and the progress
file. Kept in my scratchpad: `r6b1\orig\` (the files as found; the only way to diff or undo) and `r6b1\scripts\`.
Scratch repos deleted; no process of mine running.

## Text for files that are not mine

1. `register.mjs`, the "what to do" line `handover` and the reminder print: replace `--summary "<text>"` and
   `--text "<text>"` with `(register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up
   (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in
   double quotes.`
2. `references\lessons.md` (R6b2): give the Agent size and stall watch's command beside its description
   `Agent size and stall watch`; SKILL.md now points there for it.

DECISIONS TAKEN: Ran the Usage and context watch with a fake session, scratch folders and a stub server instead of bare, because bare it attaches to the live main session; Named the two forwarder files nowhere (the facts allow one line), because the main session deletes them soon and the line would go stale; SKILL.md names the Agent size and stall watch in one line and points to lessons.md for its command, instead of a command whose arguments live in R6b2's file.
INITIATIVES: Ran the reminder hook, the watch's failure path and migrate on a hand-made old register beyond the command check, which found the reminder's different header (text corrected); Changed task-lead.md section 1's line on the main session's job (a hit of the "answered" search that was incomplete, not false).
ISSUES FOUND: register.mjs handover and the reminder print `--summary "<text>"` and `--text "<text>"` in double quotes, against SKILL.md's here-string rule; a main session copying that with words holding `$5` or `$(...)` would store them changed; task-lead.md section 1 still says the main session "relays your lines and register entries to the user", though the user now reads entries in the pane; left alone (not a search hit).
QUESTIONS: none
