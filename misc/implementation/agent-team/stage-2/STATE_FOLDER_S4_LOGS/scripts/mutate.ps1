# S4 mutation check: copies the Decisions pane to scratch, breaks one rule at a time in the copy, runs the copy's
# tests, and says per mutant whether a test caught it. The real pane folder is only read (copied from).
param(
    [Parameter(Mandatory = $true)][string]$LogDir
)
$ErrorActionPreference = 'Stop'
$pane = 'C:\Repos\My projects\claude-code-extensions\decisions-pane'
$work = Join-Path $PSScriptRoot 'decisions-pane'
$claude = "$env:USERPROFILE\.vscode\extensions\anthropic.claude-code-2.1.310-win32-x64\resources\native-binary\claude.exe"

if (Test-Path -LiteralPath $work) { throw "scratch copy $work is already there" }
Copy-Item -LiteralPath $pane -Destination $work -Recurse
$onFile = Join-Path $work 'hooks\team-on.ts'
$switchFile = Join-Path $work 'hooks\team-switch.ts'
$onText = [System.IO.File]::ReadAllText($onFile)
$switchText = [System.IO.File]::ReadAllText($switchFile)

# Each mutant: name, file, the exact text to break, its broken form.
$mutants = @(
    @('M0 none (the copy as is)', $onFile, '', ''),
    @('M1 root not expanded', $onFile, 'folder.replace(VARIABLE, (whole', 'folder.replace(/(?!)/g, (whole'),
    @('M2 unset variable let through', $onFile, 'isUnset = true', 'isUnset = false'),
    @('M3 root not checked absolute', $onFile, 'return !isUnset && ABSOLUTE_ROOT.test(root) ? root : null', 'return !isUnset ? root : null'),
    @('M4 child colon rule off', $onFile, "value => value.includes(':'),", 'value => false,'),
    @('M5 child percent off', $onFile, '/[*?"<>|%]/', '/[*?"<>|]/'),
    @('M6 child empty part rule off', $onFile, "value => value.split('\\').includes(''),", 'value => false,'),
    @('M7 child dot part rule off', $onFile, "value => value.split('\\').some(part => part === '.' || part === '..'),", 'value => false,'),
    @('M8 old TEMP folder as the root', $switchFile, 'stateRootOf(stateFolderOf(config), variables)', "(await `$.env.get('TEMP')) ?? null"),
    @('M9 session id pattern unchecked', $onFile, " || !SESSION_ID_PATTERN.test(sessionId)", '')
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
