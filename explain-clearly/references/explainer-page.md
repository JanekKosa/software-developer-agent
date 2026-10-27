# The explainer page: elaborate explanations and reports

The user's rule (2026-10-23), given after the CTS-1234 claim decision guide: **an elaborate explanation or report
explains every domain term first, carries the explanation with diagrams and one running example, and then goes
step by step, in points.** This file is the recipe for that page. The rules in `SKILL.md` (short sentences, plain
words, the answer first) still apply to every line of it.

Exemplar on this machine: `C:\Repos\ContosoD365\FDD\CTS-1234_ClaimDecision_Guide.html` (untracked, may be gone).
Blank starting point: [`../assets/explainer-template.html`](../assets/explainer-template.html).

## When to build one

- The ask is a whole process, feature, system or flow: "explain the whole process", "walk me through how X works
  end to end", "how does this feature work, with background".
- The ask is a report or document: a report on a feature or a multi-session piece of work, an explanation to keep,
  a hand-over a person will read.
- The answer has three or more moving parts, or will not fit one screen of chat.

A short question still gets the short chat answer. Do not turn "why is this field empty?" into a page.

## The three rules

### 1. Every domain term is explained before it is used

- Open with a **"The words you need"** section, before the problem and before any step.
- One card per term: a plain definition in one or two sentences, then **one tiny example** in muted text.
  "Adjustment: D365 never edits a posted line; it posts a minus copy and then the corrected lines.
  Example: -4 h, then +3 h on one project and +1 h on another."
- Business words count as much as technical ones: posting, work in progress, line property, voucher, batch job,
  status. So do the vendor's words (Annata's "work order split", "claim confirmation").
- Pick the 8-12 terms the rest of the page actually leans on. A term that appears once can keep an inline gloss
  in brackets instead.
- After the glossary, use the terms consistently. Do not introduce a new word for the same thing later.

### 2. Diagrams and one running example carry the explanation

- **Choose one realistic example at the start** and follow it through every section, table and diagram. In the
  exemplar: one claim with three lines (4 h, a hose, a fee) where 410 EUR of 770 EUR is rejected. Use the real ids
  of a test case when there is one, and say in the footer which numbers are made up.
- Show the example as a small table first (the "problem" section), with totals.
- **Draw two or three diagrams, no more**, each making one claim:
  - the big picture: the phases in the order they run, with the reason for the order in the caption;
  - where things sit: the records, projects or systems and the one arrow that matters, in the accent colour;
  - optionally a before/after of the key mechanism (often better as a 4-row table).
- Every diagram has a caption saying what it shows and why it matters, and an `aria-label` with the same claim.
- Use domain words on the boxes ("claim sub-project"), not type names (`AMClaimTable`).

### 3. Then step by step, in points

- A numbered list of steps, only because the steps are a real sequence. Number 0 for one-off setup is fine.
- Each step: a short heading, its **business purpose** in one sentence ("Business purpose: turn the hours the
  mechanic logged into lines the customer is invoiced for"), what happens as bullets, and a **"Why:"** line set
  apart (left rule, muted text) for the order, the trap avoided or the rule behind it.
- **When a step reuses an existing feature** (a Contoso button, a vendor function, a standard posting), explain that
  feature's own business logic: what it is for, how its setup decides the result, and one example with its
  numbers. Split such a step into lettered parts (4a, 4b, ...). The user asked for this (2026-10-23) when the
  first guide said only "project hours are copied to standard hours, following the copying rules": it named the
  feature but never said why the business needs it or how the rules pick.
- If the setup is the customer's own (copying rules, posting profiles), invent a small example setup to show the
  logic and label it "made up for illustration".
- Put the running example's numbers into the steps where they change ("Total rejected amount: 410 EUR").
- After the steps: **"When something fails"** as cases (situation, then what happens and what to do), and
  **"Still open"** with a small flag per item (waiting, to do, note).
- Technical detail last, collapsed in `<details>`: a table of object names and their plain-language role.

## Page skeleton, in this order

1. Header: eyebrow (ticket, area, product), an H1 that names what is explained ("What the Claim decision button
   does"), a lead paragraph that answers it in two sentences.
2. "At a glance" box: 3-5 bullets a reader can stop after.
3. Contents as a row of link chips.
4. The words you need (rule 1).
5. The problem, with the running example's table (rule 2).
6. The big-picture diagram.
7. The where-things-sit diagram.
8. Step by step (rule 3).
9. When something fails.
10. Still open.
11. For developers (collapsed).
12. Footer: date, the sources it was written from, what is made up.

Leave out any section that would be empty. Do not add sections the subject does not need.

## Verify before you write it down

- Every sentence on the page must be traceable to code, source or a document you read in this session. A page
  reads as authoritative, so an overreaching sentence does more harm here than in chat.
- Reread the finished page once against the code, sentence by sentence. In the exemplar this caught three: a
  glossary line ("closed off") that the code does not do, a "before this change" claim that was a guess, and a
  failure case that promised a message the code does not give.
- Say what is untested or unknown in "Still open", not in a hedge inside a step.

## Building the HTML

Copy `../assets/explainer-template.html` and replace the bracketed placeholders. It already holds the parts below.

- **One self-contained file**: inline CSS, inline SVG, no scripts, no external images. The only external request is
  the Google Fonts stylesheet, and every face has a fallback stack, so the page also works offline.
- **One reading column** of about 46rem, a 16px side gutter written with `max(16px, env(safe-area-inset-left))`,
  sections laid out with grid and `gap`.
- **Colour tokens**: every colour is a token on `:root` (light), redefined under
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }` and `:root[data-theme="dark"]`.
  `body` sets its background from a token. Two **meaning colours** (good / bad, approved / rejected, before / after)
  plus a neutral accent. Pick them from the subject; the template's spruce and amber suited a warranty claim.
- **Type**: a condensed display face for headings, a plain body face, a mono face for ids, codes and labels
  (template: Barlow Semi Condensed, IBM Plex Sans, IBM Plex Mono). Ids such as `100-W0000294` always go in the
  mono chip style.
- **Diagrams**: inline `<svg viewBox="...">` inside `.diagram`, which scrolls sideways on a phone
  (`min-width: 640px` on the svg). Shapes take classes from the page CSS (`.d-box`, `.d-box-bad`, `.d-arrow`, ...),
  text uses `currentColor`, arrowheads are `<marker>`s. `role="img"` and an `aria-label`, wrapped in `<figure>` with
  a `<figcaption>`. Keep box text to about 24 characters per line at 12.5px; put sentences in the caption.
- **Tables**: inside `.table-wrap` (scrolls on a phone), `font-variant-numeric: tabular-nums`, amounts right-aligned,
  meaning colours on the amounts that matter.
- Size: 25-50 KB is normal. Much more means the page explains too much.

## Where it goes and what the chat says

- Save it beside the task's own notes (in ContosoD365: `FDD\`, next to the ticket's knowledge base), named
  `<TICKET>_<Subject>_Guide.html`. It is a working document: do not commit it unless asked.
- Check the tags are balanced before handing it over (count opening and closing tags per element name).
- The chat reply is short: the clickable path, one line on what the page covers, and anything still unverified.
  The exception: every decision the page asks the user to take or may overrule is written out in the chat too, as
  numbered items of one or two lines; the page never replaces them (the user, 2026-10-26).
- In Claude Code, offer once, in one line, to publish it as a shareable page (Artifact tool; load
  `artifact-design` before publishing). Copilot has no such tool; the file is the deliverable.
