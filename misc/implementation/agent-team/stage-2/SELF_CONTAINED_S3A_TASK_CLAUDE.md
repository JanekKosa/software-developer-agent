# Run S3a: the agent repo works from any folder

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-27 15:21. Working
folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below). REPO =
`C:\Repos\My projects\software-developer-agent`.

## Read first, and no more

1. `REPO\CLAUDE.md` and `REPO\README.md` (all; 7 KB).
2. `WF\SELF_CONTAINED_S3_CONTRACT_CLAUDE.md`, whole: your spec, sections 1 and 2 above all.
3. `REPO\orchestrate-agents\lib\config.mjs` (whole), `REPO\orchestrate-agents\lib\decision-register.mjs` lines
   108-160 only (`registerLocation`, where `commitInRepos` is read), `REPO\orchestrate-agents\orchestration.config.json`
   lines 1-10 and 140-155.
4. For the rest, search, do not read whole: list every line in REPO that names `C:\Repos`, `My projects`, `xpp-agent`,
   `claude-code-extensions`, `C:\Users\user`, `install.ps1` (any case), leaving out `.git\`, `skills\` (vendored),
   `misc\`, `decisions\`, and the files run S5 owns (below). Read only around each hit.

## What it is for

The user, D-47, in their words: "Chose A: it works from any folder: files reach the scripts through the links
install.ps1 makes, which are the same on every PC (such as ~\.claude\skills\orchestrate-agents), and each PC's own
values, such as where your own repos are, go into one settings file per PC that install.ps1 creates and git ignores
(one run over about 26 files)." The script is now called the init script (`init.ps1`; D-46). The inventory found about
165 such lines in 26 files; many are in tests and docs.

## Your two points

1. **Every fixed path to REPO goes through the repo link** (contract section 1), in the agent files, the skills
   (`orchestrate-agents\SKILL.md`, `team-rules\SKILL.md`, `team-switch\SKILL.md`, `windows-pitfalls\`), the
   references (`orchestrate-agents\references\*.md`, not the `.html`), the scripts and hooks, and the tests that need
   a real path (fixture strings that only stand for "a path" may stay; list each). Every `install.ps1` becomes
   `init.ps1` in those files. Code finds its files relative to itself. Testable: the search of point 4 above gives
   **0 lines** except the listed fixtures and the lines that name another repo on purpose (list them; for example
   the vendored skills' source in `skills\SKILLS_MANIFEST_CLAUDE.md` is not yours).
2. **The per-PC settings file** (contract section 2): the register's `commitInRepos` comes from
   `<teamState.folder>\pc-settings.json` when it holds it, else the default `["<parent folder of REPO>\*"]`;
   `orchestration.config.json` no longer names this PC's folders. Testable from the caller's side, with scratch
   folders: a file with a value -> that value; no file -> the default (on this PC `C:\Repos\My projects\*`); a file
   without the key, or unreadable JSON -> the default, and the unreadable case also says so on stderr (choose and
   test it); REPO reached through a junction -> the real parent.

Also, small: `agents\software-developer.md` section 11 keeps general Windows traps that belong in `windows-pitfalls`
(S1 found six). Move each that is already in `windows-pitfalls` out of section 11 (keep a one-line pointer), and add
to `windows-pitfalls` any that is not there yet. Skip this if it would push your run past its plan; say so.

## Your files, and the files that are not

Yours: `REPO\agents\*.md`, `REPO\orchestrate-agents\SKILL.md`, `REPO\orchestrate-agents\references\*.md`,
`REPO\team-rules\SKILL.md`, `REPO\team-switch\SKILL.md`, `REPO\windows-pitfalls\`, `REPO\orchestrate-agents\lib\*`,
`REPO\orchestrate-agents\hooks\*`, `REPO\orchestrate-agents\scripts\*`, `REPO\orchestrate-agents\orchestration.config.json`,
`REPO\orchestrate-agents\tests\*`.

Not yours, never edit: `REPO\scripts\` (run S3b1 renames `install.ps1` to `init.ps1` there now, with its own test
file); `REPO\README.md`, `REPO\agent-team-files.html`, `REPO\orchestrate-agents\references\*.html`,
`REPO\decisions-pane\` (README included; run S5 later); `REPO\skills\`, `REPO\decisions\`, `REPO\templates\`,
`REPO\report-changes\`, `REPO\explain-clearly\`; anything outside REPO, and above all `~\.claude\` (no links, no
`pc-settings.json` on this PC: tests use scratch folders) and the live state folder
`C:\Users\user\.claude\state\software-developer-agent\` (read-only for you).

## Live, so careful

`orchestrate-agents\`, `agents\`, `team-rules\` and `team-switch\` are live: the hooks, `register.mjs`, the watches and
every agent read them now. Each Edit leaves the file whole and working; run the affected tests after each code
change. The repo link does not exist on this PC until the main session runs init: a doc path through it is fine, but
code that runs now (hooks, register.mjs, the watches, run-heavy.ps1) must never depend on the link. Leave
`register.mjs`, the two hooks and the pane working at every step.

## The invariant (touches nothing live)

- The search of point 1: **0 lines** left, except the listed ones (give the count before and after).
- `commitInRepos` on this PC: the value the register uses before your change and after it, for this repo and for a
  scratch repo under `%TEMP%`: **0 differences** (the default must give `C:\Repos\My projects\*` here).
- Copy `orchestrate-agents\` to a scratch folder whose parent is not `C:\Repos\My projects` (for example
  `%TEMP%\sda-anywhere\x\orchestrate-agents`) and run the Node suite there: it passes with the same count as in place,
  and the default `commitInRepos` there is `%TEMP%\sda-anywhere\x\*`. Delete the copy after.
- **Mutation check** on point 2 (at least 8 mutants: the file ignored, the key ignored, the default from the wrong
  folder, the junction not resolved, bad JSON crashing, the config value still read, ...): **"N of N caught"**; add a
  test for any survivor.

## Rules for this run

- Every heavy command (the Node suite, the PowerShell suite, the mutation runs) goes through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with redirection to a log file inside the command. Run Node from a folder spelled `C:\`.
- First, before changing anything: run the Node suite (261 at 14:52) and the PowerShell suite
  (`pwsh -NoProfile -File tests\limit-scripts.tests.ps1` in `orchestrate-agents\`, 122 at 14:52); write the counts in
  your progress file.
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point. Keep every file's
  encoding and line endings.
- Plan for about 80 tool calls; you are warned at 320 thousand tokens. Point 1 is many small edits: batch them per
  file, and do point 2 and its mutation check before the docs if you are short of room.

## Files

- Progress file: `WF\SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md`.
- Report file: `WF\SELF_CONTAINED_S3A_REPORT_CLAUDE.md`: what is different, the counts, the kept lines, the invariant's
  numbers, "N of N caught", what was not tested. It ends with the four-line block (DECISIONS TAKEN, INITIATIVES,
  ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- The init script itself (S3b1, S3b2), the README and guide pages (S5), domain packs (D-40).
