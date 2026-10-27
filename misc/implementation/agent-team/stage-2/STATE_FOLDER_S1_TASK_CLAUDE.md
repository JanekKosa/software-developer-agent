# Run S1 of "the team's state in one folder": the staged copy, the root setting, the Node side

Written by the task lead STATE_FOLDER on 2026-10-27 at 10:56. You start cold; this file holds everything.

## Read first, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the repo's rules).
2. This file, whole.
3. From `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md`
   (77 KB, a searcher's quotes): only the sections for YOUR files (Grep the file name in it to find them) and the
   NAMES list (from about line 755). Never read it whole.
4. Your code files as you need them, by range when large (`hooks\context-guard.mjs` 24 KB, `lib\limit-stop.mjs`
   16 KB, `scripts\limit-stop-server.mjs` 30 KB, `tests\hooks\context-guard.test.mjs` 55 KB).

Do not read: the guide pages, `SKILL.md`, `references\`, other `STATE_FOLDER_*` or `P*`/`R*` files, the lead brief.

## What the piece is for

Every file the agent team writes for itself moves into one folder. The user's words (D-36, 2026-10-27): "move every
team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside
the team's logs ... so all of the team's state is in one place no cleanup touches". Comment: "yes but create a parent
dir for the developer agent, and then child dirs for each temp file type". Earlier: "well i want all temp files
related to this agent in the same place". This run builds the setting and the Node side.

## The layout (fixed by the lead; build exactly this)

Root: a NEW setting `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent` (in the JSON:
`"%USERPROFILE%\\.claude\\state\\software-developer-agent"`). `%NAME%` is expanded as `requirePathSetting` in
`lib\config.mjs` does today; after expansion the root must be an absolute path (drive + `\`), else an error naming
`teamState.folder`.

Every child setting is a path RELATIVE to the root: one or more plain names joined by `\`. Refused, with an error that
names the setting: empty, not a string, a drive or `:`, a leading or trailing `\` or `/`, a `/` anywhere, an empty part
(`a\\b`), a `.` or `..` part, any of `* ? " < > |`. So a child can never point outside the root.

| Kind | Old place | New place | Setting and its new value | Whose |
| --- | --- | --- | --- | --- |
| switch-on marks | `%TEMP%\claude-agent-team-on\<session id>` | `<root>\team-on\<session id>` | `agentTeam.onFolder` = `team-on` | S1 (you) |
| size guard marks + locks | `%TEMP%\claude-context-guard\<agent id>.json`, `.lock` | `<root>\context-guard\` | `contextGuard.markerFolder` = `context-guard` | S1 (you) |
| limit-stop log | `~\.claude\state\limit-stop.log` | `<root>\logs\limit-stop.log` | `limitStop.logFile` = `logs\limit-stop.log` | S1 (you) |
| usage reading | `~\.claude\state\usage-limits.json` | `<root>\usage-reading\usage-limits.json` | `usageLimits.stateFile` | S2, not you |
| the probe's empty folder | `%TEMP%\claude-usage-probe\` | `<root>\usage-probe\` | `usageLimits.probeWorkingFolder` | S2, not you |
| watch records | `%TEMP%\claude-session-watch-<id>.txt`, `.decision.json` | `<root>\usage-watch\` | new `usageAndContextWatch.recordFolder` | S2, not you |
| relaunch log | `~\.claude\state\relaunch.log` | `<root>\logs\relaunch.log` | `relaunch.logFile` | S3, not you |
| slot holders | `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt` | `<root>\heavy-commands\` | new `runHeavy.holderFolder` | S3, not you |

Change only the three settings marked "S1 (you)" and add `teamState`. Leave the others exactly as they are: the
PowerShell scripts that read them are changed in later runs, and both suites must pass at the end of your run.
Exception: if a PowerShell script itself reads `limitStop.logFile`, `agentTeam.onFolder` or
`contextGuard.markerFolder`, make the smallest change there so it reads the new place, and say so in the report.

Key names stay (the Decisions pane already reads `agentTeam.onFolder`); their meaning changes from "one folder
under %TEMP%" or "a full path" to "a path under the root". Rewrite each touched `_why` text in plain words; the
`teamState` entry gets a `_whyFolder` that quotes the user (the D-36 words above) and says that changing this one line
moves everything.

## The staged copy: you never touch the live folder

`C:\Repos\My projects\software-developer-agent\orchestrate-agents\` is LIVE: every saved file reaches every running
Claude session at its next tool call. Do not change any file in it. All your work happens in a copy:

- Step 0a. Check the copy does not exist yet: `...\stage-2\STATE_FOLDER_STAGING\`. If it exists, stop and ask.
- Step 0b. Copy the live `orchestrate-agents\` (it holds no links and no node_modules; check `cmd /c "dir /AL /S /B <path>"`
  shows nothing first) to `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`.
- Step 0c. Write the base list
  `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt`: one line per live file, `<relative path>\t<SHA256>`, taken from
  the LIVE folder at the same moment, plus a first line with the time. The cut-over later refuses if the live folder
  differs from this list.
- Step 0d. Run the Node suite in the copy: expect 229 of 229 (the live baseline at 10:27). If it differs, stop and
  ask: the copy must behave as the live folder before you change it.
- Step 0e. Record that `C:\Users\user\.claude\state\software-developer-agent` does not exist (it must not exist at
  any time during this task; it is created only by the main session's cut-over later).

## Your two points

**Point 1: the root and its resolver, and the switch-on marks.**
- `lib\config.mjs`: one function that gives the absolute path of a child setting under the root (for example
  `requireStatePath(config, keyPath)`), with the rules above. Every error names the setting and says what is wrong.
- `lib\agent-team.mjs` and `scripts\team-on.mjs` use it: the mark is `<root>\team-on\<session id>`. Keep the session-id
  check. Update the file's header comment.
- Testable from the caller's side: `team-on.mjs`, run with the root pointing at a scratch folder, writes
  `<scratch root>\team-on\<id>` and prints `AGENT TEAM ON | session <id> | <that path>`; `isTeamOn` finds it; each
  refused child value and a root that is not absolute after expansion give an error naming the setting.

**Point 2: the size guard's marks and the limit-stop log.**
- `hooks\context-guard.mjs`: its marker folder is `<root>\context-guard\` (marks `<agent id>.json` and locks
  `<agent id>.lock`, unchanged names).
- `lib\limit-stop.mjs`, `scripts\limit-stop-server.mjs` and the guard: the log is `<root>\logs\limit-stop.log`, for
  writing (the server, the guard's failure lines) and for reading (the main session's hook reads its tail).
- Testable from the caller's side: the guard run as a hook with a scratch root writes its mark under
  `<scratch root>\context-guard\`; a server started with a scratch root logs to `<scratch root>\logs\limit-stop.log`
  and the main-session hook finds a failure line there.

## Tests

- Every existing test that touched the old places now uses the scratch root, and new tests cover the two points and
  the refusal rules. **No test may read or write the real root** or the real old places: a test that runs a hook or a
  script as a child process must point the root at scratch (for example through the environment variable the root
  names, `USERPROFILE`, as the tests already do for today's `%USERPROFILE%` log path; or a better seam you choose and
  report as a decision). Tests use scratch folders (`tests\helpers\scratch.mjs`) and never this repo's real
  `decisions\` files.
- Run the Node tests from a working folder spelled `C:\` (not `c:\`): one test fails on a lowercase drive letter.

## The invariant (real material, nothing live touched)

1. Resolve the three settings you changed, from the staged config, with the real environment: they must give
   exactly `C:\Users\user\.claude\state\software-developer-agent\team-on`, `...\context-guard` and
   `...\logs\limit-stop.log`. Report "0 differences on 3".
2. List, read-only, the real `%TEMP%\claude-agent-team-on\*` and `%TEMP%\claude-context-guard\*.json` names (the files
   the cut-over will copy). For each, the staged code must accept the id and give the path under the new root.
   Report "0 refused of N" for each folder, with N.
3. Before and after each full suite run: `C:\Users\user\.claude\state\software-developer-agent` does not exist, and
   `C:\Users\user\.claude\state\` holds only the files it held before (names, sizes, write times; live sessions may
   update `usage-limits.json` and the logs there, so name any change and its writer). Report it.

## The mutation check (right after point 2, before your warning)

In a SCRATCH COPY of the staged folder (never in the staged folder itself, so a cut-off cannot leave a mutant there),
break one rule at a time and run the tests that should catch it; restore between mutants; delete the scratch copy at
the end. At least: each refusal rule of the child path (6 or more mutants), the root not checked as absolute, an
unset `%NAME%` not refused, `agent-team.mjs` back on `os.tmpdir()`, the guard back on `os.tmpdir()`, the log path
ignoring the root. Report "N of N caught", and name any survivor with what you added to catch it.

## Rules for the run

- Every heavy command (the test suites, mutation runs) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  (the LIVE run-heavy is the right one to use), with any redirection to a log file inside the command. Put logs in
  your scratchpad or `...\stage-2\STATE_FOLDER_S1_LOGS\`.
- At the end, BOTH suites in the staged copy: `node --test` (229 + your new tests, all pass) and
  `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` (105 of 105; it takes 4 to 9 minutes; run it once, at the
  end). If a PowerShell test fails because of a key you changed, fix it (smallest change) and say so.
- Read the clock (`Get-Date`) for every time you write.
- Keep your progress file after every point: `...\stage-2\STATE_FOLDER_S1_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. The mutation check starts right after point
  2. If you near the warning, close: progress file, report, and say what is left.
- Every saved file keeps its encoding and line endings (check before you write; Edit keeps them).
- Git: read-only commands only, with
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`.
  Never commit.

## Files

- Yours: the staged copy's `orchestration.config.json` (only `teamState` and the three settings),
  `lib\config.mjs`, `lib\agent-team.mjs`, `scripts\team-on.mjs`, `hooks\context-guard.mjs`, `lib\limit-stop.mjs`,
  `scripts\limit-stop-server.mjs`, the Node tests and `tests\helpers\` in the staged copy; the base list; your
  progress, report and log files.
- Not yours: anything in the LIVE `orchestrate-agents\`; the staged copy's other PowerShell scripts (except the
  smallest fix named above), `SKILL.md`, `references\`; `decisions\*`; the vendored `skills\`; the Decisions pane
  (`C:\Repos\My projects\claude-code-extensions\`); `~\.claude\settings.json`, any `CLAUDE.md`, anything under
  `~\.copilot`. No other worker runs now.

## How to verify (counts to expect)

- Step 0d: Node 229 of 229 in the staged copy.
- End: Node 229 + new, all pass; PowerShell 105 of 105 (or 105 + any you add), in the staged copy.
- Invariant: 0 differences on 3; 0 refused of N (two folders); the real root absent before and after.
- Mutation: N of N caught.
- `git status` of the repo: changes only under `misc\implementation\agent-team\stage-2\` (the staged copy and your
  files). The live `orchestrate-agents\` matches the base list (hash it at the end).

## Report

`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md`:
what you built, the exact contract the later runs must match (the resolver's name and signature, its error texts,
how a test points the root at scratch, the config entries as written), the counts, what you did not test and why. It
ends with the four-line block:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now (later runs or waiting for the user)

- The PowerShell side (S2, S3), the Decisions pane (S4), the guide pages and `SKILL.md` (S5), the cut-over script
  (S3). Do not start any of them.
- D-37 (leftovers of earlier headless runs): not yours, ignore.
