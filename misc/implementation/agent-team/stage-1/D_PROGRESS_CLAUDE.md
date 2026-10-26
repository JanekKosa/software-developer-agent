# Run D: progress

Started 2026-10-25 10:00 (clock read). Task: `D_TASK_CLAUDE.md` beside this file. Repo:
`C:\Repos\My projects\software-developer-agent` (no commits yet: every file is untracked, so the baseline is a hash
list in my scratchpad, `baseline-hashes.txt`, 88 files, no links in the tree).

## Files I own

- `orchestrate-agents\orchestration.config.json`, `lib\*.mjs`, `hooks\*.mjs`, `scripts\*.ps1`, `scripts\register.mjs`,
  `tests\**`, `SKILL.md`, `references\*.md` (points 1-4, 6)
- new `team-rules\SKILL.md`; `agents\task-lead.md`, `agents\software-developer.md`, `scripts\install.ps1`,
  `README.md` (point 5)
- Not mine: any `CLAUDE.md`, settings files, anything outside the repo, `skills\` (vendored).

## Points (state at 10:30, closed at the context guard's warning, 320k of 400k)

1. Config contract - Node part DONE (79/79). Config keys for the PowerShell part DONE. PowerShell code NOT STARTED;
   its tests are written and red (contract below).
2. Probe only when something is spent - tests written and red; code NOT STARTED.
3. Reminder names blocking items - DONE (code, hook text, tests). SKILL.md line 107-108 text NOT changed (point 4).
4. Stale document lines - NOT STARTED.
5. team-rules skill - NOT STARTED (design notes below).
6. Checks - ran at the close: Node 79/79; PowerShell 49 passed, 13 failed (all 13 are the new red cases, incl. the
   old 'probe: a missing settings key' case that now also asks for the new keys); parser 0 errors on all 8 .ps1;
   node --check 0 failures on every .mjs. Doc check, install.ps1 test, mutation check: NOT RUN.

## The contract the next run must make green (tests\limit-scripts.tests.ps1)

- usage-probe.ps1: `-StatePath`, `-WorkingFolder`, `-TimeoutSeconds` lose their defaults; when not passed they come
  from `usageLimits.stateFile` / `probeWorkingFolder` (both %VAR%-expanded; an unset %VAR% is `USAGE PROBE FAILED`
  naming the key and the variable) / `probeTimeoutSeconds`. New `-FreshMinutes` (default
  `usageLimits.stateFreshMinutes`): a readable reading in the state file younger than that is printed as it is
  (byte for byte), claude is not called, exit 0; `-FreshMinutes 0` always calls. Read every key before starting
  claude (the missing-key case needs `no key '<key>'`).
- watch-session.ps1: new functions `Get-WatchSettings($config, $path, $bound)` -> hashtable WarnTokens
  (contextCaps.main.warn), WakeOnErrors, ResetMarginMinutes, RetryMinutes, EverySeconds, TailMegabytes,
  CacheLookbackReplies (watchSession.*), UsageStatePath (usageLimits.stateFile expanded); a passed parameter wins and
  its key is then not needed. `Get-LastActivity($transcript, $session)` -> newest LastWriteTime (DateTimeOffset) of
  the session transcript and every `agent-*.jsonl` under `<session>\subagents` recursively (workflows included).
  `Test-ProbeDue($reading, $lastAttempt, $now, $limits, $lastActivity)`: not due when $lastActivity is known and
  <= the reading's CheckedAt (or, with no reading, the last attempt); $null activity keeps the old rule.
  `Get-ProbeFreshMinutes($reading, $limits)`: stateFreshMinutes far or with no reading, min(stateFreshMinutes,
  probeNearEveryMinutes) near. Limits gain stateFreshMinutes. The loop passes `-FreshMinutes` to the probe.
  Remove the param defaults that moved; keep ShortCacheMinutes/LongCacheMinutes (API facts) and ProjectsRoot.
- schedule-relaunch.ps1: `-ExpireAfterHours`/`-MaxPastHours` from `relaunch.expireAfterHours`/`maxPastHours` unless
  passed; read both before -DryRun returns.
- start-session-in-vscode.ps1: `-NotifySeconds`/`-LogPath` from `relaunch.notifySeconds`/`relaunch.logFile`
  (expanded) unless passed; a broken log path prints `START NOT RUN | ...` (no log to write) and exits 1; a missing
  notifySeconds is logged `not started: ... no key 'relaunch.notifySeconds'`, exit 1.
- Then delete the three `if (-not (Select-String ...)) { throw 'not run: ...' }` guard lines in the test file: they
  stop those cases touching the real state file, the real probe and the real relaunch.log while the scripts are old.

## Left for point 4 and 5 (found while reading)

- SKILL.md 104-105 (exclude text, A2's wording), 107-108 ("by id and title" -> "by id and what"), 177 (run-heavy's
  1500 MB is a param default); references\usage-limits.md 22-24 (state file and probe rule), 103-105 (relaunch opens
  nothing unless the window is in front; log path from relaunch.logFile).
- team-rules: guardrails (worker sec.4 credentials/customer data, live environments, commit), plain reports (worker
  sec.9 opening), clock, progress file (worker sec.7 + "trust the disk"), the four-line block with meanings, messages
  (worker sec.3 line "Send no message", lead sec.1 last paragraph), reading CLAUDE.md first (worker sec.1 step 3, lead
  sec.2 step 2). Worker sec.2 item 1 must then name team-rules' guardrails too. install.ps1 Get-LinkPlan: two more
  entries; test with USERPROFILE pointed at a scratch folder, links removed with Directory.Delete(path, $false).

## Log

- 10:00-10:10 baseline: Node 71/71, PowerShell 50/50, both through run-heavy.ps1. run-heavy's default 1500 MB free
  was never reached (the machine had 780-990 MB free), so every run passes `-MinFreeMB 600`; runner script
  `<scratchpad>\run-suites.ps1`, TEMP pointed into the scratchpad.
- ~10:35 point 1 (Node part) and point 3 done. Config: `register.lockWaitSeconds/lockStaleSeconds/_whyLock`,
  `contextGuard{transcriptTailKB, markerFolder, markerLockStaleSeconds}` (A2's text), plus for the PowerShell part
  `usageLimits.probeTimeoutSeconds/probeWorkingFolder`, `relaunch.expireAfterHours/maxPastHours/notifySeconds/logFile`,
  a `watchSession` block. New `requireNumberSetting` in lib/config.mjs (a NaN wait would loop forever). Lock timing
  travels in `registerLocation` (lockWaitMs, lockStaleMs). Summary: blocking items as `D-0004 "<What, max 80 chars,
  cut by code point, ellipsis when cut>"`, id alone when a hand-made entry has no What. Hook text "by id and what".
  RED: 10 tests failed for the expected reasons; GREEN: 79/79.
- Decision on stateFreshMinutes vs probeEveryMinutes (both 15): the watch asks every probeEveryMinutes (near:
  probeNearEveryMinutes) and only while its session or agents wrote since the last reading; usage-probe.ps1 calls the
  API only when the shared reading is older than -FreshMinutes (default stateFreshMinutes); the watch passes
  stateFreshMinutes far and min(stateFreshMinutes, probeNearEveryMinutes) near.
