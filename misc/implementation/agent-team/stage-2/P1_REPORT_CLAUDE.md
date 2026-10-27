# P1 report: the Decisions pane only in a switched-on chat

Written by the P1 worker on 2026-10-27, finished at 09:14 (Get-Date). Details: `P1_PROGRESS_CLAUDE.md`.

**Outcome: done.** The Decisions pane shows only in a chat switched on with `/software-developer-agent`. It checks
the same marker the team's hooks check, at session start and at every refresh. Nothing is committed (the task
allows no git change).

## What the user sees differently

- **An ordinary chat shows nothing.** D-12 waits in `C:\work\shop\decisions`. A chat started there without
  `/software-developer-agent` shows no Decisions tab and never opens the pane. The pane reads no register file
  there: only the team's settings file, and a size check of the marker.
- **Switching on mid-chat needs no reload.** Type `/software-developer-agent` in that chat and `Decisions (1)`
  appears at the next refresh (2 seconds by default).
- **`/decisions-pane` in an ordinary chat** opens nothing and says this line. It comes back as the command's
  `{ text }` answer, which is how the mod API lets a command say a line in the chat:
  `The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.`
  In a switched-on chat the command works as before.
- **When the marker goes,** the pane closes at the next refresh.
- **When a look fails for a reason other than "not there"** (a refused read, the team's settings caught half
  written, an id the engine could not give), the pane keeps what it showed and looks again at the next refresh.

## Where the session id comes from

- From `await $.session.id()`. The mod API documents it as "Returns the session's id (the transcript file's
  name)". No event carries the id at `session.start`.
- It is the same id the hooks get as `session_id` and `team-on.mjs` reads from `CLAUDE_CODE_SESSION_ID`. Measured
  read-only on this machine: `CLAUDE_CODE_SESSION_ID`, the one marker's name and the transcript's name are all
  `bf7022c6-...`.
- **`/clear` and resume:** the API says the session goes on under a new id, and after `/clear` no `session.start`
  fires. The pane reads the id at every look, so after `/clear` it follows the new id. That id has no marker, so the
  pane closes, just as the team's hooks go quiet. Nothing was built for this, and it was not tried live.

## How it is built

- `hooks\team-on.ts` holds the rule as pure functions, copied from `agent-team.mjs` and `limit-stop.mjs`; its header
  names them. The temp folder follows Node's `os.tmpdir()` on Windows: TEMP, else TMP, else `SystemRoot\temp`,
  else `windir\temp`. An empty value counts as unset. A trailing backslash is dropped, except on a drive root.
- `hooks\team-switch.ts` does the look. It reads `$.session.id()`, four `$.env.get` values and the team's settings
  file (the same path the pane already read), then checks the marker with `$.fs.stat`. The answer is on, off, or
  "could not tell".
- `poll.ts`: every look starts with the switch. When off: no entries, no notice, the pane closed, nothing else read.
  The register is found at the first look that says on, not at session start.
- `pane.tsx`: the command notes whether the pane was open, looks and reads afresh, then answers.
- `registers.ts` now exports `configPath` and `isNotThere`, which the old code uses too, so each rule has one source.

**Other systems:** only the Windows rule. The mod API gives no sign of the operating system. On macOS and Linux,
TEMP, TMP, SystemRoot and windir are usually unset, so the pane finds no temp folder and stays off. The team runs only
on Windows anyway (its scripts are PowerShell).

**Deliberate differences from the old behaviour:**
- The command reads the switch and the registers before it answers. Example: a decision added one second ago is
  listed when the person opens the pane by command.
- When a marker goes, the pane drops its entries the same way it drops entries that leave. A comment typed but not
  sent is lost.
- Differences from the library:
  - A refused marker check keeps the last state. The library's `existsSync` says off; the task asked for "keep".
  - An unsafe folder setting counts as off. The library throws.
  - No temp variable at all counts as off. Node would look under `undefined\temp`.
  - A TEMP spelled oddly (forward slashes, doubled backslashes, `.` or `..`) keeps that spelling in the pane's path,
    while `path.join` tidies it. Both find the same file.

## Files

Changed in `C:\Repos\My projects\claude-code-extensions\decisions-pane`: `README.md`, `hooks\pane.tsx`,
`hooks\poll.ts`, `hooks\registers.ts`, `tests\hooks\pane.test.ts`, `tests\support\register-world.ts`.

New: `hooks\team-on.ts`, `hooks\team-switch.ts`, `tests\hooks\team-switch.test.ts`, `tests\hooks\team-on.test.ts`.

Unchanged: `plugin.json` and `types\index.d.ts` (there is no new `$.state` value). No shared file needs text from me,
and no setting was added.

In the tests:
- The test world now gives every session a marker unless the test calls `switchOff`. It also has an environment the
  test can edit, a session id, and a list of every file the pane asked about.
- D14, D14b, D23 and D26 rewrite the team's settings file. They now keep the switch folder in it (`teamConfig`) and
  nothing else in them changed. Without that, D14b would have passed for the wrong reason: its chat would have
  counted as off.
- `runCommand` moved from `pane.test.ts` into the test world.

## Checks (all after the last code change)

- **Tests, before and after.** Before: 53 pass. After: `claude plugin test decisions-pane` gives 107 pass and
  0 fail, in 4 files. That is the 53 old tests, 48 session tests and 6 pure-rule tests.
- **Red first.** Against the unchanged mod, the 36 session tests that describe new behaviour failed, each on an
  assertion.
- **Type-check.** TypeScript 7.0.2 with the tsconfig the README describes, kept in my scratchpad: exit 0, no
  output.
- **`claude plugin validate decisions-pane`:** "Validation passed". Its plugin-directory notes (LICENSE_MISSING,
  ICON_MISSING) are about files this change did not touch; `plugin.json` is unchanged.
- **Invariant: 0 differences on 110 checks.** Real material, read-only:
  - 58 session ids: every file in the real `%TEMP%\claude-agent-team-on` (one, this chat's marker, on in both),
    37 invented valid ids and 21 unsafe ones (`..`, `a\b`, `a/b`, empty, 129 characters, spaces, `C:`, null,
    undefined, 42, NUL and others). Same on/off, and the same path for every valid id.
  - 17 folder settings: the library throws exactly where the pane says off.
  - 25 temp-variable cases against Node's own `os.tmpdir()` and the library's path.
  - 10 odd TEMP spellings: on/off the same; the path spelling differs, as named above.
  - The marker, `agent-team.mjs`, `limit-stop.mjs` and the config are byte-identical before and after.
- **Mutation check: 25 of 25 caught,** in a scratch copy, on the final tests.
  - The first pass caught 21 of 25. A probe showed why the other 4 got through: the test kit resolves and
    normalises every path before a stand-in sees it, so markers planted at raw paths were never found.
  - Fixed in the tests: S4, S5 and S6f now check that no marker is looked for at all, and the pure-rule tests
    cover path spelling.
  - The 25 cover the eight the task named: the check skipped; the id pattern loosened (four ways); the check only
    at start; a failed check counted as off; a register read before the check (two ways); an empty pane instead of
    the line; the TMP fallback dropped; a removed marker not closing the pane (three ways).
  - The rest: the folder rule, folder defaulting, TEMP/TMP and SystemRoot/windir order, empty TEMP, the trailing
    backslash, the drive root, `undefined\temp`, every refusal counted as off, the command without a fresh look,
    and the command toggling on the wrong state.
- **Memory.** Peak 862 MB in the last `run-heavy.ps1` run; 946 MB was the highest seen, in the first mutation pass.
- **Evidence.** The tests use a synthetic test world. The invariant uses real files, read-only. Nothing ran
  live.

## Not tested

- A real VS Code chat and the real engine were not run here, as the task says; a next run does the real engine.
  Three things therefore rest on the API docs and the test kit, not on a live read:
  - that `$.session.id()` gives the bare id;
  - that `$.fs.stat` of a missing marker fails with ENOENT;
  - what `/clear` does.
- A marker on any system other than Windows.

## Risks and open points

- After `/clear` the pane closes, and the team's hooks go quiet, until `/software-developer-agent` is typed again.
  Example: a lead's chat clears its context and the Decisions tab disappears. Recommendation: once the real engine
  confirms it, say so in the team's guide.
- The test kit hands file paths to its stand-ins resolved and normalised, so a test that puts a file at an odd raw
  path never matches. `S4`, `S5` and `S6f` therefore check that no marker is looked for at all. This is worth a line
  in the `claude-code-mods` skill (not mine to edit).

## What I learned that the task did not say

- The test's `$` has no `$.session.id`. Only the mod's own `$` answers it, through a `session.id` stand-in.
- `$.fs.exists` cannot tell a refusal from "not there". That is why the check uses `$.fs.stat`.

## Left behind

These stay in this session's scratchpad so a next run can rerun them; nothing is in either repo:
`checks.ps1`, `tc\tsconfig.json`, `invariant\invariant.mjs`, `mutation\mutate.mjs`. No process is running, and
the scratch copies are deleted.

DECISIONS TAKEN: (1) The team's settings, refused or caught half written (not JSON), count as a failed look that keeps the last state, not as off; off would close and reopen the pane on a passing rewrite. (2) The Windows rule on every system, so the pane stays off on macOS and Linux, rather than guessing a TMPDIR rule; the API gives no sign of the system and the team runs only on Windows. (3) The command looks and reads afresh before it answers, rather than answering from the last look (up to 2 s old); otherwise a chat switched on a moment ago would hear "not on". (4) The marker is checked with $.fs.stat, not $.fs.exists; exists cannot tell a refusal from "not there", which "keep the last state" needs. (5) The session id is read at every look, not once; the API says it changes on /clear and resume, and the hooks follow the new id too.
INITIATIVES: (1) 6 pure-rule tests in tests\hooks\team-on.test.ts, beyond the caller-side ones, to catch path-spelling mutants no session can see. (2) registers.ts exports configPath and isNotThere, and the old code now uses them; scriptPath takes only env. (3) runCommand moved into the test world; an unused Engine import dropped from pane.test.ts. (4) The README's options table says the config also names the switch folder. (5) The invariant also covers folder settings, temp variables against Node's os.tmpdir(), and odd TEMP spellings.
ISSUES FOUND: (1) The test kit resolves and normalises file paths before stand-ins see them, so a file planted at a raw path never matches; my first S4/S5/S6f passed for that reason under 4 mutants; fixed. Worth a line in the claude-code-mods skill. (2) D14 and D14b rewrite the team config; D14b would have passed for the wrong reason after the change; fixed with teamConfig. (3) When a marker goes, a comment typed in the pane but not sent is lost, as when an entry leaves. (4) After /clear the pane closes until /software-developer-agent is typed again (API docs; not tried live). (5) validate notes LICENSE_MISSING and ICON_MISSING for the plugin directory; this change did not cause them, and they matter only for a submission. (6) The times between 08:44 and 09:02 in my progress file were written without reading the clock; corrected to known bounds.
QUESTIONS: none
