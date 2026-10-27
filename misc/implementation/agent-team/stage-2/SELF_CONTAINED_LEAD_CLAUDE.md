# Lead file: the agent repo holds everything the team needs (D-38)

Lead started 2026-10-27 10:49. Task file: `SELF_CONTAINED_START_CLAUDE.md` (this folder). Prefix of my files:
`SELF_CONTAINED_`.

## State

- 10:49 Read: repo `CLAUDE.md`, lead brief, the task, sizes file, D-38 (resolved), `README.md`,
  `STATE_FOLDER_START_CLAUDE.md` (to know what the other lead changes). No open register entries at 10:48.
- 11:03 Inventory done (three code-searchers; see "Inventory").
- 11:05 Registered D-41 to D-50 (none blocking); 11:06 told main. Plan written (see "Plan").
- 11:07 First turn ended with `WAITING FOR WORKER | none until GO`.
- 11:09 Main passed on D-41's answer (B, closed) and the user's ask for entries in points; plan now starts with F1+F2.
  Next: at `GO`, step 0 of the plan, then write `SELF_CONTAINED_F1_TASK_CLAUDE.md` and
  `SELF_CONTAINED_F2_TASK_CLAUDE.md` with one shared contract and start both workers; fold in any answers to D-42 to
  D-50 that main passes on.
- 12:49 `GO` for F1+F2 only (the rest waits for the state-folder lead's TASK DONE). 12:53 hash list of both repos in
  my session scratchpad (`F12_HASHES_BEFORE.csv`, 622 files; settings.json hash 1024BC21FF36A72C). 12:54 contract
  `SELF_CONTAINED_F_CONTRACT_CLAUDE.md`; task files `SELF_CONTAINED_F1_TASK_CLAUDE.md`, `..._F2_TASK_CLAUDE.md`.
  ~12:59 started F1 (agent afaab50bd4f151b3e) and F2 (agent aaa7832903a345860). 12:57 main: S4 (other lead) edits
  the pane's team-on/team-switch, their tests, README: F2 limited to decisions.ts, pane.tsx, new points.test.ts.
  13:00 main: reuse the follow-up layout (two-space indent): the contract already does (two spaces + `- `).
- 13:26 F2 done (102 tool calls, 262k, ~31 min): pane 136 pass (107 + 7 mine + 22 S4's), validate ok, tsc ok,
  invariant 0 differences on 56 entries, mutation 20 of 20. 13:38 F1 done (90 calls, 287k, ~43 min): Node 244 of 244
  (229 + 15), invariant 0 differences on 55 entries, mutation 24 of 24.
- 13:40 my checks: hash compare shows only F1/F2 files, the other lead's files and the register (main's writes)
  changed; settings.json unchanged; the contract sample added to a scratch register lists exactly the contract's
  block; a bad list exits 2 naming the field. 13:42 suites through run-heavy: Node 244/244 (2:25, peak 359 MB);
  pane validate ok, 136/136, tsc exit 0 no output (peak 862 MB). F1 and F2 CHECKED. Rows added to STATUS and SIZES
  (as SC-F1, SC-F2: the other lead also has runs named S1...).
- 13:43 `agents\task-lead.md` section 8 (LF kept): template shows `what` and `recommendation` as points; a line saying
  which fields take points; the "until it lands" sentence replaced by how points are stored and shown plus a sample
  entry (JSON) and how the pane shows it. The sample was added to a scratch register: it lists as shown.
- Report blocks gone through: nothing to register (all internal: options drop a typed `- `; blank points refused;
  options lettered only when every point has its own letter, else numbered; further points drawn like follow-up
  lines, so a wrapped long point continues under the bullet, not under its first word). F1's issue (the real
  register rewritten at 12:58:26, same lengths) passed to main; most likely main's own register writes.
- Pending for S2 (the pane's README is S4's now): F2's two README paragraphs, in `SELF_CONTAINED_F2_REPORT_CLAUDE.md`
  "README text for the lead to apply later". Apply when the pane moves.
- Pending for main: `/reload-plugins` so the user sees points; the `SKILL.md` "Entries." text (in my hand-back).
- 14:52 `GO` for the rest (state-folder lead TASK DONE; main ran its switch-over 14:44; state now under
  `C:\Users\user\.claude\state\software-developer-agent\` = config `teamState.folder`). Main's baseline 14:45-14:52:
  Node 261/261, PowerShell 122/122; pane 150/150 (14:41). Main still owns: `-RemoveOld`, deleting
  `STATE_FOLDER_STAGING\` and `STATE_FOLDER_STAGING_BASE_CLAUDE.txt`, `/reload-plugins`.
- 14:53 hash list `S12_HASHES_BEFORE.csv` (scratchpad; 768 files incl. xpp-agent\Docs; settings 6D629B4F2B989B28).
  14:55 task files S1, S2 written; started S1 (agent adf9a6c7313e99dd5) and S2 (agent a98280ab7f1d22037).
- 15:05 S2 done (85 calls, 183k, ~11 min); 15:12 S1 done (91 calls, 248k, ~19 min). Checked 15:15: hash compare =
  only their files (7 changed: .gitignore, 2 agent files, SKILL.md, worker-rules.md, team-rules, EXT README; 45
  added); xpp-agent, settings, links untouched; 0 client names in 39 new files; team-rules section 8 and
  windows-pitfalls read. Suites through run-heavy running (background). Registered D-55 (initiative: traps are filed
  by main, agents never edit the notes; in points), told main 15:15.
- Facts from S1/S2: a missing preloaded skill is skipped with a debug-log warning only (docs, not checked headless);
  a directory-marketplace plugin is READ FROM THE REPO FOLDER itself (`Read from:`), not a cache copy;
  `CLAUDE_CONFIG_DIR` fully redirects `claude plugin` commands (S2 proved the switch steps in a scratch config).
- Main's steps collected so far (for the summary): S1 report "main session's steps" 1-5 (link windows-pitfalls,
  report-changes, explain-clearly into both skills folders; copy staged machine-pitfalls over xpp-agent's AND delete
  its references\node-and-dotnet.md and claude-code-agents.md; delete xpp-agent's report-changes and explain-clearly;
  delete `SELF_CONTAINED_STAGING\` before any commit (it holds the user's two GitHub account names); restart only
  after linking). S2 report steps 1-6 (marketplace add, install @software-developer-agent, uninstall
  @claude-code-extensions with no reload in between, /reload-plugins, delete EXT pane + apply EXT text, re-point
  claude-code-mods junctions to EXT\skills). Init (S3b) will automate the links and plugin steps for a new PC.
- Open small items: EXT `claude-code-mods` SKILL.md lines 13-17 outdated after the switch (EXT's; summary);
  EXT .gitignore `**/.claude-plugin/types/` (summary, optional); software-developer.md section 11 keeps six general
  traps outside windows-pitfalls (optional, S3a may move them); flaky `limit-stop-server.test.mjs:510` seen once by S1.
- 11:20 Every entry answered and closed (D-41 to D-50, D-40); answers in the user's words under "Answers", plan
  revised (init.ps1, claude-code-mods to EXT, part D). Nothing open in the register. Still no worker until `GO`.
- No worker may start before `GO` from main (after the state-folder lead's TASK DONE).

## Baseline (from main, 10:26 to 10:30, before the other lead built)

- Node suite in `orchestrate-agents\`: 229 of 229. PowerShell `tests\limit-scripts.tests.ps1`: 105 of 105. Pane's
  tests: 107 of 107 (09:34). Re-measure at `GO`: the other lead is changing files now.
- Nothing committed since 10abe9f (here) and b6d7deb (claude-code-extensions).

## Files the other lead (D-36, state folder) changes now

`orchestrate-agents\orchestration.config.json`, hooks, `lib\`, scripts, tests, `README.md`, `agent-team-files.html`,
`orchestrate-agents\references\agent-team-guide.html`, `C:\Repos\My projects\claude-code-extensions\decisions-pane\`.

## Inventory (11:03; three code-searchers, raw output in my session scratchpad, not needed by a successor)

Rule for this file and the register: they are tracked in a PUBLIC repo. Never write a client's name here; say "a
client's name".

### Skills the team loads from outside this repo

- `agents\software-developer.md` frontmatter `skills: team-rules, report-changes, machine-pitfalls`;
  `agents\task-lead.md` `skills: team-rules, machine-pitfalls`; `code-searcher.md` none. Same three named in
  `orchestrate-agents\references\worker-rules.md:15-18` (template).
- Named in text: `explain-clearly` (software-developer.md:264, orchestrate-agents\SKILL.md:246; report-changes says
  "Load that too"), `xpp-development` and `d365fo-environment` (software-developer.md:263, conditional, X++ only:
  stay in xpp-agent). `claude-code-mods`: named only by the lead brief for pane work.
- Where they live: `C:\Repos\My projects\xpp-agent\Docs\Skills\` holds 7 (analyze-trace, claude-code-mods,
  d365fo-environment, explain-clearly, machine-pitfalls, report-changes, xpp-development). `~\.claude\skills` and
  `~\.copilot\skills` hold junctions to them, plus junctions to this repo's orchestrate-agents, team-rules,
  team-switch (`software-developer-agent`, Claude only). `~\.claude\skills\synced` is a plain folder (not ours).
- Sizes: machine-pitfalls SKILL.md 3.8 KB + references (claude-code-agents 9.8, files-and-links 3.9,
  git-and-github 3.8, node-and-dotnet 2.8, shells 4.5, vscode 2.7 KB); report-changes SKILL.md 9.4 KB;
  explain-clearly SKILL.md 10.5 KB + assets\explainer-template.html 23.7 KB + references\explainer-page.md 8.6 KB;
  claude-code-mods SKILL.md 12.1 KB. Chains: report-changes -> explain-clearly; explain-clearly's page guide ->
  `artifact-design` (Claude's built-in); claude-code-mods -> `plugin-authoring` (bundled with Claude Code).
- machine-pitfalls content: about half holds on any Windows PC (PowerShell case-insensitivity, native-arg quoting,
  Move-Item through junctions, Edit breaking hard links, Claude Code agent behaviour in claude-code-agents.md); the
  rest is this PC (broken git.exe path, no Python, VS Code memory on 7.8 GB, the two GitHub accounts).
- Public-repo scan of those four: explain-clearly\references\explainer-page.md names a client 2 times plus that
  client's repo path and a ticket number (lines 8, 54, 118); machine-pitfalls\references\files-and-links.md:9 names a
  client environment's model folder. No secret found (the "token"/"password" hits are prose). "customer" hits in
  report-changes are invented examples.
- xpp-agent names these skills in `Docs\Instructions\CLAUDE.md` and `copilot-instructions.md` (4 lines each; the
  source of the global CLAUDE.md, synced by a user hook) and in old misc reports.

### Extensions (C:\Repos\My projects\claude-code-extensions, public, remote JanekKosa/claude-code-extensions)

- Marketplace `.claude-plugin\marketplace.json` lists chat-colors, agents-pane, decisions-pane (hide-actions has a
  plugin.json but is not listed; claude-toolbar is a VS Code extension, not a plugin).
- decisions-pane: 19 files, 170 KB, 4 test files, no package.json, no node_modules; imports only inside its folder
  plus the host SDK (`claude-code`, `claude-code/testing`). Paths outside: plugin.json default
  `registerScript: ~/.claude/skills/orchestrate-agents/scripts/register.mjs` (already path-independent),
  `%TEMP%\claude-agent-team-on` (D-36 changes it), `hooks\team-on.ts` is a COPY of `lib\agent-team.mjs`'s rule
  ("a mod cannot import from the agent repo": a plugin runs from the plugin cache copy). No dependency on the
  toolbar or another mod. Tests: `claude plugin validate/test` with the claude.exe of Claude's VS Code extension.
- agents-pane: 22 files, 78 KB; general (lists every agent of any chat); not needed for the team to work.
- No shared folder between plugins (chat-colors and hide-actions hold identical copies of 4 util files).
- `~\.claude\settings.json` (only these keys were read): hooks PostToolUse context-guard.mjs and UserPromptSubmit
  decision-reminder.mjs, both `C:\Program Files\nodejs\node.exe` + full repo path, timeout 10 (plus the user's own
  sync-instructions.ps1 hook, not the team's); `extraKnownMarketplaces.claude-code-extensions` = directory source at
  the EXT path; `enabledPlugins` agents-pane and decisions-pane @claude-code-extensions; `autoContinueAtUsageLimit:
  false`. `~\.claude\plugins\installed_plugins.json`: both plugins, scope user, installPath under
  `~\.claude\plugins\cache\claude-code-extensions\<plugin>\0.1.0`.

### Paths baked into this repo (excluding skills\, misc\, decisions\)

- 165 pattern lines in 26 files. Most: agent-team-files.html 32, tests\limit-scripts.tests.ps1 26,
  tests\lib\git-repo.test.mjs 18, references\usage-limits.md 13, orchestrate-agents\SKILL.md 10, README 8,
  team-switch\SKILL.md 8, task-lead.md 6, references\start-messages.md 6, start-session-in-vscode.ps1 5. Many in
  tests are fixture strings (sort per file in the run).
- Config: `commitInRepos: ["C:\\Repos\\My projects\\*"]` (the user's own repos commit the register; others get
  .git/info/exclude) is per PC. Other paths use %USERPROFILE%/%TEMP% (D-36 moves them).
- install.ps1: six junctions (agents dir; orchestrate-agents and team-rules into both ~\.claude\skills and
  ~\.copilot\skills; team-switch as `software-developer-agent`), repo root from `$PSScriptRoot`, safe to run twice,
  stops before any change when a real folder is in the way. Touches no settings, checks no prerequisites.
- Programs: node via `process.execPath` (hooks), pwsh via `$PSHOME`, code.cmd from LOCALAPPDATA or beside the
  running exe, claude.exe of the VS Code extension. Env: USERPROFILE, TEMP, LOCALAPPDATA, CLAUDE_PID,
  CLAUDE_CODE_SESSION_ID.
- Found outside my task: `STATE_FOLDER_SWEEP_CLAUDE.md` (untracked, the other lead's) quotes 2 lines with a client's
  name (log file names); HEAD holds no client name.

### Facts still to establish (in a run)

- What Claude Code does when an agent's `skills:` names a skill that is not installed (start fails, warning, or
  silently skipped). D-38 said nobody checked. Decides how the machine notes are loaded.

### Main's notes for the plan

- 10:50 the user on machine-pitfalls: "yeah but the agent will run on different pcs". Main's reading: carry the
  habit, each PC keeps its notes outside the repo. I recommend that plus the general half moved in (entry below).
- 11:03 D-40 (main's initiative, waiting for the user): per-project / per-domain packs; the worker reads listed skills
  by path at start. Pick a skill-loading way a per-project list can reuse: a list of skills read at start, each
  "required" or "if present". Do not build D-40 without main's go.

## Register ids raised (11:05, all non-blocking; entry files `SELF_CONTAINED_entry<N>.json`)

All closed by 11:18; the user's answers are under "Answers" below and win over this table.

| Id | Kind, urgency | About | Recommended |
| --- | --- | --- | --- |
| D-41 | question, medium | machine-pitfalls: habit only / general half moved in / copy all (quotes the user) | B: general Windows traps move in as a team skill; each PC keeps its own notes outside, loaded if present; install makes an empty starter |
| D-42 | question, medium | report-changes + explain-clearly: move or copy | A: move here |
| D-43 | question, low | claude-code-mods: leave / move / copy | A: leave in xpp-agent |
| D-44 | question, medium | Decisions pane: move or copy | A: move here; this repo becomes a directory marketplace |
| D-45 | question, low | Agents pane: leave / move / copy | A: leave in claude-code-extensions |
| D-46 | question, medium | install.ps1 writes the five settings entries | A: writes them, backup, -WhatIf, idempotent |
| D-47 | question, medium | any folder vs fixed `C:\Repos\My projects\...` | A: any folder, via install links + one per-PC settings file |
| D-48 | question, low | Windows only vs also Mac/Linux | A: Windows only, install checks Windows/Node/pwsh 7 |
| D-49 | issue, medium | client names in explain-clearly and machine-pitfalls would go public | A: invented names in what comes here |
| D-50 | issue, medium | the other lead's sweep file quotes a client's name (untracked) | A: main scrubs the two lines before the next commit |

Told main: `REGISTERED | D-41 ... D-50` (11:06).

Answers (passed on by main):
- D-41, 11:08, closed. The user's words: "Chose B: as A, and the traps that hold on any Windows PC move into the repo as
  a team skill; only this PC's own traps stay in its notes outside the repo (one run that sorts about 30 KB of notes
  in two; a new PC starts with the general traps)." S1 (b) is now decided, not assumed.
- D-42, 11:10, closed. The user's words: "Chose A: move them here: this repo is their only home, the links on this PC
  point here, and xpp-agent no longer holds them (one run, then the main session re-points four links: the two skills
  in Claude's and in Copilot's skills folders). Comment: yes the skills you mentioned need to be global skills for
  claude code, not repo specific". So: report-changes and explain-clearly live here and stay GLOBAL skills, linked by
  install into `~\.claude\skills` and `~\.copilot\skills` (like team-rules), not private like the vendored `skills\`.
- D-44, 11:10, closed. The user's words: "Chose A: move it here: one copy, its tests run here, and
  claude-code-extensions no longer lists it (one run here; then the main session switches this PC to install it from
  this repo and removes the old copy). Comment: yes the extensiosn specific to this agent need to be wihtin this agent
  dir, and on init extensiosn need to be installed/ ran". The second half bears on D-46 (still open): the user wants
  the install to install and start the team's extensions. S3b is planned so it can (see S3b); D-46 stays open.
- 11:18, all closed, the register has nothing open (main passed them on):
  - D-46: "Other: the init script, and that is what it should be called needs to do all the steps that are required
    to run this agent, meaning any task that dont need an LLM, the script needs to perform." => rename `install.ps1`
    to `init.ps1` (every mention updated); it does every step that needs no LLM: links, settings entries (hooks,
    `autoContinueAtUsageLimit`), installing and switching on the team's extensions, the per-PC settings file, the
    per-PC notes starter, the checks. Backup and `-WhatIf` stay. No switch for D-46 options: this is the default.
  - D-47: "Chose A: it works from any folder: files reach the scripts through the links install.ps1 makes, which are
    the same on every PC (such as ~\.claude\skills\orchestrate-agents), and each PC's own values, such as where your
    own repos are, go into one settings file per PC that install.ps1 creates and git ignores (one run over about 26
    files)."
  - D-48: "Chose A: Windows only: the README says so, and install.ps1 checks for Windows, Node and PowerShell 7 before
    it changes anything (part of one run)."
  - D-49: "Chose A: replace them with invented names in what comes here; with a move, the original loses them too
    (part of the skills run)."
  - D-50: "Chose A: before the next commit, the main session replaces the client's name in those two lines with an
    invented one (a minute)." Main's; nothing for me.
  - D-43: "Other: ok and move the what was learend during mod building to the extenions project" => `claude-code-mods`
    moves from xpp-agent into `C:\Repos\My projects\claude-code-extensions` (its home from now on; stays a global
    skill linked from this PC's skills folders). In S1; re-pointing the links is main's step (summary).
  - D-45: "Chose A: leave it in claude-code-extensions (no cost)." Agents pane stays out.
  - D-40: "Other: I agree but to clarify, you mean that this agent repo will have an additonal dir with domain
    specific skills/insreuctiosn depedning on what this agent is working? and then in a dir in each project that hs
    prokject specifc things that the agent can also pick up?" => go (accepted): a folder of domain packs in this repo
    (domain skills and instructions) and a FOLDER (not a single file) in each project with its project-specific
    things the agent also picks up. Last part, after the self-contained work (see plan, part D).

## New part from the user (11:08, via main): entries in points

- The user's words (answer to D-40): "i completely dont undertand the 3 options, also the three options should be in
  three points, so add a rule that the decision context needs to be formatted in a more readable format and not just
  a block of text". Main added the rule at 11:08: `agents\task-lead.md` section 8, paragraph "Make it readable at a
  glance, never a block of text" (read; I follow it for every entry from now on: `what` under ~60 words, point first;
  each option one short line with its cost; parts as points, until the change lands: parts named one per sentence in
  `example`, or child entries), and `orchestrate-agents\SKILL.md` ("Entries.").
- Why it cannot be followed fully yet: `formatEntryLines` in `orchestrate-agents\lib\decision-register.mjs` turns
  every line break into a space; the pane's `drawField` (`claude-code-extensions\decisions-pane\hooks\pane.tsx`)
  draws each field as one wrapped line.
- To build (the user's ask, no register entry): an entry's text fields may carry points, one point per line in the
  register file and in the pane, options one per line too; old one-line entries read as before; tests on both sides.
  When it lands, I drop the rule's "until it lands" sentence in `agents\task-lead.md` (my edit, main said so).
- D-42 to D-50 were written before the rule (several `what`s run past 60 words). They stay as they are unless main
  asks for a re-registration in points (a changed entry is a new child entry).
- D-40 (per-project customisation): accepted at 11:18 (see Answers); planned as part D, after the self-contained work.

## Plan (11:06, revised 11:20 after every entry was answered; every run waits for `GO`)

Why cut this way: skills, pane, paths and install touch disjoint files, so they pair up; install comes after skills
and pane because it links the skills and registers the pane; the clean-machine check needs everything in place.
Entries in points go first (11:09 decision): the user reads entries now in the pane that runs from
claude-code-extensions, so the change reaches the user at the next `/reload-plugins` without waiting for the move,
and S2 then copies a pane that already has it, whatever D-44's answer. Waves (at most two workers at once): F1+F2,
then S1+S2, then S3a+S3b, then S4+S5.

0. At `GO`: re-measure the three suites through run-heavy (Node in `orchestrate-agents\`, PowerShell
   `tests\limit-scripts.tests.ps1`, the pane's `claude plugin test` in claude-code-extensions); take a hash list of
   both repos' working trees (untracked included) and of `~\.claude\settings.json` (hash only). Before writing the
   F task files, read `formatEntryLines` and the register's reader, and the pane's register reader and `drawField`,
   to fix one written contract both task files quote.
- F1 and F2: DONE and checked 13:43 (see State).
- **F1, entries in points: register side** (beside F2). A text field (`what`, `example`, `recommendation`,
  `meanwhile`) may be a list of points (planned input: a JSON array of strings; a plain string stays one paragraph);
  the register files write each point on its own line under its field, options one per line; every reader of the
  files (list, the prompt reminder, answers/close/follow-up, migrate) reads both shapes; old one-line entries read
  exactly as before (round trip on a copy of the real register: 0 differences). Mutation check. Files:
  `lib\decision-register.mjs`, `scripts\register.mjs`, the reminder hook if it prints fields, their tests. Then my
  edit: drop the "until it lands" sentence in `agents\task-lead.md` (and tell main about `SKILL.md`'s "Entries."
  if it says the same).
- **F2, entries in points: pane side** (beside F1, in claude-code-extensions). The pane's register reader takes the
  new shape and the old; `drawField` draws one point per line and each option on its own line; old entries look as
  before. Pane tests, type-check, `claude plugin validate/test`; mutation check. Files: `decisions-pane\hooks\`
  (registers.ts, pane.tsx, decisions.ts if it parses) and its tests and README. Main reloads the plugin after.
1. **S1, skills come in** (beside S2). All decided (D-41 B, D-42 A, D-43, D-49 A). Points:
   (a) report-changes and explain-clearly moved in as top-level folders (like `team-rules\`), global skills that init
   links into both skills folders, byte-identical except D-49's invented names (the xpp-agent originals are deleted
   by main, so they lose the names too);
   (b) machine-pitfalls sorted: general Windows and Claude Code traps into a new team skill here (name to settle in
   the task file, e.g. `windows-pitfalls`), client names replaced (D-49); this PC's own traps written out as the text
   main keeps in this PC's notes outside the repo (main edits xpp-agent's copy, or I give it the exact text); a
   per-PC starter skill (`machine-pitfalls`, headings only) that init copies to a PC without one;
   (c) small: `claude-code-mods` copied into `C:\Repos\My projects\claude-code-extensions` (D-43; folder to settle in
   the task file, e.g. `skills\claude-code-mods\`; that repo is public too: scan it; 1 `C:\Repos` line seen) and
   EXT's README names it. Deleting it from xpp-agent and re-pointing its links are main's steps.
   Agent files' `skills:` lists and `references\worker-rules.md` follow. Loading rule (D-40 reuse): the team's own
   skills preload by name; the per-PC notes are "if present" and init guarantees a starter; written so part D's
   domain and project folders can add skills later. Invariant: diff against the sources shows only the listed scrub
   lines; 0 client names in either repo's new files; every skill an agent file names exists in the repo or as the
   per-PC starter. Optional fact (under 10 tool calls): what Claude Code does when a preloaded skill is missing.
   Files: new skill folders here, `agents\*.md`, `references\worker-rules.md`, the new folder in EXT and EXT's README.
   If S1 is too big for one worker (three points), split (c) off to ride with S2 (same repo as F2, disjoint files).
2. **S2, the pane comes in** (beside S1; D-44 A, decided: move). Copy `decisions-pane\` from claude-code-extensions
   (after D-36's and F2's changes; F2 is done and checked 13:43; apply F2's two README paragraphs from its report),
   add `.claude-plugin\marketplace.json` at this repo's root (marketplace name `software-developer-agent`), README
   of the pane for its new home, `team-on.ts` header names its source here. Checks: `claude plugin validate` and
   `claude plugin test` run in THIS repo, same counts as baseline; the pane's type-check. Mutation check: not needed
   (code unchanged), but a diff against the source showing only the listed lines. Files: `decisions-pane\`,
   `.claude-plugin\`. Removal from claude-code-extensions: main session's steps (or a tiny run after the switch).
3. **S3a, any folder** (beside S3b; D-47 A, decided). Every fixed path to this repo becomes a path through a link
   init makes; the vendored `skills\` reached through one new link to the repo root outside the scanned folders
   (check that no extra skills or agents appear); `commitInRepos` moves to the per-PC settings file (in D-36's state
   folder; init creates it; outside the repo, so git never sees it), read with a fallback. Every mention of
   `install.ps1` in the files S3a owns becomes `init.ps1`. Test fixtures that only hold path strings may stay; each
   kept line listed. Invariant: grep for `C:\Repos\My projects` / `xpp-agent` / `claude-code-extensions` /
   `install.ps1` in the repo (minus misc, decisions, vendored) gives 0 or only listed lines. Files: agents, SKILL.md,
   references, team-switch, config + its reader, the tests that name paths. Not README or the two guide pages (S5).
4. **S3b, init** (beside S3a; D-46, D-48 decided). Rename `scripts\install.ps1` to `scripts\init.ps1`. It does every
   step that needs no LLM, by default (no option switch): prerequisites check first, before any change (Windows,
   Node, PowerShell 7; and Claude's VS Code extension's claude.exe, needed for the plugin step); the links (agents,
   team skills incl. S1's into both skills folders, the repo-root link); the per-PC notes starter; the per-PC
   settings file; the settings entries (the two hooks with the node.exe path found, not assumed, and
   `autoContinueAtUsageLimit: false`); installing and switching on the team's extensions (the Decisions pane from
   this repo's marketplace). Backup of settings first, `-WhatIf` preview, safe to run twice, a `-HomePath` (and a
   Claude config folder) for tests. First establish the supported plugin way against a scratch Claude config
   folder, never this PC's: `claude plugin marketplace add <repo>` + `claude plugin install
   decisions-pane@software-developer-agent` versus writing `extraKnownMarketplaces` / `enabledPlugins`. Its own test
   script against a scratch home; mutation check on the settings merge and the checks ("N of N caught"). Files:
   `scripts\init.ps1` (renamed), its new test file, `.gitignore` if needed. Likely two worker runs (rename + links +
   checks; then settings + plugin): cut it so in the task file if the plugin step proves heavy.
5. **S4, clean-machine check** (beside S5). Copy the working tree (no .git, no misc) to a scratch folder with a
   different path, run init into a scratch home and scratch Claude config folder, then: links resolve, the settings
   scratch file holds the entries, the pane is installed and switched on there, Node + PowerShell suites and
   `claude plugin validate/test` pass from the copy, every named skill resolves, 0 leftover machine paths. Report
   what cannot be proved without a second machine.
6. **S5, documentation** (beside S4). README (layout, how it is wired, `init.ps1`, prerequisites, Windows only, the
   moved skills and pane), `agent-team-files.html`, `agent-team-guide.html`, every `install.ps1` mention there.
7. Summary `SELF_CONTAINED_SUMMARY_CLAUDE.md` with the main session's steps: run `init.ps1 -WhatIf`, then for real
   (or the exact settings text by hand); re-point the links of the moved skills (report-changes, explain-clearly here;
   claude-code-mods to EXT; machine-pitfalls notes stay this PC's); switch the pane to
   `decisions-pane@software-developer-agent` and `/reload-plugins`; remove xpp-agent's copies of `report-changes`,
   `explain-clearly` AND `claude-code-mods` (D-43 is a move: claude-code-extensions is its only home; main's
   correction, 11:21) and the pane from claude-code-extensions (and xpp-agent's `Docs\Instructions` lines that name
   them); trim xpp-agent's machine-pitfalls to this PC's traps; restart Claude Code.

Part D (D-40, accepted 11:18; after the self-contained work, probably a successor lead's): a folder of domain packs
in this repo (domain skills and instructions) and a FOLDER in each project with its project-specific things that the
agent also picks up; the lead puts what applies into each task file. Plan it in detail when S4/S5 are done; it
reuses S1's loading rule. Not to be started before the self-contained work is checked.

Size plan: a lead lasts about five checked runs; this plan has eight to nine (F1, F2, S1, S2, S3a, S3b (maybe two),
S4, S5), then part D. Expect a hand-over after the S1+S2 wave; keep checks lean (read reports, run suites,
spot-check two claims).

## Decisions (mine, with reasons)

- 11:04 Entry files named `SELF_CONTAINED_entry<N>.json`, not `entry.json`: the other lead writes `entry.json` in the
  same folder.
- 11:06 Moved skills go to top-level folders beside `team-rules\` (not into vendored `skills\`, which is unlinked and
  never edited; not regrouping `team-rules\`, whose live junctions only the main session re-points).
- 11:06 Recommended D-41 B over main's reading (A): the inventory shows over half the notes hold on any Windows PC.
  The user chose B at 11:08.
- 11:09 Entries in points (F1+F2) go before the pane moves: the live pane runs from claude-code-extensions, so the
  user gets readable entries sooner, and S2 copies the finished pane whatever D-44 says.

- 15:21 One repo link for every doc path (`~\.claude\software-developer-agent` -> repo root), not the skill links:
  one rule for every file, and it also reaches the vendored `skills\`, which no skill link does. Main created it on
  this PC at 15:21 (my request).
- 15:21 Per-PC default for `commitInRepos` = `<parent of the repo>\*` (gives `C:\Repos\My projects\*` here, today's
  value, so nothing changes on this PC before init runs). init writes it out into `pc-settings.json`.
- 15:21 init (S3b) cut in two runs: S3b1 rename + checks + links + starter; S3b2 settings + per-PC file + plugin.

## What a successor reads / skips

- Read: this file (the State list and the Hand-off below first), the task file `SELF_CONTAINED_START_CLAUDE.md`,
  the lead brief, `SELF_CONTAINED_S3_CONTRACT_CLAUDE.md`, and the progress files named in the Hand-off.
- Skip: the searchers' raw outputs (their conclusions are copied here), `STATE_FOLDER_SWEEP_CLAUDE.md` (77 KB), the
  F1/F2/S1/S2 progress files (checked; their reports suffice), the F contract (done).

## Hand-off (2026-10-27 15:58, STOP FOR LIMIT: weekly usage at 98%, resets 2026-10-31 07:00)

### Where the plan stands

| Run | State | Files |
| --- | --- | --- |
| F1 entries in points, register | DONE, checked 13:43 | `SELF_CONTAINED_F1_REPORT_CLAUDE.md` |
| F2 entries in points, pane | DONE, checked 13:43 (user reloaded the pane ~15:15) | `SELF_CONTAINED_F2_REPORT_CLAUDE.md` |
| S1 skills come in | DONE, checked 15:19 | `SELF_CONTAINED_S1_REPORT_CLAUDE.md` |
| S2 pane copied in + marketplace; claude-code-mods to EXT | DONE, checked 15:19 | `SELF_CONTAINED_S2_REPORT_CLAUDE.md` |
| S3a any folder (agent ab8d8973a6ac5ad62) | STOPPED, UNCHECKED; both points built, Node 277/277 by the worker; PowerShell suite not run after its changes | hand-off: `SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md` (its "## Hand-off") |
| S3b1 init part 1 (agent a1cb39e10906a9526) | STOPPED, UNCHECKED; both points built, 29/29 tests; invariant, mutation check, end check of the real home folders, cleanup and report NOT done | hand-off: `SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md` (its "## Hand-off") |
| S3b2 init part 2 | not started; no task file yet | contract section 3 steps 4-6 |
| S4 clean-machine check | not started | plan item 5 |
| S5 documentation | not started | plan item 6 |
| Summary | not written | plan item 7 + "Main's steps collected so far" in State |
| Part D (D-40) | not started; after the self-contained work | plan, part D |

### Answers a successor owes the stopped workers

- S3a's QUESTION ("keep the contract's default `<parent of REPO>\*` rather than the task's example?"): YES, keep the
  contract. My task file's example was wrong: a copy at `%TEMP%\sda-anywhere\x\orchestrate-agents` has REPO =
  `...\x`, so the default is `%TEMP%\sda-anywhere\*`, which the code returns. Tell the fresh S3a worker so.
- S3a's decision `pcSettings.file` is a new config setting (not a constant): S3b2's task file must make init read the
  file name from that setting.

### Next steps, in order (fresh session)

1. Read the two progress files' Hand-off sections. Before anything, re-take a hash list (both repos + xpp-agent\Docs;
   scratchpad lists of this session may be gone) and the free memory.
2. Start two fresh workers (disjoint files): S3a-finish ("Your predecessor stopped for the session's hand-over; read
   the `## Hand-off` section of `SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md` first and carry on from its exact next step"
   + the answer above; left: the PowerShell suite after its changes, its report file) and S3b1-finish (same opening
   with `SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md`; left: invariant, mutation check, second test run, end check of
   `C:\Users\user\.claude\skills`, `.copilot\skills`, `.claude\agents` unchanged, cleanup of the two `%TEMP%\init
   tests-*` folders, report). Each task file: the old task file + "what is done" + "what is left".
3. Check both as section 7 says: Node suite (277 expected), PowerShell suite (122 at baseline; S3a touched comments
   only in .ps1), `pwsh -NoProfile -File scripts\init.tests.ps1` (29+), hash compare, and that this PC's
   `~\.claude\skills` / `.copilot\skills` / `.claude\agents` / `settings.json` are unchanged.
4. Write `SELF_CONTAINED_S3B2_TASK_CLAUDE.md` (contract section 3 steps 4-6; read `pcSettings.file` from config; the
   settings merge with backup; the plugin steps proven by S2 with `CLAUDE_CONFIG_DIR`; tests on a scratch config;
   mutation check) and run it, beside S5 (docs: README, `agent-team-files.html`, `agent-team-guide.html`, the pane's
   README install section with the repo link path; S3a listed README lines 38, 45, 60, 72 and
   `agent-team-files.html` line 1015 as stale; S1's README text is in its report).
5. S4 clean-machine check last (plan item 5), then the summary (plan item 7) with every main step collected in State.

### Register

- Open ids raised by this lead: D-55 (initiative, low: traps filed by the main session). D-41 to D-50 closed.

### Traps reported by workers (for the main session to file, team-rules section 8)

- S3a: `$x = if (...) { , $list }` flattens a one-row list again -> assign inside the branches (any Windows PC).
- S3b1: `Remove-Item -Recurse -Force` says "The directory is not empty" on scratch folders and an immediate retry
  also fails -> pause about 1 second between attempts (any Windows PC).

### Live state on this PC right now

- Live and changed by checked runs: the register (points), the agent files (`skills:` name `windows-pitfalls`, not
  yet linked: a missing preloaded skill is skipped silently, and the untrimmed `machine-pitfalls` still holds every
  trap, so nothing is lost before main links it), team-rules section 8.
- Live and changed by UNCHECKED S3a: `orchestrate-agents\` (lib config/pc-settings reading, docs through the repo
  link, which exists since 15:21), agent files' paths. Its Node suite passed (worker's run, 277/277).
- `scripts\install.ps1` is gone; `scripts\init.ps1` exists (UNCHECKED S3b1). Nobody has run init on this PC.
