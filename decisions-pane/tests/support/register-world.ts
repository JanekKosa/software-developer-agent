/**
 * Test support: stands in for everything beneath the mod (the files, the home folder, register.mjs, the clock, the
 * command list and the panes), starts a session in a repo, writes register entries as register.mjs lays them out,
 * and reads the pane back.
 */
import type { On, RenderSurface } from 'claude-code'
import { mock } from 'claude-code/testing'
import type { ElementQuery, Engine, FoundElement, MockClock } from 'claude-code/testing'

/** What reading a drawing needs, on any surface. */
type Readable = { readonly findAll: (query: ElementQuery) => Promise<FoundElement[]> }

/** The repo the tests' session runs in, its register's open file and its answers log. */
export const REPO = 'C:\\work\\shop'
export const OPEN_FILE = `${REPO}\\decisions\\OPEN_DECISIONS_CLAUDE.md`
export const LOG_FILE = `${REPO}\\decisions\\ANSWERS_LOG_CLAUDE.jsonl`

/** The agent team's repo, whose register the team's settings show in every chat; the pane never lists it. */
export const TEAM_REPO = 'C:\\Repos\\team'
export const TEAM_OPEN_FILE = `${TEAM_REPO}\\decisions\\OPEN_DECISIONS_CLAUDE.md`
export const TEAM_LOG_FILE = `${TEAM_REPO}\\decisions\\ANSWERS_LOG_CLAUDE.jsonl`

/** The time the stand-in for `register.mjs answer` records an answer at. */
export const ANSWER_TIME = '2026-10-26 11:30'

/** Where the mod finds register.mjs and its settings, from the default `~/.claude/skills/...` under this home. */
export const HOME = 'C:\\Users\\me'
export const SCRIPT = `${HOME}\\.claude\\skills\\orchestrate-agents\\scripts\\register.mjs`
export const CONFIG = `${HOME}\\.claude\\skills\\orchestrate-agents\\orchestration.config.json`

/**
 * The agent team's switch: the session's id, the root of the team's own files as its settings write it
 * (`teamState.folder`) and as filled in from USERPROFILE, the switch folder under it (`agentTeam.onFolder`), and the
 * marker `/software-developer-agent` writes there. A started session has the marker unless a test takes it away.
 */
export const SESSION_ID = '0f6c1d2e-3a4b-4c5d-8e9f-a0b1c2d3e4f5'
export const STATE_FOLDER_SETTING = '%USERPROFILE%\\.claude\\state\\software-developer-agent'
export const STATE_ROOT = `${HOME}\\.claude\\state\\software-developer-agent`
export const ON_FOLDER = 'team-on'
export const MARKER = `${STATE_ROOT}\\${ON_FOLDER}\\${SESSION_ID}`

/** The temp folder (TEMP and TMP), and where the marker lay under it before the team kept its files in one root. */
export const TEMP_FOLDER = `${HOME}\\AppData\\Local\\Temp`
export const OLD_MARKER = `${TEMP_FOLDER}\\claude-agent-team-on\\${SESSION_ID}`

/** The open file's header, as register.mjs writes it. */
const HEADER = '# Open decisions\r\n\r\nQuestions, initiatives and issues not yet closed, newest last.'

/** The pane's id and the props the engine draws it with. */
const PANE_ID = 'decisions-pane'
const PANE_PROPS = {
  title: 'Decisions',
  isFocused: false,
  bodyColumns: 80,
  placement: 'inline',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

/** A started session's stand-ins and what they saw. */
export type World = {
  readonly clock: MockClock
  /** The files on disk, by path; a test edits them as an agent would. */
  readonly files: Map<string, string>
  /** The panes the engine holds open, by id, with their titles. */
  readonly openPanes: Map<string, string>
  /** Every open and close asked, in order: `open decisions-pane "Decisions (1)"`, `close decisions-pane by plugin`. */
  readonly log: string[]
  /** Each register.mjs run's arguments after the script. */
  readonly runs: string[][]
  /** Each run's program and script: its first two arguments. */
  readonly programs: string[][]
  /** Every path the mod read, in order, a failed read included. */
  readonly reads: string[]
  /** Every path the mod asked the file system about (exists, size and time, read), in order, failed asks included. */
  readonly accesses: string[]
  /** The environment variables the mod sees, by name; a test edits them. One not listed is unset. */
  readonly env: Map<string, string>
  /** What `$.session.id()` answers; a test sets another, a wrong one included. */
  sessionId: unknown
  /** How many of the next `$.session.id()` calls fail; each failed call counts one down. */
  failSessionIds: number
  /**
   * How many of the next reads of a path fail although the file is there, as when an agent rewrites it at that moment;
   * each failed read counts one down.
   */
  readonly failReads: Map<string, number>
  /**
   * How many of the next size-and-time checks of a path fail although the file is there, with an OS refusal that is
   * not "not found"; each failed check counts one down.
   */
  readonly failStats: Map<string, number>
  /** What register.mjs answers next: exit code 0 records the answer as it does, any other fails with `stderr`. */
  failNext: { exitCode: number; stderr: string } | null
}

/** One entry as a test describes it; the rest is filled in. */
export type EntrySpec = {
  readonly id: string
  readonly kind?: 'question' | 'initiative' | 'issue'
  readonly blocking?: boolean
  readonly status?: 'waiting-for-user' | 'waiting-for-agent'
  readonly urgency?: 'high' | 'medium' | 'low'
  readonly what?: string
  readonly options?: string
  readonly recommendation?: string
  readonly extra?: readonly string[]
}

// ── The register files ──

/**
 * Lays out an entry as register.mjs writes it.
 *
 * @param spec the entry
 * @returns its lines, joined
 */
export function entry(spec: EntrySpec): string {
  return [
    `## ${spec.id} · ${spec.kind ?? 'question'} · ${spec.blocking === false ? 'not-blocking' : 'blocking'}`,
    `- Status: ${spec.status ?? 'waiting-for-user'}`,
    `- Urgency: ${spec.urgency ?? 'high'}`,
    '- Raised: 2026-10-26 09:14 by lead invoice-import (worker run 3)',
    '- Task: Invoice import',
    `- What: ${spec.what ?? 'Should a rejected invoice be retried?'}`,
    '- Example: Invoice 1001 for 250.00 PLN was rejected at 10:02 because the tax service timed out.',
    `- Options: ${spec.options ?? 'A: retry once after 5 minutes (1 hour of work). B: leave it for you to resend (none).'}`,
    `- Recommendation: ${spec.recommendation ?? 'A, because 9 of the last 10 rejections were timeouts.'}`,
    '- Meanwhile: Rejected invoices wait in the error list.',
    '- Evidence: temp\\import\\run3.log',
    ...(spec.extra ?? []),
  ].join('\r\n')
}

/**
 * Writes an open file holding these entries.
 *
 * @param world the stand-ins
 * @param entries the entries, in file order
 * @param path the open file; the session repo's by default
 */
export function writeOpen(world: World, entries: readonly EntrySpec[], path = OPEN_FILE): void {
  world.files.set(path, [HEADER, ...entries.map(entry)].join('\r\n\r\n'))
}

/**
 * Lays out a Follow up block as register.mjs writes it: the first line after the field's name and time, each further
 * line after two spaces, and an empty line as a line of exactly two spaces.
 *
 * @param at the time, `YYYY-MM-DD HH:MM`
 * @param text the agent's text, its lines split at `\n`
 * @returns the block's lines, for an entry's `extra`
 * @example
 * followUpLines('2026-10-26 10:20', 'first\n\nsecond') // ['- Follow up: 2026-10-26 10:20: first', '  ', '  second']
 */
export function followUpLines(at: string, text: string): string[] {
  const [first, ...rest] = text.split('\n')

  return [`- Follow up: ${at}: ${first ?? ''}`, ...rest.map(line => `  ${line}`)]
}

/**
 * Writes one answer as a line of the answers log, as register.mjs writes it.
 *
 * @param id the entry's id
 * @param answeredAt the time, `YYYY-MM-DD HH:MM`
 * @param answer the person's words, exactly as given
 * @returns the JSON line, without its line break
 */
export function logRecord(id: string, answeredAt: string, answer: string): string {
  return JSON.stringify({ id, answeredAt, answer, handedOverAt: null, processedAt: null })
}

/**
 * Writes an answers log holding these lines, each ended by a line break.
 *
 * @param world the stand-ins
 * @param lines the log's lines, as logRecord gives them or broken on purpose
 * @param path the log; the session repo's by default
 */
export function writeLog(world: World, lines: readonly string[], path = LOG_FILE): void {
  world.files.set(path, lines.map(line => `${line}\n`).join(''))
}

// ── The team's settings and switch ──

/**
 * Lays out the team's orchestration.config.json with these register settings, the root of the team's own files and
 * the switch's folder under it, as the team ships them.
 *
 * @param register the `register` settings
 * @returns the file's text
 */
export function teamConfig(register: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({ teamState: { folder: STATE_FOLDER_SETTING }, register, agentTeam: { onFolder: ON_FOLDER } })
}

/**
 * Takes the session's marker away, as in a chat the person never switched the team on for.
 *
 * @param world the stand-ins
 */
export function switchOff(world: World): void {
  world.files.delete(MARKER)
}

/**
 * Writes the session's marker, as `/software-developer-agent` does.
 *
 * @param world the stand-ins
 */
export function switchOn(world: World): void {
  world.files.set(MARKER, '2026-10-27T08:00:00.000Z')
}

/**
 * Runs the /decisions-pane command as the person does.
 *
 * @param $ the test's engine
 * @returns the command's answer
 */
export async function runCommand($: Engine) {
  return $.command.run({
    command: 'decisions-pane',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
}

// ── Starting a session ──

/**
 * Starts a session in REPO with every stand-in in place: the repo's `.git`, the team's settings, the session's marker
 * (the team switched on; `switchOff` in `before` starts it off), and whatever the test wrote before.
 *
 * @param $ the test's engine
 * @param on the test's registrar, beneath the mod
 * @param before writes files before the session starts
 * @returns the stand-ins
 */
export async function startWorld($: Engine, on: On, before?: (world: World) => void): Promise<World> {
  const world: World = {
    clock: mock.clock(on, { now: 1_000_000 }),
    files: new Map([
      [`${REPO}\\.git`, ''],
      [`${TEAM_REPO}\\.git`, ''],
      [CONFIG, teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', showInEveryChat: [] })],
      [MARKER, '2026-10-27T08:00:00.000Z'],
    ]),
    openPanes: new Map(),
    log: [],
    runs: [],
    programs: [],
    reads: [],
    accesses: [],
    env: new Map([
      ['USERPROFILE', HOME],
      ['TEMP', TEMP_FOLDER],
      ['TMP', TEMP_FOLDER],
      ['SystemRoot', 'C:\\Windows'],
      ['windir', 'C:\\Windows'],
    ]),
    sessionId: SESSION_ID,
    failSessionIds: 0,
    failReads: new Map(),
    failStats: new Map(),
    failNext: null,
  }
  const versions = new Map<string, number>()
  const versionOf = (path: string, text: string) => {
    const key = `${path}|${text}`

    if (!versions.has(key)) {
      versions.set(key, versions.size + 1)
    }

    return versions.get(key) ?? 0
  }

  before?.(world)

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'decisions-pane' } }))
  on('env.get', (_, e) => ({ value: world.env.get(e.name) }))
  on('session.id', () => {
    if (world.failSessionIds > 0) {
      world.failSessionIds -= 1

      return { deny: 'the session id could not be read' }
    }

    return { value: world.sessionId as string }
  })
  on('fs.exists', (_, e) => {
    world.accesses.push(e.path)

    return { value: [...world.files.keys()].some(path => path === e.path || path.startsWith(`${e.path}\\`)) }
  })
  on('fs.stat', (_, e) => {
    const text = world.files.get(e.path)
    const failures = world.failStats.get(e.path) ?? 0

    world.accesses.push(e.path)

    if (text !== undefined && failures > 0) {
      world.failStats.set(e.path, failures - 1)

      return { deny: `EPERM: operation not permitted, stat '${e.path}'` }
    }

    return text === undefined
      ? { deny: `ENOENT: ${e.path}` }
      : { value: { kind: 'file' as const, size: text.length, mtimeMs: versionOf(e.path, text), isLink: false } }
  })
  on('fs.read', (_, e) => {
    const text = world.files.get(e.path)
    const failures = world.failReads.get(e.path) ?? 0

    world.reads.push(e.path)
    world.accesses.push(e.path)

    if (text !== undefined && failures > 0) {
      world.failReads.set(e.path, failures - 1)

      return { deny: `EBUSY: resource busy or locked, open '${e.path}'` }
    }

    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('process.run', (_, e) => {
    const args = e.argv.slice(2)

    world.runs.push(args)
    world.programs.push(e.argv.slice(0, 2))

    if (world.failNext !== null) {
      const failed = world.failNext

      world.failNext = null

      return { value: { exitCode: failed.exitCode, stdout: '', stderr: failed.stderr, isStdoutTruncated: false, isStderrTruncated: false } }
    }

    recordAnswerAsRegisterDoes(world, args)

    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.open', (_, e) => {
    world.openPanes.set(e.id, e.title ?? e.id)
    world.log.push(`open ${e.id} "${e.title ?? ''}"`)

    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    world.openPanes.delete(e.id)
    world.log.push(`close ${e.id} by ${e.origin.kind}`)

    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: [...world.openPanes].map(([id, title]) => ({ id, title, isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  await $.session.start({ cwd: REPO, surface: 'vscode', isInteractive: true })

  return world
}

/**
 * Does what `register.mjs answer --root R --id D --answer W` does: the entry's status in the open file becomes
 * waiting-for-agent, and one record of the words, at ANSWER_TIME, is added to the answers log. No answered file.
 *
 * @param world the stand-ins
 * @param args the arguments after the script
 */
function recordAnswerAsRegisterDoes(world: World, args: readonly string[]): void {
  const root = args[args.indexOf('--root') + 1]
  const id = args[args.indexOf('--id') + 1]
  const answer = answerOf(args)
  const path = `${root}\\decisions\\OPEN_DECISIONS_CLAUDE.md`
  const logPath = `${root}\\decisions\\ANSWERS_LOG_CLAUDE.jsonl`
  const text = world.files.get(path)

  if (text === undefined || id === undefined || answer === undefined) {
    return
  }

  const blocks = text.split('\r\n\r\n').map(block =>
    block.startsWith(`## ${id} `) ? block.replace('- Status: waiting-for-user', '- Status: waiting-for-agent') : block,
  )

  world.files.set(path, blocks.join('\r\n\r\n'))
  world.files.set(logPath, `${world.files.get(logPath) ?? ''}${logRecord(id, ANSWER_TIME, answer)}\n`)
}

/**
 * Lets one poll of the registers run.
 *
 * @param world the stand-ins
 * @returns once read
 */
export async function poll(world: World): Promise<void> {
  await world.clock.advance(2_000)
}

/**
 * Lets polls run until a time.
 *
 * @param world the stand-ins
 * @param ms the engine time to poll up to, in milliseconds
 * @returns once read at that time
 */
export async function pollUntil(world: World, ms: number): Promise<void> {
  while (world.clock.now() < ms) {
    await poll(world)
  }
}

/**
 * The line the pane shows once a register's reads have failed for 30 seconds in a row, worked out apart from the
 * mod's own code.
 *
 * @param since the engine time of the first failed read, in milliseconds
 * @returns the line
 */
export function staleNotice(since: number): string {
  const time = new Date(since).toTimeString().slice(0, 8)

  return `The decisions register could not be read since ${time}; the pane shows what it held before and keeps trying.`
}

// ── The pane ──

/**
 * Draws the pane on a surface.
 *
 * @param $ the test's engine
 * @param surface where it is drawn
 * @returns the drawing
 */
export function mountPane<P extends RenderSurface = 'vscode'>($: Engine, surface: P = 'vscode' as P) {
  return $.ui.mount({ plugin: 'decisions-pane', surface, component: 'Pane', requestId: PANE_ID, props: PANE_PROPS })
}

/**
 * Draws the pane once and reads it as the person reads it, line by line.
 *
 * @param $ the test's engine
 * @returns the lines
 */
export async function linesShown($: Engine): Promise<string[]> {
  const ui = await mountPane($)
  const lines = await drawnLines(ui)

  await ui.unmount()

  return lines
}

/**
 * Reads the pane's notices: the lines that say something could not be read.
 *
 * @param $ the test's engine
 * @returns the lines
 */
export async function noticesShown($: Engine): Promise<string[]> {
  return (await linesShown($)).filter(line => line.includes('could not be read'))
}

/**
 * Reads the labels of the pane's buttons, top to bottom.
 *
 * @param ui the drawing
 * @returns each Button's label
 */
export async function buttonLabels(ui: Readable): Promise<string[]> {
  return (await ui.findAll({ type: 'Button' })).map(button => String(button.props.label))
}

/**
 * Reads the options of the pane's pick lists, top to bottom: each picking button's mark, then the words beside it.
 *
 * @param ui the drawing
 * @returns each option as drawn, such as `○ B: leave it for you to resend (none).` or `◉ B: ...` when picked
 */
export async function choiceTexts(ui: Readable): Promise<string[]> {
  const options = await choiceElements(ui)

  return options.map(({ mark, words }) => `${String(mark.props.label)} ${words?.text ?? ''}`)
}

/**
 * Reads how the words of one option are drawn.
 *
 * @param ui the drawing
 * @param uid the entry's uid
 * @param value the option's value, or `other`
 * @returns its Text's wrap and dimColor props
 */
export async function choiceStyle(ui: Readable, uid: string, value: string): Promise<{ wrap: unknown; dimColor: unknown }> {
  const words = (await choiceElements(ui)).find(({ mark }) => mark.key === `pick:${uid}:${value}`)?.words

  return { wrap: words?.props.wrap, dimColor: words?.props.dimColor }
}

/**
 * Pairs each picking button with the Text drawn next after it: the option's words. A Text's key is not kept in the
 * drawing, so the words are found by document order.
 *
 * @param ui the drawing
 * @returns each option's mark and words, top to bottom
 */
async function choiceElements(ui: Readable): Promise<{ mark: FoundElement; words: FoundElement | undefined }[]> {
  const all = (await ui.findAll({})).filter(one => one.type === 'Button' || one.type === 'Text')

  return all.flatMap((one, index) =>
    one.type === 'Button' && one.key?.startsWith('pick:') === true
      ? [{ mark: one, words: all.slice(index + 1).find(next => next.type === 'Text') }]
      : [],
  )
}

/**
 * Gives the press target of one option of an entry.
 *
 * @param uid the entry's uid
 * @param value the option's value, or `other`
 * @returns the option button's key
 */
export function choice(uid: string, value: string): { key: string } {
  return { key: `pick:${uid}:${value}` }
}

/**
 * Reads the whole pane as one string, each Text's words in order.
 *
 * @param ui the drawing
 * @returns the text
 */
export async function paneText(ui: Readable): Promise<string> {
  return (await ui.findAll({ type: 'Text' })).map(text => text.text).join('\n')
}

/** An element as a drawing's `children` describe it. */
type Described = {
  readonly type?: unknown
  readonly props?: Readonly<Record<string, unknown>>
  readonly children?: readonly unknown[]
}

/**
 * Reads the pane as the person reads it, line by line: each outermost Text is one line (the Texts inside it are part
 * of it), a Box's margin of a line or more above or below is an empty line there, and a Button is `[label]`.
 *
 * @param ui the drawing
 * @returns the lines, top to bottom
 */
export async function drawnLines(ui: Readable): Promise<string[]> {
  const [root] = await ui.findAll({})
  const lines: string[] = []

  linesOf(root, lines)

  return lines
}

/**
 * Adds the lines one element draws.
 *
 * @param node the element, as the drawing describes it
 * @param lines the lines so far; added to in place
 */
function linesOf(node: unknown, lines: string[]): void {
  if (typeof node !== 'object' || node === null) {
    return
  }

  const { type, props = {}, children = [] } = node as Described

  if (type === 'Text') {
    lines.push(textOf(children))

    return
  }

  if (type === 'Button') {
    lines.push(`[${String(props.label)}]`)

    return
  }

  if (Number(props.marginTop ?? props.marginY ?? 0) >= 1) {
    lines.push('')
  }

  children.forEach(child => linesOf(child, lines))

  if (Number(props.marginBottom ?? props.marginY ?? 0) >= 1) {
    lines.push('')
  }
}

/**
 * Gives the words of a Text and of the Texts inside it.
 *
 * @param children the Text's children, as the drawing describes them
 * @returns the words, joined
 */
function textOf(children: readonly unknown[]): string {
  return children
    .map(child =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : typeof child === 'object' && child !== null
          ? textOf((child as Described).children ?? [])
          : '',
    )
    .join('')
}

/**
 * Gives the lines that follow one line of the pane.
 *
 * @param lines the pane's lines, from drawnLines
 * @param first the line to start at, included
 * @param count how many lines to give
 * @returns those lines; empty when the first is not drawn
 */
export function linesFrom(lines: readonly string[], first: string, count: number): string[] {
  const at = lines.indexOf(first)

  return at < 0 ? [] : lines.slice(at, at + count)
}

/**
 * Gives the answer words of one register.mjs run.
 *
 * @param args the run's arguments after the script
 * @returns the value after --answer
 */
export function answerOf(args: readonly string[]): string | undefined {
  return args[args.indexOf('--answer') + 1]
}
