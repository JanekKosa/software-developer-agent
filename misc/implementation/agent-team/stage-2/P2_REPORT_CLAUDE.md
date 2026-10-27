# P2 report: the two guide pages say the Decisions pane shows only in a switched-on chat

Written 2026-10-27 09:27 (clock). Outcome: **done**. Both pages now say the pane shows only in a chat switched on
with `/software-developer-agent`. The open item "The Decisions pane does not check the switch" is gone. Nothing is
committed.

## What `agent-team-files.html` says now

Line numbers are the old ones, from before my edits.

- **575, settings.json bullet.** Before: "...and turns the Decisions pane on." After: the same, plus "The pane
  shows only in a chat you switch on (step 1)."
- **Step 1, "You switch the chat on" (after 593).** Two bullets added:
  - The pane checks the same marker as the hooks (your answer to D-34). It looks when the chat starts and at every
    look, every 2 seconds. With the marker it shows. A chat switched on after it was opened shows the pane from the
    next look, without a reload. If the marker goes (a cleaned temp folder), the pane closes at the next look.
  - Without the marker the pane shows nothing: no tab, it never opens by itself, and it reads no register file.
    `/decisions-pane` there opens no pane and says the "not on" line, quoted byte for byte.
- **597, the example.** Before: Chat A "gets size warnings and decision reminders", Chat B "gets neither". After:
  Chat A also gets "the Decisions tab". Chat B "gets none of them: no tab, even when entries wait in its repo."
- **705, step 7.** Before: "The Decisions pane reads the open file...". After: "The main chat is switched on, so the
  Decisions pane shows there. It reads the open file..."
- **801, the plugin's row.** It now starts: "Shows only in a chat switched on with `/software-developer-agent`".
  The pane checks for that chat's marker, `%TEMP%\claude-agent-team-on\<session id>`, when the chat starts and at
  every look. "Without it: no tab, no register read. With it, reads the chat's own repo only..." It also takes "the
  file names and the marker's folder" from `orchestration.config.json`.
- **846, the marker's row.** "Both hooks and the Decisions pane check that it exists."
- **873-875, "The temp folder is cleaned".** Added: "The Decisions pane closes at its next look." Typing the command
  again "writes it again, and the pane shows from its next look".
- **900-901, the open item on the marker's time.** "the hooks and the Decisions pane only check that the file
  exists". The lead did not name this place, but it states the same fact as 846.
- **902-903, the open item "The Decisions pane does not check the switch".** Removed. The "Still open" list keeps no
  settled items: its only flags are `new` and `note`, and the page has no settled style.
- **928, the `agentTeam.onFolder` row.** "Read by" now ends "both hooks read; the pane".
- **954-958, the footer.** Added: "Updated 2026-10-27 at 09:22: the Decisions pane now checks the switch (D-34).
  That part comes from the report of the stage 2 run that built it and from the pane's "not on" line in its code."

The not-on line is plain text in straight double quotes, kept on one source line. It is not in `<code>`, because
this page sets `code` to `white-space: nowrap`, and a 120-character line in it would overflow on a phone.

## What `agent-team-guide.html` says now

- **Section 5, "You answer in the Decisions pane or in the chat" (515).** A new first bullet: "The pane appears only
  in a chat switched on with `/software-developer-agent` (step 0): it checks the same mark as the hooks. An ordinary
  chat shows no pane, even when entries wait in its repo." It is said there once. It goes first because the next
  bullet but one, "The chat does not repeat it", points back to the bullet about the pane's entries.
- **190 and 198 are unchanged.** They describe the team, and the team runs only in a switched-on chat (step 0 says
  so). The diagrams' `aria-label`s and texts are unchanged, and they are still true.

## Checks (all run after the last page edit)

- **The quote.** A scratch Node script took `NOT_ON` from `pane.tsx` line 64 only and compared every
  "The agent team is not on..." quote in both pages: **0 differences on 1 quote** (`agent-team-files.html`:599). As
  a self-test, a quote with `,` in place of `;` compared unequal, so the check can fail.
- **Every place that names the pane, the Decisions tab or `/decisions-pane`:** 17 places on the files page and 16 on
  the guide. That is **33 places, 33 true** by my reading against the task's statement of the behaviour. The files
  page's example splits "Decisions / tab" over two lines, so grep misses it; I counted it by hand.
- **Tag balance.** I counted 14 element types (`li p td tr code ul span b footer q strong table tbody section`).
  Opening and closing tags are equal in both pages. Every change against the baseline copies is explained:
  - files page: `li` +1 (2 added, 1 removed), `code` +3, `span` -1 (the removed item's flag);
  - guide: `li` +1, `code` +1.
- **Encoding and line endings are unchanged.** Before and after, both pages start `<!do` with no BOM, end with LF,
  and have 0 CRLF and 0 lone CR. Line counts: files page 963 -> 971, guide 653 -> 655.
- **Diff.** `git diff --no-index` of each page against its baseline copy shows only the places above.
- **Every path I added exists.** `%TEMP%\claude-agent-team-on`, `~\.claude\skills\software-developer-agent\SKILL.md`
  and the `decisions-pane` folder exist. `orchestration.config.json` line 124 has `agentTeam.onFolder`.

**Not checked:**
- That the pane reads `agentTeam.onFolder` from the config (801 and 928). This rests on your task file, line 928's
  note. The task forbade reading the pane's code.
- That `/decisions-pane` exists as a command. This rests on P1's report.
- How the pages look in a browser. I only counted tags.

## Files changed

- `C:\Repos\My projects\software-developer-agent\agent-team-files.html`
- `C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\agent-team-guide.html` (live: it is
  linked into every session's skills)
- `P2_PROGRESS_CLAUDE.md` and this report, in the stage 2 folder.
- Nothing outside the diff. My scratch folder (`scratchpad\p2`, with the check scripts and baseline copies) is
  deleted.

## Already on the pages about restart or resume, left alone as told

- Guide, "Claude Code restarts" (old 592-593): "The main chat starts its watches again and resumes warm agents." It
  implies the chat carries on after a restart. It does not name the pane or the marker.
- Files page, "Claude Code restarts" (old 876-877): "A watch started again finds the old marker...". That is the
  watch's own marker, not the switch.
- Neither page says anything about `/clear`.

DECISIONS TAKEN: removed the open item "The Decisions pane does not check the switch" rather than marking it settled (the other choice); the page's "Still open" list has no settled items or settled style | put the not-on line in plain quotes, not `<code>` (the other choice); this page's `code` does not wrap and would overflow on a phone | in the guide, said it once as the first bullet of section 5, not at 190 or 198 (the other choices); section 5 is where the pane is explained
INITIATIVES: edited the "Still open" item on the marker's time ("the hooks and the Decisions pane only check that the file exists"); the lead did not name it, but it states the marker fact of line 846 | added a dated "Updated 2026-10-27 at 09:22" sentence to the files page's footer, naming where the pane facts come from
ISSUES FOUND: `orchestrate-agents\orchestration.config.json` line 125 `_whyOnFolder` names the switch as "/orchestrate-agents" (it is `/software-developer-agent`) and says only "the two hooks" use the marker, but the pane uses it now; anyone reading the setting's reason gets the wrong command name | `README.md` lines 11-12 and 55-56 say an ordinary chat has "no watches, and the team's hooks stay silent" and do not say the Decisions pane stays hidden too; this is incomplete, not wrong | the files page's settings.json row (old 799) still says settings.json "turns the pane on"; it is true (the plugin is enabled there), and the same page's 575 bullet, step 1 and the plugin's row now say where it shows, so I left it
QUESTIONS: none
