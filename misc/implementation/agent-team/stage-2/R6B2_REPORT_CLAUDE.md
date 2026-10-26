# R6b2 report: the references and guide pages say what is true now

Written 2026-10-26 20:35 (clock read). Outcome: **done.** Five of the seven files in
`C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\` now name the three watches by their new
display names and files, give each start command with its exact description, and describe the decision register as
it is tonight. The files were edited in scratch copies and copied in once, at 20:33. Nothing is committed.

## What changed, by effect

- **usage-limits.md.** The settings section is named `usageAndContextWatch` (4 places). "What watches" lists the
  Usage and context watch and the Decision answers watch, each with its file, its start command and its
  description, and says the third watch (Agent size and stall) is not part of a hand-over. "The watch" is defined
  as the Usage and context watch. Every restart of the watch names its description. At a hand-over the main
  session stops both watches: step 7 (R3's text, reworded: an answer given later reaches the next session through
  its own Decision answers watch at its start, or its prompt hook), the context-cap path ("stop both watches"),
  `SESSION RESET COLD`, and the limit running out before the leads stop. The new session starts both watches.
- **limits-and-caps-guide.html.** The "Session watch" card is now "Usage and context watch". A new card explains
  the Decision answers watch: no part in the limits, but every hand-over stops it. The diagram box and its
  aria-label carry the new name. Cases 1 and 2b say the main chat stops "both watches". A new failure case covers
  an answer given after a hand-over. The developer table lists the three watch files.
- **agent-team-guide.html.** You answer in the pane or in the chat, both first-class. The register card names
  the answers log, and says a closed entry ends with your final answer and a summary. "The three watches" card
  replaces "Session watch". Both diagrams were updated in place: the answer text, the "4 · YOU, PANE OR CHAT" label
  and the return note "answers log, main chat once, then lead and W2". No diagram was added. Step 0 starts both
  watches. Step 5 is rewritten with 5a (each answer reaches the main chat once, by the watch every 30 minutes or at
  once when nothing waits for you, or by the hook) and 5b (close with final answer and summary, or a follow-up; a
  child entry D-12-1 when options change, D-15). Example: five entries wait at 10:00, you answer all five by 10:03,
  and the main chat gets all five right after the fifth. Two failure cases changed or were added (the watches after
  a restart; the Decision answers watch failing). The developer table gained the three watches, `migrate`, and the
  three register files.
- **lessons.md.** The fallback size watch is `watch-agent-size-and-stall.ps1`, with its description. The
  overturned lesson names the Usage and context watch. The dates and findings are unchanged.
- **start-messages.md.** "Pass the user's answer" now shows the chat answer command with `--handed-over`. It says a
  pane answer arrives once, and gives the `close --summary` and `follow-up --text` commands with the child-entry
  rule.
- Unchanged, no hits: `lead-brief-template.md`, `worker-rules.md`.

## The invariant

**11 of 12 commands work as written.** They ran against a scratch repo (a folder with a `.git` folder) using the
real `register.mjs`.
- Decision answers watch, started as written from the scratch repo. A pane-style answer went to the only open
  entry. The watch ended 2.4 seconds later with `DECISION ANSWERS | D-1`, the words exactly (quotes and `$` kept),
  the instructions, and `Start the Decision answers watch again (description "Decision answers watch").`
- `answer --handed-over` (log line has `handedOverAt`; `handover` then prints nothing), `close --summary`
  (Resolved entry has Final answer, Summary, Resolved), multi-line `follow-up` (entry back to `waiting-for-user`),
  `add` with `"parent": "D-2"` (gave `D-2-1`), and `migrate` ("already in the current layout"). All exit 0.
- Agent size and stall watch, as written, with this agent's own id: it ran and was stopped by its process id after
  15 seconds. Run again with `-WarnTokens 1000 -EverySeconds 5`, it ended with
  `NEAR CAP: agent ab11ae394bc98ac2e is at 232681 tokens`.
- `limit-stop-server.mjs stop` on a made-up session id: `LIMIT STOP SERVER NOT RUNNING`.
- `schedule-relaunch.ps1` in its three forms (`-At <time>`, `-ContextCap`, `-At now`), each with `-DryRun` added:
  three `DRY RUN | would register ...` lines. As written they would register a real scheduled task.
- **Not run: the Usage and context watch.** As written it watches the live main session. It may spend a Haiku
  call, and at a threshold it would start the stop server for every agent of this session. Checked instead: the
  file exists, PowerShell reads its parameters, and none is mandatory.
- Every watch process ended by itself or was stopped by its recorded id; none is left.

**Paths: 62 of 62 exist.** That counts the bare names the check placed in `scripts\`, `decisions\`,
`~\.claude\` and `xpp-agent\misc\handovers\`, and the three state files the settings name. Two more are generic
names, not paths: `entry.json` and `.meta.json`. The renamed watch files were present (R6a had copied them in by
20:27).

**HTML.** A Node check walks every tag with a stack, so order matters, not just counts. It also checks that ids
are unique and that every `href="#..."`, `url(#...)` and `aria-labelledby` points at an existing id. Both pages
passed before and after: 415 and 434 elements, 0 problems. The check caught 2 of 2 planted faults (a removed
`</h4>` and a dead marker link). Encoding is kept: UTF-8 without BOM, LF only, final newline; the copied-in hashes
equal the scratch copies.

## The consistency check

The search was run again on the live folder. Remaining hits, each on purpose:
- `usage-limits.md` line 200: `(by the session watch)` is the server log's own words, quoted.
- `lessons.md` line 104: "The main session watches every agent's size" is an overturned rule, quoted.
- "Still open" (three hits) is the guide pages' section heading for open items, not the register term.
- `register.mjs` keeps its name.

Where the facts are stated:
- Display names, files and descriptions: usage-limits "What watches"; lessons "Sizes"; both pages' cards and
  tables.
- `usageAndContextWatch`: usage-limits lines 5, 76, 78 and 180.
- The 30 minutes, the early hand-over, and once-only by the watch or the hook: agent-team-guide 5a.
- Three failed looks, and twice for the same reason: agent-team-guide failure cases.
- Stopped at a hand-over: usage-limits step 7, the cap path, reset cold and limit-runs-out; limits guide 1 and 2b,
  plus the new case.
- The answers log, Final answer and Summary: agent-team-guide card, 5b and table; start-messages.
- Chat answers and `--handed-over`: start-messages, and agent-team-guide 5a.
- Follow-ups, D-15 and child entries: start-messages and 5b.
- `migrate`: agent-team-guide table.
- The pane's history: agent-team-guide step 5.

Not carried (detail beyond these pages): the hook's one line about handed-over entries not yet closed, and the
pane's orange retry line (D-23, D-27).

## Not checked

- The Usage and context watch was not run (reason above).
- Pixel layout of the edited SVG text: widths were estimated from the font sizes, not seen in a browser.
- Whether the server log line still reads `(by the session watch)`: that is in code I was told not to read.
- `~\.claude\state\usage-limits.json` changed at 20:30:59. My runs do not write it. Most likely the main session's
  own watch did; not checked further.

## Files changed

`orchestrate-agents\references\usage-limits.md`, `limits-and-caps-guide.html`, `agent-team-guide.html`,
`lessons.md`, `start-messages.md`. Also my progress file and this report. The scratch folder has been deleted.

## Text for files that are not mine

None is needed from my side. One thing for the lead to check: `C:\Users\user\.claude\CLAUDE.md` (not read, not
mine). agent-team-guide.html says every chat's first action, by the global instructions, is to start the Usage and
context watch. If that file still names `watch-session.ps1` or gives no description, it needs the new file and
`Usage and context watch`.

DECISIONS TAKEN: start-messages.md points at SKILL.md "for --answer" rather than under its heading "The decision register" (the other choice: keep the heading), because R6b1 is changing SKILL.md and the heading may move; step 7's text says "Stop the Decision answers watch ... too, if it is running" instead of R3's "(Starting work, step 2)", which names a SKILL.md step that may move.
INITIATIVES: added a failure case "You answer a decision after a hand-over" to limits-and-caps-guide.html and "The Decision answers watch fails" to agent-team-guide.html; listed the Agent size and stall watch in limits-and-caps-guide's developer table; ran the size watch a second time with -WarnTokens 1000 -EverySeconds 5 to see it end; ran schedule-relaunch.ps1 with -DryRun added.
ISSUES FOUND: usage-limits.md line 200 quotes the server log text "(by the session watch)"; if R6a renamed that string, the line must follow; ~\.claude\CLAUDE.md may still name watch-session.ps1 (not read).
QUESTIONS: none
