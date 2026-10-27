# Run S3b1: the init script, part 1 (rename, checks, links, notes starter)

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-27 15:21. Working
folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below). REPO =
`C:\Repos\My projects\software-developer-agent`.

## Read first, and no more

1. `REPO\CLAUDE.md` and `REPO\README.md` (all; 7 KB; "How it is wired" describes today's install).
2. `WF\SELF_CONTAINED_S3_CONTRACT_CLAUDE.md`, whole: your spec, section 3 above all.
3. `REPO\scripts\install.ps1` (6 KB, whole).
4. How the repo's PowerShell tests are written: the first 80 lines of
   `REPO\orchestrate-agents\tests\limit-scripts.tests.ps1` (its helpers and its pass/fail counting), no more.
5. `REPO\templates\machine-pitfalls\SKILL.md` (the starter you copy).

Do not read the plans, the guide pages, the agent files, or anything in other repos.

## What it is for

The user, D-46, in their words: "Other: the init script, and that is what it should be called needs to do all the
steps that are required to run this agent, meaning any task that dont need an LLM, the script needs to perform."
D-48: "Chose A: Windows only: the README says so, and install.ps1 checks for Windows, Node and PowerShell 7 before it
changes anything (part of one run)." Today `install.ps1` only makes six links. This run makes it the init script and
gives it the checks and every link; run S3b2 (after you) adds Claude Code's settings, the per-PC settings file and the
team's extensions.

## Your two points

1. **Rename and checks.** `git mv`-free rename: create `REPO\scripts\init.ps1` from `install.ps1` and delete
   `install.ps1` (no git command; the main session commits). Add the parameters of contract section 3 (`-WhatIf`,
   `-HomePath`, `-ClaudeConfigDir`; S3b2 uses the last) and step (1), the checks, all before any change: Windows,
   PowerShell 7 or later, Node on the PATH, the `claude.exe` as the contract says. A missing one stops with a plain
   message naming what is missing and how to get it, exit code non-zero, nothing changed. Keep the dot-source guard
   (the script only defines its functions when dot-sourced), so tests can call each function. Testable: each check
   failing on its own (by a test seam, for example parameters or functions the test replaces) stops with its message
   and leaves the scratch home untouched.
2. **Links and the notes starter** (contract section 3, steps 2 and 3): the six links of today, `report-changes`,
   `explain-clearly`, `windows-pitfalls` in both skills folders, the repo link
   `<home>\.claude\software-developer-agent`, and the `machine-pitfalls` starter. A link pointing elsewhere is
   re-pointed (a link only: never `Move-Item`, never delete a real folder; remove a junction with
   `[System.IO.Directory]::Delete($path, $false)`); a real folder or file in the way stops init before any change.
   `-WhatIf` prints each planned change and makes none. A second run says "already in place" for each and changes
   nothing. A short summary at the end lists what changed. Testable on a scratch home: a fresh home gets every link
   and the starter; a home with old links (for example `report-changes` pointing at another folder) gets them
   re-pointed; a real folder in the way stops it with nothing changed; an existing `machine-pitfalls` (folder or
   link) is left alone; `-WhatIf` changes nothing.

Leave clear seams for S3b2: one function per step, and steps (4) to (6) as named, empty functions that S3b2 fills.

## Your files, and the files that are not

Yours: `REPO\scripts\init.ps1` (new), `REPO\scripts\install.ps1` (deleted), a new test script
`REPO\scripts\init.tests.ps1`.

Not yours, never edit: everything else in REPO. Run S3a (another worker, now) changes the agent files, the skills,
`orchestrate-agents\` (lib, hooks, scripts, tests, config, references) and replaces every mention of `install.ps1`
outside `REPO\scripts\`; leave those mentions to it. Never run init against this PC's real home: every run of it, by
test or by hand, uses `-HomePath` on a scratch folder under `%TEMP%`, and you check after each test run that
`C:\Users\user\.claude\skills`, `C:\Users\user\.copilot\skills` and `C:\Users\user\.claude\agents` are unchanged (list
their entries and targets at your start and at your end: 0 differences).

## The invariant (touches nothing live)

- A scratch home built to look like this PC's (the same entry names under `.claude\skills`, `.copilot\skills`,
  `.claude\agents`, with junctions to scratch stand-ins of xpp-agent's skill folders and a real `synced` folder):
  init gives exactly the links the contract lists, re-points the three moved skills, leaves `machine-pitfalls`,
  `synced` and every other entry alone. Report the before and after lists: **0 unexpected differences on N entries**.
- This PC's three real folders above: 0 differences from start to end.
- **Mutation check** (at least 10 mutants: a check skipped, a check after a change, a real folder deleted instead of
  stopping, a link not re-pointed, `-WhatIf` writing, the starter overwriting an existing folder, the copilot link to
  the wrong place, a second run changing something, ...): **"N of N caught"**; add a test for any survivor.

## Rules for this run

- Run your test script through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with redirection to a log file inside the command.
- Machine traps that bite here (from `windows-pitfalls`): never `Move-Item` a tree that holds junctions; PowerShell
  names are case-insensitive; quote a native argument that starts with `-` and holds a variable.
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point. Keep encodings
  and line endings (the new script as `install.ps1` was).
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. Do the invariant right after the two points,
  then the mutation check.

## Files

- Progress file: `WF\SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md`.
- Report file: `WF\SELF_CONTAINED_S3B1_REPORT_CLAUDE.md`: what is different, the seams S3b2 fills (function names and
  what each receives), the test count, the invariant's numbers, "N of N caught", what was not tested. It ends with the
  four-line block (DECISIONS TAKEN, INITIATIVES, ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- Claude Code's settings, the per-PC settings file and the extensions (S3b2), the README (S5).
