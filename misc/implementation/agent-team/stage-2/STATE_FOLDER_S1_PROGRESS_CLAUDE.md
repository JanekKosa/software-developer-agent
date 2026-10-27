# Run S1 of "the team's state in one folder": progress

Worker: software-developer, started 2026-10-27 10:52 (clock read). Task:
`misc\implementation\agent-team\stage-2\STATE_FOLDER_S1_TASK_CLAUDE.md`.

## Files I own

- Staged copy `misc\implementation\agent-team\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`:
  `orchestration.config.json` (only `teamState`, `agentTeam.onFolder`, `contextGuard.markerFolder`,
  `limitStop.logFile`), `lib\config.mjs`, `lib\agent-team.mjs`, `scripts\team-on.mjs`, `hooks\context-guard.mjs`,
  `lib\limit-stop.mjs`, `scripts\limit-stop-server.mjs`, the Node tests and `tests\helpers\`.
- `STATE_FOLDER_STAGING_BASE_CLAUDE.txt`, this file, `STATE_FOLDER_S1_REPORT_CLAUDE.md`, `STATE_FOLDER_S1_LOGS\`.
- Never: the live `orchestrate-agents\`, other PowerShell scripts (except a smallest fix), `SKILL.md`, `references\`,
  `decisions\*`, `skills\`, the Decisions pane, settings, CLAUDE.md.

## Step 0 (baseline)

- 10:52 Only `CLAUDE.md` at the repo root; no `CLAUDE.md` or copilot instructions below it on my path.
- 10:52 `STATE_FOLDER_STAGING\` absent; `C:\Users\user\.claude\state\software-developer-agent` absent (0e); live
  `orchestrate-agents\` holds no links (`dir /AL /S /B` = File Not Found).
- 10:52 `C:\Users\user\.claude\state\` before: `limit-stop.log` 841 B 09:34:45.667, `mcp-discover-verdicts.json`
  750 B 10:08:41.531, `relaunch.log` 1782 B 09:36:11.443, `usage-limits.json` 173 B 10:52:57.480 (the live watch
  rewrites this one).
- 10:52 Real old places: `%TEMP%\claude-agent-team-on\` has 3 marks; `%TEMP%\claude-context-guard\` has 25 `.json`.
- 10:53:38 Copied 45 files live -> staged; base list written with the same stamp; 0 hash mismatches copy vs live.
- 10:56 Step 0d: `node --test` in the staged copy (cwd `C:\...`): 229 of 229 pass
  (`STATE_FOLDER_S1_LOGS\node-0d.log`). `~\.claude\state\` after it: same 4 files; only `usage-limits.json` changed
  (10:56:03, the live Usage watch's probe), the real root still absent.
- All my files are UTF-8 without BOM, LF only.

## Plan (written before changing behaviour)

- `lib\config.mjs`: new `requireStatePath(config, keyPath)`. Root `teamState.folder` read with `requirePathSetting`
  (so `%NAME%` and an unset variable behave as today), then refused unless it starts `<letter>:\`. The child at
  `keyPath` refused, each rule with its own reason text: not text, empty, drive or `:`, leading or trailing `\` or
  `/`, `/` anywhere, empty part, `.` or `..` part, any of `* ? " < > |`. Returns `path.join(root, child)`.
- `lib\agent-team.mjs`: marker = `requireStatePath(config,'agentTeam.onFolder')\<session id>`; drop `os` and the
  single-folder regex; keep the session-id check.
- `hooks\context-guard.mjs`: `markerDir = requireStatePath(config,'contextGuard.markerFolder')`; drop `os` and its
  regex.
- `lib\limit-stop.mjs` `logSettings` and `scripts\limit-stop-server.mjs` `readSetup`: `requireStatePath(config,
  'limitStop.logFile')`; drop the then-unused `requirePathSetting` imports.
- Config: `teamState.folder` + `_whyFolder` (quotes D-36); the three children `team-on`, `context-guard`,
  `logs\limit-stop.log` with plain `_why` texts.
- How tests point the root at scratch: in-process tests pass a config whose `teamState.folder` is a scratch
  folder; child processes run from a skill copy get the copy's `teamState.folder` set to scratch; child processes
  run from the real skill folder (team-on.mjs, decision-reminder's REAL_HOOK) get `USERPROFILE` = a scratch home.
  Every test env keeps `TEMP`/`TMP` on scratch too, so a regression to `os.tmpdir()` lands in scratch and fails.
- PowerShell: no script reads the three keys. `tests\limit-scripts.tests.ps1` `New-ServerCopy` (line 1338) sets
  `limitStop.logFile` to an absolute path: smallest fix = set `teamState.folder` to the copy and keep a relative
  log name.
- Proof: new tests first (red), then code (green); then the invariant, the mutation check, both suites.

## Point 1 and 2: tests first

- 11:05 Red run of 5 files (`STATE_FOLDER_S1_LOGS\red.log`): state-path fails on the missing export, agent-team,
  context-guard, decision-reminder and limit-stop-server fail on the new places. Expected reasons.
- **Incident (11:05-11:06:50), mine.** In the red run the skill copies of the context-guard and limit-stop-server
  tests no longer overrode `limitStop.logFile`, so the OLD code used the staged config's old absolute value and
  appended 60 test lines to the REAL `C:\Users\user\.claude\state\limit-stop.log` (841 -> 11409 bytes; all 60 lines
  carry test session ids: 51 x `5e551000-...-000000000001`, 2 x `...-000000000002`, 7 x `7b3870e5-...`). The first
  841 bytes are untouched (SHA256 of bytes 0..840 = `021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE`).
  No real session reads those ids. Not repaired (the file is outside my files and live); reported with the fix:
  cut the file back to its first 841 bytes. Prevention: `makeSkillCopy` now sets every copy's `teamState.folder` to
  `<parentDir>\state` before `adjust`, and the new code refuses an absolute child, so no copy can reach a real place.
- **Second red-run leftover, mine, removed.** The old `switchTeamOn`, run in-process by the new agent-team test
  (which no longer pointed TEMP at scratch), wrote `%TEMP%\team-on\7b3870e5-...` (24 bytes,
  `2026-10-27T10:05:50.965Z`, created 11:05:50.961). Removed at 11:12 (file, then the empty folder, no recursion).
  Prevention: `scratchRoot` in `agent-team.test.mjs` points in-process TEMP/TMP at scratch too.

## Point 1 and 2: code (green)

- 11:08 `lib\config.mjs` `requireStatePath(config, keyPath)`; `agent-team.mjs`, `context-guard.mjs`, `limit-stop.mjs`,
  `limit-stop-server.mjs` use it; config: `teamState` added, three children changed; PS test `New-ServerCopy` now sets
  `teamState.folder` = `<copy>\state` instead of an absolute `limitStop.logFile`.
- 11:11 Green: 6 files (state-path, agent-team, basics, decision-reminder, limit-stop-server, context-guard) 130 of
  130 (`green.log`); state folder unchanged before/after (except nothing), real root absent.
- 11:13 agent-team + state-path re-run after the TEMP fix: 16 of 16.

## Invariant and mutation check

- 11:13 Invariant (scratchpad `invariant.mjs`, read-only, staged code + staged config + real environment): 0
  differences on 3 (`...\software-developer-agent\team-on`, `...\context-guard`, `...\logs\limit-stop.log`);
  `%TEMP%\claude-agent-team-on`: 0 refused of 3; `%TEMP%\claude-context-guard\*.json`: 0 refused of 25 (agent ids by
  `AGENT_ID_PATTERN`, `session-<id>` by `SESSION_ID_PATTERN`, each mapped to `<root>\context-guard\<name>`).
- 11:14-11:17 Mutation (scratchpad `mutate.mjs`, scratch copy of the staged folder, deleted 11:18 after a link
  check): baseline of the copy 97 of 97; **17 of 17 caught** (`STATE_FOLDER_S1_LOGS\mutation.log`): the seven
  child rules (empty, drive/colon, leading/trailing, `/`, `* ? " < > |`, empty part, `.`/`..`), child not text,
  root not checked absolute, unset `%NAME%` let through, root ignored (`path.resolve`), agent-team on `os.tmpdir()`,
  session id unchecked, guard on `os.tmpdir()`, log ignoring the root in `limit-stop.mjs`, the same in the server,
  log folder not made in `appendLimitStopLog`. Real state folder and temp unchanged across it (only the live
  `usage-limits.json`).

## Closing checks

- 11:18 Third red-run leftover, mine, removed: `STATE_FOLDER_STAGING\orchestrate-agents\deep\er\server.log` (251 B,
  created 11:06:01 by the OLD server resolving my new test's relative `deep\er\server.log` against the cwd). File,
  then the two empty folders, removed. Staged copy vs base list now: 13 changed files + 1 new
  (`tests\lib\state-path.test.mjs`), nothing else; no links.
- 11:18 **Live `orchestrate-agents\SKILL.md` changed at 11:08:50, not by me** (3 lines about D-40 added at line 132).
  The base list (10:53:38) and the staged `SKILL.md` hold the older text. Every other live file still matches.
- 11:21 Full Node suite in the staged copy (cwd `C:\`): **244 of 244** (229 + 15 new) (`node-final.log`). State
  folder before/after: only `usage-limits.json` changed (live Usage watch); real root absent; temp untouched.
- 11:21 PowerShell suite started in the background (`ps-final.log`).
- 11:23 Fourth red-run leftover, mine, removed: `STATE_FOLDER_STAGING\limit-stop.log` (253 B, 11:06:01; the OLD
  server resolving the new test's `..\limit-stop.log` against the cwd; only the first case of that test ran, as its
  first assertion failed). Reasoned through every red-run test: no other write outside scratch (the old hooks had
  TEMP on scratch; `C:\limit-stop.log` and `stage-2\limit-stop.log` absent; old `%TEMP%` folders still 3 and 25).
- 11:26 PowerShell suite in the staged copy: **105 of 105** in 4:40 (`ps-final.log`). State folder after: only
  `usage-limits.json` changed (live watch); real root absent; temp untouched; no `oa-*` or
  `limit-scripts-tests-*` scratch left from my runs.
- 11:26 Live vs base list: only `SKILL.md` differs (11:08:50, not mine). Staged copy: 13 changed + 1 new file,
  nothing else. Check scripts moved from the scratchpad to `STATE_FOLDER_S1_LOGS\`. Report written:
  `STATE_FOLDER_S1_REPORT_CLAUDE.md`. Nothing committed. Done.
