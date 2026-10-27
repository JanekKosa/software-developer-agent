# Summary: the Decisions pane only in a switched-on chat (D-34)

Written by the task lead, 2026-10-27 09:32 (clock). Lead file: `PANE_SWITCH_LEAD_CLAUDE.md`. Runs P1, P2, P3, all done and
checked. Nothing committed.

## What is different now

- **An ordinary chat shows no Decisions pane.** It shows no tab, the pane never opens by itself, and it reads no
  register file. It only reads the team's settings file and checks the chat's marker
  (`%TEMP%\claude-agent-team-on\<session id>`), the same marker the two hooks check.
  - Example: a chat opened in this repo without `/software-developer-agent` shows nothing, even with entries waiting.
- **Switching on mid-chat needs no reload.** The pane looks at every refresh (2 s). Type `/software-developer-agent`
  in an open chat and the tab appears at the next refresh.
  - Real engine: the marker was written at 11.3 s and the pane showed at 11.5 s.
- **`/decisions-pane` in an ordinary chat** opens nothing and answers one line:
  `The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.`
- **A marker that goes** (a cleaned temp folder) closes the pane at the next refresh.
- **A look that fails for another reason** (a refused read, the settings file caught half written) keeps what the pane
  showed and tries again at the next refresh, as D-23 does for register reads.
- **The two guide pages say all of this.** These are `agent-team-files.html` (11 places; the open item "The Decisions
  pane does not check the switch" is removed) and `orchestrate-agents\references\agent-team-guide.html` (one bullet in
  section 5).
- **Found on the real engine:**
  - `/clear` gives a chat a new session id, so the team goes off in a cleared chat (D-35).
  - Resuming a chat keeps its id, so a resumed team chat stays on. The mod API's docs said otherwise; the real engine
    keeps the id.

## What was checked, and how

- **Pane tests:** `claude plugin test decisions-pane` gives 107 pass, 0 fail (53 before). `claude plugin validate`
  passes. The type-check is clean. The lead reran all three through `run-heavy.ps1` at 09:15.
- **Same rule as the hooks:** the pane's rule against `isTeamOn`/`teamOnMarkerPath` of `lib\agent-team.mjs` gives
  0 differences on 110 checks. Those cover 58 session ids (including the real marker, read-only), 17 folder settings,
  25 temp-variable cases against Node's own `os.tmpdir()`, and 10 odd TEMP spellings.
- **Mutation check:** 25 of 25 caught (P1).
- **Real engine** (claude.exe 2.1.310, headless, a hash-checked copy of the pane, a scratch repo, `TEMP` pointed at a
  scratch folder): off, on at start, switched on mid-chat, and marker removed all pass. 0 model turns in 9 runs. This
  proves that `$.session.id()` gives the bare id, and that a missing marker reads as "not there".
- **Guide pages:** the quoted line equals the pane's code (0 differences on 1 quote). 33 places name the pane; all 33
  are true. Tags are balanced, and the encoding and LF line endings are unchanged.
- **Nothing else changed:** the lead's hash lists of both repos plus `~\.claude\settings.json` and `~\.claude\CLAUDE.md`
  (before P1, and again before P2/P3) show only the files listed below. The real marker folder still holds only this
  chat's marker.

**Not checked:**
- A real VS Code chat. Two things are open there:
  - the tab's place: a pane opened mid-chat may sit right of the Agents tab, because no API orders the tabs;
  - how the pane is drawn.
- Resume and `/clear` inside VS Code: only headless `-p --resume` and `/clear` were run.
- The real `/software-developer-agent` command after `/clear`. It would write into the real `%TEMP%`.
- Any system other than Windows: there the pane stays off.
- The Node suite (229) and the PowerShell suite (105) were not rerun. No code in `orchestrate-agents\` changed (the
  only change there is the guide page), and no test reads the guide pages.

**Needs the main session's reload to go live:** `/reload-plugins` in each open chat, or a new chat. Until then each
open chat keeps its old pane code. After the reload an ordinary chat loses its Decisions tab. This chat keeps it,
because it is switched on.

## Register

- **D-35** (open, issue, low, not blocking): `/clear` in a team chat turns the team off there. The tab closes, an
  unsent comment in it is lost, and the hooks go quiet until `/software-developer-agent` is typed again.
  - Options: A, say so in the guides and in the command's text (recommended); B, carry the switch over automatically;
    C, nothing.
  - Nothing waits on it.

## Text for files outside this task (exact)

1. **`orchestrate-agents\orchestration.config.json`, line 125.** It names the wrong command and leaves out the pane.
   Replace the value of `_whyOnFolder` with:
   `Folder under %TEMP% holding one marker per session switched on with /software-developer-agent (scripts/team-on.mjs). The two hooks and the Decisions pane do nothing in a session without one, so the team runs only in a chat the user switched on (the user, 2026-10-26: 'i dont want the agent architecture to run for all main chats').`
2. **`orchestrate-agents\lib\agent-team.mjs`, line 2.** It also names the wrong command. In
   `// /orchestrate-agents (the user, ...`, replace `/orchestrate-agents` with `/software-developer-agent`.
3. **`README.md` (agent repo).** Neither place says the pane stays hidden.
   - Line 12 becomes:
     `  is an ordinary chat: no watches, no Decisions pane, and the team's hooks stay silent (the user, 2026-10-26, D-32, D-33 and D-34).`
   - Lines 55-56: in "the two hooks do nothing in a session without one", replace "the two hooks do nothing" with
     "the two hooks and the Decisions pane do nothing".
4. **The `claude-code-mods` skill** (`C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md`), four
   lines learned here:
   - Under "Test kit traps": `- The test kit resolves and normalises a file path before an fs stand-in sees it, so a file planted at a raw, oddly spelled path never matches; to prove a path is never looked at, assert on the list of paths asked, not on a planted file.`
   - Under "Checking against the real engine":
     - `- /clear gives the session a new id (seen in the next init and result, and in SessionStart with source "clear"); conversation_reset.new_conversation_id is not that id. Headless -p --resume <id> keeps the id (2.1.310).`
     - `- UserPromptSubmit does not fire for a slash command sent headless; only SessionStart does.`
     - `- A scratch TEMP set on the claude.exe process reaches a mod's $.env.get, so a mod that reads files under %TEMP% can be checked without touching the real one.`
5. **Leftovers of P3's headless runs**, which a worker may not remove:
   - the folder `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f-scratchpad-p3-repo\`
     (7 transcripts with synthetic data only, and a `memory` folder);
   - most likely an entry for that scratch path in `~\.claude.json` (not checked).
   - Removing them is the main session's call.

## What the next task must know

- The pane's rule copies `lib\agent-team.mjs` and `lib\limit-stop.mjs` into `decisions-pane\hooks\team-on.ts`. Its
  header names the sources. If the marker's rule or folder setting changes, change both.
- The command's line is fixed in `decisions-pane\hooks\pane.tsx` (`NOT_ON`) and quoted in `agent-team-files.html`.
  Change them together.
- D-35's answer, if A: one short documentation run. It touches the two guide pages and `team-switch\SKILL.md`, which
  is linked as a user command; editing it is the main session's call.
- P3's scripts and logs, for a rerun on a new engine version, are in the lead's scratchpad: `scratchpad\p3\`
  (`driver.mjs`, `run-all.ps1`, `logs\`). P1's checks are `scratchpad\checks.ps1` and `scratchpad\tc\tsconfig.json`.

## Files changed (from the hash lists, not memory)

- **`C:\Repos\My projects\claude-code-extensions\decisions-pane`:**
  - changed: `README.md`, `hooks\pane.tsx`, `hooks\poll.ts`, `hooks\registers.ts`, `tests\hooks\pane.test.ts`,
    `tests\support\register-world.ts`;
  - new: `hooks\team-on.ts`, `hooks\team-switch.ts`, `tests\hooks\team-on.test.ts`, `tests\hooks\team-switch.test.ts`.
- **`C:\Repos\My projects\software-developer-agent`:**
  - changed: `agent-team-files.html`, `orchestrate-agents\references\agent-team-guide.html`;
  - new, in `misc\implementation\agent-team\stage-2\`: `PANE_SWITCH_LEAD_CLAUDE.md`, this summary, P1/P2/P3 task,
    progress and report files, and `P_HASHES_BEFORE.csv` and `P23_HASHES_BEFORE.csv`;
  - changed there: `STATUS_CLAUDE.md`, `SIZES_CLAUDE.md`, `entry.json`.
- **The register:** `decisions\` changed only through `register.mjs add` (D-35).

## Runs

| Run | Tokens (k) | Tool calls | Minutes | Peak memory (MB) |
| --- | --- | --- | --- | --- |
| P1 pane build | 335 | 162 | 30 | 862 (946 in the first mutation pass) |
| P2 guide pages | 158 | 75 | 8 | none |
| P3 real engine | 176 | 56 | 11 | 505 |
