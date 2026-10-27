# Task: the agent repo holds everything the team needs (D-38)

Written by the main session at 2026-10-27 10:48.

## What the user wants

D-38 (closed; read it in `decisions\RESOLVED_DECISIONS_CLAUDE.md`) found that the lead's and the worker's files load two
skills that live in the xpp-agent repo (`machine-pitfalls`, `report-changes`). The user's answer, in their words:
"Other: The agent repo should have everyhting it needs to fuinction, everyhting along with the necessary extensions".
Earlier in the same chat they said that xpp-agent "is a separate project" and that the developer agent "is a universla
agent for sotwar edevelopment".

So: someone clones `software-developer-agent` on another machine, installs it, and the whole team works, the Decisions
pane included, with no other repo of the user's.

## What you do first: an inventory, then the user's choices

1. Have a searcher list everything the team relies on outside this repo. At least:
   - skills named by the agent files, `team-rules`, `orchestrate-agents\SKILL.md`, `team-switch\SKILL.md` and the
     hooks (`machine-pitfalls`, `report-changes`, `explain-clearly`, ...), and where each lives;
   - Claude Code extensions in `C:\Repos\My projects\claude-code-extensions` that the team uses (`decisions-pane` for
     sure; check `agents-pane` and the rest), their shared code and tests, and how the plugin is registered
     (`extraKnownMarketplaces` and `enabledPlugins` in `~\.claude\settings.json` point at that repo as a directory
     marketplace);
   - what is set by hand in `~\.claude\settings.json` (the two team hooks, `autoContinueAtUsageLimit: false`);
   - full paths baked into files (`C:\Repos\My projects\software-developer-agent`, `C:\Program Files\nodejs\node.exe`,
     the vendored skills' path) and anything else a new machine would lack.
2. Register the choices that are the user's, early and with options, costs and a recommendation. The ones I see:
   - for each outside piece, **move it here** (one home; the other repo loses it or links to it) or **copy it** (two
     copies that can drift);
   - `machine-pitfalls` is about this machine (its broken git, its PowerShell traps): how a universal repo carries it;
   - whether `install.ps1` may now write `~\.claude\settings.json` (hooks, plugin source); until today that was done by
     hand on purpose (README, "How it is wired");
   - whether the repo must stay at `C:\Repos\My projects\software-developer-agent` or work from any folder.
3. Then plan the runs in your lead file.

## Constraints

- **Another lead is running** (the team's state in one folder, D-36; its lead file is `STATE_FOLDER_LEAD_CLAUDE.md` in
  this folder). Its workers change `orchestrate-agents\orchestration.config.json`, the hooks, `lib\`, the scripts, the
  tests, `README.md`, `agent-team-files.html`, `orchestrate-agents\references\agent-team-guide.html` and
  `C:\Repos\My projects\claude-code-extensions\decisions-pane\`. **Start no worker until I send you `GO`.** Reading
  and searching are fine.
- **Both repos are public on GitHub.** Anything copied or moved into this repo will be published at the next push:
  scan it for credentials, client names and customer data first, and register what you find.
- **Live things are the main session's:** `~\.claude\settings.json`, the junctions under `~\.claude\skills` and
  `~\.copilot\skills` (every session uses them; never `Move-Item` a tree with junctions in it), the plugin
  registration, the global `CLAUDE.md`, and the xpp-agent and claude-code-extensions repos except where a run is
  told to change them. Give the main session the exact steps and text for those.
- The vendored skills under `skills\` keep their rules (`CLAUDE.md`): never edited, never linked.

## Done when

- The repo, cloned alone on a clean machine and installed, gives a working team and Decisions pane; tests prove what
  can be proved without a second machine, and the summary says plainly what could not.
- The suites pass (Node, PowerShell, the pane's), and a summary in this folder lists the steps for the main session.
