---
name: machine-pitfalls
description: The traps of this one PC, each found the hard way - its broken git install and the Visual Studio git to use instead, the Bash tool failing to spawn, the tools it lacks (no Python, jq, pdftotext or gh), Developer Mode off, the user's two GitHub accounts, VS Code windows running out of memory on its 7.8 GB, and the hook that re-links the global instructions pair. The traps that hold on any Windows PC are in windows-pitfalls; load both. Use before running shell commands, git, builds or VS Code diagnostics on this PC, and whenever a command fails with an error whose cause is not obvious.
---

# Machine pitfalls

Moved out of the global CLAUDE.md on 2026-10-25 so that agents can skip CLAUDE.md and preload only this. On
2026-10-27 the traps that hold on any Windows PC moved to the team skill `windows-pitfalls`; this skill keeps only
this PC's own: its install, its accounts, its folders. The rules below are the ones that bite on almost every task.
Every other trap is in `references/`, one file per area, **symptom first**: search a reference for the error text
you are looking at.

## The rules that bite every day

- **Git:** `C:\Program Files\Git\cmd\git.exe` is broken. Use Visual Studio 2026's git by full path:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`.
  Never retry the broken one.
- **Shell and tools:** the Bash tool may fail to spawn; use PowerShell 7. There is no Python, no `jq`, no
  `pdftotext`, no `gh` CLI and no `GH_TOKEN` / `GITHUB_TOKEN`. Developer Mode is off, so a symbolic link needs admin
  rights.

## Where the rest is

| File | Holds traps about |
| --- | --- |
| `references/git-and-github.md` | broken git.exe, the two GitHub accounts |
| `references/shells.md` | Bash spawn failures, no Python |
| `references/files-and-links.md` | the instructions sync hook that re-links the global pair |
| `references/vscode.md` | VS Code windows dying of out-of-memory on this 7.8 GB machine |

## Adding a trap

A trap true only on this PC goes here, symptom first. A trap true on any Windows PC goes to `windows-pitfalls`, with
its example made general. Agents report a new trap in their ISSUES FOUND line (`team-rules`, section 8); the main
session adds it. Agents never edit this skill.
