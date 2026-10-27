# Run S6 of "the team's state in one folder": re-base the staged copy on the live folder, and test the merged whole

Written by the task lead STATE_FOLDER on 2026-10-27 at 13:58. You start cold; this file holds everything.

## Read first, and no more

`...\stage-2\` below is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `...\stage-2\STATE_FOLDER_S3B_REPORT_CLAUDE.md` lines 8 to 45 (the switch-over script: parameters, output lines,
   refusals) and 67 to 80 (its real dry run).
4. `...\stage-2\STATE_FOLDER_S5_REPORT_CLAUDE.md` lines 45 to 53 (its edit of `SKILL.md`, before and after).
5. `...\stage-2\STATE_FOLDER_S1_PROGRESS_CLAUDE.md` and `STATE_FOLDER_S1_REPORT_CLAUDE.md`: only what they say about
   `tests\hooks\decision-reminder.test.mjs` (Grep the name).
6. For the pane's checks: the `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`,
   only its part on running a mod's tests and validate with Claude's VS Code `claude.exe`; and the pane's README
   (`C:\Repos\My projects\claude-code-extensions\decisions-pane\README.md`) on its type-check.

Do not read the guide pages whole (Grep them), the sweep file, other `P*`/`R*` files or the lead brief.

## What the piece is for

The agent team moves every file it writes for itself into one folder (the user, D-36; layout accepted, D-39). The new
code was built in a staged copy, `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\` ("the copy"), because the live
`C:\Repos\My projects\software-developer-agent\orchestrate-agents\` reaches every running Claude session at once. A
switch-over script copies the copy's changed files into the live folder later, by a three-way rule against a base
list `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt` (first line a time, then `<relative path>\t<SHA256>`, `#`
comment lines). Per file: B = base hash, L = live hash, S = copy hash. S = B: the live file is left alone. S != B and
L = B: the copy's file goes live. Both changed and different: conflict, the switch-over refuses.

Since the copy was made, others changed the live folder: the main session edited `SKILL.md` (11:08 and 13:46), and
another lead's run (finished 13:42) changed the register's code and tests. The switch-over would leave the live-only
changes alone, but nobody has tested our changes together with theirs, and two files conflict. This run makes the copy
equal to "what the live folder will be after the switch-over", and tests that whole.

The state at 13:53 (B/L/S as above):
- live-only changes (S = B, L != B): `lib\decision-register.mjs`, `scripts\register.mjs`,
  `tests\lib\decision-register.test.mjs`, `tests\scripts\register.test.mjs`, and the new live file
  `tests\lib\decision-register-points.test.mjs` (no base line, not in the copy);
- conflicts: `SKILL.md`, `tests\hooks\decision-reminder.test.mjs`;
- 21 rows of our own changes (S != B, L = B), which stay as they are.

## Your two points

**Point 1: the re-base.**
- Take the three-way listing again first (the live folder may have changed since 13:53), and write it into your
  progress file with the time.
- Each live-only change: copy the live file's bytes into the copy (create it when new), and set its base line to the
  live hash (add a line for a new file). Afterwards S = B = L for it.
- Each conflict: merge by hand. Start from the live text and re-apply only our side's change. Our side of `SKILL.md`
  is S5's edit (its report, lines 45 to 53). Our side of `tests\hooks\decision-reminder.test.mjs` is S1's (it moved
  the switch-on marks the test writes from `%TEMP%` to a scratch root). Prove you found exactly our side: undo it in
  the copy's current text, and the result must hash to the file's base line ("base reconstructed: hash equal"). Then
  set the base line to the live hash. Afterwards L = B and S = merged.
- Add one comment line `# re-based on live <time>: <n> files` at the end of the base list. Keep its line endings.
- Testable: the three-way listing now shows only our own changes: 0 live-only, 0 conflicts. The two merged files hold
  both sides (name one line of each side in each file).

**Point 2: the merged check.** All after point 1, all through run-heavy:
- In the copy: `node --test` from a working folder spelled `C:\` (expected: the live suite's count plus our 17 new
  tests; count the live suite's tests read-only if you need the number, but do not run anything in the live folder
  that writes), and `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` (122 of 122).
- The switch-over script's tests: `pwsh -NoProfile -File '...\stage-2\STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1'`
  (26 of 26).
- The pane (in place, `C:\Repos\My projects\claude-code-extensions`): its tests (136 of 136), `claude plugin validate
  decisions-pane`, and its type-check, as the skill and README say. Read-only: never edit the pane, never run
  `/reload-plugins`, never install or update a plugin.
- A real DRY RUN of the switch-over (no switch: it writes nothing):
  `pwsh -NoProfile -File '...\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1'`, with a listing-and-hash snapshot of the real
  old places (`%TEMP%` team files, `C:\Users\user\.claude\state\`), the live folder, the copy and the base list before
  and after: "0 differences on N". Expected: 0 conflicts; `relaunch.log` now planned; the code lines are exactly our
  own changes; the only refusal is the main session's running Usage and context watch. Report the plan's counts.
- The guide pages' settings tables against the final config: in `C:\Repos\My projects\software-developer-agent\agent-team-files.html`
  and the copy's `references\agent-team-guide.html`, every value shown for `teamState.folder` and the eight child
  settings (`agentTeam.onFolder`, `contextGuard.markerFolder`, `limitStop.logFile`, `relaunch.logFile`,
  `usageLimits.stateFile`, `usageLimits.probeWorkingFolder`, `usageAndContextWatch.recordFolder`,
  `runHeavy.holderFolder`) equals the copy's config. Report "0 differences on N"; fix nothing yourself, list any
  difference.

## Rules for the run

- Never write to the LIVE `orchestrate-agents\`, the pane repo, the real `%TEMP%` team files or
  `C:\Users\user\.claude\state\`. In the copy and the base list, change only what point 1 names. Never run the
  switch-over script with `-Apply` or `-RemoveOld`, nor the trim script.
- Heavy commands (every suite, the pane's tests and type-check, the dry run) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S6_LOGS\`.
- If the live folder changes again while you run, note the file and time, and re-base it the same way at the end if
  it is a live-only change; if it makes a new conflict, merge it the same way and say so.
- No other worker of this task runs now. Other sessions may hold run-heavy's slot; expect waits.
- Read the clock for every time you write. Progress file after every point: `...\stage-2\STATE_FOLDER_S6_PROGRESS_CLAUDE.md`.
- Plan for about 60 tool calls; you are warned at 320 thousand tokens.
- Every saved file keeps its encoding and line endings. Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Files

- Yours: in the copy, the five live-only files and the two conflict files named above (and any file that changes live
  during your run, by the same rule); the base list; your progress, report and log files.
- Not yours: everything else, above all the live folder, the pane repo, `decisions\*`, the switch-over and trim
  scripts and their tests, `~\.claude\settings.json`, any `CLAUDE.md`, anything under `~\.copilot`.

## Report

`...\stage-2\STATE_FOLDER_S6_REPORT_CLAUDE.md`: the three-way listing before and after, how each conflict was merged
(with the reconstruction proof), every count of point 2, the dry run's plan, what you did not check and why. It ends
with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

The switch-over itself (the main session); D-54 (waiting for the user: whether the pane learns more folder
variables); D-37. Do not build them.
