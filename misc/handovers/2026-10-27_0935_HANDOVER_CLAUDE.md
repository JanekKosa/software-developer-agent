# Hand-over: main session of 2026-10-26/27 (agent team), at its context cap

Written by the main session at 2026-10-27 09:35, at 453k of its 500k cap. No lead or worker is running; nothing was
cut off mid-run. The user's words and every decision are in `decisions\` (closed entries carry a summary).

## First steps for the new chat

1. This chat continues a chat the user switched the team on for, so switch it on the way `/software-developer-agent`
   does (`team-switch\SKILL.md`): run `node 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\team-on.mjs'`,
   then start the two watches with exactly these descriptions: `Usage and context watch`
   (`scripts\watch-usage-and-context.ps1`) and `Decision answers watch` (`scripts\watch-decision-answers.ps1`, from
   this repo), then load the `orchestrate-agents` skill. Also check whether `/software-developer-agent` now shows as a
   command after the restart (it was linked at 2026-10-26 23:16 and never seen in a fresh chat) and tell the user in
   one line.
2. Tell the user in one line that this is the continuation, and what is left (below).

## What was done in the old chat (all checked)

- Decisions go to the register and the Decisions pane, never written out in the chat (only a blocking one is named
  in one line). Global instructions, SKILL.md, task-lead.md, explain-clearly and the hook say so.
- Stage 2 (lead, `misc\implementation\agent-team\stage-2\ANSWERS_LOG_SUMMARY_CLAUDE.md`): answers log
  (`decisions\ANSWERS_LOG_CLAUDE.jsonl`), close with summary, Follow up, the Decision answers watch (30 min, or within
  5 s once nothing waits for the user), watches renamed (D-16), registers of this repo, xpp-agent and
  claude-code-extensions migrated. Node 229/229 and PowerShell 105/105 at 2026-10-26 23:25 after the switch below.
- The switch (D-32, D-33): the team runs only in a chat switched on with `/software-developer-agent`
  (`team-switch\SKILL.md`, junction `~\.claude\skills\software-developer-agent`, made by `scripts\install.ps1`);
  `scripts\team-on.mjs` writes `%TEMP%\claude-agent-team-on\<session id>`; both hooks check it
  (`lib\agent-team.mjs`); global instructions updated and synced.
- `agent-team-files.html` (repo root): the page on every file the team uses; opened for the user.
- The pane only in a switched-on chat (D-34, lead, `stage-2\PANE_SWITCH_SUMMARY_CLAUDE.md`): pane tests 107/107 and
  validate passing, re-run by the main session at 09:34.
- First commits pushed to GitHub (public, at the user's insistence): `JanekKosa/software-developer-agent` (10abe9f)
  and `JanekKosa/claude-code-extensions` (b6d7deb). Both repos' commit email is JanekKosa's no-reply address
  (repo-local), and `core.autocrlf false` is set repo-locally.

## What is left

1. Apply the exact text in `stage-2\PANE_SWITCH_SUMMARY_CLAUDE.md`, section "Text for files outside this task",
   items 1 to 4: `orchestration.config.json` `_whyOnFolder`, `lib\agent-team.mjs` line 2 (`/orchestrate-agents` ->
   `/software-developer-agent`), README two places, and four lines for the `claude-code-mods` skill
   (`C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`). Then run `node --test` in
   `orchestrate-agents\` (229 expected; the README and a comment change only).
2. Item 5 there (leftover headless-run transcripts under `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-...-scratchpad-p3-repo\`
   and maybe a `~\.claude.json` entry): register it for the user as a low question (remove or keep); never delete
   without the answer.
3. Ask the user to run `/reload-plugins` (the pane change goes live then; an ordinary chat then loses its Decisions
   tab).
4. D-35 waits for the user (`/clear` in a team chat turns the team off there). Process the answer when the watch or
   the hook hands it over.
5. Nothing since the first commits is committed, in either repo. The user commits only when they ask; when they do,
   use VS 2026's git by full path (machine-pitfalls) and the remotes `https://JanekKosa@github.com/JanekKosa/<repo>.git`.

## Traps seen in the old chat

- The Bash tool was not used; PowerShell only. Pass register summaries in single-quoted here-strings.
- `register.mjs close` needs `--summary`; `follow-up --id --text` replaces `keep-open`.
- After the Decision answers watch ends with `DECISION ANSWERS | ...`, start it again (description `Decision answers watch`).
- The user wants short chat replies, decisions only in the pane, and gets frustrated by slow work: run steps in
  parallel when files are disjoint and memory allows (about 2 GB free last night).
