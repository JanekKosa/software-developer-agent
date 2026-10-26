# Agent team, stage 2: sizes

One row per run: the worker's final size (when known), tool calls, minutes, and the peak memory of its heavy
commands (from run-heavy.ps1's last line). Leads read this at every wake-up to plan their next cut.

| Run | Task | Final size (k tokens) | Tool calls | Minutes | Peak memory (MB) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Answers log | 340 | 136 | 38 | 224 | Two points (log + close/follow-up) plus texts and invariant filled the worker; guard at 323k stopped it before the mutation check. Cut smaller next time. |
| R1b | Follow-up of several lines + R1's mutation check | 238 | 102 | 39 | 288 | One small build point + 31 mutants fitted with room to spare. |
| R2 | Hand-over (lib + command + hook) | 293 | 149 | 49 | (see report) | Two points + 15 mutants fitted; waited for run-heavy slots held by an xpp-agent job. |
| R3 | Decision answers watch | 280 | 111 | 56 | 320 | Ran beside R4; Node suite now ~40 s longer (watch reset test ~19 s). |
| R5 | migrate, three layouts | 315 | 134 | 32 | (see report) | Ran beside R4b; near the warning at the end. |
| R4b | Pane failed-read retry | 163 | 60 | 12 | 568 | Small run beside R5. |
| R3b | Watch: 30 min + all-answered | 332 | 154 | 64 | 268 | Ran beside R4c; near the warning. |
| R4c | Pane: stat retry + notice | 204 | 75 | 14 | 615 (mutation run) | Small run beside R3b. |
| R6a | Rename watches in code/tests/config | 332 | 151 | 43 | 311 | Beside R6b1/R6b2. |
| R6b1 | SKILL.md + task-lead.md + README | 277 | 123 | 24 | none (no heavy command) | Beside R6a/R6b2. |
| R6b2 | references\ docs and guides | 255 | 126 | 18 | none (no heavy command) | Beside R6a/R6b1. |
| R7 | Three corrections | 144 | 71 | 17 | 321 | Small. |
| R7b | Last double-quoted forms | 118 | 38 | 14 | 324 | Small. |
| R4 | Pane: answers log + Follow up | 283 | 119 | 26 | 740 (mutation run), 549 (tests) | Ran beside R3, other repo. |
