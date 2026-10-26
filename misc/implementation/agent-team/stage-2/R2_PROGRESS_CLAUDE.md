# R2 progress: hand each answer to the main session exactly once

Started 2026-10-26 16:38 (worker). Task: `R2_TASK_CLAUDE.md`.

Correction 17:02: the times I first wrote for the points below (17:00 to 17:27) were guesses, not clock readings.
The times now given are measured: from `Get-Date` (16:38, 16:40, 17:01) or from evidence (run-heavy's wait and run
times, the `answeredAt` stamps the invariant run wrote).

## Files I own

- `<orch>\lib\decision-register.mjs`, `<orch>\scripts\register.mjs`, `<orch>\hooks\decision-reminder.mjs`
- `<orch>\orchestration.config.json` (register section only), `<orch>\SKILL.md` (section "The decision register" only)
- `<orch>\tests\lib\decision-register.test.mjs`, `<orch>\tests\scripts\register.test.mjs`,
  `<orch>\tests\hooks\decision-reminder.test.mjs`

Scratch copy: `C:\Users\user\AppData\Local\Temp\r2-orch` (develop here; copy into `<orch>` in one step at the end).

## Baseline (16:40)

- Real `decisions\` hashes (SHA256, first 16): ANSWERS_LOG DEA69813A4992C3A (219 B), OPEN 1A1A1D5AAF7A8DF0 (382 B),
  RESOLVED 2FAAC46156A976EF (25492 B).
- `<orch>` has no junctions or links (dir /AL found none).

## Plan

1. Lib: `handOverAnswers(location, now, { lockWaitMs })` exported; `answerEntry` takes `handedOver`; a read
   `unprocessedAnswers(location)` for the hook; shared text `handOverText(handed)` + `HANDOVER_INSTRUCTION`.
2. Script: `handover` command (prints `DECISION ANSWERS | ids` + text), `answer --handed-over`.
3. Hook: parts 1 (blocking + instruction), 2 (handed now, short lock wait from `register.hookLockWaitSeconds`),
   3 (handed earlier, from the read taken before the hand-over).
4. Texts: SKILL.md section, usage comment, module comment, hook header, config setting.
5. Invariant on a copy of the real register; mutation check in a second scratch copy.

## Done

- Baseline in scratch, finished about 16:49 (started 16:40, run-heavy waited 7:06 for another repo's job, ran 1:24,
  peak 270 MB): 176 of 176 pass.
- Point 1 (lib), between 16:49 and 16:59: `handOverAnswers`, `handOverText`, `HANDOVER_INSTRUCTION`,
  `unprocessedAnswers`, `answerEntry({handedOver})`, `newRecord(..., handedOverAt)`, `isWaitingForHandOver`,
  `entryLabel`. Red seen (import missing), then lib file 51 of 51 (7 new). Module comment updated.
- Point 1 (script), same window: `handover` command, `--handed-over` flag, `handOverOutput`; usage comment. Red seen
  (unknown option / unknown command), then script file 23 of 23 (3 new).
- Point 2 (hook), same window: parts 1-3 per contract; `ANSWERED_INSTRUCTION` replaced by the "If you are already
  dealing with it..." text (shorter); setting `register.hookLockWaitSeconds` 2 + `_whyHookLockWait`. Red seen (6 of
  15 failing), then hook file 15 of 15 (4 new, 2 rewritten, 1 extended for D-14: another repo's log untouched).
- Texts, same window: SKILL.md section (table row, intro paragraph, command block, handover note, reminder bullet,
  recording bullet), all hunks inside lines 84-166; config 2 lines in `register`. All 8 files LF, no BOM; only these 8
  differ from `<orch>` (git diff --no-index --stat).
- Whole suite in scratch, finished about 17:00: 190 of 190 (run-heavy: waited 0:00, ran 1:29, peak 197 MB).
- Invariant at 16:59 on a copy of the real `decisions\` (scratchpad `invariant.mjs`, repo
  `C:\Users\user\AppData\Local\Temp\r2-inv\repo`): all steps OK, "0 differences on 26" (1 log record, 25 open/resolved
  blocks incl. headers), resolved file byte-identical. New ids D-22 (pane) and D-23 (chat).
- Note: the real OPEN_DECISIONS hash changed between 16:40 (1A1A...) and 16:59 (1B07...): someone added D-21. Not me;
  I never wrote there (all my runs used scratch repos or `--root`).
- Mutation check queued about 17:00 in `C:\Users\user\AppData\Local\Temp\r2-mut` (scratchpad `mutate.mjs`, 14
  mutants), log `C:\Users\user\AppData\Local\Temp\r2-mutation.log`; at 17:01 still waiting for run-heavy's slot.
- SKILL.md wording after the scratch suite run: "The watch runs it; the reminder does the same at the user's next
  message"; one line re-wrapped to 120 columns (the D-14 line below it moved one word). Text only; the suite in
  `<orch>` at the end covers it.

- 17:13 mutation run done (run-heavy: waited 3:16, ran 9:07, peak 367 MB): 13 of 14 caught; M12 (earlier line names
  an entry with no unprocessed answer) survived -> hook test added -> M12 caught (1 of 1).
- 17:15:36 copied the 8 files into `<orch>` in one step (live files matched the lead's before-hashes first; after the
  copy, scratch and live trees identical). 17:17 whole live suite 191 of 191 (waited 2:15, ran 1:34, peak 293 MB).
- Real register written by another session at 17:15:29 (all three files; ANSWERS_LOG 695F..., OPEN 1A1A..., RESOLVED
  0F5C...). Not me.
- 17:21 race test added (8 handovers at once, lock held while they start). Without holding the lock the lock-order
  mutant (read before the lock) survived 3 of 3; with it, caught 3 of 3; clean run passes. Copied the test file live.
- 17:23 whole live suite 191 of 192: `limit-stop-server.test.mjs` "a log that cannot be written..." failed (server
  started). Not my file, no reference to the register. That file alone: 30 of 30 twice (17:24).
- 17:25 whole live suite again: 192 of 192 (ran 1:09, peak 284 MB, free memory lowest 3233 MB).
- 17:25 scratch folders `r2-orch`, `r2-mut`, `r2-inv`, the logs and my scratchpad scripts deleted; checked none left.
  9 `oa-*` folders in %TEMP% predate my run (latest 15:39); left alone.

## Mutation results (scratch copy `r2-mut`, three register test files per mutant)

- M1 handover ignores processedAt: caught by 1 (lib: never hands over a processed record).
- M2 handover does not mark: caught by 6 (hook order, once, busy; lib hands-once).
- M3 handover marks but returns nothing: caught by 10.
- M4 --handed-over ignored: caught by 3 (hook once, hook busy, script handover).
- M5 the hook does not mark: caught by 3 (hook order, once, busy).
- M6 the hook hands over on a busy lock (stale age 0): caught by 1 (hook busy).
- M7 earlier line lists entries handed over in this prompt: caught by 4.
- M8 earlier line lists entries with a record not handed over: caught by 1 (hook busy).
- M9 first line lists an id twice: caught by 1 (script handover).
- M10 the hook waits the register's 10 s: caught by 1 (hook busy, time and "2 s").
- M11 answer blocks not one blank line apart: caught by 4.
- M12 earlier line names an entry with no unprocessed answer: SURVIVED; hook test "an entry waiting for an agent with no
  unprocessed answer..." added; then caught by 1.
- M13 label from the resolved file ignored: caught by 1 (lib processed/resolved/unknown labels).
- M14 the hook's busy error not reported: caught by 1 (hook busy, one stderr line).
- M15 the log read before the lock: caught 3 of 3 by the script race test once it holds the lock while the eight
  processes start (survived 3 of 3 before that change).
- Total 15 of 15.

## Decisions

- Lines I make use `\n`; the words keep their stored breaks (CRLF in a new log). Same as `summary`/`add` output.
- No register folder: `handOverAnswers` returns [] without a lock and creates nothing.
- Hook reads unprocessed answers before handing over (no lock); part 3 is computed from that read, so an entry with any
  record handed in this prompt (or not handed because busy) is never in the "earlier" line.
- Part 3 needs at least one unprocessed answer per entry and shows the latest hand-over time of its answers.
- A broken answers log: the hook keeps the blocking line, leaves out parts 2 and 3, one stderr line naming the log.
