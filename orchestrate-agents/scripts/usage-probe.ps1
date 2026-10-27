# Asks the API how much of the account's usage limits is used: one tiny Claude Code call on the cheapest model at
# the configured effort (usageLimits.probeModel and probeEffort), whose stream carries a rate_limit_event with the five-hour and the weekly window. Prints one JSON line and writes
# it atomically to the state file that every Usage and context watch on this machine reads:
#
#   {"checkedAt":"<ISO>","fiveHour":{"percent":10,"resetsAt":"<ISO>"},"weekly":{"percent":47,"resetsAt":"<ISO>"}}
#
# A window the answer lacks is null. On failure it prints one line starting with USAGE PROBE FAILED, exits 1 and
# writes nothing. Each run costs one small call (about 7 thousand cache-write tokens on Haiku, measured 2026-10-25).
# A reading in the state file younger than -FreshMinutes is printed as it is instead, without a call, so several
# watches share one call.
#
#   & '<skill>\scripts\usage-probe.ps1' [-FreshMinutes <minutes>]
#
# The call runs in its own empty folder, without CLAUDE.md files, MCP servers or tools, and without the variables
# that tie a shell to the Claude Code session it came from, so it cannot reach that session. Its own transcript is
# not kept (--no-session-persistence), or, on a version without that flag, deleted afterwards. Every parameter left
# out comes from orchestration.config.json (usageLimits); every setting is read before claude is started.
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007).
[CmdletBinding()]
param(
    # The orchestration settings: the probe model and effort, the state file, the working folder, the timeout and
    # the fresh age.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
    # Where the reading is written. Default: usageLimits.stateFile, under teamState.folder. watch-usage-and-context.ps1
    # passes its own state path here.
    [string]$StatePath,
    # The empty folder the call runs in. Default: usageLimits.probeWorkingFolder, under teamState.folder.
    [string]$WorkingFolder,
    # The claude executable. Empty: the one on PATH.
    [string]$ClaudePath = '',
    # How long the call may take before it is stopped and the probe fails. Default: usageLimits.probeTimeoutSeconds.
    [int]$TimeoutSeconds,
    # A reading in the state file taken less than this many minutes ago is printed as it is and claude is not
    # called; 0 always calls. Default: usageLimits.stateFreshMinutes.
    [int]$FreshMinutes,
    # Where Claude Code keeps transcripts; only used when the probe's transcript must be deleted.
    [string]$ProjectsRoot = (Join-Path $env:USERPROFILE '.claude\projects'),
    # The variables a Claude Code shell carries that bind a child to the calling session (its id, its messaging
    # socket); they are removed from the call's environment.
    [string[]]$SessionVariables = @('CLAUDECODE', 'CLAUDE_PID', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION',
        'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_ENTRYPOINT',
        'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_AGENT_SDK_VERSION')
)

# --- Settings ----------------------------------------------------------------------------------------------------

# The orchestration settings file, parsed. A missing file is an error that names it.
function Read-OrchestrationConfig([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "The settings file $path does not exist." }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
}

# One value of the settings by its dotted key ('usageLimits.probeModel'). A missing key is an error that names it.
function Get-ConfigValue($config, [string]$key, [string]$path) {
    $node = $config
    foreach ($part in $key.Split('.')) {
        if ($node -isnot [Collections.IDictionary] -or -not $node.Contains($part)) { throw "$path has no key '$key'." }
        $node = $node[$part]
    }
    return , $node
}

# One setting by its dotted key, read the way lib\config.mjs requireSetting reads it: a part that is missing, spelled
# in another case, or null is an error in that function's words, so this script and the Node code say the same.
function Get-RequiredSetting($config, [string]$key) {
    $node = $config
    foreach ($part in $key.Split('.')) {
        if ($node -isnot [Collections.IDictionary] -or -not ($node.Keys -ccontains $part) -or $null -eq $node[$part]) {
            throw "orchestration.config.json has no setting '$key'"
        }
        $node = $node[$part]
    }
    return , $node
}

# Why a path under teamState.folder is refused, or $null when it is not: the first rule of lib\config.mjs
# STATE_PATH_RULES it breaks, in that order and in those words. '\z' stands for JavaScript's '$': .NET's '$' also
# matches before a final line feed.
function Get-StatePathFault([string]$value) {
    $parts = $value.Split('\')
    if ($value -ceq '') { return 'is empty' }
    if ($value.Contains(':')) { return "has a drive or a ':'" }
    if ($value -cmatch '^[\\/]|[\\/]\z') { return "starts or ends with '\' or '/'" }
    if ($value.Contains('/')) { return "has a '/'; parts are joined by '\'" }
    if ($value -cmatch '[*?"<>|%]') { return 'has one of * ? " < > | %' }
    if ($parts -ccontains '') { return 'has an empty part' }
    if ($parts -ccontains '.' -or $parts -ccontains '..') { return "has a '.' or '..' part" }
    return $null
}

# The absolute path of a file or folder of the team's own from its setting: the root teamState.folder (each %NAME%
# filled in from the environment, then absolute: a drive letter, ':' and '\') joined with the setting, one or more
# plain names joined by '\', so it never points outside the root. A copy of lib\config.mjs requireStatePath: the same
# checks in the same order, refused in the same words. The join tidies the root as Node's path.join does (doubled
# separators, '/', '.' and '..' parts); [IO.Path]::GetFullPath would also drop the trailing dots and spaces of a name,
# and Join-Path fails on a drive that does not exist.
function Get-StatePath($config, [string]$key) {
    $root = Get-RequiredSetting $config 'teamState.folder'
    if ($root -isnot [string] -or $root -ceq '') {
        throw "orchestration.config.json setting 'teamState.folder' must be a path, not $(ConvertTo-Json -InputObject $root -Compress -Depth 10)"
    }
    foreach ($found in [regex]::Matches($root, '%([^%]+)%')) {
        if (-not [Environment]::GetEnvironmentVariable($found.Groups[1].Value)) {
            throw "orchestration.config.json setting 'teamState.folder' names $($found.Value), which is not set"
        }
    }
    $root = [regex]::Replace($root, '%([^%]+)%', { param($found) [Environment]::GetEnvironmentVariable($found.Groups[1].Value) })
    if ($root -cnotmatch '^[A-Za-z]:\\') {
        throw "orchestration.config.json setting 'teamState.folder' must be an absolute path (a drive letter, ':' and '\'), not $(ConvertTo-Json -InputObject $root -Compress)"
    }
    $value = Get-RequiredSetting $config $key
    if ($value -isnot [string]) {
        throw "orchestration.config.json setting '$key' must be text, a path under 'teamState.folder', not $(ConvertTo-Json -InputObject $value -Compress -Depth 10)"
    }
    $fault = Get-StatePathFault $value
    if ($fault) {
        throw "orchestration.config.json setting '$key' must be a path under 'teamState.folder' but ${fault}: $(ConvertTo-Json -InputObject $value -Compress)"
    }
    $names = [Collections.Generic.List[string]]::new()
    foreach ($name in $root.Substring(3) -csplit '[\\/]') {
        if ($name -ceq '..') { if ($names.Count -gt 0) { $names.RemoveAt($names.Count - 1) } }
        elseif ($name -cne '' -and $name -cne '.') { $names.Add($name) }
    }
    $names.Add($value)
    return $root.Substring(0, 3) + ($names -join '\')
}

# --- The call ----------------------------------------------------------------------------------------------------

# The arguments of the measured probe call (plan section 2) at the configured effort: one turn, no tools, no MCP
# servers, streamed JSON so the rate_limit_event line comes through.
function Get-ProbeArguments([string]$model, [string]$effort, [bool]$noPersistence) {
    $arguments = @('-p', 'Reply with OK.', '--model', $model, '--effort', $effort, '--output-format', 'stream-json', '--verbose',
        '--max-turns', '1', '--strict-mcp-config', '--tools', '')
    if ($noPersistence) { $arguments += '--no-session-persistence' }
    return , $arguments
}

# Removes the session-binding variables from a child's environment and turns CLAUDE.md files off.
function Set-ProbeEnvironment([Diagnostics.ProcessStartInfo]$info, [string[]]$removeNames) {
    foreach ($name in $removeNames) { $null = $info.Environment.Remove($name) }
    $info.Environment['CLAUDE_CODE_DISABLE_CLAUDE_MDS'] = '1'
}

# Runs a program with an argument list (no shell in between) and returns its exit code and output lines. A run past
# the timeout is stopped (only that process, which this script started) and reported as timed out.
function Invoke-Program([string]$program, [string[]]$arguments, [string]$folder, [string[]]$removeNames, [int]$timeoutSeconds) {
    $info = [Diagnostics.ProcessStartInfo]::new($program)
    foreach ($argument in $arguments) { $info.ArgumentList.Add($argument) }
    $info.WorkingDirectory = $folder
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.UTF8Encoding]::new($false)
    Set-ProbeEnvironment $info $removeNames
    $process = [Diagnostics.Process]::Start($info)
    $out = $process.StandardOutput.ReadToEndAsync()
    $err = $process.StandardError.ReadToEndAsync()
    $finished = $process.WaitForExit($timeoutSeconds * 1000)
    if (-not $finished) { $process.Kill(); $process.WaitForExit() }
    return [pscustomobject]@{
        TimedOut = -not $finished
        ExitCode = $process.ExitCode
        Lines    = @($out.Result -csplit "`r?`n" | Where-Object { $_ -ne '' })
        Error    = $err.Result.Trim()
    }
}

# Whether `claude --help` lists a flag, as a whole word.
function Test-HelpListsFlag([string]$claude, [string]$flag, [string]$folder, [string[]]$removeNames, [int]$timeoutSeconds) {
    $help = Invoke-Program $claude @('--help') $folder $removeNames $timeoutSeconds
    return [bool]($help.Lines | Where-Object { $_ -cmatch "(^|\s)$([regex]::Escape($flag))(\s|$)" })
}

# --- The reading -------------------------------------------------------------------------------------------------

# One window of the event ({utilization 0-1, resetsAt epoch seconds}) as {percent, resetsAt ISO}, or $null when the
# window or either value is missing.
function ConvertTo-UsageWindow($window) {
    if ($window -isnot [Collections.IDictionary] -or $null -eq $window['utilization'] -or $null -eq $window['resetsAt']) { return $null }
    $resets = [DateTimeOffset]::FromUnixTimeSeconds([long]$window['resetsAt']).ToLocalTime()
    return [ordered]@{
        percent  = [Math]::Round([double]$window['utilization'] * 100, 1)
        resetsAt = $resets.ToString("yyyy-MM-dd'T'HH:mm:sszzz", [Globalization.CultureInfo]::InvariantCulture)
    }
}

# The reading from the call's output lines: the first rate_limit_event line, read. Returns $null when there is none.
function ConvertFrom-ProbeOutput([string[]]$lines, [DateTimeOffset]$checkedAt) {
    foreach ($line in $lines) {
        if (-not $line.Contains('"type":"rate_limit_event"')) { continue }
        try { $record = $line | ConvertFrom-Json -AsHashtable } catch { continue }
        if ($record['type'] -cne 'rate_limit_event' -or $record['rate_limit_info'] -isnot [Collections.IDictionary]) { continue }
        $windows = $record['rate_limit_info']['unifiedWindows']
        if ($windows -isnot [Collections.IDictionary]) { $windows = @{} }
        return [ordered]@{
            checkedAt = $checkedAt.ToLocalTime().ToString("yyyy-MM-dd'T'HH:mm:sszzz", [Globalization.CultureInfo]::InvariantCulture)
            fiveHour  = ConvertTo-UsageWindow $windows['five_hour']
            weekly    = ConvertTo-UsageWindow $windows['seven_day']
        }
    }
    return $null
}

# The text of the reading in the state file when it can be read and was taken less than $minutes before $now, else
# $null. With $minutes 0 or less there is never one.
function Get-FreshReadingText([string]$path, [int]$minutes, [DateTimeOffset]$now) {
    if ($minutes -le 0 -or -not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    try {
        $text = [IO.File]::ReadAllText($path)
        $checkedAt = [DateTimeOffset]::Parse(($text | ConvertFrom-Json -AsHashtable -DateKind String)['checkedAt'], [Globalization.CultureInfo]::InvariantCulture)
    }
    catch { return $null }
    if (($now - $checkedAt).TotalMinutes -lt $minutes) { return $text }
    return $null
}

# The reading as the one JSON line the probe prints and writes.
function ConvertTo-ReadingJson($reading) {
    return $reading | ConvertTo-Json -Compress -Depth 5
}

# Writes text to a file so a reader sees the old content or the new, never half: a temp file beside it, then a rename.
function Write-FileAtomically([string]$path, [string]$text) {
    $folder = Split-Path -Parent $path
    New-Item -ItemType Directory -Force $folder | Out-Null
    $temp = Join-Path $folder ".$([IO.Path]::GetFileName($path)).$PID.tmp"
    [IO.File]::WriteAllText($temp, $text, [Text.UTF8Encoding]::new($false))
    [IO.File]::Move($temp, $path, $true)
}

# --- Cleaning up after a version without --no-session-persistence -----------------------------------------------

# The name Claude Code gives a working folder's transcript folder: every character that is not a letter or digit
# becomes a dash ('C:\Temp\x' -> 'C--Temp-x').
function Get-ProjectFolderName([string]$folder) {
    return $folder -creplace '[^A-Za-z0-9]', '-'
}

# Deletes the newest transcript written since the probe started in the working folder's transcript folder, and
# returns its path, or $null when there is none.
function Remove-ProbeTranscript([string]$projectsRoot, [string]$workingFolder, [DateTime]$since) {
    $name = Get-ProjectFolderName $workingFolder
    $folder = Get-ChildItem -LiteralPath $projectsRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if (-not $folder) { return $null }
    $newest = Get-ChildItem -LiteralPath $folder.FullName -Filter '*.jsonl' -File |
        Where-Object { $_.LastWriteTime -ge $since } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $newest) { return $null }
    Remove-Item -LiteralPath $newest.FullName
    return $newest.FullName
}

# --- The probe ---------------------------------------------------------------------------------------------------

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

try {
    $config = Read-OrchestrationConfig $ConfigPath
    $model = Get-ConfigValue $config 'usageLimits.probeModel' $ConfigPath
    $effort = Get-ConfigValue $config 'usageLimits.probeEffort' $ConfigPath
    if (-not $PSBoundParameters.ContainsKey('StatePath')) { $StatePath = Get-StatePath $config 'usageLimits.stateFile' }
    if (-not $PSBoundParameters.ContainsKey('WorkingFolder')) { $WorkingFolder = Get-StatePath $config 'usageLimits.probeWorkingFolder' }
    if (-not $PSBoundParameters.ContainsKey('TimeoutSeconds')) { $TimeoutSeconds = Get-ConfigValue $config 'usageLimits.probeTimeoutSeconds' $ConfigPath }
    if (-not $PSBoundParameters.ContainsKey('FreshMinutes')) { $FreshMinutes = Get-ConfigValue $config 'usageLimits.stateFreshMinutes' $ConfigPath }
}
catch {
    "USAGE PROBE FAILED | $($_.Exception.Message)"
    exit 1
}
$stored = Get-FreshReadingText $StatePath $FreshMinutes ([DateTimeOffset]::Now)
if ($stored) {
    $stored
    exit 0
}
try {
    $claude = if ($ClaudePath) { $ClaudePath } else { (Get-Command claude -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source }
    New-Item -ItemType Directory -Force $WorkingFolder | Out-Null
    $started = Get-Date
    $noPersistence = Test-HelpListsFlag $claude '--no-session-persistence' $WorkingFolder $SessionVariables $TimeoutSeconds
    $run = Invoke-Program $claude (Get-ProbeArguments $model $effort $noPersistence) $WorkingFolder $SessionVariables $TimeoutSeconds
    if (-not $noPersistence) { $null = Remove-ProbeTranscript $ProjectsRoot $WorkingFolder $started }
}
catch {
    "USAGE PROBE FAILED | $($_.Exception.Message)"
    exit 1
}
if ($run.TimedOut) {
    "USAGE PROBE FAILED | claude did not answer within $TimeoutSeconds seconds; it was stopped."
    exit 1
}
$reading = ConvertFrom-ProbeOutput $run.Lines ([DateTimeOffset]::Now)
if (-not $reading) {
    $why = if ($run.Error) { $run.Error.Split("`n")[0].Trim() } else { "$($run.Lines.Count) output lines" }
    "USAGE PROBE FAILED | claude exited with $($run.ExitCode) and gave no rate_limit_event ($why)."
    exit 1
}
$json = ConvertTo-ReadingJson $reading
try {
    Write-FileAtomically $StatePath $json
}
catch {
    "USAGE PROBE FAILED | the reading could not be written to ${StatePath}: $($_.Exception.Message)"
    exit 1
}
$json
exit 0
