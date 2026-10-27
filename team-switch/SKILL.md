---
name: software-developer-agent
description: Switches the agent team on for this chat and makes this chat the team's main session (the orchestrator). Use only when the user types /software-developer-agent, never on your own, whatever the request says. It marks the chat as a team chat so the team's two hooks speak in it, starts the Usage and context watch and the Decision answers watch, and loads the orchestrate-agents skill. Without it a chat is an ordinary chat with nothing of the team running.
---

# Switch the agent team on for this chat

The user typed `/software-developer-agent`: this chat is now the agent team's main session. Without this command a
chat is an ordinary chat, with no watches and no team hooks (the user, 2026-10-26, D-32 and D-33).

`/clear` switches the team off in a chat: it gives the chat a new session id, and the switch belongs to the old one.
The Decisions tab closes and the hooks fall silent until the user types `/software-developer-agent` again (D-35).
Reopening a chat from the history keeps its id, so the team stays on there.

Do these steps in order, before anything else the user asked for in the same message.

1. **Mark the chat.** Run, with the PowerShell tool:
   `node "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\team-on.mjs"`.
   It prints `AGENT TEAM ON | session <id> | <marker>`. From now on the context-guard hook and the decision hook speak
   in this chat and in every agent it starts. If it prints `AGENT TEAM NOT ON | <why>` instead, tell the user that line
   and stop.
2. **Start the two watches**, each with the PowerShell tool, `run_in_background`, and exactly this description, which
   is its name in the user's task list:
   - `Usage and context watch`:
     `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1"`
   - `Decision answers watch`, from the chat's own repo:
     `& "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1"`
3. **Load the team's protocol**: the `orchestrate-agents` skill (or read
   `~\.claude\software-developer-agent\orchestrate-agents\SKILL.md` whole) and follow it from here. Its
   "Starting work" steps 1 and 2 are the watches you just started; carry on from step 3.
4. Tell the user in one line that the team is on, then turn to what they asked for.
