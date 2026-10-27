---
name: orchestrate-agents
description: How to run a large piece of work as the main orchestrator in Claude Code - the main session talks to the user and starts one task lead per task; each lead plans its task, starts its own workers, answers them and checks every result; workers build and test one piece and report only to their lead; cheap searchers find and quote. Covers the lines leads end their turns with, the decision register that carries every question, initiative and issue to the user, the context-guard hook that tells each agent its size, the usage-limit choice between resuming warm and handing over to a relaunched session, workflows in ultracode, and commits after checked work. Use only in a chat the user switched the team on for with /software-developer-agent, which loads it. In any other chat, do not load it and do not start the team, whatever the request says: an ordinary chat gets nothing of the team (the user, 2026-10-26, D-32).
---

# Orchestrating agents: main session, task leads, workers

Large work fails in agent sessions for three ordinary reasons: one agent's context fills up before the work is
done, nobody checks the work of the agent that did it, and the user's decisions get made by whoever happens to hold
the problem. This shape answers all three. The user worked it out with the main session over real work, and set
its current form on 2026-10-25.

```
user <-> main session <-> task leads (task-lead) <-> workers (software-developer) <-> searchers (code-searcher)
         starts leads,      start workers and          build and test,              find and quote,
         relays to user     searchers, decide          may start searchers          never analyse
```

Below, `<orch>` is this skill's folder, `~\.claude\software-developer-agent\orchestrate-agents`. The
agents are in `..\agents\` of the same repo.

## The roles

- **You, the main session**, talk to the user, and nobody else does. You start leads only, never workers: "because
  then the context of the orchestrator fills up quick" (the user, 2026-10-25). You relay what leads raise, keep the
  decision register, run the workflows leads ask for, re-run the checks after each task, make the commits the user
  allows, and alone touch anything live: real configuration, settings, global instruction files, switching a
  feature on. You never read workers' reports; that is the leads' job.
- **A task lead** (`task-lead`) owns one task: it plans, writes each worker's task file, starts the worker,
  answers it, checks its result, and registers every item the user must see. Its whole protocol is in its own
  file. You give it a project brief from `references/lead-brief-template.md`.
- **A worker** (`software-developer`, or a project's own worker type) builds and tests one piece and reports only
  to its lead. Its report ends with a fixed block: decisions taken, initiatives, issues found, questions.
- **A searcher** (`code-searcher`) finds and quotes for anyone: paths, line numbers, verbatim lines, counts. Never
  analysis.
- **Models** (the user, 2026-10-25): leads and workers on Opus 5.5 at `xhigh`, pinned in their files; searchers on
  Haiku 5.5 at `xhigh`; the user picks yours.

## What the platform allows (docs and experiments, 2026-10-25, Claude Code 2.1.286)

| Fact | What follows |
| --- | --- |
| A subagent can start subagents, three levels below the main session by default. | Leads start their own workers; workers may start searchers. |
| A subagent with running children does not finish until they have. | A lead's lines reach you only when its workers are done. |
| `SendMessage` to a finished agent resumes it, and it reports back to whoever resumed it. | A lead answers its worker without you. |
| A subagent's `SendMessage` to `main` waits for your next turn; it does not wake you. | Leads send non-waking notes (`REGISTERED`); waking lines end their turn. |
| `omitClaudeMd: true` drops every `CLAUDE.md` from an agent's start. | Leads and workers read the project's own files themselves; the traps come from the `windows-pitfalls` skill (any Windows PC) and the `machine-pitfalls` skill (this PC's own). |
| `experimental: { cacheTtl: 1h }` gives a subagent a 1-hour cache instead of 5 minutes. | Leads and workers set it: their turns are often far apart. |
| Hooks fire inside subagents, with the agent's id and type. | The context-guard hook tells each agent its size. |
| Only the main session has the `Workflow` tool. | Leads ask you to run workflows. |
| A new session cannot reach the agents of an older one. | A hand-over plans for fresh agents started from files. |

## Starting work

The team runs only in a chat the user switched on: "i dont want the agent architecture to run for all main chats i
want the ability to activate it when i start a new chat and need somethign developed" (the user, 2026-10-26). The user
switches a chat on by typing `/software-developer-agent` (D-33). That command first runs
`node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\team-on.mjs"`, which prints
`AGENT TEAM ON | session <id> | <marker>` and writes the chat's marker under
`%USERPROFILE%\.claude\state\software-developer-agent\team-on\` (setting `agentTeam.onFolder`, a folder under
`teamState.folder`). Until then the two hooks say nothing in this chat or its agents. Then it does steps 1 and 2
below, and loads this skill. Never switch a chat on yourself because a request sounds like team work: say the user can
start a chat with `/software-developer-agent` instead.

Start each watch with the PowerShell tool and `run_in_background`, with exactly the description its step gives:
that description is the name the user sees in the task list, and the user named each watch for what it does ("each
watch within the agent should be anmed differently with a name of what it does so that i know what each is for", the
user, 2026-10-26, D-16).

1. Start the **Usage and context watch**: description `Usage and context watch`, command
   `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1"`.
   It watches your usage limits and your context size, and wakes you when you are idle. It needs no arguments. Note
   its task id. Start it again every time it ends, except after `SESSION RESET COLD`, which leads straight to a
   hand-over from the files. After `LIMIT NEAR` and `SESSION NEAR CAP` start it again at once too: the hand-over on
   record keeps it quiet, and it wakes you if the limit-stop server fails. Stop it with `TaskStop` once the relaunch
   is scheduled (`references/usage-limits.md`).
2. Start the **Decision answers watch**, from your own repo: description `Decision answers watch`, command
   `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1"`.
   It hands you the answers the user gave in the Decisions pane. It needs no arguments and reads only the register
   of the repo it starts in (D-14). Note its task id. It hands over every answer that waits at its start, every 30
   minutes (`decisionAnswersWatch.everyMinutes`; the user: "lets keep that but increase the default period to every
   30mins"), and at once as soon as no open entry waits for the user and at least one answer waits (the user: "if all
   open decisions get answered they all get sent to the main chat"). Example: 5 entries wait, the user answers all 5
   within 3 minutes, and you get all 5 right after the fifth. It looks for that every 5 seconds, by the files' size
   and time only; an entry you followed up waits for the user again, so it holds that early hand-over back. When it
   hands answers over it ends, printing `DECISION ANSWERS | D-20, D-21`, the answers and what to do (The decision
   register, below). After three failed looks in a row it ends with `DECISION ANSWERS WATCH FAILED | <why>`. Start it
   again every time it ends, after passing on what it printed. When it fails twice in a row for the same reason, stop
   restarting it and tell the user that line once (D-25). Stop it with `TaskStop` when the session hands over.
3. Fill in the lead brief from `references/lead-brief-template.md` in the project's working folder.
4. Start one lead per task with the message in `references/start-messages.md`: `subagent_type: "task-lead"`,
   `run_in_background: true`. Several leads at once when their files are disjoint and memory allows.
5. Wait. Each lead wakes you only with one of the lines below.

The third watch, the **Agent size and stall watch** (`scripts/watch-agent-size-and-stall.ps1`, description
`Agent size and stall watch`), watches one helper agent's context size and whether it has gone quiet. It is a
fallback: start it only as `references/lessons.md` says.

## The lines

A lead ends its turn only for these; the line is the first line of its last message.

| Line | What you do |
| --- | --- |
| `QUESTION FOR THE USER \| D-<id>` | The entry is in the user's Decisions pane. Tell the user in one line that blocking D-<id> waits (id and what) and ask them to answer it there soon; do not write the entry out. Process the answer when it comes (The decision register, below). |
| `RUN WORKFLOW \| <script path> \| <purpose>` | Read the script, run `Workflow({scriptPath})`, send the lead the result path. |
| `LEAD HANDS OVER \| <lead file>` and `NEXT TASK FILE \| <path>` | Start a successor lead (`start-messages.md`). |
| `TASK DONE \| <summary file>` | Re-run the full checks, optionally a review workflow on the diff, commit if allowed, report to the user. The task's decisions are in the register, so the report does not write them out (Relaying, below). |
| `LEAD STOPPED \| <lead file>` | Part of the limit hand-over (below). |
| `WAITING FOR WORKER \| <run>` | Nothing: the lead's worker is still running. |

Between lines, a lead may send `REGISTERED | D-12, D-13` by `SendMessage`; the user sees those items in the
Decisions pane, so you do not repeat them (Relaying, below). You send leads: the user's answers, `PAUSE`, workflow results, and `STOP FOR LIMIT` only after a
`LIMIT STOP SERVER FAILED` line has told you that the limit-stop server failed (at a usage-limit hand-over and at
your own context cap the server tells every agent itself). Texts in `references/start-messages.md`.

## The decision register

Every question, initiative and issue that must reach the user is an entry in `<repo root>\decisions\`, in three
files (the user, 2026-10-26). Only `register.mjs` writes them; never edit them by hand.

| File | Holds |
| --- | --- |
| `OPEN_DECISIONS_CLAUDE.md` | Every entry until it is closed, with its whole context and a `Status:` line: `waiting-for-user` until the user answers, then `waiting-for-agent`; a follow-up sets it back to `waiting-for-user`. |
| `ANSWERS_LOG_CLAUDE.jsonl` | Every answer the user ever gave, one JSON line each: `{"id","answeredAt","answer","handedOverAt","processedAt"}`, the words exactly as given. A line is never deleted, so the log keeps every answer and the entries do not fill up with them (the user, 2026-10-26: "lets create a answers log, so the answers dont fill up the actual decisions ... lets not use a .md file", and "the answers log should have all asnwers"). |
| `RESOLVED_DECISIONS_CLAUDE.md` | Closed entries, each ending with `- Final answer: <time>: "<words>"` (the user's last answer), `- Summary: <text>` and `- Resolved: <time>, <outcome>`. |

**Entries.** Each entry has an id, a kind (question, initiative, issue), blocking or not, an urgency (`high`: work
waits on it or it gets costly to undo within hours; `medium`: needed before its task ends; `low`: whenever), what, a
tiny example, options with costs, a recommendation, and what happens meanwhile. Ids are `D-<n>`, counting up; a
child of an entry is numbered under it, so `D-2-5` is the fifth child of `D-2`. Older registers wrote `D-0007`;
every command takes that spelling too, and `migrate` rewrites it. Leads add entries with `add` (the fields are in
`agents\task-lead.md` section 8); you add your own the same way (Relaying, below). Every entry, yours too, is
readable at a glance and never a block of text (the user, 2026-10-27, D-40): short sentences, one short line per
option, and an idea with parts written as a list of points (`what`, `example`, `recommendation` and `meanwhile` each
take one, its headline first), which the register stores and the Decisions pane shows one point per line; section 8
of `agents\task-lead.md` has a sample entry as the pane shows it.

**How an answer reaches you.** The user answers in the Decisions pane or in the chat, and both are first-class (the
user, 2026-10-26, D-18: "i should alos be able to answer deciosins in the main chat not only in the decisions
pane").

- **An answer typed in the chat**: record it at once, in the user's own words, with
  `answer --id <id> --answer $answer --handed-over`, then process it (below). `--handed-over` marks it as already
  with you, so it is never handed to you again. Its status becomes `waiting-for-agent`.
- **An answer given in the pane** is recorded by the pane and reaches you exactly once, by whichever comes first
  (D-18, the user chose A): the Decision answers watch (Starting work, step 2) or the reminder at the user's next
  message (below). Both give each answer's entry, time and words exactly as given, then what to do, and mark each
  answer handed over, so it never comes twice. The watch's printout starts with `DECISION ANSWERS | D-20, D-21` and
  ends with `Start the Decision answers watch again (description "Decision answers watch").`: do that once you have
  passed the answers on. The reminder's says `the user's answers, handed to you now:`.
- **The reminder.** The user answers in a decision tab of their own, so a hook no longer lists every open entry
  (the user, 2026-10-26). It adds to a prompt only what cannot wait, per register: the blocking entries that still
  wait for the user (`D-4 "Drop the old import path?" (urgency high)`); the answers that wait to be handed over,
  handed to you then with their words; and, in one line without words, the entries handed to you earlier that are
  not yet closed or followed up (`handed to you earlier and not yet closed or followed up: D-7 (handed over
  2026-10-26 10:15)`), so nothing is lost when a session was cut off. If you are already dealing with such an
  entry, carry on and do not pass the answer to the lead again. Only the chat's own repo's register is read: no
  decision leaks between repos (the user, 2026-10-26, D-14, definitive). Work on the agent team is done from a chat
  in the agent repo.

**Processing an answer: you do it.** For each entry that waits for you, read the answer (`list --answered`) and the
entry (`list --open --ids`), and send the lead it concerns the answer in the user's words. Then decide:

- Close it with `close` when the answer settles every point, with a `--summary` of the decision in plain words that
  includes the final answer. Example: "A, retry once" to "Retry a rejected invoice? A: once. B: never." gives
  `--summary 'Retry a rejected invoice once (A).'`. The script copies the user's last answer into the entry, which
  moves to the resolved file and ends with its `Final answer:`, `Summary:` and `Resolved:` lines; the answers stay
  in the log, marked processed.
- Follow it up with `follow-up` when it needs more, in `--text`. A follow-up explains, elaborates or talks about the
  decision further ("follows up are only to explian/eloborate or talk about the decision further", the user,
  2026-10-26). It may hold anything you need, several lines and an example included, but it never changes the
  entry's options: changed options are a new child entry, `add` with `"parent": "D-7"`, numbered `D-7-1` (the user,
  D-15: "the agent can add antyhign they like into the follow section, but cannot change the oriigonal options if
  there are any, if options have chnaged then a child decision needs to be created"). Example: D-7 asks "Retry a
  rejected invoice? A: once. B: never." and the user answers "depends on why". A follow-up may say "A timeout
  clears by itself; a missing VAT number does not. Which did you mean?". A third option, "C: retry timeouts only",
  is not a follow-up: it is the child entry D-7-1. The text goes to the end of the entry as a `Follow up:` line,
  each further line indented by two spaces; its status goes back to `waiting-for-user`, so the user sees it again,
  and its answers are marked processed. `keep-open --still-open` is the old spelling and does the same.
- When only the lead can tell whether the answer settles it, ask the lead first.

An overruled initiative is cheap to undo early: register initiatives soon, not at the end of a task.

**The commands.** Every command also takes `--root <dir>` (below):

```
node '<orch>\scripts\register.mjs' add --file '<working folder>\entry.json'
node '<orch>\scripts\register.mjs' list [--open] [--answered] [--resolved] [--ids D-4,D-2-5]
node '<orch>\scripts\register.mjs' answers [--ids D-7,D-2-5] [--words '<text>'] [--json]
node '<orch>\scripts\register.mjs' summary
$answer = @'
<the user's words, pasted as they are; several lines are fine>
'@
node '<orch>\scripts\register.mjs' answer --id D-7 --answer $answer --handed-over
node '<orch>\scripts\register.mjs' handover [--when-all-answered]
$summary = @'
<the decision in plain words, the final answer included>
'@
node '<orch>\scripts\register.mjs' close --id D-7 --outcome <answered|accepted|overruled|fixed|wont-fix> --summary $summary
$text = @'
<what explains, elaborates or talks about the decision further; several lines are fine>
'@
node '<orch>\scripts\register.mjs' follow-up --id D-7 --text $text
node '<orch>\scripts\register.mjs' migrate
```

`list --answered` shows the answers no agent has processed yet, per id. `answers` searches every answer in the log,
processed or not: `--ids` keeps those ids, `--words` keeps answers that hold the text in any case, `--json` prints
each record as its stored line. `handover` hands you every answer that waits (given in the pane, not yet handed over
or processed); nothing when no answer waits. `handover --when-all-answered` is the Decision answers watch's look
between its full ones: it prints and marks nothing while any open entry still waits for the user, and once none
does it does what `handover` does.

Pass the words only this way, never in double quotes: there PowerShell runs `$(...)`, drops `$5`, turns a
backtick-n into a line break and splits the argument at a curly double quote (measured 2026-10-25). `@'` ends its
line and `'@` starts its own. A line of the words that itself starts with `'@` (or a curly quote and `@`) makes the
command fail to parse, and nothing is written: then save the words with the Write tool and pass
`--answer (Get-Content -Raw -LiteralPath '<file>')`. The same holds for `--summary` and `--text`, set in `$summary`
and `$text` as the block shows.

`--root <dir>` points at another repo; by default the repo of the working folder. In the repos
`register.commitInRepos` names the register is committed; in any other repo every add puts the register's own
files in `.git\info\exclude`, which only this machine sees. The list is this PC's own: it is read from the PC settings
file (`<teamState.folder>\pc-settings.json`, which the init script creates), and without one it is the folder the repo
lies in, followed by `\*` (`D:\Work\*` for a clone at `D:\Work\software-developer-agent`).

`migrate` moves a register written by an older version to today's layout and prints one line per file it changed,
or one line that says nothing needed changing. It folds an old `ANSWERED_DECISIONS_CLAUDE.md` into the answers log
(any write does that too), writes old ids `D-0007` as `D-7`, gives an open entry without one a `Status:` line, and
moves the answers kept inside old entries to the log, in time order and each once (their `Answered:` lines, and the
words of an old `Resolved:` line). Each closed entry gets a `Final answer:` line with its last answer, but no
`Summary:` is made up, and each `Still open:` line becomes `Follow up:`. A line it cannot read stops it with exit 1,
naming the file and the line, and nothing is changed. It is safe to run again, and a run cut short finishes on the
next.

**Relaying: decisions go to the register, never into the chat.** The user, 2026-10-26, replacing the same day's rule
to write every decision out in the chat: "all of decisions, questions, issues should be added to the decisions file,
where i will see them in the decisions pane, thats why it was created so that it declutters the main chat, so even
on initial decision they should not show in the main chat." So every question, initiative and issue, whether from a
lead, a workflow's lists, a lead's summary or your own work (a proposal, a plan, a page), is an entry in the
register (`register.mjs add`, with the fields leads use: `agents\task-lead.md` section 8), and your reply does not
write it out. The one exception: while a blocking entry waits for the user, end your reply with one line naming it,
id and what, with a request to answer it in the Decisions pane soon. Example: "D-14 (blocking): round VAT per line or
per invoice? Please answer it in the Decisions pane soon; the import waits on it."

## Talking to the user

- Answer first, then explain only as far as they need to act. Plain words, one thought per sentence.
- Show the thing before naming it: paste what a feature looks like to whoever uses it, then talk about it.
- Say where a feature came from when the user did not ask for it by name: the plan and their own earlier words.
- Never report a decision, a result or a number you have not seen; if an agent said it, say so.
- The report of a whole task, or an explanation of how a delivered feature works, follows `explain-clearly`'s
  elaborate form (terms first, a diagram and one running example, then points), as an HTML explainer page when it
  runs past a screen. Any decision it holds goes to the register, not into the chat (Relaying, above).
  `explain-clearly` and `report-changes` are skills of this repo, linked into the skills folders like `team-rules`.

## Sizes

Caps (the user, 2026-10-25; numbers in `contextCaps` of `orchestration.config.json`, which wins):

| Agent | Cap | Warned at | Stopped at | Told by |
| --- | --- | --- | --- | --- |
| worker | 400k | 320k | 370k | the context-guard hook |
| lead | 500k | 430k | 470k | the context-guard hook; it then hands over |
| main session | 500k | 450k | | the context-guard hook and the Usage and context watch: `SESSION NEAR CAP` |

The hook reads the agent's own transcript after every tool call and adds a `CONTEXT GUARD` message once per level.
It must be proven to reach subagents before you rely on it; the fallback, the Agent size and stall watch, is in
`references/lessons.md`. In the main session it reads the session's own transcript and says `SESSION NEAR CAP`
once, as the Usage and context watch does; both mean the same. On `SESSION NEAR CAP`, hand over at once: finish the
edit in hand, start nothing new, and start the Usage and context watch again (it stays quiet and wakes you if the
limit-stop server fails). The hook or that watch, whichever noticed first, has started the limit-stop server, so
every lead and worker hears `STOP FOR LIMIT` once, at its next tool call: send no stop message. Wait for
`LEAD STOPPED` from every running lead, with no deadline (the user, 2026-10-25). Then write the hand-over listing
each lead's hand-off (the project's rules say where), run the `schedule-relaunch.ps1 ... -ContextCap` command the
texts print and, in the same step, the server's `stop` command they print; stop both watches with `TaskStop` (an
answer the user gives later reaches the next session through the reminder) and end with `Read <path> and carry on.`
A scheduled task opens the next chat with that line `relaunch.afterCapMinutes` (1) later, as after a limit
hand-over. A `LIMIT STOP SERVER FAILED` line (below, under Usage limits) changes only how the leads are told. Step
by step: `references/usage-limits.md`.

## Usage limits

The Usage and context watch also reads the five-hour and weekly usage (thresholds 95% and 98%). At a threshold it
checks whether every warm agent's cache outlasts the reset; finished agents, helper types and workflow agents do not
count (`references/usage-limits.md`). If so it stays quiet, and after the stop and the reset it ends with
`SESSION RESUMED`: carry on and resume the cut-off leads. If not:

- `LIMIT NEAR | HAND OVER | ...`: start the Usage and context watch again at once (it stays quiet, wakes you if the
  limit-stop server fails, and turns a hard stop into `SESSION RESET COLD`). Before it ended, it started the
  limit-stop server (`scripts/limit-stop-server.mjs`): through a named pipe (a private in-memory channel; nothing
  on disk) the context-guard hook gives every agent of this session `STOP FOR LIMIT` once, at its next tool call.
  Each worker writes a hand-off in its progress file and ends with `WORKER STOPPED`; each lead waits for its
  workers, writes its own hand-off and ends with `LEAD STOPPED`. Send no stop message. Wait for `LEAD STOPPED` from
  every running lead, with no deadline (the user, 2026-10-25); if the limit runs out first, the restarted watch wakes
  you after the reset with `SESSION RESET COLD`. Write the hand-over, listing every lead's hand-off, run the
  `schedule-relaunch.ps1` command the watch printed and, in the same step, the server's `stop` command, `TaskStop`
  both watches (an answer the user gives later reaches the next session through the reminder), and end. One minute
  after the reset (`usageLimits.relaunchMarginMinutes`) a scheduled task opens a new chat in this project's VS Code
  window with `Read <hand-over> and carry on.`; it starts each lead from its hand-off.
- `LIMIT STOP SERVER FAILED | <time> | <what failed>. Only now the fallback: ...`: the server did not start, died or
  stopped answering during the hand-over, or an agent's hook got an error from it. The context-guard hook says it at
  your next tool call; when you are idle, the restarted Usage and context watch ends with it. Whichever notices
  first tells you, and the other stays quiet (`references/usage-limits.md`, "When the limit-stop server fails").
  Only now do the fallback it names: send `STOP FOR LIMIT` (`start-messages.md`) to every lead that has not ended
  with `LEAD STOPPED`, wait for each, with no deadline, and tell the user in your final message that the server
  failed, and what failed. Start the Usage and context watch again if it was the one that said it.
  `LIMIT STOP SERVER NOT CHECKED` from that watch means it could not check: start it again; it says the same cause
  only once.
- `SESSION RESET COLD | ...`: resume no agent; write the hand-over from disk (or finish yours), schedule the
  relaunch with `-At now` and, in the same step, stop the server with the command the line prints, stop the Decision
  answers watch with `TaskStop`, and end. Start neither watch again.

Step by step, with an example: `references/usage-limits.md`.

## Ultracode and workflows

- Ultracode asks for a workflow per substantive task. Here your substantive work is steering leads, so you do not
  turn a task into a workflow yourself. Workflows serve the leads.
- A lead that wants a fan-out (a research sweep, an independent review of a finished run, a many-file mechanical
  change, adversarial checking of claims) writes the script and ends its turn with `RUN WORKFLOW`. You read the
  script, run it, and send the lead the result path.
- In those scripts every agent writes its full output to a file and returns at most about 1,000 words: paths,
  counts, and the lists `decisions`, `initiatives`, `issues`, `questions`. Building stages use
  `agentType: "software-developer"`, searching stages `agentType: "code-searcher"`. No stage needs a user
  decision half way.
- On `TASK DONE` you may run a review workflow yourself: independent reviewers on the diff, findings to a file,
  passed to the lead to act on.
- Ultracode lifts the cap on agents at once, so the ceiling is stated here: a lead runs at most two workers at once.

## Several agents at once

- **Never two agents on the same files** (the user, 2026-10-13). Before starting a second lead, list the files each
  task may change; a shared settings, types or registration file counts as shared.
- **Heavy commands take turns.** Every type-check, test run, build or long real-data run, from any agent, goes
  through `& '<orch>\scripts\run-heavy.ps1' -Command '<command>'`: it waits for a free slot and for the free memory
  `runHeavy.minFreeMB` asks for (600 MB), and its last line gives the peak. On this 7.8 GB machine it is these commands, not the agents, that fill memory.
- **Read the free memory before starting a lead**:
  `(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024` MB.
- **The usage limit runs out sooner** with agents at once, and a cut-off stops all of them together.

## Checks and commits

- After each finished task, run the full check yourself: type-check, the whole suite, the integration tests that
  need no live system, and that nothing forbidden changed (protected folders, live config, build output).
- Commit only with the user's standing go, and only what was checked. Name files one by one when other sessions
  share the tree, scan what is staged for secrets, and never push.

## When things go wrong

- An agent cut off by the usage limit, an expired sign-in or a server error arrives as `failed`; its work is fine.
  Resume it only while its cache is warm; otherwise a fresh agent carries on from its files.
- A quiet agent: its transcript's last-write time is the sign of life; 40 minutes of nothing with no long command
  running means stuck.
- A restart of Claude Code kills both watches and every running agent's run; transcripts survive. Start both
  watches again (Starting work, steps 1 and 2) and resume warm agents by id.
- Never switch models on a large context: the cache is thrown away.
- The evidence behind each rule: `references/lessons.md`.

## Files that make it durable

| File | Kept by | Holds |
| --- | --- | --- |
| The lead brief | you | `references/lead-brief-template.md`, filled in for the project. |
| A lead file per task | the lead | Plan, decisions with reasons, state, register ids, what a successor reads. |
| Task, progress and report files per run | lead, worker, worker | What was asked, how far it got, what it found. |
| The decision register | leads add; you record chat answers, close and follow up | Everything waiting for the user or for you (`OPEN_DECISIONS_CLAUDE.md`), every answer the user ever gave (the answers log, `ANSWERS_LOG_CLAUDE.jsonl`), and every closed entry (`RESOLVED_DECISIONS_CLAUDE.md`). |
| The status and sizes files | leads, you | One row per run; every run's size, tool calls, minutes, peak memory. |
| The hand-over | you | Everything a cold session needs, written before the cap or the limit. |

## References

- `references/start-messages.md`: the messages you send leads.
- `references/lead-brief-template.md`: the project part of a lead's rules.
- `references/usage-limits.md`: resume or hand over, step by step, and the relaunch.
- `references/worker-rules.md`: what a project's own worker type needs to work under a lead.
- `references/lessons.md`: the evidence behind the rules, and what was overturned on 2026-10-25.
