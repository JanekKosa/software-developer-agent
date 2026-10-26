# R4 report: the Decisions pane reads the answers log and shows Follow up

Written 2026-10-26 17:57. Outcome: **done**. Both points are built and checked. Nothing is committed (the
claude-code-extensions repo has no commits yet; everything in it is untracked).

## What the user sees differently

When an agent sends an entry back, the pane now shows that entry's history above the pick list. The answers come
from the register's answers log (`decisions\ANSWERS_LOG_CLAUDE.jsonl`), the follow-ups from the entry's `Follow up`
blocks. The order is by time, and an answer comes before a follow-up of the same minute. Line breaks are kept.
Further lines are indented. An empty line shows as a gap before the next paragraph.

A real example: the scratch register built with the real `register.mjs` (section "Invariant"). Its D-1 now shows:

```
Answered: 2026-10-26 17:48: A, retry once
  but log it

Follow up: 2026-10-26 17:48: first line of the follow-up
  second line

  new paragraph after an empty line
  - Options: C
  - Status: waiting-for-agent
      indented four

Answered: 2026-10-26 17:49:   spaced
  CRLF words, Zażółć gęślą jaźń

Follow up: 2026-10-26 17:49: short second follow-up
```

- The label reads `Follow up`, the user's word (it read `Follow-up`). It is bold orange, with an empty line above and
  below.
- `- Options: C` inside a follow-up stays text. The entry keeps its own options A and B.
- Older registers still show their in-entry `Answered:` and `Still open:` lines, first and in file order. `Still open`
  shows as `Follow up`.
- A log line the pane cannot read (not JSON, or no id, time or words) is left out. Every entry still shows. One
  orange line under the summary says which lines failed, for example:
  `An answer in the answers log could not be read and is not shown: line 3 of C:\work\shop\decisions\ANSWERS_LOG_CLAUDE.jsonl.`
  It names up to 5 line numbers and counts the rest.
- No log file means no answers and no error. Only the chat's own repo's log is read. The pane never writes the log.
- A new answer in the log shows at the next poll (every 2 seconds by default), just as a change to the open file
  does.
- Submit still runs `register.mjs answer --root <repo> --id <id> --answer <words>`, with the same arguments as before.

## Checks (all run after the last change, 17:55)

| Check | Before (17:35) | After |
| --- | --- | --- |
| `claude plugin test decisions-pane` (via run-heavy) | 29 pass, 0 fail | 43 pass, 0 fail |
| `claude plugin validate decisions-pane` | passed | passed |
| Type-check (tsconfig from the API types' header) | exit 0 | exit 0 |

- RED run before the code: 30 pass, 10 fail. The 10 were the new tests, failing for the right reasons (the label,
  and the log not being read).
- Validate gives two plugin-directory warnings that do not block: LICENSE_MISSING and ICON_MISSING. The untouched
  baseline copy gives the same two.
- I used `claude.exe` 2.1.310 from the VS Code extension. The only `tsc` on the machine is TypeScript 7.0.2 in
  `claude-code-extensions\claude-toolbar\node_modules`; I ran it read-only.
- Peak memory, from run-heavy's last line: 549 MB for the final test run, 740 MB for the mutation run.

**Invariant, against real material.** Result: 0 differences on 2 waiting entries, 4 history items, 5 log records and
4 texts given to register.mjs.

- Repo A is a read-only copy of `software-developer-agent\decisions\`. It has 0 open entries and 2 log records, CRLF
  in both files.
- Repo B was built with the real `register.mjs`: 3 adds, answer, follow-up, a second answer, follow-up, and an answer
  to D-3. The follow-up text has 7 lines, an empty line, `- Options: C`, `- Status: ...` and a 4-space indent. The
  second answer has spaces, CRLF and Polish letters.
- A separate generator script, sharing no code with the pane, computed the expected result. Two things were checked
  through the pane's own reading code and through the test kit:
  - the entries the pane lists are exactly the waiting ones;
  - the history is byte-equal to the log records plus the Follow up blocks.
- Both scratch repos are deleted.

**Mutation check.** 19 of 19 caught, run in a scratch copy only. The first pass caught 16 of 19:
- M4 did not apply, because its search text also matched `byUrgency`;
- M13 and M14 survived.

I added tests R8 and D22c, then all 19 were caught. Mutants:
- the label stays Still open; the log not read; no time order; the same-minute tie reversed;
- continuation lines joined; the paragraph line dropped; `  - Options:` read as a field;
- another repo's log read; a broken line crashes the reading;
- a log-only change not noticed; `answersLogFile` ignored; the notice not drawn;
- a follow-up's first line trimmed; every id's answers shown under each entry; old lines placed after new ones;
- the paragraph gap not drawn; the label not orange; an answer's line breaks dropped; line numbers off by one.

**Not tested:**
- The pane in a live VS Code. Whether the webview draws the indent and the paragraph gap as intended is not seen; only
  the drawing tree was checked.
- I did not install, enable or reload the plugin.

## Files changed (all in `C:\Repos\My projects\claude-code-extensions\decisions-pane`)

- `hooks\decisions.ts`: reads the answers log, Follow up blocks and the history order; writes the notice text.
- `hooks\registers.ts`: `register.answersLogFile` (default `ANSWERS_LOG_CLAUDE.jsonl`); the log path beside the open
  file; the poll's stamp covers both files.
- `hooks\poll.ts`, `hooks\decision-state.ts`: a new state value `logNotice`; the shape tag moved to `decisions-3`.
- `hooks\pane.tsx`: draws the history and the notice.
- `types\index.d.ts`: `HistoryItem` replaces `EarlierLine`; `DecisionRow.history`; `logNotice`.
- `README.md`: the "What it lists" and "Answering" sections, and the Options table row.
- Tests: `tests\support\register-world.ts` (the stand-in answer now writes a log record and no answered file; it can
  write logs and Follow up blocks; new helpers read the drawing line by line), `tests\hooks\pane.test.ts` (D13
  changed, D13b, D19 to D27, D22b, D22c), and `tests\hooks\decisions.test.ts` (R7, R8).
- `.claude-plugin\plugin.json` is unchanged.

**Outside the diff:**
- The engine made an empty folder, `C:\Users\user\.claude\dev-mods\bf7022c6-e279-4ccd-81b9-ef9cadd8ee4f`, at 17:31
  when I loaded the plugin-authoring skill. I loaded it to find the type-check settings. I wrote nothing there and
  left the folder alone.
- No processes are left running. My scratch folders are deleted.

## Learned (not in the task)

- `register.mjs` changes a follow-up text before storing it: it drops leading and trailing empty lines and turns CRLF
  into line breaks. An answer is stored exactly as given.
- `follow-up` refuses with exit 2 unless the entry has an answer not yet processed. It then marks that answer
  processed.
- The real log uses CRLF line endings.

DECISIONS TAKEN: Further lines of a history item are indented 2, as in the register file, and an empty line draws as one gap (several empty lines in a row draw as one gap; the data keeps them all); the other choice was one Text with raw line breaks, which is not proven to wrap in the VS Code webview. | The notice is one orange line under the summary, naming up to 5 line numbers then "and N more"; the other choice was a line under every entry. | An answer from the log reads `Answered: <time>: <words>` with no quotes; old in-entry lines show as written. | A log line is unreadable when its id or time is missing or empty, or its words are not text; the time's format is not checked. | Every answer of the id shows, whether or not it was handed over or processed. | A Follow up with no time sorts before the timed items. | The state shape tag moved to decisions-3, so after a reload the pane drops rows stored by the old version and the poll writes them anew.
INITIATIVES: I removed `drawField`'s colour parameter, which my change left unused. | A log id with leading zeros (D-021) is read as D-21, as headings are. | New test helpers: `drawnLines`, `linesFrom` and `world.reads`. | The README Options row now names the answers log.
ISSUES FOUND: Pre-existing: a failed read of the open file is kept until the file changes; the log follows the same rule, so a passing read error hides answers until either file changes again. | Times have minute steps: an answer, a follow-up and a second answer in the same minute show as answer, answer, follow-up (this is the rule asked for). | The agent team's real register has 0 open entries today, so the real-material check covers only its 2 log records; the history check rests on the scratch register made with the real register.mjs. | When cleaning up I deleted `test-*.log` and `mutate-*.log` in the session's shared scratchpad by pattern, without listing first; every one I know of was mine. | The engine left an empty dev-mods folder (see Outside the diff).
QUESTIONS: none
