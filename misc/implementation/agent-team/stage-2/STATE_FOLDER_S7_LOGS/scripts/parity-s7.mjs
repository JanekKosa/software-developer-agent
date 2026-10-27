// S7 parity: the pane's marker rule (decisions-pane\hooks\team-on.ts, imported as is) against the team's staged
// teamOnMarkerPath (STATE_FOLDER_STAGING\orchestrate-agents\lib\agent-team.mjs), case by case, with the environment
// variables each case names set in this process only. Reads both files; writes nothing.
import { pathToFileURL } from 'node:url'

const PANE = 'C:\\Repos\\My projects\\claude-code-extensions\\decisions-pane\\hooks\\team-on.ts'
const TEAM = 'C:\\Repos\\My projects\\software-developer-agent\\misc\\implementation\\agent-team\\stage-2\\STATE_FOLDER_STAGING\\orchestrate-agents\\lib\\agent-team.mjs'
const pane = await import(pathToFileURL(PANE).href)
const team = await import(pathToFileURL(TEAM).href)

/** The five names team-switch.ts reads, each by its literal name, as $.env.get('NAME') would (assumed: process.env). */
const FIVE = ['USERPROFILE', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA']

/** Five different folders, so that no variable can stand in for another. */
const SET = {
  USERPROFILE: 'C:\\Users\\me',
  TEMP: 'C:\\Users\\me\\AppData\\Local\\Temp',
  TMP: 'D:\\tmp',
  LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
  APPDATA: 'C:\\Users\\me\\AppData\\Roaming',
  PROGRAMDATA: 'C:\\ProgramData',
}
const ID = '0f6c1d2e-3a4b-4c5d-8e9f-a0b1c2d3e4f5'
const UNSET = Symbol('unset')

/** Each case: label, teamState.folder, variables over SET (UNSET removes one; null = the machine's real ones), onFolder, id. */
const cases = [
  ['task: %TEMP%', '%TEMP%\\software-developer-agent'],
  ['task: %LocalAppData%', '%LocalAppData%\\x'],
  ['task: %APPDATA%', '%APPDATA%\\x'],
  ['task: %TMP%', '%TMP%\\x'],
  ['task: %USERPROFILE%', '%USERPROFILE%\\x'],
  ['task: %PROGRAMDATA% (not one of the five)', '%PROGRAMDATA%\\x'],
  ['task: %TEMP% with TEMP unset', '%TEMP%\\x', { TEMP: UNSET }],
  ['lower %temp%', '%temp%\\x'],
  ['mixed %Tmp%', '%Tmp%\\x'],
  ['lower %localappdata%', '%localappdata%\\x'],
  ['mixed %AppData%', '%AppData%\\x'],
  ['lower shipped %userprofile%', '%userprofile%\\.claude\\state\\software-developer-agent'],
  ['shipped %USERPROFILE%', '%USERPROFILE%\\.claude\\state\\software-developer-agent'],
  ['dot-dot after %APPDATA%', '%APPDATA%\\..\\Local\\x'],
  ['two variables run together', '%TEMP%%TMP%'],
  ['variable after a drive', 'C:\\%TMP%'],
  ['two variables as parts', '%LOCALAPPDATA%\\%TEMP%'],
  ['multi-part child under %TMP%', '%TMP%\\x', {}, 'switch\\team on'],
  ['USERPROFILE unset', '%USERPROFILE%\\x', { USERPROFILE: UNSET }],
  ['TMP unset', '%TMP%\\x', { TMP: UNSET }],
  ['LOCALAPPDATA unset', '%LOCALAPPDATA%\\x', { LOCALAPPDATA: UNSET }],
  ['APPDATA unset', '%APPDATA%\\x', { APPDATA: UNSET }],
  ['TMP unset, in the middle', 'C:\\state\\%TMP%', { TMP: UNSET }],
  ['USERPROFILE empty', '%USERPROFILE%\\x', { USERPROFILE: '' }],
  ['TEMP empty', '%TEMP%\\x', { TEMP: '' }],
  ['TMP empty', '%TMP%\\x', { TMP: '' }],
  ['LOCALAPPDATA empty', '%LOCALAPPDATA%\\x', { LOCALAPPDATA: '' }],
  ['APPDATA empty, in the middle', 'C:\\state\\%APPDATA%', { APPDATA: '' }],
  ['dotless i', '%USERPROF\u0131LE%\\x'],
  ['long s', '%U\u017FERPROFILE%\\x'],
  ['dotted capital I', '%USERPROF\u0130LE%\\x'],
  ['NUL after TEMP', '%TEMP\u0000%\\x'],
  ['%SystemRoot% (not one of the five)', '%SystemRoot%\\x'],
  ['TEMP relative', '%TEMP%\\x', { TEMP: 'tmp' }],
  ['TMP a share (UNC)', '%TMP%\\x', { TMP: '\\\\server\\share' }],
  ['APPDATA a bare drive', '%APPDATA%\\x', { APPDATA: 'C:' }],
  ['unclosed %TEMP', '%TEMP\\x'],
  ['bad session id under %TEMP%', '%TEMP%\\x', {}, 'team-on', 'a_b'],
  ['real machine: shipped setting', '%USERPROFILE%\\.claude\\state\\software-developer-agent', null],
  ['real machine: %TEMP%', '%TEMP%\\software-developer-agent', null],
  ['real machine: %LOCALAPPDATA%', '%LOCALAPPDATA%\\software-developer-agent', null],
  ['real machine: %APPDATA%', '%APPDATA%\\software-developer-agent', null],
  ['real machine: %TMP%', '%TMP%\\software-developer-agent', null],
]

/** Runs fn with the case's variables in process.env, then puts every touched variable back. */
function withVariables(variables, fn) {
  if (variables === null) {
    return fn()
  }

  const wanted = { ...SET, ...variables }
  const saved = new Map(Object.keys(wanted).map(name => [name, process.env[name]]))

  for (const [name, value] of Object.entries(wanted)) {
    if (value === UNSET) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  try {
    return fn()
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  }
}

let agreeOn = 0
let agreeOff = 0
const safeSide = []
const differences = []

for (const [label, folder, variables = {}, onFolder = 'team-on', id = ID] of cases) {
  const [panePath, teamPath] = withVariables(variables, () => {
    const config = { teamState: { folder }, agentTeam: { onFolder } }
    const read = new Map(FIVE.map(name => [name, process.env[name]]))
    const mine = pane.teamOnMarkerPath(pane.stateRootOf(pane.stateFolderOf(config), read), pane.onFolderOf(config), id)
    let theirs

    try {
      theirs = team.teamOnMarkerPath(config, id)
    } catch (error) {
      theirs = `ERROR ${error.message}`
    }

    return [mine, theirs]
  })
  const teamGivesPath = !teamPath.startsWith('ERROR ')
  let verdict

  if (panePath !== null && panePath === teamPath) {
    verdict = 'agree: same path'
    agreeOn += 1
  } else if (panePath === null && !teamGivesPath) {
    verdict = 'agree: no marker'
    agreeOff += 1
  } else if (panePath === null && teamGivesPath) {
    verdict = 'safe side: pane no marker, team a path'
    safeSide.push(label)
  } else {
    verdict = 'DIFFERENCE'
    differences.push(label)
  }

  console.log(`${verdict} | ${label} | ${JSON.stringify(folder)} | pane ${JSON.stringify(panePath)} | team ${JSON.stringify(teamPath)}`)
}

console.log(`\ncases ${cases.length}: same path ${agreeOn}, both no marker ${agreeOff}, safe side ${safeSide.length} (${safeSide.join('; ')}), DIFFERENCES ${differences.length}${differences.length > 0 ? ` (${differences.join('; ')})` : ''}`)
process.exitCode = differences.length === 0 ? 0 : 1
