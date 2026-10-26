# R6b2: the references and guide pages say what is true now

Written by the task lead, 2026-10-26 20:17. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole, and `<wf>\R6_FACTS_CLAUDE.md`, whole: **the facts you write from**.
3. A search of `<orch>\references\` for `watch-session`, `watch-agent`, `session watch`, `Session watch`,
   `watchSession`, `ANSWERED_DECISIONS`, `answered file`, `Still open`, `keep-open`, `keep it open`, `list --answered`,
   `Decisions pane`, `register.mjs`, `answer`: then read around the hits. Read whole only the parts of
   `references\agent-team-guide.html` that describe the decision register and the watches.
4. `<wf>\R3_REPORT_CLAUDE.md`, only its proposed text for `references\usage-limits.md` (stopping the Decision
   answers watch at a hand-over).
5. `<orch>\scripts\register.mjs`: the usage comment (lines 1-47), the exact commands.
6. If you change how the guide pages look or explain, the `explain-clearly` skill's rules for an explainer page are
   the house style; keep each page's existing style and structure.

Do not read: `<orch>\SKILL.md`, `agents\`, the README beyond item 1 (another worker is changing them now), the
scripts' code, the tests, the pane, the plans, any transcript, the real `decisions\` files.

## 2. What it is for

Today the decision register got an answers log, follow-ups, a Decision answers watch and a conversion of old
registers, and the user named the three watches (D-16: "each watch within the agent should be anmed differently with
a name of what it does so that i know what each is for"). The references and the two guide pages still describe the
morning's state. This run brings them in line with the facts file.

## 3. The points

1. **`references\usage-limits.md`** and **`references\limits-and-caps-guide.html`**: the watches by their new display
   names and file names, each start with its exact description; at a usage-limit or context-cap hand-over the main
   session stops both watches it started (R3's proposed text); the settings section of the Usage and context watch
   is `usageAndContextWatch` (another worker, R6a, is renaming it from `watchSession` now; if its report says it kept
   the old key, the lead tells you). Protocol lines (`WATCH FAILED`, `LIMIT NEAR`, ...) keep their names.
2. **`references\agent-team-guide.html`**: the decision register as it is now (the facts file, "The decision
   register"): the answers log, answering in the pane or the chat, each answer handed over once by the Decision
   answers watch (30 minutes, or at once when everything is answered) or the hook, close with a Final answer and a
   Summary, follow-ups (D-15), `migrate`; the three watches with their display names. Keep the page's style; if it
   has a diagram of the flow, update it rather than adding a second one.
3. **`references\lessons.md`**, **`references\start-messages.md`** and any other file of `references\` with a hit:
   the new names; a lesson keeps its date and what was learned, only the names change.

## 4. Your files, and what is not yours

Yours: every file in `<orch>\references\`.

Not yours (others are changing them now): `<orch>\SKILL.md`, `agents\`, the repo's `README.md`, every script, test and
settings file in `<orch>`. Not yours at all: the vendored `skills\`, `decisions\`, `misc\` except your progress and
report files, the pane, `C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`. If one of them needs a change,
write the exact text in your report.

## 5. How to work, and the checks

- `<orch>\references\` is live (read by every session using the skill). Edit copies in a scratch folder and copy each
  file in once, finished. Keep each file's encoding and line endings (check before and after).
- **The invariant, against real material**: every command example in your files that runs something local and
  harmless (a `register.mjs` command, a watch start) is run as written against a scratch repo made with the real
  `register.mjs` (a folder with a `.git` folder; never the real `decisions\`), watches with small intervals and
  stopped by their own process id; report "N of N commands work as written" (list any you could not run and why,
  for example a scheduled relaunch). Every file path your files name exists (the renamed watch files exist once R6a
  has copied them in: if not yet, list those as pending); report "N of N paths exist". Each HTML page still parses:
  open it with a strict check of your choice (for example every tag you touched closed, every in-page link's target
  present) and report what you checked.
- **Consistency check** (instead of a mutation check, which does not fit a document): the search of section 1 item 3
  run again: 0 hits of the old names and terms except where a text names an old spelling on purpose (the `keep-open`
  alias, `migrate` converting old lines, a lesson's quoted error): list each remaining hit and why. Then each fact
  of the facts file that your files should carry: where they state it.
- No heavy command is needed (no test reads these files). Read the clock (`Get-Date`) for every time you write.
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. The two HTML
  pages are 35 and 40 KB: read them by the parts the search points at.

## 6. Progress, report, and the end

- Progress file: `<wf>\R6B2_PROGRESS_CLAUDE.md`. Report file: `<wf>\R6B2_REPORT_CLAUDE.md`: what changed by effect
  (per file, a few lines), the invariant, the consistency check, what was not checked and why, the files changed,
  the exact text for any file not yours, and the four-line report block (`DECISIONS TAKEN`, `INITIATIVES`,
  `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.
