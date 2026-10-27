/**
 * Tests of the switch rule the pane copies from the agent team (hooks/team-on.ts), without a session: the root
 * `teamState.folder` with its `%NAME%` parts filled in and checked as absolute, the child `agentTeam.onFolder` checked
 * by the team's rule for a path under the root, the session ids that give no marker path, and how the path is joined.
 * The test kit hands the stand-ins each file path resolved and normalised, so a session cannot tell `C:\a\\b` from
 * `C:\a\b`, or see an empty id's path; these tests can.
 */
import { expect, test } from 'claude-code/testing'

import { isStatePath, onFolderOf, stateFolderOf, stateRootOf, teamOnMarkerPath } from '../../hooks/team-on'

/** The root as the team's settings ship it, and a home folder to fill it in with. */
const SHIPPED_ROOT = '%USERPROFILE%\\.claude\\state\\software-developer-agent'
const HOME = 'C:\\Users\\me'

/** A plain session id, the team's usual child and a root that needs nothing filled in. */
const ID = 'abc-1'
const CHILD = 'team-on'
const ROOT = 'C:\\state'

/**
 * Gives the variables a test sets, as `$.env.get` would answer them; one not given is unset.
 *
 * @param pairs each variable's name and value
 * @returns the variables
 */
const vars = (pairs: Readonly<Record<string, string>> = {}) => new Map(Object.entries(pairs))

// ── The root ──

test('O1 each %NAME% in the root is filled in from its variable, once, left to right', () => {
  expect(stateRootOf(SHIPPED_ROOT, vars({ USERPROFILE: HOME }))).toBe('C:\\Users\\me\\.claude\\state\\software-developer-agent')
  expect(stateRootOf('%DRIVE%\\%DIR%\\state', vars({ DRIVE: 'D:', DIR: 'team' }))).toBe('D:\\team\\state')
  expect(stateRootOf('%A%\\x\\%A%', vars({ A: 'C:' }))).toBe('C:\\x\\C:')
  // A value is not filled in again: %B% inside A's value stays as written.
  expect(stateRootOf('%A%\\x', vars({ A: 'C:\\%B%', B: 'never' }))).toBe('C:\\%B%\\x')
  // %% names no variable and stays.
  expect(stateRootOf('C:\\a%%b', vars())).toBe('C:\\a%%b')
  // %A%B% names A only; the last % stays.
  expect(stateRootOf('C:\\%A%B%', vars({ A: 'x' }))).toBe('C:\\xB%')
  // A root that names no variable is used as written.
  expect(stateRootOf(ROOT, vars())).toBe(ROOT)
})

test('O2 a root naming a variable that is not set, or set to nothing, gives no root', () => {
  expect(stateRootOf(SHIPPED_ROOT, vars())).toBeNull()
  expect(stateRootOf(SHIPPED_ROOT, vars({ USERPROFILE: '' }))).toBeNull()
  // In the middle, so dropping it or keeping it as written would still give an absolute path.
  expect(stateRootOf('C:\\state\\%NOPE%', vars())).toBeNull()
  expect(stateRootOf('C:\\state\\%NOPE%', vars({ NOPE: '' }))).toBeNull()
  expect(stateRootOf('C:\\%A%\\%NOPE%', vars({ A: 'x' }))).toBeNull()
})

test('O3 a root that is not a drive letter, a colon and a backslash once filled in gives no root', () => {
  for (const root of ['state\\team', '\\state', '\\\\server\\share\\state', 'C:state', 'C:/state', '/c/state', 'CC:\\x', '1:\\x', '']) {
    expect(stateRootOf(root, vars())).toBeNull()
  }

  expect(stateRootOf('%REL%\\x', vars({ REL: 'state' }))).toBeNull()
  expect(stateRootOf('%UNC%\\x', vars({ UNC: '\\\\server\\share' }))).toBeNull()
  expect(stateRootOf('c:\\x', vars())).toBe('c:\\x')
})

test('O4 a root that is missing or not text gives no root', () => {
  for (const root of [undefined, null, 42, true, {}, ['C:\\x']]) {
    expect(stateRootOf(root, vars())).toBeNull()
  }
})

test('O13 a %NAME% matches its variable whatever the letter case of either, A to Z only, as Windows matches names', () => {
  expect(stateRootOf('%temp%\\x', vars({ TEMP: 'C:\\T' }))).toBe('C:\\T\\x')
  expect(stateRootOf('%LocalAppData%\\x', vars({ LOCALAPPDATA: 'C:\\L' }))).toBe('C:\\L\\x')
  // The name given for a variable may be in any letter case too.
  expect(stateRootOf('%SYSTEMROOT%\\x', vars({ SystemRoot: 'C:\\Windows' }))).toBe('C:\\Windows\\x')
  // Node's process.env on Windows (24.13, 2026-10-27) finds none of these: a dotless i, a long s, a dotted capital I.
  expect(stateRootOf('%USERPROF\u0131LE%\\x', vars({ USERPROFILE: HOME }))).toBeNull()
  expect(stateRootOf('%U\u017FERPROFILE%\\x', vars({ USERPROFILE: HOME }))).toBeNull()
  expect(stateRootOf('%USERPROF\u0130LE%\\x', vars({ USERPROFILE: HOME }))).toBeNull()
  expect(stateRootOf('%USERPROFILE%\\x', vars({ 'USERPROF\u0131LE': HOME }))).toBeNull()
})

// ── The child under the root ──

/** Children the team refuses, each with the first of its rules it breaks. */
const REFUSED_CHILDREN: readonly (readonly [unknown, string])[] = [
  [undefined, 'missing'],
  [null, 'missing'],
  [42, 'not text'],
  [['team-on'], 'not text'],
  ['', 'is empty'],
  ['C:', "has a drive or a ':'"],
  ['C:\\x', "has a drive or a ':'"],
  ['a:b', "has a drive or a ':'"],
  ['\\team-on', "starts or ends with '\\' or '/'"],
  ['team-on\\', "starts or ends with '\\' or '/'"],
  ['/team-on', "starts or ends with '\\' or '/'"],
  ['team-on/', "starts or ends with '\\' or '/'"],
  ['\\\\server\\share', "starts or ends with '\\' or '/'"],
  ['team/on', "has a '/'"],
  ['team*', 'has one of * ? " < > | %'],
  ['team?', 'has one of * ? " < > | %'],
  ['"team"', 'has one of * ? " < > | %'],
  ['<team>', 'has one of * ? " < > | %'],
  ['team|on', 'has one of * ? " < > | %'],
  ['%TEMP%\\x', 'has one of * ? " < > | %'],
  ['team%', 'has one of * ? " < > | %'],
  ['a\\\\b', 'has an empty part'],
  ['.', "has a '.' or '..' part"],
  ['..', "has a '.' or '..' part"],
  ['a\\.\\b', "has a '.' or '..' part"],
  ['a\\..', "has a '.' or '..' part"],
  ['..\\..\\Windows', "has a '.' or '..' part"],
]

test('O5 a child the team refuses is not a path under the root, and gives no marker path', () => {
  for (const [child] of REFUSED_CHILDREN) {
    expect(isStatePath(child)).toBe(false)
    expect(teamOnMarkerPath(ROOT, child, ID)).toBeNull()
  }
})

test('O6 a child of plain names joined by backslashes is a path under the root', () => {
  for (const child of ['team-on', 'team on.v2', 'state\\team-on', 'a\\b\\c', '...', 'a\\...\\b', 'team.', '_x']) {
    expect(isStatePath(child)).toBe(true)
  }
})

// ── The session id ──

test('O7 a session id the team would refuse gives no marker path', () => {
  for (const id of [undefined, null, 42, '', '.', '..', 'a\\b', 'a/b', 'a b', 'C:', 'a_b', 'ab\n', 'a'.repeat(129)]) {
    expect(teamOnMarkerPath(ROOT, CHILD, id)).toBeNull()
  }

  expect(teamOnMarkerPath(ROOT, CHILD, 'a'.repeat(128))).toBe(`C:\\state\\team-on\\${'a'.repeat(128)}`)
})

test('O8 with no root there is no marker path', () => {
  expect(teamOnMarkerPath(null, CHILD, ID)).toBeNull()
})

// ── The join ──

test('O9 a marker path is joined as Node path.win32.join joins the root, the child and the id', () => {
  // Each expected value is what Node 24.13's own path.win32.join gave for the same three parts (2026-10-27).
  const cases: readonly (readonly [string, string, string])[] = [
    ['C:\\Users\\me\\.claude\\state\\software-developer-agent', 'team-on', 'C:\\Users\\me\\.claude\\state\\software-developer-agent\\team-on\\abc-1'],
    ['C:\\state\\', 'team-on', 'C:\\state\\team-on\\abc-1'],
    ['C:\\', 'team-on', 'C:\\team-on\\abc-1'],
    ['c:\\x', 'team-on', 'c:\\x\\team-on\\abc-1'],
    ['C:\\a\\\\b', 'team-on', 'C:\\a\\b\\team-on\\abc-1'],
    ['C:\\a/b', 'team-on', 'C:\\a\\b\\team-on\\abc-1'],
    ['C:\\a\\.\\b', 'team-on', 'C:\\a\\b\\team-on\\abc-1'],
    ['C:\\a\\..\\b', 'team-on', 'C:\\b\\team-on\\abc-1'],
    ['C:\\a\\..\\..\\b', 'team-on', 'C:\\b\\team-on\\abc-1'],
    ['C:\\a\\..', 'team-on', 'C:\\team-on\\abc-1'],
    ['C:\\a\\...\\b', 'x\\...\\y z.', 'C:\\a\\...\\b\\x\\...\\y z.\\abc-1'],
    ['C:\\a\\\\', 'state\\team-on', 'C:\\a\\state\\team-on\\abc-1'],
    ['C:\\a:b\\c', 'team-on', 'C:\\a:b\\c\\team-on\\abc-1'],
  ]

  for (const [root, child, expected] of cases) {
    expect(teamOnMarkerPath(root, child, ID)).toBe(expected)
  }
})

test('O10 the shipped settings and a home folder give the marker under the home folder', () => {
  const root = stateRootOf(SHIPPED_ROOT, vars({ USERPROFILE: 'C:\\Users\\user' }))

  expect(teamOnMarkerPath(root, 'team-on', '56c67d3d-b3c0-43be-a82c-b3a9cdc23274')).toBe(
    'C:\\Users\\user\\.claude\\state\\software-developer-agent\\team-on\\56c67d3d-b3c0-43be-a82c-b3a9cdc23274',
  )
})

// ── Reading the settings ──

test('O11 the root is read from teamState.folder, and is missing in any other shape', () => {
  expect(stateFolderOf({ teamState: { folder: 'x' } })).toBe('x')
  expect(stateFolderOf({ teamState: {} })).toBeUndefined()
  expect(stateFolderOf({ teamState: 'x' })).toBeUndefined()
  expect(stateFolderOf({ teamState: null })).toBeUndefined()
  expect(stateFolderOf({ agentTeam: { onFolder: 'x' } })).toBeUndefined()
  expect(stateFolderOf(null)).toBeUndefined()
  expect(stateFolderOf('x')).toBeUndefined()
})

test('O12 the child is read from agentTeam.onFolder, and is missing in any other shape', () => {
  expect(onFolderOf({ agentTeam: { onFolder: 'x' } })).toBe('x')
  expect(onFolderOf({ agentTeam: {} })).toBeUndefined()
  expect(onFolderOf({ agentTeam: 'x' })).toBeUndefined()
  expect(onFolderOf({})).toBeUndefined()
  expect(onFolderOf(null)).toBeUndefined()
  expect(onFolderOf('x')).toBeUndefined()
})
