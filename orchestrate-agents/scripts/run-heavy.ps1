# Runs one heavy command (a type-check, a test run, a build) when the machine has room for it, and says how much
# memory it took. Every agent of a session runs its heavy commands through this script, so that several agents
# can work at once while their heavy commands take turns instead of running together.
#
#   & <skill>\scripts\run-heavy.ps1 -Command 'npx vitest run --maxWorkers=1'
#
# It waits for a free slot (one named mutex per slot; Windows frees a slot whose holder was killed), then for
# enough free memory, then runs the command with PowerShell in the current folder, its output passed through.
# The last line starts with HEAVY COMMAND DONE and gives the wait, the run time, the peak memory of the command's
# process tree and the exit code; the script exits with the command's own exit code. The slot count, the free-memory
# floor, the wait and the folder of the holder files (which say who holds each slot) come from
# orchestration.config.json (runHeavy, the folder as a path under teamState.folder) unless passed; a missing or refused
# setting is HEAVY COMMAND NOT RUN with exit code 1, and no slot is taken. A wait that runs out is HEAVY COMMAND NOT
# RUN with exit code 124.
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007).
[CmdletBinding()]
param(
    # The command line, as it would be typed in PowerShell.
    [Parameter(Mandatory = $true)][string]$Command,
    # How many heavy commands may run at once on this machine. Default: runHeavy.slots.
    [int]$Slots,
    # The free memory, in MB, that must be there before the command starts. Default: runHeavy.minFreeMB.
    [int]$MinFreeMB,
    # How long to wait for a slot and then for memory before giving up. Default: runHeavy.waitMinutes.
    [int]$WaitMinutes,
    # How often to measure the command's memory while it runs.
    [int]$SampleSeconds = 2,
    # The folder of the holder files, a full path, used as given. Default: runHeavy.holderFolder under teamState.folder.
    [string]$HolderFolder,
    # The orchestration settings: the slot count, the free-memory floor, the wait and the holder folder.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
)

# Each slot's named lock, machine-wide, is this prefix and the slot number. The name stays as it was when the holder
# files moved under teamState.folder, so an older run-heavy still takes turns with this one.
$slotPrefix = 'xpp-agent-heavy-command-slot-'

# --- Settings -----------------------------------------------------------------------------------------------------

# The orchestration settings file, parsed. A missing file is an error that names it.
function Read-OrchestrationConfig([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "The settings file $path does not exist." }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
}

# One value of the settings by its dotted key ('runHeavy.slots'). A missing key is an error that names it.
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

# The slot count, the free-memory floor, the wait and the holder folder by parameter name: a parameter in $bound (the
# passed ones) as passed, else its setting, a key under runHeavy; the holder folder's is a path under teamState.folder.
# A passed parameter's setting is not needed.
function Get-HeavySettings($config, [string]$path, $bound) {
    $keys = [ordered]@{ Slots = 'runHeavy.slots'; MinFreeMB = 'runHeavy.minFreeMB'; WaitMinutes = 'runHeavy.waitMinutes' }
    $settings = @{}
    foreach ($name in $keys.Keys) {
        $settings[$name] = if ($bound.ContainsKey($name)) { $bound[$name] } else { Get-ConfigValue $config $keys[$name] $path }
    }
    $settings.HolderFolder = if ($bound.ContainsKey('HolderFolder')) { $bound.HolderFolder } else { Get-StatePath $config 'runHeavy.holderFolder' }
    return $settings
}

# --- Memory -------------------------------------------------------------------------------------------------------

# The machine's free physical memory, in MB.
function Get-FreeMemoryMB {
    return [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB)
}

# The private memory, in MB, of a process and every process below it.
function Get-TreeMemoryMB([int]$rootId) {
    $byId = @{}
    $children = @{}
    foreach ($p in Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, PrivatePageCount) {
        $byId[[int]$p.ProcessId] = $p
        if (-not $children.ContainsKey([int]$p.ParentProcessId)) { $children[[int]$p.ParentProcessId] = @() }
        $children[[int]$p.ParentProcessId] += [int]$p.ProcessId
    }
    $bytes = 0
    $queue = [System.Collections.Generic.Queue[int]]::new()
    $queue.Enqueue($rootId)
    $seen = @{}
    while ($queue.Count -gt 0) {
        $id = $queue.Dequeue()
        if ($seen.ContainsKey($id) -or -not $byId.ContainsKey($id)) { continue }
        $seen[$id] = $true
        $bytes += [int64]$byId[$id].PrivatePageCount
        if ($children.ContainsKey($id)) { foreach ($child in $children[$id]) { $queue.Enqueue($child) } }
    }
    return [math]::Round($bytes / 1MB)
}

# --- Slots --------------------------------------------------------------------------------------------------------

# The file that says who holds a slot, so a waiting agent can tell what it waits for: slot-<n>.txt in the holder folder.
function Get-HolderFile([int]$slot) {
    return Join-Path $HolderFolder "slot-$slot.txt"
}

# Tries every slot once. Returns @{ Mutex; Slot; Abandoned } for the slot taken, or $null when all are held.
function Enter-AnySlot {
    for ($slot = 1; $slot -le $Slots; $slot++) {
        $mutex = [System.Threading.Mutex]::new($false, "$slotPrefix$slot")
        try {
            if ($mutex.WaitOne(0)) { return @{ Mutex = $mutex; Slot = $slot; Abandoned = $false } }
        } catch [System.Threading.AbandonedMutexException] {
            return @{ Mutex = $mutex; Slot = $slot; Abandoned = $true }
        }
        $mutex.Dispose()
    }
    return $null
}

# The holders of every slot, one line each, read from their holder files.
function Get-HolderLines {
    $lines = for ($slot = 1; $slot -le $Slots; $slot++) {
        $file = Get-HolderFile $slot
        if (Test-Path -LiteralPath $file) { "  slot ${slot}: " + (Get-Content -LiteralPath $file -Raw).Trim() }
        else { "  slot ${slot}: held, holder unknown" }
    }
    return ($lines -join "`n")
}

# Waits until a slot is free or the deadline passes. Returns the slot taken, or $null at the deadline.
function Wait-ForSlot([datetime]$deadline) {
    $told = $false
    while ((Get-Date) -lt $deadline) {
        $taken = Enter-AnySlot
        if ($taken) { return $taken }
        if (-not $told) { "run-heavy: every slot is busy; waiting.`n" + (Get-HolderLines) | Write-Host; $told = $true }
        Start-Sleep -Seconds 5
    }
    return $null
}

# Waits until the free memory reaches the minimum or the deadline passes. Returns true when it did.
function Wait-ForMemory([datetime]$deadline) {
    $told = $false
    while ((Get-Date) -lt $deadline) {
        $free = Get-FreeMemoryMB
        if ($free -ge $MinFreeMB) { return $true }
        if (-not $told) { Write-Host "run-heavy: $free MB free, $MinFreeMB MB needed; waiting."; $told = $true }
        Start-Sleep -Seconds 10
    }
    return $false
}

# --- Running ------------------------------------------------------------------------------------------------------

# Starts the command in a child PowerShell that shares this console's output, and returns the process.
# A plain -Command would turn every failing exit code into 1 and a failing program followed by a passing cmdlet
# into 0, so the script carries the program's own code out, or 1 when a cmdlet failed.
function Start-Command {
    $script = $Command + "`n" + '$ok = $?' + "`n" +
        'if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }' + "`n" +
        'if (-not $ok) { exit 1 }' + "`n" + 'exit 0'
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    $info = [System.Diagnostics.ProcessStartInfo]::new((Get-Process -Id $PID).Path)
    # Text output: with its error stream on a pipe, a child PowerShell would otherwise write errors as CLIXML.
    $info.Arguments = "-NoProfile -NonInteractive -OutputFormat Text -EncodedCommand $encoded"
    $info.UseShellExecute = $false
    $info.WorkingDirectory = (Get-Location).Path
    return [System.Diagnostics.Process]::Start($info)
}

# Waits for the process to end while measuring it. Returns @{ Peak; LowestFreeMB }, Peak as text, since a command
# that ends before the first measurement has no peak to give.
function Watch-Command([System.Diagnostics.Process]$process) {
    $peak = 0
    $samples = 0
    $lowest = Get-FreeMemoryMB
    while (-not $process.WaitForExit($SampleSeconds * 1000)) {
        $peak = [math]::Max($peak, (Get-TreeMemoryMB $process.Id))
        $lowest = [math]::Min($lowest, (Get-FreeMemoryMB))
        $samples++
    }
    $process.WaitForExit()
    $text = if ($samples -gt 0) { "$peak MB in its processes" } else { "not measured (ended within $SampleSeconds s)" }
    return @{ Peak = $text; LowestFreeMB = $lowest }
}

# A duration as minutes and seconds.
function Format-Duration([timespan]$span) {
    return '{0}:{1:00}' -f [math]::Floor($span.TotalMinutes), $span.Seconds
}

# --- Main ---------------------------------------------------------------------------------------------------------

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

try {
    $settings = Get-HeavySettings (Read-OrchestrationConfig $ConfigPath) $ConfigPath $PSBoundParameters
    # Made here, before any slot is taken, so a folder that cannot be made stops the script with the same line.
    [IO.Directory]::CreateDirectory($settings.HolderFolder) | Out-Null
}
catch {
    Write-Host "HEAVY COMMAND NOT RUN | $($_.Exception.Message)"
    exit 1
}
# The functions above read these script variables.
$Slots = $settings.Slots
$MinFreeMB = $settings.MinFreeMB
$WaitMinutes = $settings.WaitMinutes
$HolderFolder = $settings.HolderFolder

$asked = Get-Date
$deadline = $asked.AddMinutes($WaitMinutes)
$taken = Wait-ForSlot $deadline
if (-not $taken) {
    Write-Host "HEAVY COMMAND NOT RUN | no slot came free in $WaitMinutes minutes`n$(Get-HolderLines)"
    exit 124
}
try {
    if ($taken.Abandoned) { Write-Host "run-heavy: slot $($taken.Slot)'s last holder ended without freeing it; taken over." }
    Set-Content -LiteralPath (Get-HolderFile $taken.Slot) -Value "process $PID since $((Get-Date).ToString('HH:mm:ss')) in $((Get-Location).Path): $Command"
    if (-not (Wait-ForMemory $deadline)) {
        Write-Host "HEAVY COMMAND NOT RUN | free memory stayed below $MinFreeMB MB for $WaitMinutes minutes"
        exit 124
    }
    $waited = (Get-Date) - $asked
    $started = Get-Date
    $process = Start-Command
    $measured = Watch-Command $process
    $code = $process.ExitCode
    Write-Host ("HEAVY COMMAND DONE | exit $code | waited $(Format-Duration $waited) | ran $(Format-Duration ((Get-Date) - $started))" +
        " | peak $($measured.Peak) | free memory at its lowest $($measured.LowestFreeMB) MB | slot $($taken.Slot) of $Slots")
    exit $code
} finally {
    Remove-Item -LiteralPath (Get-HolderFile $taken.Slot) -ErrorAction SilentlyContinue
    $taken.Mutex.ReleaseMutex()
    $taken.Mutex.Dispose()
}
