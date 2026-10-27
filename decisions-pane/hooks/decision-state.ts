/**
 * The mod's `$.state` values, declared in types/index.d.ts: the entries that wait for the person, what the person
 * picked and typed on each, the answers being written or written, why one failed, the person's close mark, the
 * session's folder, and the notice of answers-log lines that could not be read. Every access to them is in this file, because the engine takes a state reference only from a
 * const of the file that uses it.
 */
import { atom, read, update } from 'claude-code'
import type { StateDollar } from 'claude-code'

import type { DecisionRow } from '../types'

/**
 * The values. Change a `shape` tag when the fields of its rows change: it declines what an earlier version stored,
 * which outlives a reload.
 */
const DECISIONS = atom({ plugin: 'decisions-pane', key: 'decisions' } as const, [], { shape: 'decisions-3' })
const PICKS = atom({ plugin: 'decisions-pane', key: 'picks' } as const, {})
const NOTES = atom({ plugin: 'decisions-pane', key: 'notes' } as const, {})
const SENDING = atom({ plugin: 'decisions-pane', key: 'sending' } as const, [])
const SENT = atom({ plugin: 'decisions-pane', key: 'sent' } as const, [])
const ERRORS = atom({ plugin: 'decisions-pane', key: 'errors' } as const, {})
const DISMISSED = atom({ plugin: 'decisions-pane', key: 'dismissed' } as const, null)
const CWD = atom({ plugin: 'decisions-pane', key: 'cwd' } as const, '')
const LOG_NOTICE = atom({ plugin: 'decisions-pane', key: 'logNotice' } as const, '')

/**
 * Everything the pane draws from. The typed notes are in it, so a text box drawn anew (the person switched pane
 * tabs or the chat view reloaded) gets its text back; each keystroke redraws the pane.
 */
export type Board = {
  readonly decisions: readonly DecisionRow[]
  readonly picks: Readonly<Record<string, string>>
  readonly notes: Readonly<Record<string, string>>
  readonly sending: readonly string[]
  readonly errors: Readonly<Record<string, string>>
  /**
   * Which lines of the answers log could not be read, and since when the register could not be read; empty when
   * neither.
   */
  readonly logNotice: string
}

// ── The entries (the poll writes, the pane reads) ──

/**
 * Reads everything the pane draws. Read while drawing, it subscribes the drawing, so a later write draws it again.
 *
 * @param $ the engine interface (its state)
 * @returns the entries still to answer, with the picks, the answers in flight and the errors
 */
export async function readBoard($: StateDollar): Promise<Board> {
  const sent = await read($, SENT)

  return {
    decisions: (await read($, DECISIONS)).filter(row => !sent.includes(row.uid)),
    picks: await read($, PICKS),
    notes: await read($, NOTES),
    sending: await read($, SENDING),
    errors: await read($, ERRORS),
    logNotice: await read($, LOG_NOTICE),
  }
}

/**
 * Reads the entries still to answer: those the registers hold, less those answered whose file has not caught up.
 *
 * @param $ the engine interface (its state)
 * @returns the entries
 */
export async function readWaiting($: StateDollar): Promise<readonly DecisionRow[]> {
  return (await readBoard($)).decisions
}

/**
 * Finds one entry still to answer.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @returns its row; undefined when it no longer waits
 */
export async function findDecision($: StateDollar, uid: string): Promise<DecisionRow | undefined> {
  return (await readWaiting($)).find(row => row.uid === uid)
}

/**
 * Writes the entries the registers hold, when they changed. An answered entry the files no longer show as waiting
 * leaves the sent list, and the picks, notes and errors of entries gone are dropped.
 *
 * @param $ the engine interface (its state)
 * @param rows the entries that wait for the person, in the order drawn
 * @returns once written
 */
export async function writeDecisions($: StateDollar, rows: readonly DecisionRow[]): Promise<void> {
  const uids = rows.map(row => row.uid)
  const keep = <T>(record: Readonly<Record<string, T>>) =>
    Object.fromEntries(Object.entries(record).filter(([uid]) => uids.includes(uid)))

  if (JSON.stringify(await read($, DECISIONS)) !== JSON.stringify(rows)) {
    await update($, DECISIONS, () => [...rows])
  }

  if ((await read($, SENT)).some(uid => !uids.includes(uid))) {
    await update($, SENT, sent => sent.filter(uid => uids.includes(uid)))
  }

  if (Object.keys(await read($, PICKS)).some(uid => !uids.includes(uid))) {
    await update($, PICKS, keep)
  }

  if (Object.keys(await read($, NOTES)).some(uid => !uids.includes(uid))) {
    await update($, NOTES, keep)
  }

  if (Object.keys(await read($, ERRORS)).some(uid => !uids.includes(uid))) {
    await update($, ERRORS, keep)
  }
}

/**
 * Writes which lines of the answers log could not be read, when that changed.
 *
 * @param $ the engine interface (its state)
 * @param notice the notice for the person; empty when every line could be read
 * @returns once written
 */
export async function writeLogNotice($: StateDollar, notice: string): Promise<void> {
  if ((await read($, LOG_NOTICE)) !== notice) {
    await update($, LOG_NOTICE, () => notice)
  }
}

// ── The person's input (the pane's handlers write) ──

/**
 * Records the option the person picked on an entry.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @param pick the option's value, or `other`
 * @returns once written
 */
export async function writePick($: StateDollar, uid: string, pick: string): Promise<void> {
  await update($, PICKS, picks => ({ ...picks, [uid]: pick }))
  await clearError($, uid)
}

/**
 * Records what the person typed under an entry. The pane draws the box with it, so it survives the box being drawn
 * anew.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @param note the text
 * @returns once written
 */
export async function writeNote($: StateDollar, uid: string, note: string): Promise<void> {
  await update($, NOTES, notes => ({ ...notes, [uid]: note }))
}

/**
 * Reads what the person picked and typed on an entry.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @returns the pick (undefined when none) and the typed text
 */
export async function readInput($: StateDollar, uid: string): Promise<{ pick: string | undefined; note: string }> {
  return { pick: (await read($, PICKS))[uid], note: (await read($, NOTES))[uid] ?? '' }
}

// ── Answering (the submit writes) ──

/**
 * Marks an entry's answer as being written, unless it already is.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @returns true when marked; false when an answer of it is already on its way
 */
export async function startSending($: StateDollar, uid: string): Promise<boolean> {
  if ((await read($, SENDING)).includes(uid)) {
    return false
  }

  await update($, SENDING, sending => [...sending, uid])
  await clearError($, uid)

  return true
}

/**
 * Ends an entry's write: written, it leaves the list at once and its pick and note go; refused, it stays with why.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @param error why the answer was not written; null when it was
 * @returns once written
 */
export async function endSending($: StateDollar, uid: string, error: string | null): Promise<void> {
  if (error === null) {
    await update($, SENT, sent => [...sent, uid])
    await update($, PICKS, ({ [uid]: _gone, ...rest }) => rest)
    await update($, NOTES, ({ [uid]: _gone, ...rest }) => rest)
  } else {
    await writeError($, uid, error)
  }

  await update($, SENDING, sending => sending.filter(one => one !== uid))
}

/**
 * Records why an entry's answer was not written, shown under it.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @param error the reason, in a line
 * @returns once written
 */
export async function writeError($: StateDollar, uid: string, error: string): Promise<void> {
  await update($, ERRORS, errors => ({ ...errors, [uid]: error }))
}

/**
 * Drops an entry's error.
 *
 * @param $ the engine interface (its state)
 * @param uid the entry's uid
 * @returns once written
 */
async function clearError($: StateDollar, uid: string): Promise<void> {
  if ((await read($, ERRORS))[uid] !== undefined) {
    await update($, ERRORS, ({ [uid]: _gone, ...rest }) => rest)
  }
}

// ── The close mark (the command, the close and the poll write) ──

/**
 * Reads the entries the pane showed when the person closed it.
 *
 * @param $ the engine interface (its state)
 * @returns their uids; null while the person has not closed it
 */
export async function readDismissed($: StateDollar): Promise<readonly string[] | null> {
  return read($, DISMISSED)
}

/**
 * Records the person's close, with the entries shown then, or clears it.
 *
 * @param $ the engine interface (its state)
 * @param uids the uids shown when closed; null when the pane is theirs to see again
 * @returns once written
 */
export async function writeDismissed($: StateDollar, uids: readonly string[] | null): Promise<void> {
  await update($, DISMISSED, () => (uids === null ? null : [...uids]))
}

// ── The session's folder ──

/**
 * Reads the folder the session started in.
 *
 * @param $ the engine interface (its state)
 * @returns the folder; empty before the session started
 */
export async function readCwd($: StateDollar): Promise<string> {
  return read($, CWD)
}

/**
 * Records the folder the session started in.
 *
 * @param $ the engine interface (its state)
 * @param cwd the folder
 * @returns once written
 */
export async function writeCwd($: StateDollar, cwd: string): Promise<void> {
  await update($, CWD, () => cwd)
}
