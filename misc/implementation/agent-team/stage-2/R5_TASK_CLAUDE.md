# R5: migrate converts old registers to the answers log

Written by the task lead, 2026-10-26 18:32. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R1_REPORT_CLAUDE.md`, sections "What is different now" and "Choices I made".
4. In `<orch>\lib\decision-register.mjs`: the module comment, `migrateRegister` and everything it calls,
   `checkAnswersLogChange` (the log's guard), `foldAnsweredFile`, `closeEntry` (the layout a close writes now),
   `openHeader`, `resolvedHeader`, the constants at the top, and the log's read and write helpers. Find them with a
   search; read the rest only if a change needs it.
5. In `<orch>\scripts\register.mjs`: the usage comment and the `migrate` branch.
6. In `<orch>\tests\lib\decision-register.test.mjs` and `<orch>\tests\scripts\register.test.mjs`: the migrate tests
   and the helpers they use; `<orch>\tests\helpers\scratch.mjs`.

Do not read: `SKILL.md`, `references\`, any `.ps1`, the PowerShell tests, the hook, `context-guard.mjs`,
`limit-stop*`, the pane, the plans. Real registers only as section 5 says.

## 2. What it is for

The user's answers now live in the answers log (`decisions\ANSWERS_LOG_CLAUDE.jsonl`), not in the entries (the
user: "lets create a answers log, so the answers dont fill up the actual decisions ... the resolved decisiosn should
still have a resolution summary with the final asnwer"; and later "the answers log should have all asnwers"). The
user chose (D-19) how old registers are converted: "the answers already inside old decisions move to the log; each
old closed decision keeps one line with your final answer, word for word, but gets no written summary ... Old 'Still
open' lines become 'Follow up' lines." The main session runs the conversion on the real registers after this task;
you build and prove it on copies.

The real registers hold three generations of layout. Each must come out in today's layout, and no answer may be
lost or changed:

1. **Oldest** (2026-10-25 and the morning of 2026-10-26): the user's words sit in the Resolved line of a closed
   entry: `- Resolved: 2026-10-25 22:05, accepted: "I ACCEPT ALL but D-0004"`. No Answered lines.
2. **Middle** (2026-10-26, until run 1): answers as lines inside entries, `- Answered: 2026-10-26 14:47: "<words>"`
   (open and resolved entries), `- Still open: <text>` lines, and `- Resolved: <time>, <outcome>` without words. An
   `ANSWERED_DECISIONS_CLAUDE.md` file may exist (run 1's fold already moves it into the log; keep that).
3. **Today**: answers in the log; a closed entry ends `- Final answer: <time>: "<words>"`, `- Summary: <text>`,
   `- Resolved: <time>, <outcome>`; `- Follow up: <time>: <text>` blocks (several lines, two-space indent).

## 3. The contract of `migrate` (in addition to what it does today)

Keep everything `migrate` does now (ids in their written form, Status lines on open entries, the old descriptions
replaced, the fold of an old answered file). Add:

- **Answered lines** (open and resolved entries): each `- Answered: <t>: "<words>"` becomes a log record
  `{id, answeredAt: t, answer: words, handedOverAt: null, processedAt: P}` and the line leaves the entry. `P` is the
  entry's Resolved time for a resolved entry, the time `migrate` runs for an open one (an in-entry answer was always
  processed already).
- **Final answer** (resolved entries): an entry that had Answered lines gets `- Final answer: <t>: "<words>"` of its
  last Answered line, placed right before its `- Resolved:` line, unless it already has a Final answer line. No
  Summary line is invented (D-19).
- **Resolved lines with words** (oldest layout): `- Resolved: <t>, <outcome>: "<words>"` becomes a log record
  `{answeredAt: t, answer: words, processedAt: t}` (the Resolved time is the only time known), and in the entry the
  line becomes two: `- Final answer: <t>: "<words>"` then `- Resolved: <t>, <outcome>`.
- **Still open** lines become `- Follow up: <text>`, text unchanged, no time added (none is known). Readers already
  accept an untimed Follow up.
- **The words**: the old lines held the words on one line in double quotes. The words are everything between the
  first `"` after the time (or the outcome) and the last `"` of the line, so words that themselves hold quotes
  survive. A line that starts like one of these but does not parse: `migrate` changes nothing at all and fails
  naming the file, the line number and the line (exit 1 or 2, your choice, said in the usage comment). Never drop
  or guess words.
- **Log order**: records added by `migrate` go into the log in time order (`answeredAt`), merged with the records
  already there, which keep their relative order and stay byte for byte unchanged; within the same minute, the
  migrated record comes first. This matters: `close` copies the id's **last** record as the Final answer, so an old
  answer must never land after a newer one. Run 1's guard refuses any reordering: give `migrate` its own guard that
  allows only inserting new records (every existing record still present, unchanged, in the same relative order)
  and use the strict one everywhere else.
- **Never twice**: a record with the same `id`, `answeredAt` and `answer` already in the log is not added again.
  Write order: the log first, then the resolved file, then the open file; a run cut short at any point finishes on
  the next run without a duplicate, and a run on a converted register reports nothing to change.
- **Descriptions**: every older description under a file's title (all three generations) is replaced by today's
  (`openHeader`, `resolvedHeader`). Add the descriptions of generations 2 and 3 to what `migrate` recognises; take
  the exact old texts from the module's history in the tests or from the real files' copies (section 5).
- **Report**: one line per file that changed, adding to today's report, for example
  `RESOLVED_DECISIONS_CLAUDE.md: 14 answers moved to the log, 12 Final answer lines added, 1 Still open line renamed`
  and `ANSWERS_LOG_CLAUDE.jsonl: 37 records added`.
- Update the usage comment of `register.mjs` (what `migrate` converts) and the module comment.

## 4. Your files, and what is not yours

Yours: `<orch>\lib\decision-register.mjs`, `<orch>\scripts\register.mjs` (comments and the `migrate` branch),
`<orch>\tests\lib\decision-register.test.mjs`, `<orch>\tests\scripts\register.test.mjs`, new test files under
`<orch>\tests\`.

Not yours: everything else, in particular every real `decisions\` folder (read-only copies only, section 5),
`SKILL.md` (the last run documents `migrate`), the hook, every `.ps1`, the vendored `skills\`, `agents\`,
`references\`, `C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`.

Another worker runs at the same time, in another repo: it changes only files under
`C:\Repos\My projects\claude-code-extensions\decisions-pane`. Do not touch that folder.

## 5. How to work, and the checks

- **`<orch>` is live** (linked into `~\.claude\skills`; the prompt hook and the pane run this module at every prompt
  and answer). Develop in a scratch copy of `<orch>` (for example `C:\Users\user\AppData\Local\Temp\r5-orch`), run
  the whole suite there, then copy your changed files into `<orch>` in one step and run the whole suite in `<orch>`.
  Never leave a half-done edit in `<orch>`. Delete your scratch folders at the end.
- **Every heavy command** through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r5-node.log'`.
  Spell the folder `C:\`, never `c:\`. Single test files may run directly.
- Baseline: 204 Node tests, all pass (the lead, 18:30). Two timing tests of `limit-stop-server.test.mjs` may fail
  under load (the user chose to leave them, D-20): if one fails, re-run that file alone and report both results;
  do not change it. Any other failure in your first scratch run: stop and ask the lead.
- Build test data that needs exact bytes (CRLF, quotes inside words, non-ASCII) in code, never through a file
  written with the Write tool (it strips the spaces of whitespace-only lines).
- **The invariant, against real material**, touching nothing live. Copy each real register folder read-only
  (`Copy-Item`) into its own scratch repo (a folder with a `.git` folder): `C:\Repos\My projects\software-developer-agent\decisions\`,
  `C:\Repos\My projects\xpp-agent\decisions\` and `C:\Repos\My projects\claude-code-extensions\decisions\`. Before
  touching them, count in each copy: Answered lines, Resolved lines with words, Still open lines, log records. Run
  `node <your register.mjs> migrate --root <copy>`, then check for each: records added = Answered lines + Resolved
  lines with words, each record's words byte-equal to the words in its old line; every resolved entry that had an
  answer has exactly one Final answer, equal to its last answer; no Answered, Still open or Resolved-with-words line
  left; every other line of every entry unchanged; the old records of the log unchanged and in order; `close`,
  `list`, `answers` and `summary` still work on the result; a second `migrate` reports nothing to change; a run cut
  short after the log was written (simulate it) finishes on the next run with no duplicate. Report it as "0
  differences on N" per register. **The other repos' registers are their own (D-14: no decision leaks between
  repos): report only counts for them, never their words or entries, and delete those copies when done.**
- **The mutation check**, in a scratch copy only (never in `<orch>`): break one rule at a time, run the register's
  test files, count caught, restore. At least: an Answered line left in place; the Final answer taken from the first
  answer; Final answer added when one exists; migrated records appended at the end instead of in time order; the
  same-minute tie reversed; the dedupe dropped (a re-run duplicates); the words cut at the first inner quote; a
  malformed line skipped instead of failing; Still open not renamed; the migrate guard lets an existing record
  change; the strict guard loosened for every writer. Report "N of N caught"; for each not caught, add the test.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Generations 2
  and 3 first (about 25 tool calls), then generation 1 and the descriptions (about 15), then the invariant and the
  mutation check at once, before the warning.
- Read the clock (`Get-Date`) for every time you write.

## 6. Progress, report, and the end

- Progress file: `<wf>\R5_PROGRESS_CLAUDE.md`, updated after every finished point.
- Report file: `<wf>\R5_REPORT_CLAUDE.md`: what changed by effect, with one example from this repo's own register
  (never from another repo's), test counts before and after, the invariant per register (counts only for other
  repos), the mutation check ("N of N caught", the list), what was not tested and why, the files changed, peak
  memory from `run-heavy.ps1`'s last line, the exact command the main session runs per real register, and the
  four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 7. Not this run's

Running `migrate` on any real register (the main session's, after the task); `SKILL.md` and the other docs; the
watches; the pane.
