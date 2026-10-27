# D-51 (the user chose A, 2026-10-27 11:35): cuts the real limit-stop log back to its 841 real bytes during the
# switch-over, before it is copied into the new folder. Run S1's red test run appended 60 test lines to it (841 ->
# 11409 bytes), all naming one of three test session ids. This keeps the first 841 bytes, after checking their SHA256,
# plus every later line that names none of the three ids, so a real line written since is never lost. It refuses on a
# hash mismatch, and when the log changed while it was being read.
#
#   pwsh -NoProfile -File STATE_FOLDER_TRIM_LOG_CLAUDE.ps1 [-LogPath <log>]
#
# Exit code: 0 trimmed or nothing to do, 1 refused (nothing written), 2 failed.
param(
    # The log to trim. Default: the real limit-stop log in its old place.
    [string]$LogPath = (Join-Path $env:USERPROFILE '.claude\state\limit-stop.log')
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

# The log's real bytes before the test lines, and their SHA256 (measured by run S1, 2026-10-27).
$HeadLength = 841
$ExpectedHeadHash = '021D5EE3DD937DFBB6626AC2FE028D9D866F3AF7634A5E1DD6B0CF72CBC0F6DE'
# The three test session ids every appended test line names.
$TestSessionIds = @('5e551000-aaaa-bbbb-cccc-000000000001', '5e551000-aaaa-bbbb-cccc-000000000002', '7b3870e5-e7c1-4f3a-9961-398d55920189')

# Whether a log line names one of the test session ids.
function Test-NamesTestSession([string]$line) {
    foreach ($id in $TestSessionIds) { if ($line.Contains($id)) { return $true } }
    return $false
}

try {
    if (-not (Test-Path -LiteralPath $LogPath -PathType Leaf)) { "TRIM REFUSED | $LogPath is not a file"; exit 1 }
    $info = [IO.FileInfo]::new($LogPath)
    $lengthBefore = $info.Length
    $timeBefore = $info.LastWriteTimeUtc
    $bytes = [IO.File]::ReadAllBytes($LogPath)
    if ($bytes.Length -lt $HeadLength) { "TRIM REFUSED | $LogPath holds $($bytes.Length) bytes, fewer than its $HeadLength real ones; nothing written"; exit 1 }
    $headHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([byte[]]$bytes[0..($HeadLength - 1)]))
    if ($headHash -cne $ExpectedHeadHash) {
        "TRIM REFUSED | the first $HeadLength bytes of $LogPath hash to $headHash, not ${ExpectedHeadHash}: not the log the test lines were added to; nothing written"
        exit 1
    }
    # Line by line on the bytes (a line ends after its LF), so every kept line keeps its exact bytes.
    $kept = [IO.MemoryStream]::new()
    $kept.Write($bytes, 0, $HeadLength)
    $removed = 0; $keptLines = 0
    $start = $HeadLength
    while ($start -lt $bytes.Length) {
        $end = [Array]::IndexOf($bytes, [byte]10, $start)
        $stop = if ($end -lt 0) { $bytes.Length } else { $end + 1 }
        $line = [Text.Encoding]::UTF8.GetString($bytes, $start, $stop - $start)
        if (-not (Test-NamesTestSession $line)) {
            $kept.Write($bytes, $start, $stop - $start)
            $keptLines++
        }
        else { $removed++ }
        $start = $stop
    }
    if ($removed -eq 0) {
        "TRIM NOTHING TO DO | $LogPath has no line after its first $HeadLength bytes that names a test session ($keptLines later lines)"
        exit 0
    }
    $temp = "$LogPath.trim-$PID.tmp"
    [IO.File]::WriteAllBytes($temp, $kept.ToArray())
    # A line appended since the read would be lost by the rename: refuse instead.
    $info.Refresh()
    if ($info.Length -ne $lengthBefore -or $info.Length -ne $bytes.Length -or $info.LastWriteTimeUtc -ne $timeBefore) {
        [IO.File]::Delete($temp)
        "TRIM REFUSED | $LogPath changed while it was read; nothing written. Run it again when no limit-stop server or guard writes to it."
        exit 1
    }
    [IO.File]::Move($temp, $LogPath, $true)
    "TRIM DONE | ${LogPath}: $($bytes.Length) -> $($kept.Length) bytes; $removed test lines removed, $keptLines later lines kept"
    exit 0
}
catch {
    "TRIM FAILED | $($_.Exception.Message)"
    exit 2
}
