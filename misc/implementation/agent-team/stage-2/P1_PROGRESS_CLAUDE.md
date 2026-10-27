# P1 progress: the Decisions pane only in a switched-on chat

FEASIBLE | yes | `await $.session.id()` (mod API, `$.session.id: () => Promise<string>`, documented "Returns the session's id (the transcript file's name)"); same id as the hooks' `session_id` and `CLAUDE_CODE_SESSION_ID` (2026-10-27, between 08:45 and 09:02; time not read then)

Started 2026-10-27 08:44 (Get-Date). Times between 08:44 and 09:02 below were not read when written; corrected at 09:02 (Get-Date) to the bounds that are known. Task: `P1_TASK_CLAUDE.md` in this folder.

## Files I own

- `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\*` (a new file for the switch check allowed)
- `decisions-pane\types\index.d.ts`
- `decisions-pane\tests\**` (tests and test support)
- `decisions-pane\README.md` (a short part under "Showing and hiding it", and the command's line)

Not mine: everything else; no plugin.json change without asking; no marker file; no git that changes anything.

## Steps

- [ ] Gate: where the pane gets its session id
- [ ] Baseline: git status, 53 tests, validate, type-check, hash list
- [ ] Point A: the switch check at every look
- [ ] Point B: the command line when off
- [ ] Tests
- [ ] Invariant against agent-team.mjs
- [ ] Mutation check
- [ ] README
- [ ] Report

## Baseline (2026-10-27, before 09:02)

- `git status --short` in claude-code-extensions: clean (empty).
- `claude plugin validate decisions-pane`: passed, 1 warning (ICON_MISSING, not mine).
- `claude plugin test decisions-pane`: 53 pass, 0 fail, 2 files. Type-check (TypeScript 7.0.2 from
  `claude-toolbar\node_modules\typescript`, my tsconfig in scratchpad `tc\tsconfig.json`): exit 0, no output.
  run-heavy: peak 647 MB.
- Runner: scratchpad `checks.ps1` (validate, test, tsc; logs in scratchpad).

## Plan (written before the change)

- New `hooks/team-on.ts`: the pure rule, no runtime import (so Node can run it for the invariant):
  `SESSION_ID_PATTERN`, `SINGLE_FOLDER_NAME`, `tempFolderOf(vars)` (Node os.tmpdir() on Windows; null when none of
  TEMP, TMP, SystemRoot, windir is set), `onFolderOf(config)`, `teamOnMarkerPath(temp, onFolder, id)` (null = off).
- New `hooks/team-switch.ts`: `lookAtSwitch($, settings)`: `$.session.id()`, `$.env.get` of the four variables (each a
  literal), reads the team config (same path the pane already reads), `$.fs.stat(marker)`. Returns true / false /
  null (null = failed for another reason than "not there": keep the last state). `$.fs.stat`, not `$.fs.exists`:
  exists cannot tell a refusal from "not there".
- `registers.ts`: export `configPath($, settings)` and `isNotThere(error)` (one source for both rules), used by
  readConfig and stampOf.
- `poll.ts`: module flag `isTeamOn` (off until a look says on); `startPoll` no longer finds registers before the
  look; `readRegisters` looks first; off = rows [] + notice '' + followWaiting (closes the pane), and nothing under
  the repo is touched. Returns the on/off state.
- `pane.tsx`: the command notes whether the pane was open, runs `readRegisters` (a fresh look, so a chat switched
  on a second ago is seen), then: off = the fixed line, no pane; on = today's toggle on the noted open state.
- Tests: world gets TEMP/TMP/SystemRoot/windir in an editable env map, a session id stand-in, a marker by default,
  `switchOff`/`switchOn`, `teamConfig`, and records every fs path asked (`accesses`). D23 and D26 rewrite the config:
  they use `teamConfig` so the team stays on. `runCommand` moves to the world. New file
  `tests/hooks/team-switch.test.ts`.
- Proof: new tests red first, then green; 53 old ones still pass; invariant script in scratchpad; mutation check in
  a scratch copy.

## Log

### Tests first (red, 2026-10-27, before 09:02)

- World (`tests/support/register-world.ts`): exports CONFIG, SESSION_ID, TEMP_FOLDER, ON_FOLDER, MARKER, `teamConfig`,
  `switchOff`, `switchOn`, `runCommand` (moved from pane.test.ts); env map (USERPROFILE, TEMP, TMP, SystemRoot,
  windir); `session.id` stand-in (`sessionId`, `failSessionIds`); `accesses` = every fs path asked (exists, stat,
  read). Marker present by default. D23 and D26 now write the config through `teamConfig` (same register settings,
  plus the switch folder). Unused `Engine` import dropped from pane.test.ts.
- New `tests/hooks/team-switch.test.ts`: 48 tests (S1-S12, S4 x12 ids, S5 x14 folder settings).
- Red run against the unchanged mod: 101 tests, 65 pass, 36 fail, all assertion failures. The 12 new ones that
  pass are the "on" controls (S4b, S5b, S6, S6b, S6d, S6e, S7, S7b) and the "keep the last state while on" ones
  (S8-S8d), which the always-on old mod also meets; the mutation check is what proves them. The 53 old tests pass
  with the new world. Type-check clean.

### Points A and B built (green, 2026-10-27, before 09:02)

- `hooks/team-on.ts` (pure rule), `hooks/team-switch.ts` (`lookAtSwitch`), `registers.ts` (exports `configPath`,
  `isNotThere`; `scriptPath` and `configPath` take only `env`), `poll.ts` (look first; `isTeamOn` module flag;
  `readRegisters` returns it), `pane.tsx` (command: note open state, `readRegisters`, off = the fixed line).
- First green run found D14 failing: D14 and D14b also rewrite the config (literal path). Both now use
  `teamConfig`. D14b had passed for the wrong reason (the chat counted as off); fixed with it.
- After: 101 pass / 0 fail (3 files); type-check exit 0, no output; validate passed. Peak 872 MB.
- Validate lists `$.session.id`, `$.fs.stat`/`read` via lookAtSwitch, env reads HOME, SystemRoot, TEMP, TMP,
  USERPROFILE, windir. Its LICENSE_MISSING directory line: to compare against an untouched copy from git.

### Invariant (done 2026-10-27, before 09:02)

- Script: scratchpad `invariant\invariant.mjs` (Node 24.13 imports the pane's `team-on.ts` by type stripping, and
  `agent-team.mjs` read-only). Config: the real `~/.claude/skills/orchestrate-agents/orchestration.config.json`, raw
  JSON (the pane reads it raw too; the library's `loadConfig` not used).
- Result: **0 differences on 100 checks**: 58 session ids (1 real marker = this chat, on in both; 37 invented valid
  ids incl. 30 random GUIDs and 128 chars; 20 unsafe incl. `..`, `a\b`, `a/b`, empty, 129 chars, spaces, `C:`, null,
  undefined, 42, an object, an array, NUL, `é`), same on/off and same path for valid ids, library throws where the pane
  gives no path for unsafe ones; 17 folder settings (library throws exactly where the pane says off); 13 temp
  variable sets against Node's own `os.tmpdir()` plus the full marker path against the library's `path.join` (incl.
  trailing `\`, `C:\`, double `\\`, empty TEMP, UNC, bare `D:`, `\`), and none set (Node `undefined\temp`, pane off).
- Read-only proof: hashes of the marker file, agent-team.mjs, limit-stop.mjs, orchestration.config.json equal
  before and after; marker folder 1 entry before and after.

### Mutation check, first pass (ended 2026-10-27 about 09:06, peak 946 MB)

- Script: scratchpad `mutation\mutate.mjs`: copies the live pane into `mutation\work` per mutant, applies exact
  replacements (refuses one not found exactly once), runs `claude plugin test` on the copy, writes `results.json`,
  deletes `work` at the end. 25 mutants + an unmutated control (M0: 101 pass).
- Do not edit hooks or tests while it runs (each mutant copies the live folder).
- First pass: 21 of 25 caught. Survivors: M2c (empty id allowed), M11 (trailing backslash kept), M12 (drive root
  trimmed too), M16 (no temp variables give `undefined\temp`).
- Probe (scratchpad `probe\`, a copy with M2c and M16 applied): the test kit hands the stand-ins each path resolved
  against the plugin folder and normalised. `undefined\temp\...` arrived as `<plugin folder>\undefined\temp\...`;
  an empty id's `...\claude-agent-team-on\` arrived as `...\claude-agent-team-on`. So markers planted at raw paths
  were never found, and S4/S5/S6f could not see a loosened rule. Also: the test's `$` has no `$.session.id`.
- Fix (tests only): S4, S5, S6f now assert the pane asks about nothing but the team's settings (`beyondSettings`):
  no marker looked for at all. Planted markers dropped there. M11 and M12 change only a path's spelling that the
  file system (and the kit) resolves to the same file: no session test can see them. New pure-rule tests
  `tests/hooks/team-on.test.ts` (O1-O6, the `decisions.test.ts` pattern), expected temp folders = Node's own
  `os.tmpdir()` values from the invariant run.
- `pane.tsx` NOT_ON comment reworded (it claimed the guide pages use the words; another worker writes them now).
- After: 107 pass / 0 fail (4 files), type-check clean, validate passed (peak 896 MB).
- Second pass of all 25 mutants: running since 09:08. At 09:10: M0 control 107 pass; M1-M5b all caught, M2c now
  caught (2 tests).

### Closing (CONTEXT GUARD at 09:10, 321k)

- Stopped building. Not done, deliberately: the test world writes the marker's timestamp in two places (initial
  map and `switchOn`); calling `switchOn` there would be the one-source cleanup. Harmless as is.
- Left to do: wait for the second mutation pass; final suite + type-check + validate; git status; fill the report's
  FINISHED_AT, FINAL_CHECKS and REPORT_BLOCK; delete scratch logs (keep the four scripts: `checks.ps1`,
  `tc\tsconfig.json`, `invariant\invariant.mjs`, `mutation\mutate.mjs`, so a next run can rerun them).
- To finish a check by hand: `pwsh -NoProfile -File <scratchpad>\checks.ps1` (validate, test, tsc) through
  run-heavy; `node <scratchpad>\invariant\invariant.mjs`; `node <scratchpad>\mutation\mutate.mjs`.

### Done (2026-10-27 09:14)

- Second mutation pass: **25 of 25 caught** (M0 control 107 pass). Final run after the last change: 107 pass /
  0 fail (4 files), type-check exit 0 no output, validate passed; peak 862 MB. Git status: 6 modified, 4 new files,
  all in decisions-pane; nothing committed. Scratch logs deleted; the four scripts kept; no process left.
- Every check ran in full. Not run: a real VS Code chat and the real engine (the task leaves that to a next run).
- Report: `P1_REPORT_CLAUDE.md`.

### Invariant, second run (2026-10-27 09:09)

- Added section 4: five TEMP spellings that `path.join` normalises (forward slashes, three trailing backslashes, a
  doubled inner backslash, `\.`, `\x\..`), each with the real marker id and a random id. 0 on/off differences;
  10 path-spelling-only differences (pane keeps TEMP's spelling), each resolving to the same file on Node's fs.
- Total: **0 differences in on/off on 110 checks**; for valid ids with a normal TEMP the same path (58 ids, 25 temp
  cases). Hashes of the marker, agent-team.mjs, limit-stop.mjs and the config unchanged; 1 marker before and after.

### README (done 2026-10-27, before 09:02)

- "Showing and hiding it": a first bullet "Only in a chat switched on for the agent team" (marker, example D-12,
  next refresh), a bullet on looking at every refresh / marker gone / failed look; the command's line when off.
  Options table: the config also names the switch folder.

### Gate (done 2026-10-27, between 08:45 and 09:02)

- Source: `$.session.id()` in the API types (`claude-code.d.ts` of the bundled plugin-authoring skill, 2.1.310, line
  2853-2855): "Returns the session's id (the transcript file's name)." No event field carries it at `session.start`
  (`SessionStartInput` has only `cwd`, `surface`, `isInteractive`); `session.end` has `e.sessionId`.
- Measured on this machine, read-only: `CLAUDE_CODE_SESSION_ID` = `bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f`; the one
  file in `%TEMP%\claude-agent-team-on` has that name; the transcript `~/.claude/projects/c--Repos-My-projects-
  software-developer-agent/<that id>.jsonl` exists (not read). The classic hooks' `session_id` is the same session
  id (BaseHookInput, with `transcript_path` beside it). So one id, three spellings of where it comes from.
- Not run against the real engine here (the task leaves that to a next run): that `$.session.id()` answers the bare
  id without `.jsonl` is the doc's word plus the test kit's answer, not a live read.
- `/clear` and resume: the API says the id changes. `SessionEndInput.sessionId`: "after a `/clear` or a resume the
  process goes on under another", and on `/clear` "the process goes on under a new session id, and no
  `session.start` fires for it". Report only; nothing changed for it. Since the check reads `$.session.id()` at
  every look, after `/clear` the pane follows the new id's marker, which is what the team's hooks do too (they get
  the new `session_id` per call).
