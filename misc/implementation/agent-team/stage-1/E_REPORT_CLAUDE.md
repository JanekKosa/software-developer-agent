# Run E: finishing run D (report)

Written 2026-10-25 10:51 (clock read). Repo: `C:\Repos\My projects\software-developer-agent`. Nothing is committed.
Details and the exact commands to finish are in `E_PROGRESS_CLAUDE.md` beside this file.

## Outcome

Partly done. Points 1 to 4 are built and checked. Of point 5, the mutation check and the one real probe run did not
run: the context guard came at 324k, and its rule is to start nothing new.

**Before the next Claude Code start, someone must run `scripts\install.ps1`.** The lead and the worker now load the
user's guardrails from a new skill, `team-rules`. Their agent files are live, but `team-rules` is not yet linked into
`~/.claude/skills`. Until it is, a new lead or worker starts without those rules.

## What is different now

- **The four limit scripts read their settings from the config.** Anything not passed as a parameter comes from
  `orchestration.config.json`. A missing key stops the script with a message that names the key. Example: when
  `relaunch.expireAfterHours` is missing, the relaunch prints `RELAUNCH NOT SCHEDULED | ... no key
  'relaunch.expireAfterHours'`. Paths such as `%USERPROFILE%\...` are expanded. An unset `%NAME%` stops the script
  and names both the key and the variable.
- **The usage probe runs only when something is being spent.** The watch probes only when its session or one of its
  agents has written since the last reading. A weekly reading at 97% on an idle session no longer costs a probe
  every 3 minutes for days. The probe itself shows a reading younger than `stateFreshMinutes` as it is, without a
  call, so several open sessions share one call.
- **`probeEveryMinutes` is gone** (the main session's decision). Far from a threshold, `stateFreshMinutes` sets the
  pace (15 minutes). Near a threshold the pace is the smaller of that and `probeNearEveryMinutes` (3 minutes).
- **`run-heavy.ps1` reads a new `runHeavy` block.** It holds the slot count (1), the free-memory floor (600 MB) and
  the wait (60 minutes), each with its reason. Heavy commands now start on this machine instead of waiting an hour
  for 1500 MB. A missing key prints `HEAVY COMMAND NOT RUN`, exits 1, and takes no slot.
- **`watch-agent.ps1` warns at the right size for the agent type.** It has a new `-AgentType` parameter and warns at
  `contextCaps.<type>.warn`, so a worker is warned at 320k. A type the config does not list uses the `default`
  entry. A passed `-WarnTokens` still wins. I also added `-ProjectsRoot` so the tests can use fixture transcripts.
- **The documents match the code again.** Fixed: the client-repo exclude text, the reminder ("by id and what", with
  its format), the run-heavy floor, the probe rule and the state file, the relaunch steps (it opens the link only
  when the project's window is in front; the log path comes from the config), the watch-agent fallback in
  `lessons.md`, and "title" in `start-messages.md` (register entries have no title).
- **New `team-rules` skill.** It holds the seven things the lead and the worker share: the guardrails, reading the
  project's `CLAUDE.md` first, the clock, the progress file, plain words, the report block with what each line
  means, and messages. Both agent files now preload it, and point to it in one line where text was taken out.
  `install.ps1` links it into `~/.claude/skills` and `~/.copilot/skills`. The README says so.

## Files

Changed: both agent files, `README.md`, `scripts\install.ps1`, `orchestration.config.json`, `SKILL.md`, four of
the references, all six scripts in `orchestrate-agents\scripts\*.ps1`, and `tests\limit-scripts.tests.ps1`.
New: `team-rules\SKILL.md`. A hash comparison against my start shows nothing else changed, and 0 files under
`skills\`. The tree has no links.

## Checks (10:47-10:50, after the last change)

- PowerShell suite through run-heavy: 70 passed, 0 failed (62 at the end of point 1, plus 8 new cases).
- Node suite through run-heavy: 79 of 79.
- Parser: 0 errors on 8 `.ps1` files. `node --check`: 0 failures on 20 `.mjs` files. The config parses.
- Doc check (my script checks every path, script parameter, config key and marker named in the 11 documents):
  0 real misses. It reports 3 false positives: `register.mjs` read as a config key, and `node --test` read as a
  register flag.
- `install.ps1` test with a scratch home folder: 9 of 9. The real `~/.claude` and `~/.copilot` links were read
  before and after the test, and they did not change.
- **Not run: the mutation check and the real probe run.** The progress file has both commands and the 20 planned
  mutants.
- **Not tested at all:** the main-loop line where the watch calls the probe. A watch run that probes would call
  the real claude, so no test exercises it. The function it calls is tested.
- Two unit cases were written after the code and passed at once, so they are not proven to catch anything: the
  probe-call test and the fresh-reading guard. The same goes for the edits that dropped `probeEveryMinutes`. The
  mutation check is what would prove them.

## Risky or undecided

- **Each script keeps its own copy of the config helpers.** I added one more helper, which expands `%NAME%`; it is
  repeated in three scripts. A shared helper file would break the test import, which picks up only functions
  defined in the script itself. Recommendation: keep it this way.
- **`run-heavy.ps1` exits 1 on a settings error.** A command that fails also exits 1, so the exit code alone does
  not tell them apart; the `NOT RUN` line does. Recommendation: keep 1, because 124 already means the wait ran out.
- **`watch-agent.ps1`'s `-AgentType` defaults to `default`.** A caller that leaves it out is warned at 400k, which is
  past a worker's cap. Recommendation: either make it required, or have the script read the type from the agent's
  `.meta.json` file.

## Learned

- A PowerShell trap: the test helper's loop variable `$command` was the same variable as `run-heavy.ps1`'s
  `[string]$Command` (PowerShell ignores case in names), so no function was imported. I renamed it to `$defined`.
- The scratchpad is shared with run D. Writing my `baseline-hashes.txt` and `run-suites.ps1` overwrote D's files of
  the same names.
- I wrote estimated times into the progress file instead of reading the clock. The progress file has a correction.

DECISIONS TAKEN: probeEveryMinutes dropped and the watch's probe interval set by the fresh-age function (stateFreshMinutes, or min with probeNearEveryMinutes when near), instead of a separate interval, so the watch and the probe use one rule. Each script stays self-contained with its own config helpers, instead of a shared file, because the test import takes only a script's own functions. run-heavy settings error exits 1, not 124, because 124 means the wait ran out. watch-agent -AgentType is optional with default 'default', instead of required or read from the agent's meta file, to keep existing callers working. team-rules also took "never retry what timed out" and "never stop a process you did not start", which were in both files, besides the guardrails the task listed. runHeavy holds slots, minFreeMB and waitMinutes only; sampleSeconds stays a parameter default.
INITIATIVES: watch-agent.ps1 got -ProjectsRoot and -ConfigPath, and both run-heavy.ps1 and watch-agent.ps1 got a dot-source guard, for the tests. Test helper Import-ScriptFunctions takes arguments, and its loop variable was renamed. Two extra unit cases (Invoke-UsageProbe passes -FreshMinutes; Get-FreshReadingText). README tests note (the suite takes about two minutes). start-messages.md "title" changed to "its What". lessons.md now records the run-heavy floor history (1500 to 600).
ISSUES FOUND: team-rules is not installed, but both live agent files preload it, so lead and worker runs started before install.ps1 is run lack the guardrails (fix: run scripts\install.ps1). The watch's main-loop call of the probe has no test. My baseline-hashes.txt and run-suites.ps1 overwrote run D's files of the same names in the shared scratchpad. The progress file held estimated times (corrected in place).
QUESTIONS: Should watch-agent.ps1's -AgentType be required, or read from the agent's meta file (recommended), so a caller that leaves it out is not warned only past a worker's cap?
