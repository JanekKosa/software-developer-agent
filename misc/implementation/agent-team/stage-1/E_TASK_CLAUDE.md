# Run E: finish run D (task file)

Run D was stopped by the context guard at 320k, partly done. You finish it. Same rules as run D: work in
`C:\Repos\My projects\software-developer-agent` only; never commit; never edit any `CLAUDE.md`, any Claude or VS Code
settings file, or anything outside that repo; never start, stop or message agents or sessions; never open a
`vscode://` link or send keystrokes.

Read first, and no more: `D_TASK_CLAUDE.md` (this folder; the points), `D_PROGRESS_CLAUDE.md` (what is done, the
exact contract for the PowerShell half, the stale document lines found so far), the last section of
`D_REPORT_CLAUDE.md`, and the config `orchestrate-agents\orchestration.config.json`. Then the files you change.
Trust the disk over the progress file: list the changed files with their times before you start.

Progress file: `E_PROGRESS_CLAUDE.md`; report: `E_REPORT_CLAUDE.md` (this folder). Plan for about 70 tool calls.
Run every heavy command through `orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600` (this machine has about
700-1000 MB free).

## What is left

1. **D's points 1 and 2 in the four PowerShell limit scripts**, to the contract in `D_PROGRESS_CLAUDE.md`, until
   the 13 failing PowerShell tests pass; then delete the three guard lines D added. One change to that contract
   (main session's decision): **drop `probeEveryMinutes`**; the far interval is `stateFreshMinutes`. Keep
   `probeNearEveryMinutes` for near a threshold.
2. **`run-heavy.ps1` and `watch-agent.ps1` read the config too.** `run-heavy.ps1`'s free-memory floor (1500 MB
   today, never reached on this machine, so heavy commands wait 60 minutes and give up) becomes a config key with
   a `_why`, default 600; its slot count and wait time too. `watch-agent.ps1` takes its warning size from
   `contextCaps` for the agent type it is given (it still says "the cap is 500,000"). A passed parameter still
   overrides.
3. **D's point 4**: the stale document lines (D's list, then a fresh check of every document against the code).
4. **D's point 5**: the `team-rules` skill, the two agent files, `install.ps1` (with its scratch-home test),
   `README.md`.
5. **Checks**: both suites green, the parser, `node --check`, the doc check, the `install.ps1` scratch test, one
   real probe run, and a mutation check on the PowerShell changes.
