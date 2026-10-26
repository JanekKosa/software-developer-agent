# Agent team, stage 1: cheaper and more controllable orchestration (plan of record)

Written 2026-10-25 by the main session. It is the contract every builder of this stage works to. Read only the
sections your task names.

## 1. Why, and what the user decided

Measured over 14 days (2026-10-11 to 10-24, 13,056 model calls): the average call re-read 266k tokens; 59% of all
reading happened in calls above 300k; cache reads were 57% of cost, cache writes 34%, output 10%; every agent
starts at 75-90k tokens; 212 times a whole context (~300k) was re-written to the cache after an idle gap; subagents
were 49% of cost; Haiku was almost never used. After a usage-limit reset, waking the big session and its agents
re-wrote every context cold (46% of a 5-hour window in 8 minutes on 2026-10-24).

The user's decisions (2026-10-25, quoted where it matters):

- Caps: workers 400k, leads 500k, main 500k. Workers and leads run on Opus 5.5 at `xhigh`; the user picks the
  main session's model.
- Flow: main talks to leads only; leads start and talk to their workers; a worker's issues, decisions and
  questions go to its lead; the lead decides what goes up; every initiative of a worker or lead reaches the
  user through main, in points in the `explain-clearly` format. Workers never talk to main, and main does not
  start workers ("because then the context of the orchestrator fills up quick").
- Decision register: folder `decisions/` at the repo root, two files: open and resolved. "When a decision has been
  resolved, the orchestrator will move it to the resolved file." Main reminds the user of open items on every
  prompt. Committed in the user's own repos, local only (`.git/info/exclude`) in client repos.
- Haiku 5.5 at `xhigh` for searching and similar tasks, "never for analysis".
- The `Known-broken tooling` notes leave the global CLAUDE.md for a skill; agents skip CLAUDE.md.
- Usage limits: watch the 5-hour (95%) and weekly (98%) limits, configurable. "The handoff should only be created
  and all sub agents stopped if the time of the limit reset exceeds any of the sub agents or orchestrator cache
  reset; if cache will still be good after the reset for all agents within the session, then the script should
  just auto resume. But if the cache will be gone for any one agent after the reset then the hand over needs to
  be created, and when the limit resets it will auto start a new claude code session in VS Code through the
  claude code extension in the current open VS Code with the project open (I can have multiple VS Code instances
  open for different projects)." The auto-resume scripts live in the software-developer-agent repo "so that
  everything is in one place".

## 2. Platform facts this design rests on (verified 2026-10-25, Claude Code 2.1.286 CLI / 2.1.310 extension)

| Fact | Source |
| --- | --- |
| A subagent can start subagents, three levels below main by default (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`). | Experiment: `spawnDepth` 2 and 3 in `agent-*.meta.json`; CHANGELOG 2.1.219. |
| A subagent that starts background subagents waits for them before it finishes; in VS Code a subagent's own Agent calls are foreground by default (2.1.302). A lead's run therefore does not end, and main is not woken, while its worker runs. | Docs (sub-agents) + CHANGELOG. |
| `omitClaudeMd: true` in agent frontmatter drops user, project and local CLAUDE.md (2.1.271+). Git status is always sent. | Docs, verified twice. |
| `skills:` preloads named skills in full; leaving `Skill` out of `tools` removes skill use. | Docs. |
| Subagents and workflow agents get a 5-minute cache even on a subscription; main gets 1 hour. `experimental: { cacheTtl: 1h }` in an agent file gives that agent 1 hour (2.1.248+). | Docs (prompt caching). |
| PreToolUse/PostToolUse hooks fire inside subagents with `agent_id` and `agent_type` in their input; `hookSpecificOutput.additionalContext` is "added to Claude's context alongside the tool result". That it reaches the subagent itself is inferred, NOT verified: builder A proves it. | Docs (hooks). |
| `UserPromptSubmit` can add context: `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}`; it also fires when a background agent reports back to main. | Docs, verified. |
| Subagents never get the `Workflow` tool; only main runs workflows, also from a file (`Workflow({scriptPath})`). | Docs, verified. |
| `claude -p "Reply with OK." --model haiku --output-format stream-json --verbose --max-turns 1 --strict-mcp-config --tools ""` (with `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`) prints a line `{"type":"rate_limit_event","rate_limit_info":{...,"unifiedWindows":{"five_hour":{"utilization":0.1,"resetsAt":1792926600},"seven_day":{"utilization":0.47,"resetsAt":1793426400}}}}`. Utilization is 0-1, `resetsAt` epoch seconds; account-wide and fresh. Cost: about 6.8k cache-write tokens on Haiku. `--bare` fails ("Not logged in"). | Experiment 2026-10-25. |
| The status line is not a usable source in the VS Code extension (not shown to run there; checked by probe). | Experiment. |
| The extension opens a new chat with a prompt from the URI `vscode://anthropic.claude-code/open?prompt=<urlencoded>` (optional `session=<id>`): `claude-vscode.primaryEditor.open(session, prompt)`. The prompt is only filled into the input box (`setInputText`), not sent. | Extension 2.1.310 source, `extension.js` `registerUriHandler` `/open`; webview `initialPrompt` → `setInputText`. |
| Claude Code's built-in `autoContinueAtUsageLimit` resumes the same full context after a reset. | Docs. |

## 3. Layout of `C:\Repos\My projects\software-developer-agent` after this stage

```
agents/
  software-developer.md        the worker (changed)
  task-lead.md                 the lead (new)
  code-searcher.md             the Haiku searcher (new)
orchestrate-agents/            the orchestration skill, moved here from xpp-agent\Docs\Skills on 2026-10-25;
                               junctions ~/.claude/skills/orchestrate-agents and ~/.copilot/skills/orchestrate-agents
  SKILL.md, references/        (rewritten)
  orchestration.config.json    every setting of the hooks and scripts (exists; the contract)
  hooks/                       context-guard.mjs, decision-reminder.mjs (new)
  scripts/                     register.mjs (new); watch-session.ps1 (changed); usage-probe.ps1,
                               schedule-relaunch.ps1, start-session-in-vscode.ps1 (new); run-heavy.ps1,
                               watch-agent.ps1 (unchanged)
  lib/                         shared Node helpers (config loading, transcript tail reading)
  tests/                       Node tests (node:test) and PowerShell test scripts, mirroring hooks/ and scripts/
skills/                        vendored, never edited
scripts/install.ps1            links agents/ and the skill (changed)
README.md, CLAUDE.md           (changed)
```

Every script reads `orchestration.config.json` from its own skill folder (`<script dir>\..\orchestration.config.json`);
no value in it is repeated in code. A missing key is an error naming the key, never a silent default.

## 4. Roles and flow

```
user <-> main session <-> task leads (task-lead) <-> workers (software-developer) <-> searchers (code-searcher)
         starts leads,        start workers and          build and test,            find and quote,
         relays to user       searchers, decide          may start searchers        never analyse
```

- **Main** starts leads only. It relays lead lines to the user, keeps the register (moves answered items), runs
  workflows a lead asks for, and alone touches live config, commits and the limit hand-over.
- **A lead** owns one task: plans it, writes each worker's task file, starts the worker itself
  (`subagent_type: "software-developer"`), answers its questions, checks its result, registers every item that
  must reach the user (section 6), and ends its turn only for: a blocking question for the user, `RUN WORKFLOW`,
  a hand-over, task done, or a limit stop. Non-blocking items are registered and work goes on.
- **A worker** reports only to its lead: its final message is the report summary (the Agent call returns it to
  the lead). Questions: final message `QUESTION FOR THE LEAD | ...`; the lead answers with `SendMessage`, which
  resumes it. Its report lists every decision it took, every initiative and every issue it found, in a fixed
  block (section 6.4); the lead registers them.
- **A searcher** finds and quotes: paths, line numbers, verbatim snippets, counts. No conclusions, no
  recommendations, no "this means". Started by anyone for reading large files or sweeping many files.

Lines that end a lead's turn (first line of its last message): `QUESTION FOR THE USER | D-<id>`,
`RUN WORKFLOW | <script path> | <purpose>`, `LEAD HANDS OVER | <lead file>` + `NEXT TASK FILE | <path>`,
`TASK DONE | <summary file>`, `LEAD STOPPED | <lead file>` (limit stop). A lead may send main a non-waking note
with `SendMessage` to `main` (`REGISTERED | D-0012, D-0013`); main sees it at its next turn.

## 5. Agent definitions (frontmatter)

| Agent | model | effort | omitClaudeMd | experimental.cacheTtl | skills | tools |
| --- | --- | --- | --- | --- | --- | --- |
| software-developer | claude-opus-5-5 | xhigh | true | 1h | report-changes, machine-pitfalls | all except Workflow |
| task-lead | claude-opus-5-5 | xhigh | true | 1h | machine-pitfalls | all except Workflow |
| code-searcher | claude-haiku-5-5 | xhigh | true | (default 5m) | none | Read, Grep, Glob, PowerShell (read-only use) |

Because CLAUDE.md is omitted, the worker and the lead read the project's own `CLAUDE.md` (and the files it
imports) themselves as their first step; the global rules they need are in their own body and in
`machine-pitfalls`. The searcher reads no instruction file.

## 6. Decision register

### 6.1 Files

`<repo root>/decisions/OPEN_DECISIONS_CLAUDE.md` and `RESOLVED_DECISIONS_CLAUDE.md` (names from the config). The
repo root is `git rev-parse --show-toplevel` of the working directory, or the working directory when it is not a
repo. On first creation, unless the root matches a `commitInRepos` pattern, append `/decisions/` to
`<root>/.git/info/exclude` (once; never touch `.gitignore`).

Each file: a title line, one line saying what the file is, then one entry per item, newest last:

```
## D-0007 · question · blocking
- Raised: 2026-10-25 08:10 by lead ksef-import (worker run 3)
- Task: KSeF import
- What: <one or two plain sentences>
- Example: <one tiny concrete example with real-looking numbers>
- Options: A: <...> (<cost>). B: <...> (<cost>).
- Recommendation: <A, and why>
- Meanwhile: <work continues assuming A | <what> waits>
- Evidence: <path(s)>
```

Kinds: `question` (needs the user's answer), `initiative` (an agent decided or did something the user did not ask
for; the user accepts or overrules), `issue` (a problem found that needs addressing). The second tag is
`blocking` or `not-blocking`. In the resolved file the entry gains, at its end:

```
- Resolved: 2026-10-25 09:02, <answered|accepted|overruled|fixed|wont-fix>: "<the user's words>"
```

### 6.2 `scripts/register.mjs` (Node 24, no dependencies)

- `node register.mjs add --file <entry.json> [--root <dir>]`: entry JSON has `kind`, `blocking` (bool), `raisedBy`,
  `task`, `what`, `example`, `options` (array of strings), `recommendation`, `meanwhile`, `evidence` (array).
  Validates (unknown kind, missing field → exit 2 with the field named). Takes an exclusive lock
  (`decisions/.lock`, created with `wx`, retried for up to 10 s, stale after 60 s), assigns the next id (highest
  id in both files + 1, four digits), appends, releases. Prints `D-0007`.
- `node register.mjs resolve --id D-0007 --outcome <answered|accepted|overruled|fixed|wont-fix> --answer "<text>"`:
  under the lock, removes the entry from the open file and appends it with its `Resolved:` line to the resolved
  file. An unknown id is exit 2. Text is copied byte for byte (quotes, curly quotes, `&`, newlines turned into
  spaces).
- `node register.mjs list [--open|--resolved] [--ids D-0001,D-0004]`: prints entries verbatim.
- `node register.mjs summary`: one line, for the hook: `Decision register: 5 open (2 blocking: D-0004, D-0009; 3
  questions, 1 initiative, 1 issue); oldest D-0002 from 2026-10-23.` Empty or absent register prints nothing.
- Files are UTF-8 without BOM, CRLF line endings kept as found (new files CRLF), never mixed.

### 6.3 `hooks/decision-reminder.mjs` (UserPromptSubmit)

Reads the hook input from stdin (`cwd`), runs the summary logic (shared module, not a child process), and when
there is anything open prints `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":
"<summary line> Remind the user in one line at the end of your reply; list blocking items by id and title."}}`.
Prints nothing otherwise. Must finish in well under 1 s and never fail the prompt: any error → print nothing,
exit 0, one line to stderr.

### 6.4 The worker's report block

A worker's report (file and summary) ends with:

```
DECISIONS TAKEN: <none | one line each: what, the other choice, why>
INITIATIVES: <none | one line each: what was done that the task did not ask for>
ISSUES FOUND: <none | one line each: what, where, effect>
QUESTIONS: <none | one line each>
```

The lead registers every line that changes what the user would see, pay for or have to maintain; the rest it
records in its lead file. When unsure, it registers.

## 7. Context guard: `hooks/context-guard.mjs` (PostToolUse, all tools)

- Input on stdin: `session_id`, `transcript_path` (main's), `agent_id`, `agent_type`, `hook_event_name`.
  Without `agent_id` (the main session) it exits 0 silently; main has the session watch.
- The agent's transcript: `<dirname(transcript_path)>\<session_id>\subagents\agent-<agent_id>.jsonl`; if absent,
  search `subagents\` recursively for that file name (workflow agents sit in `subagents\workflows\<run>\`).
- Size = input + cache_creation_input + cache_read_input of the newest assistant record with non-zero counts in the
  last 512 KB (read shared, `FileShare.ReadWrite` equivalent: plain `fs.openSync('r')` + `readSync` of the tail).
- Thresholds from `contextCaps[agent_type]` else `contextCaps.default`. At `warn` and again at `stop`, once each
  (marker file `%TEMP%\claude-context-guard\<agent_id>.json` holds the last level sent), print
  `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"<message>"}}`:
  - warn: `CONTEXT GUARD | you are at <N>k of your <cap>k cap. Stop building and start closing: finish the edit
    you are in; write your progress file; run the type-check and the suite; write your report; report as your
    task says. Start no new point.`
  - stop: `CONTEXT GUARD | STOP NOW | <N>k of <cap>k. One progress-file edit, one report write, then your final
    report line. Nothing else.`
- Never blocks, never fails a tool call: any error → exit 0 silently (stderr line only). Typical run under 150 ms.
- **Must be proven live**: a scratch `claude -p` run with `--settings <file with only this hook>` and
  `--model haiku`, whose prompt starts a subagent of a tiny custom type with a low test threshold, which runs one
  tool call and then reports whether it saw a `CONTEXT GUARD` text. Run with the scratch folder as working
  directory and `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`; delete everything afterwards. If it does not reach the
  subagent, say so plainly and propose the fallback (the lead reads the size with `watch-agent.ps1`).

## 8. Usage limits

### 8.1 `scripts/usage-probe.ps1`

Runs the probe of section 2 in a dedicated empty working folder (`%TEMP%\claude-usage-probe`), with
`--no-session-persistence` if `claude --help` lists it (else delete the probe session's transcript afterwards:
it is the newest `.jsonl` in the projects folder named after that working folder). Parses the first
`rate_limit_event` line. Prints one JSON line and writes it atomically (temp file + rename) to
`%USERPROFILE%\.claude\state\usage-limits.json`:
`{"checkedAt":"<ISO>","fiveHour":{"percent":10,"resetsAt":"<ISO>"},"weekly":{"percent":47,"resetsAt":"<ISO>"}}`.
A missing window is `null`. On failure: exit 1 and a reason line; nothing written.

### 8.2 `scripts/watch-session.ps1` (extend; keep every existing marker and behaviour)

Each loop (every `EverySeconds`), besides the existing checks, when the last probe is older than its interval
(`probeEveryMinutes`, or `probeNearEveryMinutes` within `probeNearWithinPercent` of a threshold), run the probe.
When `fiveHour.percent >= fiveHourStopPercent` or `weekly.percent >= weeklyStopPercent`, take the decision:

1. The window that tripped, and its `resetsAt` (the later of the two if both tripped).
2. Every agent that counts: the main session plus each subagent of this session
   (`<projects>\<project>\<session>\subagents\agent-*.jsonl`, not under `workflows\`) whose `meta.json`
   `agentType` is not in `ignoreAgentTypes` and whose cache is warm now.
   - An agent's last request time = the timestamp of its newest assistant record with non-zero usage.
   - Its TTL = 1 hour if any of its last 20 records has `cache_creation.ephemeral_1h_input_tokens > 0`, else 5
     minutes. Main: same rule on its own transcript.
   - Warm now = last request + TTL > now. An agent already cold is left out: its resume costs the same either way.
   - Its cache expiry = last request + TTL.
3. If every counted agent's expiry > `resetsAt + resumeMarginMinutes`: decision **resume**. Write the decision
   with the per-agent expiries to `%TEMP%\claude-session-watch-<session>.decision.json` and keep watching
   (no wake): the existing `SESSION RESUMED` path wakes the session after the reset. Re-take the decision every
   loop while above the threshold; it can flip to hand-over (an idle lead going colder), never back once the
   hand-over marker has been printed.
4. Else: decision **hand over**. End with the marker line
   `LIMIT NEAR | HAND OVER | <window> at <p>% resets <HH:mm> | going cold: <agent type> <id8> at <HH:mm>, ...`
   followed by a line naming what to do: stop leads with STOP FOR LIMIT, write the hand-over, run
   `schedule-relaunch.ps1`.
5. If the limit already stopped the session (existing error check) and the decision on record was hand-over or
   any counted agent is cold by `resetsAt`, after the reset end with `SESSION RESET COLD | ...` instead of
   `SESSION RESUMED`: the session then writes a hand-over from disk, does not resume agents, and runs
   `schedule-relaunch.ps1` with "now" (immediate relaunch).

A new param `-ConfigPath` (default: the config beside the skill). Existing params keep their defaults.

### 8.3 `scripts/schedule-relaunch.ps1`

`-ProjectDir <dir> -HandoverPath <file> -At <ISO time> [-DryRun]`. Registers a one-shot Windows scheduled task
for the current user, interactive only (no stored password, no elevation), named
`<taskNamePrefix>-<folder name>-<yyyyMMddHHmm>`, that runs `start-session-in-vscode.ps1` with the same project
and the prompt `Read <HandoverPath> and carry on.` at `At + relaunchMarginMinutes`, and deletes itself after
running. Prints the task name and the time. Refuses an `At` in the past by more than a day.

### 8.4 `scripts/start-session-in-vscode.ps1`

`-ProjectDir <dir> -Prompt <text> [-DryRun]`. Steps:

1. Find VS Code's `code` command (the `bin\code.cmd` beside `Code.exe` of the running VS Code process, else
   `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`) and run it with the folder, so VS Code focuses the
   window that has that folder open (it reuses that window). Wait `focusWaitSeconds`.
2. Check the foreground window: process `Code`, title containing the folder's name. If not, try to bring that
   window to the front (match by title among `Code` processes' main windows, `SetForegroundWindow` with the
   usual Alt-key unlock); check again.
3. Open `vscode://anthropic.claude-code/open?prompt=<Uri.EscapeDataString(prompt)>` (`Start-Process` of the
   URI). Wait `panelLoadSeconds`.
4. Check the foreground window again (same test). If it holds, send Enter (`[System.Windows.Forms.SendKeys]::
   SendWait('{ENTER}')`). If not, send nothing: the prompt waits in the new chat, and the script shows a
   Windows notification (BurntToast is not installed; use a balloon tip through `System.Windows.Forms.NotifyIcon`)
   saying "Claude: the limit has reset. Press Enter in the new chat of <folder>."
5. Log each step with the time to `%USERPROFILE%\.claude\state\relaunch.log`.

The first URI open from outside VS Code shows "Allow 'Claude Code' to open this URI?"; the user ticks "do not ask
again" once. `-DryRun` does everything except steps 3-4's actions and says what it would do.

## 9. Ultracode with this design

- Ultracode asks main for a workflow per substantive task. In an orchestrated session main's substantive work is
  steering leads, so main does not turn a task into a workflow itself. Workflows serve the leads.
- A lead that wants a fan-out (a research sweep, an independent review of a finished run, a many-file mechanical
  change, adversarial checking of claims) writes the script file into its working folder and ends its turn with
  `RUN WORKFLOW | <path> | <purpose>`. Main runs `Workflow({scriptPath})` and sends the lead the result path.
- Scripts written for this design: every agent writes its full output to a file and returns at most ~1,000 words
  (paths, counts, and the arrays `decisions`, `initiatives`, `issues`, `questions`); building stages use
  `agentType: "software-developer"`, searching stages `agentType: "code-searcher"`, so the agents inherit
  `omitClaudeMd` and the cache setting; no stage that needs a user decision mid-way.
- Main may itself run a review workflow when a lead reports `TASK DONE` (independent reviewers on the diff,
  findings to a file, passed to the lead to act on).
- Ultracode removes the concurrent-agent cap, so the skill states the ceiling: a lead runs at most two workers at
  once, and heavy commands still go through `run-heavy.ps1`.

## 10. Settings the main session changes (not the builders)

`~/.claude/settings.json`: `autoContinueAtUsageLimit: false`; `hooks.PostToolUse` + context-guard (no matcher);
`hooks.UserPromptSubmit` + decision-reminder; the status-line probe removed. Links: `machine-pitfalls` skill.

## 11. Builders and their files (disjoint)

- **Builder A (Node):** `orchestrate-agents/lib/*.mjs`, `hooks/context-guard.mjs`, `hooks/decision-reminder.mjs`,
  `scripts/register.mjs`, `tests/` for these. Sections 6, 7.
- **Builder B (PowerShell):** `scripts/usage-probe.ps1`, `scripts/watch-session.ps1`,
  `scripts/schedule-relaunch.ps1`, `scripts/start-session-in-vscode.ps1`, `tests/` for these. Section 8.
- **Builder C (documents):** `orchestrate-agents/SKILL.md`, `references/*.md`, `agents/*.md`, `README.md`,
  `CLAUDE.md`, `scripts/install.ps1` of the software-developer-agent repo. Sections 3-9.
- **Main session:** the global CLAUDE.md, the `machine-pitfalls` skill, xpp-agent's `CLAUDE.md`, memory, settings.
