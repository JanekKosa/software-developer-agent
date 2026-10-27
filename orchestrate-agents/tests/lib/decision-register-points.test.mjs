// Tests of register entries in points (the contract of 2026-10-27, misc\implementation\agent-team\stage-2\
// SELF_CONTAINED_F_CONTRACT_CLAUDE.md): what, example, recommendation and meanwhile take one text or a list of points,
// written as the field line and one '  - <point>' line per further point; options go one per line under '- Options:';
// and every reader of the register (list, the summary line, the open items the prompt hook reads, answer, handover,
// follow-up, close and migrate) works on a register that holds points and gives what it gave before for entries
// without them. In process, plus the real script for add and its exit codes. Scratch folders only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    UsageError, addEntry, answerEntry, closeEntry, followUpEntry, formatEntryLines, handOverAnswers, listEntries,
    migrateRegister, openItems, registerLocation, summaryLine, validateEntry,
} from '../../lib/decision-register.mjs';
import { SKILL_DIR, makeScratchDir, removeScratchDir, runNode } from '../helpers/scratch.mjs';

const DOT = String.fromCodePoint(0xb7);
const REAL_SCRIPT = path.join(SKILL_DIR, 'scripts', 'register.mjs');
const REGISTER = {
    folder: 'decisions',
    openFile: 'OPEN_DECISIONS_CLAUDE.md',
    answeredFile: 'ANSWERED_DECISIONS_CLAUDE.md',
    resolvedFile: 'RESOLVED_DECISIONS_CLAUDE.md',
    answersLogFile: 'ANSWERS_LOG_CLAUDE.jsonl',
    lockWaitSeconds: 10,
    lockStaleSeconds: 60,
};
const RAISED_AT = new Date(2026, 9, 27, 13, 5);
const POINT_FIELDS = ['what', 'example', 'recommendation', 'meanwhile'];

// The contract's sample entry, and the block it must give, word for word.
const SAMPLE = {
    kind: 'question', blocking: false, urgency: 'medium',
    raisedBy: 'lead sample', task: 'Sample task',
    what: ['The pane shows each entry as one block of text.', 'The register joins line breaks into spaces.', 'The pane draws each field as one line.'],
    example: 'D-40\'s three options sat in one paragraph.',
    options: ['A: show points, one per line (one run)', 'B: leave it (no cost)'],
    recommendation: ['A, because the user asked for it.', 'It also makes long entries quicker to read.'],
    meanwhile: 'Work goes on assuming A.',
    evidence: ['C:\\x\\a.md', 'C:\\x\\b.md'],
};

/**
 * The contract's sample block under a heading of the given id and blocking mark.
 * @param {string} id the entry's id
 * @param {string} [blocking] 'not-blocking' (the sample's) or 'blocking'
 * @returns {string[]} the lines
 */
function sampleLines(id, blocking = 'not-blocking') {
    return [
        `## ${id} ${DOT} question ${DOT} ${blocking}`,
        '- Status: waiting-for-user',
        '- Urgency: medium',
        '- Raised: 2026-10-27 13:05 by lead sample',
        '- Task: Sample task',
        '- What: The pane shows each entry as one block of text.',
        '  - The register joins line breaks into spaces.',
        '  - The pane draws each field as one line.',
        '- Example: D-40\'s three options sat in one paragraph.',
        '- Options:',
        '  - A: show points, one per line (one run).',
        '  - B: leave it (no cost).',
        '- Recommendation: A, because the user asked for it.',
        '  - It also makes long entries quicker to read.',
        '- Meanwhile: Work goes on assuming A.',
        '- Evidence: C:\\x\\a.md, C:\\x\\b.md',
    ];
}

// An entry exactly as the register wrote it before points existed (Options on one line), for the readers.
const OLD_LINES = [
    `## D-1 ${DOT} question ${DOT} blocking`,
    '- Status: waiting-for-user',
    '- Urgency: high',
    '- Raised: 2026-10-26 09:00 by lead old',
    '- Task: Old task',
    '- What: Should a rejected invoice be retried?',
    '- Example: Invoice 1001 for 250.00 PLN was rejected at 10:02.',
    '- Options: A: retry once (1 hour). B: leave it to the user (none).',
    '- Recommendation: A, because most rejections are timeouts.',
    '- Meanwhile: work continues assuming A',
    '- Evidence: temp\\ksef\\run3.log',
];

/**
 * Makes a scratch working folder that is not a repo and returns its register location.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @returns {object} location from registerLocation
 */
function scratchLocation(t) {
    const dir = makeScratchDir('points');
    t.after(() => removeScratchDir(dir));
    // The scratch folder also stands for teamState.folder, where this PC's settings file is looked for.
    return registerLocation(dir, { teamState: { folder: dir }, pcSettings: { file: 'pc-settings.json' }, register: REGISTER });
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
 * Joins lines into CRLF file text, a line break after the last.
 * @param {string[]} lines the lines
 * @returns {string} the text
 */
function crlf(lines) {
    return `${lines.join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Input and writing
// ---------------------------------------------------------------------------------------------------------------

test('the contract\'s sample entry gives the contract\'s sample block, word for word', () => {
    assert.deepEqual(formatEntryLines('D-51', SAMPLE, RAISED_AT), sampleLines('D-51'));
});

test('an entry of texts only gives the lines it gave before, except that each option has a line of its own', () => {
    const entry = {
        kind: 'issue', blocking: true, urgency: 'high', raisedBy: 'lead demo', task: 'Demo',
        what: 'One\r\nparagraph\nkept\rwhole', example: '- starts with a dash', options: ['A: x', 'B: y!', 'C: z?', 'D: w.'],
        recommendation: '* starts with a star', meanwhile: 'waits', evidence: ['- a.log', 'b.log'],
    };
    assert.deepEqual(formatEntryLines('D-3', entry, RAISED_AT), [
        `## D-3 ${DOT} issue ${DOT} blocking`,
        '- Status: waiting-for-user',
        '- Urgency: high',
        '- Raised: 2026-10-27 13:05 by lead demo',
        '- Task: Demo',
        '- What: One paragraph kept whole',
        '- Example: - starts with a dash',
        '- Options:',
        '  - A: x.',
        '  - B: y!',
        '  - C: z?',
        '  - D: w.',
        '- Recommendation: * starts with a star',
        '- Meanwhile: waits',
        '- Evidence: - a.log, b.log',
    ]);
});

test('a list of one point is written exactly like the same text', () => {
    for (const name of POINT_FIELDS) {
        const text = `Only point of ${name}, with a line\r\nbreak.`;
        assert.deepEqual(formatEntryLines('D-4', { ...SAMPLE, [name]: [text] }, RAISED_AT),
            formatEntryLines('D-4', { ...SAMPLE, [name]: text }, RAISED_AT), name);
    }
});

test('a point loses its line breaks and one leading "- " or "* ", and keeps everything else', () => {
    const what = ['- Head\r\nline', '* star', '- - twice', '-dash', 'x - y', ' - spaced', 'a\n- b', 'za\u017c\u00f3\u0142\u0107 \u{1f600}'];
    const lines = formatEntryLines('D-5', { ...SAMPLE, what }, RAISED_AT);
    assert.deepEqual(lines.slice(5, 13), [
        '- What: Head line',
        '  - star',
        '  - - twice',
        '  - -dash',
        '  - x - y',
        '  -  - spaced',
        '  - a - b',
        '  - za\u017c\u00f3\u0142\u0107 \u{1f600}',
    ]);
    assert.equal(lines[13], '- Example: D-40\'s three options sat in one paragraph.');
});

test('a point\'s line breaks become spaces before its list mark is looked for, so a mark typed on a line of its own goes too', () => {
    const lines = formatEntryLines('D-9', { ...SAMPLE, what: ['-\nHead', '*\r\nsecond'], options: ['-\rA: one', 'B: two'] }, RAISED_AT);
    assert.deepEqual(lines.slice(5, 7), ['- What: Head', '  - second']);
    assert.deepEqual(lines.slice(8, 11), ['- Options:', '  - A: one.', '  - B: two.']);
});

test('every point field writes its first point on its own line and each further point under it', () => {
    const entry = { ...SAMPLE, what: 'What.', example: ['Ex 1.', 'Ex 2.'], recommendation: ['Rec 1.', 'Rec 2.', 'Rec 3.'], meanwhile: ['Mean 1.', 'Mean 2.'] };
    assert.deepEqual(formatEntryLines('D-6', entry, RAISED_AT).slice(5), [
        '- What: What.',
        '- Example: Ex 1.',
        '  - Ex 2.',
        '- Options:',
        '  - A: show points, one per line (one run).',
        '  - B: leave it (no cost).',
        '- Recommendation: Rec 1.',
        '  - Rec 2.',
        '  - Rec 3.',
        '- Meanwhile: Mean 1.',
        '  - Mean 2.',
        '- Evidence: C:\\x\\a.md, C:\\x\\b.md',
    ]);
});

test('an option is a point: its line breaks become spaces, a leading "- " or "* " is dropped, then it gets its full stop', () => {
    const lines = formatEntryLines('D-7', { ...SAMPLE, options: ['- A: one\r\nline', '* B: two?', 'C: three!', '- D: four.'] }, RAISED_AT);
    assert.deepEqual(lines.slice(9, 14), ['- Options:', '  - A: one line.', '  - B: two?', '  - C: three!', '  - D: four.']);
});

test('validateEntry takes a text or a list of points in the four point fields and names the field for anything else', () => {
    for (const name of POINT_FIELDS) {
        for (const good of ['text', ['one'], ['one', '- two', '* three'], ['  padded  ']]) {
            assert.doesNotThrow(() => validateEntry({ ...SAMPLE, [name]: good }), `${name} ${JSON.stringify(good)}`);
        }
        for (const bad of [[], [''], ['  '], ['a', ''], ['a', '\r\n'], ['a', 7], ['a', null], [['a']], ['- '], ['* \r\n'], {}, { 0: 'a' }, 42, true, null, '', ' \n ']) {
            assert.throws(() => validateEntry({ ...SAMPLE, [name]: bad }), usage(new RegExp(`^field ${name} must be `)), `${name} ${JSON.stringify(bad)}`);
        }
    }
});

test('raisedBy and task take a text only, options a list only, and evidence stays as it was', () => {
    for (const name of ['raisedBy', 'task']) {
        assert.throws(() => validateEntry({ ...SAMPLE, [name]: ['x'] }), usage(new RegExp(`^field ${name} must be non-empty text$`)), name);
    }
    for (const bad of ['A: x', [], ['A: x', ''], ['A: x', 3], ['- '], ['* ']]) {
        assert.throws(() => validateEntry({ ...SAMPLE, options: bad }), usage(/^field options must be a list of one or more non-empty texts$/), JSON.stringify(bad));
    }
    assert.throws(() => validateEntry({ ...SAMPLE, evidence: 'a.md' }), usage(/^field evidence must be a list/));
    assert.doesNotThrow(() => validateEntry({ ...SAMPLE, evidence: ['- '] }));
});

// ---------------------------------------------------------------------------------------------------------------
// Readers on a register that holds an old entry and a points entry
// ---------------------------------------------------------------------------------------------------------------

test('list, the summary, the open items, answer, handover, follow-up, close and migrate work on points and keep old entries as they were', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const header = ['# Open decisions', '', 'x'];
    fs.writeFileSync(loc.openPath, crlf([...header, '', ...OLD_LINES]));
    assert.equal(addEntry(loc, { ...SAMPLE, blocking: true }, RAISED_AT), 'D-2');
    const points = sampleLines('D-2', 'blocking');
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), crlf([...header, '', ...OLD_LINES, '', ...points]));

    assert.equal(listEntries(loc, { scopes: ['open'] }), crlf([...OLD_LINES, '', ...points]));
    assert.equal(listEntries(loc, { scopes: ['open'], ids: ['D-2'] }), crlf(points));
    assert.deepEqual(openItems(loc), [
        { id: 'D-1', kind: 'question', blocking: true, status: 'waiting-for-user', urgency: 'high', what: 'Should a rejected invoice be retried?' },
        { id: 'D-2', kind: 'question', blocking: true, status: 'waiting-for-user', urgency: 'medium', what: 'The pane shows each entry as one block of text.' },
    ]);
    assert.equal(summaryLine(loc), 'Decision register: 2 open (2 waiting for the user, 2 blocking: D-1 "Should a rejected invoice be retried?", D-2 "The pane shows each entry as one block of text."; 2 questions); oldest D-1 from 2026-10-26.');

    answerEntry(loc, { id: 'D-2', answer: 'A' }, new Date(2026, 9, 27, 13, 10));
    answerEntry(loc, { id: 'D-1', answer: 'B' }, new Date(2026, 9, 27, 13, 11));
    const agentPoints = points.map((l) => (l === '- Status: waiting-for-user' ? '- Status: waiting-for-agent' : l));
    const agentOld = OLD_LINES.map((l) => (l === '- Status: waiting-for-user' ? '- Status: waiting-for-agent' : l));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), crlf([...header, '', ...agentOld, '', ...agentPoints]));
    assert.deepEqual(handOverAnswers(loc, new Date(2026, 9, 27, 13, 12)).map((r) => r.label),
        ['D-2 "The pane shows each entry as one block of text."', 'D-1 "Should a rejected invoice be retried?"']);

    followUpEntry(loc, { id: 'D-2', text: 'Which run?\nThe first one.' }, new Date(2026, 9, 27, 13, 20));
    const followed = [...points, '- Follow up: 2026-10-27 13:20: Which run?', '  The first one.'];
    assert.equal(listEntries(loc, { scopes: ['open'], ids: ['D-2'] }), crlf(followed));
    assert.equal(summaryLine(loc), 'Decision register: 2 open (1 waiting for the user, 1 blocking: D-2 "The pane shows each entry as one block of text."; 1 waiting for the agent: D-1; 2 questions); oldest D-1 from 2026-10-26.');

    answerEntry(loc, { id: 'D-2', answer: 'A, the first.' }, new Date(2026, 9, 27, 13, 30));
    closeEntry(loc, { id: 'D-2', outcome: 'answered', summary: 'A, in the first run.' }, new Date(2026, 9, 27, 13, 31));
    closeEntry(loc, { id: 'D-1', outcome: 'overruled', summary: 'B.' }, new Date(2026, 9, 27, 13, 32));
    const resolvedPoints = [
        ...followed.filter((l) => !l.startsWith('- Status: ')),
        '- Final answer: 2026-10-27 13:30: "A, the first."', '- Summary: A, in the first run.', '- Resolved: 2026-10-27 13:31, answered',
    ];
    const resolvedOld = [
        ...OLD_LINES.filter((l) => !l.startsWith('- Status: ')),
        '- Final answer: 2026-10-27 13:11: "B"', '- Summary: B.', '- Resolved: 2026-10-27 13:32, overruled',
    ];
    assert.equal(listEntries(loc, { scopes: ['resolved'] }), crlf([...resolvedPoints, '', ...resolvedOld]));
    assert.equal(listEntries(loc, { scopes: ['open'] }), '');
    assert.equal(summaryLine(loc), '');

    const before = [fs.readFileSync(loc.openPath, 'utf8'), fs.readFileSync(loc.resolvedPath, 'utf8'), fs.readFileSync(loc.answersLogPath, 'utf8')];
    assert.equal(migrateRegister(loc, new Date(2026, 9, 27, 14, 0)), 'The register is already in the current layout; nothing to change.\n');
    assert.deepEqual([fs.readFileSync(loc.openPath, 'utf8'), fs.readFileSync(loc.resolvedPath, 'utf8'), fs.readFileSync(loc.answersLogPath, 'utf8')], before);
});

test('a point that reads like a field is never taken for one: the Status, Final answer and Resolved lines are the real ones', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const entry = [
        `## D-8 ${DOT} issue ${DOT} blocking`,
        '- Raised: 2026-10-27 09:00 by lead hand-made',
        '- What: Headline.',
        '  - Status: waiting-for-agent',
        '  - Urgency: low',
        '  - Raised: 2020-01-01 00:00 by nobody',
        '  - What: not the headline',
        '- Recommendation: Rec.',
        '  - Final answer: 2026-10-27 09:30: "a point"',
        '  - Resolved: 2026-10-27 09:31, fixed',
    ];
    fs.writeFileSync(loc.openPath, crlf(['# Open decisions', '', 'x', '', ...entry]));
    assert.deepEqual(openItems(loc), [{ id: 'D-8', kind: 'issue', blocking: true, status: 'waiting-for-user', urgency: null, what: 'Headline.' }]);
    assert.equal(summaryLine(loc), 'Decision register: 1 open (1 waiting for the user, 1 blocking: D-8 "Headline."; 1 issue); oldest D-8 from 2026-10-27.');

    answerEntry(loc, { id: 'D-8', answer: 'fix it' }, new Date(2026, 9, 27, 10, 0));
    assert.equal(listEntries(loc, { scopes: ['open'] }), crlf([entry[0], '- Status: waiting-for-agent', ...entry.slice(1)]));
    closeEntry(loc, { id: 'D-8', outcome: 'fixed', summary: 'Fixed.' }, new Date(2026, 9, 27, 10, 5));
    assert.equal(listEntries(loc, { scopes: ['resolved'] }),
        crlf([...entry, '- Final answer: 2026-10-27 10:00: "fix it"', '- Summary: Fixed.', '- Resolved: 2026-10-27 10:05, fixed']));
    assert.deepEqual(openItems(loc), []);
});

test('migrate leaves points alone, even those that read like an older layout\'s lines, and converts the real lines around them', (t) => {
    const loc = scratchLocation(t);
    fs.mkdirSync(loc.folderPath);
    const open = [
        '# Open decisions', '', 'x', '',
        `## D-0003 ${DOT} question ${DOT} blocking`,
        '- Raised: 2026-10-25 10:00 by lead old',
        '- What: Headline.',
        '  - Answered: 2026-10-25 11:00: "a point, not an answer"',
        '  - Answered: broken',
        '  - Still open: a point, not a Still open line',
        '  - Status: waiting-for-agent',
        '- Answered: 2026-10-25 12:00: "the real answer"',
    ];
    const resolved = [
        '# Resolved decisions', '', 'x', '',
        `## D-1 ${DOT} issue ${DOT} not-blocking`,
        '- What: Resolved headline.',
        '  - Final answer: 2026-10-24 09:00: "a point"',
        '  - Resolved: 2026-10-24 09:00, fixed: "a point"',
        '- Resolved: 2026-10-24 10:00, accepted: "yes"',
    ];
    fs.writeFileSync(loc.openPath, crlf(open));
    fs.writeFileSync(loc.resolvedPath, crlf(resolved));
    assert.equal(migrateRegister(loc, new Date(2026, 9, 27, 14, 0)), [
        'ANSWERS_LOG_CLAUDE.jsonl: 2 records added',
        'OPEN_DECISIONS_CLAUDE.md: 1 id renamed, 1 Status line added, 1 answer moved to the log',
        'RESOLVED_DECISIONS_CLAUDE.md: 1 answer moved to the log, 1 Final answer line added',
        '',
    ].join('\n'));
    assert.equal(fs.readFileSync(loc.openPath, 'utf8'), crlf([
        '# Open decisions', '', 'x', '',
        `## D-3 ${DOT} question ${DOT} blocking`,
        '- Status: waiting-for-user',
        ...open.slice(5, 11),
    ]));
    assert.equal(fs.readFileSync(loc.resolvedPath, 'utf8'), crlf([
        ...resolved.slice(0, 8),
        '- Final answer: 2026-10-24 10:00: "yes"',
        '- Resolved: 2026-10-24 10:00, accepted',
    ]));
    const records = fs.readFileSync(loc.answersLogPath, 'utf8').split('\r\n').slice(0, -1).map((l) => JSON.parse(l));
    assert.deepEqual(records, [
        { id: 'D-1', answeredAt: '2026-10-24 10:00', answer: 'yes', handedOverAt: null, processedAt: '2026-10-24 10:00' },
        { id: 'D-3', answeredAt: '2026-10-25 12:00', answer: 'the real answer', handedOverAt: null, processedAt: '2026-10-27 14:00' },
    ]);
    assert.equal(migrateRegister(loc, new Date(2026, 9, 27, 14, 5)), 'The register is already in the current layout; nothing to change.\n');
});

// ---------------------------------------------------------------------------------------------------------------
// The real script
// ---------------------------------------------------------------------------------------------------------------

test('register.mjs add --file with the contract\'s sample writes the sample block, and list prints it as stored', async (t) => {
    const work = makeScratchDir('points-cli');
    t.after(() => removeScratchDir(work));
    const file = path.join(work, 'sample.json');
    fs.writeFileSync(file, JSON.stringify(SAMPLE, null, 2));
    const add = await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
    assert.deepEqual([add.code, add.stdout, add.stderr], [0, 'D-1\n', '']);
    const raised = /^- Raised: \d{4}-\d\d-\d\d \d\d:\d\d by /m;
    const text = fs.readFileSync(path.join(work, 'decisions', 'OPEN_DECISIONS_CLAUDE.md'), 'utf8');
    assert.match(text, raised);
    const block = crlf(sampleLines('D-1'));
    assert.ok(text.replace(raised, '- Raised: 2026-10-27 13:05 by ').endsWith(`\r\n\r\n${block}`), text);
    const listed = await runNode(REAL_SCRIPT, ['list', '--open'], { cwd: work });
    assert.equal(listed.code, 0, listed.stderr);
    assert.equal(listed.stdout.replace(raised, '- Raised: 2026-10-27 13:05 by '), block);
});

test('register.mjs add refuses a bad list or a wrong type with exit 2 naming the field, and writes nothing', async (t) => {
    const work = makeScratchDir('points-bad');
    t.after(() => removeScratchDir(work));
    const cases = [
        ['what', []], ['example', ['']], ['recommendation', ['A.', 7]], ['meanwhile', { text: 'x' }], ['what', ['- ']],
        ['example', 12], ['task', ['Sample task']], ['raisedBy', []], ['options', 'A: x'], ['options', ['A: x', ' ']],
    ];
    for (const [i, [name, value]] of cases.entries()) {
        const file = path.join(work, `bad-${i}.json`);
        fs.writeFileSync(file, JSON.stringify({ ...SAMPLE, [name]: value }));
        const run = await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
        assert.equal(run.code, 2, `${name} ${JSON.stringify(value)} -> ${run.code} ${run.stderr}`);
        assert.match(run.stderr, new RegExp(`field ${name} must be `), `${name} ${JSON.stringify(value)}`);
        assert.equal(run.stdout, '');
    }
    assert.equal(fs.existsSync(path.join(work, 'decisions')), false);
});
