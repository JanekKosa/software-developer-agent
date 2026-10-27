# Run S3a progress: the agent repo works from any folder

Started 2026-10-27 15:22 (clock read). Task: `SELF_CONTAINED_S3A_TASK_CLAUDE.md`; spec: `SELF_CONTAINED_S3_CONTRACT_CLAUDE.md`
sections 1 and 2.

## Files I own

`agents\*.md`, `orchestrate-agents\SKILL.md`, `orchestrate-agents\references\*.md` (not `.html`), `team-rules\SKILL.md`,
`team-switch\SKILL.md`, `windows-pitfalls\`, `orchestrate-agents\lib\*`, `orchestrate-agents\hooks\*`,
`orchestrate-agents\scripts\*`, `orchestrate-agents\orchestration.config.json`, `orchestrate-agents\tests\*`.

Not mine: `scripts\` (S3b1), `README.md`, `agent-team-files.html`, `references\*.html`, `decisions-pane\`, `skills\`,
`decisions\`, `templates\`, `report-changes\`, `explain-clearly\`, `misc\`, anything outside REPO, `~\.claude\`.

## Facts measured

- 15:22: repo link `C:\Users\user\.claude\software-developer-agent` is a junction to REPO (main session made it).
- 15:22: no `pc-settings.json` in `C:\Users\user\.claude\state\software-developer-agent\`.

## Baseline (before any change)

- Node suite (`node --test` in `orchestrate-agents\`, through run-heavy, from 15:22): 261 pass, 0 fail, 3:45.
- PowerShell suite (`pwsh -NoProfile -File tests\limit-scripts.tests.ps1`, through run-heavy): 122 passed, 0 failed.
- Search (point 4 patterns, `-i`, excluding `misc\ decisions\ skills\ .git\`): 96 lines in 25 files; 53 lines in my files,
  43 in not-mine files (README 8, agent-team-files.html 26, agent-team-guide.html 1, decisions-pane 5, scripts\install.ps1 2,
  explain-clearly 1).
- Hash list of not-mine trees: scratchpad `hash-before.txt` (80 rows); `git status --short`: 133 rows (`git-status-before.txt`).

## Spike (2026-10-27 15:30, Node v24.13.0)

- `fs.realpathSync` (JS) resolves a junction (lstat says isSymbolicLink true) and gives the drive letter upper case.
- A script run through a junction sees the REAL path in `import.meta.url` (Node resolves the main module); with
  `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` it keeps the junction path. So a caller-side junction test
  needs those options, or it cannot catch a missing realpath.
- `fs.rmdirSync(junction)` removes only the link; the target stays.
- Chose `fs.realpathSync` over `.native`: native also turns a mapped drive into its UNC path, which would no longer match
  repo roots spelled with the drive letter.

## Point 2 contract as built

- `lib\pc-settings.mjs`: `commitInRepos(config, {skillDir?, warn?})`, `defaultCommitInRepos(skillDir?)`.
- File: `requireStatePath(config, 'pcSettings.file')` = `<teamState.folder>\pc-settings.json` (new setting `pcSettings.file`).
- Missing file (ENOENT) or missing `register` / `register.commitInRepos` -> default, silent.
- Not readable (other error), not JSON, not an object, `register` not an object, value not a list of strings (null too)
  -> default + one stderr line: `PC SETTINGS NOT USED | <file> <problem>. register.commitInRepos is the default: <patterns>. Fix the file or delete it.`
- `[]` is a value (nothing commits). BOM stripped.
- Default: `[path.join(dirname(dirname(realpath(skillDir))), '*')]`; skillDir defaults to the lib's own skill folder.
- `orchestration.config.json`: `register.commitInRepos` removed; `_whyCommitInRepos` says where it comes from; new
  section `pcSettings` { file, _whyFile }.
- Tests: new `tests\lib\pc-settings.test.mjs` (13); `register.test.mjs` +3 caller-side tests (default via a copy at
  `<base>\Apps\sda`, broken file on stderr, junction with preserve-symlinks), the matching-repo test now uses a
  pc-settings file, and every script run there gets a scratch USERPROFILE whose pc-settings says `[]` (hermetic: a
  scratch repo under %TEMP% is a client repo wherever the clone lies). Three lib test files: config gains teamState +
  pcSettings, `commitInRepos: []` dropped.
- RED seen at 15:31: module missing; 3 of the CLI tests failed. GREEN 15:33: focused 5 files 118 pass 0 fail.

## Plan

1. Baseline: Node suite, PS suite, hash list of not-mine trees, search count.
2. Point 2 first (code, TDD): `commitInRepos` from `<teamState.folder>\pc-settings.json`, else `[<parent of real REPO>\*]`.
3. Mutation check on point 2 (>= 8 mutants).
4. Point 1: every fixed REPO path through the repo link; `install.ps1` -> `init.ps1`.
5. Small: section 11 of `agents\software-developer.md` vs `windows-pitfalls`.
6. Invariant: search count, commitInRepos before/after, copy-elsewhere suite run.

## Done

- 15:33 point 2 code + tests (above). Mutation run started 15:35 (scratchpad `mutate.mjs`, 16 mutants, log `mutate.log`;
  control 43 tests pass).
- 15:37 small task: the six section-11 traps were NOT in windows-pitfalls (robocopy only as `/MOVE /E /XJ`; the `.cmd`
  shim entry only for `&`). Added all six: 4 to `windows-pitfalls\references\shells.md`, 2 to `files-and-links.md`,
  plus one new trap found this run (`$x = if (...) { , $list }` unrolls again). Table rows in `windows-pitfalls\SKILL.md`
  updated. Section 11 of `agents\software-developer.md` is now six one-line pointers, heading "Machine traps, now in
  `windows-pitfalls`".
- Point 1 replacement script ready: scratchpad `point1.ps1` (dry run: all counts match, 12 files). Applying after the
  mutation run, so its copies are not taken mid-write.

## Point 1: lines kept on purpose (search hits that stay)

- Fixtures standing for "a path": `tests\limit-scripts.tests.ps1` 108, 739, 1791, 1797, 1897, 1914, 1953, 2078, 2079,
  2084, 2086 (11); `tests\lib\git-repo.test.mjs` 107-113 (7); `windows-pitfalls\references\shells.md` 8 (a trap's
  example text).
- Naming another repo on purpose: `agents\software-developer.md` 3 (xpp-agent's worker types); `references\worker-rules.md`
  4 and `references\usage-limits.md` 118 (xpp-agent as the example project); `scripts\run-heavy.ps1` 36 and
  `orchestration.config.json` `_whyHolderFolder` (the mutex name `xpp-agent-heavy-command-slot-` shared with
  xpp-agent's own run-heavy, so both take turns).

## Results

- 15:49 mutation check: **16 of 16 caught**, every mutant loaded (43 tests each, control 43 pass). Log in scratchpad
  `mutate.log`; scratch copy removed.
- 15:41 point1.ps1 applied (12 files, all counts as planned); `pc-settings.mjs` header and config `_whyCommitInRepos`
  example changed to `D:\Work`. Search in my files: 53 lines before, 24 after, all 24 on the kept list above.
- 15:40 commitInRepo before/after on this PC: patterns `["C:\\Repos\\My projects\\*"]` both; REPO true/true, scratch git
  repo in %TEMP% false/false: **0 differences on 2**.
- 15:50 not-mine trees: 0 hash differences on 80 files. git status: new entries only mine (pc-settings.mjs, its test,
  git-repo.mjs, lessons.md, start-messages.md, migrate test now M) and S3b1's (scripts\init*.ps1, install.ps1 deleted).
- 15:50 started in the background through run-heavy: Node suite in place (`node-after.log`), copy-elsewhere
  (`invariant.mjs --copy`, `invariant-copy.log`), PS suite (`ps-after.log`).

## Hand-off (2026-10-27 15:56, stopped for the usage limit: STOP FOR LIMIT, weekly limit at 98%)

### Done and checked (after the last change, 15:41)

- Point 2 (per-PC settings file): built and tested as described in "Point 2 contract as built". Mutation check 16 of
  16 caught.
- Point 1 (paths through the repo link): applied; search over my files 53 -> 24 lines, all 24 on the kept list.
- Small task (section 11 -> windows-pitfalls): done, see "Done" above.
- Node suite in place after all changes (15:50-15:54, through run-heavy): **277 pass, 0 fail** (261 baseline + 13 in
  `pc-settings.test.mjs` + 3 new in `register.test.mjs`). Log: scratchpad `node-after.log`.
- Copy-elsewhere run (`invariant.mjs --copy`, copy at `%TEMP%\sda-anywhere\x\orchestrate-agents`): **277 pass, 0 fail**,
  same count as in place; copy removed (checked: `copy removed: true`).
- commitInRepo before/after: 0 differences on 2 (REPO true/true, scratch git repo in %TEMP% false/false); the pattern
  list is `["C:\\Repos\\My projects\\*"]` before and after.
- Not-mine trees: 0 hash differences on 80 files.

### Open finding for the lead (QUESTION)

- In the copy, the default came out `C:\Users\user\AppData\Local\Temp\sda-anywhere\*`; the task's invariant says it
  should be `%TEMP%\sda-anywhere\x\*`. The code follows the contract (section 2: `<parent folder of REPO>\*`, REPO = the
  folder that holds `orchestrate-agents`): REPO there is `...\sda-anywhere\x`, its parent `...\sda-anywhere`. The
  task's number is REPO itself, one level off, and would give `C:\Repos\My projects\software-developer-agent\*` on this
  PC instead of today's `C:\Repos\My projects\*`. Recommendation: keep the contract; the task line is a slip.

### On disk but unchecked

- PowerShell suite after the changes: NOT run to the end. It was queued third in background task `bscwpf1pq`, which
  ends when this run ends. My only `.ps1` edits are comments (`scripts\watch-usage-and-context.ps1` line 43 usage
  line, `scripts\start-session-in-vscode.ps1` line 199 example title). If a killed run left `oa-*` folders in %TEMP%,
  they are the suite's own scratch folders.

### Left to do (exact next steps)

1. Run the PS suite: in `C:\Repos\My projects\software-developer-agent\orchestrate-agents`,
   `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command "pwsh -NoProfile -File tests\limit-scripts.tests.ps1 *> '<scratch>\ps-after.log'"`;
   want 122 passed, 0 failed (baseline 122).
2. Write the report `WF\SELF_CONTAINED_S3A_REPORT_CLAUDE.md` from this file. Its block:
   - DECISIONS TAKEN: the file name is a new setting `pcSettings.file` (`pc-settings.json`) read with requireStatePath,
     not a constant, so every team file stays a setting under teamState.folder (the init script should read the same
     setting); `fs.realpathSync` (JS), not `.native`, so a mapped drive is not turned into a UNC path; a broken file
     (unreadable, bad JSON, wrong shape, null value) gives the default plus one stderr line `PC SETTINGS NOT USED | ...`,
     a missing file or key gives the default silently, `[]` is a value; the file is read only, never written.
   - INITIATIVES: `register.test.mjs` runs every script with a scratch USERPROFILE whose pc-settings says `[]`
     (hermetic: else a clone whose parent holds %TEMP% would fail 4 client-repo tests); comment examples changed to
     neutral `D:\Work` / `demo` in `lib\git-repo.mjs` 96, `hooks\decision-reminder.mjs` 40,
     `scripts\start-session-in-vscode.ps1` 199; new trap entry in `windows-pitfalls\references\shells.md`
     (`$x = if (...) { , $list }` unrolls again); table rows in `windows-pitfalls\SKILL.md` extended.
   - ISSUES FOUND: task invariant vs contract (above); not-mine files still to change for S5/S3b: `agent-team-files.html`
     line 1015 shows `register.commitInRepos` = `C:\Repos\My projects\*` in `lib\decision-register.mjs` (now
     `pcSettings` + `lib\pc-settings.mjs`, value from `<teamState.folder>\pc-settings.json`), `README.md` 60 names the
     skills path `C:\Repos\My projects\software-developer-agent\skills\` (now `~\.claude\software-developer-agent\skills\`)
     and 38/45/72 name `install.ps1`; the init script must write the file at `<teamState.folder>\<pcSettings.file>`;
     trap: `$x = if (...) { , $list }` flattens a one-row list again -> assign inside the branches (any Windows PC).
   - QUESTIONS: the copy default (above).
3. Final message: `WORKER DONE | S3a | report: <report path>`.

### Files I own (changed this run)

`orchestrate-agents\lib\pc-settings.mjs` (new), `orchestrate-agents\lib\decision-register.mjs` (import, JSDoc, one line
in registerLocation), `orchestrate-agents\lib\git-repo.mjs` (comment), `orchestrate-agents\hooks\decision-reminder.mjs`
(comment), `orchestrate-agents\orchestration.config.json` (`pcSettings` section; `register.commitInRepos` removed;
`_whyCommitInRepos`), `orchestrate-agents\tests\lib\pc-settings.test.mjs` (new), `tests\lib\decision-register.test.mjs`,
`tests\lib\decision-register-points.test.mjs`, `tests\lib\decision-register-migrate.test.mjs`,
`tests\scripts\register.test.mjs`, `orchestrate-agents\SKILL.md`, `references\worker-rules.md`, `references\usage-limits.md`,
`references\start-messages.md`, `references\lessons.md`, `scripts\watch-usage-and-context.ps1` (comment),
`scripts\start-session-in-vscode.ps1` (comment), `agents\software-developer.md` (line 23, section 11),
`agents\task-lead.md`, `team-switch\SKILL.md`, `windows-pitfalls\SKILL.md`, `windows-pitfalls\references\shells.md`,
`windows-pitfalls\references\files-and-links.md`. Scratch scripts and logs stay in my scratchpad
(`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\`).
Nothing committed.
