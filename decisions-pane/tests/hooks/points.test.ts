/**
 * Tests of register entries written in points (the register's contract of 2026-10-27): a field's first point on the
 * field's line, each further point under it as two spaces, `- `, the point; Options as one point per option under an
 * empty `- Options:` line. The pane reads a field's points joined with `\n` and draws each further point on its own
 * line, indented, after `• `. An entry without point lines reads and draws as before.
 */
import { expect, test } from 'claude-code/testing'

import { answerText, optionsOf, waitingDecisions } from '../../hooks/decisions'
import { OPEN_FILE, choiceTexts, mountPane, startWorld, writeOpen } from '../support/register-world'

/** The contract's sample entry, exactly as the register writes it. */
const SAMPLE = [
  '## D-51 · question · not-blocking',
  '- Status: waiting-for-user',
  '- Urgency: medium',
  '- Raised: 2026-10-27 13:05 by lead sample',
  '- Task: Sample task',
  '- What: The pane shows each entry as one block of text.',
  '  - The register joins line breaks into spaces.',
  '  - The pane draws each field as one line.',
  "- Example: D-40's three options sat in one paragraph.",
  '- Options:',
  '  - A: show points, one per line (one run).',
  '  - B: leave it (no cost).',
  '- Recommendation: A, because the user asked for it.',
  '  - It also makes long entries quicker to read.',
  '- Meanwhile: Work goes on assuming A.',
  '- Evidence: C:\\x\\a.md, C:\\x\\b.md',
].join('\r\n')

/** The sample entry's lines as the pane draws them, from its question to its Meanwhile (the contract's drawing). */
const SAMPLE_LINES = [
  'The pane shows each entry as one block of text.',
  '  • The register joins line breaks into spaces.',
  '  • The pane draws each field as one line.',
  "Example: D-40's three options sat in one paragraph.",
  'Recommendation: A, because the user asked for it.',
  '  • It also makes long entries quicker to read.',
  'Meanwhile: Work goes on assuming A.',
]

/** An element as a drawing's `children` describe it. */
type Described = {
  readonly type?: unknown
  readonly props?: Readonly<Record<string, unknown>>
  readonly children?: readonly unknown[]
}

/**
 * Reads a drawing line by line, each line indented by the `paddingLeft` of the Boxes around it: each outermost Text is
 * one line, a Button is `[label]`. The entry's frame pads both sides (`paddingX`), which indents no line against
 * another, so it is not counted.
 *
 * @param node the drawing's root, as `findAll({})` gives it first
 * @param indent the spaces before each line so far
 * @param lines the lines so far; added to in place
 * @returns the lines, top to bottom
 */
function indentedLines(node: unknown, indent = 0, lines: string[] = []): string[] {
  if (typeof node !== 'object' || node === null) {
    return lines
  }

  const { type, props = {}, children = [] } = node as Described

  if (type === 'Text') {
    lines.push(`${' '.repeat(indent)}${wordsOf(children)}`)
  } else if (type === 'Button') {
    lines.push(`${' '.repeat(indent)}[${String(props.label)}]`)
  } else {
    children.forEach(child => indentedLines(child, indent + Number(props.paddingLeft ?? 0), lines))
  }

  return lines
}

/**
 * Gives the words of a Text and of the Texts inside it.
 *
 * @param children the Text's children, as the drawing describes them
 * @returns the words, joined
 */
function wordsOf(children: readonly unknown[]): string {
  return children
    .map(child =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : typeof child === 'object' && child !== null
          ? wordsOf((child as Described).children ?? [])
          : '',
    )
    .join('')
}

/**
 * Gives the lines that follow one line, that line included.
 *
 * @param lines the lines
 * @param first the line to start at
 * @param count how many lines to give
 * @returns those lines; empty when the first is not there
 */
function linesAfter(lines: readonly string[], first: string, count: number): string[] {
  const at = lines.indexOf(first)

  return at < 0 ? [] : lines.slice(at, at + count)
}

// ── Reading ──

test('P1 the sample entry gives a row whose What, Recommendation and options are its points', () => {
  const [row] = waitingDecisions(SAMPLE, 'C:\\r')

  if (row === undefined) {
    throw new Error('no row')
  }

  expect(row).toMatchObject({
    id: 'D-51',
    kind: 'question',
    isBlocking: false,
    urgency: 'medium',
    raised: '2026-10-27 13:05 by lead sample',
    task: 'Sample task',
    what: 'The pane shows each entry as one block of text.\nThe register joins line breaks into spaces.\nThe pane draws each field as one line.',
    example: "D-40's three options sat in one paragraph.",
    optionsText: 'A: show points, one per line (one run).\nB: leave it (no cost).',
    recommendation: 'A, because the user asked for it.\nIt also makes long entries quicker to read.',
    meanwhile: 'Work goes on assuming A.',
    evidence: 'C:\\x\\a.md, C:\\x\\b.md',
    history: [],
  })
  expect(row.options).toEqual([
    { value: 'A', label: 'A: show points, one per line (one run).', isRecommended: true },
    { value: 'B', label: 'B: leave it (no cost).', isRecommended: false },
  ])
  expect(answerText(row, 'B', '')).toBe('Chose B: leave it (no cost).')
})

test('P2 an entry without point lines reads as before: other indented lines continue the field with a space', () => {
  const text = [
    '## D-7 · question · blocking',
    '- What: Retry the invoice?',
    '  It failed twice.',
    '   - three spaces is no point',
    '  -5 °C is no point either',
    '- Options: A: retry once (1 hour). B: leave it (none).',
    '- Recommendation: B, because it is cheap. A costs an hour.',
  ].join('\r\n')
  const [row] = waitingDecisions(text, 'C:\\r')

  expect(row?.what).toBe('Retry the invoice? It failed twice. - three spaces is no point -5 °C is no point either')
  expect(row?.optionsText).toBe('A: retry once (1 hour). B: leave it (none).')
  expect(row?.recommendation).toBe('B, because it is cheap. A costs an hour.')
  expect(row?.options).toEqual([
    { value: 'A', label: 'A: retry once (1 hour).', isRecommended: false },
    { value: 'B', label: 'B: leave it (none).', isRecommended: true },
  ])
})

test('P3 a Follow up block keeps its "  - " lines as text; the next field reads points again', () => {
  const text = [
    '## D-8 · question · blocking',
    '- What: Retry?',
    '- Follow up: 2026-10-27 13:10: Two ways:',
    '  - A: retry.',
    '  - B: leave it.',
    '- Meanwhile: Work waits.',
    '  - The log grows.',
  ].join('\n')
  const [row] = waitingDecisions(text, 'C:\\r')

  expect(row?.history).toEqual([{ label: 'Follow up', at: '2026-10-27 13:10', text: 'Two ways:\n- A: retry.\n- B: leave it.' }])
  expect(row?.meanwhile).toBe('Work waits.\nThe log grows.')
  expect(row?.what).toBe('Retry?')
})

test('P4 points under an empty field line: the first point is the value; a point runs on; a point line with no words adds none', () => {
  const text = [
    '## D-9 · question · blocking',
    '- What:',
    '  - First point',
    '    runs on.',
    '  - ',
    '  - Second point.',
    '- Example:   spaced   ',
    '  -   Trimmed point.   ',
  ].join('\n')
  const [row] = waitingDecisions(text, 'C:\\r')

  expect(row?.what).toBe('First point runs on.\nSecond point.')
  expect(row?.example).toBe('spaced\nTrimmed point.')
})

test('P5 options from points: one per point, lettered or numbered, never split at sentences; the first point of the recommendation marks one', () => {
  expect(optionsOf('1) once.\n2) twice.', '2, because twice is safer.\nOnce is cheaper.')).toEqual([
    { value: '1', label: '1) once.', isRecommended: false },
    { value: '2', label: '2) twice.', isRecommended: true },
  ])
  expect(optionsOf('Accept it. Then log it.\nChange: find failures over the pipe.\nWait a week.', 'Change, because it is cheap.')).toEqual([
    { value: '1', label: 'Accept it. Then log it.', isRecommended: false },
    { value: '2', label: 'Change: find failures over the pipe.', isRecommended: true },
    { value: '3', label: 'Wait a week.', isRecommended: false },
  ])
  expect(optionsOf('A: once.\nretry twice.', 'A').map(option => option.value)).toEqual(['1', '2'])
  expect(optionsOf('A: once.\nA: twice.', 'B').map(option => option.value)).toEqual(['1', '2'])
  expect(optionsOf('A: only one.', 'A')).toEqual([])
})

// ── Drawing ──

test('P6 the sample entry draws its first point as today and each further point on its own line, indented, after "• "', async ($, on) => {
  await startWorld($, on, w => w.files.set(OPEN_FILE, `# Open decisions\r\n\r\n${SAMPLE}`))
  const ui = await mountPane($)
  const [root] = await ui.findAll({})
  const lines = indentedLines(root)
  const texts = await ui.findAll({ type: 'Text' })

  expect(linesAfter(lines, SAMPLE_LINES[0] ?? '', SAMPLE_LINES.length)).toEqual(SAMPLE_LINES)
  expect(texts.find(one => one.text === 'The pane shows each entry as one block of text.')?.props.bold).toBe(true)
  expect(texts.filter(one => one.text.startsWith('• ')).map(one => one.props.bold ?? false)).toEqual([false, false, false])
  expect(lines.some(line => line.includes('Options:'))).toBe(false)
  expect(await choiceTexts(ui)).toEqual([
    '○ A: show points, one per line (one run). (recommended)',
    '○ B: leave it (no cost).',
    '○ Other: type your own answer in the box below',
  ])
  await ui.unmount()
})

test('P7 an entry without points draws as before: no bullets, each field one line, sentences kept together', async ($, on) => {
  await startWorld($, on, w =>
    writeOpen(w, [
      {
        id: 'D-12',
        what: 'Retry the invoice? It failed twice.',
        options: 'Accept. Remove it.',
        recommendation: 'Accept, because it is cheap. Removing costs a day.',
      },
    ]),
  )
  const ui = await mountPane($)
  const [root] = await ui.findAll({})
  const lines = indentedLines(root)

  expect(lines.some(line => line.includes('•'))).toBe(false)
  expect(linesAfter(lines, 'Retry the invoice? It failed twice.', 4)).toEqual([
    'Retry the invoice? It failed twice.',
    'Example: Invoice 1001 for 250.00 PLN was rejected at 10:02 because the tax service timed out.',
    'Recommendation: Accept, because it is cheap. Removing costs a day.',
    'Meanwhile: Rejected invoices wait in the error list.',
  ])
  expect(await choiceTexts(ui)).toEqual([
    '○ Accept. (recommended)',
    '○ Remove it.',
    '○ Other: type your own answer in the box below',
  ])
  await ui.unmount()
})
