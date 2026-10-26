# R2: hand each answer to the main session exactly once

Written by the task lead, 2026-10-26 16:37. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R1_REPORT_CLAUDE.md`, sections "What is different now" and "Choices I made" (the answers log run 1
   built; `<wf>\R1B_REPORT_CLAUDE.md` only its section "What is different now").
4. In `<orch>\lib\decision-register.mjs`: the module comment, `registerLocation`, `answerEntry`, `listAnswers`,
   `openItems`, `itemLabel`, `checkAnswersLogChange`, `markProcessed`, `foldAnsweredFile`, `withRegisterLock`, and
   the log's read and write helpers they call. Find them with a search; read the rest only if a change needs it.
5. `<orch>\lib\file-lock.mjs` (the lock and its wait).
6. `<orch>\scripts\register.mjs`, whole (220 lines).
7. `<orch>\hooks\decision-reminder.mjs`, whole, and `<orch>\lib\hook-io.mjs`.
8. The tests, by their headings first: `<orch>\tests\lib\decision-register.test.mjs`,
   `<orch>\tests\scripts\register.test.mjs`, `<orch>\tests\hooks\decision-reminder.test.mjs`,
   `<orch>\tests\helpers\scratch.mjs`; then only the tests of answer and of the hook in full.
9. In `<orch>\SKILL.md`: only the section "The decision register".
10. In `<orch>\orchestration.config.json`: only the `register` section.

Do not read: the rest of `SKILL.md`, `references\`, any `.ps1` or the PowerShell tests, `context-guard.mjs`,
`limit-stop*`, the pane, the plans, the real `decisions\` files except to copy them (section 6).

## 2. What it is for

The user answers decisions in the Decisions pane, and also in the main chat (the user, 15:19: "i should alos be
able to answer deciosins in the main chat not only in the decisions pane"). Today a pane answer reaches the main
session only when the user next types in the chat. The user asked for a watch that "will handle new asnwwered
decisosn everu 15mins (configurable), the answered decision should be passed to the orchestroaotr agent/ main agent
... so that the watch doesnt process the same answerwerd decisiosn 15misn later". And the user chose (D-18, 15:19)
that both the watch and the user's next chat message hand answers over, the first one wins, each answer exactly
once. This run builds the hand-over in the register and in the prompt hook. The watch script itself (a thin
PowerShell loop over the command you build) is the next run's: do not build it.

## 3. The contract (exact; the watch and the main session's instructions build on it)

The log is `decisions\ANSWERS_LOG_CLAUDE.jsonl`, one record per answer:
`{"id","answeredAt","answer","handedOverAt","processedAt"}`. Run 1 left `handedOverAt` null everywhere.

### Point 1: the hand-over in the register

- **Waiting to be handed over** means: `handedOverAt` null **and** `processedAt` null. A record already processed
  is never handed over, whatever its `handedOverAt` (the real log already holds one such record: an answer the main
  session recorded and closed before this run, `handedOverAt` null, `processedAt` set).
- `handOverAnswers(location, now, { lockWaitMs } = {})` (exported): under the register's lock (with the fold, as
  every writer), takes every waiting record in log order, sets `handedOverAt` = now on each, writes the log (the
  guard of run 1 stays in force), and returns them, each with the entry's label (`itemLabel` of the open entry, or
  of the resolved one, or the id alone). `lockWaitMs` overrides the register's lock wait (the hook uses a short
  one). A lock not free in time: throw the busy error as today; nothing written.
- `register.mjs handover [--root <dir>]` (new): runs it and prints, when at least one record was handed over:
  ```
  DECISION ANSWERS | D-20, D-21
  D-20 "Retry a rejected invoice?", answered 2026-10-26 10:05:
  A, retry once

  D-21 "Round VAT per line or per invoice?", answered 2026-10-26 10:07:
  B, but only from September
  For each answer: pass it, in the user's words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary "<text>"), or follow it up (register.mjs follow-up --id <id> --text "<text>").
  ```
  The first line lists each id once, in log order; each answer block gives the label, the time and the words
  exactly as stored (line breaks kept), blocks one blank line apart, then the one instruction line. Nothing waiting:
  no output at all, exit 0. Busy lock: exit 1 with the busy message on stderr (the watch will retry next round).
  Usage errors: exit 2 as every command.
- `answer --id D-7 --answer "<words>" --handed-over` (new flag): the record is written with `handedOverAt` =
  `answeredAt`. This is what the main session uses for an answer the user typed in the chat: it already has the
  words, so neither the watch nor the hook hands it over again. Without the flag, as today (the pane's way).

### Point 2: the prompt hook hands over too

`hooks\decision-reminder.mjs` (UserPromptSubmit; reads only the register of the session's own repo, D-14). Its
context, in this order, each part only when it has something:

1. As today: the blocking entries still waiting for the user, one line, and its instruction.
2. New: when records wait to be handed over, it calls `handOverAnswers` with a short lock wait (new setting
   `register.hookLockWaitSeconds`, 2; a prompt must not hang 10 s on a busy register), and adds a line
   `Decision register of <folder> (<root>): the user's answers, handed to you now:` followed by the answer blocks
   and the instruction line exactly as `handover` prints them (share the formatting code; the `DECISION ANSWERS |`
   first line is the watch's, not the hook's). If the lock is busy, it adds nothing about answers, writes one stderr
   line, and leaves them for the watch or the next prompt. It must never fail the prompt (as today).
3. Replacing today's "answered by the user and waiting for an agent" line: entries whose status is
   `waiting-for-agent` and whose unprocessed records were **all handed over earlier** (not in part 2 of this same
   prompt) are named in one line: `Decision register of ...: handed to you earlier and not yet closed or followed
   up: D-7 (handed over 2026-10-26 10:15).` with the instruction: `If you are already dealing with it, carry on and
   do not pass the answer to the lead again; otherwise read it with register.mjs answers --ids <id> and process it.`
   So nothing is lost when a session was cut off, and nothing makes the main session act twice.

Write the hook's texts plainly; keep `ANSWERED_INSTRUCTION` and the blocking texts as short as they are now.

### Text that must follow

- `SKILL.md`, section "The decision register" only: say plainly that the user may answer in the Decisions pane or
  in the chat, both first-class (the user, 15:19). An answer typed in the chat: the main session records it at once
  with `answer --id <id> --answer <words> --handed-over`, then processes it like any other. An answer given in the
  pane reaches the main session once, by whichever comes first: the decision answers watch (next run) or the hook
  at the user's next message. Add `handover` and `--handed-over` to the command block, and the "handed to you
  earlier" line to the reminder bullet. Change nothing else in `SKILL.md`; the watch's start and restart are
  written in a later run.
- The usage comment of `register.mjs`, the module comment of `decision-register.mjs`, the hook's header comment.
- `orchestration.config.json`: `register.hookLockWaitSeconds` (2) with a `_why`, in the `register` section only.
  Keep the file's encoding (UTF-8 without BOM) and its LF line endings.

## 4. Your files, and what is not yours

Yours: `<orch>\lib\decision-register.mjs`, `<orch>\scripts\register.mjs`, `<orch>\hooks\decision-reminder.mjs`,
`<orch>\orchestration.config.json` (the `register` section), `<orch>\SKILL.md` (that one section), and the three
test files named in section 1 (new test files under `<orch>\tests\` are fine).

Not yours: everything else, in particular the real `decisions\` files (never write them; copy them only), the
vendored `skills\`, `agents\`, `references\`, every `.ps1`, the pane in `C:\Repos\My projects\claude-code-extensions`,
`C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`. No other agent is changing files now.

## 5. How to work

- **`<orch>` is live** (linked into `~\.claude\skills`; the hook runs at every prompt of every session, the pane
  runs `register.mjs answer`). Develop in a scratch copy of `<orch>` (for example
  `C:\Users\user\AppData\Local\Temp\r2-orch`), run the whole suite there, then copy your changed files into `<orch>`
  in one step and run the whole suite in `<orch>`. Never leave a half-done edit in `<orch>`. Delete your scratch
  folders at the end.
- **Every heavy command** (the whole suite, a long real-data run) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r2-node.log'`.
  Spell the folder `C:\`, never `c:\`. Single test files may run directly.
- Baseline: 176 Node tests, all pass (run 1b's worker in `<orch>` at 16:30; the lead's own run of the suite on the
  same files is in progress and may hold run-heavy's one slot when you start, so your first heavy command may wait).
  Your scratch copy's first suite run is your own baseline: if it is not 176 of 176, stop and ask the lead. Expect 176 plus yours, all pass. The timing
  test "an agent's hook error in the log is FAILED" in `limit-stop-server.test.mjs` may fail under load (the user
  chose to leave it, D-20): if it fails, re-run that file alone and report both results; do not change it.
- No test reads or writes the real `decisions\`: scratch repos only (`tests\helpers\scratch.mjs`). Hold the lock in
  a test by creating the lock file the way `file-lock.mjs` does, never by sleeping.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Run 1 ran out
  with two points; keep yours lean: point 1 in about 25 tool calls, point 2 in about 20, the texts in 5, then the
  invariant and the mutation check at once, before the warning. Do not read files you were not sent to.
- Read the clock (`Get-Date`) for every time you write.

## 6. The checks

- **The invariant, against real material**, touching nothing live: copy the real
  `C:\Repos\My projects\software-developer-agent\decisions\` folder (read-only, `Copy-Item`) into a scratch repo (a
  folder with a `.git` folder). With the new scripts and `--root <scratch>`: `handover` prints nothing (the one real
  record is processed); add an entry, answer it from the pane's way (no flag) and another with `--handed-over`;
  run the hook (its stdin JSON with `cwd` = the scratch repo) and check it hands over the first only; `handover`
  then prints nothing; a second hook run gives the "handed to you earlier" line and no words; follow-up the first
  and run the hook again: no line about it. Check every record and entry not touched by the sequence is
  byte-identical to the copy ("0 differences on N").
- **The mutation check**, in a scratch copy only (never in `<orch>`): break one rule at a time, run the register's
  test files, count caught, restore. At least: handover ignores `processedAt`; handover does not mark; handover
  marks but returns nothing; `--handed-over` ignored; the hook does not mark; the hook hands over when the lock is
  busy instead of skipping; the hook's "earlier" line also lists entries handed over in the same prompt; the "earlier"
  line lists entries with a record not yet handed over; the first line lists an id twice. Report "N of N caught";
  for each mutant not caught add the test that catches it.

## 7. Progress, report, and the end

- Progress file: `<wf>\R2_PROGRESS_CLAUDE.md`, updated after every finished point.
- Report file: `<wf>\R2_REPORT_CLAUDE.md`: what changed by effect, test counts before and after, the invariant, the
  mutation check ("N of N caught" with the list), what was not tested and why, the files changed, peak memory from
  `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`,
  `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 8. Not this run's

The watch script `watch-decision-answers.ps1` and its settings section; renaming the other watches; the pane;
`migrate`'s conversion of old entries; the rest of `SKILL.md`, `agents\task-lead.md`, the guide pages, the README.
