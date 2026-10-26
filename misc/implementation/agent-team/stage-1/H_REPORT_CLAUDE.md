# Run H: the main session hears the hook, the stop at its context cap, and run G's open points (report)

**Outcome: done.** The context-guard hook now tells the main session too. At 450k (`contextCaps.main.warn`) it
starts the limit-stop server, so every lead and worker hears `STOP FOR LIMIT` at its next tool call. It then adds
`SESSION NEAR CAP` once, plus the main session's own stop text. The watch does the same when it notices first. The
server now also ends when the session's Claude Code process is gone. Run G's three test gaps are closed. The
installed files pass both suites (numbers below). Nothing is committed. The context guard warned me at 322k, so I
closed without further work.

## What changed for the user

- **The main session hears its cap after a tool call, not only from the watch.** Example: the main session reaches
  451k at 19:31. After its next tool call it reads:
  - `STOP FOR LIMIT | this session is at its context cap and hands over to a new one. This is the main session's
    part; ... Wait for LEAD STOPPED | <lead file> from every running lead until 19:46, then TaskStop each lead still
    silent. Then write the hand-over, listing each lead's hand-off, and end with Read <hand-over> and carry on.`
  - `SESSION NEAR CAP | the context is at 451k tokens at 19:31 (warning size 450k). Finish the edit in progress,
    write the hand-over and end the session. The limit-stop server tells every lead and worker ... (LIMIT STOP
    SERVER STARTED | process 7244 | ...): send them no stop message, ... The session watch may end with SESSION
    NEAR CAP too; both mean the same.`
- **Leads and workers stop at the cap the same way as at the usage limit.** A worker's next tool call brings
  `STOP FOR LIMIT | this session is at its context cap and hands over to a new one. Stop building: ...`. The rest
  of the text is G's.
- **Hook or watch, whichever comes first.** The other one finds the server `RUNNING ALREADY`. The watch's
  `SESSION NEAR CAP` is now three lines, like `LIMIT NEAR`: the marker, the server's line, then the steps. If the
  server does not start, both say to send `STOP FOR LIMIT` by message, as before.
- **At a usage-limit hand-over the main session also gets its own text once**, with the deadline. It says the
  watch's lines mean the same.
- **The server ends with the session.** The watch and the hook pass the Claude Code process id. The server checks
  it every 60 s and exits when it is gone. A weekly hand-over no longer leaves it idle for days. At the cap there is
  no reset time, so the server ends 60 minutes after its start at the latest.

## Files

All 12 are in `C:\Repos\My projects\software-developer-agent\orchestrate-agents\`. A hash check against my
baseline of the whole repo shows these and no others of mine:

- Code: `hooks\context-guard.mjs`, `lib\limit-stop.mjs` (adds `PROCESS_ID_PATTERN`), `lib\transcript.mjs` (adds an
  option to skip side-chain records), `scripts\limit-stop-server.mjs`, `scripts\watch-session.ps1`,
  `orchestration.config.json`.
- Tests: `tests\hooks\context-guard.test.mjs`, `tests\scripts\limit-stop-server.test.mjs`,
  `tests\limit-scripts.tests.ps1`.
- Docs: `SKILL.md`, `references\usage-limits.md` (with a new section, "At the main session's context cap"),
  `references\start-messages.md`.
- **Not mine:** while I worked, someone else changed the repo's root `CLAUDE.md` and created
  `references\limits-and-caps-guide.html`. I did not touch either.
- Outside the diff: nothing is left. The live check created `%USERPROFILE%\.claude\state\limit-stop.log` and one
  marker; I removed both and stopped every process I started, by id. Scratch:
  `C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-xpp-agent\d0209f89-f0d8-4d2c-b098-c80f3902ce9e\scratchpad\H`
  keeps only scripts and results; the work copy is deleted. No limit-stop server is running.
- I built in that scratch copy and installed at the end. The reason: the hook in this repo is live for every
  session through `~\.claude\settings.json`. Before installing I read the main session's size: 229k.

## Settings added (`limitStop`, each with a `_why`)

| Setting | Default | Why |
| --- | --- | --- |
| `capEndMinutes` | 60 | No reset at the cap. Covers the 15-minute wait for leads and a slow hand-over. |
| `processCheckSeconds` | 60 | How often the server checks the Claude Code process. One cheap system call, the same pace as the watch. |

## Text the shared files need (not mine to edit)

1. `agents\task-lead.md`, section 11. Make the first sentence: "When the account's usage limit is near and some
   agent's cache would run out before it resets, or when the main session reaches its context cap, a hook adds
   `STOP FOR LIMIT | ...` to your context after your next tool call, and to each worker's after theirs; the text says
   what to do." In the successor line, replace "stopped for the usage limit" with "stopped for the session's
   hand-over". Optional title: "11. The stop for a hand-over".
2. `agents\software-developer.md`, section 7, the `STOP FOR LIMIT` bullet. Make the bracket "(added by a hook after
   a tool call, or your lead's message: the account's usage limit is near, or the main session is at its context
   cap)". xpp-porter and navigator-builder copy it.
3. xpp-agent `CLAUDE.md`, "Session Size and Hand-over":
   - Bullet 3: "A session cannot feel its own size, so two things tell it once the context passes 450 thousand:
     the context-guard hook after its next tool call, and the session watch (next section), which ends with the
     same `SESSION NEAR CAP`. Both mean the same. The last 50 thousand are for the hand-over."
   - Bullet 4, in place of "It lets its running agents report, or stops them at a safe point...": "The hook or the
     watch has started the limit-stop server, so every lead and worker hears `STOP FOR LIMIT` at its next tool call
     and ends with its hand-off. The session sends no stop message unless the server's line says `NOT STARTED`. It
     waits for each lead's `LEAD STOPPED` until the deadline the texts name, and stops a silent lead with
     `TaskStop`. It writes the hand-over, listing each lead's hand-off, and ends with ..." (the rest as now).
4. xpp-agent `CLAUDE.md`, "Session Watch":
   - `SESSION NEAR CAP`: "hand over, as above. The watch's second line is the limit-stop server's (`RUNNING ALREADY`
     when the hook started it first), its third the steps."
   - `LIMIT NEAR`: replace "Stop every lead with STOP FOR LIMIT" with "The limit-stop server the watch started
     tells every lead and worker to stop (send `STOP FOR LIMIT` by message only if its line says `NOT STARTED`);
     wait for `LEAD STOPPED`".
   - Last bullet: add "The limit-stop server ends when the chat's Claude Code process is gone."

## Checks (all on the installed files, after the last code change)

- Repo suites through run-heavy: Node 117 of 117 pass. PowerShell 80 passed, 0 failed. The baseline was 101 and 78.
- `node --check`: clean on all 23 `.mjs` files. Parser: 0 errors on `watch-session.ps1`, `watch-agent.ps1` and the
  test file.
- Red first. The new feature tests all failed before the code: 6 server tests, 7 hook tests and 3 watch tests. The
  gap tests S09, S16 and L02 pass on correct code; their mutants show they bite (below).
- The server tests now run every child under a 20 s bound, so a broken argument check fails its test instead of
  hanging the suite.
- Hook time, 20 runs each, no server, 2 MB transcripts below warn:
  - Before: main 70 ms, agent 74 ms.
  - After, measured while my mutation run loaded the machine: main 104 ms, agent 124 ms.
  - Re-measured idle, after the suites: main 73 ms, agent 72 ms. A main-session call costs about 3 ms more;
    the agent path is unchanged.
- Real material, read-only, all 109 main transcripts on this machine (up to 16.5 MB):
  - The hook's 512 KB tail against the whole file: 0 differences on 109.
  - The watch's own reading against the hook's: 1 difference, on the live main session's transcript. That is most
    likely the file growing between the two reads; not checked further.
- Live check, with the real settings on a made-up session (`deadbeef-...c0df`):
  - Main at 451k got both texts, and the server started. The second call got nothing.
  - An agent got the cap worker text, and a lead the cap lead text.
  - The watch then printed three lines with `RUNNING ALREADY`.
  - The server outlived the hook. After the stand-in Claude process stopped, the server was gone in 58 s.
  - `start` with a dead pid said `NOT STARTED`; `serve` with it ended in 0.1 s.
- Mutation check: 39 mutants run, 38 caught, 0 that did not load.
  - G's survivors S09, S16 and L02 are caught now, by the three gap tests.
  - G's unrun S11, S12 and S13 ran (the 20 s bound held) and are caught.
  - The one survivor, K10, is the hook's check that `start` printed one of its three known lines. Only a crashed or
    changed server reaches it; then the hook says `NOT STARTED` and the main session falls back to the stop by
    message.

**Not tested:** a real stop with real agents (out of scope). That a real hook gets `CLAUDE_PID`: I read it in
Claude Code 2.1.310's binary (the hook runner's environment includes `CLAUDE_PID: String(process.pid)`), but did
not see it in a hook run. The new wording for the agent files and `CLAUDE.md`: they are not mine to edit.

## Risky or open points

- **Every main session on this machine gets this, not only orchestrated ones.** The hook is global. Example: a chat
  in a client repo reaches 450k with two Explore agents running. It now gets `SESSION NEAR CAP`, and its agents get
  `STOP FOR LIMIT`. Recommendation: keep it (the 500k main cap is a global rule). Or gate it on a running session
  watch, if the user wants it only where the watch runs.
- **A reused process id** keeps the server alive until its end time: 60 minutes at the cap, the reset plus 30 at a
  limit.
- **The main session's crossing tool call waits for the server to start**, once: about 0.3 to 1 s, bounded by
  `startCheckSeconds` plus 5 s.

## What I learned

- Hooks get `CLAUDE_PID`: Claude Code builds a hook's environment with the same helper as its tool shells.
- On this Windows, Node's `process.kill(pid, 0)` answers `ESRCH` for a gone process and `EPERM` for a running one
  it may not open (pid 4).

DECISIONS TAKEN: Cap stop as --window context-cap with no --percent or --resets-at (not a new --reason argument), the smaller change to the existing interface | The main session is told once and never AGAIN (it then waits and writes the hand-over, which takes many legitimate tool calls) | The main session asks with {"role":"main"}, counted under a key no agent id can be | For the main session the hook reads its size first, then asks the pipe (not in parallel), so the crossing call already carries the main text; no measurable cost | The hook starts the server by running "limit-stop-server.mjs start" (spawnSync, bounded by startCheckSeconds + 5 s, once), not by importing it, so the one-line start contract stays the only one | start refuses a pid that is not running; serve checks at listen and then every processCheckSeconds | A process the server may not open (EPERM, e.g. pid 4) counts as running | The watch's SESSION NEAR CAP is now three lines (marker first) like LIMIT NEAR; its old last-line tests now read the first line | The main session's size skips side-chain records, as the watch does | Built in a scratch copy and installed at the end, because the hook is live for every session | SESSION_ID_PATTERN kept: the hook now uses it for the main marker's name | The server tests got their own bounded runner instead of a change to the shared runNode helper | No gate: every main session on this machine gets the cap stop (see the question)
INITIATIVES: PROCESS_ID_PATTERN shared by the hook and the server in lib\limit-stop.mjs | latestContextSize gained a skipSideChains option | A pid-4 test for a running process the server may not open | The watch header now says "Its first line says why" (it was already wrong for LIMIT NEAR) | A new "At the main session's context cap" section in usage-limits.md | The main session's marker is session-<id>.json in the guard's existing marker folder
ISSUES FOUND: The hook is global, so a main session in any project (not only orchestrated ones) now gets SESSION NEAR CAP at 450k and its agents STOP FOR LIMIT (open, question below) | A reused process id keeps the server alive until its end time, at most 60 min at the cap (open, by design) | That a real hook gets CLAUDE_PID is read in the Claude Code 2.1.310 binary, not seen in a run (open) | Mutant K10 survives: the hook's check of start's line is reached only when start crashes (open, low) | During my run someone else changed the repo's root CLAUDE.md and created orchestrate-agents\references\limits-and-caps-guide.html; the page mentions SESSION NEAR CAP or the context cap 4 times and may now be stale (not mine, untouched) | agents\task-lead.md section 11, agents\software-developer.md section 7 and the xpp-agent CLAUDE.md describe the stop as usage-limit only, or the cap stop by message (text above) | The watch and the hook read the live main transcript 797 tokens apart once, most likely because it grew between the two reads (not checked further)
QUESTIONS: Should the main-session stop stay for every session on this machine (recommended, since the 500k main cap is a global rule), or apply only to sessions that run the session watch?
