# Step 0b and 0c: copy the live orchestrate-agents folder to the staging folder and write the base list.
$ErrorActionPreference = 'Stop'
$live = 'C:\Repos\My projects\software-developer-agent\orchestrate-agents'
$stage2 = 'C:\Repos\My projects\software-developer-agent\misc\implementation\agent-team\stage-2'
$stagingRoot = Join-Path $stage2 'STATE_FOLDER_STAGING'
$target = Join-Path $stagingRoot 'orchestrate-agents'
$baseList = Join-Path $stage2 'STATE_FOLDER_STAGING_BASE_CLAUDE.txt'
if (Test-Path -LiteralPath $stagingRoot) { throw "staging folder exists already: $stagingRoot" }
if (Test-Path -LiteralPath $baseList) { throw "base list exists already: $baseList" }
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$files = Get-ChildItem -LiteralPath $live -Recurse -File -Force | Sort-Object FullName
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# base list of the live orchestrate-agents folder, taken $stamp")
foreach ($f in $files) {
    $rel = $f.FullName.Substring($live.Length + 1)
    $h = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
    $lines.Add("$rel`t$h")
}
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($f in $files) {
    $rel = $f.FullName.Substring($live.Length + 1)
    $dest = Join-Path $target $rel
    $dir = Split-Path -Parent $dest
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -LiteralPath $f.FullName -Destination $dest
}
[System.IO.File]::WriteAllLines($baseList, $lines, [System.Text.UTF8Encoding]::new($false))
# Verify the copy matches the base list.
$bad = 0
foreach ($line in $lines | Select-Object -Skip 1) {
    $rel, $h = $line -split "`t"
    $copyHash = (Get-FileHash -LiteralPath (Join-Path $target $rel) -Algorithm SHA256).Hash
    if ($copyHash -ne $h) { $bad++; "DIFF $rel" }
}
$copyCount = (Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
"files live=$($files.Count) copy=$copyCount mismatches=$bad stamp=$stamp"
