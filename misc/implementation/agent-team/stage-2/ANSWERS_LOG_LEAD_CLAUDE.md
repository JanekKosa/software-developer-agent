# Lead file: the answers log and the decision answers watch

Lead started 2026-10-26 15:03. Task: `ANSWERS_LOG_TASK_CLAUDE.md` (same folder). Brief:
`AGENT_TEAM_STAGE_2_LEAD_BRIEF_CLAUDE.md`. Status file `STATUS_CLAUDE.md`, sizes file `SIZES_CLAUDE.md` (both
created by me at 15:08). Working folder: `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\`.
`<orch>` = `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.

## State (first thing a successor reads)

- 15:09: plan written; R1 being prepared. No worker has run yet.
- 15:53: R1 checked (169/169 by me, smoke on a scratch repo fine, only allowed files changed, all LF no BOM). R1's
  mutation check did not fit: it moves to R1b with D-15's multi-line follow-up. R1b task written; starting it.
- 21:40: TASK DONE. Final suites: Node 220/220, PowerShell 105/0. Summary complete.
- 21:36: ALL RUNS DONE AND CHECKED. Summary written: ANSWERS_LOG_SUMMARY_CLAUDE.md. Waiting only for the final Node
  and PowerShell suites (b7dnvdwck); then fill their numbers into the summary's last section and end with TASK DONE.
  No register entry is open. A successor would only re-run the two suites and finish the summary.
- 16:37: R1b done (worker 16:30); checking it (suite waiting for a run-heavy slot held by an xpp-agent job). R2 task written (hand-over in the register and the
  hook only). Plan change: the watch script is split off into its own run R3, because R1 overflowed with two
  points. Runs now: R1, R1b, R2 hand-over, R3 the watch, R4 pane, R5 migration, R6 renames (D-16), R7 docs.
- Plan change (15:52): R1b inserted (D-15 follow-up of several lines + R1's mutation check). Runs now R1, R1b, R2,
  R3, R4, R5, R6: likely more than one lead; hand over cleanly when the guard comes.

## What a successor reads, and what it skips

Read: the repo's `CLAUDE.md`, the brief, the task file, this file, `SIZES_CLAUDE.md`, the task file and report of
the last run. Skip: the whole `SKILL.md` (only its section "The decision register", lines ~84-153, matters),
`watch-session.ps1` and the PowerShell test file (144 KB: give searches in them to a code-searcher), the pane's
sources unless checking R3, every transcript.

## Additions from the main session

- 15:08, the user (via main): "each watch within the agent should be anmed differently with a name of what it does
  so that i know what each is for". Main registered the names as D-16 (non-blocking). Meanwhile, build with D-16's
  recommendation A:
  - the new watch: display name "Decision answers watch", file `scripts\watch-decision-answers.ps1`;
  - rename `watch-session.ps1` to `watch-usage-and-context.ps1`, display name "Usage and context watch";
  - rename `watch-agent.ps1` to `watch-agent-size-and-stall.ps1`, display name "Agent size and stall watch".
  - "Display name" = the description the starting agent gives the background task (what the user sees in the task
    list). SKILL.md and every place that says how to start a watch must give the exact description beside the
    command. Rename every reference in this repo (scripts, tests, hooks, SKILL.md, references, README, agents\, the
    guide pages); old file names stay out of new text.
  - The global `C:\Users\user\.claude\CLAUDE.md` names watch-session.ps1: main's; put the exact lines in my summary.
  - Main's running session watch uses the old path until main restarts it: keep a working `watch-session.ps1` until
    my last run, or tell main in the summary when it is gone. If D-16 is answered with other names, main sends them.

- 15:19 (main's message), the user's answers; main closes all five:
  - D-15, now part of this task: "we agrred that the stiection gets renamed to follow up, and the agent can add
    antyhign they like into the follow section, but cannot change the oriigonal options if there are any, if options
    have chnaged then a child decision needs to be created." So a Follow up may hold whatever the agent needs (several
    lines, examples), never a change to the entry's Options; changed options mean a new child entry.
  - D-16 (watch names): "Chose A". Names as above.
  - D-17 (answers log design): "Chose A ... Comment: yes and the answers log should have all asnwers, answered or
    unaswered etc". My design keeps every answer for good whatever its state (handed over or not, processed or
    not): covered, no child needed (decided 15:5x, see Decisions log).
  - D-18 (both hand over, first wins): "Chose A ... Comment: yes i should alos be able to answer deciosins in the
    main chat not only in the decisions pane". Answering in the chat stays first-class: main records it with
    `register.mjs answer --handed-over`; SKILL.md must say so plainly (R2 builds the flag, R6 the text).
  - D-19 (conversion of old registers): "Chose A".

- 17:15 (main): D-21 (raised by main: runs are slow because memory forces one at a time) answered by the user: "i
  closed some of the vs code widnows, see how much memeory you have left". Main: go with D-21's option A: run the
  pane step (R4, other repo, disjoint files) beside the other runs, at most two workers at once, read the free
  memory before starting the second (hold it back under about 900 MB); merge R6 (renames) and R7 (docs) into one
  run. Heavy commands still through run-heavy.ps1. Main closes D-21.
- 17:22 (main): free memory 3131 MB. Two workers at once is safe; ceiling two; start the second as soon as its
  files are disjoint from the first's.

- 18:58 (main), the user's answers: D-22 "Chose A: keep it this way" (closed). D-23 "Chose A ... Comment: A and i
  assuem you mean a retry mechanism after a fail" (closed): main: a retry at every look after a failure, keeping the
  last good list meanwhile; make sure it really retries rather than caching the failure. D-24 "Other: i dont
  undertand": main followed it up with a plain explanation; build nothing for it until answered. D-25 "Chose A"
  (closed).
- 19:02 (main), the user adds to the Decision answers watch: "we have a separate watch which checks every 15mins for
  answereded decisions, lets keep that but increase the default period to every 30mins, and lets add another
  mechanism, were if all open decisions get answered they all get sent to the main chat. so lets say there are
  currenlty 5 open decisions and i asnwer them within 3mins, they should all get sent when asnwered." Main: (1)
  default interval 30 minutes (setting, docs, display text, tests); (2) second trigger: as soon as no entry of the
  chat's own register waits for the user and at least one answer is not handed over, hand them all over at once.
  4 of 5 answered: the 30-minute rule applies. The watch looks often (cheap check), hands over only on one of the two
  triggers; choose the look interval and make it a setting. Keep D-18 (exactly once) and D-14 (own repo only). Fold
  into a run that touches the watch; register only what the user did not decide.

- 19:19 (main): D-24 "Chose B: leave it ... Comment: well if the shorter name work it works thats all that matter."
  Nothing to build; closed. D-26 "Chose A ... Comment: check every 5 seconds but what will decide if all answers are
  sent to the chat?": main followed it up (the watch decides: no entry waits for the user and at least one answer
  is not handed over); a followed-up entry waits for the user again, so it rightly holds the trigger back: tests
  must cover that (R3b's report lists a follow-up test: verify). 19:22: user confirmed D-26 A; closed. D-27 "Chose
  A"; closed.
- 19:24 (main): the user: "run more step in parralel". Ceiling now three workers at once (read free memory before
  each start; hold back under about 900 MB). No two agents on the same file. Split the last step (renames + docs) so
  every part disjoint from R3b/R4c starts at once. (I was blocked in the R3b/R4c Agent calls until 20:10, so the
  split starts after them.)

## The design (decided by me, 15:05-15:15; reasons inline)

1. **The answers log**: `<repo root>\decisions\ANSWERS_LOG_CLAUDE.jsonl` (new setting `register.answersLogFile`).
   One JSON object per line, keys in this order: `id`, `answeredAt` ("YYYY-MM-DD HH:MM", local, as every register
   time), `answer` (the user's words exactly, line breaks kept), `handedOverAt` (null until handed to the main
   session), `processedAt` (null until close or follow-up). Why JSON Lines: the user asked for "not .md, easy to
   search"; one line per answer greps well and parses with no parser. Why state fields in the same file and a whole
   rewrite under the lock: one file to keep, the same atomic write and lock as the other register files; a guard
   refuses any write that would drop or change an earlier record's id, time or words.
2. **The answered file goes.** The queue of answers not yet handed over = records with `handedOverAt` null; not yet
   processed = `processedAt` null. An old answered file is folded into the log by the next write under the lock
   (R1), so an answer given in the pane before R1 lands is never lost. `register.answeredFile` stays in the config
   for the fold and for `migrate`.
3. **Close**: `close --id --outcome --summary "<text>"`. The resolved entry gets `- Final answer: <time>: "<words>"`
   (the id's last log record, copied by the script, so the user's own words are always there) and
   `- Summary: <text>` (the closing agent's), then `- Resolved: <time>, <outcome>`. Answers are not copied into the
   entry. Close needs at least one unprocessed answer, as today.
4. **Follow up**: `follow-up --id --text "<text>"` appends `- Follow up: <time>: <text>` (timed, so the pane can
   show answers and follow-ups in order), status back to waiting-for-user, marks the id's answers processed.
   `keep-open --still-open` stays accepted as the old spelling of the same command. Old `Still open:` lines are
   read as follow-ups (pane), converted by `migrate`.
5. **Search**: `answers [--ids D-7,D-2-5] [--words <text>] [--json]`. `list --answered` keeps its old output shape
   (`## D-7` + `- Answered:` lines), now from the unprocessed log records, so the hook text and older callers work.
6. **Hand-over exactly once** (R2): `handover` (lib + command) marks every record with `handedOverAt` null and
   prints them; used by the watch and by the prompt hook (whichever comes first wins). `answer --handed-over` is
   what the main session uses for an answer typed in the chat, so the watch never brings it back. The hook takes a
   short lock wait and, when busy, leaves the hand-over to the watch or the next prompt. Handed-over but not yet
   processed entries are not repeated by the hook; a successor main session finds them with `list --answered`.
7. **The decision answers watch** (R2): `scripts\watch-decision-answers.ps1`, thin: looks at start, then every
   `decisionAnswersWatch.everyMinutes` (15) minutes runs `node register.mjs handover --root <root>`; when it prints
   answers, the watch prints a first line `DECISION ANSWERS | D-20, D-21`, the answers, one instruction line, and
   ends (which wakes the main session). Register busy: try next round; repeated failure ends with a FAILED line.
   Only the chat's own repo's register (D-14).
8. **Migration** (R4): `migrate` moves Answered lines out of open and resolved entries into the log (processed),
   the old answered file's into the log (not handed over), renames Still open to Follow up, and gives each old
   resolved entry a Final answer line (no invented Summary: registered as an initiative).
9. **Working on live files**: `<orch>` is live, so workers develop in a scratch copy of `orchestrate-agents`, run
   the suite there, copy the finished files in at the end, and run the suite again in the live folder. Mutation
   checks run only in a scratch copy.

## Runs (in order; why cut this way)

Cut by the order the live pieces depend on each other: the log first (everything reads it), then the hand-over
that marks it, then the pane that shows it, then the conversion of old registers, then renames and docs, which
touch many files and want the final shape.

- **R1, register core**: the log, `answer` into it, the fold of an old answered file, `answers` search,
  `list --answered` from the log; `close --summary` with Final answer, `follow-up` (+ old `keep-open`). Also the
  SKILL.md command block and the hook's instruction line, so nothing live is wrong after the run.
- **R1b**: D-15's follow-up of several lines + R1's mutation check (R1 ran out of room).
- **R2, hand-over**: `handOverAnswers` + `handover` + `answer --handed-over`, the hook hands over and names entries
  handed over earlier; SKILL.md lines for answering in the chat (D-18's comment).
- **R3, the decision answers watch**: `scripts\watch-decision-answers.ps1` (thin loop over `handover`), config
  section `decisionAnswersWatch` (`everyMinutes` 15, failures before it stops), Node tests spawning pwsh, the
  start/restart step in SKILL.md "Starting work" with the display name "Decision answers watch".
- **R4, the pane** (`C:\Repos\My projects\claude-code-extensions\decisions-pane`): Follow up label, earlier answers
  from the log beside a followed-up entry, README; pane validate/test/type-check.
- **R5, migration**: `migrate` for the old layout, on scratch copies of the real register (0 answers lost).
- **R6, renames** (D-16): the two existing watches renamed, every reference, display names; `watch-session.ps1`
  left as a forwarder to the new name until main has restarted (decide at R5 after a searcher's sweep; config keys
  such as `watchSession` too, or not: decide then, a running old watch may re-read them).
- **R7, docs**: SKILL.md (start/restart/process the decision answers watch, display names), `agents\task-lead.md`
  section 8, the guide page, README; the exact global-instruction lines for main; the PowerShell suite once.

Memory is low (about 1 GB free): one worker at a time.

## Register ids I raised

- D-17 (initiative, answers log design): answered A by the user (15:19), closed by main.
- D-18 (initiative, both hand over, first wins): answered A (15:19), closed by main.
- D-19 (initiative, conversion of old registers, no invented summary): answered A (15:19), closed by main.
- D-22 (initiative, low: how a returned decision's history shows in the pane, R4): open.
- D-23 (issue, medium: pane hides all decisions after a failed read until a file changes; pre-existing): open;
  meanwhile R4b fixes it (A) beside R5 unless the user says B.
- D-24 (issue, low: PowerShell accepts a shortened parameter name, vs D-0007): open; recommendation B (leave).
- D-25 (initiative, low: main stops restarting the watch after two same failures and tells the user, R3): open.
- D-22 A, D-23 A (+ "a retry mechanism after a fail"), D-25 A: answered 18:58, closed by main. D-24: user did not
  understand; main followed it up; build nothing for it until answered.
- D-26 (initiative, low: the watch looks every 5 s, cheap file check, register read only on change): open.
- D-27 (initiative, low: pane retries a failed size check too, and says so after 30 s of failing reads): open.
- D-20 (issue, low: timing-sensitive test in limit-stop-server.test.mjs): answered 16:03, "Chose B: leave it; each
  lead re-runs it alone when it fails (no work now, a few minutes lost now and then)." Main closes it. Every task
  file keeps the line "if it fails, re-run that file alone and report both results; do not change it".
- Main's: D-15 (follow-up may hold anything, never change Options) and D-16 (watch names, A): answered 15:19.

## Runs: state

| Run | Agent id | Started | Task file | Progress file | State |
| --- | --- | --- | --- | --- | --- |
| R1 | a7de81feb6257bc11 | 15:12 | R1_TASK_CLAUDE.md | R1_PROGRESS_CLAUDE.md | done 15:49, checked by lead 15:53; mutation check not run (moved to R1b) |
| R1b | a1a243dede6638938 | 15:54 | R1B_TASK_CLAUDE.md | R1B_PROGRESS_CLAUDE.md | done 16:30; lead: hashes ok (only its files + main's register writes), smoke ok; suite run (bz6l0t9c9) waiting for a slot at 16:37 |
| R2 | a9ba5b877a0ff7976 | 16:38 | R2_TASK_CLAUDE.md | R2_PROGRESS_CLAUDE.md | done 17:23 (live 17:15); lead 17:29: 192/192, hashes ok (only its files + main's register writes), smoke of hook + handover ok |
| R3 | a42bb2be7c65612c8 | 17:31 | R3_TASK_CLAUDE.md | R3_PROGRESS_CLAUDE.md | done 18:25 (live 18:22); lead 18:30: 204/204, smoke ok, hashes ok |
| R4 | ab0d28290bebf2819 | 17:31 | R4_TASK_CLAUDE.md | R4_PROGRESS_CLAUDE.md | done 17:57; lead 18:30: pane 43/43, validate ok, hashes ok; needs main's reload |
| R5 | a02e511b167341627 | 18:33 | R5_TASK_CLAUDE.md | R5_PROGRESS_CLAUDE.md | done 19:00 (live 18:44); lead 19:07: 213/213, migrate smoke on a copy ok |
| R4b | a9ee2f2496cd016a0 | 18:33 | R4B_TASK_CLAUDE.md | R4B_PROGRESS_CLAUDE.md | done 18:45; lead 19:07: pane 47/47, validate ok |
| R3b | aa8109f9e69c25a4f | 19:09 | R3B_TASK_CLAUDE.md | R3B_PROGRESS_CLAUDE.md | done 20:10; lead 20:15: 220/220, hashes ok |
| R4c | affa056d227dfb782 | 19:09 | R4C_TASK_CLAUDE.md | R4C_PROGRESS_CLAUDE.md | done 19:23; lead 20:15: pane 53/53, validate ok |
| R6a | a4609875df793cffd | 20:18 | R6A_TASK_CLAUDE.md | R6A_PROGRESS_CLAUDE.md | done 20:46; hashes ok; lead's suites (Node + PS) running bc26dayne |
| R6b1 | a237d47639f98335c | 20:18 | R6B1_TASK_CLAUDE.md | R6B1_PROGRESS_CLAUDE.md | done 20:38; hashes ok; consistency search by lead ok |
| R6b2 | ab11ae394bc98ac2e | 20:18 | R6B2_TASK_CLAUDE.md | R6B2_PROGRESS_CLAUDE.md | done 20:36; hashes ok; one stale quote (usage-limits.md:200) -> R7 |
| R7 | a8356a6acd0a81359 | 21:02 | R7_TASK_CLAUDE.md | R7_PROGRESS_CLAUDE.md | done 21:17; its issue (two more double-quoted forms) -> R7b |
| R7b | a72041b758131ff7e | 21:19 | R7B_TASK_CLAUDE.md | R7B_PROGRESS_CLAUDE.md | done 21:33. Lead 21:33: end-to-end smoke ok (watch ended 1 s after the last of 2 answers; close with a here-string summary kept $5 and $(today)); final suites b7dnvdwck running; then the summary |

## Decisions log

- 15:05 Answers log in JSON Lines with state fields, whole-file atomic rewrite under the register lock: see design 1.
- 15:05 Answered file removed, folded lazily from R1 on: see design 2.
- 15:06 Close writes Final answer automatically plus the agent's Summary: the user asked for "a resolution summary
  with the final asnwer"; copying the words by script means they are never misquoted.
- 15:07 Hook hands over too (first wins): an answer given in the pane while the user chats reaches the main session
  at once rather than up to 15 minutes later; marking makes it exactly once.
- 15:52 D-17's comment ("all answers, answered or unanswered etc") is covered: the log keeps every answer for good
  whatever its state; an entry with no answer has nothing to log. No child of D-17.
- 15:52 R1 worker's choices accepted, kept here, not registered (internal, no effect the user sees): log ids count
  for the next free id; every writer ensures the info/exclude lines; untouched log lines written back byte for
  byte; a malformed old answered line stops readers; `migrate` reports a fold in one line.
- 15:52 R1's "pane may read the answered file" risk checked by me: the pane's code never reads it (grep: only its
  README line 72 names it). R3 fixes the README.
- 15:52 R1's proposed text for `agents\task-lead.md` section 8 is in `R1_REPORT_CLAUDE.md` ("Shared file that needs
  a change"): R6 uses it (adjust for follow-up/handover).
- 15:53 The real register's header-only answered file was folded away by my `add` of D-20, as designed.
- 16:38 A record already processed is never handed over (the real log holds D-20: recorded and closed by main at
  16:03 without being handed over). Waiting to be handed over = handedOverAt null AND processedAt null.
- 16:38 `handover` prints the whole message (first line `DECISION ANSWERS | ids`, blocks, instruction), so the
  .ps1 watch stays a thin loop that prints it and ends; the hook shares the block formatting, not the first line.
- 16:38 The hook keeps one reminder line for entries handed over earlier and still waiting for an agent, worded
  "if you are already dealing with it, carry on and do not pass the answer again", so a cut-off session loses
  nothing and a busy one does not act twice. Hook lock wait 2 s (`register.hookLockWaitSeconds`); busy = skip.
- 16:38 Watch tests (R3) go in the Node suite, spawning pwsh as the background task does, so every run's check
  covers the watch; the 144 KB PowerShell suite stays for the limit scripts.
- 16:37 R1b's choices accepted (internal: whitespace-only ends dropped, whitespace lines keep their spaces, re-run
  check ignores time). Its issues: nine old `oa-*` test folders in %TEMP% (not ours; name in the summary); the
  pane must split entries at headings and keep two-space lines (into R4's task); the Write tool strips trailing
  spaces of whitespace-only lines (into R4's and R5's tasks: build such test data in code, not with Write).
- 17:29 R2's choices accepted (internal). Its issues: a second timing test of limit-stop-server.test.mjs ("a log
  that cannot be written: serve exits 4 ...") failed once under load and passed alone; covered by the user's D-20
  answer (leave it, re-run alone): named in the summary, not registered again. Old `oa-*` folders: summary.
- 17:29 Plan after D-21 (main 17:15/17:22): R3 (watch, orch) and R4 (pane, other repo) run at once. Then R5
  (migration) alone or beside nothing that touches `decision-register.mjs`; then R6 = renames + docs merged (main's
  instruction), alone, last.
- 18:30 R3's choices accepted (internal: raw UTF-8 output, crash exit counted like 1, -FailuresBeforeStop param).
  Its issues: `references\usage-limits.md` stops only the session watch at a hand-over: R6 adds the decision
  answers watch (R3's proposed text is in R3_REPORT_CLAUDE.md); D-0007 prefix: D-24; the real open file's old
  header: R5's migrate replaces it; suite +40 s: summary.
- 18:30 R4's choices accepted; the display ones registered as D-22. Its stale-read issue verified by me in
  registers.ts 173-187 and registered as D-23. R4's note: state tag moved to decisions-3, so after main's reload
  the pane re-reads its rows (summary: tell main). R4 deleted `test-*.log`/`mutate-*.log` in the session
  scratchpad by pattern (its own, it says). Empty folder `~\.claude\dev-mods\bf7022c6-...` made by the engine when
  it loaded plugin-authoring: summary.
- 18:31 Found three generations of register layout in the real registers (this repo, xpp-agent,
  claude-code-extensions): oldest has the user's words in the Resolved line (`- Resolved: <t>, <outcome>:
  "<words>"`); middle has in-entry Answered/Still open lines; today's has the log + Final answer/Summary. R5's
  migrate converts all three into today's (D-17's comment "the answers log should have all asnwers"). Migrated
  records are merged into the log in time order (close copies the LAST record as Final answer, so order matters);
  a separate insert-only guard for migrate. Other repos' registers are used read-only as test material, counts only
  in reports (D-14).
- 19:07 R5's choices accepted (internal). Its issue: SKILL.md's migrate description out of date: R6 (text in
  R5_REPORT_CLAUDE.md). The exact commands for main to run migrate on each real register are in R5's report: put
  them in the task summary.
- 19:07 R4b's choices accepted. Its issues (stat failure = missing; stale list with no sign) go to R4c, D-27.
- 19:07 The user's 19:02 addition goes to R3b (watch + `handover --when-all-answered`, under one lock). Look
  interval 5 s, a cheap size/time check; register.mjs runs only when a file changed (D-26).
- 19:07 Next after R3b and R4c: R6 = renames (D-16) + all docs, alone, last.
- 20:15 R3b's choices accepted: a failed look retried at the next look (5 s), so 3 failures can end the watch in
  under a minute (better than a missed early hand-over; the main session restarts it, and D-25 stops a loop). The
  register paths come from the register's own code. R4c's choices accepted: ENOENT only = missing; 30 s constant.
  R4c issues for the summary: notice time is the hooks environment's local time (UTC risk, not checked); missing-file
  detection relies on ENOENT in the engine's rejection (not checked against the real engine).
- 20:16 Last step split three ways (main 19:24, ceiling three): R6a renames code/tests/config (forwarders at the old
  names first, so nothing live breaks; config key renamed only if every reader reads it once at start; protocol
  lines and temp-file names kept). R6b1 SKILL.md + agents\task-lead.md + README. R6b2 references\. All three write
  from R6_FACTS_CLAUDE.md. Docs runs: command-run invariant + consistency search instead of mutation (no logic).
  The forwarders stay; main deletes them after restarting its watches (summary).
- 20:16 Global instruction lines for main (C:\Users\user\.claude\CLAUDE.md lines 68-73 and 175-180): drafted by me
  in the summary.
- 21:01 R6a: config key renamed to usageAndContextWatch (only reader reads once at start); forwarder exit form
  `exit $(if ($?) {0} elseif ($LASTEXITCODE) {$LASTEXITCODE} else {1})` (plain $LASTEXITCODE let a misspelled
  parameter exit 0); PS baseline was really 103/1 (no D-0007 case for the new watch), fixed to 105/0; test file
  clears CLAUDE_CODE_SESSION_ID/CLAUDE_PID so a broken forwarder cannot start a watch on the real session. Accepted.
- 21:01 R6b1/R6b2 accepted. Their initiatives (failure cases added to both guide pages; size watch listed in the
  developer table; task-lead section 1 line) are doc additions consistent with the facts: summary, not registered.
  Corrections into R7: handover/hook instruction line uses double quotes against the here-string rule;
  usage-limits.md:200 quotes the old log text; task-lead.md line 33 "relays ... register entries".
- 15:10 The watch is a thin PowerShell script (main's message names a .ps1) over a Node `handover` command, so the
  logic is tested in the Node suite.
