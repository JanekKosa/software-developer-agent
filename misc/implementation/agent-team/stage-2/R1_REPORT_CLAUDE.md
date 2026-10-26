# R1 report: the answers log in the decision register

Worker: software-developer, 2026-10-26. Task: `R1_TASK_CLAUDE.md`. Progress: `R1_PROGRESS_CLAUDE.md`.

## Outcome

Partly done. The answers log and every command around it are built, tested and live in `<orch>` since 15:47:24.
The invariant on real material passes. The mutation check was **not run**: the context guard stopped me before it
started. The progress file names every mutant and the exact commands to run them.

## What is different now

- **Answers go to a log, not into the entries.** `answer` sets the entry to `waiting-for-agent` and appends one
  line to `decisions\ANSWERS_LOG_CLAUDE.jsonl`, for example
  `{"id":"D-20","answeredAt":"2026-10-26 15:45","answer":"Keep the name Follow up...\r\nSecond line...","handedOverAt":null,"processedAt":null}`.
  The words are stored exactly as given, line breaks included; non-ASCII stays readable (`zażółć` is in the file
  as such). Nothing writes `ANSWERED_DECISIONS_CLAUDE.md` any more.
- **A guard protects the log.** Every write re-reads the log under the lock and refuses (plain error, exit 1,
  nothing written) any write that would drop a record, reorder records, or change an id, time or answer. Only
  `handedOverAt` and `processedAt` may change, once, from null to a time. `handedOverAt` is ready for the next run.
- **A broken log stops loudly.** A line that is not JSON, a blank line, or a record without id, answeredAt or
  answer: every command that reads the log exits 1 naming the file and the line ("ANSWERS_LOG_CLAUDE.jsonl line 2 is
  not valid JSON"), and writes nothing.
- **The old answered file folds in.** The first write of any kind moves its `- Answered:` lines into the log (in
  file order, unprocessed), then deletes the file. Run again after a crash, it adds nothing twice. Reads (`list
  --answered`, `answers`) show its answers as if already folded and change nothing.
- **`close` needs `--summary`.** The resolved entry now ends with `- Final answer: <time>: "<last answer>"`,
  `- Summary: <text>`, `- Resolved: <time>, <outcome>`. No other answer is copied in. The id's unprocessed records
  are then marked processed. Missing or blank summary: exit 2 with the new form in the message.
- **`follow-up --id --text`** adds `- Follow up: <time>: <text>`, sends the entry back to `waiting-for-user` and marks
  the answers processed. `keep-open --still-open` does exactly the same (old spelling).
- **`answers [--ids] [--words] [--json]`** searches all records: ids (malformed: exit 2), words in any case, both
  combined; `--json` prints the stored lines byte for byte.
- **`list --answered`** keeps its old shape (`## D-7` then `- Answered: <time>: "<words on one line>"`), built from
  unprocessed records only, so the prompt hook and older callers keep working.
- Texts follow: hook `ANSWERED_INSTRUCTION`, SKILL.md "The decision register" (table, commands, words note,
  Processing bullets), the new-file headers, the usage and module comments, `_whyNames`.

## Choices I made (the task left them open)

1. **The log's ids count for the next free id.** An old test said "the answered file counts too". Without this, a
   new entry could get an id that already has answers, and closing it would show someone else's answer. So `add`
   reads the log, and a broken log stops `add` too.
2. **Every writer, not only `add`, makes sure of the `.git\info\exclude` lines.** In a client repo whose register
   predates this run, the new log file would otherwise show in `git status` until the next `add`. Tested.
3. **Untouched records are written back byte for byte**; a changed record is written in the contract key order,
   with any key a hand edit added kept at the end (nothing dropped).
4. **A malformed line in an old answered file** (anything under a heading that is not `- Answered: <time>:
   "<words>"`) stops every command that reads it, naming file and line, like a broken log.
5. **`migrate` says when it folded**: `ANSWERED_DECISIONS_CLAUDE.md: 2 answers moved to ANSWERS_LOG_CLAUDE.jsonl,
   file deleted`.
6. `answers` text blocks are one blank line apart; line breaks follow the log's (CRLF for a new log).

## Files changed (all LF, no BOM, as before)

In `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`: `lib\decision-register.mjs`,
`scripts\register.mjs`, `hooks\decision-reminder.mjs` (one text), `orchestration.config.json` (register section),
`SKILL.md` (that one section), `tests\lib\decision-register.test.mjs`, `tests\scripts\register.test.mjs`,
`tests\hooks\decision-reminder.test.mjs`. Nothing is committed. Outside the diff: scratch folders
`C:\Users\user\AppData\Local\Temp\r1-orch` and `r1-inv` and the `r1-*.log` files there were deleted at 15:49
(no links in them); the scratch script `invariant.mjs` stays in my session's scratchpad only.

## Shared file that needs a change (not mine)

`agents\task-lead.md` section 8, lines 158-163, still names the answered file and "keep it open". Proposed text:

> The decision register is three files in the project's repo root's `decisions\` folder: `OPEN_DECISIONS_CLAUDE.md`
> (every entry until it is closed, with a `Status:` line, `waiting-for-user` or `waiting-for-agent`),
> `ANSWERS_LOG_CLAUDE.jsonl` (every answer the user gave, one JSON line each, in the user's words) and
> `RESOLVED_DECISIONS_CLAUDE.md` (closed entries, each with its final answer, a summary and the outcome). Only
> `register.mjs` writes them; never edit them by hand. Never record an answer, close an entry or follow it up: the
> main session does that. When it asks whether an answer settles your entry, say yes, or say in one line what is
> still missing.

## Settings added

`register.answersLogFile`: `ANSWERS_LOG_CLAUDE.jsonl` (the user's choice of a searchable, non-Markdown log;
`_whyNames` says why). `answeredFile` stays: the fold reads it.

## Checks

- Tests before: 154, all pass. After, in the copy: 169 (lib 26 -> 38, register CLI 16 -> 19, hook 11). Every old
  answered-file test was rewritten to the log, none dropped. Red first: 23 lib tests failed against throwing stubs,
  19 CLI tests against the old script, 2 hook tests against the old text; then green.
- Whole suite in the copy (run-heavy): 168 of 169 pass. The one failure is a timing test in
  `limit-stop-server.test.mjs` ("an agent's hook error in the log is FAILED"), a file that never loads the register
  code; re-run alone: 30 of 30 pass.
- Whole suite in `<orch>` after the copy-in (run-heavy, finished 15:49): 169 of 169 pass, 0 fail. Run-heavy's last
  line: `exit 0 | waited 0:00 | ran 1:22 | peak 224 MB in its processes | free memory at its lowest 648 MB`.
- Invariant on real material: 0 differences on 21 entries; the open file ends byte-identical to the real one and the
  resolved file starts with the real 23,849 bytes. Log: exactly two records, in order, words byte-equal (CRLF,
  curly quotes, Polish letters, an emoji). Fold on a second copy: both records once, file gone, a re-run and a crash
  re-run add nothing.
- **Deviation:** the real register had no open entry left (D-15 and all others were resolved by someone between
  15:12 and about 15:40), so the sequence ran on one synthetic entry (D-20) added to the scratch copy.

**Not tested:** the mutation check (context guard; steps in the progress file). The Decisions pane against the new
files (not mine, not read). A real `--root` run against the live register (forbidden by the task).

## Risks

- **Live now:** the next write to the real register will delete its header-only `ANSWERED_DECISIONS_CLAUDE.md`. If
  the pane reads that file directly to show answers, it will find none; it should read `list --answered` or the
  log. I did not read the pane, so this is a guess. Recommendation: check the pane before the user answers next.
- A main session still holding the old SKILL.md text will call `close` without `--summary`; it gets exit 2 with
  the new form named, so nothing is written wrongly.
- The real open file's description still names the answered file; `migrate`'s description update is run 4's.

## Learned

- The real register changes under a run: the task named D-15 as open; by 15:40 nothing was open.
- `run-heavy` waited 9:39 for a slot held by an xpp-agent job before the baseline ran.

DECISIONS TAKEN: log ids count for the next free id (other: open and resolved only; why: a reused id would attach old answers to a new entry), so add reads the log | every writer ensures the info/exclude lines (other: add only; why: the new log would show in git in older client repos) | untouched log lines written back byte for byte, hand-added keys kept (other: re-serialise all; why: never alter or drop stored data) | a malformed old answered line stops every reader (other: skip it; why: never drop an answer) | answers blocks one blank line apart, line breaks as the log's
INITIATIVES: migrate reports a fold in one line | invariant ran on a synthetic entry D-20 because no real entry was open | test for a client repo whose register predates the log
ISSUES FOUND: agents\task-lead.md section 8 still describes the answered file and keep-open (text above) | the real open file's description names the answered file until run 4's migrate | the pane may read ANSWERED_DECISIONS_CLAUDE.md directly and would then show nothing (not checked) | limit-stop-server.test.mjs has a timing test that failed once under load and passes alone | three times in my progress file were written without reading the clock (corrected there)
QUESTIONS: none
