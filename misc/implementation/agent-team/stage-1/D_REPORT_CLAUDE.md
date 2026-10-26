# Run D: integration fixes after the first build (report)

Written 2026-10-25 10:31 by run D. Task: `D_TASK_CLAUDE.md`. Progress file, with the exact contract the next run
must meet: `D_PROGRESS_CLAUDE.md` (both beside this report).

## Outcome

Partly done. I was stopped by the context guard (320k of my 400k cap) at about 10:30, before the PowerShell code.

- **Done and green:** the Node half of point 1 and all of point 3. The config file holds every new key for both
  halves.
- **Written but red:** the PowerShell tests for points 1 and 2. The scripts are not changed yet.
- **Not started:** point 4 (stale documents), point 5 (the `team-rules` skill) and the rest of point 6.
- Nothing is committed.

## What is different now

- **The register's lock timing comes from the config.** It is in `register.lockWaitSeconds` (10) and
  `register.lockStaleSeconds` (60). A missing key is an error that names it. The constants in
  `lib\decision-register.mjs` are gone.
- **The context guard reads its own block, `contextGuard`.** That block holds `transcriptTailKB` (512),
  `markerFolder` and `markerLockStaleSeconds` (60). The guard refuses a `markerFolder` that is not a single folder
  name. A missing key prints nothing on stdout, exits 0 and names the key on stderr.
- **New helper `requireNumberSetting` in `lib\config.mjs`.** It accepts only a finite number of zero or more.
  Without it, a wait set to `"abc"` would make the lock loop wait forever (the deadline would be NaN).
- **The reminder now says what each blocking item is about.** The text is the item's What, cut to 80 characters.
  The cut never splits an emoji, and a cut text ends with an ellipsis. A hand-made entry with no What line shows
  its id only. Example: `Decision register: 2 open (1 blocking: D-0001 "Should a rejected invoice be retried?";
  1 question, 1 initiative); oldest D-0001 from 2026-10-25.` The hook's instruction now ends "list blocking items
  by id and what."
- **Config keys added for the PowerShell half, not read yet:**
  - `usageLimits.probeTimeoutSeconds` and `probeWorkingFolder`;
  - `relaunch.expireAfterHours`, `maxPastHours`, `notifySeconds` and `logFile`;
  - a `watchSession` block: `everySeconds`, `tailMegabytes`, `wakeOnErrors`, `resetMarginMinutes`, `retryMinutes`
    and `cacheLookbackReplies`.

  Each key has a `_why`, and each value is the old parameter default, so behaviour is unchanged once the scripts
  read them. `_whyStateFile` describes the rule decided below.

## Files changed

All are under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`:

- `orchestration.config.json`
- `lib\config.mjs` and `lib\decision-register.mjs`
- `hooks\context-guard.mjs` and `hooks\decision-reminder.mjs`
- `tests\lib\basics.test.mjs` and `tests\lib\decision-register.test.mjs`
- `tests\hooks\context-guard.test.mjs` and `tests\hooks\decision-reminder.test.mjs`
- `tests\scripts\register.test.mjs`
- `tests\limit-scripts.tests.ps1`

No other file was touched. The repo has no commits, so the baseline is a hash list (88 files) in my scratchpad.
That list is removed with the scratchpad.

## Checks (after the last change, 10:22-10:30)

- **Node suite**, through `run-heavy.ps1`: 79 tests, 79 pass. The baseline was 71 of 71. Eight tests are new, and
  three were updated to the new summary text.
- **Red first:** before the code change, 10 of the new or changed Node tests failed for the expected reason (for
  example "stayed taken for 10 s" instead of 0.3 s).
- **PowerShell suite**, through `run-heavy.ps1`: 49 passed, 13 failed. All 13 failures are the new or extended
  cases for the code not yet written. Ten of them were also seen failing for the expected reason in a separate
  safe run.
- **Parser:** 0 errors on all 8 `.ps1` files. **`node --check`:** 0 failures on every `.mjs` file.
- **run-heavy.ps1 needed a lower memory floor.** Its default 1500 MB free was never reached (the machine had
  740-990 MB free). Every run therefore passed `-MinFreeMB 600`, with TEMP pointed into my scratchpad.
- **Not run:**
  - the doc check, the `install.ps1` test, the mutation check and the real probe run;
  - `requireNumberSetting`'s own test was written after the function, so it was never seen to fail.

## Safety point for whoever runs the PowerShell suite next

Three new cases would touch real files if they ran against the old scripts:

- the real `%USERPROFILE%\.claude\state\usage-limits.json` (a fake reading would be written there);
- the real usage probe (one Haiku call);
- the real `relaunch.log`.

Each of these cases now starts with a guard line. It fails the case with "not run: ..." until the script reads the
setting. Delete the three guard lines once the scripts are changed.

## Risky or undecided

- **Two keys for one interval.** `stateFreshMinutes` (15) and `probeEveryMinutes` (15) say almost the same thing.
  My choice:
  - the watch asks for a reading every `probeEveryMinutes`, and every `probeNearEveryMinutes` near a threshold,
    but only while its session or its agents wrote something since the last reading;
  - `usage-probe.ps1` calls the API only when the shared reading is older than `-FreshMinutes`. That defaults to
    `stateFreshMinutes`; near a threshold the watch passes min(stateFreshMinutes, probeNearEveryMinutes).

  Example: weekly at 97%, user idle for two days: no probe. Weekly at 97% and an agent working: one probe every
  3 minutes.

  My recommendation: drop one of the two keys later.
- **Scope of "any other tunable default".** I kept it to the four limit scripts. `run-heavy.ps1` (slots, 1500 MB)
  and `watch-agent.ps1` still keep their defaults in code. The 1500 MB default does not fit this machine today.
  `watch-agent.ps1`'s comment "The cap itself is 500,000" is out of date for workers (cap 400k).

## Learned

- 2026-10-25 is the day the clocks go back: PowerShell writes `+01:00` from today on.
- The run budget (about 80 tool calls) did not fit the six points. The PowerShell half alone needs about 15 more
  calls, and points 4 and 5 about 20.

DECISIONS TAKEN: The probe-cadence rule above, instead of dropping or ignoring stateFreshMinutes, because it gives every key a meaning without changing the user's values. "Any other tunable default" kept to the four limit scripts, instead of also run-heavy.ps1 and watch-agent.ps1, because the task named only those scripts' parameters. The summary cut is 79 code points plus an ellipsis, instead of 80 UTF-16 units, so no character is ever split.
INITIATIVES: Added requireNumberSetting (refuses non-numbers, which would make a lock wait loop forever). Guard lines in three PowerShell test cases, so the suite cannot touch real files while the scripts are old.
ISSUES FOUND: run-heavy.ps1's 1500 MB floor is never met on this machine today (740-990 MB free), so heavy commands wait 60 minutes and give up unless -MinFreeMB is passed. watch-agent.ps1 says "The cap itself is 500,000" and defaults to 400000, which is out of date for workers (cap 400k, warn 320k).
QUESTIONS: Keep both stateFreshMinutes and probeEveryMinutes, or drop one (recommendation: drop probeEveryMinutes and let stateFreshMinutes set the far pace)?
