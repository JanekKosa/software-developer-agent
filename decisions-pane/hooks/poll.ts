/**
 * Following the registers: at session start and then every `pollMs` and after each answer, the mod looks at the agent
 * team's switch for this chat; while the team is on it finds and reads the registers, writes the entries that wait for
 * the person and the notice of answers, or a register, that could not be read, and brings the pane in line. While it
 * is off nothing past the switch is read, no entry is kept, and the pane is closed. A change of the answers log is
 * noticed like a change of the open file.
 */
import type { EngineInterface } from 'claude-code'

import { readCwd, writeCwd, writeDecisions, writeLogNotice } from './decision-state'
import { followWaiting } from './pane-control'
import { findRegisters, readWaitingDecisions } from './registers'
import type { RegisterLocation, Snapshot, WaitingRead } from './registers'
import type { Settings } from './settings'
import { lookAtSwitch } from './team-switch'

/** What a read of the registers uses of the engine interface. */
export type PollDollar = Pick<EngineInterface, 'fs' | 'process' | 'env' | 'ui' | 'state' | 'clock' | 'session'>

/** What the pane holds in a chat the agent team is not switched on for: no entry and no notice. */
const NOTHING: WaitingRead = { rows: [], logNotice: '' }

/**
 * The registers of this session, found at the first look the agent team is on. A reload starts the session's hooks
 * again and finds them anew.
 */
let registers: readonly RegisterLocation[] = []

/** Whether the agent team is on for this chat, as the last look that could tell found it; off until one does. */
let isTeamOn = false

/** What each register held at its last read, by open file path, so an unchanged register is not read again. */
const snapshots = new Map<string, Snapshot>()

/** When each register's reads began to fail, by open file path, while they fail, so the pane can say they do. */
const failingSince = new Map<string, number>()

/** True while a read runs, so a timer tick that comes during one does not start a second. */
let isReading = false

/**
 * Starts following the registers when the session starts: looks at the switch, finds and reads the registers while
 * the team is on, and starts the timer that does it again.
 *
 * @param $ the engine interface
 * @param cwd the folder the session started in
 * @param settings the mod's options (pollMs and those the reads use)
 * @returns once first read
 */
export async function startPoll($: PollDollar, cwd: string, settings: Settings): Promise<void> {
  await writeCwd($, cwd)
  registers = []
  isTeamOn = false
  snapshots.clear()
  failingSince.clear()
  await readRegisters($, settings)
  $.clock.every(settings.pollMs, () => void readRegisters($, settings))
}

/**
 * Looks at the switch, then, while the agent team is on, reads the registers, and brings the pane in line. A look that
 * fails keeps the last on or off. A read asked while one runs is skipped: the next tick reads.
 *
 * @param $ the engine interface
 * @param settings the mod's options
 * @returns whether the agent team is on for this chat, as the last look that could tell found it
 */
export async function readRegisters($: PollDollar, settings: Settings): Promise<boolean> {
  if (isReading) {
    return isTeamOn
  }

  isReading = true

  try {
    isTeamOn = (await lookAtSwitch($, settings)) ?? isTeamOn

    if (isTeamOn && registers.length === 0) {
      const cwd = await readCwd($)

      registers = cwd === '' ? [] : await findRegisters($, cwd, settings)
    }

    const found = isTeamOn ? await readWaitingDecisions($, registers, snapshots, failingSince) : NOTHING

    await writeDecisions($, found.rows)
    await writeLogNotice($, found.logNotice)
    await followWaiting($, settings)

    return isTeamOn
  } finally {
    isReading = false
  }
}
