# STATE_FOLDER: lead file

Task lead for "the team's state in one folder" (D-36) and the /clear note (D-35). Started 2026-10-27 10:27 by the
main session (id `main`). Working folder: `misc\implementation\agent-team\stage-2\`, my files prefixed `STATE_FOLDER_`.

## For a successor: read this, and only this

1. This repo's `CLAUDE.md`; `AGENT_TEAM_STAGE_2_LEAD_BRIEF_CLAUDE.md` (whole, short).
2. `STATE_FOLDER_START_CLAUDE.md` (the task), then this file whole.
3. `SIZES_CLAUDE.md` and `STATUS_CLAUDE.md` (last rows).
4. Skip: `STATE_FOLDER_SWEEP_CLAUDE.md` (77 KB; it is the workers' input, read it by range only when needed),
   every `P*_` and `R*_` file, the guide pages.

## The user's words (they win over everything below)

- D-36, 2026-10-27, closed by the main session at 10:41: "Chose A: move every team file now under %TEMP% (the switch
  markers, the size guard's markers, the watch's records) into one folder beside the team's logs,
  ~\.claude\state\agent-team\, so all of the team's state is in one place no cleanup touches (one run: settings,
  hooks, scripts, the pane's copy of the rule, tests, the guide pages). Comment: yes but create a parent dir for the
  developer agent, and then child dirs for each temp file type". The main session's reading: parent folder
  `%USERPROFILE%\.claude\state\software-developer-agent\`, still one setting; one child folder per kind of file;
  every file the team writes for itself goes in a child folder, including the three now loose in `~\.claude\state\`.
- Earlier, D-36's first text: "well i want all temp files related to this agent in the same place".
- D-35 (closed, A): "keep it as it is and say it in the two guide pages and in the /software-developer-agent
  command's text: after /clear, type /software-developer-agent again". The command's text is done (main session,
  10:30, `team-switch\SKILL.md` lines 11-13; quote, do not reword).
- Main session, 10:4x: the guide-page run also fixes `agent-team-files.html`, which says `scripts\install.ps1` makes
  "five junctions" (about lines 206, 338, 369, 397, 445, 572, 792); the README says six (the switch added
  `~\.claude\skills\software-developer-agent` -> `team-switch\`). Check `install.ps1` for the true count; no entry.

## Baselines

- Node suite in `orchestrate-agents\`: 229 of 229 (main session, 10:27).
- PowerShell `tests\limit-scripts.tests.ps1`: 105 of 105 (main session, 10:38; ran 4:06, peak 627 MB).
- Pane tests (`claude-code-extensions\decisions-pane`): 107 of 107 (previous main session, 09:34; re-verify).
- Nothing committed since 10abe9f (here) and b6d7deb (claude-code-extensions). Never commit.

## The layout (my decision, registered for the user as D-39 at 10:53)

Root: `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent` (one new setting). Every other
setting below is a path RELATIVE to the root: plain names joined by `\`, no drive, no leading or trailing `\`, no `.`
or `..` part, none of `: * ? " < > |`. A child can never point outside the root.

| Kind | Old place | New place | Setting (value) |
| --- | --- | --- | --- |
| switch-on marks | `%TEMP%\claude-agent-team-on\<session id>` | `<root>\team-on\<session id>` | `agentTeam.onFolder` (`team-on`) |
| size guard marks + their locks | `%TEMP%\claude-context-guard\<agent id>.json`, `.lock` | `<root>\context-guard\` | `contextGuard.markerFolder` (`context-guard`) |
| usage reading | `~\.claude\state\usage-limits.json` | `<root>\usage-reading\usage-limits.json` | `usageLimits.stateFile` (`usage-reading\usage-limits.json`) |
| the probe's empty folder | `%TEMP%\claude-usage-probe\` | `<root>\usage-probe\` | `usageLimits.probeWorkingFolder` (`usage-probe`) |
| Usage and context watch records | `%TEMP%\claude-session-watch-<id>.txt`, `.decision.json` (fixed in code today) | `<root>\usage-watch\<id>.txt`, `<id>.decision.json` | NEW `usageAndContextWatch.recordFolder` (`usage-watch`) |
| heavy-command slot holders | `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt` (fixed in code) | `<root>\heavy-commands\slot-<n>.txt` | NEW `runHeavy.holderFolder` (`heavy-commands`) |
| logs | `~\.claude\state\relaunch.log`, `limit-stop.log` | `<root>\logs\relaunch.log`, `limit-stop.log` | `relaunch.logFile` (`logs\relaunch.log`), `limitStop.logFile` (`logs\limit-stop.log`) |

What stays where it is, and why (in D-39 too):
- `decisions\.lock` and the `.<name>.<pid>.tmp` file beside each atomic write: each must sit beside the file it
  guards or replaces (a rename works only inside one folder; the lock guards one repo's register). Milliseconds.
- The named lock (mutex) `xpp-agent-heavy-command-slot-<n>`: in memory, no file. Its name stays, so an old and a new
  run-heavy still exclude each other. Only the holder `.txt` files move.
- Test scratch folders (`%TEMP%\oa-*`, `%TEMP%\limit-scripts-tests-*`): the suites make and delete them.
- Claude Code's own files (transcripts, `%TEMP%\claude\`, `~\.claude.json`), and
  `~\.claude\state\mcp-discover-verdicts.json`, which is not the team's (written 10:08 today by another tool).
- The old folder `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-usage-probe` is Claude Code's (from a
  version without `--no-session-persistence`); left alone.

Only this repo's `run-heavy.ps1` writes the slot holder (searched `C:\Repos\My projects`, 10:47): no other copy.

## How the change goes live: staging, then one cut-over

`orchestrate-agents\` is live (junction + `settings.json` hooks): every save reaches every session. The moment the
switch-on lookup moves, every switched-on chat's hooks fall silent until a mark exists in the new folder. So:

- All `orchestrate-agents\` work is built in a STAGED COPY:
  `misc\implementation\agent-team\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`, made by S1 from the live folder
  (no links inside, checked 10:49; no node_modules), with a base hash list
  `STATE_FOLDER_STAGING_BASE_CLAUDE.txt` (relative path + SHA256 of every live file at copy time). Tests run in the
  copy. The live folder is not touched by any worker.
- Repo-root docs (`agent-team-files.html`, `README.md`) are not live: edited in place (S5).
- The pane (other repo) changes only at `/reload-plugins` (main session): edited in place, as late as possible (S4),
  so a pane reload before the cut-over cannot close the Decisions tab for long.
- The cut-over is one script (S3 writes and tests it on scratch; the main session runs it): refuse if any live file
  differs from the base list, or a limit-stop pipe is open; copy the OLD state into the new folders FIRST (marks,
  guard marks, usage reading, logs, decision records), then the staged files into the live folder; report. A
  separate `-RemoveOld` pass deletes an old file only when its copy is byte-identical. Then the main session runs
  `team-on.mjs`, restarts both watches, `/reload-plugins`, and deletes the staging folder.
- Old marks are copied, not moved, so old code still finds them until the code switch; no fallback reading of old
  places is built into the product code (the user wants one place).

## Runs

| Run | What | Depends on | Files (all `orchestrate-agents\` paths are in the STAGED copy) | State |
| --- | --- | --- | --- | --- |
| S1 | Staging + root setting + Node resolver; switch-on marks, guard marks, limit-stop.log (Node side); Node tests; mutation of the resolver | - | staged `orchestration.config.json` (whole new shape, PS keys too), `lib\config.mjs`, `lib\agent-team.mjs`, `scripts\team-on.mjs`, `hooks\context-guard.mjs`, `lib\limit-stop.mjs`, `scripts\limit-stop-server.mjs`, Node tests | planned |
| S2 | PowerShell side 1: usage reading, probe folder, watch records; PS tests; the probe-under-`~\.claude` check | S1 | staged `scripts\usage-probe.ps1`, `scripts\watch-usage-and-context.ps1`, `tests\limit-scripts.tests.ps1` | planned |
| S4 | Pane: `team-on.ts`, `team-switch.ts`, tests, README; mutation | S1 (contract) | `claude-code-extensions\decisions-pane\` only | planned (beside S2) |
| S3 | PowerShell side 2: relaunch.log, run-heavy holders; the cut-over script, tested on scratch; PS mutation | S2 | staged `scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`, `tests\limit-scripts.tests.ps1`; `STATE_FOLDER_CUTOVER_CLAUDE.ps1` | planned |
| S5 | Docs: /clear note (D-35) + new folder in both guide pages, the five/six junctions fix, staged `SKILL.md` and `references\`, `README.md` | S1 names | staged `SKILL.md`, `references\*`; repo-root `agent-team-files.html`, `README.md` | planned (beside S3) |

Why cut this way: S1 fixes the contract every other run matches (config keys, the relative-path rule, the error
text), so it runs alone. The PowerShell side is big (`watch-usage-and-context.ps1` 48 KB, its test file 149 KB, 4+
minutes per suite run), so it is two runs. The pane is another repo and only needs the contract. Docs need only the
names. At most two workers at once, disjoint files; S2 and S3 both edit the PS test file, so they never overlap.

## Decisions (with reasons)

- Staging copy instead of editing live: see above. A dual-read of old places in product code was the other choice;
  rejected because it leaves dead code and the user wants one place.
- Child settings are relative to the root and checked: "another place costs one line", and nothing can escape the
  root.
- Key names kept where they exist (`agentTeam.onFolder` etc.), meaning changed from "under %TEMP%" to "under the
  root": the pane already reads `agentTeam.onFolder`; fewer renames.
- Watch records and slot holders get settings (today fixed in code), so every place is in the config.
- Tests must point the root at scratch. Invariant for every run: the real root
  `C:\Users\user\.claude\state\software-developer-agent` does not exist before the cut-over; it must still not exist
  after every test run. (It exists only after the main session's cut-over.)
- Real probe calls: S2 may make at most two (one tiny Haiku call each, as the watch makes every 15 minutes) only if
  no 0-model-turn way shows whether `~\.claude\CLAUDE.md` is loaded twice when the probe runs under `~\.claude\`.

## Register

- D-39 (initiative, medium, not blocking), added 10:53: the layout, what stays outside it, old copies deleted only where identical. Meanwhile: build with this layout.
  - 10:52 the user asked (not settling it): "Other: i though the prent folder w be in the TEMP folder on machine?".
    Main session followed up (Storage Sense on this PC deletes unused temp files; `.claude\state` recommended) and
    held the cut-over and any delete of old copies until the answer.
  - 11:00 the user: "Chose A: keep these names and this split (no extra work)." Main session reads it as the entry as
    proposed, parent included: `C:\Users\user\.claude\state\software-developer-agent\`. D-39 CLOSED, accepted. Hold
    lifted; the cut-over steps still go to the main session in the summary.

## Workers

| Run | Agent id | Started | Task file | Progress file | State |
| --- | --- | --- | --- | --- | --- |
| S1 | aff09106e9a9984aa | 10:52 | `STATE_FOLDER_S1_TASK_CLAUDE.md` | `STATE_FOLDER_S1_PROGRESS_CLAUDE.md` | done 11:27; 320k, 150 calls, 35 min; lead check below |

## S1 result (report `STATE_FOLDER_S1_REPORT_CLAUDE.md`)

- Built in the staged copy: `requireStatePath(config, keyPath)` in `lib\config.mjs` (root checked first; error
  texts in the report, lines 38-53); team-on marks, guard marks + locks, limit-stop log under the root. Config:
  `teamState` first section; `onFolder` `team-on`, `markerFolder` `context-guard`, `limitStop.logFile`
  `logs\limit-stop.log`. Test seams: scratch root in settings; `makeSkillCopy` defaults every copy's root to
  `<parentDir>\state`; `USERPROFILE` for the real skill folder (`stateRootUnderHome`). One PS test fix
  (`New-ServerCopy`, line 1338). Node 244/244, PS 105/105, invariant 0/3, 0 refused of 3 + 25, mutation 17/17.
- Lead check 11:3x: live folder vs base: only `SKILL.md` differs (main session, 11:08:50, D-40 lines). Real root
  absent. Contract spot-checked (`lib\config.mjs` lines 13-29, 133; config lines 4-5, 113, 122, 129). Suites re-run by
  me: see below.
- Issue: S1's red phase wrote 60 test lines into the real `~\.claude\state\limit-stop.log` (841 -> 11409 bytes; the
  first 841 bytes' SHA256 `021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE`). Registered D-51 (low):
  A = the main session cuts it back to 841 bytes at the cut-over, before the copy. Lesson passed to S2/S3: red phases
  run in a scratch copy.
- D-51 answered 11:35, the user: "Chose A: cut the log back to its 841 real bytes during the switch-over, before it
  is copied into the new folder (one command, seconds; done by the main session)." Closed. The exact command goes
  into the cut-over steps.
- Lead check done 11:34: Node 244/244 (`STATE_FOLDER_S1_LOGS\lead-check-node.log`, 11:30), PowerShell 105/105
  (`lead-check-ps.log`, 11:34), both in the staged copy through run-heavy. Real root absent; `~\.claude\state\` only
  `usage-limits.json` newer (live watch, 11:32).
- Order changed 11:34: S5 (docs) runs beside S2 now; S4 (pane) waits and runs beside S3, so the pane source changes
  as late as possible before the cut-over.
- Accepted S1's decisions (root first, UNC refused, first broken rule named, test seams) and initiatives
  (`makeSkillCopy` default root etc.): inside the task, nothing the user sees. Not registered.

## S2 result (report `STATE_FOLDER_S2_REPORT_CLAUDE.md`), worker a0902b21c850c0fa1, 11:36-12:16, 341k, 131 calls

- PARTLY DONE: both points built; mutation check NOT run (warning at 322k). Moved to S3a.
- `Get-StatePath($config, [string]$key)` (+ `Get-RequiredSetting`, `Get-StatePathFault`) copied into
  `usage-probe.ps1` and `watch-usage-and-context.ps1`; errors word for word as Node (50-case table, 0 differences).
  `Expand-ConfigPath` removed from both. Config: `stateFile` `usage-reading\usage-limits.json`, `probeWorkingFolder`
  `usage-probe`, new `usageAndContextWatch.recordFolder` `usage-watch`; new watch parameter `-RecordFolder` (full
  path). PS 114/114, Node 244/244. Real: 0/3, reading parses, 0 refused of 6 watch files.
- Probe under `~\.claude`: no question; the probe sets `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` (read from claude.exe
  2.1.286), so no CLAUDE.md loads at all. No real call made.
- Restarted watch reads `<id>.decision.json` at every look (hand-over on record keeps it quiet; never taken back):
  the cut-over COPIES decision records (a restart then behaves as a restart in place). `<id>.txt`: never copied.
- Issues (lead file only, not registered: nothing the user sees): first red run stopped before it could write the
  real `%TEMP%` (same 6 files); `Get-ProjectFolderName` lacks Claude Code's 200-character cut (matters only for a root
  path over ~190 characters on an old Claude Code; today 64) -> summary; a child value holding `%NAME%` makes a folder
  literally named so -> DECIDED 12:20: refuse `%` in child values, by adding it to the forbidden characters, message
  `has one of * ? " < > | %` (Node, every PS copy, the pane). Done in S3a and S4.
- Initiatives accepted (inside the task): test process itself on scratch env; `Expand-ConfigPath` removed; unused
  import and CleanUp list removed; one `_why` sentence.

## S5 result (report `STATE_FOLDER_S5_REPORT_CLAUDE.md`), worker a34f3144973e43c82, 11:36-11:54, 298k, 153 calls

- Done. /clear note + quote on both pages (0 differences on 2); new folder everywhere (110 places, 110 true; 9 old
  places only in the "The move" note, lines 931-934 of `agent-team-files.html`); six junctions (install.ps1 lines
  44-49) in 8 places; tags balanced, SVGs parse, LF kept. Staged `SKILL.md` re-based on live at 11:37:41 (base line
  updated, comment line added), then edited; staged `usage-limits.md`; `README.md`.
- Lead spot check 12:17: quote found on both pages; no "five junctions" left.
- To do at the cut-over: remove the files page's "Still open" note saying the files are still in the old places;
  recheck the developers table's values against the final staged config (S5 wrote them from the layout table).
- Registered: D-52 (initiative, low: six page additions), D-53 (issue, low: pages too wide on a phone; two stale
  "does not exist yet" lines about `misc\handovers\`). Decisions accepted (limits-and-caps-guide unchanged; the
  `session-<id>.json` guard row kept, the code writes it).

## Lead checks of S2 and S5, and messages since (12:53)

- S2 checked 12:53: staged PS 114/114 (`STATE_FOLDER_S2_LOGS\lead-check-ps.log`, 12:22), Node 244/244
  (`lead-check-node.log`); live folder = base on all 45 files (base re-based for SKILL.md by S5); real root absent;
  real `%TEMP%` watch files: same 6.
- Main session 12:48: D-53, the user: "Chose A: correct the two 'does not exist yet' lines now and leave the width (a
  few minutes, within this task)." Closed -> the fix goes to S3a (repo-root `agent-team-files.html`, two lines).
- D-52, the user: "Other: i dont undertan". Not settled; main session sent a plain numbered follow-up (A keep all, B
  drop some). Meanwhile keep all six.
- NEW RULE for every entry from now (D-40, `agents\task-lead.md` section 8, lines 223-229): readable at a glance.
  Short sentences, one thought each; `what` under about 60 words, point first; one short line per option (what, then
  cost in brackets); never (1), (2), (3) inside a sentence; parts go one short sentence each in `example`, or as child
  entries. My D-39, D-51, D-52, D-53 were written before I knew it (D-52's `what` used (1)-(6): that is why the user
  did not understand it).
- S3b returned 12:53 (the Agent call blocked until it finished; S3a was not started before). See its section.

## S3b, S3a, S4 results (13:54)

- S3b (af2dc31e39867be5e, 12:23-12:53, 304k, 90 calls): DONE. `STATE_FOLDER_CUTOVER_CLAUDE.ps1` (dry run default,
  `-Apply`, `-RemoveOld`; exit 0/1/2), `STATE_FOLDER_TRIM_LOG_CLAUDE.ps1` (D-51), `STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`
  (26/26, `-Mutate` 22/22). Code order MEASURED: config, `lib\config.mjs`, other libs, the rest, `lib\agent-team.mjs`
  last (config-last made both hooks print a stderr line; hooks-before-libs crashed the guard). Real dry run 12:45:
  wrote nothing (158 snapshot lines), 32 state files, 19 code files, 0 conflicts, refused for the main session's
  running watch (expected) and the then-absolute `relaunch.logFile` (fixed by S3a). Readers judge the reading's age by
  `checkedAt` inside it. `-RemoveOld` refuses unless the live config already gives the new places. It leaves the empty
  `%TEMP%\claude-usage-probe\`: give the main session a one-line delete. Main-session steps: report lines 115-138.
- S3a (aa04391c3e489803e, 12:55-13:52, 330k, 145 calls): DONE. `relaunch.logFile` `logs\relaunch.log`, new
  `runHeavy.holderFolder` `heavy-commands` + `-HolderFolder`; mutex name unchanged; `%` refused in Node and all four PS
  copies (53-case table); D-53 page fix (the one literal "does not exist yet" + line 877 "Not made yet."). PS 122/122,
  Node 246/246, mutation 21/21 (S2's list included), 0 differences on 2, 4 copies identical. Run-heavy tests use
  `-WaitMinutes 0` (no real lock). Old/new run-heavy show "holder unknown" for each other during the switch-over only.
- S4 (a8a37521c258ab4fe, 12:55-13:35, 275k, 107 calls): DONE. Pane `team-on.ts`/`team-switch.ts` read
  `teamState.folder` + `agentTeam.onFolder` (S1 rule + `%`); 136/136 (107 + 22 + 7 of the other lead's F2), validate,
  tsc clean; parity 0 differences on 3, 82/82 agree; live config gives no marker (expected); mutation 9/9. FINDING: the
  engine allows `$.env.get` only with a literal name, so the pane fills in `%USERPROFILE%` only -> D-54 (question,
  medium): A = also TEMP, TMP, LOCALAPPDATA, APPDATA (recommended), B = note only. Meanwhile B. FINDING: the pane is read
  from the repo folder, so NEW chats already run the new pane (no tab until the switch-over) -> told main 13:54.
- D-52 closed 12:58: the user "Chose A: keep all six".
- Main 13:46: it edited live `SKILL.md` again; the other lead's pair (finished 13:42) changed live
  `lib\decision-register.mjs`, `scripts\register.mjs`, register tests (one new), `agents\task-lead.md`, and the pane's
  `decisions.ts`, `pane.tsx`, `tests\hooks\points.test.ts`. Pane suite now 136.
- Three-way state at 13:53: 21 staged changes; LIVE-ONLY: `lib\decision-register.mjs`, `scripts\register.mjs`,
  `tests\lib\decision-register.test.mjs`, `tests\scripts\register.test.mjs`, new `tests\lib\decision-register-points.test.mjs`;
  CONFLICT: `SKILL.md`, `tests\hooks\decision-reminder.test.mjs`. The cut-over would leave the live-only files alone,
  but the merged whole is untested -> run S6.

## Run S6 (planned 13:55): re-base and the merged check

- Point 1: bring the five live-only files into the copy and add/replace their base lines; merge the two conflicts by
  hand (live text + our change), base lines = live hashes. Result: three-way listing shows only staged changes.
- Point 2: in the merged copy, Node and PS suites; the cut-over tests; the pane's suite, validate, type-check; a real
  dry run (expect only the running-watch refusal; relaunch.log now planned); the guide pages' settings table against
  the final config.
- Then my own final check (suites + dry run tails), the summary, `TASK DONE`.

## S6 result (aa2e4f35c950fdfc0, 13:56-14:15, 208k, 87 calls)

- DONE. Re-base: 5 live-only files copied in, 2 conflicts merged (base reconstructed: hash equal; git merge-file
  agrees), base list comment `# re-based on live 2026-10-27 14:00:22: 7 files`. Merged: Node 261/261 (live 244 + our
  17), PS 122/122, switch-over tests 26/26, pane 136/136 + validate + tsc; real dry run 0 differences on 161, 21 code
  files, 0 conflicts, relaunch.log planned, only refusal the main session's watch (PID 12880); pages vs config 0 on 27.
  Undo backup: scratchpad `s6\backup\` (delete after the switch-over).
- Lead check 14:15: three-way listing 21 staged, 26 same, 0 live-only, 0 conflicts. Pane newest file 13:27, S6's pane
  run 14:10: counts as current. Final runs (Node, PS, switch-over tests, dry run) started by me in the background.
- Summary written: `STATE_FOLDER_SUMMARY_CLAUDE.md` (final-check numbers pending).

## D-54 answered (main session, 14:22) -> run S7

- The user: "Chose - A: teach the pane the usual folder variables too: TEMP, TMP, LOCALAPPDATA, APPDATA (one small
  run, about 20 minutes)." Closed.
- S7: pane only, own files (`hooks\team-on.ts`, `hooks\team-switch.ts`, their tests, `tests\support\register-world.ts`,
  `README.md`); never `decisions.ts`/`pane.tsx` (the other lead's F2). Whole pane suite. Variable names matched
  case-insensitively (Windows names are). Plus one sentence in the staged config's `_whyFolder` naming the five
  variables the pane can fill in. Then my final check re-runs the pane suite and the dry run.

## S7 result and the end (14:45)

- S7 (ab7a2f86fc2c1f1e4, 14:23-14:42, 208k, 78 calls): DONE. Pane fills in USERPROFILE, TEMP, TMP, LOCALAPPDATA,
  APPDATA (a-z case folding); 150/150, validate, tsc 7.0.2; parity 0 on 43; mutation 10/10; one `_whyFolder` sentence
  in the staged config. Issues kept for the summary (no register): memory-pressure timeouts; `C:\%TMP%` contrived
  case; `$.env.get` vs `process.env` unverified on the real engine.
- Lead final check 14:15-14:43: three-way 21/26/0/0; Node 261/261; PS 122/122; switch-over tests 26/26; dry run
  after S7: 34 state files + 21 code files, 0 conflicts, only refusal = the main session's watch; pane logs 150/150;
  real root absent; real limit-stop.log still 11409 bytes.
- STATE: TASK DONE, not live. Summary `STATE_FOLDER_SUMMARY_CLAUDE.md` holds the main session's 11 switch-over steps.
  No register entry of this task is open (D-39, D-51, D-52, D-53, D-54 all closed).
- A successor (only if the main session asks for more): if the live folder changed after 14:00 in one of our 21 files,
  re-base as S6 did; the dry run names any conflict.

## Runs left, re-cut at 12:20 (superseded by the sections above)

- S3a: relaunch.log + run-heavy holders; the `%` refusal (Node + all PS copies); the PS mutation check for S2's and
  S3a's rules. Staged files: `scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`, (`schedule-relaunch.ps1`
  only if it passes the log path), `scripts\usage-probe.ps1` and `scripts\watch-usage-and-context.ps1` (the `%` line
  only), `lib\config.mjs`, Node tests, `tests\limit-scripts.tests.ps1`, config (`relaunch.logFile`,
  `runHeavy.holderFolder`).
- S3b (beside S3a): the cut-over script in the working folder, tested on scratch worlds, plus a dry run on the real
  material (read-only); the exact D-51 trim command, tested on a scratch copy of the real log.
- S4 (after S3a): the pane, with the `%` rule.
- Then my final check and the summary.

## Cut-over script: three-way rule (for S3), decided 11:35

The main session edits live `orchestrate-agents\` files during the task (SKILL.md at 11:08). So the cut-over compares
per file: base hash B (base list), live L, staged S. S == B: leave live alone. S != B and L == B: copy S to live.
S != B and L != B: conflict, refuse and name it. New staged file: copy when absent live; conflict when present and
different. So S5 must first take the live `SKILL.md` text into the copy (and update its base line) before editing it.

## Searcher

- 10:30 code-searcher acc08085484059764: the sweep. It could not write its file; I saved its output as
  `STATE_FOLDER_SWEEP_CLAUDE.md` (10:45).

## Notes for the cut-over steps (collected for the summary)

- Stop both watches first (main session's own task ids), check no limit-stop pipe and no hand-over.
- Usage and context watch marker `<id>.txt` holds "PID StartTime" of the old watch: do not copy it; copy only
  `.decision.json`. (S3 confirms from the code.)
- Slot holder files: never copied (each belongs to a running command).
- After `/reload-plugins`: check the Decisions tab is back in this chat.
- Before copying the logs: cut `~\.claude\state\limit-stop.log` back to its first 841 bytes (D-51 A), after checking
  those bytes' SHA256 and that the file is still 11409 bytes (if longer, remove only lines naming the test sessions
  `5e551000-aaaa-bbbb-cccc-00000000000[12]` and `7b3870e5-e7c1-4f3a-9961-398d55920189`).
- Tell the main session when S4 starts: no `/reload-plugins` until the cut-over (a reloaded new pane reads the old
  live config, finds no `teamState`, and closes the Decisions tab).
