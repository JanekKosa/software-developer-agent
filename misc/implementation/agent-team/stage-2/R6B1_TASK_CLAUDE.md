# R6b1: SKILL.md, agents\task-lead.md and the README say what is true now

Written by the task lead, 2026-10-26 20:17. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md` (the README is one of your files).
2. This file, whole, and `<wf>\R6_FACTS_CLAUDE.md`, whole: **the facts you write from**.
3. `<orch>\SKILL.md`, whole (about 25 KB; it was patched by six runs today and must read as one text again).
4. `C:\Repos\My projects\software-developer-agent\agents\task-lead.md`: section 8 whole, and a search of the rest for
   `answered`, `Still open`, `keep-open`, `keep it open`, `session watch`, `watch-session`, `watch-agent`.
5. `<wf>\R1_REPORT_CLAUDE.md`, only its section "Shared file that needs a change" (proposed text for section 8),
   `<wf>\R5_REPORT_CLAUDE.md`, only what it proposes for `SKILL.md`, and `<wf>\R3_REPORT_CLAUDE.md`, only its
   proposed text for a hand-over.
6. `<orch>\scripts\register.mjs`: the usage comment at the top (lines 1-47), the exact commands.

Do not read: `references\` (another worker is changing them now), the scripts' code, the tests, the pane, the plans,
any transcript, the real `decisions\` files.

## 2. What it is for

Today the decision register got an answers log, follow-ups, a Decision answers watch and a conversion of old
registers, and the user named the three watches (D-16). Each run patched the one paragraph it needed. This run makes
the main session's instructions (`SKILL.md`), the task lead's (`agents\task-lead.md` section 8) and the README
whole and true again. The user's words that bind it are in the facts file; quote them where a rule rests on them.

## 3. The points

1. **`<orch>\SKILL.md`**, the whole file, against the facts:
   - "Starting work": step 1 starts the **Usage and context watch** (`watch-usage-and-context.ps1`, description
     `Usage and context watch` exactly, the name the user sees in the task list); step 2 the **Decision answers
     watch** (already there: check it against the facts: 30 minutes, the all-answered trigger, restart after each end,
     D-25's rule). Each step gives the command and the exact description side by side.
   - Every other mention of "the session watch" or of an old file name: the new display name or file name. The
     Agent size and stall watch where the agent watch is meant.
   - "The decision register": one coherent section: the three files (the log replaces the answered file); entries,
     ids and children; the commands, exactly as the usage comment has them, with the here-string rule for `--answer`,
     `--text` and `--summary`; how answers reach the main session (pane or chat, both first-class; `--handed-over` for
     a chat answer; the watch or the hook, whichever first, exactly once); the reminder hook's lines; processing an
     answer (pass the user's words to the lead; close with a summary that includes the final answer, or follow up);
     what a follow-up may and may not hold (D-15), with one tiny example; `migrate` as it is now.
   - The usage-limit and context-cap hand-over: the main session stops **both** watches it started (`TaskStop`), as
     R3's report proposes for `references\usage-limits.md` (that file is another worker's; you write only
     `SKILL.md`).
   - "Files that make it durable": the register row names the answers log.
   - Keep everything else as it is; do not shorten other sections. Keep the file's UTF-8 without BOM and LF endings.
2. **`agents\task-lead.md`** (live: linked into `~\.claude\agents`, read by every new lead; keep it universal):
   section 8's first paragraph names the three files as the facts say (start from R1's proposed text) and says a lead
   never records an answer, closes an entry or follows it up; fix any other hit of the search in item 4 of section 1.
   Change nothing else. Keep its encoding and line endings.
3. **`README.md`** (repo root): the script list names the new watch files (and `watch-decision-answers.ps1`);
   anything it says about answers or the register matches the facts. Change nothing else.

## 4. Your files, and what is not yours

Yours: `<orch>\SKILL.md`, `C:\Repos\My projects\software-developer-agent\agents\task-lead.md`,
`C:\Repos\My projects\software-developer-agent\README.md`.

Not yours (others are changing them now): everything in `<orch>\references\`; every script, test and settings file in
`<orch>` (the renames are being made there: write the new names, which the facts give, even if the files are not
there yet when you start). Not yours at all: `agents\software-developer.md` and any other agent file, the vendored
`skills\`, `decisions\`, `misc\` except your progress and report files, the pane, `C:\Users\user\.claude\CLAUDE.md`,
`~\.claude\settings.json`. If one of them needs a change, write the exact text in your report.

## 5. How to work, and the checks

- `<orch>\SKILL.md` and `agents\task-lead.md` are live. Edit a copy in a scratch folder and copy each file in once,
  finished; never leave a half-edited live file.
- **The invariant, against real material**: every command example in `SKILL.md` (each `node ... register.mjs ...`
  line and each watch start) is run as written, with `--root` (or `-Root`) pointing at a scratch repo you made with
  the real `register.mjs` (a folder with a `.git` folder; never the real `decisions\`), and does what the text says
  (exit code and effect); a watch start is run with a small `-EveryMinutes`/`-LookSeconds` and stopped by its own
  process id. Report "N of N commands work as written". Every file path the three files name exists in the repo
  (the new watch files exist once R6a has copied them in: if R6a is not done when you check, list those paths as
  pending). Report "N of N paths exist".
- **Consistency check** (instead of a mutation check, which does not fit a document): a search of your three files
  for `watch-session`, `watch-agent.ps1`, `session watch`, `ANSWERED_DECISIONS`, `answered file`, `Still open`,
  `keep it open`, `15 minutes`, `every 15`: 0 hits except where the text names an old spelling on purpose (the
  `keep-open` alias, `migrate` converting `Still open`): list each remaining hit and why. Then each numbered fact of
  the facts file: say where your files state it, or why they need not.
- No heavy command is needed (no test reads these files). Read the clock (`Get-Date`) for every time you write.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls.

## 6. Progress, report, and the end

- Progress file: `<wf>\R6B1_PROGRESS_CLAUDE.md`. Report file: `<wf>\R6B1_REPORT_CLAUDE.md`: what changed by effect
  (per file, a few lines), the invariant ("N of N commands", "N of N paths"), the consistency check, what was not
  checked and why, the files changed, the exact text for any file not yours, and the four-line report block
  (`DECISIONS TAKEN`, `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
