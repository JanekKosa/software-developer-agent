# Git and GitHub on this machine

Moved verbatim from the global CLAUDE.md on 2026-10-25; the traps that hold on any Windows PC moved to `windows-pitfalls` on 2026-10-27. Symptom first, then the rule.

- `C:\Program Files\Git\cmd\git.exe` fails with *"The specified executable is not a valid application for this OS
  platform"*. **Visual Studio 2026's bundled git works**; call it by full path:
  `C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe`.
  Never retry the broken one in a loop.
- **Two GitHub accounts on this machine.** Credential Manager holds a token for **AxDevDemon**, while personal
  repos live under **JanekKosa**. A bare `https://github.com/JanekKosa/...` remote silently reuses the AxDevDemon
  token and a private repo then answers *"Repository not found"* - which looks like the repo is missing. Put the
  account in the remote URL (`https://JanekKosa@github.com/...`) so the right identity is used.
