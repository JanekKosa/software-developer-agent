# Run S1 of "the team's state in one folder": report

Worker: software-developer, 2026-10-27, 10:52 to 11:27 (clock read). Progress file:
`STATE_FOLDER_S1_PROGRESS_CLAUDE.md`. Logs and the check scripts (`stage-copy.ps1`, `state-snapshot.ps1`,
`invariant.mjs`, `mutate.mjs`, each re-runnable): `STATE_FOLDER_S1_LOGS\`.

## Outcome

Done, in the staged copy only. The switch-on marks, the size guard's marks and locks, and the limit-stop log now
resolve under one root, `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent`. The live
`orchestrate-agents\` was not changed by me.

Two things the lead must act on:

- **My red test run wrote 60 test lines into the real `C:\Users\user\.claude\state\limit-stop.log`** (11:05 to
  11:06:50). Details and the fix are under "Issues".
- **The live `SKILL.md` changed at 11:08:50, after the base list (10:53:38)**, not by me. The cut-over will refuse
  until the base list and the staged copy take the new text.

## What was built

- `lib\config.mjs`: a new reader `requireStatePath(config, keyPath)`. It returns the root joined with the setting's
  value. Example: root `C:\Users\user\.claude\state\software-developer-agent` and `limitStop.logFile` =
  `logs\limit-stop.log` give `C:\Users\user\.claude\state\software-developer-agent\logs\limit-stop.log`.
- `lib\agent-team.mjs` (and so `scripts\team-on.mjs`): the mark is `<root>\team-on\<session id>`. The session-id check
  is kept. Both header comments now name the new place.
- `hooks\context-guard.mjs`: marks and locks in `<root>\context-guard\` (names unchanged).
- `lib\limit-stop.mjs` and `scripts\limit-stop-server.mjs`: the log is `<root>\logs\limit-stop.log` for every writer
  and reader.
- Behaviour that differs from before: a child value may now have several parts (`a\b`); before, each was one folder
  name. An absolute `limitStop.logFile` (the old shape) is now refused.

## The contract later runs must match

**Signature.** `requireStatePath(config, keyPath)`, exported from `lib\config.mjs`. `keyPath` is a dotted string or an
array of parts, as for `requireSetting`. The root is checked first, then the child.

**Root errors** (the root is read like `requirePathSetting`, so `%NAME%` is filled in from the environment):

- missing: `orchestration.config.json has no setting 'teamState.folder'`
- not text or empty: `orchestration.config.json setting 'teamState.folder' must be a path, not <JSON value>`
- unset variable: `orchestration.config.json setting 'teamState.folder' names %NAME%, which is not set`
- not absolute after filling in (must match `^[A-Za-z]:\\`, so a UNC path is refused too):
  `orchestration.config.json setting 'teamState.folder' must be an absolute path (a drive letter, ':' and '\'), not <JSON value>`

**Child errors:**

- missing: `orchestration.config.json has no setting '<key>'`
- not text: `orchestration.config.json setting '<key>' must be text, a path under 'teamState.folder', not <JSON value>`
- otherwise `orchestration.config.json setting '<key>' must be a path under 'teamState.folder' but <reason>: <JSON value>`,
  where `<reason>` is the first that applies, in this order: `is empty`; `has a drive or a ':'`;
  `starts or ends with '\' or '/'`; `has a '/'; parts are joined by '\'`; `has one of * ? " < > |`;
  `has an empty part`; `has a '.' or '..' part`.

**Config entries as written** (staged `orchestration.config.json`):

- `"teamState": { "folder": "%USERPROFILE%\\.claude\\state\\software-developer-agent", "_whyFolder": ... }`, the
  first section. `_whyFolder` quotes D-36 and the two earlier sentences and says changing this one line moves all.
- `"onFolder": "team-on"`, `"markerFolder": "context-guard"`, `"logFile": "logs\\limit-stop.log"` under
  `limitStop`. Their `_why` texts now say "under teamState.folder" and no longer mention `%TEMP%` or `%NAME%`.

**How a test points the root at scratch** (three seams, one per kind of test):

- In-process: pass settings whose `teamState.folder` is a scratch folder.
- A script run from a skill copy: `makeSkillCopy` (in `tests\helpers\scratch.mjs`) now sets every copy's
  `teamState.folder` to `<parentDir>\state` before the test's own changes, so no copy can reach the real root.
- A script run from the real skill folder: give the child `USERPROFILE` = a scratch home. The new helper
  `stateRootUnderHome(home)` gives the root the child will use. A test pins it to the shipped value.
- Every such child also gets `TEMP`/`TMP` on scratch, so code that slipped back to `os.tmpdir()` writes into scratch
  and fails a test.

**PowerShell.** No script reads the three keys. One test needed the smallest fix: `New-ServerCopy` in
`tests\limit-scripts.tests.ps1` (line 1338) set `limitStop.logFile` to an absolute path, which is now refused. It now
sets `'teamState.folder' = (Join-Path $skill 'state')` instead.

## Checks run (after the last change)

- Node suite in the staged copy, cwd `C:\`: **244 of 244 pass** (229 old + 15 new) (`node-final.log`).
- PowerShell suite in the staged copy: **105 of 105 pass**, in 4:40 (`ps-final.log`), with the one-line fix above.
- Invariant 1: **0 differences on 3** (the three settings, staged config, real environment).
- Invariant 2: `%TEMP%\claude-agent-team-on`: **0 refused of 3**; `%TEMP%\claude-context-guard\*.json`: **0 refused
  of 25**. Each maps to `<root>\team-on\<id>` or `<root>\context-guard\<name>`.
- Invariant 3: the real root was absent at every check (10:52, 10:56, 11:10, 11:11, 11:14, 11:17, 11:19, 11:21,
  11:26). `C:\Users\user\.claude\state\` kept its 4 files; across the green runs, the mutation
  run and the final suites only `usage-limits.json` changed (the live Usage watch). The red run did change
  `limit-stop.log` (see Issues).
- Mutation check in a scratch copy (deleted after): **17 of 17 caught** (`mutation.log`). The seven child rules, child
  not text, root not checked as absolute, an unset `%NAME%` let through, the root ignored, agent-team back on
  `os.tmpdir()`, the session id unchecked, the guard back on `os.tmpdir()`, the log ignoring the root (library and
  server, one each), the log folder not made.

**Not tested:** the Decisions pane (S4), which still builds `%TEMP%\<agentTeam.onFolder>`; with `team-on` it would
look in `%TEMP%\team-on`. A real `/software-developer-agent` run, because it would create the real root, which must
not exist before the cut-over. Windows name oddities the rules do not list (a trailing dot or space, `CON`, control
characters): not refused, by the task's list.

## Issues

- **Real limit-stop log polluted by my red run.** In the red phase the tests no longer overrode `limitStop.logFile`
  while the old code still read the old absolute value, so the old server and guard appended 60 lines to
  `C:\Users\user\.claude\state\limit-stop.log` (841 to 11409 bytes). All 60 carry test session ids (51 x
  `5e551000-aaaa-bbbb-cccc-000000000001`, 2 x `...0002`, 7 x `7b3870e5-e7c1-4f3a-9961-398d55920189`). No real session
  reads those ids. The first 841 bytes are untouched: SHA256
  `021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE`. I left it, as the file is live and not mine.
  Fix: cut it back to its first 841 bytes before the cut-over copies it. The new code and the `makeSkillCopy` default
  make a repeat impossible.
- Three more red-run leftovers, all mine, removed: `%TEMP%\team-on\7b3870e5-...` (the old code run in-process),
  `STATE_FOLDER_STAGING\orchestrate-agents\deep\er\server.log` and `STATE_FOLDER_STAGING\limit-stop.log` (the old
  server resolving a new test's relative log path against the cwd). I went through every red-run test: nothing else
  was written outside scratch.
- Live `SKILL.md` changed at 11:08:50 (3 lines on D-40 at line 132). The staged copy has the older text.
- The Decisions pane and the docs (`references\usage-limits.md:96`, README) still name the old places. They are
  S4's and S5's, and S4 must reach the cut-over together with this run.

## What I learned

- A test written before the code runs the OLD code in the red phase. A test that stops overriding a setting gets the
  shipped real path, and a test that feeds a new-shape value (a relative or refused path) gets it resolved against
  the cwd. One refused-value test had `C:\limit-stop.log` as its second case; only its failing first case kept the
  old server from writing at the drive root. The default root in `makeSkillCopy` now guards every copy, but a red
  phase for path code should run in a scratch copy too.
- The task file says it was written at 10:56; my clock read 10:52 when I started.

DECISIONS TAKEN: root checked before the child, not after, so a broken root is named first whatever the child; a UNC root is refused (the task says drive and '\'), not allowed; the first broken rule is named, in a fixed order, not all of them, so each rule has its own message a test can pin; test seam = scratch root in settings, makeSkillCopy default root, and USERPROFILE for the real skill folder, instead of a new environment override in production code.
INITIATIVES: makeSkillCopy now defaults every copy's teamState.folder to <parentDir>\state; new helper stateRootUnderHome; 3 existing context-guard tests now make the logs folder before writing or blocking the log by hand; 4 mutants beyond the required list (child not text, root ignored, session id unchecked, log folder not made); removed my three red-run leftovers (%TEMP%\team-on, staging deep\er\server.log, STATE_FOLDER_STAGING\limit-stop.log).
ISSUES FOUND: my red run appended 60 test lines to the real C:\Users\user\.claude\state\limit-stop.log (first 841 bytes intact, fix: cut back to 841 bytes); live orchestrate-agents\SKILL.md changed at 11:08:50 after the base list, so the cut-over will refuse until it is re-based; the Decisions pane still builds %TEMP%\<onFolder> and would miss every mark if this run ships without S4.
QUESTIONS: may the 60 test lines be cut from the real limit-stop.log (back to its first 841 bytes, hash above), and who does it?
