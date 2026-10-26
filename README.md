# software-developer-agent

A small agent team for Claude Code, the skill that runs it, and the coding skills its worker reads.

- `software-developer`: the worker. Builds a self-contained piece of software in any language or project and
  proves it works before reporting.
- `task-lead`: the lead. Owns one task: plans it, starts workers, answers them, checks their results, and registers
  what the user must decide.
- `code-searcher`: the searcher. Finds and quotes on a cheap fast model; never analyses.
- `orchestrate-agents`: the skill the main session follows to run the team, with its hooks and scripts.
- `team-rules`: the rules the lead and the worker share (the user's guardrails, reading the project's `CLAUDE.md`
  files, the clock, the progress file, plain reports, the report block, messages), preloaded by both.

It distils what the `xpp-agent` repo learned the hard way while agents built its MCP servers: scope discipline,
verification before any claim, the test standard (round trips, hostile input, real material, mutation checks),
progress files and hand-overs, safety around live environments, and the main session, lead and worker protocol.

## Layout

```
agents/software-developer.md       the worker
agents/task-lead.md                the lead
agents/code-searcher.md            the searcher
orchestrate-agents/SKILL.md        the main session's protocol (loaded as the skill)
orchestrate-agents/references/     message templates, the lead brief template, the usage-limit steps, lessons
orchestrate-agents/orchestration.config.json   every setting of the hooks and scripts, each with its reason
orchestrate-agents/hooks/          context-guard.mjs (PostToolUse), decision-reminder.mjs (UserPromptSubmit)
orchestrate-agents/scripts/        register.mjs, the three watches (watch-usage-and-context.ps1,
                                   watch-decision-answers.ps1, watch-agent-size-and-stall.ps1), usage-probe.ps1,
                                   schedule-relaunch.ps1, start-session-in-vscode.ps1, run-heavy.ps1,
                                   limit-stop-server.mjs
orchestrate-agents/lib/            shared Node helpers
orchestrate-agents/tests/          Node tests (node:test) and a PowerShell test script
team-rules/SKILL.md                the rules the lead and the worker share (preloaded by both)
skills/<name>/                     the vendored coding skills the worker reads, copied from C:\Repos\My projects\Skills
skills/SKILLS_MANIFEST_CLAUDE.md   where each skill came from and the safety scan of 2026-09-30
scripts/install.ps1                links agents/ and the two skills
```

## How it is wired

- `scripts/install.ps1` creates five directory junctions. It is safe to run twice, and it stops without changing
  anything when a real folder is in the way:
  - `~/.claude/agents/software-developer-agent` -> `agents/`. Claude Code scans `~/.claude/agents` recursively, so
    the three agents are available in every project. A new or changed agent file is picked up at the next Claude
    Code start.
  - `~/.claude/skills/orchestrate-agents` and `~/.copilot/skills/orchestrate-agents` -> `orchestrate-agents/`, so
    Claude Code and GitHub Copilot both load the skill.
  - `~/.claude/skills/team-rules` and `~/.copilot/skills/team-rules` -> `team-rules/`. The lead and the worker
    preload it by name, so it must be installed before they start.
- The vendored skills under `skills/` are **not** linked. They stay private to the worker: it reads them by path, so
  other sessions do not see 17 more skill descriptions and do not start following rules written for a worker. The
  worker's file names that path (`C:\Repos\My projects\software-developer-agent\skills\`); moving the repo means
  changing it there, and in `task-lead.md` and the skill, which name the skill folder's full path.
- Every agent file sets `omitClaudeMd: true`: no `CLAUDE.md` is loaded into an agent. The worker and the lead read
  the project's own `CLAUDE.md` files themselves as their first step. Both preload with `skills:` the `team-rules`
  skill, which holds the user's guardrails and the other rules they share, and `machine-pitfalls`, which carries
  this machine's traps (it lives in `xpp-agent\Docs\Skills`). The worker also preloads `report-changes`.
- The worker and the lead run on `claude-opus-5-5` at `xhigh` with a 1-hour prompt cache
  (`experimental: { cacheTtl: 1h }`); the searcher runs on `claude-haiku-5-5` at `xhigh` with the default 5-minute
  cache. A start message that passes another model overrides the file.
- The worker reads three vendored skills at the start of every run: `karpathy-guidelines`,
  `test-driven-development`, `verification-before-completion`. The rest are read when the task calls for them (the
  table in section 10 of `agents/software-developer.md`).
- The hooks and `autoContinueAtUsageLimit: false` are set in `~/.claude/settings.json` by hand; `install.ps1` never
  touches settings. Every hook and script reads its settings from `orchestrate-agents/orchestration.config.json`.

## Tests

- The PowerShell scripts: `pwsh -NoProfile -File tests\limit-scripts.tests.ps1`, run in `orchestrate-agents\`. It
  takes about two minutes: one case waits out `run-heavy.ps1`'s one-minute wait on purpose.
- The Node hooks, helpers and `register.mjs`: `node --test`, run in `orchestrate-agents\` (Node finds every
  `*.test.mjs` under `tests\`).

## Skills

Copied from `C:\Repos\My projects\Skills\Sofware-engineering-coding` on 2026-10-24. The originals there are
unchanged.

Included (17): `architecture-patterns`, `backend-patterns`, `coding-standards`, `eli5`, `i-have-adhd`,
`karpathy-guidelines`, `mcp-builder`, `multi-reviewer-patterns`, `parallel-debugging`, `requesting-code-review`,
`systematic-debugging`, `test-driven-development`, `understand-explain`, `understand-onboard`,
`verification-before-completion`, `webapp-testing`, `writing-plans`.

Left out:

- `graphify`: its install rewrites settings, `CLAUDE.md` and git hooks, and tells every agent to query it before
  reading files.
- `pr-lens`: uploads a map of the codebase to a public link by default and runs unpinned `npx ...@latest`.
- `skill-creator`: for writing skills, not software.
- From `systematic-debugging`: the four test fixtures `test-pressure-1.md` to `test-pressure-3.md` and
  `test-academic.md`. They are written as live orders with invented urgency, and the manifest recommends deleting
  them.

Every other file is byte-identical to the original.
