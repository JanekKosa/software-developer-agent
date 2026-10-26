# Open decisions

Questions, initiatives and issues not yet closed, newest last. Each waits for the user (Status: waiting-for-user) until the user answers, then for an agent (Status: waiting-for-agent); every answer is kept, in the user's words, in ANSWERS_LOG_CLAUDE.jsonl. The agent closes the entry, which moves it to RESOLVED_DECISIONS_CLAUDE.md, or adds a Follow up line that explains or talks about it further and sets it back to waiting-for-user.

## D-31 · question · blocking
- Status: waiting-for-agent
- Urgency: high
- Raised: 2026-10-26 22:24 by main session
- Task: First commit and GitHub remote (JanekKosa), 2026-10-26
- What: A public repo would hand out 17 skills copied from other people's GitHub projects. Most are under the MIT licence, which allows that only if the licence text and the author's copyright line go along with the copy; 15 of the 17 folders carry no licence file. One source (karpathy-guidelines) declares no licence at all, which strictly means no permission to republish.
- Example: skills\test-driven-development comes from obra/superpowers (MIT). In a public repo without obra's copyright line and the MIT text, anyone can see it was republished without the notice MIT asks for.
- Options: A: add one file, skills\THIRD_PARTY_NOTICES.md, with each source's copyright line and licence text taken from the source repos, and leave karpathy-guidelines out of the public repo (it stays on disk); the skill folders themselves stay untouched (about 15 minutes). B: keep the whole skills folder out of the public repo; it stays on disk and the agents still read it (no work, but the repo alone no longer works for anyone else). C: make the repo private instead; then nothing is republished (no work).
- Recommendation: A, because it keeps the repo complete and public while giving every author the credit their licence asks for.
- Meanwhile: Nothing is committed or pushed until you answer; the commit email and the .gitignore line are ready.
- Evidence: C:\Repos\My projects\software-developer-agent\skills\SKILLS_MANIFEST_CLAUDE.md (section What is installed: source repo and licence per skill)
