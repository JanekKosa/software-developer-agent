# P1: the Decisions pane shows only in a chat switched on for the agent team

Written by the task lead, 2026-10-27 08:50. The pane lives in `C:\Repos\My projects\claude-code-extensions`, folder
`decisions-pane`. `<wf>` is the working folder
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the agent repo's rules; short).
2. `C:\Repos\My projects\claude-code-extensions\README.md` (that repo has no `CLAUDE.md`).
3. This file, whole.
4. The `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`, whole (11 KB),
   and the bundled `plugin-authoring` skill (load it with the Skill tool) for the mod API: what `$` offers, the
   events' fields, how a command says something in the chat.
5. The mod API's types (the pane's `README.md`, section "Checks", says where they are and how the type-check runs).
   Search them; do not read them whole.
6. In the pane: `README.md`, `hooks\register.tsx`, `hooks\poll.ts`, `hooks\registers.ts` (only `CONFIG_FILE`, the
   config reader and how it uses `$.env`), `hooks\pane.tsx` (the command and how the pane opens), `hooks\settings.ts`,
   and `tests\support\register-world.ts` (how a session is started, how the stand-in file system and `$.env` work).
   Read `tests\hooks\pane.test.ts` by its test names, then only the tests you need as a model.
7. The rule you copy: `C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\agent-team.mjs` (60 lines),
   and line 45 of `orchestrate-agents\lib\limit-stop.mjs` (`SESSION_ID_PATTERN`).

Do not read: the other mods, anything else under `C:\Repos\My projects\software-developer-agent`, any real
`decisions\` folder, transcripts.

## 2. What it is for

Since 2026-10-26 the agent team runs only in a chat the user switched on with `/software-developer-agent`. That
command writes a marker file for the chat's session; the team's two hooks do nothing in a session without one. The
Decisions pane does not check it yet, so an ordinary chat in a repo with waiting decisions still shows the Decisions
tab. The user's words: "If i dont run the team agent, an oridnary chat is an ordinary chat with no processes etc"
(D-32), and "the pane shows only in a chat switched on with /software-developer-agent ... the pane checks the same
marker the hooks check" (D-34).

## 3. The rule you copy (exactly)

- The marker is `<temp folder>\<agentTeam.onFolder>\<session id>`. `agentTeam.onFolder` is in the team's
  `orchestration.config.json` (the file the pane already reads; today `claude-agent-team-on`).
- The temp folder is what Node's `os.tmpdir()` gives on Windows: `TEMP`, else `TMP`, else `%SystemRoot%\temp` (else
  `%windir%\temp`), with a trailing backslash dropped. Read the variables with `$.env.get`. Say in the report what
  you do on other systems.
- A session id that is missing, not a string, or does not match `/^[A-Za-z0-9-]{1,128}$/` counts as off.
- A folder setting that is missing, not a string, or not one folder name (`/^(?!\.{1,2}$)[^\\/:*?"<>|]+$/`) counts as
  off (the library throws there; the pane shows nothing it cannot vouch for).
- On = the marker exists. Never write, change or remove a marker; the pane only looks.
- Copy the rule into the pane (a mod does not import from the agent repo); name its source in a comment.

## 4. The points

**Gate, first, before any build: how does the pane learn its session id?** Find it in the mod API (an event's field,
`$` member, or anything else) and whether it is the same id the hooks get as `session_id` and `team-on.mjs` reads from
`CLAUDE_CODE_SESSION_ID`. Write, at once, as the first line under the title of your progress file, one of:
`FEASIBLE | yes | <where the id comes from, exact name>` or `FEASIBLE | no | <why, and what exists instead>`. The lead
waits for this line before starting another worker. If no: stop there and end with a final message
`QUESTION FOR THE LEAD | no session id: <what exists instead>`. Also note whether the API says the id changes on
`/clear` or on resume (report only; change nothing for it).

**Point A: the switch check, at every look.**
- In a chat whose session has no marker the pane shows nothing: no tab, no opening by itself, no rows. It reads only
  what the check needs (the config file and the marker): no stat or read of any `decisions\` file, no register search.
- The check runs at session start and at every look of the poll (every `pollMs`). A marker written after the pane
  loaded (the user types `/software-developer-agent` in an open chat) shows the pane from the next look, without a
  reload: the register is found and read at that look, and from then on everything works as today (opening by itself
  only as today's rules say).
- A check that fails for another reason than "not there": keep the last on/off state, retry at the next look (as the
  pane already does for a failed read, D-23). A marker that disappears: off at the next look, the pane closes.

**Point B: `/decisions-pane` in a chat that is not switched on** says this one line in the chat, and opens no pane:
`The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.`
(The text is fixed by the lead; another worker writes it into the guide pages now.) Use whatever the mod API gives a
command to say a line; say in the report which. In a switched-on chat the command works as today.

**Tests, from the caller's side** (the test kit, `claude plugin test`): no marker with waiting decisions on disk = no
pane, no tab, and the stand-in file system saw no access under the register folder; marker at start = as today (the
existing 53 tests must keep passing: give the test world a marker by default and an option for "off"); marker written
after start = the pane at the next look; each unsafe id and folder setting = off; `TEMP` missing = `TMP` is used; a
trailing backslash; a failed check while on = still shown, fine at the next look; marker removed = closed at the next
look; the command when off = the line and no pane; the command when on = as today.

## 5. The invariant and the mutation check

- **Invariant, against real material, touching nothing live**: compare the pane's rule with `isTeamOn` and
  `teamOnMarkerPath` of `orchestrate-agents\lib\agent-team.mjs` (import it read-only; do not edit it) over at least 40
  session ids: every file name in the real `%TEMP%\claude-agent-team-on` folder (list it read-only; it holds this
  chat's marker), invented valid ids that have no marker, and unsafe ones (`..`, `a\b`, `a/b`, empty, 129 characters,
  spaces, a drive letter, null). Same on/off and, for valid ids, the same path. Report "0 differences on N". Put any
  script for it in your own scratch folder, not in either repo. If the pane's rule cannot run outside the engine,
  export it as a pure function (no `$`) so it can.
- **Mutation check**, in a scratch copy of the pane only (never in the real folder): at least: the check skipped
  (always on); the id pattern loosened; the check only at session start (no later switch-on); a failed check counted
  as off; a register read before the check; the command opening an empty pane instead of the line; the `TMP` fallback
  dropped; a removed marker not closing the pane. Report "N of N caught"; for each not caught, add the test.

## 6. Checks

- With `C:\Users\user\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`,
  in `C:\Repos\My projects\claude-code-extensions`: `claude plugin validate decisions-pane`, and
  `claude plugin test decisions-pane` through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  with any redirection to a log file inside the command; then the type-check the pane's README describes. Baseline:
  53 tests pass, validate passes (2026-10-26 21:45). Expect 53 plus yours, all pass, and the type-check clean.

## 7. Your files, and what is not yours

Yours: `decisions-pane\hooks\*` (a new file for the switch check is fine), `decisions-pane\types\index.d.ts`, the
pane's tests and test support, and its `README.md` (a short part on "only in a switched-on chat" under "Showing and
hiding it", and the command's line).

Not yours: everything else. In particular nothing under `C:\Repos\My projects\software-developer-agent` (another worker
may soon change `orchestrate-agents\references\agent-team-guide.html` and `agent-team-files.html` there), no marker
file, no other mod, no `plugin.json` change unless the check cannot work without it (then ask first). Never install,
enable or reload the plugin; no git command that changes anything (the repo is shared). The pane folder is loaded by
every new chat from disk: never leave it broken between steps, and leave it working at the end.

## 8. How to work, progress, report

- Plan for about 75 tool calls: gate, A, B, tests, invariant, mutation check, README, in that order. If the context
  warning comes before the mutation check, stop building, write what is done, and say so: a next run takes the
  mutation check; never drop it silently.
- Every heavy command (type-check, test suite) through `run-heavy.ps1`. Read the clock (`Get-Date`) for every time
  you write. Update the progress file after every point.
- Progress file: `<wf>\P1_PROGRESS_CLAUDE.md`. Report file: `<wf>\P1_REPORT_CLAUDE.md`: what the user sees
  differently (one example each), where the session id comes from, test counts before and after, the checks, the
  invariant ("0 differences on N"), the mutation check ("N of N caught"), what was not tested and why (a real VS Code
  chat and the real engine are not tested here: a next run does the real engine), the files changed, peak memory from
  `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`,
  `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
