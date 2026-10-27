# Run F1: register entries in points, the register's side

Written by the lead (self-contained task, lead file `SELF_CONTAINED_LEAD_CLAUDE.md` in this folder) at 2026-10-27
12:56. Working folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

## Read first, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the "Layout", "How it is wired" and
   "Tests" sections).
2. `SELF_CONTAINED_F_CONTRACT_CLAUDE.md` in the working folder, whole. It is your spec, word for word.
3. In `orchestrate-agents\lib\decision-register.mjs` (75 KB; read by range, never whole): lines 30-100 (constants,
   `ENTRY_FIELDS`), 237-330 (`validateEntry`, `formatEntryLines`, `oneLine`, `fieldValue`), 360-395 (`addEntry`),
   512-560 (`followUpBlock`, the existing two-space continuation format), 700-1000 by search only where a reader
   touches field lines (`summaryLine`, `describeItems`, `migrateRegister`, `oldLayoutLine`,
   `requireReadableOldLines`, `convertOldLines`).
4. `orchestrate-agents\scripts\register.mjs` lines 1-60 (the usage comment).
5. The tests, by search, not whole: `orchestrate-agents\tests\lib\decision-register.test.mjs` (73 KB),
   `tests\lib\decision-register-migrate.test.mjs`, `tests\scripts\register.test.mjs`,
   `tests\hooks\decision-reminder.test.mjs`. Find how they build scratch repos (`tests\helpers\scratch.mjs`).

Do not read the plans, the guide pages, the register's real files beyond the invariant below, or anything in
`claude-code-extensions`.

## What it is for

The user reads the team's decisions in the Decisions pane and asked, in their words, for "a more readable format and
not just a block of text" (2026-10-27), and at 12:48: "rn it's presented as one big block of text". The register
must be able to hold an entry's text as points, one per line. Run F2 (another worker, now, in the other repo) makes
the pane read and draw them, to the same contract.

## Your two points

1. **Input and writing.** `validateEntry` and `formatEntryLines` follow the contract's sections 1 and 2: the four
   text fields take a string or a list of points; options are written one per line under `- Options:`. Testable from
   the caller's side: `register.mjs add --file` with the contract's sample JSON writes exactly the contract's sample
   block (Raised time aside); a string-only entry writes the same lines as today except the Options lines; bad
   lists exit 2 naming the field. The usage comment in `register.mjs` says how to give points.
2. **Every reader takes both shapes.** `list`, the summary line, the prompt reminder, answer, close (the entry moves
   to the resolved file whole), follow-up, handover and `migrate` work on a register that holds a points entry, and
   give exactly today's result for entries without point lines. `migrate` must not refuse or change a file only
   because it holds `  - ` lines under a field. Testable: tests on a scratch register that holds old and new entries.

Your files: `orchestrate-agents\lib\decision-register.mjs`, `orchestrate-agents\scripts\register.mjs`, and the four
test files above (add new tests there or in one new file `tests\lib\decision-register-points.test.mjs`).

Not your files, never edit: `lib\config.mjs`, `orchestration.config.json`, every other file of `lib\`, `hooks\`,
`scripts\`, `tests\` (another lead's workers are changing `lib\config.mjs`, `orchestration.config.json`,
`scripts\start-session-in-vscode.ps1`, `run-heavy.ps1`, `schedule-relaunch.ps1`, `usage-probe.ps1`,
`watch-usage-and-context.ps1`, Node tests and `tests\limit-scripts.tests.ps1` right now); `agents\`, `SKILL.md`,
`references\`, `README.md`; the real register `decisions\*` (read-only, see the invariant); anything in
`C:\Repos\My projects\claude-code-extensions` (run F2's).

## The invariant (touches nothing live)

- Copy this repo's real register files (`decisions\OPEN_DECISIONS_CLAUDE.md`, `RESOLVED_DECISIONS_CLAUDE.md`,
  `ANSWERS_LOG_CLAUDE.jsonl`) into a scratch repo (copy, never open them for writing). Run the readers (`list --open`,
  `list --resolved`, `list --answered`, the summary line, `openItems`) with the code as it was before your change (a
  copy of the old `decision-register.mjs` in the scratch folder) and with your new code: **0 differences on N
  entries** (give N).
- The register keeps no entry's JSON, so build at least 20 string-only entries from real entries' text (their What,
  Example, Options and so on); old and new `formatEntryLines` give identical lines except the Options lines.
- Add the contract's sample entry to the scratch register, then run every reader and `migrate` on it; quote what
  `list` prints for it in your report.
- **Mutation check**: in a scratch copy of the library, break one rule at a time (at least 10 mutants: a point not
  indented, the first point not on the field line, `- Options: ` with a trailing space, options joined on one line,
  a list of one point written as a list, a blank point accepted, a non-string point accepted, a reader taking a
  `  - ` line as a field, `migrate` refusing a points line, the leading `- ` of a point kept, ...) and run your
  tests against each: report **"N of N caught"**, and add a test for any mutant that survives.

## Rules for this run

- `orchestrate-agents\` is live (linked into every session's skills): each save reaches every running session.
  Never leave `decision-register.mjs` or `register.mjs` half-edited between tool calls: make each change in one Edit
  that leaves them working, and run the register's own tests after each.
- Every heavy command (the Node suite, the mutation runs) goes through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with any redirection to a log file inside the command. One slot is shared with another lead's worker; waiting is
  normal. Run Node from a working folder spelled `C:\`, never `c:\`.
- No test reads or writes this repo's real `decisions\` files (scratch repos only).
- First, before changing anything: run the whole Node suite once and write its count into your progress file.
  A failure that sits in another lead's files (see "Not your files") is theirs: report it, never fix it.
- Read the clock (`Get-Date`) for every time you write. Keep the progress file after every point.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. Do the invariant right after the two points,
  and the mutation check right after that.
- Keep every file's encoding and line endings.

## How to verify

- `node --test` in `C:\Repos\My projects\software-developer-agent\orchestrate-agents` (through run-heavy): every test
  passes, the count is your first run's count plus your new tests (name both numbers). If the other lead's workers
  changed the count meanwhile, say which files' tests moved.
- `node --test tests\lib\decision-register.test.mjs tests\lib\decision-register-migrate.test.mjs
  tests\scripts\register.test.mjs tests\hooks\decision-reminder.test.mjs` (plus your new file): all pass.

## Files

- Progress file: `SELF_CONTAINED_F1_PROGRESS_CLAUDE.md` in the working folder.
- Report file: `SELF_CONTAINED_F1_REPORT_CLAUDE.md` in the working folder: what is different, the counts, the
  invariant's numbers, "N of N caught", the exact text of the usage comment you wrote, and what was not tested. It
  ends with the four-line block (DECISIONS TAKEN, INITIATIVES, ISSUES FOUND, QUESTIONS), `team-rules` section 6.
- Your final message is the report's summary and ends with the same four lines.

## Not yours, not now

- The rule texts in `agents\task-lead.md` and `orchestrate-agents\SKILL.md` (the lead and the main session edit
  them after this lands).
- Anything about moving the pane, init, or other repos.
