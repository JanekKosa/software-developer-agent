# R4b report: the Decisions pane never hides decisions after a failed read

Written 2026-10-26 18:44 by the software-developer worker. Outcome: **done**. Nothing is committed (the repo
`claude-code-extensions` has no commits yet, and git was used read-only).

## What the user sees differently

- When the pane reads the open file or the answers log at the moment an agent rewrites it, and the read fails, the
  pane now keeps showing what it showed before and reads again at the next refresh (2 seconds by default).
- Example: a lead adds blocking D-40 at 10:00:00 and the pane's read fails at that instant. Before: the pane showed
  "No decisions wait for you." (and closed its tab) until the next write, possibly at 13:00. Now: the tab keeps its
  old list, and D-40 shows at 10:00:02.
- A failed read of the log keeps the answers and the "could not be read" notice shown before, then updates.
- A first-ever read that fails shows nothing (the tab stays closed); the next refresh shows the decisions.
- Unchanged: a missing file is still "no entries" or "no answers", with no notice and no retry; the notice for
  unreadable log lines; recording answers; only the chat's own repo's register (D-14).

## How it works (no source)

- `registers.ts`: a small helper reads a file that the size-and-time check found. It gives empty text for a missing
  file (as before), the text when the read works, and "failed" when the read throws.
- A second helper reads the open file and then the log. If either read fails it gives "failed", and the log is not
  read when the open file failed.
- On "failed", nothing is remembered. The register keeps its last good snapshot (entries and notice), or adds nothing
  if it never had one. Its stored stamp still differs from the files' stamp, so the next poll reads again.
- `poll.ts` needed no change.

## Files changed (all in `C:\Repos\My projects\claude-code-extensions\decisions-pane`)

- `hooks\registers.ts`: the fix, as above. The `Snapshot` comment now says "last good read".
- `tests\support\register-world.ts`: the stand-in file system gets `failReads` (path to how many of its next reads
  fail with `EBUSY`; only for a file that is there). A failed read is still listed in `world.reads`.
- `tests\hooks\pane.test.ts`: tests D28 to D31, after D27.
- `README.md`: one bullet after "A new answer in the log...", on a failed read, with the D-40 example.
- A hash comparison with the baseline shows only these 4 files changed; there are 15 files before and after.
- Outside the diff: nothing. No install, enable or reload; no state-changing git; nothing in `orchestrate-agents`.
  My scratch files are deleted.

## Tests added (from the caller's side, through the test kit)

- D28: a read of the open file fails once. During the failure the old decision shows, the new one does not, the tab
  keeps "Decisions (1)" and is never closed. The next poll reads the file once more and shows both, "Decisions (2)".
- D29: a read of the log fails once. The old answer and the old notice stay, and the new answer is not shown. The next
  poll shows both answers and drops the notice (the new log has no broken line).
- D30: the first read at session start fails. The tab stays closed. The next poll opens it with the entry.
- D31: missing files. With no register, neither file is ever read and no tab opens. With an open file and no log,
  the open file is read once and not again over two polls, the log is never read, and there is no notice.

## Checks (all after the last change, 18:42 to 18:43)

| Check | Before (18:36) | After |
| --- | --- | --- |
| `claude plugin test decisions-pane` (via run-heavy) | 43 pass, 0 fail | 47 pass, 0 fail |
| `claude plugin validate decisions-pane` | passed (lead, 18:30) | passed |
| Type-check (options from the API types' header) | not run by me | exit 0, 13 files |

- RED run before the code: 44 pass, 3 fail. D28, D29 and D30 failed for the right reasons: the pane showed "No
  decisions wait for you.", the first answer was gone, the tab never opened. D31 passed, as it guards behaviour that
  is already right.
- Validate gives the same two plugin-directory notes R4 saw, which do not block: LICENSE_MISSING and ICON_MISSING.
- Type-check: a scratch `tsconfig.json` with the options printed in the header of the 2.1.310 mod API types. It
  includes the pane's `hooks`, `types` and `tests` folders and that `claude-code.d.ts`. I ran TypeScript 7.0.2 from
  `claude-toolbar\node_modules`, read-only. A planted type error in a scratch copy gave TS2322 and exit 1, so the
  check can fail.
- Tools: `claude.exe` 2.1.310 from the VS Code extension.
- Peak memory, from run-heavy's last line: 568 MB for the final test run, 595 MB for the final mutation run.

**Mutation check: 9 of 9 caught**, in a scratch copy of the pane only, on the final code. The untouched copy passed
all 47 as a control. A mutant counted only when all 47 tests loaded and at least one failed.
- M1 a failed read is remembered again (today's behaviour): caught by D28, D29 and D30.
- M2 a failed log read drops the answers shown before: caught by D29.
- M3 a missing file is treated as a failed read and retried: caught by D31 and 25 older tests.
- M4 a missing file is read and its "not found" treated as a failed read: caught by D31 and 25 older tests.
- M5 a failed read shows nothing for the register: caught by D28 and D29.
- M6 a failed read stores the old snapshot under the new stamp, so there is no retry: caught by D28 and D29.
- M7 a failed read keeps the old entries but drops the old notice: caught by D29.
- M8 a first-ever failed read is remembered as empty: caught by D30.
- M9 a missing log gives a notice: caught by D21 and D31.

A first pass before a small refactor also caught 9 of 9.

**Not tested:**
- The pane in a live VS Code. A real read failing at the moment an agent rewrites a file was not reproduced; the
  failure is the test kit's stand-in answering `EBUSY`. Whether the engine's `$.fs.read` rejects (rather than
  returns partial text) in that moment is not known from here.
- I did not install, enable or reload the plugin.

## Risky or undecided points

- **A failed size-and-time check (stat) still counts as "missing".** This was left alone: it is outside this point,
  and "nothing else changes". If the engine's `$.fs.stat` fails for a reason other than "not found", the register
  reads as empty for one refresh. The next refresh then sees a new stamp and reads it again. Most likely the tab
  closes and reopens 2 seconds later; not checked. Recommendation: leave it unless it is seen. The fix would need
  the stat's error text to tell "not found" apart.
- **A file that stays unreadable** (for example, its permissions changed) now shows the last good state with no
  sign, and is retried every refresh. Before, it showed nothing. Recommendation: accept. A notice would be a new
  visible line, which is for the user to decide.

## Learned (not in the task)

- The test kit's `fs.read` stand-in can deny with any text. The mod sees it as a rejection, so a busy file is
  simulated the same way as a missing one, only with the file present.
- `claude plugin test` runs on a plugin copied to a folder without `.git`. The mutation copies needed no repo.

DECISIONS TAKEN: When the open file's read fails, the log is not read in that poll (the other choice was to read both
anyway); nothing is stored either way, and it saves a read. | I followed the task's "read this, and no more" over my
agent file's instruction to read three vendored skills (karpathy, TDD, verification); the task outranks the agent
file. | I chose `EBUSY` as the stand-in's failure text; any rejection behaves the same.
INITIATIVES: I read the usage header of `orchestrate-agents\scripts\run-heavy.ps1` (40 lines, no change) to call it
correctly, although the task said to read nothing under `software-developer-agent`. | The README bullet carries a
D-40 example.
ISSUES FOUND: A stat that fails for a reason other than "not found" still makes the register read as empty for one
refresh (`registers.ts`, `stampOf`); likely effect is the tab closing and reopening 2 seconds later; not checked, left
alone. | A file that stays unreadable now shows its last good state with no sign that it is stale.
QUESTIONS: none
