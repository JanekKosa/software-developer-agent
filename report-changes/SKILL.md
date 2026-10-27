---
name: report-changes
description: How to tell the user what you changed when a task ends - say what is different for them first, group changes by effect instead of by file, state what you actually checked and what you did not, and own anything unfinished, unasked or outside the diff. Use just before the final message of any task that changed something (code, config, files, data, settings), and whenever the ask is "what did you change", "summarise what you did", "are you done", "what's the status" or "what is left".
---

# Telling the user what you changed

Most bad end-of-task reports are not wrong. They are a diary: what was tried, in what order, in which
files, ending on "all done!". The reader wanted the state, not the story - what is different now,
whether it was checked, and what is left for them.

This skill fixes what goes **into** the report. How each sentence is written - short, plain, terms
glossed, one tiny example - is `explain-clearly`. Load that too.

## The order to work in

1. Look at what actually changed. Read the diff or the file list, do not write from memory.
2. Write the one-line outcome. If you cannot, the task is not finished - say that instead.
3. List what you checked, with what you saw. Then list what you did not check.
4. Add what the reader could not guess: unfinished parts, unasked changes, things outside the diff.
5. Cut the story of how you got there.

Step 1 is the step everyone skips. In a long session memory drifts: a file is forgotten, a change
that was later undone gets reported, a scratch file is left behind.

## The rules

### Lead with what is different for the reader

- First line: the outcome, and whether it is finished, partly done or blocked.
- Say the effect, not the activity. "The import no longer creates duplicate customers" beats
  "I added a duplicate check to the import service".
- No victory lap. No "successfully", "all done", "great news". The outcome line carries it.
- If the task failed, the first line says so. A failure never goes below the list of what worked.

### Group changes by effect, not by file

- One bullet per thing that now behaves differently. Not one bullet per file touched.
- Do not list every file. The diff already does. Name a file only when the reader should open it,
  and link it so they can click.
- Say why, not what the code does. The reader can read the diff. They cannot read your reasons.
- Give one real-looking number where it helps: "500 rows with 3 repeats now give 497 customers".

### Say what you checked, and what you saw

- A claim needs something you ran and read **after the last change**. An earlier run does not count.
- Name the check and its result: "the 14 import tests pass". Not "tests pass", never "should pass".
- A different check proves a different thing. A clean lint is not a build. A build is not a test run.
  A passing test is not a try in the real app.
- If a subagent (a helper agent you started) did part of the work, read its diff before you repeat
  its claim. Its "success" is a claim, not a check.
- Always say what was **not** checked, in its own line. Silence reads as "everything was checked".
- If nothing was checked, say "Nothing was checked". It is information.

### Own what the reader would not guess

- **Unfinished** - what is still broken, skipped or stubbed. Its own line, not a clause.
- **Guessed** - anything you assumed and did not confirm. Say what the guess was.
- **Unasked** - anything you changed beyond the ask, and any choice you made for them. Say how to
  take it back.
- **Outside the diff** - files created elsewhere, settings changed, things installed, deleted,
  restarted or sent. The diff shows none of these, so the report must.
- **Left behind** - scratch files, temporary branches, running processes. Clean them up first.
  Report only what you could not clean.
- **Saved or not** - whether the work is committed (saved into the repo's history), and whether it
  is pushed (sent to the shared copy). Never leave this to be assumed.

### End with what the reader has to do

- List only the steps that need **them**: restart something, sign in, review a choice, run a sync.
- Order them, and number them only if order matters.
- If there is nothing for them to do, do not invent a step. No "let me know if you want changes".
- One open question at most. If you have three, the task was not ready to end.

### Size the report to the change

- A one-line fix gets a one-line report. These rules shape a report, they do not require one.
- Leave out any part that is empty - except what was checked.
- If it will not fit on one screen, it is a document. Give the short version and offer the rest in
  one line: "Want the file-by-file list?".
- Leave out the journey: what you tried first, what you read, how hard it was. Keep one dead end
  only when it stops the reader trying the same thing.

### When the report is big

- When the user asks for a report on a whole feature or a multi-session piece of work, or the changes will not
  fit one screen, write the report as an explainer page by `explain-clearly`'s
  `references/explainer-page.md`. Explain every domain term first, show what changed with a diagram and one
  running example (a before/after table works well), then give the changes in points, grouped by effect.
- Keep the same contents this skill asks for: checked and not checked, unfinished, unasked, outside the diff,
  committed or not. On the page they go in their own sections, not inside the steps.
- The chat message still carries the outcome line and what needs the reader, plus the page's path.

## Worked example

The ask: "stop the import creating duplicate customers".

Bad - a diary, file by file, no evidence, ends on a guess:

> I've successfully implemented the fix! Here's a summary of what I did:
>
> 1. First I investigated `cust-import-service.ts` and found the loop had no duplicate handling.
> 2. I modified `cust-import-service.ts` to add a `Set<string>` keyed on account number.
> 3. I updated `cust-import-service.test.ts` and `import-logger.ts`.
> 4. I also tidied up some logging while I was there.
>
> Everything should work now. Let me know if you'd like any changes!

Good - outcome, effect, evidence, gaps, then what is left for the reader:

> The import no longer creates duplicate customers. It has not been tried on a real file yet.
>
> - A customer that appears twice in a file is imported once. The second row is skipped and logged.
> - A file with 500 rows and 3 repeats now gives 497 customers, not 500.
> - Checked: the 14 import tests pass, 2 of them new ones for repeated rows.
> - Not checked: a real import into the test database. I had no file to run.
> - I also reworded the "row skipped" log line, which you did not ask for. Say if you want it back.
> - Nothing is committed (saved into the repo's history) yet.
>
> The change is in [cust-import-service.ts](src/import/cust-import-service.ts). Can you run one real
> file before this goes further?

## Do not

- Do not narrate. "First I..., then I..." is a diary, not a report.
- Do not repeat the diff in words. Say what it means.
- Do not say "should", "probably" or "seems to" about something you could have run. Run it, or say
  it was not run.
- Do not hide a failure inside a clause, or below a list of successes.
- Do not report a change you later undid, or a file you did not touch.
- Do not close with an offer to do more, a recap of the recap, or thanks.
- Do not force every part onto a small change.

## Scope

This governs the **final message to the user** after a task that changed something, and any answer
to "what did you change".

It does not govern commit messages, pull request descriptions, change logs, or a handoff note for
another agent. Those have a different reader, who needs the how and the why in full.

## Where this came from

No public skill covered this on its own. The well-known collections
([obra/superpowers](https://github.com/obra/superpowers),
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills),
[anthropics/skills](https://github.com/anthropics/skills)) have none for the end-of-task report.
This is built on `explain-clearly`, plus the parts of four near-misses that fit. Each was checked by
reading it (no clone, no execution).

- [obra/superpowers - verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion)
  (MIT) - evidence before any claim, a fresh run only, no "should", and never trust a subagent's
  own success report.
- [ferueda/agent-skills - handoff-work](https://github.com/ferueda/agent-skills) - the reader must
  not need to replay the session or reread the diff, and departures from the plan are stated.
- [rohitg00/pro-workflow - wrap-up](https://github.com/rohitg00/pro-workflow) - read the real
  change list before you summarise, and call out uncommitted work.
- [Doyajin174/myskills - report-writing](https://github.com/Doyajin174/myskills/tree/main/.public/skills/report-writing)
  (MIT, read through its skillstore.io listing only) - files come with a reason, validation is the
  actual result, follow-ups are specific.

Their formats were dropped. The first is rule tables written in capitals, the second and third are
written for the next agent rather than for a person, and the fourth writes a dated report file with
before and after sections for every change.
