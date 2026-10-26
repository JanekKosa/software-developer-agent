# Run F: two small changes and run E's missing checks (task file)

Same rules as runs D and E: work in `C:\Repos\My projects\software-developer-agent` only; never commit; never edit
any `CLAUDE.md`, any Claude or VS Code settings file, or anything outside that repo; never start, stop or message
agents or sessions; never open a `vscode://` link or send keystrokes; heavy commands through
`orchestrate-agents\scripts\run-heavy.ps1 -MinFreeMB 600`.

Read first, and no more: `E_PROGRESS_CLAUDE.md` and the last section of `E_REPORT_CLAUDE.md` (this folder), the
config, then the files you change. Progress file `F_PROGRESS_CLAUDE.md`, report `F_REPORT_CLAUDE.md` (this folder).
Plan for about 60 tool calls.

## Points (the user's decisions, 2026-10-25)

1. **Finished agents do not count** in the watch's resume-or-hand-over choice. An agent whose `.meta.json` says
   `"finished": true` is left out, like an ignored type. Test it with fixtures (finished warm agent left out;
   unfinished one counted; a meta file without the field counts).
2. **`watch-agent.ps1` reads the agent's type from its `.meta.json`** (`agentType`), so it warns at that type's
   size from `contextCaps`. `-AgentType` stays as an override; with neither, it uses `default`. Tests.
3. **Run E's missing checks:** the mutation check of run E's PowerShell changes and of your own, and one real probe
   run. Commands are in `E_PROGRESS_CLAUDE.md`.
4. Both suites green at the end; the parser; the doc check for any line your changes made stale (SKILL.md and
   `references\usage-limits.md` describe the choice).
