# Run S3b1 progress: the init script, part 1

Started 2026-10-27 15:22 (clock read). Task: `SELF_CONTAINED_S3B1_TASK_CLAUDE.md`. Spec: contract section 3.

## Files I own

- `REPO\scripts\init.ps1` (new, from `install.ps1`)
- `REPO\scripts\install.ps1` (deleted, no git command)
- `REPO\scripts\init.tests.ps1` (new)
- this progress file and `SELF_CONTAINED_S3B1_REPORT_CLAUDE.md`
- scratch only in my scratchpad and under `%TEMP%`

## Baseline (15:22)

- `install.ps1`: 6039 bytes, no BOM, LF line endings only (154), ASCII only, ends with a newline. `init.ps1` keeps
  that (no BOM, LF, ASCII), which also lets Windows PowerShell 5.1 read it and print the PS 7 message.
- `git status --short -- scripts templates`: ` M scripts/install.ps1` (already modified before me), `?? templates/`.
- Real home snapshot (22 entries: `.claude\skills`, `.copilot\skills`, `.claude\agents`, plus the repo link) saved
  in my scratchpad `real-home-start.txt` by `snapshot-real-home.ps1`. On this PC `windows-pitfalls` is in neither
  skills folder; `report-changes`, `explain-clearly`, `machine-pitfalls` point into xpp-agent; `synced` is real.
- Tools: pwsh 7.6.9, node `C:\Program Files\nodejs\node.exe`, claude on PATH `C:\Users\user\.local\bin\claude.exe`,
  VS Code extension folders `anthropic.claude-code-2.1.306..311-win32-x64`, each with `resources\native-binary\claude.exe`.
  `powershell.exe` 5.1 exists (used to test the PS 7 check for real).

## Plan

1. Tests first (`init.tests.ps1`, same runner style as `limit-scripts.tests.ps1`): a fake repo in a work folder with
   the script under test copied to `<fake>\scripts\init.ps1`, so no test junction ever points at the real repo; unit
   cases dot-source it and replace probe functions; integration cases run it as a child pwsh with `-HomePath`.
2. `init.ps1`: params `-WhatIf`, `-HomePath`, `-ClaudeConfigDir`; step functions; dot-source guard kept.
3. Invariant run: real `init.ps1` from the real repo, scratch home built from the real snapshot's names.
4. Mutation check, at least 10 mutants, driver in scratchpad.

## Done

- 15:30 `init.tests.ps1` written first (27 cases). Parses, LF, no BOM, ASCII.
- 15:31 Rename: `install.ps1` copied byte for byte to `init.ps1` (hash checked), then `install.ps1` deleted.
- 15:33 First red run queued through run-heavy; the single slot was held by another agent's job (S3a's
  `mutate.mjs` since 15:34, in the same scratchpad folder: my scratch files now carry the prefix `s3b1-`). I stopped
  my queued run (task bplgv3rau, mine, never started) and re-queued it against a frozen copy of the old script
  (`scratchpad\s3b1-old\init.ps1`), so the red result is about the old script whenever the slot frees.
- 15:47 `init.ps1` written: params `-WhatIf`, `-HomePath`, `-ClaudeConfigDir`; LF, no BOM, ASCII; parses in pwsh 7
  and in Windows PowerShell 5.1 (0 parse errors each).

## Contract for S3b2 (the seams)

- Each step returns records from `New-InitRecord -Step <name> -Outcome Changed|InPlace|Checked -Text <line>`; the
  main part prints each `Text` as it comes and `Format-InitSummary` counts `Changed` and `InPlace`. With `-WhatIf`
  a `Changed` record means "would change" and its text starts with "Would ".
- A stop for the person (missing program, thing in the way) is `Stop-Init <message>` (exit 1, message printed as is);
  any other exception prints `init failed: ...` plus the summary of what had changed, exit 1.
- Step 4 `Install-PcSettings -HomePath -RepoRoot -WhatIf`; step 5 `Install-ClaudeSettings -ClaudeConfigDir
  <given, else <home>\.claude> -HomePath -NodePath <from step 1> -WhatIf`; step 6 `Install-TeamExtensions
  -ClaudePath <from step 1> -ClaudeConfigDir <as given, '' when not> -HomePath -WhatIf`. All three empty now; called
  in that order after `Install-Links` and `Install-NotesStarter`.
- Step 1 `Test-Prerequisites -HomePath` returns `NodePath`, `ClaudePath`, `PowerShellVersion`. Probes the tests
  replace: `Test-WindowsHost`, `Get-PowerShellVersion`, `Find-NodePath`, `Find-ClaudePath -HomePath`.
- `Get-RepoRoot <script folder>` resolves a link at the repo root, so a run through the repo link still links the
  real folder.

## Hand-off

Stopped by `STOP FOR LIMIT` (weekly usage at 98%) right after the first green run, which finished about 15:56 (time
taken from run-heavy's "waited 5:57" after the slot holder that started 15:49:46; the clock was not read because the
stop forbids another command).

**Done and checked**

- Points 1 and 2 are built: `REPO\scripts\init.ps1` (rename done, checks, 13 links, notes starter, `-WhatIf`,
  summary, empty steps 4 to 6, dot-source guard kept) and `REPO\scripts\init.tests.ps1` (29 cases).
- Red run (frozen copy of the old script, `scratchpad\s3b1-red.log`): 2 passed, 27 failed, each for the expected
  reason (functions missing, `-HomePath` ignored, which landed in the scratch user profile as designed). The 2 that
  passed test behaviour the old script already had (other entries left alone; case-insensitive link compare).
- Green run through run-heavy against the new script (`scratchpad\s3b1-green1.log`): **29 passed, 0 failed**. It
  includes the real Windows PowerShell 5.1 run (stops with the PowerShell 7 message, home unchanged) and real child
  pwsh runs with `-HomePath` on scratch homes.
- `init.ps1`: LF only, no BOM, ASCII, 0 parse errors in pwsh 7.6.9 and in Windows PowerShell 5.1 (as `install.ps1`
  was: LF, no BOM, ASCII).

**On disk but unchecked**

- The test's cleanup (`Remove-WorkFolder`) now retries `Remove-Item` up to 3 times, but the green run still printed
  "could not remove the work folder ... init tests-0a62438f ... home 19\.vscode: The directory is not empty". The
  immediate retry is not enough: add a short pause (about 1 second) between attempts. Test results are not affected.
- `scratchpad\s3b1-invariant.ps1` (PC-like home from `real-home-start.txt`, runs the REAL `init.ps1` with
  `-HomePath`: `-WhatIf`, real run, second run; counts unexpected differences) and `scratchpad\s3b1-mutate.ps1`
  (26 mutants, each replacement must match once, parse check, runs the tests with `-ScriptPath`): written, never run.
  Expected invariant outcome on this PC's names: 6 changed (report-changes and explain-clearly re-pointed in both
  skills folders; windows-pitfalls created in both, since this PC has none today), 9 already in place
  ("Summary: 6 changed, 9 already in place."); machine-pitfalls, synced and the xpp-agent links untouched.

**Left behind (scratch, to remove)**

- `C:\Users\user\AppData\Local\Temp\init tests-15ec2fe3` (red run; checked: 0 links left, empty folders only;
  `Remove-Item -Recurse -Force` failed twice with "directory is not empty", run it again).
- `C:\Users\user\AppData\Local\Temp\init tests-0a62438f` (green run; its links were removed first by the test, but
  list links with `Get-ChildItem -Recurse -Force | Where-Object LinkType` before removing it).
- Scratchpad files of mine (the scratchpad folder is shared with run S3a; theirs are `mutate.mjs`, `mutate.log`,
  `node-after.log`): `snapshot-real-home.ps1`, `real-home-start.txt`, `spike.ps1`, `s3b1-old\`, `s3b1-red.log`,
  `s3b1-green1.log`, `s3b1-invariant.ps1`, `s3b1-mutate.ps1`.

**What is left, in order (the exact next step is 1)**

1. Add the pause to `Remove-WorkFolder`'s retry in `init.tests.ps1`; remove the two leftover `init tests-*` folders.
2. Run the invariant: `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command
   "pwsh -NoProfile -File '<scratchpad>\s3b1-invariant.ps1' *> '<scratchpad>\s3b1-invariant.log'"`; read
   "UNEXPECTED DIFFERENCES: N on M entries" (want 0), the -WhatIf and second-run difference counts (want 0), "stand-ins
   unchanged: True", "scratch removed: True", "repo intact: True".
3. Run the mutation check the same way with `s3b1-mutate.ps1` (log `s3b1-mutate.log`); want "N of N caught" and 0
   "NOT RUN"; add a test for each survivor and re-run that mutant (`-Only '<name>'`).
4. Run the whole test script once more through run-heavy after the last change.
5. Real home check: `& '<scratchpad>\snapshot-real-home.ps1' -OutFile '<scratchpad>\real-home-end.txt'`, then
   `Compare-Object (Get-Content real-home-start.txt) (Get-Content real-home-end.txt)`: want 0 differences on 22 entries.
6. Delete the scratch files listed above; write `SELF_CONTAINED_S3B1_REPORT_CLAUDE.md` (seams, test count, invariant
   numbers, "N of N caught", not tested, the four-line block).

**Files owned**: `REPO\scripts\init.ps1` (new), `REPO\scripts\install.ps1` (deleted, no git command),
`REPO\scripts\init.tests.ps1` (new), this progress file, the report file (not written yet).

**For the report (decisions so far)**: `Find-ClaudePath` takes the newest extension version folder that actually
holds `resources\native-binary\claude.exe` (a newer folder without it is skipped), versions compared as numbers;
`claude` on the PATH is any application named claude (exe or cmd), as the contract says. `-HomePath` must name an
existing folder (stop otherwise, an addition). `Get-RepoRoot` resolves a link at the repo root (a run through the
repo link would otherwise point the repo link at itself). Exit code 1 for every stop. Stops print to stderr.
