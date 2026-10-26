# Agent team stage 1, builder C second pass: progress

Started 2026-10-25 09:22 (clock read). Second pass over builder C's documents: apply the reviewer's two findings
where they hold up.

## Files I own (repo `C:\Repos\My projects\software-developer-agent`)

- `orchestrate-agents\SKILL.md`, `orchestrate-agents\references\*.md`
- `agents\software-developer.md`, `agents\task-lead.md`, `agents\code-searcher.md`
- `README.md`, `CLAUDE.md` (not edited: "never edit any CLAUDE.md"), `scripts\install.ps1`
- Report files: `C2_PROGRESS_CLAUDE.md`, `C2_REPORT_CLAUDE.md`, and a "Second pass" section appended to
  `C_REPORT_CLAUDE.md`.

## Findings to check

1. (major) SKILL.md line 89: `--answer "<the user's words>"` in PowerShell double quotes expands `$`, backticks,
   and curly double quotes split the argument. Fix: single-quoted here-string, or `--answer-file`.
2. (major) usage-limits.md line 50: after `LIMIT NEAR | HAND OVER` nothing restarts the watch, so a hard stop in
   steps 1-4 wakes nothing; step 2's deadline has no mechanism.

## Done

- 09:22 Read: C progress, C report, the plan whole, the three skills.
- 09:23 Baseline: repo has no commits, all untracked. SHA-256 (first 16) of my files before edits: SKILL.md
  3C7B15F28DC0A29E; usage-limits.md 4C76427708746FDF; start-messages.md 0F712389117B1011; task-lead.md
  52371CD5D29A125E; software-developer.md 26608E041D0714F3; README 70ADF83D20A7B72F; install.ps1 5C1A67F9B51AC881.
  Not mine (must stay): register.mjs D15992170991BB68; watch-session.ps1 AF30794FB60662C3; config EDF6353C59B494D6.

## Finding 1 (resolve quoting): HOLDS (measured 09:25, pwsh 7.6.8, PSNativeCommandArgumentPassing=Windows, node 24.13.0)

- register.mjs has no `--answer-file` (grep). The PowerShell tool runs commands through Invoke-Expression (its
  parse error says so).
- Red, the documented double-quoted form through my own PowerShell tool: `$5` dropped, `$(Get-Date)` EXECUTED and
  its output recorded, curly double quotes split the argument in two, backtick-n became a newline. 3 of 6 cases wrong
  (the 3 others passed only because I escaped them by hand).
- Green, single-quoted here-string `$answer = @'` / words / `'@` then `--answer $answer`: 10 of 10 cases arrive
  byte for byte (dollar, curly double, backtick, & with straight double quotes, curly single, straight single,
  backslash before quote and at end, two lines, `@'`/`'@` mid-line, Polish letters).
- End to end through register.mjs on a scratch root: 7 entries added and resolved (6 here-string, 1 from a file
  through `(Get-Content -Raw -LiteralPath <file>)`): 7 of 7 Resolved lines equal the words with newlines as spaces;
  file 81 CRLF lines, 0 bare CR/LF. The comparer reports a planted swap as DIFF (2 of 2).
- Limit: a line of the words starting with `'@` or a curly quote + `@` ends the here-string; the whole command then
  fails to parse and nothing runs (seen: "Unexpected token"). Fallback: words into a file with the Write tool,
  `--answer (Get-Content -Raw -LiteralPath <file>)` (the D-0004 case above).
- 09:31 Fixed: SKILL.md register block (here-string form + why + fallback), start-messages.md "Pass the user's
  answer" points at it. Leads write entry.json with the Write tool (task-lead.md line 170): no quoting issue there.

## Finding 2 (watch not restarted after LIMIT NEAR): HOLDS (read watch-session.ps1 09:27)

- Line 502 `if ($decision.OnRecord) { continue }` keeps a restarted watch quiet; lines 466-474 + Get-LimitDecision
  line 327 (`onRecord` = record says hand-over and its reset is after the stop) make a hard stop end in SESSION
  RESET COLD. Without a restart nothing runs during the hand-over. Confirmed.
- Builder B2 (B2_PROGRESS 09:25) is changing the watch's header and its LIMIT NEAR instruction line to "start this
  watch again now", and may print going-cold times with a date when not today. My docs match both.
- 09:31 Fixed usage-limits.md: steps now 1 restart watch, 2 deadline wait (background, snippet), 3 STOP FOR LIMIT,
  4 wait / TaskStop the deadline / TaskStop an unanswered lead, 5 hand-over, 6 schedule-relaunch (no retry),
  7 TaskStop the watch, 8 end; SESSION NEAR CAP during it: do not restart; SESSION RESET COLD covers "decided
  before the stop" and "finish yours". SKILL.md start rule and limit summary changed to match.
- Initiative: TaskStop of a lead that missed the deadline (else it works on beside its successor). Unverified
  whether TaskStop of a lead also stops its running worker.
- Deadline snippet measured: a past date-form time ends in 21 ms, a past HH:mm in 5 ms; both forms parse with
  InvariantCulture (culture here pl-PL). Background run to 09:30 started (task bnn2zl7kn): it printed the
  LEADS DEADLINE line, "ended at 09:30:00", exit 0, and its ending woke me (task notification). Mechanism proven.
- 09:33 Proofread: step 1 said "before step 6", corrected to "before step 7" (the watch runs until step 7).
  SKILL.md limit bullet shortened (details live in usage-limits.md); resolve paragraph rewrapped to 120 columns.

## Checks so far (after the last edit, 09:34)

- Scratch doc checker (`check-docs.mjs`) over the 10 documents: 0 non-ASCII, line endings all LF (none mixed), every
  full path and named script exists. Two hits are checker false positives: SKILL.md's `C:\Repos\My projects\*` (a
  pattern for "the user's repos") and README's `scripts\install.ps1` (repo-root script, exists; README unchanged).
- SKILL.md 15,5xx bytes after my additions (was 14,498; C1 aimed under 15 KB; not a rule of my task).
- 09:35 `node --test` through run-heavy.ps1 started; at 09:40 still waiting for memory (1306 MB free, 1500 needed),
  now a background task b1fyxhj8b. PowerShell suite not yet run (same gate).

## Final checks (after the last edit at 09:35)

- 09:44 `node --test` (run-heavy, in orchestrate-agents): tests 71, pass 71, fail 0, exit 0; waited 13:36, ran 0:17.
  Note: run-heavy passes the command's output straight to the console, so my `*>` redirect held only its own lines.
- 09:55 `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` (run-heavy): 50 passed, 0 failed, exit 0; waited
  8:42, ran 2:05. Includes B2's "restarted after LIMIT NEAR, a limit stop during the hand-over ends in SESSION
  RESET COLD after the reset" (ok).
- 09:56 B2 has already changed watch-session.ps1 header (lines 16-18) and the LIMIT NEAR line to "start it again";
  Format-Clock prints a date when not today. Neither says to TaskStop the watch after the relaunch (reported).
- 09:56 Doc checker re-run on the 3 changed files: 0 non-ASCII, LF only, paths exist (1 false positive). Lines over
  120 in usage-limits.md are C1's (14, 22, 79), not mine.
- Final hashes: SKILL.md 79DFEE8EB4954FFA (15,431 B), usage-limits.md 6C6ADCBBB6F4C82B, start-messages.md
  198F28FD660DA4CA; the other 9 files of mine equal the baseline.
- 09:56 Scratch folder c2-answer-probe deleted, checked gone. Background tasks bnn2zl7kn, b1fyxhj8b, bon13myjy ended.

## Reports (09:58)

- `C2_REPORT_CLAUDE.md` written; "Second pass" section appended to `C_REPORT_CLAUDE.md`. Left: structured answer.
