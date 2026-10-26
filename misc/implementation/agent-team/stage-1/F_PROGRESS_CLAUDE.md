# Run F: progress

Started 2026-10-25 16:54 (clock read). Task: `F_TASK_CLAUDE.md` beside this file. Repo:
`C:\Repos\My projects\software-developer-agent` (no commits in it; no links in the tree, 89 files; baseline hash list
in `<scratch>\F\baseline-hashes.txt`, where `<scratch>` is
`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\7b3870e5-e7c1-4f3a-9961-398d55920189\scratchpad`;
the scratchpad is shared with runs D and E, so everything of mine is under `<scratch>\F`).

## Files I own

- `orchestrate-agents\scripts\watch-session.ps1` (point 1), `orchestrate-agents\scripts\watch-agent.ps1` (point 2),
  `orchestrate-agents\tests\limit-scripts.tests.ps1` (tests), `orchestrate-agents\SKILL.md` and
  `orchestrate-agents\references\usage-limits.md` (only lines my changes make stale), the config's `_why` text only if
  it turns stale.
- Not mine: any `CLAUDE.md`, settings files, anything outside the repo, `skills\` (vendored), other agents/sessions.

## Read (16:54-17:00)

Task file; E's progress file; E's report, last section ("Learned" and the block); the config; the repo `CLAUDE.md`
(923 bytes, required by team-rules section 2); watch-agent.ps1 whole; watch-session.ps1 lines 340-379 and 505-584;
the test file by ranges (runner, fixtures, session-agents and decision cases, watch-agent section). The three vendored
skills (karpathy, TDD, verification) were not re-read: the task says "Read first, and no more" (task beats definition).

## Measured (17:00)

- Real meta files under `~\.claude\projects`: 508, of which 69 have `"finished": true` (a JSON boolean), 439 have no
  `finished` field, none has `false` or a string. 335 of the 508 sit in `workflows` folders. The field is added when a
  background agent ends (E's meta: written 10:52 with `finished: true`; my own meta at 16:54 has none).
- The meta file sits beside the transcript: `<session>\subagents\agent-<id>.meta.json`, with `agentType`.

## Plan (17:00)

1. watch-session: new `Test-AgentFinished($metaPath)` (true only for a JSON boolean true); `Get-SessionAgents` skips
   such an agent like an ignored type. Tests first: Get-SessionAgents with a finished warm worker (left out), an
   unfinished one (`finished: false`, counted), one without the field (counted), plus the effect on Get-LimitDecision
   (resume with the finished worker left out; hand-over when the same worker is unfinished).
2. watch-agent: `-AgentType` loses its default; new `Select-AgentType($passed, $metaPath)`: passed wins, else the
   meta's agentType, else 'default'. The warning size is resolved per look once the transcript is found (the meta may
   be written after the watch starts); -WarnTokens passed still wins; a config error stays WATCH FAILED exit 1. Tests:
   unit Select-AgentType (passed / meta / no meta / meta without the field / unreadable?) and runs: meta type used,
   -AgentType overrides the meta, neither gives default.
3. Mutation check (E's ~20 planned mutants + mine), driver in `<scratch>\F\mutate.ps1`, PATH stripped of claude and
   USERPROFILE/cwd in scratch so a mutant cannot reach the real probe or real paths. Then one real probe run.
4. Suites, parser, node --check, doc check.

## Log

- 16:55 baseline hashes (89 files); baseline suites started through run-heavy (`<scratch>\F\run-suites.ps1 -Tag baseline`).
- 17:00 baseline: PowerShell 70 passed / 0 failed. Node 78 of 79: the one failure is the timing case "it finishes
  well under one second" in `tests\hooks\decision-reminder.test.mjs` (median 1065 ms) while the machine was loaded;
  not my file; re-run it on its own at the end.
- 17:01-17:03 point 1 DONE. Fixture `New-FixtureSession` takes `Finished` (meta gets `finished`). Two new cases:
  Get-SessionAgents leaves out `finished: true` only (false, no field, the text "true" all count; Test-AgentFinished
  unit asserts incl. no meta file), and the effect on Get-LimitDecision (finished warm worker: resume; same worker
  unfinished: hand-over). Red first: 2 failed for the right reason (worker counted; hand-over). Code:
  `Test-AgentFinished` in watch-session.ps1 (JSON boolean true only), used in Get-SessionAgents beside the ignored
  types; header comment updated. Green: 'watch*' 36/36.
- 17:03-17:07 point 2 DONE. watch-agent.ps1: `-AgentType` has no default now; `Get-MetaAgentType` (agentType from
  `agent-<id>.meta.json`, 'default' for no file / no field / empty, $null for unreadable JSON); main part:
  -WarnTokens > -AgentType (fixed at the start, fails fast) > meta type read at every look > default; an unreadable
  meta keeps the last warning size (default before there is one). Tests: unit Get-MetaAgentType (5 asserts) and a run
  case (meta type 300000; -AgentType task-lead overrides 310000; no meta 320000 default). Red first: 2 failed for
  the right reason (function missing; 320000 instead of 300000). Green 4/4. Then two more asserts added AFTER the code
  (passed at once): an unreadable meta at the first look gives default; a meta type with no warn key is WATCH FAILED
  exit 1. Mutants F13-F17 cover them.
- 17:08 mutation check started in the background through run-heavy: `<scratch>\F\mutate.ps1` with
  `<scratch>\F\mutants.ps1` (39 mutants: 27 of run E's changes, E01-E42; 12 of mine, F01-F17), all 39 old texts
  checked to occur exactly once. Output `<scratch>\F\mutate-out.txt`, results `<scratch>\F\mutation-results-_.txt`,
  logs per mutant `<scratch>\F\mut-logs\`. Do not edit scripts or the test file while it runs (it copies them fresh).
- 17:08 real probe run DONE (point 3b): `usage-probe.ps1 -StatePath <scratch>\F\probe\usage-limits.json -WorkingFolder
  <scratch>\F\probe\cwd`, twice. Run 1: exit 0, 12.1 s, one JSON line (five-hour 9.0% resets 17:20, weekly 55.0%
  resets 10-31 07:00). Run 2: exit 0, 2.7 s, the identical line, state file not rewritten (claude not called). The
  working folder stayed empty. Claude Code made an empty `<projects>\<cwd-named folder>\memory` folder; I deleted the
  two empty folders (non-recursive deletes). The default working folder's twin (`C--Users-user-AppData-Local-Temp-
  claude-usage-probe\memory`, 08:25) exists from earlier real probes; left alone (not mine).
- 17:09 doc check: usage-limits.md line 35-37 (the decision: what is left out) now names finished agents; SKILL.md
  "Usage limits" first paragraph says finished agents, helper types and workflow agents do not count. lessons.md
  line 25 (watch-agent fallback with `-AgentType software-developer`) is still correct (an override) and left as is.
  The config's `_whyIgnoreAgentTypes` is not stale (it does not claim to list everything left out); left as is.
- Measured 17:08: 69 of 69 finished meta files were last written at the same second as their transcript (the flag
  is written when the agent ends). NOT checked: whether Claude Code removes `finished` when an agent is resumed
  with SendMessage (needs starting agents, which the task forbids).
