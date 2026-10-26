# Agent team stage 1, builder C: progress

Started 2026-10-25 08:37 (clock read). Builder C writes the documents of plan sections 3-9.

## Files I own (repo `C:\Repos\My projects\software-developer-agent`)

- `orchestrate-agents\SKILL.md` (rewrite, aim under 15 KB)
- `orchestrate-agents\references\*.md` (rewrite or replace)
- `agents\software-developer.md` (edit)
- `agents\task-lead.md` (new)
- `agents\code-searcher.md` (new)
- `README.md`, `CLAUDE.md`
- `scripts\install.ps1` (do not run it)

Not mine: `orchestration.config.json` (read only), `hooks\`, `lib\`, `scripts\*.mjs|*.ps1` other than install.ps1, `tests\`, `skills\`.

## Done

- 08:37 Read the plan whole, the three skills, the old SKILL.md and its three references, the config, the agent file,
  install.ps1, README.md, CLAUDE.md.

## Baseline (08:40)

- git: no commits; everything untracked (`?? CLAUDE.md, README.md, agents/, orchestrate-agents/, scripts/, skills/`).
- SHA-256 (first 16) before my edits: SKILL.md BBAAFC39F6D92808; lead-brief-template A400E78EF27D0826;
  start-messages 6E5064183F436AC7; worker-rules 3D1D46372116CF5B; software-developer.md 69F9A175EBA76F00;
  README 34706CD9394ADFFA; CLAUDE.md 9F8AAE5A22ABAC13; install.ps1 A84FE8AE86791DE8; config EDF6353C59B494D6.
- Links already in place: `~/.claude/agents/software-developer-agent` -> repo `agents`;
  `~/.claude/skills/orchestrate-agents` and `~/.copilot/skills/orchestrate-agents` -> repo `orchestrate-agents`;
  `~/.claude/skills/machine-pitfalls` -> xpp-agent `Docs\Skills\machine-pitfalls`.
- Claude Code CLI 2.1.286.

## install.ps1 (done 08:45)

- Rewritten: three junctions (agents; skill for Claude Code; skill for Copilot), all checked before any change,
  a link to elsewhere removed with `[System.IO.Directory]::Delete(path, $false)` and made again, a real folder or
  file in the way stops everything. Dot-sourcing defines the functions only. NOT run for real.
- Scratch test (scratchpad `install-test\test-install.ps1`, home swapped for a scratch folder): 20 of 20 pass.
  Red first: against the old script it failed (`Get-LinkPlan` not recognized).
- Mutation check: 6 of 6 caught (3 by a FAIL line, 3 by the test run stopping on an error the broken rule caused;
  each copy loaded).
- INCIDENT 08:44-08:45: the first mutation round ran before the test swapped the home folder. The "no dot-source
  guard" mutant then ran the install against the REAL home, found the agents junction pointing at the real repo
  (not at the mutant's), deleted that junction (link only; the repo's `agents` folder untouched) and failed to make
  the new one (mutant target missing). I recreated `~/.claude/agents/software-developer-agent` ->
  `C:\Repos\My projects\software-developer-agent\agents` at 08:45 and checked all three links. The other two links
  were never touched. Missing for about one minute. Also: the red step dot-sourced the OLD install.ps1, whose last
  line ran its install; it found the junction already right and changed nothing.

## Measured / read (08:38-08:43)

- Docs (code.claude.com/docs/en/sub-agents, fetched 2026-10-25): frontmatter fields `tools`, `disallowedTools`,
  `model` (full ids allowed), `effort`, `color` (red blue green yellow purple orange pink cyan), `skills` (YAML list,
  full content injected), `omitClaudeMd` (2.1.271+), `experimental: { cacheTtl: 5m|1h }` (2.1.248+, inside the map).
- Docs: `Agent(type)` allowlist inside a SUBAGENT definition is ignored (only for `claude --agent` main thread). So
  "a worker starts only code-searcher" cannot be enforced in frontmatter; it is a rule in the body.
- Docs: nesting up to three layers below main by default (main 0, lead 1, worker 2, searcher 3 = at the limit, no
  Agent tool; fine).
- Docs: "In an interactive session, the resumed agent then reports back to the subagent that resumed it, not to
  your main conversation." Supports lead -> worker SendMessage resume.
- Docs: "A subagent treats messages from the agent that launched it as normal task direction, including mid-task
  course corrections." Delivery to an agent blocked inside a foreground Agent call is NOT documented.
- Docs: background subagents keep only listed built-ins incl. PowerShell, SendMessage, Read/Grep/Glob, Edit/Write;
  Agent follows the depth rule wherever it runs.
- register.mjs: entry fields kind, blocking, raisedBy, task, what, example, options (list, >= 1), recommendation,
  meanwhile, evidence (list, >= 1); all required, no others. `--root` optional.
- watch-session.ps1 (builder B, in progress): markers SESSION NEAR CAP, SESSION RESUMED, WATCH ALREADY RUNNING,
  WATCH FAILED, LIMIT NEAR | HAND OVER (+ a line with the exact schedule-relaunch command and ISO -At),
  SESSION RESET COLD (line carries `-At now`).
- schedule-relaunch.ps1: `-ProjectDir -HandoverPath -At <ISO|now> [-DryRun]`; last line SCHEDULED, ALREADY
  SCHEDULED, DRY RUN or RELAUNCH NOT SCHEDULED.
- watch-agent.ps1: `-AgentId -SessionId [-WarnTokens 400000] [-QuietMinutes 30]`.
- context-guard.mjs texts match plan section 7.
- machine-pitfalls exists (3.8 KB + references); the six traps of the worker's section 11 are not in it.

## Decisions

- Repo `CLAUDE.md`: NOT edited. The task lists it as mine but also says "Never edit ... any CLAUDE.md"; an agent
  message cannot authorise a CLAUDE.md change. Exact text goes in the report for the main session.
- References: lead-brief-template (project part only), start-messages (main's messages), worker-rules (for
  project-specific worker types), new usage-limits.md (limit flow detail), new lessons.md (evidence behind rules)
  so SKILL.md stays under 15 KB.
- Lead starts workers; works whether the Agent call is foreground or background; never ends its turn with a line
  for main while one of its workers runs.
- Worker: whoever started it is its lead; final message = WORKER DONE line + summary + report block.

## Agents (done 08:49)

- `agents\code-searcher.md` new: Haiku 5.5 xhigh, omitClaudeMd, tools Read/Grep/Glob/PowerShell, find-and-quote
  only, output shape FOUND/COUNTS/TRUNCATED/NOT FOUND/NOT DONE.
- `agents\software-developer.md` edited: frontmatter (omitClaudeMd, cacheTtl 1h, skills + machine-pitfalls,
  disallowedTools Workflow); step 3 reads CLAUDE.md itself; section 3 rewritten (lead = starter, final message =
  summary, QUESTION FOR THE LEAD as final message, code-searcher only, structured answer in workflows); section 4
  credentials incl. commit; section 7 cap 400k + CONTEXT GUARD + STOP NOW + STOP FOR LIMIT; section 8 caveat line;
  section 9 report block + final message shape; section 10 clash wording; section 11 title.
- `agents\task-lead.md` new (18.5 KB): whole generic lead protocol.
- Added line not in the plan: `WAITING FOR WORKER | <run>` (only if a lead must end a turn to wait; main ignores it).

## Skill, references, README (done 08:53)

- SKILL.md rewritten, 14,498 bytes. References: lead-brief-template (project part only), start-messages (main's
  messages incl. STOP FOR LIMIT, PAUSE, answers, cache-aware resume), worker-rules (for project worker types),
  usage-limits (new), lessons (new, incl. "Overturned on 2026-10-25").
- README rewritten for the three agents, the linked skill, omitClaudeMd, tests.

## Checks (08:53-08:56, after the last edits)

- Every `C:\Repos\My projects\...` path and every script/reference name in the documents exists (all OK).
- No non-ASCII characters left (the one `½` replaced).
- Frontmatter checker (scratch Node script, field list from the docs): 3 agents ok; it flags a planted typo.
- register.mjs commands as documented, on a scratch folder: add -> D-0001; list --ids; summary; resolve; a bad
  entry exit 2 "missing field: blocking". Found: `list --ids` of an id that is not open exits 2 -> task-lead.md
  fixed to say so and to search `list --open` without ids after a failed add.
- install.ps1: parser 0 errors; scratch test 20/20; mutants 6/6 (see above). Real links checked at 08:56: all three
  junctions point at this repo.
- Scratch files of mine deleted (install-test, check scripts, register-check). Other files in the scratchpad belong
  to the main session.

## Not checked

- install.ps1 not run for real (task says so).
- No agent was started: the agent files were not loaded by a live Claude Code run.
- README's `node --test` command not run (builder A's tests, running at the same time).
- Whether STOP FOR LIMIT reaches a lead that is blocked in a foreground Agent call; whether Haiku 5.5 accepts
  `effort: xhigh`.

## Report (08:57)

- Written to `C_REPORT_CLAUDE.md`. Nothing left but the structured answer.
