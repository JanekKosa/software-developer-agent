/**
 * The decision registers on disk: where they are, reading the entries that wait for the person, and writing an answer
 * through the agent team's own register.mjs, so its lock and its layout hold.
 *
 * The only register read is the one of the session's repo: entries of other repos never show, whatever the team's
 * config names (its old `register.showInEveryChat` included), and so are its answers. The folder and file names come
 * from the team's orchestration.config.json; without it, `decisions\OPEN_DECISIONS_CLAUDE.md` and, beside it, the
 * answers log `decisions\ANSWERS_LOG_CLAUDE.jsonl`. The pane never writes the log.
 */
import type { EngineInterface } from 'claude-code'

import type { DecisionRow } from '../types'
import { answersOf, byUrgency, joinPath, lastSegment, parentFolder, unreadNotice, waitingDecisions } from './decisions'
import type { Settings } from './settings'

/** What reading and writing the registers use of the engine interface. */
export type RegisterDollar = Pick<EngineInterface, 'fs' | 'process' | 'env'>

/** What reading the registers uses of the engine interface: the clock tells how long reads have failed. */
export type ReadDollar = RegisterDollar & Pick<EngineInterface, 'clock'>

/** One register: the repo root it belongs to, its open file and its answers log. */
export type RegisterLocation = {
  readonly root: string
  readonly openPath: string
  readonly logPath: string
}

/** The register settings of the team's orchestration.config.json that the pane needs. */
type RegisterConfig = {
  readonly folder: string
  readonly openFile: string
  readonly answersLogFile: string
}

/** The settings when the team's config cannot be read, or lacks one. */
const DEFAULT_CONFIG: RegisterConfig = {
  folder: 'decisions',
  openFile: 'OPEN_DECISIONS_CLAUDE.md',
  answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
}

/** The settings file beside the team's scripts folder. */
const CONFIG_FILE = 'orchestration.config.json'

/** The stamp of a file that is not there. */
const MISSING = 'missing'

/**
 * The OS code of a size check that found nothing there. The engine rejects a missing path with `ENOENT` and any other
 * OS refusal with its own code.
 */
const NOT_THERE = /\bENOENT\b/

/** How long a register's reads fail in a row before the pane says that what it shows may be out of date. */
const STALE_AFTER_MS = 30_000

/** How long writing one answer may take before it is given up. */
const ANSWER_TIMEOUT_MS = 30_000

// ── Where ──

/**
 * Finds the register of a session: its own repo's, and no other. A register whose folder does not exist yet is
 * listed too: its open file is looked for on every read.
 *
 * @param $ the engine interface
 * @param cwd the folder the session started in
 * @param settings the mod's options (registerScript)
 * @returns the session repo's register, alone
 */
export async function findRegisters($: RegisterDollar, cwd: string, settings: Settings): Promise<RegisterLocation[]> {
  const config = await readConfig($, settings)
  const root = await repoRootOf($, cwd)
  const folder = joinPath(root, config.folder)

  return [{ root, openPath: joinPath(folder, config.openFile), logPath: joinPath(folder, config.answersLogFile) }]
}

/**
 * Reads the register settings of the team's orchestration.config.json, beside the scripts folder of register.mjs.
 *
 * @param $ the engine interface
 * @param settings the mod's options (registerScript)
 * @returns the folder and file names; the defaults when the file cannot be read, and for each name it lacks
 */
async function readConfig($: RegisterDollar, settings: Settings): Promise<RegisterConfig> {
  const path = await configPath($, settings)

  if (path === null) {
    return DEFAULT_CONFIG
  }

  try {
    const register = (JSON.parse(await $.fs.read(path)) as { register?: unknown }).register

    if (register === null || typeof register !== 'object') {
      return DEFAULT_CONFIG
    }

    const { folder, openFile, answersLogFile } = register as Record<string, unknown>

    return {
      folder: typeof folder === 'string' && folder !== '' ? folder : DEFAULT_CONFIG.folder,
      openFile: typeof openFile === 'string' && openFile !== '' ? openFile : DEFAULT_CONFIG.openFile,
      answersLogFile:
        typeof answersLogFile === 'string' && answersLogFile !== '' ? answersLogFile : DEFAULT_CONFIG.answersLogFile,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

/**
 * Gives where the team's orchestration.config.json is: beside the scripts folder of register.mjs.
 *
 * @param $ the engine interface
 * @param settings the mod's options (registerScript)
 * @returns the path; null when the script path has no folder two levels up
 */
export async function configPath($: Pick<EngineInterface, 'env'>, settings: Settings): Promise<string | null> {
  const skillFolder = parentFolder(parentFolder(await scriptPath($, settings)) ?? '')

  return skillFolder === null ? null : joinPath(skillFolder, CONFIG_FILE)
}

/**
 * Tells whether a refused file call found nothing there, rather than being refused for another reason.
 *
 * @param error what the call rejected with
 * @returns true for "not there" (`ENOENT`)
 */
export function isNotThere(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code

  return NOT_THERE.test(`${typeof code === 'string' ? code : ''} ${String(error)}`)
}

/**
 * Finds the repo root above a folder, as register.mjs does: the nearest folder holding `.git`.
 *
 * @param $ the engine interface
 * @param start the folder to start from
 * @returns the repo root; the folder itself when no repo holds it
 */
async function repoRootOf($: RegisterDollar, start: string): Promise<string> {
  for (let folder: string | null = start; folder !== null; folder = parentFolder(folder)) {
    if (await $.fs.exists(joinPath(folder, '.git')).catch(() => false)) {
      return folder
    }
  }

  return start
}

/**
 * Gives the register script's path, a leading `~` as the home folder.
 *
 * @param $ the engine interface
 * @param settings the mod's options (registerScript)
 * @returns the path
 */
export async function scriptPath($: Pick<EngineInterface, 'env'>, settings: Settings): Promise<string> {
  if (!/^~(?=[\\/]|$)/.test(settings.registerScript)) {
    return settings.registerScript
  }

  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '~'
  const rest = settings.registerScript.slice(1)

  return `${home}${home.includes('\\') ? rest.replace(/\//g, '\\') : rest}`
}

// ── Reading ──

/** A register as its last good read found it: the size and time of its open file and log, the entries, the notice. */
export type Snapshot = {
  readonly stamp: string
  readonly rows: readonly DecisionRow[]
  readonly logNotice: string
}

/** What a read of the registers found: the entries that wait, and which answers could not be read. */
export type WaitingRead = {
  readonly rows: DecisionRow[]
  /**
   * Since when a register could not be read, once its reads have failed for 30 seconds, and which lines of the answers
   * log could not be read, in a line for the person; empty when neither.
   */
  readonly logNotice: string
}

/**
 * Reads the entries that wait for the person in every register, each register's most urgent first, each with its
 * history from the open file and the register's own answers log. A register whose open file and log have kept their
 * size and time since the last read is not read again. A missing log holds no answers. A read that fails, or a size
 * check that fails other than as "not there", as when an agent rewrites the file at that moment, changes nothing: the
 * register keeps what its last good read found (nothing, when it has none), and the next call reads it again. Once a
 * register's reads have failed for 30 seconds in a row, its notice says so, until its next good read.
 *
 * @param $ the engine interface
 * @param registers the registers, from findRegisters
 * @param snapshots what each register held at its last good read, by open file path; updated in place
 * @param failingSince when each register's reads began to fail, by open file path, while they fail; updated in place
 * @returns the entries, register by register, and the notice of unreadable registers and log lines
 */
export async function readWaitingDecisions(
  $: ReadDollar,
  registers: readonly RegisterLocation[],
  snapshots: Map<string, Snapshot>,
  failingSince: Map<string, number>,
): Promise<WaitingRead> {
  const rows: DecisionRow[] = []
  const notices: string[] = []

  for (const register of registers) {
    const openStamp = await stampOf($, register.openPath)
    const logStamp = await stampOf($, register.logPath)
    let snapshot = snapshots.get(register.openPath)
    let isFailing = openStamp === null || logStamp === null

    if (openStamp !== null && logStamp !== null && snapshot?.stamp !== `${openStamp}|${logStamp}`) {
      const found = await readRegister($, register, openStamp, logStamp)

      if (found === null) {
        isFailing = true
      } else {
        snapshot = { stamp: `${openStamp}|${logStamp}`, ...found }
        snapshots.set(register.openPath, snapshot)
      }
    }

    const stale = await staleNotice($, register.openPath, isFailing, failingSince)

    if (stale !== '') {
      notices.push(stale)
    }

    if (snapshot === undefined) {
      continue
    }

    rows.push(...snapshot.rows)

    if (snapshot.logNotice !== '') {
      notices.push(snapshot.logNotice)
    }
  }

  return { rows, logNotice: notices.join(' ') }
}

/**
 * Reads one register's open file and answers log, as the stamps just taken found them.
 *
 * @param $ the engine interface
 * @param register the register
 * @param openStamp its open file's stamp, from stampOf
 * @param logStamp its answers log's stamp, from stampOf
 * @returns the entries and the log's notice; null when a file that is there could not be read, so nothing is remembered
 */
async function readRegister(
  $: RegisterDollar,
  register: RegisterLocation,
  openStamp: string,
  logStamp: string,
): Promise<Omit<Snapshot, 'stamp'> | null> {
  const text = await readFound($, register.openPath, openStamp)
  const logText = text === null ? null : await readFound($, register.logPath, logStamp)

  if (text === null || logText === null) {
    return null
  }

  const log = answersOf(logText)

  return {
    rows: byUrgency(waitingDecisions(text, register.root, log.answers)),
    logNotice: unreadNotice(log.unreadLines, register.logPath),
  }
}

/**
 * Reads a file as stampOf found it.
 *
 * @param $ the engine interface
 * @param path the file
 * @param stamp its stamp, from stampOf
 * @returns its text; empty when it is missing; null when it is there but the read failed
 */
async function readFound($: RegisterDollar, path: string, stamp: string): Promise<string | null> {
  if (stamp === MISSING) {
    return ''
  }

  return $.fs.read(path).catch(() => null)
}

/**
 * Gives what tells a file's versions apart: its time and size.
 *
 * @param $ the engine interface
 * @param path the file
 * @returns `<time>:<size>`; `missing` when it is not a file, or not there; null when it could not be checked
 */
async function stampOf($: RegisterDollar, path: string): Promise<string | null> {
  try {
    const stat = await $.fs.stat(path)

    return stat.kind === 'file' ? `${stat.mtimeMs}:${stat.size}` : MISSING
  } catch (error) {
    return isNotThere(error) ? MISSING : null
  }
}

/**
 * Keeps when a register's reads began to fail, and says so once they have failed for STALE_AFTER_MS in a row.
 *
 * @param $ the engine interface (its clock)
 * @param key the register's open file path
 * @param isFailing whether this read of the register failed
 * @param failingSince when each register's reads began to fail, while they fail; updated in place
 * @returns the notice for the person; empty when the read worked, or the reads have not failed that long
 */
async function staleNotice(
  $: Pick<EngineInterface, 'clock'>,
  key: string,
  isFailing: boolean,
  failingSince: Map<string, number>,
): Promise<string> {
  if (!isFailing) {
    failingSince.delete(key)

    return ''
  }

  const now = await $.clock.now()
  const since = failingSince.get(key) ?? now

  failingSince.set(key, since)

  return now - since < STALE_AFTER_MS
    ? ''
    : `The decisions register could not be read since ${clockTime(since)}; the pane shows what it held before and keeps trying.`
}

/**
 * Writes a time of the engine's clock as the person's clock shows it.
 *
 * @param ms milliseconds since the epoch
 * @returns `HH:MM:SS`, local time
 */
function clockTime(ms: number): string {
  const time = new Date(ms)

  return [time.getHours(), time.getMinutes(), time.getSeconds()].map(part => String(part).padStart(2, '0')).join(':')
}

// ── Writing ──

/**
 * Records the person's answer with `register.mjs answer`: the entry's status becomes waiting-for-agent and the words
 * go to the answers log as one record of its id. Nothing else in the register changes.
 *
 * @param $ the engine interface
 * @param row the entry
 * @param answer the person's words
 * @param settings the mod's options (registerScript, nodePath)
 * @returns null once written; else why not, in a line
 */
export async function recordAnswer(
  $: RegisterDollar,
  row: DecisionRow,
  answer: string,
  settings: Settings,
): Promise<string | null> {
  const script = await scriptPath($, settings)
  const argv = [settings.nodePath, script, 'answer', '--root', row.root, '--id', row.id, '--answer', answer]

  try {
    const ran = await $.process.run(argv, { cwd: row.root, timeoutMs: ANSWER_TIMEOUT_MS })

    if (ran.exitCode === 0) {
      return null
    }

    const said = ran.stderr.trim().replace(/^register:\s*/, '') || ran.stdout.trim()

    return `Not saved: ${said || `register.mjs ended with exit code ${ran.exitCode}`}`
  } catch (error) {
    return `Not saved: ${lastSegment(script)} could not run (${error instanceof Error ? error.message : String(error)})`
  }
}
