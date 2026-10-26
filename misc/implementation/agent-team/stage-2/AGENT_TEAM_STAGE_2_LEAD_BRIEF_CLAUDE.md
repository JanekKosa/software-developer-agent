# Agent team, stage 2: lead brief

It binds every task lead of the agent team's stage 2 (repo `C:\Repos\My projects\software-developer-agent`). Read it
whole after the repo's `CLAUDE.md`.

## Where things are

- Working folder for lead files, task files, reports and `entry.json`: `misc\implementation\agent-team\stage-2\`.
  It is kept; nothing in it is wiped.
- Status file (one row per run): `misc\implementation\agent-team\stage-2\STATUS_CLAUDE.md`. Sizes file (every run's
  size, tool calls, minutes, peak memory): `misc\implementation\agent-team\stage-2\SIZES_CLAUDE.md`. Create both on
  your first turn if they do not exist.
- The task: `misc\implementation\agent-team\stage-2\ANSWERS_LOG_TASK_CLAUDE.md`.
- The decision register: `decisions\` at this repo's root (committed here, but nothing is committed yet). Register
  with `--root 'C:\Repos\My projects\software-developer-agent'`, also for items about the pane in the other repo.

## Workers

- Worker type: `software-developer`.
- Every task file makes the worker read first: this repo's `CLAUDE.md` and `README.md`; for pane work also the
  `claude-code-mods` skill (`C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`) and the pane's
  `README.md`.
- Files no worker may edit: the vendored `skills\` folder; `decisions\*.md` (only `register.mjs` writes them, and
  never against this repo's real register except `add` by the lead); `C:\Users\user\.claude\CLAUDE.md` and its
  Copilot twin; `~\.claude\settings.json`; anything under `~\.copilot`.

## Checks

- Baseline, verified by the main session on 2026-10-26: `node --test` in `orchestrate-agents\`, 154 tests, all
  pass (14:27). `pwsh -NoProfile -File tests\limit-scripts.tests.ps1` in `orchestrate-agents\`, 104 passed, 0 failed
  (15:02; it waited 9 minutes for a slot and ran 4 minutes 21).
- The commands that check a run (heavy ones through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`):
  - the Node suite: `node --test`, run in `orchestrate-agents\` (154 at baseline);
  - the PowerShell suite: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1`, run in `orchestrate-agents\`;
  - the pane, when it changed: `claude plugin validate decisions-pane` and `claude plugin test decisions-pane`, run
    in `C:\Repos\My projects\claude-code-extensions` with the `claude.exe` of Claude's VS Code extension (the
    `claude-code-mods` skill says how), and its type-check as the pane's `README.md` says.
- Run the Node tests from a working folder spelled `C:\`, not `c:\`: one existing test fails on the lowercase drive
  letter alone.
- No test may read or write this repo's real `decisions\` files; tests use scratch repos (`tests\helpers\scratch.mjs`).

## What only the main session does here

Edits to the global instruction files and `~\.claude\settings.json` (for example registering a new hook or telling
every main session to start a new watch), running `register.mjs migrate` or any other rewrite against a real
register, answering, closing and following up register entries, reloading the pane plugin, and commits.

## Hard rules of this project

- `orchestrate-agents\` is live: it is linked into `~\.claude\skills`, so every saved edit reaches every running
  session at once. Leave `register.mjs`, the reminder hook and the pane working at the end of every run, and never
  leave a half-done edit in them between runs.
- No decision leaks between repos: every reader of a register reads only the chat's own repo's (the user, D-14).
- Decisions never go into the chat; the user reads and answers them in the Decisions pane (the user, 2026-10-26).
- Every saved file keeps its existing encoding and line endings.

## Still waiting for the user

- D-15: room for a longer explanation in an open entry (an "Explained" block, or a child entry). Do not build either.
