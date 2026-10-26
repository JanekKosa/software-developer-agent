# Agent team stage 1, builder A: progress

Started 2026-10-25 08:06 (clock read). Plan: AGENT_TEAM_STAGE_1_PLAN_CLAUDE.md sections 1, 2, 3, 6, 7, 11.

## Files I own (under C:\Repos\My projects\software-developer-agent\orchestrate-agents)

- lib\*.mjs
- hooks\context-guard.mjs, hooks\decision-reminder.mjs
- scripts\register.mjs
- tests\ (only test files for the above)

Not mine: orchestration.config.json (read only), everything else.

## Baseline

- Repo has no commits. orchestrate-agents had: SKILL.md, references\*, scripts\run-heavy.ps1, watch-agent.ps1,
  watch-session.ps1, orchestration.config.json. No lib\, hooks\, tests\ before my run.
- Node v24.13.0. `git` on PATH is C:\Program Files\Git\cmd\git.exe (the broken one on this machine).
- Real agent ids look like `a208a7e24c007b6b6` (a + 16 hex). Workflow agents sit in
  `<session>\subagents\workflows\wf_<id>\agent-<id>.jsonl`.

## Log

- 08:06 read plan sections, skills, config.

- 08:22 first full suite green: 64 tests, 0 fail (node --test --test-reporter=tap "tests/**/*.test.mjs" from
  orchestrate-agents, TEMP pointed into the scratchpad). Hook wall times (10 runs, incl. node start): context-guard
  median 89 ms / max 110 ms; decision-reminder median 75 ms / max 83 ms.

## Built (contract other code must match)

- lib\config.mjs: loadConfig(skillDir), requireSetting(config, 'a.b' | ['a', type, 'c']) (error names the key),
  skillDirOf(import.meta.url).
- lib\decision-register.mjs: registerLocation(startDir, config), addEntry, resolveEntry, listEntries, summaryLine,
  validateEntry, formatEntryLines, UsageError (exit 2).
- lib\git-repo.mjs: findRepoRoot (walk up to a valid .git, no git process), excludeFilePath (worktree commondir),
  ensureExcludeLine, matchesPathPattern (-like semantics, case-insensitive, / = \).
- lib\transcript.mjs: findAgentTranscript, readFileTail (complete lines only), latestContextSize.
- lib\file-lock.mjs (wx lock, wait, stale), lib\text-file.mjs (BOM strip, EOL keep, atomic replace),
  lib\hook-io.mjs, lib\local-time.mjs, lib\sleep.mjs.
- scripts\register.mjs: add/resolve/list/summary; --root = starting folder (register at its repo root);
  list with neither --open nor --resolved = both; exit 0/2/1.
- hooks\decision-reminder.mjs, hooks\context-guard.mjs.

## Decisions

- Repo root found by walking up to a valid .git instead of running git: git on PATH is broken here, and the prompt
  hook should not start a process. Checked equal to git rev-parse in 5 layouts (root, subfolder, nested repo,
  worktree, worktree subfolder).
- Constants not in the config (keys are fixed): lock wait 10 s, stale 60 s, tail 512 KB, marker folder name. To
  report as suggested config keys.
- Options line: each option ends with '.', '!' or '?' (one '.' added when missing), joined by a space.
- Empty arrays and blank texts are refused (exit 2); unknown fields are refused.
- Straight past stop sends only the stop message.
- Concurrent guard runs take turns through <agent_id>.lock in the marker folder (no wait); 6 at once send once.

## Left

- mutation check, real-material checks, live proof (claude -p), node --check, diff review, report.

## Live proof (section 7), 08:24

- One scratch run: claude -p --model haiku, --setting-sources project,local, --settings (only context-guard plus a
  scratch stdin logger), --agents file with type guard-probe (warn 1000), TEMP and cwd in the scratchpad,
  CLAUDE_CODE_DISABLE_CLAUDE_MDS=1. Exit 0 after 12 s, cost 0.09 USD.
- RESULT: the subagent SAW the text. Its transcript holds an attachment record of type hook_additional_context with
  the CONTEXT GUARD warn text, and the subagent's own reply quoted it exactly ("you are at 2k of your 2000k cap").
  The main transcript holds 0 hook_additional_context records (main left alone).
- Real hook input inside the subagent had keys: session_id, transcript_path (main's .jsonl), cwd, scratchpad_dir,
  prompt_id, permission_mode, agent_id, agent_type, hook_event_name, tool_name, tool_input, tool_response,
  tool_use_id, duration_ms. Main's own PostToolUse (tool Agent) had no agent_id/agent_type.
- The agent transcript sat at <dirname(transcript_path)>\<session_id>\subagents\agent-<agent_id>.jsonl as planned.
- The 'haiku' alias ran claude-haiku-4-5-20251001 (not a Haiku 5.5) in this CLI.
- Scratch folder and the run's ~/.claude/projects folder deleted and checked gone.

## Real material and mutation (08:31)

- Context size: library (512 KB tail) vs an independent PowerShell whole-file computation on the 149 real agent
  transcripts of the xpp-agent project (up to 3.3 MB, read shared): 0 differences on 149. Library time per file
  3-5 ms.
- Repo root: findRepoRoot vs git rev-parse --show-toplevel (VS git, read-only) on 33 real folders under C:\Repos
  and C:\Repos\My projects (top folders and one subfolder each): 0 differences on 33. registerLocation with the
  real config: xpp-agent and software-developer-agent commit the register; C:\Repos\BenefitD365 does not.
- Mutation check (scratch copy, one rule broken at a time, caught only when a test fails without a load error):
  first run 37 of 43. Survivors fixed by new tests: guard marker lock held -> nothing sent (lock bypass mutant),
  rounding 321.6k -> 322k (round vs floor), 'add --id' / 'summary --open' / 'list extra' refused, 'list --open
  --resolved' and plain 'list' give both files, a user record that quotes "assistant" with usage is ignored.
  Two mutants were malformed in my script (BOM pattern, a syntax error) and were fixed. Rerun of those: all caught.
- The Write tool stored \uFEFF in two regexes as a literal BOM character; replaced with the escape text.

## Closing (08:37)

- Under load (mutation run in parallel) the guard timing test failed once (median 518 ms > 500 ms); reruns passed.
  Timing bounds loosened to median < 1000 ms (diagnostic still reports the real time).
- Final mutation run on the final code: 43 of 43 caught.
- Final suite after the last change: 65 tests, 65 pass, 0 skipped; guard median 69 ms, reminder median 66 ms.
  node --check on all 20 files: 0 failures.
- Scratch folders (tmp, real, mut, live, run logs) deleted; the real TEMP has no oa-* or claude-context-guard
  folder. Two older scratchpad transcript folders in ~/.claude/projects are not mine (created 08:01 and yesterday).
- Report written: A_REPORT_CLAUDE.md. Nothing left to do for builder A.
