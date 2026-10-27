# Run S2 report: the Decisions pane in the agent repo, claude-code-mods in the extensions repo

Written 2026-10-27 15:05 (clock). Progress file: `SELF_CONTAINED_S2_PROGRESS_CLAUDE.md`.

## Outcome

Done. The agent repo now holds the pane and is a marketplace of its own. This PC still installs the pane from the
extensions repo until the main session switches it; the steps for that are below. Nothing is committed.

- `decisions-pane\` is a copy of the pane in the agent repo. 18 of its 20 files are byte for byte the same. The
  other two are the README and the header comment of `hooks\team-on.ts`.
- The agent repo is a directory marketplace (a marketplace Claude Code reads straight from a folder) named
  `software-developer-agent`. Its one plugin is `decisions-pane`. Example: after the switch, `claude plugin list`
  shows `decisions-pane@software-developer-agent`, `Read from: C:\Repos\My projects\software-developer-agent\decisions-pane`.
  That was seen in a scratch config, not on this PC.
- The `claude-code-mods` skill has a byte-for-byte copy in `claude-code-extensions\skills\claude-code-mods\`. The
  extensions README says where it lives and that it is linked into the skills folders by hand.
- The pane is still in the extensions repo and still listed in its marketplace, as the task said.

## What changed in the copy

- README, "Installing it": the pane lives in the agent repo (moved 2026-10-27). That repo's root is the marketplace
  `software-developer-agent`, with two commands: `claude plugin marketplace add "C:\Repos\My projects\software-developer-agent"`
  and `claude plugin install decisions-pane@software-developer-agent --scope user`.
- README: F2's two paragraphs are in. One is a new bullet under "What it lists", after "Each entry in a frame of its
  own". The other is added to the end of the Options bullet under "Answering". No other sentence changed.
- `team-on.ts` header, lines 8-13: the three source files are now "in this same repo", and the code stays a copy
  because "a mod cannot import from outside its own folder". I left out the reason the task gave, "runs from Claude
  Code's plugin cache". The plugin-authoring reference (line 76) says a folder-marketplace plugin with a relative
  source is read from that folder itself. The scratch `plugin list` showed the same `Read from:` repo folder.

## Files

- New: `REPO\decisions-pane\` (20 files), `REPO\.claude-plugin\marketplace.json`, `EXT\skills\claude-code-mods\SKILL.md`.
- Changed: `REPO\.gitignore` (+3 lines), `EXT\README.md` (+3 lines). Every file is UTF-8 without BOM and LF only,
  as before.
- `.gitignore` line: `**/.claude-plugin/types/`, under EXT's comment. Why not EXT's bare `.claude-plugin/types/`: see
  DECISIONS TAKEN.
- Outside the diff: nothing on this PC. The scratch config, the scratch marketplace copies and every `claude.exe`
  run are gone or finished. The check logs, the hash lists and `checks.ps1` stay in
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\s2\`.

## Checks (after my last change)

All runs use `claude.exe` 2.1.310, the same one F2 used. VS Code's extensions folder also holds 2.1.311.

- Pane suite in EXT, then in REPO, through `run-heavy.ps1`:
  - validate: exit 0, "Validation passed" in both. The two logs differ in 0 lines once each repo root is masked.
  - test: "150 pass, 0 fail, 5 files" in both. The 150 pass lines are the same, in the same order: 0 differences.
  - type-check (tsc, same `tsconfig.json` with the paths swapped): exit 0 and no output in both.
- Marketplace: `claude plugin validate --strict .claude-plugin\marketplace.json` exits 0 with "Validation passed".
  That command checks the manifest only. A copy with no plugin folder beside it also passes, and a name with spaces
  fails with 2 errors. The real proof is the scratch install below.
- Scratch install, with `CLAUDE_CONFIG_DIR` set to a scratch folder. That variable is what moved the config: the
  settings, `.claude.json` and `plugins\` files were written in the scratch folder. The steps:
  1. Add the extensions marketplace and install `decisions-pane@claude-code-extensions`, as on this PC.
  2. Run the four commands of the main session's steps.
  - After the install, the list showed both panes enabled.
  - After the uninstall, only `decisions-pane@software-developer-agent` was left, read from the REPO folder.
- Invariant:
  - The REPO copy against PANE: 20 paths on both sides and 0 path differences. 2 of 20 files differ: `README.md`, and
    `hooks\team-on.ts` in lines 8-13 only (the header ends at line 14).
  - The skill copy against its source: 0 differences in 1 file.
  - PANE itself: 0 of 20 files changed since 14:56.
  - `~\.claude\settings.json` and the three `~\.claude\plugins\*.json` files: all 4 hashes unchanged from 14:55 to 15:04.
- Skill scan before copying to the public repo: no client names (the two known clients, d365, customer, tenant) and no
  credential patterns (password, secret, api key, bearer, sk-, ghp_, AKIA, emails).
  - "token" (line 91) is about token usage.
  - The one `https://` (line 37) is a made-up `.invalid` example.
  - The one `C:\` path (line 13) is the known line.
- No mutation check: no code changed.

**Not tested:** the pane installed from the new marketplace on this PC, `/reload-plugins`, and the pane drawn in a
VS Code chat from the new folder. Only the main session switches this PC. `/reload-plugins` is a chat command, and
cannot run in a headless check.

## Exact text for EXT, not applied

`EXT\.claude-plugin\marketplace.json` without the pane. This text passes `validate --strict` in a scratch copy:

```json
{
  "name": "claude-code-extensions",
  "description": "Claude Code mods that work with the Claude toolbar for VS Code.",
  "owner": { "name": "JanekKosa" },
  "plugins": [
    {
      "name": "chat-colors",
      "source": "./chat-colors",
      "description": "Draws a tinted band in the colour the Claude toolbar's colour wheel sets above each prompt, each note and each answer of Claude's in the VS Code chat."
    },
    {
      "name": "agents-pane",
      "source": "./agents-pane",
      "description": "A pane in the Claude chat that lists every agent of the session as it runs: subagents, each workflow's agents grouped under their workflow, and teammates."
    }
  ]
}
```

`EXT\README.md`: delete the table row that starts ``| `decisions-pane\` | Claude Code mod: a Decisions tab beside
the Agents tab``. After the table, add:
`The Decisions pane (decisions-pane) moved to the agent team's repo, software-developer-agent, on 2026-10-27.`

## The main session's steps, in order

1. `claude plugin marketplace add "C:\Repos\My projects\software-developer-agent"`. It adds
   `extraKnownMarketplaces.software-developer-agent` (`source: directory`, that path) to the user settings.
2. `claude plugin install decisions-pane@software-developer-agent --scope user`. It adds
   `enabledPlugins["decisions-pane@software-developer-agent"]: true`. "5 userConfig options not yet set" is harmless.
   This PC's settings hold no options for the old pane, so nothing needs carrying over.
3. `claude plugin uninstall decisions-pane@claude-code-extensions --scope user`. Until this step both panes are
   enabled, so do not reload in between. The old plugin's data folder goes; the new id has its own anyway.
4. `/reload-plugins` in each open chat, or a new chat.
5. Delete `C:\Repos\My projects\claude-code-extensions\decisions-pane\` (it has no links inside), then apply the EXT
   text above. Do not remove the `claude-code-extensions` marketplace: `agents-pane` and `chat-colors` still come from it.
6. For the skill: re-point the junctions `~\.claude\skills\claude-code-mods` and `~\.copilot\skills\claude-code-mods`
   at `EXT\skills\claude-code-mods`. Both point at the xpp-agent folder today.

I found these commands in `claude plugin --help` and its subcommands' help, and ran each one in the scratch config.
I did not run any of them against this PC's settings.

## Risky or undecided points

- After the switch, the skill's "Where mods live" will no longer be right. Example: it says "Every mod is a folder of
  `claude-code-extensions`", but `decisions-pane` will live in the agent repo. The copy must stay byte for byte, so I
  left it. Recommendation: a later edit in EXT, for example "Most mods are folders of claude-code-extensions; the
  agent team's `decisions-pane` is in `software-developer-agent`, its own marketplace."
- EXT's `.gitignore` line `.claude-plugin/types/` ignores only the repo root's folder. `git check-ignore` does not
  ignore `decisions-pane/.claude-plugin/types/a.d.ts`. The engine writes these folders beside each mod and puts its
  own `.gitignore` inside, so the harm is small. Recommendation: `**/.claude-plugin/types/` in EXT too.

## What I learned

- `claude plugin validate` on a marketplace file checks names and shape, not that each `source` folder exists.
- `CLAUDE_CONFIG_DIR` fully redirects `claude plugin` commands (settings, `.claude.json`, plugin lists and cache).
- An uninstall left the old plugin's folder under `plugins\cache\` in the scratch config.

DECISIONS TAKEN: `.gitignore` uses `**/.claude-plugin/types/` instead of EXT's `.claude-plugin/types/`, because EXT's anchored form misses the mod's own folder (shown with git check-ignore) | the team-on.ts header gives "a mod cannot import from outside its own folder" as the reason and drops "runs from the plugin cache", which the plugin-authoring reference and the scratch `Read from:` contradict | the README's "Installing it" also lists the `marketplace add` command, not only `install`
INITIATIVES: ran the switch steps end to end in a scratch config (`CLAUDE_CONFIG_DIR`), including the old pane installed first, to prove the commands and their order | built and validated EXT's marketplace text without the pane in scratch | added step 6 (re-point the two claude-code-mods junctions) to the main session's steps
ISSUES FOUND: EXT `.gitignore` line 12 `.claude-plugin/types/` ignores only `EXT\.claude-plugin\types\`, not a mod's own `<mod>\.claude-plugin\types\` (small effect: the engine adds its own .gitignore there) | after the switch, `EXT\skills\claude-code-mods\SKILL.md` lines 13-17 say every mod lives in claude-code-extensions and installs as `<mod>@claude-code-extensions`, no longer true for decisions-pane | between install and uninstall both panes are enabled; a reload in between shows two Decisions panes
QUESTIONS: none
