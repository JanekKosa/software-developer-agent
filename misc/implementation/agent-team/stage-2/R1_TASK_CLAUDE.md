# R1: the answers log in the decision register

Written by the task lead, 2026-10-26 15:12. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the repo's rules).
2. This file, whole.
3. `<orch>\lib\decision-register.mjs`, whole (39 KB: the module you change).
4. `<orch>\scripts\register.mjs`, whole (the command line you change).
5. `<orch>\lib\text-file.mjs` and `<orch>\lib\local-time.mjs` (the write and time helpers you reuse).
6. `<orch>\hooks\decision-reminder.mjs` (one text line changes).
7. The tests, by their headings first: `<orch>\tests\lib\decision-register.test.mjs`,
   `<orch>\tests\scripts\register.test.mjs`, `<orch>\tests\helpers\scratch.mjs`; then only the tests of answer,
   close, keep-open and list in full.
8. `<orch>\SKILL.md`, only the section "The decision register" (about lines 84-153).
9. `<orch>\orchestration.config.json`, only the `register` section (about lines 113-125).

Do not read: the rest of `SKILL.md`, `references\`, `watch-session.ps1` or any `.ps1`, the PowerShell tests,
`context-guard.mjs`, `limit-stop*`, the pane in `claude-code-extensions`, the plans under `misc\`, the real
`decisions\` files beyond what section 5 asks.

## 2. What it is for

The user answers decisions in the Decisions pane. Today each answer goes to an answered file and is then copied
into the entry, where answers pile up. The user (2026-10-26 14:47): "lets create a answers log, so the answers dont
fill up the actual decisions, the agent should be able to search for the answers log easily, so maybe lets not use
a .md file, with that said the resolved decisiosn should still have a resolution summary with the final asnwer".
And: the line an agent adds when it keeps an entry open is called `Follow up`, "because it foloows up to the
decisons", and "follows up are only to explian/eloborate or talk about the decision further".

This run builds the log and the commands around it. Handing answers to the main session (a `handover` command, the
watch, the hook handing over) is the next run's: do not build it, but leave the `handedOverAt` field ready for it.

## 3. The contract (exact; the next runs and the pane build on it)

### The log

- File: `<repo root>\decisions\ANSWERS_LOG_CLAUDE.jsonl`. Its name comes from a new setting
  `register.answersLogFile` in `orchestration.config.json`; `registerLocation` gives it as `answersLogPath`, and
  its name and temp-file pattern join `excludeLines`.
- One JSON object per line, keys in exactly this order:
  `{"id":"D-20","answeredAt":"2026-10-26 10:05","answer":"A, retry once","handedOverAt":null,"processedAt":null}`
  - `id`: the id in its written form (`canonicalId`).
  - `answeredAt`, `handedOverAt`, `processedAt`: `formatLocalMinute` times, as everywhere in the register, or
    `null`.
  - `answer`: the user's words exactly as given, line breaks included (no `oneLine`). `JSON.stringify` writes
    non-ASCII as characters, which keeps the file greppable; keep it that way.
- Records stay in the order they were recorded. A new file: UTF-8 without BOM, `NEW_FILE_EOL` line endings, a line
  ending after the last record. An existing file keeps its line endings (`detectEol`).
- Every write happens under the register's lock, as a whole-file atomic write (`writeTextAtomic`). **A guard**
  refuses any write that would drop a record or change an earlier record's `id`, `answeredAt` or `answer` (throw a
  plain `Error`, exit 1, nothing written). Only `handedOverAt` and `processedAt` may change, and only from `null` to
  a time.
- A line that is not valid JSON, or a record without `id`/`answeredAt`/`answer`: every command that reads the log
  fails with a message naming the file and the line number, and writes nothing. Never drop such a line.

### The answered file goes

- Nothing writes `ANSWERED_DECISIONS_CLAUDE.md` any more. `register.answeredFile` stays in the config (the fold
  below and next runs' `migrate` read it).
- **The fold**: every command that writes under the lock first checks for an old answered file. If it holds
  `- Answered: <time>: "<words>"` lines, each becomes a log record (`answeredAt` and words from the line,
  `handedOverAt` and `processedAt` null), appended in file order, the log is written, then the answered file is
  deleted. A record with the same `id`, `answeredAt` and `answer` already in the log is not added again, so a fold
  cut short by a crash finishes cleanly when run again. An answered file holding only its header is deleted too.
- Read-only commands (`list --answered`, `answers`) read an old answered file's answers as if they were already in
  the log (unprocessed), and change nothing.

### The commands (`register.mjs`)

- `answer --id D-7 --answer "<words>"`: as today (the entry must be open; its status becomes
  `waiting-for-agent`), but appends a log record instead of writing the answered file. Order: the open file first,
  then the log.
- `answers [--ids D-7,D-2-5] [--words "<text>"] [--json] [--root <dir>]`: new. Searches the log (all records,
  processed or not). `--ids` keeps records of those ids (malformed id: exit 2, as `list` does; an id with no record
  is simply not shown). `--words`: the text, case-insensitive, as a substring of the answer. Both may be combined.
  Output, in log order: with `--json`, each matching record as its own JSON line exactly as stored; without it, one
  block per record, for example `D-20, answered 2026-10-26 10:05, handed over 2026-10-26 10:15, processed
  2026-10-26 10:20: "A, retry once"` (leave out the parts that are null), words as given. No match: no output,
  exit 0.
- `list --answered`: keeps today's output shape, so the prompt hook and older callers still work: per id, in the
  order of the first unprocessed record, `## D-7` followed by one `- Answered: <answeredAt>: "<words on one line>"`
  per unprocessed record (`processedAt` null). `--ids` as today.
- `close --id D-7 --outcome <outcome> --summary "<text>"`: `--summary` is required (missing or blank: exit 2,
  message naming the new form). The id must be open and have at least one unprocessed record (as today it needed an
  answer in the answered file). The resolved entry is the open entry without its Status line, then
  `- Final answer: <answeredAt>: "<words on one line>"` (the id's last record in the log, any state), then
  `- Summary: <text on one line>`, then `- Resolved: <now>, <outcome>`. No other answer is copied into the entry.
  Then every unprocessed record of the id gets `processedAt` = now. Write order: resolved, open, log; a close cut
  short at any point finishes when run again (keep today's crash handling, `isResolvedCopyOf`, adapted).
- `follow-up --id D-7 --text "<text>"`: new. The id must be open and have at least one unprocessed record. Appends
  `- Follow up: <now>: <text on one line>` to the entry, sets its status back to `waiting-for-user`, then sets
  `processedAt` = now on the id's unprocessed records. Order: open file, then log; run again after a crash, it only
  marks what was left (detect an entry already ending with the same Follow up text and already waiting for the user).
- `keep-open --id D-7 --still-open "<text>"`: kept as the old spelling of `follow-up`; does exactly the same and
  writes a `Follow up` line.
- `list`, `summary`, `add`, `migrate`: unchanged in what they do (`add` and `migrate` fold, as every writer does).
  `migrate`'s conversion of old entries is run 4's: do not build it.
- The header descriptions a new open or resolved file gets (`openHeader`, `resolvedHeader`) describe the new layout
  in one or two plain sentences (the log, Final answer, Summary, Follow up). Do not touch the descriptions
  `migrate` replaces.
- Update the usage comment at the top of `register.mjs` and the module comment at the top of
  `decision-register.mjs`.

### Text that must follow (live, so it must not be wrong after this run)

- `hooks\decision-reminder.mjs`: only `ANSWERED_INSTRUCTION`: the user's answers are read with
  `register.mjs list --answered` (still true), then the entry is closed with a summary
  (`close --id --outcome --summary`) or followed up (`follow-up --id --text`). Adjust its test if one asserts the
  text.
- `SKILL.md`, section "The decision register" only: the table (the log replaces the answered file), the command
  block (`answers`, `close ... --summary`, `follow-up`), the note on passing words (it names `--still-open`: now
  `--text` and `--summary`), and the "Processing an answer" bullets (close with a summary that includes the final
  answer; a follow-up "only explains, elaborates or talks about the decision further", in the user's sense). Change
  nothing else in `SKILL.md`; run 6 rewrites the main session's side.
- `orchestration.config.json`: add `answersLogFile` and update `_whyNames` in the `register` section only. Keep the
  file's encoding and line endings.

## 4. Your files, and what is not yours

Yours: `<orch>\lib\decision-register.mjs`, `<orch>\scripts\register.mjs`, `<orch>\hooks\decision-reminder.mjs`
(the one text), `<orch>\orchestration.config.json` (the `register` section), `<orch>\SKILL.md` (that one section),
`<orch>\tests\lib\decision-register.test.mjs`, `<orch>\tests\scripts\register.test.mjs`,
`<orch>\tests\hooks\decision-reminder.test.mjs`, and new test files under `<orch>\tests\` if you prefer.

Not yours: everything else, in particular `decisions\*.md` (never write the real register; read it only to copy
it, section 5), the vendored `skills\`, `agents\`, `references\`, every `.ps1`, the pane in
`C:\Repos\My projects\claude-code-extensions`, `C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`.
No other agent is changing files now.

## 5. How to work, and the checks

- **`<orch>` is live**: it is linked into `~\.claude\skills`, so every save reaches every running session at once
  (the prompt hook runs `decision-register.mjs` on every prompt; the pane runs `register.mjs answer`). So:
  1. Copy `<orch>` to a scratch folder first (for example `C:\Users\user\AppData\Local\Temp\r1-orch`), develop and
     test there. Tests find their files relative to themselves, so the copy runs on its own.
  2. When the copy's whole suite passes, copy your changed files into `<orch>` in one step, then run the whole suite
     in `<orch>`. Never leave a half-done edit in `<orch>`.
  3. Delete the scratch copy at the end.
- **Every heavy command** (the test suite, a long real-data run) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  run from the folder the command needs, any redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r1-node.log'`.
  Spell the folder with a capital `C:\` (one existing test fails on `c:\`). Single test files may run directly.
- **Tests**: every point testable from the caller's side (the command line and the exported functions). No test
  reads or writes the real `decisions\`: use scratch repos (`tests\helpers\scratch.mjs`). Baseline: 154 Node tests,
  all pass. Expect 154 plus yours, all pass, and the old tests of the answered file rewritten to the log, not
  deleted without a replacement.
- **The invariant, against real material** (touches nothing live): copy the real
  `C:\Repos\My projects\software-developer-agent\decisions\` folder (read-only, `Copy-Item`) into a scratch repo
  (a folder with a `.git` folder, as `scratch.mjs` builds one), then with the new `register.mjs --root <scratch>`:
  answer the open D-15 with two lines of words, `list --answered`, `follow-up`, answer again, `close` with a
  summary, `answers --ids D-15`, `answers --words` on a word from the first answer, `answers --json`. Check: the
  log holds exactly the two records, in order, words byte-equal to what you passed; the resolved D-15 ends with
  Final answer (the second words), Summary, Resolved; every other entry of the three files is byte-identical to the
  copy before (report "0 differences on N entries"). Then the fold: put an old-style answered file with two answers
  for one open entry into a second scratch copy, run one write, and check the log has both records once, the file is
  gone, and running the write again adds nothing.
- **The mutation check**, in a scratch copy only (never in `<orch>`): break one rule at a time and run the suite:
  at least these: the guard lets a record drop; close does not mark processed; follow-up does not set
  waiting-for-user; the fold adds a duplicate on re-run; `--words` is case-sensitive; close copies the first
  instead of the last answer; `list --answered` shows processed records. Report "N of N caught"; for a mutation
  not caught, add the test that catches it and report it.
- **Plan for your size**: you are warned at 320 thousand of your 400 thousand tokens, after roughly 75 tool calls.
  Build point 1 (the log, answer, fold, answers, list --answered), then point 2 (close, follow-up, keep-open), then
  the texts, then the invariant and the mutation check, which start right after the build, before the warning.
- Read the clock (`Get-Date`) for every time you write.

## 6. Progress, report, and the end

- Progress file: `<wf>\R1_PROGRESS_CLAUDE.md`, updated after every finished point (what is done, decisions and
  reasons, measurements, what is left).
- Report file: `<wf>\R1_REPORT_CLAUDE.md`: what changed by effect, the test counts (before and after), the invariant
  ("0 differences on N"), the mutation check ("N of N caught"), what was not tested and why, the files changed, the
  peak memory from `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`,
  `ISSUES FOUND`, `QUESTIONS`) as the team rules say.
- Your final message: the report's summary, ending with the same four lines. If you must ask, end with a final
  message that starts `QUESTION FOR THE LEAD |`.

## 7. Waits for the user, do not build

- D-15: no "Explained" block, and no change to what a follow-up can hold beyond the rename.
- D-17, D-18, D-19 are initiatives the user may still overrule; build as written here.
