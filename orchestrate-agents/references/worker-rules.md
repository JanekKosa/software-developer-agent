# What a project-specific worker type needs (template)

The universal worker is `software-developer` (`agents\software-developer.md` in the software-developer-agent repo).
It already holds everything below. Use this page only when a project keeps its own worker type (in xpp-agent:
`xpp-porter`, `navigator-builder`), so that type works under a task lead the same way.

## Frontmatter

```yaml
model: claude-opus-5-5
effort: xhigh
omitClaudeMd: true          # it reads the project's CLAUDE.md files itself, as its first step
experimental:
  cacheTtl: 1h              # a lead may answer it after more than 5 minutes
skills:
  - team-rules              # the rules leads and workers share: guardrails, CLAUDE.md first, clock, progress file, report block
  - report-changes
  - windows-pitfalls        # the traps of any Windows PC, part of the team
  - machine-pitfalls        # this PC's own traps; the init run gives a PC that has none an empty starter
disallowedTools: Workflow
```

Why each line: `omitClaudeMd` keeps the global and project instruction files out of a context that needs only the
task; `cacheTtl: 1h` keeps a worker that waits for its lead's answer from being re-read from scratch; `team-rules`
carries the user's guardrails and the rules every lead and worker share, so they need no copy;
`windows-pitfalls` and `machine-pitfalls` carry the traps the agent no longer gets from the global file: the first
those true on any Windows PC, the second this PC's own (each PC keeps its own, outside the repo). `skills:` is a plain
list of names, so a project adds its own skills the same way. Subagents never get the `Workflow` tool anyway; the
line says so on purpose.

## The sections to copy

Copy these from `agents\software-developer.md` word for word, so one change reaches every worker type the same way
when the copies are refreshed:

- Section 1, step 3: read the project's `CLAUDE.md` files yourself (it points to `team-rules`, section 2).
- Section 3, "Who you answer to": the lead is the agent that started it, the final message is the report summary,
  a question is a final message starting `QUESTION FOR THE LEAD |`, only `code-searcher` agents may be started.
- Section 7, the bullets on the 400 thousand cap, `CONTEXT GUARD`, `STOP NOW` and `STOP FOR LIMIT`.
- Section 9, the final message (the report block itself is in `team-rules`, section 6).

The context-guard hook takes a type's sizes from `contextCaps` in `orchestration.config.json`. A type with no
entry there gets the `default` one (warn at 400 thousand, stop at 460 of 500), which fits a lead, not a worker. So
give each project worker type an entry with the worker's numbers (cap 400000, warn 320000, stop 370000); the main
session edits that file.

## Heavy commands

Other agents may be working beside the worker. It runs every heavy command (type-check, tests, build, a long
real-data run) through `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1" -Command '<command>'`:
it waits for its turn and for free memory, and its last line gives the peak. A redirection to a log file goes
inside the command. An error that a type-check or test run shows in a file another agent is changing is that
agent's: the worker reports it and does not fix it.
