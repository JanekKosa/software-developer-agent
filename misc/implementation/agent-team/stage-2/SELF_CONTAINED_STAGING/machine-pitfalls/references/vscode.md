# VS Code on this machine

Moved verbatim from the global CLAUDE.md on 2026-10-25; the traps that hold on any Windows PC moved to `windows-pitfalls` on 2026-10-27. Symptom first, then the rule.

- **A VS Code window that "crashes" has usually run out of memory: this machine has 7.8 GB of RAM.** Proof is one
  line in `main.log`: `CodeWindow: renderer process gone (reason: oom, code: -536870904)` (seen 2026-10-13, after
  minutes of `No ptyHost heartbeat` and `Extension host ... is unresponsive`). **The live log folder is the one
  named after when VS Code was STARTED** (`%APPDATA%\Code\logs\20261007T104125` six days later); folders with newer
  names exist and are empty. `main.log` is locked for `ReadAllLines`; `Select-String`, or a `FileStream` opened
  with `FileShare.ReadWrite`, reads it. Windows' own Application log records nothing for these crashes.
  What filled the memory that day, from `Win32_Process` (`PrivatePageCount`, parent chain): the headless Copilot
  agent bundled with VS Code (`...\@github\copilot-win32-x64\index.js --headless`, listed as `Code.exe`), alive
  since VS Code started, still held **40 MCP helper processes (3.4 GB)** from its sessions of the previous five
  days - it starts a set per session and never lets go. Each open Claude chat costs about 0.4 GB for `claude.exe`
  plus 0.1-0.5 GB of helpers. Only quitting VS Code completely (every window) releases the Copilot set; expected,
  not yet measured. Before starting a heavy run (a build, several subagents), check free memory first.
