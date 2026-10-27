# Contract: register entries in points (F1 writes it, F2 reads and draws it)

Written by the lead (self-contained task) at 2026-10-27 12:54. Both runs build to this file word for word. If a
run finds the contract cannot work, it stops and asks its lead (`QUESTION FOR THE LEAD |`); it never changes the
contract on its own.

## Why

The user, 2026-10-27, in their words: "the three options should be in three points, so add a rule that the decision
context needs to be formatted in a more readable format and not just a block of text", and at 12:48: "rn it's
presented as one big block of text". Today the register joins every line break into a space, and the pane draws a
field as one wrapped line.

## 1. Input (`register.mjs add --file <entry.json>`)

- `what`, `example`, `recommendation`, `meanwhile` take either:
  - a non-empty string: one paragraph, exactly as today (its line breaks still become spaces); or
  - a list of one or more non-empty strings: points. The first point is the headline.
- `raisedBy` and `task`: a non-empty string only, as today.
- `options` and `evidence`: a list of one or more non-empty strings, as today.
- Rejected, exit 2, with the field's name in the message: an empty list, a list item that is not a string or is
  blank, any other type.

## 2. How the register file holds it (written by F1)

- A string field: one line, exactly as today: `- What: <text>`.
- A list field: its first point on the field line, each further point on its own line under it, as two spaces,
  `- `, the point: `  - <point>`. Inside a point, line breaks become spaces; a point's own leading `- ` or `* ` is
  dropped. A list of one point is written exactly like a string.
- Options, for every new entry: the line `- Options:` (nothing after the colon), then one line per option,
  `  - <option>`, each option with the full stop it gets today (`.` added when it ends without `.`, `!` or `?`).
- Evidence: one line, as today (`- Evidence: a, b`).
- Nothing else changes: the heading, Status, Urgency, Raised, Task, the order of the fields, the blank line between
  entries, the file's own line endings.

The sample entry, exactly as F1 writes it from the JSON below (the Raised time aside):

```json
{
  "kind": "question", "blocking": false, "urgency": "medium",
  "raisedBy": "lead sample", "task": "Sample task",
  "what": ["The pane shows each entry as one block of text.", "The register joins line breaks into spaces.", "The pane draws each field as one line."],
  "example": "D-40's three options sat in one paragraph.",
  "options": ["A: show points, one per line (one run)", "B: leave it (no cost)"],
  "recommendation": ["A, because the user asked for it.", "It also makes long entries quicker to read."],
  "meanwhile": "Work goes on assuming A.",
  "evidence": ["C:\\x\\a.md", "C:\\x\\b.md"]
}
```

```
## D-51 · question · not-blocking
- Status: waiting-for-user
- Urgency: medium
- Raised: 2026-10-27 13:05 by lead sample
- Task: Sample task
- What: The pane shows each entry as one block of text.
  - The register joins line breaks into spaces.
  - The pane draws each field as one line.
- Example: D-40's three options sat in one paragraph.
- Options:
  - A: show points, one per line (one run).
  - B: leave it (no cost).
- Recommendation: A, because the user asked for it.
  - It also makes long entries quicker to read.
- Meanwhile: Work goes on assuming A.
- Evidence: C:\x\a.md, C:\x\b.md
```

## 3. Reading the file (F2 in the pane; F1 for the register's own readers)

- Under any field except `Follow up`, a line that starts with exactly two spaces then `- ` starts a new point of
  that field. Any other line that is neither a heading nor a field still continues the current point, joined with
  one space, as today. `Follow up` blocks read exactly as today.
- In the pane a field's value holds its points joined with `\n` (first point first); a field without point lines is
  one string, as today.
- The register's own readers (`list`, the summary line, the prompt reminder, close, follow-up, migrate) keep taking a
  field's first line, so a headline-first entry reads as before; `list` prints the entry's lines as stored.
- An entry written before this change (no `  - ` lines under a field other than Follow up) gives exactly what it gives
  today, in every reader.

## 4. How the pane draws it (F2)

- `what`: the first point bold, as today; each further point on its own line below it, indented two spaces, starting
  `• `.
- Example, Recommendation, Meanwhile: `Label: <first point>` as today; each further point on its own line below,
  indented two spaces, starting `• `.
- Options with points: one option per point. A point that starts with a letter or number and `:` or `)` gives that
  letter or number as the option's value; otherwise options are numbered 1, 2, ... The recommended mark follows the
  Recommendation's first point, as today. Fewer than two options: plain text, as today. Options without points: as
  today.
- The sample entry above draws as (the pane's own frame, heading and buttons aside):

```
The pane shows each entry as one block of text.        (bold)
  • The register joins line breaks into spaces.
  • The pane draws each field as one line.
Example: D-40's three options sat in one paragraph.
Recommendation: A, because the user asked for it.
  • It also makes long entries quicker to read.
Meanwhile: Work goes on assuming A.
○ A: show points, one per line (one run).   (recommended mark as today)
○ B: leave it (no cost).
```
