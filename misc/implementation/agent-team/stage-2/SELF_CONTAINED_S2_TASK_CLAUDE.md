# Run S2: the Decisions pane moves into the agent repo, and claude-code-mods into the extensions repo

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-27 14:55. Working
folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\` (WF below). REPO =
`C:\Repos\My projects\software-developer-agent`. EXT = `C:\Repos\My projects\claude-code-extensions`. PANE =
`EXT\decisions-pane`.

## Read first, and no more

1. `REPO\CLAUDE.md` and `REPO\README.md` ("Layout", "How it is wired", "Tests").
2. The `claude-code-mods` skill: `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md` (how mods are
   installed and tested here, which `claude.exe` to use, what a directory marketplace is).
3. `PANE\README.md` whole, `PANE\.claude-plugin\plugin.json`, the header comment of `PANE\hooks\team-on.ts`.
4. `EXT\.claude-plugin\marketplace.json`, `EXT\README.md` (1.3 KB), `EXT\.gitignore`.
5. `WF\SELF_CONTAINED_F2_REPORT_CLAUDE.md`, section "README text for the lead to apply later" only.
6. The pane's check script of run F2, to reuse: `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\f2\checks.ps1`
   and its `tc\tsconfig.json` (validate, test, type-check).

Do not read the plans, the guide pages, `decisions\`, or the pane's code beyond what a check needs.

## What it is for

The user's answers, in their words:

- D-44: "Chose A: move it here: one copy, its tests run here, and claude-code-extensions no longer lists it (one run
  here; then the main session switches this PC to install it from this repo and removes the old copy). Comment: yes
  the extensiosn specific to this agent need to be wihtin this agent dir, and on init extensiosn need to be
  installed/ ran".
- D-43: "Other: ok and move the what was learend during mod building to the extenions project": the
  `claude-code-mods` skill's home becomes EXT (it stays a global skill, linked from this PC's skills folders by the
  main session).

## Your two points

1. **The pane comes into REPO.**
   - Copy PANE to `REPO\decisions-pane\`, every file, byte for byte (no `node_modules`, no `.claude-plugin\types\`
     if one appears), then change only: the pane's `README.md` (its new home: the agent repo; "Installing it" says
     the plugin now comes from the agent repo's marketplace `software-developer-agent`, as
     `decisions-pane@software-developer-agent`; apply F2's two paragraphs; every other sentence stays) and the header
     comment of `hooks\team-on.ts` (its source, `orchestrate-agents\lib\agent-team.mjs`, is now in the same repo; it
     stays a copy, because a plugin runs from Claude Code's plugin cache and cannot import outside its folder).
   - REPO becomes a directory marketplace: `REPO\.claude-plugin\marketplace.json`, name `software-developer-agent`,
     owner as in EXT's, one plugin `decisions-pane`, source `./decisions-pane`, a description in EXT's style.
   - `REPO\.gitignore` gets the lines EXT's has for a mod (`.claude-plugin/types/` and whatever else the pane can
     leave behind), and nothing more.
   - Testable: `claude plugin validate decisions-pane` and `claude plugin test decisions-pane` run in REPO pass with
     the same count as in EXT (150 at 14:41); the type-check of the copy passes; `claude plugin validate` accepts the
     new marketplace (find the right form of the command; if none exists, say so).
2. **claude-code-mods goes to EXT**, and the EXT side is written down, not applied.
   - Copy `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\` to `EXT\skills\claude-code-mods\`, byte for
     byte. Add one short entry about it to `EXT\README.md` (where the skill lives, that it is linked into
     `~\.claude\skills` and `~\.copilot\skills` by hand). Search the copy for client names and credentials first:
     EXT is public on GitHub (one `C:\Repos` path line is known and fine).
   - Do NOT remove the pane from EXT: this PC still installs it from there until the main session switches. Instead
     write into your report the exact new text of `EXT\.claude-plugin\marketplace.json` without the pane, the exact
     lines to change in `EXT\README.md`, and the main session's steps in order: register REPO as a marketplace and
     install `decisions-pane@software-developer-agent` (find the supported commands, `claude plugin marketplace add
     <REPO>` and `claude plugin install ...`, or the settings entries; name the ones you found and how you checked
     them, without running them against this PC's settings), uninstall `decisions-pane@claude-code-extensions`,
     `/reload-plugins`, then delete `PANE` and apply the EXT text.

## Your files, and the files that are not

Yours: new `REPO\decisions-pane\`, new `REPO\.claude-plugin\`, `REPO\.gitignore`, new `EXT\skills\claude-code-mods\`,
`EXT\README.md`.

Not yours, never edit: everything under PANE (read and copy only), `EXT\.claude-plugin\marketplace.json`, the rest of
EXT; `REPO\README.md` and the guide pages; anything in xpp-agent; `~\.claude\` (settings, plugins, plugin cache,
skills) and `~\.copilot\`. Never install, uninstall, enable or reload a plugin, and never add a marketplace, on this
PC; if you test the commands, do it with a scratch Claude config folder only (say which variable or option points
Claude Code at it, and how you checked that this PC's own `~\.claude` stayed unchanged: hash `settings.json` and
`plugins\*.json` before and after). Run S1 (another worker, now) changes: new `REPO\report-changes\`,
`REPO\explain-clearly\`, `REPO\windows-pitfalls\`, `REPO\templates\`, `WF\SELF_CONTAINED_STAGING\`, and edits in
`REPO\agents\*.md`, `REPO\team-rules\SKILL.md`, `REPO\orchestrate-agents\references\worker-rules.md`,
`REPO\orchestrate-agents\SKILL.md`.

## The invariant (touches nothing live)

- Byte diff of `REPO\decisions-pane\` against PANE: **0 differences except README.md and the team-on.ts header**
  (give N files).
- Byte diff of `EXT\skills\claude-code-mods\` against its source: **0 differences** (N files).
- The pane suite in REPO and in PANE: the same count, all passing, the same test names (compare the two logs' pass
  lines: 0 differences).
- `settings.json` and `~\.claude\plugins\*.json` hashes unchanged from your start to your end.
- No code changes, so no mutation check; say so in the report.

## Rules for this run

- Every heavy command (`claude plugin test`, the type-check) goes through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with any redirection to a log file inside the command.
- Keep every file's encoding and line endings (the byte diff covers the copies).
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point.
- Plan for about 60 tool calls; you are warned at 320 thousand tokens. Do the invariant right after the two points.

## Files

- Progress file: `WF\SELF_CONTAINED_S2_PROGRESS_CLAUDE.md`.
- Report file: `WF\SELF_CONTAINED_S2_REPORT_CLAUDE.md`: what is different, the counts, the invariant's numbers, the
  exact EXT text and the main session's steps (above), what was not tested (for example the pane installed from the
  new marketplace on this PC, which only the main session does). It ends with the four-line block (DECISIONS TAKEN,
  INITIATIVES, ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- The init script (a later run installs and switches on the pane on a new PC), the repo's paths, the README, the
  agents pane (it stays in EXT), domain packs.
