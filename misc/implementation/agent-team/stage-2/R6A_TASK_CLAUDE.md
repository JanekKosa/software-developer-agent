# R6a: rename the two older watches in the code, the tests and the settings

Written by the task lead, 2026-10-26 20:16. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole, and `<wf>\R6_FACTS_CLAUDE.md`, whole (the names and what is true now).
3. The files below, by search first: find every occurrence of `watch-session`, `watch-agent`, `watchSession`,
   `session watch`, `Session watch`, `agent watch` in your files (section 4) with a search, then read only around the
   hits. Read the header comment (first 60 lines) of `scripts\watch-session.ps1` and `scripts\watch-agent.ps1` whole.
4. `<orch>\tests\limit-scripts.tests.ps1`: its first 60 lines (how it runs and how a mutation run points it at a
   copy), then only around the hits.

Do not read: `SKILL.md`, `references\`, `agents\`, the README's other parts (two other workers are changing those
now), the register code, the pane, the plans, any transcript.

## 2. What it is for

The user (2026-10-26): "each watch within the agent should be anmed differently with a name of what it does so that
i know what each is for", and chose the names (D-16, A): `watch-session.ps1` becomes `watch-usage-and-context.ps1`
("Usage and context watch"), `watch-agent.ps1` becomes `watch-agent-size-and-stall.ps1` ("Agent size and stall
watch"). The third, `watch-decision-answers.ps1` ("Decision answers watch"), is already named. This run renames the
two in everything that is code, tests and settings. Two other workers update the documents at the same time.

## 3. The points

1. **Forwarders first, so nothing live breaks at any moment.** `<orch>` is live (linked into `~\.claude\skills`),
   and the main session's Usage and context watch runs right now from `watch-session.ps1` and is restarted by that
   path. Before anything else, in `<orch>` itself: create `scripts\watch-usage-and-context.ps1` and
   `scripts\watch-agent-size-and-stall.ps1` as exact copies (bytes) of the old files, then replace each old file by a
   forwarder: a header line saying it only forwards to the new name until the main session has restarted its
   watches, and the call `& (Join-Path $PSScriptRoot '<new name>') @args; exit $LASTEXITCODE` (check that named
   parameters and the exit code pass through, and that a misspelled parameter still fails; a forwarder needs no param
   block). Then run the forwarder once against a scratch fixture to prove it.
2. **The rename inside**: in a scratch copy of `<orch>` (for example `C:\Users\user\AppData\Local\Temp\r6a-orch`),
   change every reference in your files to the new file names and the display names: header comments, usage lines,
   messages that name the script or "the session watch", test names and paths, `$Watch`/`$AgentWatch` paths in the
   tests, the scripts that start or name a watch (`limit-stop-server.mjs`, `hooks\context-guard.mjs`,
   `lib\limit-stop.mjs`, `lib\transcript.mjs`, `scripts\usage-probe.ps1`, and any other hit). Text that names the
   watch for a person says "the Usage and context watch" or "the Agent size and stall watch".
   - The settings section `watchSession` becomes `usageAndContextWatch` (keys inside unchanged), and every reader,
     test and `_why` text with it, **only if** every script that reads it reads it once at its start (so the watch
     running now from the old code is not broken by the rename): check and say which. If any reader re-reads it
     while running, keep the key, update its `_about` to name the new file and display name, and say so in your
     report. Either way `_about` names the new file and the display name.
   - Keep unchanged: the lines the watches print (protocol), their temp-file names (for example
     `claude-session-watch-<id>.decision.json`: a running watch and the limit-stop server use them), and the
     `decisionAnswersWatch` section.
3. When the copy's suites pass, copy your changed files into `<orch>` in one step (the new-named scripts with their
   final content; the forwarders stay), then run both suites in `<orch>`.

## 4. Your files, and what is not yours

Yours, in `<orch>`: `scripts\watch-session.ps1`, `scripts\watch-agent.ps1` (become forwarders),
`scripts\watch-usage-and-context.ps1`, `scripts\watch-agent-size-and-stall.ps1` (new), `scripts\usage-probe.ps1`,
`scripts\limit-stop-server.mjs`, `scripts\schedule-relaunch.ps1` and `scripts\start-session-in-vscode.ps1` if they
name a watch, `lib\limit-stop.mjs`, `lib\transcript.mjs`, `hooks\context-guard.mjs`, `orchestration.config.json`,
`tests\limit-scripts.tests.ps1`, `tests\scripts\limit-stop-server.test.mjs`, `tests\hooks\context-guard.test.mjs`,
and any other test or code file under `<orch>` with a hit, except those below.

Not yours (others are changing them now): `<orch>\SKILL.md`, everything in `<orch>\references\`,
`C:\Repos\My projects\software-developer-agent\agents\`, the repo's `README.md`. Not yours at all: the register code
and its tests, `scripts\watch-decision-answers.ps1` and its test, the hook `decision-reminder.mjs`, `decisions\`,
`skills\`, `misc\` except your progress and report files, the pane, `C:\Users\user\.claude\CLAUDE.md`,
`~\.claude\settings.json`. If a file not yours needs a change, write the exact text in your report.

## 5. How to work, and the checks

- Every saved file keeps its encoding and line endings (check before and after; the `.ps1` and `.mjs` files here are
  UTF-8 without BOM and LF, verify each).
- **Every heavy command** through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command: the Node suite (`node --test`, in `<orch>`,
  spelled `C:\`) and the PowerShell suite (`pwsh -NoProfile -File tests\limit-scripts.tests.ps1`, in `<orch>`; it
  takes about 5 minutes and may wait for a slot: two other workers share the slots). Baselines: Node 220 of 220
  (run 3b, about 20:09); PowerShell 104 passed, 0 failed (main session, 15:02; nothing in its files changed since).
  Two timing tests of `limit-stop-server.test.mjs` may fail under load (the user chose to leave them, D-20): re-run
  that file alone and report both results.
- **The invariant**: after the copy-in, a search over all of `C:\Repos\My projects\software-developer-agent` except
  `misc\` and `decisions\` finds the old names (`watch-session.ps1`, `watch-agent.ps1`, and `watchSession` if you
  renamed the key) only in the two forwarders, in your files; report the count per file before and after (the other
  workers' files will still show hits until they finish: list them separately). The forwarder run against a scratch
  fixture gives the same output and exit code as the new script.
- **Mutation check**, in a scratch copy only: at least: a forwarder that drops the arguments; one that drops the exit
  code; a test path left pointing at the old name (the suite must fail when the forwarder is removed); the settings
  key renamed in the file but not in one reader. Report "N of N caught"; for each not caught, add the test.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. The PowerShell
  test file is 144 KB: never read it whole; search and read around hits. Forwarders in about 10 tool calls, the
  rename in about 35, then the suites, the invariant and the mutation check.
- Read the clock (`Get-Date`) for every time you write.

## 6. Progress, report, and the end

- Progress file: `<wf>\R6A_PROGRESS_CLAUDE.md`. Report file: `<wf>\R6A_REPORT_CLAUDE.md`: what changed by effect,
  whether the settings key was renamed and why, test counts before and after for both suites, the invariant's counts,
  the mutation check ("N of N caught"), what was not tested and why, the files changed, peak memory from
  `run-heavy.ps1`'s last lines, the exact lines the main session must change elsewhere (any file not yours), and the
  four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
