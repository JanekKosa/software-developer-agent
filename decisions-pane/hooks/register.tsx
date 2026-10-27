/**
 * The decisions-pane mod's hooks module, named in hooks/hooks.json: reads the options and registers the hooks.
 */
import type { Register } from 'claude-code'

import { registerCommand, registerPane } from './pane'
import { startPoll } from './poll'
import { settingsFrom } from './settings'

/**
 * Registers the session's start (the pane's command, then the first read of the decision registers and the timer that
 * reads them again) and the pane (its command, close mark and drawing).
 *
 * @param on the module's registrar
 * @param options the values of the manifest's userConfig fields, defaults filled in
 * @returns nothing; the engine drops what register returns
 */
export const register: Register = (on, options) => {
  const settings = settingsFrom(options)

  on('session.start', async ($, e, next) => {
    const started = await next(e)

    await registerCommand($)
    await startPoll($, e.cwd, settings)

    return started
  })
  registerPane(on, settings)
}
