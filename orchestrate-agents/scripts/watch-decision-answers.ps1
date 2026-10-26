# The decision answers watch. Watches the decision register of one repo for answers the user gave in the Decisions
# pane, and ends when it hands some over, so that the main session wakes and passes them on. The main session starts
# it from its own repo with the PowerShell tool and run_in_background, description "Decision answers watch", and starts
# it again every time it ends, after passing on what it printed.
#
#   & <skill>\scripts\watch-decision-answers.ps1
#
# Two things make it hand answers over:
# - Every EveryMinutes (30 by default), counted from its start, and once at the start: a full look, node register.mjs
#   handover --root <Root> (register.mjs beside this script), which hands over every answer not yet handed over.
# - As soon as every open entry is answered: every LookSeconds (5 by default) it reads the size and write time of the
#   register's open file and answers log, and only when one of them changed since the last look it runs register.mjs
#   handover --when-all-answered --root <Root>, which hands over every waiting answer if no open entry waits for the
#   user any more, and nothing otherwise. Example: 5 entries wait for the user and the user answers all 5 within 3
#   minutes: the watch ends within seconds of the fifth answer, printing all 5. With 4 of the 5 answered it keeps
#   waiting, and those 4 come with the next full look.
# handover marks what it hands over, so no answer is printed twice; the watch itself never writes the register. It
# learns where the two files are once at the start, from the register's own code (lib\decision-register.mjs), so it
# looks at the same files register.mjs reads. While no answer is handed over it prints nothing. When answers are, it
# prints them exactly as handover printed them (the first line starts with DECISION ANSWERS |), then the line asking
# for it to be started again, and ends with exit code 0. A look of either kind that fails (the register busy, the
# answers log unreadable, a crash) is tried again at the next look; FailuresBeforeStop such looks in a row end it, and
# so do wrong use (Root not a folder), node missing from the PATH and a missing or invalid setting, at once: it prints
# one line starting with DECISION ANSWERS WATCH FAILED | and the reason, and ends with exit code 1. The period, the
# look interval and the failure count come from orchestration.config.json (decisionAnswersWatch) unless passed.
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007); PowerShell takes
# the start of one name, such as -EveryMin, as that name.
[CmdletBinding()]
param(
    # The folder whose repo's register is read; a relative path counts from the current folder. Default: the
    # current folder, so only the chat's own repo is watched (D-14).
    [string]$Root,
    # How often to hand over every waiting answer, in minutes from the start, greater than 0; fractions are allowed.
    # Default: decisionAnswersWatch.everyMinutes.
    [double]$EveryMinutes,
    # How often to check whether the register changed, in seconds, greater than 0; fractions are allowed. Default:
    # decisionAnswersWatch.lookSeconds.
    [double]$LookSeconds,
    # How many looks in a row may find the register busy or its answers log unreadable before the watch gives up.
    # Default: decisionAnswersWatch.failuresBeforeStop.
    [int]$FailuresBeforeStop,
    # The orchestration settings: the period, the look interval and the failure count.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json')
)

$restartLine = 'Start the Decision answers watch again (description "Decision answers watch").'
$failedPrefix = 'DECISION ANSWERS WATCH FAILED | '

# Prints, as JSON, the paths of the open file and the answers log of the register of a folder, as register.mjs finds
# them: node --input-type=module -e <this> <skill folder> <folder>.
$locateScript = @'
const [skillDir, root] = process.argv.slice(1);
try {
    const { pathToFileURL } = await import('node:url');
    const path = await import('node:path');
    const load = (name) => import(pathToFileURL(path.join(skillDir, 'lib', name)).href);
    const { loadConfig } = await load('config.mjs');
    const { registerLocation } = await load('decision-register.mjs');
    const location = registerLocation(root, loadConfig(skillDir));
    process.stdout.write(JSON.stringify([location.openPath, location.answersLogPath]));
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
}
'@

# --- Settings -----------------------------------------------------------------------------------------------------

# The orchestration settings file, parsed. A missing file is an error that names it.
function Read-OrchestrationConfig([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "The settings file $path does not exist." }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
}

# One value of the settings by its dotted key ('decisionAnswersWatch.everyMinutes'). A missing key is an error that
# names it.
function Get-ConfigValue($config, [string]$key, [string]$path) {
    $node = $config
    foreach ($part in $key.Split('.')) {
        if ($node -isnot [Collections.IDictionary] -or -not $node.Contains($part)) { throw "$path has no key '$key'." }
        $node = $node[$part]
    }
    return , $node
}

# Says whether a setting is a number greater than 0.
function Test-PositiveNumber($value) {
    return ($value -is [int] -or $value -is [long] -or $value -is [double] -or $value -is [decimal]) -and $value -gt 0
}

# The period, the look interval and the failure count by parameter name: a parameter in $bound (the passed ones) as
# passed, else its key under decisionAnswersWatch. A passed parameter's key is not needed. A value out of range is an
# error that says what is allowed.
function Get-WatchSettings($config, [string]$path, $bound) {
    $keys = [ordered]@{
        EveryMinutes = 'decisionAnswersWatch.everyMinutes'
        LookSeconds = 'decisionAnswersWatch.lookSeconds'
        FailuresBeforeStop = 'decisionAnswersWatch.failuresBeforeStop'
    }
    $settings = @{}
    foreach ($name in $keys.Keys) {
        $settings[$name] = if ($bound.ContainsKey($name)) { $bound[$name] } else { Get-ConfigValue $config $keys[$name] $path }
    }
    foreach ($name in 'EveryMinutes', 'LookSeconds') {
        if (-not (Test-PositiveNumber $settings[$name])) { throw "$name must be a number greater than 0, not $($settings[$name])." }
    }
    $count = $settings.FailuresBeforeStop
    if (-not (($count -is [int] -or $count -is [long]) -and $count -ge 1)) {
        throw "FailuresBeforeStop must be a whole number of at least 1, not $count."
    }
    return $settings
}

# --- Looking ------------------------------------------------------------------------------------------------------

# Runs node once with the given arguments. Gives its exit code, its stdout as the bytes it printed (so the user's
# words pass through unchanged, line breaks included) and its stderr as text.
function Invoke-Node([string]$nodePath, [string[]]$arguments) {
    $startInfo = [Diagnostics.ProcessStartInfo]::new($nodePath)
    foreach ($argument in $arguments) { $startInfo.ArgumentList.Add($argument) }
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardErrorEncoding = [Text.UTF8Encoding]::new($false)
    $process = [Diagnostics.Process]::Start($startInfo)
    try {
        $stdout = [IO.MemoryStream]::new()
        $copying = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
        $stderr = $process.StandardError.ReadToEnd()
        $copying.Wait()
        $process.WaitForExit()
        return [pscustomobject]@{ ExitCode = $process.ExitCode; Stdout = $stdout.ToArray(); Stderr = $stderr }
    } finally {
        $process.Dispose()
    }
}

# Runs register.mjs handover once for the register of $rootPath; with -WhenAllAnswered, handover --when-all-answered.
# Gives what Invoke-Node gives.
function Invoke-Handover([string]$nodePath, [string]$registerPath, [string]$rootPath, [switch]$WhenAllAnswered) {
    $arguments = @($registerPath, 'handover')
    if ($WhenAllAnswered) { $arguments += '--when-all-answered' }
    return Invoke-Node $nodePath ($arguments + @('--root', $rootPath))
}

# The paths of the open file and the answers log of the register of $rootPath, worked out by the register's own code
# in $skillPath. A failure is an error with what node said.
function Get-RegisterFiles([string]$nodePath, [string]$skillPath, [string]$rootPath) {
    $run = Invoke-Node $nodePath @('--input-type=module', '-e', $locateScript, $skillPath, $rootPath)
    if ($run.ExitCode -ne 0) {
        $why = if ($run.Stderr.Trim() -eq '') { "node ended with exit code $($run.ExitCode)." } else { $run.Stderr }
        throw "Finding the register of $rootPath failed: $why"
    }
    return [string[]]([Text.Encoding]::UTF8.GetString($run.Stdout) | ConvertFrom-Json -NoEnumerate)
}

# The size and last write time of each file, as one text that changes whenever one of them is written, created or
# deleted.
function Get-RegisterStamp([string[]]$paths) {
    $parts = foreach ($path in $paths) {
        $file = [IO.FileInfo]::new($path)
        if ($file.Exists) { "$($file.Length):$($file.LastWriteTimeUtc.Ticks)" } else { 'none' }
    }
    return $parts -join '|'
}

# What a failed run said: its stderr, or its exit code when it said nothing.
function Get-LookFailure($look) {
    if ($look.Stderr.Trim() -eq '') { return "register.mjs handover ended with exit code $($look.ExitCode) and wrote nothing on stderr." }
    return $look.Stderr
}

# --- Output -------------------------------------------------------------------------------------------------------

# Writes bytes to this process's stdout as they are, whatever the console's encoding.
function Write-RawOutput([byte[]]$bytes) {
    $stream = [Console]::OpenStandardOutput()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
}

# Writes one line of text to stdout in UTF-8, ending with a line feed.
function Write-OutputLine([string]$text) {
    Write-RawOutput ([Text.UTF8Encoding]::new($false).GetBytes("$text`n"))
}

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

try {
    $ErrorActionPreference = 'Stop'
    $settings = Get-WatchSettings (Read-OrchestrationConfig $ConfigPath) $ConfigPath $PSBoundParameters
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction Ignore | Select-Object -First 1
    if ($null -eq $nodeCommand) { throw 'node was not found on the PATH, so register.mjs cannot run.' }
    $registerPath = Join-Path $PSScriptRoot 'register.mjs'
    $rootPath = if ($PSBoundParameters.ContainsKey('Root')) {
        $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Root)
    } else {
        (Get-Location).ProviderPath
    }
    $registerFiles = Get-RegisterFiles $nodeCommand.Source (Split-Path -Parent $PSScriptRoot) $rootPath
    $period = [TimeSpan]::FromMinutes([double]$settings.EveryMinutes)
    $lookEvery = [TimeSpan]::FromSeconds([double]$settings.LookSeconds)
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $nextFull = $period
    $fullDue = $true
    $seen = $null
    $failures = 0
    while ($true) {
        if ($clock.Elapsed -ge $nextFull) {
            $fullDue = $true
            while ($nextFull -le $clock.Elapsed) { $nextFull += $period }
        }
        # Read before the run, so a change made while it runs is seen at the next look.
        $stamp = Get-RegisterStamp $registerFiles
        if ($fullDue -or $stamp -ne $seen) {
            $look = Invoke-Handover $nodeCommand.Source $registerPath $rootPath -WhenAllAnswered:(-not $fullDue)
            if ($look.ExitCode -eq 0 -and $look.Stdout.Length -gt 0) {
                Write-RawOutput $look.Stdout
                Write-OutputLine $restartLine
                exit 0
            }
            if ($look.ExitCode -eq 0) {
                $failures = 0
                $fullDue = $false
                $seen = $stamp
            } elseif ($look.ExitCode -eq 2) {
                throw (Get-LookFailure $look)
            } else {
                # The look stays due (a full one) or the change stays unseen (the other), so the next look repeats it.
                $failures++
                if ($failures -ge $settings.FailuresBeforeStop) { throw (Get-LookFailure $look) }
            }
        }
        $untilFull = ($nextFull - $clock.Elapsed).Ticks
        Start-Sleep -Duration ([TimeSpan]::FromTicks([Math]::Max(0, [Math]::Min($lookEvery.Ticks, $untilFull))))
    }
} catch {
    Write-OutputLine "$failedPrefix$(($_.Exception.Message -replace '\s*[\r\n]+\s*', ' ').Trim())"
    exit 1
}
