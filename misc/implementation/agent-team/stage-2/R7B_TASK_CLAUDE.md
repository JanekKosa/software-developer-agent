# R7b: the last double-quoted forms in register.mjs's messages

Written by the task lead, 2026-10-26 21:19. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md`.
2. This file, whole, and `<wf>\R7_REPORT_CLAUDE.md` (the run before you; its ISSUES FOUND and suggested text).
3. `<orch>\scripts\register.mjs` lines 1-50 and around line 86; `<orch>\lib\decision-register.mjs` around line 434
   and the hand-over line R7 changed (line 80, for the wording to copy); `<orch>\tests\scripts\register.test.mjs`
   around lines 430-445. Search `<orch>\lib`, `<orch>\scripts`, `<orch>\hooks` and `<orch>\tests` for `"<text>"`,
   `"<the user's words>"` and `--summary "` to find any other such form.

Do not read anything else.

## 2. What to change

R7 made the hand-over's instruction line say `--summary $summary` / `--text $text`, set in a single-quoted
here-string, never in double quotes (in double quotes PowerShell runs `$(...)`, drops `$5`, turns backtick-n into a
line break). Three places still show the double-quoted form, which a main session may copy:

1. `decision-register.mjs` about line 434: the error for a blank summary.
2. `register.mjs` about line 86: the form `close` prints when `--summary` is missing.
3. `register.mjs`'s usage comment (lines 9, 13, 15 and any other): the forms of `--answer`, `--summary`, `--text`,
   `--still-open`, `--words`.

Make each show the same form as R7's line (`$answer`, `$summary`, `$text` and so on, or the words "a single-quoted
here-string"), short and plain. Update the tests that assert the two messages. Change nothing else.

## 3. Files

Yours: `<orch>\lib\decision-register.mjs` and `<orch>\scripts\register.mjs` (those lines only), the tests that assert
them. Nothing else. No other agent is changing files now.

## 4. How to work, and the checks

- `<orch>` is live: edit copies in a scratch folder, copy each file in once, finished. Keep UTF-8 without BOM and LF.
- The Node suite through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command 'node --test *> <log>'`,
  run in `<orch>` (spelled `C:\`), in the scratch copy and again in `<orch>` after the copy-in. Baseline 220 of 220
  (R7, about 21:15). Timing tests of `limit-stop-server.test.mjs` may fail under load (D-20): re-run that file alone.
- Mutation check in the scratch copy: put one double-quoted form back in each message: a test fails. "N of N caught".
- Small run: about 20 tool calls. Read the clock for every time you write.

## 5. Progress, report, and the end

Progress `<wf>\R7B_PROGRESS_CLAUDE.md`, report `<wf>\R7B_REPORT_CLAUDE.md` (what changed, test counts, mutation
check, files changed, peak memory, and the four-line report block `DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`,
`QUESTIONS`). Your final message: the report's summary, ending with the same four lines.
