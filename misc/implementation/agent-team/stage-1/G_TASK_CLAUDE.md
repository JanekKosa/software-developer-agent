# Run G: the limit stop through a named pipe, and hand-offs up the chain (task file)

Same rules as runs D, E and F: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never
edit any `CLAUDE.md`, any Claude or VS Code settings file, or anything outside that repo; never start, stop or
message agents or sessions; never open a `vscode://` link or send keystrokes; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`. Before writing a line of code, read the Node docs for
`net` named pipes on Windows (`\\.\pipe\...`, `net.createServer().listen(path)`, `net.connect(path)`, the error
codes when no server listens) and for `child_process.spawn` with `detached` and `windowsHide`. Do not rely on memory.

Read first, and no more: the last section of `F_REPORT_CLAUDE.md` (this folder; run F changed `watch-session.ps1`
and its tests just before you), the config, `hooks\context-guard.mjs`, the LIMIT NEAR part of
`scripts\watch-session.ps1`, `references\usage-limits.md`, `references\start-messages.md`, then the files you
change. Progress file `G_PROGRESS_CLAUDE.md`, report `G_REPORT_CLAUDE.md` (this folder). Plan for about 90 tool
calls; if you near your cap, close with what is done and what is left.

## Why (the user's decision, 2026-10-25)

Today the main session sends `STOP FOR LIMIT` to each lead as a message. Measured 16:55: a lead that is waiting on
its worker gets a message only after the worker returns, so the stop arrives too late. The user chose a named pipe
(a private in-memory channel between two programs) over a flag file: nothing is written to disk, so nothing is
left behind to delete. The thresholds stay 95% (5-hour) and 98% (weekly); they leave tokens for the hand-offs.

## What to build

1. **A limit-stop server** (`scripts\limit-stop-server.mjs`, Node). At `LIMIT NEAR | HAND OVER` the session watch
   starts it detached and hidden, before the watch exits, with the session id, the window (5-hour or weekly), the
   percent and the reset time. It listens on a pipe whose name holds the session id (prefix from the config). It
   answers each query from the hook with the stop text for that agent, or nothing. It remembers in memory which
   agents it told, and tells an agent again, more firmly, after a configured number of further tool calls. It exits
   by itself at the reset time plus a configured margin. A second copy for the same session sees the pipe taken and
   exits at once. It never writes a signal file; it may log to a log file named in the config, like `relaunch.log`.
2. **The context guard asks the pipe.** For every agent call (`agent_id` present, every agent type), it connects to
   the session's pipe with a short configured timeout. No server (the normal case) must cost only a failed connect,
   with no stderr noise. A stop answer is added to the hook's output, together with any size message. Any error
   keeps today's rule: print nothing, exit 0.
3. **Hand-offs up the chain.** The stop text tells a **worker** to stop building, write a hand-off section in its
   progress file (what is done, how it was checked, what is on disk but unchecked, what is left, the exact next step,
   the files it owns) and end its turn with a fixed line naming that file. A **lead**, when its worker returns that
   (or when the pipe tells the lead itself), writes its own hand-off (its plan, each worker's hand-off path, the next
   runs) and ends with `LEAD STOPPED` plus the path. The **main session**, woken by the watch, waits for each lead's
   line, then writes the session hand-over that lists every lead's hand-off. The next session starts each lead with
   its hand-off, and the lead starts each worker with the worker's. Reuse the fixed lines already in
   `references\start-messages.md` wherever they fit; change their text, not their names.
4. **Main no longer messages leads to stop.** Update `SKILL.md`, `references\usage-limits.md`,
   `references\start-messages.md`, `references\worker-rules.md`, `references\lead-brief-template.md` and the
   `team-rules` skill only where they describe the old message. Keep one fallback for main: a lead that has not
   answered within a configured number of minutes is stopped with `TaskStop` (measured 16:56: that also stops its
   worker), and the hand-over says so.
5. **Config.** Every new number and name goes in `orchestration.config.json` with a `_why`: the pipe prefix, the
   hook's connect timeout, the repeat count, the end margin, the lead fallback minutes, the server's log file.

## Checks

- Node tests for the server and the hook, using a test pipe prefix so no test can touch a real session: no server;
  a server that answers; told once, then again after the repeat count; a second server for the same session exits;
  the server exits at its end time; a broken answer is ignored.
- PowerShell test that the watch starts the server at `LIMIT NEAR` with the right arguments (stub the start).
- Time the hook with no server, 20 times, before and after your change; report both.
- A live check without agents: start the server for a made-up session id, feed the hook a made-up input with that
  session and an agent id, and show the message it prints; then show it prints nothing for another session.
- A mutation check of the new code, both suites green, the parser, `node --check`, and the doc check for any line
  your changes made stale.
- Not in scope: a real usage-limit stop, and starting real agents.
