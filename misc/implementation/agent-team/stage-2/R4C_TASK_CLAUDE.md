# R4c: the Decisions pane: a failed size check is a failure too, and a read that keeps failing is said

Written by the task lead, 2026-10-26 19:07. The pane lives in `C:\Repos\My projects\claude-code-extensions`, folder
`decisions-pane`. `<wf>` is the working folder
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\claude-code-extensions\README.md` (the repo has no `CLAUDE.md`).
2. This file, whole.
3. `<wf>\R4B_REPORT_CLAUDE.md`, whole (the run before you, same files).
4. The `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`: the sections
   on the test kit and on the checks only.
5. In the pane: `hooks\registers.ts` (`readWaitingDecisions`, `readRegister`, `readFound`, `stampOf`),
   `hooks\poll.ts`, `hooks\decision-state.ts` (how the log notice is stored and drawn), and in
   `tests\hooks\pane.test.ts` and `tests\support\register-world.ts` only the tests D28-D31 and the stand-in file
   system's failure hooks R4b added.

Do not read: the rest of the pane, the other mods, anything under `C:\Repos\My projects\software-developer-agent`
except your progress and report files and `orchestrate-agents\scripts\run-heavy.ps1`'s first 40 lines, any real
`decisions\` folder.

## 2. What it is for

The user chose D-23 A: "after a failed read, keep showing what was there and try again at the next look, 2 seconds
later ... Comment: A and i assuem you mean a retry mechanism after a fail". R4b built it for a failed read of the
file's text. Two gaps remain, both found by R4b:

- A failed check of a file's size and time (`stampOf`, `$.fs.stat`) still counts as "the file is missing", so for
  one look the pane shows no decisions (its tab may close and open again 2 seconds later). Only a file that is really
  not there may count as missing; any other failure of the check is a failed read: keep what was shown, retry at
  the next look.
- A file that stays unreadable shows its last good state with no sign that it is out of date.

## 3. The point

- `stampOf` (or its caller) tells "not there" apart from "could not check": not there = as today; could not check =
  the same as a failed read since R4b (keep the last good state, store nothing, retry next look). If the engine's
  `stat` does not let you tell them apart, find what does (for example `$.fs.exists`, or the error's code), and say
  in the report what you used and why.
- When the reads of a register have failed for 30 seconds in a row (by the engine's clock), the pane says so once,
  in the same orange notice place the unreadable-log line uses, in plain words, for example: `The decisions file
  could not be read since 10:00:05; the pane shows what it held before and keeps trying.` The line goes away at the
  first good read.
- Tests from the caller's side: a stat that fails once (not "not found") keeps the decisions shown and they update
  at the next look; a file that is really removed still shows as no decisions, with no notice; reads failing for 30
  seconds show the notice once, and the next good read clears it; a single failed read shows no notice.

## 4. Checks

- With `C:\Users\user\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`,
  in `C:\Repos\My projects\claude-code-extensions`: `claude plugin validate decisions-pane`, and
  `claude plugin test decisions-pane` through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  with any redirection to a log file inside the command; then the type-check the README and R4's report describe.
  Baseline: 47 tests pass (R4b, about 18:45). Expect 47 plus yours, all pass.
- **Mutation check**, in a scratch copy of the pane only: at least: a failed stat counted as missing again; the
  notice shown after the first failure; the notice never cleared; a removed file reported as a failure. Report
  "N of N caught"; for each not caught, add the test.

## 5. Your files, and what is not yours

Yours: `decisions-pane\hooks\registers.ts`, `hooks\poll.ts` and `hooks\decision-state.ts` if needed, `hooks\pane.tsx`
only if the notice needs it, the pane's tests and test support, its `README.md` where it describes reads.

Not yours: everything else; never install, enable or reload the plugin; no git command that changes anything (the
repo is shared). Another worker runs at the same time in
`C:\Repos\My projects\software-developer-agent\orchestrate-agents` (the Decision answers watch): do not touch that
folder.

## 6. How to work, progress, report

- Small run: plan for about 35 tool calls. Read the clock (`Get-Date`) for every time you write.
- Progress file: `<wf>\R4C_PROGRESS_CLAUDE.md`. Report file: `<wf>\R4C_REPORT_CLAUDE.md`: what the user sees
  differently, test counts before and after, the checks, the mutation check, what was not tested and why, the files
  changed, peak memory from `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`,
  `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
