# VS Code

Split out of `machine-pitfalls` on 2026-10-27: these hold on any Windows PC. Symptom first, then the rule.

- **VS Code agent sessions keep asking to approve shell commands although `chat.tools.global.autoApprove` is
  `true`.** All VS Code windows share one background agent host, and every open window pushes its own reading of
  the setting to it - last write wins. One long-open window can read it as `false` (seen 2026-10-08 in a window
  open since the previous day; no workspace setting or registry policy explained it) and override the others.
  Diagnose in `%APPDATA%\Code\logs\<latest>\`: `agenthost.log` logs each turn as
  `Syncing permission mode: ... configuredLevel=default, sdkMode=manual, ... globalAutoApprove=false`, and each
  window's `renderer.log` logs `Mirroring configuration to host root config from USER: globalAutoApproveEnabled=...`
  when the setting changes - the window that answers `false` is the culprit. Toggling the setting in
  `settings.json` re-sends it from every window, so it does not help while that window is open; reload or close
  that window, or quit VS Code entirely (verified: after a restart every turn logged `globalAutoApprove=true`). Also: `/permissions allow-all` is not a VS Code command and is sent to
  the model as text; the VS Code commands are `/allow-all on` and `/yolo on`.
