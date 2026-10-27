# P2: the two guide pages say the Decisions pane shows only in a switched-on chat

Written by the task lead, 2026-10-27 09:17 (read from the clock). `<wf>` is the working folder
`C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`. `<repo>` is
`C:\Repos\My projects\software-developer-agent`.

## 1. Read this, and no more

1. `<repo>\CLAUDE.md` and `<repo>\README.md`.
2. This file, whole.
3. `<wf>\P1_REPORT_CLAUDE.md`, sections "What the user sees differently" and "Where the session id comes from" only:
   that is the behaviour you describe.
4. The two pages, by the places named in section 3 (read each place with some lines around it; do not read the pages
   whole: `agent-team-files.html` is large).

Do not read: the pane's code or tests, any `decisions\` folder, other stage 2 files, transcripts.

## 2. What it is for

The user chose D-34 A: "the pane shows only in a chat switched on with /software-developer-agent ... the pane checks
the same marker the hooks check". P1 built it in `C:\Repos\My projects\claude-code-extensions\decisions-pane` (checked
by the lead: 107 of 107 tests). The two guide pages still describe the pane as showing in every chat of a repo with
waiting decisions, and `agent-team-files.html` keeps an open item "The Decisions pane does not check the switch".

## 3. The point: bring every place that describes the pane in line

What is true now (say it in the pages' own plain style, short):
- The Decisions pane shows only in a chat switched on with `/software-developer-agent`. It checks the same marker the
  two hooks check (`%TEMP%\claude-agent-team-on\<session id>`), at session start and at every look (every 2 seconds).
- In an ordinary chat it shows nothing: no tab, no opening by itself, and it reads no register file there.
- A chat switched on after it was opened shows the pane from the next look, without a reload.
- `/decisions-pane` in an ordinary chat opens no pane and says exactly this line (quote it byte for byte):
  `The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.`
- If the marker goes, the pane closes at the next look.

Places:
- `<repo>\agent-team-files.html`: line 575 (what install turns on), lines 588-597 (the switch-on steps and the
  example of chat A and chat B: add what the pane does in each), 705, 801, 846 (the marker's row: "Both hooks check
  that it exists" now also the pane), 874-875 (a lost marker: the pane closes too), 902 (the open item "The Decisions
  pane does not check the switch": settle it the way the page treats a settled item; if the page keeps no settled
  items, remove it), 928 (the `agentTeam.onFolder` row: the pane reads it too), 954. Line numbers are from 09:20;
  find each by its words if they moved.
- `<repo>\orchestrate-agents\references\agent-team-guide.html`: lines 190, 198, and the section at 515 ("You answer
  in the Decisions pane or in the chat"): say once, where it fits best, that the pane appears only in a switched-on
  chat. Do not change the two diagrams' `aria-label`s unless they become wrong.

Do not write anything about `/clear` or resuming a chat: what happens there is still being checked and waits for the
user. If the pages already say something about it, leave it and name it in your report.

## 4. The check (instead of a mutation check: these are pages, not code)

- The quoted line equals the `NOT_ON` text in `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\pane.tsx`
  (line 64; read that one line only): a script compares them, "0 differences on N quotes".
- A search of both pages for every place that names the pane, the Decisions tab or `/decisions-pane`: each one is true
  after your change. Report "N places, N true".
- Each page still parses as HTML: every tag you touched is closed, and a scratch script that counts open and close
  tags of the elements you edited gives equal numbers. Every path or file name you added exists.
- Encoding and line endings unchanged (compare the first bytes and the count of CRLF/LF before and after).

## 5. Your files, and what is not yours

Yours: `<repo>\agent-team-files.html` and `<repo>\orchestrate-agents\references\agent-team-guide.html`, only the
places that describe the pane or the switch's effect on it.

Not yours: everything else. Another worker (P3) is checking the pane against the real engine at the same time in
`C:\Repos\My projects\claude-code-extensions\decisions-pane`: do not touch that folder. `orchestrate-agents\` is live
(linked into every session's skills): change nothing there but the guide page. No git command that changes anything.
Report other places that describe the pane wrongly (for example the repo's `README.md` or `orchestrate-agents\SKILL.md`)
under ISSUES FOUND, without editing them.

## 6. How to work, progress, report

- Small run: plan for about 35 tool calls. No heavy command should be needed; if one is, run it through
  `& '<repo>\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`. Read the clock (`Get-Date`) for every
  time you write. Update the progress file after every page.
- Progress file: `<wf>\P2_PROGRESS_CLAUDE.md`. Report file: `<wf>\P2_REPORT_CLAUDE.md`: what each page says now
  (the changed sentences, before and after, short), the checks with their counts, what was not checked and why, the
  files changed, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
