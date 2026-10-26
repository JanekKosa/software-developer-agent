# R6b2 progress: the references and guide pages say what is true now

Started 2026-10-26 20:17:59 (clock read). Task: `R6B2_TASK_CLAUDE.md`. Facts: `R6_FACTS_CLAUDE.md`.

## Files I own

Every file in `C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\`:
agent-team-guide.html, lead-brief-template.md, lessons.md, limits-and-caps-guide.html, start-messages.md,
usage-limits.md, worker-rules.md. Plus this progress file and `R6B2_REPORT_CLAUDE.md`.

Not mine: SKILL.md, agents\, README.md, scripts, tests, settings, skills\, decisions\, the pane.

## Done

- 20:17 Read task, facts, CLAUDE.md, README.md, the three skills.
- 20:22 Baseline: all 7 files UTF-8 without BOM, LF only, end with a newline. Hashes (SHA256, first 16):
  agent-team-guide 9CCB335E30A39381, lead-brief-template F5ABBCCB80778163, lessons 486FDDB68B232946,
  limits-and-caps-guide F80F00AB03870C26, start-messages DABC391256377291, usage-limits 054A7E225424A130,
  worker-rules BCE6B46AE1970260. Scratch: `<scratchpad>\r6b2\orig` (untouched copy) and `\edit` (my edits).
- Search hits: usage-limits.md, lessons.md, start-messages.md, both HTML pages. lead-brief-template.md and
  worker-rules.md: no hits (only benign "answer").
- New watch files (watch-usage-and-context.ps1, watch-agent-size-and-stall.ps1) not in scripts\ yet at 20:17
  (R6a); list as pending if still missing at the check.
- 20:24 Edited in scratch: usage-limits.md (settings key, "What watches" with the two main-session watches and
  their descriptions, "The watch" defined, step 7 stops the Decision answers watch, cap path and reset-cold paths
  stop it too, new session starts both); lessons.md (Agent size and stall watch path + description; Usage and
  context watch in the overturned lesson); start-messages.md (chat answer with --handed-over, pane answers arrive
  once, close with summary / follow-up, child entry).

- 20:27 (clock) Edited in scratch: limits-and-caps-guide.html (glance line, "Usage and context watch" card with
  "the watch" defined, new "Decision answers watch" card, diagram title and aria-label, cap and 2b hand-overs stop
  both watches, new failure case "You answer a decision after a hand-over", developer table rows for the three
  watches, footer line); agent-team-guide.html (lead and glance: answer in pane or chat; register card with the
  answers log and final answer/summary; hook card; "The three watches" card replaces "Session watch"; both
  diagrams' answer text and aria-labels; step 0 starts both watches; step 5 rewritten with 5a (answer reaches the
  main chat once: watch every 30 min or at once when nothing waits, or the hook) and 5b (close with final answer
  and summary, or follow-up; child entry D-12-1, D-15); failure cases: watches restart, Decision answers watch
  fails; developer table rows; footer).
- 20:27 R6a has copied in watch-usage-and-context.ps1 and watch-agent-size-and-stall.ps1 (same sizes as the old).

- 20:29-20:33 Invariant on scratch repo `<scratchpad>\r6b2\inv\repo` (folder with .git, real register.mjs):
  Decision answers watch as written ended 2.4 s after a pane answer to the only open entry, with
  `DECISION ANSWERS | D-1`, the words exactly, and the restart line; close/answer --handed-over/follow-up/add parent
  (D-2-1)/list/migrate all exit 0 with the expected files; Agent size and stall watch as written runs (stopped by id
  after 15 s), with -WarnTokens 1000 -EverySeconds 5 ends with `NEAR CAP: agent ... at 232681 tokens`; limit-stop
  `stop` on a made-up session: NOT RUNNING; schedule-relaunch 3 forms with -DryRun: DRY RUN lines. Usage and
  context watch NOT run (watches the live session; may call the API and start the stop server); checked: exists,
  parses, no mandatory parameter. Every watch PID stopped by id or ended itself.
- 20:33 HTML check (scratch\inv\check-html.mjs: stack-nested tags, unique ids, href/url(#) targets): both pages 0
  problems before and after; it caught 2 of 2 planted faults. Copied the 5 files in at 20:33; hashes equal scratch,
  LF only, no BOM.
- My own size at 20:32 was 232,681 tokens (the size watch said so).

## Decisions

- Kept the quoted server log text `(by the session watch)` in usage-limits.md: it is what the log line says (a
  protocol/log string, written by code I may not read). Flag for the lead: if R6a changed that string, the line must
  follow.
- start-messages.md now points at `SKILL.md` "for `--answer`" instead of under the heading "The decision register",
  since R6b1 is changing SKILL.md and the heading may move.

- 20:34 Paths: 62 of 62 exist (bare names placed in scripts\, decisions\, ~\.claude\, xpp-agent\misc\handovers\);
  entry.json and .meta.json are generic names. Consistency search on the live folder: remaining hits are on purpose
  (quoted log text, quoted overturned rule, "Still open" section headings, register.mjs).
- 20:35 Report written: `R6B2_REPORT_CLAUDE.md`. Scratch folder `<scratchpad>\r6b2` deleted (0 links in it; gone).
  The other items in the shared scratchpad are not mine and were left.

## Left

- Nothing. Done 20:35.
