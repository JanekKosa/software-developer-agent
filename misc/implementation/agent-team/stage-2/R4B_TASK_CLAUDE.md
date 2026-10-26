# R4b: the Decisions pane never hides decisions after a failed read

Written by the task lead, 2026-10-26 18:32. The pane lives in `C:\Repos\My projects\claude-code-extensions`, folder
`decisions-pane`. `<wf>` is the working folder
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\claude-code-extensions\README.md` (the repo has no `CLAUDE.md`).
2. This file, whole.
3. The `claude-code-mods` skill, `C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`, its
   sections on the test kit and on the checks only.
4. `<wf>\R4_REPORT_CLAUDE.md`, the table of checks and how they were run.
5. In the pane: `hooks\registers.ts` (`readWaitingDecisions`, `stampOf`, `answersOf`), `hooks\poll.ts`, and in
   `tests\hooks\pane.test.ts` and `tests\support\register-world.ts` only what you need to write a test that makes a
   read fail (how the stand-in file system is set up).

Do not read: the rest of the pane, the other mods, anything under `C:\Repos\My projects\software-developer-agent`
except your progress and report files, any real `decisions\` folder.

## 2. What it is for

Registered as D-23 (the user may still choose to leave it; the agreed meanwhile is this fix). When the pane reads
the open file or the answers log at the moment an agent rewrites it, the read can fail. Today
(`registers.ts`, lines about 173-187) a failed read becomes an empty text, and that empty result is remembered under
the file's new time stamp, so the pane shows no decisions until a file changes again, possibly hours later. Example:
a lead adds blocking D-40 at 10:00:00 and the pane reads at that instant; nothing shows until the next write at
13:00.

## 3. The point

- A read of the open file or of the log that fails (the read itself throws, after the file was found) must not be
  remembered: the pane keeps showing what it showed before for that register (nothing, if it never read it), stores
  no new snapshot, and tries again at the next poll. A file that is not there stays what it is today (no entries,
  or no answers; no error).
- When the retry succeeds, the pane shows the new state as usual.
- Nothing else changes: what is shown, the notice for unreadable log lines, recording answers, D-14 (only the chat's
  own repo's register).
- Tests from the caller's side: a read of the open file that fails once, then succeeds: the decisions shown before
  stay shown during the failure and the new ones appear at the next poll; the same for the log (answers shown before
  stay, then update); a first-ever read that fails shows nothing and the next poll shows the decisions; a missing
  file is not retried as a failure (no notice, no error).

## 4. Checks

- With the `claude.exe` of Claude's VS Code extension
  (`C:\Users\user\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe`),
  in `C:\Repos\My projects\claude-code-extensions`: `claude plugin validate decisions-pane`, and
  `claude plugin test decisions-pane` through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`
  with any redirection to a log file inside the command; then the type-check the README and R4's report describe.
  Baseline: 43 tests pass, validate passes (the lead, 18:30). Expect 43 plus yours, all pass.
- **Mutation check**, in a scratch copy of the pane only: at least: the failed read remembered again (today's
  behaviour); a failed log read drops the answers shown before; a missing file treated as a failure and retried
  with a notice. Report "N of N caught"; for each not caught, add the test.

## 5. Your files, and what is not yours

Yours: `decisions-pane\hooks\registers.ts`, `hooks\poll.ts` if needed, the pane's tests and test support, and its
`README.md` if it describes reads.

Not yours: everything else; never install, enable or reload the plugin; no git command that changes anything (the
repo is shared). Another worker runs at the same time in
`C:\Repos\My projects\software-developer-agent\orchestrate-agents` (the register's `migrate`): do not touch that
folder.

## 6. How to work, progress, report

- Small run: plan for about 30 tool calls. Read the clock (`Get-Date`) for every time you write.
- Progress file: `<wf>\R4B_PROGRESS_CLAUDE.md`. Report file: `<wf>\R4B_REPORT_CLAUDE.md`: what the user sees
  differently, test counts before and after, the checks, the mutation check, what was not tested and why (the pane
  in a live VS Code), the files changed, peak memory from `run-heavy.ps1`'s last line, and the four-line report block
  (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
