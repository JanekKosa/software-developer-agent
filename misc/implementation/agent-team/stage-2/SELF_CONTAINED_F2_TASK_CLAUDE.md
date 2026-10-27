# Run F2: register entries in points, the Decisions pane's side

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md`) at 2026-10-27 12:58. Working
folder for your files: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`. The
code you change is in the other repo: `C:\Repos\My projects\claude-code-extensions\decisions-pane\` (PANE below).

## Read first, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` ("Layout" and "Tests").
2. The `claude-code-mods` skill: `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md` (how mods
   are built and tested on this machine, the stand-in traps of the test kit, which `claude.exe` to use).
3. `PANE\README.md`: "What it lists", "Answering" and "Checks" (read-only for you, see below).
4. `SELF_CONTAINED_F_CONTRACT_CLAUDE.md` in the working folder, whole. It is your spec, word for word.
5. `PANE\hooks\decisions.ts` (19 KB: `entriesOf`, `rowOf`, `optionsOf` and its helpers, the constants at the top)
   and `PANE\hooks\pane.tsx` (16 KB: `drawDecision`, `drawField`, `drawChoices`, `drawHistoryItem`). The tests by
   search: `PANE\tests\hooks\decisions.test.ts`, `PANE\tests\hooks\pane.test.ts` (35 KB), and
   `PANE\tests\support\register-world.ts` (read-only for you).

Do not read the plans, the guide pages, or the agent repo's code beyond the contract.

## What it is for

The user reads the team's decisions in this pane and asked, in their words, for "a more readable format and not just
a block of text" (2026-10-27), and at 12:48: "rn it's presented as one big block of text". Run F1 (another worker,
now, in the agent repo) makes the register write an entry's text as points, one per line; you make the pane read and
draw them, to the same contract.

## Your two points

1. **Reading.** `entriesOf` and `rowOf` follow the contract's section 3: under any field but Follow up, a line
   starting with exactly two spaces and `- ` starts a new point, and the field's value holds its points joined with
   `\n`; `optionsOf` follows section 4 for options given as points. Testable: the contract's sample block gives a row
   whose `what`, `recommendation` and options are exactly the points; every old-shape fixture gives today's row.
2. **Drawing.** `drawDecision` and `drawField` follow section 4: the first point as today, each further point on its
   own line, indented two spaces, starting `• `; options from points as one choice each with the recommended mark.
   Testable: a render test of the sample entry shows the lines of the contract's drawing; old entries render as today.

Your files: `PANE\hooks\decisions.ts`, `PANE\hooks\pane.tsx`, and one NEW test file,
`PANE\tests\hooks\points.test.ts`, which holds every test you add (its own helpers included).

Not your files, never edit: every existing test file and test helper of PANE (`tests\hooks\*.test.ts`,
`tests\support\register-world.ts`), `PANE\README.md`, `PANE\hooks\team-on.ts`, `PANE\hooks\team-switch.ts`, every
other file of PANE and of `claude-code-extensions`, and everything in the agent repo except your progress and report
files. Another lead's worker (its run S4) is changing `team-on.ts`, `team-switch.ts`, their tests and the README
NOW, and may touch other pane test files; run F1 changes `orchestrate-agents\lib\decision-register.mjs` and
`scripts\register.mjs` now. If an existing test fails because of your change and must change, do not edit it: stop
and ask your lead (`QUESTION FOR THE LEAD |`, naming the test and the line). A failing test in a file S4 is
changing is S4's: report it, never fix it. Write the README text the pane needs for points (a short paragraph for "What it
lists") into your report instead; the lead applies it later.

## The invariant (touches nothing live)

- In a scratch copy of the plugin folder (never the live one, never the plugin cache under `~\.claude\plugins\`),
  read copies of the real register files: this repo's `C:\Repos\My projects\software-developer-agent\decisions\
  OPEN_DECISIONS_CLAUDE.md` and `RESOLVED_DECISIONS_CLAUDE.md`, and the same two in
  `C:\Repos\My projects\claude-code-extensions\decisions\` if present. Parse every entry with the old code (a copy of
  today's `decisions.ts`) and the new: **0 differences on N entries** (give N), and count the entries that hold a
  `  - ` line under a field other than Follow up (expected 0; list any). The real files are copied, never opened for
  writing; no test of the suite may read them.
- Parse the contract's sample block and quote the row you get in your report.
- **Mutation check**: in a scratch copy, break one rule at a time (at least 10 mutants: a point line joined with a
  space, a Follow up line read as points, three spaces read as a point, a point's `- ` kept, options from points
  split by sentence, the recommended mark lost on points, the first point drawn as a bullet, further points not
  indented, the `• ` missing, an old entry drawn with bullets, ...) and run the pane's tests against each: report
  **"N of N caught"**, and add a test for any mutant that survives.

## Rules for this run

- Every heavy command (`claude plugin test`, the type-check, the mutation runs) goes through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with any redirection to a log file inside the command. One slot is shared with two other workers; waiting is
  normal.
- First, before changing anything: run `claude plugin validate decisions-pane` and `claude plugin test
  decisions-pane` in `C:\Repos\My projects\claude-code-extensions` (the `claude.exe` of Claude's VS Code extension,
  as the skill says) and the type-check as the pane's README says; write the counts into your progress file (107
  tests at 09:34 today; another lead's runs may have changed it since).
- Never reload, install or uninstall a plugin, never touch `~\.claude\settings.json` or the plugin cache: the main
  session reloads the pane after this run.
- Keep this run small: another lead's worker needs `team-on.ts`, `team-switch.ts`, their tests and the README right
  after you. Plan for about 60 tool calls; you are warned at 320 thousand tokens. Do the invariant right after the
  two points, then the mutation check.
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point. Keep every file's
  encoding and line endings.

## How to verify

- `claude plugin validate decisions-pane`: valid. `claude plugin test decisions-pane`: every test passes; the count
  is your first run's plus your new tests (name both). The type-check: 0 errors.

## Files

- Progress file: `SELF_CONTAINED_F2_PROGRESS_CLAUDE.md` in the working folder.
- Report file: `SELF_CONTAINED_F2_REPORT_CLAUDE.md` in the working folder: what is different, the counts, the
  invariant's numbers, "N of N caught", the README paragraph to apply later, what was not tested (for example the
  look in the real VS Code chat, which needs a reload only the main session does). It ends with the four-line block
  (DECISIONS TAKEN, INITIATIVES, ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- Moving the pane into the agent repo, its README, the plugin registration, anything about init.
