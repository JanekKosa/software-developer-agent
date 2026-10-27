# The Usage and context watch. Watches the Claude Code session it was started from and ends when that session should
# act. A background task that ends wakes the session that started it, so ending is how this script speaks. Its first
# line says why:
#   SESSION NEAR CAP       the context has passed the warning size, so the session must write its hand-over now and
#                          schedule the next chat: the watch has started limit-stop-server.mjs for the context cap,
#                          which tells every agent of the session to stop at its next tool call (the next line is the
#                          server's own; when it did not start, LIMIT STOP SERVER FAILED follows; the last line says
#                          what to do, with the relaunch command). The context-guard hook may have said the same after
#                          a tool call;
#   SESSION RESUMED        the usage limit or a server error stopped the session, and the limit has reset or the
#                          wait is over, so the session can carry on;
#   WATCH ALREADY RUNNING  another watch has this session already;
#   WATCH FAILED           the session's transcript was not found, or a setting is missing;
#   LIMIT NEAR | HAND OVER the five-hour or weekly usage limit has passed its threshold and some agent's cached
#                          context would run out before the limit resets: the watch has started limit-stop-server.mjs,
#                          which tells every agent of the session to stop at its next tool call (the next line is the
#                          server's own: STARTED, RUNNING ALREADY or NOT STARTED, then LIMIT STOP SERVER FAILED when it
#                          did not start); wait for the leads, write the hand-over and schedule the relaunch (the last
#                          line says how);
#   SESSION RESET COLD     the usage limit stopped the session, has now reset, and some agent's cache ran out on the
#                          way (or a hand-over was decided before the stop): write the hand-over from disk and
#                          relaunch, instead of resuming;
#   LIMIT STOP SERVER FAILED    during a hand-over on record, the server's check says the main session must now be
#                          told that the server failed (the check logs that it told, so it says so once); the next
#                          line says to start the watch again;
#   LIMIT STOP SERVER NOT CHECKED  during a hand-over on record, the check could not say how the server stands.
#                          A watch started again does not report the same check line twice: only a changed line, or
#                          the same one after a FINE check (the decision record keeps the line reported).
# It ends without a word when the session's Claude Code process is gone (the chat was closed).
# Start it in the background (the PowerShell tool with run_in_background) at the start of a chat the user switched the
# agent team on for with /software-developer-agent (team-switch\SKILL.md), never in an ordinary chat, and
# again each time it ends, except after a hand-over that ends the session. After LIMIT NEAR or SESSION NEAR CAP start
# it again at once, before the hand-over: the hand-over on record keeps it quiet apart from checking the limit-stop
# server at each look (limit-stop-server.mjs check), and if the limit stops the session before the hand-over is done,
# it wakes the session after the reset. It reads transcripts only. It writes its own marker and its limit decision
# (at the context cap, the cap hand-over) in its record folder (usageAndContextWatch.recordFolder, under
# teamState.folder), starts the limit-stop server at a hand-over (the server
# has no end time: it ends when the main session stops it after the hand-over, or when the session's Claude Code
# process is gone), and runs usage-probe.ps1 (which writes the shared usage reading) when that
# reading is older than stateFreshMinutes (near a threshold, probeNearEveryMinutes) and the session or one of its
# agents wrote since it was taken. Its settings are in orchestration.config.json; a parameter passed wins.
#
#   & "$HOME\.claude\software-developer-agent\orchestrate-agents\scripts\watch-usage-and-context.ps1"
#   with the task description "Usage and context watch", the name the user sees in the task list.
#
# It needs no arguments: Claude Code gives its shell the session id (CLAUDE_CODE_SESSION_ID) and its own process id
# (CLAUDE_PID). A subagent's shell carries the main session's id too, so only the main session starts it.
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007).
[CmdletBinding()]
param(
    # The session to watch.
    [string]$SessionId = $env:CLAUDE_CODE_SESSION_ID,
    # The Claude Code process of that session.
    [int]$ClaudePid = [int]$env:CLAUDE_PID,
    # The context size, in tokens, at which the session is told to hand over. Default: contextCaps.main.warn.
    [int]$WarnTokens,
    # The kinds of API error that stop a session for a while, so waking it later helps. Default:
    # usageAndContextWatch.wakeOnErrors.
    [string[]]$WakeOnErrors,
    # How long after the reset time a usage-limit message names to wake the session. Default:
    # usageAndContextWatch.resetMarginMinutes.
    [int]$ResetMarginMinutes,
    # How long after any other such error to wake the session, including a limit message with no readable reset time.
    # Default: usageAndContextWatch.retryMinutes.
    [int]$RetryMinutes,
    # How often to look. Default: usageAndContextWatch.everySeconds.
    [int]$EverySeconds,
    # How much of the end of the transcript to read, in MB. Default: usageAndContextWatch.tailMegabytes.
    [int]$TailMegabytes,
    # Where Claude Code keeps its transcripts, one folder per working directory.
    [string]$ProjectsRoot = (Join-Path $env:USERPROFILE '.claude\projects'),
    # The orchestration settings: the usage-limit thresholds, probe intervals, resume margin, ignored agent types and
    # the watch's own settings.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
    # The latest usage reading, which usage-probe.ps1 writes and every watch on this machine shares, since the limits
    # are the account's, not the session's. Default: usageLimits.stateFile, under teamState.folder.
    [string]$UsageStatePath,
    # The folder of the watch's own files for each session: its marker (<session id>.txt) and its limit decision
    # (<session id>.decision.json). Default: usageAndContextWatch.recordFolder, under teamState.folder.
    [string]$RecordFolder,
    # A usage reading to read instead of probing: the watch then never runs usage-probe.ps1. For tests.
    [string]$UsageReadingPath = '',
    # The lifetime of a cached context, in minutes: the API's 5-minute cache, which subagents get, and its 1-hour
    # cache, which the main session gets. Facts of the API, not choices.
    [int]$ShortCacheMinutes = 5,
    [int]$LongCacheMinutes = 60,
    # How many of an agent's newest replies are searched for a write to the 1-hour cache. Default:
    # usageAndContextWatch.cacheLookbackReplies.
    [int]$CacheLookbackReplies,
    # The limit-stop server script, run with node in its 'start' mode at a hand-over and its 'check' mode during one;
    # the steps name it in its 'stop' command. A stand-in, for tests.
    [string]$StopServerScript = (Join-Path $PSScriptRoot 'limit-stop-server.mjs')
)

# --- Reading the transcript --------------------------------------------------------------------------------------

# The transcript of the session: <projects>\<project-folder>\<session-id>.jsonl. The project folder is named after
# the working directory, so it is found rather than built. Returns $null when there is none.
function Find-SessionTranscript([string]$root, [string]$session) {
    foreach ($folder in Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue) {
        $candidate = Join-Path $folder.FullName "$session.jsonl"
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

# The complete lines in the last $bytes of the file, oldest first. Claude Code keeps the file open for writing, so
# it is opened shared. The first line read is cut unless the read began at the start of the file, and the last one
# is either empty or still being written, so both are dropped.
function Read-TranscriptTail([string]$path, [long]$bytes) {
    $stream = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
    try {
        $take = [Math]::Min($stream.Length, $bytes)
        $cut = $take -lt $stream.Length
        $null = $stream.Seek(-$take, 'End')
        $buffer = New-Object byte[] $take
        $stream.ReadExactly($buffer, 0, $take)
    }
    finally {
        $stream.Close()
    }
    $lines = [Text.Encoding]::UTF8.GetString($buffer).Split("`n")
    $first = if ($cut) { 1 } else { 0 }
    $last = $lines.Count - 2
    if ($last -lt $first) { return @() }
    return $lines[$first..$last]
}

# The session's own replies among the lines, newest first, parsed. Subagents keep transcripts of their own; records
# marked as a side chain, which older versions wrote into the session's file, are left out. A record can quote JSON
# whose keys differ only by case, which ConvertFrom-Json refuses unless it builds hashtables.
function Get-SessionReplies([string[]]$lines) {
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        if (-not $lines[$i].Contains('"type":"assistant"')) { continue }
        $record = $lines[$i] | ConvertFrom-Json -AsHashtable -DateKind String
        if ($record.type -eq 'assistant' -and -not $record.isSidechain) { $record }
    }
}

# The size of the session's context: the three input counts of its newest reply that carries them, added up. An
# API error is recorded as a reply whose counts are all zero, so such replies are passed over. Returns 0 when no
# reply in the lines carries counts.
function Get-ContextTokens([string[]]$lines) {
    $size = Get-SessionReplies $lines |
        ForEach-Object { Get-ReplyTokens $_ } |
        Where-Object { $_ -gt 0 } |
        Select-Object -First 1
    if ($size) { return [int]$size }
    return 0
}

# The context a reply was sent with: its three input counts added up. Zero for an API error.
function Get-ReplyTokens($reply) {
    return $reply.message.usage.input_tokens + $reply.message.usage.cache_creation_input_tokens + $reply.message.usage.cache_read_input_tokens
}

# Every reply among the lines, newest first, parsed, side chains included: a subagent's own transcript marks all of
# its records as a side chain.
function Get-AgentReplies([string[]]$lines) {
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        if (-not $lines[$i].Contains('"type":"assistant"')) { continue }
        $record = $lines[$i] | ConvertFrom-Json -AsHashtable -DateKind String
        if ($record.type -eq 'assistant') { $record }
    }
}

# The API error that ended the session's last turn: its kind (rate_limit, server_error, ...), its text and its time.
# Claude Code records a turn that the usage limit or a server error stopped as a reply marked isApiErrorMessage.
# Returns $null when the newest reply is an ordinary one.
function Get-StopError([string[]]$lines) {
    $newest = Get-SessionReplies $lines | Select-Object -First 1
    if (-not $newest -or -not $newest.isApiErrorMessage) { return $null }
    return [pscustomobject]@{
        Kind = $newest.error
        Text = $newest.message.content[0].text
        At   = [DateTimeOffset]::Parse($newest.timestamp, [Globalization.CultureInfo]::InvariantCulture)
    }
}

# --- Deciding when to wake ---------------------------------------------------------------------------------------

# When to wake a session that the error stopped: the reset time its usage-limit message names, plus the margin; or,
# when it names none, the error's own time plus the retry wait. A usage-limit stop whose message names no reset waits
# instead for a later reset on record plus the margin, so the session is not woken while the limit still holds.
# Without a record this is the retry wait, as before. Returns $null for a kind of error waiting does not cure.
function Get-WakeTime($stop, [string[]]$wakeOn, [int]$marginMinutes, [int]$retryMinutes, $record) {
    if ($wakeOn -notcontains $stop.Kind) { return $null }
    $reset = Get-LimitResetTime $stop.Text $stop.At
    if ($reset) { return $reset.AddMinutes($marginMinutes) }
    $retry = $stop.At.AddMinutes($retryMinutes)
    $recorded = Get-RecordedReset $stop $record
    if ($recorded -and $recorded.AddMinutes($marginMinutes) -gt $retry) { return $recorded.AddMinutes($marginMinutes) }
    return $retry
}

# The reset on record that stands in for a usage-limit message with no readable reset time: the recorded reset when
# the stop is the usage limit's and the reset comes after it. Returns $null otherwise.
function Get-RecordedReset($stop, $record) {
    if ($stop.Kind -ne 'rate_limit' -or -not $record -or $record.ResetsAt -le $stop.At) { return $null }
    return $record.ResetsAt
}

# The moment the usage limit lifts, read from its message ("You've hit your session limit - resets 10:10am
# (Europe/Warsaw)"): the first time of that hour and minute after the error, in the time zone the message names,
# or in this machine's zone when the message names none this machine knows. Returns $null when the message names
# no reset time.
function Get-LimitResetTime([string]$text, [DateTimeOffset]$stoppedAt) {
    $found = [regex]::Match($text, 'resets (\d{1,2})(?::(\d{2}))?(am|pm)(?: \(([^)]+)\))?', 'IgnoreCase')
    if (-not $found.Success) { return $null }
    $hour = [int]$found.Groups[1].Value % 12
    if ($found.Groups[3].Value -eq 'pm') { $hour += 12 }
    $minute = if ($found.Groups[2].Success) { [int]$found.Groups[2].Value } else { 0 }
    $zone = $null
    if (-not ($found.Groups[4].Success -and [TimeZoneInfo]::TryFindSystemTimeZoneById($found.Groups[4].Value, [ref]$zone))) {
        $zone = [TimeZoneInfo]::Local
    }
    $clockThen = [TimeZoneInfo]::ConvertTime($stoppedAt, $zone).DateTime
    $reset = $clockThen.Date.AddHours($hour).AddMinutes($minute)
    if ($reset -le $clockThen) { $reset = $reset.AddDays(1) }
    return [DateTimeOffset]::new($reset, $zone.GetUtcOffset($reset))
}

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

# The usage-limit settings the watch needs, by their names under usageLimits.
function Get-UsageLimitSettings($config, [string]$path) {
    $limits = @{}
    foreach ($name in 'fiveHourStopPercent', 'weeklyStopPercent', 'stateFreshMinutes', 'probeNearEveryMinutes',
        'probeNearWithinPercent', 'resumeMarginMinutes', 'ignoreAgentTypes') {
        $limits[$name] = Get-ConfigValue $config "usageLimits.$name" $path
    }
    return $limits
}

# The watch's own settings by parameter name: a parameter in $bound (the passed ones) as passed, else its key in the
# settings, the state file and the record folder as absolute paths under teamState.folder (Get-StatePath). A passed
# parameter's key is not needed.
function Get-WatchSettings($config, [string]$path, $bound) {
    $keys = [ordered]@{
        WarnTokens = 'contextCaps.main.warn'; WakeOnErrors = 'usageAndContextWatch.wakeOnErrors'
        ResetMarginMinutes = 'usageAndContextWatch.resetMarginMinutes'; RetryMinutes = 'usageAndContextWatch.retryMinutes'
        EverySeconds = 'usageAndContextWatch.everySeconds'; TailMegabytes = 'usageAndContextWatch.tailMegabytes'
        CacheLookbackReplies = 'usageAndContextWatch.cacheLookbackReplies'; UsageStatePath = 'usageLimits.stateFile'
        RecordFolder = 'usageAndContextWatch.recordFolder'
    }
    $settings = @{}
    foreach ($name in $keys.Keys) {
        if ($bound.ContainsKey($name)) { $settings[$name] = $bound[$name]; continue }
        $settings[$name] = if ($name -in 'UsageStatePath', 'RecordFolder') { Get-StatePath $config $keys[$name] } else { Get-ConfigValue $config $keys[$name] $path }
    }
    return $settings
}

# --- Reading the usage limits ------------------------------------------------------------------------------------

# A time written as ISO text, as an instant.
function ConvertTo-Instant([string]$text) {
    return [DateTimeOffset]::Parse($text, [Globalization.CultureInfo]::InvariantCulture)
}

# One window of a usage reading ({percent, resetsAt}) as an object, or $null when the reading has no such window.
function ConvertTo-LimitWindow($window) {
    if ($window -isnot [Collections.IDictionary]) { return $null }
    return [pscustomobject]@{ Percent = [double]$window['percent']; ResetsAt = ConvertTo-Instant $window['resetsAt'] }
}

# The usage reading usage-probe.ps1 wrote: when it was taken, and the five-hour and weekly windows. Returns $null
# when there is no reading, or when it cannot be read (with a warning).
function Read-UsageReading([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    try {
        $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable -DateKind String
        return [pscustomobject]@{
            CheckedAt = ConvertTo-Instant $raw['checkedAt']
            FiveHour  = ConvertTo-LimitWindow $raw['fiveHour']
            Weekly    = ConvertTo-LimitWindow $raw['weekly']
        }
    }
    catch {
        Write-Warning "The usage reading $path cannot be read: $($_.Exception.Message)"
        return $null
    }
}

# Whether either window is within probeNearWithinPercent points of its threshold.
function Test-NearThreshold($reading, $limits) {
    $near = $limits.probeNearWithinPercent
    return [bool](($reading.FiveHour -and $reading.FiveHour.Percent -ge $limits.fiveHourStopPercent - $near) -or
        ($reading.Weekly -and $reading.Weekly.Percent -ge $limits.weeklyStopPercent - $near))
}

# How old a reading may grow before it is renewed: stateFreshMinutes, or near a threshold the smaller of that and
# probeNearEveryMinutes. The watch probes at this age and passes it to usage-probe.ps1 as -FreshMinutes.
function Get-ProbeFreshMinutes($reading, $limits) {
    if ($reading -and (Test-NearThreshold $reading $limits)) { return [Math]::Min($limits.stateFreshMinutes, $limits.probeNearEveryMinutes) }
    return $limits.stateFreshMinutes
}

# Whether it is time to probe again. Not while the session and its agents wrote nothing since the reading was taken
# (with no reading, since the last attempt): nothing was spent, so the numbers stand. Otherwise when the reading is
# older than Get-ProbeFreshMinutes and the last attempt, which may have failed, is too; with no reading at all, the
# far interval paces the attempts. A $lastActivity of $null (not known) leaves the first rule out.
function Test-ProbeDue($reading, $lastAttempt, [DateTimeOffset]$now, $limits, $lastActivity = $null) {
    $since = if ($reading) { $reading.CheckedAt } else { $lastAttempt }
    if ($null -ne $lastActivity -and $null -ne $since -and $lastActivity -le $since) { return $false }
    $interval = Get-ProbeFreshMinutes $reading $limits
    if ($lastAttempt -and ($now - $lastAttempt).TotalMinutes -lt $interval) { return $false }
    if (-not $reading) { return $true }
    return ($now - $reading.CheckedAt).TotalMinutes -ge $interval
}

# The window at or past its threshold whose reset is still ahead, as {Name, Percent, ResetsAt}; the one that resets
# later when both are. Returns $null when none is. A window whose reset has passed belongs to a stale reading.
function Get-TrippedWindow($reading, $limits, [DateTimeOffset]$now) {
    if (-not $reading) { return $null }
    $tripped = @(
        if ($reading.FiveHour -and $reading.FiveHour.Percent -ge $limits.fiveHourStopPercent -and $reading.FiveHour.ResetsAt -gt $now) {
            [pscustomobject]@{ Name = 'five-hour'; Percent = $reading.FiveHour.Percent; ResetsAt = $reading.FiveHour.ResetsAt }
        }
        if ($reading.Weekly -and $reading.Weekly.Percent -ge $limits.weeklyStopPercent -and $reading.Weekly.ResetsAt -gt $now) {
            [pscustomobject]@{ Name = 'weekly'; Percent = $reading.Weekly.Percent; ResetsAt = $reading.Weekly.ResetsAt }
        }
    )
    if ($tripped.Count -eq 0) { return $null }
    return $tripped | Sort-Object ResetsAt | Select-Object -Last 1
}

# Runs usage-probe.ps1, which writes the shared reading unless another watch's reading is younger than
# $freshMinutes. A failed probe becomes a warning; the watch carries on with the reading it has and tries again at
# the next interval.
function Invoke-UsageProbe([string]$probe, [string]$configPath, [string]$statePath, [int]$freshMinutes) {
    $output = & $probe -ConfigPath $configPath -StatePath $statePath -FreshMinutes $freshMinutes 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Warning "usage-probe.ps1: $($output -join ' ')" }
}

# --- Reading the agents' caches ----------------------------------------------------------------------------------

# When an agent last sent a request and when its cached context runs out, from its replies (newest first): the time
# of the newest reply that carries token counts, and a lifetime of $longMinutes when any of its last $lookback such
# replies wrote to the 1-hour cache, else $shortMinutes. Returns $null when no reply carries counts.
function Get-CacheState([object[]]$replies, [int]$shortMinutes, [int]$longMinutes, [int]$lookback) {
    $recent = @($replies | Where-Object { $_ -and (Get-ReplyTokens $_) -gt 0 } | Select-Object -First $lookback)
    if ($recent.Count -eq 0) { return $null }
    $last = ConvertTo-Instant $recent[0].timestamp
    $long = @($recent | Where-Object { $_.message.usage.cache_creation.ephemeral_1h_input_tokens -gt 0 }).Count -gt 0
    $ttl = if ($long) { $longMinutes } else { $shortMinutes }
    return [pscustomobject]@{ LastRequest = $last; TtlMinutes = $ttl; ExpiresAt = $last.AddMinutes($ttl) }
}

# A subagent's type from the meta file beside its transcript, or 'unknown' when there is none.
function Get-AgentType([string]$metaPath) {
    if (-not (Test-Path -LiteralPath $metaPath -PathType Leaf)) { return 'unknown' }
    $type = (Get-Content -LiteralPath $metaPath -Raw | ConvertFrom-Json -AsHashtable)['agentType']
    if ($type) { return $type }
    return 'unknown'
}

# Whether the meta file beside a subagent's transcript says the agent has finished ("finished": true, which Claude
# Code adds when the agent ends). Only a JSON true counts; no file or no field is not finished.
function Test-AgentFinished([string]$metaPath) {
    if (-not (Test-Path -LiteralPath $metaPath -PathType Leaf)) { return $false }
    $finished = (Get-Content -LiteralPath $metaPath -Raw | ConvertFrom-Json -AsHashtable)['finished']
    return $finished -is [bool] -and $finished
}

# The agents whose caches decide between resuming and handing over, each as {Type, Id, LastRequest, TtlMinutes,
# ExpiresAt}: the main session (type 'main', its session id) and each subagent in <session>\subagents. Workflow
# agents (in subagents\workflows), ignored types and finished agents are left out, and so is an agent with no reply
# yet.
function Get-SessionAgents([string]$transcript, [string]$session, [string[]]$ignoreTypes, [long]$tailBytes, [int]$shortMinutes, [int]$longMinutes, [int]$lookback) {
    $state = Get-CacheState @(Get-SessionReplies (Read-TranscriptTail $transcript $tailBytes)) $shortMinutes $longMinutes $lookback
    if ($state) { New-AgentEntry 'main' $session $state }
    $folder = Join-Path (Split-Path -Parent $transcript) "$session\subagents"
    foreach ($file in Get-ChildItem -LiteralPath $folder -Filter 'agent-*.jsonl' -File -ErrorAction SilentlyContinue) {
        $meta = $file.FullName -creplace '\.jsonl$', '.meta.json'
        $type = Get-AgentType $meta
        if ($ignoreTypes -contains $type -or (Test-AgentFinished $meta)) { continue }
        $state = Get-CacheState @(Get-AgentReplies (Read-TranscriptTail $file.FullName $tailBytes)) $shortMinutes $longMinutes $lookback
        if ($state) { New-AgentEntry $type $file.BaseName.Substring('agent-'.Length) $state }
    }
}

# When the session or any of its agents last wrote, which is what spends the usage limits: the newest write time of
# the session's transcript and of every agent transcript under <session>\subagents, workflow agents included.
function Get-LastActivity([string]$transcript, [string]$session) {
    $folder = Join-Path (Split-Path -Parent $transcript) "$session\subagents"
    $times = @((Get-Item -LiteralPath $transcript).LastWriteTimeUtc) +
        @(Get-ChildItem -LiteralPath $folder -Filter 'agent-*.jsonl' -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object LastWriteTimeUtc)
    return [DateTimeOffset]::new(($times | Sort-Object -Descending | Select-Object -First 1))
}

# One agent with its cache state.
function New-AgentEntry([string]$type, [string]$id, $state) {
    return [pscustomobject]@{ Type = $type; Id = $id; LastRequest = $state.LastRequest; TtlMinutes = $state.TtlMinutes; ExpiresAt = $state.ExpiresAt }
}

# --- Deciding between resuming and handing over ------------------------------------------------------------------

# The decision for a limit that resets at $resetsAt: hand over when an agent that is warm at $asOf runs out of cache
# by the reset plus the margin (the time the woken session needs to reach it), or when a hand-over is on record for a
# reset still ahead of $asOf; else resume. Agents already cold at $asOf are left out: their resume costs the same
# either way. GoingCold lists the agents that decide it, the first to go cold first.
function Get-LimitDecision([object[]]$agents, [DateTimeOffset]$resetsAt, [int]$marginMinutes, [DateTimeOffset]$asOf, $record) {
    $counted = @($agents | Where-Object { $_ -and $_.ExpiresAt -gt $asOf })
    $deadline = $resetsAt.AddMinutes($marginMinutes)
    $goingCold = @($counted | Where-Object { $_.ExpiresAt -le $deadline } | Sort-Object ExpiresAt)
    $onRecord = [bool]($record -and $record.Decision -eq 'hand-over' -and $record.ResetsAt -gt $asOf)
    $decision = if ($goingCold.Count -gt 0 -or $onRecord) { 'hand-over' } else { 'resume' }
    return [pscustomobject]@{ Decision = $decision; ResetsAt = $resetsAt; Counted = $counted; GoingCold = $goingCold; OnRecord = $onRecord }
}

# For a session the usage limit stopped (an error of kind rate_limit): the decision for the reset its message names,
# taken for the agents as they were when the stop came. Without a readable reset time, the reset on record (the one
# Get-WakeTime waits for), or else the wake time, stands in. Returns $null for any other kind of stop: waiting out a
# server error is not the limit's business.
function Get-StopDecision($stop, [object[]]$agents, $record, [int]$marginMinutes, [DateTimeOffset]$wake) {
    if ($stop.Kind -ne 'rate_limit') { return $null }
    $reset = Get-LimitResetTime $stop.Text $stop.At
    if (-not $reset) { $reset = Get-RecordedReset $stop $record }
    if (-not $reset) { $reset = $wake }
    return Get-LimitDecision $agents $reset $marginMinutes $stop.At $record
}

# The file in the record folder that keeps the session's latest limit decision, so a restarted watch never takes a
# hand-over back.
function Get-DecisionRecordPath([string]$folder, [string]$session) {
    return Join-Path $folder "$session.decision.json"
}

# Writes the decision, the window that tripped and each counted agent's cache expiry.
function Write-DecisionRecord([string]$path, $decision, $window, [DateTimeOffset]$now) {
    $invariant = [Globalization.CultureInfo]::InvariantCulture
    $record = [ordered]@{
        takenAt  = $now.ToString('o', $invariant)
        decision = $decision.Decision
        window   = $window.Name
        percent  = $window.Percent
        resetsAt = if ($window.ResetsAt) { $window.ResetsAt.ToString('o', $invariant) } else { $null }
        agents   = @($decision.Counted | ForEach-Object {
                [ordered]@{
                    type = $_.Type; id = $_.Id; lastRequest = $_.LastRequest.ToString('o', $invariant); ttlMinutes = $_.TtlMinutes
                    expiresAt = $_.ExpiresAt.ToString('o', $invariant); goingCold = $decision.GoingCold -contains $_
                }
            })
    }
    [IO.File]::WriteAllText($path, ($record | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
}

# Writes the hand-over at the context cap: window context-cap, with no percent, no reset and no agents. A watch
# started again during that hand-over finds it and only checks the limit-stop server (it has no reset, so the usage
# decisions never count it as a usage hand-over).
function Write-CapRecord([string]$path, [DateTimeOffset]$now) {
    $decision = [pscustomobject]@{ Decision = 'hand-over'; Counted = @(); GoingCold = @() }
    Write-DecisionRecord $path $decision ([pscustomobject]@{ Name = 'context-cap'; Percent = $null; ResetsAt = $null }) $now
}

# The decision on record as {Decision, ResetsAt, TakenAt, ReportedCheck}, or $null when there is none or it cannot be
# read. The cap hand-over has no reset: its ResetsAt is $null. ReportedCheck is the check line a watch last reported
# during this hand-over (Set-ReportedCheck), or $null.
function Read-DecisionRecord([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    try {
        $raw = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable -DateKind String
        $resetsAt = if ($null -ne $raw['resetsAt']) { ConvertTo-Instant $raw['resetsAt'] } else { $null }
        return [pscustomobject]@{ Decision = $raw['decision']; ResetsAt = $resetsAt; TakenAt = ConvertTo-Instant $raw['takenAt']; ReportedCheck = $raw['reportedCheck'] }
    }
    catch {
        Write-Warning "The limit decision $path cannot be read: $($_.Exception.Message)"
        return $null
    }
}

# Keeps $line in the decision record as the check line reported during this hand-over, or removes it when $line is
# empty, and leaves the rest of the record as it was; a new hand-over's record starts without one. A watch started
# again then does not report the same line twice (the main session's addition, 2026-10-26: an idle session would
# otherwise be woken at every look while the cause lasts). Returns $false, with a warning, when the record cannot be
# read or written.
function Set-ReportedCheck([string]$path, [string]$line) {
    try {
        $raw = Get-Content -LiteralPath $path -Raw -ErrorAction Stop | ConvertFrom-Json -AsHashtable -DateKind String
        if ($line) { $raw['reportedCheck'] = $line } else { $raw.Remove('reportedCheck') }
        [IO.File]::WriteAllText($path, ($raw | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
        return $true
    }
    catch {
        Write-Warning "The limit decision $path cannot keep the reported check line: $($_.Exception.Message)"
        return $false
    }
}

# A moment as the watch prints it: local hours and minutes, with the date in front when it is not on the same local
# day as $now, so a weekly reset days ahead does not read as later today.
function Format-Clock([DateTimeOffset]$at, [DateTimeOffset]$now) {
    $local = $at.ToLocalTime()
    $format = if ($local.Date -eq $now.ToLocalTime().Date) { 'HH:mm' } else { 'yyyy-MM-dd HH:mm' }
    return $local.ToString($format, [Globalization.CultureInfo]::InvariantCulture)
}

# Agents as '<type> <first 8 characters of the id> at <expiry>', joined by commas.
function Format-AgentList([object[]]$agents, [DateTimeOffset]$now) {
    return ($agents | ForEach-Object { "$($_.Type) $($_.Id.Substring(0, [Math]::Min(8, $_.Id.Length))) at $(Format-Clock $_.ExpiresAt $now)" }) -join ', '
}

# The hand-over marker line: the window, its percent and reset, and the agents going cold, first first.
function Format-HandOverMarker($window, $decision, [DateTimeOffset]$now) {
    $percent = ([double]$window.Percent).ToString('0.#', [Globalization.CultureInfo]::InvariantCulture)
    $cold = if (@($decision.GoingCold).Count -gt 0) { Format-AgentList $decision.GoingCold $now } else { 'none; a hand-over is on record' }
    return "LIMIT NEAR | HAND OVER | $($window.Name) at $percent% resets $(Format-Clock $window.ResetsAt $now) | going cold: $cold"
}

# The line that ends the watch when the limit stopped the session and resuming would find some cache gone.
# $stopCommand ends the session's limit-stop server (Format-StopCommand).
function Format-ResetColdLine($stop, $decision, [DateTimeOffset]$now, [string]$scriptsFolder, [string]$stopCommand) {
    $why = if (@($decision.GoingCold).Count -gt 0) { "Going cold by then: $(Format-AgentList $decision.GoingCold $now)." } else { 'A hand-over was decided before the stop.' }
    return "SESSION RESET COLD | $($stop.Kind) stopped this session at $(Format-Clock $stop.At $now) (`"$($stop.Text)`"); the limit " +
        "reset at $(Format-Clock $decision.ResetsAt $now) and it is now $(Format-Clock $now $now). $why Do not resume any agent: write the " +
        "hand-over from the files on disk, then run & '$scriptsFolder\schedule-relaunch.ps1' -ProjectDir <project folder> " +
        "-HandoverPath <hand-over file> -At now, and in the same step stop the limit-stop server: $stopCommand. If that hand-over " +
        "is written and a relaunch is scheduled already, end the session."
}

# --- The limit stop at a hand-over -------------------------------------------------------------------------------

# Starts the limit-stop server for the session (limit-stop-server.mjs start), which then tells every agent of the
# session to stop at its next tool call, and returns the one line it printed: LIMIT STOP SERVER STARTED, RUNNING
# ALREADY or NOT STARTED. Anything else, or no node, becomes a NOT STARTED line, which the main session is told as
# LIMIT STOP SERVER FAILED before any fallback. $window is the tripped usage window, or $null for the context cap;
# the session's Claude Code process id is passed on when there is one, so the server ends with the session.
function Start-LimitStopServer([string]$script, [string]$session, $window, [int]$claudePid) {
    $arguments = @('start', '--session', $session)
    if ($window) {
        $percent = ([double]$window.Percent).ToString('0.#', [Globalization.CultureInfo]::InvariantCulture)
        $resets = $window.ResetsAt.ToString('o', [Globalization.CultureInfo]::InvariantCulture)
        $arguments += @('--window', $window.Name, '--percent', $percent, '--resets-at', $resets)
    }
    else { $arguments += @('--window', 'context-cap') }
    if ($claudePid -gt 0) { $arguments += @('--claude-pid', "$claudePid") }
    return Invoke-StopServer $script $arguments '^LIMIT STOP SERVER (STARTED|RUNNING ALREADY|NOT STARTED) \|' 'LIMIT STOP SERVER NOT STARTED'
}

# Asks the session's limit-stop server whether the main session must now be told that it failed (limit-stop-server.mjs
# check, which logs that it told, so a failure is said once), and returns the one line it printed: LIMIT STOP SERVER
# FINE, FAILED or NOT CHECKED. Anything else, or no node, becomes a NOT CHECKED line.
function Invoke-LimitStopCheck([string]$script, [string]$session) {
    return Invoke-StopServer $script @('check', '--session', $session) '^LIMIT STOP SERVER (FINE|FAILED|NOT CHECKED) \|' 'LIMIT STOP SERVER NOT CHECKED'
}

# Runs limit-stop-server.mjs ($script) with node in the mode its $arguments name and returns its last line when that
# matches $pattern; anything else, or no node, becomes a "$head | ..." line that says what came back instead.
function Invoke-StopServer([string]$script, [string[]]$arguments, [string]$pattern, [string]$head) {
    $node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { return "$head | node was not found on PATH" }
    $said = @(& $node.Source $script @arguments 2>&1 |
        ForEach-Object { "$_".Trim() } | Where-Object { $_ -ne '' })
    $code = $LASTEXITCODE
    $last = if ($said.Count -gt 0) { $said[-1] } else { '' }
    if ($last -cmatch $pattern) { return $last }
    return "$head | node exited with $code and said: $($said -join ' ')"
}

# True when the server's line says it runs (STARTED or RUNNING ALREADY).
function Test-ServerRuns([string]$serverLine) {
    return $serverLine -cmatch '^LIMIT STOP SERVER (STARTED|RUNNING ALREADY) \|'
}

# The line that tells the main session the limit-stop server did not start, in the shape the context-guard hook and
# the server's check give every failure of it: LIMIT STOP SERVER FAILED | <time> | <what>. <the fallback>. The fallback
# is lib\limit-stop.mjs's SERVER_FALLBACK word for word (a test holds the two together), so it runs only after the main
# session has been told.
function Format-NotStartedLine([string]$serverLine, [DateTimeOffset]$at) {
    $why = $serverLine -creplace '^LIMIT STOP SERVER NOT STARTED \| ', ''
    $fallback = 'Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended ' +
        'with LEAD STOPPED, and wait for each one''s LEAD STOPPED, with no deadline. Tell the user in your final message that ' +
        'the limit-stop server failed, and what failed.'
    return "LIMIT STOP SERVER FAILED | $($at.ToLocalTime().ToString('HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)) | it did not start: $why. $fallback"
}

# The command that ends the session's limit-stop server after the hand-over.
function Format-StopCommand([string]$script, [string]$session) {
    return "node '$script' stop --session $session"
}

# The sentences every hand-over's steps begin with: start the watch again, then (with a running server) send no stop
# message, then wait for the leads with no deadline (the user's choice, 2026-10-25). A server that did not start was
# told on the line before, with its fallback.
function Format-StepsOpening([string]$serverLine) {
    $sentences = @('Start this watch again now: the hand-over on record keeps it quiet, and it wakes you if the limit-stop ' +
        'server fails or, if the limit stops the session first, after the reset.')
    if (Test-ServerRuns $serverLine) {
        $sentences += 'The limit-stop server tells every agent of this session to stop at its next tool call: send no stop message.'
    }
    $sentences += 'Wait for LEAD STOPPED from every running lead, with no deadline.'
    return $sentences -join ' '
}

# The last line at LIMIT NEAR: the opening, then write the hand-over and schedule the relaunch for after the reset,
# stopping the server ($stopCommand) in the same step.
function Format-HandOverSteps([string]$serverLine, $window, [string]$scriptsFolder, [string]$stopCommand) {
    return "$(Format-StepsOpening $serverLine) Then write the hand-over, listing every lead's hand-off, and run & '$scriptsFolder\schedule-relaunch.ps1' " +
        "-ProjectDir <project folder> -HandoverPath <hand-over file> -At $($window.ResetsAt.ToString('o', [Globalization.CultureInfo]::InvariantCulture)), " +
        "and in the same step stop the limit-stop server: $stopCommand."
}

# The last line at SESSION NEAR CAP: the opening, then write the hand-over, schedule the next chat with
# schedule-relaunch.ps1 -ContextCap (beside this script, in $scriptsFolder) and stop the server in the same step, end.
function Format-NearCapSteps([string]$serverLine, [string]$scriptsFolder, [string]$stopCommand) {
    return "$(Format-StepsOpening $serverLine) Then write the hand-over, listing every lead's hand-off, and run & '$scriptsFolder\schedule-relaunch.ps1' " +
        "-ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap, which starts a new chat with Read <hand-over> and carry on, " +
        "and in the same step stop the limit-stop server: $stopCommand; then end the session. The context-guard hook may say SESSION NEAR CAP and " +
        "STOP FOR LIMIT too; they mean the same."
}

# --- Keeping to one watch per session ----------------------------------------------------------------------------

# The marker file in the record folder that names the watch running for the session: its process id and start time.
function Get-WatchMarkerPath([string]$folder, [string]$session) {
    return Join-Path $folder "$session.txt"
}

# The process id of another watch still running for the session, or $null. A marker left by a watch that was
# killed names a process that is gone, or a reused id with another start time, and counts for nothing.
function Get-OtherWatch([string]$marker) {
    if (-not (Test-Path -LiteralPath $marker)) { return $null }
    $id, $ticks = (Get-Content -LiteralPath $marker -Raw).Trim().Split(' ')
    $other = Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue
    if ($other -and $other.Id -ne $PID -and $other.StartTime.Ticks -eq [long]$ticks) { return $other.Id }
    return $null
}

# Marks the session as watched by this process.
function Set-WatchMarker([string]$marker) {
    Set-Content -LiteralPath $marker -Value "$PID $((Get-Process -Id $PID).StartTime.Ticks)" -NoNewline
}

# --- The watch ---------------------------------------------------------------------------------------------------

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

$transcript = Find-SessionTranscript $ProjectsRoot $SessionId
if (-not $transcript) {
    "WATCH FAILED | no transcript of session '$SessionId' under $ProjectsRoot."
    exit 1
}
try {
    $config = Read-OrchestrationConfig $ConfigPath
    $limits = Get-UsageLimitSettings $config $ConfigPath
    $settings = Get-WatchSettings $config $ConfigPath $PSBoundParameters
    New-Item -ItemType Directory -Force $settings.RecordFolder -ErrorAction Stop | Out-Null
}
catch {
    "WATCH FAILED | $($_.Exception.Message)"
    exit 1
}
$tailBytes = $settings.TailMegabytes * 1MB
$decisionPath = Get-DecisionRecordPath $settings.RecordFolder $SessionId
$readingPath = if ($UsageReadingPath) { $UsageReadingPath } else { $settings.UsageStatePath }
$probe = Join-Path $PSScriptRoot 'usage-probe.ps1'
$lastProbe = $null
# True once this watch could not clear the reported check line from the record (Set-ReportedCheck).
$clearFailed = $false
$stopCommand =Format-StopCommand $StopServerScript $SessionId
$marker = Get-WatchMarkerPath $settings.RecordFolder $SessionId
$other = Get-OtherWatch $marker
if ($other) {
    "WATCH ALREADY RUNNING | process $other watches this session already; this second watch ends."
    exit 0
}
Set-WatchMarker $marker
$claude = if ($ClaudePid -gt 0) { Get-Process -Id $ClaudePid -ErrorAction SilentlyContinue }

try {
    while ($true) {
        Start-Sleep -Seconds $settings.EverySeconds
        if ($claude -and $claude.HasExited) { exit 0 }

        $lines = Read-TranscriptTail $transcript $tailBytes
        $now = [DateTimeOffset]::Now
        $stop = Get-StopError $lines
        if ($stop) {
            $record = Read-DecisionRecord $decisionPath
            $wake = Get-WakeTime $stop $settings.WakeOnErrors $settings.ResetMarginMinutes $settings.RetryMinutes $record
            if ($wake -and $now -ge $wake) {
                $agents = @(Get-SessionAgents $transcript $SessionId $limits.ignoreAgentTypes $tailBytes $ShortCacheMinutes $LongCacheMinutes $settings.CacheLookbackReplies)
                $cold = Get-StopDecision $stop $agents $record $limits.resumeMarginMinutes $wake
                if ($cold -and $cold.Decision -eq 'hand-over') {
                    Format-ResetColdLine $stop $cold $now $PSScriptRoot $stopCommand
                    exit 0
                }
                "SESSION RESUMED | $($stop.Kind) stopped this session at $($stop.At.ToLocalTime().ToString('HH:mm')) " +
                "(`"$($stop.Text)`"); it is now $($now.ToString('HH:mm')). Carry on where the work stopped, resume " +
                "every agent that was cut off, and start this watch again."
                exit 0
            }
            continue
        }

        # During a hand-over (one on record, at the context cap or a usage limit) the watch only looks after the
        # limit-stop server, which lives until the hand-over ends: the session hears of its failure, and nothing is
        # announced twice. A line reported already during this hand-over is not reported again while it stays the
        # same; a FINE check clears it, so the same line coming back is reported. A clear that could not be written
        # counts as done for this run, so a record that cannot be written never hides a line.
        $handOver = Read-DecisionRecord $decisionPath
        if ($handOver -and $handOver.Decision -eq 'hand-over') {
            $checked = Invoke-LimitStopCheck $StopServerScript $SessionId
            $reported = if ($clearFailed) { $null } else { $handOver.ReportedCheck }
            if ($checked -cmatch '^LIMIT STOP SERVER FINE \|') {
                if ($reported) { $clearFailed = -not (Set-ReportedCheck $decisionPath '') }
                continue
            }
            if ($checked -ceq $reported) { continue }
            $checked
            if ($checked -cmatch '^LIMIT STOP SERVER FAILED \|') { 'Start this watch again now; it does not report this failure twice.' }
            else { 'The Usage and context watch cannot tell whether the limit-stop server still works. Start this watch again now: it checks again at each look and says no more of this until the cause changes, or clears and comes back.' }
            $null = Set-ReportedCheck $decisionPath $checked
            exit 0
        }

        $tokens = Get-ContextTokens $lines
        if ($tokens -ge $settings.WarnTokens) {
            "SESSION NEAR CAP | the context is at $([Math]::Round($tokens / 1000))k tokens at $($now.ToString('HH:mm')) " +
            "(warning size $([Math]::Round($settings.WarnTokens / 1000))k). Finish the edit in progress, write the hand-over, " +
            "schedule the next chat and end the session."
            Write-CapRecord $decisionPath $now
            $serverLine = Start-LimitStopServer $StopServerScript $SessionId $null $ClaudePid
            $serverLine
            if (-not (Test-ServerRuns $serverLine)) { Format-NotStartedLine $serverLine ([DateTimeOffset]::Now) }
            Format-NearCapSteps $serverLine $PSScriptRoot $stopCommand
            exit 0
        }

        $reading = Read-UsageReading $readingPath
        if (-not $UsageReadingPath -and (Test-ProbeDue $reading $lastProbe $now $limits (Get-LastActivity $transcript $SessionId))) {
            $lastProbe = $now
            Invoke-UsageProbe $probe $ConfigPath $settings.UsageStatePath (Get-ProbeFreshMinutes $reading $limits)
            $reading = Read-UsageReading $readingPath
        }
        $window = Get-TrippedWindow $reading $limits $now
        if (-not $window) { continue }
        $agents = @(Get-SessionAgents $transcript $SessionId $limits.ignoreAgentTypes $tailBytes $ShortCacheMinutes $LongCacheMinutes $settings.CacheLookbackReplies)
        $decision = Get-LimitDecision $agents $window.ResetsAt $limits.resumeMarginMinutes $now (Read-DecisionRecord $decisionPath)
        # A hand-over on record was announced already: it is never taken back, and never announced twice.
        if ($decision.OnRecord) { continue }
        Write-DecisionRecord $decisionPath $decision $window $now
        if ($decision.Decision -eq 'resume') { continue }
        $serverLine = Start-LimitStopServer $StopServerScript $SessionId $window $ClaudePid
        Format-HandOverMarker $window $decision $now
        $serverLine
        if (-not (Test-ServerRuns $serverLine)) { Format-NotStartedLine $serverLine ([DateTimeOffset]::Now) }
        Format-HandOverSteps $serverLine $window $PSScriptRoot $stopCommand
        exit 0
    }
}
finally {
    Remove-Item -LiteralPath $marker -ErrorAction SilentlyContinue
}
