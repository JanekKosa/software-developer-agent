# Agent team stage 1, builder A second pass: report

Written 2026-10-25 09:18 by builder A (second pass). Plan of record: `AGENT_TEAM_STAGE_1_PLAN_CLAUDE.md`, sections 6
and 7. Progress file: `A2_PROGRESS_CLAUDE.md` beside this report. First-pass report: `A_REPORT_CLAUDE.md` (its new
"Second pass" section points here).

## Outcome

Partly done, by design. Six of the eight review findings held up and are fixed (1, 2, 3, 4, 6, 8). Two need a
decision by main and are not applied (5: the reminder's "title"; 7: new settings keys). The suite is 71 of 71 (it
was 65 of 65). Nothing is committed. Nothing is wired into `settings.json`.

## What is different now

- **A shared id no longer loses an item or an answer (finding 1, major).** Before: open `D-0005` (item X) and a
  different resolved `D-0005` (item Y, say after a branch merge). Then `resolve --id D-0005` deleted X, wrote the
  answer nowhere, and exited 0. Now it exits 2 and changes nothing. The message names the next free id:
  `D-0005 is also in RESOLVED_DECISIONS_CLAUDE.md for a different item ... Give the open item the next free id,
  D-0006, by editing its heading ...`. A resolved entry counts as a crash leftover only when it is the open entry's
  lines plus one `- Resolved:` line. A second rule: an id that appears twice in the open file exits 2 too, because
  it is not clear which item the user answered. The crash recovery (an identical copy in both files) still works.
- **In a client repo, the register stays out of git even when a `decisions` folder already exists (finding 2).**
  Every `add` now makes sure the exclude lines are there, under the lock, not only when it creates the folder. It
  excludes the register's own files, not the whole folder, so the client's own new files in `decisions/` stay
  visible. The five lines are `/decisions/OPEN_DECISIONS_CLAUDE.md`, `/decisions/RESOLVED_DECISIONS_CLAUDE.md`,
  `/decisions/.lock`, `/decisions/.OPEN_DECISIONS_CLAUDE.md.*.tmp` and
  `/decisions/.RESOLVED_DECISIONS_CLAUDE.md.*.tmp`. Example: the client has committed `decisions/ADR-001.md`. After
  `add`, `git status` is clean. A new `decisions/ADR-002.md` then shows as `?? decisions/ADR-002.md`. The temp-file
  name now comes from one helper, `tempFileName` in `lib/text-file.mjs`, which the writer and the exclude lines
  share, so the two cannot drift apart.
- **A mistyped `--root` is refused (finding 3).** A path that is missing or is a file gives exit 2 and
  `--root <path> is not an existing folder`. No folder is created.
- **Values that start with `-` are taken as written (finding 4).** `--answer "- go with A"` and `--file -entry.json`
  now work. So does `--answer "--root C:\x"`, which is stored as the user's words. Each option that takes a value
  takes the next argument, whatever it starts with. The script header says so.
- **Tuning the caps in `orchestration.config.json` no longer breaks tests (finding 6).** The guard tests set fixed
  test caps for `default` and `software-developer`, plus an explicit `_why` note key. The settings test checks that
  the caps are numbers, not their values.
- **The reminder test really starts in a subfolder of a repo (finding 8).** It runs `git init` on a scratch repo,
  fills the register at the repo root, sends `<repo>\src\deep` as the hook's `cwd`, and starts the hook process
  outside the repo.

## Not applied, and why

- **Finding 5: the reminder asks for "id and title", but the summary line carries ids only.** Fixing it changes
  the plan's summary format (6.2) or its instruction text (6.3). That is main's call. My recommendation: add each
  blocking item's What text, cut to 80 characters, after its id. Example: `Decision register: 2 open (1 blocking:
  D-0001 "Should a rejected invoice be retried?"; 1 question, 1 initiative); oldest D-0001 from 2026-10-25.` It
  costs about 25 tokens per blocking item on each prompt. In return, main can remind the user without opening the
  file. The other option: change the instruction to "by id" and add the open file's path. That is cheaper per
  prompt, but main then has to read the file to say what an item is about. `SKILL.md` line 97 also says "by id
  and title".
- **Finding 7: hardcoded lock, tail and marker values.** The config's keys are fixed for me. The code demands every
  key it reads, so reading a key that does not exist yet would break every command. Exact text for main to add
  (each with its `_why`):
  - under `register`: `"lockWaitSeconds": 10, "lockStaleSeconds": 60, "_whyLock": "A writer waits this long for
    the register's lock; a lock older than lockStaleSeconds belongs to a crashed writer and is broken (plan 6.2)."`
  - a new `contextGuard` block: `"transcriptTailKB": 512, "_whyTranscriptTailKB": "How much of the end of an
    agent's transcript the guard reads to find its newest usage record; 0 differences against whole-file reads on
    149 real transcripts up to 3.3 MB (2026-10-25).", "markerFolder": "claude-context-guard", "_whyMarkerFolder":
    "Folder under %TEMP% that holds one marker per agent (the last level sent) and its lock.",
    "markerLockStaleSeconds": 60, "_whyMarkerLockStaleSeconds": "A guard run's marker lock older than this belongs
    to a crashed run and is broken."`
  - Then a short follow-up pass must land in the same change: delete `LOCK_WAIT_MS` and `LOCK_STALE_MS` in
    `lib/decision-register.mjs`, and `TRANSCRIPT_TAIL_BYTES`, `MARKER_FOLDER` and `MARKER_LOCK_STALE_MS` in
    `hooks/context-guard.mjs`, and read the keys with `requireSetting`.

## Text the shared files need

- `orchestrate-agents/SKILL.md` line 94 (builder C): replace "elsewhere it is added to `.git\info\exclude`, local
  only" with "elsewhere its own files (the two registers, the lock and the temp files) are added to
  `.git\info\exclude` on every add, local only; the folder itself is not, so the repo's own files in a `decisions`
  folder stay visible to git".
- `orchestration.config.json` `_whyCommitInRepos` (main): "the folder is added to .git/info/exclude on first use"
  becomes "the register's own files are added to .git/info/exclude on every add".
- Plan 6.1 says "append `/decisions/` ... on first creation". The code now differs (see above). Plans are not
  edited, so main records this where it records corrections.

## Checks (all after the last code change, at 09:16, unless said otherwise)

- **Full suite**: `node --test --test-reporter=tap "tests/**/*.test.mjs"` from `orchestrate-agents`, with TEMP in
  the scratchpad: 71 tests, 71 pass, 0 fail, 0 skipped. Six tests are new: two in the lib (a shared id, a
  duplicate id), and four through the real script (dash values, a shared id with exit 2, a client repo with its
  own `decisions` folder, racing first adds). Five more were changed.
- **Red first**: before each fix, its new tests failed for the expected reason: "Missing expected exception";
  exit 0 for a missing `--root`; parseArgs' "argument is ambiguous"; the exclude lines missing; the register
  visible in `git status`.
- **Finding 6 proof**: a scratch copy with tuned caps (`default` warn 420k, `software-developer` warn 330k). With
  the old tests, 3 failed. With the new tests, 26 of 26 passed (run again after the last change: 0 fail).
- **Mutation check** (scratch copy, one rule broken at a time, counted only when the test count matched and a
  test failed): 17 of 17 caught on the final code. It covered the copy check (always true, always false, length,
  last line, equality), the duplicate and collision refusals, the exclude rules (only on creation, whole folder,
  temp lines dropped, temp name drift), `--root` (missing, a file), option joining (off, boolean options too), the
  hook ignoring the input's `cwd`, and the repo root without walking up. The last two mutants would have
  survived the old reminder test.
- **Syntax**: `node --check` on all 20 `.mjs` files: 0 failures. (Plain JavaScript; there is no type-check.)
- **Hook time** in the final suite: guard median 71 ms, reminder median 66 ms.
- **Not tested**: whether the exclude move under the lock prevents a race. The racing-adds test (8 processes) passed
  3 of 3 times *before* the move too, so it guards the outcome but does not prove the race. The move closes the
  window by construction. I made it because my every-add change opened that window. Also not tested: anything on
  a real client repo (I do not write to real repos), and the live hook wiring (main's job).

## Files

Changed (all under `C:\Repos\My projects\software-developer-agent\orchestrate-agents`): `lib\decision-register.mjs`,
`lib\text-file.mjs` (new `tempFileName`), `lib\git-repo.mjs` (one doc example only), `scripts\register.mjs`,
`tests\lib\decision-register.test.mjs`, `tests\lib\basics.test.mjs`, `tests\scripts\register.test.mjs`,
`tests\hooks\context-guard.test.mjs`, `tests\hooks\decision-reminder.test.mjs`. The two hooks and the other lib
files are unchanged (same SHA-256 as at the start). No dependency was added, and no `package.json` was needed. My
scratch files (the copies, the run scripts and the logs) are deleted.

## Risks

- **An id collision now stops `resolve` until someone edits a heading by hand.** Main has to rename the open item
  (the message gives the id to use) and then resolve it. A `renumber` command would save that step. I did not
  add one, because nothing asked for it.
- **Tests still pin the register names** (`decisions`, `OPEN_DECISIONS_CLAUDE.md`). If the user renames them, many
  CLI tests fail. These are the user's chosen names, so that failure is loud and probably wanted. The caps, which
  the config invites tuning, are no longer pinned.
