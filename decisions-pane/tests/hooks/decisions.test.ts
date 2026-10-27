/**
 * Tests of reading the open file and writing the answer, without a session.
 */
import { expect, test } from 'claude-code/testing'

import {
  AGREED,
  answerText,
  canonicalId,
  optionsOf,
  parentFolder,
  parentOf,
  unreadNotice,
  waitingDecisions,
} from '../../hooks/decisions'

test('R8 a Follow up keeps its text exactly: spaces at both ends of its first line, deeper indents, empty lines', () => {
  const text = [
    '## D-1 · question · blocking',
    '- Status: waiting-for-user',
    '- Follow up: 2026-10-26 17:37:   lead spaces, trail spaces   ',
    '  ',
    '     three-space line',
    '  - Status: waiting-for-agent',
    '- Meanwhile: They wait.',
  ].join('\r\n')
  const [row] = waitingDecisions(text, 'C:\\r')

  expect(row?.history).toEqual([
    { label: 'Follow up', at: '2026-10-26 17:37', text: '  lead spaces, trail spaces   \n\n   three-space line\n- Status: waiting-for-agent' },
  ])
  expect(row?.meanwhile).toBe('They wait.')
})

test('R7 the notice of unreadable log lines names five of them and counts the rest', () => {
  expect(unreadNotice([], 'C:\\r\\log.jsonl')).toBe('')
  expect(unreadNotice([2, 4, 6, 8, 10, 12, 14], 'C:\\r\\log.jsonl')).toBe(
    '7 answers in the answers log could not be read and are not shown: lines 2, 4, 6, 8, 10 and 2 more of C:\\r\\log.jsonl.',
  )
})

test('R1 lettered options split at each letter, and the recommendation marks one', () => {
  expect(optionsOf('A: retry once (1 hour). B: leave it: you resend (none).', 'B, because it is cheap')).toEqual([
    { value: 'A', label: 'A: retry once (1 hour).', isRecommended: false },
    { value: 'B', label: 'B: leave it: you resend (none).', isRecommended: true },
  ])
})

test('R1b options named by a word and a colon are marked by that word', () => {
  const options = optionsOf(
    'Accept: the log already exists and is not a stop signal. Change: find failures over the pipe only.',
    'Accept',
  )

  expect(options.map(option => [option.label, option.isRecommended])).toEqual([
    ['Accept: the log already exists and is not a stop signal.', true],
    ['Change: find failures over the pipe only.', false],
  ])
})

test('R2 one option, or none, is no choice', () => {
  expect(optionsOf('Accept.', 'Accept')).toEqual([])
  expect(optionsOf('', 'Accept')).toEqual([])
})

test('R3 ids are read without leading zeros, and a child names its parent', () => {
  expect(canonicalId('D-0009')).toBe('D-9')
  expect(canonicalId('D-05-012')).toBe('D-5-12')
  expect(parentOf('D-5-12')).toBe('D-5')
  expect(parentOf('D-12')).toBeNull()
})

test('R4 a field that runs onto the next line is read whole', () => {
  const [row] = waitingDecisions('## D-1 · question · blocking\n- What: Retry\n  the invoice?\n- Urgency: medium', 'C:\\r')

  expect(row?.what).toBe('Retry the invoice?')
  expect(row?.urgency).toBe('medium')
})

test('R5 the answer words', () => {
  const [row] = waitingDecisions(
    '## D-1 · question · blocking\n- Options: A: once. B: never.\n- Recommendation: A',
    'C:\\r',
  )

  if (row === undefined) {
    throw new Error('no row')
  }

  expect(answerText(row, undefined, '  ')).toBe(AGREED)
  expect(answerText(row, 'A', '')).toBe('Chose A: once.')
  expect(answerText(row, 'B', 'for now')).toBe('Chose B: never. Comment: for now')
  expect(answerText(row, 'other', '')).toBeNull()
  expect(answerText(row, undefined, 'but log it')).toBe('Agreed with the recommendation. Comment: but log it')
  expect(answerText({ ...row, options: [] }, undefined, 'ask me tomorrow')).toBe('ask me tomorrow')
})

test('R6 the folder above a path stops at the drive', () => {
  expect(parentFolder('C:\\Repos\\x')).toBe('C:\\Repos')
  expect(parentFolder('C:\\Repos')).toBe('C:\\')
  expect(parentFolder('C:\\')).toBeNull()
})
