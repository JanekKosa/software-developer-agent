# Run H: the main session hears the hook too, and run G's open points (task file)

Same rules as runs D to G: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never edit
any `CLAUDE.md`, any Claude or VS Code settings file, the files under `agents\`, or anything outside that repo (put
the text those need in your report); never start, stop or message agents or sessions other than processes you
started yourself; never open a `vscode://` link or send keystrokes; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`.

Read first, and no more: `G_REPORT_CLAUDE.md` (this folder) whole, the config, then the files you change. Progress
file `H_PROGRESS_CLAUDE.md`, report `H_REPORT_CLAUDE.md` (this folder). Plan for about 90 tool calls; if you near
your cap, close with what is done and what is left.

## The user's answers (2026-10-25, register D-0001 to D-0003)

- D-0001, "yes": the limit-stop server also ends when the session's Claude Code process is gone.
- D-0002, "yes lets add the stop into the main session, so the hook will inform the orchestraor agent, the main
  session when it;s nearing its limit": the same stop is used at the main session's context cap, and the hook also
  tells the main session.
- Follow-up, "yes": the hook also gives the main session its size warning at `contextCaps.main.warn` (450k), so
  all three caps (worker, lead, main) work the same way.
- D-0003, "Yes": close run G's test gaps and open issues.

## Points

1. **The main session hears the hook.** Today `context-guard.mjs` returns nothing when the input has no `agent_id`.
   Change that: for the main session it reads the session's own transcript (`transcript_path`), and
   - at `contextCaps.main.warn` it adds a size warning once, in the words of `SESSION NEAR CAP` from the watch
     (hand over at once, as the repo's `CLAUDE.md` and `SKILL.md` describe);
   - when the session's limit-stop server answers, it adds the main session's own stop text (wait for the leads'
     `LEAD STOPPED`, write the hand-over listing each lead's hand-off).
   The session watch stays: it still wakes the main session when it is idle. A warning from both is fine; say in
   the texts that they mean the same.
2. **The stop at the main session's context cap.** Once the main session passes its warn size, every lead and
   worker of that session must hear `STOP FOR LIMIT` (cap wording: "this session is at its context cap and hands
   over to a new one") at its next tool call, whether the hook or the watch notices first. Starting the server
   twice must stay harmless (`RUNNING ALREADY`). The server has no reset time in this case; it ends by point 3 or
   after a configured time.
3. **The server ends when the session's Claude Code process is gone** (D-0001), checked every configured number of
   seconds, besides its existing end time. The watch knows the process id (`CLAUDE_PID`); pass it to the server.
4. **Run G's open points** (D-0003): close test gaps S09, S16 and L02 (red first); give the server tests a timeout
   so a broken argument check fails instead of hanging the suite, then run mutants S11, S12 and S13; remove the
   unused export `SESSION_ID_PATTERN` if nothing uses it.
5. **Docs:** `SKILL.md`, `references\usage-limits.md`, `references\start-messages.md` where they describe the main
   session's cap or the stop. Put the text that `agents\task-lead.md` and the xpp-agent `CLAUDE.md` ("Session Size
   and Hand-over", "Session Watch") need in your report.
6. **Config:** every new number with a `_why`.

## Checks

- Tests first for each point; Node and PowerShell suites green at the end; the parser; `node --check`.
- Time the hook 20 times for a main-session input and an agent input with no server, before and after.
- A live check without agents: a made-up main-session transcript past 450k gets the warning once; a made-up
  session's server tells its main session and its agent; a server given a process id that does not exist ends.
- A mutation check of the new code; the doc check for any line your changes made stale.
- Not in scope: a real stop, real agents.
