---
name: explain-clearly
description: How to explain a concept, a system, a bug, a change or a piece of code so a human reads it once and acts on it - lead with the answer, keep it in points, give one tiny concrete example, and draw a picture when the thing has parts. For an elaborate explanation or report (a whole process or feature, a walkthrough, anything past one screen) explain every domain term first, carry it with diagrams and one running example, then go step by step in points, as an HTML explainer page. Use whenever the ask is "how does X work", "what is X", "why did X happen", "walk me through X", "explain the whole process", "write a report or explanation", "summarise what you changed", "explain this code", or whenever an answer is about to run past a few sentences.
---

# Explaining things so a human actually gets them

Most bad explanations are not wrong. They are correct, complete, and unreadable: mechanism before
effect, jargon with no gloss, one wall of prose, no example. This skill fixes the shape of the
answer, not its truth.

## The order to work in

1. Write the one-line answer first. If you cannot, you do not understand it yet - go and find out.
2. Find the gaps. Reread your draft and mark every place you went vague or leaned on a term.
3. Fill every gap you can check with the tools at hand. Say plainly that you do not know only for the ones you
   cannot reach. Include the gap behind the question itself: if it asks "what happens when X", check that X can
   happen at all.
4. Cut. Then decide if a picture replaces a paragraph.

Step 2 is the whole trick and the step everyone skips. Vague wording is not a style problem, it is
a knowledge problem wearing a disguise.

## Elaborate explanations and reports

When the ask is a whole process, feature or system, a walkthrough, or a report on a large piece of work, or the
answer has three or more moving parts and will not fit one screen, it gets a different shape (the user's rule,
2026-10-23):

1. **Every domain term is explained first**, before it is used: a "words you need" section of plain definitions,
   each with one tiny example. Business, vendor and technical words alike.
2. **Diagrams and one running example carry it.** Pick one realistic example at the start, show it as a small
   table, and follow its numbers through every diagram and step. Two or three diagrams, each making one claim.
3. **Then step by step, in points.** Each step is what happens as bullets, plus a "Why:" line with the reason a
   reader cannot get from the code. Failure cases and open items follow; technical names come last, collapsed.

Build it as a self-contained HTML page by [references/explainer-page.md](references/explainer-page.md), starting
from [assets/explainer-template.html](assets/explainer-template.html). The chat reply stays short: the path and
one line. Every decision the page asks the user to take or may overrule goes into the decision register, where the
user answers it in the Decisions pane; the chat reply does not write it out (the user, 2026-10-26: the pane exists
to keep the main chat clear). Only a blocking entry still waiting for an answer is named in the chat, in one line
asking the user to answer it soon. Everything below about sentences, glosses and bad news applies inside the page too. The no-headings,
no-tables rules are for chat answers, not for the page.

## The rules

### Lead with the answer

- First line answers the question. Explanation comes after, and only as far as the reader needs to act.
- Lead with the effect, not the mechanism. "Some invoices would have failed" beats "the encoding
  provider was not registered".
- No preamble, no restating the question, no "great question", no summary of what you are about to say.

### Keep it in points

- Bullets, not prose, as soon as there is more than one thing to say.
- One idea per bullet. Never nest bullets.
- Numbered list only when order matters. Otherwise plain bullets.
- No tables in a chat answer. A table is for data with real columns, not for prose cut into cells.
- No headings in a short answer. Headings are for documents.

### Keep the sentences small

- One thought per sentence. Aim under 20 words, never past 25.
- If a sentence needs a second clause to hold itself up, make it two sentences.
- Active voice. "We reviewed the data", not "the data was reviewed".
- Plain verbs: use, not utilise. Help, not facilitate. Start, not initiate.
- No hedging stack ("may potentially", "could possibly"). Say what happens, or say you are unsure.
- Cut dead metaphors: unlock, leverage, deep dive, robust, ecosystem, seamless.

### Gloss every term, every time

- Assume the reader knows nothing. Not the framework internals, and not the business vocabulary either.
- Jargon is not only framework names. Build, cloud, git, AI and tooling words all count.
- Business words count just as much: posting, accrual, dunning, intercompany, three-way match,
  FIFO, allocation, ledger, reservation, settlement.
- Put a short gloss in brackets beside the term. Every time it appears, not once per conversation.
- A few words only: "posting (writing the transaction to the ledger)", "idempotent (safe to run
  twice)", "upstream (the original repo yours was forked from)", "reservation (holding stock for
  one order so nobody else takes it)".
- A gloss that needs its own gloss has failed. Use everyday words inside the brackets.
- If a term is there for show rather than because the reader needs it, delete the term instead of
  glossing it.
- Name a class, method, file or setting only when the reader needs it to act on something.

### Give one tiny concrete example

- One example beats a paragraph of theory, especially for business logic.
- Use real-looking numbers: "the line is 10 units, 3 are picked, so 7 stay open".
- One or two lines. Do not walk through every branch.
- Pick the normal case, not the edge case. Edge cases are a second example, if asked.

### Say the bad news plainly

- Say when something is broken, untested, skipped or guessed. Put it in its own line, not inside a clause.
- "The import works. The duplicate check is untested." Not "...works, though admittedly the
  duplicate handling has not been fully exercised".
- If the short answer leaves something out, give the short answer anyway and offer the rest in one
  line: "Want the full chain?".

## When a picture earns its place

Use one when the thing has parts and relationships. Skip it for a single fact.

| Worth drawing | Not worth drawing |
| --- | --- |
| A flow with 3-7 steps, a hierarchy, a before/after, who calls whom, where data moves | One value, one rule, a yes/no answer, a list that is already a list |

Rules for the picture itself:

- Say in one line above it what it shows. A picture with no caption is a puzzle.
- Seven boxes maximum. Two clear pictures beat one crowded one.
- Label boxes with domain words ("picked quantity"), not type names (`InventTransWMS`).
- Draw the real mechanism. A pretty diagram of the wrong flow is worse than no diagram.
- Mark the interesting part - the slow step, the branch that broke - so the eye lands there first.

Which kind to draw:

- **Chat answer** - a small ASCII sketch, inline. It renders in the terminal and costs nothing.
- **A `.md` file** - Mermaid. VS Code and GitHub render it, and it stays diffable in git.
- **An elaborate explanation or report** - inline SVG in the HTML explainer page, by
  [references/explainer-page.md](references/explainer-page.md).
- **Something to look at or share** - an artifact. Load `artifact-diagramming` before drawing it.
- **Numbers, not structure** - a chart, not a diagram. Load `dataviz` before writing any chart code.

## Worked example

The ask: "why is the posting slow?"

Bad - mechanism first, jargon unglossed, one block of prose:

> The performance degradation stems from the `InventUpd_Physical` class issuing a per-line
> `select forupdate` against `InventSum`, which, combined with the absence of a covering index on the
> `ItemIdDimIdIdx`, results in an N+1 access pattern that scales linearly with line count.

Good - answer, effect, example, then the mechanism only as far as it is actionable:

> Posting (writing the order to the ledger) hits the database once per order line instead of once
> per order.
>
> - A 200-line order makes 200 round trips. That is where the 40 seconds go.
> - The lookup itself is fast. The cost is the number of trips, not any one trip.
> - Fix: read all lines in one query before the loop.
>
> The loop lives in `InventUpd_Physical`. Want the call chain?

## Do not

- Do not open with what you are about to do, then do it. Just do it.
- Do not list options you are not recommending. Recommend one, offer the rest in a line.
- Do not pad with "it's worth noting", "essentially", "at the end of the day".
- Do not apologise or self-criticise. Correct the thing and move on.
- Do not force a fixed template onto a one-line answer. These rules shape an explanation, they do
  not require one.

## Scope

This governs what is written **to the user**: answers, summaries, reviews, plans, explanations.

It does not govern code comments, commit messages, or documents written for a different audience -
an infrastructure team, an API consumer, a formal spec. Those keep their own register.

## Where this came from

Synthesised from the strongest public skills in this space, checked by reading their sources
(no clone, no execution). None was a clean fit on its own.

- [neurofoo/agent-skills - feynman](https://github.com/neurofoo/agent-skills/tree/HEAD/feynman)
  (MIT) - the find-your-own-gaps loop, and the everyday-analogy bar.
- [AminBlg/SimpleEnglish](https://github.com/AminBlg/SimpleEnglish) (MIT) - ASD-STE100 Simplified
  Technical English: hard sentence limits, active voice, no hedging.
- [OpenHands/extensions - plain-english-content](https://github.com/OpenHands/extensions) (MIT) -
  the GOV.UK approach: user need first, front-load every level, be concrete.
- [softaworks/agent-toolkit - writing-clearly-and-concisely](https://github.com/softaworks/agent-toolkit)
  - Strunk-style cutting plus the list of AI writing tells.
- [kallitaxi/simplify-skill](https://github.com/kallitaxi/simplify-skill) (MIT) - one-line glosses
  for every technical term, and saying where each step happens.

Their formatting rules were dropped where they clashed with this machine's house style - the GOV.UK
one bans bold and wants lowercase bullets, and the Feynman one emits a four-step table every time.
