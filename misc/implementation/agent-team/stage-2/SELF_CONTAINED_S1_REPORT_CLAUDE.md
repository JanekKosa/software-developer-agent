# Run S1 report: the team's skills come into the agent repo

Written 2026-10-27 15:12 by the S1 worker. Progress file, with the full split table:
`SELF_CONTAINED_S1_PROGRESS_CLAUDE.md` (same folder).

**Done.** Both points are finished and the invariant holds. Nothing is linked, nothing is committed (saved into the
repo's history), and nothing was written in xpp-agent. The main session's steps for this PC are below.

## What is different

- `report-changes` and `explain-clearly` now live in this repo, as global skills to link like `team-rules`. They are
  byte copies. The only change is the client's details in `explain-clearly\references\explainer-page.md`. The client
  name became `Contoso` and its repo folder `ContosoD365`. The ticket number became `CTS-1234`.
- The machine notes are split in two:
  - `windows-pitfalls` (new team skill in this repo) holds the 58 traps that hold on any Windows PC. Examples are
    PowerShell's case-insensitivity, junctions, hard links, Node and .NET, VS Code prompts and Claude Code agents.
  - A trimmed `machine-pitfalls` is staged in `SELF_CONTAINED_STAGING\machine-pitfalls\` with this PC's 7 traps: the
    broken git and the Visual Studio git, the Bash tool, the missing tools, the two GitHub accounts and VS Code memory.
- Example: "`Move-Item` follows junctions" moved to `windows-pitfalls`. "`C:\Program Files\Git\cmd\git.exe` is
  broken" stayed in this PC's notes.
- Five general traps carried a detail of this PC, and the detail was made general. "Use VS 2026's Roslyn at
  `...\18\Enterprise\...`" now reads `...\<version>\<edition>\...` (VS 2026 is version 18). Three facts of this PC
  taken out that way stay on the PC side: "no `gh` CLI and no `GH_TOKEN`", "Developer Mode is off", and the
  instructions sync hook that re-links the global pair.
- A starter `templates\machine-pitfalls\SKILL.md` gives a new PC empty notes. It says what goes there, what goes to
  `windows-pitfalls`, who writes it, and has one empty list.
- Both agent files now preload, by name: the worker `team-rules`, `report-changes`, `windows-pitfalls`,
  `machine-pitfalls`; the lead the same without `report-changes`. The worker's step 2 and section 11 heading,
  worker-rules.md and orchestrate-agents SKILL.md (line 47; one sentence after line 251) say which note holds what.
- `team-rules` has a new section 8, "Traps". Both notes are preloaded. A trap that cost time goes in the ISSUES FOUND
  line as `trap: <symptom> -> <fix> (any Windows PC | this PC only)`. The main session files it. Agents never edit
  either skill.

## Paths

- New: `report-changes\` (1 file), `explain-clearly\` (3 files), `windows-pitfalls\` (SKILL.md and 6 references),
  `templates\machine-pitfalls\SKILL.md`, `misc\implementation\agent-team\stage-2\SELF_CONTAINED_STAGING\machine-pitfalls\`
  (SKILL.md and 4 references; node-and-dotnet.md and claude-code-agents.md dropped, as nothing of this PC was left
  in them).
- Edited: `agents\software-developer.md`, `agents\task-lead.md`, `team-rules\SKILL.md`,
  `orchestrate-agents\references\worker-rules.md`, `orchestrate-agents\SKILL.md`.
- Outside the diff: none. The generator and check scripts stay in the session scratchpad
  (`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad\`:
  `split.ps1`, `bytediff.ps1`, `splitcheck.ps1`, `invariant.ps1 -Names <the client names>`), to run again.

## The main session's steps for this PC, in order

1. Link `windows-pitfalls`, `report-changes` and `explain-clearly` from this repo into `~\.claude\skills` and
   `~\.copilot\skills`, like `team-rules`. Check first what sits at the two old names (a link to xpp-agent or a real
   folder), and remove only the link.
2. Copy the staged `machine-pitfalls` over xpp-agent's `Docs\Skills\machine-pitfalls`. Also delete its
   `references\node-and-dotnet.md` and `references\claude-code-agents.md`. A plain copy leaves them, and then 28
   traps sit in both notes.
3. Delete xpp-agent's `report-changes` and `explain-clearly`, after step 1.
4. Delete the staging folder, or keep it out of any commit. It holds the user's two GitHub account names, verbatim
   from the source, in a tracked folder of a public repo.
5. Restart Claude Code only after step 1 (agent files are read at start; see the missing-skill finding below).

## Text the shared files need

`README.md` lines 62-65 (a later run) still say `machine-pitfalls` lives in `xpp-agent\Docs\Skills`. Suggested
text: "Both preload with `skills:` the `team-rules` skill, ..., `windows-pitfalls` (the traps of any Windows PC, in
this repo) and `machine-pitfalls` (this PC's own traps, kept outside the repo; the init run copies
`templates\machine-pitfalls\` to a PC that has none). The worker also preloads `report-changes`." The README's
layout list and the install section also need the four new folders.

## Checks, run after the last change

- Byte diff (4 files): 3 identical, `explainer-page.md` differs on lines 3, 8, 54, 118 only. Same 126 lines, LF kept,
  no BOM.
- Split: 65 traps (63 bullets and 2 advice paragraphs; the index table rows and file intros are not counted).
  **0 lost, 0 in both, 0 in the wrong half.** 58 went to `windows-pitfalls` and 7 to this PC. 59 moved word for word.
  6 were edited, and their old text is in neither half. In reverse, all 64 bullets of the two halves trace back to
  one source trap, except the split-off sync-hook bullet, as expected. Checker self-test: 3 broken copies, 3 of 3
  caught.
- Client names (both, any case, plus the ticket prefix) over the 23 new or changed files, and over this report:
  **0**. Credential patterns: **0**. The same search for the invented names finds them, so it can hit.
- `skills:` lists: `team-rules`, `report-changes`, `windows-pitfalls` are folders with a SKILL.md in the repo;
  `machine-pitfalls` is the starter in `templates\`.
- Frontmatter: all 5 new SKILL.md files have `name` equal to their folder and a plain-YAML `description`.
- Line endings: SKILL.md files LF, references CRLF as in the source. The edited files stay LF, matching git's index.
- Untouched: 65 hashed files (the xpp-agent sources, `skills\`, `decisions\`, README, install.ps1, CLAUDE.md): 0
  differences against the baseline of 14:58.
- Node suite (`node --test` through run-heavy): 260 of 261 pass. The failing one,
  `limit-stop-server.test.mjs:510`, passed when I re-ran it on its own. I changed no code, and no test reads my files.
- No mutation check of product code: this run has no code.

**Not tested:** no Claude Code session was started with the new agent files, and nothing was checked in Copilot.
The missing-skill behaviour comes from the documentation only. The PowerShell suite was not run (no script changed).

## What I learned

- The sub-agents page of Claude Code's docs (read 2026-10-27) says: "If a listed skill is missing or disabled ...
  Claude Code skips it and logs a warning to the debug log." Not checked in a headless run. So an agent started
  before step 1 lacks `windows-pitfalls` and nobody sees it.

DECISIONS TAKEN: explainer-page.md line 3 also changed (the same real ticket number as line 8) -> `CTS-1234`; other choice: keep line 3 byte-identical with the real ticket and a mismatched pair | the client environment in files-and-links became `FabrikamD365`, not `ContosoD365`, so two real clients stay two invented ones | the VS Code memory bullet stays whole on the PC side as the task lists it; other choice: split off its general parts (where the live log is, Copilot holding MCP helpers) | the Bash tool spawn failure counted as this PC's (it rides on the broken Git install); other choice: general | three PC facts taken out of general traps kept in the PC notes (Shell bullet renamed "Shell and tools"; one bullet in staged files-and-links.md); other choice: drop them | a vendor name (an ISV, not a client) on explainer-page.md line 30 and a record id on line 107 kept, as neither names a client
INITIATIVES: an "Adding a trap" paragraph closes both halves' SKILL.md | team-rules' description now names the trap habit | the added orchestrate-agents sentence also names report-changes | the split checker got a 3-mutant self-test | the Node suite was run although no code changed
ISSUES FOUND: a missing preloaded skill is skipped with only a debug-log warning (docs), so link before restarting | the staged machine-pitfalls holds the user's two GitHub account names in a tracked folder of a public repo; delete it after the copy | README.md 62-65 is out of date (text above) | software-developer.md section 11 keeps six general Windows traps outside windows-pitfalls; a later run could move them | limit-stop-server.test.mjs:510 failed once in the full suite and passed alone (likely load-sensitive, not checked further) | explainer-page.md line 8 now points at an invented folder that does not exist (the sentence already says "may be gone")
QUESTIONS: none
