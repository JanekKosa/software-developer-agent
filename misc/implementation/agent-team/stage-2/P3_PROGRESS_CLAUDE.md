# P3 progress: the switch check of the Decisions pane against the real engine

Worker P3, started 2026-10-27 09:19 (Get-Date). Task: `P3_TASK_CLAUDE.md`. Report: `P3_REPORT_CLAUDE.md`.

## Files I own

- My scratch folder `<sp>\p3` (`<sp>` = `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f\scratchpad`):
  `pane\` (copy of the pane), `repo\` (scratch repo), `temp\` (scratch TEMP), `logs\`, scripts.
- `decisions-pane\hooks\*` and its tests only under section 5 of the task (a small fix with a test).

## Baseline (09:20)

- `claude-code-extensions` git status: P1's 6 modified and 4 new files in `decisions-pane`, nothing else.
- Real `%TEMP%\claude-agent-team-on` holds one file, `bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f` (this chat's marker,
  not mine, untouched).
- The pane folder has no links (`dir /AL /S` finds none).

## Markers I wrote into the real %TEMP%

none

## Setup (09:21)

- `p3\pane`: copy of the pane, 19 files, SHA-256 compared with the real folder: 0 differences
  (`p3\pane-hashes-real.csv`).
- `p3\repo`: `git init` (VS git), `decisions\OPEN_DECISIONS_CLAUDE.md` with synthetic D-1 (question, medium) and
  D-2 (issue, low), written by `register.mjs add --root p3\repo` from `p3\entry-1.json`, `p3\entry-2.json`.
- `p3\temp`: the scratch TEMP/TMP of every engine run. Markers go to `p3\temp\claude-agent-team-on\<uuid>`.
- `p3\driver.mjs`: spawns `<claude>` with the task's flags, TEMP/TMP = `p3\temp`, cwd `p3\repo`; logs every line to
  `p3\logs\<scenario>-<uuid>.jsonl`.

## Probe (09:22-09:23, uuid d2b2c4bb-fb64-42b4-b1e5-da1e4e70c423) - measured

- The session starts at launch, before any message: `system/ui_panes` at 1.3 s with
  `panes:[{id:"decisions-pane",title:"Decisions (2)"}]`, `shown_id:"decisions-pane"`. So the scratch TEMP reaches
  the mod and `$.session.id()` gives the bare id (the marker was named by the bare uuid). No real %TEMP% marker needed.
- A closed pane is `ui_panes` with `panes:[]`, `shown_id:null`.
- Command answers come as a `result` (success, num_turns 0, cost 0) whose text is prefixed by the engine with
  `decisions-pane: `, plus an `assistant` message with `model:"<synthetic>"` (not a model turn).
- Headless has no surface: opening by command answers `Decisions pane waits: no-surface: no surface is attached
  ($.session.surfaces() is empty)`, yet a `ui_panes` with the pane shown comes. Pane-control behaviour, not the switch.
- Peak 454 MB (run-heavy).

## Scenarios (one `run-all.ps1` under run-heavy, 09:23:44-09:25:27; ran 1:42, peak 505 MB)

Summaries `p3\logs\<name>-summary.txt`, full lines `p3\logs\<name>-<uuid>.jsonl`, facts by `p3\facts.mjs`.
0 real model turns in every run (assistant messages all `model:"<synthetic>"`, num_turns 0, cost 0). No stderr.

1. **Off** (b9887ea4-2d30-472a-b51a-786057237864): PASS. No `ui_panes` at all in 13.8 s. `/decisions-pane` at 8.0 s
   -> result `decisions-pane: The agent team is not on in this chat. Type /software-developer-agent to switch it on;
   the Decisions pane then shows here.` (engine adds the `decisions-pane: ` prefix); no `ui_panes` after it.
2. **On at start** (a412b17a-7fc6-410c-86b8-47830a9c66e9): PASS. `ui_panes` shown `decisions-pane`, title
   `Decisions (2)`, at 1.5 s, nothing sent. Then hide (`Decisions pane hidden.`) and show (`waits: no-surface`,
   `ui_panes` shown) so the transcript has turns for scenario 6. Marker kept for 6.
3. **Mid-chat** (c1dad8bf-e30d-42c7-999c-659f2e006db3): PASS. `/decisions-pane` at 8.0 s -> NOT_ON line; marker
   written at 11.3 s; `ui_panes` shown at 11.5 s, nothing sent, no reload.
4. **Marker removed** (67f194f0-13c3-4190-8efa-24229bf8372d): PASS. Shown at 1.3 s; marker removed at 8.0 s;
   `ui_panes` `panes:[]` at 9.3 s; `/decisions-pane` at 13.1 s -> NOT_ON line.
5. **/clear** (adb732cc-2419-4446-9fdb-051bf0528b50): drives headless. Shown at 1.7 s. `/clear` at 8.0 s ->
   `conversation_reset` (trigger clear, new_conversation_id 43d69aab-... = its own message uuid, not a session id),
   then `init` and `result` with session 8dcfe92f-b24b-412a-9040-585f0d2a4931. Pane closed (`panes:[]`) at 9.7 s.
   `/decisions-pane` -> NOT_ON line. Transcripts: before 5 `.jsonl` + `memory`; after, one new:
   `8dcfe92f-b24b-412a-9040-585f0d2a4931.jsonl`. Extra step: marker for 8dcfe92f written (scratch TEMP) at 16.7 s ->
   pane shown at 17.7 s; command -> `Decisions pane hidden.`; marker removed.
6. **Resume** (`--resume a412b17a-...`, marker still there): session id stays a412b17a in every message; pane shown
   by itself at 1.7 s; `/decisions-pane` -> `Decisions pane hidden.`. Transcript names identical before and after
   (no new file).

## Extra: hook view of /clear and resume (09:27:17-09:27:55, run-heavy ran 0:37, peak 451 MB)

- `p3\repo\.claude\settings.json` (scratch only) with SessionStart and UserPromptSubmit hooks running
  `p3\hook-log.mjs`, which logs stdin `session_id`, `source`, transcript name, env `CLAUDE_CODE_SESSION_ID`, and the
  NAMES of CLAUDE* variables (no values) to `p3\logs\hooks.jsonl`. Reran `clear` (da6be091-...) and `resume`
  (a412b17a; its first log renamed `resume1-...jsonl`).
- SessionStart startup: stdin = env = transcript = da6be091. SessionStart **clear**: stdin = env = transcript =
  bf6007a0-5f2a-47e5-8d49-a7472965f4b9 (new). SessionStart **resume**: stdin = env = transcript = a412b17a (same).
- UserPromptSubmit never fired: local slash commands sent headless do not fire it.
- Pane events identical to the first runs (clear: shown 1.7 s, closed 9.7 s, NOT_ON, back at 17.7 s after the new-id
  marker; resume: shown 1.7 s, command `Decisions pane hidden.`). 0 model turns.
- A session cleared before anything was said never gets a transcript file (adb732cc, da6be091 have none).

## Cleanup (09:28-09:29)

- All 9 engine pids from the logs (1040, 5272, 12468, 5492, 5820, 2964, 3960, 12480, 7868) are gone; every run exited
  0 on stdin close, no kill needed.
- Scratch marker a412b17a removed; `p3\pane`, `p3\repo`, `p3\temp` deleted (0 links; `temp` needed
  `[IO.Directory]::Delete` after Remove-Item's "directory is not empty").
- Real pane folder: 19 files, 0 hash differences from setup. Real `%TEMP%\claude-agent-team-on`: only bf7022c6 (not
  mine), as at baseline. I wrote no marker there.
- Kept in `p3`: logs and scripts (driver, facts, hook-log, setup, run-all, run-hooks, cleanup, entries, hash csv).
- Engine-written, not mine to remove: `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f-scratchpad-p3-repo\`
  with 7 transcripts and `memory`.

## Section 5

No disagreement with the pane: no code change, so no tests, validate, type-check or mutation check were needed.

## Done

- Report written at 09:30 (Get-Date): `P3_REPORT_CLAUDE.md`. Extensions repo `git status` identical to baseline.
