// The decision register: two Markdown files and an answers log under <repo root>\decisions (names from the settings).
// The open file holds every question, initiative and issue until it is closed, each with a Status line:
// waiting-for-user until the user answers, then waiting-for-agent. The answers log (JSON Lines, one record per line)
// holds every answer the user gave, in the user's words exactly as given, with when it was handed over and when an agent
// processed it; records are only ever added, and only those two times change, from null to a time. An agent closes an
// answered entry, which moves it to the resolved file with its final answer, a summary and the outcome, or follows it
// up with a Follow up block (one line or several) that explains, elaborates or talks about it further, which sends it
// back to the user.
// Each answer reaches the main session exactly once: handing over takes every record that is neither handed over nor
// processed and sets its handedOverAt (the decision answers watch and the prompt hook both do it; the first one wins).
// Handing over "when all are answered" (the watch's early look) does the same only when no open entry waits for the
// user any more, checked under the same lock; otherwise it hands over nothing.
// An answer the user typed in the chat is recorded as handed over already, since the main session holds its words.
// An older register kept unprocessed answers in an answered file: every write first folds that file into the log and
// deletes it, and every read sees its answers as if they were already in the log. Older registers also kept answers
// inside the entries (Answered lines, or the words in a Resolved line) and Still open lines: migrate moves those
// answers into the log in time order, gives each closed entry a Final answer line and renames Still open to Follow up.
// This module owns their layout:
// adding an entry, recording an answer, handing answers over, closing an entry or following it up, listing entries,
// searching the answers, the one-line summary, the open entries and answers the prompt hook reads, and moving an older
// register to the current layout.
// Writes happen under an exclusive lock; reads take no lock and never create anything.

import fs from 'node:fs';
import path from 'node:path';
import { requireNumberSetting, requireSetting } from './config.mjs';
import { acquireLock } from './file-lock.mjs';
import { ensureExcludeLine, excludeFilePath, findRepoRoot, matchesPathPattern } from './git-repo.mjs';
import { formatLocalMinute } from './local-time.mjs';
import { detectEol, joinLines, readText, splitLines, tempFileName, writeTextAtomic } from './text-file.mjs';

const LOCK_FILE_NAME = '.lock';
// The summary names each blocking item by its What text, cut to this many characters so the line a prompt carries
// stays short (A2's finding 5, the option the main session chose).
const SUMMARY_WHAT_CHARS = 80;

const DOT = String.fromCodePoint(0xb7);
const KINDS = ['question', 'initiative', 'issue'];
const URGENCIES = ['high', 'medium', 'low'];
const OUTCOMES = ['answered', 'accepted', 'overruled', 'fixed', 'wont-fix'];
export const WAITING_FOR_USER = 'waiting-for-user';
export const WAITING_FOR_AGENT = 'waiting-for-agent';
// An id is D-<n>, and a child of an entry adds its own number: D-2-5 is the fifth child of D-2 (the user,
// 2026-10-26). Old registers wrote D-0007; leading zeros are read as the same number.
const ID_TEXT = /^D-(\d+(?:-\d+)*)$/;
const ID_FORM = 'D-7 (or D-2-5 for a child of D-2)';
const HEADING = /^## (D-\d+(?:-\d+)*)(?![\d-])/;
const RAISED = /^- Raised: (\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?/;
const STATUS_PREFIX = '- Status: ';
const URGENCY_PREFIX = '- Urgency: ';
const WHAT_PREFIX = '- What: ';
const ANSWERED_PREFIX = '- Answered: ';
const FOLLOW_UP_PREFIX = '- Follow up: ';
const FINAL_ANSWER_PREFIX = '- Final answer: ';
const RESOLVED_PREFIX = '- Resolved: ';
const NEW_FILE_EOL = '\r\n';
// An answer line of an older register's answered file, or of an entry of the middle layout, '- Answered: 2026-10-24
// 10:00: "<words on one line>"': the words are everything between the first quote after the time and the last quote
// of the line, so words that hold quotes survive. The s flag lets the words hold a line or paragraph separator, which
// the old code kept inside the line.
const OLD_ANSWER_LINE = /^- Answered: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}): "(.*)"$/s;
// A Resolved line of the oldest layout, '- Resolved: 2026-10-25 22:05, accepted: "<words on one line>"', the words
// read as in OLD_ANSWER_LINE.
const OLD_RESOLVED_LINE = /^- Resolved: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}), ([a-z-]+): "(.*)"$/s;
// A Still open line of the middle layout, '- Still open: <text>'; the text is never blank.
const OLD_STILL_OPEN_LINE = /^- Still open: (.*\S.*)$/s;
// The time a Resolved line of any layout starts with.
const RESOLVED_TIME = /^- Resolved: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/;
// What oldLayoutLine gives for a line that starts like a line of an older layout but cannot be read.
const MALFORMED = { kind: 'malformed' };
// The first line of a follow-up, '- Follow up: 2026-10-26 09:30: <first line of the text>'; every further line of the
// text follows it indented by two spaces.
const FOLLOW_UP_LINE = /^- Follow up: \d{4}-\d{2}-\d{2} \d{2}:\d{2}: (.*)$/s;
// The fields of an answers-log record, in the order they are written. The first three are required text and never
// change; the last two are null until set to a time, once.
const LOG_FIELDS = ['id', 'answeredAt', 'answer', 'handedOverAt', 'processedAt'];
const LOG_FIXED_FIELDS = ['id', 'answeredAt', 'answer'];
const LOG_TIME_FIELDS = ['handedOverAt', 'processedAt'];
// What the main session does with the answers handed to it; the handover command and the prompt hook both end with it.
export const HANDOVER_INSTRUCTION = 'For each answer: pass it, in the user\'s words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in double quotes.';

// Field name -> what it must hold. Every field is required except those in OPTIONAL_FIELDS; no other is accepted.
const ENTRY_FIELDS = {
    kind: 'kind', blocking: 'boolean', urgency: 'urgency', raisedBy: 'text', task: 'text', what: 'text',
    example: 'text', options: 'list', recommendation: 'text', meanwhile: 'text', evidence: 'list',
};
const OPTIONAL_FIELDS = { parent: 'id' };

// The descriptions older versions wrote under a file's title; migrateRegister replaces them with today's. The oldest
// layout's first, then the middle layout's (answers inside the entries, 2026-10-26); the answers-log layout wrote
// today's texts from the start.
const OLD_OPEN_DESCRIPTIONS = [
    /^Questions, initiatives and issues that wait for the user, newest last\. Once the user has answered one, the main session moves it to \S+\.$/,
    /^Questions, initiatives and issues not yet closed, newest last\. Each waits for the user \(Status: waiting-for-user\) until the user answers, then for an agent \(Status: waiting-for-agent\), with the answer in \S+\. The agent closes it, which moves it to \S+, or keeps it open, which sets it back to waiting-for-user\.$/,
];
const OLD_RESOLVED_DESCRIPTIONS = [
    'Questions, initiatives and issues the user has answered, newest last. Each ends with a Resolved line that holds the user\'s words.',
    'Questions, initiatives and issues that are closed, newest last. Each holds the user\'s answers, each with its time and words, and ends with a Resolved line that gives the outcome.',
];

/** A mistake of the caller (bad input, unknown id): the command line exits 2 with the message. */
export class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------------------------------------------

/**
 * Works out where the register of a folder lives.
 * @param {string} startDir the working folder (or --root); its repo root holds the register
 * @param {object} config the whole settings object (register.* is read)
 * @returns {{root: string, gitDir: string|null, folderPath: string, openPath: string, answeredPath: string,
 *   resolvedPath: string, answersLogPath: string, lockPath: string, lockWaitMs: number, lockStaleMs: number,
 *   excludeLines: string[], commitInRepo: boolean}} the paths (answeredPath is an older register's answered file,
 *   which only the fold reads), the lock timing, the info/exclude lines that keep the register's own files (not the
 *   whole folder, which may hold the repo's own files) out of git, and whether the repo commits the register
 */
export function registerLocation(startDir, config) {
    const folder = requireSetting(config, 'register.folder');
    const openFile = requireSetting(config, 'register.openFile');
    const answeredFile = requireSetting(config, 'register.answeredFile');
    const resolvedFile = requireSetting(config, 'register.resolvedFile');
    const answersLogFile = requireSetting(config, 'register.answersLogFile');
    const patterns = requireSetting(config, 'register.commitInRepos');
    if (!Array.isArray(patterns)) {
        throw new Error("orchestration.config.json setting 'register.commitInRepos' must be a list");
    }
    const lockWaitSeconds = requireNumberSetting(config, 'register.lockWaitSeconds');
    const lockStaleSeconds = requireNumberSetting(config, 'register.lockStaleSeconds');
    const { root, gitDir } = findRepoRoot(startDir);
    const folderPath = path.join(root, folder);
    const files = [openFile, answeredFile, resolvedFile, answersLogFile];
    return {
        root,
        gitDir,
        folderPath,
        openPath: path.join(folderPath, openFile),
        answeredPath: path.join(folderPath, answeredFile),
        resolvedPath: path.join(folderPath, resolvedFile),
        answersLogPath: path.join(folderPath, answersLogFile),
        lockPath: path.join(folderPath, LOCK_FILE_NAME),
        lockWaitMs: lockWaitSeconds * 1000,
        lockStaleMs: lockStaleSeconds * 1000,
        excludeLines: [...files, LOCK_FILE_NAME, ...files.map((name) => tempFileName(name, '*'))]
            .map((name) => `/${folder}/${name}`),
        commitInRepo: patterns.some((pattern) => matchesPathPattern(root, pattern)),
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------------------------

/**
 * Gives an id in its one written form: D-0007 and D-7 are both D-7, D-02-05 is D-2-5.
 * @param {*} text an id as typed or as found in a heading
 * @returns {string|null} the id, or null when the text is no id (a part of 0 is none)
 */
export function canonicalId(text) {
    const match = ID_TEXT.exec(typeof text === 'string' ? text.trim() : '');
    if (!match) {
        return null;
    }
    const parts = match[1].split('-').map(Number);
    return parts.every((n) => n >= 1) ? `D-${parts.join('-')}` : null;
}

/**
 * Gives an id in its written form, or refuses it.
 * @param {*} text an id as typed
 * @returns {string} the id
 * @throws {UsageError} when the text is no id
 */
function requireId(text) {
    const id = canonicalId(text);
    if (id === null) {
        throw new UsageError(`id '${text}' is not of the form ${ID_FORM}`);
    }
    return id;
}

/**
 * Gives ids typed by a caller in their written form, or refuses them all.
 * @param {string[]} ids ids as typed
 * @returns {string[]} the ids, in the same order
 * @throws {UsageError} naming every id that is not of the form D-7
 */
function requireIds(ids) {
    const malformed = ids.filter((id) => canonicalId(id) === null);
    if (malformed.length > 0) {
        throw new UsageError(`ids not of the form ${ID_FORM}: ${malformed.join(', ')}`);
    }
    return ids.map(canonicalId);
}

/**
 * Splits an id into its numbers.
 * @param {string} id an id from canonicalId
 * @returns {number[]} for example [2, 5] for D-2-5
 */
function idPath(id) {
    return id.slice(2).split('-').map(Number);
}

/**
 * Splits an id as found in a file into its numbers; a hand-made one that is no id counts as [0].
 * @param {string} id an id in its written form, or as found when it is no id
 * @returns {number[]} for example [2, 5] for D-2-5, [0] for no id
 */
function idPathOf(id) {
    return canonicalId(id) === null ? [0] : idPath(id);
}

/**
 * Gives the next free id at the top level, or under a parent: one more than the highest number already used there in
 * any file.
 * @param {object[]} entries the entries of every file
 * @param {number[]} parentPath the parent's numbers; [] for the top level
 * @returns {string} for example 'D-42', or 'D-2-6' when D-2's highest child is D-2-5
 */
function nextId(entries, parentPath) {
    const depth = parentPath.length;
    const below = entries.filter((e) => e.path.length > depth && parentPath.every((n, i) => e.path[i] === n));
    const number = Math.max(0, ...below.map((e) => e.path[depth])) + 1;
    return `D-${[...parentPath, number].join('-')}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Entries: validation and layout
// ---------------------------------------------------------------------------------------------------------------

/**
 * Checks an entry from a lead's JSON file.
 * @param {*} entry the parsed JSON
 * @throws {UsageError} naming the unknown kind or urgency, the missing or wrong field, or an unknown field
 */
export function validateEntry(entry) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new UsageError('the entry must be a JSON object');
    }
    for (const name of Object.keys(entry)) {
        if (!Object.hasOwn(ENTRY_FIELDS, name) && !Object.hasOwn(OPTIONAL_FIELDS, name)) {
            throw new UsageError(`unknown field '${name}' (expected ${[...Object.keys(ENTRY_FIELDS), ...Object.keys(OPTIONAL_FIELDS)].join(', ')})`);
        }
    }
    const rules = [...Object.entries(ENTRY_FIELDS), ...Object.entries(OPTIONAL_FIELDS).filter(([name]) => entry[name] !== undefined)];
    for (const [name, rule] of rules) {
        const value = entry[name];
        if (value === undefined) {
            throw new UsageError(`missing field: ${name}`);
        }
        if (rule === 'kind' && !KINDS.includes(value)) {
            throw new UsageError(`unknown kind '${value}' (expected ${KINDS.join(', ')})`);
        }
        if (rule === 'urgency' && !URGENCIES.includes(value)) {
            throw new UsageError(`unknown urgency '${value}' (expected ${URGENCIES.join(', ')})`);
        }
        if (rule === 'boolean' && typeof value !== 'boolean') {
            throw new UsageError(`field ${name} must be true or false`);
        }
        if (rule === 'text' && !isFilledText(value)) {
            throw new UsageError(`field ${name} must be non-empty text`);
        }
        if (rule === 'list' && !(Array.isArray(value) && value.length > 0 && value.every(isFilledText))) {
            throw new UsageError(`field ${name} must be a list of one or more non-empty texts`);
        }
        if (rule === 'id' && canonicalId(value) === null) {
            throw new UsageError(`field ${name} must be an id of the form ${ID_FORM}`);
        }
    }
}

/**
 * Lays out an entry as register lines. Every line break inside a text becomes one space; nothing else changes.
 * @param {string} id the entry id, for example 'D-7'
 * @param {object} entry a validated entry
 * @param {Date} now when it was raised
 * @returns {string[]} the heading and the field lines
 */
export function formatEntryLines(id, entry, now) {
    const options = entry.options.map(oneLine).map((option) => (/[.!?]$/.test(option) ? option : `${option}.`));
    return [
        `## ${id} ${DOT} ${entry.kind} ${DOT} ${entry.blocking ? 'blocking' : 'not-blocking'}`,
        `${STATUS_PREFIX}${WAITING_FOR_USER}`,
        `${URGENCY_PREFIX}${entry.urgency}`,
        `- Raised: ${formatLocalMinute(now)} by ${oneLine(entry.raisedBy)}`,
        `- Task: ${oneLine(entry.task)}`,
        `${WHAT_PREFIX}${oneLine(entry.what)}`,
        `- Example: ${oneLine(entry.example)}`,
        `- Options: ${options.join(' ')}`,
        `- Recommendation: ${oneLine(entry.recommendation)}`,
        `- Meanwhile: ${oneLine(entry.meanwhile)}`,
        `- Evidence: ${entry.evidence.map(oneLine).join(', ')}`,
    ];
}

/**
 * Says whether a value is a string with something other than spaces in it.
 * @param {*} value any value
 * @returns {boolean} true for non-blank text
 */
function isFilledText(value) {
    return typeof value === 'string' && value.trim() !== '';
}

/**
 * Turns every line break (CRLF, LF or a lone CR) into one space.
 * @param {string} text any text
 * @returns {string} the text on one line
 */
function oneLine(text) {
    return text.replace(/\r\n|\n|\r/g, ' ');
}

/**
 * Gives the value of an entry's first line of one field.
 * @param {{lines: string[]}} entry an entry
 * @param {string} prefix the field's line start, such as '- Status: '
 * @returns {string|null} the trimmed value, or null when the entry has no such line
 */
function fieldValue(entry, prefix) {
    const line = entry.lines.find((l) => l.startsWith(prefix));
    return line === undefined ? null : line.slice(prefix.length).trim();
}

/**
 * Gives an open entry's status. An entry without a Status line (from an older register) waits for the user.
 * @param {{lines: string[]}} entry an entry of the open file
 * @returns {string} WAITING_FOR_USER or WAITING_FOR_AGENT (or whatever a hand edit wrote)
 */
function statusOf(entry) {
    return fieldValue(entry, STATUS_PREFIX) || WAITING_FOR_USER;
}

/**
 * Sets an entry's Status line, in place; an entry without one gets it under its heading.
 * @param {{lines: string[]}} entry an entry of the open file
 * @param {string} status the new status
 */
function setStatus(entry, status) {
    const index = entry.lines.findIndex((l) => l.startsWith(STATUS_PREFIX));
    if (index >= 0) {
        entry.lines[index] = `${STATUS_PREFIX}${status}`;
    } else {
        entry.lines.splice(1, 0, `${STATUS_PREFIX}${status}`);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------------------------

/**
 * Adds an entry to the open file under the lock and gives it the next id: the next top-level id, or the next child
 * id of its parent. Creates the folder on first use.
 * @param {object} location from registerLocation
 * @param {object} entry the lead's entry
 * @param {Date} now when it was raised
 * @returns {string} the new id, for example 'D-7' or 'D-2-5'
 * @throws {UsageError} for a wrong entry, or a parent that is neither open nor resolved
 */
export function addEntry(location, entry, now) {
    validateEntry(entry);
    fs.mkdirSync(location.folderPath, { recursive: true });
    return withRegisterWrite(location, () => {
        const files = loadAll(location);
        let parentPath = [];
        if (entry.parent !== undefined) {
            const parent = canonicalId(entry.parent);
            if (![...files.open.entries, ...files.resolved.entries].some((e) => e.id === parent)) {
                throw new UsageError(`parent ${parent} is not in the open or resolved file`);
            }
            parentPath = idPath(parent);
        }
        const id = nextId(allEntries(files), parentPath);
        files.open.entries.push(makeEntry(formatEntryLines(id, entry, now)));
        writeTextAtomic(location.openPath, serializeRegister(files.open));
        return id;
    });
}

/**
 * Records the user's answer under the lock: the open entry's status becomes waiting-for-agent and a record with the
 * user's words, exactly as given, is added to the end of the answers log. The open file is written first, so running
 * it again after a crash only adds the record that was missing. An answer the main session already holds (the user
 * typed it in the chat) is recorded as handed over at the time it was given, so it is never handed over again.
 * @param {object} location from registerLocation
 * @param {{id: string, answer: string, handedOver?: boolean}} answer the id, the user's words, and whether the main
 *   session already holds them
 * @param {Date} now when the user answered
 * @returns {string} the id as written in the register
 * @throws {UsageError} for a malformed or unknown id, a blank answer, an id already resolved or one that is in the
 *   open file more than once
 */
export function answerEntry(location, { id, answer, handedOver = false }, now) {
    const wanted = requireId(id);
    if (!isFilledText(answer)) {
        throw new UsageError('--answer must hold the user\'s words');
    }
    requireRegisterFolder(location, wanted);
    return withRegisterWrite(location, () => {
        const files = loadAll(location);
        const { log } = files;
        const item = findOpenItem(files, wanted, location);
        setStatus(item, WAITING_FOR_AGENT);
        writeTextAtomic(location.openPath, serializeRegister(files.open));
        const answeredAt = formatLocalMinute(now);
        log.records.push(newRecord(wanted, answeredAt, answer, handedOver ? answeredAt : null));
        writeAnswersLog(location, log);
        return wanted;
    });
}

/**
 * Closes an answered entry under the lock: it moves from the open file to the end of the resolved file without its
 * Status line, followed by its Final answer (the id's last record in the log), the summary and a Resolved line with
 * the outcome; then every unprocessed record of the id is marked processed. The resolved file is written first, then
 * the open file, then the log; running it again after a crash finishes what is left. An id shared by two different
 * items (a branch merge, a hand edit) is refused and nothing is changed, so no item and no answer is lost.
 * @param {object} location from registerLocation
 * @param {{id: string, outcome: string, summary: string}} closing the id, the outcome and a summary of the decision
 *   that includes the final answer
 * @param {Date} now when it was closed
 * @throws {UsageError} for a malformed or unknown id, an unknown outcome, a blank summary, an id with no unprocessed
 *   answer, an id already resolved, an id that is in the open file more than once, or an id the resolved file holds
 *   for a different item
 */
export function closeEntry(location, { id, outcome, summary }, now) {
    const wanted = requireId(id);
    if (!OUTCOMES.includes(outcome)) {
        throw new UsageError(`unknown outcome '${outcome}' (expected ${OUTCOMES.join(', ')})`);
    }
    if (!isFilledText(summary)) {
        throw new UsageError(`--summary must sum up the decision, its final answer included: close --id ${wanted} --outcome ${outcome} --summary $summary (set $summary in a single-quoted here-string, never in double quotes)`);
    }
    requireRegisterFolder(location, wanted);
    withRegisterWrite(location, () => {
        const files = loadAll(location);
        const { log } = files;
        const stamp = formatLocalMinute(now);
        const records = log.records.filter((r) => recordId(r) === wanted);
        const unprocessed = records.filter(isUnprocessed);
        const resolvedItems = files.resolved.entries.filter((e) => e.id === wanted);
        if (unprocessed.length > 0 && resolvedItems.length > 0 && !files.open.entries.some((e) => e.id === wanted)) {
            // A close cut short after the open file was written: only marking the answers processed is left.
            markProcessed(location, log, unprocessed, stamp);
            return;
        }
        const item = findOpenItem(files, wanted, location);
        const base = item.lines.filter((l) => !l.startsWith(STATUS_PREFIX));
        const leftByCrash = resolvedItems.some((e) => isResolvedCopyOf(e, base));
        if (resolvedItems.length > 0 && !leftByCrash) {
            throw new UsageError(`${wanted} is also in ${path.basename(location.resolvedPath)} for a different item (two items share one id, for example after a branch merge). Nothing was changed. Give the open item the next free id, ${nextId(allEntries(files), idPath(wanted).slice(0, -1))}, by editing its heading in ${path.basename(location.openPath)}, then close that id.`);
        }
        if (!leftByCrash) {
            if (unprocessed.length === 0) {
                throw new UsageError(`${wanted} has no unprocessed answer in ${path.basename(location.answersLogPath)}. Nothing was changed. Record the user's words with answer first.`);
            }
            const final = records[records.length - 1];
            files.resolved.entries.push(makeEntry([
                ...base,
                `- Final answer: ${final.answeredAt}: "${oneLine(final.answer)}"`,
                `- Summary: ${oneLine(summary)}`,
                `- Resolved: ${stamp}, ${outcome}`,
            ]));
            writeTextAtomic(location.resolvedPath, serializeRegister(files.resolved));
        }
        files.open.entries.splice(files.open.entries.indexOf(item), 1);
        writeTextAtomic(location.openPath, serializeRegister(files.open));
        markProcessed(location, log, unprocessed, stamp);
    });
}

/**
 * Follows up an answered entry under the lock: the text goes to the end of the entry as a Follow up block (several
 * lines kept as given, see followUpBlock), its status goes back to waiting-for-user, and then every unprocessed record
 * of the id is marked processed. A follow-up may hold anything that explains, elaborates or talks about the decision
 * further; it never changes the entry's other lines, its Options included (changed options are a new child entry), and
 * the answers stay in the log. The open file is written first; running it again after a crash (the entry already ends
 * with the same Follow up block and waits for the user) only marks what was left.
 * @param {object} location from registerLocation
 * @param {{id: string, text: string}} followUp the id and the follow-up, in plain words
 * @param {Date} now when it was written
 * @throws {UsageError} for a malformed or unknown id, a blank text, an id with no unprocessed answer, an id already
 *   resolved or one that is in the open file more than once
 */
export function followUpEntry(location, { id, text }, now) {
    const wanted = requireId(id);
    if (!isFilledText(text)) {
        throw new UsageError('--text (--still-open for keep-open) must explain, elaborate or talk about the decision further');
    }
    requireRegisterFolder(location, wanted);
    withRegisterWrite(location, () => {
        const files = loadAll(location);
        const { log } = files;
        const item = findOpenItem(files, wanted, location);
        const unprocessed = log.records.filter((r) => recordId(r) === wanted && isUnprocessed(r));
        if (unprocessed.length === 0) {
            throw new UsageError(`${wanted} has no unprocessed answer in ${path.basename(location.answersLogPath)}. Nothing was changed.`);
        }
        const stamp = formatLocalMinute(now);
        const block = followUpBlock(text, stamp);
        if (!(endsWithFollowUp(item, block) && statusOf(item) === WAITING_FOR_USER)) {
            setStatus(item, WAITING_FOR_USER);
            item.lines.push(...block);
            writeTextAtomic(location.openPath, serializeRegister(files.open));
        }
        markProcessed(location, log, unprocessed, stamp);
    });
}

/**
 * Lays out a follow-up as entry lines: the text's leading and trailing blank lines dropped, its first line after
 * '- Follow up: <time>: ', every further line indented by two spaces, so an empty line becomes exactly two spaces and
 * no line of the text can read as a field or a heading of the register.
 * @param {string} text the follow-up as given, a CRLF, LF or lone CR breaking a line; not blank
 * @param {string} stamp when it was written, as formatLocalMinute gives it
 * @returns {string[]} the Follow up line, then one continuation line per further line of the text
 */
function followUpBlock(text, stamp) {
    const lines = text.split(/\r\n|\n|\r/);
    const first = lines.findIndex(isFilledText);
    const last = lines.findLastIndex(isFilledText);
    const kept = lines.slice(first, last + 1);
    return [`${FOLLOW_UP_PREFIX}${stamp}: ${kept[0]}`, ...kept.slice(1).map((line) => `  ${line}`)];
}

/**
 * Says whether an entry already ends with a follow-up block of the same text, whatever its time: what a follow-up
 * cut short by a crash leaves. A continuation line always starts with two spaces, so lines that start with a Follow
 * up line and run to the end of the entry are exactly its last block.
 * @param {{lines: string[]}} entry an entry of the open file
 * @param {string[]} block from followUpBlock
 * @returns {boolean} true when the entry's last lines are that block
 */
function endsWithFollowUp(entry, block) {
    const tail = entry.lines.slice(-block.length);
    const written = FOLLOW_UP_LINE.exec(tail[0]);
    return written !== null
        && written[1] === FOLLOW_UP_LINE.exec(block[0])[1]
        && block.every((line, i) => i === 0 || line === tail[i]);
}

/**
 * Hands the answers that wait for it to the main session, under the lock and after the fold, as every write: each
 * record that is neither handed over nor processed gets handedOverAt = now, in log order, and the log is written once.
 * A processed record is never handed over, whatever its handedOverAt. Without a register nothing is handed over.
 * With whenAllAnswered, nothing is handed over while an open entry still waits for the user (as statusOf counts it: a
 * Status of waiting-for-user, an empty one or none); the check reads the files loaded under the same lock, so an entry
 * added meanwhile cannot slip past.
 * @param {object} location from registerLocation
 * @param {Date} now when the answers are handed over
 * @param {{lockWaitMs?: number, whenAllAnswered?: boolean}} [options] a wait for the lock other than the register's
 *   (the prompt hook waits less); whether to hand over only once no open entry waits for the user (default false)
 * @returns {Array<{id: string, label: string, answeredAt: string, answer: string, handedOverAt: string}>} the records
 *   handed over, in log order, each with its entry's label (itemLabel of the open entry, else of the resolved one, else
 *   the id alone); [] when none waited, or when whenAllAnswered and an entry still waits for the user
 * @throws {Error} when the lock is not free within the wait, or for a broken answers log; nothing is written then
 */
export function handOverAnswers(location, now, { lockWaitMs, whenAllAnswered = false } = {}) {
    if (!fs.existsSync(location.folderPath)) {
        return [];
    }
    return withRegisterWrite(lockWaitMs === undefined ? location : { ...location, lockWaitMs }, () => {
        const files = loadAll(location);
        if (whenAllAnswered && files.open.entries.some((e) => statusOf(e) === WAITING_FOR_USER)) {
            return [];
        }
        const waiting = files.log.records.filter(isWaitingForHandOver);
        if (waiting.length === 0) {
            return [];
        }
        const stamp = formatLocalMinute(now);
        for (const record of waiting) {
            record.handedOverAt = stamp;
            record.raw = null;
        }
        writeAnswersLog(location, files.log);
        return waiting.map((r) => ({
            id: recordId(r), label: entryLabel(files, recordId(r)), answeredAt: r.answeredAt, answer: r.answer, handedOverAt: stamp,
        }));
    });
}

/**
 * Lays out answers handed over: per answer its label and time, then the words exactly as stored, answers one blank line
 * apart, then the instruction. The handover command prints it under its first line; the prompt hook adds it as it is.
 * @param {Array<{label: string, answeredAt: string, answer: string}>} handed from handOverAnswers, at least one
 * @returns {string} for example 'D-20 "Retry a rejected invoice?", answered 2026-10-26 10:05:\nA, retry once\n' then
 *   HANDOVER_INSTRUCTION, without a line break at the end
 */
export function handOverText(handed) {
    const blocks = handed.map((r) => `${r.label}, answered ${r.answeredAt}:\n${r.answer}`);
    return `${blocks.join('\n\n')}\n${HANDOVER_INSTRUCTION}`;
}

/**
 * Names an id's entry for a hand-over: the open entry, else the resolved one.
 * @param {{open: object, resolved: object}} files from loadAll
 * @param {string} id the id in its written form
 * @returns {string} itemLabel of the entry, or the id alone when no file holds it
 */
function entryLabel(files, id) {
    const found = files.open.entries.find((e) => e.id === id) ?? files.resolved.entries.find((e) => e.id === id);
    return found === undefined ? id : itemLabel({ id, what: fieldValue(found, WHAT_PREFIX) ?? '' });
}

/**
 * Gives entries as they stand, in the order open, answered, resolved, each followed by a blank line except the last.
 * The answered part is built from the answers log: per id, in the order of its first unprocessed record, a heading
 * and one Answered line per unprocessed record, the words on one line (the layout the answered file had).
 * @param {object} location from registerLocation
 * @param {{scopes: Array<'open'|'answered'|'resolved'>, ids?: string[]}} filter which parts, and optionally which ids
 * @returns {string} the entries' text ('' when there are none)
 * @throws {UsageError} for a malformed id or an id that is not in the chosen parts
 * @throws {Error} for a broken answers log or answered file, when the answered part is chosen
 */
export function listEntries(location, { scopes, ids }) {
    const chosenFiles = ['open', 'answered', 'resolved'].filter((scope) => scopes.includes(scope));
    const blocks = chosenFiles.flatMap((scope) => listBlocks(location, scope));
    let chosen = blocks;
    if (ids) {
        const wanted = requireIds(ids);
        const missing = ids.filter((id, i) => !blocks.some((b) => b.id === wanted[i]));
        if (missing.length > 0) {
            throw new UsageError(`not in the ${chosenFiles.join(' or ')} file: ${missing.join(', ')}`);
        }
        chosen = blocks.filter((b) => wanted.includes(b.id));
    }
    return chosen.map((b, i) => (i === 0 ? '' : b.eol) + b.text).join('');
}

/**
 * Searches the answers log, processed records included, and gives the matches in log order.
 * @param {object} location from registerLocation
 * @param {{ids?: string[], words?: string, json?: boolean}} filter only these ids; only answers holding these words,
 *   in any case; JSON lines exactly as stored instead of text blocks
 * @returns {string} with json, one stored line per record; without, one block per record, for example
 *   'D-20, answered 2026-10-26 10:05, processed 2026-10-26 10:20: "A, retry once"', blocks one blank line apart
 *   ('' when nothing matches)
 * @throws {UsageError} for a malformed id
 * @throws {Error} for a broken answers log or answered file
 */
export function listAnswers(location, { ids, words, json }) {
    const wanted = ids === undefined ? null : requireIds(ids);
    const needle = words === undefined ? null : words.toLowerCase();
    const view = answersView(location);
    const chosen = view.records.filter((r) => (wanted === null || wanted.includes(recordId(r)))
        && (needle === null || r.answer.toLowerCase().includes(needle)));
    if (json) {
        return chosen.map((r) => `${storedLine(r)}${view.eol}`).join('');
    }
    return chosen.map((r) => `${answerBlock(r)}${view.eol}`).join(view.eol);
}

/**
 * Gives the answers no agent has processed yet, as the prompt hook needs them: the log's, then an older answered file's
 * as the fold would add them. Changes nothing.
 * @param {object} location from registerLocation
 * @returns {Array<{id: string, answeredAt: string, answer: string, handedOverAt: string|null}>} in log order
 * @throws {Error} for a broken answers log or answered file
 */
export function unprocessedAnswers(location) {
    return answersView(location).records.filter(isUnprocessed)
        .map((r) => ({ id: recordId(r), answeredAt: r.answeredAt, answer: r.answer, handedOverAt: r.handedOverAt }));
}

/**
 * Gives the open file's entries as the prompt hook needs them.
 * @param {object} location from registerLocation
 * @returns {Array<{id: string, kind: string|null, blocking: boolean, status: string, urgency: string|null,
 *   what: string}>} one per open entry, in file order ('' as what for a hand-made entry without one)
 */
export function openItems(location) {
    return describeItems(loadRegister(location.openPath, []).entries);
}

/**
 * Describes loaded open entries as openItems gives them.
 * @param {object[]} entries entries of the open file
 * @returns {object[]} as openItems
 */
function describeItems(entries) {
    return entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        blocking: e.blocking,
        status: statusOf(e),
        urgency: fieldValue(e, URGENCY_PREFIX),
        what: fieldValue(e, WHAT_PREFIX) ?? '',
    }));
}

/**
 * Builds the one-line summary of the open file, for example "Decision register: 5 open (3 waiting for the user,
 * 2 blocking: D-4 "Should a rejected invoice be retried?", D-9 "..."; 2 waiting for the agent: D-2, D-3;
 * 3 questions, 1 initiative, 1 issue); oldest D-2 from 2026-10-23." Only items that wait for the user count as
 * blocking; each carries its What text, cut to SUMMARY_WHAT_CHARS characters.
 * @param {object} location from registerLocation
 * @param {string} [label] what the line opens with, before the colon
 * @returns {string} the line, or '' when nothing is open or the file is absent
 */
export function summaryLine(location, label = 'Decision register') {
    const { entries } = loadRegister(location.openPath, []);
    if (entries.length === 0) {
        return '';
    }
    const items = describeItems(entries);
    const forUser = items.filter((item) => item.status !== WAITING_FOR_AGENT);
    const forAgent = items.filter((item) => item.status === WAITING_FOR_AGENT);
    const parts = [];
    if (forUser.length > 0) {
        const blocking = forUser.filter((item) => item.blocking).map(itemLabel);
        parts.push(`${forUser.length} waiting for the user, ${blocking.length > 0 ? `${blocking.length} blocking: ${blocking.join(', ')}` : 'none blocking'}`);
    }
    if (forAgent.length > 0) {
        parts.push(`${forAgent.length} waiting for the agent: ${forAgent.map((item) => item.id).join(', ')}`);
    }
    const kindParts = KINDS.map((kind) => [kind, entries.filter((e) => e.kind === kind).length])
        .filter(([, count]) => count > 0)
        .map(([kind, count]) => `${count} ${kind}${count === 1 ? '' : 's'}`);
    if (kindParts.length > 0) {
        parts.push(kindParts.join(', '));
    }
    const dated = entries.filter((e) => e.raised !== null);
    const oldest = dated.length > 0 ? dated.reduce((a, b) => (b.raised < a.raised ? b : a)) : entries[0];
    const oldestPart = oldest.raised === null ? `oldest ${oldest.id}` : `oldest ${oldest.id} from ${oldest.raised.slice(0, 10)}`;
    return `${label}: ${entries.length} open (${parts.join('; ')}); ${oldestPart}.`;
}

/**
 * Names an item: its id and its What text in double quotes, cut to SUMMARY_WHAT_CHARS characters (whole characters,
 * so an emoji or other pair is never split), the last of which is an ellipsis when it was cut. An item without a What
 * line (a hand edit) gives its id alone.
 * @param {{id: string, what: string}} item from openItems
 * @returns {string} for example 'D-4 "Should a rejected invoice be retried?"'
 */
export function itemLabel(item) {
    const what = item.what.trim();
    if (what === '') {
        return item.id;
    }
    const characters = Array.from(what);
    const shown = characters.length <= SUMMARY_WHAT_CHARS
        ? what
        : `${characters.slice(0, SUMMARY_WHAT_CHARS - 1).join('').trimEnd()}…`;
    return `${item.id} "${shown}"`;
}

/**
 * Moves a register written by an older version to today's layout under the lock: an answered file folded into the
 * answers log (as every write does), every heading's id in its one written form (D-0007 becomes D-7), a Status line
 * on every open entry that has none (waiting-for-user), the answers kept inside entries moved to the answers log
 * (see convertOldLines), a Still open line renamed Follow up, and today's description under the title where a file
 * still has an older one. The answers go into the log in time order (see mergeByTime), each only once, under a guard
 * that lets migrate insert records but never drop, change or move one. The log is written first, then the resolved
 * file, then the open file, and only what changes: a run cut short finishes on the next run without a duplicate.
 * Before anything is written, even the fold, a line that starts like a line of an older layout but cannot be read
 * stops it.
 * @param {object} location from registerLocation
 * @param {Date} now when it runs: the processed time of an answer moved out of an open entry
 * @returns {string} one line per file saying what changed, or a line saying nothing did
 * @throws {Error} naming the file, the line number and the line of an older layout's line that cannot be read, or for
 *   a broken answers log or answered file; nothing is written then
 */
export function migrateRegister(location, now) {
    if (!fs.existsSync(location.folderPath)) {
        return `There is no register at ${location.folderPath}; nothing to change.\n`;
    }
    const targets = [
        { filePath: location.openPath, description: openHeader(location)[2], old: (line) => OLD_OPEN_DESCRIPTIONS.some((d) => d.test(line)), open: true },
        { filePath: location.resolvedPath, description: resolvedHeader(location)[2], old: (line) => OLD_RESOLVED_DESCRIPTIONS.includes(line), open: false },
    ];
    const readable = () => targets.forEach((target) => requireReadableOldLines(target.filePath));
    return withRegisterWrite(location, (folded) => {
        const report = folded === null ? []
            : [`${path.basename(location.answeredPath)}: ${folded} answer${folded === 1 ? '' : 's'} moved to ${path.basename(location.answersLogPath)}, file deleted`];
        const stamp = formatLocalMinute(now);
        const log = loadAnswersLog(location);
        const added = [];
        const changed = [];
        for (const target of targets) {
            if (readText(target.filePath) === null) {
                continue;
            }
            const register = loadRegister(target.filePath, []);
            const counts = { renamed: 0, statuses: 0, moved: 0, finals: 0, stillOpen: 0 };
            let description = false;
            for (const entry of register.entries) {
                const written = HEADING.exec(entry.lines[0])[1];
                if (written !== entry.id) {
                    entry.lines[0] = `## ${entry.id}${entry.lines[0].slice(3 + written.length)}`;
                    counts.renamed += 1;
                }
                if (target.open && !entry.lines.some((l) => l.startsWith(STATUS_PREFIX))) {
                    setStatus(entry, WAITING_FOR_USER);
                    counts.statuses += 1;
                }
                const converted = convertOldLines(entry, !target.open, stamp);
                counts.moved += converted.records.length;
                counts.finals += converted.finals;
                counts.stillOpen += converted.stillOpen;
                added.push(...notYetInLog(log.records, converted.records));
            }
            const index = register.header.findIndex(target.old);
            if (index >= 0) {
                register.header[index] = target.description;
                description = true;
            }
            const changes = [
                counted(counts.renamed, 'id', 'renamed'),
                counted(counts.statuses, 'Status line', 'added'),
                counted(counts.moved, 'answer', 'moved to the log'),
                counted(counts.finals, 'Final answer line', 'added'),
                counted(counts.stillOpen, 'Still open line', 'renamed'),
                description ? 'description updated' : '',
            ].filter(Boolean);
            if (changes.length > 0) {
                changed.push({ filePath: target.filePath, register, line: `${path.basename(target.filePath)}: ${changes.join(', ')}` });
            }
        }
        if (added.length > 0) {
            log.records = mergeByTime(log.records, added);
            writeAnswersLog(location, log, checkAnswersLogInsertions);
            report.push(`${path.basename(location.answersLogPath)}: ${counted(added.length, 'record', 'added')}`);
        }
        // The resolved file before the open file: changed holds the open file first.
        for (const file of [...changed].reverse()) {
            writeTextAtomic(file.filePath, serializeRegister(file.register));
        }
        report.push(...changed.map((file) => file.line));
        return report.length > 0 ? `${report.join('\n')}\n` : 'The register is already in the current layout; nothing to change.\n';
    }, readable);
}

/**
 * Says how many things a change touched, for migrate's report.
 * @param {number} count how many
 * @param {string} noun what, in the singular
 * @param {string} done what happened to them
 * @returns {string} for example '2 ids renamed', or '' when the count is 0
 */
function counted(count, noun, done) {
    return count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'} ${done}` : '';
}

/**
 * Reads one line of an entry as a line of an older layout that migrate converts: an Answered line (the middle
 * layout), a Resolved line that holds words in quotes (the oldest), or a Still open line (the middle). A line of a
 * follow-up's text starts with two spaces and is never one of them.
 * @param {string} line a line of an entry
 * @returns {{kind: string, answeredAt?: string, outcome?: string, answer?: string, text?: string}|null} the kind
 *   ('answered', 'resolved' or 'still-open') with what the line holds, MALFORMED for a line that starts like one but
 *   cannot be read, or null for any other line
 */
function oldLayoutLine(line) {
    if (line.startsWith('- Answered:')) {
        const answered = OLD_ANSWER_LINE.exec(line.trimEnd());
        return answered ? { kind: 'answered', answeredAt: answered[1], answer: answered[2] } : MALFORMED;
    }
    if (line.startsWith('- Resolved:') && line.includes('"')) {
        const resolved = OLD_RESOLVED_LINE.exec(line.trimEnd());
        return resolved ? { kind: 'resolved', answeredAt: resolved[1], outcome: resolved[2], answer: resolved[3] } : MALFORMED;
    }
    if (line.startsWith('- Still open:')) {
        const stillOpen = OLD_STILL_OPEN_LINE.exec(line);
        return stillOpen ? { kind: 'still-open', text: stillOpen[1] } : MALFORMED;
    }
    return null;
}

/**
 * Refuses a register file that holds, under its first heading, a line that starts like a line of an older layout
 * but cannot be read, so migrate never drops or guesses the user's words.
 * @param {string} filePath the open or resolved file; a missing file holds nothing
 * @throws {Error} naming the file, the line number and the line
 */
function requireReadableOldLines(filePath) {
    const lines = splitLines(readText(filePath) ?? '');
    const first = lines.findIndex((line) => HEADING.test(line));
    lines.forEach((line, i) => {
        if (first >= 0 && i > first && oldLayoutLine(line) === MALFORMED) {
            throw new Error(`${filePath} line ${i + 1} is a line of an older layout that migrate cannot read: ${line}\nNothing was changed. Fix that line by hand (an answer's words go between the first and the last double quote, after the time), then run migrate again.`);
        }
    });
}

/**
 * Converts the lines of an older layout in one entry, in place. Each Answered line leaves the entry and becomes a
 * record; a Resolved line with words becomes a record and a Resolved line without them; a Still open line becomes a
 * Follow up line with its text unchanged (no time is known). A closed entry that had an answer gets a Final answer
 * line with the words of its last one, right before its Resolved line (at its end without one), unless it has a Final
 * answer line already; no Summary is made up (the user, D-19). Every record counts as processed at the entry's
 * Resolved time, or when migrate runs for an entry without one: an answer inside an entry was always processed.
 * @param {{id: string, lines: string[]}} entry an entry, its id in its written form
 * @param {boolean} closed whether the entry is in the resolved file
 * @param {string} stamp when migrate runs, as formatLocalMinute writes it
 * @returns {{records: object[], finals: number, stillOpen: number}} the records in the entry's order, and how many
 *   Final answer lines were added and Still open lines renamed
 */
function convertOldLines(entry, closed, stamp) {
    const answers = [];
    let stillOpen = 0;
    const lines = [];
    for (const line of entry.lines) {
        const old = oldLayoutLine(line);
        if (old?.kind === 'answered') {
            answers.push(old);
        } else if (old?.kind === 'resolved') {
            answers.push(old);
            lines.push(`${RESOLVED_PREFIX}${old.answeredAt}, ${old.outcome}`);
        } else if (old?.kind === 'still-open') {
            lines.push(`${FOLLOW_UP_PREFIX}${old.text}`);
            stillOpen += 1;
        } else {
            lines.push(line);
        }
    }
    const resolvedAt = lines.map((line) => RESOLVED_TIME.exec(line)).filter(Boolean).pop()?.[1] ?? stamp;
    let finals = 0;
    if (closed && answers.length > 0 && !lines.some((line) => line.startsWith(FINAL_ANSWER_PREFIX))) {
        const last = answers[answers.length - 1];
        const at = lines.findLastIndex((line) => line.startsWith(RESOLVED_PREFIX));
        lines.splice(at < 0 ? lines.length : at, 0, `${FINAL_ANSWER_PREFIX}${last.answeredAt}: "${last.answer}"`);
        finals = 1;
    }
    entry.lines = lines;
    const records = answers.map((answer) => ({ ...newRecord(entry.id, answer.answeredAt, answer.answer), processedAt: resolvedAt }));
    return { records, finals, stillOpen };
}

/**
 * Puts records into the log's records in time order: each goes right before the first stored record answered at
 * the same minute or later, so close, which copies an id's last record, never takes an older answer for a newer one.
 * The stored records keep their order; the added ones keep theirs within a minute.
 * @param {object[]} stored the log's records
 * @param {object[]} added the records to put in
 * @returns {object[]} all records
 */
function mergeByTime(stored, added) {
    const waiting = [...added].sort((a, b) => (a.answeredAt < b.answeredAt ? -1 : Number(a.answeredAt > b.answeredAt)));
    const merged = [];
    let next = 0;
    for (const record of stored) {
        while (next < waiting.length && waiting[next].answeredAt <= record.answeredAt) {
            merged.push(waiting[next]);
            next += 1;
        }
        merged.push(record);
    }
    return [...merged, ...waiting.slice(next)];
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers of the commands
// ---------------------------------------------------------------------------------------------------------------

/**
 * Refuses an id when the register folder does not exist, before the lock (which lives in that folder) is taken.
 * @param {object} location from registerLocation
 * @param {string} id the id asked for
 * @throws {UsageError} when there is no register
 */
function requireRegisterFolder(location, id) {
    if (!fs.existsSync(location.folderPath)) {
        throw new UsageError(`unknown id ${id}: there is no register at ${location.folderPath}`);
    }
}

/**
 * Loads the open and resolved files, each with the header a new file gets, and the answers log.
 * @param {object} location from registerLocation
 * @returns {{open: object, resolved: object, log: object}} the loaded files
 * @throws {Error} for a broken answers log; nothing is written then
 */
function loadAll(location) {
    return {
        open: loadRegister(location.openPath, openHeader(location)),
        resolved: loadRegister(location.resolvedPath, resolvedHeader(location)),
        log: loadAnswersLog(location),
    };
}

/**
 * Gives the entries of every file and the ids of the answers log, for working out the next free id: an id that has
 * answers is never given to a new entry, even when its entry was removed by hand.
 * @param {{open: object, resolved: object, log: object}} files from loadAll
 * @returns {Array<{path: number[]}>} the entries, and one stand-in per record
 */
function allEntries(files) {
    return [...files.open.entries, ...files.resolved.entries, ...files.log.records.map((r) => ({ path: idPathOf(recordId(r)) }))];
}

/**
 * Finds the one open entry of an id.
 * @param {{open: object, resolved: object, log: object}} files from loadAll
 * @param {string} id the id, in its written form
 * @param {object} location from registerLocation, for the file names in messages
 * @returns {object} the entry
 * @throws {UsageError} when the id is not open (resolved or unknown) or is open more than once
 */
function findOpenItem(files, id, location) {
    const found = files.open.entries.filter((e) => e.id === id);
    if (found.length === 0) {
        throw new UsageError(files.resolved.entries.some((e) => e.id === id) ? `${id} is already resolved` : `unknown id ${id}`);
    }
    if (found.length > 1) {
        throw new UsageError(`${id} is in ${path.basename(location.openPath)} ${found.length} times. Nothing was changed. Give all but one of them a new id by editing their headings (the next free id is ${nextId(allEntries(files), idPath(id).slice(0, -1))}), then run the command again.`);
    }
    return found[0];
}

/**
 * Builds the answered part of a listing from the answers log: per id, in the order of its first unprocessed record,
 * a heading and one Answered line per unprocessed record.
 * @param {object} location from registerLocation
 * @param {'open'|'answered'|'resolved'} scope which part
 * @returns {Array<{id: string, eol: string, text: string}>} one block per entry
 */
function listBlocks(location, scope) {
    if (scope === 'answered') {
        const view = answersView(location);
        const byId = new Map();
        for (const record of view.records.filter(isUnprocessed)) {
            const id = recordId(record);
            if (!byId.has(id)) {
                byId.set(id, [`## ${id}`]);
            }
            byId.get(id).push(`${ANSWERED_PREFIX}${record.answeredAt}: "${oneLine(record.answer)}"`);
        }
        return [...byId].map(([id, lines]) => ({ id, eol: view.eol, text: joinLines(lines, view.eol) }));
    }
    const file = loadRegister(scope === 'open' ? location.openPath : location.resolvedPath, []);
    return file.entries.map((e) => ({ id: e.id, eol: file.eol, text: joinLines(e.lines, file.eol) }));
}

/**
 * Says whether a resolved entry is the copy a close wrote of an open entry: the open entry's lines without its Status
 * line, then more lines, the last a Resolved line. Only such a copy means a crash cut a close short; anything else is a
 * different item with the same id.
 * @param {{lines: string[]}} resolvedEntry an entry of the resolved file
 * @param {string[]} base the open entry's lines without its Status line
 * @returns {boolean} true when the resolved entry is that copy
 */
function isResolvedCopyOf(resolvedEntry, base) {
    const { lines } = resolvedEntry;
    return lines.length > base.length
        && lines[lines.length - 1].startsWith('- Resolved: ')
        && base.every((line, i) => line === lines[i]);
}

// ---------------------------------------------------------------------------------------------------------------
// The answers log
// ---------------------------------------------------------------------------------------------------------------

/**
 * Refuses a change of the answers log that would lose or alter what the user said: every record already stored must
 * stay, in its place, with the same id, answeredAt and answer; its handedOverAt and processedAt may only go from null
 * to a time. Records may be added at the end.
 * @param {object[]} before the records as stored
 * @param {object[]} after the records about to be written
 * @param {string} filePath the log, for the message
 * @throws {Error} naming the file and the first record that would be lost or altered; nothing is written then
 */
export function checkAnswersLogChange(before, after, filePath) {
    const refuse = (what) => {
        throw new Error(`refused to write ${filePath}: ${what}. Nothing was written; this is a defect of the register code, report it.`);
    };
    if (after.length < before.length) {
        refuse(`it would drop ${before.length - after.length} of its ${before.length} records`);
    }
    before.forEach((old, i) => {
        const next = after[i];
        for (const name of LOG_FIXED_FIELDS) {
            if (next[name] !== old[name]) {
                refuse(`record ${i + 1} (${old.id}) would change its ${name}`);
            }
        }
        for (const name of LOG_TIME_FIELDS) {
            if (next[name] !== old[name] && !(old[name] === null && typeof next[name] === 'string')) {
                refuse(`record ${i + 1} (${old.id}) would change its ${name} from ${JSON.stringify(old[name])} to ${JSON.stringify(next[name])}; it may only go from null to a time`);
            }
        }
    });
}

/**
 * The guard of migrate alone, which puts older answers into the log in time order: records may be inserted anywhere,
 * but every record already stored must stay, unchanged in all its fields, and in the same order relative to the other
 * stored records. Every other writer keeps checkAnswersLogChange.
 * @param {object[]} before the records as stored
 * @param {object[]} after the records about to be written
 * @param {string} filePath the log, for the message
 * @throws {Error} naming the file and the first stored record that would be dropped, changed or moved; nothing is
 *   written then
 */
export function checkAnswersLogInsertions(before, after, filePath) {
    let kept = 0;
    for (const record of after) {
        if (kept < before.length && isSameRecord(record, before[kept])) {
            kept += 1;
        }
    }
    if (kept < before.length) {
        throw new Error(`refused to write ${filePath}: record ${kept + 1} (${before[kept].id}) would be dropped, changed or moved, and migrate may only insert records. Nothing was written; this is a defect of the register code, report it.`);
    }
}

/**
 * Says whether two records hold the same values: the five fields and any key a hand edit added.
 * @param {object} a a record
 * @param {object} b a record
 * @returns {boolean} true when nothing differs
 */
function isSameRecord(a, b) {
    return LOG_FIELDS.every((name) => a[name] === b[name]) && JSON.stringify(a.extra ?? {}) === JSON.stringify(b.extra ?? {});
}

/**
 * Reads the answers log. A missing log has no records.
 * @param {object} location from registerLocation
 * @returns {{eol: string, records: object[]}} the log's break style and its records in file order, each with its
 *   five fields, any other keys a hand edit added (extra), and the line as stored (raw, null once changed)
 * @throws {Error} naming the file and the line for a line that is no JSON object with the texts id, answeredAt and
 *   answer (a blank line included); nothing is written then
 */
function loadAnswersLog(location) {
    const filePath = location.answersLogPath;
    const text = readText(filePath) ?? '';
    const records = splitLines(text).map((line, i) => {
        let value;
        try {
            value = JSON.parse(line);
        } catch (error) {
            throw new Error(`${filePath} line ${i + 1} is not valid JSON (${error.message}). Nothing was written; fix that line by hand, then run the command again.`);
        }
        if (value === null || typeof value !== 'object' || Array.isArray(value)
            || !LOG_FIXED_FIELDS.every((name) => typeof value[name] === 'string')) {
            throw new Error(`${filePath} line ${i + 1} is not an answer record: it needs the texts ${LOG_FIXED_FIELDS.join(', ')}. Nothing was written; fix that line by hand, then run the command again.`);
        }
        const { id, answeredAt, answer, handedOverAt = null, processedAt = null, ...extra } = value;
        return { id, answeredAt, answer, handedOverAt, processedAt, extra, raw: line };
    });
    return { eol: detectEol(text) ?? NEW_FILE_EOL, records };
}

/**
 * Writes the answers log as a whole, after checking against the log on disk that no record is lost or altered.
 * Runs under the register's lock.
 * @param {object} location from registerLocation
 * @param {{eol: string, records: object[]}} log from loadAnswersLog, changed
 * @param {(before: object[], after: object[], filePath: string) => void} [check] the guard; checkAnswersLogChange
 *   for every writer but migrate, which passes checkAnswersLogInsertions
 * @throws {Error} from the guard; nothing is written then
 */
function writeAnswersLog(location, log, check = checkAnswersLogChange) {
    check(loadAnswersLog(location).records, log.records, location.answersLogPath);
    writeTextAtomic(location.answersLogPath, joinLines(log.records.map(storedLine), log.eol));
}

/**
 * Makes a new record, not yet processed.
 * @param {string} id the id in its written form
 * @param {string} answeredAt when the user answered, as formatLocalMinute writes it
 * @param {string} answer the user's words exactly as given
 * @param {string|null} [handedOverAt] when it was handed to the main session; null while it waits to be
 * @returns {object} the record
 */
function newRecord(id, answeredAt, answer, handedOverAt = null) {
    return { id, answeredAt, answer, handedOverAt, processedAt: null, extra: {}, raw: null };
}

/**
 * Gives a record's line: as stored when nothing changed it, otherwise its five fields in their fixed order, then any
 * key a hand edit added. JSON.stringify writes non-ASCII as characters, which keeps the file greppable.
 * @param {object} record a record
 * @returns {string} the JSON line without its line break
 */
function storedLine(record) {
    if (record.raw !== null) {
        return record.raw;
    }
    const fields = Object.fromEntries(LOG_FIELDS.map((name) => [name, record[name]]));
    return JSON.stringify({ ...fields, ...record.extra });
}

/**
 * Gives a record's id in its written form.
 * @param {{id: string}} record a record
 * @returns {string} the id (as stored when it is no id at all)
 */
function recordId(record) {
    return canonicalId(record.id) ?? record.id;
}

/**
 * Says whether no agent has processed a record yet.
 * @param {{processedAt: string|null}} record a record
 * @returns {boolean} true while processedAt is null
 */
function isUnprocessed(record) {
    return record.processedAt === null;
}

/**
 * Says whether a record waits to be handed to the main session: not handed over and not processed.
 * @param {{handedOverAt: string|null, processedAt: string|null}} record a record
 * @returns {boolean} true while both times are null
 */
function isWaitingForHandOver(record) {
    return record.handedOverAt === null && isUnprocessed(record);
}

/**
 * Marks records processed and writes the log; writes nothing when there is none.
 * @param {object} location from registerLocation
 * @param {object} log from loadAnswersLog
 * @param {object[]} records records of that log
 * @param {string} stamp the time, as formatLocalMinute writes it
 */
function markProcessed(location, log, records, stamp) {
    if (records.length === 0) {
        return;
    }
    for (const record of records) {
        record.processedAt = stamp;
        record.raw = null;
    }
    writeAnswersLog(location, log);
}

/**
 * Lays out a record as a text block: the id, the times that are set, then the words exactly as given.
 * @param {object} record a record
 * @returns {string} for example 'D-20, answered 2026-10-26 10:05, processed 2026-10-26 10:20: "A, retry once"'
 */
function answerBlock(record) {
    const handedOver = record.handedOverAt === null ? '' : `, handed over ${record.handedOverAt}`;
    const processed = record.processedAt === null ? '' : `, processed ${record.processedAt}`;
    return `${recordId(record)}, answered ${record.answeredAt}${handedOver}${processed}: "${record.answer}"`;
}

/**
 * Gives the answers as a reader sees them: the log's records, then the answers of an older register's answered file
 * that are not in the log yet, as the fold would add them. Changes nothing.
 * @param {object} location from registerLocation
 * @returns {{eol: string, records: object[]}} the log's break style and the records
 * @throws {Error} for a broken log or answered file
 */
function answersView(location) {
    const log = loadAnswersLog(location);
    const old = readAnsweredFile(location);
    return { eol: log.eol, records: old === null ? log.records : [...log.records, ...notYetInLog(log.records, old)] };
}

/**
 * Folds an older register's answered file into the answers log, under the lock: each of its answers not already in
 * the log (same id, answeredAt and answer) becomes a record, in file order, the log is written, then the file is
 * deleted. A fold cut short by a crash finishes cleanly when run again; a file with only its header is deleted too.
 * @param {object} location from registerLocation
 * @returns {number|null} how many records were added, or null when there was no answered file
 * @throws {Error} for a broken log or answered file; nothing is written then
 */
function foldAnsweredFile(location) {
    const old = readAnsweredFile(location);
    if (old === null) {
        return null;
    }
    let added = [];
    if (old.length > 0) {
        const log = loadAnswersLog(location);
        added = notYetInLog(log.records, old);
        if (added.length > 0) {
            log.records.push(...added);
            writeAnswersLog(location, log);
        }
    }
    fs.rmSync(location.answeredPath);
    return added.length;
}

/**
 * Reads an older register's answered file into records: every non-blank line under an id heading must be an answer
 * line '- Answered: <time>: "<words>"'; the lines above the first heading are its header.
 * @param {object} location from registerLocation
 * @returns {object[]|null} the records in file order, or null when there is no answered file
 * @throws {Error} naming the file and the line of any other line under a heading
 */
function readAnsweredFile(location) {
    const text = readText(location.answeredPath);
    if (text === null) {
        return null;
    }
    const records = [];
    let id = null;
    splitLines(text).forEach((line, i) => {
        const heading = HEADING.exec(line);
        if (heading) {
            id = canonicalId(heading[1]) ?? heading[1];
            return;
        }
        if (id === null || line.trim() === '') {
            return;
        }
        const answer = OLD_ANSWER_LINE.exec(line.trimEnd());
        if (!answer) {
            throw new Error(`${location.answeredPath} line ${i + 1} is not an answer line of the form - Answered: <time>: "<words>". Nothing was written; fix that line by hand, then run the command again.`);
        }
        records.push(newRecord(id, answer[1], answer[2]));
    });
    return records;
}

/**
 * Gives the records of an answered file that the log does not hold yet: none with the same id, answeredAt and answer.
 * @param {object[]} logRecords the log's records
 * @param {object[]} oldRecords from readAnsweredFile
 * @returns {object[]} the records still to add, in file order
 */
function notYetInLog(logRecords, oldRecords) {
    return oldRecords.filter((o) => !logRecords.some((r) => recordId(r) === o.id && r.answeredAt === o.answeredAt && r.answer === o.answer));
}

// ---------------------------------------------------------------------------------------------------------------
// Files: lock, load, serialise
// ---------------------------------------------------------------------------------------------------------------

/**
 * Runs a change of the register files while holding the register's lock.
 * @param {object} location from registerLocation
 * @param {() => *} change the change to make
 * @returns {*} what the change returns
 * @throws {Error} when the lock is not free within the wait; nothing was written then
 */
function withRegisterLock(location, change) {
    const release = acquireLock(location.lockPath, { waitMs: location.lockWaitMs, staleMs: location.lockStaleMs });
    if (!release) {
        throw new Error(`the decision register is busy: ${location.lockPath} stayed taken for ${location.lockWaitMs / 1000} s. Nothing was written; run the command again.`);
    }
    try {
        return change();
    } finally {
        release();
    }
}

/**
 * Runs a write command under the register's lock. First, in a repo that does not commit the register, it makes sure
 * the register's files are in the repo's info/exclude (so a folder that existed before, a first write cut short, or
 * a file added by a newer version, such as the answers log, still stays out of git); then it folds an older
 * register's answered file into the answers log.
 * @param {object} location from registerLocation
 * @param {(folded: number|null) => *} change the change to make; gets what foldAnsweredFile returned
 * @param {() => void} [precheck] runs first under the lock, before anything is written; throws to write nothing
 * @returns {*} what the change returns
 */
function withRegisterWrite(location, change, precheck = () => {}) {
    return withRegisterLock(location, () => {
        precheck();
        if (location.gitDir && !location.commitInRepo) {
            const excludePath = excludeFilePath(location.gitDir);
            location.excludeLines.forEach((line) => ensureExcludeLine(excludePath, line));
        }
        return change(foldAnsweredFile(location));
    });
}

/**
 * Reads a register file into its header lines and entries. A missing or empty file gets the given header.
 * @param {string} filePath a register file
 * @param {string[]} newHeader header lines for a file that does not exist yet
 * @returns {{eol: string, header: string[], entries: object[]}} the file's break style, header and entries
 */
function loadRegister(filePath, newHeader) {
    const text = readText(filePath) ?? '';
    const lines = splitLines(text);
    const header = lines.length === 0 ? [...newHeader] : [];
    const groups = [];
    for (const line of lines) {
        if (HEADING.test(line)) {
            groups.push([line]);
        } else if (groups.length > 0) {
            groups[groups.length - 1].push(line);
        } else {
            header.push(line);
        }
    }
    trimTrailingBlankLines(header);
    groups.forEach(trimTrailingBlankLines);
    return { eol: detectEol(text) ?? NEW_FILE_EOL, header, entries: groups.map(makeEntry) };
}

/**
 * Makes an entry from its lines, reading its heading such as "## D-7 · question · blocking".
 * @param {string[]} lines the heading and the lines under it
 * @returns {{id: string, path: number[], kind: string|null, blocking: boolean, raised: string|null,
 *   lines: string[]}} the entry; id is in its written form whatever the heading spells
 */
function makeEntry(lines) {
    const id = canonicalId(HEADING.exec(lines[0])[1]) ?? HEADING.exec(lines[0])[1];
    const parts = lines[0].slice(3).split(` ${DOT} `);
    const raised = lines.map((line) => RAISED.exec(line)).find(Boolean);
    return {
        id,
        path: idPathOf(id),
        kind: parts[1] ?? null,
        blocking: parts[2] === 'blocking',
        raised: raised ? (raised[2] ? `${raised[1]} ${raised[2]}` : raised[1]) : null,
        lines,
    };
}

/**
 * Removes blank lines from the end of a list of lines, in place.
 * @param {string[]} lines the lines
 */
function trimTrailingBlankLines(lines) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }
}

/**
 * Writes a register back as text: the header, then each entry after one blank line.
 * @param {{eol: string, header: string[], entries: object[]}} register from loadRegister
 * @returns {string} the file text in the register's own line-break style
 */
function serializeRegister(register) {
    const lines = [...register.header];
    for (const entry of register.entries) {
        if (lines.length > 0) {
            lines.push('');
        }
        lines.push(...entry.lines);
    }
    return joinLines(lines, register.eol);
}

/**
 * Header lines of a new open file.
 * @param {object} location from registerLocation
 * @returns {string[]} title, blank line, what the file is
 */
function openHeader(location) {
    return ['# Open decisions', '', `Questions, initiatives and issues not yet closed, newest last. Each waits for the user (Status: ${WAITING_FOR_USER}) until the user answers, then for an agent (Status: ${WAITING_FOR_AGENT}); every answer is kept, in the user's words, in ${path.basename(location.answersLogPath)}. The agent closes the entry, which moves it to ${path.basename(location.resolvedPath)}, or adds a Follow up line that explains or talks about it further and sets it back to ${WAITING_FOR_USER}.`];
}

/**
 * Header lines of a new resolved file.
 * @param {object} location from registerLocation
 * @returns {string[]} title, blank line, what the file is
 */
function resolvedHeader(location) {
    return ['# Resolved decisions', '', `Questions, initiatives and issues that are closed, newest last. Each ends with a Final answer line (the user's last answer), a Summary line and a Resolved line that gives the outcome; every answer the user gave is kept in ${path.basename(location.answersLogPath)}.`];
}
