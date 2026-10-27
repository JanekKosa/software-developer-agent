# P3: the switch check of the Decisions pane against the real engine

Written by the task lead, 2026-10-27 09:17 (read from the clock). `<wf>` is the working folder
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`. `<pane>` is
`C:\Repos\My projects\claude-code-extensions\decisions-pane`. `<claude>` is
`C:\Users\user\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `C:\Repos\My projects\claude-code-extensions\README.md`.
2. This file, whole.
3. `<wf>\P1_REPORT_CLAUDE.md`, whole (the run that built what you check).
4. The `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`: sections
   "Where mods live and how they load", "Keeping test agents alive long enough to watch" and "Checking against the
   real engine". Load the bundled `plugin-authoring` skill only if you need the stream-json message shapes.
5. In the pane: `hooks\team-on.ts`, `hooks\team-switch.ts`, `hooks\poll.ts`, and in `hooks\pane.tsx` the command
   (`registerPane`, `NOT_ON`). Its tests only if you must change code.

Do not read: the other mods, anything else under `C:\Repos\My projects\software-developer-agent`, any real
`decisions\` folder, transcripts (list their file names only, as below).

## 2. What it is for

P1 made the Decisions pane show only in a chat switched on with `/software-developer-agent` (the user, D-34: "the
pane checks the same marker the hooks check"). It was tested only in the test kit. Three things rest on the mod API's
docs, not on a real run: that `$.session.id()` gives the bare id (the marker's name), that `$.fs.stat` of a missing
marker fails as "not there", and what happens on `/clear` and on resume (the docs say the id changes). The last one
decides what the user is told: if the id changes, a team chat that is cleared or resumed loses its Decisions tab, and
its team hooks go quiet, until `/software-developer-agent` is typed again.

## 3. The setup: real engine, nothing live

- A scratch folder of your own (the scratchpad), holding: a copy of `<pane>` (check by hash that it equals the real
  folder when you copy it); a scratch repo (with a `.git`, as the pane needs to find a repo) whose
  `decisions\OPEN_DECISIONS_CLAUDE.md` holds one or two synthetic waiting entries, written with
  `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs' add --file <entry> --root <scratch repo>`
  (only ever with `--root` at your scratch repo); and a scratch temp folder.
- Each headless run: `<claude> -p --input-format stream-json --output-format stream-json --verbose --plugin-dir <copy> --setting-sources project`,
  run from the scratch repo, with the environment variables `TEMP` and `TMP` of that process set to the scratch temp
  folder, and a fresh `--session-id <uuid>` you generate. Messages are slash commands sent as stream-json user
  messages (no model turn is needed; if one happens, say how many). A small Node driver that keeps stdin open, writes
  or removes the marker between messages, waits, and records every output line with its time is the simplest.
- The marker is `<scratch temp>\claude-agent-team-on\<uuid>` (the folder name comes from the real
  `orchestrate-agents\orchestration.config.json`, which the pane reads read-only).
- If the scratch `TEMP` does not reach the mod (the pane then looks under the real `%TEMP%`): you may write markers
  named by uuids you generated into the real `%TEMP%\claude-agent-team-on`, list each one in your progress file at
  once, and delete exactly those at the end. Touch no other file there.
- Never install, enable or reload a plugin; never run against the real `<pane>` folder (only the copy); no git command
  that changes anything outside your scratch repo.

## 4. The scenarios (each one a headless run, or a step of one)

1. **Off**: no marker. At start no pane opens (no `ui_panes` message with the Decisions pane); `/decisions-pane`
   answers exactly the `NOT_ON` line, and no pane opens.
2. **On at start**: marker written before the start. The pane opens by itself (waiting entries exist). This proves
   `$.session.id()` gives the bare id.
3. **Switched on mid-chat**: start off, then write the marker, wait 5 seconds, send nothing: the pane opens by itself
   at a look (a `ui_panes` message), without a reload.
4. **Marker removed**: on at start, remove the marker, wait 5 seconds: the pane closes; then `/decisions-pane` answers
   the `NOT_ON` line. This proves a missing marker reads as "not there", not as a failed look.
5. **/clear**: on at start, send `/clear`, then `/decisions-pane`. Record the answer, whether the pane closed, and the
   names of the transcript files in that run's `~\.claude\projects\<scratch repo>\` folder before and after (names
   only; a new file means a new session id, which is what the team's hooks get).
6. **Resume**: with the marker of a finished run's uuid still there, `<claude> -p --resume <uuid> ...` (same flags,
   no `--session-id`), then `/decisions-pane`. Record whether the pane shows or the `NOT_ON` line comes, and the
   transcript file names.

If `/clear` or `--resume` cannot be driven headless, say so and why; do not build around it.

Expected for 1-4: as written. For 5 and 6 nothing is expected: record what the real engine does.

## 5. If the real engine disagrees with the pane

Fix it only when the fix is small and inside `<pane>\hooks`, with a test that fails before and passes after; then
run `claude plugin validate decisions-pane`, `claude plugin test decisions-pane` (107 at P1's end) and the type-check
(P1 left `checks.ps1` and `tc\tsconfig.json` in its scratchpad; its report names them), and a mutation check of the
fix in a scratch copy ("N of N caught"). Otherwise stop and end with `QUESTION FOR THE LEAD | <what disagrees>`.
Nothing about `/clear` or resume is to be fixed: it is reported.

## 6. Your files, and what is not yours

Yours: your scratch folder; `<pane>\hooks\*` and the pane's tests only under section 5.

Not yours: everything else. Another worker (P2) is changing `C:\Repos\My projects\software-developer-agent\agent-team-files.html`
and `...\orchestrate-agents\references\agent-team-guide.html` now. Never write, change or remove a marker other than
your own uuids'; never a file under `~\.claude` (you only list transcript names).

## 7. How to work, progress, report

- Plan for about 50 tool calls. Every headless run (or the driver that runs several) and every test run through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with any redirection to a log file inside the command. Read the clock (`Get-Date`) for every time you write. Update
  the progress file after every scenario. Stop every process you started, by its id; at the end none runs.
- Progress file: `<wf>\P3_PROGRESS_CLAUDE.md`. Report file: `<wf>\P3_REPORT_CLAUDE.md`: per scenario what was sent,
  what came back (the decisive output lines, short), and passed or not; what `/clear` and resume do to the session id,
  in plain words with one example; any model turns used; what was not checked and why (the tab's place beside the
  Agents tab, and anything drawn, need a VS Code chat); the scratch files and markers you made and removed; peak memory
  from `run-heavy.ps1`'s last line; and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`,
  `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
