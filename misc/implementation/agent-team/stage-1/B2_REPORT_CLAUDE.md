# Agent team stage 1, builder B second pass: report

Written 2026-10-25 by builder B, second pass (software-developer). It applies the reviewer's four findings on the
first pass. Plan sections 1, 2, 3, 8 and 11 were read. Details and timings are in `B2_PROGRESS_CLAUDE.md` beside this
file.

## Outcome

Done. All four findings held up when I checked them against the code, and all four are fixed. I rejected none. Every
check below ran after the last change. The real relaunch and a real limit stop were not tried, by instruction.

## What is different now

- **A limit stop whose message gives no reset time now waits for the reset on record (F1).** Example: the weekly
  limit stops the session at 08:54. Its message reads "resets Oct 31, 7am", which the watch cannot parse. The
  decision on record says the reset is in three days. Before, the watch woke the session at 09:04 and said "the limit
  reset at 09:05" and "relaunch now", so the relaunch would land in a limit that still holds. Now it waits for the
  recorded reset plus `ResetMarginMinutes` (5). The wake time and the reset used for the decision come from one
  helper, so they cannot disagree again. With no decision on record, nothing changes: it wakes 10 minutes after the
  stop, as before.
- **The two new markers show a date when the moment is not today (F1).** A weekly reset three days ahead now prints
  as `resets 2026-10-28 07:00`, not `resets 07:00`. Same-day times stay `HH:mm`. The four old markers keep their own
  format.
- **The session is told to restart the watch after LIMIT NEAR (F2).** The script header says so. The marker's second
  line now begins: "Start this watch again now (the hand-over on record keeps it quiet; if the limit stops the
  session first, it wakes the session after the reset). Then stop every lead with STOP FOR LIMIT, write the
  hand-over and run ...". The code needed no change for this. A restarted watch with a hand-over on record already
  stayed quiet, and after a limit stop it already ended with SESSION RESET COLD. A new test now pins that scenario.
- **The probe runs at the configured effort (F3).** It reads `usageLimits.probeEffort` and passes `--effort low`
  after `--model haiku`. A missing key is an error that names the key, like the model key.
- **The relaunch opens the chat link only when the project's window is in front (F4).** Otherwise it opens nothing
  and logs the prompt. It shows a notification: "Claude: the limit has reset, but the window of <folder> was not in
  front. Open a new Claude chat there and send: <prompt>". Then it exits 1. The dry run reports the same choice for
  the window that is in front at the time.

## Decisions I made (open to change)

- F4 exits 1 when nothing was opened, like the existing "VS Code not found" exit. Step 4's "not in front" still
  exits 0, because the chat does exist there. Nobody reads the exit code of the scheduled task.
- F4 does not retry the focus. Step 2 already tries to bring the window forward once.
- F1: while the session is stopped, the watch reads the decision record on every loop. Before, it read the record
  only at wake time. The file is small, but a broken record now repeats its warning once a minute until the wake.
- F1: the date rule applies to every time in the two new markers, not only the reset. A stop before midnight and a
  wake after it now print the stop with its date.

## Files

All under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`. Nothing is committed.

- `scripts\watch-session.ps1`: `Get-WakeTime` takes the record, the new `Get-RecordedReset` is shared with
  `Get-StopDecision`, `Format-Clock` takes the current time, plus the header and the LIMIT NEAR instruction line.
- `scripts\usage-probe.ps1`: `Get-ProbeArguments(model, effort, noPersistence)`, reads `probeEffort`, header.
- `scripts\start-session-in-vscode.ps1`: new `Get-ChatStartPlan`, step 3 opens the link only with the window in
  front, header.
- `tests\limit-scripts.tests.ps1`: 8 new cases, 6 changed, and two new fixture helpers (listed in the progress
  file).
- `schedule-relaunch.ps1` is unchanged.

Outside the diff: one real probe call, with its reading written to my scratchpad, not to `~\.claude\state`. It kept no
transcript. The probe's projects folder holds only an empty `memory` folder, created at 08:25 by the first pass's run.
No scheduled task was created. My scratch folder is removed (see Checks).

## Text the shared files need (not mine to edit)

- **xpp-agent `CLAUDE.md`, "Session Watch"** (replaces the first pass's suggested text): use the command
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-session.ps1'`. "Start the watch
  again every time it ends, except after a hand-over that ends the session. `LIMIT NEAR | HAND OVER`: start the
  watch again at once, then stop every lead with STOP FOR LIMIT, write the hand-over and run `schedule-relaunch.ps1`
  with the `-At` the second line gives. A hand-over on record keeps the restarted watch quiet. If the limit stops
  the session before the hand-over is done, the watch wakes the session after the reset with SESSION RESET COLD.
  `SESSION RESET COLD`: do not resume agents. Write the hand-over from disk unless it is written, run
  `schedule-relaunch.ps1 -At now` unless a relaunch is scheduled, then end the session."
- **Builder C, `references\usage-limits.md` step 5**: replace "Do not start the watch again" with "Start the watch
  again at once, before stopping the leads. The hand-over on record keeps it quiet. If the real limit stops the
  session during the hand-over, it wakes the session after the reset with SESSION RESET COLD." Also: after LIMIT
  NEAR, the second line now starts with "Start this watch again now".
- **For the lead (plan gap, 8.4):** step 3 of the plan opens the link whatever window is in front. I changed the
  script, not the plan. The plan's 8.4 step 3 should say "only when the project's window is in front".

## Settings

None added. The existing key `usageLimits.probeEffort` is now read. The config was not changed.

## Checks (after the last change)

- RED first: the new and changed tests ran before the fixes, with 39 passed and 10 failed, each for the missing
  behaviour. The restart scenario test passed from the start, as expected: that behaviour already existed.
- Suite: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` at 09:38, after the last change: 50 passed, 0
  failed, 43 s. The opt-in `-RealTask` case was not run again, because `schedule-relaunch.ps1` did not change.
- Mutation check on the new rules: 17 of 18 mutants caught. Each mutant broke one rule in a copy of the scripts,
  and the matching test group ran against that copy. Each mutant counted as caught only when a case failed and every
  script still loaded. In the first round, W3 survived: a reset on record from before the stop was not rejected.
  That rule changes the stop decision, not the wake time, and no test covered it, in the first pass either. A new
  case now fails against W3 and passes against the real scripts. S4 survives by design: it removes the real run's
  "not in front" branch, and that path cannot run in a test without opening a link or showing a notification.
- Real probe after the probe change, at 09:30: exit 0 in 9.5 s, five-hour 45%, weekly 52%. The file matched the
  printed line. The real `claude` 2.1.286 accepted `--effort low` with `--model haiku`. Its `--help` lists
  `--effort <level>`.
- Parser: 0 errors in all seven `.ps1` files of `scripts\` and `tests\`.
- Files not mine are unchanged by hash: `run-heavy.ps1`, `watch-agent.ps1` and `register.mjs`.

**Not tested:** the real run of the start script (running `code`, focusing a window, opening the link, Enter, the
notification), a scheduled task firing, a real limit stop, and a real weekly stop message. All of these were left out
by instruction or need a real limit. Because the real path of the start script cannot run in a test, the plan's
decision is a function that is tested on its own and through the dry run. The one line in the real path that acts on
it is checked by reading only (mutant S4 below).

## Risks and open points

- **An unreadable message with no decision on record** still wakes the session after `RetryMinutes` (10), as the
  old watch did. If an agent went cold, the line says SESSION RESET COLD and "the limit reset at <stop + 10 min>",
  which is a guess. Example: a weekly stop at 08:54 with no record, and a worker idle since 08:50. At 09:04 the watch
  says the limit reset. If it has not, the woken session cannot act anyway. I left this as it was. Recommendation:
  parse "resets Oct 31, 7am" once a real weekly message has been seen.
- **The notification text can be long.** A Windows balloon shows about 255 characters, and a long hand-over path can
  push the prompt past that. The full prompt is always in `relaunch.log`. I did not check the cut-off, because
  showing a balloon was out of bounds.
- **The reviewer's VS Code routing claim was not re-checked** (a link without a window id goes to the last focused
  window). The fix is safe either way: with the project's window in front, that window is the last focused one.
- **The first pass's report has a garbled line** in its Checks section. The second-pass section there explains it.

## Learned

- A PowerShell function called with one positional argument more than it declares does not fail. The extra value
  lands in `$args`. So a caller passing a new argument to an old function fails silently. The RED run showed this:
  `Get-WakeTime` with five arguments returned the old answer.
