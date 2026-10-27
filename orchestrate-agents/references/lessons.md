# Lessons behind the rules

Each rule of the skill and of the agents came from something that went wrong or was measured. This page keeps the
evidence, so a rule is changed only when the fact behind it changes. Newest facts first within each part.

## Sizes

- **An agent starts at 75 to 90 thousand tokens** before it reads anything (the system prompt and the tool list);
  measured over 13,056 calls, 2026-10-11 to 10-24. A worker that reads a long brief stands near 170 thousand before
  its first edit, and reached 400 thousand after about 100 tool calls, whatever the task.
- **An agent cannot see its own size and guesses far too low**: two said "about 215 thousand" at 476 and 496.
  "Aim for N thousand" in a task message changes nothing. Hence the context-guard hook, which reads the agent's
  transcript after every tool call and tells it.
- **A warning late in the run leaves no room to close.** A worker warned at 445 thousand ran to 492 with no room
  for its last check; one warned at 403 went on building for half an hour and had to be told "stop now" at 470.
  Closing a worker run costs about 25 tool calls (60 to 80 thousand). Hence the worker's warning at 320 of 400.
- **Leads**: one that reads in lean (the brief and the lead file) starts at 125 to 160 thousand; one that read
  everything started at 265 and led two runs. Checking a run and writing the next task file costs 45 to 55
  thousand.
- **Where the transcripts are**: `~\.claude\projects\<project folder>\<session id>\subagents\agent-<id>.jsonl`. A
  worker started by a lead sits in the same flat folder as the lead (seen 2026-10-25: agents with `spawnDepth` 2 and
  3 there); workflow agents sit under `subagents\workflows\<run>\`. The size is the sum of `input_tokens`,
  `cache_creation_input_tokens` and `cache_read_input_tokens` of the newest assistant record with non-zero usage.
- **If the hook does not reach subagents** (it is proven by a live test before use), the lead watches each worker
  instead with the Agent size and stall watch:
  `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-agent-size-and-stall.ps1" -AgentId <id> -SessionId $env:CLAUDE_CODE_SESSION_ID -AgentType software-developer`
  with the PowerShell tool, `run_in_background` and the description `Agent size and stall watch` (a subagent's
  shell carries the main session's id; it warns at that type's `contextCaps` warning size), and sends the hook's
  words by message
  when it ends (`start-messages.md`, "A size warning by message").

## Sizing runs

- A run with four points and a long data check ran out of room before its check; the next lead's rule after that
  was two points.
- The mutation check is the first thing to fall off the end of a run. Given a run of its own, it found a real gap
  that every test had missed.
- A worker that reads a whole 80 KB brief spends a third of its room before it writes a line.

## Cost (2026-10-11 to 10-24)

- The average call re-read 266 thousand tokens; 59% of all reading happened in calls above 300 thousand. Cache reads
  were 57% of cost, cache writes 34%, output 10%. Subagents were 49% of cost.
- 212 times a whole context (about 300 thousand) was written to the cache again after an idle gap. Hence
  `cacheTtl: 1h` for leads and workers, whose turns are often more than 5 minutes apart.
- After a usage-limit reset, waking the big session and its agents re-wrote every context cold: the limit reset at
  20:10 on 2026-10-24 and stood at 46% by 20:18 (the 485k main session and five agents at 250 to 510k wrote 3.1
  million tokens to the cache, against 40 thousand of output). Hence the resume-or-hand-over decision of
  `usage-limits.md`.
- A `/model` switch also throws the cache away: switching a 470k main session to another model wrote another 464k
  on the next turn. Never switch models on a large context.
- Haiku was almost never used. Hence `code-searcher` for finding and quoting.

## Talking to the user

- **Show the thing before naming it.** A status that called things by coined names ("the short list", "a batch")
  was not understood, and the user had to ask four times. Paste what it looks like to whoever uses it first.
- **Say where a feature came from** when the user did not ask for it by name. Asked "why the short list? I didn't
  ask for it", the honest answer was that it was the plan's way to deliver one of the user's decisions.
- **Pass answers down in the user's words.** A lead that gets "the lock is a good idea" builds better than one that
  gets "user prefers option B".
- **Relay decisions soon.** An overruled decision is cheap to redo early and dear at the end of a task.

## Memory on this machine (7.8 GB)

- It is the heavy commands, not the agents, that fill the memory: two agents' test runs at once crashed the editor
  twice. Hence `run-heavy.ps1`: one slot, and a free-memory floor (`runHeavy` in `orchestration.config.json`). The
  floor was 1500 MB at first; with VS Code and a few agents open this machine has 700-1000 MB free, so every heavy
  command waited an hour and gave up, and on 2026-10-25 it became 600 MB.
- Peaks measured 2026-10-24 (sampled every 2 seconds): `mcp/xpp-mcp`'s type-check 220 MB, its whole unit suite with
  one test worker 719 MB, six integration files 673 MB. About 2 GB free holds several agents.
- Its last line, as it printed for that unit suite:
  `HEAVY COMMAND DONE | exit 0 | waited 0:00 | ran 1:44 | peak 719 MB in its processes | free memory at its lowest 1480 MB | slot 1 of 1`.
- A redirection of the script call itself does not catch the command's output; put it inside the command
  (`-Command 'npx vitest run *> C:\...\unit.log'`).
- A server the command talks to grows outside its processes: LocalDB's `sqlservr.exe` reached 1,165 MB during one
  worker's full read of a cross-reference table, and free memory fell to 606 MB. Only the lowest-free figure shows
  it.

## When things go wrong

- **An agent cut off by the usage limit, an expired sign-in or a server error** arrives as a `failed` task naming
  the cause. Nothing is wrong with its work. Resume it with `SendMessage` only while its cache is warm; otherwise a
  fresh agent carries on from its files.
- **A new session cannot reach the agents of the one before it** (after `/clear`, or in a new chat): `SendMessage`
  answers "Agent ... could not be resumed: No transcript found for agent ID". Seen 2026-10-24: a lead that had
  asked "may the next run start?" was out of reach the moment the chat was cleared. Its last words are in its
  transcript under the old session's folder.
- **A restart of the Claude Code process** kills every watch script and every running agent's run. The transcripts
  survive, and `SendMessage` to an agent's id resumes it in the same session.
- **An agent that has gone quiet**: the last-write time of its transcript is the sign of life. 40 minutes with
  nothing written and no long command running means stuck. A fresh agent's `.output` log stays at 0 bytes for its
  whole run, so an empty log says nothing.
- **A lead that made a mistake** says so in its report and changes its rule; pass the lesson into the lead brief so
  the next lead starts with it.
- **Untracked files do not show in `git status`**, so a run that must prove it left files unchanged needs a hash
  list until those files are committed.
- **The platform shortens a very long conversation by itself.** Keep the durable state in files all along.

## Overturned on 2026-10-25

- "Only the main session starts agents": a subagent can start subagents, three levels below the main session by
  default. Leads now start their workers, and the main session's context no longer fills with them.
- "The main session watches every agent's size": the context-guard hook tells each agent itself.
- "Keep a recurring `CronCreate` timer for unattended runs": the Usage and context watch now decides between
  resuming and handing over, and a scheduled task relaunches a fresh session in VS Code.
- "Resume every cut-off agent after the limit resets": only warm ones; cold ones restart fresh from their files.
- "Workers are capped at 500 thousand": workers 400, leads 500, the main session 500 (the user, 2026-10-25).
