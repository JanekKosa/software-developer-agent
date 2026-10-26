# R4: the Decisions pane reads the answers log and shows Follow up

Written by the task lead, 2026-10-26 17:29. The pane lives in the repo `C:\Repos\My projects\claude-code-extensions`,
folder `decisions-pane`. The register it reads is written by the agent team's scripts in
`C:\Repos\My projects\software-developer-agent\orchestrate-agents` (`<orch>` below).
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` (the agent team's rules; the working files of this
   task live in that repo) and `C:\Repos\My projects\claude-code-extensions\README.md` (the extensions repo; it has
   no `CLAUDE.md`).
2. This file, whole.
3. The `claude-code-mods` skill: `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md` (how mods
   are built, tested and checked here, and the `claude.exe` to use).
4. The pane's `README.md`, whole, then its sources as you need them: `hooks\decisions.ts` (reads the open file),
   `hooks\registers.ts` (settings, the repo root, recording an answer), `hooks\pane.tsx` (draws an entry and its
   earlier lines), `hooks\poll.ts`, `types\index.d.ts`; tests `tests\hooks\pane.test.ts`,
   `tests\support\register-world.ts`.
5. In `<orch>\scripts\register.mjs`: only the usage comment at the top (the commands and the log's shape).

Do not read: the rest of `<orch>`, the other mods in `claude-code-extensions`, the plans, any transcript, the real
`decisions\` folders (neither the agent team's nor `claude-code-extensions\decisions\`) except to copy them
read-only (section 5).

## 2. What it is for

The user answers decisions in this pane. The agent team's register changed today (runs 1 to 2, live in `<orch>`):

- The user's answers no longer go into the entries or into `ANSWERED_DECISIONS_CLAUDE.md` (that file is gone). The
  user: "lets create a answers log, so the answers dont fill up the actual decisions, the agent should be able to
  search for the answers log easily, so maybe lets not use a .md file". Every answer is a line of
  `<repo root>\decisions\ANSWERS_LOG_CLAUDE.jsonl`:
  `{"id":"D-20","answeredAt":"2026-10-26 10:05","answer":"A, retry once","handedOverAt":null,"processedAt":null}`
  (one JSON object per line, records in the order given, the words exactly as given with their line breaks, times
  `YYYY-MM-DD HH:MM` local; `handedOverAt` and `processedAt` are null or such a time). The file name comes from the
  setting `register.answersLogFile` in `<orch>\orchestration.config.json` (read the same way the pane reads
  `register.folder` and `register.openFile` today; default `ANSWERS_LOG_CLAUDE.jsonl`).
- When an agent sends an entry back to the user it adds a **Follow up** block (the user: the `Still open` line
  "should be called follow up because it foloows up to the decisons", and D-15: "the agent can add antyhign they like
  into the follow section, but cannot change the oriigonal options"). Its exact form in the open file:
  ```
  - Follow up: 2026-10-26 10:20: first line of the text
    second line, indented by exactly two spaces
  ␠␠
    a new paragraph after an empty line, which is written as a line of exactly two spaces
  ```
  An entry can have several Follow up blocks. A continuation line may itself start with `- ` after its two spaces
  (`  - Options: C`): that is text of the follow-up, never a field of the entry.
- Old registers (not yet converted) still hold `- Answered: <time>: "<words>"` and `- Still open: <text>` lines
  inside the entries; they must still be shown, with `Still open` shown as Follow up.

The pane must keep doing everything else as it does now: list only the chat's own repo's entries waiting for the
user (D-14: no decision leaks between repos), record answers through `register.mjs answer`, stay up when anything is
unreadable.

## 3. Point 1: read the answers log and Follow up blocks

- Beside an entry waiting for the user, show its history: every answer of that id from the log (time and words,
  line breaks kept) and every Follow up block of the entry (time and text, line breaks and paragraph breaks kept),
  in time order; an answer and a follow-up in the same minute: the answer first (the follow-up responds to it). Old
  in-entry `Answered:` and `Still open:` lines come first, in file order, `Still open` shown with the Follow up label.
  The label the user reads is `Follow up` (it reads `Follow-up` today; use the user's word).
- The open file's reader keeps continuation lines (two leading spaces) inside the block they belong to, with their
  line breaks, and a line of exactly two spaces as a paragraph break, for Follow up blocks. Entries are still split at
  their `## D-...` headings only; a continuation line never starts a field. Other fields keep today's reading.
- Read the log of the chat's own repo only, beside its open file. No log file: no answers, no error. A line of the
  log that is not valid JSON, or lacks `id`, `answeredAt` or `answer`: skip it for display, never crash, never hide
  an entry, and tell the user once in the pane, in plain words, that an answer could not be read (and the line
  number). The pane never writes the log.
- The pane notices a change of the log as it notices a change of the open file today (a new answer recorded from a
  chat, a follow-up written), within its usual polling.
- `README.md`: "What it lists" and "Answering": the log instead of the answered file, `Follow up` blocks, where the
  earlier answers now come from.

## 4. Point 2: the tests and the checks

- Update `tests\support\register-world.ts` so its stand-in for `register.mjs answer` does what the real one does
  now (the entry's status, plus one log record; no answered file), and so it can write a log and Follow up blocks as
  the real scripts lay them out. Build any test text that needs a whitespace-only line in code (a `'  '` string),
  never through a file written by the Write tool: the Write tool strips the spaces of whitespace-only lines.
- Tests from the caller's side (what the pane shows): an entry with two answers and two Follow up blocks, one of
  several lines and one with a paragraph break, in the right order; a `  - Options: C` continuation stays text; an
  old-layout entry with `Answered` and `Still open` lines shows them, the latter as Follow up; no log file; a broken
  log line (entry still shown, the notice shown once); another repo's log is never read; a new answer in the log
  shows up at the next poll; recording an answer still runs `register.mjs answer` with the same arguments.
- The checks the pane's README names, with the `claude.exe` of Claude's VS Code extension (the skill says where):
  `claude plugin validate decisions-pane` and `claude plugin test decisions-pane`, run in
  `C:\Repos\My projects\claude-code-extensions`, and the type-check the README describes. Run the test command
  through `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  with any redirection to a log file inside the command. Report the counts before your change and after.

## 5. The invariant and the mutation check

- **Invariant, against real material**, touching nothing live: copy the agent team's real register folder
  `C:\Repos\My projects\software-developer-agent\decisions\` (read-only, `Copy-Item`) into a scratch repo, and make a
  second scratch register with the real `node <orch>\scripts\register.mjs --root <scratch>` (`add`, `answer`,
  `follow-up` with a text of several lines and an empty line, `answer` again, `follow-up`). Load both through the
  pane's own reading code (the test kit) and check: the entries shown are exactly the open file's entries waiting
  for the user, and each entry's history equals the log's records of its id plus its Follow up blocks, in order, text
  byte-equal ("0 differences on N"). Delete the scratch repos at the end.
- **Mutation check**, in a scratch copy of the pane only (never in `decisions-pane` itself): break one rule at a time,
  run the tests, count caught, restore. At least: the label stays `Still open`; the log is not read; answers and
  follow-ups not in time order; the same-minute tie reversed; continuation lines joined into one line; the two-space
  paragraph line dropped; a `  - Options:` continuation read as a field; another repo's log read; a broken log line
  crashes the reading. Report "N of N caught"; for each not caught, add the test.

## 6. Your files, and what is not yours

Yours: everything under `C:\Repos\My projects\claude-code-extensions\decisions-pane` except `.claude-plugin\plugin.json`
(change it only if a check requires it, and say why).

Not yours: the rest of `claude-code-extensions` (its `decisions\` folder, the other mods), everything under
`C:\Repos\My projects\software-developer-agent` except your progress and report files in `<wf>`, the global
`C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`, anything under `~\.claude\plugins`. Never install,
enable or reload the plugin, and never touch a running VS Code or Claude Code session: reloading the pane is the main
session's.

Another worker runs at the same time in `C:\Repos\My projects\software-developer-agent\orchestrate-agents`: it
adds `scripts\watch-decision-answers.ps1`, its test, a section of `orchestration.config.json` and two places of
`SKILL.md`. Do not touch those; reading `orchestration.config.json` is fine.

## 7. How to work

- No git commands that change anything (no commit, no branch switch, no stash): the repo is shared with other chats.
- Read the clock (`Get-Date`) for every time you write.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Point 1 in
  about 30 tool calls, the tests in about 20; then the invariant and the mutation check at once, before the warning.

## 8. Progress, report, and the end

- Progress file: `<wf>\R4_PROGRESS_CLAUDE.md`, updated after every finished point.
- Report file: `<wf>\R4_REPORT_CLAUDE.md`: what the user sees differently (one real example), test counts before and
  after, the plugin checks' results, the invariant, the mutation check ("N of N caught", the list), what was not
  tested and why (the pane inside a live VS Code is not tested by you: say so), the files changed, peak memory from
  `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`,
  `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 9. Not this run's

An "Explained" block (D-15 chose Follow up instead: nothing more to build than the above); the register scripts;
showing other repos' registers (D-14: never).
