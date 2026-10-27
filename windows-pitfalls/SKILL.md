---
name: windows-pitfalls
description: The traps that hold on any Windows 10 or 11 PC with PowerShell 7, Node, VS Code and Claude Code, each found the hard way - PowerShell parsing and case-insensitivity, quoting native arguments, junctions that Move-Item follows, hard links that Edit breaks, long paths, letter case and line endings in git, Node and .NET quirks, VS Code approval prompts, and how Claude Code agents, sessions and transcripts really behave. This PC's own traps (its install, its accounts, its folders) are in machine-pitfalls; load both. Use before running shell commands, git, file moves or deletes, builds, or agent and session bookkeeping, and whenever a command fails with an error whose cause is not obvious.
---

# Windows pitfalls

Split out of `machine-pitfalls` on 2026-10-27: these traps hold on any Windows 10 or 11 PC with PowerShell 7, Node,
VS Code and Claude Code, so they travel with the agent team. This PC's own traps (its install, its accounts, its
folders) stay in `machine-pitfalls`; load both. The rules below are the ones that bite on almost every task. Every
other trap is in `references/`, one file per area, **symptom first**: search a reference for the error text you are
looking at.

## The rules that bite every day

- **PowerShell is case-insensitive** in variable names (`$p` overwrites `$P`), and in `-replace`, `-match`,
  `-split` and `Select-String`. Use distinct names, and `-creplace`, `-cmatch`, `-csplit`, `-CaseSensitive` when
  case matters.
- **Quote a native argument that starts with `-` and holds a variable**: `"-modelmodule=$mod"`, or the program gets
  the literal `$mod`.
- **Never `Move-Item` a tree that contains junctions**: it follows them and empties their targets. List links with
  `cmd /c "dir /AL /S /B <path>"` first; remove a link with `[System.IO.Directory]::Delete($p, $false)`.
- **Edit and Write break hard links** (they replace the file). Re-create the link after editing a hard-linked file.
- **Never kill processes by name or command line**; stop only the ids you started (Claude Code tasks with
  `TaskStop`).
- **Git cannot ask for credentials inside a tool call** and a GitHub token cannot be read from one. The user signs
  in once in a normal terminal.

## Where the rest is

| File | Holds traps about |
| --- | --- |
| `references/git-and-github.md` | clone "Filename too long", branch names differing only in case, every line changed after a one-line insert (mixed line endings), authentication from tool calls |
| `references/shells.md` | case-insensitivity, unpipeable `foreach` statements, `-name=$var` passed literally, one-row lists flattened, `Select-String` on path strings, `Select-Object -First` killing the producer, no here-docs, typographic quotes ending strings, `&` cut at `.cmd` shims, command lines glued from strings, `Start-Process -File` with a space, backtick-n in single quotes, inline here-strings refused by the harness, `, $list` unrolled by an `if` |
| `references/files-and-links.md` | symbolic links need admin, `Move-Item` following junctions or degrading to a copy, `robocopy` retries and exit codes, `-Recurse` over many junctions, "directory is not empty", Node `rmSync` on non-ASCII paths, `Copy-Item` keeping old timestamps, folder times not changing, `\uXXXX` escapes written as characters, hard links broken by Edit |
| `references/node-and-dotnet.md` | top-level `await` in scratch `.ts`, `AssemblyResolve` stack overflows, PowerShell cannot host resolve handlers, the C# 5 `csc.exe`, namespace is not assembly, JIT-time assembly loading, MSB3106 floods |
| `references/vscode.md` | shell-approval prompts despite auto-approve |
| `references/claude-code-agents.md` | killing background tasks, hung or cut-off subagents, what a cut-off agent's log holds, cheap subagents for searching, keeping agents under their context cap, measuring a session's or agent's context from its transcript |

## Adding a trap

A trap true on any Windows PC goes here, symptom first, with any example from one PC made general. A trap true only
on one PC goes to that PC's `machine-pitfalls`. Agents report a new trap in their ISSUES FOUND line (`team-rules`,
section 8); the main session adds it. Agents never edit this skill.
