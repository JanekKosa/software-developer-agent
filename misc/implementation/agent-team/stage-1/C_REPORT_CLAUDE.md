# Agent team stage 1, builder C: report

Written 2026-10-25 08:57. Progress file: `C_PROGRESS_CLAUDE.md` beside this one.

**Outcome: done, with one file left for the main session.** The documents of plan sections 3-9 are written and
checked against the disk. The repo's `CLAUDE.md` is not edited: the task both lists it as mine and says "never edit
any CLAUDE.md", so its new text is below for the main session.

## What is different now

- **The lead is a real agent type.** `agents\task-lead.md` holds the whole generic lead protocol: first steps,
  planning, task files, starting `software-developer` workers itself, answering them by `SendMessage`, checking
  their results, registering items with `register.mjs`, the five lines that end its turn, the hand-over at its
  context warning, the usage-limit stop, workflows, and what only the main session does.
- **The searcher exists.** `agents\code-searcher.md`: Haiku 5.5 at `xhigh`, `Read, Grep, Glob, PowerShell`, finds and
  quotes only. Asked for analysis, it returns what it found plus `NOT DONE | analysis is not this agent's job`.
- **The worker reports to whoever started it.** Its final message is now the report summary:
  `WORKER DONE | <run> | report: <path>`, at most 150 words, then the four-line block (`DECISIONS TAKEN`,
  `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`). A question is a final message starting `QUESTION FOR THE LEAD |`. It
  may start `code-searcher` agents and no other. It reads the project's `CLAUDE.md` files itself (none is loaded),
  has a 400k cap, and obeys `CONTEXT GUARD`, `STOP NOW` and `STOP FOR LIMIT`. Everything else and its voice are kept.
- **The skill is lean.** `SKILL.md` is 14,498 bytes (was 23,209): shape, roles, platform facts, starting work, the
  lines, the register, talking to the user, sizes, limits, ultracode, several agents, checks, pointers.
- **References rewritten or added.** `lead-brief-template.md` now holds only the project part.
  `start-messages.md` holds only the main session's messages (start a lead, successor, answer, `STOP FOR LIMIT`,
  `PAUSE`, workflow result, cache-aware resume). `worker-rules.md` now says what a project's own worker type
  (`xpp-porter`, `navigator-builder`) needs. New: `usage-limits.md` (resume or hand over, with a worked example,
  and the relaunch) and `lessons.md` (the evidence behind each rule, and a list of what was overturned today).
- **`install.ps1` keeps three junctions.** Agents into `~/.claude/agents`, the skill into `~/.claude/skills` and
  `~/.copilot/skills`. It checks all three before changing anything. A link to somewhere else is removed with
  `[System.IO.Directory]::Delete(path, $false)` and made again. A real folder in the way stops it with nothing
  changed. Dot-sourcing it installs nothing.
- **README** describes the three agents, the linked skill, `omitClaudeMd`, and the tests.

One deliberate addition to the plan: the line `WAITING FOR WORKER | <run>`. A lead uses it only if it must end a
turn to wait for a worker; the main session does nothing on it. Example: a lead starts run 3 in the background and
has nothing else to do; if the platform hands its turn's text to main, main sees this line and stays idle.

## Lessons kept, dropped and corrected

Kept, with their evidence in `lessons.md`: start size 75-90k, agents guess their own size too low, late warnings
leave no room, lead read-in costs, two points per run, mutation check never dropped, show the thing before naming
it, answers in the user's words, memory peaks and `run-heavy.ps1`, new sessions cannot reach old agents, quiet
agents, `/model` switch throws the cache away. Overturned and corrected: only main starts agents; main watches
every agent's size; the `CronCreate` limit-watch timer; resume every cut-off agent after the limit (now: only warm
ones); workers capped at 500k (now 400k).

## Paths

Changed: `C:\Repos\My projects\software-developer-agent\agents\software-developer.md`,
`...\orchestrate-agents\SKILL.md`, `...\orchestrate-agents\references\lead-brief-template.md`,
`...\references\start-messages.md`, `...\references\worker-rules.md`, `...\README.md`, `...\scripts\install.ps1`.
Created: `...\agents\task-lead.md`, `...\agents\code-searcher.md`, `...\references\usage-limits.md`,
`...\references\lessons.md`. Not touched: `CLAUDE.md`, `orchestration.config.json`, hooks, lib, other scripts, tests.

**Outside the diff (an incident).** At 08:44 my first mutation round of `install.ps1` ran before the test swapped
the home folder for a scratch one. One mutant (no dot-source guard) then ran the install against the real home:
it removed the junction `~/.claude/agents/software-developer-agent` (the link only; the repo's `agents` folder was
untouched) and failed to make its replacement. I recreated it at 08:45 and checked all three links again at 08:56:
each points at this repo. It was missing for about a minute. The red step also dot-sourced the old
`install.ps1` once; its last line ran, found the junction right, and changed nothing. The test now swaps the home
folder for the whole run. Scratch files of mine are deleted.

## Text the shared files need

**`C:\Repos\My projects\software-developer-agent\CLAUDE.md`** (main session), replacing its content:

```
**This repo** holds the agent team (`software-developer`, `task-lead` and `code-searcher` under `agents/`), the
`orchestrate-agents` skill the main session follows to run it, and the vendored skills the worker reads.
`README.md` says how it is wired.

**The agent files and the skill are live.** `agents/` is linked into `~/.claude/agents`, and `orchestrate-agents/`
into `~/.claude/skills` and `~/.copilot/skills` (`scripts/install.ps1`). An edit reaches every project at the next
Claude Code start. Edit with care, and keep them universal: a rule that only one project needs goes in that
project's instructions, its lead brief, or a project-specific worker type, never here.

**Every setting of the hooks and scripts is in `orchestrate-agents/orchestration.config.json`**, each with its
reason. Code and documents read it or point at it; none holds a second copy as the source of truth.

**The skills under `skills/` are vendored copies.** Never edit them; their value is matching their source. The only
deliberate differences are listed in `README.md`. To add a skill: copy its folder unchanged, add it to the README's
list, and add a row to the table in section 10 of `agents/software-developer.md`. Never add `graphify` or `pr-lens`
(the README says why).

**The vendored skills stay private to the worker.** Do not link `skills/` or any skill in it into
`~/.claude/skills`. `orchestrate-agents/` is not under `skills/`; it is linked on purpose.
```

**`orchestration.config.json`, `contextCaps`** (needed change; keys untouched by me): add entries for the project
worker types, or they fall to `default` (warn 400k of 500k), which is a lead's size:
`"xpp-porter": { "cap": 400000, "warn": 320000, "stop": 370000 }`, and the same for `"navigator-builder"`.

**Main session's files, now stale:** xpp-agent `CLAUDE.md` "Session Watch" still names
`C:\Repos\My projects\xpp-agent\Docs\Skills\orchestrate-agents\scripts\watch-session.ps1`; the new path is
`C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-session.ps1`. The global
`CLAUDE.md` section "A subagent cannot start agents" is overturned. `xpp-porter.md` and `navigator-builder.md` need
the frontmatter and sections listed in `worker-rules.md`.

**Into `machine-pitfalls`, if wanted:** the six traps of the worker's section 11 (robocopy exit codes,
`Start-Process pwsh -File` with spaces, long scripts as files, backtick-n in single quotes, Glob over junction trees,
argument arrays instead of `.cmd` shims) are not in that skill; the worker keeps them under the new title
"Machine traps not in `machine-pitfalls`".

## Settings added

None.

## Checks (all after the last change)

- Every full path and every script or reference name in the eleven documents exists on disk: all OK.
- No non-ASCII character in any of them.
- Agent frontmatter, checked by a scratch script against the docs' field list and enums: 3 of 3 ok; the script
  flagged a planted typo (`omitClaudeMD`, colour `grey`, `cacheTtl: 2h`). The skill's new description was picked
  up live by this session's skill list.
- The register commands as documented, on a scratch folder: `add` printed `D-0001`; `list --ids`, `summary`,
  `resolve` worked; a bad entry exited 2 naming the field. This found one doc error, fixed: `list --ids` of an id
  that is not open exits 2.
- `install.ps1`: 0 parser errors; scratch test 20 of 20; mutation check 6 of 6 caught (3 by a failed check, 3 by
  the run stopping on the error the broken rule caused; every copy loaded). Red first: the old script failed it.

**Not checked:** `install.ps1` was not run for real (task). No agent was started, so no agent file was loaded by a
live run. README's `node --test` was not run (builder A's tests, in progress). Whether Haiku 5.5 accepts `xhigh`.

## Risks, each with a recommendation

1. **`STOP FOR LIMIT` may not reach a lead that is waiting inside a foreground `Agent` call.** The docs promise
   mid-task messages from the launcher, but say nothing about an agent blocked on its own child. Example: lead A
   waits on run 4; main sends `STOP FOR LIMIT` at 14:20; if it is read only when run 4 ends at 14:50, a cache may
   go cold first. The docs cap the wait: main never waits past the first "going cold" time and hands over from
   disk. Recommend a probe like builder A's before the first real limit stop.
2. **"Workers start only `code-searcher`" cannot be enforced.** The docs say an `Agent(type)` list inside a
   subagent file is ignored. It is a rule in the worker's text only.
3. **`cacheTtl: 1h` is ignored while the subscription uses usage credits** (docs). Then every agent has 5 minutes,
   and the limit decision counts that correctly from the transcript.

## Learned

Nested agents (`spawnDepth` 2 and 3) sit in the same flat `subagents\` folder as the lead, so `watch-agent.ps1`
finds a lead's worker with the main session id. A resumed agent reports to whoever resumed it (docs).

```
DECISIONS TAKEN: repo CLAUDE.md left unedited (other: edit it; why: the task forbids editing any CLAUDE.md) | limit details moved to references/usage-limits.md and evidence to references/lessons.md (other: keep in SKILL.md; why: 15 KB aim) | task-lead names worker sizes by config value with "the file wins" (other: no numbers; why: agents need them to plan)
INITIATIVES: line WAITING FOR WORKER | <run> added to the lead protocol and the skill | install.ps1 also replaces a link that points elsewhere (old xpp-agent skill home) | software-developer.md gained global rules it no longer loads (no committing credentials, plain-words report style, a checkable caveat is a task)
ISSUES FOUND: install.ps1 mutation incident 08:44-08:45, junction recreated, details above | config contextCaps lacks xpp-porter and navigator-builder | xpp-agent CLAUDE.md Session Watch path and global CLAUDE.md "a subagent cannot start agents" are stale | Agent(type) allowlists are ignored in subagent files
QUESTIONS: Should the main session apply the CLAUDE.md text above? | Should a probe confirm STOP FOR LIMIT reaches a lead blocked on its worker before the first real limit stop?
```

## Second pass

Written 2026-10-25 09:58 by builder C's second pass. Full report: `C2_REPORT_CLAUDE.md`; progress:
`C2_PROGRESS_CLAUDE.md`.

**Outcome: both review findings held up and are fixed in the documents; none rejected.**

- **The user's words reach the register unchanged.** `SKILL.md` had main pass them in double quotes, where
  PowerShell dropped `$5`, ran `$(...)`, split at a curly quote and turned a backtick-n into a line break (3 of 6
  cases changed, measured). The resolve command now reads them from a single-quoted here-string: 10 of 10 cases
  arrive byte for byte, and 7 of 7 resolved through `register.mjs` on a scratch register hold the exact words. A
  file fallback covers the one corner (a line starting with `'@`, which fails loudly). `start-messages.md` points
  at it. An `--answer-file` option in `register.mjs` (builder A's) is recommended, not made.
- **The session stays watched through a limit hand-over.** `usage-limits.md` now has eight steps: restart the watch
  at once (a hand-over on record keeps it quiet, and a hard stop becomes `SESSION RESET COLD`), a background
  deadline at the first going-cold time, `STOP FOR LIMIT`, `TaskStop` for a lead still silent at the deadline, the
  hand-over, the relaunch, `TaskStop` for the watch, end. `SKILL.md`'s start rule and limit bullet match. Builder
  B's suite has the matching script test, and it passes.
- Changed: `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md`. My other nine files are
  unchanged.
- Checks after the last edit: `node --test` 71 of 71 pass, the PowerShell suite 50 passed and 0 failed (both
  through `run-heavy.ps1`). The background deadline ended on time and reported its end.
- Not tested: a real limit hand-over; whether `TaskStop` on a lead also stops its worker.
