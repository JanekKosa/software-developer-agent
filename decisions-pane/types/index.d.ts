/**
 * The decisions-pane mod's contract: the `$.state` values it owns.
 *
 * `decisions` is every register entry that waits for the person (Status: waiting-for-user), read from the decision
 * register of the session's repo alone, most urgent first; the poll writes it and the pane reads it. `picks` holds the option the person picked on each entry, `notes`
 * what they typed under it (read only when they submit, so typing redraws nothing), `sending` the entries whose
 * answer is being written, `sent` the entries answered that the register file still shows as waiting, and `errors` why
 * an entry's answer was not written. `dismissed` lists the entries the pane showed when the person closed it, so it
 * opens by itself again only for a new one; null while it is not closed. `cwd` is the folder the session started in.
 * `logNotice` says which lines of the answers log could not be read; empty when every line could.
 * The contract imports nothing (validate refuses an import): `Shaped` is named inside the augmentation of 'claude-code'.
 */

/** What an entry is: the agent needs an answer, an agent did something unasked, or a problem was found. */
export type DecisionKind = 'question' | 'initiative' | 'issue'

/** How soon an entry needs the person: high (work waits or it gets costly within hours), medium, low. */
export type Urgency = 'high' | 'medium' | 'low'

/** One option of an entry's Options line. */
export type DecisionOption = {
  /** What the pick is called in the answer: the option's letter (`A`), or its number in the list (`1`). */
  readonly value: string
  /** The option as the register writes it, its letter included: `A: retry once after 5 minutes (1 hour of work).` */
  readonly label: string
  /** True for the option the Recommendation line names. */
  readonly isRecommended: boolean
}

/**
 * One step of an entry's history: an answer the person gave (from the answers log, or an older register's `Answered:`
 * line), or a Follow up an agent added (a `Follow up` block, or an older register's `Still open:` line).
 */
export type HistoryItem = {
  readonly label: 'Answered' | 'Follow up'
  /** When, as `2026-10-26 10:05`; empty for an older register's line, whose time, if any, is in its text. */
  readonly at: string
  /** The words exactly as stored, line breaks kept as `\n`; an empty line is a paragraph break. */
  readonly text: string
}

/** One entry that waits for the person, as the pane draws it. */
export type DecisionRow = {
  /** Its address across registers: the register's repo root and the id, as `C:\Repos\x::D-12`. */
  readonly uid: string
  /** The repo root whose `decisions` folder holds it; the answer is written there. */
  readonly root: string
  /** The id as the heading writes it: `D-12`, or `D-5-12` for the twelfth child of D-5. */
  readonly id: string
  /** The id of its parent entry; null for a top-level entry. */
  readonly parentId: string | null
  /** The kind; null when the heading names none (a hand edit). */
  readonly kind: DecisionKind | null
  readonly isBlocking: boolean
  /** The urgency; null when the entry has no Urgency line. */
  readonly urgency: Urgency | null
  readonly raised: string
  readonly task: string
  readonly what: string
  readonly example: string
  /** The Options line as written; empty when the entry has none. */
  readonly optionsText: string
  /** The options the line splits into; empty when it holds fewer than two, so the entry takes plain text. */
  readonly options: readonly DecisionOption[]
  readonly recommendation: string
  readonly meanwhile: string
  readonly evidence: string
  /**
   * Its earlier rounds: an older register's `Answered:` and `Still open:` lines first, in file order; then its answers
   * in the answers log and its Follow up blocks, in time order, an answer before a follow-up of the same minute.
   */
  readonly history: readonly HistoryItem[]
  /** Its position in its file, so entries of equal urgency keep the register's order. */
  readonly order: number
}

declare module 'claude-code' {
  interface PluginState {
    'decisions-pane': {
      decisions: Shaped<DecisionRow[]>
      picks: Record<string, string>
      notes: Record<string, string>
      sending: string[]
      sent: string[]
      errors: Record<string, string>
      dismissed: string[] | null
      cwd: string
      logNotice: string
    }
  }
}
