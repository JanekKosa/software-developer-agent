# R4c report: a failed size check is a failed read, and reads that keep failing are said

Written 2026-10-26 19:22 by the software-developer worker. Outcome: **done**. Nothing is committed (the repo
`claude-code-extensions` has no commits; git was used read-only).

## What the user sees differently

- **A failed size-and-time check no longer empties the pane.** Before, if the check of the open file or the log failed
  for any reason, the pane counted the file as missing for one refresh: no decisions, and the tab could close and
  reopen 2 seconds later. Now only a file that is really not there counts as gone. Any other failure keeps what was
  shown and tries again at the next refresh.
- Example: the pane shows D-30; an agent adds D-31 at 10:00:00 and the size check fails at that instant. Before: "No
  decisions wait for you." for 2 seconds, tab closed and reopened. Now: D-30 stays, the tab stays "Decisions (1)", and
  D-31 shows at 10:00:02.
- **Reads that keep failing are said.** When a register's reads (or size checks) have failed for 30 seconds in a row,
  the orange notice line under the summary says, for example:
  `The decisions register could not be read since 10:00:05; the pane shows what it held before and keeps trying.`
  The time is the first failed read. The line shows once (one line, the same text while the failures go on) and goes
  at the first read that works. A single failed read shows no line.
- Unchanged: a file that is really removed still shows no decisions, with no notice, however long it stays away; the
  unreadable-log-line notice; recording answers; only the chat repo's register.

## How it works (no source)

- The size check now tells three answers apart: the file's stamp; "not there" (the engine's rejection names `ENOENT`);
  and "could not check" (any other rejection, such as `EPERM` or `EBUSY`).
- "Could not check" is handled exactly like R4b's failed read: nothing is stored, the last good state stays, and the
  next refresh checks again.
- **What I used to tell them apart, and why:** the rejection's error code text. The 2.1.310 API types say `$.fs.stat`
  "rejects `ENOENT` for a missing path", and other OS refusals come "with its errno". I did not use `$.fs.exists`: what
  it answers during a short OS refusal is not documented, and Node's own exists answers "no" on any error. A file being
  replaced can make the size check fail with `EPERM` and an exists check answer "no", which would bring the bug back.
- Per register, the poll remembers the engine-clock time of the first failure in a run of failures. A good read, or an
  unchanged register, forgets it. The notice joins the existing notice line, so `pane.tsx` needed no change.

## Files changed (all in `C:\Repos\My projects\claude-code-extensions\decisions-pane`)

- `hooks\registers.ts`: the size check's three answers, the failure clock, the notice and its `HH:MM:SS` time.
- `hooks\poll.ts`: keeps the failure times beside the snapshots, cleared at session start; header comment updated.
- `hooks\decision-state.ts`: one comment only (the notice field now also carries the stale-read line).
- `tests\support\register-world.ts`: the stand-in file system gets `failStats` (path to how many of its next size
  checks fail with `EPERM`; only for a file that is there), and helpers `pollUntil`, `staleNotice` (works the expected
  line out with `toTimeString`, apart from the mod's own code), `linesShown`, `noticesShown`.
- `tests\hooks\pane.test.ts`: tests D32 to D37, after D31.
- `README.md`: the failed-read bullet now covers the size check; one new bullet for the 30-second notice.
- A hash comparison with my baseline: 15 files before and after; only these 6 changed.
- Outside the diff: nothing. No install, enable or reload; no state-changing git; nothing in `orchestrate-agents`. My
  scratch copies and logs are deleted.

## Settings

None added. The 30 seconds is a named constant, `STALE_AFTER_MS`, in `registers.ts`, as the pane already does for its
answer timeout. The task fixed 30 seconds, and `settings.ts` is not mine.

## Tests added (from the caller's side, through the test kit)

- D32: the open file's size check fails once: the old decision stays, the new one does not show, no notice, the tab
  keeps "Decisions (1)"; the next poll shows both, "Decisions (2)", and the tab never closed.
- D33: the log's size check fails once: the old answer stays, the new one does not; the next poll shows both.
- D34: the open file is really removed: the tab closes at once, and after 40 more seconds the pane shows "No decisions
  wait for you." with no notice.
- D35: reads fail for 30 seconds: no notice at 28 s; the notice at 30 s with the first failure's time; still the same
  single line at 40 s, over the old decisions; the first good read clears it and shows the new decision.
- D36: size checks failing for 30 seconds give the notice too; the first good read clears it.
- D37: a single failed read gives no notice; two runs of 20 seconds of failures with a good read between give no notice.

## Checks (all after the last change, 19:21)

| Check | Before (19:09) | After |
| --- | --- | --- |
| `claude plugin test decisions-pane` (via run-heavy) | 47 pass, 0 fail | 53 pass, 0 fail |
| `claude plugin validate decisions-pane` | passed (R4b) | passed |
| Type-check (options from the 2.1.310 API types' header) | not run by me | exit 0, 13 files |

- RED run before the code: 49 pass, 4 fail. D32 showed "No decisions wait for you.", D33 lost the first answer, D35
  and D36 showed no notice. D34 and D37 passed, as they guard behaviour that was already right.
- Validate gives the same two non-blocking plugin-directory notes R4 and R4b saw: LICENSE_MISSING and ICON_MISSING.
- Type-check: a scratch `tsconfig.json` with the header's options, including the pane's `hooks`, `types` and `tests`
  and the 2.1.310 `claude-code.d.ts` from `%TEMP%\claude\bundled-skills\2.1.310\17a30e3c...\plugin-authoring\types`;
  TypeScript 7.0.2 from `claude-toolbar\node_modules`, read-only. A planted type error in a scratch copy gave TS2322
  and exit 1, so the check can fail.
- Peak memory, from run-heavy's last line: 546 MB for the final test run, 615 MB for the mutation run; the type-check
  ended within 2 seconds, too fast to measure.

**Mutation check: 11 of 11 caught**, in a scratch copy of the pane, on the final `registers.ts`. The untouched copy
passed 53 of 53. A mutant counted only when all 53 tests loaded and at least one failed.
- M1 a failed size check counted as missing again: D32, D33, D36.
- M2 the notice shown at the first failure: D29, D32, D35, D36, D37.
- M3 the notice never cleared: D35, D36, D37.
- M4 a removed file reported as a failure (never "not there"): 31 tests, D34 among them.
- M5 a removed open file starts the 30-second clock: D34.
- M6 the failure time kept after a good read: D37.
- M7 the failure time restarted at every failure: D35, D36.
- M8 the notice names the time now, not the first failure: D35, D36.
- M9 a failed read of the text not counted: D35. M10 a failed size check not counted: D36.
- M11 the threshold at 32 seconds: D35, D36.

**Not tested:**
- The pane in a live VS Code, and the real engine. The test kit has no real file system, so the real rejection text
  for a missing file was not seen. The code relies on the documented `ENOENT`; the test kit passes the stand-in's text
  through, which the passing missing-file tests prove.
- The time zone of the notice in the real engine. The time is local time as the hooks environment sees it. If that
  environment runs in UTC, the notice would read an hour early in Polish winter time.
- Clearing the failure times at session start (it mirrors the existing clearing of the snapshots) has no test of its
  own.

## Risky or undecided points

- **Missing-file detection rests on the `ENOENT` text.** If the real engine's rejection lacked it, a deleted open file
  would keep showing its old decisions, and after 30 seconds the notice. Recommendation: accept; the API types promise
  it. A first look at a live pane after deleting a register would settle it.
- **A register that never read well** also gets the notice after 30 seconds, though the pane held nothing. Its tab is
  closed then, so the person sees the line only after opening the pane with `/decisions-pane`. Recommendation: accept.

## Learned (not in the task)

- The 2.1.310 API types sit in `%TEMP%\claude\bundled-skills\2.1.310\<hash>\plugin-authoring\types\`; loading the
  skill is not needed to type-check.
- I first wrote some progress-file times without reading the clock; they are corrected there.

DECISIONS TAKEN: "Not there" is told from "could not check" by the size check's error code text (`ENOENT` only), not
by `$.fs.exists` (undocumented during a short OS refusal; Node's exists says "no" on any error, which would bring the
bug back). | `ENOTDIR` is not treated as "not there": Windows gives `ENOENT` for a missing folder and the engine names
only `ENOENT`. | The notice says "decisions register", not "decisions file", since the failing file may be the log. |
The notice joins the existing notice line, before the log's own notice, so `pane.tsx` is unchanged. | A failed size
check counts toward the 30 seconds like a failed read; an unchanged register counts as good. | 30 seconds is a named
constant, not a setting. | A register that never read well also gets the notice after 30 seconds.
INITIATIVES: I read the three vendored skills my agent file requires (karpathy, TDD, verification) and 6 lines of
`R4_REPORT_CLAUDE.md` on the type-check, both outside the task's read list (its section 4 points at R4's report). |
Two comments outside the notice code were updated so they no longer say the notice is only about log lines
(`poll.ts` header, `decision-state.ts`). | Four test helpers added to `register-world.ts`. | The type-check used the
2.1.310 types from the bundled-skills temp folder.
ISSUES FOUND: The notice's time is local time as the hooks environment sees it; if the real engine runs it in UTC the
time is an hour off in Polish winter time (`registers.ts`, `clockTime`); not checked. | Missing-file detection relies
on the documented `ENOENT` in the real engine's rejection; if absent, a deleted open file keeps its old decisions and
gets the notice; not checked against the real engine.
QUESTIONS: none
