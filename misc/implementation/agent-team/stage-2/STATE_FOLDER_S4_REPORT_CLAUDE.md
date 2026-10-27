# Run S4 report: the Decisions pane follows the switch-on mark to the team's state folder

Written 2026-10-27 (times below read from the clock). Task: `STATE_FOLDER_S4_TASK_CLAUDE.md`. Details and logs:
`STATE_FOLDER_S4_PROGRESS_CLAUDE.md`, `STATE_FOLDER_S4_LOGS\`.

## Outcome

Done. The Decisions pane now looks for the chat's switch-on mark where the team will write it after the switch-over,
`<teamState.folder>\<agentTeam.onFolder>\<session id>`, and no longer at `%TEMP%\claude-agent-team-on\<session id>`.
One limit the task did not foresee: the engine lets a mod read only environment variables named literally in its
code, so the pane fills in `%USERPROFILE%` and no other variable.

Example: settings `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent`, `agentTeam.onFolder` =
`team-on`, USERPROFILE = `C:\Users\user`, session `56c67d3d-b3c0-43be-a82c-b3a9cdc23274` give
`C:\Users\user\.claude\state\software-developer-agent\team-on\56c67d3d-b3c0-43be-a82c-b3a9cdc23274`.

## What changed for the pane

- **The new place.** A mark there shows the Decisions tab; a mark only at the old `%TEMP%` place does not, and the old
  place is never looked at.
- **Settings without `teamState.folder`** (today's live settings) count as off. Until the switch-over the pane shows
  nothing in any chat that loads the new code.
- **The root** (`teamState.folder`): `%USERPROFILE%` is filled in, then the root must start with a drive letter, `:`
  and `\` (S1's rule; a share such as `\\server\x` is refused). An unset or empty USERPROFILE, a relative root, a UNC
  root, or a root naming any other variable (such as `%LOCALAPPDATA%`) gives no marker.
- **The child** (`agentTeam.onFolder`): S1's seven rules, with `%` in the character rule. Several parts joined by `\`
  are now allowed (`switch\team on` works; `team\on` used to be refused).
- **The join** is the one Node's `path.win32.join` makes, so an odd root such as `C:\a\..\b\` gives `C:\b\team-on\<id>`
  exactly as the team's code does.
- **Fewer environment reads.** `claude plugin validate` now lists the mod's env reads as `HOME, USERPROFILE`; before,
  the switch also read TEMP, TMP, SystemRoot and windir.
- Unchanged: the session id rule, the safe side (wherever the team's code throws, the pane gives no marker), and the
  "a failed look keeps what the pane showed" behaviour.

## Functions (`decisions-pane\hooks\team-on.ts`, pure, no imports)

- `stateFolderOf(config: unknown): unknown`: `teamState.folder` as written.
- `onFolderOf(config: unknown): unknown`: `agentTeam.onFolder` as written (unchanged).
- `stateRootOf(folder: unknown, variables: ReadonlyMap<string, string | undefined>): string | null`: each `%NAME%`
  filled in once, left to right (`/%([^%]+)%/g`, as `requirePathSetting`); null when not text, a named variable is
  unset or empty, or the result does not match `^[A-Za-z]:\\`.
- `isStatePath(value: unknown): value is string`: S1's `STATE_PATH_RULES`, in S1's order, `%` included.
- `teamOnMarkerPath(root: string | null, onFolder: unknown, sessionId: unknown): string | null`.
- `SESSION_ID_PATTERN` (unchanged). Removed: `tempFolderOf`, `TempVariables`, `SINGLE_FOLDER_NAME`.

`decisions-pane\hooks\team-switch.ts` `lookAtSwitch($, settings)` keeps its signature and answers (true, false, null).
It now reads the session id, the team's settings, `$.env.get('USERPROFILE')`, builds the path, and stats it.

## Files

All in `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`, `hooks\team-switch.ts`,
`tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts`, `README.md` (the
switch bullet and the next bullet's sentence on what counts as off). Not touched: `pane.test.ts` (it builds no mark).
Nothing committed. No setting added. Scratch folders deleted; copies of the four check scripts are kept in
`STATE_FOLDER_S4_LOGS\scripts\` (`parity.mjs` only reads; `mutate.ps1` copies the pane beside itself, so copy it to a
scratch folder before running it).

## Checks

All after my last change (13:27); logs in `STATE_FOLDER_S4_LOGS\`.

- **Tests** (`claude plugin test decisions-pane`, claude.exe 2.1.310): baseline 107 of 107 at 13:00, as the task
  said. Final at 13:33: 136 of 136 pass in 5 files. That is 107 + 22 of mine (team-on 6 to 12, team-switch 48 to 64)
  + 7 of another agent's new `points.test.ts`. The new tests failed first (13:04) for the right reason: missing
  exports, and the mark looked for under TEMP.
- **Validate**: "Validation passed", exit 0. Its plugin-directory notes (no LICENSE, no icon) are about files I did
  not touch.
- **Type-check** with the tsconfig printed in the engine's type file (TypeScript 7.0.2): exit 0, no diagnostics; it
  covers every hook and all 5 test files.
- **Real material** (read-only; the pane's `team-on.ts` imported as is, the staged `lib\agent-team.mjs` called with
  `node`):
  1. Staged settings, real USERPROFILE (`C:\Users\user`), the 3 real session ids with a mark today in
     `%TEMP%\claude-agent-team-on\`: **0 differences on 3**.
  2. 60 refused cases (34 child values, 12 roots, no `teamState`, 13 session ids) give no marker in the pane and an
     error in the staged code; 22 accepted cases (multi-part children, odd roots, a 128-character id) give the same
     path: **82 of 82 agree**. The staged `config.mjs` refused `%` by 13:25, so the `%` cases are in the 82.
  3. The live settings (old shape): **3 of 3 give no marker**. Expected until the switch-over.
  - Known differences, on the safe side: roots `%LOCALAPPDATA%\state` and `%userprofile%\state` give a path in the
    team's code and no marker in the pane.
- **Mutation** (scratch copy, deleted after): the unmutated copy passes 136; **9 of 9 caught**, none by a load
  failure: root not expanded, unset variable let through, root not checked as absolute, the `:`, `%`, empty part and
  dot part child rules, the old TEMP folder as the root, the session id pattern. No survivor. The rules "is empty" and
  "starts or ends with `\` or `/`" were not mutated: they never decide alone (below).

## Not tested

- No run in the real engine: the task forbids installing, reloading or starting Claude Code with the pane against the
  real profile. All engine behaviour comes from `claude plugin test` stand-ins.
- Whether the real `$.env.get('USERPROFILE')` gives the same value Node's `process.env` does. The parity script used
  Node's value.
- The parity script repeats `team-switch.ts`'s three lines of glue (it needs the engine), so the glue itself is
  checked by the world tests only.
- The test kit normalises every path before a stand-in sees it, so the exact string given to the real `fs.stat` is
  checked only by the pure tests (O9, compared with Node's own `path.win32.join` output).

## Putting it live (the main session, at the switch-over)

1. Put the team's own code and settings live first (S2/S3), so the live `orchestration.config.json` has
   `teamState.folder` and `/software-developer-agent` writes the mark under it.
2. Then `/reload-plugins` in the main session's chat (a new chat loads the pane's current code by itself).
3. In a chat switched on before the switch-over, the mark is only at the old place: type `/software-developer-agent`
   once more there; the tab appears at the next refresh (2 seconds).
4. Check: in that chat the Decisions tab shows while a decision waits; in a chat never switched on it does not.

In between, a chat shows no tab rather than a wrong one: the new pane code finds no `teamState.folder` in the old
settings, and the old pane code with the new settings looks at `%TEMP%\team-on\<id>`, outside the new root.

## Risks and points to decide

- **A root naming another variable hides the pane.** Example: someone sets `teamState.folder` to
  `%LOCALAPPDATA%\agent-team`; the team works, the pane shows nothing, and nothing says why except the README.
  Recommendation: keep USERPROFILE only while the team ships `%USERPROFILE%`; if the root moves, add that one variable
  to `team-switch.ts` by name (one line and one test).
- **The pane is already live for new chats.** The marketplace reads the repo folder, so any chat started (or
  reloaded) from now on runs the new code and, with today's live settings, shows no Decisions tab until the
  switch-over.

## What I learned that the task did not say

- `$.env.get` takes only a literal name (Claude Code 2.1.310): a hooks module calling it with a variable does not
  load ("so the variables a module reads and writes can be listed").
- Two of S1's seven child rules never decide alone: "is empty" (an empty value also has an empty part) and "starts or
  ends with `\` or `/`" (a leading or trailing `\` makes an empty part, a `/` is caught by the `/` rule). They only
  give a clearer message in the team's code; removing one changes no result, so no test can catch that mutant.
- Another agent was changing the pane while I worked (`tests\hooks\points.test.ts` new at 13:03, `hooks\decisions.ts`
  and `hooks\pane.tsx` changed at 13:05-13:06). My test counts include its 7 tests.

DECISIONS TAKEN: The pane fills in %USERPROFILE% only, and any other %NAME% in teamState.folder counts as off; the other choice was a fixed list of common folder variables, each read by name; why: the engine refuses a non-literal $.env.get, the team ships %USERPROFILE%, and the mod already reads it. | The marker path is joined as Node's path.win32.join does (odd roots such as C:\a\..\b normalised); the other choice was plain joining as before; why: 0 differences with the team's path. | Removed tempFolderOf, TempVariables, SINGLE_FOLDER_NAME and their tests; the other choice was keeping them unused; why: the task replaces the temp part and they would be dead code.
INITIATIVES: README: besides the mark's bullet, rewrote the next bullet's sentence on what counts as off (it said "a folder setting that is not a plain name"). | register-world.ts exports HOME, STATE_FOLDER_SETTING, STATE_ROOT and OLD_MARKER for the tests. | Kept the four check scripts in STATE_FOLDER_S4_LOGS\scripts\.
ISSUES FOUND: $.env.get takes only a literal name (Claude Code 2.1.310), in decisions-pane\hooks\team-switch.ts; effect: a teamState.folder naming another variable than USERPROFILE (or USERPROFILE in other letter case) hides the Decisions pane while the team works. | The pane is installed from the repo folder, so every chat started or reloaded from now on runs the new code; effect: until the switch-over such chats show no Decisions tab. | Another agent changed the pane while I worked (points.test.ts new, decisions.ts and pane.tsx changed, 13:03 to 13:06); effect: the test count includes its 7 tests; none of its files touched by me. | S1's child rules "is empty" and "starts or ends with \ or /" never decide alone (in the team's config.mjs and in the pane); effect: none on results, only clearer messages; no test can catch their removal.
QUESTIONS: none
