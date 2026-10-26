# R6 facts: what is true now, for the three parallel runs R6a, R6b1, R6b2

Written by the task lead, 2026-10-26 20:15. Every R6 worker writes from these facts, so the code, `SKILL.md`, the
references, `agents\` and the README say the same thing. `<orch>` is
`C:\Repos\My projects\software-developer-agent\orchestrate-agents`.

## The three watches (the user's names, D-16, chosen 2026-10-26 15:19)

The user: "each watch within the agent should be anmed differently with a name of what it does so that i know what
each is for". The display name is the `description` an agent gives the background task when it starts it (the
PowerShell tool with `run_in_background`); it is what the user sees in the task list. Every place that says how to
start a watch gives the exact description beside the command.

| Display name (exact) | File (new) | Old file | What it watches | Who starts it |
| --- | --- | --- | --- | --- |
| `Usage and context watch` | `scripts\watch-usage-and-context.ps1` | `watch-session.ps1` | the main session's usage limits and context size; wakes an idle session | every main session, first action |
| `Agent size and stall watch` | `scripts\watch-agent-size-and-stall.ps1` | `watch-agent.ps1` | one helper agent's context size, and whether it has gone quiet | as `references\lessons.md` says (a fallback) |
| `Decision answers watch` | `scripts\watch-decision-answers.ps1` | (new today) | hands the user's new answers to the main session | the main session, at start, from its own repo |

- The old file names stay only as two-line forwarders (`watch-session.ps1`, `watch-agent.ps1`) that run the new file
  with the same arguments and exit code, until the main session has restarted its watches; the main session deletes
  them. No new or rewritten text names the old files, except the forwarders themselves and one line saying they are
  forwarders.
- Settings: the section `watchSession` of `orchestration.config.json` becomes `usageAndContextWatch` (R6a decides
  whether that is safe for a watch already running; if R6a keeps the old key, it says so and R6b1/R6b2 are told).
  The Decision answers watch's section is `decisionAnswersWatch` (unchanged).
- Lines the watches print (`WATCH FAILED`, `LIMIT NEAR`, `SESSION RESET COLD`, `SESSION NEAR CAP`, `DECISION ANSWERS |`,
  `DECISION ANSWERS WATCH FAILED |`, ...) and their temp files keep their names: they are the protocol, not names the
  user reads.

## The Decision answers watch (built today, runs 3 and 3b)

- Start: `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1'`,
  from the main session's own repo (it reads only that repo's register, D-14), PowerShell tool, `run_in_background`,
  description `Decision answers watch`.
- It hands answers over at start, every 30 minutes (setting `decisionAnswersWatch.everyMinutes`, the user's choice
  of 19:02: "lets keep that but increase the default period to every 30mins"), and at once as soon as no open entry
  waits for the user and at least one answer waits to be handed over (the user: "if all open decisions get answered
  they all get sent to the main chat"; example: 5 entries wait, the user answers all 5 within 3 minutes, the main
  session gets all 5 right after the fifth). It checks for that every 5 seconds (`lookSeconds`, D-26) by the files'
  size and time only. A followed-up entry waits for the user again, so it holds that early hand-over back.
- It ends printing `DECISION ANSWERS | D-20, D-21`, each answer's label, time and words exactly, what to do, and
  `Start the Decision answers watch again (description "Decision answers watch").` The main session passes each
  answer in the user's words to the lead it concerns, closes or follows up the entry, and starts the watch again.
- After 3 failed looks in a row (`failuresBeforeStop`) it ends with `DECISION ANSWERS WATCH FAILED | <why>`. When it
  fails twice in a row for the same reason, the main session stops restarting it and tells the user that line once
  (D-25, the user chose A).
- At a hand-over (usage limit or context cap) the main session stops it with `TaskStop`, like the Usage and context
  watch.

## The decision register (built today, runs 1 to 5)

- Files in `<repo root>\decisions\`: `OPEN_DECISIONS_CLAUDE.md` (every entry until closed, `Status:`
  `waiting-for-user` or `waiting-for-agent`), `ANSWERS_LOG_CLAUDE.jsonl` (every answer the user ever gave, one JSON
  line each: `{"id","answeredAt","answer","handedOverAt","processedAt"}`, never deleted; the user: "lets create a
  answers log, so the answers dont fill up the actual decisions ... lets not use a .md file", and "the answers log
  should have all asnwers"), `RESOLVED_DECISIONS_CLAUDE.md` (closed entries; each ends with `- Final answer: <time>:
  "<words>"`, `- Summary: <text>` and `- Resolved: <time>, <outcome>`). `ANSWERED_DECISIONS_CLAUDE.md` is gone (folded
  into the log by the next write).
- The user answers in the Decisions pane **or in the chat**; both are first-class (the user, D-18: "i should alos be
  able to answer deciosins in the main chat not only in the decisions pane"). A chat answer: the main session records
  it at once with `answer --id <id> --answer <words> --handed-over`, then processes it. A pane answer reaches the main
  session exactly once, by whichever comes first: the Decision answers watch, or the prompt hook at the user's next
  message (D-18, the user chose A). The hook also names, in one line without words, entries handed over earlier and
  not yet closed or followed up ("if you are already dealing with it, carry on").
- Processing an answer: pass it, in the user's words, to the lead it concerns; then either `close --id --outcome
  --summary "<text>"` (the script copies the user's last answer into the entry as `Final answer`; the summary is the
  agent's, with the final answer in it), or `follow-up --id --text "<text>"`, which sends the entry back to the user.
- A follow-up (the user: "should be called follow up because it foloows up to the decisons"; "follows up are only to
  explian/eloborate or talk about the decision further"; D-15: "the agent can add antyhign they like into the follow
  section, but cannot change the oriigonal options if there are any, if options have chnaged then a child decision
  needs to be created"): it may hold several lines and examples; it never changes the entry's Options; changed options
  are a new child entry (`add` with `"parent": "D-7"`, numbered `D-7-1`). `keep-open --still-open` is the old
  spelling and still works.
- Commands (`node '<orch>\scripts\register.mjs' ...`): `add --file`, `answer --id --answer [--handed-over]`,
  `handover [--when-all-answered]`, `close --id --outcome --summary`, `follow-up --id --text`, `list [--open]
  [--answered] [--resolved] [--ids]`, `answers [--ids] [--words] [--json]` (searches every answer), `summary`,
  `migrate` (converts every older layout: answers inside entries or in Resolved lines move to the log, each closed
  entry gets a Final answer line, `Still open` becomes `Follow up`; safe to run again). Words go in a single-quoted
  here-string, as `SKILL.md` already says for `--answer`; the same for `--text` and `--summary`.
- The Decisions pane (`C:\Repos\My projects\claude-code-extensions\decisions-pane`) shows a returned entry's history
  above its choices: the user's earlier answers from the log and each Follow up, oldest first (D-22). After a failed
  read it keeps the last good list and retries every 2 seconds; after 30 seconds of failures it says so in one orange
  line (D-23, D-27). The main session reloads it after this task.
- Still waiting for nothing from the user on this task's design. D-24 (shortened PowerShell parameter names): the
  user chose to leave it.
