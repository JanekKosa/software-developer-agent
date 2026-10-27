# Run S3b of "the team's state in one folder": the switch-over script

Written by the task lead STATE_FOLDER on 2026-10-27 at 12:30. You start cold; this file holds everything.

## Read first, and no more

`...\stage-2\` below is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `...\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md` lines 33 to 75 (the rule that turns a setting into a path under the
   root) and 97 to 106 (the log lines your trim command removes).
4. `...\stage-2\STATE_FOLDER_S2_REPORT_CLAUDE.md` lines 50 to 64 (what a restarted watch does with old records).
5. Read-only, by range: in the staged copy `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`, the config
   `orchestration.config.json`, and in `scripts\watch-usage-and-context.ps1` the function that decides whether a
   watch already runs for a session (search `claude-session-watch` / the mark's "PID StartTime" check) and in
   `scripts\usage-probe.ps1` how the reading's age is judged (file time or content). In the LIVE
   `C:\Repos\My projects\software-developer-agent\orchestrate-agents\` (read-only!) the `limitStop.pipePrefix` setting
   and, in `hooks\context-guard.mjs` and `hooks\decision-reminder.mjs`, what each hook does when loading the config or
   a setting throws.
6. The base list `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt` (its format: a first line with the time, then
   `<relative path>\t<SHA256>` lines, comment lines start with `#`).

Do not read the guide pages, `SKILL.md`, `references\`, the test suites, the sweep file, other `P*`/`R*` files or the
lead brief.

## What the piece is for

The agent team is moving every file it writes for itself into one folder (the user, D-36, 2026-10-27: "move every
team file now under %TEMP% ... into one folder beside the team's logs ... so all of the team's state is in one place no
cleanup touches"; "create a parent dir for the developer agent, and then child dirs for each temp file type"; layout
accepted 11:00, D-39). The new code is built in a staged copy, because `orchestrate-agents\` is live: every saved file
reaches every running Claude session at once, and the moment the hooks look for a chat's switch-on mark in the new
place, every switched-on chat falls silent unless its mark is already there. So the change goes live in one step: the
main session runs your script. It copies the old state into the new folder first, then the staged code into the live
folder. You build and test that script; you never run it against the real places except as a dry run.

## The script: `...\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1` (PowerShell 7)

**Parameters, defaulting to the real places:** `-LiveRoot` (the live `orchestrate-agents\`), `-StagedRoot` (the staged
copy), `-BaseList`; the OLD places as fixed defaults (they are what the old code used; after the switch-over the live
config no longer names them, so they must not be read from it): `-OldTemp` (`[IO.Path]::GetTempPath()`), `-OldState`
(`$env:USERPROFILE\.claude\state`); the NEW places from the STAGED config (`teamState.folder` expanded, each child by
the S1 rule, `%` refused in a child); `-PipePrefix` (default: the live config's `limitStop.pipePrefix`). Modes:
- no switch: a DRY RUN that prints the whole plan and writes nothing;
- `-Apply`: does it;
- `-RemoveOld`: a separate later pass that deletes old copies (below).

**Refuse, writing nothing, with one line `CUTOVER REFUSED | <why>` per reason, when:**
1. A code file is in conflict by the three-way rule. Per file: B = its base-list hash, L = the live file's hash, S = the
   staged file's hash. S = B: leave the live file alone (whatever it is). S != B and L = B: copy S to live. S != B and
   L != B and L != S: conflict. A staged file with no base line: copy when absent live; conflict when present live and
   different. A base file missing from the staged copy: conflict (no deletion is expected). L = S: nothing to do.
2. A limit-stop server listens: any pipe `\\.\pipe\<PipePrefix>-*` exists (a hand-over is in progress).
3. A Usage and context watch still runs: an old mark `<OldTemp>\claude-session-watch-<id>.txt`, or a new one under the
   new `usage-watch\`, whose PID runs with the start time it records (check it the way the watch itself does). Name
   each session id and PID. The main session stops its own watches first; another chat's watch needs the user.
4. A new-place file already exists with content different from the old file it would receive (name both).

**Plan and order of `-Apply`:**
1. State first, each old file copied (bytes and last-write time kept; check how the readers judge age, so a copied
   reading never looks fresher than it is):
   - `<OldTemp>\claude-agent-team-on\<id>` (names that pass the session id check) -> `<new>\<agentTeam.onFolder>\<id>`
   - `<OldTemp>\claude-context-guard\*.json` -> `<new>\<contextGuard.markerFolder>\` (never the `.lock` files)
   - `<OldState>\usage-limits.json` -> `<new>\<usageLimits.stateFile>`
   - `<OldState>\relaunch.log` and `limit-stop.log` -> `<new>\<relaunch.logFile>` and `<new>\<limitStop.logFile>`
   - `<OldTemp>\claude-session-watch-<id>.decision.json` -> `<new>\<usageAndContextWatch.recordFolder>\<id>.decision.json`
   - Never copied: `claude-session-watch-<id>.txt`, `xpp-agent-heavy-command-slot-*.txt` (each belongs to a running
     command), `.lock` files, the empty `%TEMP%\claude-usage-probe\`, anything else.
   - An identical file already in the new place: `SAME`, nothing written (so a second run is harmless).
2. Then the code, by the three-way rule. Choose the order inside it from what the hooks do with a mixed state for
   the milliseconds of the copy (new code with the old config, or old code with the new config): read it in the two
   hooks (step 5 of "Read first") and test both mixes on a scratch copy; prefer the order whose mixed state is silent
   and writes nothing anywhere. Expectation to confirm or refute: the config last. Write each file through a temp
   name beside it and a rename, so no reader sees half a file.
3. Print one line per action (`COPIED | <from> -> <to>`, `SAME | ...`, `CODE | <relative path>`), a last line
   `CUTOVER DONE | <n> state files, <m> code files`, then the main session's next steps (below).

**`-RemoveOld`:** deletes each old state file listed above only when its new copy is byte-identical; reports every old
file it keeps and why (differs, never copied, belongs to a running process); removes an old folder only when empty.
It never deletes a `.txt` watch mark whose PID runs, a slot holder, or anything outside the list.

**Next steps it prints** (and you put in the report, as exact commands): run `node '<live>\scripts\team-on.mjs'`;
start both watches again (the commands in `C:\Repos\My projects\software-developer-agent\team-switch\SKILL.md` step 2,
quoted); `/reload-plugins`; how to see that it worked (the chat's mark is under `<new>\team-on\`, the next probe writes
`<new>\usage-reading\usage-limits.json`, a guard warning lands in `<new>\context-guard\`); then `-RemoveOld`.

## The trim command for D-51 (the user chose A, 11:35)

S1's red test run appended 60 test lines to the real `C:\Users\user\.claude\state\limit-stop.log` (841 -> 11409 bytes;
the first 841 bytes' SHA256 is `021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE`). The user's words:
"Chose A: cut the log back to its 841 real bytes during the switch-over, before it is copied into the new folder (one
command, seconds; done by the main session)." Write that command as `...\stage-2\STATE_FOLDER_TRIM_LOG_CLAUDE.ps1`:
it checks the first 841 bytes' hash, then keeps those bytes plus any later line that names none of the three test
session ids (`5e551000-aaaa-bbbb-cccc-000000000001`, `...0002`, `7b3870e5-e7c1-4f3a-9961-398d55920189`), so a real
line written since is never lost; it refuses on a hash mismatch. Test it on SCRATCH COPIES of the real log (copy it
read-only into scratch): today the result must be exactly the first 841 bytes; with a real-looking line appended
after the test lines, that line must stay. Never run it on the real log.

## Your two points

1. The script's dry run and `-Apply`, with every refusal, on scratch worlds.
2. `-RemoveOld` and the trim command, on scratch worlds and scratch copies.

## Tests: `...\stage-2\STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`

Self-contained, scratch only: each case builds a world under a scratch folder (fake live, staged and base list; fake
old temp and old state folders with real-looking marks, guard marks and locks, a reading, two logs, watch marks and
decision records, slot holders; a fake new root) and runs the script with every place pointed into it. At least:
dry run writes nothing (hash every file of the world before and after); apply copies exactly the planned files and
keeps their times; each refusal (code conflict, open pipe: start a real `NamedPipeServerStream` with a scratch prefix;
a running watch: a mark naming a process you start, with its real start time; a differing new file; a staged
deletion) writes nothing; a second apply is all `SAME`; `-RemoveOld` deletes only identical copies and keeps the rest;
the code order you chose. Then the mutation check: break one rule at a time in a scratch copy of the script (at least:
each refusal skipped, `.lock` copied, `.txt` mark copied, time not kept, `-RemoveOld` deleting a differing file) and
report "N of N caught". Any heavy run goes through run-heavy (below).

## The check against real material (read-only)

A DRY RUN against the real places (the default parameters), with a listing and hash snapshot of the real old places,
the live folder, the staged copy and `C:\Users\user\.claude\state\` before and after: "0 differences". Report its plan:
how many marks, guard marks, decision records; the reading and the two logs; the code files it would copy; conflicts
(expected 0); the running watches it found (the main session's own watch runs now, so it should name it and refuse:
that is the expected outcome). The staged copy changes while you run (run S3a); say which files it planned at what
time. Never run `-Apply` or `-RemoveOld` against the real places.

## Rules for the run

- Never write to the LIVE `orchestrate-agents\`, the staged copy, the base list, the real `%TEMP%` team files or
  `C:\Users\user\.claude\state\`. Read-only there. Your scratch worlds live in your scratchpad or `%TEMP%\s3b-*`, and
  you delete them at the end.
- Heavy commands (a long test run) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S3B_LOGS\`.
- Another worker (run S3a) changes the staged copy now (`orchestration.config.json`, `scripts\*.ps1`, `lib\config.mjs`,
  tests). Read it, never write it. It queues for the same slot.
- Stop only processes you started, by the ids you recorded.
- Read the clock for every time you write. Progress file after every point:
  `...\stage-2\STATE_FOLDER_S3B_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens.
- Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Files

- Yours: `...\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1`, `STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`,
  `STATE_FOLDER_TRIM_LOG_CLAUDE.ps1`, your progress, report and log files, your scratch.
- Not yours: everything else, above all the live folder, the staged copy, the base list, `decisions\*`, the pane repo,
  `~\.claude\settings.json`, any `CLAUDE.md`, anything under `~\.copilot`.

## Report

`...\stage-2\STATE_FOLDER_S3B_REPORT_CLAUDE.md`: the script's parameters and output lines, the order chosen and why
(with what the mixed states did), the real dry run's plan, the tests' and mutation counts, the main session's steps as
exact commands, what you did not test and why. It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

Any change to the product code (S3a), the pane (S4). Running the script for real (the main session, later). D-37: not
yours.
