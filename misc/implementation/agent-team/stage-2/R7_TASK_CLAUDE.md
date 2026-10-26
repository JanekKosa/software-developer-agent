# R7: three last corrections found by the documentation runs

Written by the task lead, 2026-10-26 21:01. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R6B1_REPORT_CLAUDE.md`, its section with the exact replacement text (item 1 of "text for files not mine").
4. In `<orch>\lib\decision-register.mjs`: `handOverText` (and whatever builds the "what to do" line it prints). In
   `<orch>\SKILL.md`: only the passage on passing words with a here-string (search `here-string`).
5. The tests that assert that line: search `<orch>\tests` for `For each answer` and for `--summary "<text>"`, and
   read around the hits.
6. `<orch>\references\usage-limits.md` around line 200; `C:\Repos\My projects\software-developer-agent\agents\task-lead.md`
   lines 25-40.

Do not read anything else.

## 2. The three corrections

1. **The hand-over's instruction line.** `register.mjs handover`, the prompt hook and the Decision answers watch
   print, after the answers: `... close the entry with a summary ... (register.mjs close --id <id> --outcome
   <outcome> --summary "<text>"), or follow it up (register.mjs follow-up --id <id> --text "<text>").` The double
   quotes contradict `SKILL.md`'s rule that the user's words and an agent's texts are passed in a single-quoted
   here-string (in double quotes PowerShell runs `$(...)`, drops `$5`, turns backtick-n into a line break). Make the
   line say the commands with `$summary` and `$text` and that both are set in a single-quoted here-string, as
   R6b1's report proposes (keep it one line, plain). Update every test that asserts the line, in all test files
   (the register's, the hook's and the watch's).
2. **`references\usage-limits.md` line 200** quotes the limit-stop server's log text `(by the session watch)`; the
   server now writes `(by the Usage and context watch)` (run 6a). Make the quote match the code exactly.
3. **`agents\task-lead.md` line 33-34** says the main session "relays your lines and register entries to the user".
   Since 2026-10-26 the user reads register entries in the Decisions pane and the main session names only a blocking
   entry in the chat (the user: "all of decisions, questions, issues should be added to the decisions file, where i
   will see them in the decisions pane ... so even on initial decision they should not show in the main chat").
   Correct that clause only, in the file's style; change nothing else. The file is live (linked into
   `~\.claude\agents`) and universal.

## 3. Your files, and what is not yours

Yours: `<orch>\lib\decision-register.mjs` (that line only), the tests that assert it, `<orch>\references\usage-limits.md`
(that line only), `C:\Repos\My projects\software-developer-agent\agents\task-lead.md` (that clause only).

Not yours: everything else. No other agent is changing files now.

## 4. How to work, and the checks

- `<orch>` and `agents\` are live: edit copies in a scratch folder, copy each file in once, finished. Keep each
  file's encoding and line endings (UTF-8 without BOM, LF; check before and after).
- Every heavy command through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder it needs, redirection inside the command: the Node suite (`node --test` in `<orch>`, spelled
  `C:\`) in the scratch copy and again in `<orch>` after the copy-in. Baseline 220 of 220 (run 6a, 20:46; the lead's
  own run may still hold the slot when you start). Two timing tests of `limit-stop-server.test.mjs` may fail under
  load (D-20): re-run that file alone and report both results.
- **Check against real material**: in a scratch repo made with the real `register.mjs`, answer an entry, run
  `handover`, copy the printed close command, set `$summary` with a here-string holding `$5 and $(Get-Date)`, run the
  command as printed: the resolved entry's Summary holds `$5 and $(Get-Date)` exactly. The same for `follow-up`.
- **Mutation check**, in a scratch copy only: put the double quotes back: a test fails. Report "N of N caught".
- Small run: plan for about 30 tool calls. Read the clock (`Get-Date`) for every time you write.

## 5. Progress, report, and the end

- Progress file: `<wf>\R7_PROGRESS_CLAUDE.md`. Report file: `<wf>\R7_REPORT_CLAUDE.md`: what changed, test counts
  before and after, the checks, the files changed, peak memory from `run-heavy.ps1`'s last line, and the four-line
  report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
