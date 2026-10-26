# Summary: the answers log and the Decision answers watch

Task lead, 2026-10-26 15:03 to 21:40. Task file: `ANSWERS_LOG_TASK_CLAUDE.md`. Lead file:
`ANSWERS_LOG_LEAD_CLAUDE.md`. All in `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.
Nothing is committed.

## What is different now, by effect

1. **Answers have a log of their own.** Every answer goes to `decisions\ANSWERS_LOG_CLAUDE.jsonl`, one JSON line
   each (`id`, `answeredAt`, `answer`, `handedOverAt`, `processedAt`), kept for good. The answered file is gone (the
   next write folds an old one in). Search: `register.mjs answers --ids D-7 --words "retry" [--json]`. Example: this
   repo's log already holds the user's answers to D-20 to D-27, written by the main session through the new code.
2. **A closed entry ends with the user's final answer and a summary.** `close --id --outcome --summary $summary`:
   the script copies the user's last answer word for word (`- Final answer: ...`), the agent writes `- Summary:`.
   Example: closed D-20 shows `Final answer: 2026-10-26 16:03: "Chose B: leave it; ..."` and the main session's
   summary.
3. **Follow up instead of Still open.** `follow-up --id --text $text` adds a timed `Follow up` block that may hold
   several lines and examples; it never changes the Options; changed options are a child entry (D-15).
   `keep-open --still-open` still works.
4. **Each answer reaches the main session exactly once.** A pane answer is handed over by whichever comes first: the
   Decision answers watch or the prompt hook at the user's next message. A chat answer is recorded with
   `answer --handed-over` and never handed over again (D-18). The hook names entries handed over earlier and not yet
   processed, without their words.
5. **The Decision answers watch** (`scripts\watch-decision-answers.ps1`, description `Decision answers watch`):
   hands answers over at start, every 30 minutes, and at once when no open entry waits for the user any more (checked
   every 5 seconds by file size and time). Example, measured at 21:33: two entries waiting; after the first answer
   it kept waiting; it ended 1 second after the second answer, printing both in the user's words.
6. **The two older watches are renamed** (D-16): `watch-usage-and-context.ps1` ("Usage and context watch") and
   `watch-agent-size-and-stall.ps1` ("Agent size and stall watch"); settings section `usageAndContextWatch`. The old
   names are forwarders until the main session restarts its watches.
7. **`migrate` converts every older register layout** (words in Resolved lines; Answered and Still open lines
   inside entries): the answers move to the log in time order, each closed entry gets one Final answer line, no
   summary is invented (D-19). On a copy of this repo's register: 22 records added, 21 Final answer lines, a second
   run changes nothing.
8. **The Decisions pane** shows a returned entry's history (earlier answers from the log and each Follow up, oldest
   first, D-22), keeps the last good list and retries every 2 seconds after a failed read or size check, and says so
   in one orange line after 30 seconds of failures (D-23, D-27).
9. **Docs**: `SKILL.md`, `agents\task-lead.md` (section 8 and the relaying line), the README, `references\`
   (both guide pages, `usage-limits.md`, `lessons.md`, `start-messages.md`) describe all of the above; every hand-over
   stops both watches the main session started.

## What was checked, and how

- Node suite: 154 at the start, 220 of 220 at the end (run by me after every run; final run: see the last section).
- PowerShell suite: 105 passed, 0 failed (me, 21:18, after the renames; final run: see the last section). Its real
  baseline at 20:18 was 103/1 (no misspelling case for the new watch); run 6a added it.
- Pane: `claude plugin test decisions-pane` 53 of 53 (me, 20:15), `claude plugin validate` passes; type-check exit 0
  (workers' word only).
- Mutation checks, one per building run: R1/R1b 31 of 31, R2 15 of 15, R3 17 of 17, R3b 17 of 17, R4 19 of 19, R4b 9
  of 9, R4c 11 of 11, R5 18 of 18, R6a 14 of 14, R7 1 of 1, R7b 6 of 6.
- Real material, read-only copies: this repo's register (every run), xpp-agent's and claude-code-extensions'
  (migrate, counts only): 0 differences.
- My own smokes on scratch repos after each run, and an end-to-end one at 21:33 (watch, close with a here-string
  summary holding `$5` and `$(today)` kept exactly, hook).

**Not checked:** the pane inside a live VS Code (not reloaded; the main session's); a real main session following
the new `SKILL.md`; the watches restarted through the forwarders in a live session; the 30-minute period in real time;
the pane notice's clock (it uses the hooks environment's local time; if the engine runs it in UTC the time is an hour
off, R4c) and the engine's `ENOENT` text for a missing file (R4c relies on it); `migrate` on the real registers.

## Register entries of this task

Raised by me: D-17, D-18, D-19, D-20, D-22, D-23, D-24, D-25, D-26, D-27; all answered by the user and closed by
the main session (D-20 and D-24: B, leave it; the others A). Main's: D-15, D-16, D-21, answered. No entry is open.

## Text for files only the main session edits

1. `C:\Users\user\.claude\CLAUDE.md`, section "Agents", the first bullet (lines 68-73), replace with:

   ```
   - **The first actions of every main session, in every project, are to start two watches** in the background,
     each with the PowerShell tool, `run_in_background`, and the exact description shown, which is its name in the
     task list:
     - `Usage and context watch`: `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1'`.
       It reads the usage limits and wakes an idle session; what each of its last lines asks for is in the
       `orchestrate-agents` skill, `references/usage-limits.md`.
     - `Decision answers watch`: `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1'`,
       from the session's own repo. It hands my Decisions-pane answers to the session every 30 minutes, and at once
       when every open decision is answered; start it again each time it ends (the skill, "Starting work").
     A subagent never starts them. The context-guard hook warns every main session at 450k and stops its agents for
     the hand-over in every project, not only orchestrated ones (user, 2026-10-25).
   ```

2. Same file, the paragraph "Decisions go into the decision register, not the chat" (lines 175-180): add at its end:

   ```
   I answer in the Decisions pane or in the chat, both count (my rule, 2026-10-26): an answer I type in the chat is
   recorded at once with `register.mjs answer --id <id> --answer <my words> --handed-over`.
   ```

3. `~\.claude\settings.json`: nothing to change (the prompt hook is the same file).

## What the main session does next

- Restart its watches by the new names and descriptions (`Usage and context watch`, `Decision answers watch`), then
  delete the two forwarders `orchestrate-agents\scripts\watch-session.ps1` and `watch-agent.ps1` (the suites pass
  without them, R6a). Until then the old names keep working.
- Reload the Decisions pane plugin (its state tag changed, so it re-reads its rows once).
- Run `migrate` on the real registers (R5's commands):
  `node "C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\register.mjs" migrate --root "<repo>"`
  for `C:\Repos\My projects\software-developer-agent`, `C:\Repos\My projects\xpp-agent` and
  `C:\Repos\My projects\claude-code-extensions`. Until then this repo's open-file header still names the answered file.

## What the next task must know

- Two timing tests of `limit-stop-server.test.mjs` fail now and then under load; the user chose to leave them
  (D-20): re-run that file alone.
- The Node suite now takes about 2 minutes 20 (was 1:10; the watch tests add about 50 s).
- Ten old `oa-*` test folders lie in `%TEMP%` (2026-10-25 18:05 to 2026-10-26 15:39), left by earlier failed test
  runs; not this task's, left alone.
- The Usage and context watch's printed restart line ("Start this watch again now") does not carry its description;
  `SKILL.md` gives it. Left as is (protocol lines unchanged).
- The engine created an empty folder `C:\Users\user\.claude\dev-mods\bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f` when a
  worker loaded the plugin-authoring skill; nothing was written there.
- `C:\Repos\My projects\claude-code-extensions\misc\implementation\chat-view\CHAT_VIEW_CONTINUATION_PLAN_CLAUDE.md`
  line 82 names `watch-agent.ps1` (a written plan; left).

## Files changed (from file hashes against the list taken at 15:12, not from memory)

In `C:\Repos\My projects\software-developer-agent`:
- Changed: `README.md`, `agents\task-lead.md`; in `orchestrate-agents\`: `orchestration.config.json`, `SKILL.md`,
  `hooks\context-guard.mjs`, `hooks\decision-reminder.mjs`, `lib\decision-register.mjs`, `lib\limit-stop.mjs`,
  `lib\transcript.mjs`, `references\agent-team-guide.html`, `references\lessons.md`,
  `references\limits-and-caps-guide.html`, `references\start-messages.md`, `references\usage-limits.md`,
  `scripts\limit-stop-server.mjs`, `scripts\register.mjs`, `scripts\usage-probe.ps1`, `scripts\watch-agent.ps1` and
  `scripts\watch-session.ps1` (now forwarders), `tests\limit-scripts.tests.ps1`, `tests\hooks\context-guard.test.mjs`,
  `tests\hooks\decision-reminder.test.mjs`, `tests\lib\decision-register.test.mjs`,
  `tests\scripts\limit-stop-server.test.mjs`, `tests\scripts\register.test.mjs`.
- New: `orchestrate-agents\scripts\watch-usage-and-context.ps1`, `scripts\watch-agent-size-and-stall.ps1`,
  `scripts\watch-decision-answers.ps1`, `tests\lib\decision-register-migrate.test.mjs`,
  `tests\scripts\watch-decision-answers.test.mjs`.
- Register (written by the main session through the scripts, not by workers): `decisions\ANSWERS_LOG_CLAUDE.jsonl`
  new, `OPEN_` and `RESOLVED_DECISIONS_CLAUDE.md` changed, `ANSWERED_DECISIONS_CLAUDE.md` gone (folded).
- Working files of this task in `misc\implementation\agent-team\stage-2\` (task, progress, report, hash lists).

In `C:\Repos\My projects\claude-code-extensions\decisions-pane`: `README.md`, `hooks\decision-state.ts`,
`hooks\decisions.ts`, `hooks\pane.tsx`, `hooks\poll.ts`, `hooks\registers.ts`, `tests\hooks\decisions.test.ts`,
`tests\hooks\pane.test.ts`, `tests\support\register-world.ts`, `types\index.d.ts`.

All saved files kept UTF-8 without BOM and LF (checked per run).

## Runs: tokens and minutes

| Run | What | Tokens (k) | Tool calls | Minutes |
| --- | --- | --- | --- | --- |
| R1 | answers log, close/follow-up | 340 | 136 | 38 |
| R1b | follow-up of several lines, R1's mutations | 238 | 102 | 39 |
| R2 | hand-over once (command, flag, hook) | 293 | 149 | 49 |
| R3 | Decision answers watch | 280 | 111 | 56 |
| R4 | pane: log and Follow up | 283 | 119 | 26 |
| R5 | migrate, three layouts | 315 | 134 | 32 |
| R4b | pane: failed read retried | 163 | 60 | 12 |
| R3b | watch: 30 min + all answered | 332 | 154 | 64 |
| R4c | pane: size check retried, notice | 204 | 75 | 14 |
| R6a | renames in code, tests, settings | 332 | 151 | 43 |
| R6b1 | SKILL.md, task-lead.md, README | 277 | 123 | 24 |
| R6b2 | references and guides | 255 | 126 | 18 |
| R7 | three corrections | 144 | 71 | 17 |
| R7b | last double-quoted forms | 118 | 38 | 14 |

## Final suites

Run by the lead after the last change (R7b), through run-heavy, finished 21:40:
- Node: 220 of 220 pass (ran 2:19, peak 337 MB).
- PowerShell: 105 passed, 0 failed (ran 4:06, peak 247 MB).
- Pane (unchanged since 20:15): 53 of 53, validate passes.
