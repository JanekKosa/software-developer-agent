# Run F2 report: the Decisions pane reads and draws register entries in points

2026-10-27, 13:26. Details: `SELF_CONTAINED_F2_PROGRESS_CLAUDE.md`.

## Outcome

Done. The pane now reads a field written in points and draws each point on its own line. An entry without points
reads and draws exactly as before. Not yet seen in the real VS Code chat: that needs a `/reload-plugins`, which only
the main session does. Nothing is committed.

## What is different for the user

- A field the register writes in points shows one point per line. The contract's sample entry now draws as:

```
The pane shows each entry as one block of text.        (bold)
  • The register joins line breaks into spaces.
  • The pane draws each field as one line.
Example: D-40's three options sat in one paragraph.
Recommendation: A, because the user asked for it.
  • It also makes long entries quicker to read.
Meanwhile: Work goes on assuming A.
○ A: show points, one per line (one run). (recommended)
○ B: leave it (no cost).
○ Other: type your own answer in the box below
```

- Before, the same entry drew as one paragraph (`... block of text. - The register joins ...`), with options `1`
  and `2` labelled `- A: ...`, none recommended.
- Options given as points: one option per point, never split at sentences. Lettered (`A: ...`, `1) ...`) when every
  point starts with its own letter or number; numbered 1, 2, ... otherwise. The Recommendation's first point marks
  the recommended one, as before.
- A Follow up block reads exactly as before: its `  - ` lines stay text of the follow-up.

## The row the sample block gives (new code, Node on a copy)

- `what`: `The pane shows each entry as one block of text.\nThe register joins line breaks into spaces.\nThe pane
  draws each field as one line.`
- `recommendation`: `A, because the user asked for it.\nIt also makes long entries quicker to read.`
- `optionsText`: the two option points joined with `\n`; `options`: A (recommended) and B, each labelled with its
  point. `example`, `meanwhile`, `evidence`: one string each, as written.

## Files changed

In `C:\Repos\My projects\claude-code-extensions\decisions-pane\`:
- `hooks\decisions.ts`: reading points, new exported `pointsOf`, options from points.
- `hooks\pane.tsx`: the question, Example, Options (as text), Recommendation and Meanwhile draw further points.
- `tests\hooks\points.test.ts` (new): 7 tests, P1-P7.
- No other file, no setting. Encoding (UTF-8, no BOM) and LF line endings kept.

## Checks (after my last change)

With the VS Code extension's `claude.exe` (2.1.310), through `run-heavy.ps1`.

- Before any change (12:58): validate passed; 107 pass, 0 fail, 4 files; type-check clean. Red first (13:04): P1,
  P3, P4, P5 failed on assertions against the unchanged code.
- Final (13:23, after my last code change at 13:06): validate passed; **136 pass, 0 fail, 5 files**; type-check
  (TypeScript 7.0.2, the README's tsconfig) exit 0, no output. 136 = 107 + my 7 + 22 that run S4 added meanwhile.
- **Invariant on copies of the real registers**: today's and the changed `decisions.ts` give **0 differences on 56
  entries** (55 + 1 resolved; both open files are empty) in entries, rows and the waiting list. **0 entries** hold a
  `  - ` line under a field other than Follow up (independent line scan). The 56 include 7 Follow up blocks and 29
  continuation lines. Copies deleted.
- **Mutation check: 20 of 20 caught**, each by an assertion, none by a load failure; the unchanged control passed
  136 of 136. They include every mutant the task named, plus 10; the list is in the progress file.
- Not run as a mutant: the whole Recommendation instead of its first point. It marks the same option either way (a
  label holds no line break), so no test can tell them apart.

## Not tested

- The look in the real VS Code chat: it needs `/reload-plugins` in the main session. The tests read the drawing
  the test kit produces, not the webview's pixels.
- How a long further point wraps in VS Code. Expected, not seen: its wrapped line starts under the bullet, not
  under its first word (the bullet and the words are one Text in a Box indented two characters, as follow-up lines
  are).
- An entry written by F1's new `register.mjs`: F1 runs now; I tested against the contract's sample block, written
  by hand exactly as the contract shows it.

## README text for the lead to apply later

For "What it lists", after the bullet "Each entry in a frame of its own: ...":

> - A field the register wrote in points (its first point on the field's line, each further point under it as
>   `  - <point>`) shows its first point as before and each further point on a line of its own under it, indented,
>   after `• `. The question's first point is bold, as the question always was. A field without points shows as one
>   line, as before. A Follow up block's `  - ` lines are text of the follow-up, as before.

For "Answering", at the end of the **Options** bullet:

> Options the register wrote as points (`- Options:`, then one `  - <option>` line each) give one option per point
> and never split at sentences: lettered (`A: …`, `1) …`) when every point starts with its own letter or number,
> numbered 1, 2, … otherwise. The Recommendation's first point marks the recommended one.

## Risky or undecided points

- Options as points where only some start with a letter, or two with the same one: all are numbered (`A: once.`
  and `retry twice.` give 1 and 2). Read per point, the contract would give `A` and `2`, and `A: once.`/`A: twice.`
  two options both called A. I recommend all-or-nothing.
- "A letter" is a capital, as today's matchers read it: `a) once.`/`b) twice.` are numbered 1 and 2.

## What I learned

- Another worker's red phase hides render tests: S4's test changes kept the whole pane suite red 13:02-13:08, so I
  judged P6 and P7 only at 13:09.

## Left behind

Only scripts and logs under `scratchpad\f2\`, for a rerun. Copies deleted; no process of mine runs.

DECISIONS TAKEN: option points are lettered only when every point has its own distinct capital or number, else all numbered (not per point, which can give two options one value) | a `  - ` line with no words adds no point (not an empty point; F1 never writes one) | a point under an empty field line becomes the first point (as `- Options:` needs) | a further point is one Text `• <point>` in a Box indented 2, like follow-up lines (not a hanging indent: not asked, two elements per point)
INITIATIVES: an exported `pointsOf` in decisions.ts, so reader and drawing share one definition of the join | doc comments in decisions.ts updated to say what they now read
ISSUES FOUND: run S4's in-progress test changes kept the whole pane suite red 13:02-13:08 (64 failures, team-switch.test.ts not loading); green by 13:09, not mine, untouched | the session scratchpad is shared by every worker of this session (S3a's files beside mine), so same-named scratch files could collide; mine are under `scratchpad\f2\`
QUESTIONS: none
