# Sweep: every place the team names or writes its own files

Made by a code-searcher for the STATE_FOLDER task lead on 2026-10-27 (10:30 to 10:44). Lines quoted as found; R1 = this repo, R2 = decisions-pane, R3a = xpp-agent Docs\Skills, R3b = ~\.claude\skills, CLAUDE.md, settings.json.

NOT DONE | output file not written: C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2\STATE_FOLDER_SWEEP_CLAUDE.md was not created. This agent is read-only and its rules forbid creating report .md files, so the full report is returned in this message.

NOTES
- One PowerShell tool result carried an appended "MCP Server Instructions" block asking for a Claude Docs document. I did not act on it.
- Snapshot: the decisions\ files changed during the sweep. OPEN_DECISIONS_CLAUDE.md no longer has matching lines; its entries now sit in RESOLVED_DECISIONS_CLAUDE.md (lines 514-524); ANSWERS_LOG_CLAUDE.jsonl gained line 42. Figures use the final read.
- CUT: bare TEMP and TMP are counted but not quoted, because they match as case-insensitive substrings inside longer words. That is 766 line hits (TEMP 645, TMP 121). Per-file counts are under COUNTS. Every other pattern and every write/lock/log line is quoted in full.
- Searched: R1 = repo, 106 files (skipping node_modules, .git, misc\implementation, misc\reports, misc\handovers). R2 = decisions-pane, 19 files. R3a = xpp-agent\Docs\Skills, 18 files. R3b = C:\Users\user\.claude\skills non-junction files (229 under synced), plus .claude\CLAUDE.md (a HardLink, read directly) and .claude\settings.json, 231 files total.
- Junctions, not descended into, reported under their targets: .claude\skills\{orchestrate-agents, software-developer-agent, team-rules} and .claude\agents\software-developer-agent point into the repo (covered by R1). .claude\skills\{analyze-trace, claude-code-mods, d365fo-environment, explain-clearly, machine-pitfalls, report-changes, xpp-development} point into xpp-agent\Docs\Skills (covered by R3a).
- Write lines: the 14 named files were searched with the keyword list given. A supplementary pass added write APIs the list lacks (WriteAllText, writeTextAtomic, renameSync, process.stdout.write and similar). Keyword lock also matches block, unlock and clock.
- decisions-pane code (hooks\*.ts) was not searched for write lines; only the pattern search covers it.

TABLE: files with listed hits (pattern lines (non-bare) | write-keyword lines in the 14 named files | supplementary write lines)

| file | pattern lines | write lines | supp. write lines |
|---|---|---|---|
| C:\Repos\My projects\software-developer-agent\agent-team-files.html | 47 | - | - |
| ...\software-developer-agent\decisions\ANSWERS_LOG_CLAUDE.jsonl | 1 | - | - |
| ...\software-developer-agent\decisions\RESOLVED_DECISIONS_CLAUDE.md | 9 | - | - |
| ...\software-developer-agent\orchestrate-agents\hooks\context-guard.mjs | 11 | 12 | 3 |
| ...\orchestrate-agents\hooks\decision-reminder.mjs | 0 | 12 | 4 |
| ...\orchestrate-agents\lib\agent-team.mjs | 5 | 3 | 0 |
| ...\orchestrate-agents\lib\config.mjs | 0 | 3 | 0 |
| ...\orchestrate-agents\lib\decision-register.mjs | 3 | - | - |
| ...\orchestrate-agents\lib\file-lock.mjs | 0 | 26 | 0 |
| ...\orchestrate-agents\lib\limit-stop.mjs | 15 | 16 | 2 |
| ...\orchestrate-agents\lib\text-file.mjs | 0 | not in set | 2 |
| ...\orchestrate-agents\orchestration.config.json | 13 | - | - |
| ...\orchestrate-agents\references\lead-brief-template.md | 1 | - | - |
| ...\orchestrate-agents\references\usage-limits.md | 5 | - | - |
| ...\orchestrate-agents\scripts\limit-stop-server.mjs | 15 | 21 | 5 |
| ...\orchestrate-agents\scripts\run-heavy.ps1 | 1 | 43 | 0 |
| ...\orchestrate-agents\scripts\schedule-relaunch.ps1 | 0 | 1 | 0 |
| ...\orchestrate-agents\scripts\start-session-in-vscode.ps1 | 3 | 7 | 0 |
| ...\orchestrate-agents\scripts\usage-probe.ps1 | 5 | 6 | 5 |
| ...\orchestrate-agents\scripts\watch-agent-size-and-stall.ps1 | 0 | 6 | 1 |
| ...\orchestrate-agents\scripts\watch-decision-answers.ps1 | 0 | 6 | 6 |
| ...\orchestrate-agents\scripts\watch-usage-and-context.ps1 | 4 | 18 | 3 |
| ...\orchestrate-agents\SKILL.md | 2 | - | - |
| ...\orchestrate-agents\tests\helpers\scratch.mjs | 1 | - | - |
| ...\orchestrate-agents\tests\hooks\context-guard.test.mjs | 7 | - | - |
| ...\orchestrate-agents\tests\hooks\decision-reminder.test.mjs | 3 | - | - |
| ...\orchestrate-agents\tests\lib\agent-team.test.mjs | 13 | - | - |
| ...\orchestrate-agents\tests\lib\basics.test.mjs | 2 | - | - |
| ...\orchestrate-agents\tests\lib\decision-register-migrate.test.mjs | 1 | - | - |
| ...\orchestrate-agents\tests\lib\decision-register.test.mjs | 6 | - | - |
| ...\orchestrate-agents\tests\limit-scripts.tests.ps1 | 46 | - | - |
| ...\orchestrate-agents\tests\scripts\limit-stop-server.test.mjs | 3 | - | - |
| ...\orchestrate-agents\tests\scripts\register.test.mjs | 3 | - | - |
| ...\orchestrate-agents\tests\scripts\watch-decision-answers.test.mjs | 2 | - | - |
| ...\software-developer-agent\README.md | 1 | - | - |
| ...\software-developer-agent\skills\systematic-debugging\defense-in-depth.md | 3 | - | - |
| ...\software-developer-agent\skills\systematic-debugging\root-cause-tracing.md | 1 | - | - |
| C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\registers.ts | 6 | - | - |
| ...\decisions-pane\hooks\team-on.ts | 13 | - | - |
| ...\decisions-pane\hooks\team-switch.ts | 2 | - | - |
| ...\decisions-pane\README.md | 3 | - | - |
| ...\decisions-pane\tests\hooks\pane.test.ts | 2 | - | - |
| ...\decisions-pane\tests\hooks\team-on.test.ts | 14 | - | - |
| ...\decisions-pane\tests\hooks\team-switch.test.ts | 16 | - | - |
| ...\decisions-pane\tests\support\register-world.ts | 3 | - | - |
| C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md | 1 | - | - |
| ...\xpp-agent\Docs\Skills\d365fo-environment\SKILL.md | 7 | - | - |
| ...\xpp-agent\Docs\Skills\machine-pitfalls\references\claude-code-agents.md | 1 | - | - |
| ...\xpp-agent\Docs\Skills\machine-pitfalls\references\git-and-github.md | 1 | - | - |

COUNTS | pattern lines per pattern and root (final read; R1 106 files, R2 19, R3a 18, R3b 231):

| pattern | R1 | R2 | R3a | R3b |
|---|---|---|---|---|
| claude-agent-team-on | 18 | 6 | 0 | 0 |
| claude-context-guard | 8 | 0 | 0 | 0 |
| claude-usage-probe | 9 | 0 | 0 | 0 |
| onFolder | 13 | 35 | 0 | 0 |
| markerFolder | 11 | 0 | 0 | 0 |
| probeWorkingFolder | 7 | 0 | 0 | 0 |
| usage-limits.json | 14 | 0 | 0 | 0 |
| relaunch.log | 16 | 0 | 0 | 0 |
| limit-stop.log | 15 | 0 | 0 | 0 |
| stateFile | 16 | 0 | 0 | 0 |
| logFile | 66 | 9 | 0 | 0 |
| .claude\state | 18 | 0 | 0 | 0 |
| .claude/state | 0 | 0 | 0 | 0 |
| .claude\\state | 5 | 0 | 0 | 0 |
| .claude\\\\state | 0 | 0 | 0 | 0 |
| claude\state | 18 | 0 | 0 | 0 |
| %TEMP% | 33 | 1 | 5 | 0 |
| $env:TEMP | 3 | 0 | 3 | 0 |
| env.TEMP | 2 | 0 | 0 | 0 |
| TEMP (bare, not quoted) | 251 | 72 | 34 | 288 |
| TMP (bare, not quoted) | 32 | 32 | 0 | 57 |
| tmpdir | 10 | 7 | 0 | 0 |
| GetTempPath | 16 | 0 | 0 | 0 |
| GetTempFileName | 0 | 0 | 0 | 0 |
| New-TemporaryFile | 0 | 0 | 0 | 0 |
| Temp\ | 21 | 2 | 5 | 0 |

COUNTS | bare TEMP/TMP per file (not quoted):
R1 TEMP/TMP: agent-team-files.html 52/2; agents\software-developer.md 1/0; agents\task-lead.md 1/0; decisions\ANSWERS_LOG_CLAUDE.jsonl 3/0; decisions\RESOLVED_DECISIONS_CLAUDE.md 10/0; orchestrate-agents\hooks\context-guard.mjs 1/1; lib\agent-team.mjs 3/1; lib\decision-register.mjs 2/0; lib\text-file.mjs 11/2; orchestration.config.json 3/0; references\agent-team-guide.html 5/0; references\lead-brief-template.md 3/0; references\limits-and-caps-guide.html 5/0; references\start-messages.md 1/0; references\worker-rules.md 1/0; scripts\run-heavy.ps1 1/0; scripts\usage-probe.ps1 5/1; scripts\watch-usage-and-context.ps1 9/0; SKILL.md 5/0; tests\helpers\scratch.mjs 2/1; tests\hooks\context-guard.test.mjs 10/1; tests\hooks\decision-reminder.test.mjs 10/2; tests\lib\agent-team.test.mjs 22/5; tests\lib\basics.test.mjs 1/0; tests\lib\decision-register-migrate.test.mjs 3/0; tests\lib\decision-register.test.mjs 4/1; tests\limit-scripts.tests.ps1 28/1; tests\scripts\register.test.mjs 4/6; tests\scripts\watch-decision-answers.test.mjs 2/0; README.md 2/0; repo skills\ (15 files with TEMP, 5 with TMP) 41/8.
R2 TEMP/TMP: hooks\team-on.ts 17/6; hooks\team-switch.ts 6/1; README.md 1/0; tests\hooks\team-on.test.ts 18/9; tests\hooks\team-switch.test.ts 24/14; tests\support\register-world.ts 6/2.
R3a: 12 files, TEMP 34, TMP 0.
R3b: 65 synced files TEMP 287, TMP 57 (16 files); .claude\CLAUDE.md TEMP 1; .claude\settings.json 0.

FOUND | 301 unique pattern lines in 42 files (R1 232 in 30 files, R2 59 in 8 files, R3a 10 in 4 files). Non-bare patterns only.

C:\Repos\My projects\software-developer-agent\agent-team-files.html (47)
245 [%TEMP%] (<code>%TEMP%</code>) is for files a program can afford to lose.</dd>
246 [claude-context-guard ; %TEMP%] <dd class="ex">Example: <code>~\.claude\settings.json</code> lasts; <code>%TEMP%\claude-context-guard\</code> may be wiped.</dd>
310 [Temp\] <code>temp\</code> as the working folder. One lead runs two workers. The names and times are made up; the folders
314 [Temp\] <caption>Who writes what in the example. Files are in <code>C:\Repos\Shop\temp\</code> unless named.</caption>
366 [.claude\state ; claude\state] <text x="524" y="232" class="d-text"><tspan class="d-mono">~\.claude\state\</tspan> usage reading, logs</text>
375 [Temp\] <text x="24" y="370" class="d-text"><tspan class="d-mono">temp\</tspan> the working folder the brief names:</text>
385 [%TEMP%] <text x="524" y="324" class="d-title">Temp folder  %TEMP%</text>
387 [claude-agent-team-on] <text x="524" y="368" class="d-text"><tspan class="d-mono">claude-agent-team-on\</tspan> switch-on marks</text>
390 [claude-context-guard] <text x="524" y="389" class="d-text"><tspan class="d-mono">claude-context-guard\</tspan> warnings sent</text>
392 [claude-usage-probe] <text x="524" y="431" class="d-text"><tspan class="d-mono">claude-usage-probe\</tspan> the probe's room</text>
500 [%TEMP%] <text x="18" y="76" class="d-mono-s">%TEMP%</text>
504 [Temp\] <text x="18" y="248" class="d-mono-s">Shop\temp\</text>
590 [claude-agent-team-on ; %TEMP%] <li>It runs <code>scripts\team-on.mjs</code>, which writes <code>%TEMP%\claude-agent-team-on\&lt;session id&gt;</code>.
617 [%TEMP%] <li>The Usage and context watch writes <code>%TEMP%\claude-session-watch-&lt;session id&gt;.txt</code>: its
621 [usage-limits.json ; .claude\state ; claude\state] <li>It reads the shared usage reading, <code>~\.claude\state\usage-limits.json</code>. When the reading is
623 [claude-usage-probe ; %TEMP%] tiny Haiku call in the empty folder <code>%TEMP%\claude-usage-probe\</code> and rewrites the reading.</li>
637 [Temp\] <code>C:\Repos\Shop\temp\SHOP_LEAD_BRIEF.md</code> and fills it in. The brief names the working folder,
655 [Temp\] <li><code>temp\IMPORT_LEAD.md</code>: the runs in order, each decision with its reason, each run's state,
657 [Temp\] <li><code>temp\W1_TASK.md</code>, written for a reader who starts cold: what to read, two points, the checks,
673 [Temp\] <li>W1 starts <code>temp\W1_PROGRESS.md</code> at its first step and updates it after every point.</li>
675 [%TEMP%] <code>%TEMP%\xpp-agent-heavy-command-slot-1.txt</code> says who holds the one slot.</li>
677 [claude-context-guard ; %TEMP%] 320k warning does it write <code>%TEMP%\claude-context-guard\&lt;W1 id&gt;.json</code>, so the warning comes once.</li>
678 [Temp\] <li>W1 writes <code>temp\W1_REPORT.md</code>, ending with the four-line block (decisions, initiatives,
693 [Temp\] <li>The lead writes it to <code>temp\entry.json</code>: eleven fields, such as what, example, options and
733 [Temp\] <li>W2 writes <code>temp\W2_REPORT.md</code>. The lead checks it and writes <code>temp\IMPORT_SUMMARY.md</code>:
735 [Temp\] <li>The lead ends with <code>TASK DONE | temp\IMPORT_SUMMARY.md</code>.</li>
750 [%TEMP%] <li>The watch writes its decision to <code>%TEMP%\claude-session-watch-&lt;session id&gt;.decision.json</code>:
754 [limit-stop.log ; .claude\state ; claude\state] <code>~\.claude\state\limit-stop.log</code>.</li>
758 [relaunch.log ; .claude\state ; claude\state] It runs <code>start-session-in-vscode.ps1</code>, which logs each step to <code>~\.claude\state\relaunch.log</code>.
809 [claude-agent-team-on ; %TEMP%] <tr><td class="kept"><code>C:\Repos\My projects\claude-code-extensions\decisions-pane</code></td><td>The Decisions pane plugin</td><td>Shows only in a chat switched on with <code>/software-developer-a
853 [%TEMP%] <tr class="group"><th colspan="3">Temp folder, <code>%TEMP%</code> = <code>C:\Users\user\AppData\Local\Temp</code></th></tr>
854 [claude-agent-team-on] <tr><td class="local"><code>claude-agent-team-on\&lt;session id&gt;</code><span class="new">new</span></td><td><code>team-on.mjs</code></td><td>The time the chat was switched on. Both hooks and the De
855 [claude-context-guard] <tr><td class="local"><code>claude-context-guard\&lt;agent id&gt;.json</code>, <code>session-&lt;session id&gt;.json</code>, and a <code>.lock</code> beside each</td><td>the context guard</td><td>The
858 [claude-usage-probe] <tr><td class="local"><code>claude-usage-probe\</code></td><td><code>usage-probe.ps1</code></td><td>An empty folder its Haiku call runs in, so no project's files come along. The call keeps no transcri
861 [.claude\state ; claude\state] <tr class="group"><th colspan="3"><code>~\.claude\state\</code></th></tr>
862 [usage-limits.json] <tr><td class="local"><code>usage-limits.json</code></td><td><code>usage-probe.ps1</code></td><td>The latest five-hour and weekly percent and reset times. Shared by every watch.</td></tr>
863 [limit-stop.log] <tr><td class="local"><code>limit-stop.log</code></td><td>the limit-stop server, the guard, the watch</td><td>One line per event: listening, which agent was told, failures, the end. Never what an agen
864 [relaunch.log] <tr><td class="local"><code>relaunch.log</code></td><td><code>start-session-in-vscode.ps1</code></td><td>Each relaunch step, with the time.</td></tr>
921 [.claude\state ; claude\state] <li><span class="flag">note</span><code>~\.claude\state\mcp-discover-verdicts.json</code> sits beside the team's
935 [claude-agent-team-on ; onFolder ; %TEMP%] <tr><td><code>agentTeam.onFolder</code><span class="new">new</span></td><td><code>claude-agent-team-on</code> (under %TEMP%)</td><td><code>lib\agent-team.mjs</code>: <code>team-on.mjs</code> writes, b
936 [claude-context-guard ; markerFolder ; %TEMP%] <tr><td><code>contextGuard.markerFolder</code></td><td><code>claude-context-guard</code> (under %TEMP%)</td><td><code>hooks\context-guard.mjs</code></td></tr>
939 [usage-limits.json ; stateFile ; .claude\state ; claude\state] <tr><td><code>usageLimits.stateFile</code></td><td><code>%USERPROFILE%\.claude\state\usage-limits.json</code></td><td><code>usage-probe.ps1</code> writes, the watch reads</td></tr>
940 [claude-usage-probe ; probeWorkingFolder ; %TEMP%] <tr><td><code>usageLimits.probeWorkingFolder</code></td><td><code>%TEMP%\claude-usage-probe</code></td><td><code>scripts\usage-probe.ps1</code></td></tr>
942 [limit-stop.log ; logFile ; .claude\state ; claude\state] <tr><td><code>limitStop.logFile</code></td><td><code>%USERPROFILE%\.claude\state\limit-stop.log</code></td><td><code>lib\limit-stop.mjs</code></td></tr>
943 [relaunch.log ; logFile ; .claude\state ; claude\state] <tr><td><code>relaunch.logFile</code></td><td><code>%USERPROFILE%\.claude\state\relaunch.log</code></td><td><code>scripts\start-session-in-vscode.ps1</code></td></tr>
945 [logFile] <tr><td><code>register.folder</code>, <code>openFile</code>, <code>answersLogFile</code>, <code>resolvedFile</code>, <code>answeredFile</code></td><td><code>decisions</code> and the four file names</t
963 [.claude\state ; claude\state] <code>~\.claude\state\</code> on disk. The Shop repo, the invoice import, its runs, D-12, the log line and every time

C:\Repos\My projects\software-developer-agent\decisions\ANSWERS_LOG_CLAUDE.jsonl (1)
42 [.claude\\state ; %TEMP%] {"id":"D-36","answeredAt":"2026-10-27 10:30","answer":"Chose A: move every team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the tea

C:\Repos\My projects\software-developer-agent\decisions\RESOLVED_DECISIONS_CLAUDE.md (9)
105 [limit-stop.log] - Example: A worker's hook gets a broken answer at 14:12 and writes "error for agent W3" in limit-stop.log; at the main chat's next step its hook reads that line and says LIMIT STOP SERVER FAILED.
465 [claude-agent-team-on ; %TEMP%] - Summary: The team is switched on per chat with /software-developer-agent (team-switch\SKILL.md, linked as ~\.claude\skills\software-developer-agent): it runs scripts\team-on.mjs, which writes the ch
514 [claude-agent-team-on ; claude-context-guard ; %TEMP%] - What: Where should the team's per-chat files live? Today the switched-on markers sit in Windows' general temp folder (%TEMP%\claude-agent-team-on), beside the size guard's markers (%TEMP%\claude-con
516 [.claude\state ; claude\state ; %TEMP%] - Options: A: move every team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the team's logs, ~\.claude\state\agent-team\, so all of t
519 [onFolder ; markerFolder ; relaunch.log ; logFile] - Evidence: C:\Repos\My projects\software-developer-agent\orchestrate-agents\orchestration.config.json (agentTeam.onFolder, contextGuard.markerFolder, limitStop.logFile, relaunch.logFile), C:\Repos\My
520 [usage-limits.json ; relaunch.log ; limit-stop.log ; .claude\state ; claude\state ; %TEMP%] - Follow up: 2026-10-27 10:26: I read your answer as option A, stretched to every file: everything the team writes for itself goes into one folder, C:\Users\user\.claude\state\agent-team\. That is the
522 [.claude\state ; claude\state ; %TEMP%] If you meant a different folder, for example one under %TEMP% such as %TEMP%\claude-agent-team\, say which. Windows' temp cleanup can empty %TEMP% while a chat is open; the .claude\state folder is nev
523 [.claude\state ; claude\state ; %TEMP%] - Final answer: 2026-10-27 10:30: "Chose A: move every team file now under %TEMP% (the switch markers, the size guard's markers, the watch's records) into one folder beside the team's logs, ~\.claude\
524 [.claude\state ; claude\state] - Summary: Move every file the team writes for itself into one parent folder for the developer agent, %USERPROFILE%\.claude\state\software-developer-agent\, with one child folder per kind of file (A,

C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\context-guard.mjs (11)
55 [%TEMP%] // A marker folder name must stay one folder under %TEMP%: no separators, no drive, no '.' or '..'.
219 [logFile] const { logFile, tailBytes } = logSettings(config);
221 [logFile] return readSessionLog(logFile, sessionId, tailBytes);
223 [logFile] throw new Error(`the log ${logFile} cannot be read: ${error.message}`);
240 [logFile] const { logFile } = logSettings(config);
242 [logFile] appendLimitStopLog(logFile, sessionId, text);
244 [logFile] throw new Error(`the log ${logFile} cannot be written: ${error.message}`);
364 [markerFolder] const markerFolder = requireSetting(config, 'contextGuard.markerFolder');
365 [markerFolder] if (typeof markerFolder !== 'string' || !SINGLE_FOLDER_NAME.test(markerFolder)) {
366 [markerFolder] throw new Error(`orchestration.config.json setting 'contextGuard.markerFolder' must be one folder name, not ${JSON.stringify(markerFolder)}`);
370 [markerFolder ; tmpdir] markerDir: path.join(os.tmpdir(), markerFolder),

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\agent-team.mjs (5)
3 [onFolder ; %TEMP%] // scripts/team-on.mjs writes one marker per session in a folder under %TEMP% (agentTeam.onFolder), and the hooks do
13 [%TEMP%] // The folder must stay one folder under %TEMP%: no separators, no drive, no '.' or '..'.
24 [onFolder] const folder = requireSetting(config, 'agentTeam.onFolder');
26 [onFolder] throw new Error(`orchestration.config.json setting 'agentTeam.onFolder' must be one folder name, not ${JSON.stringify(folder)}`);
31 [tmpdir] return path.join(os.tmpdir(), folder, sessionId);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\decision-register.mjs (3)
123 [logFile] const answersLogFile = requireSetting(config, 'register.answersLogFile');
132 [logFile] const files = [openFile, answeredFile, resolvedFile, answersLogFile];
140 [logFile] answersLogPath: path.join(folderPath, answersLogFile),

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\limit-stop.mjs (15)
6 [logFile] // Also the server's log (limitStop.logFile), which this module alone writes and reads: besides the server's own
173 [logFile] * Reads where the log is and how much of its end is read (limitStop.logFile and limitStop.logTailKB).
175 [logFile] * @returns {{logFile: string, tailBytes: number}} the log's path and the window read from its end
180 [logFile] logFile: requirePathSetting(config, 'limitStop.logFile'),
187 [logFile] * @param {string} logFile from logSettings
192 [logFile] export function appendLimitStopLog(logFile, session, text) {
193 [logFile] fs.mkdirSync(path.dirname(logFile), { recursive: true });
194 [logFile] fs.appendFileSync(logFile, `${formatStamp(new Date())} | ${session} | ${text.replace(/\r\n|\n|\r/g, ' ')}\n`);
200 [logFile] * @param {string} logFile from logSettings, or limitStop.logFile
203 [logFile] export function assertLogWritable(logFile) {
204 [logFile] fs.mkdirSync(path.dirname(logFile), { recursive: true });
205 [logFile] fs.closeSync(fs.openSync(logFile, 'a'));
210 [logFile] * @param {string} logFile from logSettings
216 [logFile] export function readSessionLog(logFile, session, tailBytes) {
219 [logFile] text = readFileTail(logFile, tailBytes);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\orchestration.config.json (13)
26 [usage-limits.json ; stateFile ; .claude\\state] "stateFile": "%USERPROFILE%\\.claude\\state\\usage-limits.json",
28 [stateFile] "_whyStateFile": "Where the probe writes the numbers (%NAME% is an environment variable). stateFreshMinutes is how often the watch asks for new numbers while far from a threshold, and the probe calls
31 [claude-usage-probe ; probeWorkingFolder ; %TEMP%] "probeWorkingFolder": "%TEMP%\\claude-usage-probe",
32 [probeWorkingFolder] "_whyProbeWorkingFolder": "The empty folder the probe's call runs in, so no project's files or settings come with it (plan 8.1).",
56 [relaunch.log ; logFile ; .claude\\state] "logFile": "%USERPROFILE%\\.claude\\state\\relaunch.log",
57 [logFile] "_whyLogFile": "Where start-session-in-vscode.ps1 logs each step with the time (plan 8.4). %NAME% is an environment variable."
108 [limit-stop.log ; logFile ; .claude\\state] "logFile": "%USERPROFILE%\\.claude\\state\\limit-stop.log",
109 [relaunch.log ; logFile] "_whyLogFile": "Where the server logs, one line each, when it listened, which agent it told and when it ended (like relaunch.log); the context guard and the Usage and context watch's check add a line
117 [claude-context-guard ; markerFolder] "markerFolder": "claude-context-guard",
118 [markerFolder ; %TEMP%] "_whyMarkerFolder": "Folder under %TEMP% that holds one marker per agent (the last level sent) and its lock.",
124 [claude-agent-team-on ; onFolder] "onFolder": "claude-agent-team-on",
125 [onFolder ; %TEMP%] "_whyOnFolder": "Folder under %TEMP% holding one marker per session switched on with /software-developer-agent (scripts/team-on.mjs). The two hooks and the Decisions pane do nothing in a session witho
133 [logFile] "answersLogFile": "ANSWERS_LOG_CLAUDE.jsonl",

C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\lead-brief-template.md (1)
7 [Temp\] Copy it into the project's working folder (for example `temp\<PROJECT>_LEAD_BRIEF.md`), replace every `<...>`,

C:\Repos\My projects\software-developer-agent\orchestrate-agents\references\usage-limits.md (5)
38 [stateFile] arguments). Besides the context size, it reads the usage percentages from the file `usageLimits.stateFile` names
39 [usage-limits.json ; .claude\state ; claude\state] (`%USERPROFILE%\.claude\state\usage-limits.json`) and runs `scripts\usage-probe.ps1` (one tiny Haiku call, about
95 [logFile] `limitStop.processCheckSeconds`, 60; the user's choice, 2026-10-25); and logs to the file `limitStop.logFile`
96 [limit-stop.log ; .claude\state ; claude\state] names (`%USERPROFILE%\.claude\state\limit-stop.log`).
232 [relaunch.log ; logFile ; .claude\state ; claude\state] 4. Every step is logged with the time to the file `relaunch.logFile` names (`%USERPROFILE%\.claude\state\relaunch.log`).

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\limit-stop-server.mjs (15)
10 [logFile] // (the user's choice, 2026-10-25: nothing is left behind to delete), and logs to limitStop.logFile; it does not
126 [logFile] logFile: requirePathSetting(config, 'limitStop.logFile'),
278 [logFile] return printLine(`LIMIT STOP SERVER NOT STARTED | its pipe did not answer within ${setup.startCheckMs / 1000} s, so it was stopped; its log is ${setup.logFile}`, 1);
292 [logFile] return `LIMIT STOP SERVER NOT STARTED | its log ${setup.logFile} cannot be written, and a failure reaches the main session only through it`;
294 [logFile] return `LIMIT STOP SERVER NOT STARTED | it exited with ${exitCode}; its log is ${setup.logFile}`;
345 [logFile] lines = readSessionLog(setup.logFile, setup.session, setup.tailBytes);
347 [logFile] return printLine(`LIMIT STOP SERVER NOT CHECKED | its log ${setup.logFile} cannot be read: ${oneLine(error)}`, 1);
389 [logFile] * @param {{logFile: string, session: string}} setup from readSessionSetup
394 [logFile] appendLimitStopLog(setup.logFile, setup.session, text);
396 [logFile] process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
419 [logFile] appendLimitStopLog(setup.logFile, setup.session, text);
425 [logFile] assertLogWritable(setup.logFile);
427 [logFile] process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
445 [logFile] appendLimitStopLog(setup.logFile, setup.session, `${LOG.listening}${setup.pipePath} (pid ${process.pid}): ${what}; watching the session's Claude Code process ${setup.claudePid}`);
447 [logFile] process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1 (1)
95 [$env:TEMP] return Join-Path $env:TEMP "$slotPrefix$slot.txt"

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\start-session-in-vscode.ps1 (3)
4 [relaunch.log ; logFile] # time to the log file (relaunch.logFile in orchestration.config.json, or -LogPath); when even that path cannot be
38 [relaunch.log ; logFile] # Where each step is logged. Default: relaunch.logFile.
244 [relaunch.log ; logFile] $LogPath = Expand-ConfigPath (Get-ConfigValue (Read-OrchestrationConfig $ConfigPath) 'relaunch.logFile' $ConfigPath) 'relaunch.logFile' $ConfigPath

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\usage-probe.ps1 (5)
24 [stateFile] # Where the reading is written. Default: usageLimits.stateFile. watch-usage-and-context.ps1 passes its own state
27 [probeWorkingFolder] # The empty folder the call runs in. Default: usageLimits.probeWorkingFolder.
181 [Temp\] # becomes a dash ('C:\Temp\x' -> 'C--Temp-x').
209 [stateFile] $StatePath = Expand-ConfigPath (Get-ConfigValue $config 'usageLimits.stateFile' $ConfigPath) 'usageLimits.stateFile' $ConfigPath
212 [probeWorkingFolder] $WorkingFolder = Expand-ConfigPath (Get-ConfigValue $config 'usageLimits.probeWorkingFolder' $ConfigPath) 'usageLimits.probeWorkingFolder' $ConfigPath

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1 (4)
75 [stateFile] # are the account's, not the session's. Default: usageLimits.stateFile.
265 [stateFile] CacheLookbackReplies = 'usageAndContextWatch.cacheLookbackReplies'; UsageStatePath = 'usageLimits.stateFile'
449 [GetTempPath] return Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"
639 [GetTempPath] return Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"

C:\Repos\My projects\software-developer-agent\orchestrate-agents\SKILL.md (2)
59 [claude-agent-team-on ; %TEMP%] `AGENT TEAM ON | session <id> | <marker>` and writes the chat's marker under `%TEMP%\claude-agent-team-on\` (setting
60 [onFolder] `agentTeam.onFolder`). Until then the two hooks say nothing in this chat or its agents. Then it does steps 1 and 2

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\helpers\scratch.mjs (1)
40 [tmpdir] return fs.mkdtempSync(path.join(os.tmpdir(), `oa-${label}-`));

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\hooks\context-guard.test.mjs (7)
36 [limit-stop.log ; logFile] config.limitStop = { ...config.limitStop, pipePrefix: prefix, connectTimeoutMs: 300, logFile: path.join(base, 'limit-stop.log'), logTailKB: 64, processCheckSeconds: 1, startCheckSeconds: 10 };
46 [claude-agent-team-on] const teamOnMarker = path.join(temp, 'claude-agent-team-on', SESSION);
59 [limit-stop.log] log: path.join(base, 'limit-stop.log'),
60 [claude-context-guard] markerDir: path.join(temp, 'claude-context-guard'),
300 [markerFolder] const world = makeWorld(t, (config) => { config.contextGuard.markerFolder = 'other-guard-markers'; });
336 [markerFolder] for (const name of ['transcriptTailKB', 'markerFolder', 'markerLockStaleSeconds']) {
860 [logFile] for (const name of ['logFile', 'logTailKB', 'pipePrefix']) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\hooks\decision-reminder.test.mjs (3)
26 [%TEMP%] // run gets it as its %TEMP%, so the real one is never written. A test of an ordinary chat passes OFF_ENV instead.
29 [claude-agent-team-on] fs.mkdirSync(path.join(TEAM_TEMP, 'claude-agent-team-on'));
30 [claude-agent-team-on] fs.writeFileSync(path.join(TEAM_TEMP, 'claude-agent-team-on', SESSION), '2026-10-26T22:00:00.000Z');

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\lib\agent-team.test.mjs (13)
3 [%TEMP%] // points %TEMP% at a scratch folder, so the real one is never written.
15 [claude-agent-team-on ; onFolder] const CONFIG = { agentTeam: { onFolder: 'claude-agent-team-on' } };
18 [tmpdir] * Points os.tmpdir() at a scratch folder for one test, and restores it afterwards.
24 [env.TEMP] const saved = { TEMP: process.env.TEMP, TMP: process.env.TMP };
25 [env.TEMP] process.env.TEMP = temp;
36 [tmpdir] assert.equal(os.tmpdir(), temp);
37 [claude-agent-team-on] assert.equal(teamOnMarkerPath(CONFIG, SESSION), path.join(temp, 'claude-agent-team-on', SESSION));
61 [onFolder] assert.throws(() => isTeamOn({}, SESSION), /agentTeam\.onFolder/);
63 [onFolder] assert.throws(() => isTeamOn({ agentTeam: { onFolder: folder } }, SESSION), /agentTeam\.onFolder/, String(folder));
69 [claude-agent-team-on ; onFolder] assert.equal(config.agentTeam.onFolder, 'claude-agent-team-on');
70 [onFolder] assert.match(config.agentTeam._whyOnFolder, /switched on/);
77 [claude-agent-team-on] const marker = path.join(temp, 'claude-agent-team-on', SESSION);
84 [claude-agent-team-on] assert.equal(fs.existsSync(path.join(temp, 'claude-agent-team-on', other)), true);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\lib\basics.test.mjs (2)
26 [markerFolder] assert.equal(typeof requireSetting(config, 'contextGuard.markerFolder'), 'string');
52 [.claude\\state] assert.equal(requirePathSetting(config, 'limitStop.log'), 'C:\\Users\\demo\\.claude\\state\\x.log');

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\lib\decision-register-migrate.test.mjs (1)
24 [logFile] answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\lib\decision-register.test.mjs (6)
23 [logFile] answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
88 [Temp\] evidence: ['temp\\ksef\\run3.log', 'src\\import.ts'],
139 [Temp\] '- Evidence: temp\\ksef\\run3.log, src\\import.ts',
264 [Temp\] assert.deepEqual(open.slice(-4), ['- Evidence: temp\\ksef\\run3.log, src\\import.ts', '- Follow up: 2026-10-26 09:30: what should 4', '  be?', '']);
1097 [logFile] for (const name of ['answeredFile', 'answersLogFile', 'lockWaitSeconds', 'lockStaleSeconds']) {
1107 [logFile] const loc = registerLocation(dir, { register: { ...REGISTER, answersLogFile: 'OTHER_LOG.jsonl' } });

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\limit-scripts.tests.ps1 (46)
14 [%TEMP%] # marker and decision files in %TEMP%, which are named after invented session ids; all are removed at the end. It
21 [GetTempPath] [string]$WorkRoot = (Join-Path ([IO.Path]::GetTempPath()) "limit-scripts-tests-$([guid]::NewGuid().ToString('N').Substring(0, 8))"),
170 [GetTempPath] $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"))
171 [GetTempPath] $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"))
254 [tmpdir] "    const record = path.join(os.tmpdir(), ``claude-session-watch-`${session}.decision.json``);",
335 [usage-limits.json] $target = Join-Path $folder 'usage-limits.json'
362 [claude-usage-probe ; Temp\] $working = 'C:\Users\demo\AppData\Local\Temp\claude-usage-probe'
363 [claude-usage-probe] $folder = Join-Path $projects 'C--Users-demo-AppData-Local-Temp-claude-usage-probe'
364 [claude-usage-probe] $decoy = Join-Path $projects 'C--Users-demo-AppData-Local-Temp-claude-usage-probe-old'
370 [claude-usage-probe] Assert-Equal 'C--Users-demo-AppData-Local-Temp-claude-usage-probe' (Get-ProjectFolderName $working) 'folder name'
379 [probeWorkingFolder] 'usageLimits.probeWorkingFolder') {
416 [usage-limits.json] $state = Join-Path $WorkRoot 'probe-state\usage-limits.json'
428 [usage-limits.json] $run = Invoke-Script $Probe @('-ConfigPath', $config, '-StatePath', (Join-Path $WorkRoot 'probe-state-arguments\usage-limits.json'), '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'pro
437 [usage-limits.json] $run = Invoke-Script $Probe @('-ConfigPath', $RealConfig, '-StatePath', (Join-Path $blocker 'usage-limits.json'), '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
457 [usage-limits.json] $state = Join-Path $WorkRoot "probe-fresh-$([guid]::NewGuid().ToString('N').Substring(0, 6))\usage-limits.json"
479 [probeWorkingFolder ; usage-limits.json ; stateFile] $config = New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_HOME%\state\usage-limits.json'; 'usageLimits.probeWorkingFolder' = '%LIMIT_TESTS_HOME%\probe-cwd' }
483 [usage-limits.json] Assert-Equal $run.Lines[0] ([IO.File]::ReadAllText((Join-Path $probeHome 'state\usage-limits.json'))) 'written to the expanded state file'
485 [usage-limits.json ; stateFile] $unset = New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_NOT_SET_9F2%\usage-limits.json' }
488 [stateFile] Assert-True (($bad.Lines -join ' ') -cmatch "^USAGE PROBE FAILED \| .*usageLimits\.stateFile.*%LIMIT_TESTS_NOT_SET_9F2%") "names the key and the variable: $($bad.Lines)"
622 [stateFile] $config = Read-OrchestrationConfig (New-TestConfig @{ 'usageAndContextWatch.everySeconds' = 7; 'contextCaps.main.warn' = 123000; 'usageLimits.stateFile' = '%WINDIR%\x\usage.json'; 'usageAndContextWatc
655 [stateFile] Assert-Throws { Expand-ConfigPath '%LIMIT_TESTS_NOT_SET%\usage.json' 'usageLimits.stateFile' 'test.json' } "test\.json key 'usageLimits\.stateFile' names %LIMIT_TESTS_NOT_SET%, which is not set\." 'an
656 [stateFile] $config = Read-OrchestrationConfig (New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_NOT_SET%\usage.json' })
759 [limit-stop.log] $line = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'
861 [GetTempPath] Set-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).txt") -Value "$($standIn.Id) $($standIn.StartTime.Ticks)" -NoNewline
875 [GetTempPath] $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
894 [GetTempPath] $path = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
932 [GetTempPath] $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
1067 [GetTempPath] $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
1136 [GetTempPath] $decisionPath = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
1157 [GetTempPath] $decisionPath = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
1212 [limit-stop.log] @{ Says = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'; First = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY' },
1248 [limit-stop.log] $BusyLine = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'
1249 [limit-stop.log] $DeniedLine = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EPERM'
1338 [limit-stop.log ; logFile] $settings = New-TestConfig @{ 'limitStop.pipePrefix' = "limit-scripts-tests-$([guid]::NewGuid().ToString('N').Substring(0, 8))"; 'limitStop.logFile' = (Join-Path $skill 'limit-stop.log'); 'limitStop.p
1405 [GetTempPath] Assert-True (-not (Test-Path (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"))) 'no decision file'
1418 [GetTempPath] Remove-Item -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json")
1432 [stateFile] Test-Case 'watch run: the usage reading comes from usageLimits.stateFile, with %NAME% expanded' {
1442 [stateFile] '-ConfigPath', (New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_HOME%\usage.json' }), '-StopServerScript', $StubServer)
1625 [relaunch.log] $log = Join-Path $WorkRoot 'relaunch.log'
1655 [relaunch.log ; logFile] Test-Case 'start: without -LogPath the log is relaunch.logFile, with %NAME% expanded' {
1661 [relaunch.log ; logFile] $config = New-TestConfig @{ 'relaunch.logFile' = '%LIMIT_TESTS_HOME%\logs\relaunch.log' }
1664 [relaunch.log] $log = Join-Path $folder 'logs\relaunch.log'
1666 [relaunch.log ; logFile] $unset = New-TestConfig @{ 'relaunch.logFile' = '%LIMIT_TESTS_NOT_SET_9F2%\relaunch.log' }
1669 [logFile] Assert-True (($bad.Lines -join ' ') -cmatch '^START NOT RUN \| .*relaunch\.logFile.*%LIMIT_TESTS_NOT_SET_9F2%') "names the key and the variable: $($bad.Lines)"
1810 [GetTempPath] $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"))
1811 [GetTempPath] $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"))

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\limit-stop-server.test.mjs (3)
39 [limit-stop.log] const log = path.join(base, 'state', 'limit-stop.log');
46 [logFile] logFile: log,
449 [logFile] for (const name of ['pipePrefix', 'processCheckSeconds', 'startCheckSeconds', 'leadAgentTypes', 'logFile']) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\register.test.mjs (3)
15 [$env:TEMP] const HOSTILE = '\u2018single\u2019 \u201cdouble\u201d "plain" & %PATH% $env:TEMP `n za\u017c\u00f3\u0142\u0107 \u{1f600} \u4e2d\u6587 <b>|';
26 [Temp\] recommendation: 'A', meanwhile: 'work continues assuming A', evidence: ['temp\\demo.log'], ...over,
110 [Temp\] assert.match(followed, /- Status: waiting-for-user\r\n[\s\S]*- Evidence: temp\\demo\.log\r\n- Follow up: \d{4}-\d\d-\d\d \d\d:\d\d: what does mostly mean\?\r\n$/);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\tests\scripts\watch-decision-answers.test.mjs (2)
21 [$env:TEMP] const HOSTILE_WORDS = 'B, but\r\nonly from September;\na lone\rCR, za\u017c\u00f3\u0142\u0107 \u{1f600} \u4e2d\u6587 "plain" \u201ccurly\u201d $env:TEMP `n %PATH% & <b>|';
111 [Temp\] recommendation: 'A', meanwhile: 'work continues assuming A', evidence: ['temp\\demo.log'],

C:\Repos\My projects\software-developer-agent\README.md (1)
55 [claude-agent-team-on ; %TEMP%] `orchestrate-agents/scripts/team-on.mjs`, which writes the chat's marker under `%TEMP%\claude-agent-team-on\`; the

C:\Repos\My projects\software-developer-agent\skills\systematic-debugging\defense-in-depth.md (3)
60 [tmpdir] const tmpDir = normalize(resolve(tmpdir()));
62 [tmpdir] if (!normalized.startsWith(tmpDir)) {
109 [tmpdir] - Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests

C:\Repos\My projects\software-developer-agent\skills\systematic-debugging\root-cause-tracing.md (1)
127 [tmpdir] - Layer 3: NODE_ENV guard refuses git init outside tmpdir

C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\registers.ts (6)
33 [logFile] readonly answersLogFile: string
40 [logFile] answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
77 [logFile] return [{ root, openPath: joinPath(folder, config.openFile), logPath: joinPath(folder, config.answersLogFile) }]
101 [logFile] const { folder, openFile, answersLogFile } = register as Record<string, unknown>
106 [logFile] answersLogFile:
107 [logFile] typeof answersLogFile === 'string' && answersLogFile !== '' ? answersLogFile : DEFAULT_CONFIG.answersLogFile,

C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\team-on.ts (13)
4 [onFolder] * `<temp folder>\<agentTeam.onFolder>\<session id>`, and a chat without one is an ordinary chat: the team's hooks do
10 [tmpdir] * `os.tmpdir()` finds it on Windows. Keep them in step. Two differences, both on the safe side: a folder setting the
20 [tmpdir] /** The environment variables Node's `os.tmpdir()` reads on Windows, each as `$.env.get` answers it. */
29 [tmpdir] * Gives the temp folder as Node's `os.tmpdir()` does on Windows: TEMP, else TMP, else `<SystemRoot>\temp`, else
36 [Temp\] * tempFolderOf({ TEMP: 'C:\\Users\\me\\AppData\\Local\\Temp\\', TMP: undefined, SystemRoot: undefined, windir: undefined })
51 [onFolder] * Gives the switch folder the team's orchestration.config.json names (`agentTeam.onFolder`), as found there.
56 [onFolder] export function onFolderOf(config: unknown): unknown {
59 [onFolder] return typeof team === 'object' && team !== null ? (team as { onFolder?: unknown }).onFolder : undefined
66 [onFolder] * @param onFolder the switch folder setting, from onFolderOf
71 [onFolder] export function teamOnMarkerPath(tempFolder: string | null, onFolder: unknown, sessionId: unknown): string | null {
74 [onFolder] typeof onFolder !== 'string' ||
75 [onFolder] !SINGLE_FOLDER_NAME.test(onFolder) ||
82 [onFolder] return `${tempFolder.endsWith('\\') ? tempFolder : `${tempFolder}\\`}${onFolder}\\${sessionId}`

C:\Repos\My projects\claude-code-extensions\decisions-pane\hooks\team-switch.ts (2)
10 [onFolder] import { onFolderOf, teamOnMarkerPath, tempFolderOf } from './team-on'
40 [onFolder] const marker = teamOnMarkerPath(tempFolder, onFolderOf(JSON.parse(await $.fs.read(settingsFile))), sessionId)

C:\Repos\My projects\claude-code-extensions\decisions-pane\README.md (3)
44 [logFile] `ANSWERS_LOG_CLAUDE.jsonl` beside the open file (the name comes from `register.answersLogFile` in the team's
104 [claude-agent-team-on ; %TEMP%] it writes a marker named after the chat's session id, `%TEMP%\claude-agent-team-on\<session id>` (the folder is
105 [onFolder] `agentTeam.onFolder` in the team's `orchestration.config.json`). The pane checks the same marker the team's hooks

C:\Repos\My projects\claude-code-extensions\decisions-pane\tests\hooks\pane.test.ts (2)
542 [logFile] test('D26 the log file is the one register.answersLogFile names', async ($, on) => {
546 [logFile] teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', answersLogFile: 'MY_ANSWERS.jsonl' }),

C:\Repos\My projects\claude-code-extensions\decisions-pane\tests\hooks\team-on.test.ts (14)
3 [tmpdir] * exactly as Node's os.tmpdir() gives it on Windows, the ids and folder settings that give no marker path, and how the
9 [onFolder] import { onFolderOf, teamOnMarkerPath, tempFolderOf } from '../../hooks/team-on'
16 [claude-agent-team-on] const FOLDER = 'claude-agent-team-on'
18 [tmpdir] test('O1 the temp folder is the one Node os.tmpdir() gives on Windows', () => {
19 [tmpdir] // Each expected value is what Node 24.13's own os.tmpdir() gave for the same variables (the invariant run, 2026-10-27).
50 [claude-agent-team-on] expect(teamOnMarkerPath('C:\\T1', FOLDER, ID)).toBe('C:\\T1\\claude-agent-team-on\\abc-1')
51 [claude-agent-team-on] expect(teamOnMarkerPath('C:\\', FOLDER, ID)).toBe('C:\\claude-agent-team-on\\abc-1')
55 [onFolder] test('O6 the switch folder is read from agentTeam.onFolder, and is missing in any other shape', () => {
56 [onFolder] expect(onFolderOf({ agentTeam: { onFolder: 'x' } })).toBe('x')
57 [onFolder] expect(onFolderOf({ agentTeam: {} })).toBeUndefined()
58 [onFolder] expect(onFolderOf({ agentTeam: 'x' })).toBeUndefined()
59 [onFolder] expect(onFolderOf({})).toBeUndefined()
60 [onFolder] expect(onFolderOf(null)).toBeUndefined()
61 [onFolder] expect(onFolderOf('x')).toBeUndefined()

C:\Repos\My projects\claude-code-extensions\decisions-pane\tests\hooks\team-switch.test.ts (16)
3 [onFolder] * /software-developer-agent, which writes the session's marker `<temp folder>\<agentTeam.onFolder>\<session id>`. The
69 [claude-agent-team-on] * and normalised, so a marker planted at a raw path such as `...\claude-agent-team-on\..` would never be found: what
174 [onFolder] ['not a string', { agentTeam: { onFolder: 42 } }],
175 [onFolder] ['empty', { agentTeam: { onFolder: '' } }],
176 [onFolder] ['a dot', { agentTeam: { onFolder: '.' } }],
177 [onFolder] ['two dots', { agentTeam: { onFolder: '..' } }],
178 [onFolder] ['a backslash', { agentTeam: { onFolder: 'team\\on' } }],
179 [onFolder] ['a slash', { agentTeam: { onFolder: 'team/on' } }],
180 [onFolder] ['a drive', { agentTeam: { onFolder: 'C:' } }],
181 [onFolder] ['a star', { agentTeam: { onFolder: 'team*' } }],
182 [onFolder] ['a question mark', { agentTeam: { onFolder: 'team?' } }],
183 [onFolder] ['angle brackets', { agentTeam: { onFolder: '<team>' } }],
184 [onFolder] ['a bar', { agentTeam: { onFolder: 'team|on' } }],
185 [onFolder] ['quoted', { agentTeam: { onFolder: '"team"' } }],
205 [onFolder] w.files.set(CONFIG, JSON.stringify({ register: REGISTER, agentTeam: { onFolder: 'team on.v2' } }))
213 [tmpdir] // ── The temp folder, as Node's os.tmpdir() finds it on Windows ──

C:\Repos\My projects\claude-code-extensions\decisions-pane\tests\support\register-world.ts (3)
37 [claude-agent-team-on] export const ON_FOLDER = 'claude-agent-team-on'
124 [Temp\] 'temp\\import\\run3.log',
188 [onFolder] return JSON.stringify({ register, agentTeam: { onFolder: ON_FOLDER } })

C:\Repos\My projects\xpp-agent\Docs\Skills\claude-code-mods\SKILL.md (1)
140 [%TEMP%] - A scratch TEMP set on the claude.exe process reaches a mod's $.env.get, so a mod that reads files under %TEMP% can

C:\Repos\My projects\xpp-agent\Docs\Skills\d365fo-environment\SKILL.md (7)
49 [$env:TEMP ; Temp\] -referencefolder="$PLD" -log="$env:TEMP\Contoso.xppc.log"
56 [$env:TEMP ; Temp\] -outlog="$env:TEMP\Contoso.labelc.log" -errlog="$env:TEMP\Contoso.labelc.err"
60 [$env:TEMP ; Temp\] -packagesRoot="$PLD" -xmlLog="$env:TEMP\bp.xml"
677 [%TEMP%] newest folder under `%TEMP%\finOpsPackaging`. Visual Studio's label compile is incremental: `Resources\` is only
715 [%TEMP%] `%TEMP%\finOpsPackaging\<number>\PackageAssets\<Model>_<version>_managed.zip`. It is the whole package folder
943 [%TEMP%] `operationlogs.zip` appeared under `%TEMP%`, Downloads or the Dynamics365 folder.
957 [%TEMP%] `%TEMP%\finOpsPackaging\<number>\PackageAssets\`. Extract `bin\Dynamics.AX.<Model>.ChainOfCommand.xml` from

C:\Repos\My projects\xpp-agent\Docs\Skills\machine-pitfalls\references\claude-code-agents.md (1)
36 [Temp\] tell an agent up front to write its results to a file as it goes (a progress file under `temp\`). And when an

C:\Repos\My projects\xpp-agent\Docs\Skills\machine-pitfalls\references\git-and-github.md (1)
11 [Temp\] (`...\AppData\Local\Temp\claude\<project>\<session-guid>\scratchpad\`) is already ~150 characters, so this

FOUND | 180 write-keyword lines in the 14 named files (all 14 have hits; keywords: Set-Content, Out-File, Add-Content, New-Item, writeFileSync, appendFileSync, mkdirSync, openSync, Mutex, Semaphore, lock, slot, .log, .json, .jsonl, .lock, .pid, plus writeFile, appendFile, mkdir, Copy-Item, Move-Item, Rename-Item, renameSync, copyFileSync, Tee-Object, Export-Csv, Export-Clixml, createWriteStream)

C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\context-guard.mjs (12)
17 // The texts come in this order: the stop text, the FAILED line, the size message. It never blocks or fails a tool
27 import { acquireLock } from '../lib/file-lock.mjs';
356 * Reads the guard's own settings (contextGuard in orchestration.config.json).
358 * @returns {{tailBytes: number, markerDir: string, markerLockStaleMs: number}} how much of a transcript to read,
359 *   the folder of the markers, and the age after which a marker lock counts as left by a crashed run
366 throw new Error(`orchestration.config.json setting 'contextGuard.markerFolder' must be one folder name, not ${JSON.stringify(markerFolder)}`);
371 markerLockStaleMs: requireNumberSetting(config, 'contextGuard.markerLockStaleSeconds') * 1000,
432 * calls that run at the same time take turns through a lock; one that finds the lock taken sends nothing, because
434 * @param {{markerDir: string, markerLockStaleMs: number}} guard from guardSettings
443 fs.mkdirSync(markerDir, { recursive: true });
444 const release = acquireLock(path.join(markerDir, `${agentId}.lock`), { waitMs: 0, staleMs: guard.markerLockStaleMs });
449 const markerPath = path.join(markerDir, `${agentId}.json`);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\decision-reminder.mjs (12)
3 // cannot wait, each part only when it has something: one line naming the entries that block work and still wait for the
9 // The hand-over waits for the register's lock only register.hookLockWaitSeconds; a busy register leaves the answers for
24 const BLOCKING_INSTRUCTION = 'Each blocking entry above stops work until the user answers it. Do not write it out in this chat: the user reads and answers it in the Decisions pane. End your reply with
40 * xpp-agent (C:\Repos\My projects\xpp-agent): blocking and waiting for the user: D-4 "Drop the old path?" (urgency
44 * @param {object} config the whole settings object (register.hookLockWaitSeconds is read)
45 * @returns {string[]} the blocking line and its instruction, the answers handed over now and their instruction, the
58 const blocking = items.filter((item) => item.blocking && item.status !== WAITING_FOR_AGENT)
60 if (blocking.length > 0) {
61 context.push(`${label}: blocking and waiting for the user: ${blocking.join(', ')}.`, BLOCKING_INSTRUCTION);
82 * Hands over the answers that wait, when any does, waiting for the lock only the hook's short wait.
94 const lockWaitMs = requireNumberSetting(config, 'register.hookLockWaitSeconds') * 1000;
95 return handOverAnswers(location, new Date(), { lockWaitMs });

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\agent-team.mjs (3)
26 throw new Error(`orchestration.config.json setting 'agentTeam.onFolder' must be one folder name, not ${JSON.stringify(folder)}`);
57 fs.mkdirSync(path.dirname(marker), { recursive: true });
58 fs.writeFileSync(marker, now.toISOString());

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\config.mjs (3)
1 // Loads orchestration.config.json, the one settings file of the orchestration hooks and scripts. Every script reads
9 const CONFIG_FILE_NAME = 'orchestration.config.json';
22 * @param {string} skillDir folder that holds orchestration.config.json

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\file-lock.mjs (26)
1 // An exclusive lock held as a file that only one process can create ('wx'). Hand-written because the scripts must
2 // run with no dependencies. A lock older than the stale age is taken to belong to a crashed holder and is removed.
4 // Known limit: two processes that find the same stale lock at the same instant can both remove it; the stale age
10 // How often a waiting process tries again. Short, because a holder keeps the lock for a few milliseconds.
17 * Takes the lock, waiting for it up to a limit.
18 * @param {string} lockPath the lock file (its folder must exist)
19 * @param {{waitMs: number, staleMs: number}} timing how long to keep trying; age after which a lock is stale
20 * @returns {(() => void)|null} a function that releases the lock, or null when it could not be taken in time
22 export function acquireLock(lockPath, { waitMs, staleMs }) {
25 if (tryCreateLock(lockPath)) {
26 return () => fs.rmSync(lockPath, { force: true });
28 if (removeIfStale(lockPath, staleMs)) {
39 * Creates the lock file if nobody holds it.
40 * @param {string} lockPath the lock file
41 * @returns {boolean} true when this process now holds the lock
43 function tryCreateLock(lockPath) {
45 const fd = fs.openSync(lockPath, 'wx');
46 fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
58 * Removes the lock file when it is older than the stale age, checking the age twice.
59 * @param {string} lockPath the lock file
60 * @param {number} staleMs age after which a lock is stale
61 * @returns {boolean} true when a stale lock was removed
63 function removeIfStale(lockPath, staleMs) {
64 const first = statOrNull(lockPath);
68 const second = statOrNull(lockPath);
72 fs.rmSync(lockPath, { force: true });

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\limit-stop.mjs (16)
6 // Also the server's log (limitStop.logFile), which this module alone writes and reads: besides the server's own
63 * Reads the settings both sides of the pipe need (limitStop in orchestration.config.json).
71 throw new Error(`orchestration.config.json setting 'limitStop.pipePrefix' must be a plain name part, not ${JSON.stringify(pipePrefix)}`);
173 * Reads where the log is and how much of its end is read (limitStop.logFile and limitStop.logTailKB).
180 logFile: requirePathSetting(config, 'limitStop.logFile'),
181 tailBytes: Math.round(requireNumberSetting(config, 'limitStop.logTailKB') * 1024),
193 fs.mkdirSync(path.dirname(logFile), { recursive: true });
194 fs.appendFileSync(logFile, `${formatStamp(new Date())} | ${session} | ${text.replace(/\r\n|\n|\r/g, ' ')}\n`);
200 * @param {string} logFile from logSettings, or limitStop.logFile
204 fs.mkdirSync(path.dirname(logFile), { recursive: true });
205 fs.closeSync(fs.openSync(logFile, 'a'));
271 return { at: formatStamp(now), what: `it is gone: it listened from ${clockOf(listened.stamp, now)} as process ${pid} and logged no end` };
305 return `LIMIT STOP SERVER FAILED | ${clockOf(failure.at, now)} | ${failure.what}. ${SERVER_FALLBACK}`;
320 return `LIMIT STOP SERVER FAILED | ${clockOf(formatStamp(now), now)} | this hook got an error from it: ${reason}; ${told}. Carry on with what the last STOP FOR LIMIT text said, if you got one.`;
336 * @returns {string} the clock text
338 function clockOf(stamp, now) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\limit-stop-server.mjs (21)
10 // (the user's choice, 2026-10-25: nothing is left behind to delete), and logs to limitStop.logFile; it does not
126 logFile: requirePathSetting(config, 'limitStop.logFile'),
150 ...logSettings(config),
230 throw new Error(`orchestration.config.json setting '${keyPath}' must be a list of agent type names`);
273 return printLine(`LIMIT STOP SERVER STARTED | process ${child.pid} | pipe ${setup.pipePath} | until stop or the end of Claude Code process ${setup.claudePid}`, 0);
278 return printLine(`LIMIT STOP SERVER NOT STARTED | its pipe did not answer within ${setup.startCheckMs / 1000} s, so it was stopped; its log is ${setup.logFile}`, 1);
292 return `LIMIT STOP SERVER NOT STARTED | its log ${setup.logFile} cannot be written, and a failure reaches the main session only through it`;
294 return `LIMIT STOP SERVER NOT STARTED | it exited with ${exitCode}; its log is ${setup.logFile}`;
345 lines = readSessionLog(setup.logFile, setup.session, setup.tailBytes);
347 return printLine(`LIMIT STOP SERVER NOT CHECKED | its log ${setup.logFile} cannot be read: ${oneLine(error)}`, 1);
394 appendLimitStopLog(setup.logFile, setup.session, text);
396 process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
419 appendLimitStopLog(setup.logFile, setup.session, text);
425 assertLogWritable(setup.logFile);
427 process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
443 : `the ${setup.window} limit at ${setup.percent}% resets ${formatClock(setup.resetsAt)}`;
445 appendLimitStopLog(setup.logFile, setup.session, `${LOG.listening}${setup.pipePath} (pid ${process.pid}): ${what}; watching the session's Claude Code process ${setup.claudePid}`);
447 process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
633 return `STOP FOR LIMIT | the ${setup.window} usage limit is at ${Number(setup.percent.toFixed(1))}% and resets at ${formatClock(setup.resetsAt)}, so this session hands over to a new one.`;
648 * @returns {string} the clock text
650 function formatClock(moment) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\run-heavy.ps1 (43)
7 # It waits for a free slot (one named mutex per slot; Windows frees a slot whose holder was killed), then for
10 # process tree and the exit code; the script exits with the command's own exit code. The slot count, the free-memory
11 # floor and the wait come from orchestration.config.json (runHeavy) unless passed; a missing setting is HEAVY COMMAND
12 # NOT RUN with exit code 1, and no slot is taken. A wait that runs out is HEAVY COMMAND NOT RUN with exit code 124.
18 # How many heavy commands may run at once on this machine. Default: runHeavy.slots.
19 [int]$Slots,
22 # How long to wait for a slot and then for memory before giving up. Default: runHeavy.waitMinutes.
26 # The orchestration settings: the slot count, the free-memory floor and the wait.
27 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
30 $slotPrefix = 'xpp-agent-heavy-command-slot-'
40 # One value of the settings by its dotted key ('runHeavy.slots'). A missing key is an error that names it.
50 # The slot count, the free-memory floor and the wait by parameter name: a parameter in $bound (the passed ones) as
53 $keys = [ordered]@{ Slots = 'runHeavy.slots'; MinFreeMB = 'runHeavy.minFreeMB'; WaitMinutes = 'runHeavy.waitMinutes' }
91 # --- Slots --------------------------------------------------------------------------------------------------------
93 # The file that says who holds a slot, so a waiting agent can tell what it waits for.
94 function Get-HolderFile([int]$slot) {
95 return Join-Path $env:TEMP "$slotPrefix$slot.txt"
98 # Tries every slot once. Returns @{ Mutex; Slot; Abandoned } for the slot taken, or $null when all are held.
99 function Enter-AnySlot {
100 for ($slot = 1; $slot -le $Slots; $slot++) {
101 $mutex = [System.Threading.Mutex]::new($false, "$slotPrefix$slot")
103 if ($mutex.WaitOne(0)) { return @{ Mutex = $mutex; Slot = $slot; Abandoned = $false } }
104 } catch [System.Threading.AbandonedMutexException] {
105 return @{ Mutex = $mutex; Slot = $slot; Abandoned = $true }
107 $mutex.Dispose()
112 # The holders of every slot, one line each, read from their holder files.
114 $lines = for ($slot = 1; $slot -le $Slots; $slot++) {
115 $file = Get-HolderFile $slot
116 if (Test-Path -LiteralPath $file) { "  slot ${slot}: " + (Get-Content -LiteralPath $file -Raw).Trim() }
117 else { "  slot ${slot}: held, holder unknown" }
122 # Waits until a slot is free or the deadline passes. Returns the slot taken, or $null at the deadline.
123 function Wait-ForSlot([datetime]$deadline) {
126 $taken = Enter-AnySlot
128 if (-not $told) { "run-heavy: every slot is busy; waiting.`n" + (Get-HolderLines) | Write-Host; $told = $true }
198 $Slots = $settings.Slots
204 $taken = Wait-ForSlot $deadline
206 Write-Host "HEAVY COMMAND NOT RUN | no slot came free in $WaitMinutes minutes`n$(Get-HolderLines)"
210 if ($taken.Abandoned) { Write-Host "run-heavy: slot $($taken.Slot)'s last holder ended without freeing it; taken over." }
211 Set-Content -LiteralPath (Get-HolderFile $taken.Slot) -Value "process $PID since $((Get-Date).ToString('HH:mm:ss')) in $((Get-Location).Path): $Command"
222 " | peak $($measured.Peak) | free memory at its lowest $($measured.LowestFreeMB) MB | slot $($taken.Slot) of $Slots")
225 Remove-Item -LiteralPath (Get-HolderFile $taken.Slot) -ErrorAction SilentlyContinue
226 $taken.Mutex.ReleaseMutex()
227 $taken.Mutex.Dispose()

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\schedule-relaunch.ps1 (1)
31 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\start-session-in-vscode.ps1 (7)
4 # time to the log file (relaunch.logFile in orchestration.config.json, or -LogPath); when even that path cannot be
37 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
38 # Where each step is logged. Default: relaunch.logFile.
168 # press and release comes first (the usual unlock); a minimised window is restored.
231 New-Item -ItemType Directory -Force (Split-Path -Parent $path) | Out-Null
232 Add-Content -LiteralPath $path -Value $line -Encoding utf8
244 $LogPath = Expand-ConfigPath (Get-ConfigValue (Read-OrchestrationConfig $ConfigPath) 'relaunch.logFile' $ConfigPath) 'relaunch.logFile' $ConfigPath

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\usage-probe.ps1 (6)
17 # out comes from orchestration.config.json (usageLimits); every setting is read before claude is started.
23 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
172 New-Item -ItemType Directory -Force $folder | Out-Null
192 $newest = Get-ChildItem -LiteralPath $folder.FullName -Filter '*.jsonl' -File |
195 Remove-Item -LiteralPath $newest.FullName
228 New-Item -ItemType Directory -Force $WorkingFolder | Out-Null

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-agent-size-and-stall.ps1 (6)
10 # contextCaps.<type>.warn in orchestration.config.json (the default entry for a type not listed there) unless
34 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
54 # The agent's type from the meta file beside its transcript (agent-<id>.meta.json): its agentType, or 'default' when
64 # The transcript of the agent: <projects>\<project-folder>\<session-id>\subagents\agent-<id>.jsonl.
68 $candidate = Join-Path $folder.FullName "$session\subagents\agent-$agent.jsonl"
118 $type = if ($followMeta) { Get-MetaAgentType ($transcript -creplace '\.jsonl$', '.meta.json') }

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1 (6)
25 # look interval and the failure count come from orchestration.config.json (decisionAnswersWatch) unless passed.
43 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
205 $clock = [Diagnostics.Stopwatch]::StartNew()
211 if ($clock.Elapsed -ge $nextFull) {
213 while ($nextFull -le $clock.Elapsed) { $nextFull += $period }
236 $untilFull = ($nextFull - $clock.Elapsed).Ticks

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1 (18)
40 # agents wrote since it was taken. Its settings are in orchestration.config.json; a parameter passed wins.
73 [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
93 # The transcript of the session: <projects>\<project-folder>\<session-id>.jsonl. The project folder is named after
97 $candidate = Join-Path $folder.FullName "$session.jsonl"
213 $clockThen = [TimeZoneInfo]::ConvertTime($stoppedAt, $zone).DateTime
214 $reset = $clockThen.Date.AddHours($hour).AddMinutes($minute)
215 if ($reset -le $clockThen) { $reset = $reset.AddDays(1) }
397 foreach ($file in Get-ChildItem -LiteralPath $folder -Filter 'agent-*.jsonl' -File -ErrorAction SilentlyContinue) {
398 $meta = $file.FullName -creplace '\.jsonl$', '.meta.json'
411 @(Get-ChildItem -LiteralPath $folder -Filter 'agent-*.jsonl' -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object LastWriteTimeUtc)
449 return Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"
515 function Format-Clock([DateTimeOffset]$at, [DateTimeOffset]$now) {
523 return ($agents | ForEach-Object { "$($_.Type) $($_.Id.Substring(0, [Math]::Min(8, $_.Id.Length))) at $(Format-Clock $_.ExpiresAt $now)" }) -join ', '
530 return "LIMIT NEAR | HAND OVER | $($window.Name) at $percent% resets $(Format-Clock $window.ResetsAt $now) | going cold: $cold"
537 return "SESSION RESET COLD | $($stop.Kind) stopped this session at $(Format-Clock $stop.At $now) (`"$($stop.Text)`"); the limit " +
538 "reset at $(Format-Clock $decision.ResetsAt $now) and it is now $(Format-Clock $now $now). $why Do not resume any agent: write the " +
654 Set-Content -LiteralPath $marker -Value "$PID $((Get-Process -Id $PID).StartTime.Ticks)" -NoNewline
776 Remove-Item -LiteralPath $marker -ErrorAction SilentlyContinue

FOUND | 31 supplementary write-API lines (not matched by the keyword list) in 9 files; 6 named files have none (run-heavy.ps1, schedule-relaunch.ps1, start-session-in-vscode.ps1, file-lock.mjs, agent-team.mjs, config.mjs)

C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\context-guard.mjs (3)
35 import { readText, writeTextAtomic } from '../lib/text-file.mjs';
67 process.stdout.write(hookContextOutput('PostToolUse', message));
453 writeTextAtomic(markerPath, `${JSON.stringify({ level, sizeTokens: size, sentAt: new Date().toISOString() })}\n`);

C:\Repos\My projects\software-developer-agent\orchestrate-agents\hooks\decision-reminder.mjs (4)
31 if (context.length > 0) {
32 process.stdout.write(hookContextOutput('UserPromptSubmit', context.join('\n')));
71 if (handed.length > 0) {
75 if (earlier.length > 0) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\limit-stop.mjs (2)
115 socket.on('connect', () => socket.write(`${JSON.stringify(request)}\n`));
119 if (bytes > MAX_LINE_BYTES) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\lib\text-file.mjs (2)
87 export function writeTextAtomic(filePath, text) {
105 * Names the temp file writeTextAtomic writes beside a file before renaming it over the file.

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\limit-stop-server.mjs (5)
92 process.stderr.write(`limit-stop-server: the first argument must be the mode, start, serve, check or stop, not ${JSON.stringify(mode ?? '')}\n`);
304 process.stdout.write(`${line}\n`);
413 process.stderr.write(`limit-stop-server: ${oneLine(error)}\n`);
437 process.stderr.write(`limit-stop-server: ${why}\n`);
493 if (bytes > MAX_LINE_BYTES) {

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\usage-probe.ps1 (5)
98 $info.RedirectStandardOutput = $true
99 $info.RedirectStandardError = $true
156 $text = [IO.File]::ReadAllText($path)
174 [IO.File]::WriteAllText($temp, $text, [Text.UTF8Encoding]::new($false))
175 [IO.File]::Move($temp, $path, $true)

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-agent-size-and-stall.ps1 (1)
77 $stream = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-decision-answers.ps1 (6)
60 process.stdout.write(JSON.stringify([location.openPath, location.answersLogPath]));
62 process.stderr.write(`${error.message}\n`);
123 $startInfo.RedirectStandardOutput = $true
124 $startInfo.RedirectStandardError = $true
162 $file = [IO.FileInfo]::new($path)
179 $stream.Write($bytes, 0, $bytes.Length)

C:\Repos\My projects\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1 (3)
107 $stream = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
468 [IO.File]::WriteAllText($path, ($record | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
504 [IO.File]::WriteAllText($path, ($raw | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))

NAMES | distinct file and folder names seen being written, with the lines that write or build them

1. `claude-agent-team-on\<session id>` (under %TEMP%) | written: `orchestrate-agents\lib\agent-team.mjs:57-58` (`fs.mkdirSync(path.dirname(marker)...)`, `fs.writeFileSync(marker, now.toISOString())`); built: `lib\agent-team.mjs:31` (`return path.join(os.tmpdir(), folder, sessionId);`); folder name `orchestration.config.json:124`; caller `scripts\team-on.mjs:25`; also built at `decisions-pane\hooks\team-on.ts:82` and `team-switch.ts:40`; test writes `tests\hooks\decision-reminder.test.mjs:29-30`.
2. `claude-context-guard\<agentId>.json` (under %TEMP%) | written: `hooks\context-guard.mjs:453` (`writeTextAtomic(markerPath, ...)`); built `:449` (`path.join(markerDir, `${agentId}.json`)`); dir `:443` (`fs.mkdirSync(markerDir, ...)`); `markerDir` from `:370` (`path.join(os.tmpdir(), markerFolder)`); folder name `orchestration.config.json:117`; atomic write helper `lib\text-file.mjs:87-89`.
3. `claude-context-guard\<agentId>.lock` | written: `hooks\context-guard.mjs:444` (`acquireLock(path.join(markerDir, `${agentId}.lock`), ...)`); created `lib\file-lock.mjs:45` (`fs.openSync(lockPath, 'wx')`), `:46` (`fs.writeSync`); removed `file-lock.mjs:26` and `:72` (`fs.rmSync`).
4. `claude-context-guard\session-<session id>.json` | documented only: `agent-team-files.html:855`; no write line in the named code files.
5. `claude-session-watch-<session id>.txt` (under %TEMP%) | written: `scripts\watch-usage-and-context.ps1:654` (`Set-Content -LiteralPath $marker ...`, in `Set-WatchMarker` at :653); built `:639` (`Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"`), set at `:684`-`:690`; removed `:776`; test write `tests\limit-scripts.tests.ps1:861`.
6. `claude-session-watch-<session id>.decision.json` (under %TEMP%) | written: `watch-usage-and-context.ps1:468` (`[IO.File]::WriteAllText($path, ...)` in `Write-DecisionRecord` at :453) and `:504` (in `Set-ReportedCheck` at :500); built `:449` (`Get-DecisionRecordPath`); callers `:677`, `:745` (`Write-CapRecord`), `:765` (`Write-DecisionRecord`), `:729`, `:736` (`Set-ReportedCheck`).
7. `usage-limits.json` (under `~\.claude\state\`, config `usageLimits.stateFile`) | written: `scripts\usage-probe.ps1:250` (`Write-FileAtomically $StatePath $json`), through `:170-175` (temp `.<name>.<PID>.tmp` at `:173`, `[IO.File]::WriteAllText($temp, ...)` at `:174`, `[IO.File]::Move($temp, $path, $true)` at `:175`); `$StatePath` built `:209`; folder created `:172`; config `orchestration.config.json:26`.
8. `claude-usage-probe\` (under %TEMP%, config `usageLimits.probeWorkingFolder`) | created: `scripts\usage-probe.ps1:228` (`New-Item -ItemType Directory -Force $WorkingFolder`); value `:212`; run folder `:231`; config `orchestration.config.json:31`.
9. `xpp-agent-heavy-command-slot-<n>.txt` (under %TEMP%) | written: `scripts\run-heavy.ps1:211` (`Set-Content -LiteralPath (Get-HolderFile $taken.Slot) ...`); built `:95` (`Join-Path $env:TEMP "$slotPrefix$slot.txt"`), prefix `:30`; removed `:225`.
10. Mutex `xpp-agent-heavy-command-slot-<n>` | `scripts\run-heavy.ps1:101` (`[System.Threading.Mutex]::new($false, "$slotPrefix$slot")`).
11. `relaunch.log` (under `~\.claude\state\`) | written: `scripts\start-session-in-vscode.ps1:232` (`Add-Content -LiteralPath $path ...`) in `Write-RelaunchLog` (:229, folder `:231`); path `:244` (config key `relaunch.logFile`); config `orchestration.config.json:56`.
12. `limit-stop.log` (under `~\.claude\state\`) | written: `lib\limit-stop.mjs:194` (`fs.appendFileSync(logFile, ...)`), folder `:193` and `:204`, open `:205` (`fs.closeSync(fs.openSync(logFile, 'a'))`); callers `scripts\limit-stop-server.mjs:394, 419, 445` and `hooks\context-guard.mjs:242`; path `lib\limit-stop.mjs:180`; config `orchestration.config.json:108`.
13. `decisions\.lock` (register lock) | created via `lib\file-lock.mjs:45`; `lib\decision-register.mjs:32` (`const LOCK_FILE_NAME = '.lock';`), `:141` (`lockPath: path.join(folderPath, LOCK_FILE_NAME)`), `:1336` (`acquireLock(location.lockPath, ...)`); folder from `orchestration.config.json:129` (`"folder": "decisions"`).
14. Register files in `decisions\` (outside the 14 named files; call-site pass) | `OPEN_DECISIONS_CLAUDE.md` (config :130), `ANSWERED_DECISIONS_CLAUDE.md` (:131), `RESOLVED_DECISIONS_CLAUDE.md` (:132), `ANSWERS_LOG_CLAUDE.jsonl` (:133) | written by `lib\decision-register.mjs:377, 406, 466, 469, 506, 829, 1158` (`writeTextAtomic(...)`); folder created `:364`.
15. Temp file beside each atomic write | `lib\text-file.mjs:88-89` (`tempFileName(...)`, `fs.writeFileSync(tempPath, text, 'utf8')`), `:92` (`fs.renameSync(tempPath, filePath)`); name example in doc comment `text-file.mjs:108` (`'.OPEN_DECISIONS_CLAUDE.md.4242.tmp'`).
16. `temp\` (project working folder, named in docs) | `agent-team-files.html:637, 655, 657, 673, 678, 693, 733, 735`; `orchestrate-agents\references\lead-brief-template.md:7`. No code write line in the named files.
17. `~\.claude\state\mcp-discover-verdicts.json` | documented only: `agent-team-files.html:921`.
18. Test-only names | `%TEMP%\limit-scripts-tests-<guid>` (`tests\limit-scripts.tests.ps1:21`); `oa-<label>-*` (`tests\helpers\scratch.mjs:40`); `limit-stop.log` in test folder (`tests\hooks\context-guard.test.mjs:59`); `claude-context-guard` in test folder (`tests\hooks\context-guard.test.mjs:60`).
19. `scripts\schedule-relaunch.ps1`: no write-keyword line other than `:31` (`ConfigPath`), no supplementary line; lines 87-88 build a string (`"$prefix-$folder-..."`), not read further.

NOT FOUND | in R1 (repo): `.claude/state` (forward slash), `.claude\\\\state` (four backslashes, as written), `GetTempFileName`, `New-TemporaryFile`.
NOT FOUND | in R2 (decisions-pane): `claude-context-guard`, `claude-usage-probe`, `markerFolder`, `probeWorkingFolder`, `usage-limits.json`, `relaunch.log`, `limit-stop.log`, `stateFile`, `.claude\state`, `.claude/state`, `.claude\\state`, `.claude\\\\state`, `claude\state`, `$env:TEMP`, `env.TEMP`, `GetTempPath`, `GetTempFileName`, `New-TemporaryFile`.
NOT FOUND | in R3a (xpp-agent Docs\Skills): `claude-agent-team-on`, `claude-context-guard`, `claude-usage-probe`, `onFolder`, `markerFolder`, `probeWorkingFolder`, `usage-limits.json`, `relaunch.log`, `limit-stop.log`, `stateFile`, `logFile`, `.claude\state`, `.claude/state`, `.claude\\state`, `.claude\\\\state`, `claude\state`, `env.TEMP`, `tmpdir`, `GetTempPath`, `GetTempFileName`, `New-TemporaryFile`, `TMP` (bare, count 0).
NOT FOUND | in R3b (.claude\skills non-junction, .claude\CLAUDE.md, .claude\settings.json): every non-bare pattern (`claude-agent-team-on` through `Temp\`).

