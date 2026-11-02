# Run S3b1-finish: close run S3b1 (invariant, mutation check, end checks, cleanup, report)

Written by the successor lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-28 16:05.
Working folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below).
REPO = `C:\Repos\My projects\software-developer-agent`.

Your predecessor stopped for the session's hand-over on 2026-10-27 right after its first green test run (29 passed,
0 failed). Both points of run S3b1 are built: `REPO\scripts\init.ps1` (renamed from `install.ps1`; checks, 13 links,
notes starter, `-WhatIf`, summary, empty steps 4 to 6 as seams) and `REPO\scripts\init.tests.ps1` (29 cases). You
finish the run: the checks it did not get to, the cleanup, and the report. You add tests only where the mutation
check shows a gap.

## Read first, and no more

1. `REPO\CLAUDE.md` (1 KB).
2. `WF\SELF_CONTAINED_S3B1_TASK_CLAUDE.md`, whole (7 KB): the original task; its "invariant" section says what the
   checks must show and the report must cover.
3. `WF\SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md`, whole (9 KB). Its `## Hand-off` section (from line 61) is your exact
   starting point: "What is left, in order", steps 1 to 6. The section "Contract for S3b2 (the seams)" goes into the
   report as it stands.
4. `WF\SELF_CONTAINED_S3_CONTRACT_CLAUDE.md`, section 3 only ("The init script"): what the links and the starter must
   be, so you can judge the invariant's numbers.
5. Your own two files, `REPO\scripts\init.ps1` and `REPO\scripts\init.tests.ps1`, whole.
6. Your predecessor's scratch scripts, which were WRITTEN BUT NEVER RUN, so read each before running it:
   `s3b1-invariant.ps1`, `s3b1-mutate.ps1`, `snapshot-real-home.ps1` and the data file `real-home-start.txt`, all in
   `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\`.
   Copy the four into your own scratchpad first and run them from there; leave the old folder as it is (it holds
   another run's files too).

Do not read the plans, the agent files, `README.md`, `orchestrate-agents\`, or anything in other repos.

## What is left, in order (the exact next step is 1)

1. In `init.tests.ps1`, `Remove-WorkFolder` retries `Remove-Item` up to 3 times but an immediate retry still fails
   with "The directory is not empty": add a pause of about one second between attempts. Then remove the two leftover
   scratch folders `C:\Users\user\AppData\Local\Temp\init tests-15ec2fe3` and `...\init tests-0a62438f`: first list
   any link inside (`Get-ChildItem -LiteralPath <folder> -Recurse -Force | Where-Object LinkType`), remove each
   junction with `[System.IO.Directory]::Delete($path, $false)` (never `Remove-Item -Recurse` on a junction: it can
   follow it), then `Remove-Item -Recurse -Force` with the one-second pause between attempts.
2. **The invariant**: `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command "pwsh -NoProfile -File '<your scratchpad>\s3b1-invariant.ps1' *> '<your scratchpad>\s3b1-invariant.log'"`.
   It builds a PC-like scratch home from `real-home-start.txt` (this PC's 22 entries; the lead checked at 16:02 that
   the real folders still match it) and runs the REAL `init.ps1` with `-HomePath` on it: `-WhatIf`, a real run, a
   second run. Want: "UNEXPECTED DIFFERENCES: 0 on M entries", -WhatIf and second-run difference counts 0, "stand-ins
   unchanged: True", "scratch removed: True", "repo intact: True". Expected on this PC's names: 6 changed
   (report-changes and explain-clearly re-pointed in both skills folders; windows-pitfalls created in both), 9 already
   in place; machine-pitfalls, synced and the xpp-agent links untouched. If the script itself is wrong (it never ran),
   fix the script, not the numbers; if `init.ps1` is wrong, fix `init.ps1` and add the test that would have caught it.
3. **The mutation check** the same way with `s3b1-mutate.ps1` (log `s3b1-mutate.log`): 26 mutants, each replacement
   must match exactly once, parse check, then the tests with `-ScriptPath` against the mutant. Want "N of N caught" and
   0 "NOT RUN". For each survivor, add a test to `init.tests.ps1` that catches it and re-run that mutant alone
   (`-Only '<name>'`). Report the final "N of N caught" and the names of the mutants that first survived.
4. The whole test script once more through run-heavy after the last change
   (`pwsh -NoProfile -File 'REPO\scripts\init.tests.ps1' *> '<scratchpad>\s3b1-green2.log'`): want every case
   passed, 0 failed, and the count (29 plus the tests you added).
5. **Real home check**: `& '<scratchpad>\snapshot-real-home.ps1' -OutFile '<scratchpad>\real-home-end.txt'`, then
   `Compare-Object (Get-Content real-home-start.txt) (Get-Content real-home-end.txt)`: want **0 differences on 22
   entries**. Any difference is a blocking issue: stop and report it at once.
6. Delete your own scratch copies' leftovers that are not logs (keep the logs). Write the report
   `WF\SELF_CONTAINED_S3B1_REPORT_CLAUDE.md`: what is different (init.ps1 replaces install.ps1; the checks; the 13
   links; the starter; `-WhatIf`; the summary), the seams for S3b2 word for word from the progress file, the test
   count, the invariant's numbers, "N of N caught" with the survivors fixed, the real-home check, what was not tested
   and why (steps 4 to 6 of init are empty seams; the plugin step is S3b2's). It ends with the four-line block
   (DECISIONS TAKEN, INITIATIVES, ISSUES FOUND, QUESTIONS; `team-rules` section 6). The decisions your predecessor
   listed under "For the report (decisions so far)" go under DECISIONS TAKEN. Under ISSUES FOUND keep the trap line
   `trap: Remove-Item -Recurse -Force says "The directory is not empty" on scratch folders and an immediate retry also
   fails -> pause about 1 second between attempts (any Windows PC)` (the main session has already filed it; the line
   in the report is the record).
7. Add a short `## Finished (2026-10-28)` section to the progress file: the numbers, the report path, the clock.

## Your files, and the files that are not

Yours: `REPO\scripts\init.ps1`, `REPO\scripts\init.tests.ps1`, `WF\SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md`,
`WF\SELF_CONTAINED_S3B1_REPORT_CLAUDE.md` (new), your own scratchpad.

Not yours, never edit: everything else in REPO. Another worker (S3a-finish) is running now and may touch
`REPO\orchestrate-agents\` (only to fix a suite failure) and `WF\SELF_CONTAINED_S3A_*`; never touch those. Never run
`init.ps1` against this PC's real home: every run, by test or by hand, uses `-HomePath` on a scratch folder under
`%TEMP%`, and `-ClaudeConfigDir` on a scratch folder when a test needs one. Nothing under `C:\Users\user\.claude`,
`C:\Users\user\.copilot` or `C:\Users\user\.vscode` is yours to change; the only real-home operation is the read-only
snapshot of step 5. No git command.

## Rules for this run

- Every heavy command (the invariant, the mutation check, the test script) goes through `run-heavy.ps1` as above,
  with redirection to a log file inside the command; read the log's tail afterwards.
- Machine traps that bite here (`windows-pitfalls`): never `Move-Item` a tree that holds junctions; PowerShell names
  are case-insensitive; quote a native argument that starts with `-` and holds a variable; `Remove-Item` on a scratch
  folder may need a one-second pause before a retry; `$x = if (...) { , $list }` flattens a one-row list (assign inside
  the branches).
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every step. Keep encodings and
  line endings (`init.ps1` and `init.tests.ps1` are LF, no BOM, ASCII; the WF files are CRLF, no BOM).
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. The mutation check is the long step: start it
  right after the invariant, and if a survivor's test does not fit, report the survivor by name instead of guessing.

## Files

- Progress file: `WF\SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md` (your predecessor's; add to it).
- Report file: `WF\SELF_CONTAINED_S3B1_REPORT_CLAUDE.md`.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- Steps 4 to 6 of init (the per-PC settings file, Claude Code's settings, the team's extensions): run S3b2, after
  you. The README (S5).
