# R3b: the Decision answers watch: every 30 minutes, and at once when everything is answered

Written by the task lead, 2026-10-26 19:06. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R3_REPORT_CLAUDE.md` (the watch as built) and `<wf>\R2_REPORT_CLAUDE.md`, its section on what changed
   (the `handover` command).
4. `<orch>\scripts\watch-decision-answers.ps1`, whole, and `<orch>\tests\scripts\watch-decision-answers.test.mjs`,
   whole (yours to change).
5. In `<orch>\lib\decision-register.mjs`: `handOverAnswers` and what it calls, `openItems`, `statusOf`,
   `WAITING_FOR_USER`; in `<orch>\scripts\register.mjs`: the usage comment and the `handover` branch.
6. In `<orch>\tests\lib\decision-register.test.mjs` and `<orch>\tests\scripts\register.test.mjs`: only the handover
   tests.
7. In `<orch>\orchestration.config.json`: the `decisionAnswersWatch` section. In `<orch>\SKILL.md`: the step of
   "Starting work" that starts the Decision answers watch, and the sentence about it in "The decision register".

Do not read: the rest of `SKILL.md`, `references\`, other `.ps1` files, the PowerShell tests, the hook,
`context-guard.mjs`, `limit-stop*`, the pane, the plans, the real `decisions\` files except to copy them (section 6).

## 2. What it is for

The user, 2026-10-26 19:02, about the Decision answers watch: "we have a separate watch which checks every 15mins
for answereded decisions, lets keep that but increase the default period to every 30mins, and lets add another
mechanism, were if all open decisions get answered they all get sent to the main chat. so lets say there are
currenlty 5 open decisions and i asnwer them within 3mins, they should all get sent when asnwered."

So: 5 entries wait for the user; the user answers all 5 within 3 minutes; the main session gets all 5 right after
the fifth, not 30 minutes later. If only 4 of 5 are answered, the 30-minute rule applies. Each answer is still handed
over exactly once (D-18), and only the chat's own repo's register is read (D-14).

## 3. Point 1: the register hands over "when all are answered"

- `handOverAnswers` gets an option, and `register.mjs handover` a flag `--when-all-answered`: under the same lock,
  if any open entry still waits for the user (status `waiting-for-user`, or no Status line, as every reader counts
  it), hand over nothing (no output, exit 0); otherwise hand over every waiting record exactly as `handover` does
  (same output). The check and the hand-over happen under one lock, so an entry added in between cannot slip past.
- Plain `handover` (the 30-minute rule and the hook) is unchanged.
- Usage comment and module comment say what the flag does.

## 4. Point 2: the watch

- Two settings in the `decisionAnswersWatch` section, each also a parameter of the same name: `everyMinutes`
  becomes **30** (`_whyEveryMinutes`: the user's choice of 2026-10-26 19:02, quoted, replacing the 15 of D-13), and
  a new `lookSeconds`, **5**, with its `_why`: how often the watch checks whether the register changed, so that
  "all answered" is noticed within seconds; a check reads only the size and time of the open file and of the answers
  log, and runs `register.mjs` only when one of them changed. Update `_about`. Keep the file's UTF-8 without BOM and
  LF endings; touch no other section.
- The loop: a full `handover` at start (as now); then every `LookSeconds`, if the open file's or the log's size or
  time changed since the previous look, `handover --when-all-answered`; and every `EveryMinutes` since the start, a
  full `handover`. Whichever prints answers: write them, the restart line, end with exit 0, exactly as now. Failures
  (exit 1 and crashes) of either kind count toward `failuresBeforeStop` as now; exit 2 ends at once as now.
- The header comment says both triggers in plain words, with the user's example.
- `SKILL.md`: in the step that starts the Decision answers watch and in the one sentence of "The decision register",
  replace "every 15 minutes" (or however it is put) with: every 30 minutes, and at once as soon as every open entry
  is answered. Change nothing else.

## 5. Your files, and what is not yours

Yours: `<orch>\scripts\watch-decision-answers.ps1`, `<orch>\tests\scripts\watch-decision-answers.test.mjs`,
`<orch>\lib\decision-register.mjs` and `<orch>\scripts\register.mjs` (the flag only), the handover tests in
`<orch>\tests\lib\decision-register.test.mjs` and `<orch>\tests\scripts\register.test.mjs`,
`<orch>\orchestration.config.json` (that section only), `<orch>\SKILL.md` (those two places).

Not yours: everything else, in particular the hook, `watch-session.ps1`, `watch-agent.ps1`, the PowerShell tests,
the real `decisions\` files, the vendored `skills\`, `agents\`, `references\`, `C:\Users\user\.claude\CLAUDE.md`,
`~\.claude\settings.json`. Another worker runs at the same time in another repo: it changes only files under
`C:\Repos\My projects\claude-code-extensions\decisions-pane`; do not touch that folder.

## 6. How to work, and the checks

- **`<orch>` is live** (linked into `~\.claude\skills`). Develop in a scratch copy of `<orch>` (for example
  `C:\Users\user\AppData\Local\Temp\r3b-orch`), run the whole suite there, then copy your changed files into `<orch>`
  in one step and run the whole suite in `<orch>`. Never leave a half-done edit in `<orch>`. Delete your scratch
  folders at the end.
- **Every heavy command** through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r3b-node.log'`.
  Spell the folder `C:\`, never `c:\`. Single test files may run directly.
- Baseline: 213 Node tests, all pass (run 5's worker, about 18:50; the lead's own run is in progress). Two timing
  tests of `limit-stop-server.test.mjs` may fail under load (the user chose to leave them, D-20): re-run that file
  alone and report both results; do not change it. Any other failure in your first scratch run: stop and ask.
- **Tests** (the watch run as a child `pwsh -NoProfile -File`, as now; give `-EveryMinutes` and `-LookSeconds` small
  values): two entries wait, one answered: still running after several looks; the second answered: it ends within
  about one look, printing both, in log order; one of two answered and `-EveryMinutes` small: it ends at the period
  with that one; a new entry added before the last answer: no early end; an answer recorded `--handed-over`, or a
  processed one, never printed; no looks run `register.mjs` while nothing changes (count the runs in a way the test
  can see, for example a stand-in script, or the log's hand-over times, your choice); the default 30 and 5 come from
  the settings; `handover --when-all-answered` from the command line and from the module, both ways.
  Keep the test file's run time down: the suite already grew by 40 s in run 3.
- **The invariant, against real material**, touching nothing live: copy the real
  `C:\Repos\My projects\software-developer-agent\decisions\` folder (read-only) into a scratch repo. Answer every
  entry that waits for the user there, one after another, with the watch running on the copy (short look): it ends
  right after the last answer with all of them, words exact; started again, it keeps waiting. Every other record and
  entry byte-identical to the copy ("0 differences on N").
- **The mutation check**, in a scratch copy only: at least: the flag ignored (hands over with an entry still
  waiting); an entry without a Status line not counted as waiting; the check outside the lock; looks run
  `register.mjs` on every look; the period timer reset by each look; the early trigger using plain `handover`; the
  default left at 15. Report "N of N caught"; for each not caught, add the test.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Point 1 in about
  15 tool calls, point 2 in about 30; then the invariant and the mutation check at once.
- Read the clock (`Get-Date`) for every time you write.

## 7. Progress, report, and the end

- Progress file: `<wf>\R3B_PROGRESS_CLAUDE.md`. Report file: `<wf>\R3B_REPORT_CLAUDE.md`: what changed by effect with
  the user's 5-answers example, test counts before and after, the invariant, the mutation check ("N of N caught"),
  what was not tested and why, the files changed, peak memory from `run-heavy.ps1`'s last line, and the four-line
  report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 8. Not this run's

Renaming the other watches and the rest of the docs (the last run); the pane; D-24 (waits for the user).
