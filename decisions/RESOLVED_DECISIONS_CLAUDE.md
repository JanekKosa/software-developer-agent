# Resolved decisions

Questions, initiatives and issues that are closed, newest last. Each ends with a Final answer line (the user's last answer), a Summary line and a Resolved line that gives the outcome; every answer the user gave is kept in ANSWERS_LOG_CLAUDE.jsonl.

## D-1 · question · not-blocking
- Raised: 2026-10-25 18:54 by run G worker
- Task: agent-team stage 1, run G
- What: Should the limit-stop server also end when the session's Claude Code process is gone?
- Example: Weekly limit at 98% on Monday, reset on Thursday: today the 35 MB server idles until Thursday plus 30 minutes, even after the chat is closed.
- Options: Yes: end it when the Claude Code process is gone (the watch already knows its id). No: keep it until the reset plus 30 minutes.
- Recommendation: Yes
- Meanwhile: The server ends 30 minutes after the reset.
- Evidence: misc/implementation/agent-team/stage-1/G_REPORT_CLAUDE.md, Risky or open points
- Final answer: 2026-10-25 19:04: "yes"
- Resolved: 2026-10-25 19:04, answered

## D-2 · question · not-blocking
- Raised: 2026-10-25 18:54 by run G worker
- Task: agent-team stage 1, run G
- What: Should the main session start the limit-stop server at SESSION NEAR CAP too?
- Example: Main reaches 450k while a lead waits on its worker: today the stop goes by message and reaches the lead only after the worker returns.
- Options: Yes: main starts the server, and every agent hears the stop at its next tool call. No: keep the message.
- Recommendation: Yes
- Meanwhile: At SESSION NEAR CAP leads are stopped by message, as before.
- Evidence: misc/implementation/agent-team/stage-1/G_REPORT_CLAUDE.md, Risky or open points
- Final answer: 2026-10-25 19:04: "yes lets add the stop into the main session, so the hook will inform the orchestraor agent, the main session when it;s nearing its limit, because thats how the 500k limit and 400k limit warning will work right?"
- Resolved: 2026-10-25 19:04, answered

## D-3 · issue · not-blocking
- Raised: 2026-10-25 18:54 by run G worker
- Task: agent-team stage 1, run G
- What: Three test gaps, a suite that can hang, and one unused export in the limit-stop code
- Example: Mutant S16 (start does not stop a server whose pipe did not answer in time) passes every test; mutants S12 and S13 hang the suite because the server tests have no timeout.
- Options: Fix them in a small run H. Leave them.
- Recommendation: Fix them in run H, together with the two questions above
- Meanwhile: Both suites are green; the gaps only mean a future break in those lines would go unnoticed.
- Evidence: misc/implementation/agent-team/stage-1/G_REPORT_CLAUDE.md, Checks
- Final answer: 2026-10-25 19:04: "Yes"
- Resolved: 2026-10-25 19:04, answered

## D-5 · question · not-blocking
- Raised: 2026-10-25 20:06 by run H worker
- Task: agent-team stage 1, run H
- What: Should the main chat's 450k stop work in every chat on this machine, or only in chats that run the session watch?
- Example: A chat in a client repo reaches 450k with two search agents running: today it gets SESSION NEAR CAP and its agents get STOP FOR LIMIT, even though nobody asked for the agent team there.
- Options: Every chat (the 500k main cap is a global rule). Only chats that run the session watch.
- Recommendation: Every chat, together with starting the session watch in every chat from the global instructions
- Meanwhile: Every chat on this machine gets it.
- Evidence: misc/implementation/agent-team/stage-1/H_REPORT_CLAUDE.md, Risky or open points
- Final answer: 2026-10-25 22:05: "I ACCEPT ALL but D-0004"
- Resolved: 2026-10-25 22:05, accepted

## D-6 · question · not-blocking
- Raised: 2026-10-25 20:42 by run I worker
- Task: agent-team stage 1, run I
- What: Keep the wait after a server error at 1 minute, or set it back to 10?
- Example: The API is overloaded at 14:10. The watch wakes the chat at 14:11, the API is still overloaded, the chat stops again, and no watch is left to wake it until you type.
- Options: 1 minute (your request). 10 minutes, as before. 1 minute after a limit reset, 10 after a server error.
- Recommendation: 1 minute after a limit reset, 10 after a server error
- Meanwhile: 1 minute for both.
- Evidence: misc/implementation/agent-team/stage-1/I_REPORT_CLAUDE.md, ISSUES FOUND
- Final answer: 2026-10-25 22:05: "I ACCEPT ALL but D-0004"
- Resolved: 2026-10-25 22:05, accepted

## D-7 · question · not-blocking
- Raised: 2026-10-25 20:42 by run I worker
- Task: agent-team stage 1, run I
- What: Should a small run make the orchestration scripts refuse a misspelled parameter?
- Example: schedule-relaunch.ps1 -DryRunn is accepted silently today, so a test meant as a dry run would register a real scheduled task.
- Options: Yes, a small run. No.
- Recommendation: Yes
- Meanwhile: Unknown parameters are ignored, as before.
- Evidence: misc/implementation/agent-team/stage-1/I_REPORT_CLAUDE.md, ISSUES FOUND
- Final answer: 2026-10-25 22:05: "I ACCEPT ALL but D-0004"
- Resolved: 2026-10-25 22:05, accepted

## D-8 · issue · not-blocking
- Raised: 2026-10-25 20:42 by main session
- Task: agent-team stage 1, the move to the agent repo
- What: The prompt reminder shows only the register of the repo the chat runs in, so a chat in xpp-agent no longer shows the agent-team questions
- Example: A chat in xpp-agent shows no reminder line, although D-0004 to D-0007 wait in the agent repo's register.
- Options: The reminder always shows the agent repo's register too. Leave it: open a chat in the agent repo to see them.
- Recommendation: Always show the agent repo's register too
- Meanwhile: The main session lists them in its replies by hand.
- Evidence: orchestrate-agents/hooks/decision-reminder.mjs
- Final answer: 2026-10-25 22:05: "I ACCEPT ALL but D-0004"
- Resolved: 2026-10-25 22:05, accepted

## D-4 · initiative · not-blocking
- Raised: 2026-10-25 18:54 by run G worker
- Task: agent-team stage 1, run G
- What: Run G's own choices: a new WORKER STOPPED line, the hand-off as a ## Hand-off section in the agent's own file, a short text for helper agents, the old stop message kept as a fallback
- Example: A worker that hears STOP FOR LIMIT adds ## Hand-off at the end of its progress file and ends with WORKER STOPPED | W3 | hand-off: <progress file>.
- Options: Accept. Change one of them.
- Recommendation: Accept
- Meanwhile: Built and tested this way.
- Evidence: misc/implementation/agent-team/stage-1/G_REPORT_CLAUDE.md, DECISIONS TAKEN
- Final answer: 2026-10-25 22:18: "1, 2, 3 and 8 accepted. 4. Well if the helper fials thats no good, main agent needs to be informed thatt it failed instead of having a fallback. Maybe use the fallback after the main agent knows that helper failed. 5. yeah 5 is good 6. 15mins? no lets not have a limit here. 7. Same as point 4"
- Resolved: 2026-10-25 22:18, answered

## D-9 · initiative · not-blocking
- Raised: 2026-10-25 23:13 by run K worker
- Task: agent-team stage 1, run K
- What: The main chat learns of a helper failure by reading the helper's existing log file, not over the pipe alone
- Example: A worker's hook gets a broken answer at 14:12 and writes "error for agent W3" in limit-stop.log; at the main chat's next step its hook reads that line and says LIMIT STOP SERVER FAILED.
- Options: Accept: the log already exists and is not a stop signal. Change: find failures over the pipe only, which cannot report an error an agent saw.
- Recommendation: Accept
- Meanwhile: Built this way in runs K and K2.
- Evidence: misc/implementation/agent-team/stage-1/K_REPORT_CLAUDE.md, DECISIONS TAKEN
- Final answer: 2026-10-26 11:36: "sounds good"
- Resolved: 2026-10-26 11:36, accepted

## D-10 · question · blocking
- Urgency: high
- Raised: 2026-10-26 12:03 by main session (test of the decisions pane)
- Task: TEST: decisions pane, 2026-10-26
- What: TEST. Should a rejected invoice be retried?
- Example: Invoice 1001 for 250.00 PLN was rejected at 10:02 because the tax service timed out.
- Options: A: retry once after 5 minutes (1 hour of work). B: leave it for you to resend (none).
- Recommendation: A, because 9 of the last 10 rejections were timeouts.
- Meanwhile: Rejected invoices wait in the error list.
- Evidence: none: test entry
- Final answer: 2026-10-26 12:38: "Agreed with the recommendation, no comments."
- Resolved: 2026-10-26 13:30, answered

## D-10-1 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-26 12:03 by main session (test of the decisions pane)
- Task: TEST: decisions pane, 2026-10-26
- What: TEST. A retried invoice can be sent twice if the first try was only slow, not lost.
- Example: Invoice 1001 is accepted at 10:06 after a slow reply; the retry at 10:07 sends it again and the tax office rejects it as a duplicate.
- Options: A: check the tax office for the invoice before retrying (2 hours). B: accept the rare duplicate rejection (none).
- Recommendation: A, because a duplicate rejection looks like a real error to the accountant.
- Meanwhile: Work continues assuming A.
- Evidence: none: test entry
- Final answer: 2026-10-26 12:38: "Agreed with the recommendation, no comments."
- Resolved: 2026-10-26 13:30, answered

## D-11 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 12:03 by main session (test of the decisions pane)
- Task: TEST: decisions pane, 2026-10-26
- What: TEST. The worker added a log line for every retry.
- Example: "10:07 retry 1 of invoice 1001: accepted".
- Options: Accept. Remove it.
- Recommendation: Accept
- Meanwhile: Built this way.
- Evidence: none: test entry
- Final answer: 2026-10-26 14:06: "Agreed with the recommendation, no comments."
- Resolved: 2026-10-26 14:22, accepted

## D-12 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-26 12:03 by main session (test of the decisions pane)
- Task: TEST: decisions pane, 2026-10-26
- What: TEST. What should the error list be called on the menu?
- Example: Today it shows as "Import errors"; the accountants call it "the rejects".
- Options: Your own name for it.
- Recommendation: Rejected invoices
- Meanwhile: It keeps the name Import errors.
- Evidence: none: test entry
- Final answer: 2026-10-26 14:06: "Agreed with the recommendation, no comments."
- Resolved: 2026-10-26 14:22, accepted

## D-13 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-26 13:56 by main session
- Task: Decisions out of the chat, 2026-10-26
- What: An answer you submit in the Decisions pane wakes nobody. The main session sees it only when you next type in the chat, so a lead waiting on that answer stays stopped until then.
- Example: A lead stops on blocking D-14 at 10:00. You answer it in the pane at 10:05 and type nothing. At 11:00 the lead is still waiting.
- Options: A: make the session watch end when an answer arrives, which wakes the idle main session to pass it on (about one worker run, with tests). B: leave it; after answering in the pane, type any short message in the chat (no work, easy to forget).
- Recommendation: A, because the pane is meant to replace the chat for answers, and with B a blocking answer can sit unseen for hours.
- Meanwhile: Answers are processed at your next chat message.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\decision-reminder.mjs (runs only when you send a prompt), C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-session.ps1 (never reads the register)
- Final answer: 2026-10-26 14:20: "Other: lets add another watch process, which will handle new asnwwered decisosn everu 15mins (configurable), the answered decision should be passed to the orchestroaotr agent/ main agent and then deleted so that the watch doesnt  process the same answerwerd decisiosn 15misn later"
- Resolved: 2026-10-26 14:22, answered

## D-14 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-26 13:56 by main session
- Task: Decisions out of the chat, 2026-10-26
- What: A chat in another repo is told about blocking entries of the agent team's register, but its Decisions pane shows only that repo's own register. Now that the chat no longer writes decisions out, you cannot read or answer such an entry from that chat.
- Example: You work in xpp-agent. Agent-team entry D-15 blocks. The xpp-agent chat says "D-15 waits, please answer it", but its pane shows only xpp-agent's entries.
- Options: A: let the pane also show the registers listed in register.showInEveryChat, marked with their repo (one run in claude-code-extensions). B: in that case the chat says to open a chat in the agent repo to answer it (one line in the rules).
- Recommendation: A, because then one pane holds everything the chat may ask you about.
- Meanwhile: The chat names the entry and says which repo's chat shows it.
- Evidence: C:\Repos\My projects\claude-code-extensions\decisions-pane\README.md (What it lists: only the chat's own repo)
- Final answer: 2026-10-26 14:19: "Other: No, no decisions should leak between repos, thats definative, i dont know why you designed that other repos see decisiosn of other repos"
- Resolved: 2026-10-26 14:25, answered

## D-13-1 · question · blocking
- Urgency: high
- Raised: 2026-10-26 14:22 by main session
- Task: Answer watch (D-13), 2026-10-26
- What: Your design deletes an answer once the watch hands it to the main session. But closing an entry needs that answer: the register refuses to close an entry without one, and the closed record is where your words are kept.
- Example: You answer D-20 with "A, retry once" at 10:05. At 10:15 the watch hands it over and deletes it. At 10:16 the main session tries to close D-20 and the register refuses: "no answer". Your "A, retry once" is gone from the record.
- Options: A: instead of deleting, the watch moves the answer into the entry itself and marks it "handed to the main session at 10:15". It is never handed over twice, and the record keeps your words (a small change to the register script as well). B: delete it as you said, and change closing so it no longer needs the answer (closed entries no longer show what you answered).
- Recommendation: A, because it does what you asked, each answer handed over once, without losing your words from the record.
- Meanwhile: Nothing of D-13 is built until you answer.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\decision-register.mjs (closeEntry, lines 358-395: refuses an entry with no answer in the answered file)
- Follow up: Your question first: no new decision is created for a follow-up. If you answer "explain further", the agent keeps this same entry open: it comes back here with your answer and a Still open line holding the explanation. Only a separate new question becomes a new entry, shown as a child (for example D-13-1-1, "follows D-13-1"). Option A fits this: the watch hands your answer over once, and the agent then closes the entry or sends it back to you like this one. Still to choose: A or B above.
- Final answer: 2026-10-26 14:47: "Other: i have a btter idea, lets create a answers log, so the answers dont fill up the actual decisions, the agent should be able to search for the answers log easily, so maybe lets not use a .md file, with that said the resolved decisiosn should still have a resolution summary with the final asnwer"
- Resolved: 2026-10-26 14:59, answered

## D-15 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-26 14:39 by main session
- Task: Decisions out of the chat, 2026-10-26
- What: When you answer "explain further", the only place for the explanation is the entry's Still open line: one paragraph, with no room for an example or new options, and the original What and Options cannot be changed.
- Example: You answer "explain further" on a VAT rounding question. The agent can add one paragraph under it, but cannot add a worked example of a 3-line invoice or a third option it found while explaining.
- Options: A: let an agent add an Explained block to an open entry (several lines, its own example, extra options), shown in the pane above the Still open line (one run: register script plus the pane). B: keep the one Still open paragraph and, when more is needed, raise a child entry with the full explanation (no work).
- Recommendation: A, because then the whole conversation about one decision stays in one place in the pane.
- Meanwhile: Explanations go into the Still open line; anything longer becomes a child entry.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\decision-register.mjs (keepEntryOpen: adds only the answers and one Still open line)
- Final answer: 2026-10-26 15:14: "Other: we agrred that the stiection gets renamed to follow up, and the agent can add antyhign they like into the follow section, but cannot change the oriigonal options if there are any, if options have chnaged then a child decision needs to be created."
- Resolved: 2026-10-26 15:19, answered

## D-16 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-26 15:08 by main session
- Task: Answer watch (D-13), 2026-10-26
- What: You asked for every watch to be named after what it does. These are the names for the three watches, used in the script's file name and in the task list where you see it running.
- Example: Today the task list shows "Start the session watch in the background". With A it shows "Usage and context watch", and the script is watch-usage-and-context.ps1.
- Options: A: "Usage and context watch" (the main session's usage limits and context size), "Agent size and stall watch" (one helper agent's context size, and whether it has gone quiet), "Decision answers watch" (hands your new answers to the main session); files watch-usage-and-context.ps1, watch-agent-size-and-stall.ps1, watch-decision-answers.ps1. B: shorter: "Limits watch", "Agent watch", "Answers watch"; files watch-limits.ps1, watch-agent.ps1, watch-answers.ps1.
- Recommendation: A, because each name says what the watch looks at, so you can tell them apart in the task list without opening anything.
- Meanwhile: The lead builds the new watch as "Decision answers watch" and renames the other two the A way in the same task; other names later are a search and replace.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-session.ps1 and watch-agent.ps1 (their headers say what each watches)
- Final answer: 2026-10-26 15:14: "Chose A: "Usage and context watch" (the main session's usage limits and context size), "Agent size and stall watch" (one helper agent's context size, and whether it has gone quiet), "Decision answers watch" (hands your new answers to the main session); files watch-usage-and-context.ps1, watch-agent-size-and-stall.ps1, watch-decision-answers.ps1."
- Resolved: 2026-10-26 15:19, answered

## D-17 · initiative · not-blocking
- Urgency: medium
- Raised: 2026-10-26 15:10 by lead answers log (planning, before run 1)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: Your answers get a log of their own: decisions\ANSWERS_LOG_CLAUDE.jsonl, one line per answer, holding the decision's id, when you answered, your exact words, and when it was handed to the main session and dealt with. The separate answered file goes away; anything waiting in it moves into the log. A closed decision then shows two lines instead of all your answers: your final answer, copied word for word by the script, and a short summary written by the agent that closed it. When an agent sends a decision back to you for more discussion, it adds a 'Follow up' line with the time.
- Example: You answer D-20 'explain further' at 10:05, then 'A, retry once' at 10:40. The log holds both answers. Closed D-20 shows: Final answer 10:40 "A, retry once"; Summary: a rejected invoice is retried once, built in run 3.
- Options: A: build it this way (part of this task, no extra cost). B: change a part of it, for example another file name, or no word-for-word final answer in the closed decision (say which; small change before run 1 ends).
- Recommendation: A, because every answer stays searchable in one file, the decisions stay short, and a closed decision still shows exactly what you finally said.
- Meanwhile: Run 1 builds it this way.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\ANSWERS_LOG_LEAD_CLAUDE.md (section The design, points 1 to 5)
- Final answer: 2026-10-26 15:16: "Chose A: build it this way (part of this task, no extra cost). Comment: yes and the answers log should have all asnwers, answered or unaswered etc"
- Resolved: 2026-10-26 15:19, accepted

## D-18 · initiative · not-blocking
- Urgency: medium
- Raised: 2026-10-26 15:10 by lead answers log (planning, before run 1)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: Each answer you give in the Decisions pane is handed to the main session exactly once, by whichever comes first: the new decision answers watch (every 15 minutes) or your next message in the chat. An answer you type in the chat itself is recorded as already handed over, so the watch never brings it back a second time.
- Example: You answer D-20 in the pane at 10:05 and type 'how is it going?' in the chat at 10:07. The main session gets D-20's answer with your 10:07 message; the watch looks at 10:15, finds nothing new, and keeps waiting.
- Options: A: both hand answers over, the first one wins (part of this task, no extra cost). B: only the watch hands answers over; your chat messages never do (an answer can then wait up to 15 minutes even while you are chatting).
- Recommendation: A, because an answer reaches the main session as soon as anything wakes it, and still only once.
- Meanwhile: Run 2 builds A.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\ANSWERS_LOG_LEAD_CLAUDE.md (section The design, points 6 and 7)
- Final answer: 2026-10-26 15:17: "Chose A: both hand answers over, the first one wins (part of this task, no extra cost). Comment: yes i should alos be able to answer deciosins in the main chat not only in the decisions pane"
- Resolved: 2026-10-26 15:19, accepted

## D-19 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 15:11 by lead answers log (planning, before run 1)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: When the existing registers are converted to the new layout, the answers already written inside old decisions move to the answers log. Each old closed decision keeps one line with your final answer, word for word, but gets no written summary: the agents that closed them are gone, and a summary written now would be a guess. Old 'Still open' lines become 'Follow up' lines.
- Example: Closed D-13-1 shows two answers and a Still open line today. After the conversion it shows the Follow up line and Final answer 14:47 "i have a btter idea, lets create a answers log..."; both answers are in the log.
- Options: A: convert this way (part of this task, no extra cost). B: also have the main session write a short summary for each old closed decision by hand (16 closed decisions in this repo today, one sitting of the main session).
- Recommendation: A, because your final words already say what was decided, and a summary invented afterwards could misstate it.
- Meanwhile: The conversion is built as A in run 4; the main session runs it on the real registers only after the task.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\ANSWERS_LOG_LEAD_CLAUDE.md (section The design, point 8)
- Final answer: 2026-10-26 15:18: "Chose A: convert this way (part of this task, no extra cost)."
- Resolved: 2026-10-26 15:19, accepted

## D-20 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-26 15:53 by lead answers log (worker run 1)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: One automatic test of the usage-limit stop depends on timing. It failed once while the machine was busy and passed when run again alone. It is older than this task and unrelated to it, but a test that fails at random makes every later check slower to trust.
- Example: A run of all 169 tests reports 168 passed and 1 failed ("an agent's hook error in the log is FAILED"); the same test run alone passes 30 of 30.
- Options: A: make that test independent of timing in a later run of this task (small: one test file). B: leave it; each lead re-runs it alone when it fails (no work now, a few minutes lost now and then).
- Recommendation: B for now, because it has failed once in many runs; switch to A if it fails again.
- Meanwhile: Leads re-run that test alone when it fails and report both results.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\limit-stop-server.test.mjs (the test named "an agent's hook error in the log is FAILED"), C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R1_REPORT_CLAUDE.md (section Checks)
- Final answer: 2026-10-26 16:03: "Chose B: leave it; each lead re-runs it alone when it fails (no work now, a few minutes lost now and then)."
- Summary: The timing-dependent limit-stop test is left as it is; when it fails, a lead re-runs it alone and reports both results. Final answer: B, leave it.
- Resolved: 2026-10-26 16:03, accepted

## D-21 · question · not-blocking
- Urgency: high
- Raised: 2026-10-26 16:50 by main session
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: The build is slow: 2 of 8 steps done in 1 hour 40 minutes, so about 3 to 4 more hours as planned. Steps run one at a time because the machine has only about 0.5 GB of memory free, and every test run waits for room. VS Code (2.8 GB) and Claude (1.8 GB) use most of it, across three VS Code windows.
- Example: At 16:37 step 1b's tests waited for memory before they could start; step 2 started at 16:38 with 477 MB free.
- Options: A: you close the VS Code windows of xpp-agent and claude-code-extensions (and any Claude chats in them); then the pane step runs beside the others, and the last two steps (renames and docs) become one. About 1 to 1.5 hours saved. B: only merge the last two steps into one, nothing for you to do. About 20 to 30 minutes saved. C: leave the plan as it is.
- Recommendation: A, because memory is what keeps the steps in single file; without it, merging saves only one step's start-up.
- Meanwhile: The lead carries on one step at a time as planned.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\ANSWERS_LOG_LEAD_CLAUDE.md (Runs, and Runs: state)
- Final answer: 2026-10-26 17:15: "Other: i closed some of the vs code widnows, see how much memeory you have left"
- Summary: The user closed the other VS Code windows (free memory 1146 MB at 17:15, up from about 0.5 GB). The lead now runs the pane step beside the others, at most two workers at once while memory allows, and merges the renames and docs steps into one. Final answer: "i closed some of the vs code widnows, see how much memeory you have left".
- Resolved: 2026-10-26 17:15, answered

## D-22 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 18:29 by lead answers log (worker run 4, the pane)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: When a decision comes back to you, the pane now shows its history above the choices: each of your earlier answers (read from the answers log) and each Follow up, oldest first, with their line and paragraph breaks. An answer shows as 'Answered: <time>: <your words>' without quotes; a Follow up keeps its orange 'Follow up' label. If a line of the answers log cannot be read, the decision still shows, and one orange line under the summary names the unreadable line.
- Example: D-22 comes back to you. Above its choices you see: 'Answered: 10:05: explain further', then 'Follow up: 10:20: per line means each of the 3 lines is rounded...' over three lines, then your choices again.
- Options: A: keep it this way (built, no extra cost). B: change how it looks, for example quotes around your words or newest first (say what; a small pane change).
- Recommendation: A, because it reads like the conversation it was, in order, and an unreadable answer is never silently hidden.
- Meanwhile: It stays as built; the main session reloads the pane after the task.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R4_REPORT_CLAUDE.md (section What is different now)
- Final answer: 2026-10-26 18:55: "Chose A: keep it this way (built, no extra cost)."
- Summary: The pane keeps showing a returned decision's history above its choices, as built. Final answer: A, keep it this way.
- Resolved: 2026-10-26 18:58, accepted

## D-23 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-26 18:29 by lead answers log (worker run 4, the pane)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: If the pane happens to read the decisions file at the very moment an agent is rewriting it, the read fails, and the pane then shows no decisions at all until the file changes again, which can be hours. This was already so before today; the answers log is now read the same way.
- Example: A lead adds blocking D-40 at 10:00:00 and the pane reads at that same instant. The pane shows nothing. No other decision is written until 13:00, so you do not see D-40 for three hours while the chat tells you it waits.
- Options: A: after a failed read, keep showing what was there and try again at the next look, 2 seconds later (a small pane change, run beside run 5). B: leave it (it needs an unlucky moment, but then a decision can stay hidden for hours).
- Recommendation: A, because a decision you are asked to answer must never be hidden, and the change is small.
- Meanwhile: A small run fixes it beside run 5 unless you choose B.
- Evidence: C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\registers.ts (lines 173-187: a failed read becomes an empty file and is remembered until the file's time stamp changes), C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R4_REPORT_CLAUDE.md (ISSUES FOUND)
- Final answer: 2026-10-26 18:54: "Chose A: after a failed read, keep showing what was there and try again at the next look, 2 seconds later (a small pane change, run beside run 5). Comment: A and i assuem you mean a retry mechanism after a fail"
- Summary: After a failed read of the register the pane keeps showing the last list and retries at its next look, 2 seconds later, so a decision is never hidden; fixed in a small pane run beside run 5. Final answer: A, with the user's comment that it means a retry after a failure, which it does.
- Resolved: 2026-10-26 18:58, accepted

## D-25 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 18:29 by lead answers log (worker run 3, the watch)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: The main session restarts the Decision answers watch every time it ends. If the watch fails twice in a row for the same reason (for example Node cannot be found), the main session stops restarting it and tells you in one line what the watch said, instead of restarting it forever.
- Example: At 10:00 and again at 10:01 the watch ends with 'DECISION ANSWERS WATCH FAILED | node was not found'. The main session tells you that line once; your pane answers then reach it only when you next write in the chat.
- Options: A: keep this rule (written in the main session's instructions, no extra cost). B: drop it: the main session always restarts the watch, however often it fails.
- Recommendation: A, because a watch that cannot work should be reported once, not restarted in a loop that wakes the main session for nothing.
- Meanwhile: The rule stays as written.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\SKILL.md (section Starting work, step 2), C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R3_REPORT_CLAUDE.md (INITIATIVES)
- Final answer: 2026-10-26 18:57: "Chose A: keep this rule (written in the main session's instructions, no extra cost)."
- Summary: The main session stops restarting a watch that fails twice in a row for the same reason, and tells the user that line once. Final answer: A, keep this rule.
- Resolved: 2026-10-26 18:58, accepted

## D-24 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-26 18:29 by lead answers log (worker run 3, the watch)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: You decided earlier (D-0007) that a misspelled option of the team's scripts must fail instead of being ignored. It does fail for a wrong name, but PowerShell also accepts the start of a name: '-EveryMinute' is taken as '-EveryMinutes'. Nothing is ignored, the start is read as the full name, but it is not the strict refusal D-0007 describes. This holds for every PowerShell script of the team, old and new.
- Example: The main session starts the watch with '-EveryMin 5'. It runs every 5 minutes, exactly as '-EveryMinutes 5' would. With '-EveryMinits 5' (a typo) it refuses to start.
- Options: A: make every script also refuse a shortened name (one small run over all the team's PowerShell scripts and their tests). B: leave it: a shortened name always means the one option it starts, so nothing is ever silently ignored (no work).
- Recommendation: B, because D-0007's aim, never ignoring a wrong option, already holds; a shortened name cannot be mistaken.
- Meanwhile: Nothing changes.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R3_REPORT_CLAUDE.md (ISSUES FOUND), C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1 (header, line 13: 'An unknown or misspelled parameter fails before any line runs')
- Follow up: 2026-10-26 18:58: In plain words: the agents start the team's scripts with settings typed after the script's name, such as "-EveryMinutes 5" (check every 5 minutes). Earlier you decided (D-0007) that a mistyped setting must stop the script, so a typo is never silently skipped. That still works: "-EveryMinits 5" stops the script with an error. What the run found is a softer case: a setting typed only in part, such as "-EveryMin 5", is quietly read as the full "-EveryMinutes 5" and works. Nothing is skipped and nothing goes wrong; it is only less strict than D-0007's words. The question is only whether a part-typed setting should be refused too. A means yes: one small run changes every team script. B means leave it, since a part-typed setting can only ever mean the one setting it starts. Nothing breaks either way; the recommendation stays B.
- Final answer: 2026-10-26 19:16: "Chose B: leave it: a shortened name always means the one option it starts, so nothing is ever silently ignored (no work). Comment: well if the shorter name work it works thats all that matter. Also tell me in main chat what are teams scripts?"
- Summary: Shortened setting names stay accepted: a part-typed name always means the one setting it starts, and a real typo still stops the script. Nothing built. Final answer: B, leave it ("if the shorter name work it works thats all that matter").
- Resolved: 2026-10-26 19:19, accepted

## D-27 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 19:07 by lead answers log (planning run 4c, the pane)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: Two additions to your D-23 answer (retry after a failed read). First, a failed check of the decisions file's size and time is now retried too, instead of making the pane look empty for 2 seconds. Second, if the file still cannot be read after 30 seconds of retries, the pane says so in one orange line, so you know the list you see may be out of date. The line goes away at the first good read.
- Example: At 10:00:05 another program holds the decisions file locked for a minute. The pane keeps showing your 3 decisions; at 10:00:35 it adds: 'The decisions file could not be read since 10:00:05; the pane shows what it held before and keeps trying.' At 10:01:05 the file reads again and the line disappears.
- Options: A: both additions (a small pane run beside run 3b, no other cost). B: only the retry of the size check, no line about it.
- Recommendation: A, because a list that silently stops updating is the very thing D-23 was about.
- Meanwhile: Run 4c builds A.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R4B_REPORT_CLAUDE.md (ISSUES FOUND), C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R4C_TASK_CLAUDE.md
- Final answer: 2026-10-26 19:18: "Chose A: both additions (a small pane run beside run 3b, no other cost)."
- Summary: The pane also retries a failed check of the decisions file, and after 30 seconds of failed reads shows one orange line saying the list may be out of date, gone at the first good read. Final answer: A, both additions.
- Resolved: 2026-10-26 19:19, accepted

## D-26 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 19:07 by lead answers log (planning run 3b)
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: For your new rule (send all answers at once when every open decision is answered), the Decision answers watch checks every 5 seconds whether the decisions file or the answers log changed. A check only looks at the two files' size and time, which costs nearly nothing; the register itself is read only when one of them changed. The 5 seconds is a setting (lookSeconds) beside the 30 minutes (everyMinutes).
- Example: 5 decisions wait. You answer the last one at 10:03:12. By 10:03:17 the main session has all 5 answers, in your words.
- Options: A: check every 5 seconds (part of this task, no extra cost). B: another interval, for example every 2 seconds like the pane, or every minute (say which; one setting).
- Recommendation: A, because 5 seconds feels immediate after your last answer and keeps the machine quiet the rest of the time.
- Meanwhile: Run 3b builds it with 5 seconds.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R3B_TASK_CLAUDE.md (section 4)
- Follow up: 2026-10-26 19:19: Your question, what decides: the Decision answers watch itself, by one fixed rule, with no agent judging. Every 5 seconds it checks whether the decisions file or the answers log changed. When one did, it reads the register and asks two things: does any decision still wait for you, and is there at least one answer not yet handed to the main session? No decision waiting and at least one answer new: it hands all the new answers over at once, which wakes the main session. Example: D-30, D-31 and D-32 wait; you answer D-30 and D-31, so D-32 still waits and nothing is sent; you answer D-32 at 10:03:12 and by 10:03:17 the main session has all three. If a new decision arrives before you answer the last one, it is waiting too, so the watch keeps holding; your answers then go at the 30-minute mark at the latest. A decision an agent follows up (like this one) counts as waiting again. Your choice A stands and is being built; submit with nothing picked to close this.
- Final answer: 2026-10-26 19:21: "Chose A: check every 5 seconds (part of this task, no extra cost)."
- Summary: The Decision answers watch checks every 5 seconds whether the decisions file or the answers log changed; it hands all new answers over at once when no decision waits for the user and at least one answer is new, and at the 30-minute mark otherwise. Final answer: A, check every 5 seconds (confirmed after the follow-up explained what decides).
- Resolved: 2026-10-26 19:21, accepted

## D-28 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 21:47 by main session
- Task: Answers log and decision answers watch (D-13), 2026-10-26
- What: I kept the two old watch scripts (watch-session.ps1 and watch-agent.ps1) instead of deleting them. They now only pass on to the renamed watches. Chats opened before tonight still have the old instructions and start the watch by its old name; without the old file that start would fail.
- Example: A chat in xpp-agent opened at 18:00 starts watch-session.ps1 tomorrow morning: today it runs the Usage and context watch; with the file deleted it would fail and that chat would have no usage-limit watch.
- Options: A: keep them until every chat opened before 2026-10-26 21:41 is closed, then delete them (I will ask again then). B: delete them now (the old chats' watches then fail to start).
- Recommendation: A, because the files are harmless and nothing in this repo is committed yet, so a deleted file cannot be brought back.
- Meanwhile: Both stay as forwarders.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\ANSWERS_LOG_SUMMARY_CLAUDE.md (What the main session does next)
- Final answer: 2026-10-26 21:49: "Chose B: delete them now (the old chats' watches then fail to start). Comment: well every chat will be reloaded anyways so it should be fine right?"
- Summary: The two old watch scripts (watch-session.ps1 and watch-agent.ps1), which only passed on to the renamed watches, were deleted at 21:50; nothing in the repo referred to them. A chat opened before the rename starts the new names once it is reloaded, since it then reads the updated global instructions. Final answer: B, delete them now ("well every chat will be reloaded anyways so it should be fine right?" - yes).
- Resolved: 2026-10-26 21:50, accepted

## D-29 · question · blocking
- Urgency: high
- Raised: 2026-10-26 21:56 by main session
- Task: First commit and GitHub remote (JanekKosa), 2026-10-26
- What: Which email should the commits of this repo carry? Your git setup on this machine uses your work email, and this repo goes to your personal GitHub account. Every commit shows its email to anyone who can see the repo, and it is hard to change once pushed.
- Example: With A, GitHub shows the first commit as by Jan Kostienko <jan.kostienko@gmail.com> and links it to JanekKosa if that email is on the account. With B it shows jan.kostienko@fellowmind.pl.
- Options: A: your personal email, jan.kostienko@gmail.com, set for this repo only (your other repos keep the work email). B: keep the work email, jan.kostienko@fellowmind.pl, as everywhere else. C: GitHub's private no-reply address of JanekKosa (type it under Other, as shown in GitHub's email settings), so no real email is shown.
- Recommendation: A, because it is a personal repo and the work email would tie it to your employer.
- Meanwhile: Nothing is committed until you answer.
- Evidence: git config user.email in C:\Repos\My projects\software-developer-agent (jan.kostienko@fellowmind.pl, from your global git settings)
- Final answer: 2026-10-26 22:23: "Other: The JanekKosa Github, you should be logged in now, make the repo public"
- Summary: Commits of this repo carry JanekKosa's GitHub address, 167904759+JanekKosa@users.noreply.github.com (set for this repo only; the name stays Jan Kostienko), so GitHub links them to JanekKosa and shows no real email. The repo is to be public. Final answer: "The JanekKosa Github, you should be logged in now, make the repo public".
- Resolved: 2026-10-26 22:24, answered

## D-30 · initiative · not-blocking
- Urgency: medium
- Raised: 2026-10-26 21:56 by main session
- Task: First commit and GitHub remote (JanekKosa), 2026-10-26
- What: I leave the leads' file-hash lists out of the commit, through a new .gitignore line. They are lists of fingerprints of every file, taken before each build step to prove which files it changed; they mean nothing once the step is checked. Everything else is committed: the agents, the skills, the scripts, the plans and reports, and the decision register.
- Example: Tonight's build left 8 such lists in misc\implementation\agent-team\stage-2, about 2,400 lines of hashes each, 3 MB together, out of 3.9 MB for the whole repo.
- Options: A: leave them out, now and for every later stage (one .gitignore line: *_HASHES_BEFORE.csv). B: commit them like the other working files.
- Recommendation: A, because they hold no knowledge, only checksums, and would make the repo nearly four times its size.
- Meanwhile: The first commit leaves them out; they stay on disk.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\R7B_HASHES_BEFORE.csv (first lines: path and SHA-256 per file)
- Final answer: 2026-10-26 22:23: "Chose A: leave them out, now and for every later stage (one .gitignore line: *_HASHES_BEFORE.csv)."
- Summary: The leads' file-hash lists (*_HASHES_BEFORE.csv) are left out of git through .gitignore, now and in later stages; they stay on disk. Final answer: A, leave them out.
- Resolved: 2026-10-26 22:24, accepted

## D-31 · question · blocking
- Urgency: high
- Raised: 2026-10-26 22:24 by main session
- Task: First commit and GitHub remote (JanekKosa), 2026-10-26
- What: A public repo would hand out 17 skills copied from other people's GitHub projects. Most are under the MIT licence, which allows that only if the licence text and the author's copyright line go along with the copy; 15 of the 17 folders carry no licence file. One source (karpathy-guidelines) declares no licence at all, which strictly means no permission to republish.
- Example: skills\test-driven-development comes from obra/superpowers (MIT). In a public repo without obra's copyright line and the MIT text, anyone can see it was republished without the notice MIT asks for.
- Options: A: add one file, skills\THIRD_PARTY_NOTICES.md, with each source's copyright line and licence text taken from the source repos, and leave karpathy-guidelines out of the public repo (it stays on disk); the skill folders themselves stay untouched (about 15 minutes). B: keep the whole skills folder out of the public repo; it stays on disk and the agents still read it (no work, but the repo alone no longer works for anyone else). C: make the repo private instead; then nothing is republished (no work).
- Recommendation: A, because it keeps the repo complete and public while giving every author the credit their licence asks for.
- Meanwhile: Nothing is committed or pushed until you answer; the commit email and the .gitignore line are ready.
- Evidence: C:\Repos\My projects\software-developer-agent\skills\SKILLS_MANIFEST_CLAUDE.md (section What is installed: source repo and licence per skill)
- Final answer: 2026-10-26 22:28: "Other: just commit all files i will make it private, also push the C:\Repos\My projects\claude-code-extensions to remote. I have created both repos under the same names on github"
- Summary: The vendored skills stay as they are and both repos are committed whole: software-developer-agent as 10abe9f (196 files) and claude-code-extensions as b6d7deb (242 files), under JanekKosa's GitHub address. Both GitHub repos are to be private, so nothing is republished; each is pushed only once GitHub shows it private. Final answer: "just commit all files i will make it private, also push the C:\Repos\My projects\claude-code-extensions to remote. I have created both repos under the same names on github".
- Resolved: 2026-10-26 22:35, answered

## D-32 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-26 23:11 by main session
- Task: Agent team only when switched on, 2026-10-26
- What: What should an ordinary chat, one where you did not switch the agent team on, still do? Today every chat starts both watches, and in every chat the size guard starts the team's hand-over steps at 450k and the decision hook reminds about the register.
- Example: You open a chat in xpp-agent to ask how a posting works. With A it is a plain Claude Code chat: no watches in the task list, no hand-over at 450k, and if it needs a choice from you it asks in the chat. With B it is the same, except that its choices still go to the Decisions pane.
- Options: A: nothing of the team in an ordinary chat: no watches, no size or decision hooks, choices asked in the chat itself. B: as A, but choices still go to the decision register and the Decisions pane in every chat.
- Recommendation: A, because that is a chat with the team switched off; the register and the pane belong to the team's way of working.
- Meanwhile: Built as A; B would be a small change on top.
- Evidence: C:\Users\user\.claude\CLAUDE.md (section Agents: every main session starts two watches; the Decisions paragraph), C:\Users\user\.claude\settings.json (the two hooks run in every session)
- Final answer: 2026-10-26 23:12: "Chose A: nothing of the team in an ordinary chat: no watches, no size or decision hooks, choices asked in the chat itself. Comment: If i dont run the team agent, an oridnary chat is an ordinary chat with no processes etc"
- Summary: An ordinary chat gets nothing of the team: it starts no watch, the context-guard and decision hooks do nothing in a session that is not switched on (lib/agent-team.mjs), and choices are asked in the chat itself; the global instructions say so. Tests: 229 Node and 105 PowerShell pass, with new tests that an ordinary chat hears nothing and hands nothing over. Final answer: A ("If i dont run the team agent, an oridnary chat is an ordinary chat with no processes etc").
- Resolved: 2026-10-26 23:25, accepted

## D-33 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-26 23:11 by main session
- Task: Agent team only when switched on, 2026-10-26
- What: You switch the team on by typing /orchestrate-agents at the start of a chat (or asking for it in words, such as "use the agent team"). The chat then marks itself as a team chat, which wakes the two hooks for it alone, and starts its two watches. Nothing switches it off; a new chat starts switched off.
- Example: You open a chat and type "/orchestrate-agents build the invoice import". The Usage and context watch and the Decision answers watch appear in its task list, and it starts a lead. A chat opened next to it shows neither.
- Options: A: /orchestrate-agents, the skill's own name (no extra command to maintain). B: a short extra command, /team, that does the same (one small skill more).
- Recommendation: A, because one name for one thing is easier to remember than two.
- Meanwhile: Built as A.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\SKILL.md (section Starting work)
- Final answer: 2026-10-26 23:13: "Other: /software-developer-agent"
- Summary: The team is switched on per chat with /software-developer-agent (team-switch\SKILL.md, linked as ~\.claude\skills\software-developer-agent): it runs scripts\team-on.mjs, which writes the chat's marker under %TEMP%\claude-agent-team-on\, starts the two watches and loads orchestrate-agents, which no longer loads on its own. Final answer: "Other: /software-developer-agent".
- Resolved: 2026-10-26 23:25, overruled

## D-34 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-26 23:30 by main session
- Task: Agent team only when switched on, 2026-10-26
- What: The Decisions pane does not know about the switch. It is a plugin that loads in every chat, so an ordinary chat in a repo with waiting decisions still shows the Decisions tab. Nothing else of the team runs there: no watch, and the hooks stay silent.
- Example: You open an ordinary chat in this repo to ask a quick question while D-40 waits. The Decisions tab still opens with D-40; an answer you give there waits until a switched-on chat picks it up.
- Options: A: the pane shows only in a chat switched on with /software-developer-agent (one small run in claude-code-extensions: the pane checks the same marker the hooks check). B: leave it: the pane is only a view, it shows nothing when no decision waits, and answers given in it are kept until a switched-on chat passes them on (no work).
- Recommendation: A, because you asked that an ordinary chat is an ordinary chat with nothing of the team in it.
- Meanwhile: The pane shows in every chat, as today.
- Evidence: C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\registers.ts (reads the chat's repo register, with no check of the switch)
- Final answer: 2026-10-27 08:39: "Chose A: the pane shows only in a chat switched on with /software-developer-agent (one small run in claude-code-extensions: the pane checks the same marker the hooks check)."
- Summary: The Decisions pane is to show only in a chat switched on with /software-developer-agent, checking the same marker the hooks check; a task lead builds it in claude-code-extensions (task file misc\implementation\agent-team\stage-2\PANE_SWITCH_TASK_CLAUDE.md), and it goes live after the main session reloads the plugin. Final answer: A, the pane shows only in a switched-on chat.
- Resolved: 2026-10-27 08:40, accepted

## D-35 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-27 09:32 by lead pane switch (worker runs P1 and P3)
- Task: The Decisions pane only in a switched-on chat (D-34), 2026-10-27
- What: Typing /clear in a team chat turns the team off in that chat. Claude Code gives the cleared chat a new session id, and the switch-on mark belongs to the old id. So the Decisions tab closes, a comment typed in the pane but not sent is lost, and the team's two hooks stop speaking, until you type /software-developer-agent again. This was measured on the real engine. Reopening a chat from the history is not affected: it keeps its id, so a resumed team chat stays on (measured in a test run outside VS Code; not yet tried in VS Code itself).
- Example: Your team chat shows Decisions (2). You type /clear. Within 2 seconds the tab is gone and /decisions-pane answers: 'The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.' You type /software-developer-agent and the tab is back 2 seconds later.
- Options: A: keep it as it is and say it in the two guide pages and in the /software-developer-agent command's text: after /clear, type /software-developer-agent again (one short documentation run). B: carry the switch over to the new id after /clear automatically (one or two code runs in the hooks or the pane; the risk is switching on a chat you opened for something else, because the engine does not say plainly which old chat a cleared one came from). C: keep it as it is and write nothing about it.
- Recommendation: A, because /clear wipes the main chat's memory of the team's work anyway, so starting the team again is one deliberate step, and B could switch the team on where you did not want it.
- Meanwhile: Nothing waits on it. The guide pages say nothing about /clear for now; this task ends without it.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\P3_REPORT_CLAUDE.md, C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\P1_REPORT_CLAUDE.md
- Final answer: 2026-10-27 09:59: "Chose A: keep it as it is and say it in the two guide pages and in the /software-developer-agent command's text: after /clear, type /software-developer-agent again (one short documentation run)."
- Summary: Keep /clear as it is: it switches the team off in that chat. Say so in the two guide pages and in the /software-developer-agent command's text: after /clear, type /software-developer-agent again (A).
- Resolved: 2026-10-27 10:26, answered

## D-37 · question · not-blocking
- Urgency: low
- Raised: 2026-10-27 10:26 by main session (left over from the pane switch task, run P3)
- Task: The Decisions pane only in a switched-on chat (D-34), 2026-10-27
- What: Remove the leftovers of yesterday's test runs on the real engine? Run P3 started Claude Code headless (without a window) 7 times in a scratch folder to measure /clear. Claude Code kept those 7 chats as transcripts in its own projects folder, plus an empty memory folder. They hold made-up test data only, 41 KB in all. Nothing uses them. I checked ~\.claude.json at 10:25: it has no entry for that scratch folder, so the folder is the only leftover.
- Example: Your list of past chats in a new window could show 7 short chats from a folder named ...scratchpad-p3-repo that you never opened yourself.
- Options: A: delete the folder C:\Users\user\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f-scratchpad-p3-repo (one command, by the main session). B: keep it (costs nothing but 41 KB and 7 odd entries in the chat history).
- Recommendation: A, because the runs' scripts and logs are kept in the lead's scratchpad for a rerun, so the transcripts add nothing.
- Meanwhile: Nothing waits on it; the folder stays until you answer.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\PANE_SWITCH_SUMMARY_CLAUDE.md
- Final answer: 2026-10-27 10:31: "Chose A: delete the folder C:\Users\user\.claude\projects\C--Users-user-AppData-Local-Temp-claude-c--Repos-My-projects-software-developer-agent-bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f-scratchpad-p3-repo (one command, by the main session)."
- Summary: Delete the leftover transcripts of run P3's headless test runs (A). The main session deleted the folder at 10:41; ~\.claude.json had no entry for it.
- Resolved: 2026-10-27 10:31, answered

## D-36 · question · not-blocking
- Urgency: low
- Raised: 2026-10-27 10:17 by main session (the chat handed over at 09:35, answering your question)
- Task: Agent team only when switched on, 2026-10-26
- What: Where should the team's per-chat files live? Today the switched-on markers sit in Windows' general temp folder (%TEMP%\claude-agent-team-on), beside the size guard's markers (%TEMP%\claude-context-guard) and the Usage and context watch's records. Windows' temp cleanup can delete old files there, which would switch a long-running chat off without a word. Claude Code's own temp folder (%TEMP%\claude) is not a good home: Claude Code manages and cleans it itself.
- Example: A chat switched on on Monday and still open on Friday: if Disk Cleanup removes temp files older than a few days, its marker goes and the hooks and the pane fall silent in it.
- Options: A: move every team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the team's logs, ~\.claude\state\agent-team\, so all of the team's state is in one place no cleanup touches (one run: settings, hooks, scripts, the pane's copy of the rule, tests, the guide pages). B: move only the switch markers to ~\.claude\state\agent-team-on\ (a smaller run: settings, the switch, the pane's copy, tests). C: leave them in %TEMP%.
- Recommendation: A, because one folder for all of the team's state is easier to find and clean by hand, and none of it should vanish while a chat is open.
- Meanwhile: Everything stays where it is.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\orchestration.config.json (agentTeam.onFolder, contextGuard.markerFolder, limitStop.logFile, relaunch.logFile), C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\team-on.ts (the pane's copy of the marker rule)
- Follow up: 2026-10-27 10:26: I read your answer as option A, stretched to every file: everything the team writes for itself goes into one folder, C:\Users\user\.claude\state\agent-team\. That is the three folders in %TEMP% (the switch-on marks, the size guard's marks, the usage probe's folder) and the three team files already loose in C:\Users\user\.claude\state\ (usage-limits.json, relaunch.log, limit-stop.log).
  A lead starts on it now. The folder will be one setting, so another place costs one line.
  If you meant a different folder, for example one under %TEMP% such as %TEMP%\claude-agent-team\, say which. Windows' temp cleanup can empty %TEMP% while a chat is open; the .claude\state folder is never cleaned.
- Final answer: 2026-10-27 10:30: "Chose A: move every team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the team's logs, ~\.claude\state\agent-team\, so all of the team's state is in one place no cleanup touches (one run: settings, hooks, scripts, the pane's copy of the rule, tests, the guide pages). Comment: yes but create a parent dir for the developer agent, and then child dirs for each temp file type"
- Summary: Move every file the team writes for itself into one parent folder for the developer agent, %USERPROFILE%\.claude\state\software-developer-agent\, with one child folder per kind of file (A, with the user's comment "yes but create a parent dir for the developer agent, and then child dirs for each temp file type").
- Resolved: 2026-10-27 10:31, answered

## D-38 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-27 10:46 by main session (answering how to set the team up on another machine)
- Task: Agent team: works from this repo alone
- What: The agent repo is not self-contained today. The lead's and the worker's files tell Claude Code to load two skills at start that live in the xpp-agent repo, not here: machine-pitfalls (lead and worker) and report-changes (worker). On a machine without xpp-agent those two are missing. I have not checked what Claude Code does when a skill an agent asks for is missing. machine-pitfalls is about this machine only (its broken git path, its PowerShell quirks), so it is wrong on another machine anyway. report-changes is general (how to tell you what changed).
- Example: You clone only software-developer-agent on a new laptop, run install.ps1 and start a task. The worker's file still asks for machine-pitfalls and report-changes, and neither is in that laptop's skills folder.
- Options: A: the agents ask at start only for this repo's own skill (team-rules); they load report-changes and machine-pitfalls only when the machine has them, the way explain-clearly is used now (one small run: the two agent files, team-rules, the README). B: as A, but also copy report-changes into this repo so every machine has it (two copies of one skill can drift apart). C: leave it and list both skills in the README as needed (the repo keeps depending on xpp-agent).
- Recommendation: A, because it makes the repo work on its own on any machine, keeps one copy of each skill, and keeps this machine's traps where they belong.
- Meanwhile: Nothing changes on this machine: both skills are installed here, so the team works as before.
- Evidence: C:\Repos\My projects\software-developer-agent\agents\task-lead.md, C:\Repos\My projects\software-developer-agent\agents\software-developer.md, C:\Repos\My projects\software-developer-agent\README.md
- Final answer: 2026-10-27 10:47: "Other: The agent repo should have everyhting it needs to fuinction, everyhting along with the necessary extensions"
- Summary: The agent repo must hold everything the team needs to work, on any machine: the skills it loads and the Claude Code extensions it uses (the Decisions pane), so cloning it and installing it is enough (the user: "The agent repo should have everyhting it needs to fuinction, everyhting along with the necessary extensions"). A lead plans it and registers the choices inside it as their own entries.
- Resolved: 2026-10-27 10:47, answered

## D-39 · initiative · not-blocking
- Urgency: medium
- Raised: 2026-10-27 10:50 by lead state folder (planning, before worker run S1)
- Task: The team's state in one folder (D-36), 2026-10-27
- What: I chose the names of the child folders inside the new team folder, and a few files that stay outside it. (1) The parent folder is C:\Users\user\.claude\state\software-developer-agent, set in one line of the team's settings. Inside it, one folder per kind of file: team-on (one mark per chat you switched on), context-guard (the size warnings already sent to each agent), usage-reading (the last usage reading), usage-probe (the empty folder the usage check runs in), usage-watch (the Usage and context watch's own records), heavy-commands (who holds the one slot for builds and test runs), logs (relaunch.log and limit-stop.log). The three files now loose in C:\Users\user\.claude\state move into usage-reading and logs. (2) These stay where they are: the decision register's lock file, which must sit beside the register in each repo, and the half-written copy each safe save makes for a moment beside the file it replaces; the in-memory lock behind the build slot (no file); the folders the test suites make and delete in the temp folder; and Claude Code's own files, including mcp-discover-verdicts.json, which another tool writes. (3) After the switch-over, the old copies in the temp folder and in C:\Users\user\.claude\state are deleted, but only where the new copy is identical.
- Example: Today a switched-on chat has its mark at %TEMP%\claude-agent-team-on\56c67d3d-..., and the usage reading is C:\Users\user\.claude\state\usage-limits.json. Afterwards they are ...\state\software-developer-agent\team-on\56c67d3d-... and ...\state\software-developer-agent\usage-reading\usage-limits.json. To put everything somewhere else later you change one line.
- Options: A: keep these names and this split (no extra work). B: rename some of the child folders; say which (a few minutes now, before the switch-over). C: move one of the files I kept outside into the folder as well; say which (one more small run, and for the register's lock it would break the lock's job).
- Recommendation: A, because each name says what is inside, and each file kept outside has to sit where it is to do its job.
- Meanwhile: Work goes on with these names. Renaming one later is one line in the settings and a few words in the guide pages.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_LEAD_CLAUDE.md, C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md
- Follow up: 2026-10-27 10:52: About your question: the parent folder is in C:\Users\user\.claude\state, not in %TEMP%, because D-36's option A put it there ("one folder ... no cleanup touches"), and you chose A with your comment about a parent folder and child folders.
  %TEMP% works too: it is one line in the settings, so the parent would be %TEMP%\software-developer-agent\ with the same child folders.
  The cost of %TEMP%: on this PC Windows' Storage Sense is on, and it deletes temp files that no app holds open whenever the disk runs low (checked at 10:52). The switch-on mark of a chat is such a file. If it goes while the chat is open, the team falls silent in that chat without a word, and the size warnings, the usage reading and the logs go with it.
  So please say which you want: keep C:\Users\user\.claude\state\software-developer-agent\ (my recommendation), or %TEMP%\software-developer-agent\. The names of the child folders in this entry stay the same in either place.
- Final answer: 2026-10-27 11:00: "Chose A: keep these names and this split (no extra work)."
- Summary: Keep the proposed child folder names and split (A): the parent stays C:\Users\user\.claude\state\software-developer-agent\ as proposed in the entry (not %TEMP%, which Storage Sense can clean), with team-on, context-guard, usage-reading, usage-probe, usage-watch, heavy-commands and logs inside; the register's lock, safe-save temp copies, test folders and Claude Code's own files stay where they are; old copies are deleted after the switch-over only where identical.
- Resolved: 2026-10-27 11:01, accepted

## D-41 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: The lead and the worker load a notes skill, machine-pitfalls, when they start. It lives in the xpp-agent repo and holds the traps found on this PC. You said: "yeah but the agent will run on different pcs". About half of the notes hold on any Windows PC (PowerShell ignores letter case in variable names; moving a folder that holds folder links empties the link targets; how Claude Code agents behave). The other half is true only here (the broken git.exe, no Python, VS Code running out of memory on this PC's 7.8 GB).
- Example: On a new laptop with B, the worker still knows that moving a folder with links in it empties them, because that is true there too. It is no longer told to avoid C:\Program Files\Git\cmd\git.exe, which is broken only on this PC.
- Options: A: the repo carries only the habit: at start, load this PC's own notes if it has them, and add each new trap to them. Each PC keeps its notes outside the repo; install.ps1 creates an empty notes skill on a PC that has none (one small run; a new PC starts knowing no traps). B: as A, and the traps that hold on any Windows PC move into the repo as a team skill; only this PC's own traps stay in its notes outside the repo (one run that sorts about 30 KB of notes in two; a new PC starts with the general traps). C: copy the whole skill into the repo (no sorting; every PC is told this PC's facts, some of them wrong there, such as the git path).
- Recommendation: B, because the general traps took hours to find here and hold on every Windows PC, while A's habit keeps each PC's own facts out of the repo.
- Meanwhile: Nothing changes on this PC until the run; the notes keep loading as now. Work goes on assuming B.
- Evidence: C:\Repos\My projects\xpp-agent\Docs\Skills\machine-pitfalls\SKILL.md, C:\Repos\My projects\software-developer-agent\agents\task-lead.md, C:\Repos\My projects\software-developer-agent\agents\software-developer.md
- Final answer: 2026-10-27 11:07: "Chose B: as A, and the traps that hold on any Windows PC move into the repo as a team skill; only this PC's own traps stay in its notes outside the repo (one run that sorts about 30 KB of notes in two; a new PC starts with the general traps)."
- Summary: Machine notes: the traps that hold on any Windows PC move into the agent repo as a team skill; only this PC's own traps stay in its notes outside the repo, and the agents keep the habit of reading a PC's own notes and adding to them (B, "Chose B: as A, and the traps that hold on any Windows PC move into the repo as a team skill; only this PC's own traps stay in its notes outside the repo").
- Resolved: 2026-10-27 11:08, answered

## D-42 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: The worker loads report-changes when it starts (how to tell you what changed), and report-changes tells it to load explain-clearly too (how to explain in plain words, with a template for explainer pages). Both live in the xpp-agent repo, neither is about X++, and every chat on this PC uses them through links. For the agent repo to be complete they must be in it, moved or copied.
- Example: With either option, the worker on a new laptop with only this repo loads both. With A, a later fix to explain-clearly is made once, here. With B it must be made in both repos, or the two copies start to differ.
- Options: A: move them here: this repo is their only home, the links on this PC point here, and xpp-agent no longer holds them (one run, then the main session re-points four links: the two skills in Claude's and in Copilot's skills folders). B: copy them here and keep xpp-agent's copies (the same run; two copies that drift apart unless someone keeps them in step by hand).
- Recommendation: A, because they are general skills, so their home is the general agent repo, and one copy cannot drift.
- Meanwhile: Work goes on assuming A. Bringing them in is the same for both options; only the last step, removing them from xpp-agent, differs, and that step is the main session's.
- Evidence: C:\Repos\My projects\xpp-agent\Docs\Skills\report-changes\SKILL.md, C:\Repos\My projects\xpp-agent\Docs\Skills\explain-clearly\SKILL.md, C:\Repos\My projects\software-developer-agent\agents\software-developer.md
- Final answer: 2026-10-27 11:08: "Chose A: move them here: this repo is their only home, the links on this PC point here, and xpp-agent no longer holds them (one run, then the main session re-points four links: the two skills in Claude's and in Copilot's skills folders). Comment: yes the skills you mentioned need to be global skills for claude code, not repo specific"
- Summary: Move report-changes and explain-clearly into the agent repo as their only home; they stay global skills for Claude Code, linked from this PC's skills folders (Claude's and Copilot's) to the repo, and xpp-agent no longer holds them (A, with the user's comment "yes the skills you mentioned need to be global skills for claude code, not repo specific").
- Resolved: 2026-10-27 11:10, answered

## D-44 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: The Decisions pane, where you read and answer these entries, lives in the claude-code-extensions repo, and this PC installs it from that folder. Only the team uses it. For the agent repo to be complete the pane must be in it, moved or copied, and this repo becomes the place Claude Code installs it from.
- Example: On a new laptop you clone only software-developer-agent and run install: the Decisions pane appears in the chat, with no claude-code-extensions on that laptop.
- Options: A: move it here: one copy, its tests run here, and claude-code-extensions no longer lists it (one run here; then the main session switches this PC to install it from this repo and removes the old copy). B: copy it here and keep the one in claude-code-extensions (the same run; two copies that drift, and each PC must switch on only one of them).
- Recommendation: A, because only the team uses it, so this repo is its natural single home.
- Meanwhile: Work goes on assuming A. Bringing it in is the same for both options; this PC keeps the current pane until the main session switches it.
- Evidence: C:\Repos\My projects\claude-code-extensions\decisions-pane\README.md, C:\Repos\My projects\claude-code-extensions\.claude-plugin\marketplace.json
- Final answer: 2026-10-27 11:09: "Chose A: move it here: one copy, its tests run here, and claude-code-extensions no longer lists it (one run here; then the main session switches this PC to install it from this repo and removes the old copy). Comment: yes the extensiosn specific to this agent need to be wihtin this agent dir, and on init extensiosn need to be installed/ ran"
- Summary: Move the Decisions pane into the agent repo as its only copy, with its tests; claude-code-extensions no longer lists it, and this PC installs it from the agent repo. The install of the agent repo also installs its extensions (A, with the user's comment "yes the extensiosn specific to this agent need to be wihtin this agent dir, and on init extensiosn need to be installed/ ran").
- Resolved: 2026-10-27 11:10, answered

## D-46 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: Today install.ps1 only makes the folder links. Five entries in Claude Code's settings file are added by hand: the two team hooks (the size warning and the decision reminder), the switch that stops Claude Code carrying on by itself at the usage limit, and the two lines that tell Claude Code where the Decisions pane is and switch it on. The README says the install leaves the settings alone on purpose. On a new PC the team does not work until those five are there.
- Example: With A, a new laptop needs: clone, run install.ps1, restart VS Code. With C, the same plus copying five entries from the README into the settings file by hand, where one typo silences a hook.
- Options: A: install.ps1 adds exactly these five, keeps everything else in the file, saves a backup first, shows what it would change when run with -WhatIf, and changes nothing on a second run (part of one run). B: install.ps1 only checks the settings and prints the exact entries that are missing, for you to paste (part of one run). C: as now: the README lists them (no cost).
- Recommendation: A, because the goal is clone, install and it works, and the backup and -WhatIf keep the settings file safe. On this PC the main session decides whether to run it.
- Meanwhile: Work goes on assuming A. No worker writes to this PC's settings: the tests use a scratch copy.
- Evidence: C:\Repos\My projects\software-developer-agent\README.md, C:\Repos\My projects\software-developer-agent\scripts\install.ps1
- Final answer: 2026-10-27 11:11: "Other: the init script, and that is what it should be called needs to do all the steps that are required to run this agent, meaning any task that dont need an LLM, the script needs to perform."
- Summary: The install script is renamed to init and does every step needed to run the agent that does not need an LLM: links, settings entries, extensions, the per-PC settings file and the checks ("the init script, and that is what it should be called needs to do all the steps that are required to run this agent, meaning any task that dont need an LLM, the script needs to perform").
- Resolved: 2026-10-27 11:18, answered

## D-47 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: About 160 lines in 26 files of the repo name this PC's folders, mostly C:\Repos\My projects\software-developer-agent: the lead's and the worker's files, the team's skill, the tests and the two guide pages. One setting also says your own repos are the ones under C:\Repos\My projects (those commit the register; other repos keep it out of git). Cloned anywhere else, those lines point at nothing.
- Example: You clone it to D:\code\software-developer-agent on a laptop. With A the team works. With B the lead's instructions still send it to C:\Repos\My projects\software-developer-agent\orchestrate-agents, which is not there.
- Options: A: it works from any folder: files reach the scripts through the links install.ps1 makes, which are the same on every PC (such as ~\.claude\skills\orchestrate-agents), and each PC's own values, such as where your own repos are, go into one settings file per PC that install.ps1 creates and git ignores (one run over about 26 files). B: it must be cloned at C:\Repos\My projects\software-developer-agent on every PC, and the README says so (no cost; fails on a PC where that folder cannot be used).
- Recommendation: A, because the agent will run on different PCs, and the links make the paths the same on all of them.
- Meanwhile: Work goes on assuming A.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\orchestration.config.json, C:\Repos\My projects\software-developer-agent\agents\task-lead.md
- Final answer: 2026-10-27 11:12: "Chose A: it works from any folder: files reach the scripts through the links install.ps1 makes, which are the same on every PC (such as ~\.claude\skills\orchestrate-agents), and each PC's own values, such as where your own repos are, go into one settings file per PC that install.ps1 creates and git ignores (one run over about 26 files)."
- Summary: The repo works from any folder: files reach the scripts through the links the init script makes, and each PC's own values go into one per-PC settings file the init script creates and git ignores (A).
- Resolved: 2026-10-27 11:18, answered

## D-49 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: Two of the skills that would come into this public repo name clients. explain-clearly's guide for explainer pages names one client twice, the folder of that client's repo on this PC, and one of its ticket numbers. machine-pitfalls names another client's environment once. At the next push they would be public on GitHub. No password, token or customer record was found in either.
- Example: One line of explain-clearly points at a guide page in that client's repo, by the client's name and a ticket number, as the model page to copy.
- Options: A: replace them with invented names in what comes here; with a move, the original loses them too (part of the skills run). B: leave out the lines that name them (part of the skills run; the explainer-page guide loses its pointer to a model page). C: bring them in unchanged (no cost; the names become public).
- Recommendation: A, because the guides keep their examples and no client is named in public.
- Meanwhile: Work goes on assuming A; nothing is copied before the skills run.
- Evidence: C:\Repos\My projects\xpp-agent\Docs\Skills\explain-clearly\references\explainer-page.md, C:\Repos\My projects\xpp-agent\Docs\Skills\machine-pitfalls\references\files-and-links.md
- Final answer: 2026-10-27 11:12: "Chose A: replace them with invented names in what comes here; with a move, the original loses them too (part of the skills run)."
- Summary: Replace the client names in the skills that come into this public repo with invented ones; with a move, the original loses them too (A).
- Resolved: 2026-10-27 11:18, answered

## D-50 · issue · not-blocking
- Urgency: medium
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: A working file that the other lead's search wrote this morning quotes two lines with a client's name (the names of two build log files). The file sits in this public repo's working folder and is not committed yet; at the next commit it would be published. Nothing committed so far names a client.
- Example: Lines 480 and 481 of the state-folder sweep file name two log files after the client.
- Options: A: before the next commit, the main session replaces the client's name in those two lines with an invented one (a minute). B: leave that file out of the commit (it is a search result nobody needs later). C: commit it as it is (the name becomes public).
- Recommendation: A, because the file stays as a record and the name stays private.
- Meanwhile: Nothing waits on it until the next commit.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md
- Final answer: 2026-10-27 11:12: "Chose A: before the next commit, the main session replaces the client's name in those two lines with an invented one (a minute)."
- Summary: Before the next commit, the main session replaces the client's name in the two lines of the state-folder lead's search file with an invented one (A).
- Resolved: 2026-10-27 11:18, answered

## D-40 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-27 11:03 by main session (your question: customise the developer agent per project or per domain)
- Task: Agent team: customise the worker per project and per domain
- What: Customise the universal worker in three layers instead of copying it. (1) The universal worker stays one file, never copied. (2) A domain pack, kept in the agent repo (domains/<name>/), holds what every project of one kind shares: the skills to read at start, the build and test commands, and extra guardrails. Examples: d365-xpp, web-typescript, powershell-tools. (3) A project profile, one small file in the project's own repo (.claude/agent-team.json), names its domain packs and adds its own skills, checks and rules. The project wins over the domain, and the domain wins over the universal worker. The lead reads the profile and writes what applies into each worker's task file; the worker reads the listed skills by path at start, the way it reads the vendored skills now. Claude Code fixes an agent's preloaded skills in its file, so a per-project list must be read at start rather than preloaded. Today's way is the project's CLAUDE.md plus a whole worker type copied per project (xpp-agent has xpp-porter and navigator-builder), and those copies drift.
- Example: xpp-agent's profile says: domain d365-xpp, plus 'MCP server work: build with npm, test with node --test'. The d365-xpp pack makes every worker there read xpp-development and d365fo-environment and never touch the shared cloud environment. A React project's profile says only: domain web-typescript.
- Options: A: build the three layers after the self-contained repo task, by the same lead, because both change how the agents load skills (one or two worker runs); later move xpp-porter and navigator-builder onto a d365-xpp pack. B: keep today's way: the project's CLAUDE.md plus a copied worker type per project (no work; the copies keep drifting). C: project profiles only, no domain packs (smaller; projects of one kind repeat the same lines).
- Recommendation: A, because it keeps one worker, puts shared domain knowledge in one place, and lets each project add only what is its own.
- Meanwhile: Nothing changes; the self-contained repo task (D-38) goes on and will be told this may follow.
- Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\worker-rules.md, C:\Repos\My projects\xpp-agent\.claude\agents\xpp-porter.md, C:\Repos\My projects\software-developer-agent\agents\software-developer.md
- Follow up: 2026-10-27 11:08: Sorry, that was a wall of text. Here it is again, in points.
  
  What you asked for: one developer agent that can behave differently per project, or per kind of project.
  
  My idea has three layers:
  - Layer 1, the base agent. The one agent file we have today. The same in every project. Never copied.
  - Layer 2, a domain pack. A small folder in the agent repo for one kind of work, such as "D365 X++" or "web TypeScript". It lists the skills to read, how to build and test, and extra safety rules.
  - Layer 3, a project file. One small file in the project's own repo. It names the domain pack and adds what only that project needs.
  
  Example: the xpp-agent project file says "use the D365 X++ pack". So every agent there reads the X++ rules and never touches the shared cloud environment, with no special copy of the agent.
  
  The three options, in plain words:
  - A: build the three layers, after the current repo work (one or two worker runs).
  - B: change nothing. Projects keep their own copied agents, and the copies drift apart.
  - C: only layer 3, no domain packs. Smaller, but projects of the same kind repeat the same lines.
  
  I recommend A.
- Final answer: 2026-10-27 11:15: "Other: I agree but to clarify, you mean that this agent repo will have an additonal dir with domain specific skills/insreuctiosn depedning on what this agent is working? and then in a dir in each project that hs prokject specifc things that the agent can also pick up?"
- Summary: Build the per-project and per-domain customisation (A): the agent repo gets a folder of domain packs (domain skills and instructions, picked by what the agent works on), and each project gets a folder of its own project-specific things that the agent also picks up. The user agreed and described it that way: "I agree but to clarify, you mean that this agent repo will have an additonal dir with domain specific skills/insreuctiosn depedning on what this agent is working? and then in a dir in each project that hs prokject specifc things that the agent can also pick up?" Yes, that is the idea. It is built after the self-contained repo work.
- Resolved: 2026-10-27 11:18, accepted

## D-43 · question · not-blocking
- Urgency: low
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: claude-code-mods holds what was learned while writing Claude Code mods, such as the Decisions pane. The team does not need it to work: a worker reads it only when it changes the pane. It lives in the xpp-agent repo, and the other mods in claude-code-extensions (chat colours, the Agents pane, the toolbar) rely on it too.
- Example: On a new laptop with A, the team runs and the pane shows your decisions. A run that changes the pane there starts without those notes, unless that laptop has them.
- Options: A: leave it in xpp-agent; a run that changes the pane reads it when the PC has it (no cost). B: move it here with the pane (part of the pane run; the mods in claude-code-extensions then depend on this repo for it). C: copy it here (part of the pane run; two copies that drift).
- Recommendation: A, because the team works without it, and its main users are the mods in claude-code-extensions.
- Meanwhile: Work goes on assuming A; nothing changes.
- Evidence: C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md, C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\AGENT_TEAM_STAGE_2_LEAD_BRIEF_CLAUDE.md
- Final answer: 2026-10-27 11:17: "Other: ok and move the what was learend during mod building to the extenions project"
- Summary: The lessons learned while building Claude Code mods (the claude-code-mods skill) move out of xpp-agent into the claude-code-extensions project ("ok and move the what was learend during mod building to the extenions project").
- Resolved: 2026-10-27 11:18, answered

## D-45 · question · not-blocking
- Urgency: low
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: The Agents pane, which lists every agent of a chat while it runs, is the other mod switched on on this PC. It works in any chat, not only in the team's, and the team runs without it.
- Example: On a new laptop with A, the team and the Decisions pane work, but there is no live list of running agents unless claude-code-extensions is installed there as well.
- Options: A: leave it in claude-code-extensions (no cost). B: move it here too (part of the pane run; claude-code-extensions loses a mod that is not about the team). C: copy it here (part of the pane run; two copies that drift).
- Recommendation: A, because it is a general mod and the team does not need it to work.
- Meanwhile: Work goes on assuming A; nothing changes.
- Evidence: C:\Repos\My projects\claude-code-extensions\agents-pane\.claude-plugin\plugin.json, C:\Repos\My projects\claude-code-extensions\.claude-plugin\marketplace.json
- Final answer: 2026-10-27 11:17: "Chose A: leave it in claude-code-extensions (no cost)."
- Summary: The Agents pane stays in claude-code-extensions; it is not part of the team (A).
- Resolved: 2026-10-27 11:18, answered

## D-48 · question · not-blocking
- Urgency: low
- Raised: 2026-10-27 11:05 by lead self-contained (inventory)
- Task: Agent team: works from this repo alone
- What: The install and the scripts are written for Windows: folder links (junctions), PowerShell 7, Windows folders such as %TEMP%, and VS Code's code.cmd. You said the agent will run on different PCs; nothing says yet whether one of them is a Mac or a Linux machine.
- Example: With A, running install.ps1 on a Mac stops at once with "Windows only" and changes nothing. With B it installs there too.
- Options: A: Windows only: the README says so, and install.ps1 checks for Windows, Node and PowerShell 7 before it changes anything (part of one run). B: Windows, Mac and Linux (several runs over the links, the paths and every script; this PC cannot test the other two).
- Recommendation: A, unless one of your PCs is a Mac or runs Linux, because B is several runs that cannot be tested here.
- Meanwhile: Work goes on assuming A.
- Evidence: C:\Repos\My projects\software-developer-agent\scripts\install.ps1
- Final answer: 2026-10-27 11:17: "Chose A: Windows only: the README says so, and install.ps1 checks for Windows, Node and PowerShell 7 before it changes anything (part of one run)."
- Summary: Windows only: the README says so, and the init script checks for Windows, Node and PowerShell 7 before it changes anything (A).
- Resolved: 2026-10-27 11:18, answered

## D-51 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-27 11:30 by lead state folder (worker run S1)
- Task: The team's state in one folder (D-36), 2026-10-27
- What: A test run of the new code wrote 60 made-up lines into the team's real log of hand-over stops (C:\Users\user\.claude\state\limit-stop.log), between 11:05 and 11:07 today. The tests ran the old code for a moment before the new code existed, and the old code still pointed at the real log. The lines name invented chats that do not exist, so nothing acts on them, and the 841 bytes of real lines before them are unchanged. The tests now give every copy of the team a scratch folder of its own, so it cannot happen again in this task.
- Example: The log grew from 841 to 11,409 bytes. Its last 60 lines read like 'limit-stop-server: told agent ... of session 5e551000-aaaa-bbbb-cccc-000000000001', a session id no chat ever had.
- Options: A: cut the log back to its 841 real bytes during the switch-over, before it is copied into the new folder (one command, seconds; done by the main session). B: leave the 60 lines in (no effect on any chat; the log just carries some noise).
- Recommendation: A, because the log moves into the new folder anyway, and it should carry only real lines.
- Meanwhile: Nothing waits on it. The switch-over steps include A unless you choose B.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S1_REPORT_CLAUDE.md
- Final answer: 2026-10-27 11:34: "Chose A: cut the log back to its 841 real bytes during the switch-over, before it is copied into the new folder (one command, seconds; done by the main session)."
- Summary: Cut the hand-over stop log back to its 841 real bytes during the switch-over, before it is copied into the new folder; the main session does it (A).
- Resolved: 2026-10-27 11:34, answered

## D-53 · issue · not-blocking
- Urgency: low
- Raised: 2026-10-27 12:18 by lead state folder (worker run S5)
- Task: The team's state in one folder (D-36), 2026-10-27
- What: Two faults in the guide pages that were there before this task, found on the way. (1) On a phone-sized screen both pages are wider than the screen, so you scroll sideways: the files page is 1202 pixels wide and the team guide 804, against a phone's 375. The cause is old code lines and drawings that do not shrink. (2) The files page says twice that the misc\handovers folder 'does not exist yet', but it exists now.
- Example: Opened on a phone, the files page shows its first third; the rest of each wide table and drawing needs a sideways swipe.
- Options: A: correct the two 'does not exist yet' lines now and leave the width (a few minutes, within this task). B: also make both pages fit a phone screen (one short documentation run, about 20 minutes). C: leave both as they are.
- Recommendation: A, because the wrong sentence is quick to fix, and you read these pages on the desktop, where the width is fine.
- Meanwhile: Nothing waits on it. The task goes on; the fix chosen is done before the task ends.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S5_REPORT_CLAUDE.md
- Final answer: 2026-10-27 12:47: "Chose A: correct the two 'does not exist yet' lines now and leave the width (a few minutes, within this task)."
- Summary: Correct the two lines on the files page that say the misc\handovers folder does not exist yet, within this task, and leave the pages' width on a phone as it is (A).
- Resolved: 2026-10-27 12:48, answered

## D-52 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-27 12:18 by lead state folder (worker run S5)
- Task: The team's state in one folder (D-36), 2026-10-27
- What: While updating the two guide pages (the files page at the repo root, and the team guide) for the new folder and the /clear note, the worker added six things nobody asked for. (1) The folder tree drawing on the files page now shows team-switch as a fourth linked folder. (2) Both pages say under 'Still open' that reopening a chat from the history was only measured in a test run outside VS Code. (3) The files page says under 'Still open' that the files are still in the old places until the switch-over; it must come out at the switch-over. (4) The team guide has a second table for developers listing the seven child folders. (5) Both pages have an 'Updated' line in the footer. (6) The new long folder paths now wrap on a narrow screen instead of running off it.
- Example: On the files page, the tree drawing used to say three linked folders; it now says 'Four folders are linked' and shows team-switch next to orchestrate-agents.
- Options: A: keep all six (no work; note 3 is removed at the switch-over as planned). B: keep some and drop others; say which numbers (a few minutes of editing).
- Recommendation: A, because each one makes the pages truer or easier to read, and note 3 tells a reader why the new folder is still empty today.
- Meanwhile: All six stay in the pages; the switch-over steps remove note 3.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S5_REPORT_CLAUDE.md
- Follow up: 2026-10-27 12:48: Sorry, that was hard to read. Here it is plainly.
  
  While updating the two guide pages, the worker made six small extra changes you did not ask for. The question is: keep them, or drop some?
  
  The six changes:
  - 1. The folder drawing on the files page now shows four linked folders instead of three. The switch-on command's folder was missing.
  - 2. Both pages say that "reopening an old chat keeps the team on" was only tested outside VS Code.
  - 3. The files page says the team's files stay in their old places until the switch-over. This note is removed at the switch-over.
  - 4. The team guide has a small extra table listing the seven sub-folders of the new team folder.
  - 5. Both pages have an "Updated" date at the bottom.
  - 6. Long folder paths now wrap onto the next line on a narrow screen, instead of running off the edge.
  
  Your choice:
  - A: keep all six. No work.
  - B: drop some. Say which numbers.
  
  I recommend A: each one makes the pages more correct or easier to read.
- Final answer: 2026-10-27 12:57: "Chose A: keep all six (no work; note 3 is removed at the switch-over as planned)."
- Summary: Keep all six extra changes to the two guide pages; the note that the files are still in their old places is removed at the switch-over (A).
- Resolved: 2026-10-27 12:58, accepted

## D-54 · question · not-blocking
- Urgency: medium
- Raised: 2026-10-27 13:54 by lead state folder (worker run S4)
- Task: The team's state in one folder (D-36), 2026-10-27
- What: The Decisions pane can fill in only %USERPROFILE% in the team folder's setting. Claude Code lets a pane read a system variable only by a name written into its code. So if the setting ever names another variable, such as %TEMP%, the team still works but the Decisions tab stays hidden.
- Example: Today the setting is %USERPROFILE%\.claude\state\software-developer-agent, and the pane works. Changed to %TEMP%\software-developer-agent, the hooks follow, but no Decisions tab shows. A plain path with no variable, such as C:\Users\user\AppData\Local\Temp\software-developer-agent, works everywhere.
- Options:
  - A: teach the pane the usual folder variables too: TEMP, TMP, LOCALAPPDATA, APPDATA (one small run, about 20 minutes).
  - B: keep only %USERPROFILE%, and say so in a note beside the setting (one line).
- Recommendation: A, because you asked about the temp folder earlier, and with A a move there stays a one-line change.
- Meanwhile: Work goes on as B: the pane reads only %USERPROFILE%, which is what the setting uses today.
- Evidence: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_S4_REPORT_CLAUDE.md
- Final answer: 2026-10-27 14:21: "Chose - A: teach the pane the usual folder variables too: TEMP, TMP, LOCALAPPDATA, APPDATA (one small run, about 20 minutes)."
- Summary: Teach the Decisions pane the usual folder variables too (TEMP, TMP, LOCALAPPDATA, APPDATA), so moving the team folder stays a one-line change (A).
- Resolved: 2026-10-27 14:21, answered

## D-55 · initiative · not-blocking
- Urgency: low
- Raised: 2026-10-27 15:15 by lead self-contained (worker run S1)
- Task: Agent team: works from this repo alone
- What: New traps reach the notes through the main session; agents never edit the notes themselves.
  - An agent that loses time on a trap writes it in its report, marked "any Windows PC" or "this PC only".
  - The main session then adds it to windows-pitfalls (in the agent repo) or to this PC's machine-pitfalls.
- Example: A worker finds that a script fails when a folder name has a space; its report says "trap: ... (any Windows PC)", and the main session adds one line to windows-pitfalls.
- Options:
  - A: keep it: the main session adds each trap (no cost; one short step for the main session now and then).
  - B: agents add traps to the notes themselves (no main-session step; several agents may edit the same live notes at once).
- Recommendation: A, because both notes are loaded live by every agent.
  - One writer keeps them tidy and free of clashes.
- Meanwhile: Work goes on with A; it is already written into the team's shared rules.
- Evidence: C:\Repos\My projects\software-developer-agent\team-rules\SKILL.md, C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\SELF_CONTAINED_S1_REPORT_CLAUDE.md
- Final answer: 2026-10-27 15:56: "Chose A: keep it: the main session adds each trap (no cost; one short step for the main session now and then)."
- Summary: New traps reach the notes through the main session only: an agent reports a trap marked "any Windows PC" or "this PC only", and the main session adds it to windows-pitfalls (in the agent repo) or to this PC's machine-pitfalls (A, "keep it: the main session adds each trap").
- Resolved: 2026-10-27 15:57, accepted
