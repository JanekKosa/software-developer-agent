/**
 * Tests of the mod in a session: the registers on disk decide whether the pane shows and what it lists, and a submit
 * records the person's answer through register.mjs, on every surface that draws a text box.
 */
import { expect, test } from 'claude-code/testing'

import {
  ANSWER_TIME,
  LOG_FILE,
  OPEN_FILE,
  REPO,
  SCRIPT,
  TEAM_LOG_FILE,
  TEAM_OPEN_FILE,
  TEAM_REPO,
  answerOf,
  buttonLabels,
  choice,
  choiceStyle,
  choiceTexts,
  drawnLines,
  followUpLines,
  linesFrom,
  linesShown,
  logRecord,
  mountPane,
  noticesShown,
  paneText,
  poll,
  pollUntil,
  runCommand,
  startWorld,
  staleNotice,
  teamConfig,
  writeLog,
  writeOpen,
} from '../support/register-world'

/** Where the team's settings are, under the tests' home folder. */
const CONFIG = 'C:\\Users\\me\\.claude\\skills\\orchestrate-agents\\orchestration.config.json'

/** The colour of the Follow up label. */
const ORANGE = '#ff8c00'

/** The uid of an entry of the session's repo. */
const uidOf = (id: string, root = REPO) => `${root}::${id}`

// ── Whether the pane shows ──

test('D1 with no decisions folder the pane stays closed, and the command says nothing waits', async ($, on) => {
  const world = await startWorld($, on)

  await poll(world)

  expect(world.log).toEqual([])
  expect(await runCommand($)).toMatchObject({ text: 'No decisions wait for you.' })
})

test('D2 only entries waiting for the person are listed, and the pane opens with their count', async ($, on) => {
  const world = await startWorld($, on, w =>
    writeOpen(w, [{ id: 'D-12' }, { id: 'D-12-1', kind: 'initiative', status: 'waiting-for-agent' }]),
  )
  const ui = await mountPane($)
  const text = await paneText(ui)

  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"'])
  expect(text).toContain('1 decision waits for you · 1 blocking · 1 high')
  expect(text).toContain('HIGH')
  expect(text).toContain('D-12')
  expect(text).toContain('Should a rejected invoice be retried?')
  expect(text).toContain('Example: Invoice 1001 for 250.00 PLN')
  expect(text).toContain('Recommendation: A, because 9 of the last 10 rejections were timeouts.')
  expect(text).not.toContain('Invoice import')
  expect(text).not.toContain('run3.log')
  expect(text).not.toContain('D-12-1')
  expect(await choiceTexts(ui)).toEqual([
    '○ A: retry once after 5 minutes (1 hour of work). (recommended)',
    '○ B: leave it for you to resend (none).',
    '○ Other: type your own answer in the box below',
  ])
  expect((await buttonLabels(ui)).filter(label => !label.startsWith('○'))).toEqual(['Submit'])
  expect((await ui.find({ type: 'Input' }))?.props.placeholder).toBe('Comments (optional)')
  await ui.unmount()
})

test('D3 an entry with no Status line waits for the person, as register.mjs reads it', async ($, on) => {
  const world = await startWorld($, on, w => {
    w.files.set(OPEN_FILE, '# Open decisions\n\n## D-0009 · issue · not-blocking\n- Urgency: low\n- What: The log grows.')
  })
  const ui = await mountPane($)

  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"'])
  expect(await paneText(ui)).toContain('D-9')
  await ui.unmount()
})

test('D4 the most urgent entries come first, and a child names its parent', async ($, on) => {
  await startWorld($, on, w =>
    writeOpen(w, [
      { id: 'D-3', urgency: 'low', what: 'Low one?' },
      { id: 'D-5-12', urgency: 'high', what: 'High child?' },
      { id: 'D-4', urgency: 'medium', what: 'Medium one?' },
    ]),
  )
  const ui = await mountPane($)
  const text = await paneText(ui)

  expect(text.indexOf('High child?')).toBeLessThan(text.indexOf('Medium one?'))
  expect(text.indexOf('Medium one?')).toBeLessThan(text.indexOf('Low one?'))
  expect(text).toContain('follows D-5')
  await ui.unmount()
})

// ── Answering ──

test('D5 Submit with nothing picked agrees with the recommendation, and the entry leaves the pane', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)

  await ui.press({ key: `submit:${uidOf('D-12')}` })

  expect(world.runs).toEqual([
    ['answer', '--root', REPO, '--id', 'D-12', '--answer', 'Agreed with the recommendation, no comments.'],
  ])
  expect(world.files.get(OPEN_FILE)).toContain('- Status: waiting-for-agent')
  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"', 'close decisions-pane by plugin'])
  expect(await paneText(ui)).toContain('No decisions wait for you.')
  await ui.unmount()
})

test('D6 a picked option and a comment are sent together', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.press(choice(uid, 'B'))
  expect(await choiceTexts(ui)).toContain('◉ B: leave it for you to resend (none).')
  expect(await choiceStyle(ui, uid, 'B')).toEqual({ wrap: 'wrap', dimColor: false })
  expect(await choiceStyle(ui, uid, 'A')).toEqual({ wrap: 'wrap', dimColor: true })
  await ui.input({ key: `note:${uid}`, text: 'only on Fridays', kind: 'change' })
  await ui.press({ key: `submit:${uid}` })

  expect(answerOf(world.runs[0] ?? [])).toBe('Chose B: leave it for you to resend (none). Comment: only on Fridays')
  await ui.unmount()
})

test('D7 Other needs words: an empty one is refused; Enter in the box sends nothing, Submit sends', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.press(choice(uid, 'other'))
  expect((await ui.find({ type: 'Input' }))?.props.placeholder).toBe('Type your answer')
  await ui.press({ key: `submit:${uid}` })

  expect(world.runs).toEqual([])
  expect(await paneText(ui)).toContain('Type your answer in the box under Other, or pick one of the options.')

  await ui.input({ key: `note:${uid}`, text: 'retry twice, then tell me' })
  expect(world.runs).toEqual([])
  await ui.press({ key: `submit:${uid}` })

  expect(answerOf(world.runs[0] ?? [])).toBe('Other: retry twice, then tell me')
  await ui.unmount()
})

test('D7b a text box drawn anew gets back what the person typed', async ($, on) => {
  await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.input({ key: `note:${uid}`, text: 'only on Fridays', kind: 'change' })
  await ui.unmount()

  const again = await mountPane($)

  expect((await again.find({ type: 'Input' }))?.props.value).toBe('only on Fridays')
  await again.unmount()
})

test('D8 pressing the picked option again drops the pick', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.press(choice(uid, 'A'))
  await ui.press(choice(uid, 'A'))
  await ui.press({ key: `submit:${uid}` })

  expect(answerOf(world.runs[0] ?? [])).toBe('Agreed with the recommendation, no comments.')
  await ui.unmount()
})

test('D8b a comment with nothing picked agrees and adds the comment', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.input({ key: `note:${uid}`, text: 'but log every retry', kind: 'change' })
  await ui.press({ key: `submit:${uid}` })

  expect(answerOf(world.runs[0] ?? [])).toBe('Agreed with the recommendation. Comment: but log every retry')
  await ui.unmount()
})

test('D8c the heading draws urgency, kind and blocking bold, each in its own colour', async ($, on) => {
  await startWorld($, on, w => writeOpen(w, [{ id: 'D-12', urgency: 'medium', kind: 'initiative', blocking: false }]))
  const ui = await mountPane($)
  const styleOf = async (words: string) => {
    const found = (await ui.findAll({ type: 'Text', text: words })).find(text => text.text === words)

    return [found?.props.color, found?.props.bold]
  }

  expect(await styleOf('MEDIUM')).toEqual(['#ff8c00', true])
  expect(await styleOf('initiative')).toEqual(['#b180d7', true])
  expect(await styleOf('not blocking')).toEqual(['#4ec9b0', true])
  await ui.unmount()
})

test('D9 an entry with fewer than two options takes plain text at once', async ($, on) => {
  const world = await startWorld($, on, w =>
    writeOpen(w, [{ id: 'D-2', kind: 'issue', options: 'Fix it in the importer.', recommendation: 'Fix it.' }]),
  )
  const ui = await mountPane($)
  const uid = uidOf('D-2')

  expect((await buttonLabels(ui)).filter(label => !label.startsWith('○'))).toEqual(['Submit'])
  expect(await paneText(ui)).toContain('Options: Fix it in the importer.')
  await ui.input({ key: `note:${uid}`, text: 'do it after the release', kind: 'change' })
  await ui.press({ key: `submit:${uid}` })

  expect(answerOf(world.runs[0] ?? [])).toBe('do it after the release')
  await ui.unmount()
})

test('D10 sentence options split and the recommended one is marked', async ($, on) => {
  await startWorld($, on, w =>
    writeOpen(w, [{ id: 'D-12-1', kind: 'initiative', options: 'Accept. Remove it.', recommendation: 'Accept' }]),
  )
  const ui = await mountPane($)

  expect(await choiceTexts(ui)).toEqual([
    '○ Accept. (recommended)',
    '○ Remove it.',
    '○ Other: type your own answer in the box below',
  ])
  await ui.unmount()
})

test('D11 a refused answer stays with the reason, and the entry stays', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)

  world.failNext = { exitCode: 1, stderr: 'register: the decision register is busy' }
  await ui.press({ key: `submit:${uidOf('D-12')}` })

  const text = await paneText(ui)

  expect(text).toContain('Not saved: the decision register is busy')
  expect(text).toContain('Should a rejected invoice be retried?')
  expect(world.openPanes.has('decisions-pane')).toBe(true)
  await ui.unmount()
})

test('D12 register.mjs is run with the script from the default path under the home folder', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)

  await ui.press({ key: `submit:${uidOf('D-12')}` })

  expect(world.programs).toEqual([['node', SCRIPT]])
  await ui.unmount()
})

// ── Earlier rounds, other registers ──

test('D13 an old-layout entry shows its Answered line, and its Still open line as Follow up', async ($, on) => {
  await startWorld($, on, w =>
    writeOpen(w, [
      {
        id: 'D-11',
        extra: [
          '- Answered: 2026-10-25 17:30: "B, but not before September"',
          '- Still open: should invoices from 31 August that arrived on 1 September count?',
        ],
      },
    ]),
  )
  const ui = await mountPane($)
  const lines = await drawnLines(ui)
  const label = (await ui.findAll({ type: 'Text', text: 'Follow up: ' })).find(text => text.text === 'Follow up: ')

  expect(linesFrom(lines, 'Answered: 2026-10-25 17:30: "B, but not before September"', 4)).toEqual([
    'Answered: 2026-10-25 17:30: "B, but not before September"',
    '',
    'Follow up: should invoices from 31 August that arrived on 1 September count?',
    '',
  ])
  expect([label?.props.color, label?.props.bold]).toEqual([ORANGE, true])
  expect(lines.join('\n')).not.toContain('Still open')
  expect(lines.join('\n')).not.toContain('Follow-up')
  await ui.unmount()
})

test('D13b old in-entry lines come first in file order, then the log and the Follow up blocks by time', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [
      {
        id: 'D-11',
        extra: [
          '- Still open: which month?',
          '- Answered: 2026-10-25 17:30: "B"',
          ...followUpLines('2026-10-26 09:00', 'September, then.'),
        ],
      },
    ])
    writeLog(w, [logRecord('D-11', '2026-10-20 08:00', 'from the log')])
  })
  const ui = await mountPane($)
  const lines = (await drawnLines(ui)).filter(line => line !== '')

  expect(linesFrom(lines, 'Follow up: which month?', 4)).toEqual([
    'Follow up: which month?',
    'Answered: 2026-10-25 17:30: "B"',
    'Answered: 2026-10-20 08:00: from the log',
    'Follow up: 2026-10-26 09:00: September, then.',
  ])
  await ui.unmount()
})

// ── The answers log and Follow up blocks ──

test('D19 two answers and two Follow up blocks show in time order, line and paragraph breaks kept', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [
      {
        id: 'D-20',
        extra: [
          ...followUpLines('2026-10-26 10:20', 'first line of the text\nsecond line\nthird line'),
          ...followUpLines('2026-10-26 11:05', 'one paragraph\n\na new paragraph after an empty line'),
        ],
      },
    ])
    writeLog(w, [
      logRecord('D-20', '2026-10-26 10:05', 'A, retry once\nbut log it'),
      logRecord('D-20', '2026-10-26 10:50', 'Other: ask finance, Zażółć gęślą jaźń'),
    ])
  })
  const ui = await mountPane($)

  expect(linesFrom(await drawnLines(ui), 'Answered: 2026-10-26 10:05: A, retry once', 14)).toEqual([
    'Answered: 2026-10-26 10:05: A, retry once',
    'but log it',
    '',
    'Follow up: 2026-10-26 10:20: first line of the text',
    'second line',
    'third line',
    '',
    'Answered: 2026-10-26 10:50: Other: ask finance, Zażółć gęślą jaźń',
    '',
    'Follow up: 2026-10-26 11:05: one paragraph',
    '',
    'a new paragraph after an empty line',
    '',
    '',
  ])
  await ui.unmount()
})

test('D20 a continuation line that starts with "- " stays text of the Follow up, never a field', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [
      {
        id: 'D-7',
        extra: followUpLines('2026-10-26 10:20', 'A new option:\n- Options: C\n- Status: waiting-for-agent'),
      },
    ])
    writeLog(w, [logRecord('D-7', '2026-10-26 10:05', 'neither')])
  })
  const ui = await mountPane($)

  expect(linesFrom(await drawnLines(ui), 'Follow up: 2026-10-26 10:20: A new option:', 3)).toEqual([
    'Follow up: 2026-10-26 10:20: A new option:',
    '- Options: C',
    '- Status: waiting-for-agent',
  ])
  expect(await choiceTexts(ui)).toEqual([
    '○ A: retry once after 5 minutes (1 hour of work). (recommended)',
    '○ B: leave it for you to resend (none).',
    '○ Other: type your own answer in the box below',
  ])
  await ui.unmount()
})

test('D21 with no answers log the entry shows with no answers and no notice', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const text = (await drawnLines(ui)).join('\n')

  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"'])
  expect(text).toContain('Should a rejected invoice be retried?')
  expect(text).not.toContain('Answered')
  expect(text).not.toContain('could not be read')
  await ui.unmount()
})

test('D22 broken log lines are left out, every entry still shows, and one notice names the lines', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-20', what: 'First?' }, { id: 'D-21', what: 'Second?' }])
    w.files.set(
      LOG_FILE,
      [
        logRecord('D-20', '2026-10-26 10:05', 'first words'),
        'this is not JSON',
        JSON.stringify({ id: 'D-20', answer: 'no time given' }),
        '',
        logRecord('D-21', '2026-10-26 10:06', 'second words'),
      ].join('\r\n'),
    )
  })
  const ui = await mountPane($)
  const lines = await drawnLines(ui)
  const text = lines.join('\n')

  expect(text).toContain('First?')
  expect(text).toContain('Second?')
  expect(text).toContain('Answered: 2026-10-26 10:05: first words')
  expect(text).toContain('Answered: 2026-10-26 10:06: second words')
  expect(text).not.toContain('no time given')
  expect(lines.filter(line => line.includes('could not be read'))).toEqual([
    `2 answers in the answers log could not be read and are not shown: lines 2 and 3 of ${LOG_FILE}.`,
  ])
  await ui.unmount()
})

test('D22c each entry shows only the answers of its own id, an id with leading zeros included', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-20', what: 'First?' }, { id: 'D-21', what: 'Second?' }])
    writeLog(w, [logRecord('D-20', '2026-10-26 10:05', 'for twenty'), logRecord('D-021', '2026-10-26 10:06', 'for twenty-one')])
  })
  const ui = await mountPane($)
  const lines = await drawnLines(ui)
  const second = lines.indexOf('Second?')

  expect(lines.filter(line => line === 'Answered: 2026-10-26 10:05: for twenty')).toHaveLength(1)
  expect(lines.filter(line => line === 'Answered: 2026-10-26 10:06: for twenty-one')).toHaveLength(1)
  expect(lines.indexOf('Answered: 2026-10-26 10:05: for twenty')).toBeLessThan(second)
  expect(lines.indexOf('Answered: 2026-10-26 10:06: for twenty-one')).toBeGreaterThan(second)
  await ui.unmount()
})

test('D22b a log that is all broken leaves the entries and says so in one line', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-20' }])
    writeLog(w, ['{"id":"D-20","answeredAt":"2026-10-26 10:05"'])
  })
  const ui = await mountPane($)
  const lines = await drawnLines(ui)

  expect(lines).toContain('Should a rejected invoice be retried?')
  expect(lines.filter(line => line.includes('could not be read'))).toEqual([
    `An answer in the answers log could not be read and is not shown: line 1 of ${LOG_FILE}.`,
  ])
  await ui.unmount()
})

test('D23 another repo\'s answers log is never read', async ($, on) => {
  const world = await startWorld($, on, w => {
    w.files.set(
      CONFIG,
      teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', showInEveryChat: [TEAM_REPO] }),
    )
    writeOpen(w, [{ id: 'D-1', what: 'Shop question?' }])
    writeOpen(w, [{ id: 'D-1', what: 'Team question?' }], TEAM_OPEN_FILE)
    writeLog(w, [logRecord('D-1', '2026-10-26 10:05', 'the team answer')], TEAM_LOG_FILE)
  })
  const ui = await mountPane($)
  const text = (await drawnLines(ui)).join('\n')

  expect(text).toContain('Shop question?')
  expect(text).not.toContain('the team answer')
  expect(world.reads.filter(path => path.startsWith(`${TEAM_REPO}\\`))).toEqual([])
  await ui.unmount()
})

test('D24 a new answer in the log, then a new Follow up block, show at the next poll', async ($, on) => {
  const world = await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-12' }])
    writeLog(w, [logRecord('D-12', '2026-10-26 10:05', 'first answer')])
  })
  const before = await mountPane($)

  expect((await drawnLines(before)).join('\n')).not.toContain('second answer')
  await before.unmount()

  writeLog(world, [logRecord('D-12', '2026-10-26 10:05', 'first answer'), logRecord('D-12', '2026-10-26 10:40', 'second answer')])
  await poll(world)

  const afterAnswer = await mountPane($)

  expect((await drawnLines(afterAnswer)).join('\n')).toContain('Answered: 2026-10-26 10:40: second answer')
  await afterAnswer.unmount()

  writeOpen(world, [{ id: 'D-12', extra: followUpLines('2026-10-26 10:45', 'Thanks, one more thing') }])
  await poll(world)

  const afterFollowUp = await mountPane($)

  expect((await drawnLines(afterFollowUp)).join('\n')).toContain('Follow up: 2026-10-26 10:45: Thanks, one more thing')
  await afterFollowUp.unmount()
})

test('D25 an answer goes to the log through register.mjs, and shows above the follow-up that comes back', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))
  const ui = await mountPane($)
  const uid = uidOf('D-12')

  await ui.press(choice(uid, 'B'))
  await ui.press({ key: `submit:${uid}` })
  await ui.unmount()

  expect(world.runs).toEqual([
    ['answer', '--root', REPO, '--id', 'D-12', '--answer', 'Chose B: leave it for you to resend (none).'],
  ])
  expect(world.files.get(LOG_FILE)).toBe(`${logRecord('D-12', ANSWER_TIME, 'Chose B: leave it for you to resend (none).')}\n`)
  expect([...world.files.keys()].some(path => path.includes('ANSWERED'))).toBe(false)

  writeOpen(world, [{ id: 'D-12', extra: followUpLines('2026-10-26 11:45', 'Which weekday?') }])
  await poll(world)

  const again = await mountPane($)

  expect(linesFrom(await drawnLines(again), `Answered: ${ANSWER_TIME}: Chose B: leave it for you to resend (none).`, 3)).toEqual([
    `Answered: ${ANSWER_TIME}: Chose B: leave it for you to resend (none).`,
    '',
    'Follow up: 2026-10-26 11:45: Which weekday?',
  ])
  await again.unmount()
})

test('D26 the log file is the one register.answersLogFile names', async ($, on) => {
  await startWorld($, on, w => {
    w.files.set(
      CONFIG,
      teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', answersLogFile: 'MY_ANSWERS.jsonl' }),
    )
    writeOpen(w, [{ id: 'D-12' }])
    writeLog(w, [logRecord('D-12', '2026-10-26 10:05', 'from the named log')], `${REPO}\\decisions\\MY_ANSWERS.jsonl`)
    writeLog(w, [logRecord('D-12', '2026-10-26 10:06', 'from the default log')])
  })
  const ui = await mountPane($)
  const text = (await drawnLines(ui)).join('\n')

  expect(text).toContain('Answered: 2026-10-26 10:05: from the named log')
  expect(text).not.toContain('from the default log')
  await ui.unmount()
})

test('D27 an answer and a follow-up in the same minute: the answer first', async ($, on) => {
  await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-12', extra: followUpLines('2026-10-26 10:20', 'the follow-up') }])
    writeLog(w, [logRecord('D-12', '2026-10-26 10:20', 'the answer')])
  })
  const ui = await mountPane($)
  const lines = (await drawnLines(ui)).filter(line => line !== '')

  expect(linesFrom(lines, 'Answered: 2026-10-26 10:20: the answer', 2)).toEqual([
    'Answered: 2026-10-26 10:20: the answer',
    'Follow up: 2026-10-26 10:20: the follow-up',
  ])
  await ui.unmount()
})

test('D28 a failed read of the open file keeps the decisions shown before; the next poll shows the new ones', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-30', what: 'First?' }]))
  const readsOfOpen = () => world.reads.filter(path => path === OPEN_FILE).length

  writeOpen(world, [{ id: 'D-30', what: 'First?' }, { id: 'D-31', what: 'Second?' }])
  world.failReads.set(OPEN_FILE, 1)
  await poll(world)

  const during = await mountPane($)
  const duringText = (await drawnLines(during)).join('\n')

  expect(duringText).toContain('First?')
  expect(duringText).not.toContain('Second?')
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (1)')
  await during.unmount()

  const readsBefore = readsOfOpen()

  await poll(world)

  const after = await mountPane($)
  const afterText = (await drawnLines(after)).join('\n')

  expect(readsOfOpen()).toBe(readsBefore + 1)
  expect(afterText).toContain('First?')
  expect(afterText).toContain('Second?')
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')
  expect(world.log.filter(line => line.startsWith('close '))).toEqual([])
  await after.unmount()
})

test('D29 a failed read of the answers log keeps the answers and notice shown before; the next poll updates them', async ($, on) => {
  const world = await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-12' }])
    writeLog(w, [logRecord('D-12', '2026-10-26 10:05', 'first answer'), 'this is not JSON'])
  })
  const notice = `An answer in the answers log could not be read and is not shown: line 2 of ${LOG_FILE}.`

  writeLog(world, [logRecord('D-12', '2026-10-26 10:05', 'first answer'), logRecord('D-12', '2026-10-26 10:40', 'second answer')])
  world.failReads.set(LOG_FILE, 1)
  await poll(world)

  const during = await mountPane($)
  const duringLines = await drawnLines(during)

  expect(duringLines).toContain('Should a rejected invoice be retried?')
  expect(duringLines).toContain('Answered: 2026-10-26 10:05: first answer')
  expect(duringLines.join('\n')).not.toContain('second answer')
  expect(duringLines.filter(line => line.includes('could not be read'))).toEqual([notice])
  await during.unmount()

  await poll(world)

  const after = await mountPane($)
  const afterLines = await drawnLines(after)

  expect(afterLines).toContain('Answered: 2026-10-26 10:05: first answer')
  expect(afterLines).toContain('Answered: 2026-10-26 10:40: second answer')
  expect(afterLines.filter(line => line.includes('could not be read'))).toEqual([])
  await after.unmount()
})

test('D30 a first read that fails shows nothing, and the next poll shows the decisions', async ($, on) => {
  const world = await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-12' }])
    w.failReads.set(OPEN_FILE, 1)
  })

  expect(world.reads.filter(path => path === OPEN_FILE)).toHaveLength(1)
  expect(world.log).toEqual([])

  await poll(world)

  const ui = await mountPane($)

  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"'])
  expect(await paneText(ui)).toContain('Should a rejected invoice be retried?')
  await ui.unmount()
})

test('D31 a missing file is no failed read: it is not read, gives no notice, and is not tried again', async ($, on) => {
  const world = await startWorld($, on)
  const readsOf = (file: string) => world.reads.filter(path => path === file).length

  await poll(world)
  await poll(world)

  expect(readsOf(OPEN_FILE)).toBe(0)
  expect(readsOf(LOG_FILE)).toBe(0)
  expect(world.log).toEqual([])

  writeOpen(world, [{ id: 'D-12' }])
  await poll(world)
  await poll(world)

  const ui = await mountPane($)
  const lines = await drawnLines(ui)

  expect(readsOf(OPEN_FILE)).toBe(1)
  expect(readsOf(LOG_FILE)).toBe(0)
  expect(lines).toContain('Should a rejected invoice be retried?')
  expect(lines.filter(line => line.includes('could not be read'))).toEqual([])
  expect(world.log).toEqual(['open decisions-pane "Decisions (1)"'])
  await ui.unmount()
})

test('D32 a size check of the open file that fails, not as "not found", keeps the decisions shown; the next poll shows the new ones', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-30', what: 'First?' }]))

  writeOpen(world, [{ id: 'D-30', what: 'First?' }, { id: 'D-31', what: 'Second?' }])
  world.failStats.set(OPEN_FILE, 1)
  await poll(world)

  const during = await linesShown($)

  expect(during.join('\n')).toContain('First?')
  expect(during.join('\n')).not.toContain('Second?')
  expect(during.filter(line => line.includes('could not be read'))).toEqual([])
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (1)')

  await poll(world)

  const after = (await linesShown($)).join('\n')

  expect(after).toContain('First?')
  expect(after).toContain('Second?')
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')
  expect(world.log.filter(line => line.startsWith('close '))).toEqual([])
})

test('D33 a size check of the answers log that fails keeps the answers shown; the next poll shows the new one', async ($, on) => {
  const world = await startWorld($, on, w => {
    writeOpen(w, [{ id: 'D-12' }])
    writeLog(w, [logRecord('D-12', '2026-10-26 10:05', 'first answer')])
  })

  writeLog(world, [logRecord('D-12', '2026-10-26 10:05', 'first answer'), logRecord('D-12', '2026-10-26 10:40', 'second answer')])
  world.failStats.set(LOG_FILE, 1)
  await poll(world)

  const during = await linesShown($)

  expect(during).toContain('Answered: 2026-10-26 10:05: first answer')
  expect(during.join('\n')).not.toContain('second answer')

  await poll(world)

  const after = await linesShown($)

  expect(after).toContain('Answered: 2026-10-26 10:05: first answer')
  expect(after).toContain('Answered: 2026-10-26 10:40: second answer')
})

test('D34 an open file that is really removed shows no decisions and no notice, however long it stays away', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))

  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (1)')

  world.files.delete(OPEN_FILE)
  await poll(world)

  expect(world.openPanes.has('decisions-pane')).toBe(false)

  await pollUntil(world, world.clock.now() + 40_000)

  const lines = await linesShown($)

  expect(lines.join('\n')).toContain('No decisions wait for you.')
  expect(lines.join('\n')).not.toContain('Should a rejected invoice be retried?')
  expect(lines.filter(line => line.includes('could not be read'))).toEqual([])
  expect(world.openPanes.has('decisions-pane')).toBe(false)
})

test('D35 reads that fail for 30 seconds say so once, over the decisions shown before; the first good read clears it', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-30', what: 'First?' }]))

  writeOpen(world, [{ id: 'D-30', what: 'First?' }, { id: 'D-31', what: 'Second?' }])
  world.failReads.set(OPEN_FILE, 1_000)
  await poll(world)

  const since = world.clock.now()

  await pollUntil(world, since + 28_000)
  expect(await noticesShown($)).toEqual([])

  await pollUntil(world, since + 30_000)
  expect(await noticesShown($)).toEqual([staleNotice(since)])

  await pollUntil(world, since + 40_000)

  const failing = await linesShown($)

  expect(failing.filter(line => line.includes('could not be read'))).toEqual([staleNotice(since)])
  expect(failing.join('\n')).toContain('First?')
  expect(failing.join('\n')).not.toContain('Second?')
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (1)')

  world.failReads.delete(OPEN_FILE)
  await poll(world)

  const good = await linesShown($)

  expect(good.filter(line => line.includes('could not be read'))).toEqual([])
  expect(good.join('\n')).toContain('Second?')
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')
})

test('D36 size checks that fail for 30 seconds say so too; the first good read clears it', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-30', what: 'First?' }]))

  world.failStats.set(OPEN_FILE, 1_000)
  await poll(world)

  const since = world.clock.now()

  await pollUntil(world, since + 28_000)
  expect(await noticesShown($)).toEqual([])

  await pollUntil(world, since + 30_000)

  const failing = await linesShown($)

  expect(failing.filter(line => line.includes('could not be read'))).toEqual([staleNotice(since)])
  expect(failing.join('\n')).toContain('First?')

  world.failStats.delete(OPEN_FILE)
  await poll(world)

  expect(await noticesShown($)).toEqual([])
})

test('D37 a single failed read gives no notice, and a good read between failures starts the 30 seconds again', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-30', what: 'First?' }]))

  writeOpen(world, [{ id: 'D-30', what: 'First?' }, { id: 'D-31', what: 'Second?' }])
  world.failReads.set(OPEN_FILE, 1)
  await poll(world)
  expect(await noticesShown($)).toEqual([])

  await poll(world)
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')

  writeOpen(world, [{ id: 'D-30', what: 'First?' }])
  world.failReads.set(OPEN_FILE, 1_000)
  await pollUntil(world, world.clock.now() + 20_000)
  world.failReads.delete(OPEN_FILE)
  await poll(world)
  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (1)')

  writeOpen(world, [{ id: 'D-30', what: 'First?' }, { id: 'D-32', what: 'Third?' }])
  world.failReads.set(OPEN_FILE, 1_000)
  await pollUntil(world, world.clock.now() + 20_000)

  const failing = await linesShown($)

  expect(failing.filter(line => line.includes('could not be read'))).toEqual([])
  expect(failing.join('\n')).not.toContain('Third?')
})

test('D14 only the chat repo register is listed, even when the team shows another in every chat', async ($, on) => {
  await startWorld($, on, w => {
    w.files.set(
      'C:\\Users\\me\\.claude\\skills\\orchestrate-agents\\orchestration.config.json',
      teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', showInEveryChat: [TEAM_REPO] }),
    )
    writeOpen(w, [{ id: 'D-1', what: 'Shop question?' }])
    writeOpen(w, [{ id: 'D-8', what: 'Team question?' }], TEAM_OPEN_FILE)
  })
  const ui = await mountPane($)
  const text = await paneText(ui)

  expect(text).toContain('Shop question?')
  expect(text).not.toContain('Team question?')
  expect(text).toContain('1 decision waits for you')
  expect((await ui.findAll({ type: 'Button' })).some(b => b.key === `submit:${uidOf('D-8', TEAM_REPO)}`)).toBe(false)
  await ui.unmount()
})

test('D14b with only another repo holding decisions, the pane stays closed', async ($, on) => {
  const world = await startWorld($, on, w => {
    w.files.set(
      'C:\\Users\\me\\.claude\\skills\\orchestrate-agents\\orchestration.config.json',
      teamConfig({ folder: 'decisions', openFile: 'OPEN_DECISIONS_CLAUDE.md', showInEveryChat: [TEAM_REPO] }),
    )
    writeOpen(w, [{ id: 'D-8', what: 'Team question?' }], TEAM_OPEN_FILE)
  })

  await poll(world)

  expect(world.log).toEqual([])
})

// ── The person's close ──

test('D15 a pane the person closed stays closed until a new entry arrives', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))

  // The test's `$` cannot raise the person's close mark; the command closes the same way.
  await runCommand($)
  await poll(world)
  expect(world.openPanes.has('decisions-pane')).toBe(false)

  writeOpen(world, [{ id: 'D-12' }, { id: 'D-13', what: 'New one?' }])
  await poll(world)

  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')
})

test('D16 the command hides the pane and shows it again', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))

  expect(await runCommand($)).toMatchObject({ text: 'Decisions pane hidden.' })
  await poll(world)
  expect(world.openPanes.has('decisions-pane')).toBe(false)
  expect(await runCommand($)).toMatchObject({ text: 'Decisions pane shown.' })
  expect(world.openPanes.has('decisions-pane')).toBe(true)
})

test('D17 an entry an agent adds while the pane is open retitles its tab', async ($, on) => {
  const world = await startWorld($, on, w => writeOpen(w, [{ id: 'D-12' }]))

  writeOpen(world, [{ id: 'D-12' }, { id: 'D-13' }])
  await poll(world)

  expect(world.openPanes.get('decisions-pane')).toBe('Decisions (2)')
})

test('D18 the pane draws on every surface; mobile says it has no text box', async ($, on) => {
  await startWorld($, on, w => writeOpen(w, [{ id: 'D-2', options: 'Fix it.', recommendation: 'Fix it.' }]))

  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const ui = await mountPane($, surface)

    expect(await ui.find({ type: 'Input' })).toBeDefined()
    await ui.unmount()
  }

  const mobile = await mountPane($, 'mobile')

  expect(await paneText(mobile)).toContain('This surface draws no text box')
  await mobile.unmount()
})
