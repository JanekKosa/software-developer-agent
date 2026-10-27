# Run S3a of "the team's state in one folder": the relaunch log, the heavy-command slot holders, one more rule, and the PowerShell mutation check

Written by the task lead STATE_FOLDER on 2026-10-27 at 12:25. You start cold; this file holds everything.

## Read first, and no more

`...\stage-2\` below is `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `...\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md` lines 33 to 75 (the rule and its error texts) and 115 to 121.
4. `...\stage-2\STATE_FOLDER_S2_REPORT_CLAUDE.md` lines 19 to 48 (the PowerShell copy of the rule) and 85 to 125 (its
   checks, and how to run the mutation check it could not run).
5. From `...\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md`: only the sections for `run-heavy.ps1`, `start-session-in-vscode.ps1`
   and `schedule-relaunch.ps1` (Grep the file name). Never whole.
6. Your files, by range when large (`tests\limit-scripts.tests.ps1` is about 150 KB).

Do not read the guide pages, `SKILL.md`, `references\`, other `P*`/`R*` files or the lead brief.

## What the piece is for

Every file the agent team writes for itself moves into one folder (the user, D-36, 2026-10-27: "move every team file
now under %TEMP% ... into one folder beside the team's logs ... so all of the team's state is in one place no cleanup
touches"; "create a parent dir for the developer agent, and then child dirs for each temp file type"; layout accepted
11:00, D-39). S1 built the root and the Node side; S2 the usage reading, the probe's folder and the watch's records.
This run moves the last two kinds, tightens the rule by one character, and runs the mutation check S2 could not.

## Where you work: the staged copy only

`C:\Repos\My projects\software-developer-agent\orchestrate-agents\` is LIVE. Never change it. All work is in
`...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\` ("the copy"). At your start: Node 244 of 244, PowerShell 114 of
114 there (S2, re-run by the lead).

## Your two points

**Point 1: the relaunch log and the slot holders.**

| Kind | Old place | New place | Setting and new value |
| --- | --- | --- | --- |
| relaunch log | `%USERPROFILE%\.claude\state\relaunch.log` | `<root>\logs\relaunch.log` | `relaunch.logFile` = `logs\relaunch.log` |
| slot holders | `%TEMP%\xpp-agent-heavy-command-slot-<n>.txt` (fixed in code, `run-heavy.ps1` line 95) | `<root>\heavy-commands\slot-<n>.txt` | NEW `runHeavy.holderFolder` = `heavy-commands` |

- `start-session-in-vscode.ps1`: the log path from `Get-StatePath` (copy S2's three functions in, as S2 did; drop
  `Expand-ConfigPath` if nothing else uses it). A passed `-LogPath` still wins. Check `schedule-relaunch.ps1`: if it
  builds or passes the log path, it changes too; if not, leave it.
- `run-heavy.ps1`: the holder file is `<root>\heavy-commands\slot-<n>.txt` from the new setting. The named lock
  (mutex) keeps its name `xpp-agent-heavy-command-slot-<n>` exactly, so an old and a new run-heavy still exclude each
  other during the switch-over. Its `_about` says each setting may be passed as a parameter of the same name: add
  `HolderFolder` (a full path, used as given) the same way. A broken setting must stop it with a clear line before it
  runs the command, never run the command without a slot.
- **Careful: the mutex is machine-wide.** Every heavy command you run goes through the LIVE run-heavy, which holds
  slot 1 while your test suite runs. A test that runs the staged `run-heavy.ps1` for real with the real slot names
  would wait for your own suite (up to 60 minutes) or, worse, take the slot from another session. Test run-heavy's
  new path code without taking the real mutex (dot-sourced functions, or a test seam for the names that you add and
  report). Check what the existing run-heavy cases already do before you add any.
- Testable from the caller's side: the start script, run with a scratch root, logs to `<scratch root>\logs\relaunch.log`;
  run-heavy's holder for slot 1 is `<scratch root>\heavy-commands\slot-1.txt`; a passed `-LogPath` / `-HolderFolder`
  wins; a broken `runHeavy.holderFolder` stops run-heavy with S1's error text and runs nothing.

**Point 2: refuse `%` in a child setting.** Today a child value such as `%TEMP%\x` is neither refused nor filled in,
so it makes a folder literally named `%TEMP%` under the root (S2's finding). Lead's decision: add `%` to the refused
characters. The reason text changes from `has one of * ? " < > |` to `has one of * ? " < > | %` (same place in the
order). Make the change in the Node rule (`lib\config.mjs`, and its tests), and in EVERY PowerShell copy of the rule
(`usage-probe.ps1`, `watch-usage-and-context.ps1`, and your two scripts), and in S2's 50-case table, so the table
still gives 0 differences for Node and every script. Only that one line in S2's two scripts; nothing else there.
Only `teamState.folder` may name a variable.

**Also, a two-line documentation fix (the user chose it, D-53, 12:48: "Chose A: correct the two 'does not exist yet'
lines now and leave the width (a few minutes, within this task)").** The repo-root page
`C:\Repos\My projects\software-developer-agent\agent-team-files.html` says twice that `misc\handovers\` "does not exist
yet", but the folder exists now (`C:\Repos\My projects\software-developer-agent\misc\handovers\`; list what is in it,
read-only). Find the two places (Grep `does not exist yet`), make each say the truth in the page's plain style, keep
the page's tags balanced and its LF line endings, and change nothing else on the page. No other worker edits it now.

## Tests

- New cases for both points; update the cases that used the old places.
- **No test may read or write the real root, the real old places, or the real slot.** Every config a test gives a
  script carries a scratch `teamState.folder`; the test process and every child get `USERPROFILE`, `TEMP` and `TMP` on
  scratch (S2 set this up for the test process; keep it).
- **Run your red phase (new tests against the old code) in a scratch copy of the copy** (`-ScriptsRoot`), never in the
  copy itself. S1's red phase wrote 60 lines into the real limit-stop log (D-51); S2's first red run nearly wrote the
  real `%TEMP%`. Here the old start script would append to the real `relaunch.log`, and old run-heavy would write a
  holder into the real `%TEMP%`.

## The mutation check (right after point 2, before your warning): S2's rules and yours

In a scratch copy of the copy's `scripts\` (never in the copy), break one rule at a time and run the cases that should
catch it with `pwsh -NoProfile -File tests\limit-scripts.tests.ps1 -ScriptsRoot <scratch>\scripts -Only '<wildcard>'`;
for the Node rule, a scratch copy of the copy and `node --test <file>`. Delete the scratch copies at the end. At least:
- S2's list: four of the child-path refusals (in a PowerShell copy), the root not checked as absolute, the probe's
  reading back in the old place, the probe's folder ignoring the root, the watch's mark back in `%TEMP%`, the watch's
  record back in `%TEMP%`, a passed `-StatePath` no longer winning.
- Yours: the relaunch log ignoring the root, a passed `-LogPath` no longer winning, the holder back in `%TEMP%`, the
  holder ignoring the root, a passed `-HolderFolder` no longer winning, `%` let through in Node, `%` let through in one
  PowerShell copy.
Report "N of N caught", and name any survivor with what you added to catch it.

## The check against real material (nothing live touched)

1. Resolve `relaunch.logFile` and `runHeavy.holderFolder` from the copy's config with the real environment: exactly
   `C:\Users\user\.claude\state\software-developer-agent\logs\relaunch.log` and `...\heavy-commands`. "0 differences on 2".
2. The four PowerShell copies of the rule's three functions are the same text (compare them; report "4 copies, 0
   differences", or name each difference and why it must be there).
3. Before and after each full suite run: `C:\Users\user\.claude\state\software-developer-agent` does not exist;
   `C:\Users\user\.claude\state\` keeps its files (the live watch rewrites `usage-limits.json`; name any change and its
   writer); no `relaunch.log` change; no new `%TEMP%\xpp-agent-heavy-command-slot-*.txt` except the live run-heavy's
   own while your command runs.

## Rules for the run

- Every heavy command through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  (the LIVE run-heavy), redirection to a log file inside the command. Logs in `...\stage-2\STATE_FOLDER_S3A_LOGS\`.
- At the end, both suites in the copy: PowerShell (114 + yours, all pass; 4 to 9 minutes) and `node --test` from a
  working folder spelled `C:\` (244 + yours, all pass).
- Another worker (run S4) runs beside you, in the other repo `C:\Repos\My projects\claude-code-extensions\` (the
  Decisions pane). It reads the copy's `lib\` for a parity check and changes nothing in this repo except its own
  `STATE_FOLDER_S4_*` files. It also queues for the one slot.
- The switch-over script (run S3b, done) reads the copy's config at run time; it already refuses on today's absolute
  `relaunch.logFile`, which your point 1 turns into a child path.
- Read the clock for every time you write. Progress file after every point:
  `...\stage-2\STATE_FOLDER_S3A_PROGRESS_CLAUDE.md`.
- Plan for about 75 tool calls; you are warned at 320 thousand tokens. The mutation check starts right after point 2.
  S2 ran out of room before its mutation check: keep point 1 lean.
- Every saved file keeps its encoding and line endings. Git read-only (VS 2026's git:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`).
  Never commit.

## Files

- Yours, in the copy: `orchestration.config.json` (only `relaunch.logFile`, the new `runHeavy.holderFolder`, their
  `_why` texts in plain words), `scripts\start-session-in-vscode.ps1`, `scripts\run-heavy.ps1`,
  `scripts\schedule-relaunch.ps1` (only if it handles the log path), the one rule line in `scripts\usage-probe.ps1` and
  `scripts\watch-usage-and-context.ps1`, `lib\config.mjs` (the `%` only), the Node tests of the rule,
  `tests\limit-scripts.tests.ps1`; the two "does not exist yet" places in the repo-root `agent-team-files.html`; your
  progress, report and log files.
- Not yours: anything in the LIVE `orchestrate-agents\`; in the copy `SKILL.md`, `references\`, `hooks\`, the other
  `lib\` files and scripts; the base list; `decisions\*`; the vendored `skills\`; the pane repo; S3b's files
  (`STATE_FOLDER_CUTOVER*`, `STATE_FOLDER_TRIM_LOG_CLAUDE.ps1`);
  `~\.claude\settings.json`, any `CLAUDE.md`, anything under `~\.copilot`. The real `C:\Users\user\.claude\state\` and
  `%TEMP%` team files: read-only.

## How to verify (counts to expect)

- End: PowerShell 114 + new, all pass; Node 244 + new, all pass; both in the copy.
- 0 differences on 2; 4 copies, 0 differences; the real root absent; the real logs unchanged by you.
- Mutation: N of N caught.
- The live `orchestrate-agents\` matches the base list `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt`.

## Report

`...\stage-2\STATE_FOLDER_S3A_REPORT_CLAUDE.md`: what changed, the config entries as written, how run-heavy's tests
avoid the real slot, the counts, what you did not test and why. It ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

Your final message is the report's summary and the same four lines. To ask me something you cannot decide, end with
a final message that starts `QUESTION FOR THE LEAD |`.

## Not now

The switch-over script (S3b); the pane (S4); docs. D-37: not yours.
