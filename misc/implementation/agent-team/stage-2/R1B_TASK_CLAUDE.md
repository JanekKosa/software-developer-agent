# R1b: a follow-up may hold anything, and the mutation check of the answers log

Written by the task lead, 2026-10-26 15:52. Repo: `C:\Repos\My projects\software-developer-agent`.
`<orch>` below is `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.
`<wf>` is the working folder `C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2`.

## 1. Read this, and no more

1. `C:\Repos\My projects\software-developer-agent\CLAUDE.md` and `README.md`.
2. This file, whole.
3. `<wf>\R1_REPORT_CLAUDE.md` (what run 1 built) and `<wf>\R1_PROGRESS_CLAUDE.md` from the heading
   "Checks: ran in full, in part, not at all" to the end (the mutants run 1 prepared).
4. In `<orch>\lib\decision-register.mjs`: the module comment, `followUpEntry` (and whatever it calls to write the
   Follow up line and to detect a re-run), `loadRegister`, `makeEntry`, `serializeRegister`,
   `trimTrailingBlankLines`, `oneLine`. Find them with a search; read the rest only if a change needs it.
5. In `<orch>\scripts\register.mjs`: the usage comment and the `follow-up` / `keep-open` branches.
6. In `<orch>\tests\lib\decision-register.test.mjs` and `<orch>\tests\scripts\register.test.mjs`: the follow-up
   and keep-open tests.
7. In `<orch>\SKILL.md`: only the section "The decision register".

Do not read: the rest of `SKILL.md`, `references\`, any `.ps1` or the PowerShell tests, `context-guard.mjs`,
`limit-stop*`, the pane, the plans, the real `decisions\` files.

## 2. What it is for

Run 1 built the answers log; its follow-up writes one line (`- Follow up: <time>: <text on one line>`). The user
then decided (D-15, 2026-10-26 15:19): "we agrred that the stiection gets renamed to follow up, and the agent can
add antyhign they like into the follow section, but cannot change the oriigonal options if there are any, if
options have chnaged then a child decision needs to be created." So a follow-up may hold whatever the agent needs:
several lines, paragraphs, an example, a worked case. It never changes the entry's Options; changed options mean a
new child entry (`add` with `parent`). And run 1's mutation check was not run (its worker ran out of room): it is
this run's second point.

## 3. Point 1: a follow-up of several lines

The contract (the pane, in run 3, reads exactly this):

- `follow-up --id D-7 --text "<text>"` (and its old spelling `keep-open --still-open`) keeps the text as given,
  line breaks included (`\r\n`, `\n` or `\r` in the text all count as a break). Leading and trailing blank lines of
  the text are dropped; a text that is blank after that is refused as today.
- Written into the entry as: the first line `- Follow up: <time>: <first line of the text>`, then every further line
  of the text indented by exactly two spaces (`  <line>`). An empty line inside the text is written as a line of
  exactly two spaces, so the paragraph break survives and the entry stays one block. Lines are written in the open
  file's own line endings.
- Every reader of the register keeps reading such an entry as one entry with the continuation lines inside it:
  `list`, `summary`, `close` (the resolved copy keeps the whole Follow up block unchanged, `isResolvedCopyOf` still
  recognises a close cut short), a second `follow-up` (a re-run after a crash must still detect the block already
  written, now several lines), `migrate`.
- A field line of the entry (such as `- Options: ...`) is never written or changed by a follow-up. A continuation
  line that itself starts with `- ` after its two spaces (`  - Options: C`) is text, not a field: test that `list`,
  `close` and the open file's fields are unchanged by it.
- The usage comment of `register.mjs` and the `SKILL.md` section "The decision register" say in one or two plain
  sentences: a follow-up may hold anything the agent needs (several lines, an example) to explain, elaborate or talk
  about the decision further; it never changes the entry's options; changed options are a new child entry (`add`
  with `"parent": "D-7"`). Also say how to pass several lines: the same here-string as `--answer`. Change nothing
  else in `SKILL.md`.

## 4. Point 2: the mutation check (run 1's code and point 1's)

In a scratch copy of `<orch>` only (never mutate `<orch>`): for each mutant change only the scratch module, check it
still loads, run the register's three test files (`tests\lib\decision-register.test.mjs`,
`tests\scripts\register.test.mjs`, `tests\hooks\decision-reminder.test.mjs`), count it caught when a test fails,
restore. Mutants: the 7 in run 1's progress file, the 8 it lists as "worth adding", and at least these for point 1:
continuation lines written without the indent; an empty line inside the text dropped; the re-run check comparing
only the first line of the block. Report "N of N caught". For each mutant not caught, add the test that catches it
(red against the mutant, green against the real code) and report which.

## 5. Your files, and what is not yours

Yours: `<orch>\lib\decision-register.mjs`, `<orch>\scripts\register.mjs`, `<orch>\SKILL.md` (that one section),
`<orch>\tests\lib\decision-register.test.mjs`, `<orch>\tests\scripts\register.test.mjs`.

Not yours: everything else, in particular `decisions\*.md` and `decisions\*.jsonl` of the real register (never read
or write them), the vendored `skills\`, `agents\`, `references\`, every `.ps1`, the hook, the pane in
`C:\Repos\My projects\claude-code-extensions`, `C:\Users\user\.claude\CLAUDE.md`, `~\.claude\settings.json`.
No other agent is changing files now.

## 6. How to work, and the checks

- **`<orch>` is live** (linked into `~\.claude\skills`; the prompt hook and the pane run this code at every prompt
  and answer). Develop in a scratch copy of `<orch>` (for example `C:\Users\user\AppData\Local\Temp\r1b-orch`), run
  the whole suite there, then copy your changed files into `<orch>` in one step and run the whole suite in `<orch>`.
  Never leave a half-done edit in `<orch>`. Delete the scratch copies at the end.
- **Every heavy command** through
  `& 'C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1' -Command '<command>'`,
  from the folder the command needs, redirection inside the command, for example
  `Set-Location 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'; & '<orch>\scripts\run-heavy.ps1' -Command 'node --test *> C:\Users\user\AppData\Local\Temp\r1b-node.log'`.
  Spell the folder `C:\`, never `c:\`. Single test files may run directly (the mutation runs are three files each:
  run them directly, not through run-heavy).
- Baseline: 169 Node tests, all pass (checked by the lead at 15:52). Expect 169 plus yours, all pass. One
  timing test in `limit-stop-server.test.mjs` failed once under load in run 1 and passed alone: if it fails, re-run
  that file alone and report both results; do not change it.
- **The invariant**, touching nothing live: in a scratch repo (a folder with a `.git` folder), with the new
  `register.mjs --root <scratch>`: add an entry, answer it, follow it up with a text of 5 lines including an empty
  line, a line starting with `- Options:` and non-ASCII letters; answer again; follow up again with one line; answer;
  close with a summary. Check: the resolved entry holds both Follow up blocks byte for byte as written (indent and
  the two-space empty line), its Options line is unchanged, and `list`, `summary` and `answers` give what they gave
  before the follow-ups for every other entry ("0 differences on N").
- **Plan for your size**: warned at 320 thousand of 400 thousand tokens, after roughly 75 tool calls. Point 1 is
  small: build it in at most 25 tool calls, then start the mutation check at once; it must be done before the
  warning.
- Read the clock (`Get-Date`) for every time you write.

## 7. Progress, report, and the end

- Progress file: `<wf>\R1B_PROGRESS_CLAUDE.md`, updated after every finished point and after every 5 mutants.
- Report file: `<wf>\R1B_REPORT_CLAUDE.md`: what changed by effect, test counts before and after, the invariant,
  the mutation check ("N of N caught", the list with caught/not caught, tests added), what was not tested and why,
  files changed, peak memory from `run-heavy.ps1`'s last line, and the four-line report block (`DECISIONS TAKEN`,
  `INITIATIVES`, `ISSUES FOUND`, `QUESTIONS`).
- Your final message: the report's summary, ending with the same four lines. To ask, end with a final message that
  starts `QUESTION FOR THE LEAD |`.

## 8. Waits for the user, do not build

Nothing of this run waits for the user. Not this run's: handing answers over (`handover`, `answer --handed-over`,
the watch), the pane, `migrate`'s conversion of old entries.
