# S7 mutation check: copies the Decisions pane to a scratch folder beside this script, breaks one rule at a time in
# the copy, runs the copy's tests, and says per mutant whether a test caught it. The real pane folder is only read
# (copied from). Based on S4's mutate.ps1.
param(
    [Parameter(Mandatory = $true)][string]$LogDir
)
$ErrorActionPreference = 'Stop'
$pane = 'C:\Repos\My projects\claude-code-extensions\decisions-pane'
$work = Join-Path $PSScriptRoot 'mut\decisions-pane'
$claude = "$env:USERPROFILE\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe"

if (Test-Path -LiteralPath $work) { throw "scratch copy $work is already there" }
$links = cmd /c "dir /AL /S /B `"$pane`"" 2>$null
if ($links) { throw "the pane folder holds links: $links" }
New-Item -ItemType Directory -Force (Split-Path $work) | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null
Copy-Item -LiteralPath $pane -Destination $work -Recurse
$onFile = Join-Path $work 'hooks\team-on.ts'
$switchFile = Join-Path $work 'hooks\team-switch.ts'
$onText = [System.IO.File]::ReadAllText($onFile)
$switchText = [System.IO.File]::ReadAllText($switchFile)
$nl = "`n"

# Each mutant: name, file, the exact text to break, its broken form.
$mutants = @(
    @('M0 none (the copy as is)', $onFile, '', ''),
    @('M1 TEMP not read', $switchFile, "      ['TEMP', await `$.env.get('TEMP')],$nl", ''),
    @('M2 TMP not read', $switchFile, "      ['TMP', await `$.env.get('TMP')],$nl", ''),
    @('M3 LOCALAPPDATA not read', $switchFile, "      ['LOCALAPPDATA', await `$.env.get('LOCALAPPDATA')],$nl", ''),
    @('M4 APPDATA not read', $switchFile, "      ['APPDATA', await `$.env.get('APPDATA')],$nl", ''),
    @('M5 names matched case-sensitively', $onFile, 'return name.replace(/[a-z]/g, letter => letter.toUpperCase())', 'return name'),
    @('M6 unset variable let through', $onFile, 'isUnset = true', 'isUnset = false'),
    @('M7 Unicode case folding (toUpperCase)', $onFile, 'return name.replace(/[a-z]/g, letter => letter.toUpperCase())', 'return name.toUpperCase()'),
    @('M8 keys of the map not folded', $onFile, '=> [variableKey(name), value]', '=> [name, value]'),
    @('M9 empty variable let through', $onFile, "value === undefined || value === ''", 'value === undefined'),
    @('M10 TMP read from TEMP', $switchFile, "['TMP', await `$.env.get('TMP')]", "['TMP', await `$.env.get('TEMP')]")
)

$results = @()
foreach ($m in $mutants) {
    $name, $file, $old, $new = $m
    [System.IO.File]::WriteAllText($onFile, $onText)
    [System.IO.File]::WriteAllText($switchFile, $switchText)
    if ($old -ne '') {
        $text = [System.IO.File]::ReadAllText($file)
        $count = ([regex]::Matches($text, [regex]::Escape($old))).Count
        if ($count -ne 1) { $results += "$name | NOT APPLIED: the text occurs $count times"; continue }
        [System.IO.File]::WriteAllText($file, $text.Replace($old, $new))
    }
    $log = Join-Path $LogDir (($name -split ' ')[0] + '.log')
    & $claude plugin test $work *> $log
    $body = Get-Content -LiteralPath $log -Raw
    $pass = if ($body -match '(?m)^\s*(\d+) pass') { [int]$Matches[1] } else { -1 }
    $fail = if ($body -match '(?m)^\s*(\d+) fail') { [int]$Matches[1] } else { -1 }
    $loadFailed = $body -match 'did not load'
    $verdict = if ($old -eq '') { if ($fail -eq 0) { 'clean' } else { 'COPY FAILS UNMUTATED' } }
               elseif ($loadFailed) { 'NOT COUNTED: did not load' }
               elseif ($fail -gt 0) { 'caught' } else { 'SURVIVED' }
    $failed = (Select-String -LiteralPath $log -Pattern '^\(fail\) (\S+)' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Unique) -join ' '
    $results += "$name | $verdict | pass $pass fail $fail | failing: $failed"
}
[System.IO.File]::WriteAllText($onFile, $onText)
[System.IO.File]::WriteAllText($switchFile, $switchText)
$results | ForEach-Object { $_ }
