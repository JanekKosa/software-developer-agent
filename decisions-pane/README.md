# decisions-pane

A Claude Code mod that lists, in a pane above the prompt of the VS Code chat, every decision the agent team's
decision register waits for you on, and records your answer in the register. It keeps decisions out of the main
chat and shows each one the same way.

Example: the register holds D-12 (waiting for you) and D-12-1 (waiting for an agent). The pane shows one tab,
`Decisions (1)`, left of the Agents tab:

```
1 decision waits for you · 1 blocking · 1 high

╭──────────────────────────────────────────────────────────────╮
│ HIGH  D-12 · question · blocking                             │
│ Should a rejected invoice be retried?                        │
│ Example: Invoice 1001 for 250.00 PLN was rejected at 10:02 … │
│ Recommendation: A, because 9 of the last 10 rejections …     │
│ Meanwhile: Rejected invoices wait in the error list.         │
│                                                              │
│ [○] A: retry once after 5 minutes (1 hour of work).          │
│     (recommended)                                            │
│ [○] B: leave it for you to resend (none).                    │
│ [○] Other: type your own answer in the box below             │
│ [ Comments (optional)                                     ]  │
│                                                              │
│ [Submit]  Nothing picked: you agree with the recommendation… │
╰──────────────────────────────────────────────────────────────╯
```

The heading's flags are bold, each in its own colour: the urgency (HIGH red, MEDIUM orange, LOW green), the kind
(question blue, initiative purple, issue pink) and the blocking flag (blocking red, not blocking teal).

## What it lists

- Only entries of `OPEN_DECISIONS_CLAUDE.md` whose `Status:` is `waiting-for-user` (an entry with no Status line
  counts as waiting for you, as `register.mjs` reads it). Entries waiting for an agent are left out.
- Only the register of the chat's own repo is read. Registers of other repos never show: no decision leaks between
  repos (the user, 2026-10-26, D-14 in the agent team's register).
- Most urgent first (high, medium, low), blocking before not, then the register's own order.
- Each entry in a frame of its own: its urgency, its id, kind and whether it blocks work, `follows D-5` for a child entry such as D-5-12, then What, Example, Recommendation
  and Meanwhile. Task and Evidence are left out (the user, 2026-10-26).
- A field the register wrote in points (its first point on the field's line, each further point under it as
  `  - <point>`) shows its first point as before and each further point on a line of its own under it, indented,
  after `• `. The question's first point is bold, as the question always was. A field without points shows as one
  line, as before. A Follow up block's `  - ` lines are text of the follow-up, as before.
- An entry an agent sent back to you also shows its history, oldest first:
  - each answer you gave to it, `Answered: 2026-10-26 10:05: A, retry once`, read from the register's answers log
    `ANSWERS_LOG_CLAUDE.jsonl` beside the open file (the name comes from `register.answersLogFile` in the team's
    `orchestration.config.json`);
  - each `Follow up` block the agent added to the entry, `Follow up: 2026-10-26 10:20: …`, the label in orange, with
    an empty line above and below it.

  Answers and follow-ups are in time order; an answer and a follow-up of the same minute show the answer first, as
  the follow-up answers it. Line breaks are kept: each further line is indented, and an empty line in a follow-up
  shows as space before the next paragraph. A follow-up line that starts with `- ` (`- Options: C`) is text of the
  follow-up; it never changes the entry's own fields.
- An older register, not yet converted, still holds `Answered:` and `Still open:` lines inside its entries. They show
  first, in their order in the file, `Still open` under the label `Follow up`.
- Only the answers log of the chat's own repo is read, never another repo's. No log: no answers, and no error. A log
  line that is not an answer the pane can read (not JSON, or without the id, the time or the words) is left out; the
  entries all still show, and one line under the summary says which lines could not be read, such as
  `An answer in the answers log could not be read and is not shown: line 3 of C:\work\shop\decisions\ANSWERS_LOG_CLAUDE.jsonl.`
  The pane never writes the log.
- A new answer in the log, or a new follow-up in the open file, shows at the next read of the registers.
- When the open file or the log is there but cannot be read, or its size and time cannot be checked, as when an agent
  rewrites it at that moment, the pane keeps showing what it showed before (nothing, if it never read the register)
  and reads again at the next refresh. Only a file that is not there counts as gone. Example: a lead adds D-40 while
  the pane reads; D-40 shows at the next refresh (2 seconds later by default), not at the next change of the file.
- When the reads fail for 30 seconds in a row, the notice line under the summary says so, such as
  `The decisions register could not be read since 10:00:05; the pane shows what it held before and keeps trying.`
  A single failed read shows no line, and the line goes at the first read that works.
- No register folder, or nothing waiting: no tab at all.

## Answering

- **Options.** An Options line of two or more options becomes a pick list, the recommended one marked, then
  `Other`. Each option is a small button holding only its mark (○), with the option's words beside it. VS Code
  never wraps a button's label, so the words sit outside it: a long option wraps, and each further line starts
  under its first word. Pressing a mark picks it (○ becomes ◉, its words drawn full, the others faint); pressing it
  again drops the pick. The words themselves are not pressable. The mark is ◉ rather than ●, because in Segoe UI ●
  is smaller than ○ and sits lower. Lettered options (`A: … B: …`) split at each letter; any other line splits at
  each sentence (`Accept. Remove it.`). Options the register wrote as points (`- Options:`, then one `  - <option>`
  line each) give one option per point and never split at sentences: lettered (`A: …`, `1) …`) when every point
  starts with its own letter or number, numbered 1, 2, … otherwise. The Recommendation's first point marks the
  recommended one.
- **The text box** is always under the entry: comments, or your own answer while Other is picked. Enter in it sends
  nothing; only the entry's Submit button does. What you type is kept by the mod and drawn back into the box, so
  switching pane tabs or Ctrl+Tab does not lose it. VS Code (2.1.310) draws a mod's text box as a one-line field: a
  long text scrolls inside it, the box does not grow, and a newline cannot be typed.
- **Submit** records what you gave:

| You give | Words recorded |
| --- | --- |
| nothing | `Agreed with the recommendation, no comments.` |
| a comment, no pick | `Agreed with the recommendation. Comment: but log every retry` |
| option B | `Chose B: leave it for you to resend (none).` |
| option B and a comment | `Chose B: leave it for you to resend (none). Comment: only on Fridays` |
| Other and your words | `Other: retry twice, then tell me` |
| words, on an entry with no options | your words as typed |

- Other with an empty box is refused with a line under the entry; nothing is recorded.
- The answer is written by the team's own `register.mjs answer --root <repo> --id <id> --answer <words>`, so its
  lock and layout hold: the entry's status becomes `waiting-for-agent` and your words, exactly as given, become one
  record of its id in the answers log. The mod changes nothing else; the agent closes the entry, or adds a Follow up
  block and sends it back to you, where your earlier answers show above the follow-up. The entry leaves the pane at
  once. If the script fails, the entry stays with the reason under it.

## Showing and hiding it

- **Only in a chat switched on for the agent team.** `/software-developer-agent` switches the team on for one chat:
  it writes a marker named after the chat's session id,
  `%USERPROFILE%\.claude\state\software-developer-agent\team-on\<session id>`. The first part is `teamState.folder` in
  the team's `orchestration.config.json`, the folder of every file the team keeps for itself; `team-on` is
  `agentTeam.onFolder` there, a folder under it. The pane checks the same marker the team's hooks check, and only
  looks: it never writes or removes one. A marker at the old place, `%TEMP%\claude-agent-team-on\<session id>`, no
  longer counts, and neither do team settings without `teamState.folder`. In a chat without it the pane shows nothing, even when
  decisions wait: no tab, no opening by itself, and no register file is read. Example: D-12 waits in the repo's
  register; an ordinary chat shows no Decisions tab; type `/software-developer-agent` there and the tab appears at
  the next refresh (2 seconds by default), without a reload.
- The pane looks at the marker at the start and at every refresh. A marker that goes closes the pane at the next
  refresh. A look that fails for another reason than "not there" (a refused read, the team's settings caught half
  written) keeps what the pane showed, and it looks again at the next refresh. These count as not switched on, as
  they are errors for the team's own code: a session id that is not a plain id; a `teamState.folder` that is not an
  absolute path with a drive letter once its variables are filled in (a share such as `\\server\x` included); an
  `agentTeam.onFolder` that is not one or more plain names joined by `\`. The pane fills in five variables, in any
  letter case: `%USERPROFILE%`, `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%` and `%APPDATA%`. A mod may read only the
  environment variables its code names, so a `teamState.folder` naming another variable, such as `%PROGRAMDATA%`,
  counts as not switched on here although the team's own code accepts it; so does one of the five that is unset or
  empty. A plain path such as `D:\team-state` always works.
- It opens by itself when the chat starts with a decision waiting, or when one arrives. Opening at the start puts
  its tab left of the Agents tab, which opens only when the first agent starts.
- The tab shows the count, `Decisions (3)`, and the pane closes by itself when nothing waits.
- `/decisions-pane` shows or hides it. Once you close it, it stays closed until a decision it did not show arrives.
  In a chat not switched on it opens nothing and says:
  `The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.`
- A list taller than the pane scrolls.

## Installing it

The pane lives in the agent team's repository, `software-developer-agent`, beside the team's own code (it moved
there from `claude-code-extensions` on 2026-10-27). This repository's root is a marketplace named
`software-developer-agent` (`.claude-plugin\marketplace.json`), added on this machine from its folder:

```
claude plugin marketplace add "C:\Repos\My projects\software-developer-agent"
claude plugin install decisions-pane@software-developer-agent --scope user
```

## Options (`/config`)

| Option | Default | What it does |
| --- | --- | --- |
| Register script | `~/.claude/skills/orchestrate-agents/scripts/register.mjs` | The script that records answers; its `orchestration.config.json` (two folders up) names the register files, the answers log and the switch folder. |
| Node | `node` | The program that runs the script. |
| Register refresh (ms) | 2000 | How often the registers are read. At least 500. |
| Open the pane when a decision waits | on | Off: the pane opens only on `/decisions-pane`. |
| Pane height (lines) | 20 | How tall the pane asks to be above the prompt. |

## Checks

With the `claude.exe` that ships with Claude's VS Code extension:

- `claude plugin validate decisions-pane`;
- `claude plugin test decisions-pane`;
- a type-check with the `tsconfig.json` printed in the header of the mod API's types, kept outside this folder.
