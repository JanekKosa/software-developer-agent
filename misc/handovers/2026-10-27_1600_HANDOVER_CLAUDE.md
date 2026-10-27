# Hand-over: main session of 2026-10-27 (agent team), at the weekly usage limit

Written by the main session at 2026-10-27 16:00. The weekly limit reached 98% at about 15:55; it resets 2026-10-31
07:00. The limit-stop server stopped every agent; the one running lead ended with `LEAD STOPPED`. No agent is running.
Every decision and the user's words are in `decisions\` (closed entries carry a summary). Nothing is open there.

## First steps for the new chat

1. Switch the team on, as `/software-developer-agent` does (`team-switch\SKILL.md`): run
   `node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\team-on.mjs"` (the mark now lands in
   `C:\Users\user\.claude\state\software-developer-agent\team-on\`), start the two watches with exactly the
   descriptions `Usage and context watch` and `Decision answers watch` (paths in `team-switch\SKILL.md`), then load the
   `orchestrate-agents` skill.
2. Tell the user in one line that this is the continuation and what is left (below).
3. Start one successor lead for the self-contained task (below), with the "successor lead in a new session" message
   of `orchestrate-agents\references\start-messages.md`.

## What was done today (checked by the main session unless said)

- **D-35:** `/clear` switches the team off; said in `team-switch\SKILL.md` and both guide pages.
- **D-36, D-39, D-51 to D-54 (state-folder lead, TASK DONE 14:43):** every file the team writes for itself is under
  `C:\Users\user\.claude\state\software-developer-agent\` (seven child folders). Switch-over run by me at 14:44:
  log trimmed to 841 bytes (D-51), `-Apply` 34 state + 21 code files, 0 conflicts. Node 261/261 and PowerShell
  122/122 on the live code (me, 14:52). The user ran `/reload-plugins` (~15:15); the pane found this chat. The usage
  reading landed in the new folder at 15:52. `-RemoveOld` at 15:59: 31 removed, 8 kept (stopped watches' marks, one
  old switch-on mark). Summary: `misc\implementation\agent-team\stage-2\STATE_FOLDER_SUMMARY_CLAUDE.md`.
- **D-40 rule:** register entries are readable at a glance, in points (`agents\task-lead.md` section 8 with a sample;
  `orchestrate-agents\SKILL.md` "Entries."). The register and pane show points (runs F1, F2, checked by the lead).
- **D-37:** P3's leftover transcripts deleted. **D-50:** client name in `STATE_FOLDER_SWEEP_CLAUDE.md` replaced.
- **Repo link:** `C:\Users\user\.claude\software-developer-agent` is a junction to this repo (made 15:21 for D-47).

## The self-contained task (D-38 and its answers D-41 to D-49, D-55): STOPPED, half done

The user wants the repo to hold everything the team needs, with one init script that does every step that needs no
LLM, and then per-project and per-domain customisation (D-40, accepted, last). Lead file, with its `## Hand-off`
section first: `misc\implementation\agent-team\stage-2\SELF_CONTAINED_LEAD_CLAUDE.md`.

- Checked by the lead: F1, F2 (points); S1 (skills moved into the repo); S2 (pane copied into the repo, marketplace;
  `claude-code-mods` copied to claude-code-extensions).
- Built, NOT checked: S3a (per-PC settings file `pc-settings.json`, doc paths through the repo link, six traps moved
  to `windows-pitfalls`; Node 277/277 by its worker, PowerShell not run) and S3b1 (`install.ps1` renamed `init.ps1`;
  29 tests pass; invariant, mutation, end check and report not done). Their workers' hand-offs:
  `SELF_CONTAINED_S3A_PROGRESS_CLAUDE.md`, `SELF_CONTAINED_S3B1_PROGRESS_CLAUDE.md`.
- Not started: init part 2 (settings, per-PC file, pane install), the clean-machine check, the docs run, the summary,
  then D-40.
- Live state meanwhile: nobody has run `init.ps1` on this PC; `windows-pitfalls` is not linked yet (machine-pitfalls
  still holds every trap); the pane still runs from `claude-code-extensions\decisions-pane`.

## New requirement from the user, after the hand-over was written (16:0x)

Asked where to change the leads' and workers' model and effort, the context caps and the watch periods, the user said:
"well all hard code values, and settings should be in one config file in the root". Today model and effort sit in
each agent file's frontmatter (`agents\*.md`), the rest in `orchestrate-agents\orchestration.config.json`, and S3a
added `pc-settings.json`. Give it to the successor lead as part of the self-contained task, before D-40: one config
file at the repo root for every setting and hard-coded value. Claude Code reads model and effort only from the agent
files, so the init script would write them from the root file; the lead registers how that works (in points) before
building it.

## The main session's own steps still to do

1. File the two traps the workers reported into `windows-pitfalls` (listed in the lead file's `## Hand-off`).
2. Before any commit: delete `misc\implementation\agent-team\stage-2\STATE_FOLDER_STAGING\` and
   `STATE_FOLDER_STAGING_BASE_CLAUDE.txt` (only the vehicle of the switch-over; never commit them).
3. At the end of the self-contained task: the steps its summary lists (re-point skill links, remove xpp-agent's copies
   of `report-changes`, `explain-clearly` and `claude-code-mods`, trim xpp-agent's machine-pitfalls to this PC's own
   traps, switch the pane's install to this repo).
4. Nothing since the first commits (10abe9f here, b6d7deb in claude-code-extensions) is committed, in any repo. Commit
   only when the user asks (VS 2026's git by full path; machine-pitfalls).

## Traps seen today

- The pane is read straight from its repo folder: every NEW chat runs the pane's current source at once, while an open
  chat keeps the old one until `/reload-plugins`. Changing the pane's rule before the live settings match hides the
  Decisions tab in new chats. Worth a line in `claude-code-mods` if it is not there yet.
- I wrote a few times from memory instead of the clock early on (D-37's summary says 10:41; it was about 10:31).
  Read the clock for every time written.
- The user wants short replies, decisions only in the pane and in points, and is frustrated by slow work.
