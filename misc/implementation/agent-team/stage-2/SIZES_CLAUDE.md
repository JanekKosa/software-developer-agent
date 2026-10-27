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
| P1 | Pane switch check + command line + 54 tests + invariant + 25 mutants | 335 | 162 | 30 | 862 (946 first mutation pass) | Two points plus a wide invariant and mutation went past the ~75-call plan to 162 calls; finished past the 320k warning. Cut pane runs smaller. |
| P2 | Two guide pages (11 + 1 places) + checks | 158 | 75 | 8 | none (no heavy command) | Beside P3. |
| P3 | Real-engine headless check, 9 engine runs | 176 | 56 | 11 | 505 (scenario run), 451 (last) | Beside P2; 0 model turns. |
| S1 | State folder: staging + root + Node side | 320 | 150 | 35 | (not reported) | Two points + staging + both suites + 17 mutants; reached the 320k warning at the end. The 15 new tests and the red-phase cleanup cost calls. |
| SC-F1 | Entries in points, register side | 287 | 90 | 39 | (not reported); lead's Node run 359 | Two points + 24 mutants; the readers needed no change. |
| SC-F2 | Entries in points, pane side | 262 | 102 | 27 | (not reported); lead's pane run 862 | Beside SC-F1 and the other lead's S4 (its red phase hid the pane suite 13:02-13:08). |
| S2 | State folder: PS usage side | 341 | 131 | 40 | (see report) | Two points + 50-case table + probe question filled it; warned before the mutation check. PS state runs: cut smaller. |
| S5 | State folder: docs | 298 | 153 | 18 | none (no heavy command) | Beside S2; headless Edge renders cost calls. |
| S3b | State folder: switch-over script | 304 | 90 | 30 | (see report) | Alone in effect (S3a started after); 26 cases + 22 mutants fitted. |
| S3a | State folder: relaunch, slots, %, PS mutation | 330 | 145 | 57 | (see report) | Beside S4; carried S2's mutation check; past the warning at the end. |
| S4 | State folder: pane rule | 275 | 107 | 40 | (see report) | Beside S3a, other repo. |
| S6 | State folder: re-base + merged check | 208 | 87 | 19 | (see report) | Mechanical merge + six check runs; fitted easily. |
| S7 | State folder: pane variables | 208 | 78 | 20 | (see report) | Small run; one baseline rerun after timeouts at 504 MB free. |
| SC-S1 | Skills come in + machine notes split | 248 | 91 | 16 | 296 (lead's Node run) | Two points + split table + checker self-test; beside SC-S2. |
| SC-S2 | Pane copy + marketplace + claude-code-mods to EXT | 183 | 85 | 10 | 805 (lead's pane run) | Small; ran the switch steps in a scratch config. |
