# Run J: the user's answers D-0006 to D-0008 (report)

**Outcome: done.** A server error now waits ten minutes before the watch wakes the chat; every other wake and
relaunch still waits one minute. The six orchestration scripts refuse a misspelled parameter before they run a line.
The prompt reminder now also shows the agent team's register, so a chat in xpp-agent sees the team's open items.
Nothing is committed. Final numbers: Node 124 of 124 (22:41), PowerShell 92 passed, 0 failed (22:31-22:34).

## What changed for the user

- **D-0006, ten minutes after a server error.** `watchSession.retryMinutes` is 10 again. It covers a server error
  and a limit message with no readable reset time. Example: the API is overloaded at 14:10; the watch wakes the chat
  at 14:20, not 14:11. `resetMarginMinutes`, `relaunchMarginMinutes` and `relaunch.afterCapMinutes` stay 1. The four
  `_why` texts no longer say "every automatic wake-up"; the retry one says why ten.
- **D-0007, a misspelled parameter fails.** `[CmdletBinding()]` (one comment line above it) is on all six scripts
  under `scripts`. Example: `schedule-relaunch.ps1 ... -DryRunn` used to register a real task; now it exits 1 before
  any line runs and prints `A parameter cannot be found that matches parameter name 'DryRunn'.` on stderr. Nothing
  else changes for a correct call. `run-heavy.ps1` and `watch-agent.ps1` were already strict, because a
  `[Parameter(Mandatory)]` attribute makes a script advanced; for them the attribute only makes it explicit.
- **D-0008, the agent team's register in every chat.** New setting `register.showInEveryChat`, a list of absolute
  repo folders; default `C:\Repos\My projects\software-developer-agent`. The hook prints one line per register with
  open items, the chat's own repo first, then the list in order, and then the instruction on its own line:
  `Decision register of software-developer-agent (C:\Repos\My projects\software-developer-agent): 1 open (none
  blocking; 1 question); oldest D-0004 from 2026-10-25.` A repo is shown once, however the list spells it (subfolder,
  trailing `\`, other letter case). Nothing open anywhere: nothing printed.
- **Deliberate difference from before:** with one register the line used to read `Decision register: 2 open ...
  Remind the user ...` on one line. Now it names the repo and the instruction is its own line.
  `register.mjs`'s own summary is unchanged (`summaryLine` got a label parameter whose default is the old text).
- **Fails open.** A list entry that is not an absolute path to an existing folder, a register that cannot be read,
  or a missing or malformed setting is left out with one stderr line naming it; the other lines still show.

## Files

All under `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`:

- Code: `orchestration.config.json`, `hooks\decision-reminder.mjs`, `lib\decision-register.mjs`, and the six
  `scripts\*.ps1` (run-heavy, schedule-relaunch, start-session-in-vscode, usage-probe, watch-agent, watch-session).
- Tests: `tests\limit-scripts.tests.ps1`, `tests\hooks\decision-reminder.test.mjs` (rewritten),
  `tests\lib\decision-register.test.mjs`.
- Docs: `SKILL.md` ("The reminder" bullet), `references\usage-limits.md` (lines 61-62).
- A hash check of the whole repo against my 22:08 baseline shows these, my two run files, and three files I did
  not write: the two register files (rewritten at 22:18:57), a new `K_TASK_CLAUDE.md`, and
  `limits-and-caps-guide.html` (changed during my run; its two stale sentences are still at lines 578 and 599).
- Outside the diff: nothing. No scheduled task registered, no server started, no setting changed. Scratch scripts
  and logs stay in
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad\J`.

## Text the shared files need (not mine to edit)

xpp-agent `CLAUDE.md`:

1. "Session Watch", `SESSION RESUMED` (line 49): "(or a minute has passed since the server error)" -> "(or ten
   minutes have passed since the server error)". Run I's earlier text for this bullet is withdrawn.
2. Line 8 (`decisions/`), add at the end: "The prompt reminder shows this register and the agent team's
   (`C:\Repos\My projects\software-developer-agent\decisions\`, D-0008), one line per repo with open items."

`references\limits-and-caps-guide.html` (the main session's page, untouched) is now untrue in two places:
lines 577-578, read again at 22:42 ("The watch wakes the main chat after a fixed wait, one minute by default. The same happens after a
server error.": now ten minutes) and line 599 ("All automatic wake-ups and relaunches after one minute": the wake
after a server error or an unreadable reset is ten).

No agent file needs a change.

## Settings

- `watchSession.retryMinutes` 1 -> 10 (the user, D-0006).
- New `register.showInEveryChat` = [this repo], with `_whyShowInEveryChat` (the user, D-0008). Absolute paths, so the
  hook does not depend on the folder it was started from; the default must change if the repo moves (a test pins it
  to the repo the skill sits in, so a move fails that test).

## Checks

- Red first. D-0006: the pinning case failed on the old `_why`. D-0007: three cases failed (the scripts ran on).
  D-0008: seven Node failures on the missing feature. Each green after its change.
- Final suites after the last change, through `run-heavy.ps1 -MinFreeMB 600`: Node 124 of 124 (22:41), PowerShell 92 passed, 0 failed (22:31-22:34). Baseline at
  22:09: Node 117 of 117, PowerShell 87 of 87.
- Parser: 0 errors over 7 `.ps1` files. `node --check`: 0 failures over 23 `.mjs` files. Config parses as JSON.
- Callers (D-0007): a scanner reading each script's parameters from its syntax tree checked 36 names written after
  a script name in docs, printed texts and code, plus xpp-agent `CLAUDE.md`: all exact. Every other `-Name` in the
  docs belongs to a cmdlet or `pwsh`. In code: the watch passes the probe `-ConfigPath -StatePath -FreshMinutes`, the
  task line passes the start script `-ProjectDir -Prompt -ContextCap`; two new guard tests pin both (one runs the real
  task line against the real start script in a dry run).
- Hook timing, 20 runs each, real hook and real registers (both empty), read-only. Before: chat in xpp-agent median
  64 ms (max 76), in the agent repo 71 ms (max 89). After: 66 ms (max 78) and 65 ms (max 77).
- Real material: the real resolved register (8 entries) copied as a scratch repo's open file. A chat in the real
  xpp-agent folder got one line naming that repo with 8 open; a chat inside it got the same single line.
- Mutation check of the changed lines: 32 mutants, 32 caught, 0 that did not load; unmutated control copies clean
  (29 Node tests, 6 PowerShell cases). The first pass caught 26 of 27. The survivor, N18 (a file accepted as a
  folder), is caught since I added a file entry to the bad-entries test. S05 to S09 ran in a second pass, after the
  harness stopped on a Windows delete lag. Taking `[CmdletBinding()]` off run-heavy.ps1 or watch-agent.ps1 changes
  no behaviour; only the syntax-tree test catches it.
- Doc check: outside `misc`, `decisions` and `skills`, only the guide page above still says one minute for a server
  error.

**Not tested:** a real chat receiving the new reminder (the hook is tested as a process, not inside Claude Code); a
real scheduled task (no `-RealTask` run); a register with open items in the real repos (both are empty now).

## Risky or open points

- **A unique prefix still binds.** `-Dry` sets `-DryRun`, so only a name that is no prefix of a real one fails.
  That is PowerShell's rule; the scripts cannot turn it off. A typo inside the name (`-DryRunn`, `-ContexCap`) fails.
- **The register changed during my run.** `decisions\OPEN_DECISIONS_CLAUDE.md` and `RESOLVED_DECISIONS_CLAUDE.md`
  were rewritten at 22:18:57, most likely by the main session moving D-0004. Not mine; I never wrote them.

## What I learned

- A script with any `[Parameter()]` attribute is already advanced and refuses unknown names; only a bare `param()`
  puts them in `$args`.
- `pwsh -File` exits 1 on a binding error, before the script's first line.

DECISIONS TAKEN: The list holds absolute repo folders (not paths relative to the skill folder, which would break when the hook runs through the ~/.claude/skills junction or a copy) | Each line names the repo by folder name and root path (not the name alone, which two clones could share) | The instruction moved to its own line after the register lines (not appended to the last line, which would read as part of that repo's line) | The chat's own repo first, then the list in its order | A bad list entry, an unreadable register or a missing setting is left out with one stderr line and the rest still shows (not "print nothing", which would hide the own repo's line) | summaryLine got a label parameter (default the old text) instead of the hook rewriting the line's start | [CmdletBinding()] also on run-heavy.ps1 and watch-agent.ps1, which were already strict, so the rule holds if their Mandatory attribute ever goes
INITIATIVES: One comment line above each [CmdletBinding()] saying why | A guard test that runs the scheduled task's real argument line against the real start script | A guard test that the watch's probe call names only probe parameters | A syntax-tree test that every script declares [CmdletBinding()] | usage-limits.md line 62 also says why ten minutes | The hook's stderr line for an unreadable register names its file
ISSUES FOUND: limits-and-caps-guide.html lines 577-578 and 599 still say one minute after a server error (main session's page, untouched) | xpp-agent CLAUDE.md line 49 says a minute after a server error (text above) | The decision register files were rewritten at 22:18:57 during my run by someone else, most likely the main session; not mine | My progress file had one time written without reading the clock (22:30 for about 22:28); corrected there
QUESTIONS: none
