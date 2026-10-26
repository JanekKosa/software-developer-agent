**This repo** holds the universal `software-developer` subagent and the skills it reads. `README.md` says how it is
wired.

**The agent file is live.** `agents/` is linked into `~/.claude/agents`, so an edit to `agents/software-developer.md`
reaches every project at the next Claude Code start. Edit it with care, and keep it universal: a rule that only one
project needs goes in that project's instructions or in a project-specific worker type, never here.

**The skills under `skills/` are vendored copies.** Never edit them; their value is matching their source. The only
deliberate differences are listed in `README.md`. To add a skill: copy its folder unchanged, add it to the README's
list, and add a row to the table in section 10 of the agent file. Never add `graphify` or `pr-lens` (the README
says why).

**Every working file about the agent team lives in this repo**, never in the repo a session happens to run from
(user, 2026-10-25): plans, task, progress and report files under `misc/implementation/agent-team/stage-<N>/`, stage
reports and dated session reports under `misc/reports/`, hand-overs under `misc/handovers/`, the decision register
under `decisions/`, and explainer pages beside the reference they explain.

**The skills stay private to the agent.** Do not link `skills/` or any skill in it into `~/.claude/skills`.
