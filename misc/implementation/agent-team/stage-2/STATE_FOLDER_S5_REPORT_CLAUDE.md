# Run S5 report: the guide pages and the skill's text

Written by worker S5 on 2026-10-27, finished at 11:54 (Get-Date). Details: `STATE_FOLDER_S5_PROGRESS_CLAUDE.md`.

**Outcome: done.** Both guide pages now say: after `/clear`, type `/software-developer-agent` again (D-35). They
quote `team-switch\SKILL.md` lines 11 to 13 word for word. Every team file they name is now in the new state
folder, `~\.claude\state\software-developer-agent\` (D-36, D-39). The staged skill text, `usage-limits.md` and the
README name the new folder too. `agent-team-files.html` now says six junctions everywhere, diagrams included.
Nothing is committed.

## What changed, page by page

**`agent-team-files.html`** (repo root, edited in place)
- **The /clear note.** It is a note under step 1, with the quote and an example ("chat A shows Decisions (2); you
  type /clear, and within 2 seconds the tab is gone"). There is also a short failure case, "You type /clear in a
  team chat". The glance list has one line on it.
- **The new folder.** These parts now name the new place:
  - the glance list and the intro;
  - the example table;
  - the map diagram: a new "team's state folder" box with its 7 child folders, and a small temp box that holds none
    of the team's state;
  - the timeline: its first row is now "TEAM STATE";
  - steps 1, 2, 5, 8 and 9, and the Decisions pane row;
  - the machine table, regrouped;
  - the failure cases, the "Still open" notes and the developers table.
- **Why the state is not in `%TEMP%`.** The temp-folder term now says why: a disk cleanup may delete old files
  there. A new term, "The team's state folder", says why the team does not use it (D-36).
- **What stays outside.** A new list, "What stays outside the state folder, and why". A "The move" note names the
  old places and the copy-then-delete rule.
- **Developers table.** New rows: `teamState.folder`, `usageAndContextWatch.recordFolder` and
  `runHeavy.holderFolder`. Every value is now a path under the state folder. The "fixed in code" rows that remain
  are only the named lock and the register's lock and temp files.
- **Junctions.** The page says six junctions in 8 places, and the map counts 1 + 3 + 2. The tree diagram now shows
  `team-switch\` as the fourth linked folder.
- Before/after, step 2. Before: writes `%TEMP%\claude-session-watch-<session id>.txt`. After: writes
  `~\.claude\state\software-developer-agent\usage-watch\<session id>.txt`.

**Staged `references\agent-team-guide.html`**
- It named no team file before. Step 0 gains the /clear note, with the quote and an example.
- "For developers" gains a second table: the 7 child folders, and why they are not in the temp folder.
- "Still open" gains one note, and the footer one "Updated" line.
- Before/after: step 0 ended on the two-chats example. It now goes on with "After /clear, type
  /software-developer-agent again …".

**Staged `SKILL.md`**
- I first re-based it on the live file. The staged hash equalled its line in the base list. Live and staged
  differed only by the 3 D-40 lines.
- I copied the live bytes over the staged file, replaced the base-list line (now `C874A196…0041`) and added the line
  `# SKILL.md re-based 2026-10-27 11:37:41`.
- The live `SKILL.md` did not change again during my run: it was still stamped 11:08:50 at 11:52.
- Then lines 59 to 61. Before: "writes the chat's marker under `%TEMP%\claude-agent-team-on\` (setting
  `agentTeam.onFolder`)". After: "… under `%USERPROFILE%\.claude\state\software-developer-agent\team-on\` (setting
  `agentTeam.onFolder`, a folder under `teamState.folder`)".

**Staged `references\usage-limits.md`**
- Three paths now point into the new folder: the usage reading (line 39), `logs\limit-stop.log` (96) and
  `logs\relaunch.log` (232-233).
- Lines 39 to 44 were reflowed to fit the longer path. The text is unchanged.

**`README.md`**
- Lines 55 to 57: the marker is now under `%USERPROFILE%\.claude\state\software-developer-agent\team-on\`.

**Not changed:**
- `limits-and-caps-guide.html`: it names no team file. The sweep's 5 "TEMP" hits are CSS `grid-template`.
- `lead-brief-template.md`: its `temp\` is a project's working folder.
- `lessons.md`, `start-messages.md`, `worker-rules.md`: each hash still equals the hash before my run.

## The checks, run after my last change

1. **Places: 110 places, 110 true.**
   - 68 name a new place, 33 something that stays outside, and 9 an old place.
   - All 9 old-place mentions sit inside the "The move" note (`agent-team-files.html` lines 931 to 934). That is
     where the move is explained, and why they are left.
   - The scan covered every HTML `<code>`, Markdown code span and SVG mono text that holds a team-file word.
   - It skipped 29 script or setting names (such as `team-on.mjs` and `relaunch.logFile`). It had 1 false hit: the
     command line in `SKILL.md:58` that names `team-on.mjs`.
   - A separate scan for old-place strings found them only on lines 931 to 933.
2. **Junctions: 6.**
   - `install.ps1` `Get-LinkPlan` has 6 entries (lines 44 to 49); its header (lines 7 to 13) also lists 6.
   - The page says "six" or "6" at lines 206, 348, 379, 417, 469, 597, 833 and 1040, and the map counts 1 + 3 + 2
     (lines 370 to 372).
   - No "five" or "5 junctions" is left.
3. **Quote: 0 differences on 2**, one on each page. Each was compared with team-switch lines 11 to 13, backticks and
   tags removed and spaces collapsed.
4. **Tags and line endings.**
   - Files page: 1177 tags opened and closed before, 1276 after. Guide: 419 before, 479 after. 0 nesting errors.
   - Every SVG block parses as XML: 3 on the files page, 2 on the guide.
   - All 5 changed files are LF only, with no lone CR and no BOM, before and after.
   - The base list stays CRLF (47 of 47 lines).
5. **Live `orchestrate-agents\`:** 45 files checked against the base list, 0 differ.
6. **Rendered** with headless Edge, light and dark, at 1000 px and inside a 390 px frame.
   - The map, tree and timeline are readable in both themes.
   - The notes and lists wrap at 390 px.

**Not checked:**
- The setting values against the finished config. The developers table takes `usage-reading\usage-limits.json`,
  `usage-watch`, `heavy-commands` and `logs\relaunch.log` from the task's layout table.
  - At 11:40 the staged config still had the old `stateFile`, `probeWorkingFolder` and `relaunch.logFile`.
  - It had no `recordFolder` or `holderFolder` yet; S2 was still at work.
  - Recheck the table at the cut-over.
- Phone width as a whole. Both pages were already wider than the screen at 375 px before my change: 1202 px and
  804 px. Those widths did not change.
- The staged guide is not live until the cut-over copies it.

## Risks and points for you

- **A note to remove at the cut-over.** `agent-team-files.html` now has a "Still open" note: until the code change
  goes live, the files are still in the old places. Remove it then. Until then it is true: a reader looking for
  `team-on\` today finds nothing, and the note says why.
- **Resume is stated as fact, with one caveat.** Both pages now note under "Still open" that reopening a chat from
  the history was measured only in a headless run, not in a VS Code chat. That is D-35's own caveat.
  - Example: the user reopens yesterday's team chat in VS Code, and the tab should come back.
  - Recommendation: try it once in VS Code, then drop the note.

## What I learned

- The sweep says `claude-context-guard\session-<session id>.json` is "documented only". That is wrong:
  `hooks\context-guard.mjs:301` claims a level for `session-${input.session_id}`, so the main chat gets that
  marker. The page keeps that row, now under `context-guard\`.
- In this page's CSS, `code` never wraps. A `.wrap` rule that lets it wrap existed but was unused. I put it on the
  list items that hold the long new paths.

## Text for files outside the repos

None. The xpp-agent skills the sweep lists (lines 476 to 492) name no old place of ours. The Decisions pane's README
(3 lines in the sweep) belongs to the pane repo, run S4.

## Machine changes and scratch

- No processes left: 14 headless Edge runs, each waited for, 0 still running.
- Scratch files (copies of the originals, scripts, screenshots, an Edge profile) are in my scratchpad's `s5\`
  folder. They are removed at the end of the run.

DECISIONS TAKEN: limits-and-caps-guide.html left unchanged because it names no team file (the other choice was adding a state-folder row to it); the context-guard row keeps session-<session id>.json because the code writes it, though the sweep said it did not; paths in the steps are written in full (~\.claude\state\software-developer-agent\…), not shortened, so each can be found on disk; the quote sits in one note per page, plus a short unquoted failure case on the files page
INITIATIVES: tree diagram in agent-team-files.html now shows team-switch\ as a fourth linked folder ("Four folders are linked"); "Still open" note on both pages that resume was measured headless only; "Still open" note on the files page that the move is written before the code is live; class="wrap" on the new long-path list items, the state group header, the outside list and the move note so they wrap at phone width (the page's existing, unused .wrap rule); a second developers table in the guide listing the 7 child folders; an "Updated" line in both footers
ISSUES FOUND: both guide pages already overflow sideways at phone width (375 px) before and after my change (files page 1202 px, guide 804 px), from existing unwrapped code and diagrams; agent-team-files.html still says misc\handovers\ "does not exist yet" in two places, but the folder exists now (left alone); the sweep wrongly lists context-guard's session-<session id>.json as documented only; at 11:40 the staged config lacked recordFolder and holderFolder and still had the old stateFile, probeWorkingFolder and relaunch.logFile, so the pages follow the task's layout and need a recheck at the cut-over
QUESTIONS: none
