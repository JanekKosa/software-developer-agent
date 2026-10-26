# Agent team, stage 1: continuation plan

Written 2026-10-25 by the first main session, near its context cap, for a session that has read nothing.

## The user's request, in their words

Lower token use and raise speed and quality of their agent team, while they keep "full control over the changes,
decisions made by agent (initiative), any issues found". Workers report to leads, leads to main, main to the user
in points (`explain-clearly`). Caps: workers 400k, leads 500k, main 500k; Opus 5.5 xhigh for leads and workers;
Haiku 5.5 for searching only; a `decisions/` register; near a usage limit, resume if every cache survives the
reset, else hand over and auto-start a new VS Code chat after the reset. Haiku 5.5 at low effort reads the limits
("fuck the wrapper just use haiku calls").

## State

- Everything built and checked is listed in `misc/reports/AGENT_TEAM_STAGE_1_REPORT_CLAUDE.md` ("Where the stage
  stands" and session 1). Read that first.
- Run D (integration fixes, task file `D_TASK_CLAUDE.md` in this folder) was started by the first session as a
  background `software-developer` agent. Its progress file is `D_PROGRESS_CLAUDE.md` and its report
  `D_REPORT_CLAUDE.md`. A new session cannot message it; if its report is missing or partial, read the progress
  file and start a fresh `software-developer` agent for what is left, with the same task file plus "what is done".
- **Update 10:35:** run D was stopped by the context guard at 320k (live proof that the guard works in VS Code),
  partly done: the Node half and the reminder are done (79 of 79 tests); the PowerShell half, the stale document
  lines and `team-rules` are not. Run E (`E_TASK_CLAUDE.md`, progress `E_PROGRESS_CLAUDE.md`, report
  `E_REPORT_CLAUDE.md`) was started at 10:35 to finish them. The main session decided: drop
  `probeEveryMinutes`; `run-heavy.ps1`'s free-memory floor goes into the config at 600 MB.
- The hooks are wired in `~/.claude/settings.json` (PostToolUse context-guard, UserPromptSubmit decision-reminder).
  Run D changes the hook files' behaviour, not their paths.

## Next step

**Update 11:05: runs D and E are done.** The main session re-ran both suites (79 of 79, 70 of 70) and linked
`team-rules`. Steps 1 and 2 below are done. What is left: the five questions in the stage report's "Where the stage
stands"; run E's mutation check and probe run (commands in `E_PROGRESS_CLAUDE.md`); first real use; commits, only
when the user asks.

**Update 16:57: the user answered the five questions** ("go onto do point 1-5"; point 4 dropped: answers stay in
the literal `@'...'@` form, no `--answer-file`).

- Points 3 and 5 (finished agents do not count; `watch-agent.ps1` reads the type from `.meta.json`) and run E's
  missing mutation check and probe run are with **run F** (`F_TASK_CLAUDE.md`, progress `F_PROGRESS_CLAUDE.md`,
  report `F_REPORT_CLAUDE.md`), started 16:53. Check its result from disk; re-run both suites.
- Point 1: a real relaunch was scheduled for 16:59 (`ClaudeRelaunch-xpp-agent-202610251659`, test hand-over
  `RELAUNCH_TEST_HANDOVER_CLAUDE.md` in the first session's scratchpad). Its log is
  `%USERPROFILE%\.claude\state\relaunch.log`; check it and `Get-ScheduledTask ClaudeRelaunch*` (it should be gone),
  and ask the user whether a chat opened and replied "Relaunch test OK".
- **Point 1 result (17:02): the relaunch hung after step 3.**
  - The task fired at 16:59:39.
  - Step 1 ran `code.cmd` on the folder.
  - Step 2 found 2 VS Code windows, with xpp-agent's in front.
  - Step 3 opened the `vscode://anthropic.claude-code/open?prompt=...` link at 16:59:52 and logged "waiting 20 s".
  - Correction, 17:02: it did not hang for good. Step 4 was logged at 17:01:35, "pressed Enter; the new session
    has its prompt": 103 s after step 3, where 20 s were expected. The task was still `Running` at 17:01:29, and
    the first session stopped and unregistered it right after Enter was pressed.
  - **Cause confirmed by the user (17:04):** VS Code was waiting for them to allow the link ("yes vs code was
    waiting for me to allow the link to open a window"). For unattended relaunches, the "Allow 'Claude Code' to
    open this URI?" dialog must have "Do not ask me again for this extension" ticked once. The user ticked it
    (17:06), so later relaunches open without the dialog. Still to ask: whether the new chat replied "Relaunch test
    OK".
  - Earlier note, now mostly answered: what the user saw (did a chat open with the prompt filled in, did VS Code show "Allow 'Claude Code' to
    open this URI?"), and where the script hangs (the wait, the foreground check, or `SendKeys.SendWait` while a
    modal dialog is up).

  Ask the user first. Then debug it as a run of its own: log before and after each call, add a timeout around
  SendKeys, run it by hand rather than through the task, and make the script check for the Allow dialog. Write a
  bug file in `misc/bugs/`.
- **Point 2, measured 16:55-16:56 with two Haiku agents:**
  - A `SendMessage` to a lead that is blocked inside a foreground Agent call (waiting on its worker) is queued "for
    delivery at its next tool round". So it arrives only after the worker returns, and STOP FOR LIMIT does not
    reach a waiting lead in time.
  - `TaskStop` on that lead stopped its worker too. The worker's `ping` process was gone within 5 seconds, and its
    transcript stopped at the moment of the stop.
- **Next step, proposed by the first session and not yet put to the user:** deliver the limit stop through the
  context-guard hook instead of messages. On `LIMIT NEAR | HAND OVER`, the watch (or main) writes a flag file, for
  example `%USERPROFILE%\.claude\state\limit-stop-<session>.json`. The PostToolUse context-guard hook checks it on
  every tool call of every agent of that session and adds "STOP FOR LIMIT: close now" once per agent. Workers then
  close at their next tool call. Their return wakes the lead, whose next tool round gets the same text. No agent
  needs to be messaged, and nothing depends on who is blocked. Tell the user in one paragraph with this example,
  then build it as one run (hook + watch + docs + tests).

The original steps:

1. Check run D from disk: both suites green through `run-heavy.ps1` (`node --test "tests/**/*.test.mjs"` and
   `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` in `C:\Repos\My projects\software-developer-agent\orchestrate-agents`),
   `team-rules` exists and is in both agents' `skills:`, and the config holds no value the code repeats.
2. Link `team-rules` into `~/.claude/skills` and `~/.copilot/skills` (directory junctions), unless run D's
   install test showed the user should run `scripts\install.ps1` instead.
3. Add a session-2 section to the stage report and rewrite "Where the stage stands".
4. Ask the user the four waiting questions in the report, in plain words, one example each.
