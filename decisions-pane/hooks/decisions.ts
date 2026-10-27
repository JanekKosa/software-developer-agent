/**
 * Reading a decision register's open file into the rows the pane draws, and writing the person's answer as words: no
 * `$` here, only text in and text out.
 *
 * The open file is written by the agent team's register.mjs: a heading `## D-12 · question · blocking` per entry,
 * then one `- Field: value` line per field. Only entries whose Status is waiting-for-user are the person's to answer;
 * an entry without a Status line (an older register) waits for the person too, as register.mjs reads it. An agent that
 * sends an entry back adds a Follow up block: `- Follow up: 2026-10-26 10:20: first line`, then each further line of
 * its text after two spaces, an empty line as a line of exactly two spaces. Any other field may be written in points:
 * its first point on the field's line, each further point on a line of its own as two spaces, `- `, the point
 * (`  - The pane draws each field as one line.`); Options then has nothing after its colon and one point per option.
 * The person's answers are not in the entry: they are the lines of the answers log beside the open file, one JSON
 * record per answer (`{"id":"D-20","answeredAt":"2026-10-26 10:05","answer":"A, retry once",...}`).
 */
import type { DecisionKind, DecisionOption, DecisionRow, HistoryItem, Urgency } from '../types'

/** The status of an entry that waits for the person. */
const WAITING_FOR_USER = 'waiting-for-user'

/** The field of a Follow up block, and the two fields an older register wrote in the entry instead of a log. */
const FOLLOW_UP = 'Follow up'
const ANSWERED = 'Answered'
const STILL_OPEN = 'Still open'

/** What starts each further line of a Follow up block; the rest of the line is the text's next line. */
const CONTINUATION = '  '

/**
 * What starts a further point of any other field: exactly two spaces, then `- ` (a third space fails at the dash).
 * The rest of the line is the point.
 */
const POINT = '  - '

/** What joins a field's points in its value, first point first. */
const POINT_BREAK = '\n'

/** A Follow up block's first line after the field's name: its time, then the text's first line as written. */
const STAMPED = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}): ?(.*)$/

/** An id as register.mjs writes it, so a log record's id is read without leading zeros like a heading's. */
const DECISION_ID = /^D-\d+(?:-\d+)*$/

/** How many unreadable log lines the notice names; it counts the rest, so a wholly broken log stays one line. */
const NAMED_LINES = 5

/** An entry's heading: its id, then the kind and the blocking flag after middle dots. */
const HEADING = /^## (D-\d+(?:-\d+)*)(?![\d-])(.*)$/

/** A field line: `- Name: value`. */
const FIELD = /^- ([A-Za-z][A-Za-z ]*?):\s?(.*)$/

/** Where a lettered option starts: at the start of the line, or after the end of the option before it. */
const OPTION_START = /(^|[.!?)]\s+)([A-Z]|[1-9]\d?)[:)]\s+/g

/** The letter or number that starts an option given as a point, as a lettered option starts on a line. */
const POINT_LETTER = /^([A-Z]|[1-9]\d?)[:)]\s+/

/** The pick that stands for the person's own answer. */
export const OTHER = 'other'

/** What a submit with nothing picked and nothing typed writes. */
export const AGREED = 'Agreed with the recommendation, no comments.'

const KINDS: readonly DecisionKind[] = ['question', 'initiative', 'issue']
const URGENCIES: readonly Urgency[] = ['high', 'medium', 'low']

// ── Reading ──

/**
 * Reads an open file's entries that wait for the person, each with its history.
 *
 * @param text the open file's text
 * @param root the repo root whose register it is
 * @param answers the answers of the same register's log, in log order
 * @returns one row per waiting entry, in file order
 * @example
 * waitingDecisions('## D-12 · question · blocking\n- Status: waiting-for-user\n- What: Retry?', 'C:\\Repos\\x')
 * // [{ id: 'D-12', kind: 'question', isBlocking: true, what: 'Retry?', ... }]
 */
export function waitingDecisions(text: string, root: string, answers: readonly LogAnswer[] = []): DecisionRow[] {
  return entriesOf(text)
    .filter(entry => (fieldOf(entry.fields, 'Status') || WAITING_FOR_USER) === WAITING_FOR_USER)
    .map(entry => rowOf(entry, root, answers))
}

/** One answer of the answers log: the entry's id, when it was given, and the person's words exactly as stored. */
export type LogAnswer = {
  readonly id: string
  readonly answeredAt: string
  readonly answer: string
}

/** What an answers log holds: its answers in log order, and the numbers of the lines that could not be read. */
export type AnswersLog = {
  readonly answers: readonly LogAnswer[]
  readonly unreadLines: readonly number[]
}

/**
 * Reads an answers log. A line that is not JSON, or lacks the id, the time or the words, is left out and its number
 * kept; an empty line is no answer.
 *
 * @param text the log's text
 * @returns its answers and its unreadable lines (1 for the first line)
 * @example
 * answersOf('{"id":"D-20","answeredAt":"2026-10-26 10:05","answer":"A"}\nnot json\n')
 * // { answers: [{ id: 'D-20', answeredAt: '2026-10-26 10:05', answer: 'A' }], unreadLines: [2] }
 */
export function answersOf(text: string): AnswersLog {
  const answers: LogAnswer[] = []
  const unreadLines: number[] = []

  text.split(/\r\n|\n|\r/).forEach((line, index) => {
    if (line.trim() === '') {
      return
    }

    const answer = logAnswerOf(line)

    if (answer === null) {
      unreadLines.push(index + 1)
    } else {
      answers.push(answer)
    }
  })

  return { answers, unreadLines }
}

/**
 * Reads one line of the answers log.
 *
 * @param line the line
 * @returns the answer; null when the line is not JSON or lacks the id, the time or the words
 */
function logAnswerOf(line: string): LogAnswer | null {
  let record: unknown

  try {
    record = JSON.parse(line)
  } catch {
    return null
  }

  if (record === null || typeof record !== 'object') {
    return null
  }

  const { id, answeredAt, answer } = record as Record<string, unknown>

  if (typeof id !== 'string' || id === '' || typeof answeredAt !== 'string' || answeredAt === '' || typeof answer !== 'string') {
    return null
  }

  return { id: DECISION_ID.test(id) ? canonicalId(id) : id, answeredAt, answer }
}

/**
 * Says, in a line for the person, which lines of the answers log could not be read.
 *
 * @param lines the unreadable lines' numbers
 * @param path the log's path
 * @returns the notice; empty when there are none
 * @example
 * unreadNotice([2, 3], 'C:\\r\\decisions\\ANSWERS_LOG_CLAUDE.jsonl')
 * // '2 answers in the answers log could not be read and are not shown: lines 2 and 3 of C:\r\decisions\...jsonl.'
 */
export function unreadNotice(lines: readonly number[], path: string): string {
  if (lines.length === 0) {
    return ''
  }

  if (lines.length === 1) {
    return `An answer in the answers log could not be read and is not shown: line ${lines[0]} of ${path}.`
  }

  const named = lines.slice(0, NAMED_LINES).map(String)
  const more = lines.length - named.length
  const list = more > 0 ? `${named.join(', ')} and ${more} more` : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`

  return `${lines.length} answers in the answers log could not be read and are not shown: lines ${list} of ${path}.`
}

/** One entry as read: its heading's parts, its fields in order, and its place in the file. */
type Entry = {
  readonly id: string
  readonly flags: readonly string[]
  readonly fields: readonly (readonly [string, string])[]
  readonly order: number
}

/**
 * Splits a file into its entries. A line that is neither a heading nor a field continues the field above it, joined
 * with a space; in a Follow up block it is the text's next line instead, its line break kept: a line that starts with
 * two spaces gives the rest of it (so `  - Options: C` is text, never a field), and a line of exactly two spaces gives
 * an empty line. Under any other field a line that starts with exactly two spaces and `- ` is a further point: the
 * value holds its points joined with `\n`, and a point under a field line with nothing after its colon is the value's
 * first. A point line with no words adds no point; a line after a point continues that point.
 *
 * @param text the file's text
 * @returns the entries, in file order
 * @example
 * entriesOf('## D-1\n- What: One.\n  - Two.\n    runs on.')[0].fields // [['What', 'One.\nTwo. runs on.']]
 */
function entriesOf(text: string): Entry[] {
  const entries: { id: string; flags: string[]; fields: [string, string][]; order: number }[] = []

  for (const line of text.split(/\r\n|\n|\r/)) {
    const heading = HEADING.exec(line)
    const current = entries[entries.length - 1]
    const last = current?.fields[current.fields.length - 1]

    if (heading !== null) {
      const flags = (heading[2] ?? '').split('·').map(part => part.trim()).filter(part => part !== '')

      entries.push({ id: canonicalId(heading[1] ?? ''), flags, fields: [], order: entries.length })
    } else if (last?.[0] === FOLLOW_UP && line.startsWith(CONTINUATION)) {
      last[1] = `${last[1]}\n${line.slice(CONTINUATION.length)}`
    } else if (last && line.startsWith(POINT)) {
      const point = line.slice(POINT.length).trim()

      if (point !== '') {
        last[1] = last[1] === '' ? point : `${last[1]}${POINT_BREAK}${point}`
      }
    } else if (current && line.trim() !== '') {
      const field = FIELD.exec(line)

      if (field) {
        const name = field[1] ?? ''
        const value = field[2] ?? ''

        current.fields.push([name, name === FOLLOW_UP ? value : value.trim()])
      } else if (last) {
        last[1] = last[0] === FOLLOW_UP ? `${last[1]}\n${line.trim()}` : `${last[1]} ${line.trim()}`.trim()
      }
    }
  }

  return entries
}

/**
 * Makes the pane's row of an entry.
 *
 * @param entry the entry as read
 * @param root the repo root whose register it is
 * @param answers the answers of the register's log, every id's
 * @returns the row
 */
function rowOf(entry: Entry, root: string, answers: readonly LogAnswer[]): DecisionRow {
  const kind = KINDS.find(one => one === entry.flags[0]) ?? null
  const urgency = URGENCIES.find(one => one === fieldOf(entry.fields, 'Urgency').toLowerCase()) ?? null
  const optionsText = fieldOf(entry.fields, 'Options')
  const recommendation = fieldOf(entry.fields, 'Recommendation')

  return {
    uid: `${root}::${entry.id}`,
    root,
    id: entry.id,
    parentId: parentOf(entry.id),
    kind,
    isBlocking: entry.flags[1] === 'blocking',
    urgency,
    raised: fieldOf(entry.fields, 'Raised'),
    task: fieldOf(entry.fields, 'Task'),
    what: fieldOf(entry.fields, 'What'),
    example: fieldOf(entry.fields, 'Example'),
    optionsText,
    options: optionsOf(optionsText, recommendation),
    recommendation,
    meanwhile: fieldOf(entry.fields, 'Meanwhile'),
    evidence: fieldOf(entry.fields, 'Evidence'),
    history: historyOf(entry, answers),
    order: entry.order,
  }
}

// ── History ──

/**
 * Gives an entry's earlier rounds: an older register's `Answered:` and `Still open:` lines first, in file order (a
 * Still open line is a follow-up by its older name); then the entry's answers in the log and its Follow up blocks, in
 * time order. An answer and a follow-up of the same minute: the answer first, as the follow-up answers it. Answers of
 * one time keep the log's order, follow-ups the file's.
 *
 * @param entry the entry as read
 * @param answers the answers of the register's log, every id's
 * @returns the history, oldest first
 */
function historyOf(entry: Entry, answers: readonly LogAnswer[]): HistoryItem[] {
  const older: HistoryItem[] = entry.fields.flatMap(([name, text]) =>
    name === ANSWERED || name === STILL_OPEN
      ? [{ label: name === ANSWERED ? 'Answered' : 'Follow up', at: '', text } as const]
      : [],
  )
  const logged: HistoryItem[] = answers
    .filter(answer => answer.id === entry.id)
    .map(answer => ({ label: 'Answered', at: answer.answeredAt, text: answer.answer }))
  const followUps: HistoryItem[] = entry.fields.flatMap(([name, value]) => (name === FOLLOW_UP ? [followUpOf(value)] : []))
  const rank = (item: HistoryItem) => (item.label === 'Answered' ? 0 : 1)

  return [
    ...older,
    ...[...logged, ...followUps].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : rank(a) - rank(b))),
  ]
}

/**
 * Reads a Follow up block: the time at the start of its first line, and its text.
 *
 * @param value the block as read: the first line after the field's name, then each further line after a `\n`
 * @returns the follow-up; its time empty when the first line starts with none
 * @example
 * followUpOf('2026-10-26 10:20: first\n\nsecond') // { label: 'Follow up', at: '2026-10-26 10:20', text: 'first\n\nsecond' }
 */
function followUpOf(value: string): HistoryItem {
  const cut = value.indexOf('\n')
  const first = cut < 0 ? value : value.slice(0, cut)
  const rest = cut < 0 ? '' : value.slice(cut)
  const stamped = STAMPED.exec(first)

  return stamped === null
    ? { label: 'Follow up', at: '', text: value }
    : { label: 'Follow up', at: stamped[1] ?? '', text: `${stamped[2] ?? ''}${rest}` }
}

/**
 * Gives a field's points, as the entry wrote them: a value without points is one point.
 *
 * @param value a field's value, its points joined with `\n`
 * @returns its points, first point first
 * @example
 * pointsOf('A, because it is cheap.\nIt also logs.') // ['A, because it is cheap.', 'It also logs.']
 */
export function pointsOf(value: string): string[] {
  return value.split(POINT_BREAK)
}

/**
 * Gives a field's first value.
 *
 * @param fields the entry's fields
 * @param name the field's name, such as `What`
 * @returns its value; empty when the entry has none
 */
function fieldOf(fields: readonly (readonly [string, string])[], name: string): string {
  return fields.find(([one]) => one === name)?.[1] ?? ''
}

/**
 * Gives an id in its one written form, as register.mjs does: D-0007 is D-7, D-02-05 is D-2-5.
 *
 * @param id an id as a heading writes it
 * @returns the id without leading zeros
 */
export function canonicalId(id: string): string {
  return `D-${id.slice(2).split('-').map(Number).join('-')}`
}

/**
 * Gives the id of an entry's parent.
 *
 * @param id the entry's id
 * @returns `D-5` for `D-5-12`; null for a top-level id
 */
export function parentOf(id: string): string | null {
  const cut = id.lastIndexOf('-')

  return cut > 1 ? id.slice(0, cut) : null
}

// ── Options ──

/**
 * Splits an Options field into its options. Given as points, each point is one option: lettered when every point
 * starts with its own letter or number and `:` or `)`, numbered 1, 2, ... otherwise. Given as one line, a line of
 * lettered options (`A: ... B: ...`) splits at each letter; any other splits at each sentence (`Accept. Remove it.`).
 * Fewer than two is no choice: the entry takes plain text. The Recommendation's first point marks the option it names.
 *
 * @param text the Options field's value, its points joined with `\n`
 * @param recommendation the Recommendation field's value, to mark the option it names
 * @returns the options, in the field's order
 * @example
 * optionsOf('A: retry once (1 hour). B: leave it (none).', 'A, because ...')
 * // [{ value: 'A', label: 'A: retry once (1 hour).', isRecommended: true }, { value: 'B', ... }]
 * optionsOf('Accept it. Log it.\nRemove it.', 'Remove it') // values 1 and 2, the second recommended
 */
export function optionsOf(text: string, recommendation: string): DecisionOption[] {
  const points = pointsOf(text)
    .map(point => point.trim())
    .filter(point => point !== '')
  const isPoints = points.length > 1
  const lettered = isPoints ? letteredPoints(points) : letteredOptions(text)
  const labels = lettered ?? (isPoints ? points : sentences(text)).map((label, index) => ({ value: String(index + 1), label }))

  if (labels.length < 2) {
    return []
  }

  const said = pointsOf(recommendation)[0] ?? ''
  const named = lettered === null ? recommendedSentence(labels, said) : recommendedLetter(said)

  return labels.map(option => ({ ...option, isRecommended: option.value === named }))
}

/**
 * Reads options given as points as lettered options.
 *
 * @param points the options, one per point
 * @returns each option's letter or number and its whole text; null when a point starts with none, or two with the same
 */
function letteredPoints(points: readonly string[]): { value: string; label: string }[] | null {
  const options = points.flatMap(label => {
    const value = POINT_LETTER.exec(label)?.[1]

    return value === undefined ? [] : [{ value, label }]
  })
  const isEach = options.length === points.length && new Set(options.map(option => option.value)).size === options.length

  return isEach ? options : null
}

/**
 * Splits a line of lettered options at each letter.
 *
 * @param text the Options line's value
 * @returns each option's letter and its whole text; null when the line does not start with a letter or holds one only
 */
function letteredOptions(text: string): { value: string; label: string }[] | null {
  const starts = [...text.matchAll(OPTION_START)].map(match => ({
    value: match[2] ?? '',
    at: (match.index ?? 0) + (match[1] ?? '').length,
  }))

  if (starts.length < 2 || starts[0]?.at !== 0) {
    return null
  }

  return starts.map((start, index) => ({
    value: start.value,
    label: text.slice(start.at, starts[index + 1]?.at ?? text.length).trim(),
  }))
}

/**
 * Splits text at the end of each sentence.
 *
 * @param text the text
 * @returns its sentences, each with its stop
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(part => part !== '')
}

/**
 * Finds the letter a recommendation names first: `A, because ...` names A.
 *
 * @param recommendation the Recommendation's first point
 * @returns the letter or number; null when it starts with neither
 */
function recommendedLetter(recommendation: string): string | null {
  return /^([A-Z]|[1-9]\d?)(?![A-Za-z0-9])/.exec(recommendation.trim())?.[1] ?? null
}

/**
 * Finds the option a recommendation starts with: `Accept` names `Accept.`, and names `Accept: the log exists.` by
 * the word before its colon.
 *
 * @param options the options
 * @param recommendation the Recommendation's first point
 * @returns that option's value; null when it starts with none
 */
function recommendedSentence(options: readonly { value: string; label: string }[], recommendation: string): string | null {
  const said = recommendation.trim().toLowerCase()
  const found = options.find(option => {
    const bare = option.label.replace(/[.!?]+$/, '').toLowerCase()
    const head = /^([^:]{1,30}):/.exec(bare)?.[1]?.trim() ?? ''

    return (bare !== '' && said.startsWith(bare)) || (head !== '' && said.startsWith(head))
  })

  return found?.value ?? null
}

// ── The answer ──

/**
 * Writes the person's answer as the words the register records.
 *
 * @param row the entry
 * @param pick the value of the option picked, `other`, or undefined when nothing is picked
 * @param note what the person typed
 * @returns the words; null when Other is picked and nothing is typed
 * @example
 * answerText(row, 'A', 'weekdays only') // 'Chose A: retry once after 5 minutes (1 hour of work). Comment: weekdays only'
 * answerText(row, undefined, '')        // 'Agreed with the recommendation, no comments.'
 * answerText(row, undefined, 'but log it') // 'Agreed with the recommendation. Comment: but log it' (an entry with options)
 */
export function answerText(row: DecisionRow, pick: string | undefined, note: string): string | null {
  const said = note.trim()
  const option = row.options.find(one => one.value === pick)

  if (pick === OTHER) {
    return said === '' ? null : `Other: ${said}`
  }

  if (option) {
    return said === '' ? `Chose ${option.label}` : `Chose ${option.label} Comment: ${said}`
  }

  if (said === '') {
    return AGREED
  }

  return row.options.length > 0 ? `Agreed with the recommendation. Comment: ${said}` : said
}

// ── Order ──

/**
 * Orders the rows as the pane lists them: most urgent first, blocking before not, then the register's own order.
 *
 * @param rows the rows of one register
 * @returns a new array, sorted
 */
export function byUrgency(rows: readonly DecisionRow[]): DecisionRow[] {
  const rank = (row: DecisionRow) => (row.urgency === null ? URGENCIES.length : URGENCIES.indexOf(row.urgency))

  return [...rows].sort(
    (a, b) => rank(a) - rank(b) || Number(b.isBlocking) - Number(a.isBlocking) || a.order - b.order,
  )
}

// ── Paths ──

/**
 * Gives a path's last part.
 *
 * @param path a folder or file path, either separator
 * @returns `x` for `C:\Repos\x`
 */
export function lastSegment(path: string): string {
  const parts = path.split(/[\\/]+/).filter(part => part !== '')

  return parts[parts.length - 1] ?? path
}

/**
 * Gives the folder above a path.
 *
 * @param path a path, either separator
 * @returns `C:\Repos` for `C:\Repos\x`; null at a drive or file-system root
 */
export function parentFolder(path: string): string | null {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'))

  if (cut < 0 || /^[A-Za-z]:$/.test(trimmed)) {
    return null
  }

  const above = trimmed.slice(0, cut)

  return /^[A-Za-z]:$/.test(above) ? `${above}\\` : above === '' ? '/' : above
}

/**
 * Joins a folder and a name with the folder's own separator.
 *
 * @param folder the folder
 * @param name what is in it
 * @returns the joined path
 */
export function joinPath(folder: string, name: string): string {
  const separator = folder.includes('/') && !folder.includes('\\') ? '/' : '\\'

  return /[\\/]$/.test(folder) ? `${folder}${name}` : `${folder}${separator}${name}`
}
