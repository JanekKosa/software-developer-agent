# Prints the real state folder's files (name, size, write time), whether the real root exists, and the counts of the
# real old places in %TEMP%, so a run's before and after can be compared. Read-only.
$state = 'C:\Users\user\.claude\state'
"time $(Get-Date -Format 'HH:mm:ss')"
Get-ChildItem -Force -LiteralPath $state | ForEach-Object { "{0}`t{1}`t{2}" -f $_.Name, $_.Length, $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss.fff') }
"root exists: $(Test-Path -LiteralPath (Join-Path $state 'software-developer-agent'))"
"temp team-on: $(@(Get-ChildItem -Force -LiteralPath (Join-Path $env:TEMP 'claude-agent-team-on') -ErrorAction SilentlyContinue).Count)"
"temp context-guard: $(@(Get-ChildItem -Force -LiteralPath (Join-Path $env:TEMP 'claude-context-guard') -ErrorAction SilentlyContinue).Count)"
foreach ($name in 'team-on', 'context-guard', 'logs') { "temp\$name exists: $(Test-Path -LiteralPath (Join-Path $env:TEMP $name))" }
