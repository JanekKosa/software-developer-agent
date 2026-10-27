# The switch-over of "the team's state in one folder" (agent team, stage 2, D-36 and D-39): copies every file the team
# wrote for itself from its old places (%TEMP% and %USERPROFILE%\.claude\state) into the one folder the STAGED config
# names (teamState.folder and a child per kind), then copies the staged code into the live orchestrate-agents folder.
# State goes first, so the moment the code looks in the new place every switched-on chat's mark is already there.
#
#   pwsh -NoProfile -File STATE_FOLDER_CUTOVER_CLAUDE.ps1               dry run: prints the whole plan, writes nothing
#   pwsh -NoProfile -File STATE_FOLDER_CUTOVER_CLAUDE.ps1 -Apply        does it
#   pwsh -NoProfile -File STATE_FOLDER_CUTOVER_CLAUDE.ps1 -RemoveOld    later: deletes the old copies of what was copied
#
# It refuses, writing nothing, with one 'CUTOVER REFUSED | <why>' line per reason, when a code file is in conflict by
# the three-way rule, a limit-stop server listens, a Usage and context watch still runs, or a file in the new place
# differs from the old file it would receive (and on a bad parameter, base list or staged setting).
#
# The code order was chosen from what the two hooks do in each mixed state (measured on scratch copies, 2026-10-27,
# run S3b): new code with the old config makes each hook write a stderr line ("has no setting 'teamState.folder'");
# old code with the new config is silent and writes nothing, because the old gate looks for the chat's mark in
# %TEMP%\team-on, which does not exist. So the config goes first, then lib\config.mjs (which the other new libraries
# import), the other libraries, then everything else, and the gate lib\agent-team.mjs last: every state on the way is
# silent and writes nothing, and a copy that stops half-way leaves the team silent until a second -Apply finishes it.
#
# Exit code: 0 done (or a dry run with nothing to refuse), 1 refused, 2 failed part-way (the lines above say what was
# copied; nothing is undone).
param(
    # The live orchestrate-agents folder the code is copied into.
    [string]$LiveRoot = (Join-Path $PSScriptRoot '..\..\..\..\orchestrate-agents'),
    # The staged copy the code comes from; its config names the new places.
    [string]$StagedRoot = (Join-Path $PSScriptRoot 'STATE_FOLDER_STAGING\orchestrate-agents'),
    # The base list: the live folder's files and SHA256 hashes when the staged copy was taken.
    [string]$BaseList = (Join-Path $PSScriptRoot 'STATE_FOLDER_STAGING_BASE_CLAUDE.txt'),
    # The old temp folder. A fixed default, not read from the live config: after the switch-over that config no longer
    # names the old places.
    [string]$OldTemp = [IO.Path]::GetTempPath(),
    # The old state folder, also a fixed default for the same reason.
    [string]$OldState = (Join-Path $env:USERPROFILE '.claude\state'),
    # The limit-stop servers' pipe prefix. Default: limitStop.pipePrefix of the live config.
    [string]$PipePrefix,
    # Do it, instead of the dry run.
    [switch]$Apply,
    # The later pass that deletes the old copies.
    [switch]$RemoveOld
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

# The session id check of lib\limit-stop.mjs SESSION_ID_PATTERN ('\z' for JavaScript's '$').
$SessionIdPattern = '^[A-Za-z0-9-]{1,128}\z'
# The old places' names, fixed: they are what the old code used.
$OldOnFolderName = 'claude-agent-team-on'
$OldGuardFolderName = 'claude-context-guard'
$decisionRecord = '^claude-session-watch-(?<id>.+)\.decision\.json\z'
$watchMark = '^claude-session-watch-(?<id>.+)\.txt\z'
$slotHolder = '^xpp-agent-heavy-command-slot-.*\.txt\z'
# The settings under teamState.folder that name a new place, by the name this script uses for each.
$StateKeys = [ordered]@{
    OnFolder     = 'agentTeam.onFolder'
    GuardFolder  = 'contextGuard.markerFolder'
    Reading      = 'usageLimits.stateFile'
    RelaunchLog  = 'relaunch.logFile'
    LimitStopLog = 'limitStop.logFile'
    RecordFolder = 'usageAndContextWatch.recordFolder'
}

# --- Small helpers -------------------------------------------------------------------------------------------------

# An absolute path without a trailing separator.
function Get-CleanPath([string]$path) {
    return [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($path))
}

# The SHA256 of a file's bytes, upper-case hex.
function Get-FileSha([string]$path) {
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($path)))
}

# The SHA256 of a file when it exists, else $null.
function Get-ShaOrNull([string]$path) {
    if (Test-Path -LiteralPath $path -PathType Leaf) { return Get-FileSha $path }
    return $null
}

# A JSON file as nested hashtables.
function Read-JsonFile([string]$path) {
    return [IO.File]::ReadAllText($path) | ConvertFrom-Json -AsHashtable
}

# One setting by its dotted key, read the way lib\config.mjs requireSetting reads it (a part missing, spelled in
# another case, or null is missing), in that function's words.
function Get-Setting($config, [string]$key) {
    $node = $config
    foreach ($part in $key.Split('.')) {
        if ($node -isnot [Collections.IDictionary] -or -not ($node.Keys -ccontains $part) -or $null -eq $node[$part]) {
            throw "orchestration.config.json has no setting '$key'"
        }
        $node = $node[$part]
    }
    return , $node
}

# --- New places: the S1 rule ---------------------------------------------------------------------------------------

# Why a path under teamState.folder is refused, or $null: the rules of lib\config.mjs STATE_PATH_RULES in their order
# and words (as copied into watch-usage-and-context.ps1 Get-StatePathFault), then a '%': nothing is filled in under
# the root, so a '%' there is a setting written for the old code.
function Get-StatePathFault([string]$value) {
    $parts = $value.Split('\')
    if ($value -ceq '') { return 'is empty' }
    if ($value.Contains(':')) { return "has a drive or a ':'" }
    if ($value -cmatch '^[\\/]|[\\/]\z') { return "starts or ends with '\' or '/'" }
    if ($value.Contains('/')) { return "has a '/'; parts are joined by '\'" }
    if ($value -cmatch '[*?"<>|]') { return 'has one of * ? " < > |' }
    if ($parts -ccontains '') { return 'has an empty part' }
    if ($parts -ccontains '.' -or $parts -ccontains '..') { return "has a '.' or '..' part" }
    if ($value.Contains('%')) { return "has a '%' (nothing is filled in under 'teamState.folder')" }
    return $null
}

# The absolute path of a new place from its setting: teamState.folder (each %NAME% filled in from the environment,
# then a drive letter, ':' and '\') joined with the child. A copy of the staged watch-usage-and-context.ps1
# Get-StatePath, which copies lib\config.mjs requireStatePath; throws in its words.
function Get-StatePath($config, [string]$key) {
    $root = Get-Setting $config 'teamState.folder'
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
    $value = Get-Setting $config $key
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

# Every new place a config names, by this script's names; a place whose setting is refused is $null and its refusal
# is added, prefixed with which config it is.
function Get-NewPlaces($config, [string]$which, $refusals) {
    $places = [ordered]@{}
    foreach ($name in $StateKeys.Keys) {
        try { $places[$name] = Get-StatePath $config $StateKeys[$name] }
        catch { $places[$name] = $null; $refusals.Add("$which $($_.Exception.Message)") }
    }
    return $places
}

# --- Running things ------------------------------------------------------------------------------------------------

# The PID of the watch a mark names when that process still runs with the start time the mark records, else $null.
# The watch's own check (Get-OtherWatch in watch-usage-and-context.ps1): the mark is "<PID> <StartTime.Ticks>"; a mark
# of a killed watch names a process that is gone, or a reused id with another start time, and counts for nothing. A
# mark that cannot be read or parsed, or a process whose start time cannot be read (another user's), counts for
# nothing too: no watch of this user wrote it.
function Get-RunningWatch([string]$mark) {
    try {
        $id, $ticks = ([IO.File]::ReadAllText($mark)).Trim().Split(' ')
        $process = Get-Process -Id ([int]$id) -ErrorAction Stop
        if ($process.Id -ne $PID -and $process.StartTime.Ticks -eq $ticks) { return $process.Id }
    }
    catch { }
    return $null
}

# The names of the pipes that start with '<prefix>-' (the limit-stop servers listen on \\.\pipe\<prefix>-<session id>).
function Get-ListeningPipes([string]$prefix) {
    $start = '\\.\pipe\'
    return @([IO.Directory]::GetFiles($start) | ForEach-Object { $_.Substring($start.Length) } |
            Where-Object { $_.StartsWith("$prefix-", [StringComparison]::OrdinalIgnoreCase) } | Sort-Object)
}

# --- The plan ------------------------------------------------------------------------------------------------------

# Adds an old file to the copy plan with what the new place holds: nothing ('copy'), the same bytes ('same') or other
# bytes ('differs').
function Add-Copy([string]$from, [string]$to) {
    $fromHash = Get-FileSha $from
    $toHash = Get-ShaOrNull $to
    $kind = if ($null -eq $toHash) { 'copy' } elseif ($toHash -ceq $fromHash) { 'same' } else { 'differs' }
    $script:copies.Add([pscustomobject]@{ From = $from; To = $to; Kind = $kind })
}

# Adds a file found in an old place that is never copied, with why.
function Add-Skip([string]$path, [string]$why) {
    $script:skips.Add([pscustomobject]@{ Path = $path; Why = $why })
}

# Why a watch mark is not copied: a running watch's or a stopped one's.
function Get-WatchMarkWhy([string]$mark) {
    $running = Get-RunningWatch $mark
    if ($running) { return "belongs to a running watch, PID $running" }
    return 'never copied: the mark of a stopped watch; a new watch writes its own'
}

# Scans the old places and fills $script:copies and $script:skips. A new place that is $null (its setting refused) is
# left out of the plan.
function Get-StatePlan($new) {
    $onOld = Join-Path $OldTemp $OldOnFolderName
    if (Test-Path -LiteralPath $onOld -PathType Container) {
        foreach ($entry in Get-ChildItem -LiteralPath $onOld -Force | Sort-Object Name) {
            if ($entry.PSIsContainer) { Add-Skip $entry.FullName 'a folder, never copied' }
            elseif ($entry.Name -cmatch $SessionIdPattern) { if ($new.OnFolder) { Add-Copy $entry.FullName (Join-Path $new.OnFolder $entry.Name) } }
            else { Add-Skip $entry.FullName 'not a session id, never copied' }
        }
    }
    $guardOld = Join-Path $OldTemp $OldGuardFolderName
    if (Test-Path -LiteralPath $guardOld -PathType Container) {
        foreach ($entry in Get-ChildItem -LiteralPath $guardOld -Force | Sort-Object Name) {
            $name = $entry.Name
            if ($entry.PSIsContainer) { Add-Skip $entry.FullName 'a folder, never copied' }
            elseif ($name.EndsWith('.json', [StringComparison]::OrdinalIgnoreCase)) { if ($new.GuardFolder) { Add-Copy $entry.FullName (Join-Path $new.GuardFolder $name) } }
            else { Add-Skip $entry.FullName $(if ($name.EndsWith('.lock', [StringComparison]::OrdinalIgnoreCase)) { 'a lock of a running guard, never copied' } else { 'not a guard marker, never copied' }) }
        }
    }
    foreach ($pair in @(@('usage-limits.json', $new.Reading), @('relaunch.log', $new.RelaunchLog), @('limit-stop.log', $new.LimitStopLog))) {
        $from = Join-Path $OldState $pair[0]
        if ($pair[1] -and (Test-Path -LiteralPath $from -PathType Leaf)) { Add-Copy $from $pair[1] }
    }
    if (Test-Path -LiteralPath $OldTemp -PathType Container) {
        $found = @([IO.Directory]::GetFiles($OldTemp, 'claude-session-watch-*')) + @([IO.Directory]::GetFiles($OldTemp, 'xpp-agent-heavy-command-slot-*'))
        foreach ($path in $found | Sort-Object) {
            $file = Get-Item -LiteralPath $path -Force
            $name = $file.Name
            if ($name -cmatch $decisionRecord) {
                # Taken at once: the id check below overwrites $Matches.
                $id = $Matches.id
                if ($id -cnotmatch $SessionIdPattern) { Add-Skip $file.FullName 'not a session id, never copied' }
                elseif ($new.RecordFolder) { Add-Copy $file.FullName (Join-Path $new.RecordFolder "$id.decision.json") }
            }
            elseif ($name -cmatch $watchMark) {
                Add-Skip $file.FullName (Get-WatchMarkWhy $file.FullName)
            }
            elseif ($name -cmatch $slotHolder) {
                Add-Skip $file.FullName 'a run-heavy slot holder: it belongs to a running command, never copied'
            }
            else { Add-Skip $file.FullName 'not a team file this script knows, never copied' }
        }
    }
}

# Reads the base list: '#' lines are comments, every other non-blank line is '<relative path><tab><SHA256>'. Returns
# a case-insensitive map of path to upper-case hash; a bad or repeated line adds a refusal.
function Read-BaseList([string]$path, $refusals) {
    $map = [Collections.Generic.Dictionary[string, string]]::new([StringComparer]::OrdinalIgnoreCase)
    $lineOf = @{}
    $n = 0
    foreach ($line in [IO.File]::ReadAllLines($path)) {
        $n++
        if ($line.Trim() -ceq '' -or $line.StartsWith('#')) { continue }
        $parts = $line.Split("`t")
        if ($parts.Count -ne 2 -or $parts[0] -ceq '' -or $parts[1] -cnotmatch '^[0-9A-Fa-f]{64}\z') {
            $refusals.Add("the base list $path line $n is not '<relative path><tab><SHA256>': $line")
        }
        elseif ($map.ContainsKey($parts[0])) {
            $refusals.Add("the base list $path names $($parts[0]) twice (lines $($lineOf[$parts[0].ToLowerInvariant()]) and $n)")
        }
        else { $map[$parts[0]] = $parts[1].ToUpperInvariant(); $lineOf[$parts[0].ToLowerInvariant()] = $n }
    }
    return , $map
}

# Where a code file goes in the copy order (see the header): the config, lib\config.mjs, the other libraries, the
# rest, and the gate lib\agent-team.mjs last.
function Get-CodeRank([string]$rel) {
    switch ($rel) {
        'orchestration.config.json' { 0 }
        'lib\config.mjs' { 1 }
        'lib\agent-team.mjs' { 4 }
        default { if ($rel.StartsWith('lib\', [StringComparison]::OrdinalIgnoreCase)) { 2 } else { 3 } }
    }
}

# The three-way rule, per file: B its base-list hash, L the live file's, S the staged file's. L = S: nothing. S
# missing while B is there: conflict (no deletion is expected). No B: copy when there is no L, else conflict. S = B:
# live is left alone. S != B and L = B: copy. Otherwise conflict. Fills $script:code (in copy order), $script:codeKept
# and $script:conflicts.
function Get-CodePlan($baseMap) {
    $stagedFiles = [Collections.Generic.Dictionary[string, string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($file in Get-ChildItem -LiteralPath $StagedRoot -Recurse -File -Force) {
        $stagedFiles[$file.FullName.Substring($StagedRoot.Length + 1)] = $file.FullName
    }
    $all = [Collections.Generic.SortedSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($rel in $baseMap.Keys) { [void]$all.Add($rel) }
    foreach ($rel in $stagedFiles.Keys) { [void]$all.Add($rel) }
    $planned = [Collections.Generic.List[object]]::new()
    foreach ($rel in $all) {
        $base = if ($baseMap.ContainsKey($rel)) { $baseMap[$rel] } else { $null }
        $staged = if ($stagedFiles.ContainsKey($rel)) { Get-FileSha $stagedFiles[$rel] } else { $null }
        $live = Get-ShaOrNull (Join-Path $LiveRoot $rel)
        if ($null -eq $staged) {
            $script:conflicts.Add([pscustomobject]@{ Rel = $rel; Why = 'in the base list but missing from the staged copy; no deletion is expected' })
        }
        elseif ($live -ceq $staged) { continue }
        elseif ($null -eq $base) {
            if ($null -eq $live) { $planned.Add([pscustomobject]@{ Rel = $rel; Why = 'new in the staged copy'; Rank = Get-CodeRank $rel }) }
            else { $script:conflicts.Add([pscustomobject]@{ Rel = $rel; Why = "new in the staged copy, and live already has another file there (live $live, staged $staged)" }) }
        }
        elseif ($staged -ceq $base) {
            $script:codeKept.Add([pscustomobject]@{ Rel = $rel; Why = $(if ($null -eq $live) { 'missing live; the staged copy did not change it: left alone' } else { 'live differs from the base, the staged copy does not: live is left alone' }) })
        }
        elseif ($live -ceq $base) {
            $planned.Add([pscustomobject]@{ Rel = $rel; Why = 'changed in the staged copy'; Rank = Get-CodeRank $rel })
        }
        else {
            $script:conflicts.Add([pscustomobject]@{ Rel = $rel; Why = "changed live and in the staged copy (base $base, live $(if ($null -eq $live) { 'missing' } else { $live }), staged $staged)" })
        }
    }
    foreach ($item in $planned | Sort-Object Rank, @{ Expression = { $_.Rel.ToLowerInvariant() } }) { $script:code.Add($item) }
}

# --- The passes ----------------------------------------------------------------------------------------------------

# Writes a file through a temp name beside it and a rename, so no reader sees half a file.
function Write-ThroughTemp([string]$to, [byte[]]$bytes, $time) {
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($to))
    $temp = "$to.cutover-$PID.tmp"
    [IO.File]::WriteAllBytes($temp, $bytes)
    if ($null -ne $time) { [IO.File]::SetLastWriteTimeUtc($temp, $time) }
    [IO.File]::Move($temp, $to, $true)
}

# Copies one old state file into its new place, bytes and write time kept, and reads it back: a write the system
# accepted is not yet a write that happened.
function Copy-StateFile([string]$from, [string]$to) {
    $bytes = [IO.File]::ReadAllBytes($from)
    $time = [IO.File]::GetLastWriteTimeUtc($from)
    Write-ThroughTemp $to $bytes $time
    $back = [IO.File]::ReadAllBytes($to)
    if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($back)) -cne [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))) { throw "$to does not read back with the bytes of $from" }
    if ([IO.File]::GetLastWriteTimeUtc($to) -ne $time) { throw "$to does not read back with the write time of $from" }
}

# Copies one staged code file into the live folder and reads it back.
function Copy-CodeFile([string]$rel) {
    $from = Join-Path $StagedRoot $rel
    $to = Join-Path $LiveRoot $rel
    Write-ThroughTemp $to ([IO.File]::ReadAllBytes($from)) $null
    if ((Get-FileSha $to) -cne (Get-FileSha $from)) { throw "$to does not read back as $from" }
}

# The main session's steps after the switch-over, as exact commands.
function Write-NextSteps($new) {
    $places =@('LiveRoot', 'StagedRoot', 'BaseList', 'OldTemp', 'OldState', 'PipePrefix') | Where-Object { $script:Bound.ContainsKey($_) } |
        ForEach-Object { "-$_ '$($script:Bound[$_].Replace("'", "''"))'" }
    $removeOld = (@("& '$($PSCommandPath.Replace("'", "''"))'") + $places + '-RemoveOld') -join ' '
    "NEXT | 1. node '$(Join-Path $LiveRoot 'scripts\team-on.mjs')'  (PowerShell tool; writes this chat's mark under $($new.OnFolder))"
    "NEXT | 2. Start both watches again, each with the PowerShell tool, run_in_background and exactly this description:"
    "NEXT |    Usage and context watch: & '$(Join-Path $LiveRoot 'scripts\watch-usage-and-context.ps1')'"
    "NEXT |    Decision answers watch, from the chat's own repo: & '$(Join-Path $LiveRoot 'scripts\watch-decision-answers.ps1')'"
    "NEXT | 3. /reload-plugins"
    "NEXT | 4. Check: the chat's mark is $($new.OnFolder)\<session id>; the next probe writes $($new.Reading) with a newer checkedAt; a guard warning lands in $($new.GuardFolder)\"
    "NEXT | 5. Later, once every chat runs the new code: $removeOld"
}

# Prints the plan, and any refusals; writes nothing.
function Write-DryRun($plan) {
    $state = 0; $same = 0
    foreach ($item in $script:copies) {
        if ($item.Kind -ceq 'same') { "SAME | $($item.From) -> $($item.To)"; $same++ }
        elseif ($item.Kind -ceq 'copy') { "PLAN COPY | $($item.From) -> $($item.To)"; $state++ }
    }
    foreach ($skip in $script:skips) { "SKIP | $($skip.Path) ($($skip.Why))" }
    foreach ($item in $script:code) { "PLAN CODE | $($item.Rel) ($($item.Why))" }
    foreach ($item in $script:codeKept) { "CODE KEPT | $($item.Rel) ($($item.Why))" }
    foreach ($reason in $plan.Refusals) { "CUTOVER REFUSED | $reason" }
    $last = "CUTOVER DRY RUN | $state state files and $($script:code.Count) code files to copy, $same already the same; nothing written"
    if ($plan.Refusals.Count -gt 0) { "$last; -Apply would refuse for $($plan.Refusals.Count) reasons"; exit 1 }
    $last
    exit 0
}

# Copies the state, then the code, printing one line per action; refuses first when there is a reason.
function Invoke-Apply($plan) {
    if ($plan.Refusals.Count -gt 0) {
        foreach ($reason in $plan.Refusals) { "CUTOVER REFUSED | $reason" }
        exit 1
    }
    $state = 0; $codeCount = 0
    try {
        foreach ($item in $script:copies) {
            if ($item.Kind -ceq 'same') { "SAME | $($item.From) -> $($item.To)"; continue }
            Copy-StateFile $item.From $item.To
            "COPIED | $($item.From) -> $($item.To)"
            $state++
        }
        foreach ($item in $script:code) {
            Copy-CodeFile $item.Rel
            "CODE | $($item.Rel)"
            $codeCount++
        }
    }
    catch {
        "CUTOVER FAILED | $($_.Exception.Message). $state state files and $codeCount code files were copied before it (the lines above); nothing was undone."
        exit 2
    }
    "CUTOVER DONE | $state state files, $codeCount code files"
    Write-NextSteps $plan.New
    exit 0
}

# Deletes each old copy whose new copy is byte-identical; reports every old file it keeps and why; removes an old
# folder only when it is empty.
function Invoke-RemoveOld($plan) {
    if ($plan.Refusals.Count -gt 0) {
        foreach ($reason in $plan.Refusals) { "CUTOVER REFUSED | $reason" }
        exit 1
    }
    $removed = 0; $kept = 0
    try {
        foreach ($item in $script:copies) {
            $oldHash = Get-ShaOrNull $item.From
            $newHash = Get-ShaOrNull $item.To
            if ($null -eq $oldHash) { continue }
            if ($newHash -ceq $oldHash) {
                [IO.File]::Delete($item.From)
                "REMOVED | $($item.From)"
                $removed++
            }
            elseif ($null -eq $newHash) { "KEPT | $($item.From) (no copy at $($item.To))"; $kept++ }
            else { "KEPT | $($item.From) (differs from $($item.To))"; $kept++ }
        }
        foreach ($skip in $script:skips) { "KEPT | $($skip.Path) ($($skip.Why))"; $kept++ }
        foreach ($folder in (Join-Path $OldTemp $OldOnFolderName), (Join-Path $OldTemp $OldGuardFolderName)) {
            if (-not (Test-Path -LiteralPath $folder -PathType Container)) { continue }
            $left = @(Get-ChildItem -LiteralPath $folder -Force).Count
            if ($left -gt 0) { "KEPT FOLDER | $folder (not empty: $left entries)" }
            else { [IO.Directory]::Delete($folder, $false); "REMOVED FOLDER | $folder" }
        }
    }
    catch {
        "CUTOVER FAILED | $($_.Exception.Message). $removed old files were removed before it (the lines above)."
        exit 2
    }
    "REMOVE OLD DONE | $removed files removed, $kept kept"
    exit 0
}

# --- Main ----------------------------------------------------------------------------------------------------------

# The places as the caller passed them, so the printed -RemoveOld command points where this run did.
$script:Bound = @{}
foreach ($key in $PSBoundParameters.Keys) { $script:Bound[$key] = $PSBoundParameters[$key] }
$script:copies = [Collections.Generic.List[object]]::new()
$script:skips = [Collections.Generic.List[object]]::new()
$script:code = [Collections.Generic.List[object]]::new()
$script:codeKept = [Collections.Generic.List[object]]::new()
$script:conflicts = [Collections.Generic.List[object]]::new()
$refusals = [Collections.Generic.List[string]]::new()
try {
    if ($Apply -and $RemoveOld) {
        "CUTOVER REFUSED | -Apply and -RemoveOld are separate passes: -Apply first, -RemoveOld later"
        exit 1
    }
    $LiveRoot = Get-CleanPath $LiveRoot; $StagedRoot = Get-CleanPath $StagedRoot; $BaseList = Get-CleanPath $BaseList
    $OldTemp = Get-CleanPath $OldTemp; $OldState = Get-CleanPath $OldState
    foreach ($folder in @(@('-LiveRoot', $LiveRoot), @('-StagedRoot', $StagedRoot))) {
        if (-not (Test-Path -LiteralPath $folder[1] -PathType Container)) { $refusals.Add("$($folder[0]) $($folder[1]) is not a folder") }
    }
    if (-not (Test-Path -LiteralPath $BaseList -PathType Leaf)) { $refusals.Add("-BaseList $BaseList is not a file") }
    if ($refusals.Count -gt 0) { foreach ($reason in $refusals) { "CUTOVER REFUSED | $reason" }; exit 1 }

    $new = [ordered]@{}
    try { $new = Get-NewPlaces (Read-JsonFile (Join-Path $StagedRoot 'orchestration.config.json')) 'staged' $refusals }
    catch { $refusals.Add("the staged orchestration.config.json cannot be read: $($_.Exception.Message)"); foreach ($name in $StateKeys.Keys) { $new[$name] = $null } }
    Get-StatePlan $new

    if ($RemoveOld) {
        $problem = $null
        try {
            $liveNew = Get-NewPlaces (Read-JsonFile (Join-Path $LiveRoot 'orchestration.config.json')) 'live' ([Collections.Generic.List[string]]::new())
            foreach ($name in $StateKeys.Keys) {
                if ($null -eq $liveNew[$name] -or $liveNew[$name] -cne $new[$name]) {
                    $problem = "puts '$($StateKeys[$name])' at $(if ($liveNew[$name]) { $liveNew[$name] } else { 'no valid new place' }), the staged one at $($new[$name]): the live code does not use the new places yet; run -Apply first"
                    break
                }
            }
        }
        catch { $problem = "cannot be read: $($_.Exception.Message)" }
        if ($problem) { $refusals.Add("-RemoveOld: the live config $problem") }
        Invoke-RemoveOld ([pscustomobject]@{ Refusals = $refusals; New = $new })
    }

    $baseMap = Read-BaseList $BaseList $refusals
    Get-CodePlan $baseMap
    foreach ($conflict in $script:conflicts) { $refusals.Add("code conflict: $($conflict.Rel) ($($conflict.Why))") }
    if (-not $PipePrefix) {
        try { $PipePrefix = Get-Setting (Read-JsonFile (Join-Path $LiveRoot 'orchestration.config.json')) 'limitStop.pipePrefix' }
        catch { $refusals.Add("the live config gives no pipe prefix ($($_.Exception.Message)); pass -PipePrefix") }
    }
    if ($PipePrefix) {
        foreach ($pipe in Get-ListeningPipes $PipePrefix) { $refusals.Add("a limit-stop server listens: \\.\pipe\$pipe (a hand-over is in progress)") }
    }
    $marks = [Collections.Generic.List[object]]::new()
    if (Test-Path -LiteralPath $OldTemp -PathType Container) {
        foreach ($path in [IO.Directory]::GetFiles($OldTemp, 'claude-session-watch-*.txt') | Sort-Object) {
            if ([IO.Path]::GetFileName($path) -cmatch $watchMark) { $marks.Add([pscustomobject]@{ Id = $Matches.id; Path = $path }) }
        }
    }
    if ($new.RecordFolder -and (Test-Path -LiteralPath $new.RecordFolder -PathType Container)) {
        foreach ($path in [IO.Directory]::GetFiles($new.RecordFolder, '*.txt') | Sort-Object) {
            $marks.Add([pscustomobject]@{ Id = [IO.Path]::GetFileNameWithoutExtension($path); Path = $path })
        }
    }
    foreach ($mark in $marks) {
        $running = Get-RunningWatch $mark.Path
        if ($running) { $refusals.Add("a Usage and context watch still runs for session $($mark.Id) (PID $running, mark $($mark.Path)); the main session stops its own watches first, another chat's watch needs the user") }
    }
    foreach ($item in $script:copies) {
        if ($item.Kind -ceq 'differs') { $refusals.Add("$($item.To) already exists and differs from $($item.From), which it would receive") }
    }
    $plan = [pscustomobject]@{ Refusals = $refusals; New = $new }
    if ($Apply) { Invoke-Apply $plan } else { Write-DryRun $plan }
}
catch {
    "CUTOVER FAILED | unexpected: $($_.Exception.Message) (line $($_.InvocationInfo.ScriptLineNumber)); nothing more was done."
    exit 2
}
