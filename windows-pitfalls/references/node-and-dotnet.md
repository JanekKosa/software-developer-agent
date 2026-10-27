# Node, TypeScript and .NET

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **`npx tsx` on a scratch `.ts` file outside a package fails on top-level `await`** with *"Top-level await is
  currently not supported with the cjs output format"* - with no nearby `package.json` saying otherwise the file
  is treated as CommonJS. Name the scratch file `.mts`.
- **A .NET `AssemblyResolve` handler that does not cache its FAILURES kills the process with no catchable error.**
  Symptom: *"Process is terminated due to StackOverflowException"*, usually before stdout is flushed, so earlier
  output vanishes too and it looks like the first statement crashed. Cause: returning `null` for a name lets the
  CLR ask again for that same name while it walks a dependency chain, and each ask re-enters the handler. Record
  the miss in the cache **before** probing for the file, not after.
- **PowerShell cannot host an `AssemblyResolve` handler at all**: the scriptblock's own execution needs assembly
  loading, so it re-enters itself and overflows however it is written. To probe a .NET Framework API (the D365
  metadata assemblies, say), compile a small C# exe and run that instead.
- **`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe` only speaks C# 5.** `/langversion:latest` fails with
  *"Invalid option 'latest' for /langversion; must be ISO-1, ISO-2, 3, 4, 5 or Default"*, and tuples, pattern
  matching and `using` declarations are all syntax errors. Use Visual Studio's Roslyn compiler:
  `C:\Program Files\Microsoft Visual Studio\<version>\<edition>\MSBuild\Current\Bin\Roslyn\csc.exe` (VS 2026 is
  version `18`).
- **A .NET namespace does not tell you the assembly.** `LoadFrom("…Metadata.Providers.dll")` for a type in
  `Microsoft.Dynamics.AX.Metadata.Providers` fails with *"Could not load file or assembly … The system cannot find
  the file specified"* because no such DLL exists - the type is in `Microsoft.Dynamics.AX.Metadata.dll`. Search the
  candidate DLLs for the type rather than deriving a filename from its namespace.
- **The CLR resolves an assembly when it JITs the method that MENTIONS it, not when that line runs.** So a resolve
  hook installed at the top of `Main` is already too late for any type `Main` itself names. Put the work in a
  separate method marked `[MethodImpl(MethodImplOptions.NoInlining)]` and call it after installing the hook.
- **`dotnet build` on a project whose `<Reference>` globs list several candidate install paths floods MSB3106**
  (*"Assembly strong name … is either a path which could not be found or…"*) - one warning per path that does not
  exist on this machine, which buries the real errors. Add `MSB3106` to `MSBuildWarningsAsMessages`; there is
  nothing to fix, since a machine only ever has one of the layouts.
