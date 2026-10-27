# Run S4 progress: the Decisions pane's copy of the switch-on rule

Started 2026-10-27 12:57 (clock read). Task: `STATE_FOLDER_S4_TASK_CLAUDE.md`.

## Files I own

In `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`, `hooks\team-switch.ts`,
`tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts`, `README.md` (the
mark's paragraph only), `tests\hooks\pane.test.ts` only if a test there builds the mark (checked 12:58: it does not; it
only calls `teamConfig` from register-world). Plus this file, the report and `STATE_FOLDER_S4_LOGS\`.

## Baseline (12:57)

- Pane repo git: uncommitted changes from earlier sessions already present (README, pane.tsx, poll.ts, registers.ts,
  pane.test.ts, register-world.ts modified; team-on.ts, team-switch.ts and their tests untracked). Not mine to judge.
- No CLAUDE.md or copilot-instructions in `claude-code-extensions` (checked to depth 2).
- All owned files: UTF-8 without BOM, LF only.
- SHA-256 (first 16) of every pane file at 12:57, for the not-mine check at the end:
  README 20667927307D5C3A, plugin.json 6F320AF59670DBA2, decision-state.ts 1AB74E10363364D0, decisions.ts
  E542D2AC42B10FF9, hooks.json D842D789476D6728, pane-control.ts B915984F6F37BB33, pane.tsx C7F90F73E2391891, poll.ts
  028098C1ED036140, register.tsx 0C2335703C81793D, registers.ts 605DDF803EAF7C2C, settings.ts E2841EE72991804A,
  team-on.ts 5CB1D9B5574A1B49, team-switch.ts 6DD022C6586F4D77, decisions.test.ts AD64FC8F554313D0, pane.test.ts
  421851E5C251E97C, team-on.test.ts E71F6FEE12EECBD2, team-switch.test.ts 834B0059A7BA90AE, register-world.ts
  CD3B4B68BC460EB6, types\index.d.ts 983B57D5F852AD97.
- Tools: claude.exe 2.1.310 at `%USERPROFILE%\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`.
  Type file for the type-check: the engine's `claude-code.d.ts` (2.1.310, hash CD169FF6...) in
  `%LOCALAPPDATA%\Temp\claude\bundled-skills\2.1.310\9f73c3877ef25245c1f3bbe784b66fc3\plugin-authoring\types\`; its
  header prints the tsconfig. TypeScript: `claude-toolbar\node_modules\typescript` 7.0.2.
- Test count: 107 of 107 pass (`claude plugin test decisions-pane`, 13:00, log `STATE_FOLDER_S4_LOGS\01-baseline-test.log`),
  the same as the task's baseline.
- Staged lib read 13:02: `requireStatePath` in `STATE_FOLDER_STAGING\orchestrate-agents\lib\config.mjs` does NOT yet
  refuse `%` in the child (its char rule is `[*?"<>|]`); root regex `^[A-Za-z]:\\`; expansion `/%([^%]+)%/g` with an
  unset or empty variable an error; the result is `path.join(root, value)`, then `path.join(folder, sessionId)` in
  `agent-team.mjs`. `SESSION_ID_PATTERN` unchanged `/^[A-Za-z0-9-]{1,128}$/`.
- Staged config: `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent`, `agentTeam.onFolder` =
  `team-on`. Live config: no `teamState`, `agentTeam.onFolder` = `claude-agent-team-on`.
- Marks today in `%TEMP%\claude-agent-team-on\` (listed read-only 13:03): `53c478ca-5bfb-48d8-9697-2bf478d648b8`,
  `56c67d3d-b3c0-43be-a82c-b3a9cdc23274`, `bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f`.

## Plan (13:05)

- `team-on.ts`: drop `tempFolderOf`/`TempVariables`/`SINGLE_FOLDER_NAME` (the task says the root replaces the temp
  part; kept, they would be dead code). Add `stateFolderOf(config)`, `variablesNamedIn(folder)`,
  `stateRootOf(folder, variables)`, `isStatePath(value)` (S1's 7 rules, `%` in the char rule), and
  `teamOnMarkerPath(root, onFolder, sessionId)` joining as `path.win32.join` does (normalises the root: `/` to `\`,
  doubled `\`, `.` and `..` parts). Expected join values come from Node 24.13's own `path.win32.join` (scratch script
  `s4-join-table.mjs`, run 13:04), an independent computation.
- `team-switch.ts`: read the config once, ask `$.env.get` only for the variables the root names, then build.
- Tests first: pure table tests in `team-on.test.ts`; world tests in `team-switch.test.ts` (mark at new place shows,
  mark only at old `%TEMP%` place does not, each refused child, unset variable, no `teamState`, relative and UNC root).
- Known equivalent mutants: S1's rules "is empty" and "starts or ends with \ or /" can never decide alone (an empty
  value has an empty part; a leading or trailing `\` makes an empty part, a `/` is caught by the `/` rule). So the
  four child mutants are: the `:` rule, the `%` in the char rule, the empty part rule, the dot part rule.

## Measured facts

- 13:05 ENGINE CONSTRAINT (Claude Code 2.1.310, test kit's loader): `$.env.get` takes a LITERAL name. A loop
  `variables.set(name, await $.env.get(name))` makes the hooks module refuse to load: "$.env.get takes a literal name
  as its first argument, so the variables a module reads and writes can be listed (got the variable name)" (log
  `03-green-test.log`). So the pane cannot fill in an arbitrary `%NAME%`. Decision: the pane reads USERPROFILE only (the
  mod already reads it for `~` in `scriptPath`); a root naming any other variable counts as off (safe side). The pure
  rule `stateRootOf(folder, variables)` stays general; the limit lives in `team-switch.ts`. `variablesNamedIn` removed
  again (unused after this).
- 13:04 another agent is changing the pane at the same time: `tests\hooks\points.test.ts` appeared at 13:03:29 (7
  tests, P1-P7; not mine, not touched). Its tests failed in my RED run (13:04) and pass at 13:10.

## Done

- 13:10 Points 1 and 2 built test-first. RED at 13:04 (`02-red-test.log`: team-on.test.ts did not load, missing
  exports; S1, S2, S3, S5 percent sign, S5b, S5c, S6*, S8*-S11 failed on the marker place). GREEN at 13:10
  (`04-green-test.log`): 136 pass, 0 fail, 5 files. Per file: decisions 9, pane 44, points 7 (not mine), team-on 12
  (was 6), team-switch 64 (was 48). Baseline 107 + 22 of mine + 7 of the other agent = 136.
- `team-on.ts` now: `SESSION_ID_PATTERN`, `stateFolderOf(config)`, `onFolderOf(config)`,
  `stateRootOf(folder, variables: ReadonlyMap<string, string|undefined>): string|null`, `isStatePath(value)`,
  `teamOnMarkerPath(root: string|null, onFolder, sessionId): string|null`; private `joinUnder` (path.win32.join for a
  drive-absolute root). Removed: `tempFolderOf`, `TempVariables`, `SINGLE_FOLDER_NAME`.
- `team-switch.ts`: session id, config path, read config, `$.env.get('USERPROFILE')`, build marker, stat.
- `register-world.ts`: exports `HOME`, `STATE_FOLDER_SETTING`, `STATE_ROOT`, `ON_FOLDER` = `team-on`, `MARKER` under the
  root, `OLD_MARKER` under TEMP; `teamConfig` writes `teamState.folder`.
- Tests removed: old O1/O2 (tempFolderOf) and S6-S7b (temp folder lookup); their rule no longer exists.
- 13:12 README: the mark's bullet (new place, old place no longer counts, no `teamState.folder` counts as off) and the
  next bullet's "what counts as off" sentence (rules, USERPROFILE only). Header comments of team-on.ts and
  team-switch.ts name `agent-team.mjs teamOnMarkerPath`, `config.mjs requireStatePath`/`requirePathSetting`/
  `STATE_PATH_RULES`, `limit-stop.mjs SESSION_ID_PATTERN`, and the engine limit.
- 13:22 `claude plugin validate decisions-pane`: "Validation passed", exit 0; env reads now `HOME, USERPROFILE` (were
  also TEMP, TMP, SystemRoot, windir). Its plugin-directory notes (LICENSE missing, icon missing) are about files I
  did not touch. Type-check (scratch tsconfig `s4-typecheck\tsconfig.json`, the one printed in the engine's type file,
  TS 7.0.2 from claude-toolbar): exit 0, no output; `--listFilesOnly` shows it covers all hooks and all 5 test files.
- 13:25 Real-material check (`scratchpad\s4-parity\parity.mjs`, log `07-parity.log`; imports the pane's team-on.ts
  as is and the staged lib read-only; the team-switch glue repeated in the script):
  1. staged config + real USERPROFILE + the 3 real ids: 0 differences on 3.
  2. 60 refused cases (34 children, 12 roots, no teamState, 13 session ids) give no marker in the pane and an error in
     the staged code; 22 accepted cases (children, odd roots, 128-char id) give the same path: 82 of 82 agree. The
     staged config.mjs refuses `%` by 13:25 (its line 27), so the `%` cases are in the 82.
  2b. Known differences, safe side: `%LOCALAPPDATA%\state` and `%userprofile%\state` give a path in Node, no marker in
     the pane (it can read USERPROFILE only, by its exact name).
  3. Live config (old shape): 3 of 3 ids give no marker in the pane (Node: "has no setting 'teamState.folder'").
     Expected state until the switch-over.

- 13:27 Hash check of the pane: besides my files, `hooks\decisions.ts` (13:05:46), `hooks\pane.tsx` (13:06:14) and the
  new `tests\hooks\points.test.ts` (13:03:29) changed since 12:57: the other agent's work, not mine. Every other file
  matches the 12:57 hash. Pure tests renumbered O1-O12 at 13:27 (the removed variablesNamedIn test left a gap).

## Mutation check (plan 13:26)

Scratch copy `scratchpad\s4-mut\decisions-pane`; 9 mutants, one at a time, `claude plugin test <copy>`; a mutant is
caught only when a test fails and the module loaded. M1 root not expanded; M2 unset variable let through; M3 root not
checked absolute; M4 `:` rule off; M5 `%` off; M6 empty part rule off; M7 dot part rule off; M8 old TEMP folder as
the root; M9 session id pattern unchecked.

Result 13:30 (`scratchpad\s4-mut\mutate.ps1`, logs `STATE_FOLDER_S4_LOGS\mut\`): M0 (unmutated copy) clean, 136 pass.
9 of 9 caught, none by a load failure: M1 63 fail (O1 O2 O10 + world), M2 2 (O2, S6d unset variable in the middle),
M3 7 (O3, S6d), M4 4 (O5, S5), M5 3 (O5, S5), M6 2 (O5, S5), M7 5 (O5, S5), M8 73 (S6, S6b-f and the world), M9 11
(O7, S4). No survivor. Scratch copy deleted 13:31 (no links inside; checked gone).

## Final checks (13:33, after the last change at 13:27)

- `claude plugin test decisions-pane`: 136 pass, 0 fail, 5 files (`08-final-test.log`).
- `claude plugin validate decisions-pane`: "Validation passed", exit 0; env reads `HOME, USERPROFILE`
  (`09-final-validate.log`).
- Type-check: exit 0, no diagnostics (`10-final-typecheck.log`).
- Pane hashes at 13:33 equal those at 13:27; files not mine equal the 12:57 baseline except the other agent's
  `decisions.ts`, `pane.tsx`, `points.test.ts`. `pane.test.ts` unchanged.
- Scratch: `s4-parity`, `s4-mut`, `s4-typecheck`, `s4-join-table.mjs` deleted from the scratchpad at 13:33; copies of
  the four scripts kept in `STATE_FOLDER_S4_LOGS\scripts\` to re-run the checks. `mutate.ps1` makes its copy beside
  itself: copy it to a scratch folder first, never run it from the logs folder. `parity.mjs` reads only.
- Nothing committed. No process left running.

## State: done. Report `STATE_FOLDER_S4_REPORT_CLAUDE.md`.
