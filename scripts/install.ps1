<#
.SYNOPSIS
    Makes this repo's agents and its two skills (orchestrate-agents, team-rules) available on this machine.

.DESCRIPTION
    Creates five directory junctions:
      ~/.claude/agents/software-developer-agent  -> <repo>\agents              (software-developer, task-lead, code-searcher)
      ~/.claude/skills/orchestrate-agents        -> <repo>\orchestrate-agents  (Claude Code)
      ~/.copilot/skills/orchestrate-agents       -> <repo>\orchestrate-agents  (GitHub Copilot)
      ~/.claude/skills/team-rules                -> <repo>\team-rules          (Claude Code)
      ~/.copilot/skills/team-rules               -> <repo>\team-rules          (GitHub Copilot)
    Claude Code scans ~/.claude/agents recursively, so every agent file here is found. The lead and the worker
    preload team-rules by name, so it must be an installed skill. An edit here is live at the next Claude Code
    start. A junction needs no admin rights.

    Safe to run twice. A junction that already points here is left alone. A junction or symbolic link that points
    somewhere else (the skill's old home in xpp-agent, say) is removed as a link only, with
    [System.IO.Directory]::Delete(path, $false), which never touches the folder it pointed at, and is made again.
    A real folder or file in the way stops the script before it changes anything.

    The vendored skills under skills\ are never linked: the agents read them by path.

    Dot-sourcing the script (. .\install.ps1) only defines its functions and installs nothing.
#>

$ErrorActionPreference = 'Stop'

# ---- Paths ----

<#
.SYNOPSIS
    Returns the links this script keeps, each with the folder it must point at.
.OUTPUTS
    Hashtables with the keys Link and Target.
#>
function Get-LinkPlan {
    $repo = Split-Path $PSScriptRoot -Parent
    $skill = Join-Path $repo 'orchestrate-agents'
    $rules = Join-Path $repo 'team-rules'
    return @(
        @{ Link = Join-Path $env:USERPROFILE '.claude\agents\software-developer-agent'; Target = Join-Path $repo 'agents' },
        @{ Link = Join-Path $env:USERPROFILE '.claude\skills\orchestrate-agents'; Target = $skill },
        @{ Link = Join-Path $env:USERPROFILE '.copilot\skills\orchestrate-agents'; Target = $skill },
        @{ Link = Join-Path $env:USERPROFILE '.claude\skills\team-rules'; Target = $rules },
        @{ Link = Join-Path $env:USERPROFILE '.copilot\skills\team-rules'; Target = $rules }
    )
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

# ---- Links ----

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

# ---- Install ----

<#
.SYNOPSIS
    Checks every link of a plan first, then creates or repairs the ones that need it.
.PARAMETER Plan
    Hashtables with the keys Link and Target, as Get-LinkPlan returns them.
.OUTPUTS
    One line per link saying what was done.
#>
function Install-Links {
    param([object[]]$Plan)

    $states = foreach ($entry in $Plan) { Get-LinkState $entry.Link $entry.Target }
    $blocked = for ($i = 0; $i -lt $Plan.Count; $i++) { if (@($states)[$i] -eq 'Blocked') { $Plan[$i].Link } }
    if ($blocked) {
        throw "A real folder or file is in the way at: $($blocked -join '; '). Nothing was changed."
    }

    for ($i = 0; $i -lt $Plan.Count; $i++) {
        $link = $Plan[$i].Link
        $target = $Plan[$i].Target
        switch (@($states)[$i]) {
            'Linked' { "Already linked: $link -> $target" }
            'Missing' { New-FolderJunction $link $target; "Linked: $link -> $target" }
            'OtherTarget' { Remove-FolderLink $link; New-FolderJunction $link $target; "Relinked: $link -> $target" }
        }
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Install-Links -Plan (Get-LinkPlan)
}
