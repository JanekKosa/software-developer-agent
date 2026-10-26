# Run K4 progress (worker, started by the main session directly; never commit)

Started 2026-10-26 01:10 (Get-Date).

## Files I own

Scratch copy `<scratch>\K\repo\orchestrate-agents\` (`<scratch>` =
`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad`):
- `scripts\watch-session.ps1` and `tests\limit-scripts.tests.ps1` (the small fix, red first)
- `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md` (docs); the scratch `README.md` only if
  it names a removed setting
Live repo: install of the files runs K to K4 changed, after a hash list; this file and `K4_REPORT_CLAUDE.md`.
Not mine: `agents\`, any `CLAUDE.md`, settings files, `references\limits-and-caps-guide.html` (list only), the
register, `misc\` (except my two files).

## Read so far

K_TASK, the three hand-off sections (K, K2, K3), the three skills, the repo's CLAUDE.md.

## Baseline (01:11-01:15)

- `<scratch>\K4\compare.ps1` (scratch vs live vs `<scratch>\K\orig`, skipping `.git\` and `misc\`): 8 files changed
  in the scratch copy by K-K3, live = orig for each: `hooks\context-guard.mjs`, `lib\limit-stop.mjs`,
  `orchestration.config.json`, `scripts\limit-stop-server.mjs`, `scripts\watch-session.ps1`,
  `tests\hooks\context-guard.test.mjs`, `tests\limit-scripts.tests.ps1`, `tests\scripts\limit-stop-server.test.mjs`.
  One more differs and must not be copied: `decisions\OPEN_DECISIONS_CLAUDE.md` (the live register is newer).
  `agents\`, `CLAUDE.md`, `README.md`, the guide page: the same on both sides.
- Live `orchestrate-agents` files all last written by 22:46:52, the same as K's `orig` (taken 22:58).
- Suites baseline: started 01:15 (run-heavy), outputs `<scratch>\K4\baseline-ps.txt`, `baseline-node.txt`.

## Plan for the small fix (01:16)

What: during a hand-over on record, a check line other than FINE that equals the line a watch already reported for
this hand-over is not reported again; the watch stays quiet and keeps checking. It reports again when the line
changes, or after a FINE check (the cause cleared) when it comes back.
How: the decision record keeps `reportedCheck` (the last reported line). `Read-DecisionRecord` returns it as
`ReportedCheck`; a new `Set-ReportedCheck` sets or removes it and leaves the rest of the record as it was; a new
hand-over (Write-DecisionRecord / Write-CapRecord) starts without it. A record that cannot be written fails open:
the line is still reported (it may repeat, as before); a clear that fails is remembered in memory for this run, so a
comeback is never missed. Why the record: it is the hand-over's own state, already in %TEMP%, read every look; no new
file. Text after NOT CHECKED changes to say it says no more of this until the cause changes, or clears and comes back.
Proof: the stub server reads its check line from `stub-check-says-<session>.txt` when present (changeable mid-run);
red-first cases: restarted with the same NOT CHECKED / FAILED line -> quiet and checking; changed line -> reported;
FINE then the same line -> reported; read-only record -> still reported, and a failed clear does not hide a comeback;
unit round trip of the record. Then the mutation check of the changed lines.

## Done: the small fix (01:16-01:24; times corrected at 01:33 from file times, the first ones were guessed)

- Baseline (01:15-01:19, run-heavy, scratch): PS 100 passed 0 failed; Node 145 tests, 144 pass, 1 fail (the known
  "the shipped settings show this repo's register in every chat").
- Tests first (`tests\limit-scripts.tests.ps1`): stub check reads `stub-check-says-<session>.txt` first; helpers
  `Assert-SameRecord`, `Set-StubCheckSays` (write + atomic move), `Wait-StubChecks`, `New-CheckedSession`; constants
  `$NotCheckedAfter`, `$BusyLine`, `$DeniedLine`; new cases: unit "the reported check line is kept in the decision
  record ...", runs "started again while the check still says what a watch reported ..." (NOT CHECKED and FAILED),
  "started again after a reported check, it speaks again when the line changes, or when it clears and comes back",
  "a decision record that cannot be written hides no report ...". Existing "cannot check" case uses `$NotCheckedAfter`.
- Red (01:19-01:21): the sentence (3 cases), then after the sentence change the behaviour: "started again ... quiet:
  expected 0, got 2"; the unit and read-only cases: `Set-ReportedCheck` not recognized. The "speaks again" case
  passed already (it guards against hiding too much).
- Code (`scripts\watch-session.ps1`): `Read-DecisionRecord` adds `ReportedCheck`; new `Set-ReportedCheck` (returns
  bool, warns); loop: FINE clears a reported line (a failed clear sets `$clearFailed`, which makes this run ignore
  the record's line); a line equal to the reported one -> `continue`; else print the two lines, then keep the line,
  exit 0. NOT CHECKED's second sentence now: "... Start this watch again now: it checks again at each look and says
  no more of this until the cause changes, or clears and comes back." Header comment says it too. LF, no BOM kept;
  both files parse.
- Green (01:21-01:24, run-heavy, `-Only 'watch*'`): 57 passed, 0 failed.
- Mutation check started 01:25 in the background (`<scratch>\K4\mutate.ps1`, 15 mutants N01-N15, output
  `<scratch>\K4\mutation.txt`); dry run: all 15 apply and parse.

## Checks in the scratch copy so far

- 01:37: `node --check` of both hooks, the lib, the server and the two Node test files: exit 0 each; PowerShell
  parser: 0 errors in the 6 scripts and the test file; the config parses.
- Install prepared: `<scratch>\K4\install.ps1` (-Mode check | install | restore); check mode at 01:34: live repo 139
  files (no links: `dir /AL /S /B` found none), each of the 11 targets has 1 hard link, all 11 differ from the
  scratch copy. No limit-stop pipe is open on the machine and `%USERPROFILE%\.claude\state\limit-stop.log` does not
  exist (01:35). Live check prepared: `<scratch>\K4\live-check.ps1`.
- Install note: a session watch already running keeps the old code in memory (it read
  `leadStopFallbackMinutes` at its start, so it will not fail), but prints the old steps and never checks the
  server; the main session should restart its watch after the install.

## Hand-off (01:38, written at the context guard's warning, 321k of 400k; NOT installed, as the task says)

**Done and checked:** the small fix (red, then green: 57 of 57 watch cases); the docs in the scratch copy
(`SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`; README needs nothing); the doc check grep
(only the intended mentions left); `node --check`, parser, config parse. Texts for `agents\*` and xpp-agent's
`CLAUDE.md` and the guide's untrue sentences are in `K4_REPORT_CLAUDE.md`.
**Checked after the last change (01:58-02:03, run-heavy, scratch copy):** mutation 14 of 15 caught (N14, `-ceq`
made `-eq`, survived: no test has two lines that differ only in letter case; not added, closing at the guard);
PowerShell suite 104 passed, 0 failed; Node 145 tests, 144 pass, 1 fail (the known "the shipped settings show this
repo's register in every chat"); hook time after, no server, 20 runs: main median 66 ms (max 98), agent median 66 ms
(max 85), no output (K2's after: 67-68). The background mutation task reported exit 4: that is the last mutant's
failed-case count passed through, not an error.
**Left:** the install, the live suites, the live check.
**Exact next steps for a successor (read this file and `K_TASK_CLAUDE.md` only):**
1. (done) mutation.
2. (done) scratch suites and hook time.
3. Install: `& '<scratch>\K4\install.ps1' -Mode install` (hash list before, backup to `<scratch>\K4\live-backup`, the
   11 copies in one step, hash list after, the changed list: expect exactly the 11 files). Then both suites in the
   live repo through run-heavy, both fully green; on any failure `& '<scratch>\K4\install.ps1' -Mode restore` at
   once. Then `pwsh -NoProfile -File '<scratch>\K4\live-check.ps1' -Work '<scratch>\K4\live'` and show its output.
   It creates `%USERPROFILE%\.claude\state\limit-stop.log` (absent now); remove it only if every line names one of
   the two made-up sessions, and say so. Tell the main session to restart its session watch after the install.
4. Delete `<scratch>\K4\dry` and the `mut` folder if left.

## Done: docs (01:25-01:30), scratch copy

- `SKILL.md`: Starting work step 1 (restart after LIMIT NEAR and SESSION NEAR CAP, not after RESET COLD; TaskStop
  once scheduled); The lines (STOP FOR LIMIT by message only after LIMIT STOP SERVER FAILED); Sizes (start the watch
  again, told once, no deadline, stop command in the same step, TaskStop the watch); Usage limits (LIMIT NEAR without
  deadline or TaskStop of leads; new bullet LIMIT STOP SERVER FAILED and NOT CHECKED; RESET COLD with the stop).
- `references\usage-limits.md`: server's word entry (no end time); STARTED line (`until stop or the end of Claude
  Code process <pid>`), told once, no deadline; NOT STARTED -> FAILED line; steps 1-8 (deadline task, TaskStop of
  leads gone; step 4 = limit runs out first; step 6 adds the stop command and its lines; step 7 why); the paragraph
  after step 8 (no SESSION NEAR CAP during a hand-over); the cap steps (start the watch again, no deadline, stop
  command, TaskStop the watch); RESET COLD (stop command, why not restart); new sections "When the limit runs out
  before the leads stop" (what the user sees) and "When the limit-stop server fails" (FAILED line, busy/idle, once per
  server, the agent's line and log line, CLAUDE_PID, unreadable log repeats, NOT CHECKED said once).
- `references\start-messages.md`: successor of a lead cut off by the limit (not TaskStop); the stop message only
  after LIMIT STOP SERVER FAILED, to the leads without LEAD STOPPED, no deadline, tell the user; "with no server"
  dropped from the cap variant.
- `README.md`: names no removed setting (checked by grep): unchanged.
- Texts for agents\task-lead.md (section 11, lines 261-263), agents\software-developer.md (line 193) and xpp-agent
  CLAUDE.md (lines 39, 47-48, 53): composed for the report.
- Guide page sentences now untrue (live = scratch copy, line numbers): 568-570 (does not start: now told as LIMIT STOP
  SERVER FAILED first, fallback only to leads without LEAD STOPPED, the user told), 571-572 (15-minute silent lead
  stopped directly: gone), 573-574 ("The 15-minute rule above covers it": gone). Incomplete, not untrue: 456 (no
  stop command), 623 (watch also checks the helper), the failure list has no case for the helper dying mid-hand-over
  or an agent's hook error. Out of date for other reasons: 279 (the hook starts it at the cap too, since run H),
  608-610 (D-0004 answered 2026-10-25).
