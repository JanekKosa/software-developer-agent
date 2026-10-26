# R2 report: hand each answer to the main session exactly once

Worker, 2026-10-26, finished 17:26. Task: `R2_TASK_CLAUDE.md`. Details: `R2_PROGRESS_CLAUDE.md`.

## Outcome

Done, and live in `<orch>` since 17:15. An answer given in the Decisions pane now reaches the main session once: by
`register.mjs handover` (for the watch of the next run) or by the prompt hook, whichever comes first. An answer typed
in the chat and recorded with `--handed-over` is never handed over again. Nothing is committed.

## What is different now

- **`register.mjs handover [--root <dir>]`** takes every record with `handedOverAt` and `processedAt` both null, sets
  `handedOverAt`, and prints them. Example, D-1 answered twice and D-2 once in the pane:
  ```
  DECISION ANSWERS | D-1, D-2
  D-1 "Retry a rejected invoice?", answered 2026-10-26 10:05:
  A, retry once

  D-2 "Round VAT per line or per invoice?", answered 2026-10-26 10:06:
  B,
  but only from September

  D-1 "Retry a rejected invoice?", answered 2026-10-26 10:07:
  A, and log it
  For each answer: pass it, in the user's words, to the lead it concerns; then close the entry ... (exact contract text)
  ```
  Nothing waiting: no output, exit 0. Busy lock: exit 1, busy message on stderr, nothing written. Wrong use: exit 2.
  A processed record is never handed over, whatever its `handedOverAt` (the real log's one record stays untouched).
- **`answer ... --handed-over`** writes the record with `handedOverAt` = `answeredAt`. Without it, as before.
- **The prompt hook** now gives, in this order, each part only when it has something: the blocking line and its
  instruction (as before); `Decision register of <folder> (<root>): the user's answers, handed to you now:` with the
  same answer blocks and instruction as `handover` (shared code, no `DECISION ANSWERS |` line); then
  `...: handed to you earlier and not yet closed or followed up: D-7 (handed over 2026-10-26 10:15).` with
  `If you are already dealing with it, carry on and do not pass the answer to the lead again; otherwise read it with
  register.mjs answers --ids <id> and process it.` The hand-over waits for the lock at most 2 s
  (`register.hookLockWaitSeconds`). A busy lock: nothing about those answers, one stderr line, left for the watch or
  the next prompt.
- **Deliberate differences from the old hook:**
  - The hook now writes the register (it marks what it handed over). Before, it only read. With no answer waiting it
    takes no lock and creates nothing, as before.
  - The old line `answered by the user and waiting for an agent: D-2, D-4` and its long instruction are gone.
  - The blocking instruction now follows the blocking line directly (before, both lines came first, then both
    instructions).
  - An entry whose Status is `waiting-for-agent` but has no unprocessed answer (an `answer` cut short by a crash
    between its two writes) is no longer named by the hook. The `summary` line still counts it.
  - A broken answers log: the blocking line still shows; the answers are left out, with one stderr line naming the log.
- Texts follow: the `SKILL.md` section as the task listed, the usage, module and hook header comments.

## Files changed (all LF, no BOM, as before)

`<orch>\lib\decision-register.mjs`, `scripts\register.mjs`, `hooks\decision-reminder.mjs`,
`orchestration.config.json` (2 lines in `register`), `SKILL.md` (that section only, lines 84-176 now),
`tests\lib\decision-register.test.mjs`, `tests\scripts\register.test.mjs`, `tests\hooks\decision-reminder.test.mjs`.
No other file. No machine change. Scratch folders, logs and scripts deleted. Shared files needing text: none.

## Settings added

`register.hookLockWaitSeconds`: 2, with `_whyHookLockWait`: a prompt must not hang 10 s on a busy register; a lock
still held leaves the answers for the watch or the next prompt.

## Checks

- Tests: 176 before, 192 after (lib 44 to 51, script 20 to 24, hook 11 to 16). Each new behaviour was seen failing
  first. Whole suite in `<orch>` after my last change, 17:25: 192 of 192. One full run before it (17:23) had one
  failure outside my files (see Issues); that file alone passed 30 of 30 twice.
- Invariant on a copy of the real `decisions\` (scratch repo, `--root`, hook with `cwd` there): `handover` printed
  nothing; a pane answer (D-22) and a `--handed-over` answer (D-23); the first hook run handed over D-22 only, with
  its two lines, and named D-23 as handed earlier; `handover` then printed nothing; the second hook run named both,
  no words; after a follow-up of D-22, no line about it. **0 differences on 26** (1 log record, 25 open and resolved
  blocks with headers); the resolved file byte-identical.
- Mutation check in a scratch copy, **15 of 15 caught**: the nine the task named, plus: the hook uses the 10 s wait;
  blocks not a blank line apart; the earlier line names an entry with no unprocessed answer (survived the first run;
  test added, then caught); label from the resolved file ignored; busy error not reported; the log read before the
  lock (caught by the 8-process race test, 3 of 3). The list with the catching tests is in the progress file.
- Peak memory, last `run-heavy` line: 284 MB in its processes, free memory at its lowest 3233 MB.

**Not tested:** the watch (next run's); the hook inside a real Claude Code session (run as a child process with the
real input shape); the Decisions pane end to end (it calls `answer` without the flag, which is unchanged).

## Risks and open points

- If the main session forgets `--handed-over` for a chat answer, the hook hands the same words back at the next
  prompt. That is a repeat in the context, not a loss. `SKILL.md` says to use the flag.
- If a session is cut off right after a hand-over, the next prompt names the entry as "handed to you earlier"
  without words, and the instruction says how to read them. Recommendation: keep.

## Learned

- A race test must hold the lock while the processes start. Without that, Node start-up spreads them out and the
  "read before the lock" defect survived 3 of 3 runs.
- I first wrote guessed times in the progress file; corrected at 17:02 from the clock and run evidence.

DECISIONS TAKEN: Lines the code adds end with \n while the words keep their stored breaks (other: convert to the log's CRLF; why: same as summary and add, words exactly as stored) | The "earlier" line needs at least one unprocessed answer and shows the latest hand-over time (other: also name entries with no answer, or the first time; why: no answer means nothing was handed over) | "Handed earlier" is judged from a read taken before this prompt's hand-over (other: re-read after; why: true by construction, races included) | A broken answers log keeps the blocking line and leaves the answers out with one stderr line (other: fall back to the old answered line; why: every register command fails on it anyway) | Context order per the task: each part with its own instruction (before: both lines, then both instructions) | No register folder: handover returns nothing and creates nothing | New exported read unprocessedAnswers for the hook
INITIATIVES: SKILL.md table row of the answers log now names the hand-over time (inside the section) | Tests beyond the list: hook with a broken log, hook never writes another repo's log (D-14), crash-cut answer not named, 8 handovers at once | Six mutants beyond the nine asked | Corrected the guessed times in my progress file
ISSUES FOUND: limit-stop-server.test.mjs "a log that cannot be written: serve exits 4 without listening..." failed once in a full run at 17:23 (the server started); alone 30 of 30 twice and the next full run passed; not my file, most likely load or timing, not checked further | 9 leftover oa-* test folders in %TEMP% (2026-10-25 18:05 to 2026-10-26 15:39, conc, guard and stop tests) predate my run; left alone | The real register was written by another session during my run (open file between 16:40 and 16:59; all three files at 17:15:29); I never wrote it
QUESTIONS: none
