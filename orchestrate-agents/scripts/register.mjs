// The decision register's command line (plan section 6.2). Leads add questions, initiatives and issues; the user's
// answer is recorded with answer (by the main session, or by the user's own tool) and goes to the answers log; each
// answer is handed to the main session once; an agent then closes the entry with a summary that holds the final answer,
// or follows it up; anyone lists the entries and searches the answers. Exit 0 on success, 2 when the command was used
// wrongly (the problem is named on stderr), 1 when something else broke (a broken answers log included: stderr names
// the file and the line; a busy register too: nothing was written, run it again).
//
//   node register.mjs add --file <entry.json> [--root <dir>]
//   node register.mjs answer --id D-7 --answer $answer [--handed-over] [--root <dir>]
//   node register.mjs handover [--when-all-answered] [--root <dir>]
//   node register.mjs close --id D-7 --outcome <answered|accepted|overruled|fixed|wont-fix> --summary $summary [--root <dir>]
//   node register.mjs follow-up --id D-7 --text $text [--root <dir>]
//   node register.mjs keep-open --id D-7 --still-open $text [--root <dir>]   (the old spelling of follow-up)
//   node register.mjs list [--open] [--answered] [--resolved] [--ids D-1,D-4] [--root <dir>]
//   node register.mjs answers [--ids D-7,D-2-5] [--words $words] [--json] [--root <dir>]
//   node register.mjs summary [--root <dir>]
//   node register.mjs migrate [--root <dir>]
//
// $answer holds the user's words, $summary the decision with its final answer included, $text what explains,
// elaborates or talks about the decision further, $words the text to search for. Set each in a single-quoted
// here-string, never in double quotes: in double quotes PowerShell runs $(...), drops $5 and makes `n a line break.
//
// answer --handed-over is for an answer the user typed in the chat: the main session already holds the words, so the
// record counts as handed over at its answer time. Without it (an answer given in the Decisions pane) the answer waits
// to be handed over. handover hands every answer that waits (neither handed over nor processed) to the main session
// and marks it, so neither the decision answers watch nor the prompt hook hands it over again: it prints a first line
// 'DECISION ANSWERS | D-20, D-21' (each id once, in log order), then per answer its label and time and the words
// exactly as stored, answers one blank line apart, then what to do with them; nothing at all when no answer waits.
// handover --when-all-answered (the decision answers watch's look between its full ones) prints nothing and marks
// nothing while any open entry still waits for the user (its Status is waiting-for-user, empty or missing); once none
// does, it does exactly what handover does. It checks and hands over under one lock, so an entry added in between
// cannot slip past.
// list --answered shows the answers no agent has processed yet, per id; answers searches every answer in the log,
// processed or not: --ids keeps those ids, --words keeps answers that hold the text in any case, --json prints each
// record as its JSON line exactly as stored.
// A follow-up may hold anything the agent needs to explain, elaborate or talk about the decision further: several
// lines, an example. Its line breaks are kept; pass it like --answer, in a single-quoted here-string. It never changes
// the entry's options: changed options are a new child entry (add with "parent": "D-7").
// migrate moves a register written by an older version to today's layout and prints one line per file it changed
// (nothing to change: one line that says so; safe to run again, and a run cut short finishes on the next run). It
// folds an old answered file into the answers log, writes old ids D-0007 as D-7, gives an open entry without one a
// Status line, and puts today's description under each title. The answers kept inside the entries move to the answers
// log, in time order and each once: each '- Answered: <time>: "<words>"' line leaves its entry, and a Resolved line
// that holds the words ('- Resolved: <time>, <outcome>: "<words>"') loses them. A closed entry gets
// '- Final answer: <time>: "<words>"' of its last answer, right before its Resolved line, unless it has one; no
// Summary line is made up. Each '- Still open: <text>' line becomes '- Follow up: <text>'. A line that starts like
// one of these but cannot be read stops it with exit 1, the file, the line number and the line on stderr, and
// nothing changed.
// --root replaces the working folder as the starting point; the register lives at the repo root found from there.
// It must be an existing folder. Each option that takes a value takes the next argument whatever it starts with,
// so --answer "- go with A" keeps the user's words as written.

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { loadConfig, skillDirOf } from '../lib/config.mjs';
import {
    UsageError, addEntry, answerEntry, closeEntry, followUpEntry, handOverAnswers, handOverText, listAnswers, listEntries,
    migrateRegister, registerLocation, summaryLine,
} from '../lib/decision-register.mjs';
import { readText } from '../lib/text-file.mjs';

const OPTIONS = {
    file: { type: 'string' },
    root: { type: 'string' },
    id: { type: 'string' },
    outcome: { type: 'string' },
    answer: { type: 'string' },
    'handed-over': { type: 'boolean' },
    'when-all-answered': { type: 'boolean' },
    summary: { type: 'string' },
    text: { type: 'string' },
    'still-open': { type: 'string' },
    words: { type: 'string' },
    json: { type: 'boolean' },
    open: { type: 'boolean' },
    answered: { type: 'boolean' },
    resolved: { type: 'boolean' },
    ids: { type: 'string' },
};

// The options each command accepts, and those it requires. A form is named in the message about a missing option,
// for a command whose required options changed.
const COMMANDS = {
    add: { allowed: ['file', 'root'], required: ['file'] },
    answer: { allowed: ['id', 'answer', 'handed-over', 'root'], required: ['id', 'answer'] },
    handover: { allowed: ['when-all-answered', 'root'], required: [] },
    close: {
        allowed: ['id', 'outcome', 'summary', 'root'],
        required: ['id', 'outcome', 'summary'],
        form: 'close --id D-7 --outcome <answered|accepted|overruled|fixed|wont-fix> --summary $summary; set $summary in a single-quoted here-string, never in double quotes',
    },
    'follow-up': { allowed: ['id', 'text', 'root'], required: ['id', 'text'] },
    'keep-open': { allowed: ['id', 'still-open', 'root'], required: ['id', 'still-open'] },
    list: { allowed: ['open', 'answered', 'resolved', 'ids', 'root'], required: [] },
    answers: { allowed: ['ids', 'words', 'json', 'root'], required: [] },
    summary: { allowed: ['root'], required: [] },
    migrate: { allowed: ['root'], required: [] },
};

// ---------------------------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------------------------

try {
    process.stdout.write(runCommand(process.argv.slice(2)));
} catch (error) {
    process.stderr.write(`register: ${error.message}\n`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
}

/**
 * Parses the command line, runs the command and gives its output.
 * @param {string[]} argv arguments after the script path
 * @returns {string} what to print on stdout
 */
function runCommand(argv) {
    const { command, values } = parseCommandLine(argv);
    if (values.root !== undefined) {
        requireExistingFolder(values.root);
    }
    const location = registerLocation(values.root ?? process.cwd(), loadConfig(skillDirOf(import.meta.url)));
    if (command === 'add') {
        return `${addEntry(location, readEntryFile(values.file), new Date())}\n`;
    }
    if (command === 'answer') {
        answerEntry(location, { id: values.id, answer: values.answer, handedOver: values['handed-over'] === true }, new Date());
        return '';
    }
    if (command === 'handover') {
        return handOverOutput(handOverAnswers(location, new Date(), { whenAllAnswered: values['when-all-answered'] === true }));
    }
    if (command === 'close') {
        closeEntry(location, { id: values.id, outcome: values.outcome, summary: values.summary }, new Date());
        return '';
    }
    if (command === 'follow-up' || command === 'keep-open') {
        followUpEntry(location, { id: values.id, text: values.text ?? values['still-open'] }, new Date());
        return '';
    }
    if (command === 'list') {
        const flagged = ['open', 'answered', 'resolved'].filter((scope) => values[scope]);
        return listEntries(location, { scopes: flagged.length > 0 ? flagged : ['open', 'answered', 'resolved'], ids: idList(values.ids) });
    }
    if (command === 'answers') {
        return listAnswers(location, { ids: idList(values.ids), words: values.words, json: values.json === true });
    }
    if (command === 'migrate') {
        return migrateRegister(location, new Date());
    }
    const line = summaryLine(location);
    return line === '' ? '' : `${line}\n`;
}

/**
 * Gives what handover prints: the first line the decision answers watch looks for, then the answers and the
 * instruction as the prompt hook adds them.
 * @param {object[]} handed from handOverAnswers
 * @returns {string} for example 'DECISION ANSWERS | D-20, D-21\n...' ending with a line break; '' when none was handed
 */
function handOverOutput(handed) {
    if (handed.length === 0) {
        return '';
    }
    const ids = [...new Set(handed.map((r) => r.id))];
    return `DECISION ANSWERS | ${ids.join(', ')}\n${handOverText(handed)}\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Arguments and input
// ---------------------------------------------------------------------------------------------------------------

/**
 * Splits the command line into the command and its options, and checks both.
 * @param {string[]} argv arguments after the script path
 * @returns {{command: string, values: object}} the command name and the parsed options
 * @throws {UsageError} for a missing or unknown command, an unknown option, or a missing required option
 */
function parseCommandLine(argv) {
    let parsed;
    try {
        parsed = parseArgs({ args: joinOptionValues(argv), options: OPTIONS, allowPositionals: true, strict: true });
    } catch (error) {
        throw new UsageError(error.message);
    }
    const [command, ...extra] = parsed.positionals;
    if (command === undefined) {
        throw new UsageError(`missing command (${Object.keys(COMMANDS).join(', ')})`);
    }
    if (command === 'resolve') {
        throw new UsageError('resolve is gone (2026-10-26): record the user\'s words with answer --id <id> --answer <words>, then close --id <id> --outcome <outcome> --summary <text> or follow-up --id <id> --text <text>');
    }
    if (!Object.hasOwn(COMMANDS, command)) {
        throw new UsageError(`unknown command '${command}' (${Object.keys(COMMANDS).join(', ')})`);
    }
    if (extra.length > 0) {
        throw new UsageError(`unexpected argument '${extra[0]}'`);
    }
    const spec = COMMANDS[command];
    for (const name of Object.keys(parsed.values)) {
        if (!spec.allowed.includes(name)) {
            throw new UsageError(`${command} does not take --${name}`);
        }
    }
    for (const name of spec.required) {
        if (parsed.values[name] === undefined) {
            throw new UsageError(`${command} needs --${name}${spec.form ? ` (the form is: ${spec.form})` : ''}`);
        }
    }
    return { command, values: parsed.values };
}

/**
 * Joins each option that takes a value with the argument after it ('--answer', '- go' becomes '--answer=- go').
 * parseArgs alone refuses a separate value that starts with '-' as ambiguous, and the user's words must be taken
 * as written (plan section 6.2).
 * @param {string[]} argv arguments after the script path
 * @returns {string[]} the same arguments with every value option in its '--name=value' form
 */
function joinOptionValues(argv) {
    const joined = [];
    for (let i = 0; i < argv.length; i += 1) {
        const name = argv[i].startsWith('--') ? argv[i].slice(2) : '';
        if (Object.hasOwn(OPTIONS, name) && OPTIONS[name].type === 'string' && i + 1 < argv.length) {
            joined.push(`${argv[i]}=${argv[i + 1]}`);
            i += 1;
        } else {
            joined.push(argv[i]);
        }
    }
    return joined;
}

/**
 * Splits an --ids value into its ids.
 * @param {string|undefined} text the --ids value, for example 'D-1, D-4'
 * @returns {string[]|undefined} the ids as typed (checked later), or undefined when --ids was not given
 */
function idList(text) {
    return text === undefined ? undefined : text.split(',').map((id) => id.trim()).filter(Boolean);
}

/**
 * Checks that --root names an existing folder, so a mistyped path never gets a register of its own.
 * @param {string} dir the --root value
 * @throws {UsageError} when the path is missing or is not a folder
 */
function requireExistingFolder(dir) {
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
        throw new UsageError(`--root ${dir} is not an existing folder`);
    }
}

/**
 * Reads and parses a lead's entry file.
 * @param {string} filePath path of the JSON file
 * @returns {*} the parsed JSON (validated later)
 * @throws {UsageError} when the file is missing or not valid JSON
 */
function readEntryFile(filePath) {
    const text = readText(filePath);
    if (text === null) {
        throw new UsageError(`entry file not found: ${filePath}`);
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new UsageError(`entry file ${filePath} is not valid JSON: ${error.message}`);
    }
}
