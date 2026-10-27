# Lead file: the Decisions pane only in a switched-on chat (D-34)

Lead started 2026-10-27 08:40. Task file: `PANE_SWITCH_TASK_CLAUDE.md` (main session, 08:41). Working folder: this
folder (`<wf>` = `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`). Code:
`C:\Repos\My projects\claude-code-extensions\decisions-pane`.

## State (keep first)

- 08:42 hash list of both repos + `~\.claude\settings.json` + `~\.claude\CLAUDE.md` taken: `<wf>\P_HASHES_BEFORE.csv`
  (2463 files).
- Free memory 08:40: 2972 MB.
- P1: see the runs table.
- 09:32 TASK DONE: P1, P2, P3 done and checked; D-35 open (low); summary `PANE_SWITCH_SUMMARY_CLAUDE.md`. Pane needs
  main's `/reload-plugins` to go live.

## The user's words

- D-32 (2026-10-26 23:12): "If i dont run the team agent, an oridnary chat is an ordinary chat with no processes etc"
- D-34 (2026-10-27 08:39): "Chose A: the pane shows only in a chat switched on with /software-developer-agent (one
  small run in claude-code-extensions: the pane checks the same marker the hooks check)."

## Facts read (so a successor need not re-read)

- Marker: `os.tmpdir()\<agentTeam.onFolder>\<session id>`, folder `claude-agent-team-on`
  (`orchestration.config.json` line 124). Rule in `orchestrate-agents\lib\agent-team.mjs` (`isTeamOn`): id must be a
  string matching `SESSION_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/` (`lib\limit-stop.mjs:45`), else off; folder must be
  one folder name (`/^(?!\.{1,2}$)[^\\/:*?"<>|]+$/`), else it throws. `team-on.mjs` takes the id from
  `CLAUDE_CODE_SESSION_ID`.
- The pane reads `orchestration.config.json` already (`hooks\registers.ts`, `CONFIG_FILE`), and has `$.env.get`
  (registers.ts:144 reads USERPROFILE). `session.start` handler in `hooks\register.tsx` calls `startPoll($, e.cwd, ...)`.
  The test kit's `session.end` stand-in answers `{ sessionId: e.sessionId }`, so events carry a session id somewhere;
  whether `session.start` does is P1's first point.
- The claude-code-mods skill: a pane opens at `session.start` to sit left of the Agents tab; no API orders tabs. A pane
  opened later (team switched on mid-chat) may sit right of the Agents tab: P1 reports it, it is not a defect to fix.
- Stale words seen, out of scope (hooks/scripts/config must not change in this task): `lib\agent-team.mjs` line 2 and
  `orchestration.config.json` `_whyOnFolder` still name the command `/orchestrate-agents`; the command is
  `/software-developer-agent` (`team-switch\SKILL.md`). Goes into the summary for the main session.

## Plan (runs in order)

1. **P1, pane: the switch check and the command's line.** Points: (a) the poll checks the marker at every look; no
   marker = no tab, no opening, no rows, no register read; a marker that appears later shows the pane at the next
   look (task points 1-3); (b) `/decisions-pane` in an off chat prints one line (task point 4). Gate first: how a
   plugin learns its session id; none = stop and ask. Then tests, README, the id-rule cross-check against
   `lib\agent-team.mjs` (0 differences on N), mutation check. Why so: points 1-3 are one mechanism, 4 is the second
   point; all in the pane folder.
2. **P2, agent repo: the two guide pages** (`orchestrate-agents\references\agent-team-guide.html`, 5 hits;
   `agent-team-files.html`, lines 575, 705, 801, 902 open item, 954). Starts only once P1's progress file says the
   session id is reachable (`FEASIBLE | yes`). Files disjoint from P1. The behaviour and the line's text are fixed by
   this lead (below), so P2 need not wait for P1's code.
3. **P3, pane: real-engine check** (headless, per the claude-code-mods skill's "Checking against the real engine"),
   with `TEMP` pointed at a scratch folder and a fixed `--session-id`, so nothing live is touched: off = no Decisions
   pane, marker written = pane, marker written after start = pane at the next look, the command's line when off. Also
   P1's mutation check if P1 had no room for it. Why separate: P1's build + tests + mutation fill ~75 tool calls.

## Decisions (lead) with reasons

- The line `/decisions-pane` prints in an off chat (task point 4: "in one line, that the team is not on in this chat
  and how to switch it on"): `The agent team is not on in this chat. Type /software-developer-agent to switch it on;
  the Decisions pane then shows here.` Fixed here so P2 can describe it while P1 builds. Wording only; the user asked
  for the content.
- Marker checked at every look (2 s), not cached once on: the hooks check at every call ("the same rule"), and one
  file check per 2 s costs nothing.
- A check of the marker that fails for another reason than "not there": keep the previous on/off state and retry at
  the next look (same as D-23 for register reads). Not there = off.
- A marker that disappears mid-chat (temp cleanup): off at the next look, the pane closes. Consistent with "shows
  only in a switched-on chat"; rare.
- Config missing, unreadable, or `agentTeam.onFolder` missing or not one folder name: off (the lib throws there; the
  pane never shows a team pane it cannot vouch for). P1 may name the cause in the command's line; it reports which.
- Temp folder: the same as Node's `os.tmpdir()` on Windows (`TEMP`, else `TMP`, else `%SystemRoot%\temp`, trailing
  backslash dropped), read with `$.env.get`.
- Off = no register read: only the config file and the marker are touched (task point 1). The register is found at
  the first look that is on.

## Runs

| Run | Agent id | Started | Task file | Progress file | State |
| --- | --- | --- | --- | --- | --- |
| P1 | a04a592b6ffd74265 | 08:44 | P1_TASK_CLAUDE.md | P1_PROGRESS_CLAUDE.md | done 09:14 (335k, 162 calls, 30 min; the Agent call waited, so P2 could not start beside it); checked 09:20, see below |
| P2 | a59bf7c1c74061810 | 09:19 | P2_TASK_CLAUDE.md | P2_PROGRESS_CLAUDE.md | done 09:27 (158k, 75 calls, 8 min); checked 09:32 |
| P3 | a411ba3ca1e4b2839 | 09:19 | P3_TASK_CLAUDE.md | P3_PROGRESS_CLAUDE.md | done 09:30 (176k, 56 calls, 11 min); checked 09:32 |

### P2 and P3 check by the lead (09:30-09:32)

- Hashes against `P23_HASHES_BEFORE.csv`: changed only `agent-team-files.html`, `orchestrate-agents\references\agent-team-guide.html`,
  and working folder files. Nothing in claude-code-extensions changed (P3 needed no fix). Real marker folder: only
  `bf7022c6-...`, as before.
- P2: the NOT_ON quote at agent-team-files.html:599, the marker row at 854 names the pane, the guide's new bullet at
  517 points at "step 0", which exists (line 439). No test reads the pages; Node and PS suites not rerun (no code in
  orchestrate-agents changed).
- P3: read `scratchpad\p3\logs\removed-summary.txt` (pane shown 1.3 s, marker removed 8.0 s, `panes:[]` 9.3 s, then
  the NOT_ON line, 0 turns) and `resume-hooks-summary.txt` (same id after `--resume`, pane shown 1.7 s).
- Sorted: /clear (P1 issue 3+4, P3 issue 2) registered as D-35 (issue, low, A recommended). Resume keeps the id
  (P3 issue 1): good news, inside D-35's text. For the summary: config `_whyOnFolder` and lib line 2 name
  `/orchestrate-agents` (P2 issue 1, my own find); agent repo README lines 11-12 and 55-56 do not say the pane stays
  hidden (P2 issue 2); the engine's leftovers of P3 under `~\.claude\projects\...-scratchpad-p3-repo` and maybe
  `~\.claude.json` (P3 issue 5); skill lines for claude-code-mods (P1 issue 1, P3 issues 3, 4, and resume). Lead file
  only: P2's three decisions and two initiatives, P3's decisions and initiatives, P3 issue 6 (no-surface headless).

09:19: hashes before P2/P3 in `P23_HASHES_BEFORE.csv` (2473 files). Real marker folder holds one marker,
`bf7022c6-...` (this chat, 26.10 23:14). Free memory 3050 MB.

Note: P1's task file header says 08:50; the file was written at 08:44 (time guessed, not read; the file's write time is right).

### P1 check by the lead (09:14-09:20)

- Report read whole. `claude plugin test decisions-pane` 107 pass 0 fail (4 files), validate passed, tsc (the
  worker's `scratchpad\tc\tsconfig.json`, TypeScript of claude-toolbar's node_modules) exit 0 no output; run through
  run-heavy by the lead with the worker's `scratchpad\checks.ps1` (logs in the scratchpad: validate.log, test.log,
  tsc.log, lead-p1-checks.log).
- Hashes against `P_HASHES_BEFORE.csv`: changed only README.md, hooks\pane.tsx, poll.ts, registers.ts,
  tests\hooks\pane.test.ts, tests\support\register-world.ts; new hooks\team-on.ts, team-switch.ts,
  tests\hooks\team-on.test.ts, team-switch.test.ts; plus the working folder files. `~\.claude\settings.json`,
  `~\.claude\CLAUDE.md`, decisions\, orchestrate-agents\ unchanged.
- Contract read: `team-on.ts` (pure rule, same patterns as the lib, path `<temp>\<onFolder>\<id>`), `team-switch.ts`
  (`lookAtSwitch`: `$.session.id()`, TEMP/TMP/SystemRoot/windir, config via `configPath`, `$.fs.stat`; not-there =
  false, other failure = null = keep), `poll.ts` (switch first; off = NOTHING written, pane closed, registers found at
  the first on look), `pane.tsx` command (`readRegisters` fresh; off = `{ text: NOT_ON }`, text byte-equal to the
  lead's line).
- Session id: `$.session.id()`, "the transcript file's name". API docs: the id changes on `/clear` and on resume, and
  no `session.start` fires after `/clear`. Not tried live: P3 checks it.

### P1's report block, sorted by the lead

- Lead file only (technical, inside the task): D1 settings half written = keep last state; D2 Windows rule everywhere
  (team is Windows-only; pane stays off elsewhere); D3 command reads afresh; D4 stat not exists; D5 id read at every
  look. I1-I5 (extra pure tests, configPath/isNotThere exported, runCommand moved, README options line, wider
  invariant). Issue 2 (D14b fixed), 5 (LICENSE/ICON notes, only for a directory submission), 6 (worker's guessed
  times, corrected).
- For the summary (main session's text): issue 1, a line for the claude-code-mods skill (test kit normalises paths
  before stand-ins see them).
- To register after P3 grounds it: issue 4 (+3): after `/clear` (and maybe resume) the chat has a new session id with
  no marker, so the Decisions tab closes, an unsent comment in it is lost, and the team's hooks go quiet until
  `/software-developer-agent` is typed again.

## Register ids raised

- D-35 (09:31): issue, low, not blocking: /clear gives a new session id, so the team is off in the cleared chat (tab
  closes, unsent comment lost, hooks quiet) until /software-developer-agent again. Options A docs line (recommended),
  B carry over automatically, C nothing. Told main `REGISTERED | D-35`.

## For a successor

Read: this file, `PANE_SWITCH_TASK_CLAUDE.md`, the brief, the newest run's report. Skip: the R* files (answers log
task, done), the hash CSVs (compare with a script, never read).
Check a pane run: in `C:\Repos\My projects\claude-code-extensions`, with
`C:\Users\user\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`:
`plugin validate decisions-pane`, and `plugin test decisions-pane` through run-heavy.ps1 (baseline 53/53).
