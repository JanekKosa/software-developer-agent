/**
 * Looking at the agent team's switch for this chat: the session's id, the team's orchestration.config.json (the root
 * of the team's own files `teamState.folder` and the switch folder `agentTeam.onFolder` under it), the five folder
 * variables the root may name, and whether the session's marker is there. It only looks: it never writes, changes or
 * removes a marker, and it reads nothing but the team's settings and the marker.
 *
 * The engine lets a mod read only the environment variables its code names (`$.env.get` takes a literal name, so the
 * variables a mod reads can be listed; Claude Code 2.1.310). So the root may name `%USERPROFILE%` (as the team ships
 * it), `%TEMP%`, `%TMP%`, `%LOCALAPPDATA%` and `%APPDATA%`, in any letter case, and no other variable: a root naming
 * another counts as off here, while the team's own Node code would fill it in.
 */
import type { EngineInterface } from 'claude-code'

import { configPath, isNotThere } from './registers'
import type { Settings } from './settings'
import { onFolderOf, stateFolderOf, stateRootOf, teamOnMarkerPath } from './team-on'

/** What looking at the switch uses of the engine interface. */
export type SwitchDollar = Pick<EngineInterface, 'session' | 'env' | 'fs'>

/**
 * Looks at whether the agent team is switched on for this chat. The session id is read at every look: after a `/clear`
 * or a resume the session goes on under another id, which has a marker of its own or none, as the team's hooks see it.
 *
 * @param $ the engine interface
 * @param settings the mod's options (registerScript, which tells where the team's settings are)
 * @returns true when the session's marker is there; false when it is not, or the id, the root or the switch folder
 *   setting rules it out, or the team's settings are not there; null when the look failed for another reason (a
 *   refused read, settings caught half written, an id the engine could not give), so the caller keeps what it knew
 */
export async function lookAtSwitch($: SwitchDollar, settings: Settings): Promise<boolean | null> {
  try {
    const sessionId = await $.session.id()
    const settingsFile = await configPath($, settings)

    if (settingsFile === null) {
      return false
    }

    const config: unknown = JSON.parse(await $.fs.read(settingsFile))
    const variables = new Map([
      ['USERPROFILE', await $.env.get('USERPROFILE')],
      ['TEMP', await $.env.get('TEMP')],
      ['TMP', await $.env.get('TMP')],
      ['LOCALAPPDATA', await $.env.get('LOCALAPPDATA')],
      ['APPDATA', await $.env.get('APPDATA')],
    ])
    const marker = teamOnMarkerPath(stateRootOf(stateFolderOf(config), variables), onFolderOf(config), sessionId)

    if (marker === null) {
      return false
    }

    await $.fs.stat(marker)

    return true
  } catch (error) {
    return isNotThere(error) ? false : null
  }
}
