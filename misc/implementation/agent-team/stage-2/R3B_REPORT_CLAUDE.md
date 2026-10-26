# R3b report: the Decision answers watch, every 30 minutes and at once when everything is answered

Worker, 2026-10-26, finished 20:12. Task: `R3B_TASK_CLAUDE.md`. Details and times: `R3B_PROGRESS_CLAUDE.md`.

## Outcome

Done, and live in `<orch>` since 19:57 (last fix 20:09). Nothing is committed.

The user's example now works: 5 entries wait for the user, the user answers all 5 within 3 minutes in the pane, and
the watch ends a few seconds after the fifth answer, printing all 5. On a copy of the real register it ended 0.55 s
after the fifth answer (with a 1 s look; the default look is 5 s). With 4 of the 5 answered it keeps waiting; those 4
come with the next full hand-over (every 30 minutes from the watch's start) or at the user's next message (prompt hook).

## What is different now

- **`register.mjs handover --when-all-answered`** (and `handOverAnswers(..., { whenAllAnswered: true })`): under the
  same lock, if any open entry still waits for the user (Status `waiting-for-user`, empty, or missing), it prints
  nothing, marks nothing, exit 0. Otherwise it does exactly what `handover` does. The check reads the files loaded
  under the lock, so an entry added in between stops it. Plain `handover` and the hook are unchanged.
- **The watch** (`watch-decision-answers.ps1`):
  - A full `handover` at start, then every `EveryMinutes` (30) on a fixed schedule from the start. Looks never
    reset it.
  - Every `LookSeconds` (5) it reads the size and write time of the open file and the answers log. Only when one
    changed since the last good look does it run `handover --when-all-answered`. While nobody writes the register,
    no `register.mjs` runs at all.
  - When either kind prints answers: same output, restart line, exit 0, as before.
  - It learns the two file paths once at start, by running node on a short inline module that calls the register's
    own `registerLocation`. So it watches exactly the files `register.mjs` reads, worktrees included. If that fails
    (for example a missing register setting), it ends at once with
    `DECISION ANSWERS WATCH FAILED | Finding the register of <root> failed: <message>`.
- **Failures, one deliberate difference:** a failed look of either kind still counts toward `failuresBeforeStop`,
  and a good one resets the count. It is now tried again at the next look (5 s later), not at the next interval. A
  failed full look stays due; a failed look in between leaves its change unseen. So an answer is never missed
  because one look found the register busy. The cost: three failures in a row now end the watch within about
  15 s plus the lock waits, where before it took 30 minutes.
- **Settings** (`decisionAnswersWatch`):
  - `everyMinutes` is 30. Its `_why` quotes the user (19:02) and replaces D-13's 15.
  - New `lookSeconds` 5, with its `_why`.
  - `_about` is updated.
  - `_whyFailuresBeforeStop` no longer says "30 minutes at the default interval". It now says a failed look is tried
    again at the next look.
  - Each setting can also be passed as a parameter (`-LookSeconds` is new).
- **`SKILL.md`:** neither place named the 15 minutes.
  - Step 2 of "Starting work" gets the sentence "It hands them over every 30 minutes, and at once as soon as every
    open entry is answered."
  - The sentence in "The decision register" gets "(every 30 minutes, and at once as soon as every open entry is
    answered)".
  - The lines around both were rewrapped. No other words changed.

## Files changed (all LF, no BOM, non-ASCII counts unchanged)

`<orch>\scripts\watch-decision-answers.ps1`, `lib\decision-register.mjs`, `scripts\register.mjs`,
`orchestration.config.json` (that section only), `SKILL.md` (the two places),
`tests\scripts\watch-decision-answers.test.mjs`, `tests\lib\decision-register.test.mjs` and
`tests\scripts\register.test.mjs` (handover tests only). Hash check against my 19:10 baseline: 8 of 42 changed,
nothing else. No machine change. Scratch folders, logs and my scratchpad files are deleted, and no process is left.

## Checks

- **Node suite:**
  - Baseline: 213 of 213 (1:55).
  - Final, in `<orch>` after the last change: **220 of 220** (2:06). `run-heavy.ps1`'s last line:
    `HEAVY COMMAND DONE | exit 0 | waited 0:00 | ran 2:06 | peak 268 MB in its processes | free memory at its
    lowest 3245 MB | slot 1 of 1`.
  - The two limit-stop-server timing tests did not fail in any of the 4 full runs.
- **Tests:** +2 module, +2 command line, watch file 12 to 15.
  - Module:
    - with whenAllAnswered it hands nothing over while an entry waits, then all of them once none does;
    - an entry with no Status line, an empty one, or one sent back by a follow-up counts as waiting;
    - plain hand-over is unchanged.
  - Command line:
    - nothing while one entry waits, then exactly `handover`'s text;
    - an entry added while the command waits for the lock stops it;
    - wrong use of the flag gives exit 2.
  - Watch:
    - two of three answered: still running; an entry added before the last answer: still running; the last answer:
      it ends, all three in log order, hostile words exact; answers typed in the chat and processed ones are never
      printed;
    - one of two answered: it ends only at the full look, from the settings;
    - a stand-in `register.mjs` counts the runs. No run while nothing changes. One look with the flag per change of
      either file, including a change that keeps the size. The full look stays on its period from the start. A
      failed look is retried, and three in a row end it;
    - the defaults 30 and 5 are in the settings;
    - `lookSeconds` missing, 0 or below is refused;
    - a missing register setting is named.
  - The watch file takes about 52 s, against about 46 s before.
- **Invariant, on a copy of the real `decisions\`:** 0 differences on 40 (the resolved file byte-identical with its 29
  entries, the open file's header, the 10 earlier log records).
  - The real register had no open entry at 19:32, so I added 5 synthetic entries (D-28 to D-32) to the copy and
    answered them 2.5 s apart.
  - The watch kept running after each of the first 4. It ended 552 ms after the 5th, printing all 5 in order, words
    exact.
  - Started again, it kept waiting.
  - The 5 answered entries differ only in their Status line. The 5 added records hold the exact words.
- **Mutation check: 17 of 17 caught.** These include all 7 the task named: flag ignored, no-Status entry not
  counted, check outside the lock, looks running `register.mjs` every time, period reset by looks, early trigger
  using plain `handover`, default left at 15.
  - 15 were caught on the first pass.
  - "Sleep ignores the next full look" and "change seen by size only" survived. I added assertions, and both are
    now caught.
  - The 7 mutants that hit the reworked stand-in test were re-run against the final tests: all still caught.

## Not tested

- A real main session following `SKILL.md` with the new timing. That cannot be done from here.
- 30 minutes and 5 seconds in real time. The tests use 0.2 to 1 s looks and 1.2 to 60 s periods.
- `tests\limit-scripts.tests.ps1`. The task says not to read it, and it covers other scripts.

## Risks and open points

- **Faster FAILED** (decision above). Example: a writer that crashed holding the lock. Before, the next look 15
  minutes later found the lock stale and carried on. Now three looks in about 45 s fail, and the watch ends with
  FAILED before the lock is 60 s old. The main session restarts it and it works. Recommendation: keep it, because
  a missed early hand-over is worse than one restart.
- **The lock test waits 1.5 s.** That is how long it gives the command to reach its lock wait. On a very slow
  machine the "check outside the lock" mutant could slip through; the real code passes either way.
- **Live `<orch>` was broken for 70 seconds.** From 20:08:31 to 20:09:41 its watch test file held one failing test:
  a chained command of mine copied the new test before its fix was in place. The script live during that minute was
  the earlier working version.

## Text a shared file needs (not mine)

None needed. `SKILL.md`'s command table (around line 132) describes `handover` without the new flag. Only the watch
uses the flag, so I left it alone and did not read that part.

## Learned

- `node --input-type=module -e <code> a b` gives `process.argv.slice(1)` = `[a, b]`.
- `pwsh -File x.ps1 -Only M1,M2` passes one string, not an array.

DECISIONS TAKEN: a failed look is retried at the next look (5 s) instead of the next interval, so three failures can end the watch in under a minute, not 30 minutes, because a missed early hand-over was judged worse | the full hand-over runs on a fixed schedule from the start, and a failed full look stays due | the watch gets the register's file paths from the register's own code (inline node module) instead of a PowerShell copy of findRepoRoot or a new register.mjs command | the wait between looks is cut to the next full look when that comes sooner | SKILL.md: the new words added as one sentence and one parenthesis, since neither place named the 15 minutes | the "one of two answered ends at the period" test was merged into the old "interval from the settings" test, to keep the file's time down
INITIATIVES: _whyFailuresBeforeStop reworded (it said "30 minutes at the default interval") | the locate step's errors print only the message, not node's stack | tests beyond the list: empty Status line, follow-up, plain hand-over unchanged, wrong use of the flag, same-size change, failed look retried and counted, LookSeconds range and missing key, missing register setting | 10 mutants beyond the 7 asked | addEntry helper split out of makeRepo in the watch test file
ISSUES FOUND: live <orch>'s watch test file had one failing test from 20:08:31 to 20:09:41 (my chained copy ran after a failed Edit), fixed and the suite re-run (220 of 220) | the real OPEN_DECISIONS_CLAUDE.md header still names ANSWERED_DECISIONS_CLAUDE.md and "keeps it open" (seen in my 19:32 copy; R3 reported it; not mine) | the Node suite takes about 10 s longer (1:55 to 2:06)
QUESTIONS: none
