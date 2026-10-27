# STATE_FOLDER: summary for the main session

Task: "the team's state in one folder" (D-36, D-39) and the /clear note (D-35). Lead file:
`STATE_FOLDER_LEAD_CLAUDE.md`. Written 2026-10-27, after the lead's final check (times below read from the clock).

## Outcome

Built and tested; NOT live yet. Nothing in the live `orchestrate-agents\` was changed by this task. The new code sits
in a staged copy, `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`, merged with every live change up to 14:00.
The switch-over is one script you run (steps below). The pane's change is already in its source and goes live at
`/reload-plugins`.

## What is different once the switch-over has run (by effect)

- **Every file the team writes for itself is under one folder**, `C:\Users\user\.claude\state\software-developer-agent\`
  (setting `teamState.folder`, one line in `orchestration.config.json`; the user's choice, D-36 and D-39):

  | Child folder | Holds | Was |
  | --- | --- | --- |
  | `team-on\` | one mark per switched-on chat | `%TEMP%\claude-agent-team-on\` |
  | `context-guard\` | size warnings sent, per agent, and their locks | `%TEMP%\claude-context-guard\` |
  | `usage-reading\usage-limits.json` | the last usage reading | `~\.claude\state\usage-limits.json` |
  | `usage-probe\` | the probe's empty working folder | `%TEMP%\claude-usage-probe\` |
  | `usage-watch\` | the Usage and context watch's `<id>.txt` and `<id>.decision.json` | `%TEMP%\claude-session-watch-<id>.*` (fixed in code before) |
  | `heavy-commands\slot-<n>.txt` | who holds a heavy-command slot | `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt` (fixed in code before) |
  | `logs\` | `relaunch.log`, `limit-stop.log` | `~\.claude\state\` |

  Example: this chat's mark moves from `%TEMP%\claude-agent-team-on\56c67d3d-...` to
  `...\software-developer-agent\team-on\56c67d3d-...`.
- **Every child setting is a path under the root**, checked the same way in Node, in each of the four PowerShell
  scripts that need it, and in the pane: no drive, no `\` at either end, no `/`, no `* ? " < > | %`, no empty, `.` or
  `..` part. A child can never point outside the root; only `teamState.folder` may name a variable. Example: a wrong
  `usageAndContextWatch.recordFolder` of `..\records` stops the watch at its start with
  `orchestration.config.json setting 'usageAndContextWatch.recordFolder' must be a path under 'teamState.folder' but has a '.' or '..' part: "..\\records"`.
- **What stays outside, by design** (D-39, accepted): the register's `decisions\.lock` and the short-lived temp file
  beside each safe save; the in-memory lock `xpp-agent-heavy-command-slot-<n>` (its name is unchanged, so an old and a
  new run-heavy still exclude each other); the test suites' own scratch folders in `%TEMP%`; Claude Code's own files;
  `~\.claude\state\mcp-discover-verdicts.json` (another tool's).
- **The Decisions pane** looks for the mark at `<teamState.folder>\<agentTeam.onFolder>\<session id>`. It fills in
  `%USERPROFILE%`, `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%` and `%APPDATA%`, in any letter case (D-54, the user chose A; the
  engine lets a mod read a variable only by a name written in its code). Example: `%LocalAppData%\agent-team` gives
  `C:\Users\user\AppData\Local\agent-team\team-on\<id>`; `%PROGRAMDATA%\agent-team` hides the tab. The setting's note
  in the config says so.
- **The guide pages** (`agent-team-files.html`, `references\agent-team-guide.html` in the copy) carry the /clear note
  (D-35, quoting `team-switch\SKILL.md` lines 11-13), the new folder everywhere, "six junctions" (install.ps1 makes 6),
  and the corrected `misc\handovers\` lines (D-53). The copy's `SKILL.md`, `references\usage-limits.md` and the repo's
  `README.md` name the new folder.

## Your switch-over steps, in order (exact commands)

`$wf` = `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

1. Make sure no hand-over is running. Stop this chat's two watches (Usage and context watch, Decision answers watch)
   by their task ids.
2. Dry run (writes nothing):
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1'`
   Expect no `CUTOVER REFUSED` line and a last line `CUTOVER DRY RUN | <n> state files and 21 code files to copy, ...`.
   - A `CUTOVER REFUSED | ... running watch ...` naming another chat's session: that chat's watch must be stopped
     first (the user's), and started again after step 6.
   - A conflict line (the live folder changed after 14:00 in a file we also changed): stop, and have a lead re-base it
     the way run S6 did (`STATE_FOLDER_S6_TASK_CLAUDE.md`, point 1). A live-only change in a file we did not touch
     needs nothing: the script leaves it alone.
3. D-51 (the user chose A): cut the test lines out of the real log, BEFORE step 4:
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_TRIM_LOG_CLAUDE.ps1'`
   Expect `TRIM DONE | ...: 11409 -> 841 bytes; 60 test lines removed, 0 later lines kept`. It refuses if the first
   841 bytes do not hash to `021D5EE3...F6DE`.
4. `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1' -Apply`
   It copies the old state first (bytes and write times kept), then the 21 code files in the measured silent order
   (config, `lib\config.mjs`, other libraries, the rest, `lib\agent-team.mjs` last). Expect `CUTOVER DONE | <n> state
   files, 21 code files` and `NEXT | ...` lines. Exit 2 means it stopped part-way: run `-Apply` again (matching files
   are skipped).
5. `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\team-on.mjs'`
   Expect `AGENT TEAM ON | session <id> | C:\Users\user\.claude\state\software-developer-agent\team-on\<id>`.
6. Start both watches again, PowerShell tool, `run_in_background`, these descriptions:
   - `Usage and context watch`: `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1'`
   - `Decision answers watch`: `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1'`
7. `/reload-plugins` (brings in this task's pane change and the other lead's F2). The Decisions tab should show again
   in this chat while an entry waits.
8. Check: the mark exists under `...\software-developer-agent\team-on\`; within about 15 minutes the watch's probe
   rewrites `...\software-developer-agent\usage-reading\usage-limits.json` with a newer `checkedAt`; a size warning, when
   one comes, leaves a file in `...\software-developer-agent\context-guard\`.
9. When step 8 holds, remove the old copies (only where the new copy is identical; it keeps and names the rest):
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1' -RemoveOld`
   Then the probe's old empty folder, which `-RemoveOld` leaves alone:
   `$p = Join-Path ([IO.Path]::GetTempPath()) 'claude-usage-probe'; if ((Test-Path -LiteralPath $p) -and -not (Get-ChildItem -LiteralPath $p -Force)) { [IO.Directory]::Delete($p) }`
10. Remove the note that is false once the switch-over is done, `agent-team-files.html` lines 981-983, exactly:
    ```
          <li><span class="flag flag-new">new</span>The team's state folder (D-36, D-39) was written into this page on
            2026-10-27, while the code was being changed to it in a staged copy. Until that change goes live, the files
            are still in the old places (see "The move" under Every file).</li>
    ```
11. Before any commit, delete the staged copy and its base list: `...\stage-2\STATE_FOLDER_STAGING\` and
    `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt` (both were only the vehicle; never commit them). Optional:
    S6's undo backup in this session's scratchpad,
    `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\s6\backup\`.

Between now and step 7: a NEW chat already runs the new pane (the pane is read from the repo folder) and shows no
Decisions tab with today's live settings. A chat switched on during the milliseconds of step 4 gets its mark only in
the old place and needs `/software-developer-agent` again.

## Text for files only you edit

None. No file outside the two repos names an old place (the sweep covered `~\.claude\skills`, the xpp-agent skills,
`~\.claude\CLAUDE.md`, `settings.json`; S5 confirmed). The hooks' paths in `settings.json` do not change.

## What was checked, and how

The lead's own final check (14:15 to 14:43), on the merged staged copy, through run-heavy where heavy:
- Three-way state (base / live / staged, by hash): 21 of our changes, 26 untouched, 0 live-only, 0 conflicts.
- Node suite 261 of 261 (live's 244 + our 17); PowerShell suite 122 of 122; switch-over tests 26 of 26
  (logs `STATE_FOLDER_S6_LOGS\lead-final-*.log`).
- Real dry run, after S7's last change (14:43): `CUTOVER DRY RUN | 34 state files and 21 code files to copy, 0 already
  the same; nothing written; -Apply would refuse for 1 reasons`. The one reason is this chat's own running Usage and
  context watch (PID 12880), which step 1 stops. `relaunch.log` is planned. 0 conflicts.
- Pane: S7's final run 14:41, read by the lead: 150 of 150, validate passed, type-check exit 0; only S7's five pane
  files changed after 14:20; `decisions.ts` and `pane.tsx` untouched.
- The real root `C:\Users\user\.claude\state\software-developer-agent` does not exist (14:43): nothing went live.
- The real `limit-stop.log` is still 11409 bytes, waiting for step 3.

Per run (each worker's own counts, re-run by the lead where marked):
- S1 Node side: 0 differences on 3; 0 refused of 3 real marks and 25 real guard marks; mutation 17/17.
- S2 usage side: 0 differences on 3; the real reading parses; 0 refused of 6 real watch files; 50-case rule table, 0
  differences Node vs PowerShell. The probe sets `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`, so running under `~\.claude`
  loads no CLAUDE.md (read from the engine, no model call made).
- S3a: 0 differences on 2; the four PowerShell copies of the rule identical; 53-case table; mutation 21/21 (S2's
  rules included). Run-heavy's tests take no real lock (`-WaitMinutes 0`).
- S3b switch-over script: 26/26 cases, mutation 22/22; the hooks' behaviour in every mixed state measured.
- S4 pane: parity with the team's code 0 differences on 3 real sessions, 82/82 cases agree; mutation 9/9.
- S5 pages: 110 places, 110 true; quote 0 differences on 2; tags balanced, SVGs parse, LF kept.
- S7 pane variables: 150/150, mutation 10/10, parity with the team's code 0 differences on 43 (3 cases differ on the
  safe side: the pane gives no marker where the team gives a path).
- S6 merged whole: re-based on live (5 live-only files, 2 conflicts merged by hand, each proven by reconstructing the
  base hash); Node 261/261, PowerShell 122/122, switch-over tests 26/26, pane 136/136 + validate + type-check; real dry
  run wrote nothing (161 snapshot lines), 21 code files, 0 conflicts; pages vs final config 0 differences on 27.
- Throughout: the real root never existed before the switch-over; no test wrote a real place after S1's slip (D-51).

Not checked, and why:
- The switch-over itself and the new code running live: that is your step; the dry run is the nearest check.
- A real usage probe from the new folder: one tiny model call; the engine reading answered the only question.
- A real relaunch (tests use `-DryRun`), and run-heavy's holder line while an old run-heavy holds a slot (harmless:
  each shows "holder unknown" for the other until the switch-over).
- Resume of a chat inside VS Code (D-35's caveat; the pages say so under "Still open").
- The pages at phone width (D-53: the user chose to leave the width).

## Register

- D-39 initiative (layout, what stays outside): closed, A (11:00).
- D-51 issue (60 test lines in the real limit-stop log): closed, A; step 3 above.
- D-52 initiative (six page additions): closed, A (12:58).
- D-53 issue (pages too wide on a phone; stale `misc\handovers\` lines): closed, A; lines fixed in S3a.
- D-54 question (pane fills in only `%USERPROFILE%`): closed, A (14:22); built in run S7.
- None open from this task.

## What the next task must know

- The rule lives in six places that must stay in step: `lib\config.mjs` `requireStatePath`; `Get-StatePath`,
  `Get-RequiredSetting`, `Get-StatePathFault` in `usage-probe.ps1`, `watch-usage-and-context.ps1`,
  `start-session-in-vscode.ps1`, `run-heavy.ps1` (a suite case checks the four copies are identical); the pane's
  `team-on.ts`. The 53-case table in `tests\limit-scripts.tests.ps1` pins Node and PowerShell together.
- Tests point the root at scratch three ways: a scratch `teamState.folder` in in-process settings; `makeSkillCopy`
  defaults every copy's root to `<parentDir>\state`; `USERPROFILE`/`TEMP`/`TMP` on scratch for the test process and
  every child.
- Lesson (S1, S2): a red phase for path code runs the OLD code with the new tests and can write real places; run it in
  a scratch copy.
- The probe's `Get-ProjectFolderName` lacks Claude Code's 200-character cut: only matters if the root moves to a path
  over about 190 characters AND Claude Code lacks `--no-session-persistence`.
- Two of the child rules ("is empty", "starts or ends with `\` or `/`") never decide a result alone; they only give a
  clearer message (S4).
- Not yet seen on the real engine: that `$.env.get` gives the pane the same values Node's `process.env` gives (S4, S7).
  The Decisions tab coming back after step 7 shows it for `%USERPROFILE%`.
- A pane suite run while free memory is near 500 MB can fail with 5000 ms timeouts; the rerun passed (S7).
- The root rule checks only the start of the root: `C:\%TMP%` with TMP = `D:\tmp` would give `C:\D:\tmp`. Contrived;
  the pane and the team agree on it (S7).
- Claude Code's own old folder `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-usage-probe` stays; the new
  probe would make `C--Users-user--claude-state-software-developer-agent-usage-probe` only on an old Claude Code.

## Files changed by this task (git status and hash lists, 14:15)

- In this repo, product files: none in the live `orchestrate-agents\` (live = base list on every file of ours; the
  M lines git shows there are older uncommitted work and the other lead's). In the staged copy, 21 files go live at
  step 4: `orchestration.config.json`, `SKILL.md`, `hooks\context-guard.mjs`, `lib\config.mjs`, `lib\agent-team.mjs`,
  `lib\limit-stop.mjs`, `scripts\team-on.mjs`, `scripts\limit-stop-server.mjs`, `scripts\usage-probe.ps1`,
  `scripts\watch-usage-and-context.ps1`, `scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`,
  `references\agent-team-guide.html`, `references\usage-limits.md`, `tests\helpers\scratch.mjs`,
  `tests\hooks\context-guard.test.mjs`, `tests\hooks\decision-reminder.test.mjs`, `tests\lib\agent-team.test.mjs`,
  new `tests\lib\state-path.test.mjs`, `tests\scripts\limit-stop-server.test.mjs`, `tests\limit-scripts.tests.ps1`.
- In this repo, in place: `agent-team-files.html` (S5, S3a), `README.md` (S5, lines 55-57).
- Working files: `misc\implementation\agent-team\stage-2\STATE_FOLDER_*` (lead file, task/progress/report files of
  S1 to S6, the sweep, the three scripts, logs folders), rows in `STATUS_CLAUDE.md` and `SIZES_CLAUDE.md`,
  `entry.json`.
- In `claude-code-extensions` (S4, S7): `decisions-pane\hooks\team-on.ts`, `hooks\team-switch.ts`,
  `tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts` (S4 only),
  `README.md` (git shows them with the other lead's F2 files and earlier uncommitted pane work).
- The staged config's `teamState._whyFolder` got one sentence from S7 (the five variables the pane fills in).
- Register: D-39, D-51, D-52, D-53, D-54 added through `register.mjs`.

## Runs: size, tool calls, minutes

| Run | k tokens | Calls | Minutes |
| --- | --- | --- | --- |
| sweep (code-searcher) | 300 | 25 | 14 |
| S1 staging + root + Node side | 320 | 150 | 35 |
| S2 usage side (PowerShell) | 341 | 131 | 40 |
| S5 docs | 298 | 153 | 18 |
| S3b switch-over script | 304 | 90 | 30 |
| S3a relaunch log, slots, `%`, mutation | 330 | 145 | 57 |
| S4 pane | 275 | 107 | 40 |
| S6 re-base + merged check | 208 | 87 | 19 |
| S7 pane: four more folder variables | 208 | 78 | 20 |
