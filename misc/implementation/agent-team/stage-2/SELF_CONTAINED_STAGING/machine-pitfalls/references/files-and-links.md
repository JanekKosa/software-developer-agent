# Files, folders, junctions and hard links on this machine

Moved verbatim from the global CLAUDE.md on 2026-10-25; the traps that hold on any Windows PC moved to `windows-pitfalls` on 2026-10-27. Symptom first, then the rule.

- **The instructions sync hook re-creates the global pair's hard link by itself** after an Edit or Write breaks it
  (that trap is in `windows-pitfalls`, `references/files-and-links.md`). Any other hard-linked file you re-link
  yourself.
