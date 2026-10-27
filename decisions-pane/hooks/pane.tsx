/**
 * The Decisions pane: the /decisions-pane command that shows or hides it, the person's close mark, and the drawing: a
 * summary line, then one framed row per entry that waits for the person, each with its urgency, kind and blocking flag
 * in colour, its context as the main chat writes it, its options as a pick list (Other last), a comments box, and one
 * Submit button. A submit with nothing picked and nothing typed means the person agrees with the recommendation.
 */
import type { EngineInterface, On, RenderElement, RenderInput } from 'claude-code'

import type { DecisionKind, DecisionRow, HistoryItem, Urgency } from '../types'
import { OTHER, answerText, pointsOf } from './decisions'
import {
  endSending,
  findDecision,
  readBoard,
  readInput,
  startSending,
  writeError,
  writeNote,
  writePick,
} from './decision-state'
import type { Board } from './decision-state'
import { PANE_ID, closePaneForPerson, isPaneOpen, noteClosedByPerson, openPaneForPerson } from './pane-control'
import { readRegisters } from './poll'
import { recordAnswer } from './registers'
import type { Settings } from './settings'

/** The slash command that shows or hides the pane. */
const COMMAND = 'decisions-pane'

/**
 * The colours, as hex: VS Code draws a theme name such as `warning` in the theme's own shade (yellow in many), and
 * these must read as red, orange and green whatever the theme.
 */
const RED = '#f14c4c'
const ORANGE = '#ff8c00'
const GREEN = '#3fb950'
const BLUE = '#3794ff'
const PURPLE = '#b180d7'
const PINK = '#d16d9e'
const TEAL = '#4ec9b0'

/** The label and colour of each urgency. */
const URGENCY_MARKS: Readonly<Record<Urgency, { readonly label: string; readonly color: string }>> = {
  high: { label: 'HIGH', color: RED },
  medium: { label: 'MEDIUM', color: ORANGE },
  low: { label: 'LOW', color: GREEN },
}

/** The colour of each kind. */
const KIND_COLORS: Readonly<Record<DecisionKind, string>> = {
  question: BLUE,
  initiative: PURPLE,
  issue: PINK,
}

/** What starts each further point of a field, drawn on its own line under the first. */
const BULLET = '• '

/** How far a field's further points are indented, in characters. */
const POINT_INDENT = 2

/** What a submit says when Other is picked and nothing is typed. */
const NEEDS_TEXT = 'Type your answer in the box under Other, or pick one of the options.'

/**
 * What the command says in a chat the agent team is not switched on for. The team's task lead fixed these words for
 * its guide pages to quote too: change them together.
 */
const NOT_ON =
  'The agent team is not on in this chat. Type /software-developer-agent to switch it on; the Decisions pane then shows here.'

// ── Registering ──

/**
 * Registers the answer to the pane's command, its close mark and its drawing. The command first looks at the agent
 * team's switch and reads the registers anew, so a chat switched on a moment ago is seen: in a chat that is not
 * switched on it says how to switch the team on and opens nothing; otherwise it shows or hides the pane as the person
 * saw it when they typed the command.
 *
 * @param on the module's registrar
 * @param settings the mod's options
 * @returns nothing
 */
export function registerPane(on: On, settings: Settings): void {
  on('command.run', { command: COMMAND }, async $ => {
    const wasOpen = await isPaneOpen($)

    if (!(await readRegisters($, settings))) {
      return { text: NOT_ON }
    }

    if (wasOpen) {
      await closePaneForPerson($)

      return { text: 'Decisions pane hidden.' }
    }

    const opened = await openPaneForPerson($, settings)

    if (opened === null) {
      return { text: 'No decisions wait for you.' }
    }

    return { text: opened.isPlaced ? 'Decisions pane shown.' : `Decisions pane waits: ${opened.reason}` }
  })
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE_ID && e.origin.kind === 'person') {
      await noteClosedByPerson($).catch(() => undefined)
    }

    return next(e)
  })
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => drawPane($, e, settings))
}

/**
 * Adds the pane's slash command; the session's start runs it.
 *
 * @param $ the engine interface
 * @returns once added
 */
export async function registerCommand($: Pick<EngineInterface, 'command'>): Promise<void> {
  await $.command.register({ name: COMMAND, description: 'Show or hide the Decisions pane: the decisions that wait for you' })
}

// ── Answering ──

/**
 * Sends the person's answer to an entry: their pick and their words, or "agreed" when they gave neither. Once written,
 * the entry leaves the list; refused, it stays with the reason under it.
 *
 * @param $ the engine interface
 * @param uid the entry's uid
 * @param settings the mod's options
 * @returns once written or refused
 */
async function submit($: EngineInterface, uid: string, settings: Settings): Promise<void> {
  const row = await findDecision($, uid)

  if (row === undefined) {
    return
  }

  const { pick, note } = await readInput($, uid)
  const answer = answerText(row, pick, note)

  if (answer === null) {
    await writeError($, uid, NEEDS_TEXT)

    return
  }

  if (!(await startSending($, uid))) {
    return
  }

  await endSending($, uid, await recordAnswer($, row, answer, settings))
  await readRegisters($, settings)
}

/**
 * Picks an option of an entry, or drops the pick when it is the one already picked.
 *
 * @param $ the engine interface
 * @param uid the entry's uid
 * @param value the option's value, or `other`
 * @param current the entry's pick now
 * @returns once written
 */
async function togglePick($: EngineInterface, uid: string, value: string, current: string | undefined): Promise<void> {
  await writePick($, uid, current === value ? '' : value)
}

// ── Drawing ──

/**
 * Draws the pane: the summary, then each entry in a frame of its own, most urgent first.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param settings the mod's options
 * @returns the tree drawn
 */
async function drawPane($: EngineInterface, e: RenderInput<'Pane'>, settings: Settings): Promise<RenderElement> {
  const { Box, Text } = $.ui.resolve(e)
  const board = await readBoard($)

  return (
    <Box flexDirection="column" rowGap={1}>
      <Text bold>{summaryOf(board.decisions)}</Text>
      {board.logNotice !== '' && <Text wrap="wrap" color={ORANGE}>{board.logNotice}</Text>}
      {board.decisions.length === 0 && <Text dimColor>No decisions wait for you.</Text>}
      {board.decisions.map(row => drawDecision($, e, row, board, settings))}
    </Box>
  )
}

/**
 * Draws one entry: its heading line (urgency, id, kind, blocking, parent), what it asks, its context (example,
 * recommendation, meanwhile; not its task or evidence), its history (each answer, and each follow-up with an empty line
 * above and below), then the pick list, the comments box, the reason a submit was refused, and the Submit button. What
 * it asks is its first point in bold, each further point on its own line under it.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param row the entry
 * @param board what the pane draws from
 * @param settings the mod's options
 * @returns the entry's frame
 */
function drawDecision(
  $: EngineInterface,
  e: RenderInput<'Pane'>,
  row: DecisionRow,
  board: Board,
  settings: Settings,
): RenderElement {
  const { Box, Button, Text } = $.ui.resolve(e)
  const pick = board.picks[row.uid] || undefined
  const isSending = board.sending.includes(row.uid)
  const error = board.errors[row.uid]
  const [what = '', ...whatPoints] = pointsOf(row.what)

  return (
    <Box
      key={`decision:${row.uid}`}
      flexDirection="column"
      borderStyle="round"
      borderDimColor
      paddingX={2}
      paddingY={1}
      rowGap={0}
    >
      {drawHeading($, e, row)}
      {withPoints($, e, <Text bold>{what || '(no question written)'}</Text>, whatPoints)}
      {drawField($, e, 'Example', row.example)}
      {row.options.length === 0 && drawField($, e, 'Options', row.optionsText)}
      {drawField($, e, 'Recommendation', row.recommendation)}
      {drawField($, e, 'Meanwhile', row.meanwhile)}
      {row.history.map(item => drawHistoryItem($, e, item))}
      <Box flexDirection="column" rowGap={0.5} marginTop={1}>
        {row.options.length > 0 && drawChoices($, e, row, pick)}
        {drawNoteBox($, e, row, pick, board.notes[row.uid] ?? '')}
        {error !== undefined && <Text color={RED}>{error}</Text>}
      </Box>
      <Box flexDirection="row" flexWrap="wrap" alignItems="center" columnGap={1} marginTop={1.5} marginBottom={0.5}>
        <Button
          key={`submit:${row.uid}`}
          label={isSending ? 'Saving…' : 'Submit'}
          variant="primary"
          onPress={() => void (isSending ? undefined : submit($, row.uid, settings))}
        />
        <Text dimColor>{hintOf(row, pick)}</Text>
      </Box>
    </Box>
  )
}

/**
 * Draws an entry's heading line: its urgency, its id, its kind and whether it blocks work, each flag bold in a colour
 * of its own, and the parent of a child entry.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param row the entry
 * @returns the line, such as `HIGH  D-12 · question · blocking`
 */
function drawHeading($: EngineInterface, e: RenderInput<'Pane'>, row: DecisionRow): RenderElement {
  const { Text } = $.ui.resolve(e)
  const urgency = row.urgency === null ? { label: 'NO URGENCY', color: 'inactive' } : URGENCY_MARKS[row.urgency]

  return (
    <Text wrap="wrap">
      <Text color={urgency.color} bold>{urgency.label}</Text>
      {'  '}
      <Text bold>{row.id}</Text>
      <Text dimColor>{' · '}</Text>
      <Text color={row.kind === null ? 'inactive' : KIND_COLORS[row.kind]} bold>{row.kind ?? 'decision'}</Text>
      <Text dimColor>{' · '}</Text>
      <Text color={row.isBlocking ? RED : TEAL} bold>{row.isBlocking ? 'blocking' : 'not blocking'}</Text>
      {row.parentId !== null && <Text dimColor>{` · follows ${row.parentId}`}</Text>}
    </Text>
  )
}

/**
 * Draws one field of an entry as a labelled line holding its first point, each further point on its own line under
 * it; nothing when it is empty.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param label the field's name
 * @param value its text, its points joined with `\n`
 * @returns the line, such as `Example: Invoice 1001 for 250.00 PLN was rejected`; false when empty
 */
function drawField($: EngineInterface, e: RenderInput<'Pane'>, label: string, value: string): RenderElement | false {
  const { Text } = $.ui.resolve(e)

  if (value.trim() === '') {
    return false
  }

  const [first = '', ...further] = pointsOf(value)

  return withPoints(
    $,
    e,
    <Text wrap="wrap">
      <Text dimColor>{`${label}: `}</Text>
      {first}
    </Text>,
    further,
  )
}

/**
 * Puts a field's further points under its first line. A field of one point is its first line alone, drawn as it was
 * before fields had points.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param first the field's first line
 * @param further its further points; empty when it has none
 * @returns the first line, or a column of it and one line per further point
 */
function withPoints($: EngineInterface, e: RenderInput<'Pane'>, first: RenderElement, further: readonly string[]): RenderElement {
  const { Box } = $.ui.resolve(e)

  if (further.length === 0) {
    return first
  }

  return (
    <Box flexDirection="column">
      {first}
      {further.map(point => drawPoint($, e, point))}
    </Box>
  )
}

/**
 * Draws one further point of a field: on its own line, indented, after a bullet.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param point the point's words
 * @returns the line, such as `  • It also makes long entries quicker to read.`
 */
function drawPoint($: EngineInterface, e: RenderInput<'Pane'>, point: string): RenderElement {
  const { Box, Text } = $.ui.resolve(e)

  return (
    <Box paddingLeft={POINT_INDENT}>
      <Text wrap="wrap">{`${BULLET}${point}`}</Text>
    </Box>
  )
}

/**
 * Draws one step of an entry's history: its label (`Answered`, dim; `Follow up`, bold orange, with an empty line above
 * and below), its time, and its text line by line, each further line indented as the register file does, and an
 * empty line in the text as a line of space before the next.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param item the answer or follow-up
 * @returns its lines, such as `Follow up: 2026-10-26 10:20: first line` and `  second line`
 */
function drawHistoryItem($: EngineInterface, e: RenderInput<'Pane'>, item: HistoryItem): RenderElement {
  const { Box, Text } = $.ui.resolve(e)
  const isFollowUp = item.label === 'Follow up'
  const [first = '', ...rest] = item.text.split(/\r\n|\n|\r/)
  const label = `${item.label}: `

  return (
    <Box flexDirection="column" {...(isFollowUp ? { marginY: 1 } : {})}>
      <Text wrap="wrap">
        {isFollowUp ? <Text color={ORANGE} bold>{label}</Text> : <Text dimColor>{label}</Text>}
        {item.at === '' ? first : `${item.at}: ${first}`}
      </Text>
      {rest.map((line, index) =>
        line === '' ? (
          false
        ) : (
          <Box paddingLeft={2} {...(rest[index - 1] === '' ? { marginTop: 1 } : {})}>
            <Text wrap="wrap">{line}</Text>
          </Box>
        ),
      )}
    </Box>
  )
}

/**
 * Draws an entry's options as a pick list: per option a small button holding only its mark, and the option's words
 * beside it, the recommended one marked, then Other. VS Code never wraps a button's label, so the words sit outside
 * it: a long option wraps, each further line starting under its first word. The row itself must not wrap: VS Code
 * wraps a row Box by default, which drops the words under the mark. The picked one is drawn full, the others
 * faint; pressing the picked mark again drops the pick. The picked mark is ◉, not ●: in Segoe UI, the chat's font,
 * ● is smaller than ○ and sits lower, while ◉ has ○'s size and middle.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param row the entry
 * @param pick the value picked; undefined when none
 * @returns the list
 */
function drawChoices($: EngineInterface, e: RenderInput<'Pane'>, row: DecisionRow, pick: string | undefined): RenderElement {
  const { Box, Button, Text } = $.ui.resolve(e)
  const choices = [
    ...row.options.map(option => ({
      value: option.value,
      label: `${option.label}${option.isRecommended ? ' (recommended)' : ''}`,
    })),
    { value: OTHER, label: 'Other: type your own answer in the box below' },
  ]

  return (
    <Box flexDirection="column" rowGap={0.3}>
      {choices.map(choice => (
        <Box
          key={`choice:${row.uid}:${choice.value}`}
          flexDirection="row"
          flexWrap="nowrap"
          alignItems="flex-start"
          columnGap={1}
        >
          <Button
            key={`pick:${row.uid}:${choice.value}`}
            label={choice.value === pick ? '◉' : '○'}
            {...(choice.value === pick ? {} : { dimColor: true })}
            onPress={() => void togglePick($, row.uid, choice.value, pick)}
          />
          <Box flexShrink={1} minWidth={0}>
            <Text wrap="wrap" dimColor={choice.value !== pick}>
              {choice.label}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/**
 * Draws an entry's text box, always there: the person's own answer while Other is picked, comments otherwise. It is
 * drawn with what the person typed so far, so a box drawn anew (another pane tab, Ctrl+Tab, a reloaded chat view)
 * gets its text back, and without its own submit: Enter keeps the text, and the entry's one Submit button sends it.
 * VS Code draws it as a one-line field: a long text scrolls inside it, and a newline cannot be typed.
 *
 * @param $ the engine interface
 * @param e the render event of the pane
 * @param row the entry
 * @param pick the value picked; undefined when none
 * @param note what the person typed so far
 * @returns the box
 */
function drawNoteBox(
  $: EngineInterface,
  e: RenderInput<'Pane'>,
  row: DecisionRow,
  pick: string | undefined,
  note: string,
): RenderElement {
  const table = $.ui.resolve(e)

  if (e.surface === 'mobile' || !('Input' in table)) {
    return <table.Text dimColor>This surface draws no text box: answer in the editor or the terminal.</table.Text>
  }

  const { Input } = table

  return (
    <Input
      key={`note:${row.uid}`}
      placeholder={pick === OTHER ? 'Type your answer' : 'Comments (optional)'}
      value={note}
      submitLabel=""
      onInput={value => void writeNote($, row.uid, value)}
      onSubmit={value => void writeNote($, row.uid, value)}
    />
  )
}

// ── Wording ──

/**
 * Writes the summary line: how many entries wait, how many block work, how many are urgent.
 *
 * @param rows the entries that wait
 * @returns such as `3 decisions wait for you · 1 blocking · 2 high`
 */
function summaryOf(rows: readonly DecisionRow[]): string {
  const blocking = rows.filter(row => row.isBlocking).length
  const high = rows.filter(row => row.urgency === 'high').length

  return [
    `${rows.length} ${rows.length === 1 ? 'decision waits' : 'decisions wait'} for you`,
    ...(blocking > 0 ? [`${blocking} blocking`] : []),
    ...(high > 0 ? [`${high} high`] : []),
  ].join(' · ')
}

/**
 * Says what Submit does now.
 *
 * @param row the entry
 * @param pick the value picked; undefined when none
 * @returns one short line
 */
function hintOf(row: DecisionRow, pick: string | undefined): string {
  if (pick === OTHER) {
    return 'Sends your own answer.'
  }

  if (pick !== undefined) {
    return 'Sends your pick and any comments.'
  }

  return row.options.length > 0
    ? 'Nothing picked: you agree with the recommendation, plus any comments.'
    : 'Nothing typed: you agree as it stands.'
}
