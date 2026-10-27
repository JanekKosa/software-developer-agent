# Contract: the repo works from any folder, and init sets a PC up (runs S3a, S3b1, S3b2)

Written by the lead (self-contained task) at 2026-10-27 15:21. Every run named here builds to this file word for
word. A run that finds it cannot work stops and asks its lead (`QUESTION FOR THE LEAD |`); it never changes the
contract on its own. REPO = the agent repo, wherever it is cloned (on this PC
`C:\Repos\My projects\software-developer-agent`).

## The user's answers behind it, in their words

- D-47: "Chose A: it works from any folder: files reach the scripts through the links install.ps1 makes, which are
  the same on every PC (such as ~\.claude\skills\orchestrate-agents), and each PC's own values, such as where your
  own repos are, go into one settings file per PC that install.ps1 creates and git ignores (one run over about 26
  files)."
- D-46: "Other: the init script, and that is what it should be called needs to do all the steps that are required to
  run this agent, meaning any task that dont need an LLM, the script needs to perform."
- D-48: "Chose A: Windows only: the README says so, and install.ps1 checks for Windows, Node and PowerShell 7 before
  it changes anything (part of one run)."
- D-44's comment: "on init extensiosn need to be installed/ ran".

## 1. The repo link

- `%USERPROFILE%\.claude\software-developer-agent` is a directory junction to REPO's root, made by init. It is the
  same path on every PC.
- Every file that names a file of REPO for an agent or a person to use names it through this link: in PowerShell
  `"$HOME\.claude\software-developer-agent\<path>"` (never `~` before a native program), in prose
  `~\.claude\software-developer-agent\<path>`. Example: `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command '...'`.
- Code never names REPO by a fixed path: it finds its files relative to itself (`$PSScriptRoot`,
  `import.meta.url`). A path through `~\.claude\skills\orchestrate-agents\` (a skill link) stays valid; the pane's
  default `registerScript` keeps using it.
- Test fixtures may keep path strings that only stand for "some path" (each kept line listed in the run's report).

## 2. The per-PC settings file

- Path: `<teamState.folder>\pc-settings.json` (on this PC
  `C:\Users\user\.claude\state\software-developer-agent\pc-settings.json`). Outside REPO, so git never sees it.
- Content: a JSON object. Today one key: `{ "register": { "commitInRepos": ["<pattern>", ...] } }`. Other keys are
  ignored and kept.
- Default, used when the file or the key is missing: `["<parent folder of REPO>\*"]`, REPO being the real folder (links
  resolved) that holds `orchestrate-agents`. On this PC that is `C:\Repos\My projects\*`, today's value, so nothing
  changes here before init runs.
- `orchestration.config.json` names no PC's folder: its `register.commitInRepos` goes, and its `_why` says where the
  value now comes from.
- init creates the file when it is missing, holding the default written out, and never overwrites it.

## 3. The init script

- `REPO\scripts\init.ps1`, renamed from `install.ps1`. Every mention says `init.ps1` ("the init script").
- Run as `pwsh -NoProfile -File <REPO>\scripts\init.ps1` from anywhere. `-WhatIf` shows every change and makes none.
  Test-only parameters: `-HomePath <folder>` (stands for `%USERPROFILE%`: links, `.claude`, `.copilot`, the state
  folder) and `-ClaudeConfigDir <folder>` (where `settings.json` and Claude Code's plugin files are; default
  `<home>\.claude`; passed to `claude.exe` as `CLAUDE_CONFIG_DIR`).
- Order: (1) checks, all before any change: Windows; PowerShell 7 or later; Node on the PATH (its full path is what
  the hooks call); the `claude.exe` of Claude's VS Code extension (newest version folder under
  `<home>\.vscode\extensions\anthropic.claude-code-*\resources\native-binary\`) or `claude` on the PATH. A missing
  one stops init with a plain message and changes nothing. (2) links. (3) the per-PC notes starter. (4) the per-PC
  settings file. (5) Claude Code's settings. (6) the team's extensions. Then a summary of what changed and what was
  already in place.
- A second run changes nothing and says so.
- Links (step 2): the six of today (`~\.claude\agents\software-developer-agent`, `orchestrate-agents` and
  `team-rules` in both skills folders, `~\.claude\skills\software-developer-agent` -> `team-switch`), plus
  `report-changes`, `explain-clearly`, `windows-pitfalls` in both `~\.claude\skills` and `~\.copilot\skills`, plus the
  repo link. A link that points elsewhere is re-pointed; a real folder or file in the way stops init before any
  change (as today).
- The notes starter (step 3): when `~\.claude\skills\machine-pitfalls` does not exist, copy
  `REPO\templates\machine-pitfalls\` there as a real folder; when `~\.copilot\skills\machine-pitfalls` does not
  exist, make it a junction to the Claude one. Anything already there (a link or a folder) is left alone.
- Settings (step 5), in `<claude config dir>\settings.json`, saved first as `settings.json.bak-<yyyyMMdd-HHmmss>`:
  - `hooks.PostToolUse`: one entry without a matcher whose command is the node.exe full path and whose args are
    `["<home>\.claude\software-developer-agent\orchestrate-agents\hooks\context-guard.mjs"]`, timeout 10.
  - `hooks.UserPromptSubmit`: the same for `decision-reminder.mjs`, timeout 10.
  - An existing hook entry whose args name `context-guard.mjs` or `decision-reminder.mjs` is the team's: its command
    and path are updated in place, never added twice. Every other hook and every other key stays as it is.
  - `autoContinueAtUsageLimit: false`.
  - The file keeps its encoding and line-break style; a missing file is created.
- Extensions (step 6), with `CLAUDE_CONFIG_DIR` set when `-ClaudeConfigDir` is given:
  `claude plugin marketplace add "<home>\.claude\software-developer-agent"` (skip when that marketplace is known),
  `claude plugin install decisions-pane@software-developer-agent --scope user` (skip when installed), then, when a
  `decisions-pane@<another marketplace>` is installed, `claude plugin uninstall decisions-pane@<that> --scope user`.
  The summary says: open chats need `/reload-plugins`.
