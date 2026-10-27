# PowerShell, Bash and native programs on this machine

Moved verbatim from the global CLAUDE.md on 2026-10-25; the traps that hold on any Windows PC moved to `windows-pitfalls` on 2026-10-27. Symptom first, then the rule.

- The **Bash tool may fail to spawn** (`uv_spawn` error). **Use PowerShell.**
- There is **no Python, no `pdftotext`, and no Microsoft Word COM**. PowerShell + .NET is the only option for
  document extraction.
