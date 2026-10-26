# Run D: integration fixes after the first build (task file)

You finish stage 1 of the agent team. Builders A (Node hooks and register), B (PowerShell limit scripts) and C
(documents) are done, reviewed and fixed. What is left is listed below. Work in
`C:\Repos\My projects\software-developer-agent` only. Never commit; never edit any `CLAUDE.md`, any Claude or VS Code
settings file, or anything outside that repo; never start, stop or message agents or sessions; never open a
`vscode://` link or send keystrokes.

Read first, and no more: the plan `AGENT_TEAM_STAGE_1_PLAN_CLAUDE.md` sections 6-8 (in this folder); the config
`orchestrate-agents\orchestration.config.json` whole; the "Second pass" sections of `A_REPORT_CLAUDE.md` and
`B_REPORT_CLAUDE.md` and the whole of `A2_REPORT_CLAUDE.md` (this folder). Then the files you change.

Progress file: `D_PROGRESS_CLAUDE.md`; report: `D_REPORT_CLAUDE.md` (this folder). Plan for about 80 tool calls.

## The points

1. **Config contract.** No value that the config holds, or that a user could want to change, stays in code:
   - Add the keys A2 proposed (`register.lockWaitSeconds`, `register.lockStaleSeconds`, a `contextGuard` block
     with `transcriptTailKB`, `markerFolder`, `markerLockStaleSeconds`), each with a `_why`, and make the code read
     them (a missing key is an error naming it).
   - `watch-session.ps1` and `usage-probe.ps1` read `usageLimits.stateFile` (expand `%VAR%`) and
     `usageLimits.stateFreshMinutes`: the probe runs only when the state file is older than that, so several
     watches share one probe. The watch's main-session warning comes from `contextCaps.main.warn` (the `-WarnTokens`
     param overrides it only when passed). Move `-ExpireAfterHours`, `-NotifySeconds`, `-TimeoutSeconds` and any
     other tunable default into the config with a `_why`.
2. **Probe only when something is being spent.** The watch skips a probe when neither the session's transcript
   nor any of its agents' transcripts was written since the last reading. Near a threshold the faster interval
   applies only while that is true. Reason: a weekly reading near 98% would otherwise probe every 3 minutes for
   days (builder B's issue).
3. **The reminder names what blocking items are about.** `register.mjs summary` and the hook give each blocking
   item's id followed by its `What` text cut to 80 characters (A2's finding 5, the recommended option). Change the
   instruction text in the hook and in `SKILL.md` to match ("list blocking items by id and what").
4. **Stale document lines.** `SKILL.md` and the references: the client-repo exclude now covers the register's own
   files on every add (not the folder on first use); the watch is started again right after `LIMIT NEAR` and
   stopped once the relaunch is scheduled; the summary format of point 3. Check every document against the code
   once more for anything else stale (paths, markers, params, config keys) and fix it.
5. **Shared instructions for leads and workers (the user's request).** Both skip CLAUDE.md. Create one skill in its own
   folder at the repo root, `team-rules\SKILL.md` (name `team-rules`), holding what the lead and the worker both need and that is the same
   for both: the user's guardrails (no secrets, credentials or customer data in tracked files; never touch live or
   shared environments; never commit unless told), plain-language reporting (answer first, short sentences, one
   tiny example, say plainly what was not tested), reading the clock for every time written, the progress file
   rule, the four-line DECISIONS / INITIATIVES / ISSUES / QUESTIONS block and what each line means, messaging only
   the ids you were given, and reading the project's own `CLAUDE.md` files first. Then remove those passages from
   `agents\task-lead.md` and `agents\software-developer.md` (keep a one-line pointer where a section would
   otherwise be empty), add `team-rules` to both agents' `skills:` lists, and make `scripts\install.ps1` link
   `team-rules\` into `~/.claude/skills` and `~/.copilot/skills` the same way it links `orchestrate-agents\` (do not
   run it; test it the way builder C did, with a scratch home folder; never let a test touch the real links).
   Update `README.md` (layout and wiring).
6. **Checks.** The Node suite and the PowerShell suite, both green, each run through
   `orchestrate-agents\scripts\run-heavy.ps1`; the parser on every `.ps1`; `node --check` on every `.mjs`; a doc
   check that every path, script, param and config key named in the documents exists. One real probe run at most.
