/**
 * Whether the agent team is switched on for a chat, as a pure rule: no `$` and no import, so it also runs outside the
 * engine. The team's `/software-developer-agent` command writes one marker per session,
 * `<teamState.folder>\<agentTeam.onFolder>\<session id>`, and a chat without one is an ordinary chat: the team's hooks
 * do nothing there, and the pane shows nothing (the user, 2026-10-26, D-32 and D-34). The root `teamState.folder` is
 * the one folder of every file the team keeps for itself (the user, 2026-10-27, D-36).
 *
 * Copied from `orchestrate-agents\lib\agent-team.mjs` (`teamOnMarkerPath`), `orchestrate-agents\lib\config.mjs`
 * (`requireStatePath`, with `requirePathSetting` for the root and `STATE_PATH_RULES` for the child) and
 * `orchestrate-agents\lib\limit-stop.mjs` (`SESSION_ID_PATTERN`), with paths joined as Node's `path.win32.join` joins
 * them. Those files are in this same repo since the pane moved here (2026-10-27), but this stays a copy: a mod cannot
 * import from outside its own folder. Keep them in step. One difference, on the safe side: where the library throws
 * an error, there is no marker path here, so the chat counts as off.
 */

/** A session id as Claude Code writes it: `SESSION_ID_PATTERN` of limit-stop.mjs. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/

/** An absolute root once its variables are filled in: a drive letter, a colon and a backslash (`ABSOLUTE_ROOT`). */
const ABSOLUTE_ROOT = /^[A-Za-z]:\\/

/** A `%NAME%` part of the root, filled in from that environment variable, as requirePathSetting reads it. */
const VARIABLE = /%([^%]+)%/g

/**
 * The rules a path under the root breaks, in the order of config.mjs's `STATE_PATH_RULES`; breaking any one refuses
 * it. Together they keep the path inside the root.
 */
const STATE_PATH_RULES: readonly ((value: string) => boolean)[] = [
  // is empty
  value => value === '',
  // has a drive or a ':'
  value => value.includes(':'),
  // starts or ends with '\' or '/'
  value => /^[\\/]|[\\/]$/.test(value),
  // has a '/'; parts are joined by '\'
  value => value.includes('/'),
  // has one of * ? " < > | %  (only the root may name a variable)
  value => /[*?"<>|%]/.test(value),
  // has an empty part
  value => value.split('\\').includes(''),
  // has a '.' or '..' part
  value => value.split('\\').some(part => part === '.' || part === '..'),
]

/**
 * Gives the root of the team's own files as the team's orchestration.config.json writes it (`teamState.folder`).
 *
 * @param config the parsed file
 * @returns the value; undefined when the file has none
 */
export function stateFolderOf(config: unknown): unknown {
  const state = typeof config === 'object' && config !== null ? (config as { teamState?: unknown }).teamState : undefined

  return typeof state === 'object' && state !== null ? (state as { folder?: unknown }).folder : undefined
}

/**
 * Gives the switch folder the team's orchestration.config.json names (`agentTeam.onFolder`), as found there.
 *
 * @param config the parsed file
 * @returns the value; undefined when the file has none
 */
export function onFolderOf(config: unknown): unknown {
  const team = typeof config === 'object' && config !== null ? (config as { agentTeam?: unknown }).agentTeam : undefined

  return typeof team === 'object' && team !== null ? (team as { onFolder?: unknown }).onFolder : undefined
}

/**
 * Gives the root with each `%NAME%` replaced by that variable, once, left to right, as requirePathSetting does, and
 * checks it is absolute, as requireStatePath does. A name matches its variable whatever its letter case, as Node's
 * `process.env` finds it on Windows: `%temp%` is TEMP.
 *
 * @param folder the root setting, from stateFolderOf
 * @param variables the variables the caller could read, by name in any letter case, as `$.env.get` answers them; one
 *   not given is unset
 * @returns the root; null when the setting is not text, names a variable that is unset or empty, or is not absolute
 *   once filled in (a UNC path included)
 * @example
 * stateRootOf('%USERPROFILE%\\.claude\\state\\software-developer-agent', new Map([['USERPROFILE', 'C:\\Users\\me']]))
 * // 'C:\\Users\\me\\.claude\\state\\software-developer-agent'
 */
export function stateRootOf(folder: unknown, variables: ReadonlyMap<string, string | undefined>): string | null {
  if (typeof folder !== 'string') {
    return null
  }

  const byKey = new Map([...variables].map(([name, value]): [string, string | undefined] => [variableKey(name), value]))
  let isUnset = false
  const root = folder.replace(VARIABLE, (whole, name: string) => {
    const value = byKey.get(variableKey(name))

    if (value === undefined || value === '') {
      isUnset = true

      return whole
    }

    return value
  })

  return !isUnset && ABSOLUTE_ROOT.test(root) ? root : null
}

/**
 * Gives a variable's name as Windows compares names: the letters a to z made capitals, every other character as it
 * is. Node's `process.env` finds `%temp%` as TEMP, but no dotless i as `I` and no long s as `S` (Node 24.13,
 * 2026-10-27), which `toUpperCase` would.
 *
 * @param name the name
 * @returns the name to compare
 */
function variableKey(name: string): string {
  return name.replace(/[a-z]/g, letter => letter.toUpperCase())
}

/**
 * Tells whether a setting is a path the team accepts under its root: one or more plain names joined by `\`.
 *
 * @param value the setting, such as `agentTeam.onFolder`
 * @returns true when it is text and breaks none of STATE_PATH_RULES
 */
export function isStatePath(value: unknown): value is string {
  return typeof value === 'string' && !STATE_PATH_RULES.some(breaks => breaks(value))
}

/**
 * Gives a session's marker path.
 *
 * @param root the root, from stateRootOf
 * @param onFolder the switch folder setting, from onFolderOf
 * @param sessionId the session id, as the engine gave it
 * @returns the path; null when the team cannot be on: no root, or a switch folder setting or session id that is
 *   missing, not a string, or refused
 */
export function teamOnMarkerPath(root: string | null, onFolder: unknown, sessionId: unknown): string | null {
  if (root === null || !isStatePath(onFolder) || typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    return null
  }

  return joinUnder(root, [onFolder, sessionId])
}

/**
 * Joins parts under an absolute root as Node's `path.win32.join` does: `/` read as `\`, empty and `.` parts dropped, a
 * `..` part taking the part before it away (never the drive's root).
 *
 * @param root an absolute root, `C:\...`
 * @param parts the parts to add
 * @returns the joined path
 * @example
 * joinUnder('C:\\state\\', ['team-on', 'abc-1']) // 'C:\\state\\team-on\\abc-1'
 */
function joinUnder(root: string, parts: readonly string[]): string {
  const kept: string[] = []

  for (const part of [root.slice(3), ...parts].join('\\').split(/[\\/]/)) {
    if (part === '..') {
      kept.pop()
    } else if (part !== '' && part !== '.') {
      kept.push(part)
    }
  }

  return `${root.slice(0, 2)}\\${kept.join('\\')}`
}
