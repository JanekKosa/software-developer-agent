# Run S5 of "the team's state in one folder": the guide pages and the skill's text

Written by the task lead STATE_FOLDER on 2026-10-27. You start cold; this file holds everything. No code changes.

## Read first, and no more

`...\stage-2\` below is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `C:\Repos\My projects\software-developer-agent\team-switch\SKILL.md`, lines 11 to 13 (you quote them, word for word).
4. D-35 in `C:\Repos\My projects\software-developer-agent\decisions\RESOLVED_DECISIONS_CLAUDE.md` (from line 482, the
   one entry; read-only) and `...\stage-2\P3_REPORT_CLAUDE.md` lines 1 to 12 and 41 to 110 (what `/clear` and resume
   do; read-only).
5. `C:\Repos\My projects\software-developer-agent\scripts\install.ps1` (to count the junctions it makes).
6. From `...\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md` (77 KB): only the sections for the files you change (Grep the file
   name). Never whole.
7. The pages, by range: they are long.

Do not read: the code files (except to confirm one fact, by Grep), the Node or PowerShell tests, other `P*`/`R*`/
`STATE_FOLDER_*` files, the lead brief.

## What the piece is for

Two things the user decided, written into the documentation.

- **D-35, the user's words**: "Chose A: keep it as it is and say it in the two guide pages and in the
  /software-developer-agent command's text: after /clear, type /software-developer-agent again". The command's text is
  done (`team-switch\SKILL.md` lines 11 to 13). Left: the two guide pages.
- **D-36 and D-39, the new folder**. The user (D-36): "move every team file now under %TEMP% (the switch markers, the
  size guard's markers, the watch's records) into one folder beside the team's logs ... so all of the team's state is
  in one place no cleanup touches"; comment: "yes but create a parent dir for the developer agent, and then child dirs
  for each temp file type". D-39 (the layout below): "Chose A: keep these names and this split".
- And one fix the main session asked for: `agent-team-files.html` says `scripts\install.ps1` makes "five junctions"
  (around lines 206, 338, 369, 397, 445, 572, 792); the README says six, because the `/software-developer-agent` switch
  added `~\.claude\skills\software-developer-agent` -> `team-switch\`. Count them in `install.ps1` and make the page
  say the true number everywhere, the diagram included.

## The layout to describe (fixed; the code is being changed to it now, in a staged copy)

Root `teamState.folder` = `%USERPROFILE%\.claude\state\software-developer-agent` (one line of
`orchestration.config.json`; change it and everything moves). Every other place is a path under it, set in the same
file:

| Child folder | Holds | Old place | Setting |
| --- | --- | --- | --- |
| `team-on\` | one mark per chat switched on with /software-developer-agent (`<session id>`) | `%TEMP%\claude-agent-team-on\` | `agentTeam.onFolder` |
| `context-guard\` | the size warnings already sent to each agent (`<agent id>.json`) and their locks (`.lock`) | `%TEMP%\claude-context-guard\` | `contextGuard.markerFolder` |
| `usage-reading\` | the last usage reading, `usage-limits.json` | `~\.claude\state\usage-limits.json` | `usageLimits.stateFile` |
| `usage-probe\` | the empty folder the usage probe's call runs in | `%TEMP%\claude-usage-probe\` | `usageLimits.probeWorkingFolder` |
| `usage-watch\` | the Usage and context watch's own records: `<session id>.txt` (it runs) and `<session id>.decision.json` | `%TEMP%\claude-session-watch-<id>.txt`, `.decision.json` (fixed in code before) | new `usageAndContextWatch.recordFolder` |
| `heavy-commands\` | who holds a slot for a heavy command, `slot-<n>.txt` | `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt` (fixed in code before) | new `runHeavy.holderFolder` |
| `logs\` | `relaunch.log`, `limit-stop.log` | `~\.claude\state\` | `relaunch.logFile`, `limitStop.logFile` |

What stays outside, and why: the register's lock `decisions\.lock` and the short-lived `.<name>.<pid>.tmp` beside each
safe save (each must sit beside the file it guards or replaces); the named lock `xpp-agent-heavy-command-slot-<n>`
(in memory, no file; its name is unchanged); the folders the test suites make and delete in `%TEMP%` (`oa-*`,
`limit-scripts-tests-*`); Claude Code's own files (transcripts under `~\.claude\projects\`, `%TEMP%\claude\`,
`~\.claude.json`); `~\.claude\state\mcp-discover-verdicts.json` (another tool's). The old places are emptied at the
switch-over: each old file is copied into its new folder, and deleted only where the copy is identical.

## Your two points

**Point 1: the two guide pages.**
- `C:\Repos\My projects\software-developer-agent\agent-team-files.html` (repo root, edited in place) and
  `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\references\agent-team-guide.html` (the STAGED copy; never the
  live `orchestrate-agents\references\agent-team-guide.html`, which is live through a junction).
- In each: the /clear note (after `/clear` the chat has a new session id, so the team is off there and the Decisions
  tab closes until `/software-developer-agent` is typed again; reopening a chat from the history keeps its id, so the
  team stays on there), quoting `team-switch\SKILL.md` lines 11 to 13 word for word where a quote fits; and the new
  folder: every place a page names an old path, a diagram box, a table row, an example, now names the new one. In
  `agent-team-files.html` also the junction count, the "fixed in code" table, the explanation of why `%TEMP%` is for
  files a program can afford to lose (the reason the state is not there), and a row or list for what stays outside.
- Keep each page's look, its SVG valid and readable in both light and dark themes, and its line endings.

**Point 2: the skill's own text and the rest.**
- In the STAGED copy: `SKILL.md`, `references\usage-limits.md` (it names the old reading's place, near line 96),
  `references\limits-and-caps-guide.html`, and any other file under the staged `references\` that names an old place
  (the sweep lists them; `lead-brief-template.md`'s `temp\` is a project's working folder, not ours: leave it unless it
  names one of our old places).
- In place: the repo's `README.md` (the sweep shows one line).
- **Before you edit the staged `SKILL.md`**: the live `SKILL.md` changed at 11:08:50 (the main session added three
  lines on D-40, around line 132) after the staged copy was made. Copy the live file's text into the staged copy first
  (it is the only difference: S1 did not change `SKILL.md`; confirm the staged file's hash equals its line in
  `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt` before you copy), then replace that file's line in the base list
  with the live file's hash and add `# SKILL.md re-based <time>` as a comment line at the end. Then edit. If the live
  `SKILL.md` changes again while you run, say so in the report; do not copy it twice.

## The check

1. Every path the changed pages and files name for a team file is one of the table's new places (or one of the
   "stays outside" list), and no old place is named except as "the old place" in the explanation of the move. Report
   "N places, N true", and list each old-place mention you left with its reason.
2. The junction count you wrote equals the count of junctions `install.ps1` makes. Report the number and the lines.
3. The /clear note is on both pages; the quote is word for word (0 differences on 1).
4. HTML: tags balanced in each changed page (a small script; report counts); each page's line endings unchanged
   (count CRLF and lone LF before and after).
5. The live `orchestrate-agents\` unchanged by you: hash its files against the base list (only `SKILL.md` differs, and
   only by the main session's lines).

## Rules for the run

- No heavy command is needed. If you run one, it goes through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`.
- Another worker (run S2) changes, in the staged copy, `orchestration.config.json`, `scripts\usage-probe.ps1`,
  `scripts\watch-usage-and-context.ps1` and `tests\limit-scripts.tests.ps1`: not yours, do not open them for writing.
- Read the clock for every time you write. Progress file after every point:
  `...\stage-2\STATE_FOLDER_S5_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. Read the pages by range.
- Plain words for the user (the pages are for the user): short sentences, a term explained the first time.
- Every saved file keeps its encoding and line endings. Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Files

- Yours: `agent-team-files.html` and `README.md` at the repo root; in the staged copy `SKILL.md` and the files under
  `references\` that name an old place; the base list's `SKILL.md` line; your progress and report files.
- Not yours: anything in the LIVE `orchestrate-agents\`; the staged copy's code, config and tests; `team-switch\`
  (the main session's text, quote only); `decisions\*`; the vendored `skills\`; the pane repo; `~\.claude\settings.json`,
  any `CLAUDE.md`, anything under `~\.copilot`; the skills under `C:\Repos\My projects\xpp-agent\Docs\Skills\` (if one
  names an old place, write the exact new text in your report for the main session instead).

## Report

`...\stage-2\STATE_FOLDER_S5_REPORT_CLAUDE.md`: what changed, page by page (with one before/after example each), the
check's counts, what you did not check and why, and any text the main session must put into files outside the repos,
word for word. It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

Code, config and tests (S2, S3), the pane (S4), the cut-over. D-37: not yours.
