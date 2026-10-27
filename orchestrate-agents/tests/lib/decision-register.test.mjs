// In-process tests of the decision register: entry layout, validation, ids, answering, the answers log and its guard,
// folding an old answered file into the log, closing, following up, listing and searching answers, the summary line,
// the open items the hook reads and the migration of an older register. The command line, concurrency and
// info/exclude are tested through the real script in tests/scripts/register.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    HANDOVER_INSTRUCTION, UsageError, addEntry, answerEntry, canonicalId, checkAnswersLogChange, closeEntry, followUpEntry,
    formatEntryLines, handOverAnswers, handOverText, listAnswers, listEntries, migrateRegister, openItems,
    registerLocation, summaryLine, unprocessedAnswers, validateEntry,
} from '../../lib/decision-register.mjs';
import { makeScratchDir, removeScratchDir } from '../helpers/scratch.mjs';

const DOT = String.fromCodePoint(0xb7);
const ALL = ['open', 'answered', 'resolved'];
const REGISTER = {
    folder: 'decisions',
    openFile: 'OPEN_DECISIONS_CLAUDE.md',
    answeredFile: 'ANSWERED_DECISIONS_CLAUDE.md',
    resolvedFile: 'RESOLVED_DECISIONS_CLAUDE.md',
    answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
    lockWaitSeconds: 10,
    lockStaleSeconds: 60,
};

/**
 * The settings registerLocation reads, with this PC's settings file looked for in a scratch folder.
 * @param {string} stateDir scratch folder that stands for teamState.folder
 * @param {object} [register] the register settings
 * @returns {object} the settings
 */
function settings(stateDir, register = REGISTER) {
    return { teamState: { folder: stateDir }, pcSettings: { file: 'pc-settings.json' }, register };
}

/**
 * One answers-log record with its keys in the stored order.
 * @param {string} id the id
 * @param {string} answeredAt when the user answered
 * @param {string} answer the user's words
 * @param {string|null} [processedAt] when an agent processed it
 * @param {string|null} [handedOverAt] when it was handed to the main session
 * @returns {object} the record
 */
function rec(id, answeredAt, answer, processedAt = null, handedOverAt = null) {
    return { id, answeredAt, answer, handedOverAt, processedAt };
}

/**
 * The stored line of a record: what the log holds for it.
 * @param {object} record from rec
 * @returns {string} the JSON line without its line break
 */
function line(record) {
    return JSON.stringify(record);
}

/**
 * Reads the answers log of a CRLF register and parses every line, checking the file ends with one line break.
 * @param {object} loc location from registerLocation
 * @returns {object[]} the records in file order
 */
function logRecords(loc) {
    const text = fs.readFileSync(loc.answersLogPath, 'utf8');
    assert.equal(text.endsWith('\r\n') && !text.endsWith('\r\n\r\n'), true, 'one CRLF after the last record');
    return text.slice(0, -2).split('\r\n').map((l) => JSON.parse(l));
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
 * A complete, valid entry; fields can be overridden.
 * @param {object} [over] fields to replace
 * @returns {object} entry as the lead would write it to its JSON file
 */
function entry(over = {}) {
    return {
        kind: 'question',
        blocking: true,
        urgency: 'high',
        raisedBy: 'lead ksef-import (worker run 3)',
        task: 'KSeF import',
        what: 'Should a rejected invoice be retried?',
        example: 'Invoice 1001 for 250.00 PLN was rejected at 10:02.',
        options: ['A: retry once (1 hour)', 'B: leave it to the user (none).'],
        recommendation: 'A, because most rejections are timeouts.',
        meanwhile: 'work continues assuming A',
        evidence: ['temp\\ksef\\run3.log', 'src\\import.ts'],
        ...over,
    };
}

/**
 * Makes a scratch working folder that is not a repo and returns its register location.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @returns {object} location from registerLocation
 */
function scratchLocation(t) {
    const dir = makeScratchDir('reg');
    t.after(() => removeScratchDir(dir));
    return registerLocation(dir, settings(dir));
}

/**
 * Says whether an error is a UsageError whose message matches every pattern.
 * @param {...RegExp} patterns what the message must hold
 * @returns {(e: Error) => boolean} the check for assert.throws
 */
function usage(...patterns) {
    return (e) => e instanceof UsageError && patterns.every((p) => p.test(e.message));
}

/**
 * The headings' ids of a listing.
 * @param {string} text from listEntries
 * @returns {string[]|null} the ids in order
 */
function idsOf(text) {
    return text.match(/^## D-[\d-]+/gm)?.map((h) => h.slice(3)) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Entry layout, validation and ids
// ---------------------------------------------------------------------------------------------------------------

test('formatEntryLines gives the layout, with the Status and Urgency lines under the heading', () => {
    const lines = formatEntryLines('D-7', entry(), new Date(2026, 9, 25, 8, 10));
    assert.deepEqual(lines, [
        `## D-7 ${DOT} question ${DOT} blocking`,
        '- Status: waiting-for-user',
        '- Urgency: high',
        '- Raised: 2026-10-25 08:10 by lead ksef-import (worker run 3)',
        '- Task: KSeF import',
        '- What: Should a rejected invoice be retried?',
        '- Example: Invoice 1001 for 250.00 PLN was rejected at 10:02.',
        '- Options:',
        '  - A: retry once (1 hour).',
        '  - B: leave it to the user (none).',
        '- Recommendation: A, because most rejections are timeouts.',
        '- Meanwhile: work continues assuming A',
        '- Evidence: temp\\ksef\\run3.log, src\\import.ts',
    ]);
});

test('formatEntryLines turns every kind of line break into one space and keeps everything else', () => {
    const what = 'a\r\nb\nc\rd ‘q’ “w” & %PATH% zażółć \u{1f600}';
    const lines = formatEntryLines('D-1', entry({ what, blocking: false, kind: 'issue' }), new Date(2026, 0, 1));
    assert.equal(lines[0], `## D-1 ${DOT} issue ${DOT} not-blocking`);
    assert.equal(lines[5], '- What: a b c d ‘q’ “w” & %PATH% zażółć \u{1f600}');
});

test('validateEntry names the unknown kind or urgency, a missing field, a wrong type and an unknown field', () => {
    assert.throws(() => validateEntry(entry({ kind: 'idea' })), usage(/kind 'idea'/));
    assert.throws(() => validateEntry(entry({ urgency: 'asap' })), usage(/urgency 'asap'/, /high, medium, low/));
    for (const name of ['example', 'urgency']) {
        const missing = entry();
        delete missing[name];
        assert.throws(() => validateEntry(missing), usage(new RegExp(`missing field: ${name}`)), name);
    }
    assert.throws(() => validateEntry(entry({ blocking: 'yes' })), usage(/blocking/));
    assert.throws(() => validateEntry(entry({ what: '   ' })), usage(/what/));
    assert.throws(() => validateEntry(entry({ options: [] })), usage(/options/));
    assert.throws(() => validateEntry(entry({ evidence: 'a.log' })), usage(/evidence/));
    assert.throws(() => validateEntry(entry({ recomendation: 'x' })), usage(/recomendation/));
    assert.throws(() => validateEntry(entry({ parent: 'D-0' })), usage(/parent/));
    assert.throws(() => validateEntry(entry({ parent: 7 })), usage(/parent/));
    assert.throws(() => validateEntry(null), (e) => e instanceof UsageError);
    assert.doesNotThrow(() => validateEntry(entry()));
    assert.doesNotThrow(() => validateEntry(entry({ parent: 'D-2', urgency: 'low' })));
});

test('canonicalId writes every id one way and refuses what is no id', () => {
    assert.equal(canonicalId('D-0007'), 'D-7');
    assert.equal(canonicalId(' D-7 '), 'D-7');
    assert.equal(canonicalId('D-02-05'), 'D-2-5');
    assert.equal(canonicalId('D-2-5-1'), 'D-2-5-1');
    for (const text of ['7', 'D-', 'D-0', 'D-1-0', 'D-1--2', 'd-1', 'D-1a', '', null, 7]) {
        assert.equal(canonicalId(text), null, String(text));
    }
});

test('ids continue after the highest top-level number in any file, written without padding', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.resolvedPath, '# Resolved decisions\r\n\r\nx\r\n\r\n## D-0041 · issue · blocking\r\n- What: old\r\n');
    fs.writeFileSync(loc.openPath, '# Open decisions\r\n\r\nx\r\n\r\n## D-0009 · issue · blocking\r\n- What: y\r\n\r\n## D-41-3 · issue · blocking\r\n- What: z\r\n');
    assert.equal(addEntry(loc, entry(), new Date()), 'D-42');
    fs.writeFileSync(loc.answeredPath, '# Answered decisions\r\n\r\nx\r\n\r\n## D-50\r\n- Answered: 2026-10-26 10:00: "y"\r\n');
    assert.equal(addEntry(loc, entry(), new Date()), 'D-51', 'the answered file counts too');
    fs.appendFileSync(loc.answersLogPath, `${line(rec('D-0060', '2026-10-26 10:00', 'z'))}\r\n`);
    assert.equal(addEntry(loc, entry(), new Date()), 'D-61', 'an id with answers in the log is never given again');
});

test('a child gets the next number under its parent, at any depth; an unknown parent is refused', (t) => {
    const loc = scratchLocation(t);
    const now = new Date(2026, 9, 26, 9, 0);
    assert.equal(addEntry(loc, entry(), now), 'D-1');
    assert.equal(addEntry(loc, entry(), now), 'D-2');
    assert.equal(addEntry(loc, entry({ parent: 'D-2' }), now), 'D-2-1');
    assert.equal(addEntry(loc, entry({ parent: 'D-0002' }), now), 'D-2-2', 'an old-form parent id is the same id');
    assert.equal(addEntry(loc, entry({ parent: 'D-2-2' }), now), 'D-2-2-1');
    assert.equal(addEntry(loc, entry({ parent: 'D-1' }), now), 'D-1-1');
    assert.equal(addEntry(loc, entry(), now), 'D-3', 'children do not move the top-level count');
    assert.throws(() => addEntry(loc, entry({ parent: 'D-9' }), now), usage(/parent D-9/));
    answerEntry(loc, { id: 'D-1', answer: 'yes' }, now);
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'yes' }, now);
    assert.equal(addEntry(loc, entry({ parent: 'D-1' }), now), 'D-1-2', 'a resolved parent still takes children');
});

// ---------------------------------------------------------------------------------------------------------------
// Answering, closing, following up
// ---------------------------------------------------------------------------------------------------------------

test('answer sets the entry waiting for the agent and appends one record to the answers log, words exactly as given', (t) => {
    const loc = scratchLocation(t);
    const now = new Date(2026, 9, 25, 8, 10);
    assert.equal(addEntry(loc, entry(), now), 'D-1');
    assert.equal(addEntry(loc, entry({ kind: 'initiative', blocking: false }), now), 'D-2');
    const before = listEntries(loc, { scopes: ['open'], ids: ['D-1'] });

    assert.equal(answerEntry(loc, { id: 'D-0001', answer: 'Yes, "retry" once\r\nthen stop' }, new Date(2026, 9, 25, 9, 2)), 'D-1');
    assert.equal(listEntries(loc, { scopes: ['open'], ids: ['D-1'] }), before.replace('- Status: waiting-for-user', '- Status: waiting-for-agent'));
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'),
        '{"id":"D-1","answeredAt":"2026-10-25 09:02","answer":"Yes, \\"retry\\" once\\r\\nthen stop","handedOverAt":null,"processedAt":null}\r\n');
    assert.equal(fs.existsSync(loc.answeredPath), false, 'nothing writes the answered file');
    assert.equal(listEntries(loc, { scopes: ['answered'] }), '## D-1\r\n- Answered: 2026-10-25 09:02: "Yes, "retry" once then stop"\r\n');

    answerEntry(loc, { id: 'D-2', answer: 'zażółć \u{1f600} 中文' }, new Date(2026, 9, 25, 9, 3));
    const bytes = fs.readFileSync(loc.answersLogPath);
    assert.equal(bytes[0], 0x7b, 'no BOM');
    assert.ok(bytes.toString('utf8').includes('"answer":"zażółć \u{1f600} 中文"'), 'non-ASCII written as characters');
    assert.deepEqual(logRecords(loc).map((r) => r.id), ['D-1', 'D-2'], 'records stay in the order they were recorded');
});

test('close writes the entry with its last answer as Final answer, the summary and the outcome, and marks its records processed', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    addEntry(loc, entry({ what: 'other' }), new Date(2026, 9, 25, 8, 11));
    const before = listEntries(loc, { scopes: ['open'], ids: ['D-1'] });
    answerEntry(loc, { id: 'D-1', answer: 'first try' }, new Date(2026, 9, 25, 9, 0));
    answerEntry(loc, { id: 'D-2', answer: 'later' }, new Date(2026, 9, 25, 9, 1));
    answerEntry(loc, { id: 'D-1', answer: 'Yes, "retry" once\r\nthen stop' }, new Date(2026, 9, 25, 9, 2));

    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'Retry a rejected\r\ninvoice once.' }, new Date(2026, 9, 25, 9, 5));
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ['open'] })), ['D-2']);
    assert.equal(listEntries(loc, { scopes: ['resolved'] }),
        `${before.replace('- Status: waiting-for-user\r\n', '')}- Final answer: 2026-10-25 09:02: "Yes, "retry" once then stop"\r\n- Summary: Retry a rejected invoice once.\r\n- Resolved: 2026-10-25 09:05, answered\r\n`);
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), [
        line(rec('D-1', '2026-10-25 09:00', 'first try', '2026-10-25 09:05')),
        line(rec('D-2', '2026-10-25 09:01', 'later')),
        line(rec('D-1', '2026-10-25 09:02', 'Yes, "retry" once\r\nthen stop', '2026-10-25 09:05')), '',
    ].join('\r\n'));
    assert.equal(listEntries(loc, { scopes: ['answered'] }), '## D-2\r\n- Answered: 2026-10-25 09:01: "later"\r\n');
});

test('follow-up adds a Follow up line, sends the entry back to the user and marks the answers processed; a later close takes the last answer', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: '1 and 2 yes' }, new Date(2026, 9, 26, 9, 0));
    answerEntry(loc, { id: 'D-1', answer: 'and 3 no' }, new Date(2026, 9, 26, 9, 1));
    assert.equal(listEntries(loc, { scopes: ['answered'] }), '## D-1\r\n- Answered: 2026-10-26 09:00: "1 and 2 yes"\r\n- Answered: 2026-10-26 09:01: "and 3 no"\r\n');

    followUpEntry(loc, { id: 'D-1', text: 'what should 4\r\nbe?' }, new Date(2026, 9, 26, 9, 30));
    const open = listEntries(loc, { scopes: ['open'] }).split('\r\n');
    assert.equal(open[1], '- Status: waiting-for-user');
    assert.deepEqual(open.slice(-4), ['- Evidence: temp\\ksef\\run3.log, src\\import.ts', '- Follow up: 2026-10-26 09:30: what should 4', '  be?', '']);
    assert.equal(listEntries(loc, { scopes: ['answered'] }), '');
    assert.equal(openItems(loc)[0].status, 'waiting-for-user');
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-26 09:00', '1 and 2 yes', '2026-10-26 09:30'), rec('D-1', '2026-10-26 09:01', 'and 3 no', '2026-10-26 09:30')]);

    answerEntry(loc, { id: 'D-1', answer: '4 is A' }, new Date(2026, 9, 26, 10, 0));
    closeEntry(loc, { id: 'D-1', outcome: 'accepted', summary: '1 and 2 yes, 3 no, 4 is A.' }, new Date(2026, 9, 26, 10, 1));
    const resolved = listEntries(loc, { scopes: ['resolved'] }).split('\r\n');
    assert.equal(resolved.some((l) => l.startsWith('- Status: ') || l.startsWith('- Answered: ')), false, 'no Status line and no Answered line once closed');
    assert.deepEqual(resolved.slice(-6), [
        '- Follow up: 2026-10-26 09:30: what should 4', '  be?', '- Final answer: 2026-10-26 10:00: "4 is A"',
        '- Summary: 1 and 2 yes, 3 no, 4 is A.', '- Resolved: 2026-10-26 10:01, accepted', '',
    ]);
    assert.deepEqual(logRecords(loc).map((r) => r.processedAt), ['2026-10-26 09:30', '2026-10-26 09:30', '2026-10-26 10:01']);
    assert.equal(listEntries(loc, { scopes: ['open', 'answered'] }), '');
});

test('a follow-up with the same text after a new answer is a new line, not a re-run', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'a' }, new Date(2026, 9, 26, 9, 0));
    followUpEntry(loc, { id: 'D-1', text: 'which one?' }, new Date(2026, 9, 26, 9, 1));
    answerEntry(loc, { id: 'D-1', answer: 'b' }, new Date(2026, 9, 26, 9, 2));
    followUpEntry(loc, { id: 'D-1', text: 'which one?' }, new Date(2026, 9, 26, 9, 3));
    const open = listEntries(loc, { scopes: ['open'] }).split('\r\n');
    assert.deepEqual(open.slice(-3), ['- Follow up: 2026-10-26 09:01: which one?', '- Follow up: 2026-10-26 09:03: which one?', '']);
    assert.equal(open[1], '- Status: waiting-for-user');
});

test('a follow-up keeps several lines: the first after the time, every further one indented by two spaces, an empty one as two spaces', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'A, but not on Sunday' }, new Date(2026, 9, 26, 9, 0));
    const before = fs.readFileSync(loc.openPath, 'utf8');
    // Leading and trailing blank lines are dropped; CRLF, LF and a lone CR all break a line; text stays as given.
    const text = '\r\n  \nWhat about Sunday?\r\n\r\nExample: 10 invoices,  3 on Sunday\rzażółć \u{1f600}\n- Options: C\n  indented\n \n\r\n';
    followUpEntry(loc, { id: 'D-1', text }, new Date(2026, 9, 26, 9, 30));
    const block = [
        '- Follow up: 2026-10-26 09:30: What about Sunday?', '  ', '  Example: 10 invoices,  3 on Sunday',
        '  zażółć \u{1f600}', '  - Options: C', '    indented',
    ];
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'),
        `${before.replace('- Status: waiting-for-agent', '- Status: waiting-for-user')}${block.join('\r\n')}\r\n`);
});

test('a follow-up of several lines is written in the open file\'s own line endings', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    fs.writeFileSync(loc.openPath, fs.readFileSync(loc.openPath, 'utf8').replaceAll('\r\n', '\n'));
    answerEntry(loc, { id: 'D-1', answer: 'A' }, new Date(2026, 9, 26, 9, 0));
    followUpEntry(loc, { id: 'D-1', text: 'one\r\n\r\ntwo\rthree' }, new Date(2026, 9, 26, 9, 30));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.equal(openText.includes('\r'), false, 'no CR in an LF file');
    assert.ok(openText.endsWith('\n- Follow up: 2026-10-26 09:30: one\n  \n  two\n  three\n'), openText);
});

test('lines of a follow-up are text, not fields: list, summary, the open items, migrate and close are unchanged by them', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    addEntry(loc, entry({ what: 'other', blocking: false, urgency: 'low' }), new Date(2026, 9, 26, 8, 1));
    const items = openItems(loc);
    const summary = summaryLine(loc);
    const fieldsBefore = listEntries(loc, { scopes: ['open'], ids: ['D-1'] }).split('\r\n').filter((l) => !l.startsWith('- Status: '));
    answerEntry(loc, { id: 'D-1', answer: 'C' }, new Date(2026, 9, 26, 9, 0));
    const text = [
        'C is no option of this entry.', '- Options: C', '- Status: waiting-for-agent', '- Urgency: low', '- What: hijacked',
        `## D-9 ${DOT} question ${DOT} blocking`, '- Raised: 2020-01-01 00:00 by nobody', '- Recommendation: C',
    ].join('\n');
    followUpEntry(loc, { id: 'D-1', text }, new Date(2026, 9, 26, 9, 30));
    const block = ['- Follow up: 2026-10-26 09:30: C is no option of this entry.', ...text.split('\n').slice(1).map((l) => `  ${l}`)];

    assert.deepEqual(openItems(loc), items, 'status, urgency and what as before the answer');
    assert.equal(summaryLine(loc), summary);
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ['open'] })), ['D-1', 'D-2']);
    const listed = listEntries(loc, { scopes: ['open'], ids: ['D-1'] }).split('\r\n').filter((l) => !l.startsWith('- Status: '));
    assert.deepEqual(listed, [...fieldsBefore.slice(0, -1), ...block, '']);
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.match(migrateRegister(loc, new Date(2026, 9, 26, 9, 40)), /already in the current layout/);
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText, 'migrate changes nothing');

    answerEntry(loc, { id: 'D-1', answer: 'A then' }, new Date(2026, 9, 26, 10, 0));
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'A.' }, new Date(2026, 9, 26, 10, 1));
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ['resolved'] })), ['D-1']);
    assert.deepEqual(listEntries(loc, { scopes: ['resolved'] }).split('\r\n'), [
        ...fieldsBefore.slice(0, -1), ...block,
        '- Final answer: 2026-10-26 10:00: "A then"', '- Summary: A.', '- Resolved: 2026-10-26 10:01, answered', '',
    ]);
    assert.deepEqual(openItems(loc), [items[1]]);
});

test('a re-run of a follow-up of several lines after a crash adds nothing; one that differs in a later line is a new block', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'half' }, new Date(2026, 9, 26, 9, 0));
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');
    const text = 'Which half?\r\n\r\nThe first or\r\nthe second';
    followUpEntry(loc, { id: 'D-1', text }, new Date(2026, 9, 26, 9, 10));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.ok(openText.endsWith('- Follow up: 2026-10-26 09:10: Which half?\r\n  \r\n  The first or\r\n  the second\r\n'), openText);

    // A crash after the open file was written: the answer is still unprocessed; the same text adds no second block.
    fs.writeFileSync(loc.answersLogPath, logText);
    followUpEntry(loc, { id: 'D-1', text: '\n\nWhich half?\n\nThe first or\nthe second\n' }, new Date(2026, 9, 26, 9, 12));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-26 09:00', 'half', '2026-10-26 09:12')]);

    // The same first line with a different later line, or fewer lines, is a follow-up of its own.
    for (const [other, minute] of [['Which half?\n\nThe first or\nthe third', 13], ['Which half?\n\nThe first or', 14], ['Which half?', 15]]) {
        fs.writeFileSync(loc.openPath, openText);
        fs.writeFileSync(loc.answersLogPath, logText);
        followUpEntry(loc, { id: 'D-1', text: other }, new Date(2026, 9, 26, 9, minute));
        const added = other.split('\n').map((l, i) => (i === 0 ? `- Follow up: 2026-10-26 09:${minute}: ${l}` : `  ${l}`));
        assert.equal(fs.readFileSync(loc.openPath, 'utf8'), `${openText}${added.join('\r\n')}\r\n`, other);
    }
});

test('close finishes a move a crash cut short when the entry ends with a follow-up of several lines', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'A' }, new Date(2026, 9, 26, 9, 0));
    followUpEntry(loc, { id: 'D-1', text: 'Sure?\n\n- Options: C\nzaż' }, new Date(2026, 9, 26, 9, 10));
    answerEntry(loc, { id: 'D-1', answer: 'Sure.' }, new Date(2026, 9, 26, 9, 20));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'A, sure.' }, new Date(2026, 9, 26, 9, 30));
    const resolvedText = fs.readFileSync(loc.resolvedPath, 'utf8');
    assert.ok(resolvedText.includes('- Follow up: 2026-10-26 09:10: Sure?\r\n  \r\n  - Options: C\r\n  zaż\r\n- Final answer: 2026-10-26 09:20: "Sure."\r\n'), resolvedText);

    fs.writeFileSync(loc.openPath, openText);
    fs.writeFileSync(loc.answersLogPath, logText);
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'A, sure.' }, new Date(2026, 9, 26, 9, 35));
    assert.equal(fs.readFileSync(loc.resolvedPath, 'utf8'), resolvedText, 'not appended twice');
    assert.equal(listEntries(loc, { scopes: ['open', 'answered'] }), '');
    assert.deepEqual(logRecords(loc).map((r) => r.processedAt), ['2026-10-26 09:10', '2026-10-26 09:35']);
});

test('migrate gives an entry without a Status line one, even when its follow-up text holds a Status line', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'A' }, new Date(2026, 9, 26, 9, 0));
    followUpEntry(loc, { id: 'D-1', text: 'Sure?\n- Status: waiting-for-agent' }, new Date(2026, 9, 26, 9, 10));
    // A hand edit (or a merge) removed the entry's own Status line; the indented one is text of the follow-up.
    const withStatus = fs.readFileSync(loc.openPath, 'utf8');
    fs.writeFileSync(loc.openPath, withStatus.replace('- Status: waiting-for-user\r\n', ''));
    assert.match(migrateRegister(loc, new Date(2026, 9, 26, 9, 20)), /1 Status line added/);
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), withStatus);
    assert.ok(withStatus.endsWith('- Follow up: 2026-10-26 09:10: Sure?\r\n  - Status: waiting-for-agent\r\n'), withStatus);
});

test('answer refuses a malformed, unknown or resolved id and a blank answer, and writes nothing then', (t) => {
    const loc = scratchLocation(t);
    assert.throws(() => answerEntry(loc, { id: 'D-1', answer: 'x' }, new Date()), usage(/D-1/, /no register/));
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.throws(() => answerEntry(loc, { id: '7', answer: 'x' }, new Date()), usage(/'7'/, /D-7/));
    assert.throws(() => answerEntry(loc, { id: 'D-99', answer: 'x' }, new Date()), usage(/unknown id D-99/));
    assert.throws(() => answerEntry(loc, { id: 'D-1', answer: '  ' }, new Date()), usage(/--answer/));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);
    assert.equal(fs.existsSync(loc.answersLogPath), false);
    answerEntry(loc, { id: 'D-1', answer: 'ok' }, new Date());
    closeEntry(loc, { id: 'D-1', outcome: 'fixed', summary: 'ok' }, new Date());
    assert.throws(() => answerEntry(loc, { id: 'D-1', answer: 'x' }, new Date()), usage(/D-1 is already resolved/));
});

// ---------------------------------------------------------------------------------------------------------------
// Handing answers over to the main session
// ---------------------------------------------------------------------------------------------------------------

test('handOverAnswers hands every waiting record over once, in log order, with its entry\'s label, and marks it', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    addEntry(loc, entry({ what: 'Round VAT per line or per invoice?' }), new Date(2026, 9, 25, 8, 11));
    answerEntry(loc, { id: 'D-1', answer: 'A, retry once' }, new Date(2026, 9, 25, 9, 0));
    answerEntry(loc, { id: 'D-2', answer: 'B,\r\nbut only from September' }, new Date(2026, 9, 25, 9, 1));
    answerEntry(loc, { id: 'D-1', answer: 'A, and log it' }, new Date(2026, 9, 25, 9, 2));
    assert.deepEqual(unprocessedAnswers(loc).map((r) => [r.id, r.handedOverAt]), [['D-1', null], ['D-2', null], ['D-1', null]]);

    const handed = handOverAnswers(loc, new Date(2026, 9, 25, 9, 10));
    const label1 = 'D-1 "Should a rejected invoice be retried?"';
    const label2 = 'D-2 "Round VAT per line or per invoice?"';
    assert.deepEqual(handed, [
        { id: 'D-1', label: label1, answeredAt: '2026-10-25 09:00', answer: 'A, retry once', handedOverAt: '2026-10-25 09:10' },
        { id: 'D-2', label: label2, answeredAt: '2026-10-25 09:01', answer: 'B,\r\nbut only from September', handedOverAt: '2026-10-25 09:10' },
        { id: 'D-1', label: label1, answeredAt: '2026-10-25 09:02', answer: 'A, and log it', handedOverAt: '2026-10-25 09:10' },
    ]);
    const stored = fs.readFileSync(loc.answersLogPath, 'utf8');
    assert.equal(stored, [
        line(rec('D-1', '2026-10-25 09:00', 'A, retry once', null, '2026-10-25 09:10')),
        line(rec('D-2', '2026-10-25 09:01', 'B,\r\nbut only from September', null, '2026-10-25 09:10')),
        line(rec('D-1', '2026-10-25 09:02', 'A, and log it', null, '2026-10-25 09:10')), '',
    ].join('\r\n'));
    assert.deepEqual(unprocessedAnswers(loc).map((r) => r.handedOverAt), ['2026-10-25 09:10', '2026-10-25 09:10', '2026-10-25 09:10']);

    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 20)), [], 'nothing is handed over twice');
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), stored, 'and nothing is written then');
    answerEntry(loc, { id: 'D-2', answer: 'B' }, new Date(2026, 9, 25, 9, 30));
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 31)).map((r) => [r.id, r.answer, r.handedOverAt]), [['D-2', 'B', '2026-10-25 09:31']]);
});

test('handOverAnswers never hands over a processed record; a resolved entry gives its label, an unknown id gives the id alone', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    addEntry(loc, entry({ what: 'other' }), new Date(2026, 9, 25, 8, 11));
    answerEntry(loc, { id: 'D-1', answer: 'closed before the hand-over existed' }, new Date(2026, 9, 25, 9, 0));
    closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'Done.' }, new Date(2026, 9, 25, 9, 1));
    const processedLine = fs.readFileSync(loc.answersLogPath, 'utf8');
    assert.match(processedLine, /"handedOverAt":null,"processedAt":"2026-10-25 09:01"/);
    // Hand-made records: one for the resolved D-1, one for an id no file holds, one already handed over.
    fs.appendFileSync(loc.answersLogPath, [
        line(rec('D-0001', '2026-10-25 09:02', 'late words')),
        line(rec('D-9', '2026-10-25 09:03', 'orphan')),
        line(rec('D-1', '2026-10-25 09:04', 'already given', null, '2026-10-25 09:05')), '',
    ].join('\r\n'));
    answerEntry(loc, { id: 'D-2', answer: 'second entry' }, new Date(2026, 9, 25, 9, 6));

    const handed = handOverAnswers(loc, new Date(2026, 9, 25, 9, 10));
    assert.deepEqual(handed.map((r) => [r.id, r.label, r.answer]), [
        ['D-1', 'D-1 "Should a rejected invoice be retried?"', 'late words'],
        ['D-9', 'D-9', 'orphan'],
        ['D-2', 'D-2 "other"', 'second entry'],
    ]);
    const lines = fs.readFileSync(loc.answersLogPath, 'utf8').split('\r\n');
    assert.equal(`${lines[0]}\r\n`, processedLine, 'the processed record is written back byte for byte');
    assert.equal(lines[3], line(rec('D-1', '2026-10-25 09:04', 'already given', null, '2026-10-25 09:05')));
});

test('handOverAnswers folds an older answered file first and hands its answers over', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    fs.writeFileSync(loc.answeredPath, '# Answered decisions\r\n\r\nx\r\n\r\n## D-0001\r\n- Answered: 2026-10-24 10:00: "old words"\r\n');
    assert.deepEqual(unprocessedAnswers(loc).map((r) => [r.id, r.answer, r.handedOverAt]), [['D-1', 'old words', null]], 'a read sees it as if folded');
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 10)).map((r) => [r.id, r.answer, r.handedOverAt]), [['D-1', 'old words', '2026-10-25 09:10']]);
    assert.equal(fs.existsSync(loc.answeredPath), false);
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-24 10:00', 'old words', null, '2026-10-25 09:10')]);
});

test('handOverAnswers on a busy register waits only the wait it is given, throws the busy error and writes nothing', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    answerEntry(loc, { id: 'D-1', answer: 'A' }, new Date(2026, 9, 25, 9, 0));
    const stored = fs.readFileSync(loc.answersLogPath, 'utf8');
    fs.writeFileSync(loc.lockPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
    const started = Date.now();
    assert.throws(() => handOverAnswers(loc, new Date(), { lockWaitMs: 300 }), broken(/busy/, /stayed taken for 0\.3 s/));
    assert.ok(Date.now() - started < 3000, `waited ${Date.now() - started} ms`);
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), stored);
    fs.rmSync(loc.lockPath);
    assert.equal(handOverAnswers(loc, new Date(2026, 9, 25, 9, 10)).length, 1);
});

test('handOverAnswers without a register hands nothing over and creates nothing', (t) => {
    const loc = scratchLocation(t);
    assert.deepEqual(handOverAnswers(loc, new Date()), []);
    assert.deepEqual(handOverAnswers(loc, new Date(), { whenAllAnswered: true }), []);
    assert.deepEqual(unprocessedAnswers(loc), []);
    assert.equal(fs.existsSync(loc.folderPath), false);
});

test('handOverAnswers whenAllAnswered hands nothing over while an open entry waits for the user, then every waiting record once none does', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    addEntry(loc, entry({ what: 'Round VAT per line or per invoice?' }), new Date(2026, 9, 25, 8, 11));
    answerEntry(loc, { id: 'D-1', answer: 'A, retry once' }, new Date(2026, 9, 25, 9, 0));
    const stored = fs.readFileSync(loc.answersLogPath, 'utf8');
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 5), { whenAllAnswered: true }), [], 'D-2 still waits for the user');
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), stored, 'nothing is marked');
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);

    answerEntry(loc, { id: 'D-2', answer: 'B,\r\nbut only from September' }, new Date(2026, 9, 25, 9, 6));
    const handed = handOverAnswers(loc, new Date(2026, 9, 25, 9, 10), { whenAllAnswered: true });
    assert.deepEqual(handed, [
        { id: 'D-1', label: 'D-1 "Should a rejected invoice be retried?"', answeredAt: '2026-10-25 09:00', answer: 'A, retry once', handedOverAt: '2026-10-25 09:10' },
        { id: 'D-2', label: 'D-2 "Round VAT per line or per invoice?"', answeredAt: '2026-10-25 09:06', answer: 'B,\r\nbut only from September', handedOverAt: '2026-10-25 09:10' },
    ]);
    assert.deepEqual(logRecords(loc), [
        rec('D-1', '2026-10-25 09:00', 'A, retry once', null, '2026-10-25 09:10'),
        rec('D-2', '2026-10-25 09:06', 'B,\r\nbut only from September', null, '2026-10-25 09:10'),
    ]);
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 20), { whenAllAnswered: true }), [], 'nothing is handed over twice');
});

test('handOverAnswers whenAllAnswered counts an entry without a Status line, with an empty one, or followed up as waiting for the user; plain hand-over is unchanged', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.openPath, [
        '# Open decisions', '', 'x', '',
        `## D-0004 ${DOT} issue ${DOT} blocking`, '- Raised: 2026-10-20 10:00 by me', '- What: no status line', '',
        `## D-5 ${DOT} question ${DOT} blocking`, '- Status: ', '- What: empty status', '',
    ].join('\r\n'));
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 26, 9, 0), { whenAllAnswered: true }), []);
    answerEntry(loc, { id: 'D-4', answer: 'fix it' }, new Date(2026, 9, 26, 9, 1));
    const stored = fs.readFileSync(loc.answersLogPath, 'utf8');
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 26, 9, 2), { whenAllAnswered: true }), [], 'D-5 with an empty Status line waits');
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), stored);

    answerEntry(loc, { id: 'D-5', answer: 'leave it' }, new Date(2026, 9, 26, 9, 3));
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 26, 9, 4), { whenAllAnswered: true }).map((r) => [r.id, r.answer]),
        [['D-4', 'fix it'], ['D-5', 'leave it']]);

    followUpEntry(loc, { id: 'D-4', text: 'Which file?' }, new Date(2026, 9, 26, 9, 5));
    answerEntry(loc, { id: 'D-5', answer: 'leave it, really' }, new Date(2026, 9, 26, 9, 6));
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 26, 9, 7), { whenAllAnswered: true }), [], 'D-4 was sent back to the user');
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 26, 9, 8)).map((r) => [r.id, r.answer, r.handedOverAt]),
        [['D-5', 'leave it, really', '2026-10-26 09:08']], 'plain hand-over does not wait for D-4');
});

test('an answer recorded as handed over carries its answer time as handedOverAt and is never handed over again', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    answerEntry(loc, { id: 'D-1', answer: 'typed in the chat', handedOver: true }, new Date(2026, 9, 25, 9, 2));
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-25 09:02', 'typed in the chat', null, '2026-10-25 09:02')]);
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 25, 9, 10)), []);
    answerEntry(loc, { id: 'D-1', answer: 'given in the pane', handedOver: false }, new Date(2026, 9, 25, 9, 3));
    assert.deepEqual(logRecords(loc)[1], rec('D-1', '2026-10-25 09:03', 'given in the pane'));
});

test('handOverText gives each answer block one blank line apart, the words exactly as stored, then the instruction', () => {
    const text = handOverText([
        { id: 'D-20', label: 'D-20 "Retry a rejected invoice?"', answeredAt: '2026-10-26 10:05', answer: 'A, retry once', handedOverAt: 'x' },
        { id: 'D-21', label: 'D-21', answeredAt: '2026-10-26 10:07', answer: 'B,\r\nbut only from September\n', handedOverAt: 'x' },
    ]);
    assert.equal(text, [
        'D-20 "Retry a rejected invoice?", answered 2026-10-26 10:05:', 'A, retry once', '',
        'D-21, answered 2026-10-26 10:07:', 'B,\r\nbut only from September\n',
        HANDOVER_INSTRUCTION,
    ].join('\n'));
    assert.equal(HANDOVER_INSTRUCTION, 'For each answer: pass it, in the user\'s words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in double quotes.');
});

test('close refuses an unknown id, an unknown outcome, a missing or blank summary and an entry with no unprocessed answer, and changes nothing', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.throws(() => closeEntry(loc, { id: 'D-99', outcome: 'answered', summary: 's' }, new Date()), usage(/D-99/));
    assert.throws(() => closeEntry(loc, { id: 'D-1', outcome: 'maybe', summary: 's' }, new Date()), usage(/maybe/));
    assert.throws(() => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 's' }, new Date()), usage(/D-1 has no unprocessed answer/, /answer first/));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);
    assert.equal(fs.existsSync(loc.resolvedPath), false);
    answerEntry(loc, { id: 'D-1', answer: 'half' }, new Date(2026, 9, 25, 9, 0));
    const answeredOpen = fs.readFileSync(loc.openPath, 'utf8');
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');
    for (const summary of [undefined, '', ' \r\n ']) {
        assert.throws(() => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary }, new Date()), usage(/--summary/), String(summary));
    }
    followUpEntry(loc, { id: 'D-1', text: 'which half?' }, new Date(2026, 9, 25, 9, 1));
    const followedOpen = fs.readFileSync(loc.openPath, 'utf8');
    const followedLog = fs.readFileSync(loc.answersLogPath, 'utf8');
    assert.notEqual(followedOpen, answeredOpen);
    assert.notEqual(followedLog, logText);
    assert.throws(() => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 's' }, new Date()), usage(/D-1 has no unprocessed answer/));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), followedOpen);
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), followedLog);
    assert.equal(fs.existsSync(loc.resolvedPath), false);
});

test('close finishes a move a crash cut short, at either step, and never writes the entry twice', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    answerEntry(loc, { id: 'D-1', answer: 'done' }, new Date(2026, 9, 25, 8, 30));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');
    closeEntry(loc, { id: 'D-1', outcome: 'fixed', summary: 'Done.' }, new Date(2026, 9, 25, 9, 0));
    const resolvedText = fs.readFileSync(loc.resolvedPath, 'utf8');

    // A crash after the resolved file was written: the entry is still open and its answer still unprocessed.
    fs.writeFileSync(loc.openPath, openText);
    fs.writeFileSync(loc.answersLogPath, logText);
    closeEntry(loc, { id: 'D-1', outcome: 'fixed', summary: 'Done.' }, new Date(2026, 9, 25, 9, 5));
    assert.equal(fs.readFileSync(loc.resolvedPath, 'utf8'), resolvedText, 'not appended twice');
    assert.deepEqual([listEntries(loc, { scopes: ['open'] }), listEntries(loc, { scopes: ['answered'] })], ['', '']);
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-25 08:30', 'done', '2026-10-25 09:05')]);

    // A crash after the open file was written: only marking the answer processed is left.
    fs.writeFileSync(loc.answersLogPath, logText);
    closeEntry(loc, { id: 'D-1', outcome: 'fixed', summary: 'Done.' }, new Date(2026, 9, 25, 9, 6));
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-25 08:30', 'done', '2026-10-25 09:06')]);
    assert.equal(fs.readFileSync(loc.resolvedPath, 'utf8'), resolvedText);
    assert.throws(() => closeEntry(loc, { id: 'D-1', outcome: 'fixed', summary: 'Done.' }, new Date()), usage(/already resolved/));
});

test('close refuses an id the resolved file holds for a different item (a merge) and changes nothing', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const heading = `## D-5 ${DOT} question ${DOT} blocking`;
    const openText = `# Open decisions\r\n\r\nx\r\n\r\n${heading}\r\n- Status: waiting-for-agent\r\n- What: item X from branch B\r\n`;
    const logText = `${line(rec('D-5', '2026-10-24 10:00', 'Use option B for X'))}\r\n`;
    // Only "the open lines without the Status line, more lines, a Resolved line last" is the copy a crashed close
    // leaves; each of these is not.
    const others = [
        ['- What: item Y from branch A', '- Resolved: 2026-10-24 10:00, answered: "Y done"'],
        ['- What: item X from branch B', '- Meanwhile: a last line that is no Resolved line'],
        ['- What: item X from branch B'],
    ];
    for (const lines of others) {
        const resolvedText = `# Resolved decisions\r\n\r\nx\r\n\r\n${[heading, ...lines].join('\r\n')}\r\n`;
        fs.writeFileSync(loc.openPath, openText);
        fs.writeFileSync(loc.answersLogPath, logText);
        fs.writeFileSync(loc.resolvedPath, resolvedText);
        assert.throws(() => closeEntry(loc, { id: 'D-0005', outcome: 'answered', summary: 'B for X.' }, new Date()),
            usage(/D-5 /, /different item/, /D-6/), lines.join(' | '));
        assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText, 'open file unchanged');
        assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), logText, 'answers log unchanged');
        assert.equal(fs.readFileSync(loc.resolvedPath, 'utf8'), resolvedText, 'resolved file unchanged');
    }
});

test('every command refuses an id that is in the open file twice and changes nothing', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry({ what: 'item X' }), new Date(2026, 9, 25, 8, 0));
    addEntry(loc, entry({ what: 'item Z' }), new Date(2026, 9, 25, 8, 1));
    const openText = fs.readFileSync(loc.openPath, 'utf8').replace('## D-2', '## D-1');
    fs.writeFileSync(loc.openPath, openText);
    const calls = [
        () => answerEntry(loc, { id: 'D-1', answer: 'X it is' }, new Date()),
        () => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'X.' }, new Date()),
        () => followUpEntry(loc, { id: 'D-1', text: 'which X?' }, new Date()),
    ];
    for (const call of calls) {
        assert.throws(call, usage(/D-1/, /2 times/, /D-2/));
        assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText, 'open file unchanged');
    }
    assert.equal(fs.existsSync(loc.resolvedPath), false, 'no resolved file written');
    assert.equal(fs.existsSync(loc.answersLogPath), false, 'no answers log written');
});

test('follow-up refuses a blank text and an entry with no unprocessed answer, and a re-run after a crash only marks what was left', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    for (const blank of [' ', '\r\n \n\r\t\r\n']) {
        assert.throws(() => followUpEntry(loc, { id: 'D-1', text: blank }, new Date()), usage(/--text/), JSON.stringify(blank));
    }
    assert.throws(() => followUpEntry(loc, { id: 'D-1', text: 'x' }, new Date()), usage(/D-1 has no unprocessed answer/));
    answerEntry(loc, { id: 'D-1', answer: 'half' }, new Date(2026, 9, 26, 9, 0));
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');
    followUpEntry(loc, { id: 'D-1', text: 'the other\nhalf' }, new Date(2026, 9, 26, 9, 10));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    assert.ok(openText.endsWith('- Follow up: 2026-10-26 09:10: the other\r\n  half\r\n'));
    // A crash after the open file was written: the answer is still unprocessed, and no second line is added.
    fs.writeFileSync(loc.answersLogPath, logText);
    followUpEntry(loc, { id: 'D-1', text: 'the other\nhalf' }, new Date(2026, 9, 26, 9, 12));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);
    assert.deepEqual(logRecords(loc), [rec('D-1', '2026-10-26 09:00', 'half', '2026-10-26 09:12')]);
    assert.throws(() => followUpEntry(loc, { id: 'D-1', text: 'the other half' }, new Date()), usage(/no unprocessed answer/));
});

// ---------------------------------------------------------------------------------------------------------------
// The answers log: its guard, a broken log, folding an old answered file
// ---------------------------------------------------------------------------------------------------------------

test('the guard lets records be added and a null handedOverAt or processedAt become a time, and refuses everything else', () => {
    const a = rec('D-1', '2026-10-26 09:00', 'x');
    const b = rec('D-2', '2026-10-26 09:01', 'y');
    const allowed = [
        [[], [a]], [[a, b], [a, b]], [[a], [a, b]], [[a, b], [a, { ...b, processedAt: '2026-10-26 10:00' }]],
        [[a], [{ ...a, handedOverAt: '2026-10-26 09:30', processedAt: '2026-10-26 10:00' }]],
    ];
    for (const [before, after] of allowed) {
        assert.doesNotThrow(() => checkAnswersLogChange(before, after, 'C:\\r\\ANSWERS_LOG_CLAUDE.jsonl'), JSON.stringify(after));
    }
    const done = { ...a, handedOverAt: '2026-10-26 09:30', processedAt: '2026-10-26 10:00' };
    const refused = [
        ['a record dropped', [a, b], [a]],
        ['the first record dropped', [a, b], [b]],
        ['records reordered', [a, b], [b, a]],
        ['an id changed', [a], [{ ...a, id: 'D-9' }]],
        ['a time changed', [a], [{ ...a, answeredAt: '2026-10-26 09:05' }]],
        ['the words changed', [a], [{ ...a, answer: 'x ' }]],
        ['processedAt back to null', [done], [{ ...done, processedAt: null }]],
        ['processedAt changed', [done], [{ ...done, processedAt: '2026-10-26 11:00' }]],
        ['handedOverAt back to null', [done], [{ ...done, handedOverAt: null }]],
        ['handedOverAt changed', [done], [{ ...done, handedOverAt: '2026-10-26 09:31' }]],
    ];
    for (const [name, before, after] of refused) {
        assert.throws(() => checkAnswersLogChange(before, after, 'C:\\r\\ANSWERS_LOG_CLAUDE.jsonl'), broken(/ANSWERS_LOG_CLAUDE\.jsonl/), name);
    }
});

test('a broken answers log stops every command that reads it, names the file and the line, and nothing is written', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    answerEntry(loc, { id: 'D-1', answer: 'ok' }, new Date(2026, 9, 26, 9, 0));
    const good = fs.readFileSync(loc.answersLogPath, 'utf8');
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    const calls = [
        () => answerEntry(loc, { id: 'D-1', answer: 'more' }, new Date()),
        () => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 's' }, new Date()),
        () => followUpEntry(loc, { id: 'D-1', text: 'why?' }, new Date()),
        () => addEntry(loc, entry(), new Date()),
        () => listEntries(loc, { scopes: ['answered'] }),
        () => listAnswers(loc, {}),
    ];
    const brokenLogs = [
        ['not JSON', `${good}{"id":"D-1",\r\n`, /line 2/],
        ['no answer', `${good}{"id":"D-1","answeredAt":"2026-10-26 09:05"}\r\n`, /line 2/],
        ['a blank line', `${good}\r\n${good}`, /line 2/],
        ['no id', `{"answeredAt":"2026-10-26 09:05","answer":"x"}\r\n${good}`, /line 1/],
        ['not an object', `${good}[1,2]\r\n`, /line 2/],
    ];
    for (const [name, text, where] of brokenLogs) {
        fs.writeFileSync(loc.answersLogPath, text);
        for (const call of calls) {
            assert.throws(call, broken(/ANSWERS_LOG_CLAUDE\.jsonl/, where), name);
        }
        assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), text, `${name}: log unchanged`);
        assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText, `${name}: open file unchanged`);
    }
    assert.equal(fs.existsSync(loc.resolvedPath), false);
});

test('an LF answers log stays LF and keeps every stored line as it was', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 26, 8, 0));
    const stored = '{"id": "D-1", "answeredAt": "2026-10-26 08:30", "answer": "hand-made, spaced", "handedOverAt": null, "processedAt": null, "note": "kept"}';
    fs.writeFileSync(loc.answersLogPath, `${stored}\n`);
    answerEntry(loc, { id: 'D-1', answer: 'second' }, new Date(2026, 9, 26, 9, 0));
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), `${stored}\n${line(rec('D-1', '2026-10-26 09:00', 'second'))}\n`);
    followUpEntry(loc, { id: 'D-1', text: 'more?' }, new Date(2026, 9, 26, 9, 5));
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), [
        line({ ...rec('D-1', '2026-10-26 08:30', 'hand-made, spaced', '2026-10-26 09:05'), note: 'kept' }),
        line(rec('D-1', '2026-10-26 09:00', 'second', '2026-10-26 09:05')), '',
    ].join('\n'), 'a record a command changes is written in the stored key order, a hand-added key kept last');
});

test('every write folds an old answered file into the log once, in file order, and deletes it; reads see it unchanged', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 24, 8, 0));
    addEntry(loc, entry(), new Date(2026, 9, 24, 8, 1));
    answerEntry(loc, { id: 'D-2', answer: 'new style' }, new Date(2026, 9, 24, 9, 0));
    const answeredText = '# Answered decisions\r\n\r\nx\r\n\r\n## D-0001\r\n- Answered: 2026-10-24 10:00: "Use "B" for X"\r\n- Answered: 2026-10-24 10:05: "and C"\r\n\r\n## D-2\r\n- Answered: 2026-10-24 11:00: "two"\r\n';
    fs.writeFileSync(loc.answeredPath, answeredText);
    const logBefore = fs.readFileSync(loc.answersLogPath, 'utf8');
    const folded = [
        rec('D-2', '2026-10-24 09:00', 'new style'), rec('D-1', '2026-10-24 10:00', 'Use "B" for X'),
        rec('D-1', '2026-10-24 10:05', 'and C'), rec('D-2', '2026-10-24 11:00', 'two'),
    ];

    // Reading changes nothing and shows the old answers as if they were in the log.
    assert.equal(listEntries(loc, { scopes: ['answered'] }),
        '## D-2\r\n- Answered: 2026-10-24 09:00: "new style"\r\n- Answered: 2026-10-24 11:00: "two"\r\n\r\n## D-1\r\n- Answered: 2026-10-24 10:00: "Use "B" for X"\r\n- Answered: 2026-10-24 10:05: "and C"\r\n');
    assert.equal(listAnswers(loc, { json: true }), folded.map((r) => `${line(r)}\r\n`).join(''));
    assert.equal(fs.readFileSync(loc.answeredPath, 'utf8'), answeredText);
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), logBefore);

    addEntry(loc, entry(), new Date(2026, 9, 24, 12, 0));
    assert.deepEqual(logRecords(loc), folded);
    assert.equal(fs.existsSync(loc.answeredPath), false);
    const logText = fs.readFileSync(loc.answersLogPath, 'utf8');

    // A crash after the log was written and before the answered file was deleted: running again adds nothing.
    fs.writeFileSync(loc.answeredPath, answeredText);
    addEntry(loc, entry(), new Date(2026, 9, 24, 12, 1));
    assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), logText);
    assert.equal(fs.existsSync(loc.answeredPath), false);

    // An answered file with only its header is deleted too, and adds nothing.
    fs.writeFileSync(loc.answeredPath, '# Answered decisions\r\n\r\nNothing waits.\r\n');
    answerEntry(loc, { id: 'D-3', answer: 'three' }, new Date(2026, 9, 24, 13, 0));
    assert.deepEqual(logRecords(loc), [...folded, rec('D-3', '2026-10-24 13:00', 'three')]);
    assert.equal(fs.existsSync(loc.answeredPath), false);
});

test('close, follow-up and migrate fold an old answered file first, into a new CRLF log, and use its answers', (t) => {
    const answeredText = '# Answered decisions\r\n\r\nx\r\n\r\n## D-1\r\n- Answered: 2026-10-24 10:00: "old one"\r\n';
    const at = new Date(2026, 9, 24, 11, 0);
    const scenarios = [
        ['close', (loc) => closeEntry(loc, { id: 'D-1', outcome: 'answered', summary: 'Old.' }, at), '2026-10-24 11:00'],
        ['follow-up', (loc) => followUpEntry(loc, { id: 'D-1', text: 'why?' }, at), '2026-10-24 11:00'],
        ['migrate', (loc) => migrateRegister(loc, at), null],
    ];
    for (const [name, call, processedAt] of scenarios) {
        const loc = scratchLocation(t);
        addEntry(loc, entry(), new Date(2026, 9, 24, 8, 0));
        fs.writeFileSync(loc.answeredPath, answeredText);
        const output = call(loc);
        if (name === 'migrate') {
            assert.equal(output, 'ANSWERED_DECISIONS_CLAUDE.md: 1 answer moved to ANSWERS_LOG_CLAUDE.jsonl, file deleted\n');
        }
        assert.equal(fs.existsSync(loc.answeredPath), false, name);
        assert.equal(fs.readFileSync(loc.answersLogPath, 'utf8'), `${line(rec('D-1', '2026-10-24 10:00', 'old one', processedAt))}\r\n`, name);
    }
});

test('a malformed line in an old answered file stops every write, names the file and the line, and nothing is written', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 24, 8, 0));
    const openText = fs.readFileSync(loc.openPath, 'utf8');
    const answeredText = '# Answered decisions\r\n\r\nx\r\n\r\n## D-1\r\n- Answered: 2026-10-24 10:00: "fine"\r\n- Answered: yesterday: ok\r\n';
    fs.writeFileSync(loc.answeredPath, answeredText);
    const calls = [
        () => addEntry(loc, entry(), new Date()),
        () => answerEntry(loc, { id: 'D-1', answer: 'x' }, new Date()),
        () => migrateRegister(loc, new Date()),
        () => listEntries(loc, { scopes: ['answered'] }),
        () => listAnswers(loc, {}),
    ];
    for (const call of calls) {
        assert.throws(call, broken(/ANSWERED_DECISIONS_CLAUDE\.md/, /line 7/));
    }
    assert.equal(fs.readFileSync(loc.answeredPath, 'utf8'), answeredText);
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), openText);
    assert.equal(fs.existsSync(loc.answersLogPath), false);
});

// ---------------------------------------------------------------------------------------------------------------
// Searching the answers log
// ---------------------------------------------------------------------------------------------------------------

test('answers lists every record in log order, by id and by words in any case, as text blocks or as the stored JSON lines', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const stored = [
        '{"id":"D-20","answeredAt":"2026-10-26 10:05","answer":"A, retry once","handedOverAt":"2026-10-26 10:15","processedAt":"2026-10-26 10:20"}',
        '{"id": "D-2-5", "answeredAt": "2026-10-26 11:00", "answer": "Line one\\nZA\u017b\u00d3\u0141\u0106 retry", "handedOverAt": null, "processedAt": null}',
        '{"id":"D-7","answeredAt":"2026-10-26 12:00","answer":"no","handedOverAt":null,"processedAt":"2026-10-26 12:30"}',
    ];
    fs.writeFileSync(loc.answersLogPath, `${stored.join('\r\n')}\r\n`);
    const blocks = [
        'D-20, answered 2026-10-26 10:05, handed over 2026-10-26 10:15, processed 2026-10-26 10:20: "A, retry once"\r\n',
        'D-2-5, answered 2026-10-26 11:00: "Line one\nZA\u017b\u00d3\u0141\u0106 retry"\r\n',
        'D-7, answered 2026-10-26 12:00, processed 2026-10-26 12:30: "no"\r\n',
    ];
    assert.equal(listAnswers(loc, {}), blocks.join('\r\n'));
    assert.equal(listAnswers(loc, { json: true }), stored.map((l) => `${l}\r\n`).join(''), 'each line exactly as stored');
    assert.equal(listAnswers(loc, { ids: ['D-02-05', 'D-20'] }), [blocks[0], blocks[1]].join('\r\n'), 'log order, not the order asked');
    assert.equal(listAnswers(loc, { ids: ['D-99'] }), '');
    assert.equal(listAnswers(loc, { words: 'RETRY' }), [blocks[0], blocks[1]].join('\r\n'));
    assert.equal(listAnswers(loc, { words: 'za\u017c\u00f3\u0142\u0107' }), blocks[1]);
    assert.equal(listAnswers(loc, { ids: ['D-20'], words: 'retry' }), blocks[0]);
    assert.equal(listAnswers(loc, { ids: ['D-7'], words: 'retry' }), '');
    assert.equal(listAnswers(loc, { words: 'Line one\nza' }), blocks[1], 'words may span a line break');
    assert.equal(listAnswers(loc, { ids: ['D-7'], json: true }), `${stored[2]}\r\n`);
    assert.throws(() => listAnswers(loc, { ids: ['7', 'D-1'] }), usage(/'?7'?/, /D-7/));
});

test('answers with no log and no answered file gives nothing and creates nothing', (t) => {
    const loc = scratchLocation(t);
    assert.equal(listAnswers(loc, {}), '');
    assert.equal(listAnswers(loc, { json: true, ids: ['D-1'], words: 'x' }), '');
    assert.equal(fs.existsSync(loc.folderPath), false);
});

test('list --answered shows only unprocessed records, per id in the order of its first one, each on one line', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.answersLogPath, [
        line(rec('D-3', '2026-10-26 08:00', 'done', '2026-10-26 08:30')),
        line(rec('D-2', '2026-10-26 09:00', 'b1')),
        line(rec('D-1', '2026-10-26 09:01', 'a1', null, '2026-10-26 09:05')),
        line(rec('D-2', '2026-10-26 09:02', 'b2\r\nmore')),
        line(rec('D-1', '2026-10-26 09:03', 'a0', '2026-10-26 09:04')), '',
    ].join('\r\n'));
    assert.equal(listEntries(loc, { scopes: ['answered'] }),
        '## D-2\r\n- Answered: 2026-10-26 09:00: "b1"\r\n- Answered: 2026-10-26 09:02: "b2 more"\r\n\r\n## D-1\r\n- Answered: 2026-10-26 09:01: "a1"\r\n');
    assert.equal(listEntries(loc, { scopes: ['answered'], ids: ['D-1'] }), '## D-1\r\n- Answered: 2026-10-26 09:01: "a1"\r\n');
    assert.throws(() => listEntries(loc, { scopes: ['answered'], ids: ['D-3'] }), usage(/not in the answered file: D-3/));
});

// ---------------------------------------------------------------------------------------------------------------
// Files and listing
// ---------------------------------------------------------------------------------------------------------------

test('new files are CRLF with a title, a blank line and a description, entries one blank line apart', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10));
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 11));
    const text = fs.readFileSync(loc.openPath, 'utf8');
    assert.equal(/\r(?!\n)|(?<!\r)\n/.test(text), false, 'only CRLF');
    const lines = text.split('\r\n');
    assert.equal(lines[0], '# Open decisions');
    assert.equal(lines[1], '');
    assert.match(lines[2], /waiting-for-user.*waiting-for-agent.*ANSWERS_LOG_CLAUDE\.jsonl.*RESOLVED_DECISIONS_CLAUDE\.md.*Follow up/);
    assert.equal(lines[2].includes('ANSWERED_DECISIONS_CLAUDE.md'), false);
    assert.equal(lines[3], '');
    assert.equal(lines[4], `## D-1 ${DOT} question ${DOT} blocking`);
    assert.equal(lines[17], '');
    assert.equal(lines[18], `## D-2 ${DOT} question ${DOT} blocking`);
    assert.equal(text.endsWith('\r\n') && !text.endsWith('\r\n\r\n'), true);
});

test('an LF file stays LF, a hand edit with a lone CR or mixed breaks is written back in one style', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.openPath, '# Open decisions\n\nHand-made.\n\n## D-0004 · issue · not-blocking\n- Raised: 2026-10-20 10:00 by me\r- What: x\r\n');
    assert.equal(addEntry(loc, entry(), new Date(2026, 9, 25, 8, 10)), 'D-5');
    const text = fs.readFileSync(loc.openPath, 'utf8');
    assert.equal(/\r/.test(text), false, 'LF only');
    assert.match(text, /^## D-0004 .*\n- Raised: 2026-10-20 10:00 by me\n- What: x\n\n## D-5 /m);
});

test('an entry of an older register, without a Status line, waits for the user and can be answered and closed', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.openPath, `# Open decisions\r\n\r\nx\r\n\r\n## D-0004 ${DOT} issue ${DOT} blocking\r\n- Raised: 2026-10-20 10:00 by me\r\n- What: old\r\n`);
    assert.deepEqual(openItems(loc), [{ id: 'D-4', kind: 'issue', blocking: true, status: 'waiting-for-user', urgency: null, what: 'old' }]);
    answerEntry(loc, { id: 'D-4', answer: 'fix it' }, new Date(2026, 9, 26, 9, 0));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8').split('\r\n')[5], '- Status: waiting-for-agent', 'the Status line goes under the heading');
    closeEntry(loc, { id: 'D-4', outcome: 'fixed', summary: 'Fix it.' }, new Date(2026, 9, 26, 9, 1));
    assert.equal(listEntries(loc, { scopes: ['resolved'] }),
        `## D-0004 ${DOT} issue ${DOT} blocking\r\n- Raised: 2026-10-20 10:00 by me\r\n- What: old\r\n- Final answer: 2026-10-26 09:00: "fix it"\r\n- Summary: Fix it.\r\n- Resolved: 2026-10-26 09:01, fixed\r\n`);
    assert.match(fs.readFileSync(loc.resolvedPath, 'utf8').split('\r\n')[2], /Final answer.*Summary.*ANSWERS_LOG_CLAUDE\.jsonl/);
});

test('list filters by file and by id, takes old-form ids, and refuses ids that are not in the chosen files', (t) => {
    const loc = scratchLocation(t);
    for (let i = 0; i < 3; i += 1) {
        addEntry(loc, entry({ what: `item ${i}` }), new Date(2026, 9, 25, 8, i));
    }
    answerEntry(loc, { id: 'D-2', answer: 'ok' }, new Date(2026, 9, 25, 9, 0));
    answerEntry(loc, { id: 'D-3', answer: 'ok' }, new Date(2026, 9, 25, 9, 0));
    closeEntry(loc, { id: 'D-2', outcome: 'accepted', summary: 'ok' }, new Date(2026, 9, 25, 9, 1));
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ALL })), ['D-1', 'D-3', 'D-3', 'D-2']);
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ['resolved', 'open'] })), ['D-1', 'D-3', 'D-2'], 'always in file order');
    assert.deepEqual(idsOf(listEntries(loc, { scopes: ALL, ids: ['D-0003', 'D-2'] })), ['D-3', 'D-3', 'D-2']);
    assert.throws(() => listEntries(loc, { scopes: ['open'], ids: ['D-2'] }), usage(/not in the open file: D-2/));
    assert.throws(() => listEntries(loc, { scopes: ['open', 'answered'], ids: ['D-2'] }), usage(/open or answered file/));
    assert.throws(() => listEntries(loc, { scopes: ALL, ids: ['7'] }), usage(/7/));
});

test('a missing register lists nothing, summarises to nothing and has no open items, and reading creates nothing', (t) => {
    const loc = scratchLocation(t);
    assert.equal(listEntries(loc, { scopes: ALL }), '');
    assert.equal(summaryLine(loc), '');
    assert.deepEqual(openItems(loc), []);
    assert.equal(fs.existsSync(loc.folderPath), false);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.openPath, '');
    assert.equal(summaryLine(loc), '');
    fs.writeFileSync(loc.openPath, '# Open decisions\r\n\r\nNothing yet.\r\n');
    assert.equal(summaryLine(loc), '');
});

// ---------------------------------------------------------------------------------------------------------------
// Summary line and open items
// ---------------------------------------------------------------------------------------------------------------

test('summaryLine counts who each item waits for, names blocking items that wait for the user, and the oldest item', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry({ blocking: false }), new Date(2026, 9, 24, 10, 0)); // D-1
    addEntry(loc, entry({ blocking: false }), new Date(2026, 9, 23, 9, 0)); // D-2, raised earliest
    addEntry(loc, entry({ kind: 'issue', what: 'The import log grows by 2 GB a day.' }), new Date(2026, 9, 25, 8, 0)); // D-3 blocking
    addEntry(loc, entry({ kind: 'initiative', blocking: false }), new Date(2026, 9, 25, 8, 1)); // D-4
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 2)); // D-5 blocking
    addEntry(loc, entry(), new Date(2026, 9, 25, 8, 3)); // D-6 blocking, answered below
    answerEntry(loc, { id: 'D-6', answer: 'A' }, new Date(2026, 9, 25, 9, 0));
    answerEntry(loc, { id: 'D-1', answer: 'B' }, new Date(2026, 9, 25, 9, 0));
    assert.equal(summaryLine(loc),
        'Decision register: 6 open (4 waiting for the user, 2 blocking: D-3 "The import log grows by 2 GB a day.", D-5 "Should a rejected invoice be retried?"; 2 waiting for the agent: D-1, D-6; 4 questions, 1 initiative, 1 issue); oldest D-2 from 2026-10-23.');
});

test('summaryLine cuts a long What to 80 characters without splitting a character, and a hand-made entry without What gives its id', (t) => {
    const loc = scratchLocation(t);
    const exactly80 = `${'b'.repeat(79)}?`;
    addEntry(loc, entry({ what: `${'a'.repeat(78)}\u{1f600}x and much more after it` }), new Date(2026, 9, 25, 8, 0)); // D-1
    addEntry(loc, entry({ what: exactly80 }), new Date(2026, 9, 25, 8, 1)); // D-2
    addEntry(loc, entry({ what: `${'c'.repeat(78)} after a space at the cut` }), new Date(2026, 9, 25, 8, 2)); // D-3
    fs.appendFileSync(loc.openPath, `\r\n## D-4 ${DOT} issue ${DOT} blocking\r\n- Raised: 2026-10-25 08:03 by hand\r\n`);
    assert.equal(summaryLine(loc),
        `Decision register: 4 open (4 waiting for the user, 4 blocking: D-1 "${'a'.repeat(78)}\u{1f600}…", D-2 "${exactly80}", D-3 "${'c'.repeat(78)}…", D-4; 3 questions, 1 issue); oldest D-1 from 2026-10-25.`);
});

test('summaryLine says none blocking, leaves out a side with no items, and opens with the label it is given', (t) => {
    const loc = scratchLocation(t);
    assert.equal(summaryLine(loc, 'Decision register of Demo (C:\\Repos\\Demo)'), '');
    addEntry(loc, entry({ blocking: false }), new Date(2026, 9, 24, 10, 0));
    assert.equal(summaryLine(loc), 'Decision register: 1 open (1 waiting for the user, none blocking; 1 question); oldest D-1 from 2026-10-24.');
    answerEntry(loc, { id: 'D-1', answer: 'yes' }, new Date());
    assert.equal(summaryLine(loc, 'Decision register of Demo (C:\\Repos\\Demo)'),
        'Decision register of Demo (C:\\Repos\\Demo): 1 open (1 waiting for the agent: D-1; 1 question); oldest D-1 from 2026-10-24.');
});

test('openItems gives each open entry\'s id, kind, blocking, status, urgency and what', (t) => {
    const loc = scratchLocation(t);
    addEntry(loc, entry({ urgency: 'low', blocking: false }), new Date(2026, 9, 26, 8, 0));
    addEntry(loc, entry({ kind: 'issue', urgency: 'medium', parent: 'D-1', what: 'child' }), new Date(2026, 9, 26, 8, 1));
    answerEntry(loc, { id: 'D-1', answer: 'yes' }, new Date());
    assert.deepEqual(openItems(loc), [
        { id: 'D-1', kind: 'question', blocking: false, status: 'waiting-for-agent', urgency: 'low', what: 'Should a rejected invoice be retried?' },
        { id: 'D-1-1', kind: 'issue', blocking: true, status: 'waiting-for-user', urgency: 'medium', what: 'child' },
    ]);
});

// ---------------------------------------------------------------------------------------------------------------
// Migration of an older register
// ---------------------------------------------------------------------------------------------------------------

test('migrate renames old ids, gives open entries a Status line and today\'s description, and is safe to run twice', (t) => {
    const loc = scratchLocation(t);
    const at = new Date(2026, 9, 26, 19, 0);
    assert.match(migrateRegister(loc, at), /no register/);
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.openPath, [
        '# Open decisions', '',
        'Questions, initiatives and issues that wait for the user, newest last. Once the user has answered one, the main session moves it to RESOLVED_DECISIONS_CLAUDE.md.', '',
        `## D-0009 ${DOT} initiative ${DOT} not-blocking`, '- Raised: 2026-10-25 23:13 by run K worker', '- What: x', '',
        `## D-0010 ${DOT} question ${DOT} blocking`, '- Status: waiting-for-agent', '- What: y', '',
    ].join('\r\n'));
    fs.writeFileSync(loc.resolvedPath, [
        '# Resolved decisions', '',
        'Questions, initiatives and issues the user has answered, newest last. Each ends with a Resolved line that holds the user\'s words.', '',
        `## D-0001 ${DOT} question ${DOT} not-blocking`, '- What: z', '- Resolved: 2026-10-25 19:04, answered: "yes, D-0004 too"', '',
        `## D-2 ${DOT} question ${DOT} not-blocking`, '- What: w', '- Resolved: 2026-10-25 19:04, answered: "no"', '',
    ].join('\r\n'));
    assert.equal(migrateRegister(loc, at), [
        'ANSWERS_LOG_CLAUDE.jsonl: 2 records added',
        'OPEN_DECISIONS_CLAUDE.md: 2 ids renamed, 1 Status line added, description updated',
        'RESOLVED_DECISIONS_CLAUDE.md: 1 id renamed, 2 answers moved to the log, 2 Final answer lines added, description updated', '',
    ].join('\n'));
    const open = fs.readFileSync(loc.openPath, 'utf8').split('\r\n');
    assert.match(open[2], /waiting-for-agent/);
    assert.deepEqual(open.slice(4), [
        `## D-9 ${DOT} initiative ${DOT} not-blocking`, '- Status: waiting-for-user', '- Raised: 2026-10-25 23:13 by run K worker', '- What: x', '',
        `## D-10 ${DOT} question ${DOT} blocking`, '- Status: waiting-for-agent', '- What: y', '',
    ]);
    const resolved = fs.readFileSync(loc.resolvedPath, 'utf8');
    assert.match(resolved, /^## D-1 · question · not-blocking\r\n- What: z\r\n- Final answer: 2026-10-25 19:04: "yes, D-0004 too"\r\n- Resolved: 2026-10-25 19:04, answered\r\n/m, 'the user\'s words are kept as written');
    assert.match(resolved, /Final answer.*Summary.*ANSWERS_LOG_CLAUDE\.jsonl/);
    assert.deepEqual(logRecords(loc), [
        rec('D-1', '2026-10-25 19:04', 'yes, D-0004 too', '2026-10-25 19:04'), rec('D-2', '2026-10-25 19:04', 'no', '2026-10-25 19:04'),
    ]);
    const before = [fs.readFileSync(loc.openPath, 'utf8'), resolved];
    assert.match(migrateRegister(loc, at), /already in the current layout/);
    assert.deepEqual([fs.readFileSync(loc.openPath, 'utf8'), fs.readFileSync(loc.resolvedPath, 'utf8')], before);
    assert.equal(fs.existsSync(loc.answeredPath), false, 'no answered file made');
});

// ---------------------------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------------------------

test('registerLocation names a missing setting', (t) => {
    const dir = makeScratchDir('reg-keys');
    t.after(() => removeScratchDir(dir));
    for (const name of ['answeredFile', 'answersLogFile', 'lockWaitSeconds', 'lockStaleSeconds']) {
        const register = { ...REGISTER };
        delete register[name];
        assert.throws(() => registerLocation(dir, settings(dir, register)), new RegExp(`'register\\.${name}'`), name);
    }
});

test('registerLocation gives the answers log path from its setting, and keeps the log and its temp files out of git', (t) => {
    const dir = makeScratchDir('reg-log');
    t.after(() => removeScratchDir(dir));
    const loc = registerLocation(dir, settings(dir, { ...REGISTER, answersLogFile: 'OTHER_LOG.jsonl' }));
    assert.equal(loc.answersLogPath, `${loc.folderPath}\\OTHER_LOG.jsonl`);
    assert.ok(loc.excludeLines.includes('/decisions/OTHER_LOG.jsonl'));
    assert.ok(loc.excludeLines.includes('/decisions/.OTHER_LOG.jsonl.*.tmp'));
    assert.ok(loc.excludeLines.includes('/decisions/ANSWERED_DECISIONS_CLAUDE.md'), 'an old answered file stays out of git too');
});

test('the lock wait and the stale age come from the settings', (t) => {
    const dir = makeScratchDir('reg-lock');
    t.after(() => removeScratchDir(dir));
    const loc = registerLocation(dir, settings(dir, { ...REGISTER, lockWaitSeconds: 0.3, lockStaleSeconds: 2 }));
    fs.mkdirSync(loc.folderPath);
    fs.writeFileSync(loc.lockPath, 'held by the test');
    const started = Date.now();
    assert.throws(() => addEntry(loc, entry(), new Date()), /stayed taken for 0\.3 s/);
    assert.ok(Date.now() - started < 3000, `gave up after ${Date.now() - started} ms`);
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    fs.utimesSync(loc.lockPath, fiveSecondsAgo, fiveSecondsAgo);
    assert.equal(addEntry(loc, entry(), new Date()), 'D-1');
});
