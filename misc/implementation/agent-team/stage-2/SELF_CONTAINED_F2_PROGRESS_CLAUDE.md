# Run F2 progress: register entries in points, the pane's side

Started 2026-10-27 12:56 (clock). Task: `SELF_CONTAINED_F2_TASK_CLAUDE.md`; spec: `SELF_CONTAINED_F_CONTRACT_CLAUDE.md`.

## Files I own

- `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\decisions.ts`
- `C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\pane.tsx`
- `C:\Repos\My projects\claude-code-extensions\decisions-pane\tests\hooks\points.test.ts` (new)
- this progress file and `SELF_CONTAINED_F2_REPORT_CLAUDE.md`

Not mine: every other pane file (S4 changes team-on.ts, team-switch.ts, their tests, README now), the agent repo.

## Scratchpad

`C:\Users\user\AppData\Local\Temp\claude\c--Repos-My-projects-software-developer-agent\56c67d3d-b3c0-43be-a82c-b3a9cdc23274\scratchpad`
- `checks.ps1` (validate, test, tsc; adapted from P1's), `tc\tsconfig.json` (P1's, the README's tsconfig)
- `orig\decisions.ts`, `orig\pane.tsx`: today's files, copied 12:57 before any change
- `hashes-before.txt`: SHA256 (16 hex) of every pane file at 12:57

## Baseline (before any change)

- git status of claude-code-extensions at 12:57: README, pane.tsx, poll.ts, registers.ts, pane.test.ts,
  register-world.ts modified; team-on.ts, team-switch.ts and their tests untracked. decisions.ts unmodified.

- Checks at 12:58-12:59 (through run-heavy, `checks.ps1`): validate passed ("Validation passed"), `claude plugin
  test decisions-pane` **107 pass, 0 fail, 4 files** (42 s), tsc (TypeScript of claude-toolbar's node_modules,
  `tc\tsconfig.json`) exit 0, no output. Log kept as `baseline-test.log`.
- decisions.ts and pane.tsx: UTF-8 without BOM, LF only. Node v24.13.0 (strips TS types, for the invariant).
- `claude plugin test` has no filter: each mutant runs the whole suite (~45 s).

## Plan (written 13:00 before changing code)

Reading (decisions.ts):
- entriesOf: after the Follow up branch, a line starting `  - ` (exactly two spaces: char 2 is `-`) under any other
  field starts a new point: its text after `- `, trimmed, appended with `\n`; when the field's value is still empty
  (`- Options:` with nothing after) the point becomes the value. A point line with no words adds nothing.
- new exported `pointsOf(value)` = `value.split('\n')`: the one place that says how points are joined; pane uses it.
- optionsOf: when the text holds two or more points, one option per point; lettered when EVERY point starts
  `[A-Z]|[1-9]\d?` then `:` or `)` and a space and the letters are distinct, otherwise numbered 1..n (avoids two
  options with one value). Recommended mark from the Recommendation's first point (recommendedLetter /
  recommendedSentence as today). Text without points: exactly today's path.
Drawing (pane.tsx):
- What: first point bold as today; each further point a `Box paddingLeft={2}` holding `Text wrap` `• <point>`.
- drawField: `Label: <first point>` as today; further points the same way. A value with no further points returns
  exactly today's element (no wrapper), so old entries draw the same tree.
Proof: points.test.ts (sample block row, old-shape rows, options from points, render of the sample with my own
line reader that shows paddingLeft as spaces, old entry without bullets), suite + tsc + validate, invariant on real
registers (old vs new via Node type stripping), mutation check (>= 10 mutants, whole suite per mutant).

## Red run (13:04)

- points.test.ts written first (P1-P7). Red run 13:04: P1, P3, P4, P5 fail on assertions (red as expected), P2
  passes (describes unchanged reading). P6, P7 cannot be judged: at 13:02-13:04 run S4 changed
  `tests\support\register-world.ts`, `team-on.test.ts`, `team-switch.test.ts` (its own red state): suite 45 pass,
  64 fail, 109 tests, 5 files; `team-switch.test.ts` does not load ("Export named 'isStatePath' not found in
  team-on.ts"); every D test fails because the world no longer switches the pane on. Not mine; wait for S4 to go
  green before the final suite and the mutation check (snapshot the pane folder at a green moment).

## Built (13:05-13:07)

- decisions.ts: constants `POINT = '  - '`, `POINT_BREAK = '\n'`, `POINT_LETTER`; entriesOf point branch after the
  Follow up branch; exported `pointsOf`; optionsOf with points (`letteredPoints`: all lettered and distinct, else
  numbered); recommendation's first point passed to recommendedLetter/recommendedSentence. Old-shape text takes
  exactly today's path (no `\n` in the value).
- pane.tsx: `BULLET = '• '`, `POINT_INDENT = 2`; drawDecision's What through `withPoints`; drawField through
  `withPoints`; `drawPoint` = Box paddingLeft 2 + Text wrap `• point`. One point: the same element as before.
- tsc 13:06: exit 0, no output (TypeScript 7.0.2 runs in about 1 s).
- Scratch moved 13:07 to `scratchpad\f2\` (the session scratchpad is shared with S3a/S4 files).

## Invariant (13:09)

- `f2\inv\invariant.mjs`: old.mts (copy of orig decisions.ts) vs new.mts (copy of the changed one), both with
  `export { entriesOf, rowOf }` appended in the copy; Node 24 strips the types. Copies of the real registers in
  `f2\inv\data\agent` (software-developer-agent\decisions, copied 13:08, files of 12:58) and `data\ext`
  (claude-code-extensions\decisions), answers logs included.
- Result: **56 entries (55 + 1 resolved; both open files hold 0), 0 differences** in entries, rows and
  waitingDecisions; **0 entries** with a `  - ` line under a field other than Follow up (independent line scan).
  The real files exercise 7 Follow up blocks, 37 two-space lines, 29 other continuation lines, 55 Options lines.
- Sample block, new code: what/recommendation/optionsText are the points joined with `\n`, options A (recommended)
  and B with the points as labels. Old code on the same block: one paragraph with ` - ` inside, options `1`/`2`
  labelled `- A: ...`, none recommended (the "block of text" the user saw).

## Green run (13:09, `f2\run2`)

- validate passed; tsc exit 0, no output; suite **136 pass, 0 fail, 5 files**: decisions 9, pane 44, points 7 (mine,
  all pass), team-on 12, team-switch 64. Baseline 107 = 9 + 44 + 6 + 48; S4 added 22 (team-on +6, team-switch +16)
  between 13:02 and 13:09. So: 107 at my first run, + 7 mine, + 22 S4's.

## Mutation check (started 13:10, `f2\mut`)

- Snapshot of the pane at 13:10 (`f2\mut\snap\decisions-pane`, hashes in `f2\mut\snap-hashes.txt`); `mutate.mjs`
  copies it fresh per mutant, applies exact replacements (each must be found once), runs `claude plugin test` on
  the copy; M0 = control with no change. 21 entries: M0 + 20 mutants (M1-M18, M9a/b, M13a/b). Through run-heavy
  (waited for S3a's slot). Results: `f2\mut\results.json`, per-mutant logs `f2\mut\logs\`.
- To rerun: `node <scratchpad>\f2\mut\mutate.mjs` through run-heavy (needs a fresh `snap\decisions-pane` copy).
- Ran 13:12-13:18. M0 control: 136 pass, 0 fail. **20 of 20 mutants caught**, every one by an assertion, none by a
  file not loading (M1-M8, M9a, M9b, M10-M12, M13a, M13b, M14-M18). Caught by: P1/P3/P4/P6 (M1, M4), R8/D20/P3 (M2),
  P2 (M3), P5 (M5, M9a, M9b), P1/P5/P6 (M6), P4 (M7), P1 (M8), P6 (M10-M12, M14-M18), P7 (M13a, M13b). No survivor,
  so no test added. Not run as a mutant: passing the whole Recommendation instead of its first point (equivalent:
  an option label holds no `\n`, so `startsWith` and the leading-letter match give the same answer either way).

## Final checks (13:23, `f2\final`, after my last code change at 13:06)

- validate: "Validation passed"; suite **136 pass, 0 fail, 5 files** (20.5 s); tsc exit 0, no output.
- Pane folder vs 12:57 hashes: mine changed (decisions.ts, pane.tsx, points.test.ts new); S4's changed
  (team-on.ts, team-switch.ts, team-on.test.ts, team-switch.test.ts, register-world.ts). Nothing else.
- Cleanup 13:23: deleted `f2\inv\data` (the register copies) and `f2\mut\snap`; `f2\mut\work` was removed by the
  script. Left in `scratchpad\f2\`: scripts (checks.ps1, tc\tsconfig.json, inv\invariant.mjs, old.mts, new.mts,
  mut\mutate.mjs), orig\ (today's two files), logs. Monitor task stopped; no process of mine runs.

## Points

- [x] Baseline checks: validate, test count, tsc
- [x] Point 1, Point 2 written; points.test.ts 7 of 7 pass (13:09)
- [x] Invariant
- [x] Mutation check: 20 of 20
- [x] Final checks, report
- [ ] Point 1: reading (entriesOf, rowOf, optionsOf)
- [ ] Point 2: drawing (drawDecision, drawField)
- [ ] Invariant: real registers, old vs new parse; sample block row
- [ ] Mutation check (>= 10 mutants)
- [ ] Final checks, report
