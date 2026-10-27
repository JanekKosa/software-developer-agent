# Task: the team's state in one folder (D-36), and the /clear note (D-35)

Written by the main session at 2026-10-27 10:32.

## Part 1: the /clear note (D-35, closed, the user chose A)

The user's words: "Chose A: keep it as it is and say it in the two guide pages and in the /software-developer-agent
command's text: after /clear, type /software-developer-agent again (one short documentation run)."

- The command's text is done: the main session added three lines to `team-switch\SKILL.md` at 10:30 (read them; quote
  them, don't reword them).
- Left: the two guide pages, `orchestrate-agents\references\agent-team-guide.html` and `agent-team-files.html` (repo
  root). The facts are in D-35 in `decisions\RESOLVED_DECISIONS_CLAUDE.md` and in `stage-2\P3_REPORT_CLAUDE.md`.
- Part 2 changes the same two pages, so do part 1 first or fold it into part 2's documentation run.

## Part 2: every file the team writes for itself in one folder (D-36)

The user's words: "Other: well i want all temp files related to this agent in the same place". The main session read
this as option A of D-36, stretched to every file, and sent the user a follow-up saying so at 10:31 (the entry is back
with the user, not blocking). The work starts on that reading:

- One folder, `%USERPROFILE%\.claude\state\agent-team\`, as **one setting** in `orchestration.config.json`, so another
  place costs one line if the user answers the follow-up differently. Sub-folders per kind are your call.
- What moves, at least: from `%TEMP%`, the switch-on marks (`agentTeam.onFolder`), the size guard's marks
  (`contextGuard.markerFolder`) and the usage probe's folder (`usageLimits.probeWorkingFolder`); from
  `%USERPROFILE%\.claude\state\`, `usage-limits.json`, `relaunch.log` and `limit-stop.log`. Find everything else the
  hooks, scripts and watches write (records, locks, slots, pipes' files, logs) and move it too. Have a searcher list
  every place the old paths are named, in both repos and in the skills outside the repo.
- What stays: Claude Code's own files (transcripts under `~\.claude\projects\`, `%TEMP%\claude\`, `~\.claude.json`).
- The Decisions pane keeps a copy of the switch-on rule: `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\team-on.ts`
  (its header names the sources). Change it with the source, with its tests and README.

## What is live, and why it matters here

- The two hooks run from this repo (`~\.claude\settings.json` points at `orchestrate-agents\hooks\`). An edit to the
  hooks, `lib\` or the config reaches this chat, you and your workers at the next tool call. This chat is switched on
  by a mark in the old folder, and the main session's Usage and context watch is running on the old paths.
- So: at no point may the hooks fall silent for this chat or its agents without the main session knowing, and the
  limit-stop server must keep reaching every agent. Plan the cut-over so it is one last step, and give the main
  session the exact steps it runs at the end (for example: run `team-on.mjs` again, restart both watches, move or
  leave the old files, `/reload-plugins` for the pane). The pane changes only at `/reload-plugins`.
- Files outside both repos (`~\.claude\settings.json`, the global `CLAUDE.md`, the skills under
  `C:\Repos\My projects\xpp-agent\Docs\Skills\`) are the main session's: give it the exact text, as the pane switch
  task did in its summary.

## Done when

- Both parts built and tested; Node suite (229 before), PowerShell tests (105 before) and the pane's tests (107
  before) all pass, plus new tests for the new folder and the cut-over.
- A summary in this folder with the cut-over steps, the text for files outside the repos, and the run sizes.
