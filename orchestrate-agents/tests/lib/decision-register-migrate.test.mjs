// In-process tests of migrate on registers of the three generations of layout: the user's words in a Resolved line
// (the oldest), Answered and Still open lines inside the entries (the middle one), and today's answers log with Final
// answer, Summary and Follow up lines. Covers the move of every answer to the log in time order, the Final answer of a
// closed entry, Still open renamed, the old descriptions, a run cut short, a malformed old line, and the log's two
// guards. The command line is tested in tests/scripts/register.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    UsageError, addEntry, answerEntry, checkAnswersLogChange, checkAnswersLogInsertions, closeEntry, migrateRegister,
    registerLocation,
} from '../../lib/decision-register.mjs';
import { tempFileName } from '../../lib/text-file.mjs';
import { makeScratchDir, removeScratchDir } from '../helpers/scratch.mjs';

const DOT = String.fromCodePoint(0xb7);
const REGISTER = {
    folder: 'decisions',
    openFile: 'OPEN_DECISIONS_CLAUDE.md',
    answeredFile: 'ANSWERED_DECISIONS_CLAUDE.md',
    resolvedFile: 'RESOLVED_DECISIONS_CLAUDE.md',
    answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
    lockWaitSeconds: 10,
    lockStaleSeconds: 60,
};
// The descriptions the middle generation wrote under the titles, as the real registers hold them.
const OPEN_GEN2 = 'Questions, initiatives and issues not yet closed, newest last. Each waits for the user (Status: waiting-for-user) until the user answers, then for an agent (Status: waiting-for-agent), with the answer in ANSWERED_DECISIONS_CLAUDE.md. The agent closes it, which moves it to RESOLVED_DECISIONS_CLAUDE.md, or keeps it open, which sets it back to waiting-for-user.';
const RESOLVED_GEN2 = 'Questions, initiatives and issues that are closed, newest last. Each holds the user\'s answers, each with its time and words, and ends with a Resolved line that gives the outcome.';
// Words with inner quotes of both kinds, non-ASCII, an emoji and a line separator (which an old line kept inside it).
const HOSTILE = 'I said "go" and \'stay\', za\u017c\u00f3\u0142\u0107 \u{1f600}\u2028next "line"';
const NOW = new Date(2026, 9, 26, 19, 0);
const NOW_STAMP = '2026-10-26 19:00';
const ENTRY = {
    kind: 'question', blocking: false, urgency: 'low', raisedBy: 'lead demo', task: 'Demo', what: 'x', example: 'y',
    options: ['A', 'B'], recommendation: 'A', meanwhile: 'wait', evidence: ['none'],
};

/**
 * One answers-log record with its keys in the stored order.
 * @param {string} id the id
 * @param {string} answeredAt when the user answered
 * @param {string} answer the user's words
 * @param {string|null} [processedAt] when an agent processed it
 * @returns {object} the record
 */
function rec(id, answeredAt, answer, processedAt = null) {
    return { id, answeredAt, answer, handedOverAt: null, processedAt };
}

/**
 * Joins lines with CRLF and ends the last one with it, as a CRLF register file is stored.
 * @param {string[]} lines the lines
 * @returns {string} the file text
 */
function crlf(lines) {
    return `${lines.join('\r\n')}\r\n`;
}

/**
 * A heading of an entry.
 * @param {string} id the id as written
 * @param {string} [kind] question, initiative or issue
 * @returns {string} the heading line
 */
function heading(id, kind = 'question') {
    return `## ${id} ${DOT} ${kind} ${DOT} not-blocking`;
}

/**
 * Makes a scratch working folder that is not a repo and returns its register location.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @returns {object} location from registerLocation
 */
function scratchLocation(t) {
    const dir = makeScratchDir('mig');
    t.after(() => removeScratchDir(dir));
    // The scratch folder also stands for teamState.folder, where this PC's settings file is looked for.
    return registerLocation(dir, { teamState: { folder: dir }, pcSettings: { file: 'pc-settings.json' }, register: REGISTER });
}

/**
 * Says whether an error is a plain Error (not a UsageError) whose message matches every pattern.
 * @param {...RegExp} patterns what the message must hold
 * @returns {(e: Error) => boolean} the check for assert.throws
 */
function broken(...patterns) {
    return (e) => !(e instanceof UsageError) && patterns.every((p) => p.test(e.message));
}

/**
 * Gives the descriptions a register made today writes under the titles of its open and resolved files.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @returns {{open: string, resolved: string}} the third line of each file
 */
function todaysDescriptions(t) {
    const loc = scratchLocation(t);
    addEntry(loc, ENTRY, new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'A' }, new Date(2026, 9, 26, 8, 1));
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'A.' }, new Date(2026, 9, 26, 8, 2));
    return {
        open: fs.readFileSync(loc.openPath, 'utf8').split('\r\n')[2],
        resolved: fs.readFileSync(loc.resolvedPath, 'utf8').split('\r\n')[2],
    };
}

// The answers log before migrate: a record stored with its keys in another order and a key a hand edit added (it must
// stay byte for byte), one at the same minute as a migrated answer, and one later than every migrated answer.
const OLD_LOG = [
    '{"answeredAt":"2026-10-26 14:19","id":"D-14","answer":"no leaks","handedOverAt":null,"processedAt":"2026-10-26 14:25","note":"hand edit"}',
    JSON.stringify(rec('D-31', '2026-10-26 14:47', 'other', '2026-10-26 15:00')),
    JSON.stringify(rec('D-20', '2026-10-26 16:03', 'Chose B', '2026-10-26 16:03')),
];

// The open file before migrate: an entry of the middle generation, and one of today's whose follow-up text holds
// lines that look like old fields (text, never converted).
const OPEN_BEFORE = [
    '# Open decisions', '', OPEN_GEN2, '',
    heading('D-30'), '- Status: waiting-for-agent', '- Raised: 2026-10-26 09:00 by lead demo', '- What: open one',
    '- Answered: 2026-10-26 10:00: "first open answer"', '- Still open: Which half?  ',
    '- Answered: 2026-10-26 10:30: "the "second" half"', '',
    heading('D-32'), '- Status: waiting-for-user', '- What: untouched', '- Follow up: 2026-10-26 12:00: Sure?',
    '  - Answered: 2026-10-26 12:01: "text, not a field"', '  - Still open: text', '  - Resolved: 2026-10-26 12:02, answered: "text',
];

// The resolved file before migrate: the oldest generation (D-0001, D-2), the middle one (D-9, D-13-1), a middle entry
// that a newer close already gave a Final answer (D-14), one without a Resolved line (D-15), and today's (D-20).
const RESOLVED_BEFORE = [
    '# Resolved decisions', '', RESOLVED_GEN2, '',
    heading('D-0001'), '- Raised: 2026-10-25 18:00 by lead demo', '- What: z', '- Resolved: 2026-10-25 19:04, answered: "yes, D-0004 too"', '',
    heading('D-2', 'issue'), '- What: w', `- Resolved: 2026-10-25 22:05, accepted: "${HOSTILE}"`, '',
    heading('D-9', 'initiative'), '- What: a', '- Answered: 2026-10-26 11:36: "sounds good"', '- Resolved: 2026-10-26 11:36, accepted', '',
    heading('D-13-1'), '- What: b', '- Answered: 2026-10-26 14:38: "explain "further""', '- Still open: Your question first: no new decision.',
    '- Answered: 2026-10-26 14:47: "better idea"', '- Resolved: 2026-10-26 14:59, answered', '',
    heading('D-14', 'issue'), '- What: d', '- Answered: 2026-10-26 14:19: "no leaks"', '- Final answer: 2026-10-26 14:19: "no leaks"',
    '- Summary: No decision leaks between repos.', '- Resolved: 2026-10-26 14:25, answered', '',
    heading('D-15', 'issue'), '- What: e', '- Answered: 2026-10-26 15:14: "no Resolved line"', '',
    heading('D-20', 'issue'), '- What: c', '- Follow up: 2026-10-26 15:30: More?', '  - Answered: 2026-10-26 15:31: "text"',
    '- Final answer: 2026-10-26 16:03: "Chose B"', '- Summary: Left as it is.', '- Resolved: 2026-10-26 16:03, accepted',
];

/**
 * Writes the register of three generations into a location.
 * @param {object} loc location from registerLocation
 */
function writeThreeGenerations(loc) {
    fs.mkdirSync(loc.folderPath, { recursive: true });
    fs.writeFileSync(loc.openPath, crlf(OPEN_BEFORE));
    fs.writeFileSync(loc.resolvedPath, crlf(RESOLVED_BEFORE));
    fs.writeFileSync(loc.answersLogPath, crlf(OLD_LOG));
}

/**
 * The three files of the register of three generations after migrate.
 * @param {{open: string, resolved: string}} today from todaysDescriptions
 * @returns {{open: string, resolved: string, log: string}} the expected texts
 */
function expectedAfter(today) {
    const open = [
        '# Open decisions', '', today.open, '',
        heading('D-30'), '- Status: waiting-for-agent', '- Raised: 2026-10-26 09:00 by lead demo', '- What: open one',
        '- Follow up: Which half?  ', '',
        ...OPEN_BEFORE.slice(OPEN_BEFORE.indexOf(heading('D-32'))),
    ];
    const resolved = [
        '# Resolved decisions', '', today.resolved, '',
        heading('D-1'), '- Raised: 2026-10-25 18:00 by lead demo', '- What: z',
        '- Final answer: 2026-10-25 19:04: "yes, D-0004 too"', '- Resolved: 2026-10-25 19:04, answered', '',
        heading('D-2', 'issue'), '- What: w', `- Final answer: 2026-10-25 22:05: "${HOSTILE}"`, '- Resolved: 2026-10-25 22:05, accepted', '',
        heading('D-9', 'initiative'), '- What: a', '- Final answer: 2026-10-26 11:36: "sounds good"', '- Resolved: 2026-10-26 11:36, accepted', '',
        heading('D-13-1'), '- What: b', '- Follow up: Your question first: no new decision.',
        '- Final answer: 2026-10-26 14:47: "better idea"', '- Resolved: 2026-10-26 14:59, answered', '',
        heading('D-14', 'issue'), '- What: d', '- Final answer: 2026-10-26 14:19: "no leaks"',
        '- Summary: No decision leaks between repos.', '- Resolved: 2026-10-26 14:25, answered', '',
        heading('D-15', 'issue'), '- What: e', '- Final answer: 2026-10-26 15:14: "no Resolved line"', '',
        ...RESOLVED_BEFORE.slice(RESOLVED_BEFORE.indexOf(heading('D-20', 'issue'))),
    ];
    const log = [
        JSON.stringify(rec('D-1', '2026-10-25 19:04', 'yes, D-0004 too', '2026-10-25 19:04')),
        JSON.stringify(rec('D-2', '2026-10-25 22:05', HOSTILE, '2026-10-25 22:05')),
        JSON.stringify(rec('D-30', '2026-10-26 10:00', 'first open answer', NOW_STAMP)),
        JSON.stringify(rec('D-30', '2026-10-26 10:30', 'the "second" half', NOW_STAMP)),
        JSON.stringify(rec('D-9', '2026-10-26 11:36', 'sounds good', '2026-10-26 11:36')),
        OLD_LOG[0],
        JSON.stringify(rec('D-13-1', '2026-10-26 14:38', 'explain "further"', '2026-10-26 14:59')),
        JSON.stringify(rec('D-13-1', '2026-10-26 14:47', 'better idea', '2026-10-26 14:59')),
        OLD_LOG[1],
        JSON.stringify(rec('D-15', '2026-10-26 15:14', 'no Resolved line', NOW_STAMP)),
        OLD_LOG[2],
    ];
    return { open: crlf(open), resolved: crlf(resolved), log: crlf(log) };
}

const REPORT = [
    'ANSWERS_LOG_CLAUDE.jsonl: 8 records added',
    'OPEN_DECISIONS_CLAUDE.md: 2 answers moved to the log, 1 Still open line renamed, description updated',
    'RESOLVED_DECISIONS_CLAUDE.md: 1 id renamed, 7 answers moved to the log, 5 Final answer lines added, 1 Still open line renamed, description updated',
].map((l) => `${l}\n`).join('');

/**
 * Reads the three files of a register.
 * @param {object} loc location from registerLocation
 * @returns {{open: string, resolved: string, log: string}} their texts
 */
function readAll(loc) {
    return {
        open: fs.readFileSync(loc.openPath, 'utf8'),
        resolved: fs.readFileSync(loc.resolvedPath, 'utf8'),
        log: fs.readFileSync(loc.answersLogPath, 'utf8'),
    };
}

// ---------------------------------------------------------------------------------------------------------------
// Moving the answers
// ---------------------------------------------------------------------------------------------------------------

test('migrate moves every old answer to the log in time order, gives each closed entry one Final answer, its last, and renames Still open', (t) => {
    const today = todaysDescriptions(t);
    const loc = scratchLocation(t);
    writeThreeGenerations(loc);
    assert.equal(migrateRegister(loc, NOW), REPORT);
    const after = readAll(loc);
    const expected = expectedAfter(today);
    assert.equal(after.log, expected.log, 'old records byte for byte and in order; new ones in time order, first within a minute');
    assert.equal(after.resolved, expected.resolved);
    assert.equal(after.open, expected.open);
});

test('a second migrate changes nothing, and a migrate cut short after the log or the resolved file finishes without a duplicate', (t) => {
    const loc = scratchLocation(t);
    writeThreeGenerations(loc);
    migrateRegister(loc, NOW);
    const done = readAll(loc);
    assert.match(migrateRegister(loc, new Date(2026, 9, 26, 20, 0)), /already in the current layout/);
    assert.deepEqual(readAll(loc), done);

    // Cut short after the log was written: both register files are still old.
    fs.writeFileSync(loc.openPath, crlf(OPEN_BEFORE));
    fs.writeFileSync(loc.resolvedPath, crlf(RESOLVED_BEFORE));
    const report = migrateRegister(loc, new Date(2026, 9, 26, 20, 5));
    assert.doesNotMatch(report, /records? added/);
    assert.match(report, /RESOLVED_DECISIONS_CLAUDE\.md: 1 id renamed, 7 answers moved to the log/);
    assert.deepEqual(readAll(loc), done, 'no record twice, and the first run\'s processedAt kept');

    // Cut short after the resolved file was written: only the open file is still old.
    fs.writeFileSync(loc.openPath, crlf(OPEN_BEFORE));
    assert.equal(migrateRegister(loc, new Date(2026, 9, 26, 20, 10)),
        'OPEN_DECISIONS_CLAUDE.md: 2 answers moved to the log, 1 Still open line renamed, description updated\n');
    assert.deepEqual(readAll(loc), done);
});

test('migrate writes the log first, then the resolved file, then the open file, and a run stopped by a failed write finishes on the next run', (t) => {
    const today = todaysDescriptions(t);
    const loc = scratchLocation(t);
    writeThreeGenerations(loc);
    const expected = expectedAfter(today);
    // A folder in the place of a file's temp file makes the write of that file fail before it replaces the file.
    const block = (filePath) => {
        const folder = path.join(loc.folderPath, tempFileName(path.basename(filePath), process.pid));
        fs.mkdirSync(folder);
        return folder;
    };
    const resolvedBlock = block(loc.resolvedPath);
    assert.throws(() => migrateRegister(loc, NOW));
    assert.deepEqual(readAll(loc), { ...expected, open: crlf(OPEN_BEFORE), resolved: crlf(RESOLVED_BEFORE) }, 'only the log written');
    fs.rmdirSync(resolvedBlock);
    const openBlock = block(loc.openPath);
    assert.throws(() => migrateRegister(loc, NOW));
    assert.deepEqual(readAll(loc), { ...expected, open: crlf(OPEN_BEFORE) }, 'the resolved file written next, without a second record');
    fs.rmdirSync(openBlock);
    assert.equal(migrateRegister(loc, NOW), 'OPEN_DECISIONS_CLAUDE.md: 2 answers moved to the log, 1 Still open line renamed, description updated\n');
    assert.deepEqual(readAll(loc), expected);
});

test('an LF register and an LF log stay LF, and an answer with no log yet starts a CRLF log', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const openLines = ['# Open decisions', '', 'x', '', heading('D-1'), '- Status: waiting-for-user', '- Answered: 2026-10-26 10:00: "lf"'];
    fs.writeFileSync(loc.openPath, `${openLines.join('\n')}\n`);
    fs.writeFileSync(loc.answersLogPath, `${JSON.stringify(rec('D-9', '2026-10-26 11:00', 'later', '2026-10-26 11:05'))}\n`);
    migrateRegister(loc, NOW);
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), `${openLines.slice(0, -1).join('\n')}\n`);
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), [
        JSON.stringify(rec('D-1', '2026-10-26 10:00', 'lf', NOW_STAMP)),
        JSON.stringify(rec('D-9', '2026-10-26 11:00', 'later', '2026-10-26 11:05')), '',
    ].join('\n'));

    const fresh = scratchLocation(t);
    fs.mkdirSync(fresh.folderPath);
    fs.writeFileSync(fresh.resolvedPath, `# Resolved decisions\n\nx\n\n${heading('D-1')}\n- Resolved: 2026-10-25 19:04, answered: "yes"\n`);
    assert.equal(migrateRegister(fresh, NOW),
        'ANSWERS_LOG_CLAUDE.jsonl: 1 record added\nRESOLVED_DECISIONS_CLAUDE.md: 1 answer moved to the log, 1 Final answer line added\n');
    assert.equal(fs.readFileSync(fresh.answersLogPath, 'utf8'), `${JSON.stringify(rec('D-1', '2026-10-25 19:04', 'yes', '2026-10-25 19:04'))}\r\n`);
    assert.equal(fs.readFileSync(fresh.resolvedPath, 'utf8'),
        `# Resolved decisions\n\nx\n\n${heading('D-1')}\n- Final answer: 2026-10-25 19:04: "yes"\n- Resolved: 2026-10-25 19:04, answered\n`);
});

// ---------------------------------------------------------------------------------------------------------------
// A line migrate cannot read
// ---------------------------------------------------------------------------------------------------------------

test('an old line that does not parse stops migrate before anything is written, naming the file, the line number and the line', (t) => {
    const cases = [
        ['open', '- Answered: yesterday: "x"'],
        ['open', '- Answered: 2026-10-26 10:00: no quotes'],
        ['open', '- Answered:2026-10-26 10:00: "no space"'],
        ['resolved', '- Answered: 2026-10-26 10:00: "unclosed'],
        ['resolved', '- Answered: 2026-10-26 10:00: "half\rof a line"'],
        ['resolved', '- Resolved: 2026-10-26 10:00, answered: "unclosed'],
        ['resolved', '- Resolved: 2026-10-26 10:00 answered: "no comma"'],
        ['resolved', '- Resolved: 2026-10-26, answered: "no minute"'],
        ['open', '- Still open:'],
        ['open', '- Still open:   '],
    ];
    const answeredText = '# Answered decisions\r\n\r\nx\r\n\r\n## D-40\r\n- Answered: 2026-10-24 10:00: "folded only by a run that succeeds"\r\n';
    for (const [file, bad] of cases) {
        const loc = scratchLocation(t);
        writeThreeGenerations(loc);
        const filePath = file === 'open' ? loc.openPath : loc.resolvedPath;
        const before = file === 'open' ? OPEN_BEFORE : RESOLVED_BEFORE;
        fs.writeFileSync(filePath, crlf([...before, bad]));
        fs.writeFileSync(loc.answeredPath, answeredText);
        const texts = readAll(loc);
        const shown = bad.split('\r')[0];
        assert.throws(() => migrateRegister(loc, NOW),
            (e) => broken(new RegExp(`${file === 'open' ? 'OPEN' : 'RESOLVED'}_DECISIONS_CLAUDE\\.md line ${before.length + 1}\\b`))(e) && e.message.includes(shown),
            bad);
        assert.deepEqual(readAll(loc), texts, `nothing written: ${bad}`);
        assert.equal(fs.readFileSync(loc.answeredPath, 'utf8'), answeredText, `answered file not folded: ${bad}`);
    }
});

// ---------------------------------------------------------------------------------------------------------------
// The two guards of the answers log
// ---------------------------------------------------------------------------------------------------------------

test('migrate\'s guard lets records be inserted anywhere and refuses a record dropped, changed or moved', () => {
    const a = rec('D-1', '2026-10-26 09:00', 'x');
    const b = rec('D-2', '2026-10-26 09:01', 'y', '2026-10-26 09:30');
    const n = rec('D-3', '2026-10-25 08:00', 'old', '2026-10-25 08:00');
    const filePath = 'C:\\r\\ANSWERS_LOG_CLAUDE.jsonl';
    for (const after of [[a, b], [n, a, b], [a, n, b], [a, b, n], [n, a, n, b, n]]) {
        assert.doesNotThrow(() => checkAnswersLogInsertions([a, b], after, filePath), JSON.stringify(after));
    }
    const refused = [
        ['a record dropped', [a, n]],
        ['records reordered', [b, n, a]],
        ['the words changed', [a, { ...b, answer: 'y ' }]],
        ['a time changed', [{ ...a, answeredAt: '2026-10-26 09:05' }, b]],
        ['processedAt set', [{ ...a, processedAt: '2026-10-26 10:00' }, b]],
        ['processedAt changed', [a, { ...b, processedAt: '2026-10-26 09:31' }]],
        ['handedOverAt set', [a, { ...b, handedOverAt: '2026-10-26 09:20' }]],
        ['an id changed', [a, { ...b, id: 'D-9' }]],
    ];
    for (const [name, after] of refused) {
        assert.throws(() => checkAnswersLogInsertions([a, b], after, filePath), broken(/ANSWERS_LOG_CLAUDE\.jsonl/, /migrate/), name);
    }
});

test('every other writer checks with the strict guard: answer refuses a write that would only be an insertion into the log on disk', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, ENTRY, new Date(2026, 9, 26, 8, 0));
    const stored = JSON.stringify(rec('D-1', '2026-10-26 09:00', 'a'));
    fs.writeFileSync(loc.answersLogPath, crlf([stored]));
    // The guard re-reads the log just before the write. That read finds only the record the answer is about to add, so
    // the write would put the stored record before it: an insertion, which only migrate's guard allows.
    const readFileSync = fs.readFileSync;
    let logReads = 0;
    t.mock.method(fs, 'readFileSync', function readWithAnotherLog(file, ...rest) {
        if (file === loc.answersLogPath) {
            logReads += 1;
            if (logReads > 1) {
                return `${JSON.stringify(rec('D-1', '2026-10-26 10:00', 'n'))}\r\n`;
            }
        }
        return readFileSync.call(this, file, ...rest);
    });
    assert.throws(() => answerEntry(loc, { id: 'D-1', answer: 'n' }, new Date(2026, 9, 26, 10, 0)), broken(/refused to write/, /ANSWERS_LOG_CLAUDE\.jsonl/));
    t.mock.restoreAll();
    assert.equal(logReads, 2, 'one read to load the log, one by the guard');
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), crlf([stored]), 'nothing written');
});

test('every other writer\'s guard still refuses a record inserted before a stored one', () => {
    const a = rec('D-1', '2026-10-26 09:00', 'x');
    const b = rec('D-2', '2026-10-26 09:01', 'y');
    const n = rec('D-3', '2026-10-25 08:00', 'old');
    for (const after of [[n, a, b], [a, n, b]]) {
        assert.throws(() => checkAnswersLogChange([a, b], after, 'C:\\r\\ANSWERS_LOG_CLAUDE.jsonl'), broken(/ANSWERS_LOG_CLAUDE\.jsonl/), JSON.stringify(after));
    }
});
