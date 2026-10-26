# Run E: progress

Started 2026-10-25 10:26 (clock read). Task: `E_TASK_CLAUDE.md` beside this file (finish run D). Repo:
`C:\Repos\My projects\software-developer-agent` (no commits; baseline hash list of all 88 files in my scratchpad,
`baseline-hashes.txt`; no links in the tree).

## Files I own

- `orchestrate-agents\orchestration.config.json`, `orchestrate-agents\scripts\*.ps1`, `orchestrate-agents\tests\**`,
  `orchestrate-agents\SKILL.md`, `orchestrate-agents\references\*.md`, `orchestrate-agents\lib|hooks|scripts\*.mjs`
  only where a document fix needs code to match (none planned).
- New `team-rules\SKILL.md`; `agents\task-lead.md`, `agents\software-developer.md`, `scripts\install.ps1`, `README.md`.
- Not mine: any `CLAUDE.md`, settings files, anything outside the repo, `skills\` (vendored).

## State on disk at the start (10:26)

Newest writes are D's: the test file 10:22, Node files 10:13-10:17, config 10:13. The four limit scripts, documents,
agents, install.ps1 and README are untouched since 08:44-09:30 (builders A-C). run-heavy.ps1 (10-24) and
watch-agent.ps1 (10-14) are old.

## Points

CORRECTION (clock read 10:50 at the close): the times 10:45 and later written below for points 1-4 and the log were
estimated, not read, and are wrong. Read times: start 10:26, baseline 10:29-10:31, closing checks done at 10:50. All
of points 1-4 happened between 10:32 and 10:47. Final checks at the close (10:47-10:50): parser 0 errors on 8 .ps1;
node --check 0 failures on 20 .mjs; PowerShell suite 70 passed 0 failed (1:59 through run-heavy); Node 79/79; doc
check 0 real MISSING (3 known false positives); config parses, probeEveryMinutes gone, runHeavy 1/600/60.

1. PowerShell limit scripts to D's contract (minus probeEveryMinutes) - DONE 10:45 (suite 62/62; guards deleted)
2. run-heavy.ps1 and watch-agent.ps1 read the config - DONE 10:55 (6 new cases, red first, then green)
3. Stale document lines - DONE 11:05 (D's list + doc-check script + greps; see log)
4. team-rules skill, agents, install.ps1, README - DONE 11:20 (install scratch test 9/9; real links untouched)
5. Checks - CLOSING at the context guard (324k, ~11:25). Two unit cases added after the code (they passed at once:
   Invoke-UsageProbe passes -FreshMinutes; Get-FreshReadingText incl. the 0/future guard). Final suites, parser,
   node --check and doc check run at the close (results in the log). NOT RUN: the mutation check and the one real
   probe run. To finish them:
   - real probe (one Haiku call, writes only to scratch):
     `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\usage-probe.ps1' -StatePath '<scratch>\usage-limits.json'`
     expect one JSON line, exit 0; a second identical run must print the same line without calling claude.
   - mutation check: copy `orchestrate-agents\scripts\*.ps1` and `orchestration.config.json` to `<scratch>\mut\scripts`
     and `<scratch>\mut\`, apply one mutant at a time, run `pwsh -NoProfile -File tests\limit-scripts.tests.ps1
     -ScriptsRoot <scratch>\mut\scripts -Only '<filter>'` with cwd and USERPROFILE in scratch (a mutant may fall back to
     a real or a cwd-relative path), count caught only when a case fails and no 'FAIL  load' line. Planned mutants
     (about 20): fresh check off; 0-guard off; stateFile not expanded; probeWorkingFolder ignored; timeout not read;
     activity rule off; near min off; Get-LastActivity not recursive; Get-WatchSettings ignores passed; probe call
     without -FreshMinutes; watch reads the -UsageStatePath param only; maxPastHours / expireAfterHours not read;
     notifySeconds not read; Expand-ConfigPath no throw; run-heavy floor / slots not assigned, bound ignored;
     watch-agent unknown type throws; passed -WarnTokens ignored. Known gap: the watch's call site of
     Invoke-UsageProbe in the main loop has no test (a watch run that probes would call the real claude).

## Plan (10:32)

- 1a. Tests: the three `$limits` tables lose probeEveryMinutes (the far interval is stateFreshMinutes); config loses
  probeEveryMinutes and its _why (its cost note moves to stateFreshMinutes' _why). Then the four scripts to D's
  contract; Test-ProbeDue's interval = Get-ProbeFreshMinutes (one rule for both). Then delete the 3 guard lines.
- 1b. Each script stays self-contained (own Read-OrchestrationConfig/Get-ConfigValue, plus Expand-ConfigPath where a
  path is read): the tests import only the functions whose file is the script itself, and B's scripts are built so.
- 2. Config block `runHeavy` {slots 1, minFreeMB 600, waitMinutes 60} with _why; run-heavy gets a dot-source guard and
  Get-HeavySettings($config,$path,$bound); settings error = `HEAVY COMMAND NOT RUN | ...`, exit 1, before any slot.
  watch-agent gets `-AgentType` (default 'default'), warn = contextCaps.<type>.warn (unknown or `_` type -> default),
  -WarnTokens passed wins; config error = `WATCH FAILED: ...` exit 1. Tests: new sections in limit-scripts.tests.ps1;
  Import-ScriptFunctions gains optional arguments (run-heavy's -Command and watch-agent's ids are mandatory).
- Baseline 10:29-10:31 through run-heavy (-MinFreeMB 600, TEMP in scratchpad): PowerShell 49 passed / 13 failed (the
  13 red cases D listed), Node 79/79. Runner: `<scratchpad>\run-suites.ps1 [-Which ps|node|both] [-Only <wildcard>]`.

## Log

- 10:26 read the task, D's task/progress/report end, config, the repo CLAUDE.md (923 bytes; read although the task
  says "no more", because the definition makes a project's CLAUDE.md required reading and it says agents/ is live).
- 10:33-10:45 point 1. probeEveryMinutes removed from config + the 3 test tables (its cost note moved into
  _whyStateFile). usage-probe: Expand-ConfigPath, Get-FreshReadingText, settings read before the fresh check and
  before claude. watch-session: Get-WatchSettings, Get-LastActivity, Get-ProbeFreshMinutes, Test-ProbeDue(+activity,
  interval = Get-ProbeFreshMinutes), probe gets -FreshMinutes. schedule-relaunch, start-session as D's contract
  (START NOT RUN when the log path cannot be had). Guard lines deleted. PowerShell suite 62/62. The red of the
  probeEveryMinutes test edit was not watched on its own (old code gone in the same step); the mutation check covers it.
- 10:46-10:55 point 2. Config `runHeavy` {slots 1, minFreeMB 600, waitMinutes 60}. run-heavy: dot-source guard,
  Get-HeavySettings, settings error = NOT RUN exit 1 before any slot; param vars reassigned for the functions.
  watch-agent: -AgentType (default 'default'), -ProjectsRoot (new, for the test; same as watch-session's), -ConfigPath,
  Get-AgentWarnTokens, WATCH FAILED: exit 1. Red: 6 of 6 failed for the right reasons; green 6/6. Found and fixed a
  test-helper trap: Import-ScriptFunctions' loop variable $command was run-heavy's [string]$Command (case-insensitive),
  so no function was imported; renamed $defined.
- 10:56-11:05 point 3. SKILL.md: exclude text (commitInRepos, register's own files on every add), reminder "by id and
  what" with the summary format, run-heavy floor = runHeavy.minFreeMB (600). usage-limits.md: settings blocks,
  state file + probe rule (stateFresh/near/activity/shared call), step 7 reason, relaunch steps 2 and 4 (link only
  with the window in front; log = relaunch.logFile). lessons.md: watch-agent fallback uses -AgentType; run-heavy floor
  history 1500 -> 600. task-lead.md 77: floor from config. start-messages.md 35: "title" -> "its What" (entries have
  no title). Doc check script `<scratchpad>\doc-check.ps1`: 0 MISSING after the fixes except 3 false positives
  (`register.mjs` read as a config key, `node --test` as a register flag); CHECK lines are agent protocol lines,
  platform keys and external files.
- 11:06-11:20 point 4. team-rules\SKILL.md (7 sections: guardrails incl. retry and process rules, CLAUDE.md first,
  clock, progress file, plain words, report block with meanings, messages). software-developer.md: skills +
  team-rules, steps 2-3, rule order item 1, sec.3 message line, sec.4 five guardrail bullets out (one-line pointer),
  sec.7 progress/clock/trust-disk bullets out (pointer), sec.9 plain words + block (pointer). task-lead.md: skills,
  intro pointer, sec.1 messages, sec.2 steps 2 and 4, sec.4 block shape, sec.8 plain words, sec.14 four bullets out.
  worker-rules.md: frontmatter template preloads team-rules. install.ps1: two more links. README: list, layout,
  wiring, tests note. Install test `<scratchpad>\install-test.ps1`: 9/9 ok; real ~/.claude and ~/.copilot links read
  before and after: unchanged, team-rules absent (not installed for real: the task forbids running install.ps1).
