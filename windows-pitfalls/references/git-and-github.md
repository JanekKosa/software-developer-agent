# Git and GitHub

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **`git clone` exits 128 with *"Clone succeeded, but checkout failed"* / *"Filename too long"*** when the
  destination path plus the repo's own deep paths exceed Windows' 260-character limit. The scratchpad path
  (`...\AppData\Local\Temp\claude\<project>\<session-guid>\scratchpad\`) is already ~150 characters, so this
  fires on ordinary repos. Fix: `git -c core.longpaths=true clone ...`. The repo is fine and the clone itself
  succeeded - only the checkout failed, so the working tree is empty or partial.
- **`git pull` says *"Already up to date"* while new commits sit on the server under the same branch name in
  another CASE.** Azure DevOps keeps `Features/X` and `features/X` as two branches; Windows stores both
  tracking refs in one file, so `origin/Features/X` and `origin/features/X` resolve to the same commit
  locally and `git status` shows no ahead/behind. Seen 2026-10-21: the fetch printed
  `* [new branch] features/X -> origin/features/X` and that twin held the commit. When a fetch lists a
  "new branch" matching yours but for case, run `git ls-remote origin` (the server's truth) and
  `git log HEAD..<twin's hash>`.
- **`git diff` shows EVERY line of a file changed after a script inserted one line into it.** Cause seen 2026-10-19
  on a CRLF label file: inserting after a `[regex]::Match($text, '(?m)^Key=.*$')` match put the new text between
  the line's `\r` and `\n`, because .NET's `.` matches `\r` and `$` stops before `\n`. The file then held one bare
  `\r` and one bare `\n`, and git (`core.autocrlf=true`) does not convert a file with mixed line endings, so every
  CRLF line differs from the LF blob. Edit line by line instead (split on the file's own newline, insert, join), then
  check for `"\r(?!\n)"` and `"(?<!\r)\n"` before trusting the diff.
- **Git cannot authenticate from inside an agent tool call**: a push or fetch needing credentials dies with
  *"fatal: Cannot prompt because user interactivity has been disabled"* / *"could not read Password"*, and no
  Credential Manager window ever appears. Run the failing command once in a normal terminal to sign in; Credential
  Manager caches the token, and agent tool calls work from then on.
- **A GitHub token cannot be read out of Credential Manager from inside a tool call**, so anything needing the
  GitHub **API** rather than git itself - creating a repo, creating a fork - cannot be done by the agent at all,
  unless a signed-in `gh` CLI or a `GH_TOKEN` / `GITHUB_TOKEN` in the environment gives it another way in.
  `git credential fill` does return the token, but the sandbox refuses the call as *"Credential Exploration"*, and
  that refusal covers the outcome, not just the command. Without either, fork or create the repo in the browser
  first, then let the agent do the git part. (Git *operations* that only need the cached credential still work -
  see the entry above.)
