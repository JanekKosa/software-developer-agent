# R3: the decision answers watch

Written by the task lead, 2026-10-26 17:29. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R2_REPORT_CLAUDE.md`, its section on what changed (the `handover` command you wrap).
4. `<orch>\scripts\register.mjs`: the usage comment at the top, and the `handover` branch.
5. `<orch>\scripts\run-heavy.ps1`: lines 1-60 only (how a script of this skill reads its settings, its parameter
   block, `[CmdletBinding()]` so a misspelled parameter fails, and returning early when dot-sourced). Copy that
   style; do not read the rest.
6. `<orch>\scripts\watch-agent.ps1`: lines 1-40 only (the header comment of a watch, for the tone).
7. `<orch>\orchestration.config.json`: the `watchSession` and `runHeavy` sections (the shape of a section with
   `_about` and `_why` keys).
8. `<orch>\tests\helpers\scratch.mjs` (scratch repos, a scratch copy of the skill, running a script as a child
   process) and, for the pattern, the first test of `<orch>\tests\scripts\register.test.mjs`.
9. In `<orch>\SKILL.md`: only the sections "Starting work" and "The decision register".

Do not read: `watch-session.ps1` (48 KB), the PowerShell tests (144 KB), `decision-register.mjs` beyond what a
failing test points you to, `context-guard.mjs`, `limit-stop*`, the pane, the plans, the real `decisions\` files
except to copy them (section 6).

## 2. What it is for

The user (D-13, 2026-10-26): "lets add another watch process, which will handle new asnwwered decisosn everu
15mins (configurable), the answered decision should be passed to the orchestroaotr agent/ main agent and then
deleted so that the watch doesnt process the same answerwerd decisiosn 15misn later". Answers now live in the
answers log; run 2 built `register.mjs handover`, which hands every answer not yet handed over to its caller exactly
once and marks it. This run builds the watch around it: a background task the main session starts, which ends (and
so wakes the main session) when answers arrive. The user named it (D-16): display name **"Decision answers watch"**,
file `scripts\watch-decision-answers.ps1`; "each watch within the agent should be anmed differently with a name of
what it does so that i know what each is for". The display name is the `description` the main session gives the
background task, which is what the user sees in the task list.

## 3. Point 1: the watch script

`<orch>\scripts\watch-decision-answers.ps1`, a thin loop:

- Header comment: what it watches, how it is started (the PowerShell tool with `run_in_background`, description
  `Decision answers watch`), what it prints and when it ends.
- Parameters (`[CmdletBinding()]`, so a misspelled one fails before anything runs): `-Root` (the folder whose
  repo's register is read; default the current folder: only the chat's own repo, D-14), `-EveryMinutes` (default
  from the settings, a number greater than 0, fractions allowed so tests can run in seconds), `-ConfigPath`
  (default `..\orchestration.config.json` beside the script). The register script is `register.mjs` beside it.
- New settings section `decisionAnswersWatch` in `orchestration.config.json`: `_about` (the script, and that each
  setting can be passed as a parameter of the same name, which wins), `everyMinutes` 15 with `_whyEveryMinutes` (the
  user's choice, D-13: every 15 minutes, configurable), `failuresBeforeStop` 3 with its `_why`. A missing setting
  fails with a message naming the key, as `run-heavy.ps1` does. Keep the file's UTF-8 without BOM and LF endings;
  add the section after `watchSession`, touch no other section.
- It looks at once, then every `EveryMinutes`: runs `node <register.mjs> handover --root <Root>` and captures stdout,
  stderr and the exit code.
  - Exit 0 with output: write the output exactly as printed (it starts `DECISION ANSWERS | D-20, D-21`, then the
    answers in the user's words, then the instruction line), then one line
    `Start the Decision answers watch again (description "Decision answers watch").`, and end with exit code 0.
  - Exit 0 without output: wait for the next look.
  - Exit 1 (the register busy, or a log that cannot be read): count it; at `failuresBeforeStop` failures in a row,
    write `DECISION ANSWERS WATCH FAILED | <the last stderr, one line>` and end with exit code 1. A good look resets
    the count.
  - Exit 2 (a usage error, such as `-Root` not a folder) or node not found: write the FAILED line at once and end
    with exit code 1.
- It writes nothing else while it waits (a background task's output is read by the main session; keep it empty
  until the end). It never writes the register itself.
- Sleeping between looks is fine inside the script (it runs as its own background task).

## 4. Point 2: the tests, and the main session's start step

- Tests in the Node suite, `<orch>\tests\scripts\watch-decision-answers.test.mjs`, running the script as a child
  `pwsh -NoProfile -File <script> ...` the way the background task runs it, against scratch repos made with the real
  `register.mjs` (never the real `decisions\`). At least: answers already waiting: it prints them and ends at once,
  exit 0, and the log shows them handed over; nothing waiting: still running after the first look, then an answer
  arrives and it ends within about one interval (use `-EveryMinutes 0.02` or so); an answer recorded with
  `--handed-over` and a processed one are never printed; the restart line is last; a second watch started after the
  first ended prints nothing for the same answers; a busy register (create the lock file as `file-lock.mjs` does)
  does not end it at once, and does end it with the FAILED line after `failuresBeforeStop` busy looks (pass a small
  value); `-Root` that is not a folder: FAILED at once, exit 1; a misspelled parameter fails; a missing setting names
  its key. Kill only the child processes your tests started (by their ids), and make every test clean up its
  process even when it fails.
- `<orch>\SKILL.md`, section "Starting work" only: add the decision answers watch as its own step beside the
  session watch's: the command (`& '<orch>\scripts\watch-decision-answers.ps1'`, from the main session's own repo),
  run with the PowerShell tool and `run_in_background`, with the exact description `Decision answers watch`; note
  its task id; start it again every time it ends, after passing on what it printed; stop it with `TaskStop` when the
  session hands over. Then in "The decision register", one sentence where answers reaching the main session are
  described: the watch's `DECISION ANSWERS |` line and what to do with it (pass each answer in the user's words to
  its lead, then close with a summary or follow up; restart the watch). Change nothing else in `SKILL.md`: the other
  watches' names and the rest of the docs are a later run's.

## 5. Your files, and what is not yours

Yours: `<orch>\scripts\watch-decision-answers.ps1` (new), `<orch>\tests\scripts\watch-decision-answers.test.mjs`
(new), `<orch>\orchestration.config.json` (the new section only), `<orch>\SKILL.md` (those two places).

Not yours: everything else, in particular `register.mjs`, `decision-register.mjs` and the hook (if `handover` does
something the watch cannot live with, stop and ask the lead), `watch-session.ps1`, `watch-agent.ps1`, the
PowerShell tests, the real `decisions\` files, the vendored `skills\`, `agents\`, `references\`,
`C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`.

Another worker runs at the same time, in another repo: it changes only files under
`C:\Repos\My projects\claude-code-extensions\decisions-pane`. Do not touch that folder.

## 6. How to work, and the checks

- **`<orch>` is live** (linked into `~\.claude\skills`). Your new files hurt nobody until `SKILL.md` names them,
  but the config file is read by every script of the skill: edit a scratch copy of `<orch>` (for example
  `C:\Users\user\AppData\Local\Temp\r3-orch`), run the whole suite there, then copy your files in one step and run
  the whole suite in `<orch>`. Delete your scratch folders at the end.
- **Every heavy command** (the whole suite) through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r3-node.log'`.
  Spell the folder `C:\`, never `c:\`. Your own test file may run directly.
- Baseline: 192 Node tests, all pass (run 2's worker, 17:23; the lead's own run, 17:29). Your scratch copy's first
  suite run is your baseline: if it is not 192 of 192, re-run any failing test of `limit-stop-server.test.mjs` alone
  (two of its tests depend on timing; the user chose to leave them, D-20) and report both results; any other
  failure: stop and ask the lead.
- **The invariant, against real material**, touching nothing live: copy the real
  `C:\Repos\My projects\software-developer-agent\decisions\` folder (read-only, `Copy-Item`) into a scratch repo (a
  folder with a `.git` folder). Run the watch on it with a short interval: it must keep waiting (the real log's
  records are all processed). Answer one entry the pane's way (no flag) with words of several lines: the watch ends,
  printing the words exactly. Start it again: it keeps waiting. Check every other record and entry is byte-identical
  to the copy ("0 differences on N").
- **The mutation check**, in a scratch copy only: break one rule at a time in the scratch script, run your test
  file, count caught, restore. At least: no look at start; the restart line left out; exit 0 after the FAILED line;
  failures not counted in a row (a good look does not reset); exit 2 retried instead of ending; output printed before
  the end; `-Root` ignored (the current folder used). Report "N of N caught"; for each not caught, add the test.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Script in about
  15 tool calls, tests in about 25, the SKILL.md lines in 5; then the invariant and the mutation check at once.
- Read the clock (`Get-Date`) for every time you write.

## 7. Progress, report, and the end

- Progress file: `<wf>\R3_PROGRESS_CLAUDE.md`, updated after every finished point.
- Report file: `<wf>\R3_REPORT_CLAUDE.md`: what changed by effect, test counts before and after, the invariant, the
  mutation check ("N of N caught", the list), what was not tested and why (a real background task in a real Claude
  Code session cannot be tested here: say so), the files changed, peak memory from `run-heavy.ps1`'s last line, and
  the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 8. Not this run's

Renaming `watch-session.ps1` and `watch-agent.ps1` (a later run); the global instructions and
`~\.claude\settings.json` (the main session's); the pane; `migrate`.
