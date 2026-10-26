# Lead brief for one project (template)

The generic lead protocol lives in the `task-lead` agent itself (`agents\task-lead.md` in the
software-developer-agent repo): planning, task files, starting workers, answering, checking, registering, the
lines, the hand-over and the limit stop. This template holds only what changes from project to project.

Copy it into the project's working folder (for example `temp\<PROJECT>_LEAD_BRIEF.md`), replace every `<...>`,
delete what does not apply, and name it in every lead's start message. It is written to the lead. Keep it short:
every lead reads it whole.

---

# <Project>: lead brief

It binds every task lead of <project> (repo `<repo path>`). Read it whole after the project's `CLAUDE.md` files.

## Where things are

- Working folder for lead files, task files, reports and `entry.json`: `<folder>`. <Can it be wiped? Then what
  must survive goes into <the continuation plan / the stage report>.>
- Status file (one row per run): `<path>`. Sizes file (every run's size, tool calls, minutes, peak memory):
  `<path>`.
- The plan of record and its sections per task: `<path>`, <which sections each task reads>.
- The decision register: `<repo root>\decisions\` (committed here: <yes / no, local only>).

## Workers

- Worker type: `<software-developer | the project's own type, such as xpp-porter>`. <When to use which.>
- What every task file makes the worker read first: <the project's instruction files and the sections of the
  worker brief, if the project has one>.
- Files no worker may edit: <shared registries, config, generated files, files only the main session edits>.

## Checks

- Baseline at the start of this stage, verified by the main session at <time>: <type-check clean; N test files,
  N tests; N of N integration>.
- The commands that check a run, with the counts to expect:
  - type-check: `<command>`
  - the whole suite: `<command>` (<N> tests)
  - integration tests that need no live system: `<command>`
- Protected trees that must show 0 changes, and how to prove it: <folders; hash list command; build output and
  live config dates>.
- Real material for the invariant check, opened read-only: <paths, recorded answers, scratch copies>.

## What only the main session does here

<Builds of the live output, the real configuration, switching a feature on, files only the main session edits
(name them), commits and pushes, anything outside the repo, any run against <the live systems by name>.>

## Hard rules of this project

<Protected folders, data that must never leave its place, processes never to stop, the machine's limits, naming
rules for files the lead writes.>

## Still waiting for the user

<Register ids and one line each, so no lead builds what is undecided.>
