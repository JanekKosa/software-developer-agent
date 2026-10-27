# Run S2 of "the team's state in one folder": the usage reading, the probe's folder, the watch's records

Written by the task lead STATE_FOLDER on 2026-10-27. You start cold; this file holds everything.

## Read first, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `...\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md`, the section "The contract later runs must match" and "What I
   learned" only (lines 33 to 75 and 115 to 121). It is the rule you copy into PowerShell.
4. From `...\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md` (77 KB): only the sections for `usage-probe.ps1`,
   `watch-usage-and-context.ps1` and `limit-scripts.tests.ps1` (Grep the file name to find them). Never whole.
5. Your files by range: `watch-usage-and-context.ps1` is 48 KB and `tests\limit-scripts.tests.ps1` 149 KB.

`...\stage-2\` is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`. Do not read
the guide pages, `SKILL.md`, `references\`, other `P*`/`R*` files or the lead brief.

## What the piece is for

Every file the agent team writes for itself moves into one folder (the user, D-36, 2026-10-27: "move every team file
now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the team's
logs ... so all of the team's state is in one place no cleanup touches"; "create a parent dir for the developer agent,
and then child dirs for each temp file type"; the user accepted the layout below on 11:00, D-39). Run S1 built the
root setting and the Node side. This run moves the usage reading, the usage probe's working folder and the Usage and
context watch's own records.

## Where you work: the staged copy only

`C:\Repos\My projects\software-developer-agent\orchestrate-agents\` is LIVE (every saved file reaches every running
Claude session). Never change it. All work is in the staged copy
`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\` (below: "the copy"), made by S1. Its state at your start: Node
suite 244 of 244, PowerShell suite 105 of 105 (S1, re-run by the lead).

## The layout (fixed; the user accepted it, D-39)

Root `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent`. A child setting is a path relative
to the root, checked by the rule in S1's contract (same reasons, same order, same error texts).

| Kind | Old place | New place | Setting and new value |
| --- | --- | --- | --- |
| usage reading | `%USERPROFILE%\.claude\state\usage-limits.json` | `<root>\usage-reading\usage-limits.json` | `usageLimits.stateFile` = `usage-reading\usage-limits.json` |
| the probe's empty folder | `%TEMP%\claude-usage-probe` | `<root>\usage-probe` | `usageLimits.probeWorkingFolder` = `usage-probe` |
| the watch's records | `%TEMP%\claude-session-watch-<id>.txt` and `<id>.decision.json` (fixed in code today) | `<root>\usage-watch\<id>.txt` and `<root>\usage-watch\<id>.decision.json` | NEW `usageAndContextWatch.recordFolder` = `usage-watch` |

Not yours: `relaunch.logFile` and the run-heavy slot holders (run S3), the Decisions pane (S4), docs (S5).

## Your two points

**Point 1: the usage reading and the probe's folder.**
- A PowerShell copy of S1's rule, as a function in each script that needs it (each script keeps its own copy of the
  settings helpers today; follow that pattern, for example `Get-StatePath $config 'usageLimits.stateFile' $ConfigPath`).
  The errors must read word for word like S1's Node errors, so one table of cases fits both.
- `usage-probe.ps1`: default `-StatePath` and `-WorkingFolder` come from it. A parameter passed still wins.
- `watch-usage-and-context.ps1`: its default `UsageStatePath` too. Check what else in it builds these two paths.
- The probe removes its transcript folder under `~\.claude\projects\` on a Claude Code version without
  `--no-session-persistence` (`Remove-ProbeTranscript`): the folder name is derived from the working folder. Check
  that the derivation gives Claude Code's real name for the new folder, which holds a `.` (`\.claude\`). Claude Code
  turns every character that is not a letter or digit into `-`; find a real folder under
  `C:\Users\user\.claude\projects\` made from a path with a dot or a doubled separator, and pin the derivation to it in
  a test. Read-only there.
- Testable from the caller's side: the probe, run with a scratch root and a stand-in `claude`, writes its reading to
  `<scratch root>\usage-reading\usage-limits.json` and runs the stand-in in `<scratch root>\usage-probe`.

**Point 2: the watch's records.**
- `watch-usage-and-context.ps1`: its running mark (`<id>.txt`, "PID StartTime") and its decision record
  (`<id>.decision.json`) live in `<root>\usage-watch\`, from the new setting. If the script's settings may be passed as
  parameters of the same name (its `_about` says so), add `RecordFolder` the same way.
- Testable from the caller's side: a watch run on fixtures with a scratch root writes and removes its mark there, and
  writes its decision record there.
- Tell in the report who else reads these two files (search the copy, the hooks and the pane; read-only), and whether
  a restarted watch reads an existing `<id>.decision.json` at its start (the cut-over needs to know whether copying an
  old record over matters, and whether copying an old `<id>.txt` would confuse a new watch).

## Tests

- Update the tests that use the old places; add tests for both points and for the rule (a table of the S1 reasons,
  each refused with S1's exact text; the three new places resolve as in the table). The file's header (lines 13 to
  16) says the tests write the watch's files in `%TEMP%`: after your change they write nothing outside their own work
  folder; update the header.
- **No test may read or write the real root or the real old places.** Every config a test gives a script must carry a
  scratch `teamState.folder`, and every child pwsh gets `USERPROFILE`, `TEMP` and `TMP` on scratch, so a script that
  slipped back to an old place writes into scratch and fails a test.
- **Run your red phase (new tests against the old code) in a scratch copy of the copy, never in the copy itself.**
  S1's red phase ran the old code with the new tests and wrote 60 lines into the real
  `C:\Users\user\.claude\state\limit-stop.log` (now registered for the user as D-51). Here the old probe would write
  the real `usage-limits.json`, which the live watch reads. `-ScriptsRoot` points the test file at another scripts
  folder.

## The check against real material, and one question about the real engine

1. Resolve the three settings from the copy's config with the real environment: exactly
   `C:\Users\user\.claude\state\software-developer-agent\usage-reading\usage-limits.json`, `...\usage-probe` and
   `...\usage-watch`. Report "0 differences on 3".
2. Read-only: the real `C:\Users\user\.claude\state\usage-limits.json` parses with the copy's reading code (the
   cut-over copies it as it is). List the real `%TEMP%\claude-session-watch-*` files (names, sizes, times); for each,
   the new name it would get. Report "0 refused of N".
3. Before and after each full suite run: `C:\Users\user\.claude\state\software-developer-agent` does not exist;
   `C:\Users\user\.claude\state\` keeps its files (the live watch rewrites `usage-limits.json` about every 15 minutes:
   when it changed, show from its content and time that it is a live reading, not a test's); no new
   `%TEMP%\claude-session-watch-*` file named after a test's session id.
4. **The probe under `~\.claude`.** The probe's folder moves from `%TEMP%` to under `C:\Users\user\.claude\`. Claude
   Code walks up from its working folder for `CLAUDE.md` files, so it may now also load
   `C:\Users\user\.claude\CLAUDE.md` a second time (it is the user's global file, loaded anyway), making each probe call
   bigger. Find out, cheapest first: a way with no model call (spend at most 6 tool calls looking); else at most TWO
   real calls with exactly the probe's arguments (`usage-probe.ps1`'s `Get-ProbeArguments`, model and effort from the
   config, `--no-session-persistence`), one in a fresh scratch folder under `%TEMP%` and one in a fresh scratch folder
   `C:\Users\user\.claude\state\sda-probe-check-<8 hex>\` (never the root itself), and compare the input tokens the
   two replies report (cache reads and writes included). Delete both folders after. Each call is one tiny Haiku call,
   the same as the live watch makes about every 15 minutes. Report the two numbers, or how you knew without a call.

## The mutation check (right after point 2, before your warning)

In a scratch copy of the copy's `scripts\` (never in the copy), break one rule at a time and run the cases that
should catch it with `-ScriptsRoot <scratch scripts> -Only '<wildcard>'`; delete the scratch copy at the end. At
least: four of the child-path refusals, the root not checked as absolute, the probe's reading back in the old place,
the probe's folder ignoring the root, the watch's mark and its record each back in `%TEMP%`, a passed `-StatePath`
no longer winning. Report "N of N caught" and name any survivor and what you added to catch it.

## Rules for the run

- Every heavy command (both suites, every mutation run) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  (the LIVE run-heavy), redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S2_LOGS\`.
- At the end, both suites in the copy: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` (105 + yours, all pass;
  4 to 9 minutes) and `node --test` from a working folder spelled `C:\` (244 of 244; you change no Node file, so a
  change in the count is a finding).
- Another worker (run S5, documentation only) runs beside you. In the copy it changes `SKILL.md` and files under
  `references\`; at the repo root `agent-team-files.html` and `README.md`. It runs no heavy command. Run-heavy's one
  slot may still be taken by other sessions' jobs; expect waits.
- Read the clock (`Get-Date`) for every time you write. Keep your progress file after every point:
  `...\stage-2\STATE_FOLDER_S2_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. If you near it, close: progress file, report,
  what is left.
- Every saved file keeps its encoding and line endings. Git read-only, with
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`.
  Never commit.

## Files

- Yours, in the copy: `orchestration.config.json` (only `usageLimits.stateFile`, `usageLimits.probeWorkingFolder`,
  the new `usageAndContextWatch.recordFolder`, and their `_why` texts in plain words), `scripts\usage-probe.ps1`,
  `scripts\watch-usage-and-context.ps1`, `tests\limit-scripts.tests.ps1`; your progress, report and log files.
- Not yours: anything in the LIVE `orchestrate-agents\`; in the copy, every other script, `lib\`, `hooks\`, the Node
  tests, `SKILL.md`, `references\`; `decisions\*`; the vendored `skills\`; the pane repo
  `C:\Repos\My projects\claude-code-extensions\`; `~\.claude\settings.json`, any `CLAUDE.md`,
  anything under `~\.copilot`. The real `C:\Users\user\.claude\state\` and `%TEMP%` team files: read-only.

## How to verify (counts to expect)

- End: PowerShell 105 + new, all pass; Node 244 of 244; both in the copy.
- Real material: 0 differences on 3; the real reading parses; 0 refused of N watch files; the real root absent before
  and after every suite run; the probe question answered with numbers or a reason.
- Mutation: N of N caught.
- The live `orchestrate-agents\` unchanged by you (hash list `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt`; its
  `SKILL.md` differs already, from the main session at 11:08, not yours).

## Report

`...\stage-2\STATE_FOLDER_S2_REPORT_CLAUDE.md`: what you built, the PowerShell function's name and signature, the
config entries as written, who reads the watch's records and what a restarted watch does with an old one, the probe
answer, the counts, what you did not test and why. It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

`relaunch.logFile`, run-heavy, the cut-over script (S3); the pane (S4); docs (S5). D-37: not yours.
