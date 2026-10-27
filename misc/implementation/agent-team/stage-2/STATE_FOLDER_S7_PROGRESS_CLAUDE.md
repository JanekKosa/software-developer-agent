# Run S7 progress: the Decisions pane fills in five folder variables

Started 2026-10-27 14:23 (clock). Task: `STATE_FOLDER_S7_TASK_CLAUDE.md`. Logs: `STATE_FOLDER_S7_LOGS\`.

## Files I own

In `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`, `hooks\team-switch.ts`,
`tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts`, `README.md`.
Plus one sentence in `STATE_FOLDER_STAGING\orchestrate-agents\orchestration.config.json` (`teamState._whyFolder`), last.

## Baseline (14:26)

- All six pane files and the staged config: UTF-8 without BOM, LF only. Staged config SHA-256 starts `1F40C85D`.
- Hashes of every other pane file: `STATE_FOLDER_S7_LOGS\00-not-mine-hashes-before.txt`.
- Type-check tool: TypeScript 7.0.2 installed from the npm cache (`--offline`) into the scratchpad `ts\` folder
  (S4 used 7.0.2; its tsconfig copy is `STATE_FOLDER_S4_LOGS\scripts\tsconfig.json`). Node 24.13.0.
- The staged team code reads `process.env[variable]` (config.mjs line 114), which on Windows matches a name in any
  letter case.

## Plan

1. Spike: what Node's `process.env` does on this machine with `%temp%`, a dotless i (`USERPROFıLE`), a long s
   (`uſerprofile`), and a variable set to ''.
2. RED: team-on tests (names match in any ASCII letter case, keys too) and team-switch world tests (the task's table
   on the caller's side; `%LOCALAPPDATA%` row of S6d moves to on; `%PROGRAMDATA%` and unset/empty TEMP are off).
3. GREEN: `stateRootOf` folds ASCII letter case of both the name and the map's keys; `lookAtSwitch` reads the five
   variables by literal name.
4. README paragraph and file headers name the five.
5. Checks: suite, validate, type-check, mutation (scratch copy), parity against staged `agent-team.mjs`.
6. Last change: the sentence in the staged config's `teamState._whyFolder`; check JSON parses, LF kept.

## Done

- 14:27 baseline run 1: 127 pass, 9 fail, all 9 "timed out after 5000 ms", free memory down to 504 MB, 141 s
  (`01-baseline-test.log`). Re-run on its own at 14:30: **136 of 136** in 14 s (`02-baseline-rerun-test.log`). Load,
  not a change: the baseline matches S6.
- Spike (Node 24.13.0, 14:31, `scratchpad\spike-env.mjs`): `process.env` finds `userprofile`, `temp`, `Tmp`,
  `localappdata`, `AppData`; it does NOT find `USERPROFıLE` (dotless i), `UſERPROFILE` (long s), `USERPROFİLE`;
  it finds `TEMP\0` (cuts at the NUL); a variable set to '' stays '' (not deleted). So the pane folds a to z only
  (`toUpperCase` would fold ı and ſ too, wrongly).
- 14:32 RED (`03-red-test.log`): 150 tests, 7 fail for the right reason: O13 (got null), six S6g rows (pane stayed
  closed). The `%USERPROFILE%\x` row and the new S6d off rows pass already (guards).
- GREEN at 14:33 (`04-green-test.log`): **150 of 150**. Changes: `team-on.ts` `stateRootOf` looks names up through
  `variableKey` (a-z made capitals) on both sides; `team-switch.ts` reads USERPROFILE, TEMP, TMP, LOCALAPPDATA,
  APPDATA by literal name; header comments name the five. Tests: O13 new; S6d's LOCALAPPDATA row replaced by
  PROGRAMDATA and 6 more off rows (SystemRoot, TEMP unset, TMP unset in the middle, APPDATA empty in the middle,
  LOCALAPPDATA unset, dotless i); S6g new, 7 on rows with the five set to five different folders; helper
  `setVariables` (undefined = unset). `register-world.ts` not changed (not needed).
- README: the "count as not switched on" sentence names the five, `%PROGRAMDATA%` as the example, unset/empty, and
  "a plain path always works".
- 14:35 type-check (TS 7.0.2, S4's tsconfig copied to `STATE_FOLDER_S7_LOGS\scripts\`): exit 0, no output.
  Validate: "Validation passed", exit 0; env reads now `APPDATA, HOME, LOCALAPPDATA, TEMP, TMP, USERPROFILE`.

- 14:35-14:39 mutation (`scratchpad\mut\decisions-pane`, copy deleted after; script kept as
  `STATE_FOLDER_S7_LOGS\scripts\mutate-s7.ps1`, summary `mut-summary.log`): M0 clean 150; **10 of 10 caught**, none by
  a load failure or a timeout (grep of `mut\*.log`: 0 "timed out", 0 "did not load"). M1-M4 each of TEMP, TMP,
  LOCALAPPDATA, APPDATA not read (S6g); M5 case-sensitive (O13, S6g); M6 unset let through (O2, S6d); M7 Unicode
  `toUpperCase` (O13, S6d dotless i); M8 map keys not folded (O13); M9 empty let through (O2, S6d); M10 TMP read
  from TEMP (S6d, S6g).
- 14:40 parity (`scripts\parity-s7.mjs`, log `08-parity.log`): **0 differences on 43**: 22 same path (the task's five,
  letter-case variants, odd joins, 5 on the real machine's variables), 18 both no marker, 3 on the safe side (pane no
  marker, team a path): `%PROGRAMDATA%`, `%SystemRoot%`, and `%TEMP<NUL>%` (Node's process.env cuts a name at a NUL).
- 14:40 LAST change: the sentence at the end of the staged config's `teamState._whyFolder`. Parses with
  `JSON.parse`; LF only, 153 line breaks as before; no BOM.
- 14:41 final, after the last change (`11-final-test.log`, `12-final-validate.log`, `13-final-typecheck.log`):
  **150 of 150**; "Validation passed" exit 0, env reads `APPDATA, HOME, LOCALAPPDATA, TEMP, TMP, USERPROFILE`;
  tsc 7.0.2 exit 0. The 14 other pane files hash the same as at 14:26 (`10-not-mine-hashes-after.txt`).
- Scratch deleted (TypeScript install, scripts, mutation copy). Nothing committed.

## Left

Report only.
