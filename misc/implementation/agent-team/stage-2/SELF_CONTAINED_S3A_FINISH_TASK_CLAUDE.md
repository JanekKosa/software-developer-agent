# Run S3a-finish: close run S3a (PowerShell suite after its changes, report)

Written by the successor lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-28 16:05.
Working folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below).
REPO = `C:\Repos\My projects\software-developer-agent`.

Your predecessor stopped for the session's hand-over on 2026-10-27 at 15:56. Both points of run S3a are built and
tested. You finish the run: one check it could not run, then its report. You build nothing new.

## Read first, and no more

1. `REPO\CLAUDE.md` (1 KB).
2. `WF\SELF_CONTAINED_S3A_TASK_CLAUDE.md`, whole (7 KB): the original task, so you know what the report must cover.
3. `WF\SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md`, whole (13 KB): your predecessor's progress file. Its `## Hand-off`
   section (from line 101) is your exact starting point; the sections before it hold the facts the report needs
   ("Point 2 contract as built", "Done", "Point 1: lines kept on purpose", "Results").

Do not read the contract, the plans, the agent files, `README.md`, or the code: the work is done. Open a code file
only if the PowerShell suite fails because of one of S3a's edits (see below).

## The lead's answer to the open QUESTION

Your predecessor asked whether to keep the contract's default `<parent folder of REPO>\*` over the task file's example
(`%TEMP%\sda-anywhere\x\*`). The answer is YES, keep the contract; the task file's example was a slip. A copy at
`%TEMP%\sda-anywhere\x\orchestrate-agents` has REPO = `...\sda-anywhere\x`, so the default is `%TEMP%\sda-anywhere\*`,
which is what the code returns. Nothing changes in the code. Put this in the report under DECISIONS TAKEN as a settled
point ("kept the contract; confirmed by the lead"), and leave QUESTIONS at `none` unless you find a new one.

## What is left, in order

1. **The PowerShell suite after S3a's changes.** In `REPO\orchestrate-agents\`, run
   `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command "pwsh -NoProfile -File tests\limit-scripts.tests.ps1 *> '<your scratchpad>\ps-after.log'"`
   (the repo link `~\.claude\software-developer-agent` exists on this PC since 2026-10-27 15:21; if the call fails
   because the link is gone, use `C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1`
   and say so). Want **122 passed, 0 failed** (baseline 122 on 2026-10-27 at 14:52, before S3a). Read the tail of the
   log, write the counts and the time into the progress file. S3a's only `.ps1` edits were comments
   (`scripts\watch-usage-and-context.ps1` line 43, `scripts\start-session-in-vscode.ps1` line 199), so a failure is
   most likely unrelated: read the failing case's message, and fix only what one of S3a's edits broke; anything else
   goes into ISSUES FOUND with the exact message, unfixed.
2. **Leftover scratch folders of the suite.** `%TEMP%\oa-*` folders are the PowerShell suite's own scratch folders.
   Before your run, list those last written before 2026-10-28 00:00 (they are from a run killed yesterday) and remove
   them (`Remove-Item -Recurse -Force`; if it says "directory is not empty", wait one second and run it once more).
   After your run, list again: a folder your run left behind is an issue to report, not to remove. Give both counts.
3. **The report**, `WF\SELF_CONTAINED_S3A_REPORT_CLAUDE.md`, written from the progress file: what is different for
   the team (per-PC settings file, paths through the repo link, the six traps moved, `install.ps1` -> `init.ps1` in
   S3a's files), the counts (search lines 53 -> 24 and the kept list, Node 277/277 in place and in the copy, the
   PowerShell count from step 1, `commitInRepos` 0 differences on 2, not-mine trees 0 differences on 80, mutation
   16 of 16), what was not tested and why (one line each). It ends with the four-line block (DECISIONS TAKEN,
   INITIATIVES, ISSUES FOUND, QUESTIONS; `team-rules` section 6). Your predecessor drafted the block in its Hand-off
   section ("Left to do", step 2): use it, with the question above turned into a settled decision.
4. Add a short `## Finished (2026-10-28)` section to the progress file: the PowerShell count, the folders removed, the
   report path, the clock.

## Your files, and the files that are not

Yours: `WF\SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md`, `WF\SELF_CONTAINED_S3A_REPORT_CLAUDE.md` (new), and, only to fix
a suite failure that one of S3a's edits caused, the files S3a owned (listed in the Hand-off's "Files I own").

Not yours, never edit: everything else. Another worker (S3b1-finish) is running now on `REPO\scripts\init.ps1`,
`REPO\scripts\init.tests.ps1`, `WF\SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md` and `WF\SELF_CONTAINED_S3B1_REPORT_CLAUDE.md`;
never touch those. Nothing outside REPO except your own scratchpad and the `%TEMP%\oa-*` folders of step 2. Never run
`init.ps1`. No git command.

## Rules for this run

- The suite goes through `run-heavy.ps1` as above, output to a log file inside the command. Nothing else here is
  heavy.
- Read the clock (`Get-Date`) for every time you write. Keep every file's encoding and line endings (the WF files are
  CRLF, no BOM).
- Plan for about 25 tool calls; you are warned at 320 thousand tokens, which you will not reach.

## Files

- Progress file: `WF\SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md` (your predecessor's; add to it).
- Report file: `WF\SELF_CONTAINED_S3A_REPORT_CLAUDE.md`.
- Your final message is the report's summary and ends with the same four lines.
