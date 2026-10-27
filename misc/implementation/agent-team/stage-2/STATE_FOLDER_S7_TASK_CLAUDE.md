# Run S7 of "the team's state in one folder": the Decisions pane learns four more folder variables

Written by the task lead STATE_FOLDER on 2026-10-27 at 14:25. You start cold; this file holds everything. A small run.

## Read first, and no more

`...\stage-2\` below is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `...\stage-2\STATE_FOLDER_S4_REPORT_CLAUDE.md`, whole (about 130 lines): the run that built the pane's rule you
   change, its functions, its checks and how it ran them.
4. The `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`: only its part
   on `$.env.get` and on running a mod's tests, validate and type-check with Claude's VS Code `claude.exe`.
5. Your files in `C:\Repos\My projects\claude-code-extensions\decisions-pane\`: `hooks\team-on.ts`,
   `hooks\team-switch.ts`, `tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`,
   `tests\support\register-world.ts`, and the README's paragraph on the mark.

Do not read the other pane files, the agent team's guide pages, the sweep, or other `P*`/`R*`/`STATE_FOLDER_*` files.

## What the piece is for

The agent team keeps all its own files under one folder, set by one line, `teamState.folder`, in the team's
`orchestration.config.json` (today `%USERPROFILE%\.claude\state\software-developer-agent`). Run S4 taught the Decisions
pane to find the chat's switch-on mark there. Claude Code lets a pane read a system variable only by a name written
literally in its code (`$.env.get('NAME')`), so S4's pane fills in only `%USERPROFILE%`; any other variable in the
setting hides the Decisions tab. The user chose (D-54, 14:22): "Chose - A: teach the pane the usual folder variables
too: TEMP, TMP, LOCALAPPDATA, APPDATA (one small run, about 20 minutes)."

## Your two points

1. **The pane fills in five variables**: `USERPROFILE`, `TEMP`, `TMP`, `LOCALAPPDATA`, `APPDATA`, each read by its
   literal name. A name in the setting matches whatever its letter case (Windows names are case-insensitive), so
   `%temp%` counts as `TEMP`. Any other variable, and one of the five that is unset or empty, gives "no marker" (the
   chat counts as off), as today. Testable from the caller's side: for the setting `%TEMP%\software-developer-agent`,
   `%LocalAppData%\x`, `%APPDATA%\x`, `%TMP%\x` and `%USERPROFILE%\x` with those variables set, the marker path is the
   expanded root + `\<onFolder>\<session id>`; for `%PROGRAMDATA%\x`, or `%TEMP%\x` with TEMP unset, there is none.
2. **Parity and the words.** The same table run against the team's staged Node code
   (`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\lib\agent-team.mjs` `teamOnMarkerPath`, called with `node`
   and a settings object, read-only) gives the same path for every case the pane answers with a path. Update the README
   paragraph and the file headers to name the five variables. Then, as your LAST change, add one sentence to the staged
   config's `teamState._whyFolder` (`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\orchestration.config.json`):
   that the Decisions pane can fill in only `%USERPROFILE%`, `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%` and `%APPDATA%`, so
   another variable there hides the pane (a plain path always works). Touch nothing else in that file; keep its line
   endings; check it still parses as JSON.

## Checks

- Baseline first: the pane's whole suite, 136 of 136 at 14:10 (run S6). If it differs, stop and ask.
- End: the whole pane suite (136 + yours, all pass), `claude plugin validate decisions-pane`, and the type-check, run
  the way S4 ran them (its report).
- Mutation, in a scratch copy of the pane (never in the real folder): drop each of the four new variables in turn,
  make the match case-sensitive, let an unset variable through. Report "N of N caught".
- Parity: "0 differences on N" (point 2).

## Rules for the run

- **Your files only**: `hooks\team-on.ts`, `hooks\team-switch.ts`, their tests, `tests\support\register-world.ts`,
  `README.md` in the pane; the one sentence in the staged config. Never `hooks\decisions.ts`, `hooks\pane.tsx` or any
  other pane file (another lead's work, finished at 13:42). Never run `/reload-plugins`, install or update a plugin, or
  start Claude Code against the user's profile with the pane.
- Every heavy command (tests, type-check, validate, mutation runs) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S7_LOGS\`. The lead's own final
  check runs now and holds the slot for a few minutes; expect a wait.
- Read the clock for every time you write. Progress file after every point: `...\stage-2\STATE_FOLDER_S7_PROGRESS_CLAUDE.md`.
- Plan for about 45 tool calls.
- Every saved file keeps its encoding and line endings. Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Report

`...\stage-2\STATE_FOLDER_S7_REPORT_CLAUDE.md`: what changed, the counts, what you did not test and why. It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.
