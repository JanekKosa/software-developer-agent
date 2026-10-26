# Schedules the relaunch after a hand-over: a one-shot Windows scheduled task for the current user, run only while
# that user is logged on (no stored password, no elevation), that runs start-session-in-vscode.ps1 for the project
# with the prompt 'Read <hand-over> and carry on.'. After a usage-limit hand-over it runs at -At plus
# usageLimits.relaunchMarginMinutes; after a hand-over at the main session's context cap (-ContextCap) at now plus
# relaunch.afterCapMinutes. The task deletes itself once it has expired. Prints the task's name and time.
#
#   & '<skill>\scripts\schedule-relaunch.ps1' -ProjectDir <folder> -HandoverPath <file> -At <ISO time | now> [-DryRun]
#   & '<skill>\scripts\schedule-relaunch.ps1' -ProjectDir <folder> -HandoverPath <file> -ContextCap [-DryRun]
#
# -At is the limit's reset time (the LIMIT NEAR line names it), or 'now' after SESSION RESET COLD. A time in the past
# by up to MaxPastHours runs as soon as the margin allows; one further back is refused. A task of the same name (same
# project, same minute) is left as it is, so running this twice is harmless. Its last line starts with SCHEDULED,
# ALREADY SCHEDULED, DRY RUN or RELAUNCH NOT SCHEDULED (exit 1).
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007): a mistyped
# -DryRun can no longer register a real task.
[CmdletBinding()]
param(
    # The project folder the new session opens in.
    [string]$ProjectDir = '',
    # The hand-over the new session reads first. It must exist.
    [string]$HandoverPath = '',
    # When the limit resets: an ISO time, or now.
    [string]$At = '',
    # The hand-over is the main session's at its context cap (SESSION NEAR CAP): no limit has to lift, so the task
    # runs relaunch.afterCapMinutes from now, and -At is not given.
    [switch]$ContextCap,
    # Says what would be registered and registers nothing.
    [switch]$DryRun,
    # The orchestration settings: the relaunch wait (usageLimits.relaunchMarginMinutes, or relaunch.afterCapMinutes
    # with -ContextCap), the task name prefix and the two limits below.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
    # How far in the past -At may be. Further back, the caller passed a stale time. Default: relaunch.maxPastHours.
    [int]$MaxPastHours,
    # How long after its start time the task stays registered before it expires and deletes itself. Default:
    # relaunch.expireAfterHours.
    [int]$ExpireAfterHours
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

# --- The task ----------------------------------------------------------------------------------------------------

# What the run time is counted from and the setting that holds the wait, as {At, MarginKey}: -At and
# usageLimits.relaunchMarginMinutes after a usage-limit hand-over, now and relaunch.afterCapMinutes after a hand-over
# at the context cap. A missing -At, or -At with -ContextCap, is an error.
function Get-RelaunchBasis([string]$at, [bool]$contextCap) {
    if (-not $contextCap) {
        if (-not $at) { throw '-At is required.' }
        return [pscustomobject]@{ At = $at; MarginKey = 'usageLimits.relaunchMarginMinutes' }
    }
    if ($at) { throw '-At and -ContextCap do not go together: after a hand-over at the context cap the task runs relaunch.afterCapMinutes from now.' }
    return [pscustomobject]@{ At = 'now'; MarginKey = 'relaunch.afterCapMinutes' }
}

# When the task runs: -At (or now, for 'now' and for a time already past) plus the margin. A time that is not one,
# or that lies more than $maxPastHours back, is an error.
function Get-RelaunchTime([string]$at, [DateTimeOffset]$now, [int]$marginMinutes, [int]$maxPastHours) {
    if ($at -eq 'now') { return $now.AddMinutes($marginMinutes) }
    $when = [DateTimeOffset]::MinValue
    $styles = [Globalization.DateTimeStyles]::AssumeLocal
    if (-not [DateTimeOffset]::TryParse($at, [Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$when)) {
        throw "-At '$at' is not a time: give an ISO time such as 2026-10-25T14:10:00+01:00, or now."
    }
    if ($when -lt $now.AddHours(-$maxPastHours)) { throw "-At $at is more than $maxPastHours hours in the past." }
    if ($when -lt $now) { $when = $now }
    return $when.AddMinutes($marginMinutes)
}

# The task's name: <prefix>-<project folder name>-<yyyyMMddHHmm of the run time>.
function Get-RelaunchTaskName([string]$prefix, [string]$projectDir, [DateTimeOffset]$runAt) {
    $folder = [IO.Path]::GetFileName($projectDir.TrimEnd('\'))
    return "$prefix-$folder-$($runAt.ToLocalTime().ToString('yyyyMMddHHmm', [Globalization.CultureInfo]::InvariantCulture))"
}

# One argument quoted for a Windows command line so that the program gets it back unchanged (the rules of
# CommandLineToArgvW): wrapped in double quotes, each double quote escaped with a backslash, and the backslashes in
# front of a double quote or of the closing quote doubled. .NET has this only internally, and a task action takes
# one argument string, not a list.
function ConvertTo-WindowsArgument([string]$value) {
    $escaped = [regex]::Replace($value, '(\\*)"', { param($match) ($match.Groups[1].Value * 2) + '\"' })
    $escaped = [regex]::Replace($escaped, '(\\+)$', { param($match) $match.Groups[1].Value * 2 })
    return '"' + $escaped + '"'
}

# The task action's argument string: pwsh runs start-session-in-vscode.ps1 with the project and the prompt, and with
# -ContextCap after a hand-over at the context cap, so its notifications name the right cause.
function Get-RelaunchArguments([string]$startScript, [string]$projectDir, [string]$prompt, [bool]$contextCap) {
    $line = "-NoProfile -WindowStyle Hidden -File $(ConvertTo-WindowsArgument $startScript) " +
        "-ProjectDir $(ConvertTo-WindowsArgument $projectDir) -Prompt $(ConvertTo-WindowsArgument $prompt)"
    if ($contextCap) { $line += ' -ContextCap' }
    return $line
}

# The task's description, which names the cause: the usage limit reset, or the hand-over at the context cap.
function Get-RelaunchDescription([string]$projectDir, [bool]$contextCap) {
    $after = if ($contextCap) { "the hand-over at the main session's context cap" } else { 'the usage limit reset' }
    return "Starts a Claude Code session in VS Code for $projectDir after $after. Made by schedule-relaunch.ps1."
}

# Registers the one-shot task for the current user: interactive only, no elevation, started late when the machine
# was asleep or on battery at the time, and deleted once it has expired.
function Register-RelaunchTask([string]$name, [DateTimeOffset]$runAt, [int]$expireAfterHours, [string]$program, [string]$arguments, [string]$projectDir, [bool]$contextCap) {
    $action = New-ScheduledTaskAction -Execute $program -Argument $arguments -WorkingDirectory $projectDir
    $trigger = New-ScheduledTaskTrigger -Once -At $runAt.LocalDateTime
    $trigger.EndBoundary = $runAt.AddHours($expireAfterHours).LocalDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss", [Globalization.CultureInfo]::InvariantCulture)
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DeleteExpiredTaskAfter ([TimeSpan]::Zero)
    $description = Get-RelaunchDescription $projectDir $contextCap
    $null = Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $description
}

# --- Scheduling --------------------------------------------------------------------------------------------------

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

$invariant = [Globalization.CultureInfo]::InvariantCulture
try {
    foreach ($required in ([ordered]@{ ProjectDir = $ProjectDir; HandoverPath = $HandoverPath }).GetEnumerator()) {
        if (-not $required.Value) { throw "-$($required.Key) is required." }
    }
    $basis = Get-RelaunchBasis $At $ContextCap.IsPresent
    if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) { throw "The project folder $ProjectDir does not exist." }
    if (-not (Test-Path -LiteralPath $HandoverPath -PathType Leaf)) { throw "The hand-over $HandoverPath does not exist; write it first." }
    $config = Read-OrchestrationConfig $ConfigPath
    $margin = Get-ConfigValue $config $basis.MarginKey $ConfigPath
    $prefix = Get-ConfigValue $config 'relaunch.taskNamePrefix' $ConfigPath
    if (-not $PSBoundParameters.ContainsKey('MaxPastHours')) { $MaxPastHours = Get-ConfigValue $config 'relaunch.maxPastHours' $ConfigPath }
    if (-not $PSBoundParameters.ContainsKey('ExpireAfterHours')) { $ExpireAfterHours = Get-ConfigValue $config 'relaunch.expireAfterHours' $ConfigPath }
    $runAt = Get-RelaunchTime $basis.At ([DateTimeOffset]::Now) $margin $MaxPastHours
    $project = (Resolve-Path -LiteralPath $ProjectDir).ProviderPath
    $handover = (Resolve-Path -LiteralPath $HandoverPath).ProviderPath
    $name = Get-RelaunchTaskName $prefix $project $runAt
    $program = Join-Path $PSHOME 'pwsh.exe'
    $arguments = Get-RelaunchArguments (Join-Path $PSScriptRoot 'start-session-in-vscode.ps1') $project "Read $handover and carry on." $ContextCap.IsPresent
}
catch {
    "RELAUNCH NOT SCHEDULED | $($_.Exception.Message)"
    exit 1
}
$when = $runAt.ToLocalTime().ToString('yyyy-MM-dd HH:mm', $invariant)
if ($DryRun) {
    "DRY RUN | would register $name at ${when}: $program $arguments"
    exit 0
}
if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    "ALREADY SCHEDULED | $name at $when"
    exit 0
}
try {
    Register-RelaunchTask $name $runAt $ExpireAfterHours $program $arguments $project $ContextCap.IsPresent
}
catch {
    "RELAUNCH NOT SCHEDULED | $($_.Exception.Message)"
    exit 1
}
"SCHEDULED | $name at $when | runs start-session-in-vscode.ps1 for $project"
exit 0
