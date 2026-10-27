# Claude Code agents, sessions and transcripts

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **Killing a Claude Code background task by matching its command line does not work.** The script is passed in
  the `CLAUDE_CODE_SHELL_*` environment variable, so the process command line contains none of the script text
  and a `Where-Object { $_.CommandLine -like '*Move-Item*' }` filter matches nothing - reporting "0 processes"
  while the task keeps running. Use the `TaskStop` tool with the task id.
- **A background subagent can hang with no notification at all.** It stays listed as `running` in `ListAgents`
  for hours while nothing happens. Judge a quiet one by the last-write times of the files it is supposed to be
  producing; an hour with nothing new, and no long build or test running, means it is stuck. Stop it with
  `TaskStop`. **Its `.output` log is only a guide for an agent that has been resumed**: a fresh agent's log stays
  at 0 bytes for its whole run, even a healthy 40-minute one, so an empty log says nothing. Once an agent has been
  resumed with `SendMessage` the log is written as it goes, and then a stale last-write time does mean stuck. The
  transcript under `~\.claude\projects\<project-folder>\<session-id>\subagents\` is written live for every agent,
  fresh or resumed, so its last-write time is the better sign of life. That
  log is JSONL and huge - never read it whole. Parse only the last few lines to see the tool call it was making;
  an `Edit` it never got to apply can be recovered from there.
- **A subagent stopped by the account's usage limit arrives as a `failed` task naming the limit**, not as a
  problem with its work. `SendMessage` to its id resumes it from its own transcript once the limit resets - tell
  it what is on disk, since its memory of where it stopped can be a step ahead of what was saved. This only works
  in the session that spawned it. Two heavy subagents running at once is what exhausts the limit.
- **A subagent stopped by an expired sign-in arrives the same way**: a `failed` task with *"Agent terminated
  early due to an API error: Failed to authenticate: OAuth session expired and could not be refreshed (error
  type authentication_failed)"*. Nothing is wrong with its work. Once the user has signed in again,
  `SendMessage` to its id resumes it (the result says `Resuming agent …`); tell it the time, that it was cut
  off, and what is and is not on disk. Verified 2026-10-13: an agent cut off after six minutes was writing its
  transcript again seconds after the message. Any background watch on it is better stopped and started again.
- **A worker's final report can arrive in the main session three times.** Its `SubagentHandback` answered success,
  then the harness told the worker the report "had not been delivered", so it sent it again, twice; all three
  copies reached the main session, followed by three task notifications ("waiting on its own background work",
  then "finished"). Seen 2026-10-25 with run J (two of its own background watchers were still alive at the first
  send). Act on the first copy only, and treat the agent as done at the notification that says "finished".
- **A stopped or cut-off subagent's log holds almost none of what it found out.** What it measured sits in the
  tool outputs it read, not in text it wrote: the 1.7 MB log of a 30-minute agent held four one-line notes. So
  tell an agent up front to write its results to a file as it goes (a progress file under `temp\`). And when an
  agent that had already finished its edits is cut off, check its work from the disk in the main session instead
  of resuming it: re-running its checks took minutes, and a resumed agent pays for its whole transcript first.

## Use cheap subagents for searching large files

Generated XML, logs and other files thousands of lines long waste tokens when read whole into the main
conversation.

- Delegate **searching or extracting** from large files to a subagent on a **cheaper, faster model**. Claude Code:
  the `code-searcher` agent type (Haiku 5.5 at `xhigh`, skips CLAUDE.md, finds and quotes but never analyses;
  user, 2026-10-25). GitHub Copilot: a subagent or custom agent configured with a cheaper model.
- Brief it precisely: which files or folder, what to find, and what to return: **only the relevant snippets with
  file path and line numbers**, or a short summary. Tell it not to paste whole files back.
- Make design decisions and edits in the main model.
- Skip the subagent for small files or when the location is already known; a targeted search is cheaper.

## Keep an agent's context under its cap

Caps (user, 2026-10-25): workers 400k tokens, leads 500k, the main session 500k. Past its cap an agent hands over
to a fresh one instead of carrying on. The `context-guard` hook of the `orchestrate-agents` skill tells each agent
itself when it nears its cap.

- Size a task so one agent can finish it under the cap. Split a large one into stages up front, one agent per
  stage, rather than discovering the size half way.
- Tell every implementation agent to keep a progress file in the project's scratch folder from its first step,
  and to stop and hand over before it passes the cap: what is done, the decisions and their reasons, what it
  measured, the exact contract other code must match, and what is left.
- When an agent is getting large, do not resume it. Have it finish the edit it is in, put the machine back as it
  found it, write the hand-over and stop. Then start a fresh agent that reads the hand-over.
- **The main session can read a running agent's context size; the agent itself cannot.** Its transcript is
  `~\.claude\projects\<project-folder>\<session-id>\subagents\agent-<agent-id>.jsonl`, written as the agent works.
  The three numbers of the last `"usage":{"input_tokens":…,"cache_creation_input_tokens":…,
  "cache_read_input_tokens":…}` record in it add up to the size (read only the tail, with a `FileStream` opened
  `FileShare.ReadWrite`). Verified 2026-10-13: a running agent read 395,724; two finished ones read 470k and 490k
  where their completion notices (`subagent_tokens`) said 476k and 496k. An agent asked for its own size guesses
  far too low (two reported "about 215 thousand" at 476k and 496k), and "aim for 250 thousand" in a task message
  changes nothing. So the main session watches the number and tells the agent with `SendMessage` to finish and
  hand over.
- **A subagent can start agents, three levels below the main session** (since Claude Code 2.1.219; the env var
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` sets the depth, `1` turns nesting off). Verified 2026-10-25: a chain
  main → agent → agent → agent ran, with `spawnDepth` 1, 2 and 3 in the `agent-<id>.meta.json` files, all in the
  one flat `subagents\` folder. The note of 2026-10-13 ("a subagent cannot start agents") held for the build of
  that day and is out of date. A subagent never gets the `Workflow` tool. A subagent's `SendMessage` to `main`
  arrives at the main session's next turn; it does not wake it.
- **One subagent can wake another.** `SendMessage` with another subagent's id as `to` resumes that agent when it
  has ended its turn (the result says `Resuming agent …`), and the woken agent sees the text and the sender's id.
  Verified 2026-10-13: an agent that had answered and stopped was woken by a sibling and answered again. So a
  worker can report to a planning agent directly, and get its answer the same way, without the main session
  reading either. A finished agent is not in `ListAgents` and is still reachable by its id. `ListAgents` called
  from a subagent also lists the account's other sessions (13 were shown, all offline): tell every agent to
  message only the ids it was given.
- **An agent costs about 80 thousand tokens before it has read anything** (73k and 90k for two agents that made
  one and four tool calls): the system prompt and the tool list. A worker that reads a 75 KB brief and a few
  sections stands at about 170 thousand before its first edit. Size a task by what is left.
- **The same cap holds for the main session.** Before it passes about 500k it writes its hand-over (a
  continuation plan, as a new file) and stops, and a fresh session carries on from that file.
- **The main session can measure its own context**; nothing shows it otherwise. Its transcript is
  `~\.claude\projects\<project-folder>\<session-id>.jsonl`, and the session id is the folder name in the
  scratchpad path. Every shell the session starts also has it in `$env:CLAUDE_CODE_SESSION_ID`, and the
  session's own `claude.exe` in `$env:CLAUDE_PID` (seen 2026-10-24, extension 2.1.309), so a script needs no
  argument to find its session. Every assistant turn in it carries
  `"usage":{"input_tokens":…,"cache_creation_input_tokens":…,"cache_read_input_tokens":…}`; the three numbers of
  the **last** such record add up to the context size. Read only the tail (seek to the end minus a few
  megabytes; the file is JSONL and large) and take the last match. **A turn stopped by the usage limit or an API
  error reads 0**: Claude Code records it as an assistant record with `"isApiErrorMessage":true`, an `"error"`
  kind (`rate_limit`, `server_error`, `authentication_failed`), all usage numbers at zero and the message as text
  (*"You've hit your session limit · resets 10:10am (Europe/Warsaw)"*). Skip zero records for the size; the same
  record is how a script tells that the session is stopped. Measured 2026-10-13: 423k after orchestrating
  seven subagent runs, so one run costs the main session about 55k (task message, report, checks, notes).
