# R4b progress: the Decisions pane never hides decisions after a failed read

Worker: software-developer, started 2026-10-26 18:33 (clock read). Task: `R4B_TASK_CLAUDE.md` in this folder.

## Files I own

- `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\registers.ts`
- `...\decisions-pane\hooks\poll.ts` (only if needed; plan: not needed)
- `...\decisions-pane\tests\hooks\pane.test.ts`, `...\tests\support\register-world.ts`
- `...\decisions-pane\README.md` (it describes reads: lines 55-60)

Not mine: everything else; `software-developer-agent\orchestrate-agents` (R5 works there); no state-changing git; never
install, enable or reload the plugin.

## Baseline (18:35)

- Repo `claude-code-extensions` has no commits; `git status --short` lists every top folder as untracked, so it proves
  nothing per file. Baseline instead: hashes of the pane's files (below, once taken) and the lead's 43 pass + validate.

## Plan (written before the change)

What changes, in `registers.ts` only:
- Today `readWaitingDecisions` turns a failed `$.fs.read` into `''` and stores that empty result under the new stamp.
- New: a helper reads a file found by `stampOf`: `''` when the stamp is `missing` (unchanged), the text when the read
  works, `null` when it throws. A second helper builds the register's snapshot from the open file and the log, or
  gives `null` when either read failed (the log is not read when the open file failed).
- On `null`: no snapshot stored; the register's previous snapshot (rows and log notice) is shown as before; with none,
  the register adds nothing. The next poll's stamp still differs from the stored one, so it reads again.
- Unchanged: missing files, the notice, recording answers, D-14.

How it is proven (from the caller's side, through the test kit):
- test support: `World.failReads` (path -> how many of its next reads fail, `EBUSY`), counted in `world.reads`.
- D28 open-file read fails once: old decisions stay, new appear at the next poll, the pane is not closed.
- D29 log read fails once: old answers and old notice stay, then update.
- D30 first-ever read fails: pane stays closed, next poll opens it with the entry.
- D31 missing files: never read, no notice, read once and not again (no retry).
- Mutation check in a scratch copy: failed read remembered (today); failed log read drops old answers; missing file
  treated as failure and retried; plus more.

## Done

- 18:36 baseline `claude plugin test decisions-pane` via run-heavy: 43 pass, 0 fail (peak 580 MB). Pane file hashes in
  scratchpad `baseline-hashes.txt`.
- Test support: `World.failReads` (path -> count of next reads that fail with `EBUSY`, file present only), failed reads
  counted in `world.reads`.
- Tests D28-D31 added after D27 in `pane.test.ts`.
- RED (before code): 44 pass, 3 fail: D28 (pane showed "No decisions wait for you."), D29 (first answer gone), D30
  (pane never opened). D31 passed: it guards behaviour that is already right (missing files).
- Code: `registers.ts` `readWaitingDecisions` now calls `readSnapshot` (null on a failed read) and `readFound` (''
  missing, text, or null on a throw). On null: no snapshot stored; the old one (rows and notice) is shown; none = the
  register adds nothing. Log not read when the open file failed. Snapshot doc says "last good read".
- GREEN: 47 pass, 0 fail (peak 561 MB).
- README: one bullet after "A new answer in the log..." on a failed read, with the D-40 example.

- 18:39 type-check (scratch tsconfig = the options in the 2.1.310 API types' header, include the pane's hooks, types,
  tests and `bundled-skills\2.1.310\784bf4c5...\plugin-authoring\types\claude-code.d.ts`; TypeScript 7.0.2 from
  `claude-toolbar\node_modules`, run read-only): exit 0, 13 files. Validate: passed, same LICENSE_MISSING and
  ICON_MISSING as R4's baseline.
- 18:40 mutation check, first pass: 9 of 9 caught, control 47 pass.
- Review of my diff: the stamp format was built in two places; refactor: caller keeps `const stamp`, helper renamed
  `readRegister`, returns `Omit<Snapshot, 'stamp'> | null`.
- 18:42 mutation check on the final code: 9 of 9 caught (peak 595 MB); planted type error gives TS2322 exit 1 (the
  type-check is live). Scratch copy deleted.
- 18:43 final: test 47 pass 0 fail (peak 568 MB), validate passed, type-check exit 0. Hash compare: only README.md,
  registers.ts, pane.test.ts, register-world.ts changed; 15 files before and after.

- 18:44 report written (`R4B_REPORT_CLAUDE.md`). My scratch files deleted and checked by a listing; the files left in
  the scratchpad (entry-*.json, orch-*.csv, real-*.csv, setup.ps1, shape.mjs, heredoc-check.ps1,
  still-open-d13-1.txt) are not mine. No process of mine is left running.

## Left

- Nothing.
