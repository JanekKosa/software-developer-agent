# R1b progress: a follow-up may hold anything, and the mutation check

Worker: software-developer. Task: `R1B_TASK_CLAUDE.md`. Started 2026-10-26 15:55.

## Files I own

`<orch>` = `C:\Repos\My projects\software-developer-agent\orchestrate-agents`.

- `<orch>\lib\decision-register.mjs`
- `<orch>\scripts\register.mjs`
- `<orch>\SKILL.md` (only the section "The decision register")
- `<orch>\tests\lib\decision-register.test.mjs`
- `<orch>\tests\scripts\register.test.mjs`

Scratch: `C:\Users\user\AppData\Local\Temp\r1b-orch` (dev copy), `r1b-mut` (mutation copy), `r1b-inv` (invariant).

## Status

- 15:55 started; read task, CLAUDE.md, README, R1 report and progress (checks section), the three skills.
- Baseline: the whole repo is untracked (no commits), so `git status` proves nothing; hash list of `<orch>` taken
  instead (see below).

- 15:58 dev copy `C:\Users\user\AppData\Local\Temp\r1b-orch` made (robocopy, 39 files, no links in `<orch>`).
  Baseline hash list of `<orch>`: `C:\Users\user\AppData\Local\Temp\r1b-baseline-hashes.txt` (39 files).

## Plan (written before changing code, 15:58)

Point 1 (lib `followUpEntry` only; `register.mjs` passes `--text` through unchanged already, only its usage comment
changes):
- New helper `followUpBlock(text, stamp)`: split the text at `\r\n|\n|\r`, drop leading and trailing blank lines
  (blank = `trim() === ''`, the same test `isFilledText` uses, so "blank after dropping" = "refused today"), first
  line `- Follow up: <stamp>: <line 1>`, every further line `'  ' + line` (an empty line becomes exactly two spaces).
  Pushed as separate entry lines, so `serializeRegister` writes them in the open file's own EOL.
- Re-run check: the entry's last N lines (N = block length) must be the same block: first line matches
  `FOLLOW_UP_LINE` with the same first text line, the rest equal line by line, and the status is waiting-for-user.
  A continuation line always starts with two spaces, so a tail starting with a Follow up line is exactly the last
  block.
- Readers need no change: every field reader matches at column 0 (`startsWith('- Status: ')`, `RAISED`, `HEADING`),
  continuation lines start with two spaces; `close` copies every line but Status; `isResolvedCopyOf` compares every
  line; `migrate` looks for a Status line at column 0.
- Old tests whose expectation changes by D-15: lib "follow-up adds a Follow up line..." (text `what should 4\r\nbe?`)
  and lib "follow-up refuses a blank text..." (text `the other\nhalf`): updated to the block layout.
- Not changed: `openHeader`'s new-file description ("adds a Follow up line"): changing it would need a third
  description variant in `migrate`.
- Proof: new lib tests (layout, LF file, fields untouched by `  - Options: C` etc., re-run with several lines and a
  differing later line, close cut short with a block), one CLI test through the real script; red first.

Point 2: scratch copy `r1b-mut`, one mutant at a time on the scratch module, load check, three test files directly.

## Done

- 16:04 Point 1 built in the dev copy `r1b-orch` (not yet in `<orch>`):
  - lib: new `followUpBlock(text, stamp)` and `endsWithFollowUp(entry, block)`; `followUpEntry` pushes the block and
    uses the block check for a re-run; comments updated (module comment, `FOLLOW_UP_LINE`, `followUpEntry`).
  - `register.mjs`: three lines in the usage comment only (anything, several lines, here-string like `--answer`,
    never changes options, child entry with `"parent": "D-7"`).
  - `SKILL.md`: only the follow-up bullet of "Processing an answer".
  - Tests: lib 2 old tests updated to the block layout (`what should 4\r\nbe?`, `the other\nhalf`), blank refusal
    now also `'\r\n \n\r\t\r\n'`; 5 new lib tests (layout with leading/trailing blanks + CR/LF/CRLF + non-ASCII +
    indented line; LF file; text not fields incl. `- Options: C`, `## D-9`, `- Status:`, list/summary/openItems/
    migrate/close; re-run with several lines + later line differs + fewer lines; close cut short with a block);
    1 new CLI test (follow-up and keep-open through the real script, HOSTILE text, list and close).
  - Red: 8 failed against the old module, each for the flattened text (log `r1b-red.log`). Green: the three register
    files 74 of 74 pass (lib 43, CLI 20, hook 11) on Node v24.13.0.
- Contract other code must match (the pane, run 3): the first line `- Follow up: <yyyy-MM-dd HH:mm>: <first line>`;
  every further line of the text is `'  ' + line` (an empty line is exactly two spaces); leading/trailing blank
  (whitespace-only) lines of the text are dropped; lines in the open file's own EOL. A line at column 0 that starts
  `- ` is a field; a line starting with two spaces is a continuation of the Follow up block above it.

- 16:11 Invariant (scratchpad `invariant.mjs`, run with the dev copy's new `register.mjs --root
  C:\Users\user\AppData\Local\Temp\r1b-inv`, a folder with a plain `.git` folder): entries D-1 (target), D-2
  (answered), D-3 (open, blocking), D-4 (closed), D-1-1 (child, answered); D-1 answered, followed up with 5 lines
  (empty line, `- Options: C ...`, Polish/German/Chinese letters and an emoji), answered, followed up with one line,
  answered, closed with a summary. Result: 8 of 8 checks pass (both blocks byte for byte as hand-written expectation,
  right before the Final answer; one Options line, unchanged; summary after each follow-up equals the summary before;
  D-1's three answers stored as given), 0 differences on 25 reader calls (list in 4 scopes, answers, answers --json per
  other entry, and list --answered; exit code + stdout + stderr compared; 17 of the 25 exit 0 with text).
- 16:07 Mutation run started in background (scratchpad `mutate.mjs`, copy `C:\Users\user\AppData\Local\Temp\r1b-mut`,
  results `C:\Users\user\AppData\Local\Temp\r1b-mut-results.json`): 31 mutants (R1-1..R1-15 = run 1's 7 + 8,
  P1-1..P1-16 = point 1). Each takes 70-115 s (the three files alone: 68 s).

- 16:28 Mutation run finished: 30 of 31 caught on the first pass, each by a fitting test (results JSON above).
  Not caught: P1-16 (`migrate` takes an indented `  - Status:` text line for the entry's own Status line). Reachable
  only when the entry's own Status line is gone (hand edit, merge). Added lib test "migrate gives an entry without a
  Status line one, even when its follow-up text holds a Status line": red against P1-16 (74 pass, 1 fail: the new
  test), green against the real code (1 of 1). Final: 31 of 31 caught. The r1b-mut module was restored byte for byte
  after every mutant (checked by the runner, and hash-equal to r1b-orch's after the run).
  Mutants: R1-1 guard lets a record drop; R1-2 close does not mark processed; R1-3 follow-up does not set
  waiting-for-user; R1-4 fold duplicates on re-run; R1-5 --words case-sensitive; R1-6 close copies the first answer;
  R1-7 list --answered shows processed; R1-8 answer stores oneLine(answer); R1-9 guard allows time -> other time;
  R1-10 follow-up re-run check ignores the status; R1-11 storedLine ignores raw; R1-12 fold does not delete the file;
  R1-13 blank log lines skipped; R1-14 next id ignores log ids; R1-15 exclude lines only in add; P1-1 no indent;
  P1-2 empty line dropped; P1-3 re-run compares only the first line of the block; P1-4 re-run compares only the last
  Follow up line of the entry; P1-5 leading blanks kept; P1-6 trailing blanks kept; P1-7 lone CR no break; P1-8 only
  empty (not whitespace) lines blank at the ends; P1-9 close drops continuation lines; P1-10 indented heading starts
  an entry; P1-11 empty line written as '' not two spaces; P1-12 block pushed as one CRLF-joined line; P1-13 field
  reader takes the last indented-or-not line; P1-14 setStatus rewrites the last indented-or-not Status line; P1-15 the
  old flattening; P1-16 migrate takes an indented Status line.

- 16:30 Whole suite in the dev copy (run-heavy): 176 of 176 pass (`ran 1:09 | peak 297 MB`).
- 16:30 Copied the five files into `<orch>` in one step; each hash-equal to the dev copy; a hash list of all 39
  `<orch>` files shows exactly these five changed since the 15:55 baseline (none hard-linked, checked before).
- 16:31 Whole suite in `<orch>` (run-heavy): 176 of 176 pass, 0 fail. Last line: `HEAVY COMMAND DONE | exit 0 |
  waited 0:00 | ran 1:04 | peak 288 MB in its processes | free memory at its lowest 981 MB | slot 1 of 1`.
- 16:32 Scratch folders `r1b-orch`, `r1b-mut`, `r1b-inv` (no links) and the `r1b-*` files in TEMP deleted; 0 left.
  Nine `oa-*` test folders in TEMP (25.10 18:05 to 26.10 15:39) predate this run: not mine, left alone.
- 16:33 PowerShell here-string check (scratchpad `heredoc-check.ps1`, with `<orch>`'s `register.mjs --root
  C:\Users\user\AppData\Local\Temp\r1b-ps`, deleted after): `$text = @'...'@` holding `"no fallback"`, `$5`, a
  backtick-n, an empty line, `- Options: C`, Polish letters arrives and is written byte for byte as the block. (A
  first run said False: the Write tool had stripped the two spaces of a whitespace-only line in my script, so the line
  was empty and the register rightly wrote two spaces; my expectation of four was wrong.)

## Checks: ran in full, in part, not at all

- In full: red (8 failing) then green; the three register files in the dev copy (74, then 75 with the survivor test);
  whole suite in the dev copy (176) and in `<orch>` (176); the invariant (8 of 8, 0 differences on 25); the mutation
  check (31 of 31 caught, one after an added test); the PowerShell here-string path.
- Not at all: the pane against multi-line blocks (run 3, not mine); the real register (forbidden). No type-check
  exists (plain .mjs).
