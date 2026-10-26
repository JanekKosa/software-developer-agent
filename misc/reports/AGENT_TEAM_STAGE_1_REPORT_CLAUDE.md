# Agent team, stage 1: report

The agent team (main session, task leads, workers, searchers) made cheaper and easier to control. The working
files are in [misc/implementation/agent-team/stage-1/](../implementation/agent-team/stage-1/); the plan of record is
`AGENT_TEAM_STAGE_1_PLAN_CLAUDE.md` there.

## Where the stage stands

- **Built and tested, not yet used for real work:**
  - the agent types `task-lead` and `code-searcher`, and an updated `software-developer`
  - the decision register and its prompt reminder
  - the context guard
  - the usage-limit watch, with its choice between "resume" and "hand over"
  - the relaunch into a new VS Code chat
  - the stop for a hand-over through a named pipe, at a usage limit and at the main chat's 450k, with hand-offs
    from worker to lead to main (session 2)
  - the main chat's own 450k warning from the hook, and a new chat one minute after any hand-over (session 2)
  - every wake-up and relaunch after a reset or a hand-over waits one minute, after a server error ten (session 2)
  - the main chat told of every helper failure before any fallback; every agent told once; no deadline; the helper
    living until the main chat stops it or the chat closes (session 2, runs K to K4)
  - scripts that refuse a misspelled parameter, and a reminder line that shows this repo's register in every chat
    (session 2, run J)
  - the session watch started in every chat, from the global instructions (session 2)
  - the slimmed global instructions and the `machine-pitfalls` skill
- **Proven live in VS Code:**
  - The context guard stopped runs D to K4 near their caps; each closed cleanly with a hand-off.
  - The relaunch opened a new chat, which replied "Relaunch test OK" (16:59 to 17:01). It waited about 100 seconds
    only because VS Code asked to allow the link; the user has ticked "Do not ask me again".
- **Re-checked by the main session at 02:05 on 2026-10-26, after installing runs K to K4:** Node suite 145 of 145,
  PowerShell suite 104 of 104. The live check with made-up sessions passed: a killed helper was reported once by the
  hook and once by the watch, and a restarted watch stayed quiet.
- **Mutation checks:** F 36 of 39, G 44 of 49, H 38 of 39, I 30 of 30, J 32 of 32, K2 24 of 24, K3 29 of 29, K4 14
  of 15. Each run closed the gaps of the one before. K4's survivor: no test has two failure lines that differ only
  in letter case.
- **The stage's files moved to this repo** at 20:05 (user: "all files related to the agent should be there not in
  this repo"). The guide for the user is `orchestrate-agents/references/limits-and-caps-guide.html`.
- **Waiting for the user** (also in `decisions/OPEN_DECISIONS_CLAUDE.md`):
  1. D-0009: the main chat learns of a helper failure by reading the helper's existing log file, besides the pipe.
     Recommended: accept; the pipe alone cannot pass on an error an agent saw.
- **Concerns:**
  - No real usage-limit stop has happened yet, so the pipe stop and the hand-offs are tested only with made-up
    sessions.
  - A worker inside one long command hears the stop only when that command ends, and nobody cuts it short (the
    user's choice: no deadline). Near a usage limit the limit may run out first; then the hand-over is written from
    the files after the reset.
  - A failure whose text changes at every check (none today) would be reported at every look.
  - The weekly-limit message's reset time has never been seen, so its format is a guess until the first real one.
  - That a hook receives the Claude Code process id was read in Claude Code's code, not seen in a run.
- **Committed:** nothing. The software-developer-agent repo has no commits yet. In xpp-agent the old
  `Docs/Skills/orchestrate-agents/` shows as deleted because it moved.

## Session 1: research, redesign and first build (2026-10-25, 07:20 to about 10:00)

**Short version.** Measured where the tokens go, researched how others run agent teams, checked the Claude Code
facts the design depends on, agreed the design with the user, and built it with workflows. Each piece had one
builder, one independent reviewer and a fix pass.

**What is different now, by effect:**

- **Leads start their own workers.** Agents can now start agents three levels deep. This was checked on disk:
  `spawnDepth` 1, 2 and 3. So the main session starts only leads, and its context no longer grows with every
  worker.
- **Every agent keeps its cache for an hour instead of five minutes.** This is in the user's settings, and the
  worker files pin it too. The short default caused most of the 212 expensive re-saves found in the 14-day
  measurement.
- **Leads and workers no longer load CLAUDE.md** (`omitClaudeMd`). They read the project's own CLAUDE.md
  themselves, and preload `machine-pitfalls` (and, after run D, `team-rules`).
- **The global instructions shrank from 36 KB to 12 KB.** The tooling traps moved word for word into the
  `machine-pitfalls` skill, split by area. The out-of-date note "agents cannot start agents" was corrected.
- **Searching goes to `code-searcher`** (Haiku 5.5 at xhigh). It finds and quotes, and never analyses.
- **The decision register.** Everything waiting for the user is written to `decisions/OPEN_DECISIONS_CLAUDE.md`:
  questions, choices agents made on their own, and problems found. Only `register.mjs` writes it. A hook adds
  one summary line to every prompt. Example: "Decision register: 2 open (1 blocking: D-0004 Which VAT rounding
  …)". In client repos the register's files are kept out of git through `.git/info/exclude`.
- **Each agent is told its own size.** A hook tells a worker at 320k to stop building and close, and at 370k to
  stop now (cap 400k). A lead gets the same at 430k and 470k (cap 500k). In a headless test the agent saw and
  quoted the warning.
- **The usage-limit watch.** A small Haiku 5.5 call at low effort reads the 5-hour and weekly percentages. At 95%
  or 98% the watch compares the reset time with every agent's cache expiry:
  - If all the caches would survive the reset, it does nothing and the session resumes after the reset.
  - If any would go cold, it wakes the session to stop the leads and write a hand-over. A Windows scheduled task
    then opens a new chat in this project's VS Code window at the reset and presses Enter. It does this only when
    that window is in front, and otherwise shows a notification.

  Claude Code's own auto-continue is off.
- **The orchestration skill moved** to `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`, so
  everything is in one place (user's request). Its links in `~/.claude/skills` and `~/.copilot/skills` point
  there.

**Decisions, and by whom:**

- **By the user:**
  - caps of 400k for workers and 500k for leads and main
  - Opus 5.5 at xhigh for leads and workers
  - Haiku 5.5 for searching only, never analysis
  - the `decisions/` folder: main moves answered items; local only in client repos
  - the tooling notes moved to a skill
  - the cache-based choice between resume and hand-over, with an automatic relaunch in VS Code
  - one-hour caches for all agents
  - Haiku probes at low effort; the wrapper idea dropped
- **By builders, after review:**
  - the register refuses to resolve an id that already sits in the resolved file, instead of losing the answer
  - the relaunch opens the chat only when the right window is in front
  - the watch restarts at once after `LIMIT NEAR`

**Checked:**

- Node suite: 71 of 71 tests pass, with mutation checks of 43 of 43 and then 17 of 17 caught.
- PowerShell suite: 50 of 50 tests pass, mutation checks 17 of 18.
- The context guard reached a subagent in a live headless run.
- A real scheduled task was registered and removed.
- The probe ran for real at `--effort low`.
- The status line does not run in the VS Code chat (tested), so it cannot supply the limit numbers.

**Not checked:**

- the relaunch for real
- a real limit stop
- the guard inside VS Code

**Runs D and E (10:00 to 11:05):** finished the integration listed under "Where the stage stands". The main
session dropped `probeEveryMinutes`, so one setting says how often to check, and moved the memory floor into the
config. Run E added "never retry what timed out" and "never stop a process you did not start" to `team-rules`.

**Left:** the questions above; the mutation check and probe run of run E; first real use.

## Session 2: the relaunch proven, and the stop moved to a named pipe (2026-10-25 17:05 to 2026-10-26 02:20)

**Plan followed:** `AGENT_TEAM_STAGE_1_CONTINUATION_PLAN_CLAUDE.md`. **Plan for the next session:** answer
D-0009, then first real use of the team on a real task, then commits when the user asks.

**Short version.** The first session's last steps were finished and checked. The user's five answers from 16:57
are now all built or measured. The usage-limit stop now reaches every agent through a hook and a small background
service, instead of a message that a waiting lead got too late. Every stopped agent now writes a hand-off, which
goes up from worker to lead to main.

**What is different now, by effect:**

- **Finished agents no longer decide between resume and hand-over** (run F, started by session 1). Example: a
  worker that ended at 14:00 with a warm cache no longer forces a hand-over at 14:30.
- **`watch-agent.ps1` warns at the right size by itself** (run F). It reads the agent's type from the agent's own
  file, so a worker is warned at 320k instead of 400k.
- **The limit stop reaches every agent at its next tool call** (run G). At `LIMIT NEAR | HAND OVER` the watch
  starts `limit-stop-server.mjs`, which answers over a named pipe (a private in-memory channel). The context-guard
  hook asks it after every agent tool call. With no server running, this adds about 5 ms per tool call.
- **Hand-offs go up the chain** (run G and the main session). A worker adds `## Hand-off` to its progress file and
  ends with `WORKER STOPPED`. A lead waits, writes its own `## Hand-off` listing its workers', and ends with
  `LEAD STOPPED`. The main session lists every lead's hand-off in the session hand-over. The `task-lead` and
  `software-developer` agent files and the README were updated by the main session with run G's wording.
- **The main session no longer messages leads to stop**, except when the server did not start. A lead silent after
  15 minutes is stopped with `TaskStop`, which also stops its worker (measured 16:56 by session 1).

**Decisions, and by whom:**

- **By the user:** the named pipe instead of a flag file ("ok i agree with the named pipe way"); hand-offs from
  worker to lead to main; the thresholds stay at 95% (5-hour) and 98% (weekly).
- **By run G, registered as D-0004:** the `WORKER STOPPED` line; the hand-off as a section of the agent's own file;
  a short text for helper agents; the old message kept as a fallback; the server starts itself from Node, because
  one started with `Start-Process` from a background task died with that task (measured).
- **By the main session:** run G started while run F's mutation check was still running, with the three files the
  check copies held back until it ended; F's three surviving mutants added to run G.

**Checked:**

- Relaunch for real: the new chat replied "Relaunch test OK" (session `f45a8524`, 17:01).
- Run F: watch tests 36 of 36, agent-watch 4 of 4, a real probe run twice, mutation check 36 of 39.
- Run G: a live check with a made-up session (the hook printed the stop for that session's agent, and nothing for
  another session), the hook timed 20 times before and after, and a mutation check of 44 of 49.
- Main session, 18:55: Node 101 of 101 and PowerShell 78 of 78, both through `run-heavy.ps1`; no limit-stop server
  left running.

**Not checked:** a real usage-limit stop with real agents; the new wording of the two agent files in a real stop.

**Later in the session (19:00 to 20:45):**

- **The user answered D-0001 to D-0003** ("yes", "yes lets add the stop into the main session...", "Yes"), and
  asked for the main chat's 450k warning through the hook too. **Run H** built all of it: the hook tells the main
  chat at 450k, every lead and worker then gets the stop, and the helper quits when the chat closes. It also closed
  run G's gaps.
- **The user asked for one-minute waits in the config, and a new chat after the 450k hand-over.** **Run I** built
  both. The main session included the wait after a server error; run I raised the risk of that (D-0006).
- **The user asked for an explainer page**, now `orchestrate-agents/references/limits-and-caps-guide.html`.
- **The user said all agent-team files belong in this repo.** The main session moved the stage folder, the stage
  report, the 2026-10-24 session-watch report and the register here at 20:05. It also recorded the rule in this
  repo's `CLAUDE.md` and in its memory.
- The main session applied runs G, H and I's wording to `agents\task-lead.md` section 11,
  `agents\software-developer.md` section 7, `README.md` and xpp-agent's `CLAUDE.md` ("Session Size and
  Hand-over", "Session Watch").
- Checked by the main session after each run: after H, Node 117 of 117 and PowerShell 80 of 80; after I, Node 117
  of 117 and PowerShell 87 of 87. No helper process or scheduled task was left behind.

**Late evening and night (20:45 to 02:20, the user asleep from about 22:40):**

- **The user accepted D-0005 to D-0008** ("I ACCEPT ALL but D-0004"). **Run J** built D-0006 to D-0008: ten
  minutes after a server error, scripts that refuse a misspelled parameter, and the reminder line showing this
  repo's register in every chat. For D-0005 the main session added "start the session watch first" to the global
  instructions (synced to the Copilot copy).
- **The user answered D-0004 point by point:** choices 1, 2, 3, 5 and 8 stand. On 4 and 7: "main agent needs to be
  informed that it failed instead of having a fallback. Maybe use the fallback after the main agent knows". On 6:
  "no lets not have a limit here". Then: "just like the lead the worker has no time limit to create the handover".
  The main session added one point: the helper lives as long as the hand-over, so a lead told late still hears it.
- **Runs K, K2, K3 and K4** built that in a scratch copy, each stopped by its size warning and handing off to the
  next. K4 added one fix the main session asked for: a restarted watch reports the same failure only once.
- **The main session installed the 11 files at 02:05** with K4's script (backup and hash lists before and after;
  only those 11 changed), re-ran both suites (Node 145 of 145, PowerShell 104 of 104), ran the live check (passed
  after one fix to the check script itself: it had not created the made-up watch session's transcript), removed the
  log lines of the made-up sessions, and restarted its own watch.
- It then applied K4's wording to `agents\task-lead.md` section 11, `agents\software-developer.md` section 7, and
  xpp-agent's `CLAUDE.md`, and brought the guide page up to date.
- Run K raised D-0009 (the log file as the failure channel); waiting for the user.
- Recorded in `machine-pitfalls`: a worker's report can arrive three times, when its hand-back is said not to have
  been delivered.

**Concerns and open items:** D-0009, under "Where the stage stands". Run F's agent was killed by a
Claude Code restart at 17:19 and wrote no report; its progress file and mutation results stand in for it.

**Files:**

- In software-developer-agent (no commits yet, so the whole repo is new): run F's changes to `watch-session.ps1`,
  `watch-agent.ps1` and their tests; the files of runs G to K4 (listed in their reports); the guide page; the
  moved stage folder, reports and `decisions/` register; the main session's edits to `agents\task-lead.md`,
  `agents\software-developer.md`, `README.md` and `CLAUDE.md`.
- In xpp-agent: `CLAUDE.md` (`decisions/`, "Session Size and Hand-over", "Session Watch"), and the removal of the
  moved files.
- Outside both repos: the global instructions (`~\.claude\CLAUDE.md` and its Copilot copy: the watch in every chat),
  the `machine-pitfalls` skill (`references\claude-code-agents.md`), and two memories (agent-team files live in
  this repo; "notify", not "wake").
  Every other change in the working tree is from earlier sessions.

**Committed:** nothing.
