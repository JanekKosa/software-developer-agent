# Run H progress

Started 2026-10-25 19:07 (Get-Date). Worker for run H, reporting to the main session (no lead). Never commit.

## Files I own (repo `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`)

- `hooks\context-guard.mjs`, `lib\limit-stop.mjs`, `lib\config.mjs` (if needed), `scripts\limit-stop-server.mjs`,
  `scripts\watch-session.ps1`, `orchestration.config.json`
- tests: `tests\hooks\context-guard.test.mjs`, `tests\scripts\limit-stop-server.test.mjs`, `tests\lib\basics.test.mjs`,
  `tests\limit-scripts.tests.ps1`
- docs: `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`
- Not mine: `agents\*`, any `CLAUDE.md`, settings, anything outside the repo (text goes in the report).

## Baseline (19:15)

- The repo has no commits of these trees: `git status --short` lists every top folder as untracked (`??`). So the
  proof of what I changed is a hash list: `scratchpad\H\baseline-repo-hashes.txt` (92 files, whole repo minus .git)
  and `scratchpad\H\baseline-hashes.txt` (37 files of orchestrate-agents).
- No links in orchestrate-agents (`dir /AL /S` finds none).
- **The hook is live**: `~\.claude\settings.json` runs `hooks\context-guard.mjs` of this repo after every tool call
  of every session. So I build in a scratch copy (`scratchpad\H\work\orchestrate-agents`, 0 hash differences from
  the repo at 19:13) and copy the finished files into the repo only at the end, after its suites are green.
- Suites: running on the copy (= the repo's code) as the baseline; result below.

## Plan

1. Server (`scripts\limit-stop-server.mjs`): `--window context-cap` (no `--percent`, no `--resets-at`; ends after
   new `limitStop.capEndMinutes`); optional `--claude-pid <pid>` for both kinds (start refuses a pid not running;
   serve checks right after listening and every new `limitStop.processCheckSeconds`, exits when gone); a main
   request `{"role":"main"}` gets the main text once (no AGAIN). Cap wording "this session is at its context cap
   and hands over to a new one"; AGAIN and helper texts say "the session's context cap" instead of "the usage limit".
   Main text: send no stop message, wait for LEAD STOPPED until start + leadStopFallbackMinutes, TaskStop silent
   leads, write the hand-over listing each lead's hand-off; says the watch's lines mean the same.
2. Hook: for no agent_id, ask the pipe as main (`{"role":"main"}`), and read `transcript_path`'s tail (side chains
   skipped, like the watch); at `contextCaps.main.warn`, once (marker `session-<id>`), start the server
   (`start --session <id> --window context-cap [--claude-pid $env:CLAUDE_PID]`) and add a SESSION NEAR CAP text in
   the watch's words plus the server line's meaning (fallback: send STOP FOR LIMIT by message).
3. Watch: at SESSION NEAR CAP start the server too (cap kind, with `-ClaudePid` when > 0), print 3 lines like LIMIT
   NEAR (marker, server line, steps). Pass `--claude-pid` at LIMIT NEAR too.
4. G's gaps: S09 (valid request > 64 KB), S16 (startCheckSeconds 0), L02 (server keeps the connection open);
   bounded child runs in the server tests; mutants S11-S13. SESSION_ID_PATTERN: reuse it for the main marker key
   (so it is used) or remove the export.
5. Docs + report text. 6. Config `_why`s.

Proof: red tests first for each; both suites; parser; node --check; hook timing 20x main + agent before/after;
live check (made-up main transcript past 450k; made-up session's server telling main and an agent; a server given a
dead pid ends); mutation check; doc check.

## Done (in the scratch copy, 19:30; nothing in the repo yet)

- Server: `--window context-cap` (refuses --percent/--resets-at), `--claude-pid` (start refuses a dead pid; serve
  checks after listen and every processCheckSeconds), `{"role":"main"}` request told once, cap wording, cause
  phrase in AGAIN/helper texts, main text with deadline = start + leadStopFallbackMinutes. Shared
  `PROCESS_ID_PATTERN` in lib\limit-stop.mjs. Server tests: bounded runner (spawn timeout 20 s) instead of runNode,
  6 new feature tests + S09 + S16 tests. 19 of 19 pass (red first: 6 failed for the missing feature).
- Hook: main path (size first: marker `session-<id>`, start via spawnSync `start --window context-cap
  [--claude-pid]`, SESSION NEAR CAP text; then pipe ask `{"role":"main"}`). `latestContextSize(text,
  {skipSideChains})` in lib\transcript.mjs. 7 new hook tests + L02 test + 2 changed (main below warn; main asks as
  main). 39 of 39 pass in hook + transcript files (red first: 7 failed).
- Watch: SESSION NEAR CAP starts the server (cap, pid), prints 3 lines (marker, server line, steps via new
  Format-NearCapSteps; Format-StopSentence shared with LIMIT NEAR); LIMIT NEAR passes --claude-pid. Header says
  "first line" now. PS: 2 new tests + 2 changed (Lines[-1] -> Lines[0]) + pid case in the LIMIT NEAR test; the
  NEAR CAP and watch tests pass (red first: 3 failed).
- Config (copy): limitStop.capEndMinutes 60, processCheckSeconds 60, with _why.
- SESSION_ID_PATTERN: kept, now used by the hook for the main marker name.

## Closing (19:33, CONTEXT GUARD at 322k)

- Copy suites (19:31): Node 116 of 116, PowerShell 80 passed 0 failed. (One server test, pid 4, added after.)
- Docs in the copy: SKILL.md (3 places), usage-limits.md (3, plus a new "At the main session's context cap"
  section), start-messages.md (2). Watch header "Its first line says why".
- Live check 19:31 (scratchpad\H\live-check.ps1, real settings, made-up session deadbeef-...c0df): main at 451k got
  the main stop text + SESSION NEAR CAP with STARTED (pid 7244); second call nothing; an agent got the cap worker
  text, a lead the cap lead text; the watch then printed 3 lines with RUNNING ALREADY; the server outlived the hook;
  stand-in Claude process stopped -> server gone after 58 s (processCheckSeconds 60); start with a dead pid: NOT
  STARTED; serve with it ended in 0.1 s. The log did not exist before; removed. Marker removed.
- Mutation check: running in the background (task bf5cnl8ja, scratchpad\H\mutation-results.txt).
- Left: install the changed files into the repo; repo suites through run-heavy; timing after; real main
  transcripts check (scratchpad\H\main-sizes.ps1); doc grep; report.

## Measured (19:16)

- Baseline on the copy (= repo code), through run-heavy: Node 101 of 101 pass; PowerShell 78 passed, 0 failed.
- Hook time before, 20 runs each, no server, 2 MB transcripts below warn: main input median 70 ms (68-82), agent
  input median 74 ms (71-82). Script: `scratchpad\H\time-hook.mjs <orch folder> <label>`.
- Hooks get `CLAUDE_PID`: read in Claude Code 2.1.310's claude.exe: the hook runner builds its env as
  `{...inherited, ...RQe(y), CLAUDE_PROJECT_DIR}` and `RQe` sets `CLAUDE_PID: String(process.pid)` (the same builder
  the tool shells use). Read in the binary, not seen in a run.
- `process.kill(pid, 0)` on this Windows (Node 24.13.0): live pid no throw; pid 4 EPERM (exists); 999999 ESRCH.
- G's mutants (scratchpad\G\mutants.ps1): S09 `bytes > MAX_LINE_BYTES` *100; S11/S12/S13 `if (false)` for the
  window, percent and resets-at checks; S16 drops `child.kill()`; L02 `chunk.includes(0x0a)` -> false.

## Finished (20:01)

- Installed 12 files into the repo (hashes equal to the copy). Main session was at 229k before the install.
- Repo: Node 117 of 117; PowerShell 80 passed, 0 failed; node --check 23 files clean; parser 0 errors on 3 files.
- Mutation: 39 run, 38 caught (S09, S11, S12, S13, S16, L02 all caught); K10 survives (start's line check).
- Hook time idle after: main 73 ms, agent 72 ms (before 70 and 74). The 104/124 ms reading was under mutation load.
- Real main transcripts: 109 files, tail vs whole 0 differences; watch vs hook 1 (live file grew).
- Not mine, changed during my run: repo root CLAUDE.md, references\limits-and-caps-guide.html (new).
- Cleanup: work copy, mut and mut-logs deleted; no limit-stop server running; limit-stop.log absent. Scripts in
  scratchpad\H (mutate.ps1 and main-sizes.ps1 pointed at the deleted work copy).
- Report: H_REPORT_CLAUDE.md.
