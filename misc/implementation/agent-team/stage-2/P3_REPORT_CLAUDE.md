# P3 report: the Decisions pane's switch check against the real engine

Written by the P3 worker on 2026-10-27, finished at 09:30 (Get-Date). Details: `P3_PROGRESS_CLAUDE.md`.

**Outcome: done.** On the real engine (`claude.exe` 2.1.310, headless), the pane shows only when this chat's
marker is there, in all four scenarios with an expected result. No code change was needed. Two findings change what
the user is told:
- `/clear` gives the chat a new session id, so the tab goes until `/software-developer-agent` is typed again.
- `--resume` keeps the id, so a resumed team chat stays on. The docs P1 relied on said otherwise.

## The setup

- A copy of `decisions-pane`, checked by SHA-256 against the real folder (19 files, 0 differences). It was checked
  again at the end: still 0 differences, so what ran is what is in the repo.
- A scratch repo with `git init` and two synthetic waiting entries, D-1 and D-2. They were written by
  `register.mjs add --root <scratch repo>`.
- Every run used the task's flags, with TEMP and TMP set to a scratch temp folder and a fresh `--session-id`. A Node
  driver sent the slash commands as stream-json messages, wrote or removed the markers, and logged every line with
  its time.
- The scratch TEMP reached the mod: the first probe opened the pane from a marker under it. So no marker was ever
  written into the real `%TEMP%`.

## The scenarios

The engine prefixes a command's answer with `decisions-pane: `. "The NOT_ON line" below means that prefix plus the
exact `NOT_ON` text.

| # | What was sent or done | What came back | Result |
| --- | --- | --- | --- |
| 1 Off | No marker. Wait 8 s, then `/decisions-pane` | No `ui_panes` message in 13.8 s. The answer was the NOT_ON line, and no pane opened. | pass |
| 2 On at start | Marker written before the start; nothing sent | At 1.5 s a `ui_panes` message showed `decisions-pane`, titled `Decisions (2)`. | pass |
| 3 Mid-chat | Start off; `/decisions-pane` gave the NOT_ON line; marker written at 11.3 s; nothing sent | The pane was shown at 11.5 s, without a reload. | pass |
| 4 Removed | On at start (shown at 1.3 s); marker removed at 8.0 s | `ui_panes` with `panes:[]` at 9.3 s. Then `/decisions-pane` gave the NOT_ON line. | pass |
| 5 /clear | On at start; `/clear`; then `/decisions-pane` | See below. The pane closed and the NOT_ON line came. | recorded |
| 6 Resume | `--resume <scenario 2's id>`, its marker still there; then `/decisions-pane` | Same id. The pane was shown at 1.7 s, and the command answered `Decisions pane hidden.` | recorded |

What this proves:
- Scenario 2: `$.session.id()` gives the bare id, because the marker was named by the plain uuid.
- Scenario 4: a missing marker reads as "not there". A failed look would have kept the pane open.

## What `/clear` and resume do to the session id

**`/clear` starts a new session id.**
- Example: chat `adb732cc-…` was on. After `/clear` the engine reported `8dcfe92f-…` in every later message.
- A new transcript file `8dcfe92f-….jsonl` appeared.
- 1.4 s later the pane closed, and `/decisions-pane` gave the NOT_ON line.
- I then wrote a marker for `8dcfe92f-…` (scratch only). The pane came back 1 s later. So the pane follows the new
  id at every look, and a new marker for that id switches it back on.
- A logging hook in the scratch repo, run a second time, saw the new id three ways, all the same: `SessionStart`
  with `source: "clear"` got it on stdin, its `CLAUDE_CODE_SESSION_ID` held it, and its transcript name matched.
- So the team's hooks get the new id and go quiet. Typing `/software-developer-agent` again should write the
  marker under the new id.

**`--resume` keeps the id** (headless `-p --resume`, 2.1.310).
- Example: resuming `a412b17a-…` reported `a412b17a-…` in every message, and no new transcript file appeared.
- The hook's `SessionStart` with `source: "resume"` got `a412b17a-…` on stdin and in `CLAUDE_CODE_SESSION_ID`.
- The pane opened by itself. A resumed team chat stays on.

## Other observations

- **Model turns: 0** in all 9 engine runs. Every `assistant` message had model `<synthetic>`, every result had
  `num_turns` 0 and cost 0, and stderr was empty.
- `conversation_reset.new_conversation_id` is **not** the new session id. It equals that message's own `uuid`. The
  new id comes in the next `init` or `result`.
- `UserPromptSubmit` never fired for a slash command sent headless (`/clear`, `/decisions-pane`). Only
  `SessionStart` did.
- A session cleared before anything is said never gets a transcript file. So "before `/clear`" lists lack the
  current chat's own file.
- In headless mode, opening the pane by command answers `Decisions pane waits: no-surface: no surface is attached`.
  A `ui_panes` message still shows the pane. This comes from the pane's placement code, not from the switch, and a
  VS Code chat has a surface.

## Files

- Changed in either repo: none. Only the progress file and this report were written, and the extensions repo's
  `git status` is the same as at the start.
- Scratch, kept for a rerun: `…\scratchpad\p3\`. It holds the logs (one `.jsonl` per run, summaries,
  `hooks.jsonl`, which has variable names only) and the scripts: `driver.mjs`, `facts.mjs`, `hook-log.mjs`,
  `setup.ps1`, `run-all.ps1`, `run-hooks.ps1`, `cleanup.ps1`, plus the entries and the hash list.
- Scratch, removed: the pane copy, the scratch repo (with its hook settings), the scratch temp, and every marker.
  All markers were mine and under the scratch temp only.
- The real `%TEMP%\claude-agent-team-on` holds only `bf7022c6-…`, as at the start. It is not mine and was untouched.
- Processes: 9 engine processes were started. Each exited with code 0 when its stdin closed, none was killed, and
  none runs now.
- Left behind by the engine, which I may not remove:
  - `~\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f-scratchpad-p3-repo\`,
    with 7 transcripts and a `memory` folder.
  - Most likely an entry for the scratch repo path in `~\.claude.json`. Not checked: I did not read that file.
- Peak memory: 451 MB in the last `run-heavy.ps1` run; 505 MB was the highest, in the scenario run.

## Not checked

- The tab's place beside the Agents tab, and anything drawn. Both need a VS Code chat.
- Resume and `/clear` inside VS Code. Only headless `-p --resume` and `/clear` were run; `--continue` and
  `--fork-session` were not tried.
- The real `/software-developer-agent` command. It is a user-level command, which `--setting-sources project`
  does not load, and it would write into the real `%TEMP%`. That it would write under the new id after `/clear`
  rests on the hook's environment, not on the Bash tool's.
- Any system other than Windows.

## Risks and recommendations

- **The guide and the user's answer (D-34) should say:**
  - After `/clear` the Decisions tab and the team's hooks stop until `/software-developer-agent` is typed again.
  - Resuming a chat keeps the team on.
  - Example: a lead's chat clears its context, and its tab goes. Reopening yesterday's team chat from the history
    keeps it.
  - Recommendation: the lead passes this to whoever writes the guide (P2 is editing it now). Confirm resume once in
    a VS Code chat before stating it as fact there.
- **The `claude-code-mods` skill could gain three lines:**
  - the new session id after `/clear` is in `init` and `result`, not in `conversation_reset`;
  - headless slash commands do not fire `UserPromptSubmit`;
  - `--resume` keeps the id.

DECISIONS TAKEN: (1) Scenario 2 ended with /decisions-pane twice (hide, then show), so its transcript had something to resume; the other choice was to send nothing, and a session with nothing said gets no transcript file, as measured later. (2) Markers only under the scratch TEMP, never in the real %TEMP%, because the probe showed the scratch TEMP reaches the mod. (3) The engine's "decisions-pane: " prefix counted as the engine's own display; the text after it matches NOT_ON exactly.
INITIATIVES: (1) A probe run before the scenarios, to learn the message shapes. (2) In the /clear run, a marker written for the new id (scratch only): the pane came back in 1 s. (3) A logging SessionStart/UserPromptSubmit hook in the scratch repo, and a second /clear and resume run, to see the id the hooks get and CLAUDE_CODE_SESSION_ID in a child process. (4) The logs and scripts kept in scratchpad\p3 for a rerun.
ISSUES FOUND: (1) The docs P1 relied on say resume changes the id; headless --resume on 2.1.310 keeps it, so a resumed team chat stays on; the guide should not say resume loses the tab. (2) /clear gives a new id: the Decisions tab and the team's hooks stop until /software-developer-agent is typed again (P1's risk, now measured). (3) conversation_reset.new_conversation_id is not the new session id; anything reading it as one would be wrong. (4) UserPromptSubmit does not fire for headless slash commands. (5) The engine left 7 transcripts and a memory folder under ~\.claude\projects\...-scratchpad-p3-repo, and most likely an entry in ~\.claude.json; I may not remove them. (6) In headless mode the command answers "waits: no-surface" while ui_panes shows the pane; this is pane placement, not the switch, and was not checked further.
QUESTIONS: none
