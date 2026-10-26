# Agent team stage 1, builder A second pass: progress

Started 2026-10-25 08:57 (clock read). Task: apply the reviewer's 8 findings to builder A's files where they hold
up; say which are rejected and why. Plan sections read: 1, 2, 3, 6, 7, 11. Config read whole (keys fixed).

## Files I own (under C:\Repos\My projects\software-developer-agent\orchestrate-agents)

- lib\*.mjs
- hooks\context-guard.mjs, hooks\decision-reminder.mjs
- scripts\register.mjs
- tests\ (only test files for the above; package.json only if node:test needs one)

Not mine: orchestration.config.json (read only), SKILL.md, references\, *.ps1, tests\*.ps1.

## Findings to handle

1. major: resolve crash-recovery matches id only -> silent loss on id collision.
2. minor: exclude line only when folder created; exclude whole folder.
3. minor: --root that does not exist accepted.
4. minor: --answer / --file values starting with '-' refused by parseArgs.
5. minor: reminder asks for "id and title"; summary has ids only. (plan change -> main)
6. minor: tests pin live cap values from the config.
7. minor: hardcoded lock/tail/marker constants. (config keys fixed -> main)
8. minor: reminder subfolder test does not test a subfolder.

## Verdicts (after reading the code)

1. HOLDS. resolveEntry: `alreadyResolved` = any resolved entry with the id; then the open item is spliced and
   nothing written. Apply: crash copy only when resolved lines = open lines + one '- Resolved: ' line; else exit 2
   naming the collision and the next free id. Also exit 2 when the id is in the open file more than once.
2. HOLDS. `created` guard at addEntry; '/decisions/' hides a client's own new files. Apply: ensure on every add in
   a non-commit repo, per-file lines: open, resolved, .lock, and the two temp-file patterns (name from one helper
   in text-file.mjs, shared with writeTextAtomic). Plan 6.1 wording differs -> report to main.
3. HOLDS. Apply: --root must be an existing folder, else exit 2 naming it.
4. HOLDS. Apply: join every string option with the next argv item ('--answer', '- x' -> '--answer=- x') before
   parseArgs; note it in the usage header.
5. NOT APPLIED: plan change (summary format / instruction text are plan 6.2/6.3 wording). Recommend to main.
6. HOLDS. Apply: makeWorld sets fixed default and software-developer caps; basics checks numbers, not values.
7. NOT APPLIED: needs new config keys; keys are fixed. Exact key text to main.
8. HOLDS. Apply: git-init the scratch, register at repo root, hook cwd = <repo>\src\deep.

## Baseline (08:59)

- Suite: 65 tests, 65 pass, 15 s (TEMP in scratchpad\tmp). SHA-256 prefixes of my 20 .mjs files recorded in the
  transcript (context-guard 8D36977B..., decision-register 56C5CE43..., register 72E9D010...).

## Log

(The times 09:05-09:17 below were written without reading the clock and are wrong; the clock read 09:10:39 at
the first full-suite run after all of them. Everything below that line was before 09:10.)

- 09:05 F1: two lib tests written, RED ('Missing expected exception'), then GREEN. resolveEntry now filters all
  items with the id; >1 in open -> UsageError; resolved copy must be open lines + one '- Resolved: ' line
  (isResolvedCopyOf), else UsageError naming the next free id (nextFreeId, extracted from addEntry).
- 09:10 F2/F3/F4: CLI tests RED for the expected reasons (exit 0 for a missing --root; parseArgs 'ambiguous';
  exclude lines missing; register visible in git status), then GREEN (42 of 42 in register+lib+basics).
  - text-file.mjs: new export tempFileName(fileName, writer); writeTextAtomic uses it.
  - registerLocation.excludeLine -> excludeLines (5 lines: open, resolved, .lock, 2 temp patterns).
  - addEntry: ensure the lines on every add (non-commit repo with git), before mkdir.
  - register.mjs: joinOptionValues before parseArgs; requireExistingFolder for --root.
- 09:14 F6: tuned-config scratch run (default warn 420k, developer warn 330k) on the OLD tests: 3 fail. After
  fixing makeWorld (fixed default/developer caps, explicit _why note) and basics (typeof number): 0 fail.
- 09:15 F8: reminder test now git-inits <base>\Demo, fills the register there, sends cwd <repo>\src\deep, runs the
  hook from <base>. Passes.
- 09:17 merge test extended to three non-copy variants (different item; extra field; last line not Resolved).

## Closing (clock read for each line)

- 09:10:39 full suite 70/70; node --check 20/20.
- 09:11 added a racing-adds test (8 processes, client repo): passed 3 of 3 on the old code (race not
  reproducible); moved the exclude calls under the register lock anyway (my every-add change opened the window).
  Duplicate-open message wording fixed ("their headings").
- 09:12-09:15 mutation check on the final code: 17 of 17 caught (F1 x7, F2 x4, F3 x2, F4 x2, F8 x2).
- 09:15:33 full suite 71/71, node --check 0 failures of 20, tuned-config run 0 fail, scratch TEMP empty.
- 09:16 git-repo.mjs doc example updated (comment only); 09:16:15 full suite 71/71 again, node --check ok.
- 09:18 reports written: A2_REPORT_CLAUDE.md; "Second pass" section appended to A_REPORT_CLAUDE.md.
- 09:17:41 my scratch files deleted (run scripts, logs, tap files, tmp, copies). The other scratchpad files
  (reviewC, pitfall-index.txt, slim-global.ps1, split-pitfalls.ps1, statusline-probe.mjs, usage.*) are not mine.
- Left for main: finding 5 decision, finding 7 config keys (+ follow-up code pass), SKILL.md line 94 text,
  config _whyCommitInRepos text, plan 6.1 correction.
