# Run S1: the team's skills come into the agent repo

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-27 14:55. Working
folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below). REPO =
`C:\Repos\My projects\software-developer-agent`. SRC = `C:\Repos\My projects\xpp-agent\Docs\Skills`.

## Read first, and no more

1. `REPO\CLAUDE.md` and `REPO\README.md` (all of it; 7 KB).
2. The four source skills, whole: `SRC\machine-pitfalls\` (SKILL.md and the six files in `references\`, ~31 KB),
   `SRC\report-changes\SKILL.md`, `SRC\explain-clearly\SKILL.md` and `SRC\explain-clearly\references\explainer-page.md`
   (skip `explain-clearly\assets\explainer-template.html`: copy it, do not read it).
3. `REPO\team-rules\SKILL.md` (6 KB), and by line: `REPO\agents\software-developer.md` lines 1-40, 255-290;
   `REPO\agents\task-lead.md` lines 1-20; `REPO\orchestrate-agents\references\worker-rules.md` lines 1-40;
   `REPO\orchestrate-agents\SKILL.md` lines 40-55 and 245-255.

Do not read the plans, the guide pages, `decisions\`, or anything else in xpp-agent.

## What it is for

The user wants the agent repo to hold everything the team needs, so that cloning it on another PC and running its
init script gives a working team. The user's answers, in their words:

- D-41 (the machine notes): "Chose B: as A, and the traps that hold on any Windows PC move into the repo as a team
  skill; only this PC's own traps stay in its notes outside the repo (one run that sorts about 30 KB of notes in two;
  a new PC starts with the general traps)." A was: "the repo carries only the habit: at start, load this PC's own
  notes if it has them, and add each new trap to them. Each PC keeps its notes outside the repo; install.ps1 creates
  an empty notes skill on a PC that has none".
- D-42 (report-changes, explain-clearly): "Chose A: move them here: this repo is their only home ... Comment: yes the
  skills you mentioned need to be global skills for claude code, not repo specific".
- D-49 (client names): "Chose A: replace them with invented names in what comes here; with a move, the original
  loses them too".

## Your two points

1. **report-changes and explain-clearly come in.** Copy `SRC\report-changes\` to `REPO\report-changes\` and
   `SRC\explain-clearly\` to `REPO\explain-clearly\`, every file, byte for byte, except the lines that name a client:
   `explain-clearly\references\explainer-page.md` lines 8, 54 and 118 (a client's name, its repo folder on this PC and
   a ticket number). Replace each client name with an invented one (for example `Contoso`, `ContosoD365`, ticket
   `CTS-1234`), keeping the sentence. They are global skills: they will be linked into `~\.claude\skills` and
   `~\.copilot\skills` like `team-rules` (the init run and the main session do that; you make no link). Testable: a
   byte diff of each copied file against its source shows only the listed lines.
2. **machine-pitfalls is split in two.**
   - A new team skill `REPO\windows-pitfalls\` (SKILL.md plus `references\`, the same shape as the source) holds every
     trap that holds on any Windows 10 or 11 PC with PowerShell 7, Node, VS Code and Claude Code: PowerShell's
     case-insensitivity and parsing, quoting native arguments, `Move-Item` through junctions, Edit and Write breaking
     hard links, Node and .NET quirks, Claude Code agent behaviour, and so on. Its frontmatter `name: windows-pitfalls`
     and a `description:` in the source's style that says it holds the traps true on any Windows PC and that this
     PC's own traps are in `machine-pitfalls`.
   - This PC's own traps (they depend on this PC's install: the broken `C:\Program Files\Git\cmd\git.exe` and the
     Visual Studio 2026 git path, no Python, no `jq`, VS Code memory on this 7.8 GB PC, the user's two GitHub
     accounts, any folder of this PC) go into a trimmed copy of machine-pitfalls in
     `WF\SELF_CONTAINED_STAGING\machine-pitfalls\` (same file names; drop a references file that ends up empty). Its
     description says it holds this PC's own traps and that the general ones are in `windows-pitfalls`. The main
     session copies it over xpp-agent's skill later; you never write in xpp-agent.
   - A starter for a PC with no notes: `REPO\templates\machine-pitfalls\SKILL.md`, frontmatter `name:
     machine-pitfalls` and a description saying it holds this PC's own traps, then a short body: what goes here
     (a trap true only on this PC), what goes to `windows-pitfalls` instead, and one empty table or list to fill. The
     init run copies it to a PC that has none.
   - When a trap fits both (a general trap with an example from this PC), it goes to `windows-pitfalls` with the
     example made general. The client environment's name in `references\files-and-links.md` line 9 is replaced by an
     invented one (D-49) wherever that line ends up.
   - Testable: every trap of the source appears in exactly one of the two halves (give the table: trap, source
     file:line, where it went). **0 lost, 0 in both, N traps.**

Then the files that name these skills (small, part of point 2):

- `agents\software-developer.md` frontmatter `skills:` becomes `team-rules`, `report-changes`, `windows-pitfalls`,
  `machine-pitfalls`; `agents\task-lead.md` `skills:` becomes `team-rules`, `windows-pitfalls`, `machine-pitfalls`.
  Their body lines that name machine-pitfalls (software-developer.md 32, 281; check task-lead.md) say which of the
  two holds what. `orchestrate-agents\references\worker-rules.md` lines 15-25 follow the same lists.
  `orchestrate-agents\SKILL.md` lines 47 and 251 likewise.
- `team-rules\SKILL.md` gets the habit, short, in its plain style: at start both notes are loaded; when a trap costs
  you time, write it in your report's ISSUES FOUND line as `trap: <symptom> -> <fix> (any Windows PC | this PC
  only)`; the main session adds it to `windows-pitfalls` or to this PC's `machine-pitfalls`. Agents never edit either
  skill themselves.
- Loading rule: the team's own skills are preloaded by name (`skills:`); this PC's notes are preloaded too, and the
  init run guarantees they exist (the starter). Keep it a plain list, so a later per-project list can add skills the
  same way.

## Your files, and the files that are not

Yours: new `REPO\report-changes\`, `REPO\explain-clearly\`, `REPO\windows-pitfalls\`, `REPO\templates\`,
`WF\SELF_CONTAINED_STAGING\`; edits in `REPO\agents\software-developer.md`, `REPO\agents\task-lead.md`,
`REPO\team-rules\SKILL.md`, `REPO\orchestrate-agents\references\worker-rules.md`, `REPO\orchestrate-agents\SKILL.md`
(only the lines about these skills).

Not yours, never edit: `REPO\README.md` and the guide pages (a later run); `REPO\skills\` (vendored); `decisions\`;
anything in xpp-agent or claude-code-extensions; `~\.claude\` and `~\.copilot\` (no links, no skill folders there);
`scripts\install.ps1`. Run S2 (another worker, now) changes: new `REPO\decisions-pane\`, new `REPO\.claude-plugin\`,
`REPO\.gitignore`, and in claude-code-extensions a new `skills\claude-code-mods\` and its `README.md`.

## Never write a client's name

This repo is public on GitHub. Never write the client names you find in the lines above into any file of this repo,
your progress and report files included: say "the client name". Search for them in your checks by their spelling in
a command line only.

## The invariant (touches nothing live)

- Byte diff: each file of `REPO\report-changes\` and `REPO\explain-clearly\` against SRC: **0 differences except the
  listed lines** (give N files).
- The split table: **0 lost, 0 in both, N traps** (a trap is one bullet or one table row or one paragraph of advice;
  say how you counted).
- A search of every new or changed file for the client names (both of them, any case) and for credentials: **0**.
- Every skill named in `skills:` of an agent file exists as a folder with a SKILL.md in REPO, or is
  `machine-pitfalls` (the starter in `templates\`): give the list.
- Every new SKILL.md has a frontmatter with `name` equal to its folder and a `description`.
- There is no code in this run, so no mutation check; say so in the report.
- Optional, only if it costs under 10 tool calls: find out from Claude Code's documentation or a headless check what
  happens when an agent's `skills:` names a skill that is not installed (the agent fails to start, a warning, or it
  is skipped). Report what you found and how, or that you did not check.

## Rules for this run

- `agents\` and `team-rules\` are live: an agent file is read at each Claude Code start, team-rules by every lead
  and worker at start. Leave every edited file whole and valid after each Edit.
- Keep every file's encoding and line endings; check them on the copies (byte diff covers it).
- No heavy command is expected. If you run the Node suite, run it through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`.
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point.
- Plan for about 70 tool calls; you are warned at 320 thousand tokens. Do the invariant right after the two points.

## Files

- Progress file: `WF\SELF_CONTAINED_S1_PROGRESS_CLAUDE.md`.
- Report file: `WF\SELF_CONTAINED_S1_REPORT_CLAUDE.md`: what is different, the split table (or its path), the
  invariant's numbers, the main session's steps for this PC in order (link `windows-pitfalls`, `report-changes`,
  `explain-clearly` from REPO into both skills folders; copy the staged machine-pitfalls over xpp-agent's; delete
  xpp-agent's report-changes and explain-clearly), and what was not tested. It ends with the four-line block
  (DECISIONS TAKEN, INITIATIVES, ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- The init script, the paths of the repo, the README, the pane, domain packs (D-40).
