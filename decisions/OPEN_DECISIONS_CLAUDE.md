# Open decisions

Questions, initiatives and issues not yet closed, newest last. Each waits for the user (Status: waiting-for-user) until the user answers, then for an agent (Status: waiting-for-agent); every answer is kept, in the user's words, in ANSWERS_LOG_CLAUDE.jsonl. The agent closes the entry, which moves it to RESOLVED_DECISIONS_CLAUDE.md, or adds a Follow up line that explains or talks about it further and sets it back to waiting-for-user.

## D-56 · issue · not-blocking
- Status: waiting-for-agent
- Urgency: low
- Raised: 2026-10-27 16:04 by main session (scan before today's commit)
- Task: Agent team: works from this repo alone
- What: Your personal and work email addresses are public in the agent repo on GitHub.
  - They sit in an old closed decision in the decisions file: the one where you picked GitHub's no-reply address so that no real email shows.
  - They went public with the first push on 26 October. Today's push added nothing new.
- Example: Anyone who opens decisions\RESOLVED_DECISIONS_CLAUDE.md on GitHub sees both addresses in that entry's example and options.
- Options:
  - A: blank both addresses in that entry and rewrite the repo's history so no commit holds them (one short step; needs a force push, which replaces the history on GitHub).
  - B: blank them in the file from now on only (older commits on GitHub still hold them).
  - C: leave them.
- Recommendation: A, because you chose the no-reply address so that no real email shows, and only a history rewrite removes them from GitHub.
- Meanwhile: Nothing changes; the addresses stay where they are until you answer.
- Evidence: C:\Repos\My projects\software-developer-agent\decisions\RESOLVED_DECISIONS_CLAUDE.md
- Follow up: 2026-10-28 15:58: Nothing more to decide: the fix is ready locally and waits only for your push.
  - Local main is rewritten (2245912 and 9c5c2a5) and holds no address; GitHub still has the old history (a7c0f03).
  - The automatic guard refuses a force push from the agent, so you run it yourself, from the repo folder:
    & "C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe" push --force-with-lease=main:a7c0f039f533660a8837e2526b42b03f1326394c origin main
  - Answer "pushed" here once it is done and the entry is closed. Answer "skip" to leave GitHub as it is (option B in effect).
- Follow up: 2026-10-28 16:02: Your second "A" (16:01) is noted, but the agent cannot do the push for you: Claude Code's automatic guard refused the force push again at 16:05 ("Git Destructive"), and I will not work around it.
  - Only you can run it. Open a terminal in C:\Repos\My projects\software-developer-agent and paste:
    & "C:\Program Files\Microsoft Visual Studio\18\Enterprise\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe" push --force-with-lease=main:a7c0f039f533660a8837e2526b42b03f1326394c origin main
  - It only succeeds while GitHub still holds a7c0f03, so it cannot overwrite anything unexpected.
  - Then answer "pushed" and I close this entry. Answer "skip" to leave GitHub as it is.
