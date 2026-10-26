# R4 progress: the Decisions pane reads the answers log and shows Follow up

Started 2026-10-26 17:31 (Get-Date). Task: `R4_TASK_CLAUDE.md` in this folder.

## Files I own

Everything under `C:\Repos\My projects\claude-code-extensions\decisions-pane` except `.claude-plugin\plugin.json`.
Progress and report: `R4_PROGRESS_CLAUDE.md`, `R4_REPORT_CLAUDE.md` in this folder.

## Status

- [x] Baseline (17:35)
- [x] Point 1 code (17:47): RED run 30 pass / 10 fail (the new tests, right reasons: label, no log reading); GREEN
      run 41 pass / 0 fail, tsc exit 0, validate passed (warnings ICON_MISSING, LICENSE_MISSING: directory checks,
      not this change). README still to do.
- [x] Point 2 tests written: register-world (stand-in answer writes the log record, no answered file; followUpLines,
      logRecord, writeLog, drawnLines, linesFrom, world.reads); pane tests D13 (changed: label), D13b, D19-D27;
      unit test R7 (notice wording).
- [x] README (17:47)
- [x] Invariant (17:50): repo A = copy of the agent team's real `decisions\` (0 entries, 0 waiting, 2 log records,
      0 unreadable lines, CRLF in both files); repo B = real register.mjs add x3, answer, follow-up (7 lines, an empty
      line, `- Options: C`, `- Status: ...`, a 4-space indent), answer D-3, then a minute later answer (spaces, CRLF,
      Polish letters) and follow-up: 3 entries, 2 waiting, 3 log records, 4 history items. Generator
      `make-invariant.mjs` (own reader, no shared code) + test in the scratch copy: 5 INV tests pass = 0 differences
      on 2 waiting entries, 4 history items, 5 log records, 4 given texts.
- [x] Mutation check (17:55): 19 mutants in `mutate.mjs`, one heavy command. First pass 16 of 19 (M4 did not apply:
      find string also in byUrgency; M13 first-line trim and M14 every id's answers survived). Added R8 and D22c;
      second pass 19 of 19 caught, restored copy 48/48 pass.
- [x] Final checks on the real folder (17:55, after the last edit): tsc exit 0; validate passed (LICENSE_MISSING and
      ICON_MISSING directory checks, same on the untouched baseline copy); tests 43 pass / 0 fail, peak 549 MB.
- [x] Cleanup (17:56): baseline, inv-a, inv-b, mut, tscheck, scripts and logs deleted (no links in any). Left: the
      engine's empty `~\.claude\dev-mods\bf7022c6-...` folder (made 17:31:55 when plugin-authoring loaded).
- [x] Report: `R4_REPORT_CLAUDE.md` (17:57).

## Baseline (before any change, 2026-10-26 17:35)

- claude-code-extensions has no commits: everything is untracked, so git cannot diff my change. Baseline copy of the
  pane: `<scratchpad>\baseline\decisions-pane` (SHA-256 list taken; no links in the pane folder).
- `claude.exe` 2.1.310 (`%USERPROFILE%\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\...`).
- `claude plugin validate decisions-pane`: passed, 1 warning (ICON_MISSING, a plugin-directory check).
- `claude plugin test decisions-pane` through run-heavy: 29 pass, 0 fail, 2 files; peak 588 MB.
- Type-check: TypeScript 7.0.2 from `claude-code-extensions\claude-toolbar\node_modules\typescript` (only tsc on the
  machine), tsconfig at `<scratchpad>\tscheck\tsconfig.json` (options from the API types' header, include = the
  types file + the pane's hooks, types, tests): exit 0.

## Measured on the real register.mjs (spike in a scratch repo, deleted, 2026-10-26 17:34-17:37)

- `add --file` needs kind, blocking, urgency, task, what, example, options (list), recommendation, meanwhile,
  evidence (list), raisedBy.
- A Follow up block: `- Follow up: <YYYY-MM-DD HH:MM>: <first line verbatim, leading/trailing spaces kept>`, then each
  further line as two spaces + the line verbatim; an empty line is a line of exactly two spaces; CRLF file.
  Continuation lines `  ## D-9 ...` and `  - Status: ...` occur when the text holds them.
- The register drops leading and trailing empty lines of the text and turns CRLF inside it into a line break.
- `follow-up` needs an unprocessed answer (exit 2 otherwise) and marks the answer `processedAt`.
- An answer is kept exactly in the log (spaces, CRLF as `\r\n`).

## Plan (point 1)

- types: `EarlierLine` -> `HistoryItem { label: 'Answered' | 'Follow up', at, text }`, `DecisionRow.history`; new
  state `logNotice: string`.
- decisions.ts: `answersOf(logText)` -> answers + unreadable line numbers; Follow up continuation lines kept (two
  spaces stripped, `  ` = empty line); history = old in-entry lines (file order) then log answers + Follow up blocks
  sorted by time, answer first on a tie (stable sort).
- registers.ts: config `answersLogFile` (default `ANSWERS_LOG_CLAUDE.jsonl`), `logPath` beside the open file; stamp
  covers both files; returns rows + notice.
- poll.ts writes the notice; pane draws it once under the summary; history drawn line by line, paragraphs with a
  margin, `Follow up` label orange.
- decision-state.ts: shape tag `decisions-3`, LOG_NOTICE atom.
