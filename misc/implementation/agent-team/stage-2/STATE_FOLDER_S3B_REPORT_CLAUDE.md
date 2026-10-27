# Run S3b report: the switch-over script

Written 2026-10-27 (times below read from the clock). Outcome: **done**. The switch-over script, its tests and the
D-51 trim command are built and tested on scratch worlds only. A dry run against the real places planned the
switch-over, wrote nothing, and refused for the two expected reasons. Nothing was run with `-Apply` or `-RemoveOld`
against the real places, and nothing is committed.

## What I built

- `...\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1`: copies the team's old state into the new folder, then the staged
  code into the live folder. One example: the chat mark `%TEMP%\claude-agent-team-on\56c67d3d-...` is copied to
  `C:\Users\user\.claude\state\software-developer-agent\team-on\56c67d3d-...`, with its bytes and write time.
- `...\stage-2\STATE_FOLDER_TRIM_LOG_CLAUDE.ps1`: the D-51 command. It checks the hash of the first 841 bytes, then
  keeps them plus every later line that names none of the three test session ids.
- `...\stage-2\STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1`: 26 cases on scratch worlds, plus a mutation check (`-Mutate`).
- Logs: `...\stage-2\STATE_FOLDER_S3B_LOGS\` (test runs, the real dry run, before and after snapshots).

**Parameters.** `-LiveRoot`, `-StagedRoot`, `-BaseList` (defaults: the real places, found from the script's own
folder), `-OldTemp` (default `[IO.Path]::GetTempPath()`), `-OldState` (default `%USERPROFILE%\.claude\state`),
`-PipePrefix` (default: the live config's `limitStop.pipePrefix`). The new places come from the STAGED config by the
S1 rule. A child setting that holds a `%` is refused. With no switch it is a dry run; `-Apply` does it; `-RemoveOld`
is the later pass. `-Apply` and `-RemoveOld` together are refused.

**Output lines.**
- Dry run: `PLAN COPY | <from> -> <to>`, `SAME | ...`, `SKIP | <path> (<why>)`, `PLAN CODE | <rel> (<why>)`,
  `CODE KEPT | <rel> (<why>)`, then any `CUTOVER REFUSED | <why>`. The last line is `CUTOVER DRY RUN | <n> state files
  and <m> code files to copy, <s> already the same; nothing written`, plus `; -Apply would refuse for <k> reasons`
  when there are refusals.
- `-Apply`: `COPIED | <from> -> <to>`, `SAME | ...`, `CODE | <rel>`, `CUTOVER DONE | <n> state files, <m> code files`,
  then `NEXT | ...` lines. A copy that fails stops at once with `CUTOVER FAILED | ...`; nothing is undone.
- `-RemoveOld`: `REMOVED | <old>`, `KEPT | <old> (<why>)`, `REMOVED FOLDER | ...`, `KEPT FOLDER | ... (not empty: n
  entries)`, then `REMOVE OLD DONE | <n> files removed, <k> kept`.
- Exit code 0 = done (or a dry run with nothing to refuse), 1 = refused, 2 = failed part-way.

**Refusals.** Each one writes nothing and prints one line per reason:
- a code conflict by the three-way rule (this includes a base file missing from the staged copy, and a new staged
  file that live already has with other content);
- a pipe `\\.\pipe\<prefix>-*`;
- a running watch, from an old mark or a new `usage-watch\<id>.txt`. A watch counts as running only when its process
  runs with the start time the mark records: the watch's own `Get-OtherWatch` check;
- a file in the new place that differs from the old file it would receive. Both paths are named;
- a bad parameter, base-list line or staged setting.

Each file is written through a temp name beside it and then renamed. Each copy is read back (bytes, and for state
also the write time).

## The code order, and why

I ran both hooks on scratch copies in each mixed state. The chat was marked in both places, as it would be after the
state copy. The input was an agent at 330k tokens, above its 320k warning.

| State | context-guard | decision-reminder |
| --- | --- | --- |
| old code + old config (control) | warning; marker in the old place | silent |
| new code + new config (control) | warning; marker in the new place | silent |
| old code + new config ("config first") | silent, nothing written | silent |
| new code + old config ("config last") | a stderr line: `has no setting 'teamState.folder'` | the same stderr line |
| new everything except the old gate `lib\agent-team.mjs` | silent | silent |
| new config + new libraries, old hooks | silent | silent |
| new config + new hooks, old libraries | **exits 1, SyntaxError** (`requireStatePath` missing) | silent |

So the expectation "config last" is **refuted**. The order is: the config, `lib\config.mjs`, the other libraries,
then everything else, with the gate `lib\agent-team.mjs` last. Every point on the way looks like the silent rows
above: nothing on stdout or stderr, nothing written. A copy that stops half-way leaves the team silent rather than
broken, and a second `-Apply` finishes it, because files that already match are skipped.

## The real dry run (12:45:24 to 12:45:42)

- I snapshotted the real old places, the live folder, the staged copy, `C:\Users\user\.claude\state\` and the base
  list before and after: **0 differences on 158 lines**.
- State, 32 files: 3 chat marks, 26 guard markers, 1 decision record (`bf7022c6...`), the reading and
  `limit-stop.log`.
- **`relaunch.log` was not planned**, because the staged `relaunch.logFile` still reads
  `%USERPROFILE%\.claude\state\relaunch.log` (S3a has not changed it yet).
- Skipped: 5 watch marks and 1 slot holder (my own run-heavy run).
- Code, 19 files: 18 changed and `tests\lib\state-path.test.mjs` new. **0 conflicts.**
- The staged copy was as at 11:56:22 (its newest file); S3a had not written to it yet.
- Refused for 2 reasons, both expected:
  1. the `relaunch.logFile` setting;
  2. the running watch of session `56c67d3d-b3c0-43be-a82c-b3a9cdc23274` (PID 12880, the main session's own).

## Checks

- Test cases: **26 of 26 pass** (`run-3.log`, and again at the start of the mutation run).
- What the cases cover:
  - a dry run writes nothing (every file of the world hashed before and after);
  - `-Apply` makes exactly the 9 planned files, with the same bytes and write times, and leaves the rest alone;
  - the code order;
  - a second `-Apply` is all `SAME` and writes nothing;
  - every refusal writes nothing and exits 1: a code conflict, a staged deletion, a new file that clashes, a real
    `NamedPipeServerStream`, a running watch with an old mark and with a new mark (a real process I started, with its
    real start time), a differing new file, a bad setting, a bad base-list line, both switches together, and all
    reasons at once;
  - a dead or reused PID is not a watch;
  - names that fail the session id check are not copied;
  - a child `pwsh -File` run gives exit codes 0 and 1;
  - `-RemoveOld` refuses before the switch-over, deletes only identical copies, keeps the rest with the reason, and
    removes only empty folders;
  - five trim cases.
- Mutation check: **22 of 22 caught** (`mutate-1.log`, run through run-heavy 12:44:30 to 12:52:13, after my last
  code change). Each mutant breaks one rule and must parse before it counts. The broken rules: each refusal skipped
  (conflict, staged deletion, pipe, watch, differing file), the watch's start-time check, `.lock` copied, `.txt` mark
  copied, slot holder copied, session id check skipped, write time not kept, a dry run that writes, SAME rewritten,
  gate not last, config not first, a live edit overwritten, `-RemoveOld` deleting a differing file, `-RemoveOld`
  removing a folder that is not empty, `-RemoveOld` before the switch-over, and three for the trim (hash not checked,
  test lines kept, real lines dropped).
- All three scripts parse with 0 errors. PowerShell has no type-checker, and PSScriptAnalyzer is not installed.
- Trim on a scratch copy of the real log: `11409 -> 841 bytes; 60 test lines removed, 0 later lines kept`. The SHA256
  is `021D5EE3...F6DE`, and the real log is unchanged.
- **Not run:** the project's own suites (`node --test`, `limit-scripts.tests.ps1`). Nothing I changed is under
  `orchestrate-agents\`, and the old suites run against the live folder.
- **Not tested:** `-Apply` against the real places, which is not mine to run. Pipe names with odd characters, beyond
  the machine's real pipe list.

## The main session's steps, as exact commands

1. Stop the main session's own two watches (by their task ids). A watch the dry run names for another chat needs
   the user.
2. Dry run, and look for no `CUTOVER REFUSED` line:
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1'`
3. D-51 trim, **before** `-Apply`, so the copy gets the trimmed log:
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_TRIM_LOG_CLAUDE.ps1'`
   It should print `TRIM DONE | ...: 11409 -> 841 bytes; 60 test lines removed, 0 later lines kept`.
4. `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1' -Apply`
5. The script then prints these steps:
   - `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\team-on.mjs'`
   - Restart both watches with the PowerShell tool, `run_in_background` and these exact descriptions:
     - `Usage and context watch`:
       `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1'`
     - `Decision answers watch`, from the chat's own repo:
       `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1'`
   - `/reload-plugins`
   - Check: the chat's mark is
     `C:\Users\user\.claude\state\software-developer-agent\team-on\<id>`. The next probe writes
     `...\software-developer-agent\usage-reading\usage-limits.json` with a newer `checkedAt`. A guard warning lands
     in `...\software-developer-agent\context-guard\`.
6. Later, when every chat runs the new code:
   `pwsh -NoProfile -File 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_CUTOVER_CLAUDE.ps1' -RemoveOld`

## Risky or open points

- **Order of trim and `-Apply`.** If the trim runs after `-Apply`, the new copy of the log keeps the 60 test lines,
  and `-RemoveOld` keeps the old log because it differs. Running the trim first (step 3) avoids this.
- **The milliseconds of the code copy.** An old hook can still write a guard marker into the old place after the
  state copy. The new place then misses that one update, and that agent may get one warning twice. I left it: it is
  harmless and lasts milliseconds.
- **A chat switched on during `-Apply`** gets its mark only in the old place. It falls silent until
  `/software-developer-agent` is run again in it.
- **The empty `%TEMP%\claude-usage-probe\`** is never touched or reported by `-RemoveOld`. It stays until deleted by
  hand.

## What I learned that the task did not say

- Both readers of the usage reading judge its age by the `checkedAt` inside it, not by the file's time. Keeping the
  time is still done.
- The new hooks with the old libraries fail to load (exit 1). That is why the libraries must come before the hooks.
- `-RemoveOld` needs a guard of its own. Run before `-Apply`, it would delete the old chat marks that the old gate
  still reads, and every chat would fall silent. It therefore refuses unless the live config gives the same new
  places as the staged one.

DECISIONS TAKEN:
- Code order: config, lib\config.mjs, other libraries, the rest, lib\agent-team.mjs last; not "config last", because only this order is silent and writes nothing at every step (measured, table above).
- A dry run that finds a refusal exits 1, not 0, so a caller sees that -Apply would refuse.
- -RemoveOld leaves the empty %TEMP%\claude-usage-probe\ alone rather than removing it: the task lists it under "never copied", not under what -RemoveOld deletes.
INITIATIVES:
- -RemoveOld refuses unless the live config gives every new place as the staged one does, so an early -RemoveOld cannot delete the marks the old gate still reads.
- Every copy is read back after its rename (bytes, and for state the write time).
- The dry run prints SKIP and CODE KEPT lines, so the main session sees what stays behind.
- The trim refuses when the log changed while it was read, so a line appended meanwhile is never lost.
ISSUES FOUND:
- The staged relaunch.logFile is still "%USERPROFILE%\.claude\state\relaunch.log" (12:45): the cut-over refuses on it and does not plan relaunch.log until S3a makes it a child path.
- If the trim runs after -Apply, the new limit-stop.log keeps the 60 test lines and -RemoveOld keeps the old log; run the trim first.
- A chat switched on during the milliseconds of -Apply gets its mark only in the old place and must be switched on again.
QUESTIONS: none