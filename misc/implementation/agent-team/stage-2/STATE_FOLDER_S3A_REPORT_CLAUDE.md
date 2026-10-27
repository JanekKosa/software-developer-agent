# S3a report: the relaunch log and the slot holders under the team's folder, '%' refused, the mutation check

Written 2026-10-27 by the S3a worker. Outcome: **done**. Both points are built in the staged copy, the doc fix is
made, and the mutation check ran in full: 21 of 21 caught. Both suites pass in the copy after my last change:
PowerShell 122 of 122 (114 + 8), Node 246 of 246 (244 + 2). Nothing is committed.

## What changed

- **The relaunch log moved.** `start-session-in-vscode.ps1` now logs to `<root>\logs\relaunch.log`. Example: with
  the shipped settings and the real profile, that is
  `C:\Users\user\.claude\state\software-developer-agent\logs\relaunch.log` (it was `~\.claude\state\relaunch.log`).
  A passed `-LogPath` still wins, and then the setting is not read. A broken setting gives one line,
  `START NOT RUN | no log to write: <S1's error text>`, exit 1, and nothing is written.
- **The slot holder files moved.** `run-heavy.ps1` writes `<root>\heavy-commands\slot-<n>.txt` (it was
  `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt`). The named lock keeps its name `xpp-agent-heavy-command-slot-<n>`,
  so an old and a new run-heavy still take turns. New parameter `-HolderFolder` (a full path, used as given) wins
  over the setting. The folder is made in the settings step, before any slot is taken. A broken setting, or a folder
  that cannot be made, gives `HEAVY COMMAND NOT RUN | <message>`, exit 1, and the command never runs.
- **`%` is refused in a child setting.** The reason text is now `has one of * ? " < > | %`, at the same place in
  the order. Example: `relaunch.logFile` = `%TEMP%\relaunch.log` used to make a folder literally named `%TEMP%`
  under the root; now it stops with
  `... must be a path under 'teamState.folder' but has one of * ? " < > | %: "%TEMP%\\relaunch.log"`. Changed in
  `lib\config.mjs` and in all four PowerShell copies (`usage-probe.ps1`, `watch-usage-and-context.ps1` one line
  each, and my two scripts). Only `teamState.folder` may name a variable.
- `start-session-in-vscode.ps1` and `run-heavy.ps1` now carry S2's three functions (`Get-RequiredSetting`,
  `Get-StatePathFault`, `Get-StatePath`), word for word the same as the other two copies. `Expand-ConfigPath` is
  gone from the start script; its only use was the log path.
- `schedule-relaunch.ps1` is unchanged: it neither builds nor passes the log path.
- **The page** `agent-team-files.html`: line 877 now names the hand-over file
  (`2026-10-27_0935_HANDOVER_CLAUDE.md`), and line 976 says the folder "holds one hand-over so far, written on 27
  October 2026 at 09:35". Undoing my two changes gives back the original file byte for byte; LF kept; tags balanced.

**Files changed** (copy = `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`): `orchestration.config.json`,
`scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`, one line each in `scripts\usage-probe.ps1` and
`scripts\watch-usage-and-context.ps1`, `lib\config.mjs` (one line), `tests\lib\state-path.test.mjs`,
`tests\limit-scripts.tests.ps1`; repo-root `agent-team-files.html` (two lines). All keep LF and no BOM.
Outside the diff: logs in `...\stage-2\STATE_FOLDER_S3A_LOGS\`; my scratch scripts (`s3a-*.ps1`, `real-check.ps1`,
`enc.ps1`) are left in the session scratchpad so the mutation check can be rerun; the scratch copies are deleted.

## Config entries as written (copy)

- `relaunch.logFile`: `"logs\\relaunch.log"`. `_whyLogFile`: "Where start-session-in-vscode.ps1 logs each step with
  the time (plan 8.4), as a path under teamState.folder, beside the limit-stop server's log."
- New `runHeavy.holderFolder`: `"heavy-commands"`. `_whyHolderFolder`: "Folder under teamState.folder where
  run-heavy.ps1 keeps one small file per slot it holds (slot-1.txt, ...: the process, since when, the folder and the
  command), so a heavy command that has to wait can say what it waits for. The slot itself is a named lock,
  xpp-agent-heavy-command-slot-1, ..., whose name stays as it was, so an older run-heavy still takes turns with this
  one." The `runHeavy._about` text is unchanged and still true: the new parameter has the setting's name.

## How run-heavy's tests avoid the real slot

- The unit case dot-sources run-heavy: no lock is touched.
- The end-to-end holder cases and the broken-setting cases run with `-WaitMinutes 0`. Then the wait loop never
  starts, so no named lock is even created. The run prints `HEAVY COMMAND NOT RUN` with each slot's holder line,
  read from the holder folder. The case puts a holder file at `<scratch root>\heavy-commands\slot-1.txt` (or in a
  passed `-HolderFolder`) and checks that the line quotes it. Code that let a broken setting through would also
  stop at once (exit 124), not take a slot.
- No new real-lock use was added. The one existing real run (2 slots, so it takes slot 2 while the live run-heavy
  holds slot 1) now uses its own scratch root, and its command copies the holder file while it runs. That proves
  where the file is written.

## Checks

- **Red**, in a scratch copy of the copy (new tests and settings, old code): PowerShell 11 of my cases failed, each
  because a place had moved, a function was missing, or `%` was not refused. Node: 3 of 10 failed. The cases that
  pin old behaviour passed (a passed `-LogPath` wins, the old start and heavy cases).
- **Green** on my cases in the copy: 25 of 25; Node rule file 10 of 10 (before the two order cases were added).
- **Mutation check: 21 of 21 caught**, each in a scratch copy, each on the cases meant to catch it, with a baseline
  run that fails nothing. S2's list: four child-path refusals (in `usage-probe.ps1` and the watch), the root not
  checked as absolute, the probe's reading back in the old place, the probe's folder ignoring the root, the watch's
  mark back in `%TEMP%`, the watch's record back in `%TEMP%`, a passed `-StatePath` no longer winning. Mine: the
  relaunch log ignoring the root, a passed `-LogPath` no longer winning, the holder back in `%TEMP%`, the holder
  ignoring the root, a passed `-HolderFolder` no longer winning, `%` let through in Node, `%` let through in the
  watch. Extra: run-heavy not making the folder; the `%` check moved after the dot rule in one PowerShell copy, in
  Node, and in all four PowerShell copies alike.
- **A survivor I closed:** the `%` check moved after the dot rule in all four PowerShell copies was caught by
  nothing in the PowerShell suite. The table had no value with both a `%` and an empty or dot part, and the text
  check only compares copies with each other. I added two table cases (`a%\\b` and `%\..`), so the table is now 53
  cases (S2's 50, `%TEMP%\x` now refused, `a%b`, and these two). Now that mutant is caught.
- **Real material, nothing live touched:** the two settings resolve with the real environment to exactly the two
  expected paths: 0 differences on 2 (6 answers: my two scripts and Node). The four PowerShell copies of the three
  functions: 4 copies, 0 differences (also a suite case now).
- **Full suites** (13:44-13:51, through the live run-heavy, logs `final-ps.log` and `final-node.log`): PowerShell
  122 passed, 0 failed (4.5 minutes); `node --test` from `C:\...` in the copy: 246 of 246.
- **Before, between and after the suites** (`real-before/between/after.log`): the real root does not exist;
  `relaunch.log` (1782 bytes, 09:36:11) and `limit-stop.log` are unchanged; `usage-limits.json` was rewritten at
  13:42:03 and 13:48:11, most likely by the live watch (it does so every few minutes; content not checked); `%TEMP%`
  held only the live run-heavy's own holder file for my command, and no test folder was left.
- **The live `orchestrate-agents\` does NOT match the base list:** 6 differences at 13:44, 7 at 13:48
  (`lib\decision-register.mjs`, `scripts\register.mjs`, three register tests, a new
  `tests\lib\decision-register-points.test.mjs`, and `SKILL.md`, which changed while my suite ran). At my start
  (12:58) it was 0 of 45. None of these is a file I edited; all my edits are in the copy and the repo-root page.
  Someone else is changing the live folder now.

**Not tested:** a real relaunch (the start script runs only with `-DryRun` in tests: a real one opens a VS Code
chat and presses Enter), and run-heavy's holder line next to a slot held by an old run-heavy (that shows "held,
holder unknown", see below). The live scripts are untouched, so nothing here runs live until the switch-over.

## Risky or undecided points

- **During the switch-over the two run-heavys cannot read each other's holder files.** They still take turns,
  because the lock name is the same. But a new run-heavy that waits on a slot an old one holds prints
  `slot 1: held, holder unknown`, and an old one waiting on a new one does the same. Example: S4's run in the old
  run-heavy holds slot 1, and a new run-heavy waits; it cannot say whose command it waits for. It goes away once
  every session runs the new run-heavy. I recommend leaving it as is.
- **The second "does not exist yet" place was worded differently.** The literal phrase occurs once (line 976). The
  other place saying the same is line 877, "Not made yet." I took that one as the second place.

## What I learned

- In PowerShell, `@(@(a, b, c))` is one list of three, and the result of an `if` expression unrolls a one-item
  wrapper again. In a list, `,` binds before `+`, so `@(x, y, y + "z")` is five items. That last trap made two of
  my mutants silently do something else; a guard now marks a mutant whose file comes out unchanged as invalid.
- `-WaitMinutes 0` is a ready-made way to run run-heavy end to end without touching the machine-wide lock.

DECISIONS TAKEN: line 877 "Not made yet." taken as the second "does not exist yet" place (other choice: change only the one literal match), because both make the same false claim about misc\handovers\; run-heavy makes its holder folder in the settings step with [IO.Directory]::CreateDirectory (other choice: New-Item at the write), because New-Item's error does not stop the script and the command would run with no holder file; '%' added to the table's per-character cases as well as refusing %TEMP%\x (table 51, then 53 with the two order cases); end-to-end holder cases use -WaitMinutes 0 instead of a new test seam for the lock names, because it takes no lock and needs no new code.
INITIATIVES: a suite case that the four PowerShell copies of the rule's three functions are the same text; two table cases pinning the place of '%' in the order (a%\\b, %\..), added after the mutation check showed a survivor; the existing real-run heavy case now uses its own root and checks the holder file while the command runs; a comment on run-heavy's lock-name prefix; extra mutants M18 to M21.
ISSUES FOUND: the live orchestrate-agents\ differs from the base list in 7 files (decision-register lib, register.mjs, register tests, SKILL.md), changed after 12:58 by someone other than me, so "live matches base" no longer holds; during the switch-over an old and a new run-heavy show "held, holder unknown" for each other's slots (holder files in two places, same lock), harmless and gone after the switch-over; my own mutation script had two PowerShell list traps (fixed; the first full run's M19 and M20 were not what they said and were rerun).
QUESTIONS: none
