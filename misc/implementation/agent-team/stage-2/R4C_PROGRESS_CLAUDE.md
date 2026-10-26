# R4c progress: failed stat is a failed read; a read that keeps failing is said

Worker: software-developer. Started 2026-10-26 19:08 (Get-Date).

## Files I own (in `C:\Repos\My projects\claude-code-extensions\decisions-pane`)

- `hooks\registers.ts`, `hooks\poll.ts` and `hooks\decision-state.ts` if needed, `hooks\pane.tsx` only if the notice
  needs it, `tests\hooks\pane.test.ts`, `tests\support\register-world.ts`, `README.md` (the reads part).
- Not mine: everything else; nothing under `software-developer-agent\orchestrate-agents` (R3b works there).

## Baseline (19:09)

- 15 files in the pane (hash list in the first tool output; SHA256 prefixes):
  README 353F93E5DE885618, registers.ts 349D742E5A0A9061, poll.ts A56B7563D7BE16DC, decision-state.ts
  FFB4E1F1220AC297, pane.tsx 0A8344FCA1D9377A, pane.test.ts 865B8B75F6A4E7B4, register-world.ts 18074665E3E89C97,
  decisions.ts E542D2AC42B10FF9, pane-control.ts B915984F6F37BB33, register.tsx 0C2335703C81793D, settings.ts
  E2841EE72991804A, hooks.json D842D789476D6728, plugin.json 6F320AF59670DBA2, decisions.test.ts AD64FC8F554313D0,
  types\index.d.ts 983B57D5F852AD97.
- Repo has no commits; everything untracked. Git used read-only.
- Test baseline from R4b: 47 pass (to re-run myself).

## Reading note

- I read the three vendored skills my agent file requires (karpathy, TDD, verification) before noting that the task's
  "read this, and no more" list excludes them. Report it.

- Baseline test run (19:13, via run-heavy): 47 pass, 0 fail, peak 562 MB.

## Measured / read facts (19:12)

- API types (2.1.306 copy at `claude-code-extensions\temp\chat-view\plugin-authoring\types\claude-code.d.ts`; no
  2.1.310 copy found on disk): `$.fs.stat` "Rejects when missing ... rejects `ENOENT` for a missing path"; the fs
  block: "an OS refusal with its errno". `$.fs.exists` "Returns whether the path exists; rejects only a network
  location" (what it answers on a transient OS refusal is not documented). `$.clock.now()` resolves epoch ms.
- The test kit runs tests with no real fs ("no fs, network or process"), so the real engine's rejection text cannot
  be measured from `claude plugin test`. The mods skill: an fs stand-in answers `{ deny: 'ENOENT ...' }` for a
  missing file.

## Plan

1. Choice: tell "not there" from "could not check" by the rejection's errno text: `ENOENT` or `ENOTDIR` = not there
   (as today, MISSING); any other rejection = could not check. Not `$.fs.exists`: its answer on a transient OS
   refusal is undocumented, and Node's own exists/access answers false on any error (a delete-pending file gives
   EPERM to stat and false to access), which would bring the bug back.
2. `stampOf` returns `null` for "could not check". `readWaitingDecisions`: a null stamp is a failed read (keep the
   snapshot, store nothing; the next poll checks again).
3. Per register, the engine time of the first failure of the current run of failures (a Map in poll.ts, cleared at
   start like snapshots, passed in). Failed and `now - since >= 30_000` -> notice
   `The decisions register could not be read since HH:MM:SS; the pane shows what it held before and keeps trying.`
   (local time). Not failing (good read, or unchanged stamp) -> forget the time, no notice. Notice joins the log
   notice (same orange place).
4. Tests D32-D37 (after D31): open stat fails once; log stat fails once; removed file = no decisions, no notice over
   40 s; reads failing 30 s -> notice once, cleared by good read; stat failing 30 s -> notice; single failure no
   notice and a good read restarts the 30 s. Stand-in: `failStats` map (EPERM), like `failReads`.
5. README reads bullet. Checks: validate, test via run-heavy, type-check (R4b's way), mutation check in scratch copy.

## Done

- 19:15 stand-in `failStats` (EPERM deny) + helpers `pollUntil`, `staleNotice` (expected text via
  `toTimeString().slice(0, 8)`, independent of the mod's getHours/padStart), `linesShown`, `noticesShown` in
  `register-world.ts`; tests D32-D37 in `pane.test.ts` after D31.
- RED (19:17): 49 pass, 4 fail: D32 (showed "No decisions wait for you."), D33 (first answer gone), D35 and D36 (no
  notice). D34, D37 pass (guards). Peak 588 MB.
- Code (19:19): `registers.ts`: `ReadDollar` type (adds clock), `NOT_THERE` regex, `STALE_AFTER_MS = 30_000`,
  `stampOf` -> `string | null`, `readWaitingDecisions(..., failingSince)`, `staleNotice`, `clockTime`. `poll.ts`:
  `failingSince` map, cleared at start, passed in.
- GREEN (19:20): 53 pass, 0 fail, peak 542 MB. The kit's deny text reaches the mod's catch (else D31/D34 and every
  missing-file test would have failed).

- Time correction: the times 19:13, 19:15, 19:17, 19:19 and 19:20 above were estimated, not read. Clock readings:
  19:08:59 start, 19:09:23 baseline hashes, 19:21:08 final checks done, 19:21:23 final validate, 19:21 scratch clean.
- Comments: poll.ts header, decision-state.ts `Board.logNotice` (wrapped to 120); README reads bullet + new notice
  bullet. Dropped `ENOTDIR` from `NOT_THERE` (Windows gives ENOENT for a missing folder; contract names ENOENT only).
- Type-check: scratch tsconfig with the 2.1.310 header options; types from
  `%TEMP%\claude\bundled-skills\2.1.310\17a30e3c2ea69701accd82c8ff91f229\plugin-authoring\types\claude-code.d.ts`; TS
  7.0.2 `claude-toolbar\node_modules\typescript\bin\tsc` via node. Exit 0, 13 files (12 pane + types).
- Mutation check (scratch copy, final registers.ts): control 53/0; 11 of 11 caught (M1 D32,D33,D36; M2 D29,D32,D35,
  D36,D37; M3 D35,D36,D37; M4 31 tests; M5 D34; M6 D37; M7 D35,D36; M8 D35,D36; M9 D35; M10 D36; M11 D35,D36).
  Planted type error: tsc exit 1 (TS2322); control tsc exit 0. Peak 615 MB.
- Final (after the last change): suite 53 pass 0 fail, peak 546 MB; tsc exit 0; validate passed (LICENSE_MISSING,
  ICON_MISSING notes only). Hashes: 15 files before and after; changed exactly README, decision-state.ts, poll.ts,
  registers.ts, pane.test.ts, register-world.ts.
- Scratch deleted (mutant copy had no links); nothing left with `r4c` in the scratchpad.

## Left

- Report written next; nothing else.
