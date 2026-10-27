# Files, folders, junctions and hard links

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **Creating a symbolic link needs admin rights** while Developer Mode is off, which is the default:
  *"Administrator privilege required for this operation"*. Directory junctions and hard links work without it.
- **`Move-Item` on a folder tree that contains junctions FOLLOWS them and moves files OUT of the targets.**
  Symptom: the destination grows past the source size while free disk space barely changes, and the junction
  targets (e.g. `PackagesLocalDirectory\<Package>`, a FabrikamD365 model folder) end up **empty**. It silently guts a
  D365 install. Before moving any tree, list reparse points with `cmd /c "dir /AL /S /B <path>"`; delete the
  links first with `[System.IO.Directory]::Delete($p, $false)` (removes the link, never the target) and rebuild
  them afterwards, or move with `robocopy /MOVE /E /XJ`. Never `Move-Item` a tree with junctions in it.
- **`robocopy` hangs on a locked file, and PowerShell calls its success a failure.** By default it retries a
  million times, 30 seconds apart; pass `/R:1 /W:1`. Its exit codes 1 to 7 mean success (files copied, extras
  found), so a check for a non-zero `$LASTEXITCODE` reports a failure: only 8 and above are errors. Moved here from
  the worker's agent file on 2026-10-27.
- **`Get-ChildItem -Recurse`, or a Glob, over a tree with hundreds of junctions may never finish**: it walks into
  every target. Give it a narrow path, or list the links first with `cmd /c "dir /AL /S /B <path>"`. Moved here from
  the worker's agent file on 2026-10-27.
- **A directory whose handle is held cannot be renamed, and `Move-Item` then silently degrades to a recursive
  per-file move** (*"You do not have sufficient access rights... or the item is hidden, system, or read only"*
  on the rename; children still move fine). A same-volume rename is instant, so if a move of a large tree is
  taking minutes it is copying, not renaming - stop it and find the handle. A `Move-Item` onto an **existing**
  destination directory also degrades this way, because a rename cannot merge.
- **`Remove-Item -Recurse -Force` on a large tree can fail with *"The directory is not empty"* although nothing
  is locked.** Windows finishes removing a file a moment after the call returns, so a folder can still look full
  when its own turn comes. Seen deleting 27 package folders (650 MB): three errors, yet 0 files left and only
  two empty folders. Count the files that remain before looking for a lock, then run the same command again.
- **Node's `fs.rmSync(path, { recursive: true })` returns without an error and removes nothing when the path
  holds a letter outside ASCII** (Node 24.13.0, Windows). Seen with a temp folder named `...-é-...`: the call
  came back clean and the folder was still there. `Remove-Item -LiteralPath` removed it. Keep scratch folder
  names in ASCII, and check that a folder is gone instead of trusting the call.
- **`Copy-Item` keeps the source file's last-write time, so a build can skip a file that was just swapped in.**
  `dotnet build` then reports success and leaves the old exe. Set `(Get-Item $f).LastWriteTime = Get-Date` after
  the copy, and check that the output file is newer than the swap.
- **A folder's last-write time does not change when a file inside it is edited in place.** It changes only when
  an entry is added, removed, or replaced through a temp file, and the folder above it never changes at all. So
  "which folders changed since X" misses every ordinary edit. Compare each file's own time and size instead:
  listing 10,000 files with their timestamps through `[IO.DirectoryInfo]::EnumerateFiles` took half a second.
- **The Write and Edit tools store a `\uXXXX` escape in source as the literal character.** Writing `/[‘]/`
  can land on disk as the curly quote itself. It compiles and behaves the same, but an editor, a formatter or a
  later `Edit` match can normalise or mangle the real character. Where the exact bytes matter, build the string
  from code points (`String.fromCharCode(0x2018)`) and check the file with
  `[regex]::Matches([IO.File]::ReadAllText($f), "[^\u0000-\u007F]").Count`.
- **Claude Code's Edit and Write tools save by replacing the file, which breaks a hard link.** The other path
  silently keeps the old content. Re-create the link afterwards; `fsutil hardlink list <file>` shows whether a
  file is still linked.
