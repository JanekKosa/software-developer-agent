# Starts a new Claude Code chat with a prompt in the VS Code window that has a project open, and sends it: the
# relaunch after a hand-over at a usage limit, or at the main session's context cap with -ContextCap, which changes
# only the cause its notifications name (a task from schedule-relaunch.ps1 runs it). Every step is logged with the
# time to the log file (relaunch.logFile in orchestration.config.json, or -LogPath); when even that path cannot be
# worked out, one line starting with START NOT RUN is printed instead:
#   1. Run 'code <folder>' (the code command beside the running VS Code, else the user install), so VS Code brings
#      the window that has the folder open to the front, or opens one; wait focusWaitSeconds.
#   2. Check the foreground window: VS Code's, with the folder's name in its title. If not, bring that window to the
#      front and check again.
#   3. Only if the project's window is now in front: open vscode://anthropic.claude-code/open?prompt=<prompt>, a new
#      Claude Code chat with the prompt typed in, and wait panelLoadSeconds. The link carries no window id, so VS Code
#      hands it to its last focused window, which with several projects open may be another project's. So when the
#      project's window is not in front, nothing is opened: the prompt is logged, a Windows notification asks the
#      user to open a Claude chat in that project and send it, and the script exits 1.
#   4. If the project's window is still in front, press Enter to send the prompt. If not, send nothing: the prompt
#      waits in the new chat, and a Windows notification asks the user to press Enter there.
# The first link opened from outside VS Code makes VS Code ask "Allow 'Claude Code' to open this URI?"; tick "do not
# ask again" once.
#
#   & '<skill>\scripts\start-session-in-vscode.ps1' -ProjectDir <folder> -Prompt <text> [-DryRun]
#
# -DryRun only looks: it finds the code command, lists the VS Code windows, checks the foreground window and says
# what it would run, open and press, judging step 3 by the window in front now. It runs nothing, brings no window
# forward and sends no key.
# An unknown or misspelled parameter fails before any line runs, instead of being ignored (D-0007).
[CmdletBinding()]
param(
    # The project folder; its name is what the VS Code window title must show.
    [string]$ProjectDir = '',
    # The prompt the new chat is started with.
    [string]$Prompt = '',
    # Looks and says what it would do; changes nothing on screen.
    [switch]$DryRun,
    # The chat follows a hand-over at the main session's context cap, not a usage limit: the notifications say so.
    [switch]$ContextCap,
    # The orchestration settings: the two waits, the log file and the notification time.
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\orchestration.config.json'),
    # Where each step is logged. Default: relaunch.logFile.
    [string]$LogPath,
    # How long the notification's tray icon stays. Default: relaunch.notifySeconds.
    [int]$NotifySeconds
)

# --- Settings ----------------------------------------------------------------------------------------------------

# The orchestration settings file, parsed. A missing file is an error that names it.
function Read-OrchestrationConfig([string]$path) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "The settings file $path does not exist." }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
}

# One value of the settings by its dotted key ('usageLimits.probeModel'). A missing key is an error that names it.
function Get-ConfigValue($config, [string]$key, [string]$path) {
    $node = $config
    foreach ($part in $key.Split('.')) {
        if ($node -isnot [Collections.IDictionary] -or -not $node.Contains($part)) { throw "$path has no key '$key'." }
        $node = $node[$part]
    }
    return , $node
}

# A path from the settings with each %NAME% replaced by that environment variable. A variable that is not set is an
# error naming the key and the variable, so a path never keeps a literal %NAME%.
function Expand-ConfigPath([string]$value, [string]$key, [string]$path) {
    foreach ($found in [regex]::Matches($value, '%([^%]+)%')) {
        if (-not [Environment]::GetEnvironmentVariable($found.Groups[1].Value)) {
            throw "$path key '$key' names $($found.Value), which is not set."
        }
    }
    return [Environment]::ExpandEnvironmentVariables($value)
}

# --- Windows -----------------------------------------------------------------------------------------------------

# Loads the few user32 calls the script needs, once per process.
function Initialize-Win32 {
    if ('RelaunchWin32' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class RelaunchWin32 {
    private delegate bool EnumWindowsProc(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr data);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder text, int size);
    [DllImport("user32.dll")] private static extern int GetWindowTextLength(IntPtr window);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);

    public static IntPtr[] VisibleWindows() {
        var found = new List<IntPtr>();
        EnumWindows((window, data) => { if (IsWindowVisible(window)) found.Add(window); return true; }, IntPtr.Zero);
        return found.ToArray();
    }

    public static string Title(IntPtr window) {
        int length = GetWindowTextLength(window);
        if (length == 0) return "";
        var text = new StringBuilder(length + 1);
        GetWindowText(window, text, text.Capacity);
        return text.ToString();
    }

    public static uint ProcessOf(IntPtr window) {
        uint id;
        GetWindowThreadProcessId(window, out id);
        return id;
    }
}
'@
}

# The code command: bin\code.cmd beside the running VS Code's Code.exe, else the per-user install's. $null if neither.
function Find-CodeCommand {
    $running = Get-Process -Name 'Code' -ErrorAction SilentlyContinue | ForEach-Object { $_.Path } | Where-Object { $_ } | Select-Object -Unique
    foreach ($exe in $running) {
        $candidate = Join-Path (Split-Path -Parent $exe) 'bin\code.cmd'
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    $installed = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
    if (Test-Path -LiteralPath $installed -PathType Leaf) { return $installed }
    return $null
}

# The visible VS Code windows with a title, each as {Handle, ProcessId, Title}. All windows of one VS Code belong to
# one process, so they are found by enumerating windows, not by each process's main window.
function Get-CodeWindows {
    Initialize-Win32
    $codeIds = @(Get-Process -Name 'Code' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    foreach ($handle in [RelaunchWin32]::VisibleWindows()) {
        $owner = [int][RelaunchWin32]::ProcessOf($handle)
        if ($codeIds -notcontains $owner) { continue }
        $title = [RelaunchWin32]::Title($handle)
        if ($title) { [pscustomobject]@{ Handle = $handle; ProcessId = $owner; Title = $title } }
    }
}

# Whether a VS Code title names the folder as one of its ' - ' parts ('notes.md - xpp-agent - Visual Studio Code'),
# ignoring case and the unsaved-changes dot. A part that only contains the name does not count.
function Test-TitleNamesFolder([string]$title, [string]$folderName) {
    if (-not $title -or -not $folderName) { return $false }
    $parts = $title -csplit ' - ' | ForEach-Object { $_.Trim([char]0x25CF, ' ') }
    return $parts -contains $folderName
}

# The foreground window as {Handle, ProcessName, Title}.
function Get-FrontWindow {
    Initialize-Win32
    $handle = [RelaunchWin32]::GetForegroundWindow()
    $process = Get-Process -Id ([int][RelaunchWin32]::ProcessOf($handle)) -ErrorAction SilentlyContinue
    return [pscustomobject]@{ Handle = $handle; ProcessName = $process.ProcessName; Title = [RelaunchWin32]::Title($handle) }
}

# Whether the foreground window is VS Code's window of the folder.
function Test-ProjectInFront([string]$folderName) {
    $front = Get-FrontWindow
    return $front.ProcessName -eq 'Code' -and (Test-TitleNamesFolder $front.Title $folderName)
}

# Brings a window to the front. Windows lets a background process do that only right after a key event, so an Alt
# press and release comes first (the usual unlock); a minimised window is restored.
function Invoke-BringToFront([IntPtr]$handle) {
    Initialize-Win32
    $alt = 0x12
    $keyUp = 0x2
    [RelaunchWin32]::keybd_event($alt, 0, 0, [UIntPtr]::Zero)
    [RelaunchWin32]::keybd_event($alt, 0, $keyUp, [UIntPtr]::Zero)
    if ([RelaunchWin32]::IsIconic($handle)) { $null = [RelaunchWin32]::ShowWindow($handle, 9) }
    $null = [RelaunchWin32]::SetForegroundWindow($handle)
}

# Runs the code command with the folder. It goes through cmd.exe, as every .cmd does; the folder is always quoted so
# cmd.exe cannot split it at a & or a space.
function Start-CodeWithFolder([string]$codeCommand, [string]$folder) {
    $info = [Diagnostics.ProcessStartInfo]::new($env:ComSpec, "/d /s /c `"`"$codeCommand`" `"$folder`"`"")
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $null = [Diagnostics.Process]::Start($info)
}

# --- The chat ----------------------------------------------------------------------------------------------------

# The link that opens a new Claude Code chat with the prompt typed in.
function New-ClaudeOpenUri([string]$prompt) {
    return 'vscode://anthropic.claude-code/open?prompt=' + [Uri]::EscapeDataString($prompt)
}

# Why the new chat starts, as the notifications open: the limit has reset, or the session handed over at its cap.
function Get-RelaunchCause([bool]$contextCap) {
    if ($contextCap) { return 'the session has handed over at its context cap' }
    return 'the limit has reset'
}

# What step 3 does, as {OpenLink, Notice}: the link is opened only when the project's window is in front, because
# VS Code hands a link without a window id to its last focused window, which may be another project's. Otherwise
# Notice is the notification that asks the user to start the chat in that project with the prompt; $cause is from
# Get-RelaunchCause.
function Get-ChatStartPlan([bool]$inFront, [string]$folderName, [string]$prompt, [string]$cause) {
    if ($inFront) { return [pscustomobject]@{ OpenLink = $true; Notice = $null } }
    return [pscustomobject]@{
        OpenLink = $false
        Notice   = "Claude: $cause, but the window of $folderName was not in front. Open a new Claude chat there and send: $prompt"
    }
}

# Shows a Windows notification (a tray balloon, which Windows 10 shows as a toast) for $seconds.
function Show-Notification([string]$text, [int]$seconds) {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $icon = [Windows.Forms.NotifyIcon]::new()
    try {
        $icon.Icon = [Drawing.SystemIcons]::Information
        $icon.Visible = $true
        $icon.ShowBalloonTip($seconds * 1000, 'Claude Code', $text, [Windows.Forms.ToolTipIcon]::Info)
        Start-Sleep -Seconds $seconds
    }
    finally {
        $icon.Dispose()
    }
}

# Writes one step to the log with the time, and to the output.
function Write-RelaunchLog([string]$path, [string]$text) {
    $line = "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture))  $text"
    New-Item -ItemType Directory -Force (Split-Path -Parent $path) | Out-Null
    Add-Content -LiteralPath $path -Value $line -Encoding utf8
    $line
}

# --- The relaunch ------------------------------------------------------------------------------------------------

# Dot-sourced (by the tests), the script only defines its functions.
if ($MyInvocation.InvocationName -eq '.') { return }

# The log file comes first: without it there is nowhere to log why nothing started.
if (-not $PSBoundParameters.ContainsKey('LogPath')) {
    try {
        $LogPath = Expand-ConfigPath (Get-ConfigValue (Read-OrchestrationConfig $ConfigPath) 'relaunch.logFile' $ConfigPath) 'relaunch.logFile' $ConfigPath
    }
    catch {
        "START NOT RUN | no log to write: $($_.Exception.Message)"
        exit 1
    }
}
try {
    if (-not $Prompt) { throw '-Prompt is required.' }
    if (-not $ProjectDir -or -not (Test-Path -LiteralPath $ProjectDir -PathType Container)) { throw "The project folder '$ProjectDir' does not exist." }
    $config = Read-OrchestrationConfig $ConfigPath
    $focusWait = Get-ConfigValue $config 'relaunch.focusWaitSeconds' $ConfigPath
    $panelWait = Get-ConfigValue $config 'relaunch.panelLoadSeconds' $ConfigPath
    if (-not $PSBoundParameters.ContainsKey('NotifySeconds')) { $NotifySeconds = Get-ConfigValue $config 'relaunch.notifySeconds' $ConfigPath }
}
catch {
    Write-RelaunchLog $LogPath "not started: $($_.Exception.Message)"
    exit 1
}
$folder = (Resolve-Path -LiteralPath $ProjectDir).ProviderPath.TrimEnd('\')
$name = [IO.Path]::GetFileName($folder)
$cause = Get-RelaunchCause $ContextCap.IsPresent
$mode = if ($DryRun) { ' (dry run: nothing is run, focused, opened or pressed)' } else { '' }
Write-RelaunchLog $LogPath "start: project $folder, prompt '$Prompt'$mode"

$code = Find-CodeCommand
if (-not $code) {
    Write-RelaunchLog $LogPath 'step 1: no VS Code code command found; stopping.'
    if (-not $DryRun) { Show-Notification "Claude: $cause, but VS Code was not found. Open $name and start the chat yourself." $NotifySeconds }
    exit 1
}
if ($DryRun) {
    Write-RelaunchLog $LogPath "step 1: would run $code `"$folder`" and wait $focusWait s"
}
else {
    Start-CodeWithFolder $code $folder
    Write-RelaunchLog $LogPath "step 1: ran $code `"$folder`"; waiting $focusWait s"
    Start-Sleep -Seconds $focusWait
}

$windows = @(Get-CodeWindows)
$match = $windows | Where-Object { Test-TitleNamesFolder $_.Title $name } | Select-Object -First 1
$inFront = Test-ProjectInFront $name
$found = if ($match) { "'$($match.Title)'" } else { 'none' }
Write-RelaunchLog $LogPath "step 2: $($windows.Count) VS Code window(s); the one of ${name}: $found; in front: $inFront"
if (-not $inFront -and $match) {
    if ($DryRun) {
        Write-RelaunchLog $LogPath "step 2: would bring $found to the front"
    }
    else {
        Invoke-BringToFront $match.Handle
        $inFront = Test-ProjectInFront $name
        Write-RelaunchLog $LogPath "step 2: brought $found forward; in front: $inFront"
    }
}

$uri = New-ClaudeOpenUri $Prompt
$plan = Get-ChatStartPlan $inFront $name $Prompt $cause
if ($DryRun) {
    if ($plan.OpenLink) {
        Write-RelaunchLog $LogPath "step 3: would open $uri and wait $panelWait s"
        Write-RelaunchLog $LogPath "step 4: would press Enter if the window of $name is then in front, else show a notification"
    }
    else {
        Write-RelaunchLog $LogPath "step 3: would open nothing, as the window of $name is not in front now (a real run may bring it forward in steps 1 and 2), and would show: $($plan.Notice)"
    }
    exit 0
}
if (-not $plan.OpenLink) {
    Write-RelaunchLog $LogPath "step 3: the window of $name is not in front, so nothing was opened (VS Code would hand the link to its last focused window, which may be another project's); the user is asked to send the prompt by hand: $Prompt"
    Show-Notification $plan.Notice $NotifySeconds
    exit 1
}
Start-Process $uri
Write-RelaunchLog $LogPath "step 3: opened $uri; waiting $panelWait s"
Start-Sleep -Seconds $panelWait

if (Test-ProjectInFront $name) {
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.SendKeys]::SendWait('{ENTER}')
    Write-RelaunchLog $LogPath 'step 4: pressed Enter; the new session has its prompt'
    exit 0
}
Write-RelaunchLog $LogPath "step 4: the window of $name was not in front; sent nothing, the prompt waits in the new chat"
Show-Notification "Claude: $cause. Press Enter in the new chat of $name." $NotifySeconds
exit 0
