# Tests for scripts\init.ps1, the init script: its checks (step 1), its links (step 2), the per-PC notes starter
# (step 3), -WhatIf, a second run, and the empty steps (4) to (6) that run S3b2 fills. Unit cases dot-source the script
# (it only defines its functions then) and call its functions, replacing a probe function where a case needs one check
# to fail; integration cases run it as a child pwsh with -HomePath on a scratch home, the way a person runs it.
#
# Nothing here touches this PC's real home or this repo. Every case builds a fake repo in the work folder (the folders
# init links, each with a marker file, and the notes template), copies the script under test into
# <fake repo>\scripts\init.ps1 and gives it a scratch home of its own, so every junction a case makes points into the
# work folder. %USERPROFILE% points into the work folder too, so a script that ignored -HomePath would change scratch
# files only. The work folder is removed at the end, its links first, each as a link only.
#
# It uses the same small runner as orchestrate-agents\tests\limit-scripts.tests.ps1 instead of Pester: only Pester 3.4
# is installed here, and Pester 5 would be a new dependency nobody has approved.
#
#   pwsh -NoProfile -File scripts\init.tests.ps1 [-Only '<wildcard>'] [-ScriptPath <init.ps1>] [-WorkRoot <folder>]
#
# The exit code is the number of failed cases. The last line is "<n> passed, <m> failed".
param(
    # The init script under test. A mutation check points it at a changed copy.
    [string]$ScriptPath = (Join-Path $PSScriptRoot 'init.ps1'),
    # Where fake repos and scratch homes are written; removed at the end. Its name holds a space on purpose, as the
    # real repo's path does.
    [string]$WorkRoot = (Join-Path ([IO.Path]::GetTempPath()) "init tests-$([guid]::NewGuid().ToString('N').Substring(0, 8))"),
    # Run only the cases whose name matches this wildcard.
    [string]$Only = '*'
)

$ErrorActionPreference = 'Stop'
$ScriptPath = [IO.Path]::GetFullPath($ScriptPath)
New-Item -ItemType Directory -Force $WorkRoot | Out-Null
$WorkRoot = [IO.Path]::GetFullPath($WorkRoot).TrimEnd('\')
$PwshPath = (Get-Process -Id $PID).Path
$WindowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
# A script that slipped back to %USERPROFILE% (or ran its main part when dot-sourced) lands here, not in the real home.
$env:USERPROFILE = Join-Path $WorkRoot 'userprofile'
New-Item -ItemType Directory -Force $env:USERPROFILE | Out-Null
# The folders of the repo init links, and the link names of the skills that go into both skills folders.
$RepoFolders = @('agents', 'orchestrate-agents', 'team-rules', 'team-switch', 'report-changes', 'explain-clearly', 'windows-pitfalls')
$BothSkills = @('orchestrate-agents', 'team-rules', 'report-changes', 'explain-clearly', 'windows-pitfalls')
# The phrase of each check's stop message.
$CheckPhrases = @{
    Windows    = 'Windows is missing'
    PowerShell = 'PowerShell 7 or later is missing'
    Node       = 'Node.js is missing'
    Claude     = 'Claude Code is missing'
}

# --- The runner --------------------------------------------------------------------------------------------------

$script:Passed = 0
$script:Failed = 0
$script:NextId = 0

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

# --- Fixtures ----------------------------------------------------------------------------------------------------

# Returns a number no other fixture of this run has used.
function New-Id {
    $script:NextId++
    return $script:NextId
}

# Builds a fake repo: every folder init links, each with a marker file, the notes template with a subfolder, and the
# script under test as scripts\init.ps1. Returns its path.
function New-FakeRepo {
    $repo = Join-Path $WorkRoot "repo $(New-Id)"
    foreach ($name in $RepoFolders) {
        New-Item -ItemType Directory -Force (Join-Path $repo $name) | Out-Null
        Set-Content -LiteralPath (Join-Path $repo "$name\marker.txt") -Value $name
    }
    $template = Join-Path $repo 'templates\machine-pitfalls'
    New-Item -ItemType Directory -Force (Join-Path $template 'references') | Out-Null
    Set-Content -LiteralPath (Join-Path $template 'SKILL.md') -Value 'starter: machine-pitfalls'
    Set-Content -LiteralPath (Join-Path $template 'references\example.md') -Value 'starter reference'
    New-Item -ItemType Directory -Force (Join-Path $repo 'scripts') | Out-Null
    Copy-Item -LiteralPath $ScriptPath -Destination (Join-Path $repo 'scripts\init.ps1')
    return $repo
}

# Makes an empty scratch home for one case and returns its path.
function New-TestHome {
    $path = Join-Path $WorkRoot "home $(New-Id)"
    New-Item -ItemType Directory -Force $path | Out-Null
    return $path
}

# Makes a stand-in of a folder outside the repo (a skill's old home in xpp-agent, say), with a marker file.
function New-StandIn([string]$name) {
    $path = Join-Path $WorkRoot "old $(New-Id)\$name"
    New-Item -ItemType Directory -Force $path | Out-Null
    Set-Content -LiteralPath (Join-Path $path 'marker.txt') -Value "old $name"
    return $path
}

# Makes a junction, and its parent folder when that is missing.
function New-Junction([string]$link, [string]$target) {
    New-Item -ItemType Directory -Force (Split-Path $link -Parent) | Out-Null
    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
}

# Makes a folder holding empty files with the names given (claude.exe, node.exe), to stand for the PATH.
function New-FakeBin([string[]]$names) {
    $bin = Join-Path $WorkRoot "bin $(New-Id)"
    New-Item -ItemType Directory -Force $bin | Out-Null
    foreach ($name in $names) { Set-Content -LiteralPath (Join-Path $bin $name) -Value '' }
    return $bin
}

# Makes a fake extension folder of Claude's VS Code extension under a home, with an empty claude.exe unless -NoExe.
# Returns the claude.exe path.
function New-FakeExtension([string]$testHome, [string]$folderName, [switch]$NoExe) {
    $bin = Join-Path $testHome ".vscode\extensions\$folderName\resources\native-binary"
    New-Item -ItemType Directory -Force $bin | Out-Null
    if (-not $NoExe) { Set-Content -LiteralPath (Join-Path $bin 'claude.exe') -Value '' }
    return (Join-Path $bin 'claude.exe')
}

# Runs a script block with the PATH set to one folder, and puts the PATH back after.
function Use-Path([string]$path, [scriptblock]$body) {
    $saved = $env:PATH
    try {
        $env:PATH = $path
        & $body
    }
    finally {
        $env:PATH = $saved
    }
}

# The links the contract lists, written out here rather than taken from the script, as link path -> target.
function Get-ExpectedLinks([string]$testHome, [string]$repo) {
    $links = [ordered]@{}
    $links["$testHome\.claude\agents\software-developer-agent"] = "$repo\agents"
    $links["$testHome\.claude\skills\software-developer-agent"] = "$repo\team-switch"
    $links["$testHome\.claude\software-developer-agent"] = $repo
    foreach ($skill in $BothSkills) {
        $links["$testHome\.claude\skills\$skill"] = "$repo\$skill"
        $links["$testHome\.copilot\skills\$skill"] = "$repo\$skill"
    }
    return $links
}

# --- Reading what is on disk ---------------------------------------------------------------------------------------

# Adds every entry under a folder to a list without going through a link: its path relative to the root, and a line
# saying what it is (a link and its target; a folder; a file with its size, content hash and last-write time).
function Add-Entries([string]$root, [string]$dir, $list) {
    foreach ($item in @(Get-ChildItem -LiteralPath $dir -Force | Sort-Object Name)) {
        $rel = $item.FullName.Substring($root.Length).TrimStart('\')
        if ($item.LinkType) {
            $list.Add([pscustomobject]@{ Rel = $rel; Line = "$rel|link|$($item.LinkType)|$(@($item.Target)[0])"; Content = $null })
            continue
        }
        if ($item.PSIsContainer) {
            $list.Add([pscustomobject]@{ Rel = $rel; Line = "$rel|dir"; Content = $null })
            Add-Entries $root $item.FullName $list
            continue
        }
        $hash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
        $list.Add([pscustomobject]@{ Rel = $rel; Line = "$rel|file|$($item.Length)|$hash|$($item.LastWriteTimeUtc.Ticks)"; Content = "$rel|file|$hash" })
    }
}

# Lists every entry under a folder (see Add-Entries); nothing when the folder is missing.
function Get-Entries([string]$root) {
    $list = [System.Collections.Generic.List[object]]::new()
    if (Test-Path -LiteralPath $root) { Add-Entries $root $root $list }
    return , $list
}

# One string describing everything under a folder, for before/after comparisons. -Filter keeps only the entries whose
# relative path matches the regex; -NoTimes leaves file times out (to compare a copy with its source).
function Get-Snapshot([string]$root, [string]$Filter = '', [switch]$NoTimes) {
    $lines = foreach ($entry in (Get-Entries $root)) {
        if ($Filter -and $entry.Rel -notmatch $Filter) { continue }
        if ($NoTimes -and $entry.Content) { $entry.Content } else { $entry.Line }
    }
    return (@($lines) -join "`n")
}

# Throws unless the path is a junction to the target (paths compared as Windows does, ignoring case).
function Assert-LinkTo([string]$link, [string]$target) {
    $item = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
    if (-not $item) { throw "missing: $link" }
    if ($item.LinkType -ne 'Junction') { throw "not a junction: $link (<$($item.LinkType)>)" }
    $actual = [IO.Path]::GetFullPath(@($item.Target)[0]).TrimEnd('\')
    $wanted = [IO.Path]::GetFullPath($target).TrimEnd('\')
    if ($actual -ne $wanted) { throw "$link points at <$actual>, expected <$wanted>" }
}

# Throws unless every folder of a fake repo still holds its marker and the template is whole.
function Assert-RepoIntact([string]$repo) {
    foreach ($name in $RepoFolders) {
        Assert-Equal $name ((Get-Content -LiteralPath (Join-Path $repo "$name\marker.txt")) -join '') "marker of $name"
    }
    Assert-True (Test-Path -LiteralPath (Join-Path $repo 'templates\machine-pitfalls\references\example.md')) 'the template'
}

# Runs an init script as a child process, the way a person runs it, and returns its exit code and output lines.
function Invoke-InitProcess([string]$repo, [string[]]$arguments, [string]$exe = $PwshPath, [string]$scriptFile = '') {
    if (-not $scriptFile) { $scriptFile = Join-Path $repo 'scripts\init.ps1' }
    # A child's stderr lines must not stop this runner.
    $ErrorActionPreference = 'Continue'
    $exeArgs = @('-NoProfile')
    if ($exe -eq $WindowsPowerShell) { $exeArgs += @('-ExecutionPolicy', 'Bypass') }
    $lines = @(& $exe @exeArgs -File $scriptFile @arguments 2>&1 | ForEach-Object { "$_" })
    return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Lines = $lines; Text = ($lines -join "`n") }
}

# Builds a home that init would change (an old link to re-point, every other link missing), runs Invoke-Init in the
# scope of the calling case, where the case has replaced one or more probes, and checks that it stopped, named exactly
# the expected checks, and left the home as it was.
function Assert-StopsOnChecks([string[]]$expected) {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Junction "$testHome\.claude\skills\report-changes" (New-StandIn 'report-changes')
    $before = Get-Snapshot $testHome
    $message = $null
    try { Invoke-Init -HomePath $testHome -RepoRoot $repo | Out-Null } catch { $message = $_.Exception.Message }
    Assert-True ($null -ne $message) 'init stopped'
    foreach ($key in $CheckPhrases.Keys) {
        Assert-Equal ($key -in $expected) $message.Contains($CheckPhrases[$key]) "the message names $key ($message)"
    }
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
    Assert-RepoIntact $repo
}

# Removes the work folder: every link in it first, each as a link only, then the rest.
function Remove-WorkFolder([string]$root) {
    if (-not (Test-Path -LiteralPath $root)) { return }
    $links = @(Get-ChildItem -LiteralPath $root -Recurse -Force | Where-Object { $_.LinkType } | Sort-Object { $_.FullName.Length } -Descending)
    foreach ($link in $links) {
        if ($link.PSIsContainer) { [IO.Directory]::Delete($link.FullName, $false) } else { [IO.File]::Delete($link.FullName) }
    }
    # Windows can say "The directory is not empty" about a folder whose files it is still removing; the same command
    # run again finishes the job.
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Remove-Item -LiteralPath $root -Recurse -Force
            return
        }
        catch {
            if ($attempt -eq 3) { throw }
        }
    }
}

# --- Load the script under test ------------------------------------------------------------------------------------

try {
    . $ScriptPath
}
catch {
    $script:Failed++
    "  FAIL  dot-sourcing $ScriptPath :: $($_.Exception.Message)"
}

# --- Step 1: the checks --------------------------------------------------------------------------------------------

Test-Case 'checks: pass on this PC and return the node and claude paths' {
    $facts = Test-Prerequisites -HomePath (New-TestHome)
    Assert-True ($facts.NodePath -like '*\node.exe' -and (Test-Path -LiteralPath $facts.NodePath -PathType Leaf)) "node path <$($facts.NodePath)>"
    Assert-True ([bool]$facts.ClaudePath -and (Test-Path -LiteralPath $facts.ClaudePath -PathType Leaf)) "claude path <$($facts.ClaudePath)>"
}

Test-Case 'checks: not Windows stops init with its message and changes nothing' {
    function Test-WindowsHost { return $false }
    Assert-StopsOnChecks @('Windows')
}

Test-Case 'checks: PowerShell 5.1 stops init with its message and changes nothing' {
    function Get-PowerShellVersion { return [version]'5.1.17763.1' }
    Assert-StopsOnChecks @('PowerShell')
}

Test-Case 'checks: no node on the PATH stops init with its message and changes nothing' {
    function Find-NodePath { return $null }
    Assert-StopsOnChecks @('Node')
}

Test-Case 'checks: no claude stops init with its message and changes nothing' {
    function Find-ClaudePath { return $null }
    Assert-StopsOnChecks @('Claude')
}

Test-Case 'checks: all four missing are named in one stop' {
    function Test-WindowsHost { return $false }
    function Get-PowerShellVersion { return [version]'5.1.17763.1' }
    function Find-NodePath { return $null }
    function Find-ClaudePath { return $null }
    Assert-StopsOnChecks @('Windows', 'PowerShell', 'Node', 'Claude')
}

Test-Case 'claude: the newest extension version holding claude.exe wins, by number, over the PATH' {
    $testHome = New-TestHome
    New-FakeExtension $testHome 'anthropic.claude-code-2.1.99-win32-x64' | Out-Null
    $newest = New-FakeExtension $testHome 'anthropic.claude-code-2.1.311-win32-x64'
    New-FakeExtension $testHome 'anthropic.claude-code-2.1.4-win32-x64' | Out-Null
    New-FakeExtension $testHome 'anthropic.claude-code-2.1.400-win32-x64' -NoExe | Out-Null
    New-FakeExtension $testHome 'anthropic.claude-code-tools-9.0.0' | Out-Null
    $bin = New-FakeBin @('claude.exe')
    $found = Use-Path $bin { Find-ClaudePath -HomePath $testHome }
    Assert-Equal $newest $found 'claude path'
}

Test-Case 'claude: falls back to claude on the PATH when no extension holds it' {
    $testHome = New-TestHome
    New-FakeExtension $testHome 'anthropic.claude-code-2.1.311-win32-x64' -NoExe | Out-Null
    $bin = New-FakeBin @('claude.exe')
    $found = Use-Path $bin { Find-ClaudePath -HomePath $testHome }
    Assert-Equal "$bin\claude.exe" $found 'claude path'
}

Test-Case 'node: node.exe on the PATH is found by its full path' {
    $bin = New-FakeBin @('node.exe')
    $found = Use-Path $bin { Find-NodePath }
    Assert-Equal "$bin\node.exe" $found 'node path'
}

Test-Case 'claude and node: nothing found gives nothing' {
    $testHome = New-TestHome
    $bin = New-FakeBin @()
    $claude = Use-Path $bin { Find-ClaudePath -HomePath $testHome }
    $node = Use-Path $bin { Find-NodePath }
    Assert-Equal $null $claude 'claude path'
    Assert-Equal $null $node 'node path'
}

Test-Case 'checks in a real run: no node or claude on the PATH stops init, exit code non-zero, home unchanged' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Junction "$testHome\.claude\skills\report-changes" (New-StandIn 'report-changes')
    $before = Get-Snapshot $testHome
    $bin = New-FakeBin @()
    $run = Use-Path $bin { Invoke-InitProcess $repo @('-HomePath', $testHome) }
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains($CheckPhrases.Node) -and $run.Text.Contains($CheckPhrases.Claude)) "the message; output: $($run.Text)"
    Assert-True (-not $run.Text.Contains($CheckPhrases.PowerShell)) "PowerShell is not named; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
}

Test-Case 'Windows PowerShell 5.1: stops with the PowerShell 7 message, home unchanged' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Junction "$testHome\.claude\skills\report-changes" (New-StandIn 'report-changes')
    $before = Get-Snapshot $testHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome) -exe $WindowsPowerShell
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains($CheckPhrases.PowerShell)) "the message; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
}

Test-Case 'home folder missing: stops with a plain message and creates nothing' {
    $repo = New-FakeRepo
    $missingHome = Join-Path $WorkRoot "no home $(New-Id)"
    $run = Invoke-InitProcess $repo @('-HomePath', $missingHome)
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains('does not exist')) "the message; output: $($run.Text)"
    Assert-True (-not (Test-Path -LiteralPath $missingHome)) 'the home folder was not created'
}

Test-Case 'dot-sourcing defines the functions and changes nothing' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $scriptFile = (Join-Path $repo 'scripts\init.ps1').Replace("'", "''")
    $command = ". '$scriptFile' -HomePath '$($testHome.Replace("'", "''"))'; if (Get-Command Invoke-Init -ErrorAction SilentlyContinue) { 'functions defined' }"
    $ErrorActionPreference = 'Continue'
    $output = @(& $PwshPath -NoProfile -Command $command 2>&1 | ForEach-Object { "$_" }) -join "`n"
    Assert-True ($output.Contains('functions defined')) "output: $output"
    Assert-Equal '' (Get-Snapshot $testHome) 'the home after dot-sourcing'
}

# --- Steps 2 and 3: the links and the notes starter ----------------------------------------------------------------

Test-Case 'fresh home: every link and the notes starter, and nothing else' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    $expected = Get-ExpectedLinks $testHome $repo
    foreach ($link in $expected.Keys) { Assert-LinkTo $link $expected[$link] }
    $notes = "$testHome\.claude\skills\machine-pitfalls"
    Assert-True (-not (Get-Item -LiteralPath $notes -Force).LinkType) 'the Claude notes are a real folder'
    Assert-Equal (Get-Snapshot "$repo\templates\machine-pitfalls" -NoTimes) (Get-Snapshot $notes -NoTimes) 'the notes are a copy of the template'
    Assert-LinkTo "$testHome\.copilot\skills\machine-pitfalls" $notes
    $wanted = @('.claude', '.claude\agents', '.claude\skills', '.copilot', '.copilot\skills',
        '.claude\skills\machine-pitfalls', '.claude\skills\machine-pitfalls\SKILL.md', '.claude\skills\machine-pitfalls\references',
        '.claude\skills\machine-pitfalls\references\example.md', '.copilot\skills\machine-pitfalls')
    $wanted += @($expected.Keys | ForEach-Object { $_.Substring($testHome.Length + 1) })
    $found = @((Get-Entries $testHome) | ForEach-Object { $_.Rel })
    Assert-Equal ((@($wanted) | Sort-Object) -join ';') ((@($found) | Sort-Object) -join ';') 'the entries in the home'
    Assert-True ($run.Lines -contains 'Summary: 15 changed, 0 already in place.') "the summary; output: $($run.Text)"
    Assert-RepoIntact $repo
}

Test-Case 'second run: says already in place for each and changes nothing' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $first = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $first.ExitCode "first run; output: $($first.Text)"
    $before = Get-Snapshot $testHome
    $second = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $second.ExitCode "second run; output: $($second.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the second run'
    Assert-Equal 15 @($second.Lines | Where-Object { $_ -like 'Already in place*' }).Count "already-in-place lines; output: $($second.Text)"
    Assert-True ($second.Lines -contains 'Summary: nothing changed, 15 already in place.') "the summary; output: $($second.Text)"
}

Test-Case 'run through the repo link: every link stays on the real repo folder' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $first = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $first.ExitCode "first run; output: $($first.Text)"
    $before = Get-Snapshot $testHome
    $throughLink = "$testHome\.claude\software-developer-agent\scripts\init.ps1"
    $second = Invoke-InitProcess $repo @('-HomePath', $testHome) -scriptFile $throughLink
    Assert-Equal 0 $second.ExitCode "second run; output: $($second.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the run through the link'
    Assert-True ($second.Lines -contains 'Summary: nothing changed, 15 already in place.') "the summary; output: $($second.Text)"
}

Test-Case 'old links: re-pointed to the repo; the folders they pointed at untouched' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $oldReport = New-StandIn 'report-changes'
    $oldExplain = New-StandIn 'explain-clearly'
    $oldRules = New-StandIn 'team-rules'
    $oldAgents = New-StandIn 'agents'
    New-Junction "$testHome\.claude\skills\report-changes" $oldReport
    New-Junction "$testHome\.copilot\skills\report-changes" $oldReport
    New-Junction "$testHome\.claude\skills\explain-clearly" $oldExplain
    New-Junction "$testHome\.copilot\skills\explain-clearly" $oldExplain
    New-Junction "$testHome\.copilot\skills\team-rules" $oldRules
    New-Junction "$testHome\.claude\agents\software-developer-agent" $oldAgents
    # A link whose folder is gone is re-pointed too.
    $gone = New-StandIn 'windows-pitfalls'
    New-Junction "$testHome\.claude\skills\windows-pitfalls" $gone
    Remove-Item -LiteralPath $gone -Recurse -Force
    $oldBefore = @($oldReport, $oldExplain, $oldRules, $oldAgents | ForEach-Object { Get-Snapshot $_ }) -join '#'
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    $expected = Get-ExpectedLinks $testHome $repo
    foreach ($link in $expected.Keys) { Assert-LinkTo $link $expected[$link] }
    Assert-Equal $oldBefore (@($oldReport, $oldExplain, $oldRules, $oldAgents | ForEach-Object { Get-Snapshot $_ }) -join '#') 'the old folders'
    Assert-Equal 7 @($run.Lines | Where-Object { $_ -like 'Re-pointed: *' }).Count "re-pointed lines; output: $($run.Text)"
    Assert-True ($run.Lines -contains "Re-pointed: $testHome\.claude\skills\report-changes -> $repo\report-changes (was $oldReport)") "the re-point line; output: $($run.Text)"
    Assert-True ($run.Lines -contains 'Summary: 15 changed, 0 already in place.') "the summary; output: $($run.Text)"
    Assert-RepoIntact $repo
}

Test-Case 'real folder in the way: stops before any change, naming it' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Junction "$testHome\.claude\skills\report-changes" (New-StandIn 'report-changes')
    $inTheWay = "$testHome\.copilot\skills\explain-clearly"
    New-Item -ItemType Directory -Force $inTheWay | Out-Null
    Set-Content -LiteralPath "$inTheWay\SKILL.md" -Value 'a real skill folder'
    $before = Get-Snapshot $testHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains($inTheWay) -and $run.Text.Contains('Nothing was changed')) "the message; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
}

Test-Case 'file in the way: stops before any change' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Item -ItemType Directory -Force "$testHome\.claude" | Out-Null
    Set-Content -LiteralPath "$testHome\.claude\software-developer-agent" -Value 'a file'
    $before = Get-Snapshot $testHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains("$testHome\.claude\software-developer-agent")) "the message; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
}

Test-Case 'machine-pitfalls folder already there: left alone; copilot gets a link to it; the summary lists the changes' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $notes = "$testHome\.claude\skills\machine-pitfalls"
    New-Item -ItemType Directory -Force $notes | Out-Null
    Set-Content -LiteralPath "$notes\SKILL.md" -Value 'my own traps'
    $notesBefore = Get-Snapshot $notes
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    Assert-Equal $notesBefore (Get-Snapshot $notes) 'the notes folder'
    Assert-True (-not (Get-Item -LiteralPath $notes -Force).LinkType) 'the notes are still a real folder'
    Assert-LinkTo "$testHome\.copilot\skills\machine-pitfalls" $notes
    Assert-True ($run.Lines -contains "Already in place, left alone: $notes") "the left-alone line; output: $($run.Text)"
    $at = [array]::IndexOf($run.Lines, 'Summary: 14 changed, 1 already in place.')
    Assert-True ($at -ge 0) "the summary; output: $($run.Text)"
    $listed = @($run.Lines | Select-Object -Skip ($at + 1))
    Assert-Equal 14 $listed.Count "lines listed under the summary; output: $($run.Text)"
    Assert-True (@($listed | Where-Object { $_ -notlike '  Linked: *' }).Count -eq 0) "only changes are listed; output: $($run.Text)"
}

Test-Case 'machine-pitfalls links already there: both left alone' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $old = New-StandIn 'machine-pitfalls'
    New-Junction "$testHome\.claude\skills\machine-pitfalls" $old
    New-Junction "$testHome\.copilot\skills\machine-pitfalls" $old
    $oldBefore = Get-Snapshot $old
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    Assert-LinkTo "$testHome\.claude\skills\machine-pitfalls" $old
    Assert-LinkTo "$testHome\.copilot\skills\machine-pitfalls" $old
    Assert-Equal $oldBefore (Get-Snapshot $old) 'the folder the links point at'
    Assert-True ($run.Lines -contains 'Summary: 13 changed, 2 already in place.') "the summary; output: $($run.Text)"
}

Test-Case 'copilot machine-pitfalls there, Claude one missing: the starter is copied, copilot left alone' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $old = New-StandIn 'machine-pitfalls'
    New-Junction "$testHome\.copilot\skills\machine-pitfalls" $old
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    $notes = "$testHome\.claude\skills\machine-pitfalls"
    Assert-Equal (Get-Snapshot "$repo\templates\machine-pitfalls" -NoTimes) (Get-Snapshot $notes -NoTimes) 'the notes are a copy of the template'
    Assert-LinkTo "$testHome\.copilot\skills\machine-pitfalls" $old
}

Test-Case 'other entries: left alone' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Item -ItemType Directory -Force "$testHome\.claude\skills\synced\inner" | Out-Null
    Set-Content -LiteralPath "$testHome\.claude\skills\synced\inner\file.txt" -Value 'synced'
    foreach ($folder in '.claude\skills', '.copilot\skills') {
        New-Junction "$testHome\$folder\xpp-development" (New-StandIn 'xpp-development')
        New-Junction "$testHome\$folder\analyze-trace" (New-StandIn 'analyze-trace')
    }
    Set-Content -LiteralPath "$testHome\.copilot\skills\notes.txt" -Value 'a file of my own'
    $others = '^\.(claude|copilot)\\skills\\(synced|xpp-development|analyze-trace|notes\.txt)(\\|$)'
    $before = Get-Snapshot $testHome -Filter $others
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome)
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome -Filter $others) 'the other entries'
}

Test-Case 'a link to its target in other letter case is already in place' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    New-Junction "$testHome\.claude\skills\team-rules" ("$repo\team-rules".ToUpperInvariant())
    Assert-Equal 'Linked' (Get-LinkState "$testHome\.claude\skills\team-rules" "$repo\team-rules") 'the link state'
}

# --- -WhatIf -------------------------------------------------------------------------------------------------------

Test-Case '-WhatIf on a fresh home: prints each planned change, makes none' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome, '-WhatIf')
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    Assert-Equal '' (Get-Snapshot $testHome) 'the home after -WhatIf'
    Assert-Equal 15 @($run.Lines | Where-Object { $_ -like 'Would *' }).Count "would-lines; output: $($run.Text)"
    Assert-True ($run.Lines -contains 'Summary (-WhatIf, nothing was changed): 15 would change, 0 already in place.') "the summary; output: $($run.Text)"
    Assert-RepoIntact $repo
}

Test-Case '-WhatIf on old links: prints the re-points, makes none' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $old = New-StandIn 'report-changes'
    New-Junction "$testHome\.claude\skills\report-changes" $old
    $before = Get-Snapshot $testHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome, '-WhatIf')
    Assert-Equal 0 $run.ExitCode "exit code; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after -WhatIf'
    Assert-True ($run.Lines -contains "Would re-point: $testHome\.claude\skills\report-changes -> $repo\report-changes (now $old)") "the re-point line; output: $($run.Text)"
}

Test-Case '-WhatIf with a real folder in the way: stops like a real run' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $inTheWay = "$testHome\.claude\skills\team-rules"
    New-Item -ItemType Directory -Force $inTheWay | Out-Null
    $before = Get-Snapshot $testHome
    $run = Invoke-InitProcess $repo @('-HomePath', $testHome, '-WhatIf')
    Assert-True ($run.ExitCode -ne 0) "exit code $($run.ExitCode)"
    Assert-True ($run.Text.Contains($inTheWay)) "the message; output: $($run.Text)"
    Assert-Equal $before (Get-Snapshot $testHome) 'the home after the stop'
}

# --- Steps 4 to 6: the seams run S3b2 fills -------------------------------------------------------------------------

Test-Case 'steps 4 to 6: run after the links and the starter, in order, with their inputs' {
    $repo = New-FakeRepo
    $testHome = New-TestHome
    $calls = [System.Collections.Generic.List[string]]::new()
    function Install-PcSettings([string]$HomePath, [string]$RepoRoot, [switch]$WhatIf) {
        $starter = Test-Path -LiteralPath (Join-Path $HomePath '.copilot\skills\machine-pitfalls')
        $calls.Add("pc|$HomePath|$RepoRoot|$WhatIf|starter $starter")
    }
    function Install-ClaudeSettings([string]$ClaudeConfigDir, [string]$HomePath, [string]$NodePath, [switch]$WhatIf) {
        $calls.Add("settings|$ClaudeConfigDir|$HomePath|$NodePath|$WhatIf")
    }
    function Install-TeamExtensions([string]$ClaudePath, [string]$ClaudeConfigDir, [string]$HomePath, [switch]$WhatIf) {
        $calls.Add("extensions|$ClaudePath|$ClaudeConfigDir|$HomePath|$WhatIf")
    }
    $facts = Test-Prerequisites -HomePath $testHome
    Invoke-Init -HomePath $testHome -RepoRoot $repo | Out-Null
    Assert-Equal 3 $calls.Count 'calls'
    Assert-Equal "pc|$testHome|$repo|False|starter True" $calls[0] 'step 4'
    Assert-Equal "settings|$testHome\.claude|$testHome|$($facts.NodePath)|False" $calls[1] 'step 5'
    Assert-Equal "extensions|$($facts.ClaudePath)||$testHome|False" $calls[2] 'step 6'

    $calls.Clear()
    $otherHome = New-TestHome
    $configDir = Join-Path $WorkRoot "config $(New-Id)"
    Invoke-Init -HomePath $otherHome -RepoRoot $repo -ClaudeConfigDir $configDir -WhatIf | Out-Null
    Assert-Equal "pc|$otherHome|$repo|True|starter False" $calls[0] 'step 4 with -WhatIf'
    Assert-Equal "settings|$configDir|$otherHome|$($facts.NodePath)|True" $calls[1] 'step 5 with -ClaudeConfigDir'
    Assert-Equal "extensions|$($facts.ClaudePath)|$configDir|$otherHome|True" $calls[2] 'step 6 with -ClaudeConfigDir'
}

# --- Done ----------------------------------------------------------------------------------------------------------

try { Remove-WorkFolder $WorkRoot } catch { "  (could not remove the work folder ${WorkRoot}: $($_.Exception.Message))" }
''
"$($script:Passed) passed, $($script:Failed) failed"
exit $script:Failed
