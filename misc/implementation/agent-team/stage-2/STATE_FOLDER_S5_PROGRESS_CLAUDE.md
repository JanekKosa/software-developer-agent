# Run S5 progress: the guide pages and the skill's text

Worker S5, started 2026-10-27 11:35:40 (Get-Date). Task: `STATE_FOLDER_S5_TASK_CLAUDE.md`. No code changes.

## Files I own

- `agent-team-files.html` and `README.md` at the repo root (edited in place).
- In the staged copy `...\stage-2\STATE_FOLDER_STAGING\orchestrate-agents\`: `SKILL.md`, and the files under
  `references\` that name an old place.
- The `SKILL.md` line of `...\stage-2\STATE_FOLDER_STAGING_BASE_CLAUDE.txt`.
- This file and `STATE_FOLDER_S5_REPORT_CLAUDE.md`.

## Baseline (11:36)

- Live `orchestrate-agents\` against the base list: only `SKILL.md` differs (live LastWrite 11:08:50, hash
  C874A196...0041). No extra or missing files.
- Staged `SKILL.md` hash = base line (35E64654...D6E2): equal, so S1 did not change it.
- Line endings: every file I may change is LF only, no BOM (agent-team-files.html 971 LF; README.md 101 LF; staged
  SKILL.md 370 LF; live SKILL.md 372 LF; agent-team-guide.html 655 LF; limits-and-caps-guide.html 665 LF;
  usage-limits.md 245 LF; lead-brief-template.md 57; lessons.md 108; start-messages.md 108; worker-rules.md 50).
- Originals copied to scratchpad `s5\orig\` for the before/after check.
- Junctions in `scripts\install.ps1`: six (`Get-LinkPlan`, lines 44 to 49; also the header, lines 7 to 13).

## Plan

1. Re-base staged `SKILL.md` from the live file; base list line replaced, comment added.
2. Point 2 text: staged `SKILL.md` (old marker place near line 59), `references\usage-limits.md` (lines 38-39, 95-96,
   232), `limits-and-caps-guide.html`, other references; README line 55.
3. Point 1: `agent-team-files.html` (paths, diagram, tables, junction count, why-not-%TEMP%, stays-outside, /clear
   note); staged `agent-team-guide.html` (paths, /clear note).
4. Checks: old-place scan, junction count, quote diff, tag balance, line endings, live hash.

## Facts found

- The sweep notes `claude-context-guard\session-<session id>.json` is named only in `agent-team-files.html`
  (old line 855) and "no code writes it". Grep says otherwise: live `hooks\context-guard.mjs:301` claims a level for
  `session-${input.session_id}`, and `:435` documents the agent id `session-<session id>` for the main session. So
  the page row is true; kept, under `context-guard\`.
- `limits-and-caps-guide.html` names no team file place: its 5 bare "TEMP" hits in the sweep are CSS
  `grid-template`. Grep for `.claude`, `%`, `state`, `log`, `probe`, `slot`: no path. Left unchanged (decision).
- `agent-team-guide.html` (staged) names no team file place either; it needs only the /clear note.
- Staged `references\`: only `usage-limits.md` names old places (lines 39, 96, 232). `lead-brief-template.md:7`
  names a project's `temp\`, not ours: left.
- The staged config (S2 at work) already has `teamState`, `limitStop.logFile = logs\limit-stop.log`,
  `markerFolder = context-guard`, `onFolder = team-on`; `stateFile`, `probeWorkingFolder`, `relaunch.logFile` still
  old at 11:40. The pages use the task's layout table, not the config.

## Done

- 11:37:41 Point 2a: staged `SKILL.md` re-based from live (byte copy; hashes equal C874A196...0041). Live vs staged
  diff before the copy: only the 3 D-40 lines near 131. Base list line replaced, comment `# SKILL.md re-based
  2026-10-27 11:37:41` added at the end.
- ~11:45 Point 2b: staged `SKILL.md` lines 59-61 (marker under `%USERPROFILE%\.claude\state\software-developer-agent\team-on\`,
  setting under `teamState.folder`); `usage-limits.md` lines 38-44 reflowed with the new reading path, 96 the new
  `logs\limit-stop.log`, 232-233 the new `logs\relaunch.log`; `README.md` lines 55-57 the new marker folder.
- 11:47 Point 1a, `agent-team-files.html`: lead, glance (six junctions; state folder; /clear), words (temp term
  reworded with why; new term "The team's state folder"), example table, map SVG (viewBox 900x622; ~\.claude\skills
  3 junctions; 6 junctions; new state box with 7 child folders + NEW tag; dashed link from home box; small temp box),
  tree SVG (team-switch\ row added, rows shifted 26, viewBox 458; "Four folders"; 6 junctions), timeline SVG (row
  1 = TEAM STATE; team-on\, usage-watch\, heavy-commands\ slot-1.txt), steps 0, 1 (+ /clear note with quote), 2, 5,
  8, 9; install row; pane row; machine table regrouped; new "What stays outside" list + "The move" note; failure
  cases (marker deleted; /clear); still-open notes; developers table (teamState.folder, recordFolder, holderFolder,
  values under the state folder); footer. `class="wrap"` added on 9 list items and the state group header so long
  paths wrap at phone width (the page's `code` is nowrap; its `.wrap code` rule existed unused).
- 11:50 Point 1b, staged `agent-team-guide.html`: step 0 /clear note with quote and example; a second developers
  table for the state folder's 7 child folders; still-open note on resume measured headless only; footer.
- 11:52 Checks, all run in full after the last edit (script `scratchpad\s5\check.ps1`):
  1. Places: 110 places, 110 true (68 new, 33 stays-outside, 9 old places all inside "The move" note,
     agent-team-files.html 931-934); 29 script/setting names skipped; 1 false hit (SKILL.md:58, the command line
     naming team-on.mjs). Old-place strings elsewhere: none.
  2. Junctions: install.ps1 Get-LinkPlan 6 entries (lines 44-49). Page: six/6 at 206, 348, 379, 417, 469, 597, 833,
     1040; map 1+3+2 at 370-372. No five/5 left.
  3. Quote: 0 differences on 2 (both pages).
  4. Tags: files 1177/1177 -> 1276/1276, guide 419/419 -> 479/479, 0 nesting errors; SVG 3 + 2 blocks parse as XML.
     Line endings LF only, no CR, no BOM, before and after, all 5 files. Base list stays CRLF (47/47).
  5. Live orchestrate-agents: 45 files vs base list, 0 differ. Live SKILL.md LastWrite still 11:08:50 at 11:52.
  6. Headless Edge renders (light, dark, 1000 px, and a 390 px iframe): map, tree, timeline readable; note and
     lists wrap. Both full pages already overflow at 375 px before my change (1202 / 804 px), unchanged after.
- Edge processes started: 14 ids, all exited (checked 0 running).
