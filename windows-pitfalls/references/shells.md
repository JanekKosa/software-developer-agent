# PowerShell and native programs

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **PowerShell variable names are case-insensitive**: `$p = Join-Path $P $f` silently overwrites `$P` and every
  later iteration gets a garbage path. Use distinct names. Likewise `Select-String` is case-insensitive by default;
  pass `-CaseSensitive` when casing is the whole point of the search. So are `-replace`, `-match` and `-split`,
  inside the regex too: repairing JSON with `-replace '\\(?![\\"/bfnrtu])'` left `C:\Repos` broken, because `[r]`
  also matched the `R` (seen 2026-10-19, *"Bad JSON escape sequence: \R"* on the second try). Use `-creplace`,
  `-cmatch`, `-csplit`.
- **A PowerShell `foreach` STATEMENT cannot be piped**: `foreach ($x in $y) { ... } | Format-Table` is a parse
  error, reported as *"Invoke-Expression: An empty pipe element is not allowed"* - which names neither the line
  nor the `foreach`, so it reads like a mangled command. Assign first (`$rows = foreach (...) { ... }`) then pipe
  `$rows`, or use `ForEach-Object`. Same trap for `if`/`switch`/`while` statements.
- **PowerShell passes `-name=$var` to a program literally when it is not quoted.** A native argument that starts
  with `-` is taken as written, so `xppc.exe -modelmodule=$mod` failed with *"No module with the name '$mod'
  could be found"* while the quoted `-log="$sp\x.log"` in the same call was expanded (seen 2026-10-14). Quote
  the whole argument: `"-modelmodule=$mod"`.
- **A PowerShell list holding ONE inner list is flattened**: `@( @('AxClass', 'X', 'Classes') )` becomes the three
  strings, so `$_[0]` is `'A'`, not `'AxClass'`. Seen 2026-10-14 as project items `Include="A\x"`. Write the
  single row with a leading comma, `@( ,@('AxClass', 'X', 'Classes') )`.
- **Piping file paths as plain strings into `Select-String` searches the path text, not the files.**
  `[IO.Directory]::EnumerateFiles($d) | Select-String 'X'` returns nothing, with no error, although the files
  contain `X` (seen 2026-10-14: a field defined in a table extension "did not exist"). Strings arrive as
  `-InputObject`; only `FileInfo` objects from `Get-ChildItem` bind to the path. Pipe `Get-ChildItem` output, or
  pass the list with `-Path`.
- **`... | Select-Object -First N` stops the program feeding it as soon as N lines have arrived.** A native
  program such as `node` is killed mid-run, so its `finally` blocks never execute and whatever it was holding (a
  child process, an attached debugger) is not released. When the run matters, write the output to a file and read
  the tail.
- **`PowerShell` here-docs do not exist**: `git commit -F - <<'EOF'` fails with *"Missing file specification after
  redirection operator"*. Write the message to a file with a single-quoted here-string and pass `-F <file>`.
- **A PowerShell single-quoted string also ends at the four TYPOGRAPHIC quotes** `U+2018 U+2019 U+201A U+201B`,
  not only at `'`. So the usual "double the quote" escape is not enough: a value carrying a curly quote closes its
  own literal and **the rest of it runs as script**. Verified in both `powershell.exe` and `pwsh.exe`. When
  building a script from text you did not write, double all five characters
  (`value.replace(/['‘’‚‛]/g, '$&$&')`) or pass the value as an argument instead of
  interpolating it. Symptom if you get it wrong: a name containing a curly quote silently executes commands.
- **An argument containing `&` is cut short when it goes through an npm command's `.cmd` shim, and the rest is
  run as a command.** `playwright-cli.cmd goto "https://x/?cmp=USMF&mi=CustTable"` opened `?cmp=USMF` and then
  printed *"'mi' is not recognized as an internal or external command"*, exit 1. PowerShell's quotes do not help:
  the `.cmd` file hands the line to `cmd.exe`, which splits at `&` again. Call the `.ps1` shim beside it, or
  `node <the package's .js entry>` directly. A bare command name in PowerShell 7 already resolves to the `.ps1`
  (`Get-Command <name> -All` lists it first), so the trap is an explicit `.cmd`, `cmd /c`, or a spawn through a
  shell. Verified with `@playwright/cli`; the shim is generated the same way for every npm command.
- **A command line glued together from strings breaks at the first space, quote or `&` in a value.** Build a command
  string with a quoting helper, and start a command-line tool with an argument array (`spawn(exe, [args])`,
  `& $exe @args`), never through a shell or a `.cmd` shim (the entry above). Moved here from the worker's agent file
  on 2026-10-27.
- **`Start-Process pwsh -File <path with a space>` starts nothing and says nothing.** The arguments are joined into
  one command line without quotes, so the path is cut at the space. Put an extra pair of quotes around the path:
  `Start-Process pwsh -ArgumentList '-File', '"C:\My scripts\x.ps1"'`. Moved here from the worker's agent file on
  2026-10-27.
- **A backtick-n inside a single-quoted PowerShell string is not a line break**: `'a`nb'` stays the four characters
  as written. Only a double-quoted string expands it; use `"`n"` or `[Environment]::NewLine`. Moved here from the
  worker's agent file on 2026-10-27.
- **A tool call holding an inline here-string with a regex or a system path is refused by the Claude Code harness.**
  Write the script to a file with the Write tool and run the file. Moved here from the worker's agent file on
  2026-10-27.
- **`$x = if (...) { , $list }` still unrolls the list**: the comma keeps it whole only as far as the `if`
  statement's output, which is unrolled again on assignment, so a one-row list is flattened anyway (the entry on
  one-row lists above). Assign inside the branches: `if (...) { $x = @(, $list) } else { $x = $list }` (seen
  2026-10-27).
