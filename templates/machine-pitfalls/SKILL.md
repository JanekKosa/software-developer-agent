---
name: machine-pitfalls
description: This PC's own traps, each found the hard way - the ones that hold only here because of how this PC is set up (a broken or missing program, a tool that is not installed, a setting, an account, a folder, the memory it has). The traps that hold on any Windows PC are in windows-pitfalls; load both. Use before running shell commands, git, file moves or deletes, builds, or agent and session bookkeeping on this PC, and whenever a command fails with an error whose cause is not obvious.
---

# Machine pitfalls

This PC's own traps. The list starts empty and fills as the agent team finds traps that hold only here.

- **What goes here**: a trap true only on this PC because of how it is set up: a broken or missing program, a tool
  that is not installed, a setting, an account, a folder, the memory it has. Example: "`git.exe` under
  `C:\Program Files\Git\cmd` fails on this PC; use the git bundled with Visual Studio, by full path".
- **What goes to `windows-pitfalls` instead**: a trap true on any Windows PC, such as PowerShell parsing, junctions,
  hard links, Node and .NET quirks, or how Claude Code agents behave. A general trap first seen here goes there,
  with its example made general.
- **Who writes it**: agents report a trap in their ISSUES FOUND line as `trap: <symptom> -> <fix> (this PC only)`
  (`team-rules`, section 8); the main session adds it below. Agents never edit this skill.

## Traps

One bullet per trap: the symptom in bold, then the rule, and the date it was seen.

- (none yet)
