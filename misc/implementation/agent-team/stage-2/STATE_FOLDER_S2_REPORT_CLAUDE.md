# Run S2 report: the usage reading, the probe's folder, the watch's records

**Outcome: partly done.** Both points are built and tested in the staged copy. The PowerShell suite passes 114 of 114
(105 old + 9 new) and the Node suite 244 of 244, both in the copy and both run after my last change. **The mutation check
was not run**: the context warning (322k) came before I could start it. How to finish it is at the end.

## What changed for the user (once the copy goes live)

- The usage reading moves to `<root>\usage-reading\usage-limits.json` and the probe's empty folder to
  `<root>\usage-probe`. `<root>` is `teamState.folder`, which resolves to
  `C:\Users\user\.claude\state\software-developer-agent`.
- The Usage and context watch keeps its two files per session in `<root>\usage-watch\`: `<session id>.txt` (its running
  mark) and `<session id>.decision.json` (its limit decision). Before, they were `%TEMP%\claude-session-watch-<id>...`.
- A wrong setting now gets the same error text from PowerShell as from Node. Example:
  `orchestration.config.json setting 'usageAndContextWatch.recordFolder' must be a path under 'teamState.folder' but has a '.' or '..' part: "..\\records"`.
- One behaviour difference from before: a broken record folder (or one that cannot be made) ends the watch at its start
  with `WATCH FAILED | <reason>`. Before, the folder was always `%TEMP%` and could not be broken.

## The PowerShell function

Each script keeps its own copy, as each keeps its own settings helpers:

- `Get-StatePath($config, [string]$key)`: returns the absolute path. It is a copy of `requireStatePath`: same checks,
  same order, same words.
- `Get-RequiredSetting($config, [string]$key)`: reads the setting the way `requireSetting` does. A key in another
  case, or a null value, counts as missing.
- `Get-StatePathFault([string]$value)`: gives the first rule the value breaks.

I left out the `$ConfigPath` argument the task suggested. Node's errors name the file `orchestration.config.json`, not
its path, so word-for-word errors cannot use the path.

The join tidies the root the way Node's `path.join` does (`\\`, `/`, `.`, `..`). I did not use `GetFullPath`, which
also drops trailing dots and spaces from names, or `Join-Path`, which fails on a drive that does not exist. The rules
use `\z` where JavaScript has `$`, because .NET's `$` also matches before a final line feed. A test pins this.

`Expand-ConfigPath` is now unused in both scripts, so I removed it from both.

## Config entries as written (copy)

- `usageLimits.stateFile`: `"usage-reading\\usage-limits.json"`. Its `_whyStateFile` now starts "Where the probe
  writes the numbers, as a path under teamState.folder; every watch on this machine reads them there." The rest is
  unchanged.
- `usageLimits.probeWorkingFolder`: `"usage-probe"`. Its `_why` adds "as a path under teamState.folder" and one
  sentence saying the call runs with CLAUDE.md files switched off.
- New `usageAndContextWatch.recordFolder`: `"usage-watch"`. Its `_whyRecordFolder` names the two files and why each
  exists.
- New watch parameter `-RecordFolder`, a full path. A passed value wins over the setting, as that section's `_about`
  says for all its settings.

## Who reads the watch's two files, and what a restarted watch does with old ones

- Searched read-only: the copy (scripts, lib, hooks, Node tests) and the pane repo `claude-code-extensions`. Only
  `watch-usage-and-context.ps1` and its tests read or write them. `references\usage-limits.md` mentions them twice;
  that is S5's file and I did not read it.
- `<id>.decision.json`: a restarted watch reads it at its first look, not only at its start, and again at every look.
  - A hand-over on record keeps the watch quiet; it only checks the limit-stop server.
  - The record's reset time is used as the wake time after a limit message that names no reset.
  - A decision on record is never taken back.
  - So if a hand-over is running at the cut-over, the old record must be copied over. Otherwise the new watch can
    announce LIMIT NEAR a second time.
- `<id>.txt`: a new watch reads it only to see whether another watch already runs for that session. A mark whose
  process is gone, or whose start time differs, counts for nothing. Copying it is never needed. While the old watch
  still runs, a copied mark would make a new watch end with WATCH ALREADY RUNNING, which is correct (that session is
  already watched).

## The probe under `~\.claude`: answered without a model call

- Claude Code 2.1.286 (read-only string search of `claude.exe`) gates CLAUDE.md loading with
  `Boolean(a.CLAUDE_CODE_DISABLE_CLAUDE_MDS || ...)`.
- The probe already sets `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` for its call, and an existing test pins that.
- So no CLAUDE.md is loaded at all, from any folder. The move cannot load `~\.claude\CLAUDE.md` twice.
- It took 2 tool calls. The two real calls were not made.
- Caveat: this is a reading of the bundled code, not a measured token count.

## Transcript folder name

- Claude Code names a working folder's transcript folder with `replace(/[^a-zA-Z0-9]/g,"-")`, and cuts names over
  200 characters and adds a hash.
- So the new folder `C:\Users\user\.claude\state\software-developer-agent\usage-probe` gets the transcript folder
  `C--Users-user--claude-state-software-developer-agent-usage-probe`. The probe's derivation gives the same.
- No real folder in `~\.claude\projects` comes from a path with a dot or a doubled separator. I checked 19 folders.
- The new test pins the dotted name from the engine's rule, plus one real folder of this machine
  (`c--Repos-My-projects-software-developer-agent`).

## Checks and counts

- **Red phase**, run in a scratch copy with the new config, the new tests and the old scripts: 89 passed, 25 failed.
  Every failure was a moved place or a missing function. These new cases passed on the old code because they pin
  existing behaviour:
  - the Node table;
  - a passed `-StatePath` still wins;
  - the transcript folder name;
  - the environment self-test.
- **The first red run was stopped by me at 11:53.** Six later cases called the script's own `Get-DecisionRecordPath`
  inside the test process. In the old code that writes to the real `%TEMP%`. I stopped it before those cases ran:
  `%TEMP%` still held the same 6 files, and no process was left. Fixed: those cases now use the fixture's path, and
  the test process itself now points USERPROFILE, TEMP and TMP into its work folder.
- **Green:** PowerShell 114 of 114, Node 244 of 244. Logs are in `STATE_FOLDER_S2_LOGS\`.
- **The rule table** has 50 cases, each with S1's exact text or path. `lib\config.mjs` answers all 50 as written, and
  each script answers all 50 the same, so there are 0 differences.
- **Real material:**
  - The three settings resolve with the real environment to exactly the three paths of the task: 0 differences on 3
    (9 answers: probe, watch and Node).
  - The real `usage-limits.json` (173 bytes) parses with `Read-UsageReading` and `Get-FreshReadingText`.
  - The real `%TEMP%` has 6 watch files: 0 refused of 6. Each maps to `...\usage-watch\<id>.txt` or
    `...\<id>.decision.json`.
- **Before and after each suite run (12:04 and 12:14):**
  - The real root does not exist.
  - `~\.claude\state\` keeps its 4 files.
  - `usage-limits.json` was rewritten at 11:57 and 12:14:41. The 12:14 content is a live reading: five-hour 35% and
    weekly 92%, with the same reset times as the live 11:54 reading. No test fixture uses that pair of values.
  - `%TEMP%` holds the same 6 watch files with the same times. No test folder was left.
- **Live `orchestrate-agents\`:** 0 differences of 45 against the base list. Its SKILL.md matches the base again;
  that was not me.
- **Copy:** my 4 files changed, plus SKILL.md and 2 files under `references\` (S5's).

**Not tested:**

- The mutation check. To finish it: copy `scripts\` to scratch, break one rule at a time, and run
  `pwsh -NoProfile -File tests\limit-scripts.tests.ps1 -ScriptsRoot <scratch>\scripts -Only '<wildcard>'` through
  run-heavy. The rule mutants go with `'paths under teamState.folder*'`, the place mutants with `'probe run*'` and
  `'watch run*'`.
- A real probe call from the new folder (deliberately, see above).
- The live watch on the new places.

## Files

Changed in the copy:

- `orchestration.config.json`
- `scripts\usage-probe.ps1`
- `scripts\watch-usage-and-context.ps1`
- `tests\limit-scripts.tests.ps1`: header updated, new seams, 9 new cases, record paths moved.

Also mine: this report, `STATE_FOLDER_S2_PROGRESS_CLAUDE.md`, and the logs under `STATE_FOLDER_S2_LOGS\`. No shared
file needs a change from me. My scratch files have been deleted. Nothing is committed.

## What I learned

- A test that calls a script's own path function inside the test process runs the OLD code in a red phase. Moving
  children's environments to scratch does not cover that; the test process itself must be moved too.
- A child setting may hold `%NAME%`. It is neither refused nor filled in, so `%TEMP%\x` makes a folder literally named
  `%TEMP%` under the root. It stays inside the root. Node behaves the same, and the table pins it.

DECISIONS TAKEN: Get-StatePath takes ($config, $key) without $ConfigPath, so its errors name orchestration.config.json as Node's do (the other choice, naming the config's path, would break word-for-word parity); the root is tidied by hand like path.join rather than with GetFullPath, which drops trailing dots and spaces of names; a record folder that is broken or cannot be made is WATCH FAILED at the watch's start (other choice: fail later at the first write); a passed -RecordFolder is a full path used as given, like -UsageStatePath.
INITIATIVES: the test process itself, not only its child scripts, points USERPROFILE, TEMP and TMP into its work folder, and child scripts run in a scratch working folder; Expand-ConfigPath removed from both scripts (unused after the change); the unused os import in the stub server and the now-empty CleanUp list removed from the tests; one sentence in _whyProbeWorkingFolder about CLAUDE.md files being off.
ISSUES FOUND: my first red run (11:52 to 11:53) would have written test records into the real %TEMP%; stopped before it did (same 6 files, same times), and fixed; the probe's Get-ProjectFolderName lacks Claude Code's 200-character cut, so on a root path over about 190 characters and a Claude Code without --no-session-persistence its transcript would not be deleted (not mine, today's path is 64 characters); a child setting with %NAME% makes a folder literally named %NAME% under the root (S1's rule, the same in Node); the mutation check was not run (context cap).
QUESTIONS: none
