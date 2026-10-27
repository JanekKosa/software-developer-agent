// End-to-end tests of scripts/register.mjs run as a real child process: round trips, hostile text, exit codes,
// line endings, concurrent writers, the lock, and .git/info/exclude in matching and non-matching repos.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    SKILL_DIR, findGit, makeScratchDir, makeSkillCopy, removeScratchDir, runGit, runNode as runChild, stateRootUnderHome,
} from '../helpers/scratch.mjs';

const REAL_SCRIPT = path.join(SKILL_DIR, 'scripts', 'register.mjs');

// Every script here runs with a scratch home as its USERPROFILE, whose PC settings file says no repo commits the
// register. The real script then never reads this PC's own settings, and a scratch repo under %TEMP% is a client repo
// wherever the skill folder lies (the default, the folder beside the repo, may hold %TEMP%). A skill copy has its own
// state folder and ignores the home.
const HOME = makeScratchDir('reg-home');
after(() => removeScratchDir(HOME));
fs.mkdirSync(stateRootUnderHome(HOME), { recursive: true });
fs.writeFileSync(path.join(stateRootUnderHome(HOME), 'pc-settings.json'), '{ "register": { "commitInRepos": [] } }');

/**
 * Runs a script as a child process with the scratch home as its USERPROFILE (runNode of the helpers otherwise).
 * @param {string} script absolute path of the .mjs file
 * @param {string[]} args arguments after the script
 * @param {{cwd?: string, input?: string, env?: object}} [options] as for the helpers' runNode
 * @returns {Promise<{code: number, stdout: string, stderr: string, ms: number}>} as for the helpers' runNode
 */
function runNode(script, args, options = {}) {
    return runChild(script, args, { ...options, env: { USERPROFILE: HOME, ...options.env } });
}
const DOT = String.fromCodePoint(0xb7);
const gitExe = findGit();
const HOSTILE = '\u2018single\u2019 \u201cdouble\u201d "plain" & %PATH% $env:TEMP `n za\u017c\u00f3\u0142\u0107 \u{1f600} \u4e2d\u6587 <b>|';

/**
 * A complete, valid entry; fields can be overridden.
 * @param {object} [over] fields to replace
 * @returns {object} entry object
 */
function entry(over = {}) {
    return {
        kind: 'question', blocking: true, urgency: 'high', raisedBy: 'lead demo (worker run 1)', task: 'Demo task',
        what: 'What to do?', example: '10 units, 3 picked, 7 open.', options: ['A: wait (none)', 'B: go (1 hour)'],
        recommendation: 'A', meanwhile: 'work continues assuming A', evidence: ['temp\\demo.log'], ...over,
    };
}

/**
 * Writes an entry JSON file into a folder and returns its path.
 * @param {string} dir folder to write in
 * @param {object} value the entry
 * @param {string} [name] file name
 * @returns {string} path of the JSON file
 */
function writeEntryFile(dir, value, name = 'entry.json') {
    const file = path.join(dir, name);
    fs.writeFileSync(file, JSON.stringify(value));
    return file;
}

/**
 * Records an answer and closes the entry through the real script, and checks both exit 0.
 * @param {string} script the register script
 * @param {string} cwd working folder
 * @param {string} id the entry
 * @param {string} outcome the outcome
 * @param {string} answer the user's words
 * @param {string} [summary] the summary the close writes
 */
async function answerAndClose(script, cwd, id, outcome, answer, summary = `Closed ${id}.`) {
    const answered = await runNode(script, ['answer', '--id', id, '--answer', answer], { cwd });
    assert.equal(answered.code, 0, answered.stderr);
    const closed = await runNode(script, ['close', '--id', id, '--outcome', outcome, '--summary', summary], { cwd });
    assert.equal(closed.code, 0, closed.stderr);
}

/**
 * Reads a CRLF answers log and parses its records.
 * @param {string} work the folder that holds decisions\
 * @returns {object[]} the records in file order
 */
function logRecords(work) {
    const text = fs.readFileSync(path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl'), 'utf8');
    return text.split('\r\n').slice(0, -1).map((l) => JSON.parse(l));
}

/**
 * The headings' ids of a listing.
 * @param {string} text the script's list output
 * @returns {string[]|null} the ids in order
 */
function idsOf(text) {
    return text.match(/^## D-[\d-]+/gm)?.map((h) => h.slice(3)) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Round trips and hostile text
// ---------------------------------------------------------------------------------------------------------------

test('add, answer, follow-up, keep-open, close, list, answers and summary round trip through the real script', async (t) => {
    const work = makeScratchDir('cli');
    t.after(() => removeScratchDir(work));
    const file = writeEntryFile(work, entry());
    const add = await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
    assert.equal(add.code, 0, add.stderr);
    assert.equal(add.stdout.trim(), 'D-1');
    const child = await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry({ parent: 'D-1', blocking: false, urgency: 'low' }), 'child.json')], { cwd: work });
    assert.equal(child.stdout.trim(), 'D-1-1', child.stderr);

    const summary = await runNode(REAL_SCRIPT, ['summary'], { cwd: work });
    assert.match(summary.stdout, /^Decision register: 2 open \(2 waiting for the user, 1 blocking: D-1 "What to do\?"; 2 questions\); oldest D-1 from \d{4}-\d\d-\d\d\.\r?\n$/);

    const open = await runNode(REAL_SCRIPT, ['list', '--open', '--ids', 'D-1'], { cwd: work });
    assert.match(open.stdout, new RegExp(`^## D-1 ${DOT} question ${DOT} blocking\\r\\n- Status: waiting-for-user\\r\\n- Urgency: high\\r\\n- Raised: \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d by lead demo \\(worker run 1\\)\\r\\n`));

    const answer = await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'A, mostly.'], { cwd: work });
    assert.equal(answer.code, 0, answer.stderr);
    assert.equal(answer.stdout, '');
    assert.match((await runNode(REAL_SCRIPT, ['summary'], { cwd: work })).stdout, /1 waiting for the user, none blocking; 1 waiting for the agent: D-1;/);
    const answered = await runNode(REAL_SCRIPT, ['list', '--answered'], { cwd: work });
    assert.match(answered.stdout, /^## D-1\r\n- Answered: \d{4}-\d\d-\d\d \d\d:\d\d: "A, mostly\."\r\n$/);

    const followUp = await runNode(REAL_SCRIPT, ['follow-up', '--id', 'D-1', '--text', 'what does mostly mean?'], { cwd: work });
    assert.equal(followUp.code, 0, followUp.stderr);
    assert.equal(followUp.stdout, '');
    assert.equal((await runNode(REAL_SCRIPT, ['list', '--answered'], { cwd: work })).stdout, '');
    const followed = (await runNode(REAL_SCRIPT, ['list', '--open', '--ids', 'D-1'], { cwd: work })).stdout;
    assert.match(followed, /- Status: waiting-for-user\r\n[\s\S]*- Evidence: temp\\demo\.log\r\n- Follow up: \d{4}-\d\d-\d\d \d\d:\d\d: what does mostly mean\?\r\n$/);
    assert.equal(followed.includes('- Answered: '), false, 'the answers stay in the log');

    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'A, always.'], { cwd: work })).code, 0);
    const keep = await runNode(REAL_SCRIPT, ['keep-open', '--id', 'D-1', '--still-open', 'always, even on Sunday?'], { cwd: work });
    assert.equal(keep.code, 0, keep.stderr);
    assert.match((await runNode(REAL_SCRIPT, ['list', '--open', '--ids', 'D-1'], { cwd: work })).stdout, /- Follow up: .*: what does mostly mean\?\r\n- Follow up: .*: always, even on Sunday\?\r\n$/);

    await answerAndClose(REAL_SCRIPT, work, 'D-1', 'answered', 'A, always,\r\neven on Sunday.', 'Retry once, every day of the week.');
    const resolved = await runNode(REAL_SCRIPT, ['list', '--resolved'], { cwd: work });
    assert.match(resolved.stdout, /^## D-1 .*\r\n- Urgency: high\r\n[\s\S]*- Follow up: .*: always, even on Sunday\?\r\n- Final answer: \d{4}-\d\d-\d\d \d\d:\d\d: "A, always, even on Sunday\."\r\n- Summary: Retry once, every day of the week\.\r\n- Resolved: \d{4}-\d\d-\d\d \d\d:\d\d, answered\r\n$/);
    assert.deepEqual(idsOf((await runNode(REAL_SCRIPT, ['list', '--open'], { cwd: work })).stdout), ['D-1-1']);

    const records = logRecords(work);
    assert.deepEqual(records.map((r) => r.answer), ['A, mostly.', 'A, always.', 'A, always,\r\neven on Sunday.']);
    assert.equal(records.every((r) => /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(r.processedAt) && r.handedOverAt === null), true);
    const all = await runNode(REAL_SCRIPT, ['answers'], { cwd: work });
    assert.equal(all.code, 0, all.stderr);
    assert.match(all.stdout, /^D-1, answered [\d: -]+, processed [\d: -]+: "A, mostly\."\r\n\r\nD-1, answered .*: "A, always\."\r\n\r\nD-1, answered .*: "A, always,\r\neven on Sunday\."\r\n$/);
    const json = await runNode(REAL_SCRIPT, ['answers', '--ids', 'D-0001', '--json'], { cwd: work });
    assert.equal(json.stdout, fs.readFileSync(path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl'), 'utf8'));
    assert.match((await runNode(REAL_SCRIPT, ['answers', '--words', 'MOSTLY'], { cwd: work })).stdout, /^D-1, answered .*: "A, mostly\."\r\n$/);
    assert.equal((await runNode(REAL_SCRIPT, ['answers', '--ids', 'D-1-1'], { cwd: work })).stdout, '');

    await answerAndClose(REAL_SCRIPT, work, 'D-1-1', 'accepted', 'fine');
    assert.equal((await runNode(REAL_SCRIPT, ['summary'], { cwd: work })).stdout, '');
});

// ---------------------------------------------------------------------------------------------------------------
// Handing answers over
// ---------------------------------------------------------------------------------------------------------------

// The instruction under the answers handed over, written out here so the test does not share the script's text.
const HANDOVER_INSTRUCTION = 'For each answer: pass it, in the user\'s words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in double quotes.';

test('handover prints each waiting answer once, ids once in log order, words as stored; an answer --handed-over is never printed', async (t) => {
    const work = makeScratchDir('handover');
    t.after(() => removeScratchDir(work));
    for (const what of ['Retry a rejected invoice?', 'Round VAT per line or per invoice?']) {
        assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry({ what }))], { cwd: work })).code, 0);
    }
    const answers = [['D-1', 'A, retry once'], ['D-2', 'B,\r\nbut only from September'], ['D-1', 'A, and log it']];
    for (const [id, words] of answers) {
        const run = await runNode(REAL_SCRIPT, ['answer', '--id', id, '--answer', words], { cwd: work });
        assert.equal(run.code, 0, run.stderr);
    }
    const chat = await runNode(REAL_SCRIPT, ['answer', '--id', 'D-2', '--answer', 'typed in the chat', '--handed-over'], { cwd: work });
    assert.equal(chat.code, 0, chat.stderr);
    assert.equal(chat.stdout, '');
    const before = logRecords(work);
    assert.equal(before[3].handedOverAt, before[3].answeredAt, '--handed-over records the answer time as handedOverAt');
    assert.deepEqual(before.slice(0, 3).map((r) => r.handedOverAt), [null, null, null]);

    const run = await runNode(REAL_SCRIPT, ['handover'], { cwd: work });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(run.stderr, '');
    assert.equal(run.stdout, [
        'DECISION ANSWERS | D-1, D-2',
        `D-1 "Retry a rejected invoice?", answered ${before[0].answeredAt}:`, 'A, retry once', '',
        `D-2 "Round VAT per line or per invoice?", answered ${before[1].answeredAt}:`, 'B,\r\nbut only from September', '',
        `D-1 "Retry a rejected invoice?", answered ${before[2].answeredAt}:`, 'A, and log it',
        HANDOVER_INSTRUCTION, '',
    ].join('\n'));
    const after = logRecords(work);
    assert.equal(after.slice(0, 3).every((r) => /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(r.handedOverAt) && r.processedAt === null), true);
    assert.deepEqual(after[3], before[3], 'the answer given in the chat is left as it was');

    const again = await runNode(REAL_SCRIPT, ['handover'], { cwd: work });
    assert.deepEqual([again.code, again.stdout, again.stderr], [0, '', '']);
    assert.deepEqual(logRecords(work), after);
});

test('eight handovers running at once hand each answer over exactly once, all in one of them', async (t) => {
    const work = makeScratchDir('handover-race');
    t.after(() => removeScratchDir(work));
    for (const what of ['First?', 'Second?', 'Third?']) {
        assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry({ what }))], { cwd: work })).code, 0);
    }
    const words = [['D-1', 'alpha words'], ['D-2', 'beta words'], ['D-1', 'gamma words'], ['D-3', 'delta words']];
    for (const [id, text] of words) {
        assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', id, '--answer', text], { cwd: work })).code, 0);
    }
    // Hold the lock while all eight start, so they all wait for it at once, then release it.
    const lockPath = path.join(work, 'decisions', '.lock');
    fs.writeFileSync(lockPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
    setTimeout(() => fs.unlinkSync(lockPath), 1500);
    const runs = await Promise.all(Array.from({ length: 8 }, () => runNode(REAL_SCRIPT, ['handover'], { cwd: work })));
    assert.deepEqual(runs.map((r) => [r.code, r.stderr]), runs.map(() => [0, '']));
    const printed = runs.map((r) => r.stdout).filter((out) => out !== '');
    assert.equal(printed.length, 1, 'the first to take the lock hands every answer over; the others find none waiting');
    assert.match(printed[0], /^DECISION ANSWERS \| D-1, D-2, D-3\n/);
    for (const [, text] of words) {
        assert.equal(printed[0].split(text).length - 1, 1, `${text} is handed over once`);
    }
    assert.equal(logRecords(work).every((r) => r.handedOverAt !== null && r.processedAt === null), true);
});

test('handover on a busy register exits 1 with the busy message and writes nothing; without a register it prints nothing', async (t) => {
    const work = makeScratchDir('handover-busy');
    t.after(() => removeScratchDir(work));
    const skill = makeSkillCopy(work, (config) => { config.register.lockWaitSeconds = 0.5; });
    const script = path.join(skill, 'scripts', 'register.mjs');
    const repo = path.join(work, 'repo');
    fs.mkdirSync(repo);
    const none = await runNode(script, ['handover'], { cwd: repo });
    assert.deepEqual([none.code, none.stdout, none.stderr], [0, '', '']);
    assert.deepEqual(fs.readdirSync(repo), [], 'nothing is created');

    assert.equal((await runNode(script, ['add', '--file', writeEntryFile(work, entry())], { cwd: repo })).code, 0);
    assert.equal((await runNode(script, ['answer', '--id', 'D-1', '--answer', 'A'], { cwd: repo })).code, 0);
    const logPath = path.join(repo, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl');
    const stored = fs.readFileSync(logPath, 'utf8');
    const lockPath = path.join(repo, 'decisions', '.lock');
    fs.writeFileSync(lockPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
    const busy = await runNode(script, ['handover'], { cwd: repo });
    assert.equal(busy.code, 1, busy.stderr);
    assert.equal(busy.stdout, '');
    assert.match(busy.stderr, /^register: the decision register is busy: .*\.lock stayed taken for 0\.5 s\. Nothing was written/);
    assert.equal(fs.readFileSync(logPath, 'utf8'), stored);
    fs.rmSync(lockPath);
    assert.match((await runNode(script, ['handover'], { cwd: repo })).stdout, /^DECISION ANSWERS \| D-1\n/);
});

test('handover --when-all-answered prints nothing while an entry waits for the user, then exactly what handover prints once none does', async (t) => {
    const work = makeScratchDir('handover-all');
    t.after(() => removeScratchDir(work));
    for (const what of ['Retry a rejected invoice?', 'Round VAT per line or per invoice?']) {
        assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry({ what }))], { cwd: work })).code, 0);
    }
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'A, retry once'], { cwd: work })).code, 0);
    const logPath = path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl');
    const stored = fs.readFileSync(logPath, 'utf8');
    const waiting = await runNode(REAL_SCRIPT, ['handover', '--when-all-answered'], { cwd: work });
    assert.deepEqual([waiting.code, waiting.stdout, waiting.stderr], [0, '', ''], 'D-2 still waits for the user');
    assert.equal(fs.readFileSync(logPath, 'utf8'), stored, 'nothing is marked');

    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-2', '--answer', 'B,\r\nbut only from September'], { cwd: work })).code, 0);
    const before = logRecords(work);
    const all = await runNode(REAL_SCRIPT, ['handover', '--when-all-answered', '--root', work], { cwd: path.dirname(work) });
    assert.equal(all.code, 0, all.stderr);
    assert.equal(all.stderr, '');
    assert.equal(all.stdout, [
        'DECISION ANSWERS | D-1, D-2',
        `D-1 "Retry a rejected invoice?", answered ${before[0].answeredAt}:`, 'A, retry once', '',
        `D-2 "Round VAT per line or per invoice?", answered ${before[1].answeredAt}:`, 'B,\r\nbut only from September',
        HANDOVER_INSTRUCTION, '',
    ].join('\n'));
    assert.equal(logRecords(work).every((r) => /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(r.handedOverAt) && r.processedAt === null), true);
    const again = await runNode(REAL_SCRIPT, ['handover'], { cwd: work });
    assert.deepEqual([again.code, again.stdout, again.stderr], [0, '', ''], 'nothing is handed over twice');
});

test('handover --when-all-answered checks under the lock it hands over in: an entry added while it waits for the lock stops it', async (t) => {
    const work = makeScratchDir('handover-all-lock');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry({ what: 'First?' }))], { cwd: work })).code, 0);
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'A'], { cwd: work })).code, 0);
    const logPath = path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl');
    const openPath = path.join(work, 'decisions', 'OPEN_DECISIONS_CLAUDE.md');
    const stored = fs.readFileSync(logPath, 'utf8');
    const lockPath = path.join(work, 'decisions', '.lock');
    fs.writeFileSync(lockPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
    const running = runNode(REAL_SCRIPT, ['handover', '--when-all-answered'], { cwd: work });
    // While it waits for the lock, a lead adds an entry (written here by hand, under the lock the test holds).
    await new Promise((resolve) => { setTimeout(resolve, 1500); });
    fs.appendFileSync(openPath, `\r\n## D-2 ${DOT} question ${DOT} blocking\r\n- Status: waiting-for-user\r\n- What: Added meanwhile?\r\n`);
    fs.rmSync(lockPath);
    const run = await running;
    assert.deepEqual([run.code, run.stdout, run.stderr], [0, '', '']);
    assert.equal(fs.readFileSync(logPath, 'utf8'), stored, 'D-1 is not handed over');
    assert.match((await runNode(REAL_SCRIPT, ['handover'], { cwd: work })).stdout, /^DECISION ANSWERS \| D-1\n/, 'plain handover hands it over');
});

test('handover and --handed-over refuse wrong use with exit 2 and write nothing', async (t) => {
    const work = makeScratchDir('handover-usage');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work })).code, 0);
    const cases = [
        [['handover', '--id', 'D-1'], /handover does not take --id/],
        [['handover', 'now'], /unexpected argument 'now'/],
        [['handover', '--when-all-answered', 'yes'], /unexpected argument 'yes'/],
        [['answer', '--id', 'D-1', '--answer', 'A', '--when-all-answered'], /answer does not take --when-all-answered/],
        [['answer', '--id', 'D-1', '--answer', 'A', '--handed-over', 'yes'], /unexpected argument 'yes'/],
        [['close', '--id', 'D-1', '--outcome', 'answered', '--summary', 'x', '--handed-over'], /close does not take --handed-over/],
    ];
    for (const [args, pattern] of cases) {
        const run = await runNode(REAL_SCRIPT, args, { cwd: work });
        assert.equal(run.code, 2, args.join(' '));
        assert.match(run.stderr, pattern);
    }
    assert.equal(fs.existsSync(path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl')), false);
});

test('follow-up and keep-open keep a text of several lines through the real script, and list and close keep the block', async (t) => {
    const work = makeScratchDir('cli-block');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work })).code, 0);
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'B'], { cwd: work })).code, 0);
    const before = (await runNode(REAL_SCRIPT, ['list', '--open'], { cwd: work })).stdout;
    const text = `B costs an hour.\r\n\r\nExample: ${HOSTILE}\n- Options: C (free)\n  - Recommendation: C`;
    const followUp = await runNode(REAL_SCRIPT, ['follow-up', '--id', 'D-1', '--text', text], { cwd: work });
    assert.equal(followUp.code, 0, followUp.stderr);
    const block = `- Follow up: \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d: B costs an hour\\.\\r\\n  \\r\\n  Example: ${HOSTILE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r\\n  - Options: C \\(free\\)\\r\\n    - Recommendation: C\\r\\n`;
    const listed = (await runNode(REAL_SCRIPT, ['list', '--open'], { cwd: work })).stdout;
    assert.match(listed, new RegExp(`^${before.replace('waiting-for-agent', 'waiting-for-user').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${block}$`));

    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'A'], { cwd: work })).code, 0);
    const keep = await runNode(REAL_SCRIPT, ['keep-open', '--id', 'D-1', '--still-open', 'Sure?\n\nA waits.'], { cwd: work });
    assert.equal(keep.code, 0, keep.stderr);
    await answerAndClose(REAL_SCRIPT, work, 'D-1', 'answered', 'Sure.', 'A.');
    const resolved = fs.readFileSync(path.join(work, 'decisions', 'RESOLVED_DECISIONS_CLAUDE.md'), 'utf8');
    assert.match(resolved, new RegExp(`- Options:\\r\\n  - A: wait \\(none\\)\\.\\r\\n  - B: go \\(1 hour\\)\\.\\r\\n[\\s\\S]*\\r\\n${block}- Follow up: .*: Sure\\?\\r\\n  \\r\\n  A waits\\.\\r\\n- Final answer: .*: "Sure\\."\\r\\n- Summary: A\\.\\r\\n- Resolved: .*, answered\\r\\n$`));
    assert.deepEqual(idsOf(resolved), ['D-1']);
});

test('hostile text survives byte for byte, with every line break turned into one space', async (t) => {
    const work = makeScratchDir('hostile');
    t.after(() => removeScratchDir(work));
    const longText = `${HOSTILE} `.repeat(4000); // about 300 KB
    const file = writeEntryFile(work, entry({ what: `${HOSTILE}\r\nline2\nline3\rline4`, example: longText, evidence: ['C:\\a b\\c&d.log', HOSTILE] }));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work })).code, 0);
    const answer = `${HOSTILE}\r\nnext "line"\n\u2028lone\rCR ${'y'.repeat(20000)}`;
    const summary = `${HOSTILE}\nsummed`;
    await answerAndClose(REAL_SCRIPT, work, 'D-1', 'overruled', answer, summary);

    const text = fs.readFileSync(path.join(work, 'decisions', 'RESOLVED_DECISIONS_CLAUDE.md'), 'utf8');
    assert.ok(text.includes(`- What: ${HOSTILE} line2 line3 line4\r\n`));
    assert.ok(text.includes(`- Example: ${longText}\r\n`));
    assert.ok(text.includes(`- Evidence: C:\\a b\\c&d.log, ${HOSTILE}\r\n`));
    assert.ok(text.includes(`: "${HOSTILE} next "line" \u2028lone CR ${'y'.repeat(20000)}"\r\n- Summary: ${HOSTILE} summed\r\n- Resolved: `));
    assert.equal(/\r(?!\n)|(?<!\r)\n/.test(text), false, 'no lone CR or LF');
    const listed = await runNode(REAL_SCRIPT, ['list', '--resolved', '--ids', 'D-1'], { cwd: work });
    assert.equal(listed.stdout, text.slice(text.indexOf('## D-1')));

    const logText = fs.readFileSync(path.join(work, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl'), 'utf8');
    assert.equal(logText.split('\r\n').length, 2, 'one record on one line, then the line break');
    assert.equal(JSON.parse(logText.split('\r\n')[0]).answer, answer, 'the words byte for byte');
    assert.ok(logText.includes('za\u017c\u00f3\u0142\u0107 \u{1f600} \u4e2d\u6587'), 'non-ASCII written as characters');
    const shown = await runNode(REAL_SCRIPT, ['answers', '--words', 'ZA\u017b\u00d3\u0141\u0106 \u{1f600}'], { cwd: work });
    assert.ok(shown.stdout.endsWith(`: "${answer}"\r\n`), 'words as given, line breaks included');
});

test('--root replaces the working folder and finds the same repo root', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('rootopt');
    t.after(() => removeScratchDir(base));
    const repo = path.join(base, 'Demo');
    fs.mkdirSync(path.join(repo, 'src', 'deep'), { recursive: true });
    runGit(gitExe, ['init', '-q'], repo);
    const file = writeEntryFile(base, entry());
    const add = await runNode(REAL_SCRIPT, ['add', '--file', file, '--root', path.join(repo, 'src', 'deep')], { cwd: base });
    assert.equal(add.code, 0, add.stderr);
    assert.ok(fs.existsSync(path.join(repo, 'decisions', 'OPEN_DECISIONS_CLAUDE.md')));
    assert.equal(fs.existsSync(path.join(repo, 'src', 'deep', 'decisions')), false);
    assert.equal(fs.existsSync(path.join(base, 'decisions')), false);
});

test('migrate moves an older register to the current layout and says what it changed', async (t) => {
    const work = makeScratchDir('migrate');
    t.after(() => removeScratchDir(work));
    const folder = path.join(work, 'decisions');
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), `# Open decisions\r\n\r\nx\r\n\r\n## D-0003 ${DOT} question ${DOT} blocking\r\n- What: y\r\n`);
    const run = await runNode(REAL_SCRIPT, ['migrate'], { cwd: work });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(run.stdout, 'OPEN_DECISIONS_CLAUDE.md: 1 id renamed, 1 Status line added\n');
    assert.equal(fs.readFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), 'utf8'), `# Open decisions\r\n\r\nx\r\n\r\n## D-3 ${DOT} question ${DOT} blocking\r\n- Status: waiting-for-user\r\n- What: y\r\n`);
    assert.match((await runNode(REAL_SCRIPT, ['migrate'], { cwd: work })).stdout, /nothing to change/);
});

test('migrate moves the answers inside old entries to the log, and answers, close, list and summary work on the result; a line it cannot read exits 1 and changes nothing', async (t) => {
    const work = makeScratchDir('migans');
    t.after(() => removeScratchDir(work));
    const folder = path.join(work, 'decisions');
    fs.mkdirSync(folder);
    const openPath = path.join(folder, 'OPEN_DECISIONS_CLAUDE.md');
    const resolvedPath = path.join(folder, 'RESOLVED_DECISIONS_CLAUDE.md');
    const logPath = path.join(folder, 'ANSWERS_LOG_CLAUDE.jsonl');
    const open = `# Open decisions\r\n\r\nx\r\n\r\n## D-2 ${DOT} question ${DOT} blocking\r\n- Status: waiting-for-user\r\n- What: z\r\n- Answered: 2026-10-26 09:00: "first"\r\n- Still open: Which one?\r\n`;
    const resolved = `# Resolved decisions\r\n\r\nx\r\n\r\n## D-1 ${DOT} question ${DOT} not-blocking\r\n- What: y\r\n- Answered: 2026-10-26 10:00: "${HOSTILE}"\r\n- Resolved: 2026-10-26 10:05, answered\r\n`;
    fs.writeFileSync(resolvedPath, resolved);
    const unreadable = `${open}- Answered: 2026-10-26 09:30: "cut\r\n`;
    fs.writeFileSync(openPath, unreadable);
    const bad = await runNode(REAL_SCRIPT, ['migrate'], { cwd: work });
    assert.equal(bad.code, 1, bad.stderr);
    assert.match(bad.stderr, /OPEN_DECISIONS_CLAUDE\.md line 10 .*: - Answered: 2026-10-26 09:30: "cut\n/);
    assert.equal(bad.stdout, '');
    assert.deepEqual([fs.readFileSync(openPath, 'utf8'), fs.readFileSync(resolvedPath, 'utf8'), fs.existsSync(logPath)], [unreadable, resolved, false]);

    fs.writeFileSync(openPath, open);
    const run = await runNode(REAL_SCRIPT, ['migrate'], { cwd: work });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(run.stdout, 'ANSWERS_LOG_CLAUDE.jsonl: 2 records added\nOPEN_DECISIONS_CLAUDE.md: 1 answer moved to the log, 1 Still open line renamed\nRESOLVED_DECISIONS_CLAUDE.md: 1 answer moved to the log, 1 Final answer line added\n');
    const records = logRecords(work);
    assert.deepEqual(records.map((r) => [r.id, r.answeredAt, r.answer, r.handedOverAt]), [['D-2', '2026-10-26 09:00', 'first', null], ['D-1', '2026-10-26 10:00', HOSTILE, null]]);
    assert.match(records[0].processedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    assert.equal(records[1].processedAt, '2026-10-26 10:05');
    const json = await runNode(REAL_SCRIPT, ['answers', '--ids', 'D-1', '--json'], { cwd: work });
    assert.equal(json.stdout, `${JSON.stringify({ id: 'D-1', answeredAt: '2026-10-26 10:00', answer: HOSTILE, handedOverAt: null, processedAt: '2026-10-26 10:05' })}\r\n`);
    const listed = await runNode(REAL_SCRIPT, ['list', '--resolved'], { cwd: work });
    assert.ok(listed.stdout.includes(`- What: y\r\n- Final answer: 2026-10-26 10:00: "${HOSTILE}"\r\n- Resolved: 2026-10-26 10:05, answered\r\n`), listed.stdout);
    assert.ok(fs.readFileSync(openPath, 'utf8').endsWith('- What: z\r\n- Follow up: Which one?\r\n'));

    await answerAndClose(REAL_SCRIPT, work, 'D-2', 'answered', 'second');
    assert.match(fs.readFileSync(resolvedPath, 'utf8'), /- Follow up: Which one\?\r\n- Final answer: \d{4}-\d{2}-\d{2} \d{2}:\d{2}: "second"\r\n- Summary: Closed D-2\.\r\n/);
    const summary = await runNode(REAL_SCRIPT, ['summary'], { cwd: work });
    assert.equal(summary.code, 0, summary.stderr);
    assert.match((await runNode(REAL_SCRIPT, ['migrate'], { cwd: work })).stdout, /nothing to change/);
});

// ---------------------------------------------------------------------------------------------------------------
// Wrong use: exit 2 with the problem named
// ---------------------------------------------------------------------------------------------------------------

test('wrong use exits 2 and names the problem; nothing is written', async (t) => {
    const work = makeScratchDir('usage');
    t.after(() => removeScratchDir(work));
    const missing = entry();
    delete missing.meanwhile;
    const cases = [
        [['add', '--file', writeEntryFile(work, entry({ kind: 'idea' }), 'k.json')], /idea/],
        [['add', '--file', writeEntryFile(work, entry({ urgency: 'now' }), 'u.json')], /urgency 'now'/],
        [['add', '--file', writeEntryFile(work, missing, 'm.json')], /meanwhile/],
        [['add', '--file', path.join(work, 'nope.json')], /nope\.json/],
        [['add'], /--file/],
        [['answer', '--id', 'D-1', '--answer', 'x'], /D-1/],
        [['answer', '--id', 'D-1'], /--answer/],
        [['answer', '--id', '7', '--answer', 'x'], /D-7/],
        [['close', '--id', 'D-1', '--outcome', 'answered', '--summary', 's'], /D-1/],
        [['close', '--id', 'D-1', '--outcome', 'answered'], /close needs --summary.*close --id D-7 --outcome <[a-z|-]+> --summary \$summary; set \$summary in a single-quoted here-string, never in double quotes\)\n$/],
        [['close', '--id', 'D-1', '--outcome', 'answered', '--summary', ' '], /--summary must.*--summary \$summary \(set \$summary in a single-quoted here-string, never in double quotes\)\n$/],
        [['close', '--id', 'D-1', '--summary', 's'], /--outcome/],
        [['close', '--id', 'D-1', '--outcome', 'answered', '--summary', 's', '--answer', 'x'], /close does not take --answer/],
        [['follow-up', '--id', 'D-1'], /follow-up needs --text/],
        [['follow-up', '--id', 'D-1', '--text', 'x'], /D-1/],
        [['follow-up', '--id', 'D-1', '--still-open', 'x'], /follow-up does not take --still-open/],
        [['keep-open', '--id', 'D-1'], /--still-open/],
        [['keep-open', '--id', 'D-1', '--still-open', 'x'], /D-1/],
        [['keep-open', '--id', 'D-1', '--text', 'x'], /keep-open does not take --text/],
        [['answers', '--ids', '7'], /not of the form D-7.*: 7\n$/],
        [['answers', '--id', 'D-1'], /answers does not take --id/],
        [['answers', 'D-1'], /unexpected argument 'D-1'/],
        [['resolve', '--id', 'D-1', '--outcome', 'answered', '--answer', 'x'], /resolve is gone.*answer.*close.*--summary.*follow-up/],
        [['list', '--ids', 'D-3'], /D-3/],
        [['frobnicate'], /frobnicate/],
        [[], /command/],
        [['list', '--colour'], /colour/],
        [['add', '--file', writeEntryFile(work, entry(), 'ok.json'), '--id', 'D-1'], /add does not take --id/],
        [['summary', '--open'], /summary does not take --open/],
        [['migrate', '--id', 'D-1'], /migrate does not take --id/],
        [['list', 'extra'], /extra/],
    ];
    fs.writeFileSync(path.join(work, 'bad.json'), '{ "kind": ');
    cases.push([['add', '--file', path.join(work, 'bad.json')], /not valid JSON/]);
    cases.push([['add', '--file', writeEntryFile(work, entry({ parent: 'D-4' }), 'p.json')], /parent D-4/]);
    const rootFile = writeEntryFile(work, entry(), 'r.json');
    cases.push([['add', '--file', rootFile, '--root', path.join(work, 'no', 'such')], /--root .*no[\\/]such/]);
    cases.push([['summary', '--root', rootFile], /--root .*r\.json/]);
    for (const [args, pattern] of cases) {
        const run = await runNode(REAL_SCRIPT, args, { cwd: work });
        assert.equal(run.code, 2, `${args.join(' ')} -> ${run.code} ${run.stderr}`);
        assert.match(run.stderr, pattern, args.join(' '));
        assert.equal(run.stdout, '');
    }
    // The parent case created the folder (add makes it before it reads); nothing was written in it.
    assert.deepEqual(fs.existsSync(path.join(work, 'decisions')) ? fs.readdirSync(path.join(work, 'decisions')) : [], []);
    assert.equal(fs.existsSync(path.join(work, 'no')), false, 'a missing --root is not created');
});

test('values that start with a dash are taken as written: an answer "- go with A" and a file named -entry.json', async (t) => {
    const work = makeScratchDir('dash');
    t.after(() => removeScratchDir(work));
    writeEntryFile(work, entry(), '-entry.json');
    for (const expected of ['D-1', 'D-2']) {
        const add = await runNode(REAL_SCRIPT, ['add', '--file', '-entry.json'], { cwd: work });
        assert.equal(add.code, 0, add.stderr);
        assert.equal(add.stdout.trim(), expected);
    }
    for (const [id, answer] of [['D-1', '- go with A'], ['D-2', '--root C:\\x']]) {
        await answerAndClose(REAL_SCRIPT, work, id, 'answered', answer, '- summed up');
    }
    const keep = await runNode(REAL_SCRIPT, ['add', '--file', '-entry.json'], { cwd: work });
    assert.equal(keep.stdout.trim(), 'D-3');
    await runNode(REAL_SCRIPT, ['answer', '--id', 'D-3', '--answer', 'half'], { cwd: work });
    assert.equal((await runNode(REAL_SCRIPT, ['keep-open', '--id', 'D-3', '--still-open', '- the rest'], { cwd: work })).code, 0);
    await runNode(REAL_SCRIPT, ['answer', '--id', 'D-3', '--answer', 'rest'], { cwd: work });
    assert.equal((await runNode(REAL_SCRIPT, ['follow-up', '--id', 'D-3', '--text', '--and more'], { cwd: work })).code, 0);
    const text = fs.readFileSync(path.join(work, 'decisions', 'RESOLVED_DECISIONS_CLAUDE.md'), 'utf8');
    assert.ok(text.includes(': "- go with A"\r\n- Summary: - summed up\r\n'), text);
    assert.ok(text.includes(': "--root C:\\x"\r\n'), text);
    assert.match(fs.readFileSync(path.join(work, 'decisions', 'OPEN_DECISIONS_CLAUDE.md'), 'utf8'), /- Follow up: .*: - the rest\r\n- Follow up: .*: --and more\r\n$/);
    assert.match((await runNode(REAL_SCRIPT, ['answers', '--words', '- go'], { cwd: work })).stdout, /^D-1, .*: "- go with A"\r\n$/);
});

test('an id shared by an open item and a different resolved item exits 2 and loses nothing', async (t) => {
    const work = makeScratchDir('merge');
    t.after(() => removeScratchDir(work));
    const folder = path.join(work, 'decisions');
    fs.mkdirSync(folder);
    const openText = `# Open decisions\r\n\r\nx\r\n\r\n## D-5 ${DOT} question ${DOT} blocking\r\n- Status: waiting-for-agent\r\n- What: item X from branch B\r\n`;
    const logText = '{"id":"D-5","answeredAt":"2026-10-24 10:00","answer":"Use option B for X","handedOverAt":null,"processedAt":null}\r\n';
    const resolvedText = `# Resolved decisions\r\n\r\nx\r\n\r\n## D-0005 ${DOT} question ${DOT} blocking\r\n- What: item Y\r\n- Resolved: 2026-10-24 10:00, answered: "Y done"\r\n`;
    fs.writeFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), openText);
    fs.writeFileSync(path.join(folder, 'ANSWERS_LOG_CLAUDE.jsonl'), logText);
    fs.writeFileSync(path.join(folder, 'RESOLVED_DECISIONS_CLAUDE.md'), resolvedText);
    const run = await runNode(REAL_SCRIPT, ['close', '--id', 'D-5', '--outcome', 'answered', '--summary', 'B for X.'], { cwd: work });
    assert.equal(run.code, 2, run.stderr);
    assert.match(run.stderr, /D-5 .*different item.*D-6/);
    assert.equal(fs.readFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), 'utf8'), openText);
    assert.equal(fs.readFileSync(path.join(folder, 'ANSWERS_LOG_CLAUDE.jsonl'), 'utf8'), logText);
    assert.equal(fs.readFileSync(path.join(folder, 'RESOLVED_DECISIONS_CLAUDE.md'), 'utf8'), resolvedText);
});

test('a broken answers log or answered file exits 1 naming the file and the line, and nothing is written', async (t) => {
    const work = makeScratchDir('brokenlog');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work })).code, 0);
    const folder = path.join(work, 'decisions');
    const openText = fs.readFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), 'utf8');
    const cases = [
        ['ANSWERS_LOG_CLAUDE.jsonl', '{"id":"D-1","answeredAt":"2026-10-26 09:00","answer":"ok"}\r\n{"id":\r\n', /ANSWERS_LOG_CLAUDE\.jsonl line 2 is not valid JSON/],
        ['ANSWERED_DECISIONS_CLAUDE.md', '# Answered decisions\r\n\r\nx\r\n\r\n## D-1\r\n- Answered: soon: "ok"\r\n', /ANSWERED_DECISIONS_CLAUDE\.md line 6 /],
    ];
    for (const [name, text, pattern] of cases) {
        fs.writeFileSync(path.join(folder, name), text);
        for (const args of [['answer', '--id', 'D-1', '--answer', 'x'], ['answers'], ['list', '--answered']]) {
            const run = await runNode(REAL_SCRIPT, args, { cwd: work });
            assert.equal(run.code, 1, `${name} ${args.join(' ')}: ${run.stderr}`);
            assert.match(run.stderr, pattern, args.join(' '));
            assert.equal(run.stdout, '');
        }
        assert.equal(fs.readFileSync(path.join(folder, name), 'utf8'), text);
        assert.equal(fs.readFileSync(path.join(folder, 'OPEN_DECISIONS_CLAUDE.md'), 'utf8'), openText);
        fs.rmSync(path.join(folder, name));
    }
    assert.deepEqual(fs.readdirSync(folder), ['OPEN_DECISIONS_CLAUDE.md']);
});

test('an old answered file is read as if folded, then folded by the next write, once', async (t) => {
    const work = makeScratchDir('fold');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work })).code, 0);
    const answeredPath = path.join(work, 'decisions', 'ANSWERED_DECISIONS_CLAUDE.md');
    const answeredText = '# Answered decisions\r\n\r\nx\r\n\r\n## D-1\r\n- Answered: 2026-10-24 10:00: "first"\r\n- Answered: 2026-10-24 10:05: "second"\r\n';
    fs.writeFileSync(answeredPath, answeredText);
    const listed = await runNode(REAL_SCRIPT, ['list', '--answered'], { cwd: work });
    assert.equal(listed.stdout, '## D-1\r\n- Answered: 2026-10-24 10:00: "first"\r\n- Answered: 2026-10-24 10:05: "second"\r\n');
    assert.equal((await runNode(REAL_SCRIPT, ['answers', '--words', 'SECOND'], { cwd: work })).stdout, 'D-1, answered 2026-10-24 10:05: "second"\r\n');
    assert.equal(fs.readFileSync(answeredPath, 'utf8'), answeredText, 'reading changes nothing');
    const close = await runNode(REAL_SCRIPT, ['close', '--id', 'D-1', '--outcome', 'answered', '--summary', 'Second.'], { cwd: work });
    assert.equal(close.code, 0, close.stderr);
    assert.equal(fs.existsSync(answeredPath), false);
    assert.deepEqual(logRecords(work).map((r) => [r.answeredAt, r.answer]), [['2026-10-24 10:00', 'first'], ['2026-10-24 10:05', 'second']]);
    assert.match(fs.readFileSync(path.join(work, 'decisions', 'RESOLVED_DECISIONS_CLAUDE.md'), 'utf8'), /- Final answer: 2026-10-24 10:05: "second"\r\n- Summary: Second\.\r\n- Resolved: /);
});

// ---------------------------------------------------------------------------------------------------------------
// Line endings
// ---------------------------------------------------------------------------------------------------------------

test('an LF register stays LF and a CRLF register stays CRLF through add, answer and close', async (t) => {
    const work = makeScratchDir('eol');
    t.after(() => removeScratchDir(work));
    const folder = path.join(work, 'decisions');
    fs.mkdirSync(folder);
    const openPath = path.join(folder, 'OPEN_DECISIONS_CLAUDE.md');
    const logPath = path.join(folder, 'ANSWERS_LOG_CLAUDE.jsonl');
    const resolvedPath = path.join(folder, 'RESOLVED_DECISIONS_CLAUDE.md');
    const kept = '{"id":"D-9","answeredAt":"2026-10-20 10:00","answer":"kept as LF","handedOverAt":null,"processedAt":"2026-10-20 11:00"}';
    fs.writeFileSync(openPath, '# Open decisions\n\nKept as LF.\n');
    fs.writeFileSync(logPath, `${kept}\n`);
    fs.writeFileSync(resolvedPath, '# Resolved decisions\r\n\r\nKept as CRLF.\r\n');
    const file = writeEntryFile(work, entry());
    await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
    await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-11', '--answer', 'later'], { cwd: work })).code, 0, 'D-9 has answers, so the adds gave D-10 and D-11');
    await answerAndClose(REAL_SCRIPT, work, 'D-10', 'wont-fix', 'no');
    const openText = fs.readFileSync(openPath, 'utf8');
    const logText = fs.readFileSync(logPath, 'utf8');
    const resolvedText = fs.readFileSync(resolvedPath, 'utf8');
    assert.equal(openText.includes('\r'), false);
    assert.ok(openText.startsWith('# Open decisions\n\nKept as LF.\n\n## D-11 '));
    assert.equal(logText.includes('\r'), false);
    assert.equal(logText.split('\n').length, 4, 'three records, LF after each');
    assert.ok(logText.startsWith(`${kept}\n{"id":"D-11","answeredAt":`));
    assert.equal((await runNode(REAL_SCRIPT, ['answers', '--json'], { cwd: work })).stdout, logText, 'answers --json keeps the LF');
    assert.equal(/(?<!\r)\n/.test(resolvedText), false);
    assert.ok(resolvedText.startsWith('# Resolved decisions\r\n\r\nKept as CRLF.\r\n\r\n## D-10 '));
});

// ---------------------------------------------------------------------------------------------------------------
// Concurrency and the lock
// ---------------------------------------------------------------------------------------------------------------

test('twelve processes adding at once lose no entry and repeat no id', async (t) => {
    const work = makeScratchDir('conc');
    t.after(() => removeScratchDir(work));
    const processes = 12;
    const perProcess = 3;
    const runs = [];
    for (let p = 0; p < processes; p += 1) {
        runs.push((async () => {
            const ids = [];
            for (let i = 0; i < perProcess; i += 1) {
                const file = writeEntryFile(work, entry({ what: `marker p${p} i${i}` }), `e-${p}-${i}.json`);
                const run = await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
                assert.equal(run.code, 0, run.stderr);
                ids.push(run.stdout.trim());
            }
            return ids;
        })());
    }
    const ids = (await Promise.all(runs)).flat();
    const expected = Array.from({ length: processes * perProcess }, (_, i) => `D-${i + 1}`);
    assert.deepEqual([...ids].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))), expected);
    const text = fs.readFileSync(path.join(work, 'decisions', 'OPEN_DECISIONS_CLAUDE.md'), 'utf8');
    assert.deepEqual(idsOf(text), expected, 'file order is id order');
    for (let p = 0; p < processes; p += 1) {
        for (let i = 0; i < perProcess; i += 1) {
            assert.equal(text.split(`- What: marker p${p} i${i}\r\n`).length, 2, `p${p} i${i} once`);
        }
    }
    assert.deepEqual(fs.readdirSync(path.join(work, 'decisions')).sort(), ['OPEN_DECISIONS_CLAUDE.md']);
});

test('answers, closes and adds running at once keep every file whole', async (t) => {
    const work = makeScratchDir('mixed');
    t.after(() => removeScratchDir(work));
    const file = writeEntryFile(work, entry());
    for (let i = 0; i < 8; i += 1) {
        await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work });
    }
    for (let i = 1; i <= 8; i += 2) {
        await runNode(REAL_SCRIPT, ['answer', '--id', `D-${i}`, '--answer', `ok ${i}`], { cwd: work });
    }
    const runs = [];
    for (let i = 1; i <= 8; i += 2) {
        runs.push(runNode(REAL_SCRIPT, ['close', '--id', `D-${i}`, '--outcome', 'accepted', '--summary', `ok ${i}`], { cwd: work }));
        runs.push(runNode(REAL_SCRIPT, ['answer', '--id', `D-${i + 1}`, '--answer', `later ${i + 1}`], { cwd: work }));
        runs.push(runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: work }));
    }
    for (const run of await Promise.all(runs)) {
        assert.equal(run.code, 0, run.stderr);
    }
    const listOpen = idsOf((await runNode(REAL_SCRIPT, ['list', '--open'], { cwd: work })).stdout);
    const listAnswered = idsOf((await runNode(REAL_SCRIPT, ['list', '--answered'], { cwd: work })).stdout);
    const listResolved = idsOf((await runNode(REAL_SCRIPT, ['list', '--resolved'], { cwd: work })).stdout);
    assert.deepEqual(listOpen, ['D-2', 'D-4', 'D-6', 'D-8', 'D-9', 'D-10', 'D-11', 'D-12']);
    assert.deepEqual([...listAnswered].sort(), ['D-2', 'D-4', 'D-6', 'D-8']);
    assert.deepEqual([...listResolved].sort(), ['D-1', 'D-3', 'D-5', 'D-7']);
    const listAll = idsOf((await runNode(REAL_SCRIPT, ['list', '--open', '--answered', '--resolved'], { cwd: work })).stdout);
    assert.deepEqual(listAll, [...listOpen, ...listAnswered, ...listResolved], 'all flags list every file, open first');
    assert.deepEqual(idsOf((await runNode(REAL_SCRIPT, ['list'], { cwd: work })).stdout), listAll, 'no flag lists every file');
});

test('add waits for a held lock and goes ahead once it is released', async (t) => {
    const work = makeScratchDir('wait');
    t.after(() => removeScratchDir(work));
    fs.mkdirSync(path.join(work, 'decisions'));
    const lockPath = path.join(work, 'decisions', '.lock');
    fs.writeFileSync(lockPath, 'held by the test');
    setTimeout(() => fs.unlinkSync(lockPath), 800);
    const run = await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work });
    assert.equal(run.code, 0, run.stderr);
    assert.ok(run.ms >= 700, `waited ${run.ms} ms`);
});

// ---------------------------------------------------------------------------------------------------------------
// .git/info/exclude
// ---------------------------------------------------------------------------------------------------------------

// The lines a client repo's info/exclude gets: the register's own files, its lock and the temp files of its writes.
const EXCLUDE_LINES = [
    '/decisions/OPEN_DECISIONS_CLAUDE.md', '/decisions/ANSWERED_DECISIONS_CLAUDE.md', '/decisions/RESOLVED_DECISIONS_CLAUDE.md',
    '/decisions/ANSWERS_LOG_CLAUDE.jsonl', '/decisions/.lock', '/decisions/.OPEN_DECISIONS_CLAUDE.md.*.tmp',
    '/decisions/.ANSWERED_DECISIONS_CLAUDE.md.*.tmp', '/decisions/.RESOLVED_DECISIONS_CLAUDE.md.*.tmp',
    '/decisions/.ANSWERS_LOG_CLAUDE.jsonl.*.tmp',
];

test('a non-matching repo gets the register files in info/exclude once each, and git then ignores the register', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('client');
    t.after(() => removeScratchDir(base));
    const repo = path.join(base, 'ClientRepo');
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    runGit(gitExe, ['init', '-q'], repo);
    const exclude = path.join(repo, '.git', 'info', 'exclude');
    const before = fs.readFileSync(exclude, 'utf8');
    const file = writeEntryFile(base, entry());
    for (let i = 0; i < 2; i += 1) {
        assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: path.join(repo, 'src') })).code, 0);
    }
    fs.rmSync(path.join(repo, 'decisions'), { recursive: true });
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: repo })).code, 0, 'folder made again');
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: repo })).code, 0);
    await answerAndClose(REAL_SCRIPT, repo, 'D-1', 'fixed', 'ok');
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-2', '--answer', 'later'], { cwd: repo })).code, 0);
    // What a crashed writer leaves behind is ignored too.
    fs.writeFileSync(path.join(repo, 'decisions', '.lock'), '');
    fs.writeFileSync(path.join(repo, 'decisions', '.OPEN_DECISIONS_CLAUDE.md.4242.tmp'), '');
    fs.writeFileSync(path.join(repo, 'decisions', '.ANSWERED_DECISIONS_CLAUDE.md.4242.tmp'), '');
    fs.writeFileSync(path.join(repo, 'decisions', '.ANSWERS_LOG_CLAUDE.jsonl.4242.tmp'), '');
    const after = fs.readFileSync(exclude, 'utf8');
    const lines = after.split(/\r?\n/).map((l) => l.trim());
    for (const line of EXCLUDE_LINES) {
        assert.equal(lines.filter((l) => l === line).length, 1, line);
    }
    assert.equal(lines.includes('/decisions/'), false, 'the folder itself is not excluded');
    assert.ok(after.startsWith(before), 'existing lines kept');
    assert.equal(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], repo), '');
    assert.equal(fs.existsSync(path.join(repo, '.gitignore')), false);
});

test('first adds racing in a client repo write each exclude line once', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('race');
    t.after(() => removeScratchDir(base));
    const repo = path.join(base, 'ClientRepo');
    fs.mkdirSync(repo);
    runGit(gitExe, ['init', '-q'], repo);
    const file = writeEntryFile(base, entry());
    const runs = await Promise.all(Array.from({ length: 8 }, () => runNode(REAL_SCRIPT, ['add', '--file', file], { cwd: repo })));
    assert.deepEqual(runs.map((r) => r.code), Array(8).fill(0), runs.map((r) => r.stderr).join(''));
    const lines = fs.readFileSync(path.join(repo, '.git', 'info', 'exclude'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    for (const line of EXCLUDE_LINES) {
        assert.equal(lines.filter((l) => l === line).length, 1, line);
    }
});

test('a client repo that already has a decisions folder keeps the register out of git and its own files in', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('adr');
    t.after(() => removeScratchDir(base));
    const repo = path.join(base, 'ClientRepo');
    fs.mkdirSync(path.join(repo, 'decisions'), { recursive: true });
    runGit(gitExe, ['init', '-q'], repo);
    fs.writeFileSync(path.join(repo, 'decisions', 'ADR-001.md'), '# ADR 1\n');
    runGit(gitExe, ['add', '-A'], repo);
    runGit(gitExe, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-q', '-m', 'adr'], repo);
    const add = await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(base, entry())], { cwd: repo });
    assert.equal(add.code, 0, add.stderr);
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'x'], { cwd: repo })).code, 0);
    assert.equal(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], repo), '');
    fs.writeFileSync(path.join(repo, 'decisions', 'ADR-002.md'), '# ADR 2\n');
    assert.equal(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], repo), '?? decisions/ADR-002.md');
});

test('a client repo whose register predates the answers log gets its exclude lines from the first answer, so git never sees the log', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('oldclient');
    t.after(() => removeScratchDir(base));
    const repo = path.join(base, 'ClientRepo');
    fs.mkdirSync(repo);
    runGit(gitExe, ['init', '-q'], repo);
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(base, entry())], { cwd: repo })).code, 0);
    const exclude = path.join(repo, '.git', 'info', 'exclude');
    const older = fs.readFileSync(exclude, 'utf8').split('\n').filter((l) => !l.includes('ANSWERS_LOG')).join('\n');
    fs.writeFileSync(exclude, older);
    assert.equal((await runNode(REAL_SCRIPT, ['answer', '--id', 'D-1', '--answer', 'x'], { cwd: repo })).code, 0);
    assert.ok(fs.existsSync(path.join(repo, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl')));
    assert.equal(runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], repo), '');
});

/**
 * Makes a git repo, with its folders, and gives its info/exclude file.
 * @param {string} dir the repo folder
 * @returns {string} path of .git\info\exclude
 */
function makeGitRepo(dir) {
    fs.mkdirSync(dir, { recursive: true });
    runGit(gitExe, ['init', '-q'], dir);
    return path.join(dir, '.git', 'info', 'exclude');
}

/**
 * Whether an add through a register script left a repo's info/exclude as it was (the repo commits the register) or
 * wrote the register's lines into it (the register stays out of git).
 * @param {string} script the register script
 * @param {string} repo a repo made by makeGitRepo
 * @param {string} file an entry file
 * @param {object} [env] extra environment for the script
 * @returns {Promise<{commits: boolean, stderr: string}>} the outcome and what the script wrote to stderr
 */
async function addAndSeeWhetherCommitted(script, repo, file, env = {}) {
    const exclude = path.join(repo, '.git', 'info', 'exclude');
    const before = fs.readFileSync(exclude);
    const run = await runNode(script, ['add', '--file', file], { cwd: repo, env });
    assert.equal(run.code, 0, run.stderr);
    return { commits: fs.readFileSync(exclude).equals(before), stderr: run.stderr };
}

test('without a PC settings file the repos beside the repo commit the register, others do not, and the old setting is not read', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('pcdefault');
    t.after(() => removeScratchDir(base));
    const other = path.join(base, 'OtherDemo');
    // The copy lies in <base>\Apps\sda, so the default is <base>\Apps\*; the old setting would let OtherDemo commit.
    const skill = makeSkillCopy(path.join(base, 'Apps', 'sda'), (config) => { config.register.commitInRepos = [path.join(base, 'Other*')]; });
    const script = path.join(skill, 'scripts', 'register.mjs');
    const demo = path.join(base, 'Apps', 'Demo');
    makeGitRepo(demo);
    makeGitRepo(other);
    const file = writeEntryFile(base, entry());
    assert.deepEqual(await addAndSeeWhetherCommitted(script, demo, file), { commits: true, stderr: '' });
    assert.deepEqual(await addAndSeeWhetherCommitted(script, other, file), { commits: false, stderr: '' });
});

test('a PC settings file that is not valid JSON is named on stderr and the default applies', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('pcbroken');
    t.after(() => removeScratchDir(base));
    const skill = makeSkillCopy(path.join(base, 'Apps', 'sda'));
    const settingsFile = path.join(base, 'Apps', 'sda', 'state', 'pc-settings.json');
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(settingsFile, '{ "register": { "commitInRepos": [] ');
    const demo = path.join(base, 'Apps', 'Demo');
    makeGitRepo(demo);
    const seen = await addAndSeeWhetherCommitted(path.join(skill, 'scripts', 'register.mjs'), demo, writeEntryFile(base, entry()));
    assert.equal(seen.commits, true, 'the default, not the broken file\'s empty list');
    assert.equal(seen.stderr, `PC SETTINGS NOT USED | ${settingsFile} is not valid JSON (${jsonError('{ "register": { "commitInRepos": [] ')}). register.commitInRepos is the default: ${path.join(base, 'Apps', '*')}. Fix the file or delete it.\n`);
});

test('a skill folder reached through a junction takes its default from the real parent folder', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('pclink');
    t.after(() => removeScratchDir(base));
    const skill = makeSkillCopy(path.join(base, 'Apps', 'sda'));
    const link = path.join(base, 'Link');
    fs.symlinkSync(path.join(base, 'Apps', 'sda'), link, 'junction');
    try {
        assert.equal(fs.existsSync(path.join(link, path.basename(skill), 'scripts', 'register.mjs')), true);
        const other = path.join(base, 'OtherDemo');
        makeGitRepo(other);
        // Node keeps the junction in the script's own path only with these options; without them it resolves it itself.
        const env = { NODE_OPTIONS: '--preserve-symlinks --preserve-symlinks-main' };
        const seen = await addAndSeeWhetherCommitted(path.join(link, 'orchestrate-agents', 'scripts', 'register.mjs'), other, writeEntryFile(base, entry()), env);
        assert.deepEqual(seen, { commits: false, stderr: '' }, 'the default is <base>\\Apps\\*, not <base>\\*');
    } finally {
        // Removes the link only, never what it points at.
        fs.rmdirSync(link);
    }
});

/**
 * The message JSON.parse gives for a text, as the script quotes it.
 * @param {string} text text that is not valid JSON
 * @returns {string} the parser's message
 */
function jsonError(text) {
    try {
        JSON.parse(text);
    } catch (error) {
        return error.message;
    }
    throw new Error('the text is valid JSON');
}

test('a matching repo never gets an exclude line, so git sees the register', { skip: gitExe ? false : 'no working git found' }, async (t) => {
    const base = makeScratchDir('own');
    t.after(() => removeScratchDir(base));
    const skill = makeSkillCopy(base);
    const settingsFile = path.join(base, 'state', 'pc-settings.json');
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(settingsFile, JSON.stringify({ register: { commitInRepos: [path.join(base, 'Mine', '*')] } }));
    const script = path.join(skill, 'scripts', 'register.mjs');
    const repo = path.join(base, 'Mine', 'Demo');
    const other = path.join(base, 'Mine2', 'OtherDemo');
    for (const dir of [repo, other]) {
        fs.mkdirSync(dir, { recursive: true });
        runGit(gitExe, ['init', '-q'], dir);
    }
    const exclude = path.join(repo, '.git', 'info', 'exclude');
    const before = fs.readFileSync(exclude);
    const file = writeEntryFile(base, entry());
    assert.equal((await runNode(script, ['add', '--file', file], { cwd: repo })).code, 0);
    assert.equal((await runNode(script, ['answer', '--id', 'D-1', '--answer', 'x'], { cwd: repo })).code, 0);
    assert.ok(fs.readFileSync(exclude).equals(before), 'exclude untouched');
    const status = runGit(gitExe, ['status', '--porcelain', '--untracked-files=all'], repo);
    assert.match(status, /decisions\/OPEN_DECISIONS_CLAUDE\.md/);
    assert.match(status, /decisions\/ANSWERS_LOG_CLAUDE\.jsonl/);
    assert.equal((await runNode(script, ['add', '--file', file], { cwd: other })).code, 0);
    assert.match(fs.readFileSync(path.join(other, '.git', 'info', 'exclude'), 'utf8'), /^\/decisions\/OPEN_DECISIONS_CLAUDE\.md$/m, 'Mine2 is not Mine');
});

test('a folder that is no repo gets the register and no .git', async (t) => {
    const work = makeScratchDir('norepo');
    t.after(() => removeScratchDir(work));
    assert.equal((await runNode(REAL_SCRIPT, ['add', '--file', writeEntryFile(work, entry())], { cwd: work })).code, 0);
    assert.deepEqual(fs.readdirSync(work).sort(), ['decisions', 'entry.json']);
});
