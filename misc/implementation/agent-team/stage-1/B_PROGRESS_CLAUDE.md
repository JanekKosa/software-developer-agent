# Agent team stage 1, builder B: progress

Started 2026-10-25 08:06 (clock read). Plan of record: `AGENT_TEAM_STAGE_1_PLAN_CLAUDE.md`, sections 1, 2, 3, 8, 11.

## Files I own (under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`)

- `scripts\usage-probe.ps1` (new)
- `scripts\watch-session.ps1` (extend; keep every existing marker and behaviour)
- `scripts\schedule-relaunch.ps1` (new)
- `scripts\start-session-in-vscode.ps1` (new)
- `tests\` PowerShell test scripts for these only

## Baseline (08:07)

- Repo has no commits; `git status --short` lists every top-level entry as untracked (`??`).
- `scripts\` hashes (first 16 hex of SHA256): run-heavy.ps1 0EF9005197A887A4, watch-agent.ps1 2954A38BC6F489BA,
  watch-session.ps1 31D7B5855FBFEB18 (10,994 bytes, 2026-10-24 10:33).
- `tests\` does not exist yet.
- Config `orchestration.config.json` read whole; keys used: usageLimits.* and relaunch.*.

## Plan (08:14)

1. Tests first: `tests\limit-scripts.tests.ps1`, a self-contained runner (Pester 5 is not installed; only Pester 3.4
   for Windows PowerShell, so no new dependency). Unit cases dot-source each script (dot-source guard
   `if ($MyInvocation.InvocationName -eq '.') { return }` before the main body); integration cases run the watch as
   a child `pwsh` with fixture transcripts, `-EverySeconds 1`, `-UsageReadingPath <fixture>` (the probe never runs)
   and a dummy `-ClaudePid` process whose exit ends a quiet watch.
2. `usage-probe.ps1`: `claude -p` probe via ProcessStartInfo.ArgumentList in `%TEMP%\claude-usage-probe`, child env
   stripped of the parent-session variables (CLAUDECODE, CLAUDE_PID, CLAUDE_CODE_SESSION_ID, ..._MESSAGING_*,
   ..._CHILD_SESSION, ..._ENTRYPOINT, ..._SESSION_ATTENDED, CLAUDE_AGENT_SDK_VERSION) so it cannot bind to the
   calling session; `--no-session-persistence` when `claude --help` lists it (it does in 2.1.286), else delete the
   probe transcript written after the start. Atomic write (temp + File.Move overwrite).
3. `watch-session.ps1`: new params `-ConfigPath`, `-UsageStatePath`, `-UsageReadingPath` (test seam),
   `-ShortCacheMinutes 5`, `-LongCacheMinutes 60`, `-CacheLookbackReplies 20`. Loop order: stop error (existing,
   plus SESSION RESET COLD for rate_limit) -> NEAR CAP (existing) -> usage limit (new). Decision record in
   `%TEMP%\claude-session-watch-<session>.decision.json`.
4. `schedule-relaunch.ps1`, `start-session-in-vscode.ps1` per plan 8.3/8.4.
5. Replay: the original watch (copy in scratchpad `b\original`) and the new one on the same existing-marker fixtures.
6. Mutation check on the watch's decision functions.

## Done

- 08:20 tests written (`tests\limit-scripts.tests.ps1`, 39 cases + 1 opt-in `-RealTask`). RED run against
  skeletons: 31 failed, 8 passed (existing markers and "quiet/refuses" cases), 104 s.
- 08:25 `usage-probe.ps1` built; 9/9 probe cases pass. Real run 1 (to a scratch -StatePath): 3.5 s, printed
  `{"checkedAt":"2026-10-25T08:25:08+01:00","fiveHour":{"percent":18.0,"resetsAt":"2026-10-25T12:10:00+01:00"},"weekly":{"percent":48.0,"resetsAt":"2026-10-31T07:00:00+01:00"}}`.
  No transcript kept; it created an EMPTY folder `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-usage-probe`
  (not there before). Found and fixed: no `exit 0` on success left a stale `$LASTEXITCODE` for `&` callers.
- about 08:29 (before the start-script run logged at 08:31:38; corrected from a guessed 08:40) `watch-session.ps1` extended; 21/21 watch cases pass (10 unit, 11 runs), 31 s. Decisions taken while
  building: (a) a window whose resetsAt has passed does not trip (a stale reading right after a reset would
  otherwise hand over falsely); (b) a hand-over on record (resetsAt still ahead) keeps the watch quiet: never
  back, never announced twice; (c) at wake time after a rate_limit stop, agents are counted as warm at the stop
  time, and "cold" uses the same reset+resumeMarginMinutes deadline as the live decision; (d) server_error stops
  keep the old SESSION RESUMED; (e) the probe's last attempt is remembered in memory so a failing probe is retried
  only at the next interval, never every loop. Get-ContextTokens now uses the new Get-ReplyTokens (same sum).

- 08:31-08:37 `schedule-relaunch.ps1` and `start-session-in-vscode.ps1` built; relaunch 5/5, start 4/4. One parse
  error fixed (`[ordered]@{}.GetEnumerator()` needs parentheses). Real task (`-RealTask`): registered
  `ClaudeRelaunch-run6-202710250937` (Interactive, Limited, Ready), repeat said ALREADY SCHEDULED, removed; 0 tasks
  before and after. Start dry run: found code.cmd, 1 window `Token usage analysis and... - xpp-agent - Visual
  Studio Code`, matched; nothing run/focused/opened/pressed (deliberate: the plan's dry run would run step 2's Alt
  unlock, a keystroke the task forbids).
- Full suite 39/39, 47 s. Teardown left one empty folder (Windows lazy delete); teardown now makes a second pass.
- Replay (scratch `b\replay.ps1`): 8 scenarios, 7 identical (exit + output, clock masked), 1 named improvement
  (rate_limit stop + cold worker: SESSION RESET COLD instead of SESSION RESUMED).
- Mutation check started 08:36 (scratch `b\mut.ps1`, 26 mutants). W1 (warm boundary) survived -> added an edge
  assertion; W11 (stop counts agents at wake) expected to survive -> added an assertion. Re-run both at the end.
- 08:39 review found: probe swallowed a failed state-file write (printed JSON, exit 0). RED shown by a new fake-claude
  (.cmd) run case, fixed (try/catch -> USAGE PROBE FAILED, exit 1); probe 12/12.
- Report draft written: `B_REPORT_CLAUDE.md` (placeholders MUTATION_LINE and FINAL_SUITE_LINE to fill).

- 08:45 mutation check finished: 25 of 26 caught; W1 re-run against the final tests: caught -> 26 of 26.
- 08:46 final suite after the last change: 42 passed, 0 failed, 32 s; work folder removed; parser: 0 errors in all
  seven .ps1 files of scripts\ and tests\. run-heavy.ps1 and watch-agent.ps1 hashes unchanged from the baseline.
- 08:47 real probe run 2 (after the last probe change), child pwsh: exit 0, 6.6 s, five-hour 25%, weekly 49%.
- 08:47 scratch folder `b` deleted (replay.ps1, mut.ps1, original copy and outputs with it); 0 ClaudeRelaunch tasks,
  0 test folders in TEMP, 0 stand-in or watch processes left.
- Report complete: `B_REPORT_CLAUDE.md`.

## Left

Nothing in my files. Open points for the lead (in the report): probe frequency near the weekly threshold, the weekly
stop message format, whether finished subagents count, a shared config helper, the shared-file text for the two new
markers and the watch's new path.

## Measured facts (2026-10-25)

- Subagent transcript records: `type:"assistant"`, `isSidechain:true`, `agentId`, `timestamp` ISO UTC with `Z`,
  `message.usage.cache_creation.{ephemeral_1h_input_tokens, ephemeral_5m_input_tokens}`. Subagents write 5m only;
  the main session writes 1h only (checked on session 7b3870e5). One API reply spans several records with the same
  usage.
- `agent-*.meta.json`: `{"agentType":..,"spawnDepth":..,"requestShape":..,"model":..,"finished":true}`; workflow
  agents live in `subagents\workflows\wf_*\agent-*.jsonl` with `workflowPhase`.
- `claude --help` (2.1.286) lists `--no-session-persistence`; `--max-turns` is not listed (hidden; the plan's
  experiment used it).
- The calling shell carries CLAUDE_CODE_MESSAGING_SOCKET/TOKEN, CLAUDE_CODE_SESSION_ID, CLAUDE_CODE_CHILD_SESSION,
  CLAUDECODE, CLAUDE_PID (names only read).
- VS Code: one `Code` process has a main window, title `Token usage analysis and... - xpp-agent - Visual Studio Code`.
  `code.cmd` = `Code.exe resources\app\out\cli.js %*` with ELECTRON_RUN_AS_NODE=1, beside Code.exe in `bin\`.
- Culture is pl-PL: every number/date format and parse uses the invariant culture.
- LocalMachine execution policy RemoteSigned: local scripts run from a scheduled task without -ExecutionPolicy.

