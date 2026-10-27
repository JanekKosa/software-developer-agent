/**
 * The mod's options (`userConfig` in .claude-plugin/plugin.json) as the hooks use them.
 */
import type { PluginOptions } from 'claude-code'

/**
 * The options, read: the agent team's register script and the node that runs it, how often the registers are read,
 * whether the pane opens by itself, and how tall it asks to be.
 */
export type Settings = {
  readonly registerScript: string
  readonly nodePath: string
  readonly pollMs: number
  readonly autoOpen: boolean
  readonly paneRows: number
}

/**
 * Reads the options `register` receives.
 *
 * The engine checks each value against its declared type and fills in the defaults before the module loads, so each
 * value already has its declared type.
 *
 * @param options the values of the manifest's userConfig fields
 * @returns the settings the hooks use
 */
export function settingsFrom(options: PluginOptions): Settings {
  return {
    registerScript: String(options.registerScript),
    nodePath: String(options.nodePath),
    pollMs: Number(options.pollMs),
    autoOpen: options.autoOpen === true,
    paneRows: Number(options.paneRows),
  }
}
