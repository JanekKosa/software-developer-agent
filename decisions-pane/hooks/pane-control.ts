/**
 * Opening, retitling and closing the Decisions pane: by itself while entries wait for the person, and at the person's
 * command or close mark.
 */
import type { EngineInterface, UiOpenResult } from 'claude-code'

import { readDismissed, readWaiting, writeDismissed } from './decision-state'
import type { Settings } from './settings'

/** What the pane's control uses of the engine interface. */
export type PaneDollar = Pick<EngineInterface, 'ui' | 'state'>

/** The pane's id, which its render hook matches on. */
export const PANE_ID = 'decisions-pane'

/**
 * Gives the pane's title, shown on its tab while another pane (the Agents pane) is open too.
 *
 * @param count how many entries wait for the person
 * @returns such as `Decisions (3)`
 */
export function paneTitle(count: number): string {
  return `Decisions (${count})`
}

// ── Reading ──

/**
 * Tells whether the pane is open, shown or waiting for room, and under which title.
 *
 * @param $ the engine interface
 * @returns its title while the engine holds it open; null when it is closed
 */
async function openTitle($: PaneDollar): Promise<string | null> {
  return (await $.ui.panes()).find(pane => pane.id === PANE_ID)?.title ?? null
}

/**
 * Tells whether the pane is open.
 *
 * @param $ the engine interface
 * @returns true while the engine holds it open
 */
export async function isPaneOpen($: PaneDollar): Promise<boolean> {
  return (await openTitle($)) !== null
}

// ── Following the registers ──

/**
 * Brings the pane in line with the entries that wait: closed when none does, retitled with the count while open, and
 * opened by itself when one waits, unless the person closed it and nothing new has come since.
 *
 * @param $ the engine interface
 * @param settings the mod's options (autoOpen, paneRows)
 * @returns once in line
 */
export async function followWaiting($: PaneDollar, settings: Settings): Promise<void> {
  const waiting = await readWaiting($)
  const title = await openTitle($)

  if (waiting.length === 0) {
    if (title !== null) {
      await $.ui.close({ id: PANE_ID })
    }

    if ((await readDismissed($)) !== null) {
      await writeDismissed($, null)
    }

    return
  }

  if (title !== null) {
    if (title !== paneTitle(waiting.length)) {
      await $.ui.open({ id: PANE_ID, title: paneTitle(waiting.length) })
    }

    return
  }

  const dismissed = await readDismissed($)
  const hasNew = dismissed === null || waiting.some(row => !dismissed.includes(row.uid))

  if (settings.autoOpen && hasNew) {
    await writeDismissed($, null)
    await $.ui.open({ id: PANE_ID, title: paneTitle(waiting.length), rows: settings.paneRows })
  }
}

// ── The person's command and close mark ──

/**
 * Opens the pane at the person's word; it then opens by itself again too.
 *
 * @param $ the engine interface
 * @param settings the mod's options (paneRows)
 * @returns whether the surface placed it, and why not; null when no entry waits, so there is nothing to show
 */
export async function openPaneForPerson($: PaneDollar, settings: Settings): Promise<UiOpenResult | null> {
  const waiting = await readWaiting($)

  if (waiting.length === 0) {
    return null
  }

  await writeDismissed($, null)

  return $.ui.open({ id: PANE_ID, title: paneTitle(waiting.length), rows: settings.paneRows })
}

/**
 * Notes the person's close: the pane stays closed until an entry it did not show arrives, or the command opens it.
 *
 * @param $ the engine interface
 * @returns once noted
 */
export async function noteClosedByPerson($: PaneDollar): Promise<void> {
  await writeDismissed($, (await readWaiting($)).map(row => row.uid))
}

/**
 * Closes the pane at the person's command.
 *
 * @param $ the engine interface
 * @returns once closed
 */
export async function closePaneForPerson($: PaneDollar): Promise<void> {
  await noteClosedByPerson($)
  await $.ui.close({ id: PANE_ID })
}
