# The messages the main session sends (templates)

Fill in the `<...>`. The main session sends messages to leads only. Leads start and message their own workers;
the `task-lead` agent holds those messages.

## Start a lead

The `Agent` tool with `subagent_type: "task-lead"`, `run_in_background: true` and a three-to-five-word
`description`. Pass no `model` or `effort`: the type pins Opus 5.5 at `xhigh` (the user's choice, 2026-10-25).

> You are the task lead for <task> (<what it is, in one line, in the user's words if they gave them>) of <project>
> in the repo `<repo>`. I am the main session; my id for SendMessage is `main`.
>
> Read, in this order, and no more: 1. the project's `CLAUDE.md` files. 2. `<lead brief>`, whole. 3. <the task's
> start file, or the plan sections for this task, by name>. 4. `<sizes file>`.
>
> Your working folder is `<folder>`. The baseline, verified by me at <time>: <type-check clean; N test files, N
> tests; N of N integration>. <What is committed and what is not.> Never commit yourself.
>
> Still waiting for the user, so do not build it: <register ids, one line each>. Other leads running now, and the
> files their workers change: <list or "none">.
>
> Your first turn plans the task in your lead file and starts the first worker.

**A successor lead**: the same, but "<N> leads before you handed over through one file", and read only the
project's `CLAUDE.md` files, the lead brief, the lead file ("its first section is the state; follow its list of
what to read and read nothing beyond it"), the next task file and the sizes file. Give what the previous lead
stood at after its reading-in, as the figure not to exceed.

**A successor lead in a new session** (after a hand-over or a relaunch): add "The agents of the old session cannot
be reached by message. Your hand-off is the `## Hand-off` section at the end of the lead file: read it first.
Restart any half-done run with a fresh worker, from its task file and the `## Hand-off` section of its progress
file, and say so in that worker's start message." When the usage limit cut the old lead off before it wrote its
hand-off, say that instead (it was cut off by the limit, not stopped), and name its workers' progress files.

## Pass the user's answer

> From the main session, at <time>: the user has answered D-<id> (<its What, in one line>): <outcome>, in the user's
> words: "<quote>". <What it replaces.> Write it into your lead file, pass it to the worker it concerns in the
> user's words, and carry on.

An answer the user typed in the chat: record it first, so the register and the lead agree:
`node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\register.mjs" answer --id D-<id> --answer <words> --handed-over`.
An answer given in the Decisions pane is in the answers log already, and reaches you once, from the Decision
answers watch or the prompt hook. Pass the words (`--answer`, and below `--summary` and `--text`) in a single-quoted
here-string, as `SKILL.md` shows for `--answer`; in double quotes PowerShell changes them.

Once you know whether the answer settles the entry, close it or follow it up:

- `node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\register.mjs" close --id D-<id> --outcome <answered|accepted|overruled|fixed|wont-fix> --summary <text>`:
  the script copies the user's last answer into the entry as its Final answer; your summary states the decision,
  with that final answer in it.
- `node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\register.mjs" follow-up --id D-<id> --text <text>`:
  it sends the entry back to the user. A follow-up explains, elaborates or talks about the decision further, in as
  many lines as it needs; it never changes the entry's options. Changed options are a new child entry: `add` with
  `"parent": "D-<id>"`, numbered `D-<id>-1`.

## Stop for the limit

At `LIMIT NEAR | HAND OVER` and at `SESSION NEAR CAP` you send nothing: the limit-stop server (started by the watch,
or at the context cap by the watch or the context-guard hook) gives every agent its own `STOP FOR LIMIT` text at its
next tool call (see `usage-limits.md`). Send this message only after a `LIMIT STOP SERVER FAILED` line has told you
that the server failed (from the watch, or from the context-guard hook after a tool call; it names what failed),
and only to the leads that have not ended with `LEAD STOPPED`. Then wait for each one's `LEAD STOPPED`, with no
deadline, and tell the user in your final message that the server failed, and what failed:

> STOP FOR LIMIT | from the main session at <time>. The <five-hour / weekly> usage limit is at <p>% and resets at
> <HH:mm>; some caches would run out before then, so this session hands over. Start nothing new. Send each running
> worker STOP FOR LIMIT and wait for its final message (WORKER STOPPED and its progress file). Then add a section
> "## Hand-off" at the end of your lead file: your plan and where it stands, each run with its state and its
> worker's hand-off path, the register ids still open, and the next runs in order. End with LEAD STOPPED and your
> lead file.

At your own context cap (`SESSION NEAR CAP`), replace its second sentence with "This session is at its context cap
and hands over to a new one."

## Pause a task while the user reconsiders

> PAUSE | from the main session at <time>. The user is reconsidering <what>. Let the running worker finish and
> check it as usual, but start no new run. Under your check, list which parts of what the task has built would
> carry over under <the alternative>, and which would be dropped. Then end with `WAITING FOR WORKER` only if a
> worker still runs; otherwise end with `TASK DONE` and a summary that says it is paused.

## A workflow's result

> From the main session at <time>: the workflow `<script path>` finished (<status>). Its output is in `<path>`.
> <Anything that failed.> Register what its lists hold, then carry on.

## A size warning by message

Only when the context-guard hook does not reach agents (see `lessons.md`, "Sizes"). Send the hook's own words, so
the agent acts the same way:

> CONTEXT GUARD | you are at <N>k of your <cap>k cap. Stop building and start closing: finish the edit you are in;
> write your progress file; run the type-check and the suite; write your report; report as your task says. Start no
> new point.

## Resume an agent that was cut off

Only when its cache is still warm: the watch's decision file says so, or its last request was less than its cache
lifetime ago (1 hour for the main session and for an agent whose file sets `cacheTtl: 1h`, such as a lead or a
worker; 5 minutes otherwise). A cold resume writes the agent's whole context to the cache again, and pays for all
of it; start a fresh agent from its files instead.

> From the main session: you were cut off at <time> by <the usage limit / an expired sign-in / a server error>,
> not by anything in your work. It is <time> now. What is on disk: <exactly what exists and what does not>. Carry
> on where you stopped; do not read again what you have already read; write <your lead file / your progress file>
> first, so a second cut-off loses nothing.
