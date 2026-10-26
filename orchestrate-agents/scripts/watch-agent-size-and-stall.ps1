# The Agent size and stall watch. Watches one running subagent of a Claude Code session and ends when the main
# session should act: the agent's context has reached the warning size, or its transcript has not been written for
# too long. Start it in the background (the PowerShell tool with run_in_background, task description "Agent size and
# stall watch") right after starting the agent; stop it when the agent reports.
# It reads only; it changes nothing.
#
#   & <skill>\scripts\watch-agent-size-and-stall.ps1 -AgentId <id from the Agent tool> -SessionId <session id>
#
# The session id is the folder name in the main session's scratchpad path. The warning size is the agent type's
# contextCaps.<type>.warn in orchestration.config.json (the default entry for a type not listed there) unless
# -WarnTokens is passed. The type is -AgentType when passed, else the agentType in the agent's meta file beside its
# transcript (read at every look, so a meta file written late still counts), else default. The last line starts with
# NEAR CAP, QUIET, WATCH ENDED, or WATCH FAILED (a setting is missing; exit 1).
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007).
[CmdletBinding()]
param(
    # The agent's id, as the Agent tool returned it.
    [Parameter(Mandatory = $true)][string]$AgentId,
    # The session the agent belongs to.
    [Parameter(Mandatory = $true)][string]$SessionId,
    # The agent's type (software-developer, task-lead, ...); picks its contextCaps entry. Default: the agentType in
    # the agent's meta file, or default when there is none.
    [string]$AgentType,
    # The context size, in tokens, at which the main session wants to be told. Default: contextCaps.<AgentType>.warn.
    [int]$WarnTokens,
    # How long the transcript may stay unwritten before the agent counts as stuck. A long test run writes nothing.
    [int]$QuietMinutes = 30,
    # How often to look, and for how long at most.
    [int]$EverySeconds = 60,
    [int]$MaxHours = 5,
    # Where Claude Code keeps its transcripts, one folder per working directory.
    [string]$ProjectsRoot = (Join-Path $env:USERPROFILE '.claude\projects'),
    # The orchestration settings: the context caps per agent type.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
)

# The orchestration settings file, parsed. A missing file is an error that names it.
function Read-OrchestrationConfig([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "The settings file $path does not exist." }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
}

# The warning size of an agent type: contextCaps.<type>.warn, or contextCaps.default.warn for a type the settings do
# not list (a note such as _why is no type). A missing warning size is an error naming its key.
function Get-AgentWarnTokens($config, [string]$path, [string]$type) {
    $caps = $config['contextCaps']
    if ($caps -isnot [Collections.IDictionary]) { throw "$path has no key 'contextCaps'." }
    $name = if ($caps.Contains($type) -and $caps[$type] -is [Collections.IDictionary]) { $type } else { 'default' }
    $entry = $caps[$name]
    if ($entry -isnot [Collections.IDictionary] -or -not $entry.Contains('warn')) { throw "$path has no key 'contextCaps.$name.warn'." }
    return $entry['warn']
}

# The agent's type from the meta file beside its transcript (agent-<id>.meta.json): its agentType, or 'default' when
# there is no file or no type in it. A file that cannot be read as JSON (Claude Code may be rewriting it) returns
# $null: the type is not known yet.
function Get-MetaAgentType([string]$metaPath) {
    if (-not (Test-Path -LiteralPath $metaPath -PathType Leaf)) { return 'default' }
    try { $meta = Get-Content -LiteralPath $metaPath -Raw | ConvertFrom-Json -AsHashtable } catch { return $null }
    if ($meta -is [Collections.IDictionary] -and $meta['agentType']) { return [string]$meta['agentType'] }
    return 'default'
}

# The transcript of the agent: <projects>\<project-folder>\<session-id>\subagents\agent-<id>.jsonl.
# The project folder is named after the working directory, so it is found rather than built.
function Find-AgentTranscript([string]$projects, [string]$session, [string]$agent) {
    foreach ($folder in Get-ChildItem -LiteralPath $projects -Directory -ErrorAction SilentlyContinue) {
        $candidate = Join-Path $folder.FullName "$session\subagents\agent-$agent.jsonl"
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

# The size of the agent's context: the three numbers of the last usage record in its transcript, added up.
# Returns 0 when the transcript holds no usage record yet.
function Get-AgentContextTokens([string]$path) {
    $stream = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
    try {
        $take = [Math]::Min($stream.Length, 2MB)
        $null = $stream.Seek(-$take, 'End')
        $bytes = New-Object byte[] $take
        $null = $stream.Read($bytes, 0, $take)
    }
    finally {
        $stream.Close()
    }
    $records = [regex]::Matches(
        [Text.Encoding]::UTF8.GetString($bytes),
        '"usage":\{"input_tokens":(\d+),"cache_creation_input_tokens":(\d+),"cache_read_input_tokens":(\d+)')
    if ($records.Count -eq 0) { return 0 }
    $last = $records[$records.Count - 1]
    return [int]$last.Groups[1].Value + [int]$last.Groups[2].Value + [int]$last.Groups[3].Value
}

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

# The warning size: -WarnTokens when passed; else the entry of -AgentType, fixed here; else the entry of the type in
# the meta file, read at every look.
$followMeta = $false
if (-not $PSBoundParameters.ContainsKey('WarnTokens')) {
    try {
        $config = Read-OrchestrationConfig $ConfigPath
        if ($AgentType) { $WarnTokens = Get-AgentWarnTokens $config $ConfigPath $AgentType } else { $followMeta = $true }
    }
    catch {
        "WATCH FAILED: $($_.Exception.Message)"
        exit 1
    }
}
$deadline = (Get-Date).AddHours($MaxHours)
$transcript = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $EverySeconds
    if (-not $transcript) { $transcript = Find-AgentTranscript $ProjectsRoot $SessionId $AgentId }
    if (-not $transcript) { continue }
    # A meta file that cannot be read this time keeps the last warning size (default before there is one).
    $type = if ($followMeta) { Get-MetaAgentType ($transcript -creplace '\.jsonl$', '.meta.json') }
    if ($followMeta -and ($null -ne $type -or $WarnTokens -le 0)) {
        try { $WarnTokens = Get-AgentWarnTokens $config $ConfigPath ($type ?? 'default') }
        catch {
            "WATCH FAILED: $($_.Exception.Message)"
            exit 1
        }
    }

    $tokens = Get-AgentContextTokens $transcript
    $written = (Get-Item -LiteralPath $transcript).LastWriteTime
    $quiet = [int]((Get-Date) - $written).TotalMinutes
    $now = (Get-Date).ToString('HH:mm')

    if ($tokens -ge $WarnTokens) {
        "NEAR CAP: agent $AgentId is at $tokens tokens at $now (warning size $WarnTokens)."
        exit 0
    }
    if ($quiet -ge $QuietMinutes) {
        "QUIET: agent $AgentId has written nothing for $quiet minutes (last $($written.ToString('HH:mm')), now $now, $tokens tokens)."
        exit 0
    }
}
"WATCH ENDED: $MaxHours hours passed without a warning for agent $AgentId."
