<#
.SYNOPSIS
    The init script: sets this PC up for the agent team. It does every step of the setup that needs no LLM.

.DESCRIPTION
    Run it as pwsh -NoProfile -File <repo>\scripts\init.ps1, from any folder. It works in this order:

      1. Checks, all before any change: Windows; PowerShell 7 or later; Node on the PATH (its full path is what the
         hooks call); Claude Code's claude.exe (from the newest version of Claude's VS Code extension that holds one,
         else claude on the PATH). A missing one stops init with a message naming it and how to get it, and nothing
         is changed.
      2. Links: thirteen directory junctions.
           ~/.claude/agents/software-developer-agent  -> <repo>\agents              (software-developer, task-lead, code-searcher)
           ~/.claude/skills/orchestrate-agents        -> <repo>\orchestrate-agents  (Claude Code)
           ~/.copilot/skills/orchestrate-agents       -> <repo>\orchestrate-agents  (GitHub Copilot)
           ~/.claude/skills/team-rules                -> <repo>\team-rules          (Claude Code)
           ~/.copilot/skills/team-rules               -> <repo>\team-rules          (GitHub Copilot)
           ~/.claude/skills/software-developer-agent  -> <repo>\team-switch         (Claude Code: /software-developer-agent)
           ~/.claude/skills/<skill> and ~/.copilot/skills/<skill> -> <repo>\<skill>, for report-changes,
             explain-clearly and windows-pitfalls
           ~/.claude/software-developer-agent         -> <repo>                     (the repo link, the same path on every PC)
         Claude Code scans ~/.claude/agents recursively, so every agent file here is found. The lead and the worker
         preload team-rules by name, so it must be an installed skill. /software-developer-agent switches the team on
         for one chat (D-33); the watches it starts are Claude Code's, so it is not linked for Copilot. An edit here is
         live at the next Claude Code start. A junction needs no admin rights.
      3. The per-PC notes starter: when ~/.claude/skills/machine-pitfalls does not exist, a copy of
         <repo>\templates\machine-pitfalls goes there as a real folder, for this PC's own traps; when
         ~/.copilot/skills/machine-pitfalls does not exist, it becomes a junction to the Claude one. Anything already
         there, a link or a folder, is left alone.
      4. The per-PC settings file, 5. Claude Code's settings, 6. the team's extensions (empty here; run S3b2 fills
         them).
    Then a summary of what changed and what was already in place.

    Safe to run twice: a second run changes nothing and says so. A link that already points at its target is left
    alone. A junction or symbolic link that points somewhere else (a skill's old home in xpp-agent, say) is removed as
    a link only, with [System.IO.Directory]::Delete(path, $false), which never touches the folder it pointed at, and is
    made again. A real folder or file in the way of a link stops init before it changes anything. Run through the repo
    link, init still links the real repo folder.

    The vendored skills under skills\ are never linked: the agents read them by path.

    Dot-sourcing the script (. .\init.ps1) only defines its functions and changes nothing.

    The file is ASCII and uses no syntax newer than Windows PowerShell 5.1, so started there it prints the PowerShell 7
    message instead of a parse error.

.PARAMETER WhatIf
    Shows every change init would make and makes none. A real folder in the way still stops it.

.PARAMETER HomePath
    Test only: the folder that stands for %USERPROFILE% (the links, .claude, .copilot, the state folder). It must
    exist.

.PARAMETER ClaudeConfigDir
    Test only: where Claude Code's settings.json and plugin files are; default <home>\.claude. Steps 5 and 6 use it,
    and step 6 passes it to claude.exe as CLAUDE_CONFIG_DIR when it is given.
#>
param(
    [switch]$WhatIf,
    [string]$HomePath = $env:USERPROFILE,
    [string]$ClaudeConfigDir = ''
)

$ErrorActionPreference = 'Stop'

# ---- Results ----

<#
.SYNOPSIS
    Makes one line of init's report: what a step did to one item.
.PARAMETER Step
    The step: checks, links, notes, pc-settings, claude-settings or extensions.
.PARAMETER Outcome
    'Changed' (made or re-made, or with -WhatIf: would be), 'InPlace' (already as it should be) or 'Checked' (a
    line of information that the summary does not count).
.PARAMETER Text
    The line printed for it.
.OUTPUTS
    An object with the keys Step, Outcome and Text.
#>
function New-InitRecord {
    param([string]$Step, [string]$Outcome, [string]$Text)
    return [pscustomobject]@{ Step = $Step; Outcome = $Outcome; Text = $Text }
}

<#
.SYNOPSIS
    Stops init with a message for the person running it (a missing program, a folder in the way), as opposed to
    something that broke. The main part prints the message as it is.
.PARAMETER Message
    What is wrong and what to do about it.
#>
function Stop-Init {
    param([string]$Message)
    $stop = [System.Exception]::new($Message)
    $stop.Data['InitStop'] = $true
    throw $stop
}

<#
.SYNOPSIS
    Writes the summary: how many items changed and how many were already in place, then each change.
.PARAMETER Records
    The records the steps returned.
.PARAMETER WhatIf
    The run only showed its changes.
.OUTPUTS
    The summary lines.
#>
function Format-InitSummary {
    param([object[]]$Records, [switch]$WhatIf)
    $changed = @($Records | Where-Object { $_.Outcome -eq 'Changed' })
    $inPlace = @($Records | Where-Object { $_.Outcome -eq 'InPlace' })
    if ($WhatIf) {
        "Summary (-WhatIf, nothing was changed): $($changed.Count) would change, $($inPlace.Count) already in place."
    }
    elseif ($changed.Count -eq 0) {
        "Summary: nothing changed, $($inPlace.Count) already in place."
    }
    else {
        "Summary: $($changed.Count) changed, $($inPlace.Count) already in place."
    }
    foreach ($record in $changed) { "  $($record.Text)" }
}

# ---- Paths ----

<#
.SYNOPSIS
    Returns the repo's real folder: the parent of the scripts folder, with a link at that place resolved. Run through
    the repo link, the links must still point at the real folder, never at the link (which would then point at itself).
.PARAMETER ScriptFolder
    The folder this script is in.
.OUTPUTS
    The repo folder's path.
#>
function Get-RepoRoot {
    param([string]$ScriptFolder)
    $root = Split-Path $ScriptFolder -Parent
    $item = Get-Item -LiteralPath $root -Force
    if ($item.LinkType -in @('Junction', 'SymbolicLink')) {
        $target = @($item.Target)[0]
        if (-not [IO.Path]::IsPathRooted($target)) {
            $target = Join-Path (Split-Path $root -Parent) $target
        }
        return Get-NormalPath $target
    }
    return $root
}

<#
.SYNOPSIS
    Returns the links this script keeps, each with the folder it must point at.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%.
.PARAMETER RepoRoot
    The repo's real folder.
.OUTPUTS
    Hashtables with the keys Link and Target.
#>
function Get-LinkPlan {
    param([string]$HomePath, [string]$RepoRoot)
    $skill = Join-Path $RepoRoot 'orchestrate-agents'
    $rules = Join-Path $RepoRoot 'team-rules'
    $plan = @(
        @{ Link = Join-Path $HomePath '.claude\agents\software-developer-agent'; Target = Join-Path $RepoRoot 'agents' },
        @{ Link = Join-Path $HomePath '.claude\skills\orchestrate-agents'; Target = $skill },
        @{ Link = Join-Path $HomePath '.copilot\skills\orchestrate-agents'; Target = $skill },
        @{ Link = Join-Path $HomePath '.claude\skills\team-rules'; Target = $rules },
        @{ Link = Join-Path $HomePath '.copilot\skills\team-rules'; Target = $rules },
        @{ Link = Join-Path $HomePath '.claude\skills\software-developer-agent'; Target = Join-Path $RepoRoot 'team-switch' }
    )
    foreach ($name in @('report-changes', 'explain-clearly', 'windows-pitfalls')) {
        $plan += @{ Link = Join-Path $HomePath ".claude\skills\$name"; Target = Join-Path $RepoRoot $name }
        $plan += @{ Link = Join-Path $HomePath ".copilot\skills\$name"; Target = Join-Path $RepoRoot $name }
    }
    $plan += @{ Link = Join-Path $HomePath '.claude\software-developer-agent'; Target = $RepoRoot }
    return $plan
}

<#
.SYNOPSIS
    Puts a folder path in one comparable form: full, without a trailing backslash.
.PARAMETER Path
    The path to normalise.
.OUTPUTS
    The normalised path.
#>
function Get-NormalPath {
    param([string]$Path)
    return [IO.Path]::GetFullPath($Path).TrimEnd('\')
}

<#
.SYNOPSIS
    Tells whether anything is at a path: a folder, a file, or a link, even one whose target is gone.
.PARAMETER Path
    The path to look at.
.OUTPUTS
    True when something is there.
#>
function Test-ItemPresent {
    param([string]$Path)
    return [bool](Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue)
}

# ---- Step 1: checks ----

<#
.SYNOPSIS
    Tells whether this PC runs Windows.
.OUTPUTS
    True on Windows.
#>
function Test-WindowsHost {
    return [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
}

<#
.SYNOPSIS
    Returns the version of the PowerShell running this script.
.OUTPUTS
    The version.
#>
function Get-PowerShellVersion {
    return $PSVersionTable.PSVersion
}

<#
.SYNOPSIS
    Finds node.exe on the PATH.
.OUTPUTS
    Its full path, or $null when there is none.
#>
function Find-NodePath {
    $found = @(Get-Command 'node.exe' -CommandType Application -ErrorAction SilentlyContinue)
    if ($found.Count -gt 0) {
        return $found[0].Source
    }
    return $null
}

<#
.SYNOPSIS
    Finds Claude Code's claude.exe: in the newest version of Claude's VS Code extension that holds one, else claude
    on the PATH.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%; the extensions are under its .vscode\extensions.
.OUTPUTS
    Its full path, or $null when there is none.
#>
function Find-ClaudePath {
    param([string]$HomePath)
    $extensions = Join-Path $HomePath '.vscode\extensions'
    $best = $null
    $bestVersion = $null
    foreach ($folder in @(Get-ChildItem -LiteralPath $extensions -Directory -Force -ErrorAction SilentlyContinue)) {
        # anthropic.claude-code-2.1.311-win32-x64: the version is compared as a number, so 2.1.311 beats 2.1.99.
        if ($folder.Name -notmatch '^anthropic\.claude-code-(\d+(?:\.\d+){1,3})(?:-|$)') {
            continue
        }
        $version = $null
        if (-not [version]::TryParse($Matches[1], [ref]$version)) {
            continue
        }
        $exe = Join-Path $folder.FullName 'resources\native-binary\claude.exe'
        if ((Test-Path -LiteralPath $exe -PathType Leaf) -and ($null -eq $bestVersion -or $version -gt $bestVersion)) {
            $best = $exe
            $bestVersion = $version
        }
    }
    if ($best) {
        return $best
    }
    $found = @(Get-Command 'claude' -CommandType Application -ErrorAction SilentlyContinue)
    if ($found.Count -gt 0) {
        return $found[0].Source
    }
    return $null
}

<#
.SYNOPSIS
    Step 1: checks that this PC has what the team needs, before anything is changed. Stops init naming every missing
    one and how to get it.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%.
.OUTPUTS
    An object with NodePath, ClaudePath and PowerShellVersion, for the later steps.
#>
function Test-Prerequisites {
    param([string]$HomePath)
    $missing = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-WindowsHost)) {
        $missing.Add("Windows is missing: this PC runs $([Environment]::OSVersion.VersionString). The agent team runs on Windows only.")
    }
    $psVersion = Get-PowerShellVersion
    if ($psVersion.Major -lt 7) {
        $missing.Add("PowerShell 7 or later is missing: this is PowerShell $psVersion. Install it with 'winget install --id Microsoft.PowerShell' (or from https://aka.ms/powershell), then run init with pwsh.")
    }
    $node = Find-NodePath
    if (-not $node) {
        $missing.Add("Node.js is missing: there is no node.exe on the PATH. Install it with 'winget install --id OpenJS.NodeJS.LTS' (or from https://nodejs.org), open a new terminal, then run init again.")
    }
    $claude = Find-ClaudePath -HomePath $HomePath
    if (-not $claude) {
        $missing.Add("Claude Code is missing: there is no claude.exe in Claude's VS Code extension (under $HomePath\.vscode\extensions) and no claude on the PATH. Install Claude Code's VS Code extension, or Claude Code itself (https://claude.com/claude-code), then run init again.")
    }
    if ($missing.Count -gt 0) {
        Stop-Init ("init stopped before changing anything. Missing:`n" + (($missing | ForEach-Object { "  - $_" }) -join "`n"))
    }
    return [pscustomobject]@{ NodePath = $node; ClaudePath = $claude; PowerShellVersion = "$psVersion" }
}

# ---- Step 2: links ----

<#
.SYNOPSIS
    Tells what is at a link path now, compared with the target it should have.
.PARAMETER LinkPath
    Where the junction goes.
.PARAMETER Target
    The folder the junction must point at.
.OUTPUTS
    'Missing' (nothing there), 'Linked' (a link to Target), 'OtherTarget' (a folder link to somewhere else) or
    'Blocked' (a real folder or a file).
#>
function Get-LinkState {
    param([string]$LinkPath, [string]$Target)

    $existing = Get-Item -LiteralPath $LinkPath -Force -ErrorAction SilentlyContinue
    if (-not $existing) {
        return 'Missing'
    }
    if (-not $existing.PSIsContainer -or $existing.LinkType -notin @('Junction', 'SymbolicLink')) {
        return 'Blocked'
    }
    # PowerShell is case-insensitive here, as Windows paths are.
    if ((Get-NormalPath @($existing.Target)[0]) -eq (Get-NormalPath $Target)) {
        return 'Linked'
    }
    return 'OtherTarget'
}

<#
.SYNOPSIS
    Removes a folder link without touching the folder it points at.
.PARAMETER LinkPath
    The junction or symbolic link to remove.
#>
function Remove-FolderLink {
    param([string]$LinkPath)
    # Non-recursive delete of a reparse point removes the link only. Remove-Item -Recurse would follow it.
    [System.IO.Directory]::Delete($LinkPath, $false)
}

<#
.SYNOPSIS
    Creates a junction, and its parent folder when that is missing.
.PARAMETER LinkPath
    Where the junction goes.
.PARAMETER Target
    The folder the junction points at.
#>
function New-FolderJunction {
    param([string]$LinkPath, [string]$Target)
    New-Item -ItemType Directory -Force -Path (Split-Path $LinkPath -Parent) | Out-Null
    New-Item -ItemType Junction -Path $LinkPath -Target $Target | Out-Null
}

<#
.SYNOPSIS
    Step 2: checks every link of a plan first, then creates or re-points the ones that need it. A real folder or file
    in the way of any link stops init before it changes anything, with -WhatIf too.
.PARAMETER Plan
    Hashtables with the keys Link and Target, as Get-LinkPlan returns them.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    One record per link (New-InitRecord).
#>
function Install-Links {
    param([object[]]$Plan, [switch]$WhatIf)

    $states = @(foreach ($entry in $Plan) { Get-LinkState $entry.Link $entry.Target })
    $blocked = @(for ($i = 0; $i -lt $Plan.Count; $i++) { if ($states[$i] -eq 'Blocked') { $Plan[$i].Link } })
    if ($blocked.Count -gt 0) {
        Stop-Init ("init stopped: a real folder or file is in the way at: $($blocked -join '; '). Init only replaces " +
            'links; it never moves or deletes a real folder or file. Move or rename what is there, then run init ' +
            'again. Nothing was changed.')
    }

    for ($i = 0; $i -lt $Plan.Count; $i++) {
        $link = $Plan[$i].Link
        $target = $Plan[$i].Target
        switch ($states[$i]) {
            'Linked' {
                New-InitRecord 'links' 'InPlace' "Already in place: $link -> $target"
            }
            'Missing' {
                if ($WhatIf) {
                    New-InitRecord 'links' 'Changed' "Would link: $link -> $target"
                }
                else {
                    New-FolderJunction $link $target
                    New-InitRecord 'links' 'Changed' "Linked: $link -> $target"
                }
            }
            'OtherTarget' {
                $old = @((Get-Item -LiteralPath $link -Force).Target)[0]
                if ($WhatIf) {
                    New-InitRecord 'links' 'Changed' "Would re-point: $link -> $target (now $old)"
                }
                else {
                    Remove-FolderLink $link
                    New-FolderJunction $link $target
                    New-InitRecord 'links' 'Changed' "Re-pointed: $link -> $target (was $old)"
                }
            }
        }
    }
}

# ---- Step 3: the per-PC notes starter ----

<#
.SYNOPSIS
    Step 3: gives this PC its machine-pitfalls skill when it has none: a copy of the repo's starter for Claude Code,
    and a junction to that copy for Copilot. Anything already at either place is left alone.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%.
.PARAMETER RepoRoot
    The repo's real folder; the starter is its templates\machine-pitfalls.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    Two records (New-InitRecord), one per place.
#>
function Install-NotesStarter {
    param([string]$HomePath, [string]$RepoRoot, [switch]$WhatIf)

    $template = Join-Path $RepoRoot 'templates\machine-pitfalls'
    $claudeNotes = Join-Path $HomePath '.claude\skills\machine-pitfalls'
    $copilotNotes = Join-Path $HomePath '.copilot\skills\machine-pitfalls'

    if (Test-ItemPresent $claudeNotes) {
        New-InitRecord 'notes' 'InPlace' "Already in place, left alone: $claudeNotes"
    }
    elseif ($WhatIf) {
        New-InitRecord 'notes' 'Changed' "Would create the notes starter: $claudeNotes (a copy of $template)"
    }
    else {
        New-Item -ItemType Directory -Force -Path (Split-Path $claudeNotes -Parent) | Out-Null
        Copy-Item -LiteralPath $template -Destination $claudeNotes -Recurse
        New-InitRecord 'notes' 'Changed' "Created the notes starter: $claudeNotes (a copy of $template)"
    }

    if (Test-ItemPresent $copilotNotes) {
        New-InitRecord 'notes' 'InPlace' "Already in place, left alone: $copilotNotes"
    }
    elseif ($WhatIf) {
        New-InitRecord 'notes' 'Changed' "Would link: $copilotNotes -> $claudeNotes"
    }
    else {
        New-FolderJunction $copilotNotes $claudeNotes
        New-InitRecord 'notes' 'Changed' "Linked: $copilotNotes -> $claudeNotes"
    }
}

# ---- Steps 4 to 6 (filled by run S3b2) ----

<#
.SYNOPSIS
    Step 4: creates the per-PC settings file when it is missing, and never overwrites it. Empty until run S3b2.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%; the state folder is under it.
.PARAMETER RepoRoot
    The repo's real folder; the file's default names its parent folder.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    Records (New-InitRecord) with Step 'pc-settings'.
#>
function Install-PcSettings {
    param([string]$HomePath, [string]$RepoRoot, [switch]$WhatIf)
}

<#
.SYNOPSIS
    Step 5: puts the team's two hooks and autoContinueAtUsageLimit into Claude Code's settings.json. Empty until run
    S3b2.
.PARAMETER ClaudeConfigDir
    The folder holding settings.json: -ClaudeConfigDir when given, else <home>\.claude.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%; the hook paths go through its repo link.
.PARAMETER NodePath
    The full path of node.exe that step 1 found; the hooks' command.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    Records (New-InitRecord) with Step 'claude-settings'.
#>
function Install-ClaudeSettings {
    param([string]$ClaudeConfigDir, [string]$HomePath, [string]$NodePath, [switch]$WhatIf)
}

<#
.SYNOPSIS
    Step 6: installs the team's extensions with claude.exe. Empty until run S3b2.
.PARAMETER ClaudePath
    The full path of the claude.exe that step 1 found.
.PARAMETER ClaudeConfigDir
    -ClaudeConfigDir as given, or empty when it was not: then CLAUDE_CONFIG_DIR is left as it is.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%; the marketplace is its repo link.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    Records (New-InitRecord) with Step 'extensions'.
#>
function Install-TeamExtensions {
    param([string]$ClaudePath, [string]$ClaudeConfigDir, [string]$HomePath, [switch]$WhatIf)
}

# ---- Init ----

<#
.SYNOPSIS
    Runs every step in order: the checks, the links, the notes starter, the per-PC settings file, Claude Code's
    settings and the extensions. Stops (Stop-Init) when the home folder is missing, a check fails or a real folder is
    in the way, each before any change.
.PARAMETER HomePath
    The folder that stands for %USERPROFILE%. It must exist.
.PARAMETER ClaudeConfigDir
    Where Claude Code's settings.json and plugin files are; empty means <home>\.claude.
.PARAMETER RepoRoot
    The repo's real folder.
.PARAMETER WhatIf
    Only say what would change.
.OUTPUTS
    The records of every step (New-InitRecord), in order.
#>
function Invoke-Init {
    param([string]$HomePath, [string]$ClaudeConfigDir = '', [string]$RepoRoot, [switch]$WhatIf)

    $HomePath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($HomePath)
    if (-not (Test-Path -LiteralPath $HomePath -PathType Container)) {
        Stop-Init ("init stopped: the home folder $HomePath does not exist. -HomePath must name an existing folder; " +
            'it stands for %USERPROFILE%. Nothing was changed.')
    }
    $facts = Test-Prerequisites -HomePath $HomePath
    New-InitRecord 'checks' 'Checked' ("Checks passed: Windows, PowerShell $($facts.PowerShellVersion), " +
        "Node $($facts.NodePath), Claude Code $($facts.ClaudePath)")

    $givenConfigDir = ''
    $configDir = Join-Path $HomePath '.claude'
    if ($ClaudeConfigDir) {
        $givenConfigDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ClaudeConfigDir)
        $configDir = $givenConfigDir
    }

    Install-Links -Plan (Get-LinkPlan -HomePath $HomePath -RepoRoot $RepoRoot) -WhatIf:$WhatIf
    Install-NotesStarter -HomePath $HomePath -RepoRoot $RepoRoot -WhatIf:$WhatIf
    Install-PcSettings -HomePath $HomePath -RepoRoot $RepoRoot -WhatIf:$WhatIf
    Install-ClaudeSettings -ClaudeConfigDir $configDir -HomePath $HomePath -NodePath $facts.NodePath -WhatIf:$WhatIf
    Install-TeamExtensions -ClaudePath $facts.ClaudePath -ClaudeConfigDir $givenConfigDir -HomePath $HomePath -WhatIf:$WhatIf
}

if ($MyInvocation.InvocationName -ne '.') {
    $records = [System.Collections.Generic.List[object]]::new()
    $failure = $null
    try {
        Invoke-Init -HomePath $HomePath -ClaudeConfigDir $ClaudeConfigDir -RepoRoot (Get-RepoRoot $PSScriptRoot) -WhatIf:$WhatIf |
            ForEach-Object { $records.Add($_); $_.Text }
    }
    catch {
        $failure = $_
    }
    if (-not $failure) {
        Format-InitSummary -Records $records -WhatIf:$WhatIf
        exit 0
    }
    if ($failure.Exception.Data['InitStop']) {
        [Console]::Error.WriteLine($failure.Exception.Message)
    }
    else {
        # Something broke part-way: say what, and what had been changed by then.
        [Console]::Error.WriteLine("init failed: $($failure.Exception.Message)")
        Format-InitSummary -Records $records -WhatIf:$WhatIf
    }
    exit 1
}
