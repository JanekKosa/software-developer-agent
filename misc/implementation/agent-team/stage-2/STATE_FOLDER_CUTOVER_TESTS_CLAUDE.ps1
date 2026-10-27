# Tests of STATE_FOLDER_CUTOVER_CLAUDE.ps1 (the switch-over of the team's state into one folder) and
# STATE_FOLDER_TRIM_LOG_CLAUDE.ps1 (the D-51 log trim). Self-contained and scratch only: each case builds its own
# world under %TEMP%\s3b-t-<run>\<case> (a fake live folder, staged copy and base list, fake old temp and old state
# folders, a fake home whose new root the staged config names) and runs the script with every place pointed into it.
# While a case runs, USERPROFILE, TEMP and TMP point into its world too, so a default that slipped through lands in
# scratch. The trim cases work on scratch copies of the real limit-stop log, which is only read.
#
#   pwsh -NoProfile -File STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1            the cases
#   pwsh -NoProfile -File STATE_FOLDER_CUTOVER_TESTS_CLAUDE.ps1 -Mutate    the cases, then the mutation check
#
# Exit code 0 when every case passed (and, with -Mutate, every mutant was caught), else 1.
param(
    # The cut-over script under test. The mutation check points it at mutants.
    [string]$ScriptPath = (Join-Path $PSScriptRoot 'STATE_FOLDER_CUTOVER_CLAUDE.ps1'),
    # The trim script under test.
    [string]$TrimPath = (Join-Path $PSScriptRoot 'STATE_FOLDER_TRIM_LOG_CLAUDE.ps1'),
    # The real limit-stop log, only ever read: the trim cases copy it into scratch.
    [string]$RealLog = (Join-Path $env:USERPROFILE '.claude\state\limit-stop.log'),
    # Also run the mutation check.
    [switch]$Mutate,
    # Run only the cases whose name contains this text.
    [string]$Only
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

$script:Cut = [IO.Path]::GetFullPath($ScriptPath)
$script:Trim = [IO.Path]::GetFullPath($TrimPath)
$script:RunRoot = Join-Path ([IO.Path]::GetTempPath()) "s3b-t-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$script:Prefix = "s3b-test-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$script:Sid1 = '11111111-2222-4333-8444-555555555555'
$script:Sid2 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
$script:Agent = 'a0114a36fbb10c5cf'
$script:TrimHash = '021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE'
$script:TestIds = @('5e551000-aaaa-bbbb-cccc-000000000001', '5e551000-aaaa-bbbb-cccc-000000000002', '7b3870e5-e7c1-4f3a-9961-398d55920189')
$script:Helper = $null
$script:HelperIds = [Collections.Generic.List[int]]::new()

# --- Assertions ----------------------------------------------------------------------------------------------------

# Fails the case with the message when the condition is false.
function Assert-True([bool]$condition, [string]$message) {
    if (-not $condition) { throw "ASSERT: $message" }
}

# Fails the case when the two values differ, showing both.
function Assert-Equal($expected, $actual, [string]$message) {
    if ("$expected" -cne "$actual") { throw "ASSERT: $message`n  expected: $expected`n  actual:   $actual" }
}

# Fails the case unless some line starts with the text (case-sensitive); returns the matching lines.
function Assert-Line([string[]]$lines, [string]$start, [string]$message) {
    $found = @($lines | Where-Object { $_.StartsWith($start, [StringComparison]::Ordinal) })
    if ($found.Count -eq 0) { throw "ASSERT: $message`n  no line starts with: $start`n  output:`n    $($lines -join "`n    ")" }
    return $found
}

# Fails the case when some line starts with the text.
function Assert-NoLine([string[]]$lines, [string]$start, [string]$message) {
    $found = @($lines | Where-Object { $_.StartsWith($start, [StringComparison]::Ordinal) })
    if ($found.Count -gt 0) { throw "ASSERT: $message`n  unexpected: $($found -join "`n  ")" }
}

# --- The world -----------------------------------------------------------------------------------------------------

# Writes a file with exact UTF-8 text (no BOM) and a last-write time, creating its folder.
function Write-WorldFile([string]$path, [string]$text, [datetime]$utc = [datetime]::new(2026, 10, 25, 9, 0, 0, [DateTimeKind]::Utc)) {
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path))
    [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
    [IO.File]::SetLastWriteTimeUtc($path, $utc)
}

# The SHA256 of a file's bytes, upper-case hex.
function Get-Sha([string]$path) {
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($path)))
}

# Every folder and file under a folder with length, write time and hash, one line each, sorted: equal snapshots mean
# nothing under it was written.
function Get-Snapshot([string]$dir) {
    $items = Get-ChildItem -LiteralPath $dir -Recurse -Force | Sort-Object FullName
    return (@($items | ForEach-Object {
                $rel = $_.FullName.Substring($dir.Length)
                if ($_.PSIsContainer) { "D $rel" } else { "F $rel $($_.Length) $($_.LastWriteTimeUtc.Ticks) $(Get-Sha $_.FullName)" }
            }) -join "`n")
}

# Builds one case's world and returns its places. Live and staged share a base; the staged copy changes the config,
# lib\config.mjs, lib\limit-stop.mjs, lib\agent-team.mjs and hooks\context-guard.mjs, adds tests\new.test.mjs, and
# leaves SKILL.md and lib\other.mjs as they were; live has its own edit of tests\keep.test.mjs (the staged copy keeps
# the base) and a file of its own. The old places hold two switch marks, two guard markers with locks, two decision
# records, a watch mark of a stopped watch, a slot holder, an empty probe folder, three state files and one that is not
# the team's.
function New-World([string]$dir) {
    $w = @{
        Dir = $dir; Live = Join-Path $dir 'live'; Staged = Join-Path $dir 'staged'; Base = Join-Path $dir 'base.txt'
        OldTemp = Join-Path $dir 'oldtemp'; OldState = Join-Path $dir 'home\.claude\state'; Home = Join-Path $dir 'home'
    }
    $w.NewRoot = Join-Path $w.Home '.claude\state\software-developer-agent'
    $oldConfig = @"
{
  "limitStop": { "pipePrefix": "$script:Prefix", "logFile": "%USERPROFILE%\\.claude\\state\\limit-stop.log" },
  "agentTeam": { "onFolder": "claude-agent-team-on" },
  "contextGuard": { "markerFolder": "claude-context-guard" }
}
"@
    $newConfig = @"
{
  "teamState": { "folder": "%USERPROFILE%\\.claude\\state\\software-developer-agent" },
  "usageLimits": { "stateFile": "usage-reading\\usage-limits.json" },
  "relaunch": { "logFile": "logs\\relaunch.log" },
  "usageAndContextWatch": { "recordFolder": "usage-watch" },
  "limitStop": { "pipePrefix": "$script:Prefix", "logFile": "logs\\limit-stop.log" },
  "contextGuard": { "markerFolder": "context-guard" },
  "agentTeam": { "onFolder": "team-on" }
}
"@
    $base = [ordered]@{
        'orchestration.config.json' = $oldConfig
        'SKILL.md'                  = "# skill`n"
        'hooks\context-guard.mjs'   = "// old guard`n"
        'lib\agent-team.mjs'        = "// old gate`n"
        'lib\config.mjs'            = "// old config reader`n"
        'lib\limit-stop.mjs'        = "// old limit stop`n"
        'lib\other.mjs'             = "// other, unchanged`n"
        'tests\keep.test.mjs'       = "// keep`n"
    }
    $baseLines = @('# base list of the live orchestrate-agents folder, taken 2026-10-27 10:53:38')
    foreach ($rel in $base.Keys) {
        Write-WorldFile (Join-Path $w.Live $rel) $base[$rel]
        Write-WorldFile (Join-Path $w.Staged $rel) $base[$rel]
        $baseLines += "$rel`t$(Get-Sha (Join-Path $w.Live $rel))"
    }
    $baseLines += '# SKILL.md re-based 2026-10-27 11:37:41'
    Write-WorldFile $w.Base (($baseLines -join "`r`n") + "`r`n")
    Write-WorldFile (Join-Path $w.Staged 'orchestration.config.json') $newConfig
    Write-WorldFile (Join-Path $w.Staged 'hooks\context-guard.mjs') "// new guard`n"
    Write-WorldFile (Join-Path $w.Staged 'lib\agent-team.mjs') "// new gate`n"
    Write-WorldFile (Join-Path $w.Staged 'lib\config.mjs') "// new config reader`n"
    Write-WorldFile (Join-Path $w.Staged 'lib\limit-stop.mjs') "// new limit stop`n"
    Write-WorldFile (Join-Path $w.Staged 'tests\new.test.mjs') "// new test`n"
    Write-WorldFile (Join-Path $w.Live 'tests\keep.test.mjs') "// keep, edited live`n"
    Write-WorldFile (Join-Path $w.Live 'live-only.txt') "only live`n"

    $t0 = [datetime]::new(2026, 10, 26, 8, 0, 0, [DateTimeKind]::Utc)
    $on = Join-Path $w.OldTemp 'claude-agent-team-on'
    Write-WorldFile (Join-Path $on $script:Sid1) '2026-10-27T10:00:11.000Z' $t0.AddMinutes(1)
    Write-WorldFile (Join-Path $on $script:Sid2) '2026-10-26T23:14:07.000Z' $t0.AddMinutes(2)
    $guard = Join-Path $w.OldTemp 'claude-context-guard'
    Write-WorldFile (Join-Path $guard "$script:Agent.json") '{"level":"warn","size":330512,"at":"2026-10-25T23:06:25.000+02:00"}' $t0.AddMinutes(3)
    Write-WorldFile (Join-Path $guard "session-$script:Sid1.json") '{"level":"warn","size":451000,"at":"2026-10-27T09:34:06.000+02:00"}' $t0.AddMinutes(4)
    Write-WorldFile (Join-Path $guard "$script:Agent.json.lock") '4242' $t0.AddMinutes(5)
    Write-WorldFile (Join-Path $guard 'markers.lock') '4243' $t0.AddMinutes(6)
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid1.txt") '999999 638655000000000000' $t0.AddMinutes(7)
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid1.decision.json") '{"decision":"handover","window":"fiveHour","resetsAt":"2026-10-27T13:05:00+02:00"}' $t0.AddMinutes(8)
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.decision.json") '{"decision":"resume","window":"weekly"}' $t0.AddMinutes(9)
    Write-WorldFile (Join-Path $w.OldTemp 'xpp-agent-heavy-command-slot-1.txt') '5150 638655000000000000' $t0.AddMinutes(10)
    Write-WorldFile (Join-Path $w.OldTemp 'unrelated.txt') 'not the team''s' $t0.AddMinutes(11)
    [void][IO.Directory]::CreateDirectory((Join-Path $w.OldTemp 'claude-usage-probe'))
    Write-WorldFile (Join-Path $w.OldState 'usage-limits.json') '{"checkedAt":"2026-10-27T12:27:00+02:00","fiveHour":{"percent":41,"resetsAt":"2026-10-27T15:00:00+02:00"}}' $t0.AddMinutes(12)
    Write-WorldFile (Join-Path $w.OldState 'relaunch.log') "2026-10-27 09:36:11 | started the session in VS Code`r`n2026-10-27 09:36:12 | pressed Enter – done`n" $t0.AddMinutes(13)
    Write-WorldFile (Join-Path $w.OldState 'limit-stop.log') "2026-10-26 11:11:45 | $script:Sid1 | told the main session`n" $t0.AddMinutes(14)
    Write-WorldFile (Join-Path $w.OldState 'mcp-discover-verdicts.json') '{}' $t0.AddMinutes(15)
    return $w
}

# The nine files the plan copies, as old path -> new path.
function Get-ExpectedCopies($w) {
    $map = [ordered]@{}
    $map[(Join-Path $w.OldTemp "claude-agent-team-on\$script:Sid1")] = Join-Path $w.NewRoot "team-on\$script:Sid1"
    $map[(Join-Path $w.OldTemp "claude-agent-team-on\$script:Sid2")] = Join-Path $w.NewRoot "team-on\$script:Sid2"
    $map[(Join-Path $w.OldTemp "claude-context-guard\$script:Agent.json")] = Join-Path $w.NewRoot "context-guard\$script:Agent.json"
    $map[(Join-Path $w.OldTemp "claude-context-guard\session-$script:Sid1.json")] = Join-Path $w.NewRoot "context-guard\session-$script:Sid1.json"
    $map[(Join-Path $w.OldState 'usage-limits.json')] = Join-Path $w.NewRoot 'usage-reading\usage-limits.json'
    $map[(Join-Path $w.OldState 'relaunch.log')] = Join-Path $w.NewRoot 'logs\relaunch.log'
    $map[(Join-Path $w.OldState 'limit-stop.log')] = Join-Path $w.NewRoot 'logs\limit-stop.log'
    $map[(Join-Path $w.OldTemp "claude-session-watch-$script:Sid1.decision.json")] = Join-Path $w.NewRoot "usage-watch\$script:Sid1.decision.json"
    $map[(Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.decision.json")] = Join-Path $w.NewRoot "usage-watch\$script:Sid2.decision.json"
    return $map
}

# Runs the cut-over script in this process with every place in the world, plus the given switches or parameters.
# Returns its output lines and exit code.
function Invoke-Cut($w, [hashtable]$more = @{}) {
    $arguments = @{ LiveRoot = $w.Live; StagedRoot = $w.Staged; BaseList = $w.Base; OldTemp = $w.OldTemp; OldState = $w.OldState }
    foreach ($key in $more.Keys) { $arguments[$key] = $more[$key] }
    $global:LASTEXITCODE = 0
    $lines = @(& $script:Cut @arguments 2>&1 | ForEach-Object { "$_" })
    return @{ Lines = $lines; Exit = $global:LASTEXITCODE }
}

# A process this run started and stops at its end: its id and start time make a running watch's mark.
function Get-HelperProcess {
    if (-not $script:Helper -or $script:Helper.HasExited) {
        $script:Helper = Start-Process -FilePath "$env:SystemRoot\System32\PING.EXE" -ArgumentList '-n', '7200', '127.0.0.1' -WindowStyle Hidden -PassThru
        $script:HelperIds.Add($script:Helper.Id)
    }
    return $script:Helper
}

# The mark a running watch writes: "<PID> <StartTime.Ticks>".
function Get-RunningMark {
    $helper = Get-HelperProcess
    return "$($helper.Id) $((Get-Process -Id $helper.Id).StartTime.Ticks)"
}

# --- Cut-over cases ------------------------------------------------------------------------------------------------

$cases = [Collections.Generic.List[object]]::new()
function Add-Case([string]$name, [scriptblock]$body) { $cases.Add([pscustomobject]@{ Name = $name; Body = $body }) }

Add-Case 'dry run prints the whole plan and writes nothing' {
    param($w)
    $before = Get-Snapshot $w.Dir
    $run = Invoke-Cut $w
    Assert-Equal $before (Get-Snapshot $w.Dir) 'the world changed during a dry run'
    Assert-Equal 0 $run.Exit 'dry-run exit code'
    foreach ($entry in (Get-ExpectedCopies $w).GetEnumerator()) {
        [void](Assert-Line $run.Lines "PLAN COPY | $($entry.Key) -> $($entry.Value)" 'a planned state copy is missing')
    }
    Assert-Equal 9 @($run.Lines | Where-Object { $_.StartsWith('PLAN COPY | ') }).Count 'number of planned state copies'
    Assert-Equal 6 @($run.Lines | Where-Object { $_.StartsWith('PLAN CODE | ') }).Count 'number of planned code copies'
    [void](Assert-Line $run.Lines "SKIP | $(Join-Path $w.OldTemp "claude-context-guard\$script:Agent.json.lock") (" 'the lock is not listed as skipped')
    [void](Assert-Line $run.Lines "SKIP | $(Join-Path $w.OldTemp "claude-session-watch-$script:Sid1.txt") (" 'the watch mark is not listed as skipped')
    [void](Assert-Line $run.Lines "SKIP | $(Join-Path $w.OldTemp 'xpp-agent-heavy-command-slot-1.txt') (" 'the slot holder is not listed as skipped')
    [void](Assert-Line $run.Lines 'CODE KEPT | tests\keep.test.mjs (' 'the live-only edit is not shown')
    Assert-NoLine $run.Lines 'CUTOVER REFUSED' 'a clean world was refused'
    Assert-True ($run.Lines[-1].StartsWith('CUTOVER DRY RUN | 9 state files and 6 code files to copy')) "last line: $($run.Lines[-1])"
}

Add-Case 'apply copies exactly the planned files, keeps their times and leaves the rest' {
    param($w)
    $liveBefore = @{}
    foreach ($rel in 'SKILL.md', 'lib\other.mjs', 'tests\keep.test.mjs', 'live-only.txt') { $liveBefore[$rel] = Get-Sha (Join-Path $w.Live $rel) }
    $oldTempBefore = Get-Snapshot $w.OldTemp
    $oldStateBefore = @(Get-ChildItem -LiteralPath $w.OldState -File | ForEach-Object { "$($_.Name) $($_.LastWriteTimeUtc.Ticks) $(Get-Sha $_.FullName)" }) -join '|'
    $stagedBefore = Get-Snapshot $w.Staged
    $run = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $run.Exit "apply exit code; output:`n$($run.Lines -join "`n")"
    $expected = Get-ExpectedCopies $w
    $made = @(Get-ChildItem -LiteralPath $w.NewRoot -Recurse -File -Force | ForEach-Object FullName | Sort-Object)
    Assert-Equal (@($expected.Values | Sort-Object) -join '|') ($made -join '|') 'the files in the new root'
    foreach ($entry in $expected.GetEnumerator()) {
        Assert-Equal (Get-Sha $entry.Key) (Get-Sha $entry.Value) "bytes of $($entry.Value)"
        Assert-Equal ([IO.File]::GetLastWriteTimeUtc($entry.Key).Ticks) ([IO.File]::GetLastWriteTimeUtc($entry.Value).Ticks) "write time of $($entry.Value)"
        [void](Assert-Line $run.Lines "COPIED | $($entry.Key) -> $($entry.Value)" 'a COPIED line is missing')
    }
    foreach ($rel in 'orchestration.config.json', 'lib\config.mjs', 'lib\limit-stop.mjs', 'hooks\context-guard.mjs', 'tests\new.test.mjs', 'lib\agent-team.mjs') {
        Assert-Equal (Get-Sha (Join-Path $w.Staged $rel)) (Get-Sha (Join-Path $w.Live $rel)) "live $rel is not the staged one"
    }
    foreach ($rel in $liveBefore.Keys) { Assert-Equal $liveBefore[$rel] (Get-Sha (Join-Path $w.Live $rel)) "live $rel was changed" }
    Assert-Equal $stagedBefore (Get-Snapshot $w.Staged) 'the staged copy was changed'
    Assert-Equal $oldTempBefore (Get-Snapshot $w.OldTemp) 'apply changed the old temp folder'
    Assert-Equal $oldStateBefore (@(Get-ChildItem -LiteralPath $w.OldState -File | ForEach-Object { "$($_.Name) $($_.LastWriteTimeUtc.Ticks) $(Get-Sha $_.FullName)" }) -join '|') 'apply changed an old state file'
    Assert-True (@(Get-ChildItem -LiteralPath $w.Dir -Recurse -Force -Filter '*.tmp').Count -eq 0) 'a temp file was left behind'
    foreach ($old in $expected.Keys) { Assert-True (Test-Path -LiteralPath $old) "apply deleted the old file $old" }
    Assert-True ($run.Lines -ccontains 'CUTOVER DONE | 9 state files, 6 code files') "no DONE line; output:`n$($run.Lines -join "`n")"
    [void](Assert-Line $run.Lines "NEXT | 1. node '$(Join-Path $w.Live 'scripts\team-on.mjs')'" 'the first next step is missing')
    [void](Assert-Line $run.Lines 'NEXT | ' 'no next steps')
    Assert-True (@($run.Lines | Where-Object { $_.Contains('-RemoveOld') }).Count -gt 0) 'the next steps do not name -RemoveOld'
}

Add-Case 'apply copies the config first, the libraries next and the gate lib\agent-team.mjs last' {
    param($w)
    $plan = Invoke-Cut $w
    $run = Invoke-Cut $w @{ Apply = $true }
    $order = @($run.Lines | Where-Object { $_.StartsWith('CODE | ') } | ForEach-Object { $_.Substring(7) })
    Assert-Equal 'orchestration.config.json|lib\config.mjs|lib\limit-stop.mjs|hooks\context-guard.mjs|tests\new.test.mjs|lib\agent-team.mjs' ($order -join '|') 'the code order'
    $planned = @($plan.Lines | Where-Object { $_.StartsWith('PLAN CODE | ') } | ForEach-Object { ($_.Substring(12) -split ' \(')[0] })
    Assert-Equal ($order -join '|') ($planned -join '|') 'the dry run plans the same order'
}

Add-Case 'a second apply finds everything the same and writes nothing' {
    param($w)
    $first = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $first.Exit 'first apply'
    $before = Get-Snapshot $w.Dir
    $second = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $second.Exit "second apply; output:`n$($second.Lines -join "`n")"
    Assert-Equal $before (Get-Snapshot $w.Dir) 'the second apply wrote something'
    Assert-NoLine $second.Lines 'COPIED |' 'the second apply copied a state file'
    Assert-NoLine $second.Lines 'CODE |' 'the second apply copied code'
    Assert-Equal 9 @($second.Lines | Where-Object { $_.StartsWith('SAME | ') }).Count 'SAME lines'
    Assert-True ($second.Lines -ccontains 'CUTOVER DONE | 0 state files, 0 code files') 'second DONE line'
}

Add-Case 'an identical file already in the new place is SAME and the rest is copied' {
    param($w)
    $from = Join-Path $w.OldTemp "claude-agent-team-on\$script:Sid1"
    $to = Join-Path $w.NewRoot "team-on\$script:Sid1"
    Write-WorldFile $to ([IO.File]::ReadAllText($from)) ([datetime]::new(2026, 10, 27, 1, 0, 0, [DateTimeKind]::Utc))
    $run = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $run.Exit 'apply'
    [void](Assert-Line $run.Lines "SAME | $from -> $to" 'no SAME line')
    Assert-True ($run.Lines -ccontains 'CUTOVER DONE | 8 state files, 6 code files') 'DONE counts'
}

# Each refusal: the whole world is unchanged, the exit code is 1, and the reason is named.
function Test-Refusal($w, [string]$start, [hashtable]$more = @{ Apply = $true }) {
    $before = Get-Snapshot $w.Dir
    $run = Invoke-Cut $w $more
    Assert-Equal $before (Get-Snapshot $w.Dir) "a refused run wrote something; output:`n$($run.Lines -join "`n")"
    Assert-Equal 1 $run.Exit "refused exit code; output:`n$($run.Lines -join "`n")"
    $found = Assert-Line $run.Lines "CUTOVER REFUSED | $start" 'the refusal is missing'
    Assert-NoLine $run.Lines 'CUTOVER DONE' 'a refused run said DONE'
    return $found
}

Add-Case 'refuses a code conflict: live and staged both changed one file' {
    param($w)
    Write-WorldFile (Join-Path $w.Live 'lib\config.mjs') "// live hotfix`n"
    [void](Test-Refusal $w 'code conflict: lib\config.mjs ')
}

Add-Case 'refuses a base file missing from the staged copy' {
    param($w)
    Remove-Item -LiteralPath (Join-Path $w.Staged 'SKILL.md')
    [void](Test-Refusal $w 'code conflict: SKILL.md ')
}

Add-Case 'refuses a new staged file that live already has with other content' {
    param($w)
    Write-WorldFile (Join-Path $w.Live 'tests\new.test.mjs') "// someone else's test`n"
    [void](Test-Refusal $w 'code conflict: tests\new.test.mjs ')
}

Add-Case 'refuses while a limit-stop server listens' {
    param($w)
    $pipe = [IO.Pipes.NamedPipeServerStream]::new("$script:Prefix-$script:Sid1")
    try { $line = @(Test-Refusal $w 'a limit-stop server listens') }
    finally { $pipe.Dispose() }
    Assert-True ($line[0].Contains("\\.\pipe\$script:Prefix-$script:Sid1")) "the pipe is not named: $line"
}

Add-Case 'refuses while a watch runs with an old mark' {
    param($w)
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") (Get-RunningMark)
    $line = @(Test-Refusal $w "a Usage and context watch still runs for session $script:Sid2 (PID $($script:Helper.Id)")
    Assert-True ($line[0].Contains("claude-session-watch-$script:Sid2.txt")) "the mark is not named: $line"
}

Add-Case 'refuses while a watch runs with a new mark' {
    param($w)
    Write-WorldFile (Join-Path $w.NewRoot "usage-watch\$script:Sid2.txt") (Get-RunningMark)
    [void](Test-Refusal $w "a Usage and context watch still runs for session $script:Sid2 (PID $($script:Helper.Id)")
}

Add-Case 'a mark whose process is gone or started at another time is no running watch' {
    param($w)
    $helper = Get-HelperProcess
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") "$($helper.Id) 638000000000000000"
    $run = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $run.Exit "apply; output:`n$($run.Lines -join "`n")"
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $w.NewRoot "usage-watch\$script:Sid2.txt"))) 'a watch mark was copied'
}

Add-Case 'refuses when a new-place file differs from the old file it would receive' {
    param($w)
    $to = Join-Path $w.NewRoot 'logs\limit-stop.log'
    Write-WorldFile $to "2026-10-27 13:00:00 | $script:Sid1 | written by new code`n"
    $line = Test-Refusal $w "$to already exists and differs from $(Join-Path $w.OldState 'limit-stop.log')"
    Assert-True ($null -ne $line) 'refusal'
}

Add-Case 'refuses a staged setting that is not a plain path under the root' {
    param($w)
    $config = Join-Path $w.Staged 'orchestration.config.json'
    $text = [IO.File]::ReadAllText($config).Replace('"logs\\relaunch.log"', '"%USERPROFILE%\\.claude\\state\\relaunch.log"').Replace('"team-on"', '"..\\team-on"')
    Write-WorldFile $config $text
    [void](Test-Refusal $w "staged orchestration.config.json setting 'relaunch.logFile' must be a path under 'teamState.folder' but has a '%'")
    [void](Test-Refusal $w "staged orchestration.config.json setting 'agentTeam.onFolder' must be a path under 'teamState.folder' but has a '.' or '..' part")
}

Add-Case 'refuses a base list line that is not path, tab, hash' {
    param($w)
    Add-Content -LiteralPath $w.Base -Value 'lib\broken.mjs 1234'
    [void](Test-Refusal $w 'the base list')
}

Add-Case 'refuses -Apply and -RemoveOld together' {
    param($w)
    [void](Test-Refusal $w '-Apply and -RemoveOld' @{ Apply = $true; RemoveOld = $true })
}

Add-Case 'names every reason at once, and the dry run refuses too' {
    param($w)
    Write-WorldFile (Join-Path $w.Live 'lib\config.mjs') "// live hotfix`n"
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") (Get-RunningMark)
    $pipe = [IO.Pipes.NamedPipeServerStream]::new("$script:Prefix-$script:Sid2")
    try {
        foreach ($more in @(@{ Apply = $true }, @{})) {
            $before = Get-Snapshot $w.Dir
            $run = Invoke-Cut $w $more
            Assert-Equal $before (Get-Snapshot $w.Dir) 'a refused run wrote something'
            Assert-Equal 1 $run.Exit 'exit code'
            Assert-Equal 3 @($run.Lines | Where-Object { $_.StartsWith('CUTOVER REFUSED | ') }).Count "refusal lines; output:`n$($run.Lines -join "`n")"
        }
    }
    finally { $pipe.Dispose() }
}

Add-Case 'never copies a name that fails the session id check' {
    param($w)
    Write-WorldFile (Join-Path $w.OldTemp 'claude-agent-team-on\bad name.tmp') 'x'
    Write-WorldFile (Join-Path $w.OldTemp 'claude-session-watch-bad id.decision.json') '{}'
    $plan = Invoke-Cut $w
    [void](Assert-Line $plan.Lines "SKIP | $(Join-Path $w.OldTemp 'claude-agent-team-on\bad name.tmp') (not a session id" 'the bad switch-mark name is not skipped')
    [void](Assert-Line $plan.Lines "SKIP | $(Join-Path $w.OldTemp 'claude-session-watch-bad id.decision.json') (not a session id" 'the bad record name is not skipped')
    $run = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $run.Exit "apply; output:`n$($run.Lines -join "`n")"
    Assert-Equal 9 @(Get-ChildItem -LiteralPath $w.NewRoot -Recurse -File).Count 'files in the new root'
}

Add-Case 'runs as a child process with the exit codes the main session sees' {
    param($w)
    $common = @('-NoProfile', '-File', $script:Cut, '-LiveRoot', $w.Live, '-StagedRoot', $w.Staged, '-BaseList', $w.Base, '-OldTemp', $w.OldTemp, '-OldState', $w.OldState)
    $out = @(& pwsh @common 2>&1 | ForEach-Object { "$_" })
    Assert-Equal 0 $LASTEXITCODE "child dry run; output:`n$($out -join "`n")"
    Assert-True ($out[-1].StartsWith('CUTOVER DRY RUN | 9 state files and 6 code files')) "child last line: $($out[-1])"
    Write-WorldFile (Join-Path $w.Live 'lib\config.mjs') "// live hotfix`n"
    $out = @(& pwsh @common '-Apply' 2>&1 | ForEach-Object { "$_" })
    Assert-Equal 1 $LASTEXITCODE "child refused apply; output:`n$($out -join "`n")"
}

# --- -RemoveOld ----------------------------------------------------------------------------------------------------

Add-Case 'RemoveOld before the switch-over refuses and deletes nothing' {
    param($w)
    [void](Test-Refusal $w '-RemoveOld: the live config' @{ RemoveOld = $true })
}

Add-Case 'RemoveOld deletes only identical old copies and keeps the rest with the reason' {
    param($w)
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") '777777 638655000000000000'
    $apply = Invoke-Cut $w @{ Apply = $true }
    Assert-Equal 0 $apply.Exit 'apply'
    # After the switch: the new code updated one guard marker, and a new watch runs whose old-style mark is still there.
    $changed = Join-Path $w.NewRoot "context-guard\$script:Agent.json"
    Write-WorldFile $changed '{"level":"stop","size":371000,"at":"2026-10-27T14:00:00.000+02:00"}'
    Write-WorldFile (Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") (Get-RunningMark)
    $newBefore = Get-Snapshot $w.NewRoot
    $liveBefore = Get-Snapshot $w.Live
    $run = Invoke-Cut $w @{ RemoveOld = $true }
    Assert-Equal 0 $run.Exit "RemoveOld; output:`n$($run.Lines -join "`n")"
    $expected = Get-ExpectedCopies $w
    foreach ($entry in $expected.GetEnumerator()) {
        if ($entry.Value -ceq $changed) {
            Assert-True (Test-Path -LiteralPath $entry.Key) 'a differing old file was deleted'
            [void](Assert-Line $run.Lines "KEPT | $($entry.Key) (differs from $($entry.Value))" 'the differing file is not reported')
        }
        else {
            Assert-True (-not (Test-Path -LiteralPath $entry.Key)) "identical old file kept: $($entry.Key)"
            [void](Assert-Line $run.Lines "REMOVED | $($entry.Key)" 'a REMOVED line is missing')
        }
    }
    foreach ($kept in "claude-context-guard\$script:Agent.json.lock", 'claude-context-guard\markers.lock', "claude-session-watch-$script:Sid1.txt", "claude-session-watch-$script:Sid2.txt", 'xpp-agent-heavy-command-slot-1.txt', 'unrelated.txt') {
        Assert-True (Test-Path -LiteralPath (Join-Path $w.OldTemp $kept)) "RemoveOld deleted $kept"
    }
    [void](Assert-Line $run.Lines "KEPT | $(Join-Path $w.OldTemp "claude-session-watch-$script:Sid2.txt") (belongs to a running watch, PID $($script:Helper.Id))" 'the running watch mark is not reported')
    [void](Assert-Line $run.Lines "KEPT | $(Join-Path $w.OldTemp "claude-session-watch-$script:Sid1.txt") (never copied" 'the stopped watch mark is not reported')
    [void](Assert-Line $run.Lines "KEPT | $(Join-Path $w.OldTemp 'xpp-agent-heavy-command-slot-1.txt') (" 'the slot holder is not reported')
    [void](Assert-Line $run.Lines "KEPT | $(Join-Path $w.OldTemp "claude-context-guard\$script:Agent.json.lock") (" 'the lock is not reported')
    Assert-True (Test-Path -LiteralPath (Join-Path $w.OldState 'mcp-discover-verdicts.json')) 'a file that is not the team''s was deleted'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $w.OldTemp 'claude-agent-team-on'))) 'the emptied switch-mark folder is still there'
    [void](Assert-Line $run.Lines "REMOVED FOLDER | $(Join-Path $w.OldTemp 'claude-agent-team-on')" 'no REMOVED FOLDER line')
    Assert-True (Test-Path -LiteralPath (Join-Path $w.OldTemp 'claude-context-guard')) 'a folder that still holds files was removed'
    [void](Assert-Line $run.Lines "KEPT FOLDER | $(Join-Path $w.OldTemp 'claude-context-guard') (" 'no KEPT FOLDER line')
    Assert-True (Test-Path -LiteralPath (Join-Path $w.OldTemp 'claude-usage-probe')) 'the probe folder was removed'
    Assert-True (Test-Path -LiteralPath $w.OldState) 'the old state folder was removed'
    Assert-Equal $newBefore (Get-Snapshot $w.NewRoot) 'RemoveOld changed the new root'
    Assert-Equal $liveBefore (Get-Snapshot $w.Live) 'RemoveOld changed the live folder'
    [void](Assert-Line $run.Lines 'REMOVE OLD DONE | 8 files removed' 'no REMOVE OLD DONE line')
    $again = Invoke-Cut $w @{ RemoveOld = $true }
    Assert-Equal 0 $again.Exit 'second RemoveOld'
    Assert-NoLine $again.Lines 'REMOVED |' 'the second RemoveOld removed something'
}

# --- Trim cases ----------------------------------------------------------------------------------------------------

# Copies the real log into the case's folder (the real file is only read) and returns the copy's path.
function Copy-RealLog($w) {
    Assert-True (Test-Path -LiteralPath $RealLog -PathType Leaf) "the real log $RealLog is not there to copy"
    $copy = Join-Path $w.Dir 'limit-stop.log'
    [IO.File]::WriteAllBytes($copy, [IO.File]::ReadAllBytes($RealLog))
    return $copy
}

# Runs the trim script on a log in this process. Returns its output lines and exit code.
function Invoke-Trim([string]$log) {
    $global:LASTEXITCODE = 0
    $lines = @(& $script:Trim -LogPath $log 2>&1 | ForEach-Object { "$_" })
    return @{ Lines = $lines; Exit = $global:LASTEXITCODE }
}

# The first 841 bytes of a file.
function Get-Head([string]$path) { return [byte[]]([IO.File]::ReadAllBytes($path)[0..840]) }

$script:RealLine = "2026-10-27 13:02:11 | 56c67d3d-b3c0-43be-a82c-b3a9cdc23274 | listening on \\.\pipe\claude-limit-stop-56c67d3d-b3c0-43be-a82c-b3a9cdc23274 (pid 4242): the five-hour limit at 95% resets 14:00; watching the session's Claude Code process 4100 – ä`n"

Add-Case 'trim cuts a copy of the real log back to its first 841 bytes' {
    param($w)
    $log = Copy-RealLog $w
    $run = Invoke-Trim $log
    Assert-Equal 0 $run.Exit "trim; output:`n$($run.Lines -join "`n")"
    Assert-Equal 841 ([IO.FileInfo]::new($log).Length) 'trimmed length'
    Assert-Equal $script:TrimHash (Get-Sha $log) 'trimmed hash'
}

Add-Case 'trim keeps a real line written after the test lines, and one between them' {
    param($w)
    $log = Copy-RealLog $w
    $bytes = [IO.File]::ReadAllBytes($log)
    $tail = [Text.Encoding]::UTF8.GetString($bytes, 841, $bytes.Length - 841)
    $cut = $tail.IndexOf("`n", $tail.Length / 2) + 1
    $between = "2026-10-27 11:30:00 | 56c67d3d-b3c0-43be-a82c-b3a9cdc23274 | told the main session`n"
    $last = $script:RealLine.TrimEnd("`n")
    $text = $tail.Substring(0, $cut) + $between + $tail.Substring($cut) + $last
    [IO.File]::WriteAllBytes($log, [byte[]]($bytes[0..840] + [Text.Encoding]::UTF8.GetBytes($text)))
    $run = Invoke-Trim $log
    Assert-Equal 0 $run.Exit "trim; output:`n$($run.Lines -join "`n")"
    $expected = [byte[]]($bytes[0..840] + [Text.Encoding]::UTF8.GetBytes($between + $last))
    Assert-Equal ([Convert]::ToHexString($expected)) ([Convert]::ToHexString([IO.File]::ReadAllBytes($log))) 'the trimmed log'
}

Add-Case 'trim refuses when the first 841 bytes are not the real ones and changes nothing' {
    param($w)
    $log = Copy-RealLog $w
    $bytes = [IO.File]::ReadAllBytes($log)
    $bytes[100] = [byte][char]'X'
    [IO.File]::WriteAllBytes($log, $bytes)
    $before = Get-Sha $log
    $run = Invoke-Trim $log
    Assert-Equal 1 $run.Exit 'refused exit code'
    [void](Assert-Line $run.Lines 'TRIM REFUSED | ' 'no refusal line')
    Assert-Equal $before (Get-Sha $log) 'a refused trim changed the log'
}

Add-Case 'trim of a log that is already 841 bytes does nothing' {
    param($w)
    $log = Copy-RealLog $w
    [IO.File]::WriteAllBytes($log, (Get-Head $log))
    $time = [IO.File]::GetLastWriteTimeUtc($log)
    $run = Invoke-Trim $log
    Assert-Equal 0 $run.Exit 'exit code'
    [void](Assert-Line $run.Lines 'TRIM NOTHING TO DO | ' 'no nothing-to-do line')
    Assert-Equal $time.Ticks ([IO.File]::GetLastWriteTimeUtc($log).Ticks) 'the log was written'
}

Add-Case 'trim refuses a log shorter than 841 bytes' {
    param($w)
    $log = Join-Path $w.Dir 'short.log'
    Write-WorldFile $log 'short'
    $run = Invoke-Trim $log
    Assert-Equal 1 $run.Exit 'exit code'
    [void](Assert-Line $run.Lines 'TRIM REFUSED | ' 'no refusal line')
}

# --- The runner ----------------------------------------------------------------------------------------------------

# Removes a scratch folder. Windows finishes removing a file a moment after the call returns, so a recursive delete
# can report "The directory is not empty" while nothing is locked (machine-pitfalls, files-and-links.md); the same
# delete is then run again, up to three times. Never throws: a folder that stays is named in a warning, and the
# CLEANUP line says whether the run folder is gone.
function Remove-Scratch([string]$dir) {
    for ($try = 1; $try -le 3 -and (Test-Path -LiteralPath $dir); $try++) {
        try { Remove-Item -LiteralPath $dir -Recurse -Force }
        catch { Start-Sleep -Milliseconds 300 }
    }
    if (Test-Path -LiteralPath $dir) { Write-Warning "scratch folder not removed: $dir" }
}

# Runs every case (or those named by -Only) against the current $script:Cut / $script:Trim. Each case gets its own
# world and its own USERPROFILE/TEMP/TMP in that world; both are put back and the world removed afterwards. Returns
# the names of the failed cases; prints each result unless -Quiet.
function Invoke-Cases([switch]$Quiet) {
    $failed = [Collections.Generic.List[string]]::new()
    $n = 0
    foreach ($case in $cases) {
        if ($Only -and -not $case.Name.Contains($Only)) { continue }
        $n++
        $dir = Join-Path $script:RunRoot "c$n"
        $saved = @{ USERPROFILE = $env:USERPROFILE; TEMP = $env:TEMP; TMP = $env:TMP }
        try {
            $w = New-World $dir
            $env:USERPROFILE = $w.Home
            $env:TEMP = Join-Path $dir 'tmp'; $env:TMP = $env:TEMP
            [void][IO.Directory]::CreateDirectory($env:TEMP)
            & $case.Body $w
            if (-not $Quiet) { "PASS  $($case.Name)" }
        }
        catch {
            $failed.Add($case.Name)
            if (-not $Quiet) { "FAIL  $($case.Name)`n      $($_.Exception.Message -replace "`n", "`n      ")" }
        }
        finally {
            $env:USERPROFILE = $saved.USERPROFILE; $env:TEMP = $saved.TEMP; $env:TMP = $saved.TMP
            Remove-Scratch $dir
        }
    }
    $script:LastFailed = $failed
}

# --- Mutation check ------------------------------------------------------------------------------------------------

# Each mutant breaks one rule of a script: the text to find (exactly once) and what replaces it.
$mutants = @(
    @{ Name = 'refusal 1 skipped: a code conflict is not refused'; File = 'cut'; Find = '$refusals.Add("code conflict: '; Replace = '[void]("code conflict: ' }
    @{ Name = 'staged deletion not a conflict'; File = 'cut'; Find = '$script:conflicts.Add([pscustomobject]@{ Rel = $rel; Why = ''in the base list but missing'; Replace = '[void]([pscustomobject]@{ Rel = $rel; Why = ''in the base list but missing' }
    @{ Name = 'refusal 2 skipped: an open pipe is not refused'; File = 'cut'; Find = '$refusals.Add("a limit-stop server listens'; Replace = '[void]("a limit-stop server listens' }
    @{ Name = 'refusal 3 skipped: a running watch is not refused'; File = 'cut'; Find = '$refusals.Add("a Usage and context watch still runs'; Replace = '[void]("a Usage and context watch still runs' }
    @{ Name = 'refusal 3 weakened: the start time is not compared'; File = 'cut'; Find = '$process.StartTime.Ticks -eq $ticks'; Replace = '$true' }
    @{ Name = 'refusal 4 skipped: a differing new file is not refused'; File = 'cut'; Find = '$refusals.Add("$($item.To) already exists and differs'; Replace = '[void]("$($item.To) already exists and differs' }
    @{ Name = '.lock files copied'; File = 'cut'; Find = "elseif (`$name.EndsWith('.json', [StringComparison]::OrdinalIgnoreCase)) {"; Replace = "elseif (`$name.Contains('.json')) {" }
    @{ Name = '.txt watch marks copied'; File = 'cut'; Find = 'Add-Skip $file.FullName (Get-WatchMarkWhy $file.FullName)'; Replace = 'if ($new.RecordFolder) { Add-Copy $file.FullName (Join-Path $new.RecordFolder "$($Matches.id).txt") }' }
    @{ Name = 'slot holders copied'; File = 'cut'; Find = 'Add-Skip $file.FullName ''a run-heavy slot holder: it belongs to a running command, never copied'''; Replace = 'if ($new.RecordFolder) { Add-Copy $file.FullName (Join-Path $new.RecordFolder $name) }' }
    @{ Name = 'session id check skipped'; File = 'cut'; Find = '$SessionIdPattern = ''^[A-Za-z0-9-]{1,128}\z'''; Replace = '$SessionIdPattern = ''.'''}
    @{ Name = 'write time not kept'; File = 'cut'; Find = '[IO.File]::SetLastWriteTimeUtc($temp, $time)'; Replace = '[void]$time' }
    @{ Name = 'dry run writes'; File = 'cut'; Find = 'if ($Apply) { Invoke-Apply $plan } else { Write-DryRun $plan }'; Replace = 'Invoke-Apply $plan' }
    @{ Name = 'identical files rewritten instead of SAME'; File = 'cut'; Find = '$kind = if ($null -eq $toHash) { ''copy'' } elseif ($toHash -ceq $fromHash) { ''same'' } else { ''differs'' }'; Replace = '$kind = if ($null -eq $toHash -or $toHash -ceq $fromHash) { ''copy'' } else { ''differs'' }' }
    @{ Name = 'code order: the gate not last'; File = 'cut'; Find = "'lib\agent-team.mjs' { 4 }"; Replace = "'lib\agent-team.mjs' { 2 }" }
    @{ Name = 'code order: the config not first'; File = 'cut'; Find = "'orchestration.config.json' { 0 }"; Replace = "'orchestration.config.json' { 3 }" }
    @{ Name = 'staged change copied over a live edit (L != B)'; File = 'cut'; Find = 'elseif ($live -ceq $base) {'; Replace = 'elseif ($true) {' }
    @{ Name = 'RemoveOld deletes a differing file'; File = 'cut'; Find = 'if ($newHash -ceq $oldHash) {'; Replace = 'if ($null -ne $newHash) {' }
    @{ Name = 'RemoveOld removes a folder that is not empty'; File = 'cut'; Find = '[IO.Directory]::Delete($folder, $false)'; Replace = '[IO.Directory]::Delete($folder, $true)'; Then = @{ Find = 'if ($left -gt 0) {'; Replace = 'if ($false) {' } }
    @{ Name = 'RemoveOld runs before the switch-over'; File = 'cut'; Find = '$refusals.Add("-RemoveOld: the live config'; Replace = '[void]("-RemoveOld: the live config' }
    @{ Name = 'trim: hash not checked'; File = 'trim'; Find = 'if ($headHash -cne $ExpectedHeadHash) {'; Replace = 'if ($false) {' }
    @{ Name = 'trim: test lines not removed'; File = 'trim'; Find = 'if (-not (Test-NamesTestSession $line)) {'; Replace = 'if ($true) {' }
    @{ Name = 'trim: later real lines dropped'; File = 'trim'; Find = 'if (-not (Test-NamesTestSession $line)) {'; Replace = 'if ($false) {' }
)

# Makes one mutant in scratch and returns its path, or throws when the text to change is not found exactly once or the
# mutant does not parse (a mutant that fails to load is no test of the tests).
function New-Mutant($mutant, [string]$dir) {
    $source = if ($mutant.File -ceq 'trim') { $TrimPath } else { $ScriptPath }
    $text = [IO.File]::ReadAllText($source)
    foreach ($change in @($mutant, $(if ($mutant.ContainsKey('Then')) { $mutant.Then }))) {
        if ($null -eq $change) { continue }
        $count = ([regex]::Matches($text, [regex]::Escape($change.Find))).Count
        if ($count -ne 1) { throw "mutant '$($mutant.Name)': the text to change occurs $count times: $($change.Find)" }
        $text = $text.Replace($change.Find, $change.Replace)
    }
    $path = Join-Path $dir ([IO.Path]::GetFileName($source))
    [void][IO.Directory]::CreateDirectory($dir)
    [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($true))
    $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($path, [ref]$null, [ref]$errors)
    if ($errors) { throw "mutant '$($mutant.Name)' does not parse: $($errors[0].Message)" }
    return $path
}

# --- Main ----------------------------------------------------------------------------------------------------------

$exit = 0
try {
    [void][IO.Directory]::CreateDirectory($script:RunRoot)
    Invoke-Cases
    $failedCases = $script:LastFailed
    $total = @($cases | Where-Object { -not $Only -or $_.Name.Contains($Only) }).Count
    "CASES | $($total - $failedCases.Count) of $total passed"
    if ($failedCases.Count -gt 0) { $exit = 1 }
    if ($Mutate) {
        $caught = 0
        $m = 0
        foreach ($mutant in $mutants) {
            $m++
            try {
                $mutantPath = New-Mutant $mutant (Join-Path $script:RunRoot "m$m")
                if ($mutant.File -ceq 'trim') { $script:Trim = $mutantPath } else { $script:Cut = $mutantPath }
                Invoke-Cases -Quiet
                if ($script:LastFailed.Count -gt 0) { $caught++; "CAUGHT    $($mutant.Name) (by $($script:LastFailed.Count): $($script:LastFailed[0]))" }
                else { "SURVIVED  $($mutant.Name)"; $exit = 1 }
            }
            catch { "BROKEN    $($_.Exception.Message)"; $exit = 1 }
            finally { $script:Cut = [IO.Path]::GetFullPath($ScriptPath); $script:Trim = [IO.Path]::GetFullPath($TrimPath) }
        }
        "MUTANTS | $caught of $($mutants.Count) caught"
    }
}
finally {
    foreach ($helperId in $script:HelperIds) { Stop-Process -Id $helperId -ErrorAction SilentlyContinue }
    Remove-Scratch $script:RunRoot
    "CLEANUP | run folder removed: $(-not (Test-Path -LiteralPath $script:RunRoot)); helper processes started and stopped by id: $($script:HelperIds -join ', ')"
}
exit $exit
