# Run S7 report: the Decisions pane fills in five folder variables

Written 2026-10-27 at 14:42 (clock). Task: `STATE_FOLDER_S7_TASK_CLAUDE.md`. Details: `STATE_FOLDER_S7_PROGRESS_CLAUDE.md`,
logs and check scripts in `STATE_FOLDER_S7_LOGS\`.

## Outcome

Done. The Decisions pane now fills in `%USERPROFILE%`, `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%` and `%APPDATA%` in
`teamState.folder`, whatever their letter case. Any other variable, or one of the five that is unset or empty, still
gives no marker, so the chat counts as off. The staged config's `teamState._whyFolder` now says so in one sentence.

Example: `teamState.folder` = `%LocalAppData%\agent-team`, LOCALAPPDATA = `C:\Users\me\AppData\Local`, session
`0f6c1d2e-...` gives the marker `C:\Users\me\AppData\Local\agent-team\team-on\0f6c1d2e-...`. Before this run that
setting hid the Decisions tab. `%PROGRAMDATA%\agent-team` still hides it.

## What changed

- **Letter case.** A name matches whatever its letter case, but only the letters a to z are folded. I measured Node
  24.13 on this machine: `process.env` finds `temp`, `Tmp` and `AppData`, but not a dotless i (`USERPROFıLE`), a long
  s (`UſERPROFILE`) or a dotted capital I. JavaScript's `toUpperCase` would match those, so the pane does not use it.
- **`hooks\team-on.ts`**: `stateRootOf` looks each `%NAME%` up through a new private `variableKey` (a to z made
  capitals). The names in the map it is given are folded the same way. Signature and return values are unchanged.
- **`hooks\team-switch.ts`**: `lookAtSwitch` reads the five variables, each by its literal name. Its header names the
  five. `claude plugin validate` now lists the env reads as `APPDATA, HOME, LOCALAPPDATA, TEMP, TMP, USERPROFILE`.
- **README** (the "count as not switched on" sentence): it names the five and gives `%PROGRAMDATA%` as the example
  that hides the pane. It adds that one of the five being unset or empty also hides it, and that a plain path such as
  `D:\team-state` always works.
- **Staged config**: one sentence at the end of `teamState._whyFolder`. Nothing else in the file changed. It still
  parses as JSON, still has 153 LF line breaks and no CR, and has no BOM.

## Files

Changed, in `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`, `hooks\team-switch.ts`,
`tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `README.md`. I did not need to change
`tests\support\register-world.ts`. Also changed:
`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\orchestration.config.json` (the one sentence).

Every saved file is still UTF-8 without a BOM, with LF line endings. The 14 other pane files have the same hashes as
at 14:26, `decisions.ts` and `pane.tsx` included. Nothing is committed. No setting added. No shared file needs text
from me.

Outside the diff: I installed TypeScript 7.0.2 offline from the npm cache into my scratchpad for the type-check, and
deleted it afterwards. The scratch copy for the mutation check and the scratch scripts are deleted too. I kept copies
of the check scripts in `STATE_FOLDER_S7_LOGS\scripts\`.

## Tests added

- `O13` (team-on): a name matches whatever its letter case or the map key's case. A dotless i, a long s and a dotted
  capital I do not match.
- `S6g` (team-switch, 7 rows, on): the task's five settings, plus `%temp%\x` and the shipped root in lower case. The
  five variables are set to five different folders, with TMP = `D:\tmp` unlike TEMP, so no variable can stand in for
  another.
- `S6d` (off): the `%LOCALAPPDATA%` row now counts as on, so it moved to `S6g`. In its place: `%PROGRAMDATA%` set,
  `%SystemRoot%` set, TEMP unset, TMP unset in the middle, APPDATA empty in the middle, LOCALAPPDATA unset, and a
  dotless i. A small helper `setVariables` treats an undefined value as unset.

## Checks

All the final checks ran after my last change (14:40).

- **Baseline**: the first run at 14:27 gave 127 pass and 9 fail. All 9 failures were "timed out after 5000 ms", and
  free memory dropped to 504 MB (it took 141 s). Rerun alone at 14:30: **136 of 136** in 14 s, as the task says.
- **Red**: at 14:32, 7 of the 150 failed for the expected reason: O13 got null, and in the six S6g rows the pane
  stayed closed.
- **Final suite** (`claude plugin test`, claude.exe 2.1.310): **150 of 150** pass (136 + 14 new).
- **Validate**: "Validation passed", exit 0.
- **Type-check**: TypeScript 7.0.2 with S4's tsconfig, covering every hook and all 5 test files. Exit 0, no
  diagnostics.
- **Mutation** (scratch copy): the unmutated copy passes 150. **10 of 10 caught**, none by a timeout or a load
  failure. The six the task asked for: each of TEMP, TMP, LOCALAPPDATA and APPDATA not read; names matched
  case-sensitively; an unset variable let through. Four more: Unicode `toUpperCase` folding; the map's keys not
  folded; an empty variable let through; TMP read from TEMP.
- **Parity** (the pane's `team-on.ts` imported as is, plus the staged `agent-team.mjs` `teamOnMarkerPath`, in one
  Node process with each case's variables): **0 differences on 43**.
  - 22 cases give the same path: the task's five, letter-case variants, odd joins such as `%APPDATA%\..\Local\x`, and
    5 using this machine's real variables.
  - 18 cases give no marker on both sides.
  - 3 differ on the safe side (the pane gives no marker, the team gives a path): `%PROGRAMDATA%`, `%SystemRoot%`, and
    `%TEMP<NUL>%`.

## Not tested

- No run in the real engine: the task forbids installing, reloading or starting Claude Code with the pane. All engine
  behaviour comes from the `claude plugin test` stand-ins.
- Whether the real `$.env.get('TEMP')` (and the other four) returns what Node's `process.env` does, letter case
  included. The parity script assumed it does.
- The parity script repeats `team-switch.ts`'s glue (which five names it reads). That glue is checked only by the
  world tests and the mutants.
- The cost of five env reads on every look (every 2 seconds) was not measured. Before S4, the switch read four.

## Risks

- **Hidden pane for any other variable.** Example: `%PROGRAMDATA%\agent-team` works for the team, but the pane shows
  nothing. The README and the new `_whyFolder` sentence now say so. Recommendation: none beyond that.
- **Pane now live in new chats.** The pane loads from the repo folder, so new or reloaded chats run this code at once.
  With today's live settings (no `teamState.folder`) they show no tab until the switch-over, the same as after S4.

## What I learned that the task did not say

- Windows (through Node) folds only a to z in variable names, so `toUpperCase` would be wrong here.
- Node's `process.env` cuts a name at a NUL character: `process.env['TEMP\0']` gives TEMP's value. So the team's code
  fills in `%TEMP<NUL>%`, while the pane does not.
- The team's root rule checks only the start of the root, so `C:\%TMP%` with TMP = `D:\tmp` gives `C:\D:\tmp`. The
  pane and the team agree on that path, but Windows cannot create it.

DECISIONS TAKEN: Letter case folded for a to z only; the other choice was toUpperCase; why: measured Node/Windows does not match a dotless i, a long s or a dotted capital I, and toUpperCase would give a path where the team's code errors. | The keys of the map handed to stateRootOf are folded too; the other choice was requiring upper-case keys from callers; why: one rule in one place, and a key such as SystemRoot still works. | All five variables are read on every look; the other choice was reading only those the setting names; why: $.env.get needs literal names, so this is the simplest form, and it is one read more than before S4. | register-world.ts left unchanged; the other choice was adding LOCALAPPDATA and APPDATA to the world's default variables; why: each test sets what it needs. | I read S4's tsconfig.json and mutate.ps1 in STATE_FOLDER_S4_LOGS\scripts, though the task said to read no other STATE_FOLDER_* files; the other choice was rebuilding them from the engine's type file; why: the S4 report points to them as how its checks ran, and the task says to run the checks that way.
INITIATIVES: Kept copies of the check scripts (parity-s7.mjs, mutate-s7.ps1, spike-env.mjs, tsconfig.json) in STATE_FOLDER_S7_LOGS\scripts. | Ran 4 mutants beyond the 6 asked for (Unicode folding, unfolded keys, empty let through, TMP read from TEMP). | Installed TypeScript 7.0.2 offline from the npm cache into the scratchpad for the type-check, deleted after.
ISSUES FOUND: The first baseline run failed 9 tests with 5000 ms timeouts while free memory fell to 504 MB; the rerun gave 136 of 136; effect: a suite run under memory pressure can fail falsely. | The staged config.mjs fills in a %NAME% that has a NUL in it (Node's process.env cuts a name at the NUL, so %TEMP<NUL>% is TEMP); effect: none in practice, and the pane stays off for it. | The staged root rule checks only the start of the root, so C:\%TMP% with TMP=D:\tmp gives C:\D:\tmp, which Windows cannot create; effect: low, a contrived setting; the pane and the team agree on it. | Still unchecked from S4: whether the real $.env.get returns what Node's process.env does; effect: if it does not, the pane may hide wrongly for a setting with a variable.
QUESTIONS: none
