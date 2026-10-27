# Run S4 of "the team's state in one folder": the Decisions pane's copy of the switch-on rule

Written by the task lead STATE_FOLDER on 2026-10-27. You start cold; this file holds everything.

## Read first, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the agent team's repo).
2. This file, whole.
3. The `claude-code-mods` skill: `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md` (how mods are
   installed, tested and type-checked on this machine; which `claude.exe` to use).
4. The pane's `README.md`: `C:\Repos\My projects\claude-code-extensions\decisions-pane\README.md`.
5. `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md`,
   only the section "The contract later runs must match" (lines 33 to 75): the rule you copy.
6. Your files: `decisions-pane\hooks\team-on.ts`, `hooks\team-switch.ts`, and their tests
   (`tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts`).

Do not read the agent team's guide pages, `SKILL.md`, `references\`, the sweep file or other `P*`/`R*`/`STATE_FOLDER_*`
files.

## What the piece is for

The agent team moves every file it writes for itself into one folder (the user, D-36, 2026-10-27: "move every team
file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the
team's logs ..."; "create a parent dir for the developer agent, and then child dirs for each temp file type"; the user
accepted the layout on 11:00, D-39). The Decisions pane shows only in a chat the team is switched on for, by checking
the same switch-on mark the team's hooks check. Its copy of that rule (`team-on.ts`) must follow the mark to its new
place, or the pane would never show again after the switch-over.

## The change

Old mark: `<temp folder>\<agentTeam.onFolder>\<session id>`, with `agentTeam.onFolder` = one folder name
(`claude-agent-team-on`) under Node's `os.tmpdir()`.

New mark: `<root>\<agentTeam.onFolder>\<session id>`, where:
- `<root>` is the new setting `teamState.folder` in the team's `orchestration.config.json`, today
  `%USERPROFILE%\.claude\state\software-developer-agent`. Each `%NAME%` is replaced by that environment variable (read
  through `$.env.get`, as `tempFolderOf` reads TEMP today). After that it must be absolute: a drive letter, `:` and
  `\` (S1's regex `^[A-Za-z]:\\`; a UNC path is refused).
- `agentTeam.onFolder` is now a path RELATIVE to the root (today `team-on`), checked by S1's rule: the same refusals,
  in the same order (empty; a drive or `:`; a leading or trailing `\` or `/`; a `/`; one of `* ? " < > | %`; an empty
  part; a `.` or `..` part). Several parts joined by `\` are allowed now. The `%` is new since S1's report (run S3a
  adds it to the team's Node and PowerShell code; S1's report still shows the list without it): only
  `teamState.folder` may name a variable, so a child such as `%TEMP%\x` is refused.
- The session id check stays as it is.

The pane stays on the safe side, as today: where the team's Node code throws an error, the pane gives no marker (the
chat counts as off). A config with no `teamState.folder` (today's live config, until the switch-over) gives no marker.

Example: config `{ "teamState": { "folder": "%USERPROFILE%\\.claude\\state\\software-developer-agent" }, "agentTeam":
{ "onFolder": "team-on" } }`, `USERPROFILE` = `C:\Users\user`, session `56c67d3d-b3c0-43be-a82c-b3a9cdc23274` gives
`C:\Users\user\.claude\state\software-developer-agent\team-on\56c67d3d-b3c0-43be-a82c-b3a9cdc23274`.

## Your two points

**Point 1: the root.** `team-on.ts` gives the root from the config and the environment (replacing the temp-folder
part), with the expansion and the absolute check. Testable from the caller's side: for a set of configs and
environments, the marker path or "no marker" is what the table above says, including an unset `%NAME%`, a missing
`teamState`, a relative root and a UNC root.

**Point 2: the child and the whole switch.** `onFolder` checked by S1's rule (multi-part allowed); `team-switch.ts`
builds the marker from the config it already reads. Testable from the caller's side: in the pane's test world, a chat
with a mark at the new place shows the Decisions tab, a mark only at the old `%TEMP%` place does not, and each refused
`onFolder` value gives no tab. Update the file headers, which name the sources they copy (`lib\agent-team.mjs`,
`lib\config.mjs` `requireStatePath` in the agent team's repo), and the README's paragraph about the mark (line 104 or
so).

## The check against real material (nothing live touched)

1. Parity with the team's own code. The staged copy of the team's code is at
   `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`
   (read-only for you). For its `orchestration.config.json`, the real environment, and each real session id that has a
   mark today in `%TEMP%\claude-agent-team-on\` (list it read-only; there are about 3), the pane's path must equal what
   the staged `lib\agent-team.mjs` `teamOnMarkerPath` gives (call it with `node`, read-only). Report "0 differences on
   N".
2. The same table of refused child values gives "no marker" in the pane and an error in the staged Node code, case by
   case. Report "N of N agree".
3. The LIVE config (`C:\Repos\My projects\software-developer-agent\orchestrate-agents\orchestration.config.json`, old
   shape, read-only) gives "no marker" in the new pane: write that down as the expected state until the switch-over.

## The mutation check (right after point 2)

In a scratch copy of the pane (never in the real folder, so a cut-off leaves no mutant), break one rule at a time and
run the tests: the root not expanded, an unset variable let through, the root not checked as absolute, four of the
child refusals, the old temp folder used again, the session id unchecked. Report "N of N caught"; name any survivor
and what you added to catch it. Delete the scratch copy at the end.

## Rules for the run

- **The pane goes live only when the main session types `/reload-plugins`**, which it does at the switch-over, after
  the team's own code. Edit in place in `C:\Repos\My projects\claude-code-extensions\decisions-pane\`, but never run
  `/reload-plugins`, never install or update the plugin, never start Claude Code against the user's real profile with
  the pane.
- Baseline first: the pane's tests were 107 of 107 at 09:34 today (another session's run). Run them before your first
  change and write the count down; if it differs, stop and ask.
- The checks, as the brief names them: `claude plugin validate decisions-pane` and `claude plugin test decisions-pane`,
  run in `C:\Repos\My projects\claude-code-extensions` with the `claude.exe` of Claude's VS Code extension (the
  `claude-code-mods` skill says how), and the type-check as the pane's README says.
- Every heavy command (tests, type-check, mutation runs) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S4_LOGS\` (that is
  `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`).
- Another worker runs beside you (run S3a, PowerShell scripts, `lib\config.mjs` and tests in the agent team's staged
  copy); it queues for the same slot; expect waits.
- For the parity check: compare with the staged Node code as it is when you run the check; if the staged
  `lib\config.mjs` does not refuse `%` yet, say so and compare the other cases.
- Read the clock for every time you write. Progress file after every point:
  `...\stage-2\STATE_FOLDER_S4_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. A pane run here once went to 162 calls with a
  wide check and 25 mutants: keep the mutation to the list above plus what a survivor needs.
- Every saved file keeps its encoding and line endings. Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Files

- Yours: in `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`, `hooks\team-switch.ts`,
  `tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`, `tests\support\register-world.ts`, `README.md`
  (the mark's paragraph), and `tests\hooks\pane.test.ts` only if a test there builds the mark; your progress, report
  and log files.
- Not yours: every other file of the pane and of `claude-code-extensions`; everything in the agent team's repo except
  your progress, report and log files (the staged copy is S2's while you run); `decisions\*`;
  `~\.claude\settings.json`, any `CLAUDE.md`, anything under `~\.copilot`, the installed plugin.

## How to verify (counts to expect)

- Baseline 107 of 107 (or the count you found, if I agreed); end: baseline + your new tests, all pass; validate clean;
  type-check clean.
- Real material: 0 differences on N; N of N agree; the live config gives "no marker".
- Mutation: N of N caught.

## Report

`...\stage-2\STATE_FOLDER_S4_REPORT_CLAUDE.md`: what changed, the functions' names and signatures, the counts, what
you did not test and why, and the exact steps the main session runs to put it live (it will do them at the
switch-over). It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

Anything in the agent team's own code (S2, S3), docs (S5). D-37: not yours.
