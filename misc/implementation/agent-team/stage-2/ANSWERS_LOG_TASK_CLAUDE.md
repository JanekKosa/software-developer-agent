# Task: the answers log and the answer watch

Written by the main session, 2026-10-26 15:00. For the task lead.

## What it is for

The user answers decisions in the Decisions pane, not in the chat. Today an answer submitted there reaches the main
session only when the user next types in the chat (the prompt hook), and answers are copied into the entries, where
they pile up. This task gives answers a log of their own and a watch that hands each new answer to the main session.

## The user's words

- D-13, 14:20: "lets add another watch process, which will handle new asnwwered decisosn everu 15mins
  (configurable), the answered decision should be passed to the orchestroaotr agent/ main agent and then deleted so
  that the watch doesnt  process the same answerwerd decisiosn 15misn later"
- D-13-1, 14:47, after the main session pointed out that deleting an answer loses it from the record and makes
  `close` refuse: "i have a btter idea, lets create a answers log, so the answers dont fill up the actual decisions,
  the agent should be able to search for the answers log easily, so maybe lets not use a .md file, with that said
  the resolved decisiosn should still have a resolution summary with the final asnwer"
- In the chat, about 14:55: "also the - Still open: should be called follow up because it foloows up to the
  decisons" and "and follows up are only to explian/eloborate or talk about the decision further".
- Earlier the same day, still binding: decisions never appear in the chat; only a blocking entry still waiting for
  the user is named there in one line. No decision leaks between repos (D-14): a register is read only by a chat in
  its own repo.

## What to build

1. **The answers log.** Every answer the user gives, kept for good in a file that is not Markdown and that an agent
   can search easily (for example JSON Lines: one answer per line with the entry id, the time and the user's words).
   Answers no longer fill the entries of the open or the resolved file. `register.mjs` gets a way to search it (by
   id, by words). Whether the answered file goes or stays as the queue of answers not yet handed over is yours to
   design; the user's intent is: each answer handed over exactly once, never lost, always searchable.
2. **A resolution summary on close.** A closed entry in the resolved file carries a summary written by the agent
   that closes it, including the final answer.
3. **Follow up instead of Still open.** The line an agent adds when it keeps an entry open is called `Follow up`. A
   follow-up only explains, elaborates or talks about the decision further. Old registers' `Still open` lines must
   still be read.
4. **The answer watch.** A new background process for the main session, separate from `watch-session.ps1`. Every
   15 minutes by default (a setting in `orchestration.config.json`) it reads the chat's own repo's register; when
   answers wait that it has not handed over, it ends with a line carrying them (ids and the user's words), which
   wakes the main session, and it records them as handed over so the next round never hands them over again. Think
   about an answer the main session itself recorded from the chat, and about the prompt hook that also lists
   answered entries: no answer should reach the main session twice in a way that makes it act twice.
5. **The main session's side.** `orchestrate-agents\SKILL.md` says how the main session starts the answer watch,
   restarts it after each wake, and processes what it hands over (pass the user's words to the lead, then close with
   a summary or add a follow-up). Update `agents\task-lead.md` section 8, the reminder hook's text, the team guide
   page (`orchestrate-agents\references\agent-team-guide.html`) and the README where they describe answers.
6. **The pane** (`C:\Repos\My projects\claude-code-extensions\decisions-pane`) keeps recording answers through
   `register.mjs answer`, shows `Follow up` where it showed `Still open`, and still shows what the user needs beside
   a followed-up entry (their earlier answer, read from wherever it now lives).
7. **Existing registers.** A way to convert a register written the old way (answered file, `Answered` and `Still
   open` lines inside entries), tested on scratch copies only. The main session runs it on the real registers.

## Out of scope, or the main session's

- D-15 waits for the user: no "Explained" block, no change to how much a follow-up can hold beyond the rename.
- The global instructions and `~\.claude\settings.json`: if every main session must start the answer watch, write
  the exact lines you propose into your summary; the main session applies them.
