# Tests for the PowerShell scripts of the orchestrate-agents skill: the usage-limit scripts usage-probe.ps1,
# watch-usage-and-context.ps1 (the Usage and context watch), schedule-relaunch.ps1 and start-session-in-vscode.ps1, the
# settings of run-heavy.ps1 and watch-agent-size-and-stall.ps1 (the Agent size and stall watch), and the forwarders
# left under the two watches' old file names. Unit cases dot-source a script (each script returns before
# its main part when dot-sourced) and call its functions on fixture data; integration cases run a script as a child
# pwsh on fixture transcripts, the way Claude Code's background task runs it.
#
# It has a small runner of its own instead of Pester: only Pester 3.4 (for Windows PowerShell) is installed here, and
# Pester 5 would be a new dependency nobody has approved.
#
#   pwsh -NoProfile -File tests\limit-scripts.tests.ps1 [-Only '<wildcard>'] [-WorkRoot <folder>] [-RealTask]
#
# The exit code is the number of failed cases. Everything it writes lives under its own work folder, plus the watch's
# marker and decision files in %TEMP%, which are named after invented session ids; all are removed at the end. It
# never runs the real usage probe, never opens a vscode:// link, never sends a key, and touches the Task Scheduler
# only with -RealTask (one task a year ahead, removed again).
param(
    # The folder holding the scripts under test. A mutation check points it at a changed copy.
    [string]$ScriptsRoot = (Join-Path $PSScriptRoot '..\scripts'),
    # Where fixtures are written; removed at the end.
    [string]$WorkRoot = (Join-Path ([IO.Path]::GetTempPath()) "limit-scripts-tests-$([guid]::NewGuid().ToString('N').Substring(0, 8))"),
    # Run only the cases whose name matches this wildcard.
    [string]$Only = '*',
    # Also register one real scheduled task a year ahead, read it back and remove it.
    [switch]$RealTask
)

$ErrorActionPreference = 'Stop'
# No case may reach the real session: a script started without -SessionId (a forwarder that lost its arguments, say)
# would take the session id and the Claude Code pid of the shell that runs these tests.
$env:CLAUDE_CODE_SESSION_ID = $null
$env:CLAUDE_PID = $null
$ScriptsRoot = [IO.Path]::GetFullPath($ScriptsRoot)
$RealConfig = [IO.Path]::GetFullPath((Join-Path $ScriptsRoot '..\orchestration.config.json'))
$Invariant = [Globalization.CultureInfo]::InvariantCulture
New-Item -ItemType Directory -Force $WorkRoot | Out-Null

# --- The runner --------------------------------------------------------------------------------------------------

$script:Passed = 0
$script:Failed = 0
$script:CleanUp = [Collections.Generic.List[string]]::new()

# Runs one case and prints ok or FAIL with the reason. A case fails by throwing.
function Test-Case([string]$name, [scriptblock]$body) {
    if ($name -notlike $Only) { return }
    try {
        & $body
        $script:Passed++
        "  ok    $name"
    }
    catch {
        $script:Failed++
        "  FAIL  $name :: $($_.Exception.Message) (line $($_.InvocationInfo.ScriptLineNumber))"
    }
}

# Throws unless the two values are equal; strings are compared case-sensitively.
function Assert-Equal($expected, $actual, [string]$what) {
    $same = if ($expected -is [string] -and $actual -is [string]) { $expected -ceq $actual } else { $expected -eq $actual }
    if (-not $same) { throw "${what}: expected <$expected>, got <$actual>" }
}

# Throws unless the condition holds.
function Assert-True([bool]$condition, [string]$what) {
    if (-not $condition) { throw "${what}: was false" }
}

# Throws unless the block throws an error whose message matches the pattern (case-sensitive).
function Assert-Throws([scriptblock]$block, [string]$pattern, [string]$what) {
    try { & $block } catch {
        if ($_.Exception.Message -cmatch $pattern) { return }
        throw "${what}: threw <$($_.Exception.Message)>, expected a match for <$pattern>"
    }
    throw "${what}: did not throw"
}

# --- Fixtures ----------------------------------------------------------------------------------------------------

# A time as Claude Code writes it into a transcript: UTC with milliseconds and a Z.
function Format-Utc([DateTimeOffset]$at) {
    return $at.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", $Invariant)
}

# A subagent id as Claude Code makes them: 'a' and 16 hex digits.
function New-AgentId {
    return 'a' + [guid]::NewGuid().ToString('N').Substring(0, 16)
}

# One assistant record as Claude Code writes it, with the tokens the reply wrote to the 1-hour and the 5-minute cache.
# A subagent's records carry its id and are marked as a side chain.
function New-ReplyLine([DateTimeOffset]$at, [string]$agentId = '', [int]$write1h = 0, [int]$write5m = 0, [int]$read = 90000) {
    $record = [ordered]@{
        parentUuid = [guid]::NewGuid().ToString(); isSidechain = [bool]$agentId; userType = 'external'
        cwd = 'C:\Repos\Demo'; sessionId = 'fixture'; version = '2.1.310'; gitBranch = 'main'
        message = [ordered]@{
            model = 'claude-opus-5-5'; id = 'msg_' + [guid]::NewGuid().ToString('N'); type = 'message'; role = 'assistant'
            content = @([ordered]@{ type = 'text'; text = 'Reading the next file.' }); stop_reason = 'tool_use'
            usage = [ordered]@{
                input_tokens = 2; cache_creation_input_tokens = $write1h + $write5m; cache_read_input_tokens = $read
                output_tokens = 310; service_tier = 'standard'
                cache_creation = [ordered]@{ ephemeral_1h_input_tokens = $write1h; ephemeral_5m_input_tokens = $write5m }
            }
        }
        requestId = 'req_' + [guid]::NewGuid().ToString('N').Substring(0, 24); type = 'assistant'
        uuid = [guid]::NewGuid().ToString(); timestamp = Format-Utc $at
    }
    if ($agentId) { $record.agentId = $agentId }
    return $record | ConvertTo-Json -Compress -Depth 10
}

# A user record holding a tool result whose text quotes a transcript, so a naive text search would take it for a reply.
function New-UserLine([DateTimeOffset]$at, [string]$agentId = '') {
    $record = [ordered]@{
        isSidechain = [bool]$agentId; type = 'user'; timestamp = Format-Utc $at
        message = [ordered]@{ role = 'user'; content = @([ordered]@{ type = 'tool_result'; tool_use_id = 'toolu_01'; content = '{"type":"assistant","timestamp":"2030-01-01T00:00:00Z"}' }) }
    }
    if ($agentId) { $record.agentId = $agentId }
    return $record | ConvertTo-Json -Compress -Depth 10
}

# The record Claude Code writes when the usage limit or a server error stops a turn: every count zero.
function New-ApiErrorLine([DateTimeOffset]$at, [string]$kind, [string]$text) {
    return [ordered]@{
        isSidechain = $false; type = 'assistant'; isApiErrorMessage = $true; error = $kind; timestamp = Format-Utc $at
        message = [ordered]@{
            model = '<synthetic>'; role = 'assistant'; content = @([ordered]@{ type = 'text'; text = $text })
            usage = [ordered]@{ input_tokens = 0; cache_creation_input_tokens = 0; cache_read_input_tokens = 0; output_tokens = 0 }
        }
    } | ConvertTo-Json -Compress -Depth 10
}

# A run of replies, oldest first, one a minute up to $last, each writing to the given cache.
function New-ReplyRun([DateTimeOffset]$last, [int]$count, [string]$agentId, [string]$cache) {
    for ($i = $count - 1; $i -ge 0; $i--) {
        $at = $last.AddMinutes(-$i)
        if ($cache -eq '1h') { New-ReplyLine $at $agentId -write1h 2100 } else { New-ReplyLine $at $agentId -write5m 1500 }
        New-UserLine $at.AddSeconds(20) $agentId
    }
}

# Writes lines the way Claude Code does: UTF-8 without a byte-order mark, LF after every line.
function Write-Lines([string]$path, [string[]]$lines) {
    [IO.File]::WriteAllText($path, (($lines -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
}

# A projects folder holding one session: its transcript, its subagents (each @{Id; Type; Lines; Workflow; Finished};
# no Type means no meta file, no Finished key means a meta file without the field) and a second project folder whose
# name contains the first's, as a decoy.
function New-FixtureSession([string[]]$mainLines, [object[]]$agents = @()) {
    $session = [guid]::NewGuid().ToString()
    $projects = Join-Path $WorkRoot "projects-$($session.Substring(0, 8))"
    $project = Join-Path $projects 'C--Repos-Demo'
    New-Item -ItemType Directory -Force (Join-Path $projects 'C--Repos-OtherDemo') | Out-Null
    $subagents = Join-Path $project "$session\subagents"
    New-Item -ItemType Directory -Force $subagents | Out-Null
    $transcript = Join-Path $project "$session.jsonl"
    Write-Lines $transcript $mainLines
    foreach ($agent in $agents) {
        $folder = if ($agent.Workflow) { Join-Path $subagents 'workflows\wf_1234abcd-567' } else { $subagents }
        New-Item -ItemType Directory -Force $folder | Out-Null
        Write-Lines (Join-Path $folder "agent-$($agent.Id).jsonl") $agent.Lines
        if ($agent.Type) {
            $meta = [ordered]@{ agentType = $agent.Type; description = 'fixture'; spawnDepth = 1; requestShape = 'background'; model = 'opus' }
            if ($agent.Workflow) { $meta.workflowPhase = 'Build' }
            if ($agent.ContainsKey('Finished')) { $meta.finished = $agent.Finished }
            Write-Lines (Join-Path $folder "agent-$($agent.Id).meta.json") @($meta | ConvertTo-Json -Compress)
        }
    }
    $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"))
    $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"))
    return [pscustomobject]@{ ProjectsRoot = $projects; SessionId = $session; Transcript = $transcript; Subagents = $subagents }
}

# A usage reading in the shape usage-probe.ps1 writes. A window given as $null is missing.
function New-ReadingFile([DateTimeOffset]$checkedAt, $fivePercent, $fiveResets, $weekPercent, $weekResets) {
    $window = { param($p, $r) if ($null -eq $p) { $null } else { [ordered]@{ percent = $p; resetsAt = $r.ToString('o', $Invariant) } } }
    $path = Join-Path $WorkRoot "reading-$([guid]::NewGuid().ToString('N').Substring(0, 8)).json"
    $reading = [ordered]@{ checkedAt = $checkedAt.ToString('o', $Invariant); fiveHour = (& $window $fivePercent $fiveResets); weekly = (& $window $weekPercent $weekResets) }
    Write-Lines $path @($reading | ConvertTo-Json -Compress -Depth 5)
    return $path
}

# A copy of the real settings with some values changed ('usageLimits.resumeMarginMinutes' = 3, or a deeper key such
# as 'contextCaps.main.warn'); $null removes a key.
function New-TestConfig([hashtable]$changes) {
    $config = Get-Content -LiteralPath $RealConfig -Raw | ConvertFrom-Json -AsHashtable
    foreach ($key in $changes.Keys) {
        $parts = $key.Split('.')
        $node = $config
        foreach ($part in $parts[0..($parts.Count - 2)]) { $node = $node[$part] }
        $name = $parts[-1]
        if ($null -eq $changes[$key]) { $node.Remove($name) } else { $node[$name] = $changes[$key] }
    }
    $path = Join-Path $WorkRoot "config-$([guid]::NewGuid().ToString('N').Substring(0, 8)).json"
    Write-Lines $path @($config | ConvertTo-Json -Depth 10)
    return $path
}

# Starts a process that stands in for the session's Claude Code process; the watch ends quietly when it exits.
function Start-StandIn([int]$seconds) {
    return Start-Process -FilePath (Join-Path $PSHOME 'pwsh.exe') -ArgumentList '-NoProfile', '-Command', "Start-Sleep -Seconds $seconds" -WindowStyle Hidden -PassThru
}

# Starts a script as a child pwsh with an argument list, its output redirected.
function Start-ScriptProcess([string]$file, [string[]]$arguments) {
    $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $PSHOME 'pwsh.exe'))
    foreach ($argument in @('-NoProfile', '-NonInteractive', '-File', $file) + $arguments) { $info.ArgumentList.Add($argument) }
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.UseShellExecute = $false
    $process = [Diagnostics.Process]::Start($info)
    return [pscustomobject]@{ Process = $process; Out = $process.StandardOutput.ReadToEndAsync(); Err = $process.StandardError.ReadToEndAsync() }
}

# Waits for a script started by Start-ScriptProcess and returns its exit code and its non-empty output lines. One
# that runs past the timeout is killed (it is this test's own child) and reported as timed out.
function Wait-ScriptProcess($started, [int]$timeoutSeconds) {
    $done = $started.Process.WaitForExit($timeoutSeconds * 1000)
    if (-not $done) { $started.Process.Kill(); $started.Process.WaitForExit() }
    return [pscustomobject]@{
        TimedOut = -not $done
        ExitCode = $started.Process.ExitCode
        Lines    = @($started.Out.Result -csplit "`r?`n" | Where-Object { $_ -ne '' })
        Err      = $started.Err.Result
    }
}

# Runs a script to its end (or the timeout) and returns what Wait-ScriptProcess returns.
function Invoke-Script([string]$file, [string[]]$arguments, [int]$timeoutSeconds = 30) {
    return Wait-ScriptProcess (Start-ScriptProcess $file $arguments) $timeoutSeconds
}

# A stand-in for limit-stop-server.mjs, so no watch run starts a real server. Started, it writes the arguments it got
# to stub-args-<session>.json beside itself, and whether the watch's decision record existed by then to
# stub-record-<session>.txt, and prints the line in LIMIT_TESTS_STUB_SAYS, else a STARTED line. Asked to check, it
# adds its arguments as one line to stub-check-<session>.txt and prints the line in stub-check-says-<session>.txt
# beside itself (read at each check, so a case can change it while a watch runs), else the line in
# LIMIT_TESTS_STUB_CHECK_SAYS, else a FINE line.
$StubServer = Join-Path $WorkRoot 'stub-limit-stop-server.mjs'
Write-Lines $StubServer @(
    "import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';",
    "const args = process.argv.slice(2);",
    "const session = args[args.indexOf('--session') + 1];",
    "const here = path.dirname(fileURLToPath(import.meta.url));",
    "if (args[0] === 'check') {",
    "    fs.appendFileSync(path.join(here, ``stub-check-`${session}.txt``), args.join('|') + '\n');",
    "    const saysFile = path.join(here, ``stub-check-says-`${session}.txt``);",
    "    const says = fs.existsSync(saysFile) ? fs.readFileSync(saysFile, 'utf8').trim() : (process.env.LIMIT_TESTS_STUB_CHECK_SAYS ?? 'LIMIT STOP SERVER FINE | stub');",
    "    console.log(says);",
    "    process.exitCode = says.includes('NOT CHECKED') ? 2 : 0;",
    "} else if (args[0] === 'start') {",
    "    fs.writeFileSync(path.join(here, ``stub-args-`${session}.json``), JSON.stringify(args));",
    "    const record = path.join(os.tmpdir(), ``claude-session-watch-`${session}.decision.json``);",
    "    fs.writeFileSync(path.join(here, ``stub-record-`${session}.txt``), String(fs.existsSync(record)));",
    "    const says = process.env.LIMIT_TESTS_STUB_SAYS ?? 'LIMIT STOP SERVER STARTED | process 4242 | pipe stub';",
    "    console.log(says);",
    "    process.exitCode = says.includes('NOT STARTED') ? 1 : 0;",
    "} else {",
    "    console.error(``stub: no mode `${args[0]}``);",
    "    process.exitCode = 2;",
    "}")

# The fallback every LIMIT STOP SERVER FAILED line ends with, read from lib/limit-stop.mjs by node itself, so the
# watch's copy of it is held to the lib's word for word.
$LibUrl = [Uri]::new([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\lib\limit-stop.mjs'))).AbsoluteUri
$LibFallback = (& node --input-type=module -e "import { SERVER_FALLBACK } from '$LibUrl'; console.log(SERVER_FALLBACK);") -join ''

# The arguments that point a watch at a fixture session and keep it away from the real probe, settings and
# limit-stop server.
function Get-WatchArguments($fixture, [string]$config, [string]$reading, [int]$claudePid = 0) {
    return @('-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-ClaudePid', "$claudePid",
        '-EverySeconds', '1', '-ConfigPath', $config, '-UsageReadingPath', $reading, '-StopServerScript', $StubServer)
}

$Watch = Join-Path $ScriptsRoot 'watch-usage-and-context.ps1'
$Probe = Join-Path $ScriptsRoot 'usage-probe.ps1'
$Schedule = Join-Path $ScriptsRoot 'schedule-relaunch.ps1'
$Start = Join-Path $ScriptsRoot 'start-session-in-vscode.ps1'
$NoReading = Join-Path $WorkRoot 'no-reading.json'
$t0 = [DateTimeOffset]::new(2026, 10, 25, 9, 0, 0, [TimeSpan]::FromHours(1))

# Brings one script's functions into the test's scope without running its main part; $arguments fills a script's
# mandatory parameters. A script that cannot be loaded counts as one failed case, and the cases that need it fail on
# their own.
function Import-ScriptFunctions([string]$path, [hashtable]$arguments = @{}) {
    try { . $path @arguments } catch {
        $script:Failed++
        "  FAIL  load $path :: $($_.Exception.Message)"
        return
    }
    # Not $command: run-heavy.ps1's [string]$Command parameter, dot-sourced into this scope, would turn it into text.
    foreach ($defined in Get-Command -CommandType Function | Where-Object { $_.ScriptBlock.File -eq $path }) {
        Set-Item -Path "function:script:$($defined.Name)" -Value $defined.ScriptBlock
    }
}

# --- usage-probe.ps1 ---------------------------------------------------------------------------------------------

"usage-probe.ps1"
Import-ScriptFunctions $Probe

Test-Case 'probe: reads both windows of the first rate_limit_event line' {
    $lines = @(
        'not json at all',
        '{"type":"system","subtype":"init","session_id":"x"}',
        '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","unifiedWindows":{"five_hour":{"utilization":0.1,"resetsAt":1792926600},"seven_day":{"utilization":0.473,"resetsAt":1793426400}}}}',
        '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.9,"resetsAt":1}}}}'
    )
    $reading = ConvertFrom-ProbeOutput $lines $t0
    $epoch = [DateTimeOffset]::new(1970, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    Assert-Equal 10 $reading.fiveHour.percent 'five-hour percent'
    Assert-Equal 47.3 $reading.weekly.percent 'weekly percent'
    Assert-True ([DateTimeOffset]::Parse($reading.fiveHour.resetsAt, $Invariant) -eq $epoch.AddSeconds(1792926600)) 'five-hour reset instant'
    Assert-True ([DateTimeOffset]::Parse($reading.weekly.resetsAt, $Invariant) -eq $epoch.AddSeconds(1793426400)) 'weekly reset instant'
    Assert-True ([DateTimeOffset]::Parse($reading.checkedAt, $Invariant) -eq $t0) 'checked at'
}

Test-Case 'probe: a missing window is null, a 0 is 0 percent, no event is no reading' {
    $reading = ConvertFrom-ProbeOutput @('{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0,"resetsAt":1792926600}}}}') $t0
    Assert-Equal 0 $reading.fiveHour.percent 'zero percent'
    Assert-True ($null -eq $reading.weekly) 'missing weekly window is null'
    Assert-True ($null -eq (ConvertFrom-ProbeOutput @('{"type":"result","text":"\"type\":\"rate_limit_event\""}') $t0)) 'quoted event text is not an event'
    Assert-True ($null -eq (ConvertFrom-ProbeOutput @() $t0)) 'no output, no reading'
}

Test-Case 'probe: the JSON line has the contract shape and invariant numbers' {
    $reading = ConvertFrom-ProbeOutput @('{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.955,"resetsAt":1792926600}}}}') $t0
    $json = ConvertTo-ReadingJson $reading
    Assert-True ($json -cmatch '^\{"checkedAt":"[^"]+","fiveHour":\{"percent":95\.5,"resetsAt":"[^"]+"\},"weekly":null\}$') "shape of $json"
}

Test-Case 'probe: writes the reading atomically and leaves no temp file' {
    $folder = Join-Path $WorkRoot 'state-atomic'
    $target = Join-Path $folder 'usage-limits.json'
    Write-FileAtomically $target 'first'
    Write-FileAtomically $target 'second'
    Assert-Equal 'second' ([IO.File]::ReadAllText($target)) 'content after overwrite'
    Assert-Equal 1 @(Get-ChildItem -LiteralPath $folder).Count 'files in the state folder'
}

Test-Case 'probe: the child environment cannot bind to the calling session' {
    $info = [Diagnostics.ProcessStartInfo]::new('cmd.exe')
    $info.Environment['CLAUDE_CODE_SESSION_ID'] = 'abc'
    $info.Environment['CLAUDE_CODE_MESSAGING_SOCKET'] = 'pipe'
    $info.Environment['CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH'] = '3'
    Set-ProbeEnvironment $info @('CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_MESSAGING_SOCKET')
    Assert-True (-not $info.Environment.ContainsKey('CLAUDE_CODE_SESSION_ID')) 'session id removed'
    Assert-True (-not $info.Environment.ContainsKey('CLAUDE_CODE_MESSAGING_SOCKET')) 'socket removed'
    Assert-Equal '3' $info.Environment['CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH'] 'unrelated setting kept'
    Assert-Equal '1' $info.Environment['CLAUDE_CODE_DISABLE_CLAUDE_MDS'] 'CLAUDE.md files off'
}

Test-Case 'probe: arguments follow the measured command with the effort, with or without session persistence' {
    $with = Get-ProbeArguments 'haiku' 'low' $true
    Assert-Equal '-p|Reply with OK.|--model|haiku|--effort|low|--output-format|stream-json|--verbose|--max-turns|1|--strict-mcp-config|--tools||--no-session-persistence' ($with -join '|') 'with the flag'
    Assert-True (-not ((Get-ProbeArguments 'haiku' 'low' $false) -ccontains '--no-session-persistence')) 'without the flag'
}

Test-Case 'probe: the fallback deletes only the probe transcript written after the start' {
    $projects = Join-Path $WorkRoot 'probe-projects'
    $working = 'C:\Users\demo\AppData\Local\Temp\claude-usage-probe'
    $folder = Join-Path $projects 'C--Users-demo-AppData-Local-Temp-claude-usage-probe'
    $decoy = Join-Path $projects 'C--Users-demo-AppData-Local-Temp-claude-usage-probe-old'
    New-Item -ItemType Directory -Force $folder, $decoy | Out-Null
    $old = Join-Path $folder 'old.jsonl'; Write-Lines $old @('{}'); (Get-Item $old).LastWriteTime = (Get-Date).AddHours(-1)
    $since = Get-Date
    $new = Join-Path $folder 'new.jsonl'; Write-Lines $new @('{}')
    $decoyFile = Join-Path $decoy 'newer.jsonl'; Write-Lines $decoyFile @('{}')
    Assert-Equal 'C--Users-demo-AppData-Local-Temp-claude-usage-probe' (Get-ProjectFolderName $working) 'folder name'
    $removed = Remove-ProbeTranscript $projects $working $since.AddSeconds(-1)
    Assert-Equal $new $removed 'removed file'
    Assert-True ((Test-Path $old) -and (Test-Path $decoyFile) -and -not (Test-Path $new)) 'only the new probe transcript is gone'
    Assert-True ($null -eq (Remove-ProbeTranscript $projects $working (Get-Date).AddMinutes(1))) 'nothing newer, nothing removed'
}

Test-Case 'probe: a missing settings key is an error naming the key' {
    foreach ($key in 'usageLimits.probeModel', 'usageLimits.probeEffort', 'usageLimits.stateFreshMinutes', 'usageLimits.probeTimeoutSeconds',
        'usageLimits.probeWorkingFolder') {
        $config = New-TestConfig @{ $key = $null }
        $run = Invoke-Script $Probe @('-ConfigPath', $config, '-StatePath', (Join-Path $WorkRoot 'never.json'), '-ClaudePath', 'C:\nowhere\claude.exe')
        Assert-Equal 1 $run.ExitCode "exit code ($key)"
        Assert-True (($run.Lines -join ' ') -cmatch "no key '$([regex]::Escape($key))'") "reason names the key: $($run.Lines)"
        Assert-True (-not (Test-Path (Join-Path $WorkRoot 'never.json'))) "nothing written ($key)"
    }
}

Test-Case 'probe: a fresh reading is younger than the fresh age; 0 never serves one, not even from the future' {
    $path = Join-Path $WorkRoot "fresh-$([guid]::NewGuid().ToString('N').Substring(0, 6)).json"
    $write = { param($at) [IO.File]::WriteAllText($path, '{"checkedAt":"' + $at.ToString('o', $Invariant) + '","fiveHour":null,"weekly":null}') }
    & $write $t0.AddMinutes(-14)
    Assert-True ($null -ne (Get-FreshReadingText $path 15 $t0)) '14 minutes old, fresh for 15'
    Assert-True ($null -eq (Get-FreshReadingText $path 14 $t0)) '14 minutes old, fresh for 14: stale'
    & $write $t0.AddMinutes(5)
    Assert-True ($null -eq (Get-FreshReadingText $path 0 $t0)) 'a reading from the future, fresh age 0'
    [IO.File]::WriteAllText($path, 'not json')
    Assert-True ($null -eq (Get-FreshReadingText $path 15 $t0)) 'unreadable'
    Assert-True ($null -eq (Get-FreshReadingText (Join-Path $WorkRoot 'none.json') 15 $t0)) 'missing'
}

# A stand-in for claude.exe: a batch file that lists the flag on --help and otherwise prints a recorded stream with
# one rate_limit_event, or, with $event empty, a stream without one and exit code 1. With $argumentsLog it also writes
# the arguments of the probe call (not of the --help call) to that file.
function New-FakeClaude([string]$event, [string]$argumentsLog = '') {
    $path = Join-Path $WorkRoot "fake-claude-$([guid]::NewGuid().ToString('N').Substring(0, 6)).cmd"
    $body = @('@echo off', 'if "%1"=="--help" (', '  echo   --no-session-persistence   Disable session persistence', '  exit /b 0', ')')
    if ($argumentsLog) { $body += ">`"$argumentsLog`" echo %*" }
    $body += 'echo {"type":"system","subtype":"init","model":"claude-haiku-5-5"}'
    $body += if ($event) { "echo $event" } else { @('echo {"type":"result","subtype":"error"}', 'exit /b 1') }
    [IO.File]::WriteAllText($path, ($body -join "`r`n") + "`r`n", [Text.Encoding]::ASCII)
    return $path
}

Test-Case 'probe run: prints the reading and writes the same line to the state file' {
    $claude = New-FakeClaude '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.955,"resetsAt":1792926600},"seven_day":{"utilization":0.47,"resetsAt":1793426400}}}}'
    $state = Join-Path $WorkRoot 'probe-state\usage-limits.json'
    $run = Invoke-Script $Probe @('-ConfigPath', $RealConfig, '-StatePath', $state, '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    Assert-Equal 1 $run.Lines.Count 'one line'
    Assert-Equal $run.Lines[0] ([IO.File]::ReadAllText($state)) 'printed line = written file'
    Assert-True ($run.Lines[0] -cmatch '"fiveHour":\{"percent":95\.5,.*"weekly":\{"percent":47(\.0)?,') "values: $($run.Lines[0])"
}

Test-Case 'probe run: passes the configured model and effort to claude' {
    $log = Join-Path $WorkRoot "probe-arguments-$([guid]::NewGuid().ToString('N').Substring(0, 6)).txt"
    $claude = New-FakeClaude '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.2,"resetsAt":1792926600}}}}' $log
    $config = New-TestConfig @{ 'usageLimits.probeModel' = 'sonnet'; 'usageLimits.probeEffort' = 'medium' }
    $run = Invoke-Script $Probe @('-ConfigPath', $config, '-StatePath', (Join-Path $WorkRoot 'probe-state-arguments\usage-limits.json'), '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    $passed = [IO.File]::ReadAllText($log)
    Assert-True ($passed -cmatch '--model sonnet --effort medium --output-format') "arguments claude got: $passed"
}

Test-Case 'probe run: a reading that cannot be written is a failure, not a silent success' {
    $claude = New-FakeClaude '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.2,"resetsAt":1792926600}}}}'
    $blocker = Join-Path $WorkRoot 'a-file'; Write-Lines $blocker @('not a folder')
    $run = Invoke-Script $Probe @('-ConfigPath', $RealConfig, '-StatePath', (Join-Path $blocker 'usage-limits.json'), '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
    Assert-Equal 1 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True ($run.Lines[-1] -cmatch '^USAGE PROBE FAILED \| the reading could not be written') "reason: $($run.Lines)"
}

Test-Case 'probe run: no rate_limit_event is exit 1 with a reason' {
    $run = Invoke-Script $Probe @('-ConfigPath', $RealConfig, '-StatePath', (Join-Path $WorkRoot 'never.json'), '-ClaudePath', (New-FakeClaude ''), '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
    Assert-Equal 1 $run.ExitCode 'exit code'
    Assert-True ($run.Lines[-1] -cmatch '^USAGE PROBE FAILED \| claude exited with 1 and gave no rate_limit_event') "reason: $($run.Lines)"
    Assert-True (-not (Test-Path (Join-Path $WorkRoot 'never.json'))) 'nothing written'
}

Test-Case 'probe: a claude that cannot start is exit 1 with a reason, nothing written' {
    $run = Invoke-Script $Probe @('-ConfigPath', $RealConfig, '-StatePath', (Join-Path $WorkRoot 'never.json'), '-ClaudePath', 'C:\nowhere\claude.exe')
    Assert-Equal 1 $run.ExitCode 'exit code'
    Assert-True (($run.Lines -join ' ') -cmatch '^USAGE PROBE FAILED \|') "reason line: $($run.Lines)"
    Assert-True (-not (Test-Path (Join-Path $WorkRoot 'never.json'))) 'nothing written'
}

Test-Case 'probe run: a reading younger than stateFreshMinutes is printed as it is and claude is not called; -FreshMinutes 0 calls' {
    $state = Join-Path $WorkRoot "probe-fresh-$([guid]::NewGuid().ToString('N').Substring(0, 6))\usage-limits.json"
    New-Item -ItemType Directory -Force (Split-Path -Parent $state) | Out-Null
    $fresh = '{"checkedAt":"' + [DateTimeOffset]::Now.AddMinutes(-14).ToString("yyyy-MM-dd'T'HH:mm:sszzz", $Invariant) + '","fiveHour":{"percent":12,"resetsAt":"2026-10-25T15:00:00+01:00"},"weekly":null}'
    [IO.File]::WriteAllText($state, $fresh, [Text.UTF8Encoding]::new($false))
    $log = Join-Path $WorkRoot "probe-fresh-arguments-$([guid]::NewGuid().ToString('N').Substring(0, 6)).txt"
    $claude = New-FakeClaude '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.3,"resetsAt":1792926600}}}}' $log
    $config = New-TestConfig @{ 'usageLimits.stateFreshMinutes' = 15 }
    $common = @('-ConfigPath', $config, '-StatePath', $state, '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
    $run = Invoke-Script $Probe $common
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    Assert-Equal $fresh ($run.Lines -join '') 'the stored reading is printed'
    Assert-True (-not (Test-Path $log)) 'claude was not called'
    $forced = Invoke-Script $Probe ($common + @('-FreshMinutes', '0'))
    Assert-Equal 0 $forced.ExitCode "forced exit code ($($forced.Lines))"
    Assert-True (Test-Path $log) 'claude was called'
    Assert-True ([IO.File]::ReadAllText($state) -cmatch '"percent":30') "a new reading was written: $([IO.File]::ReadAllText($state))"
}

Test-Case 'probe run: the state file and the working folder come from the settings, with %NAME% expanded' {
    $probeHome = Join-Path $WorkRoot "probe-home-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    $env:LIMIT_TESTS_HOME = $probeHome
    try {
        $config = New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_HOME%\state\usage-limits.json'; 'usageLimits.probeWorkingFolder' = '%LIMIT_TESTS_HOME%\probe-cwd' }
        $claude = New-FakeClaude '{"type":"rate_limit_event","rate_limit_info":{"unifiedWindows":{"five_hour":{"utilization":0.2,"resetsAt":1792926600}}}}'
        $run = Invoke-Script $Probe @('-ConfigPath', $config, '-ClaudePath', $claude)
        Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
        Assert-Equal $run.Lines[0] ([IO.File]::ReadAllText((Join-Path $probeHome 'state\usage-limits.json'))) 'written to the expanded state file'
        Assert-True (Test-Path -LiteralPath (Join-Path $probeHome 'probe-cwd') -PathType Container) 'the expanded working folder was made'
        $unset = New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_NOT_SET_9F2%\usage-limits.json' }
        $bad = Invoke-Script $Probe @('-ConfigPath', $unset, '-ClaudePath', $claude, '-WorkingFolder', (Join-Path $WorkRoot 'probe-cwd'))
        Assert-Equal 1 $bad.ExitCode 'an unset variable fails'
        Assert-True (($bad.Lines -join ' ') -cmatch "^USAGE PROBE FAILED \| .*usageLimits\.stateFile.*%LIMIT_TESTS_NOT_SET_9F2%") "names the key and the variable: $($bad.Lines)"
    }
    finally { Remove-Item Env:\LIMIT_TESTS_HOME -ErrorAction SilentlyContinue }
}

# --- watch-usage-and-context.ps1: unit cases ---------------------------------------------------------------------

"watch-usage-and-context.ps1 (functions)"
Import-ScriptFunctions $Watch

Test-Case 'watch: cache state takes the newest reply with usage and 1h only from the last 20' {
    $id = New-AgentId
    $lines = @(New-ReplyLine $t0.AddMinutes(-40) $id -write1h 900) + @(New-ReplyRun $t0.AddMinutes(-2) 20 $id '5m') +
        @(New-ApiErrorLine $t0.AddMinutes(-1) 'rate_limit' 'You have hit your limit')
    $state = Get-CacheState (Get-AgentReplies $lines) 5 60 20
    Assert-True ($state.LastRequest -eq $t0.AddMinutes(-2)) "last request $($state.LastRequest)"
    Assert-Equal 5 $state.TtlMinutes 'a 1h write 21 replies back does not count'
    Assert-True ($state.ExpiresAt -eq $t0.AddMinutes(3)) 'expiry'
    $lines2 = @(New-ReplyLine $t0.AddMinutes(-21) $id -write1h 900) + @(New-ReplyRun $t0.AddMinutes(-2) 19 $id '5m')
    Assert-Equal 60 (Get-CacheState (Get-AgentReplies $lines2) 5 60 20).TtlMinutes 'a 1h write 20 replies back counts'
    Assert-True ($null -eq (Get-CacheState (Get-AgentReplies @(New-UserLine $t0)) 5 60 20)) 'no reply, no state'
}

Test-Case 'watch: session agents leave out ignored types and workflow agents, and keep agents without meta' {
    $dev = New-AgentId; $searcher = New-AgentId; $flow = New-AgentId; $bare = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $t0.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $t0.AddMinutes(-2) 3 $dev '5m') },
        @{ Id = $searcher; Type = 'code-searcher'; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $searcher '5m') },
        @{ Id = $flow; Type = 'general-purpose'; Workflow = $true; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $flow '5m') },
        @{ Id = $bare; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $bare '5m') })
    $agents = @(Get-SessionAgents $fixture.Transcript $fixture.SessionId @('code-searcher', 'Explore') 4MB 5 60 20)
    Assert-Equal 'main|software-developer|unknown' (($agents | ForEach-Object Type | Sort-Object) -join '|') 'types counted'
    $main = $agents | Where-Object Type -eq 'main'
    Assert-Equal $fixture.SessionId $main.Id 'main id'
    Assert-Equal 60 $main.TtlMinutes 'main TTL'
    Assert-Equal 5 ($agents | Where-Object Type -eq 'software-developer').TtlMinutes 'worker TTL'
}

Test-Case 'watch: session agents leave out an agent whose meta says finished: true, and only that' {
    $done = New-AgentId; $open = New-AgentId; $plain = New-AgentId; $text = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $t0.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $done; Type = 'software-developer'; Finished = $true; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $done '5m') },
        @{ Id = $open; Type = 'task-lead'; Finished = $false; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $open '5m') },
        @{ Id = $plain; Type = 'navigator-builder'; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $plain '5m') },
        @{ Id = $text; Type = 'xpp-porter'; Finished = 'true'; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $text '5m') })
    $agents = @(Get-SessionAgents $fixture.Transcript $fixture.SessionId @('code-searcher') 4MB 5 60 20)
    Assert-Equal 'main|navigator-builder|task-lead|xpp-porter' (($agents | ForEach-Object Type | Sort-Object) -join '|') 'the finished worker is left out; false, no field and the text "true" count'
    Assert-True (Test-AgentFinished (Join-Path $fixture.Subagents "agent-$done.meta.json")) 'finished: true'
    Assert-True (-not (Test-AgentFinished (Join-Path $fixture.Subagents "agent-$open.meta.json"))) 'finished: false'
    Assert-True (-not (Test-AgentFinished (Join-Path $fixture.Subagents "agent-$plain.meta.json"))) 'no field'
    Assert-True (-not (Test-AgentFinished (Join-Path $fixture.Subagents 'agent-nobody.meta.json'))) 'no meta file'
}

Test-Case 'watch: a finished warm worker does not turn resume into hand over; the same worker unfinished does' {
    $dev = New-AgentId
    $make = { param($finished) New-FixtureSession @(New-ReplyRun $t0.AddMinutes(-1) 3 '' '1h') @(
            @{ Id = $dev; Type = 'software-developer'; Finished = $finished; Lines = @(New-ReplyRun $t0.AddMinutes(-1) 3 $dev '5m') }) }
    $ended = & $make $true
    $decision = Get-LimitDecision @(Get-SessionAgents $ended.Transcript $ended.SessionId @() 4MB 5 60 20) $t0.AddMinutes(2) 3 $t0 $null
    Assert-Equal 'resume' $decision.Decision 'finished worker left out'
    Assert-Equal 'main' (($decision.Counted | ForEach-Object Type) -join '|') 'only main counted'
    $running = & $make $false
    $cold = Get-LimitDecision @(Get-SessionAgents $running.Transcript $running.SessionId @() 4MB 5 60 20) $t0.AddMinutes(2) 3 $t0 $null
    Assert-Equal 'hand-over' $cold.Decision 'the unfinished worker goes cold before reset plus margin'
}

Test-Case 'watch: tripped window - below, one, missing, both takes the later reset' {
    $limits = @{ fiveHourStopPercent = 95; weeklyStopPercent = 98 }
    $reading = { param($f, $w) [pscustomobject]@{ CheckedAt = $t0; FiveHour = $f; Weekly = $w } }
    $five = [pscustomobject]@{ Percent = 95; ResetsAt = $t0.AddMinutes(30) }
    $week = [pscustomobject]@{ Percent = 98.5; ResetsAt = $t0.AddDays(2) }
    Assert-True ($null -eq (Get-TrippedWindow (& $reading ([pscustomobject]@{ Percent = 94.9; ResetsAt = $t0.AddHours(1) }) $null) $limits $t0)) 'below'
    Assert-True ($null -eq (Get-TrippedWindow $null $limits $t0)) 'no reading'
    Assert-Equal 'five-hour' (Get-TrippedWindow (& $reading $five ([pscustomobject]@{ Percent = 97.9; ResetsAt = $t0.AddDays(1) })) $limits $t0).Name 'five-hour only'
    $both = Get-TrippedWindow (& $reading $five $week) $limits $t0
    Assert-Equal 'weekly' $both.Name 'both: the later reset'
    Assert-True ($both.ResetsAt -eq $t0.AddDays(2)) 'both: its reset'
    Assert-Equal 'weekly' (Get-TrippedWindow (& $reading $five $week) $limits $t0.AddMinutes(31)).Name 'five-hour reset passed: only weekly'
    Assert-True ($null -eq (Get-TrippedWindow (& $reading $five $null) $limits $t0.AddMinutes(30))) 'a reset that has passed is a stale reading'
}

Test-Case 'watch: probe interval - far, near, failed attempt, no reading' {
    $limits = @{ fiveHourStopPercent = 95; weeklyStopPercent = 98; stateFreshMinutes = 15; probeNearEveryMinutes = 3; probeNearWithinPercent = 10 }
    $far =[pscustomobject]@{ CheckedAt = $t0; FiveHour = [pscustomobject]@{ Percent = 84.9; ResetsAt = $t0 }; Weekly = $null }
    $near = [pscustomobject]@{ CheckedAt = $t0; FiveHour = [pscustomobject]@{ Percent = 85; ResetsAt = $t0 }; Weekly = $null }
    Assert-True (-not (Test-ProbeDue $far $null $t0.AddMinutes(14) $limits)) 'far, 14 minutes'
    Assert-True (Test-ProbeDue $far $null $t0.AddMinutes(15) $limits) 'far, 15 minutes'
    Assert-True (Test-ProbeDue $near $null $t0.AddMinutes(3) $limits) 'near, 3 minutes'
    Assert-True (-not (Test-ProbeDue $near $null $t0.AddMinutes(2) $limits)) 'near, 2 minutes'
    Assert-True (Test-ProbeDue $null $null $t0 $limits) 'no reading yet'
    Assert-True (-not (Test-ProbeDue $null $t0.AddMinutes(-5) $t0 $limits)) 'a failed attempt 5 minutes ago waits'
}

Test-Case 'watch: no probe while nothing was written since the last reading, near a threshold or far from it' {
    $limits = @{ fiveHourStopPercent = 95; weeklyStopPercent = 98; probeNearEveryMinutes = 3; probeNearWithinPercent = 10; stateFreshMinutes = 15 }
    $far = [pscustomobject]@{ CheckedAt = $t0; FiveHour = [pscustomobject]@{ Percent = 50; ResetsAt = $t0.AddHours(3) }; Weekly = $null }
    $nearWeekly = [pscustomobject]@{ CheckedAt = $t0; FiveHour = $null; Weekly = [pscustomobject]@{ Percent = 97; ResetsAt = $t0.AddDays(4) } }
    Assert-True (-not (Test-ProbeDue $far $null $t0.AddMinutes(20) $limits $t0.AddMinutes(-1))) 'far, idle since before the reading'
    Assert-True (-not (Test-ProbeDue $far $null $t0.AddMinutes(20) $limits $t0)) 'far, last write at the very time of the reading'
    Assert-True (Test-ProbeDue $far $null $t0.AddMinutes(20) $limits $t0.AddMinutes(5)) 'far, written since the reading'
    Assert-True (-not (Test-ProbeDue $nearWeekly $null $t0.AddDays(2) $limits $t0.AddMinutes(-30))) 'weekly at 97% and idle for two days: no probe'
    Assert-True (Test-ProbeDue $nearWeekly $null $t0.AddMinutes(3) $limits $t0.AddMinutes(1)) 'near and spending: every 3 minutes'
    Assert-True (-not (Test-ProbeDue $null $t0.AddMinutes(-20) $t0 $limits $t0.AddMinutes(-25))) 'no reading, idle since the failed attempt'
    Assert-True (Test-ProbeDue $null $t0.AddMinutes(-20) $t0 $limits $t0.AddMinutes(-10)) 'no reading, written since the failed attempt'
    Assert-True (Test-ProbeDue $null $null $t0 $limits $t0.AddDays(-9)) 'no reading and no attempt yet: probe once'
}

Test-Case 'watch: the probe may serve a reading up to stateFreshMinutes old, near a threshold only up to the near interval' {
    $limits = @{ fiveHourStopPercent = 95; weeklyStopPercent = 98; probeNearEveryMinutes = 3; probeNearWithinPercent = 10; stateFreshMinutes = 12 }
    $far = [pscustomobject]@{ CheckedAt = $t0; FiveHour = [pscustomobject]@{ Percent = 50; ResetsAt = $t0.AddHours(3) }; Weekly = $null }
    $near = [pscustomobject]@{ CheckedAt = $t0; FiveHour = [pscustomobject]@{ Percent = 90; ResetsAt = $t0.AddHours(3) }; Weekly = $null }
    Assert-Equal 12 (Get-ProbeFreshMinutes $far $limits) 'far'
    Assert-Equal 3 (Get-ProbeFreshMinutes $near $limits) 'near'
    Assert-Equal 12 (Get-ProbeFreshMinutes $null $limits) 'no reading'
    $limits.stateFreshMinutes = 2
    Assert-Equal 2 (Get-ProbeFreshMinutes $near $limits) 'near, with a fresh age below the near interval'
}

Test-Case 'watch: last activity is the newest write of the session or any of its agents, workflow agents included' {
    $dev = New-AgentId; $flow = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyLine $t0 '') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyLine $t0 $dev) },
        @{ Id = $flow; Type = 'general-purpose'; Workflow = $true; Lines = @(New-ReplyLine $t0 $flow) })
    $flowFile = Join-Path $fixture.Subagents "workflows\wf_1234abcd-567\agent-$flow.jsonl"
    (Get-Item -LiteralPath $fixture.Transcript).LastWriteTimeUtc = $t0.AddMinutes(-60).UtcDateTime
    (Get-Item -LiteralPath (Join-Path $fixture.Subagents "agent-$dev.jsonl")).LastWriteTimeUtc = $t0.AddMinutes(-30).UtcDateTime
    (Get-Item -LiteralPath $flowFile).LastWriteTimeUtc = $t0.AddMinutes(-5).UtcDateTime
    Get-ChildItem -LiteralPath $fixture.Subagents -Recurse -Filter '*.meta.json' | ForEach-Object { $_.LastWriteTimeUtc = $t0.AddMinutes(-90).UtcDateTime }
    Assert-True ((Get-LastActivity $fixture.Transcript $fixture.SessionId) -eq $t0.AddMinutes(-5)) 'the workflow agent wrote last'
    (Get-Item -LiteralPath $flowFile).LastWriteTimeUtc = $t0.AddMinutes(-70).UtcDateTime
    Assert-True ((Get-LastActivity $fixture.Transcript $fixture.SessionId) -eq $t0.AddMinutes(-30)) 'then the worker'
}

Test-Case 'watch: settings come from the config unless passed as a parameter' {
    $config = Read-OrchestrationConfig (New-TestConfig @{ 'usageAndContextWatch.everySeconds' = 7; 'contextCaps.main.warn' = 123000; 'usageLimits.stateFile' = '%WINDIR%\x\usage.json'; 'usageAndContextWatch.resetMarginMinutes' = 3; 'usageAndContextWatch.retryMinutes' = 4 })
    $settings = Get-WatchSettings $config 'test.json' @{ RetryMinutes = 2; WakeOnErrors = @('server_error') }
    Assert-Equal 7 $settings.EverySeconds 'from the config'
    Assert-Equal 123000 $settings.WarnTokens 'the warning size is contextCaps.main.warn'
    Assert-Equal 2 $settings.RetryMinutes 'passed'
    Assert-Equal 4 (Get-WatchSettings $config 'test.json' @{}).RetryMinutes 'the retry wait from the config'
    Assert-Equal 'server_error' ($settings.WakeOnErrors -join '|') 'a passed list'
    Assert-Equal 'rate_limit|server_error' ((Get-WatchSettings $config 'test.json' @{}).WakeOnErrors -join '|') 'the list from the config'
    Assert-Equal (Join-Path $env:WINDIR 'x\usage.json') $settings.UsageStatePath 'the state file, expanded'
    Assert-Equal 4 $settings.TailMegabytes 'tail'
    Assert-Equal 3 $settings.ResetMarginMinutes 'the reset margin from the config'
    Assert-Equal 20 $settings.CacheLookbackReplies 'lookback'
    $missing = Read-OrchestrationConfig (New-TestConfig @{ 'usageAndContextWatch.tailMegabytes' = $null })
    Assert-Throws { Get-WatchSettings $missing 'test.json' @{} } "no key 'usageAndContextWatch\.tailMegabytes'" 'missing key'
    Assert-True ($null -ne (Get-WatchSettings $missing 'test.json' @{ TailMegabytes = 1 })) 'a passed value needs no key'
}

Test-Case 'config: a wake after a reset and every relaunch wait one minute, a wake after a server error ten, each with its why (the user, 2026-10-25, D-0006)' {
    $shipped = Read-OrchestrationConfig $RealConfig
    foreach ($case in @(@{ Key = 'usageAndContextWatch.resetMarginMinutes'; Minutes = 1; Says = '\bone minute\b' },
            @{ Key = 'usageLimits.relaunchMarginMinutes'; Minutes = 1; Says = '\bone minute\b' },
            @{ Key = 'relaunch.afterCapMinutes'; Minutes = 1; Says = '\bone minute\b' },
            @{ Key = 'usageAndContextWatch.retryMinutes'; Minutes = 10; Says = '\bten minutes\b' })) {
        $key = $case.Key
        Assert-Equal $case.Minutes (Get-ConfigValue $shipped $key 'shipped') $key
        $section, $name = $key.Split('.')
        $why = $shipped[$section]["_why$($name.Substring(0, 1).ToUpperInvariant())$($name.Substring(1))"]
        Assert-True ($why -is [string] -and $why -cmatch $case.Says -and $why -cnotmatch 'every automatic wake-up') "$key has a _why that says $($case.Says) and no longer 'every automatic wake-up': $why"
    }
}

Test-Case 'watch: a settings path naming a variable that is not set is an error naming the key and the variable' {
    Remove-Item Env:\LIMIT_TESTS_NOT_SET -ErrorAction SilentlyContinue
    Assert-Throws { Expand-ConfigPath '%LIMIT_TESTS_NOT_SET%\usage.json' 'usageLimits.stateFile' 'test.json' } "test\.json key 'usageLimits\.stateFile' names %LIMIT_TESTS_NOT_SET%, which is not set\." 'an unset variable'
    $config = Read-OrchestrationConfig (New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_NOT_SET%\usage.json' })
    Assert-Throws { Get-WatchSettings $config 'test.json' @{} } 'names %LIMIT_TESTS_NOT_SET%, which is not set' 'through the watch settings'
}

Test-Case 'watch: the probe is run with the settings file, the state file and the fresh age' {
    $log = Join-Path $WorkRoot "probe-call-$([guid]::NewGuid().ToString('N').Substring(0, 6)).txt"
    $fake = Join-Path $WorkRoot "fake-probe-$([guid]::NewGuid().ToString('N').Substring(0, 6)).ps1"
    Set-Content -LiteralPath $fake -Value "param(`$ConfigPath, `$StatePath, `$FreshMinutes) Set-Content -LiteralPath '$log' -Value `"`$ConfigPath|`$StatePath|`$FreshMinutes`"; exit 0"
    Invoke-UsageProbe $fake 'C:\x\config.json' 'C:\x\state.json' 7
    Assert-Equal 'C:\x\config.json|C:\x\state.json|7' (Get-Content -LiteralPath $log -Raw).Trim() 'what the probe got'
}

# Agents for the decision cases: main warm for an hour, a worker warm for 4.5 minutes, a lead cold since 08:40.
function New-DecisionAgents {
    return @(
        [pscustomobject]@{ Type = 'main'; Id = '7b3870e5-e7c1'; LastRequest = $t0; TtlMinutes = 60; ExpiresAt = $t0.AddMinutes(60) },
        [pscustomobject]@{ Type = 'software-developer'; Id = 'a8912d1aa31f121f1'; LastRequest = $t0.AddSeconds(-30); TtlMinutes = 5; ExpiresAt = $t0.AddSeconds(270) },
        [pscustomobject]@{ Type = 'task-lead'; Id = 'a61817d3dcf8f84bd'; LastRequest = $t0.AddMinutes(-20); TtlMinutes = 5; ExpiresAt = $t0.AddMinutes(-15) })
}

Test-Case 'watch: decision resume when every warm agent outlives reset plus margin' {
    $decision = Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(1) 3 $t0 $null
    Assert-Equal 'resume' $decision.Decision 'decision'
    Assert-Equal 'main|software-developer' (($decision.Counted | ForEach-Object Type) -join '|') 'the cold lead is left out'
    Assert-Equal 0 @($decision.GoingCold).Count 'nobody going cold'
    $expiringNow = @(New-DecisionAgents) + @([pscustomobject]@{ Type = 'task-lead'; Id = 'a0ed634aaab456843'; LastRequest = $t0.AddMinutes(-5); TtlMinutes = 5; ExpiresAt = $t0 })
    $edge = Get-LimitDecision $expiringNow $t0.AddMinutes(1) 3 $t0 $null
    Assert-Equal 'resume' $edge.Decision 'a cache that expires right now is cold, so it is left out'
    Assert-Equal 2 @($edge.Counted).Count 'counted at the edge'
}

Test-Case 'watch: decision hand over names only the agent that goes cold first' {
    $decision = Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(2) 3 $t0 $null
    Assert-Equal 'hand-over' $decision.Decision 'decision'
    Assert-Equal 'software-developer' (($decision.GoingCold | ForEach-Object Type) -join '|') 'going cold'
    $marker = Format-HandOverMarker ([pscustomobject]@{ Name = 'five-hour'; Percent = 95.5; ResetsAt = $t0.AddMinutes(2) }) $decision $t0
    $expected = "LIMIT NEAR | HAND OVER | five-hour at 95.5% resets $($t0.AddMinutes(2).ToLocalTime().ToString('HH:mm')) | going cold: software-developer a8912d1a at $($t0.AddSeconds(270).ToLocalTime().ToString('HH:mm'))"
    Assert-Equal $expected $marker 'marker line'
}

Test-Case 'watch: an expiry exactly at reset plus margin counts as going cold' {
    $agents = @([pscustomobject]@{ Type = 'main'; Id = 'm'; LastRequest = $t0; TtlMinutes = 60; ExpiresAt = $t0.AddMinutes(13) })
    Assert-Equal 'hand-over' (Get-LimitDecision $agents $t0.AddMinutes(10) 3 $t0 $null).Decision 'equal is cold'
    Assert-Equal 'resume' (Get-LimitDecision $agents $t0.AddMinutes(10).AddSeconds(-1) 3 $t0 $null).Decision 'one second more is warm'
}

Test-Case 'watch: flips resume to hand over when a cold agent works again, and never back' {
    $agents = New-DecisionAgents
    Assert-Equal 'resume' (Get-LimitDecision $agents $t0.AddMinutes(1) 3 $t0 $null).Decision 'first: resume'
    $agents[2] = [pscustomobject]@{ Type = 'task-lead'; Id = 'a61817d3dcf8f84bd'; LastRequest = $t0.AddSeconds(50); TtlMinutes = 5; ExpiresAt = $t0.AddSeconds(350) }
    $agents[1] = [pscustomobject]@{ Type = 'software-developer'; Id = 'a8912d1aa31f121f1'; LastRequest = $t0.AddSeconds(55); TtlMinutes = 5; ExpiresAt = $t0.AddSeconds(355) }
    $second = Get-LimitDecision $agents $t0.AddMinutes(3) 3 $t0.AddMinutes(1) $null
    Assert-Equal 'hand-over' $second.Decision 'second: hand over'
    $record = [pscustomobject]@{ Decision = 'hand-over'; ResetsAt = $t0.AddMinutes(3); TakenAt = $t0.AddMinutes(1) }
    $third = Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(1) 3 $t0.AddMinutes(2) $record
    Assert-Equal 'hand-over' $third.Decision 'third: the record holds'
    $stale = [pscustomobject]@{ Decision = 'hand-over'; ResetsAt = $t0.AddMinutes(-1); TakenAt = $t0.AddMinutes(-90) }
    Assert-Equal 'resume' (Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(1) 3 $t0 $stale).Decision 'a record of a past reset is stale'
}

Test-Case 'watch: decision record round trip' {
    $path = Join-Path $WorkRoot 'decision-roundtrip.json'
    $decision = Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(2) 3 $t0 $null
    Write-DecisionRecord $path $decision ([pscustomobject]@{ Name = 'weekly'; Percent = 98; ResetsAt = $t0.AddMinutes(2) }) $t0
    $back = Read-DecisionRecord $path
    Assert-Equal 'hand-over' $back.Decision 'decision'
    Assert-True ($back.ResetsAt -eq $t0.AddMinutes(2)) 'reset'
    $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
    Assert-Equal 2 $raw.agents.Count 'per-agent expiries of the counted agents'
    Assert-True ($null -eq (Read-DecisionRecord (Join-Path $WorkRoot 'absent.json'))) 'no file, no record'
}

Test-Case 'watch: the cap record is a hand-over with no window reset, read back as one, and no usage hand-over' {
    $path = Join-Path $WorkRoot 'decision-cap.json'
    Write-CapRecord $path $t0
    $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
    Assert-Equal 'context-cap' $raw.window 'window'
    Assert-True ($raw.ContainsKey('resetsAt') -and $null -eq $raw.resetsAt) "no reset: $($raw | ConvertTo-Json -Compress)"
    Assert-Equal 0 @($raw.agents).Count 'no agents counted'
    $back = Read-DecisionRecord $path
    Assert-Equal 'hand-over' $back.Decision 'read back as a hand-over'
    Assert-True ($null -eq $back.ResetsAt) 'with no reset'
    Assert-True ($back.TakenAt -eq $t0) 'taken at'
    Assert-Equal 'resume' (Get-LimitDecision @() $t0.AddMinutes(30) 3 $t0 $back).Decision 'it is no usage hand-over on record'
    $stop = [pscustomobject]@{ Kind = 'rate_limit'; Text = 'limit reached'; At = $t0 }
    Assert-True ((Get-WakeTime $stop @('rate_limit') 1 10 $back) -eq $t0.AddMinutes(10)) 'a stop with no readable reset waits the retry time'
}

# Each key of $expected as JSON equals the same key of $actual as JSON, and $actual has no other key but $extra.
function Assert-SameRecord([hashtable]$expected, [hashtable]$actual, [string]$extra, [string]$what) {
    foreach ($key in $expected.Keys) {
        Assert-Equal (ConvertTo-Json -InputObject $expected[$key] -Depth 5 -Compress) (ConvertTo-Json -InputObject $actual[$key] -Depth 5 -Compress) "${what}: $key"
    }
    $others = @($actual.Keys | Where-Object { -not $expected.ContainsKey($_) -and $_ -cne $extra })
    Assert-Equal 0 $others.Count "${what}: no other key ($($others -join ', '))"
}

Test-Case 'watch: the reported check line is kept in the decision record, read back and removed, and the rest of the record stays as it was' {
    $path = Join-Path $WorkRoot 'decision-reported.json'
    $decision = Get-LimitDecision (New-DecisionAgents) $t0.AddMinutes(2) 3 $t0 $null
    Write-DecisionRecord $path $decision ([pscustomobject]@{ Name = 'weekly'; Percent = 98.5; ResetsAt = $t0.AddMinutes(2) }) $t0
    $before = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable -DateKind String
    Assert-True ($null -eq (Read-DecisionRecord $path).ReportedCheck) 'a new hand-over has reported nothing'
    $line = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'
    Assert-True (Set-ReportedCheck $path $line) 'kept'
    Assert-Equal $line (Read-DecisionRecord $path).ReportedCheck 'read back'
    $kept = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable -DateKind String
    Assert-Equal $line $kept['reportedCheck'] 'kept under reportedCheck'
    Assert-SameRecord $before $kept 'reportedCheck' 'kept beside the rest'
    Assert-Equal 'hand-over' (Read-DecisionRecord $path).Decision 'still the same hand-over'
    Assert-True (Set-ReportedCheck $path '') 'removed'
    $removed = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable -DateKind String
    Assert-True (-not $removed.ContainsKey('reportedCheck')) 'no reportedCheck left'
    Assert-SameRecord $before $removed '' 'the rest after the removal'
    Assert-True ($null -eq (Read-DecisionRecord $path).ReportedCheck) 'read back as nothing reported'
    $null = Set-ReportedCheck $path $line
    Write-CapRecord $path $t0
    Assert-True ($null -eq (Read-DecisionRecord $path).ReportedCheck) 'a new hand-over starts with nothing reported'
    Assert-True (-not (Set-ReportedCheck (Join-Path $WorkRoot 'no-such-folder\decision.json') $line 3>$null)) 'a record that cannot be written is $false, not an error'
}

Test-Case 'watch: a server that did not start is told as LIMIT STOP SERVER FAILED, with the lib''s fallback word for word' {
    Assert-True ($LibFallback -cmatch '^Only now the fallback: send STOP FOR LIMIT by message') "the lib's fallback was read: <$LibFallback>"
    $clock = $t0.ToLocalTime().ToString('HH:mm:ss', $Invariant)
    Assert-Equal "LIMIT STOP SERVER FAILED | $clock | it did not start: node was not found on PATH. $LibFallback" (Format-NotStartedLine 'LIMIT STOP SERVER NOT STARTED | node was not found on PATH' $t0.ToUniversalTime()) 'the line, in local time'
}

Test-Case 'watch: stop decision - only for the usage limit, the record or a cold agent makes it cold' {
    $text = "You've hit your session limit · resets 9:10am (Europe/Warsaw)"
    $stop = [pscustomobject]@{ Kind = 'rate_limit'; Text = $text; At = $t0.AddMinutes(-58) }
    $warmOnly = @([pscustomobject]@{ Type = 'main'; Id = 'm'; LastRequest = $t0.AddMinutes(-59); TtlMinutes = 60; ExpiresAt = $t0.AddMinutes(1) })
    Assert-True ($null -eq (Get-StopDecision ([pscustomobject]@{ Kind = 'server_error'; Text = 'Overloaded'; At = $t0 }) $warmOnly $null 10 $t0)) 'server error: no decision'
    $reset = Get-LimitResetTime $text $stop.At
    $warm = @([pscustomobject]@{ Type = 'main'; Id = 'm'; LastRequest = $stop.At; TtlMinutes = 60; ExpiresAt = $reset.AddMinutes(11) })
    Assert-Equal 'resume' (Get-StopDecision $stop $warm $null 10 $t0).Decision 'warm main resumes'
    Assert-Equal 'hand-over' (Get-StopDecision $stop $warmOnly $null 10 $t0).Decision 'main cold by the reset'
    $record = [pscustomobject]@{ Decision = 'hand-over'; ResetsAt = $reset; TakenAt = $stop.At.AddMinutes(-2) }
    Assert-Equal 'hand-over' (Get-StopDecision $stop $warm $record 10 $t0).Decision 'the hand-over on record'
    $workerAtStop = @($warm) + @([pscustomobject]@{ Type = 'software-developer'; Id = 'a8912d1aa31f121f1'; LastRequest = $stop.At.AddMinutes(-1); TtlMinutes = 5; ExpiresAt = $stop.At.AddMinutes(4) })
    Assert-Equal 'hand-over' (Get-StopDecision $stop $workerAtStop $null 10 $reset.AddMinutes(5)).Decision 'warm at the stop, cold by the wake: it counts'
}

Test-Case 'watch: wake time - a limit message with no readable reset waits for a later reset on record' {
    $wakeOn = @('rate_limit', 'server_error')
    $weekly = [pscustomobject]@{ Kind = 'rate_limit'; Text = "You've hit your weekly limit · resets Oct 31, 7am (Europe/Warsaw)"; At = $t0 }
    $later = [pscustomobject]@{ Decision = 'resume'; ResetsAt = $t0.AddDays(3); TakenAt = $t0.AddMinutes(-5) }
    Assert-True ((Get-WakeTime $weekly $wakeOn 5 10 $later) -eq $t0.AddDays(3).AddMinutes(5)) 'the reset on record plus the margin'
    Assert-True ((Get-WakeTime $weekly $wakeOn 5 10 $null) -eq $t0.AddMinutes(10)) 'no record: the retry wait, as before'
    $soon = [pscustomobject]@{ Decision = 'hand-over'; ResetsAt = $t0.AddMinutes(2); TakenAt = $t0.AddMinutes(-5) }
    Assert-True ((Get-WakeTime $weekly $wakeOn 5 10 $soon) -eq $t0.AddMinutes(10)) 'a reset on record before the retry wait: the retry wait'
    $past = [pscustomobject]@{ Decision = 'resume'; ResetsAt = $t0.AddMinutes(-1); TakenAt = $t0.AddMinutes(-50) }
    Assert-True ((Get-WakeTime $weekly $wakeOn 5 10 $past) -eq $t0.AddMinutes(10)) 'a reset on record before the stop is stale'
    $readable = [pscustomobject]@{ Kind = 'rate_limit'; Text = "You've hit your session limit · resets 9:10am (Europe/Warsaw)"; At = $t0 }
    Assert-True ((Get-WakeTime $readable $wakeOn 5 10 $later) -eq (Get-LimitResetTime $readable.Text $t0).AddMinutes(5)) 'a readable reset wins over the record'
    $server = [pscustomobject]@{ Kind = 'server_error'; Text = 'Overloaded'; At = $t0 }
    Assert-True ((Get-WakeTime $server $wakeOn 5 10 $later) -eq $t0.AddMinutes(10)) 'a server error ignores the record'
    Assert-True ((Get-StopDecision $weekly @() $later 10 (Get-WakeTime $weekly $wakeOn 5 10 $later)).ResetsAt -eq $t0.AddDays(3)) 'the decision uses the same reset'
}

Test-Case 'watch: stop decision - a reset on record from before the stop does not stand in for the reset' {
    $weekly = [pscustomobject]@{ Kind = 'rate_limit'; Text = "You've hit your weekly limit · resets Oct 31, 7am (Europe/Warsaw)"; At = $t0 }
    $stale = [pscustomobject]@{ Decision = 'resume'; ResetsAt = $t0.AddMinutes(-30); TakenAt = $t0.AddMinutes(-90) }
    $wake = Get-WakeTime $weekly @('rate_limit') 5 10 $stale
    $main = @([pscustomobject]@{ Type = 'main'; Id = 'm'; LastRequest = $t0.AddMinutes(-45); TtlMinutes = 60; ExpiresAt = $t0.AddMinutes(15) })
    $decision = Get-StopDecision $weekly $main $stale 10 $wake
    Assert-True ($decision.ResetsAt -eq $wake) "the wake time stands in, not the stale reset: $($decision.ResetsAt)"
    Assert-Equal 'hand-over' $decision.Decision 'main runs out by the wake time plus the margin'
}

Test-Case 'watch: a moment on another day than now is printed with its date' {
    Assert-Equal ($t0.ToLocalTime().ToString('HH:mm', $Invariant)) (Format-Clock $t0 $t0.AddHours(2)) 'same day: the time only'
    Assert-Equal ($t0.AddDays(3).ToLocalTime().ToString('yyyy-MM-dd HH:mm', $Invariant)) (Format-Clock $t0.AddDays(3) $t0) 'three days ahead: date and time'
    Assert-Equal ($t0.AddDays(-1).ToLocalTime().ToString('yyyy-MM-dd HH:mm', $Invariant)) (Format-Clock $t0.AddDays(-1) $t0) 'yesterday: date and time'
    $decision = Get-LimitDecision (New-DecisionAgents) $t0.AddDays(3) 3 $t0 $null
    $marker = Format-HandOverMarker ([pscustomobject]@{ Name = 'weekly'; Percent = 98; ResetsAt = $t0.AddDays(3) }) $decision $t0
    $expected = "LIMIT NEAR | HAND OVER | weekly at 98% resets $($t0.AddDays(3).ToLocalTime().ToString('yyyy-MM-dd HH:mm', $Invariant)) | going cold: " +
        "software-developer a8912d1a at $($t0.AddSeconds(270).ToLocalTime().ToString('HH:mm', $Invariant)), main 7b3870e5 at $($t0.AddMinutes(60).ToLocalTime().ToString('HH:mm', $Invariant))"
    Assert-Equal $expected $marker 'a weekly reset days ahead shows its date'
}

# --- watch-usage-and-context.ps1: integration cases --------------------------------------------------------------

"watch-usage-and-context.ps1 (runs)"
$config = New-TestConfig @{}

Test-Case 'watch run: WATCH FAILED when the transcript is missing' {
    $fixture = New-FixtureSession @(New-ReplyLine ([DateTimeOffset]::Now) '' -write1h 10)
    $arguments = Get-WatchArguments $fixture $config $NoReading
    $arguments[1] = [guid]::NewGuid().ToString()
    $run = Invoke-Script $Watch $arguments
    Assert-Equal 1 $run.ExitCode 'exit code'
    Assert-True ($run.Lines[-1] -cmatch '^WATCH FAILED \| no transcript') "last line: $($run.Lines[-1])"
}

Test-Case 'watch run: WATCH FAILED names a missing settings key' {
    $fixture = New-FixtureSession @(New-ReplyLine ([DateTimeOffset]::Now) '' -write1h 10)
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture (New-TestConfig @{ 'usageLimits.resumeMarginMinutes' = $null }) $NoReading)
    Assert-Equal 1 $run.ExitCode 'exit code'
    Assert-True ($run.Lines[-1] -cmatch "^WATCH FAILED \| .*no key 'usageLimits\.resumeMarginMinutes'") "last line: $($run.Lines[-1])"
}

Test-Case 'watch run: WATCH ALREADY RUNNING when a live watch holds the marker' {
    $fixture = New-FixtureSession @(New-ReplyLine ([DateTimeOffset]::Now) '' -write1h 10)
    $standIn = Start-StandIn 20
    try {
        Set-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).txt") -Value "$($standIn.Id) $($standIn.StartTime.Ticks)" -NoNewline
        $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
        Assert-Equal 0 $run.ExitCode 'exit code'
        Assert-True ($run.Lines[-1] -cmatch "^WATCH ALREADY RUNNING \| process $($standIn.Id) ") "last line: $($run.Lines[-1])"
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: SESSION NEAR CAP still ends the watch first, and its record is the cap hand-over, not a usage decision' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $reading = New-ReadingFile $now 99 $now.AddHours(2) 50 $now.AddDays(3)
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading)
    Assert-True ($run.Lines[0] -cmatch '^SESSION NEAR CAP \| the context is at 451k tokens') "first line: $($run.Lines)"
    $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
    Assert-Equal 'context-cap' $record.window "no limit decision taken: $($record | ConvertTo-Json -Compress)"
}

# The time the usage-limit message of a stop names, the way Claude Code words it: hour and minute, am or pm.
function Format-ResetText([DateTimeOffset]$at) {
    return "You've hit your session limit · resets $($at.ToLocalTime().ToString('h:mmtt', $Invariant).ToLowerInvariant())"
}

# A moment the way the new markers print it, worked out here on its own: local time, with the date in front when it
# is not on the same local day as $now.
function Format-ExpectedClock([DateTimeOffset]$at, [DateTimeOffset]$now) {
    $local = $at.ToLocalTime()
    $format = if ($local.Date -eq $now.ToLocalTime().Date) { 'HH:mm' } else { 'yyyy-MM-dd HH:mm' }
    return $local.ToString($format, $Invariant)
}

# Writes the limit decision a watch keeps for a session, as Write-DecisionRecord does.
function Write-FixtureDecision($fixture, [string]$decision, [string]$window, [DateTimeOffset]$resetsAt, [DateTimeOffset]$takenAt) {
    $path = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
    $record = [ordered]@{ takenAt = $takenAt.ToString('o', $Invariant); decision = $decision; window = $window; percent = 98; resetsAt = $resetsAt.ToString('o', $Invariant); agents = @() }
    Write-Lines $path @($record | ConvertTo-Json -Compress)
}

# The sentence the steps of every hand-over begin with, the server sentence and the leads' sentence, and the clause
# that stops the server, written out here on their own.
$RestartSentence = 'Start this watch again now: the hand-over on record keeps it quiet, and it wakes you if the limit-stop server fails or, if the limit stops the session first, after the reset.'
$ServerSentence = 'The limit-stop server tells every agent of this session to stop at its next tool call: send no stop message.'
$LeadsSentence = 'Wait for LEAD STOPPED from every running lead, with no deadline.'
# The sentence after a check that could not check.
$NotCheckedAfter = 'The Usage and context watch cannot tell whether the limit-stop server still works. Start this watch again now: it checks again at each look and says no more of this until the cause changes, or clears and comes back.'
function Get-ExpectedStopClause($fixture) {
    return "and in the same step stop the limit-stop server: node '$StubServer' stop --session $($fixture.SessionId)"
}

# The lines a check of the stand-in server got for a session (each one its arguments, joined by |).
function Get-StubChecks($fixture) {
    $path = Join-Path $WorkRoot "stub-check-$($fixture.SessionId).txt"
    if (-not (Test-Path -LiteralPath $path)) { return @() }
    return @(Get-Content -LiteralPath $path | Where-Object { $_ -ne '' })
}

Test-Case 'watch run: at SESSION NEAR CAP it records the cap hand-over, starts the limit-stop server for the context cap with its Claude Code pid, then says what to do' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $standIn = Start-StandIn 20
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading $standIn.Id) 30 }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    Assert-Equal 3 $run.Lines.Count "three lines: $($run.Lines)"
    Assert-True ($run.Lines[0] -cmatch '^SESSION NEAR CAP \| the context is at 451k tokens at \d\d:\d\d \(warning size 450k\)\. Finish the edit in progress, write the hand-over, schedule the next chat and end the session\.$') "marker: $($run.Lines[0])"
    Assert-Equal 'LIMIT STOP SERVER STARTED | process 4242 | pipe stub' $run.Lines[1] "the server's own line, unchanged"
    $passed = @(Get-Content -LiteralPath (Join-Path $WorkRoot "stub-args-$($fixture.SessionId).json") -Raw | ConvertFrom-Json)
    Assert-Equal ('start|--session|' + $fixture.SessionId + '|--window|context-cap|--claude-pid|' + $standIn.Id) ($passed -join '|') "arguments: $passed"
    Assert-Equal 'true' (Get-Content -LiteralPath (Join-Path $WorkRoot "stub-record-$($fixture.SessionId).txt") -Raw) 'the cap hand-over was on record before the server started'
    $expected = "$RestartSentence $ServerSentence $LeadsSentence Then write the hand-over, listing every lead's hand-off, and run & '$Schedule' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap, which starts a new chat with Read <hand-over> and carry on, $(Get-ExpectedStopClause $fixture); then end the session. The context-guard hook may say SESSION NEAR CAP and STOP FOR LIMIT too; they mean the same."
    Assert-Equal $expected $run.Lines[2] 'steps'
    $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
    Assert-Equal 'hand-over|context-cap' "$($record.decision)|$($record.window)" 'the cap hand-over on record'
    Assert-Equal 0 (Get-StubChecks $fixture).Count 'no check before the hand-over was announced'
}

Test-Case 'watch run: the relaunch command SESSION NEAR CAP prints runs, and starts the next chat relaunch.afterCapMinutes from now' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
    $found = [regex]::Match($run.Lines[2], "run & '([^']+)' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap,")
    Assert-True $found.Success "the command: $($run.Lines[2])"
    $handover = Join-Path $WorkRoot 'HANDOVER_CAP_CLAUDE.md'; Write-Lines $handover @('# hand-over')
    $before = [DateTimeOffset]::Now
    $dry = Invoke-Script $found.Groups[1].Value @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-ContextCap', '-DryRun', '-ConfigPath', (New-TestConfig @{ 'relaunch.afterCapMinutes' = 37; 'usageLimits.relaunchMarginMinutes' = 2 }))
    $after = [DateTimeOffset]::Now
    Assert-Equal 0 $dry.ExitCode "exit code ($($dry.Lines) $($dry.Err))"
    $times = @($before, $after) | ForEach-Object { [regex]::Escape($_.AddMinutes(37).ToString('yyyy-MM-dd HH:mm', $Invariant)) }
    Assert-True ($dry.Lines[-1] -cmatch "^DRY RUN \| would register \S+ at ($($times -join '|')): ") "now plus relaunch.afterCapMinutes: $($dry.Lines[-1])"
    Assert-True ($dry.Lines[-1] -cmatch "-Prompt `"Read [^`"]*HANDOVER_CAP_CLAUDE\.md and carry on\.`" -ContextCap$") "the start script hears it is a cap relaunch: $($dry.Lines[-1])"
}

Test-Case 'watch run: the wake after a server error waits usageAndContextWatch.retryMinutes, after a named reset usageAndContextWatch.resetMarginMinutes' {
    $now = [DateTimeOffset]::Now
    $error3 = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-5) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-3) 'server_error' 'Overloaded'))
    $woken = Invoke-Script $Watch (Get-WatchArguments $error3 (New-TestConfig @{ 'usageAndContextWatch.retryMinutes' = 2 }) $NoReading)
    Assert-True ($woken.Lines[-1] -cmatch '^SESSION RESUMED \| server_error stopped this session') "retry 2, error 3 minutes ago: $($woken.Lines)"
    $limit2 = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-5) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-4) 'rate_limit' (Format-ResetText $now.AddMinutes(-2))))
    $woken = Invoke-Script $Watch (Get-WatchArguments $limit2 (New-TestConfig @{ 'usageAndContextWatch.resetMarginMinutes' = 1 }) $NoReading)
    Assert-True ($woken.Lines[-1] -cmatch '^SESSION RESUMED \| rate_limit stopped this session') "margin 1, reset 2 minutes ago: $($woken.Lines)"
    foreach ($case in @(@{ Fixture = $error3; Key = 'usageAndContextWatch.retryMinutes' }, @{ Fixture = $limit2; Key = 'usageAndContextWatch.resetMarginMinutes' })) {
        $standIn = Start-StandIn 4
        try { $quiet = Invoke-Script $Watch (Get-WatchArguments $case.Fixture (New-TestConfig @{ $case.Key = 30 }) $NoReading $standIn.Id) 30 }
        finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
        Assert-Equal 0 $quiet.Lines.Count "$($case.Key) 30 keeps the watch quiet: $($quiet.Lines)"
    }
}

Test-Case 'watch run: at SESSION NEAR CAP a server that did not start is told as FAILED before the fallback; without a Claude Code pid none is passed' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $env:LIMIT_TESTS_STUB_SAYS = 'LIMIT STOP SERVER NOT STARTED | the stub says no'
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading) }
    finally { Remove-Item Env:\LIMIT_TESTS_STUB_SAYS -ErrorAction SilentlyContinue }
    Assert-Equal 4 $run.Lines.Count "four lines: $($run.Lines)"
    Assert-Equal 'LIMIT STOP SERVER NOT STARTED | the stub says no' $run.Lines[1] "the server's own line, unchanged"
    Assert-True ($run.Lines[2] -cmatch '^LIMIT STOP SERVER FAILED \| \d\d:\d\d:\d\d \| it did not start: the stub says no\. ') "the failure first: $($run.Lines[2])"
    Assert-True ($run.Lines[2].EndsWith("no. $LibFallback", [StringComparison]::Ordinal)) "then the fallback: $($run.Lines[2])"
    Assert-True ($run.Lines[3].StartsWith("$RestartSentence $LeadsSentence Then write the hand-over", [StringComparison]::Ordinal)) "steps without the server sentence: $($run.Lines[3])"
    Assert-True ($run.Lines[3].Contains("-ContextCap, which starts a new chat with Read <hand-over> and carry on, $(Get-ExpectedStopClause $fixture); then end the session.")) "the relaunch and the stop: $($run.Lines[3])"
    $passed = @(Get-Content -LiteralPath (Join-Path $WorkRoot "stub-args-$($fixture.SessionId).json") -Raw | ConvertFrom-Json)
    Assert-Equal ('start|--session|' + $fixture.SessionId + '|--window|context-cap') ($passed -join '|') "arguments: $passed"
}

Test-Case 'watch run: at SESSION NEAR CAP a server the hook started first counts as running' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $env:LIMIT_TESTS_STUB_SAYS = 'LIMIT STOP SERVER RUNNING ALREADY | pipe stub'
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading) }
    finally { Remove-Item Env:\LIMIT_TESTS_STUB_SAYS -ErrorAction SilentlyContinue }
    Assert-Equal 3 $run.Lines.Count "three lines, no FAILED: $($run.Lines)"
    Assert-Equal 'LIMIT STOP SERVER RUNNING ALREADY | pipe stub' $run.Lines[1] "the server's own line, unchanged"
    Assert-True ($run.Lines[2].StartsWith("$RestartSentence $ServerSentence $LeadsSentence ", [StringComparison]::Ordinal)) "no stop message to send: $($run.Lines[2])"
}

Test-Case 'watch run: SESSION RESUMED after a limit stop when every agent stays warm' {
    $now = [DateTimeOffset]::Now
    $stopAt = $now.AddMinutes(-3)
    $searcher = New-AgentId
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-4) 3 '' '1h') + @(New-ApiErrorLine $stopAt 'rate_limit' (Format-ResetText $now.AddMinutes(-1)))) @(
        @{ Id = $searcher; Type = 'code-searcher'; Lines = @(New-ReplyRun $now.AddMinutes(-4) 2 $searcher '5m') })
    $run = Invoke-Script $Watch ((Get-WatchArguments $fixture $config $NoReading) + @('-ResetMarginMinutes', '0'))
    Assert-True ($run.Lines[-1] -cmatch '^SESSION RESUMED \| rate_limit stopped this session') "last line: $($run.Lines[-1])"
}

Test-Case 'watch run: SESSION RESET COLD after a limit stop when a worker went cold' {
    $now = [DateTimeOffset]::Now
    $dev = New-AgentId
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-4) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-3) 'rate_limit' (Format-ResetText $now.AddMinutes(-1)))) @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-4) 2 $dev '5m') })
    $run = Invoke-Script $Watch ((Get-WatchArguments $fixture $config $NoReading) + @('-ResetMarginMinutes', '0'))
    Assert-Equal 1 $run.Lines.Count "one line: $($run.Lines)"
    Assert-True ($run.Lines[0] -cmatch "^SESSION RESET COLD \| .*software-developer $($dev.Substring(0, 8)) at (\d{4}-\d\d-\d\d )?\d\d:\d\d") "line: $($run.Lines[0])"
    Assert-True ($run.Lines[0] -cmatch 'schedule-relaunch\.ps1.* -At now') 'names the relaunch with now'
}

Test-Case 'watch run: a limit message with no readable reset and a later reset on record stays quiet until that reset' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-12) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-11) 'rate_limit' "You've hit your weekly limit · resets Oct 31, 7am (Europe/Warsaw)"))
    Write-FixtureDecision $fixture 'resume' 'weekly' $now.AddDays(3) $now.AddMinutes(-13)
    $standIn = Start-StandIn 5
    try {
        $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading $standIn.Id) 30
        Assert-Equal 0 $run.ExitCode 'exit code'
        Assert-Equal 0 $run.Lines.Count "quiet: $($run.Lines)"
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: restarted after LIMIT NEAR, a limit stop during the hand-over ends in SESSION RESET COLD after the reset' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-6) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-5) 'rate_limit' (Format-ResetText $now.AddMinutes(-1))))
    Write-FixtureDecision $fixture 'hand-over' 'five-hour' $now.AddMinutes(-1) $now.AddMinutes(-8)
    $run = Invoke-Script $Watch ((Get-WatchArguments $fixture $config $NoReading) + @('-ResetMarginMinutes', '0'))
    Assert-Equal 1 $run.Lines.Count "one line: $($run.Lines)"
    Assert-True ($run.Lines[0] -cmatch "^SESSION RESET COLD \| rate_limit stopped this session .*A hand-over was decided before the stop\. Do not resume any agent.* -At now, $([regex]::Escape((Get-ExpectedStopClause $fixture)))\. If that hand-over is written and a relaunch is scheduled already, end the session\.$") "line: $($run.Lines[0])"
    Assert-Equal 0 (Get-StubChecks $fixture).Count 'no check of the server during the limit stop'
}

Test-Case 'watch run: SESSION RESUMED after a server error even with a cold worker' {
    $now = [DateTimeOffset]::Now
    $dev = New-AgentId
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-15) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-12) 'server_error' 'Overloaded')) @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-13) 2 $dev '5m') })
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
    Assert-True ($run.Lines[-1] -cmatch '^SESSION RESUMED \| server_error stopped this session') "last line: $($run.Lines[-1])"
}

Test-Case 'watch run: LIMIT NEAR hand over names the worker, not the searcher, the cold lead or the workflow agent' {
    $now = [DateTimeOffset]::Now
    $dev = New-AgentId; $searcher = New-AgentId; $lead = New-AgentId; $flow = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $dev '5m') },
        @{ Id = $searcher; Type = 'code-searcher'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $searcher '5m') },
        @{ Id = $lead; Type = 'task-lead'; Lines = @(New-ReplyRun $now.AddMinutes(-30) 3 $lead '5m') },
        @{ Id = $flow; Type = 'general-purpose'; Workflow = $true; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $flow '5m') })
    $reading = New-ReadingFile $now 96 $now.AddMinutes(30) 50 $now.AddDays(3)
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading)
    Assert-Equal 0 $run.ExitCode 'exit code'
    Assert-Equal 3 $run.Lines.Count "three lines: $($run.Lines)"
    $expected = "LIMIT NEAR | HAND OVER | five-hour at 96% resets $(Format-ExpectedClock $now.AddMinutes(30) $now) | going cold: software-developer $($dev.Substring(0, 8)) at $(Format-ExpectedClock $now.AddMinutes(4) $now)"
    Assert-Equal $expected $run.Lines[0] 'marker line'
    Assert-Equal 'LIMIT STOP SERVER STARTED | process 4242 | pipe stub' $run.Lines[1] "the server's own line, unchanged"
    $steps = "^$([regex]::Escape("$RestartSentence $ServerSentence $LeadsSentence Then write the hand-over, listing every lead's hand-off, and run & '$Schedule' -ProjectDir <project folder> -HandoverPath <hand-over file> -At")) \S+, $([regex]::Escape((Get-ExpectedStopClause $fixture)))\.$"
    Assert-True ($run.Lines[2] -cmatch $steps) "what to do: $($run.Lines[2])"
    Assert-True ($run.Lines[2] -cnotmatch 'STOP FOR LIMIT') "no stop message to send: $($run.Lines[2])"
    $record = Get-Content -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json") -Raw | ConvertFrom-Json -AsHashtable
    Assert-Equal 'hand-over' $record.decision 'recorded decision'
}

Test-Case 'watch run: at LIMIT NEAR it starts the limit-stop server for its session, window, percent and reset, and gives the leads no deadline' {
    $now = [DateTimeOffset]::Now
    $dev = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $dev '5m') })
    $reading = New-ReadingFile $now 50 $now.AddMinutes(30) 98.5 $now.AddDays(3)
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading)
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    $argsPath = Join-Path $WorkRoot "stub-args-$($fixture.SessionId).json"
    Assert-True (Test-Path -LiteralPath $argsPath) 'the server was started'
    $passed = @(Get-Content -LiteralPath $argsPath -Raw | ConvertFrom-Json)
    Assert-Equal ('start|--session|' + $fixture.SessionId + '|--window|weekly|--percent|98.5|--resets-at') (($passed[0..7]) -join '|') "arguments: $passed"
    Assert-Equal 9 $passed.Count "nine arguments: $passed"
    Assert-True ([Math]::Abs(([DateTimeOffset]::Parse($passed[8], [Globalization.CultureInfo]::InvariantCulture) - $now.AddDays(3)).TotalSeconds) -lt 2) "the weekly reset: $($passed[8])"
    Assert-True ($run.Lines[2].Contains(" $LeadsSentence Then write the hand-over")) "the leads have no deadline: $($run.Lines[2])"
    Assert-True ($run.Lines[2] -cnotmatch 'until|TaskStop') "no deadline and no TaskStop: $($run.Lines[2])"
    $again = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $dev '5m') })
    $standIn = Start-StandIn 20
    try { $withPid = Invoke-Script $Watch (Get-WatchArguments $again $config $reading $standIn.Id) 30 }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
    $passed = @(Get-Content -LiteralPath (Join-Path $WorkRoot "stub-args-$($again.SessionId).json") -Raw | ConvertFrom-Json)
    Assert-Equal "--claude-pid|$($standIn.Id)" (($passed[9..10]) -join '|') "a watch with a Claude Code process passes its id on: $passed ($($withPid.Lines))"
}

Test-Case 'watch run: when the limit-stop server does not start, it is told as FAILED, and only then the fallback' {
    $now = [DateTimeOffset]::Now
    $dev = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $dev '5m') })
    $reading = New-ReadingFile $now 96 $now.AddMinutes(30) 50 $now.AddDays(3)
    $env:LIMIT_TESTS_STUB_SAYS = 'LIMIT STOP SERVER NOT STARTED | the stub says no'
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading) }
    finally { Remove-Item Env:\LIMIT_TESTS_STUB_SAYS -ErrorAction SilentlyContinue }
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    Assert-Equal 4 $run.Lines.Count "four lines: $($run.Lines)"
    Assert-Equal 'LIMIT STOP SERVER NOT STARTED | the stub says no' $run.Lines[1] "the server's own line, unchanged"
    Assert-True ($run.Lines[2] -cmatch '^LIMIT STOP SERVER FAILED \| \d\d:\d\d:\d\d \| it did not start: the stub says no\. ') "the failure first: $($run.Lines[2])"
    Assert-True ($run.Lines[2].EndsWith("no. $LibFallback", [StringComparison]::Ordinal)) "then the fallback: $($run.Lines[2])"
    Assert-True ($run.Lines[3].StartsWith("$RestartSentence $LeadsSentence Then write the hand-over", [StringComparison]::Ordinal)) "steps without the server sentence: $($run.Lines[3])"
    $silent = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $dev; Type = 'software-developer'; Lines = @(New-ReplyRun $now.AddMinutes(-1) 3 $dev '5m') })
    $env:LIMIT_TESTS_STUB_SAYS = 'something else entirely'
    try { $odd = Invoke-Script $Watch (Get-WatchArguments $silent $config $reading) }
    finally { Remove-Item Env:\LIMIT_TESTS_STUB_SAYS -ErrorAction SilentlyContinue }
    Assert-True ($odd.Lines[1] -cmatch '^LIMIT STOP SERVER NOT STARTED \| node exited with 0 and said: something else entirely$') "an unknown answer is not taken for a start: $($odd.Lines[1])"
    Assert-True ($odd.Lines[2] -cmatch '^LIMIT STOP SERVER FAILED \| \d\d:\d\d:\d\d \| it did not start: node exited with 0 and said: something else entirely\. Only now the fallback') "told as FAILED: $($odd.Lines[2])"
}

Test-Case 'watch run: the limitStop settings the watch read before run K are not needed any more' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $old = @{ 'limitStop.leadStopFallbackMinutes' = $null; 'limitStop.repeatAfterCalls' = $null; 'limitStop.endMarginMinutes' = $null; 'limitStop.capEndMinutes' = $null }
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture (New-TestConfig $old) $NoReading)
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True ($run.Lines[0] -cmatch '^SESSION NEAR CAP \|') "it runs: $($run.Lines)"
}

Test-Case 'watch run: resume is recorded quietly, then flips to hand over when a cold lead works again' {
    $now = [DateTimeOffset]::Now
    $lead = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h') @(
        @{ Id = $lead; Type = 'task-lead'; Lines = @(New-ReplyRun $now.AddMinutes(-30) 3 $lead '5m') })
    $leadPath = Join-Path $fixture.Subagents "agent-$lead.jsonl"
    $reading = New-ReadingFile $now 97 $now.AddMinutes(30) 50 $now.AddDays(3)
    $decisionPath = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
    $standIn = Start-StandIn 40
    try {
        $started = Start-ScriptProcess $Watch (Get-WatchArguments $fixture $config $reading $standIn.Id)
        $deadline = (Get-Date).AddSeconds(20)
        while (-not (Test-Path $decisionPath) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
        $first = Get-Content -LiteralPath $decisionPath -Raw | ConvertFrom-Json -AsHashtable
        Assert-Equal 'resume' $first.decision 'first decision'
        Assert-True (-not $started.Process.HasExited) 'still watching after resume'
        [IO.File]::AppendAllText($leadPath, (New-ReplyLine ([DateTimeOffset]::Now) $lead -write5m 800) + "`n")
        $run = Wait-ScriptProcess $started 20
        Assert-True (-not $run.TimedOut) 'ended'
        Assert-True ($run.Lines[0] -cmatch "^LIMIT NEAR \| HAND OVER \| five-hour at 97% .*going cold: task-lead $($lead.Substring(0, 8)) at") "marker: $($run.Lines)"
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: a hand-over on record is never taken back and never repeated' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    $reading = New-ReadingFile $now 96 $now.AddMinutes(5) 50 $now.AddDays(3)
    $decisionPath = Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"
    Write-Lines $decisionPath @(([ordered]@{ takenAt = $now.AddMinutes(-2).ToString('o'); decision = 'hand-over'; window = 'five-hour'; percent = 95; resetsAt = $now.AddMinutes(5).ToString('o'); agents = @() } | ConvertTo-Json -Compress))
    $standIn = Start-StandIn 5
    try {
        $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading $standIn.Id) 30
        Assert-Equal 0 $run.ExitCode 'exit code'
        Assert-Equal 0 $run.Lines.Count "quiet: $($run.Lines)"
        Assert-Equal 'hand-over' (Get-Content -LiteralPath $decisionPath -Raw | ConvertFrom-Json -AsHashtable).decision 'record unchanged'
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: restarted during a hand-over it stays quiet over the warning size and past the threshold, and checks the limit-stop server each look' {
    $now = [DateTimeOffset]::Now
    $overCap = @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 446000), (New-UserLine $now))
    $atCap = New-FixtureSession $overCap
    Write-CapRecord (Get-DecisionRecordPath $atCap.SessionId) $now.AddMinutes(-2)
    $limitNear = New-FixtureSession $overCap
    Write-FixtureDecision $limitNear 'hand-over' 'five-hour' $now.AddMinutes(30) $now.AddMinutes(-2)
    $reading = New-ReadingFile $now 96 $now.AddMinutes(30) 50 $now.AddDays(3)
    $standIn = Start-StandIn 6
    try {
        $watches = @($atCap, $limitNear) | ForEach-Object { Start-ScriptProcess $Watch (Get-WatchArguments $_ $config $reading $standIn.Id) }
        $runs = @($watches | ForEach-Object { Wait-ScriptProcess $_ 30 })
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
    foreach ($case in @(@{ Name = 'cap hand-over'; Fixture = $atCap; Run = $runs[0] }, @{ Name = 'usage hand-over'; Fixture = $limitNear; Run = $runs[1] })) {
        Assert-Equal 0 $case.Run.ExitCode "$($case.Name): exit code ($($case.Run.Lines) $($case.Run.Err))"
        Assert-Equal 0 $case.Run.Lines.Count "$($case.Name): quiet: $($case.Run.Lines)"
        $checks = Get-StubChecks $case.Fixture
        Assert-True ($checks.Count -ge 2) "$($case.Name): a check each look: $($checks.Count)"
        Assert-Equal "check|--session|$($case.Fixture.SessionId)" $checks[0] "$($case.Name): the check's arguments"
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $WorkRoot "stub-args-$($case.Fixture.SessionId).json"))) "$($case.Name): no second server start"
    }
}

Test-Case 'watch run: a check that says FAILED ends the watch with that line and one more' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    Write-FixtureDecision $fixture 'hand-over' 'five-hour' $now.AddMinutes(30) $now.AddMinutes(-2)
    $failed = "LIMIT STOP SERVER FAILED | 23:10:05 | it is gone: it listened and logged no end, and its pipe does not answer. $LibFallback"
    $env:LIMIT_TESTS_STUB_CHECK_SAYS = $failed
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading) }
    finally { Remove-Item Env:\LIMIT_TESTS_STUB_CHECK_SAYS -ErrorAction SilentlyContinue }
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines) $($run.Err))"
    Assert-Equal 2 $run.Lines.Count "two lines: $($run.Lines)"
    Assert-Equal $failed $run.Lines[0] "the check's own line, unchanged"
    Assert-Equal 'Start this watch again now; it does not report this failure twice.' $run.Lines[1] 'then start it again'
    Assert-Equal 1 (Get-StubChecks $fixture).Count 'one check'
}

Test-Case 'watch run: a check that cannot check ends the watch, saying so' {
    $now = [DateTimeOffset]::Now
    $after = $NotCheckedAfter
    foreach ($case in @(
            @{ Says = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'; First = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY' },
            @{ Says = 'nonsense'; First = 'LIMIT STOP SERVER NOT CHECKED | node exited with 0 and said: nonsense' })) {
        $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
        Write-CapRecord (Get-DecisionRecordPath $fixture.SessionId) $now.AddMinutes(-2)
        $env:LIMIT_TESTS_STUB_CHECK_SAYS = $case.Says
        try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading) }
        finally { Remove-Item Env:\LIMIT_TESTS_STUB_CHECK_SAYS -ErrorAction SilentlyContinue }
        Assert-Equal 0 $run.ExitCode "$($case.Says): exit code ($($run.Lines) $($run.Err))"
        Assert-Equal "$($case.First)|$after" ($run.Lines -join '|') "$($case.Says): the lines"
    }
}

# Makes the stub server's check print $line from now on, for the fixture's session. The file is written beside and
# then moved over the old one, so a check never reads half of it.
function Set-StubCheckSays($fixture, [string]$line) {
    $path = Join-Path $WorkRoot "stub-check-says-$($fixture.SessionId).txt"
    Write-Lines "$path.new" @($line)
    [IO.File]::Move("$path.new", $path, $true)
}

# Waits until the stub server has been asked to check the fixture's session $count times in all, or $timeoutSeconds
# have passed, and returns how many times it was asked.
function Wait-StubChecks($fixture, [int]$count, [int]$timeoutSeconds = 20) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-StubChecks $fixture).Count -lt $count -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
    return (Get-StubChecks $fixture).Count
}

# A session with a cap hand-over on record whose stub check prints $says.
function New-CheckedSession([DateTimeOffset]$now, [string]$says) {
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    Write-CapRecord (Get-DecisionRecordPath $fixture.SessionId) $now.AddMinutes(-2)
    Set-StubCheckSays $fixture $says
    return $fixture
}

$BusyLine = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EBUSY'
$DeniedLine = 'LIMIT STOP SERVER NOT CHECKED | its log C:\x\limit-stop.log cannot be read: EPERM'

Test-Case 'watch run: started again while the check still says what a watch reported, it stays quiet and keeps checking' {
    $now = [DateTimeOffset]::Now
    foreach ($case in @(
            @{ Name = 'cannot check'; Says = $BusyLine; After = $NotCheckedAfter },
            @{ Name = 'failed, the told line not logged'; Says = "LIMIT STOP SERVER FAILED | 23:10:05 | it is gone: its pipe does not answer. $LibFallback"; After = 'Start this watch again now; it does not report this failure twice.' })) {
        $fixture = New-CheckedSession $now $case.Says
        $first = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
        Assert-Equal "$($case.Says)|$($case.After)" ($first.Lines -join '|') "$($case.Name): the first watch reports it"
        $standIn = Start-StandIn 5
        try { $again = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading $standIn.Id) 30 }
        finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
        Assert-True (-not $again.TimedOut) "$($case.Name): ended with its Claude Code stand-in"
        Assert-Equal 0 $again.ExitCode "$($case.Name): exit code ($($again.Err))"
        Assert-Equal 0 $again.Lines.Count "$($case.Name): started again, quiet: $($again.Lines)"
        Assert-True ((Get-StubChecks $fixture).Count -ge 3) "$($case.Name): it kept checking: $((Get-StubChecks $fixture).Count)"
    }
}

Test-Case 'watch run: started again after a reported check, it speaks again when the line changes, or when it clears and comes back' {
    $now = [DateTimeOffset]::Now
    $fixture = New-CheckedSession $now $BusyLine
    $null = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
    Set-StubCheckSays $fixture $DeniedLine
    $changed = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading)
    Assert-Equal "$DeniedLine|$NotCheckedAfter" ($changed.Lines -join '|') 'a changed line is reported'
    Set-StubCheckSays $fixture 'LIMIT STOP SERVER FINE | stub'
    $standIn = Start-StandIn 40
    try {
        $checks = (Get-StubChecks $fixture).Count
        $watching = Start-ScriptProcess $Watch (Get-WatchArguments $fixture $config $NoReading $standIn.Id)
        Assert-True ((Wait-StubChecks $fixture ($checks + 2)) -ge ($checks + 2)) 'it checked twice and found the server fine'
        Assert-True (-not $watching.Process.HasExited) 'quiet while the server is fine'
        Set-StubCheckSays $fixture $DeniedLine
        $back = Wait-ScriptProcess $watching 20
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
    Assert-True (-not $back.TimedOut) 'it ended when the cause came back'
    Assert-Equal "$DeniedLine|$NotCheckedAfter" ($back.Lines -join '|') 'the same line, after it cleared, is reported again'
}

Test-Case 'watch run: a decision record that cannot be written hides no report: the line comes again, and a comeback after FINE is told' {
    $now = [DateTimeOffset]::Now
    $repeats = New-CheckedSession $now $BusyLine
    $comesBack = New-CheckedSession $now 'LIMIT STOP SERVER FINE | stub'
    $null = Set-ReportedCheck (Get-DecisionRecordPath $comesBack.SessionId) $BusyLine
    $records = @($repeats, $comesBack) | ForEach-Object { Get-Item -LiteralPath (Get-DecisionRecordPath $_.SessionId) }
    $records | ForEach-Object { $_.IsReadOnly = $true }
    try {
        foreach ($attempt in 1, 2) {
            $run = Invoke-Script $Watch (Get-WatchArguments $repeats $config $NoReading)
            Assert-True ($run.Lines -ccontains $BusyLine -and $run.Lines -ccontains $NotCheckedAfter) "run $($attempt): reported: $($run.Lines)"
            Assert-Equal $BusyLine $run.Lines[0] "run $($attempt): the report comes first"
        }
        $standIn = Start-StandIn 40
        try {
            $checks = (Get-StubChecks $comesBack).Count
            $watching = Start-ScriptProcess $Watch (Get-WatchArguments $comesBack $config $NoReading $standIn.Id)
            Assert-True ((Wait-StubChecks $comesBack ($checks + 2)) -ge ($checks + 2)) 'it checked twice and found the server fine'
            Assert-True (-not $watching.Process.HasExited) 'quiet while the server is fine'
            Set-StubCheckSays $comesBack $BusyLine
            $back = Wait-ScriptProcess $watching 20
        }
        finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
        Assert-True (-not $back.TimedOut) 'it ended when the cause came back'
        Assert-True ($back.Lines -ccontains $BusyLine -and $back.Lines -ccontains $NotCheckedAfter) "the comeback is told although the record still holds it: $($back.Lines)"
    }
    finally { $records | ForEach-Object { $_.IsReadOnly = $false } }
}

Test-Case 'watch run: no check of the limit-stop server while the limit stops the session' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession (@(New-ReplyRun $now.AddMinutes(-4) 3 '' '1h') + @(New-ApiErrorLine $now.AddMinutes(-1) 'rate_limit' (Format-ResetText $now.AddMinutes(30))))
    Write-FixtureDecision $fixture 'hand-over' 'five-hour' $now.AddMinutes(30) $now.AddMinutes(-3)
    $standIn = Start-StandIn 4
    try { $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $NoReading $standIn.Id) 30 }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
    Assert-Equal 0 $run.Lines.Count "quiet: $($run.Lines)"
    Assert-Equal 0 (Get-StubChecks $fixture).Count 'no check'
}

# A copy of the skill's scripts and lib with settings of its own: a pipe prefix and a log nobody else uses, so a test
# can run the real limit-stop server without touching the machine's. Returns the copy's server script.
function New-ServerCopy {
    $skill = Join-Path $WorkRoot "skill-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
    New-Item -ItemType Directory -Force $skill | Out-Null
    Copy-Item -LiteralPath $ScriptsRoot -Destination (Join-Path $skill 'scripts') -Recurse
    Copy-Item -LiteralPath (Join-Path $ScriptsRoot '..\lib') -Destination (Join-Path $skill 'lib') -Recurse
    $settings = New-TestConfig @{ 'limitStop.pipePrefix' = "limit-scripts-tests-$([guid]::NewGuid().ToString('N').Substring(0, 8))"; 'limitStop.logFile' = (Join-Path $skill 'limit-stop.log'); 'limitStop.processCheckSeconds' = 1 }
    Copy-Item -LiteralPath $settings -Destination (Join-Path $skill 'orchestration.config.json')
    return Join-Path $skill 'scripts\limit-stop-server.mjs'
}

Test-Case 'watch run: with the real limit-stop server it stays quiet while the server runs or was stopped, and tells its death once' {
    $now = [DateTimeOffset]::Now
    $server = New-ServerCopy
    $killed = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    $stopped = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    $claude = Start-StandIn 60
    # The servers this case started and has not ended yet; only these are stopped if it fails half-way, and only while
    # their id still names a node process started after this case began.
    $began = Get-Date
    $servers = [Collections.Generic.List[int]]::new()
    try {
        foreach ($fixture in @($killed, $stopped)) {
            Write-CapRecord (Get-DecisionRecordPath $fixture.SessionId) $now
            $started = @(& node $server start --session $fixture.SessionId --window context-cap --claude-pid "$($claude.Id)")
            $found = [regex]::Match($started[-1], '^LIMIT STOP SERVER STARTED \| process (\d+) \|')
            Assert-True $found.Success "the real server started: $started"
            $servers.Add([int]$found.Groups[1].Value)
        }
        $arguments = { param($fixture, $claudeId) @('-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-ClaudePid', "$claudeId", '-EverySeconds', '1', '-ConfigPath', $config, '-UsageReadingPath', $NoReading, '-StopServerScript', $server) }
        $watching = Start-ScriptProcess $Watch (& $arguments $killed $claude.Id)
        Start-Sleep -Seconds 3
        Assert-True (-not $watching.Process.HasExited) 'quiet while the server runs'
        Stop-Process -Id $servers[0]
        $servers.RemoveAt(0)
        $run = Wait-ScriptProcess $watching 20
        Assert-True (-not $run.TimedOut) "the watch ended after the server died ($($run.Err))"
        Assert-Equal 2 $run.Lines.Count "two lines: $($run.Lines)"
        Assert-True ($run.Lines[0] -cmatch '^LIMIT STOP SERVER FAILED \| \d\d:\d\d:\d\d \| .+\. Only now the fallback: send STOP FOR LIMIT') "told: $($run.Lines[0])"
        Assert-True ($run.Lines[0].EndsWith($LibFallback, [StringComparison]::Ordinal)) "with the fallback: $($run.Lines[0])"
        Assert-Equal 'Start this watch again now; it does not report this failure twice.' $run.Lines[1] 'then start it again'
        $stopSaid = @(Invoke-Expression (Format-StopCommand $server $stopped.SessionId))
        Assert-True ($stopSaid[-1] -cmatch '^LIMIT STOP SERVER STOPPED \|') "the stop command the steps print stops it: $stopSaid"
        $servers.Clear()
        $shortClaude = Start-StandIn 5
        try {
            $againStarted = Start-ScriptProcess $Watch (& $arguments $killed $shortClaude.Id)
            $afterStopStarted = Start-ScriptProcess $Watch (& $arguments $stopped $shortClaude.Id)
            $again = Wait-ScriptProcess $againStarted 30
            $afterStop = Wait-ScriptProcess $afterStopStarted 30
        }
        finally { Stop-Process -Id $shortClaude.Id -ErrorAction SilentlyContinue }
        Assert-True (-not ($again.TimedOut -or $afterStop.TimedOut)) 'both ended with their Claude Code stand-in'
        Assert-Equal 0 $again.Lines.Count "started again, it does not tell the same death twice: $($again.Lines)"
        Assert-Equal 0 $afterStop.Lines.Count "a server the main session stopped is no failure: $($afterStop.Lines)"
    }
    finally {
        Stop-Process -Id $claude.Id -ErrorAction SilentlyContinue
        foreach ($id in $servers) {
            $left = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($left -and $left.ProcessName -eq 'node' -and $left.StartTime -ge $began) { Stop-Process -Id $id }
        }
    }
}

Test-Case 'watch run: below the threshold nothing is decided and the watch stays quiet' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    $reading = New-ReadingFile $now 94.9 $now.AddMinutes(30) 97.9 $now.AddDays(3)
    $standIn = Start-StandIn 5
    try {
        $run = Invoke-Script $Watch (Get-WatchArguments $fixture $config $reading $standIn.Id) 30
        Assert-Equal 0 $run.Lines.Count "quiet: $($run.Lines)"
        Assert-True (-not (Test-Path (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json"))) 'no decision file'
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: without -WarnTokens the warning size is contextCaps.main.warn' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @((New-ReplyLine $now.AddMinutes(-1) '' -write1h 5000 -read 395000), (New-UserLine $now))
    $standIn = Start-StandIn 8
    try {
        $run = Invoke-Script $Watch (Get-WatchArguments $fixture (New-TestConfig @{ 'contextCaps.main.warn' = 300000 }) $NoReading $standIn.Id) 30
        Assert-True ($run.Lines[0] -cmatch '^SESSION NEAR CAP \| the context is at 400k tokens .*\(warning size 300k\)') "first line: $($run.Lines)"
        # The first run put the cap hand-over on record, which would keep the second quiet.
        Remove-Item -LiteralPath (Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$($fixture.SessionId).decision.json")
        $passed = Invoke-Script $Watch ((Get-WatchArguments $fixture $config $NoReading $standIn.Id) + @('-WarnTokens', '390000')) 30
        Assert-True ($passed.Lines[0] -cmatch '\(warning size 390k\)') "a passed -WarnTokens wins: $($passed.Lines)"
    }
    finally { Stop-Process -Id $standIn.Id -ErrorAction SilentlyContinue }
}

Test-Case 'watch run: WATCH FAILED names a missing usageAndContextWatch key' {
    $fixture = New-FixtureSession @(New-ReplyLine ([DateTimeOffset]::Now) '' -write1h 10)
    $run = Invoke-Script $Watch (Get-WatchArguments $fixture (New-TestConfig @{ 'usageAndContextWatch.retryMinutes' = $null }) $NoReading)
    Assert-Equal 1 $run.ExitCode 'exit code'
    Assert-True ($run.Lines[-1] -cmatch "^WATCH FAILED \| .*no key 'usageAndContextWatch\.retryMinutes'") "last line: $($run.Lines[-1])"
}

Test-Case 'watch run: the usage reading comes from usageLimits.stateFile, with %NAME% expanded' {
    $now = [DateTimeOffset]::Now
    $fixture = New-FixtureSession @(New-ReplyRun $now.AddMinutes(-1) 3 '' '1h')
    $folder = Join-Path $WorkRoot "watch-home-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $folder | Out-Null
    # Checked an hour from now: the reading is fresh and the session wrote before it, so no probe can be due.
    Copy-Item -LiteralPath (New-ReadingFile $now.AddHours(1) 96 $now.AddMinutes(50) 40 $now.AddDays(3)) -Destination (Join-Path $folder 'usage.json')
    $env:LIMIT_TESTS_HOME = $folder
    try {
        $arguments = @('-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-ClaudePid', '0', '-EverySeconds', '1',
            '-ConfigPath', (New-TestConfig @{ 'usageLimits.stateFile' = '%LIMIT_TESTS_HOME%\usage.json' }), '-StopServerScript', $StubServer)
        $run = Invoke-Script $Watch $arguments
        Assert-True (($run.Lines -join "`n") -cmatch '(?m)^LIMIT NEAR \| HAND OVER \| five-hour at 96% ') "the reading in the expanded file was read: $($run.Lines)"
    }
    finally { Remove-Item Env:\LIMIT_TESTS_HOME -ErrorAction SilentlyContinue }
}

# --- schedule-relaunch.ps1 ---------------------------------------------------------------------------------------

"schedule-relaunch.ps1"
Import-ScriptFunctions $Schedule

Test-Case 'relaunch: the run time is At plus margin, now or a recent past runs soon, older is refused' {
    $now = $t0
    Assert-True ((Get-RelaunchTime $t0.AddHours(2).ToString('o') $now 5 24) -eq $t0.AddHours(2).AddMinutes(5)) 'future'
    Assert-True ((Get-RelaunchTime 'now' $now 5 24) -eq $t0.AddMinutes(5)) 'now'
    Assert-True ((Get-RelaunchTime $t0.AddHours(-3).ToString('o') $now 5 24) -eq $t0.AddMinutes(5)) 'three hours ago'
    Assert-Throws { Get-RelaunchTime $t0.AddHours(-25).ToString('o') $now 5 24 } 'more than 24 hours' 'a day and an hour ago'
    Assert-Throws { Get-RelaunchTime 'tomorrow-ish' $now 5 24 } 'not a time' 'garbage'
}

Test-Case 'relaunch: task name uses the folder name and the run minute' {
    Assert-Equal 'ClaudeRelaunch-xpp-agent-202610251015' (Get-RelaunchTaskName 'ClaudeRelaunch' 'C:\Repos\My projects\xpp-agent\' $t0.AddMinutes(75)) 'name'
}

Test-Case 'relaunch: arguments survive the Windows command line unchanged' {
    $echo = Join-Path $WorkRoot 'echo-args.ps1'
    Set-Content -LiteralPath $echo -Value '[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); $args | ForEach-Object { "<$_>" }'
    $values = @('C:\Repos\My projects\demo\', 'Read C:\a b\"x".md and carry on.', 'a&b|c%PATH%', 'zażółć', '')
    $line = ($values | ForEach-Object { ConvertTo-WindowsArgument $_ }) -join ' '
    $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $PSHOME 'pwsh.exe'), "-NoProfile -File `"$echo`" $line")
    $info.RedirectStandardOutput = $true; $info.UseShellExecute = $false
    $info.StandardOutputEncoding = [Text.Encoding]::UTF8
    $process = [Diagnostics.Process]::Start($info); $out = $process.StandardOutput.ReadToEnd(); $process.WaitForExit()
    $expected = ($values | ForEach-Object { "<$_>" }) -join "`n"
    Assert-Equal $expected (($out -csplit "`r?`n" | Where-Object { $_ -ne '' }) -join "`n") 'round trip'
}

Test-Case 'relaunch: -DryRun registers nothing and says what it would run' {
    $handover = Join-Path $WorkRoot 'HANDOVER_CLAUDE.md'; Write-Lines $handover @('# hand-over')
    $run = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', [DateTimeOffset]::Now.AddYears(1).ToString('o'), '-DryRun')
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Err))"
    $name = ($run.Lines -join "`n") -creplace '(?s).*DRY RUN \| would register (\S+).*', '$1'
    Assert-True ($name -clike "ClaudeRelaunch-$(Split-Path $WorkRoot -Leaf)-*") "task name: $name"
    Assert-True ($null -eq (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue)) 'not registered'
    Assert-True (($run.Lines -join ' ') -cmatch 'start-session-in-vscode\.ps1.*Read .*HANDOVER_CLAUDE\.md and carry on\.') 'runs the start script with the prompt'
}

Test-Case 'relaunch: the task description names the cause, and the task is registered with it' {
    Assert-Equal 'Starts a Claude Code session in VS Code for C:\Demo after the usage limit reset. Made by schedule-relaunch.ps1.' (Get-RelaunchDescription 'C:\Demo' $false) 'after a usage limit, word for word as before'
    Assert-Equal "Starts a Claude Code session in VS Code for C:\Demo after the hand-over at the main session's context cap. Made by schedule-relaunch.ps1." (Get-RelaunchDescription 'C:\Demo' $true) 'after the context cap'
    $register = (Get-Command Register-RelaunchTask).ScriptBlock.Ast
    $calls = @($register.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Get-RelaunchDescription' }, $true))
    Assert-Equal 1 $calls.Count 'Register-RelaunchTask takes its description from Get-RelaunchDescription'
    Assert-Equal '$projectDir $contextCap' (($calls[0].CommandElements | Select-Object -Skip 1 | ForEach-Object { $_.Extent.Text }) -join ' ') 'with its own project and cause'
}

Test-Case 'relaunch: -At now waits usageLimits.relaunchMarginMinutes and passes no -ContextCap; -ContextCap goes without -At and needs its key' {
    $handover = Join-Path $WorkRoot 'HANDOVER_CLAUDE.md'; Write-Lines $handover @('# hand-over')
    $settings = New-TestConfig @{ 'usageLimits.relaunchMarginMinutes' = 6; 'relaunch.afterCapMinutes' = 37 }
    $before = [DateTimeOffset]::Now
    $run = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', 'now', '-DryRun', '-ConfigPath', $settings)
    $after = [DateTimeOffset]::Now
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines) $($run.Err))"
    $times = @($before, $after) | ForEach-Object { [regex]::Escape($_.AddMinutes(6).ToString('yyyy-MM-dd HH:mm', $Invariant)) }
    Assert-True ($run.Lines[-1] -cmatch "^DRY RUN \| would register \S+ at ($($times -join '|')): .* -Prompt `"Read [^`"]*HANDOVER_CLAUDE\.md and carry on\.`"$") "now plus the relaunch margin, no -ContextCap: $($run.Lines[-1])"
    $both = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', 'now', '-ContextCap', '-DryRun', '-ConfigPath', $settings)
    Assert-Equal 1 $both.ExitCode "-At with -ContextCap ($($both.Lines))"
    Assert-True ($both.Lines[-1] -cmatch '^RELAUNCH NOT SCHEDULED \| -At and -ContextCap do not go together') "reason: $($both.Lines)"
    $neither = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-DryRun', '-ConfigPath', $settings)
    Assert-Equal 'RELAUNCH NOT SCHEDULED | -At is required.' $neither.Lines[-1] 'neither -At nor -ContextCap'
    $noKey = New-TestConfig @{ 'relaunch.afterCapMinutes' = $null }
    $missing = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-ContextCap', '-DryRun', '-ConfigPath', $noKey)
    Assert-True ($missing.ExitCode -eq 1 -and $missing.Lines[-1] -cmatch "^RELAUNCH NOT SCHEDULED \| .*no key 'relaunch\.afterCapMinutes'") "names the key: $($missing.Lines)"
    $limitOnly = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', 'now', '-DryRun', '-ConfigPath', $noKey)
    Assert-Equal 0 $limitOnly.ExitCode "a usage-limit relaunch does not need the cap key ($($limitOnly.Lines))"
}

Test-Case 'relaunch: refuses a missing hand-over and a missing project folder' {
    $run = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', (Join-Path $WorkRoot 'none.md'), '-At', 'now', '-DryRun')
    Assert-Equal 1 $run.ExitCode 'missing hand-over'
    $run2 = Invoke-Script $Schedule @('-ProjectDir', (Join-Path $WorkRoot 'nope'), '-HandoverPath', $RealConfig, '-At', 'now', '-DryRun')
    Assert-Equal 1 $run2.ExitCode 'missing folder'
}

Test-Case 'relaunch: how far back -At may be comes from relaunch.maxPastHours, and every relaunch key is required' {
    $handover = Join-Path $WorkRoot 'HANDOVER_CLAUDE.md'; Write-Lines $handover @('# hand-over')
    $threeHoursAgo = [DateTimeOffset]::Now.AddHours(-3).ToString('o')
    $run = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', $threeHoursAgo, '-DryRun', '-ConfigPath', (New-TestConfig @{ 'relaunch.maxPastHours' = 1 }))
    Assert-Equal 1 $run.ExitCode "three hours back with a one-hour limit ($($run.Lines))"
    Assert-True ($run.Lines[-1] -cmatch '^RELAUNCH NOT SCHEDULED \| .*more than 1 hours') "reason: $($run.Lines)"
    $passed = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', $threeHoursAgo, '-DryRun', '-MaxPastHours', '4', '-ConfigPath', (New-TestConfig @{ 'relaunch.maxPastHours' = 1 }))
    Assert-Equal 0 $passed.ExitCode "a passed -MaxPastHours wins ($($passed.Lines))"
    $missing = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', 'now', '-DryRun', '-ConfigPath', (New-TestConfig @{ 'relaunch.expireAfterHours' = $null }))
    Assert-Equal 1 $missing.ExitCode 'missing key'
    Assert-True ($missing.Lines[-1] -cmatch "^RELAUNCH NOT SCHEDULED \| .*no key 'relaunch\.expireAfterHours'") "names the key: $($missing.Lines)"
}

if ($RealTask) {
    Test-Case 'relaunch: registers a real task a year ahead, reads it back, removes it' {
        $handover = Join-Path $WorkRoot 'HANDOVER_CLAUDE.md'; Write-Lines $handover @('# hand-over')
        $at = [DateTimeOffset]::Now.AddYears(1)
        $run = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', $at.ToString('o'))
        Assert-Equal 0 $run.ExitCode "exit code ($($run.Err))"
        $name = ($run.Lines -join "`n") -creplace '(?s).*SCHEDULED \| (\S+).*', '$1'
        try {
            $task = Get-ScheduledTask -TaskName $name
            "        registered: $($task.TaskName) state=$($task.State) start=$($task.Triggers[0].StartBoundary) end=$($task.Triggers[0].EndBoundary) logon=$($task.Principal.LogonType) level=$($task.Principal.RunLevel)"
            "        action: $($task.Actions[0].Execute) $($task.Actions[0].Arguments)"
            Assert-Equal 'Interactive' "$($task.Principal.LogonType)" 'interactive only'
            Assert-Equal 'Limited' "$($task.Principal.RunLevel)" 'no elevation'
            $again = Invoke-Script $Schedule @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', $at.ToString('o'))
            Assert-True (($again.Lines -join ' ') -cmatch 'ALREADY SCHEDULED') "a repeat is harmless: $($again.Lines)"
        }
        finally {
            Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
        }
        Assert-True ($null -eq (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue)) 'gone after removal'
        "        removed: Get-ScheduledTask -TaskName $name finds nothing"
    }
}

# --- start-session-in-vscode.ps1 ---------------------------------------------------------------------------------

"start-session-in-vscode.ps1"
Import-ScriptFunctions $Start

Test-Case 'start: a window title names the folder as a whole part, never as a substring' {
    Assert-True (Test-TitleNamesFolder 'Token usage analysis and… - xpp-agent - Visual Studio Code' 'xpp-agent') 'editor - folder - app'
    Assert-True (Test-TitleNamesFolder '● notes.md - Demo - Visual Studio Code' 'demo') 'dirty marker, other casing'
    Assert-True (Test-TitleNamesFolder 'Demo - Visual Studio Code' 'Demo') 'no editor open'
    Assert-True (-not (Test-TitleNamesFolder 'notes.md - OtherDemo - Visual Studio Code' 'Demo')) 'OtherDemo is not Demo'
    Assert-True (-not (Test-TitleNamesFolder 'Demo.md - Visual Studio Code' 'Demo')) 'a file name is not the folder'
    Assert-True (-not (Test-TitleNamesFolder '' 'Demo')) 'empty title'
}

Test-Case 'start: the open link escapes the prompt' {
    Assert-Equal 'vscode://anthropic.claude-code/open?prompt=Read%20C%3A%5Ca%20b%5CH%26O%20%231.md%20and%20carry%20on.' (New-ClaudeOpenUri 'Read C:\a b\H&O #1.md and carry on.') 'uri'
}

Test-Case 'start: finds the code command and lists VS Code windows (read only)' {
    $code = Find-CodeCommand
    Assert-True ($code -and (Test-Path -LiteralPath $code) -and $code -clike '*\bin\code.cmd') "code command: $code"
    $windows = @(Get-CodeWindows)
    "        code: $code"
    $windows | ForEach-Object { "        window: pid=$($_.ProcessId) title=$($_.Title) names xpp-agent=$(Test-TitleNamesFolder $_.Title 'xpp-agent')" }
    Assert-True ($windows.Count -ge 1) 'at least one VS Code window'
}

Test-Case 'start: the link is opened only with the project window in front, else a notice names the folder and the prompt' {
    $prompt = 'Read C:\x\HANDOVER_CLAUDE.md and carry on.'
    $front = Get-ChatStartPlan $true 'Demo' $prompt (Get-RelaunchCause $false)
    Assert-True $front.OpenLink 'in front: the link is opened'
    Assert-True ($null -eq $front.Notice) 'in front: no notice'
    $behind = Get-ChatStartPlan $false 'Demo' $prompt (Get-RelaunchCause $false)
    Assert-True (-not $behind.OpenLink) 'not in front: nothing is opened'
    Assert-True ($behind.Notice -cmatch '\bDemo\b' -and $behind.Notice.Contains($prompt)) "the notice names the folder and the prompt: $($behind.Notice)"
}

Test-Case 'start: the notices say why the chat starts: the limit has reset, or the session handed over at its context cap' {
    Assert-Equal 'the limit has reset' (Get-RelaunchCause $false) 'after a usage limit'
    Assert-Equal 'the session has handed over at its context cap' (Get-RelaunchCause $true) 'after the context cap'
    $prompt = 'Read C:\x\HANDOVER_CLAUDE.md and carry on.'
    Assert-Equal "Claude: the limit has reset, but the window of Demo was not in front. Open a new Claude chat there and send: $prompt" (Get-ChatStartPlan $false 'Demo' $prompt (Get-RelaunchCause $false)).Notice 'the usage-limit notice, word for word as before'
    Assert-Equal "Claude: the session has handed over at its context cap, but the window of Demo was not in front. Open a new Claude chat there and send: $prompt" (Get-ChatStartPlan $false 'Demo' $prompt (Get-RelaunchCause $true)).Notice 'the context-cap notice'
    $folder = Join-Path $WorkRoot "NoWindowCap$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $folder | Out-Null
    $run = Invoke-Script $Start @('-ProjectDir', $folder, '-Prompt', $prompt, '-ContextCap', '-DryRun', '-LogPath', (Join-Path $WorkRoot 'relaunch-cap.log'))
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Err))"
    Assert-True (($run.Lines -join ' ') -cmatch 'step 3: would open nothing.*would show: Claude: the session has handed over at its context cap, but the window of NoWindowCap') "a dry run with -ContextCap: $($run.Lines)"
}

Test-Case 'start: every notification of the main part opens with the cause or is the plan''s notice' {
    $tree = [Management.Automation.Language.Parser]::ParseFile($Start, [ref]$null, [ref]$null)
    $shown = @($tree.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Show-Notification' }, $true) |
        ForEach-Object { $_.CommandElements[1].Extent.Text })
    Assert-Equal 3 $shown.Count "three notifications: $($shown -join ' | ')"
    foreach ($text in $shown) {
        Assert-True ($text -ceq '$plan.Notice' -or $text.StartsWith('"Claude: $cause', [StringComparison]::Ordinal)) "opens with the cause: $text"
    }
}

Test-Case 'start: -DryRun touches nothing on screen and logs every step' {
    $log = Join-Path $WorkRoot 'relaunch.log'
    $run = Invoke-Script $Start @('-ProjectDir', 'C:\Repos\My projects\xpp-agent', '-Prompt', 'Read C:\x\HANDOVER_CLAUDE.md and carry on.', '-DryRun', '-LogPath', $log)
    $run.Lines | ForEach-Object { "        $_" }
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Err))"
    $text = $run.Lines -join ' '
    $expected = if ($text -cmatch 'in front: True') { 'would open vscode://anthropic\.claude-code/open\?prompt=Read%20' } else { 'would open nothing' }
    Assert-True ($text -cmatch $expected) "step 3 follows whether the window is in front ($expected)"
    $logged = @(Get-Content -LiteralPath $log)
    Assert-True ($logged.Count -ge 4 -and ($logged | Where-Object { $_ -cnotmatch '^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d ' }).Count -eq 0) "every log line timed: $($logged.Count) lines"
}

Test-Case 'start: -DryRun with no window of the project in front would open nothing and show the prompt' {
    $folder = Join-Path $WorkRoot "NoWindowDemo$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $folder | Out-Null
    $run = Invoke-Script $Start @('-ProjectDir', $folder, '-Prompt', 'Read C:\x\HANDOVER_CLAUDE.md and carry on.', '-DryRun', '-LogPath', (Join-Path $WorkRoot 'relaunch-no-window.log'))
    $text = $run.Lines -join ' '
    Assert-Equal 0 $run.ExitCode "exit code ($($run.Err))"
    Assert-True ($text -cmatch 'in front: False') "not in front: $text"
    Assert-True ($text -cnotmatch 'vscode://') "no link is named: $text"
    Assert-True ($text -cmatch 'step 3: would open nothing.*Read C:\\x\\HANDOVER_CLAUDE\.md and carry on\.') "says it would open nothing and names the prompt: $text"
}

Test-Case 'start: a missing relaunch key is logged and nothing starts' {
    $log = Join-Path $WorkRoot "relaunch-missing-$([guid]::NewGuid().ToString('N').Substring(0, 6)).log"
    $run = Invoke-Script $Start @('-ProjectDir', $WorkRoot, '-Prompt', 'Read C:\x\HANDOVER_CLAUDE.md and carry on.', '-DryRun', '-LogPath', $log,
        '-ConfigPath', (New-TestConfig @{ 'relaunch.notifySeconds' = $null }))
    Assert-Equal 1 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True ((Get-Content -LiteralPath $log -Raw) -cmatch "not started: .*no key 'relaunch\.notifySeconds'") "logged: $(Get-Content -LiteralPath $log -Raw)"
}

Test-Case 'start: without -LogPath the log is relaunch.logFile, with %NAME% expanded' {
    $folder = Join-Path $WorkRoot "start-home-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    $project = Join-Path $WorkRoot "NoWindowDemo$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $project | Out-Null
    $env:LIMIT_TESTS_HOME = $folder
    try {
        $config = New-TestConfig @{ 'relaunch.logFile' = '%LIMIT_TESTS_HOME%\logs\relaunch.log' }
        $run = Invoke-Script $Start @('-ProjectDir', $project, '-Prompt', 'Read C:\x\HANDOVER_CLAUDE.md and carry on.', '-DryRun', '-ConfigPath', $config)
        Assert-Equal 0 $run.ExitCode "exit code ($($run.Lines))"
        $log = Join-Path $folder 'logs\relaunch.log'
        Assert-True ((Test-Path -LiteralPath $log) -and @(Get-Content -LiteralPath $log).Count -ge 4) "logged to the expanded file: $log"
        $unset = New-TestConfig @{ 'relaunch.logFile' = '%LIMIT_TESTS_NOT_SET_9F2%\relaunch.log' }
        $bad = Invoke-Script $Start @('-ProjectDir', $project, '-Prompt', 'x', '-DryRun', '-ConfigPath', $unset)
        Assert-Equal 1 $bad.ExitCode 'an unset variable stops it'
        Assert-True (($bad.Lines -join ' ') -cmatch '^START NOT RUN \| .*relaunch\.logFile.*%LIMIT_TESTS_NOT_SET_9F2%') "names the key and the variable: $($bad.Lines)"
    }
    finally { Remove-Item Env:\LIMIT_TESTS_HOME -ErrorAction SilentlyContinue }
}

# --- run-heavy.ps1 -----------------------------------------------------------------------------------------------

"run-heavy.ps1"
$Heavy = Join-Path $ScriptsRoot 'run-heavy.ps1'
Import-ScriptFunctions $Heavy @{ Command = 'unused' }

Test-Case 'heavy: slots, free-memory floor and wait come from runHeavy unless passed' {
    $config = Read-OrchestrationConfig (New-TestConfig @{ 'runHeavy.minFreeMB' = 700; 'runHeavy.slots' = 2; 'runHeavy.waitMinutes' = 9 })
    $settings = Get-HeavySettings $config 'test.json' @{ MinFreeMB = 300 }
    Assert-Equal 300 $settings.MinFreeMB 'a passed floor wins'
    Assert-Equal 2 $settings.Slots 'slots'
    Assert-Equal 9 $settings.WaitMinutes 'wait'
    Assert-Equal 700 (Get-HeavySettings $config 'test.json' @{}).MinFreeMB 'the floor from the config'
    $missing = Read-OrchestrationConfig (New-TestConfig @{ 'runHeavy.slots' = $null })
    Assert-Throws { Get-HeavySettings $missing 'test.json' @{} } "no key 'runHeavy\.slots'" 'missing key'
    Assert-True ($null -ne (Get-HeavySettings $missing 'test.json' @{ Slots = 1 })) 'a passed value needs no key'
}

Test-Case 'heavy run: a missing runHeavy key is HEAVY COMMAND NOT RUN naming it, and the command does not run' {
    $flag = Join-Path $WorkRoot "heavy-ran-$([guid]::NewGuid().ToString('N').Substring(0, 6)).txt"
    $run = Invoke-Script $Heavy @('-Command', "Set-Content -LiteralPath '$flag' -Value x", '-ConfigPath', (New-TestConfig @{ 'runHeavy.waitMinutes' = $null }))
    Assert-Equal 1 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True (($run.Lines -join ' ') -cmatch "^HEAVY COMMAND NOT RUN \| .*no key 'runHeavy\.waitMinutes'") "names the key: $($run.Lines)"
    Assert-True (-not (Test-Path -LiteralPath $flag)) 'the command did not run'
}

# Two slots, so a run of this suite through run-heavy.ps1 (which holds slot 1) still finds one free.
Test-Case 'heavy run: the slot count comes from the settings and the command exit code passes through' {
    $run = Invoke-Script $Heavy @('-Command', 'exit 3', '-ConfigPath', (New-TestConfig @{ 'runHeavy.slots' = 2; 'runHeavy.minFreeMB' = 1; 'runHeavy.waitMinutes' = 1 })) 90
    Assert-Equal 3 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True ($run.Lines[-1] -cmatch '^HEAVY COMMAND DONE \| exit 3 \|.* of 2$') "last line: $($run.Lines)"
}

# Takes a minute: the floor cannot be met, so the script waits out runHeavy.waitMinutes.
Test-Case 'heavy run: the free-memory floor comes from the settings' {
    $run = Invoke-Script $Heavy @('-Command', 'exit 0', '-ConfigPath', (New-TestConfig @{ 'runHeavy.slots' = 2; 'runHeavy.minFreeMB' = 99999999; 'runHeavy.waitMinutes' = 1 })) 120
    Assert-Equal 124 $run.ExitCode "exit code ($($run.Lines))"
    Assert-True ($run.Lines[-1] -cmatch '^HEAVY COMMAND NOT RUN \| free memory stayed below 99999999 MB for 1 minutes') "last line: $($run.Lines)"
}

# --- watch-agent-size-and-stall.ps1 ------------------------------------------------------------------------------

"watch-agent-size-and-stall.ps1"
$AgentWatch = Join-Path $ScriptsRoot 'watch-agent-size-and-stall.ps1'
Import-ScriptFunctions $AgentWatch @{ AgentId = 'unused'; SessionId = 'unused' }

Test-Case 'agent size and stall watch: the warning size is contextCaps.<type>.warn, the default entry for a type not listed' {
    $config = Read-OrchestrationConfig (New-TestConfig @{ 'contextCaps.software-developer.warn' = 111000; 'contextCaps.default.warn' = 222000 })
    Assert-Equal 111000 (Get-AgentWarnTokens $config 'test.json' 'software-developer') 'a listed type'
    Assert-Equal 222000 (Get-AgentWarnTokens $config 'test.json' 'general-purpose') 'a type not listed'
    Assert-Equal 222000 (Get-AgentWarnTokens $config 'test.json' '_why') 'a note is no type'
    Assert-Equal 222000 (Get-AgentWarnTokens $config 'test.json' 'default') 'the default entry by name'
    $missing = Read-OrchestrationConfig (New-TestConfig @{ 'contextCaps.task-lead.warn' = $null })
    Assert-Throws { Get-AgentWarnTokens $missing 'test.json' 'task-lead' } "no key 'contextCaps\.task-lead\.warn'" 'missing key'
}

Test-Case 'agent size and stall watch run: warns at the warning size of its agent type; a passed -WarnTokens wins; a missing key fails' {
    $now = [DateTimeOffset]::Now
    $id = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyLine $now '') @(@{ Id = $id; Type = 'software-developer'; Lines = @(New-ReplyLine $now $id -write5m 5000 -read 325000) })
    $common = @('-AgentId', $id, '-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-EverySeconds', '1', '-MaxHours', '1')
    $run = Invoke-Script $AgentWatch ($common + @('-AgentType', 'software-developer', '-ConfigPath', (New-TestConfig @{ 'contextCaps.software-developer.warn' = 300000 })))
    Assert-True ($run.Lines[-1] -cmatch "^NEAR CAP: agent $id is at 330002 tokens .*\(warning size 300000\)") "from the type: $($run.Lines)"
    # The type's entry differs from the passed size, so only a -WarnTokens that really wins gives 320000.
    $passed = Invoke-Script $AgentWatch ($common + @('-AgentType', 'software-developer', '-WarnTokens', '320000', '-ConfigPath', (New-TestConfig @{ 'contextCaps.software-developer.warn' = 300000 })))
    Assert-True ($passed.Lines[-1] -cmatch '\(warning size 320000\)') "a passed -WarnTokens wins over -AgentType: $($passed.Lines)"
    $passedNoType = Invoke-Script $AgentWatch ($common + @('-WarnTokens', '320000', '-ConfigPath', (New-TestConfig @{ 'contextCaps.software-developer.warn' = 300000 })))
    Assert-True ($passedNoType.Lines[-1] -cmatch '\(warning size 320000\)') "a passed -WarnTokens wins over the meta's type: $($passedNoType.Lines)"
    $missing = Invoke-Script $AgentWatch ($common + @('-AgentType', 'task-lead', '-ConfigPath', (New-TestConfig @{ 'contextCaps.task-lead.warn' = $null })))
    Assert-Equal 1 $missing.ExitCode "exit code ($($missing.Lines))"
    Assert-True ($missing.Lines[-1] -cmatch "^WATCH FAILED: .*no key 'contextCaps\.task-lead\.warn'") "names the key: $($missing.Lines)"
}

Test-Case 'agent size and stall watch: the agent type comes from the meta file; no file, no field or an empty one is default; an unreadable one is not known yet' {
    $folder = Join-Path $WorkRoot "agent-meta-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $folder | Out-Null
    $write = { param($name, $text) $path = Join-Path $folder $name; Write-Lines $path @($text); $path }
    Assert-Equal 'task-lead' (Get-MetaAgentType (& $write 'typed.meta.json' '{"agentType":"task-lead","finished":true}')) 'from the meta file'
    Assert-Equal 'default' (Get-MetaAgentType (Join-Path $folder 'none.meta.json')) 'no meta file'
    Assert-Equal 'default' (Get-MetaAgentType (& $write 'bare.meta.json' '{"description":"x"}')) 'no agentType field'
    Assert-Equal 'default' (Get-MetaAgentType (& $write 'empty.meta.json' '{"agentType":""}')) 'an empty agentType'
    Assert-True ($null -eq (Get-MetaAgentType (& $write 'half.meta.json' '{"agentType":"task-le'))) 'a half-written meta file is not known yet'
}

Test-Case 'agent size and stall watch run: without -AgentType the type comes from the meta file; -AgentType overrides it; with neither, default' {
    $now = [DateTimeOffset]::Now
    $typed = New-AgentId; $bare = New-AgentId; $lead = New-AgentId; $half = New-AgentId
    $fixture = New-FixtureSession @(New-ReplyLine $now '') @(
        @{ Id = $typed; Type = 'software-developer'; Lines = @(New-ReplyLine $now $typed -write5m 5000 -read 325000) },
        @{ Id = $bare; Lines = @(New-ReplyLine $now $bare -write5m 5000 -read 325000) },
        @{ Id = $lead; Type = 'task-lead'; Lines = @(New-ReplyLine $now $lead -write5m 5000 -read 325000) },
        @{ Id = $half; Type = 'task-lead'; Lines = @(New-ReplyLine $now $half -write5m 5000 -read 325000) })
    Write-Lines (Join-Path $fixture.Subagents "agent-$half.meta.json") @('{"agentType":"task-le')
    $config = New-TestConfig @{ 'contextCaps.software-developer.warn' = 300000; 'contextCaps.task-lead.warn' = 310000; 'contextCaps.default.warn' = 320000 }
    $common = @('-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-EverySeconds', '1', '-MaxHours', '1', '-ConfigPath', $config)
    $fromMeta = Invoke-Script $AgentWatch (@('-AgentId', $typed) + $common)
    Assert-True ($fromMeta.Lines[-1] -cmatch "^NEAR CAP: agent $typed .*\(warning size 300000\)") "the meta's type: $($fromMeta.Lines)"
    $override = Invoke-Script $AgentWatch (@('-AgentId', $typed, '-AgentType', 'task-lead') + $common)
    Assert-True ($override.Lines[-1] -cmatch '\(warning size 310000\)') "-AgentType overrides the meta: $($override.Lines)"
    $neither = Invoke-Script $AgentWatch (@('-AgentId', $bare) + $common)
    Assert-True ($neither.Lines[-1] -cmatch "^NEAR CAP: agent $bare .*\(warning size 320000\)") "no meta and no -AgentType: $($neither.Lines)"
    # A settings entry under the empty name: an unknown type must be asked for as 'default' by name, never as ''.
    $withEmptyKey = New-TestConfig @{ 'contextCaps.software-developer.warn' = 300000; 'contextCaps.task-lead.warn' = 310000; 'contextCaps.default.warn' = 320000; 'contextCaps.' = @{ warn = 1 } }
    $unread = Invoke-Script $AgentWatch (@('-AgentId', $half, '-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-EverySeconds', '1', '-MaxHours', '1', '-ConfigPath', $withEmptyKey))
    Assert-True ($unread.Lines[-1] -cmatch "^NEAR CAP: agent $half .*\(warning size 320000\)") "an unreadable meta file at the first look gives default: $($unread.Lines)"
    $noKey = Invoke-Script $AgentWatch (@('-AgentId', $lead, '-SessionId', $fixture.SessionId, '-ProjectsRoot', $fixture.ProjectsRoot, '-EverySeconds', '1', '-MaxHours', '1',
            '-ConfigPath', (New-TestConfig @{ 'contextCaps.task-lead.warn' = $null })))
    Assert-Equal 1 $noKey.ExitCode "exit code ($($noKey.Lines))"
    Assert-True ($noKey.Lines[-1] -cmatch "^WATCH FAILED: .*no key 'contextCaps\.task-lead\.warn'") "the meta's type with no warning size: $($noKey.Lines)"
}

# --- Every script: parameter names -------------------------------------------------------------------------------

"every script (parameter names)"

# The forwarders left under an old file name, as @{ Name; Target; Calls }: a script whose first line says it only
# forwards to its new script; Calls says whether it runs that script with @args. None once the main session has
# deleted them.
function Get-Forwarders {
    foreach ($file in Get-ChildItem -LiteralPath $ScriptsRoot -Filter '*.ps1') {
        $text = [IO.File]::ReadAllText($file.FullName)
        if ($text -cnotmatch '\A# Only forwards to (\S+\.ps1) ') { continue }
        $target = $Matches[1]
        [pscustomobject]@{ Name = $file.Name; Target = $target; Calls = $text.Contains("`n& (Join-Path `$PSScriptRoot '$target') @args;") }
    }
}

# For each script a misspelled parameter (never a prefix of a real one, which PowerShell would take for that one) and
# arguments that keep the script harmless should it run after all: a settings file that does not exist, a project
# folder that does not exist, no real probe, no real limit-stop server, no task, no window.
function Get-MisspelledCalls {
    $noConfig = Join-Path $WorkRoot 'no-such-config.json'
    $noFolder = Join-Path $WorkRoot 'no-such-project'
    $emptyProjects = Join-Path $WorkRoot "projects-empty-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $emptyProjects | Out-Null
    $session = [guid]::NewGuid().ToString()
    $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.txt"))
    $script:CleanUp.Add((Join-Path ([IO.Path]::GetTempPath()) "claude-session-watch-$session.decision.json"))
    $calls = [ordered]@{
        'run-heavy.ps1'               = @{ Misspelled = @('-MinFreMB', '1'); Arguments = @('-Command', 'exit 0', '-ConfigPath', $noConfig) }
        'schedule-relaunch.ps1'       = @{ Misspelled = @('-DryRunn'); Arguments = @('-ProjectDir', $noFolder, '-HandoverPath', (Join-Path $noFolder 'HANDOVER_CLAUDE.md'), '-At', 'now', '-ConfigPath', $noConfig) }
        'start-session-in-vscode.ps1' = @{ Misspelled = @('-ContextCapp'); Arguments = @('-ProjectDir', $noFolder, '-Prompt', 'x', '-DryRun', '-LogPath', (Join-Path $WorkRoot 'misspelled-start.log'), '-ConfigPath', $noConfig) }
        'usage-probe.ps1'             = @{ Misspelled = @('-FreshMinuts', '1'); Arguments = @('-ConfigPath', $noConfig, '-StatePath', (Join-Path $WorkRoot 'misspelled-usage.json'), '-ClaudePath', (Join-Path $noFolder 'claude.exe')) }
        'watch-agent-size-and-stall.ps1' = @{ Misspelled = @('-AgentTipe', 'task-lead'); Arguments = @('-AgentId', (New-AgentId), '-SessionId', $session, '-ProjectsRoot', $emptyProjects, '-WarnTokens', '1', '-MaxHours', '0') }
        'watch-decision-answers.ps1'  = @{ Misspelled = @('-LookSeconsd', '1'); Arguments = @('-Root', $noFolder, '-ConfigPath', $noConfig) }
        'watch-usage-and-context.ps1' = @{ Misspelled = @('-RetryMinuts', '1'); Arguments = @('-SessionId', $session, '-ProjectsRoot', $emptyProjects, '-ClaudePid', '0', '-EverySeconds', '1', '-ConfigPath', $noConfig, '-UsageReadingPath', $NoReading, '-StopServerScript', $StubServer) }
    }
    # A forwarder gets its new script's case: the misspelled parameter must reach that script and fail there.
    foreach ($forwarder in Get-Forwarders) { $calls[$forwarder.Name] = $calls[$forwarder.Target] }
    return $calls
}

Test-Case 'every script: a misspelled parameter fails before the script runs a line (D-0007)' {
    $calls = Get-MisspelledCalls
    $scripts = @(Get-ChildItem -LiteralPath $ScriptsRoot -Filter '*.ps1' | ForEach-Object Name | Sort-Object)
    Assert-Equal ($scripts -join ', ') (@($calls.Keys | Sort-Object) -join ', ') 'a case for every script in the folder'
    foreach ($name in $calls.Keys) {
        $case = $calls[$name]
        $run = Invoke-Script (Join-Path $ScriptsRoot $name) ($case.Arguments + $case.Misspelled)
        $wrong = $case.Misspelled[0].Substring(1)
        Assert-True (-not $run.TimedOut) "$name ended"
        Assert-Equal 1 $run.ExitCode "$name exit code (printed: $($run.Lines))"
        Assert-Equal 0 $run.Lines.Count "$name printed nothing, so it ran nothing: $($run.Lines)"
        Assert-True ($run.Err -cmatch "A parameter cannot be found that matches parameter name '$wrong'") "$name names -$wrong on stderr: $($run.Err)"
    }
}

Test-Case 'relaunch: beside an otherwise valid dry run, a misspelled parameter registers nothing and prints nothing (D-0007)' {
    $handover = Join-Path $WorkRoot 'HANDOVER_CLAUDE.md'; Write-Lines $handover @('# hand-over')
    $valid = @('-ProjectDir', $WorkRoot, '-HandoverPath', $handover, '-At', [DateTimeOffset]::Now.AddYears(1).ToString('o'), '-DryRun')
    $good = Invoke-Script $Schedule $valid
    Assert-True ($good.ExitCode -eq 0 -and $good.Lines[-1] -cmatch '^DRY RUN \| would register ') "the valid call alone is a dry run: $($good.Lines)"
    $run = Invoke-Script $Schedule ($valid + @('-ExpireAfterHrs', '2'))
    Assert-Equal 1 $run.ExitCode "exit code (printed: $($run.Lines))"
    Assert-Equal 0 $run.Lines.Count "no DRY RUN line, no SCHEDULED line: $($run.Lines)"
    Assert-True ($run.Err -cmatch "A parameter cannot be found that matches parameter name 'ExpireAfterHrs'") "names it: $($run.Err)"
}

Test-Case 'every script: its param block declares [CmdletBinding()] (D-0007)' {
    # A forwarder holds no param block, so that @args passes every argument on to its new script.
    $forwarders = @(Get-Forwarders | ForEach-Object Name)
    foreach ($file in Get-ChildItem -LiteralPath $ScriptsRoot -Filter '*.ps1' | Where-Object { $forwarders -notcontains $_.Name }) {
        $tree = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$null, [ref]$null)
        $bound = @($tree.ParamBlock.Attributes | Where-Object { $_.TypeName.Name -ceq 'CmdletBinding' })
        Assert-Equal 1 $bound.Count "$($file.Name) declares [CmdletBinding()]"
    }
}

Test-Case 'forwarders: an old file name gives the output and exit code of its new script, for as long as it is left' {
    $agent = New-AgentId
    $settings = New-TestConfig @{}
    $noConfig = Join-Path $WorkRoot 'no-such-config.json'
    # Per new script: argument lists for a fixture, and the exit code each must give.
    $cases = @{
        'watch-usage-and-context.ps1'    = @(
            @{ Exit = 0; Arguments = { param($f) (Get-WatchArguments $f $settings $NoReading) + @('-WarnTokens', '1000') } },
            @{ Exit = 1; Arguments = { param($f) @('-SessionId', 'no-such-session', '-ProjectsRoot', $f.ProjectsRoot, '-ClaudePid', '0', '-ConfigPath', $settings) } })
        'watch-agent-size-and-stall.ps1' = @(
            @{ Exit = 0; Arguments = { param($f) @('-AgentId', $agent, '-SessionId', $f.SessionId, '-ProjectsRoot', $f.ProjectsRoot, '-WarnTokens', '1000', '-EverySeconds', '1') } },
            @{ Exit = 0; Arguments = { param($f) @('-AgentId', $agent, '-SessionId', $f.SessionId, '-ProjectsRoot', $f.ProjectsRoot, '-WarnTokens', '1000', '-MaxHours', '0') } },
            @{ Exit = 1; Arguments = { param($f) @('-AgentId', $agent, '-SessionId', $f.SessionId, '-ProjectsRoot', $f.ProjectsRoot, '-AgentType', 'task-lead', '-ConfigPath', $noConfig) } })
    }
    foreach ($forwarder in Get-Forwarders) {
        Assert-True $forwarder.Calls "$($forwarder.Name) runs $($forwarder.Target) with @args"
        Assert-True ($cases.Contains($forwarder.Target)) "a case for $($forwarder.Target)"
        foreach ($case in $cases[$forwarder.Target]) {
            $runs = foreach ($file in $forwarder.Target, $forwarder.Name) {
                # A fixture each: the Usage and context watch keeps a decision record per session.
                $fixture = New-FixtureSession @(New-ReplyLine ([DateTimeOffset]::Now) '' -read 395000) @(@{ Id = $agent; Type = 'software-developer'; Lines = @(New-ReplyLine ([DateTimeOffset]::Now) $agent -read 300000) })
                $run = Invoke-Script (Join-Path $ScriptsRoot $file) (& $case.Arguments $fixture)
                $text = ($run.Lines -join "`n").Replace($fixture.SessionId, '<session>').Replace($fixture.ProjectsRoot, '<projects>')
                [pscustomobject]@{ ExitCode = $run.ExitCode; Text = $text -creplace '\b\d\d:\d\d\b', '<time>' }
            }
            Assert-Equal $case.Exit $runs[0].ExitCode "$($forwarder.Target) exit code (printed: $($runs[0].Text))"
            Assert-True ($runs[0].Text.Length -gt 0) "$($forwarder.Target) printed its lines"
            Assert-Equal $runs[0].ExitCode $runs[1].ExitCode "$($forwarder.Name) exit code (printed: $($runs[1].Text))"
            Assert-Equal $runs[0].Text $runs[1].Text "$($forwarder.Name) output"
        }
    }
}

Test-Case 'relaunch: the task''s argument line binds to the real start script, after a usage limit and after the context cap' {
    $folder = Join-Path $WorkRoot "NoWindowRoundTrip$([guid]::NewGuid().ToString('N').Substring(0, 6))"
    New-Item -ItemType Directory -Force $folder | Out-Null
    foreach ($cap in $false, $true) {
        $line = Get-RelaunchArguments (Join-Path $ScriptsRoot 'start-session-in-vscode.ps1') $folder 'Read C:\x\HANDOVER_CLAUDE.md and carry on.' $cap
        # pwsh's own -WindowStyle Hidden is left out: it would hide the console this test shares. Only the start
        # script's names are under test.
        Assert-True ($line.StartsWith('-NoProfile -WindowStyle Hidden -File ', [StringComparison]::Ordinal)) "the line opens with pwsh's own options: $line"
        $log = Join-Path $WorkRoot "round-trip-$cap.log"
        $info = [Diagnostics.ProcessStartInfo]::new((Join-Path $PSHOME 'pwsh.exe'), "-NoProfile -NonInteractive $($line.Substring('-NoProfile -WindowStyle Hidden '.Length)) -DryRun -LogPath $(ConvertTo-WindowsArgument $log)")
        $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true; $info.UseShellExecute = $false
        $process = [Diagnostics.Process]::Start($info)
        $out = $process.StandardOutput.ReadToEndAsync(); $err = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(30000)) { $process.Kill(); throw "the dry run (cap $cap) did not end" }
        Assert-Equal 0 $process.ExitCode "exit code (cap $cap; err: $($err.Result))"
        Assert-Equal '' $err.Result "no binding error (cap $cap)"
        $cause = if ($cap) { 'the session has handed over at its context cap' } else { 'the limit has reset' }
        $text = ($out.Result -csplit "`r?`n") -join ' '
        Assert-True ($text -cmatch "step 3: would open nothing.*Claude: $cause, but the window of NoWindowRoundTrip.*Read C:\\x\\HANDOVER_CLAUDE\.md and carry on\.") "the prompt and the cause arrive (cap $cap): $text"
    }
}

Test-Case 'watch: its call of usage-probe.ps1 passes only parameters the probe has' {
    $probeNames = @([Management.Automation.Language.Parser]::ParseFile($Probe, [ref]$null, [ref]$null).ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
    $tree = [Management.Automation.Language.Parser]::ParseFile($Watch, [ref]$null, [ref]$null)
    $calls = @($tree.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] -and $node.CommandElements[0].Extent.Text -ceq '$probe' }, $true))
    Assert-Equal 1 $calls.Count 'one call of the probe'
    $passed = @($calls[0].CommandElements | Where-Object { $_ -is [Management.Automation.Language.CommandParameterAst] } | ForEach-Object ParameterName)
    Assert-True ($passed.Count -ge 1) "names passed: $($passed -join ', ')"
    foreach ($name in $passed) { Assert-True ($probeNames -contains $name) "usage-probe.ps1 has -$name (it has $($probeNames -join ', '))" }
}

# --- Teardown ----------------------------------------------------------------------------------------------------

foreach ($path in $script:CleanUp) { Remove-Item -LiteralPath $path -ErrorAction SilentlyContinue }
# Windows finishes deleting a file a moment after the call returns, so a folder can still look full when its own turn
# comes ("The directory is not empty"); a second pass removes what the first left.
foreach ($pass in 1, 2) {
    if (Test-Path -LiteralPath $WorkRoot) { Remove-Item -LiteralPath $WorkRoot -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $WorkRoot) { Start-Sleep -Seconds 1 }
}
if (Test-Path -LiteralPath $WorkRoot) { "  note: could not remove the work folder $WorkRoot" }
""
"$($script:Passed) passed, $($script:Failed) failed"
exit $script:Failed
