# P2 progress: the two guide pages say the Decisions pane shows only in a switched-on chat

Started 2026-10-27 09:19 (clock). Task: `P2_TASK_CLAUDE.md` in this folder.

## Files I own

- `C:\Repos\My projects\software-developer-agent\agent-team-files.html` (untracked in git), only the places that
  describe the pane or the switch's effect on it.
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\agent-team-guide.html` (modified in
  git before I started), same limit.
- This progress file and `P2_REPORT_CLAUDE.md`.

Not mine: `C:\Repos\My projects\claude-code-extensions\decisions-pane` (P3 is in it; I read only line 64 of
`hooks\pane.tsx`), everything else in `orchestrate-agents\`, README, SKILL.md.

## Baseline (2026-10-27 09:20)

Script: scratchpad `p2\baseline.ps1` (copies saved as `*.before` next to it).

- agent-team-files.html: 74056 bytes, starts `3C 21 64 6F` (`<!do`, no BOM), ends LF, CRLF=0 LF=963 CR=0,
  sha256 C8283382...785698.
- agent-team-guide.html: 39727 bytes, starts `3C 21 64 6F` (no BOM), ends LF, CRLF=0 LF=653 CR=0,
  sha256 3C6AC706...41F1E5.

## Plan

1. Read each named place in agent-team-files.html with lines around it; edit in the page's style.
2. Same for agent-team-guide.html (190, 198, section at 515).
3. Checks: quote equals `NOT_ON` (script), search for every mention of the pane, tag balance of touched elements,
   encoding and line endings, paths exist.
4. Report.

## Done

### agent-team-files.html (09:22, clock)

Edited (old line numbers):
- 575 settings.json bullet: + "The pane shows only in a chat you switch on (step 1)."
- Step 1 (after 593): + two bullets: the pane checks the same marker (D-34) at chat start and every look (2 s); shows
  with it; a chat switched on later shows it from the next look, no reload; marker gone (cleaned temp folder) ->
  closes at next look. Without the marker: no tab, never opens by itself, reads no register file; `/decisions-pane`
  says the NOT_ON line (plain text in straight quotes, one source line, because `code` is `white-space: nowrap` on
  this page and would overflow on a phone).
- 597 example: Chat A also gets the Decisions tab; Chat B gets none of them, no tab even when entries wait in its
  repo. (First draft named D-12 in Chat B; dropped: D-12 does not exist yet at 09:05 in the page's timeline.)
- 705: "The main chat is switched on, so the Decisions pane shows there. It reads ..."
- 801 plugin row: + "Shows only in a chat switched on with /software-developer-agent: when the chat starts and at
  every look, it checks for that chat's marker, %TEMP%\claude-agent-team-on\<session id>. Without it: no tab, no
  register read. With it, reads ..."; "Takes the file names and the marker's folder from orchestration.config.json"
  (the marker's folder rests on the lead's task file, line 928 note; I did not read the pane's code).
- 846 marker row: "Both hooks and the Decisions pane check that it exists."
- 873-875 cleaned temp folder: + "The Decisions pane closes at its next look." and "the pane shows from its next
  look" after typing the command again.
- 900-901 (open item about the marker's time): "the hooks and the Decisions pane only check that the file exists"
  (not named by the lead; same fact as 846, else the item reads as if only the hooks check).
- 902-903 open item "The Decisions pane does not check the switch": removed. The "Still open" list keeps no settled
  items (flags are only `new` and `note`; no settled/resolved styling or list on the page).
- 928 agentTeam.onFolder row, Read by: "...both hooks read; the pane".
- 954 footer: + "Updated 2026-10-27 at 09:22: the Decisions pane now checks the switch (D-34). That part comes from
  the report of the stage 2 run that built it and from the pane's "not on" line in its code."

Left unchanged, true as they stand: 695 (one script writes the register, so the pane ... read the same layout),
706 (Submit runs register.mjs answer), 779 (scripts read by the pane), 799 (settings.json "turns the pane on": the
plugin is enabled there), 938 (register.* read by the pane), 954 sources list.
Nothing on this page speaks of `/clear` or resuming a chat (grep: only usage-limit "resume or hand over" at 743, 849).
Near it: 876-877 "Claude Code restarts: The watches stop; every file stays. A watch started again finds the old
marker..." (the watch's own marker, not the switch) - left alone, named in the report.

### agent-team-guide.html (09:25, clock)

- Section 5 "You answer in the Decisions pane or in the chat" (515): + new first bullet "The pane appears only in a
  chat switched on with /software-developer-agent (step 0): it checks the same mark as the hooks. An ordinary chat
  shows no pane, even when entries wait in its repo." Said once, there. First tried after the first bullet; moved to
  first place because "The chat does not repeat it" refers back to the first bullet's entry.
- 190 (header lead) and 198 (at a glance): unchanged. They describe the team, which runs only in a switched-on chat;
  step 0 says so. Diagram aria-labels 331, 388 and diagram texts 374, 396, 417 unchanged, still true.
- Other pane mentions, unchanged and true: 280 (hook hands over a pane answer), 594-597 (watch fails: pane answers
  still reach the chat through the hook), 630 (decision-reminder.mjs row).
- Restart/resume already on the page, left alone (now 594-595, old 592-593): "Claude Code restarts: ... The main chat starts its
  watches again and resumes warm agents." (agents resumed; implies the chat goes on after a restart; does not name
  the pane).

### Checks (2026-10-27 09:25, after the last page edit)

Scripts in the scratchpad `p2\` (check.mjs, baseline.ps1), deleted at the end.
- Quote: `node check.mjs` takes NOT_ON from pane.tsx line 64 only (text between the single quotes), finds every
  `"The agent team is not on..."` quote in both pages: 0 differences on 1 quote (agent-team-files.html:599).
  "not on in this chat" appears 1 time in the files page, 0 in the guide. Self-test: an altered quote (`,` for `;`)
  compares unequal (False), so the compare can fail.
- Tag balance, 14 element types (li p td tr code ul span b footer q strong table tbody section), open = close in
  both pages after the change. Changes against the baseline copies: files page li +1 (2 added, 1 removed), code +3
  (1 in step 1, 2 in the plugin row), span -1 (the removed item's flag); guide li +1, code +1. All explained.
- Encoding and line endings: both pages start `3C 21 64 6F` before and after (no BOM), end with LF, CRLF=0 CR=0
  before and after. LF 963 -> 971 (files page, +8 lines: 20 inserted, 12 deleted per git diff --stat), 653 -> 655
  (guide, +2).
- `git diff --no-index` of each page against its baseline copy: only the places listed above changed.
- Paths named: `%TEMP%\claude-agent-team-on` exists; `~\.claude\skills\software-developer-agent\SKILL.md` exists;
  the decisions-pane folder exists; `orchestration.config.json` has `agentTeam.onFolder` = `claude-agent-team-on`
  (line 124). `/decisions-pane` as a command: from P1's report, not checked in code (task forbids reading it).
- Every place naming the pane / Decisions tab / `/decisions-pane`, after the change: files page 17 places (22 lines),
  guide 16 places (17 lines): 33 places, 33 true by my reading. The files page's example "the Decisions tab" is split
  over two lines, so a one-line grep misses it; counted by hand.

### Found outside my files (report only)

- `orchestrate-agents\orchestration.config.json` line 125 `_whyOnFolder`: says the marker is for a session
  "switched on with /orchestrate-agents" (the command is `/software-developer-agent`) and "The two hooks do nothing in
  a session without one" (now the pane reads it too).
- `README.md` line 11-12: "Without it a chat is an ordinary chat: no watches, and the team's hooks stay silent" -
  true, but does not say the pane stays hidden too. Line 55-56 same ("the two hooks do nothing...").
- orchestrate-agents\SKILL.md, references\start-messages.md: describe the pane inside a team chat; not wrong.

### Closing (2026-10-27 09:28)

- Report written: `P2_REPORT_CLAUDE.md`. No page edit after the checks above (after-hashes: files page
  9DCE996E...60CF31, guide E1738418...72CB47).
- Scratch folder `p2` (2 baseline copies, baseline.ps1, check.mjs; no links in it) deleted; Test-Path = False.
- No process started, nothing committed, no git command that changes anything.
