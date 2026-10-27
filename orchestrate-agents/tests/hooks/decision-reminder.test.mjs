// Tests of hooks/decision-reminder.mjs run as a real child process with hook input on stdin: what it prints for
// blocking entries that wait for the user, for answers it hands over (each once, and never on a busy register), for
// answered entries handed over earlier, and for nothing else; that it reads only the register of the session's own repo
// (D-14); that it says nothing in a session the team is not switched on for (D-32); that it never fails the prompt; and
// how long it takes.
// Every session works in a scratch repo, so no case reads the real agent repo's register.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    REAL_CONFIG_PATH, SKILL_DIR, findGit, makeScratchDir, makeSkillCopy, median, removeScratchDir, runGit, runNode,
    stateRootUnderHome,
} from '../helpers/scratch.mjs';

const gitExe = findGit();
const NO_GIT = gitExe ? false : 'no working git found';
const REAL_HOOK = path.join(SKILL_DIR, 'hooks', 'decision-reminder.mjs');
const REGISTER_SCRIPT = path.join(SKILL_DIR, 'scripts', 'register.mjs');
const BLOCKING_INSTRUCTION = 'Each blocking entry above stops work until the user answers it. Do not write it out in this chat: the user reads and answers it in the Decisions pane. End your reply with one line naming each blocking id and what, asking the user to answer it there soon.';
const ANSWERED_INSTRUCTION = 'If you are already dealing with it, carry on and do not pass the answer to the lead again; otherwise read it with register.mjs answers --ids <id> and process it.';
const HANDOVER_INSTRUCTION = 'For each answer: pass it, in the user\'s words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in double quotes.';
const SESSION = '7b3870e5-e7c1-4f3a-9961-398d55920189';

// The test session is switched on, as /software-developer-agent does, in a home folder of the tests' own: every hook
// run gets it as its USERPROFILE, which the shipped teamState.folder names, and as its %TEMP%, so neither the real
// state folder nor the real temp folder is read or written. A test of an ordinary chat passes OFF_ENV instead.
const TEAM_HOME = makeScratchDir('team-on');
after(() => removeScratchDir(TEAM_HOME));
fs.mkdirSync(path.join(stateRootUnderHome(TEAM_HOME), 'team-on'), { recursive: true });
fs.writeFileSync(path.join(stateRootUnderHome(TEAM_HOME), 'team-on', SESSION), '2026-10-26T22:00:00.000Z');
const ON_ENV = { USERPROFILE: TEAM_HOME, TEMP: TEAM_HOME, TMP: TEAM_HOME };
const OFF_HOME = makeScratchDir('team-off');
after(() => removeScratchDir(OFF_HOME));
const OFF_ENV = { USERPROFILE: OFF_HOME, TEMP: OFF_HOME, TMP: OFF_HOME };

/**
 * The hook input Claude Code sends on UserPromptSubmit.
 * @param {string} cwd the session's working folder
 * @returns {string} JSON text for stdin
 */
function promptInput(cwd) {
    return JSON.stringify({
        session_id: SESSION,
        transcript_path: 'C:\\Users\\someone\\.claude\\projects\\c--x\\7b3870e5-e7c1-4f3a-9961-398d55920189.jsonl',
        cwd,
        permission_mode: 'default',
        hook_event_name: 'UserPromptSubmit',
        prompt: 'carry on \u2018please\u2019 & thanks',
    });
}

/**
 * Adds items to the register of a folder through the real script: by default one blocking question (urgency high)
 * and one initiative (urgency low).
 * @param {string} dir working folder
 * @param {Array<[string, boolean, string]>} [kinds] kind, blocking and urgency of each item, in order
 */
async function fillRegister(dir, kinds = [['question', true, 'high'], ['initiative', false, 'low']]) {
    const base = {
        raisedBy: 'lead demo', task: 'Demo', what: 'x', example: 'y', options: ['A: a (none)'],
        recommendation: 'A', meanwhile: 'waits', evidence: ['e.log'],
    };
    for (const [i, [kind, blocking, urgency]] of kinds.entries()) {
        const file = path.join(dir, `item-${i}.json`);
        fs.writeFileSync(file, JSON.stringify({ ...base, kind, blocking, urgency }));
        const run = await runNode(REGISTER_SCRIPT, ['add', '--file', file], { cwd: dir });
        assert.equal(run.code, 0, run.stderr);
        fs.rmSync(file);
    }
}

/**
 * Records an answer through the real script.
 * @param {string} dir working folder
 * @param {string} id the entry
 * @param {string} [words] the user's words
 * @param {string[]} [extra] more options, such as --handed-over
 */
async function answer(dir, id, words = 'yes', extra = []) {
    const run = await runNode(REGISTER_SCRIPT, ['answer', '--id', id, '--answer', words, ...extra], { cwd: dir });
    assert.equal(run.code, 0, run.stderr);
}

/**
 * Runs a register command through the real script and checks it exits 0.
 * @param {string} dir working folder
 * @param {string[]} args the command and its options
 */
async function register(dir, args) {
    const run = await runNode(REGISTER_SCRIPT, args, { cwd: dir });
    assert.equal(run.code, 0, run.stderr);
}

/**
 * Reads a repo's CRLF answers log and parses its records.
 * @param {string} repo the repo root
 * @returns {object[]} the records in file order
 */
function logRecords(repo) {
    return fs.readFileSync(logPath(repo), 'utf8').split('\r\n').slice(0, -1).map((l) => JSON.parse(l));
}

/**
 * The answers log of a repo.
 * @param {string} repo the repo root
 * @returns {string} its path
 */
function logPath(repo) {
    return path.join(repo, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl');
}

/**
 * Holds a repo's register lock the way file-lock.mjs takes it: a new file with the holder's pid and time.
 * @param {string} repo the repo root
 * @returns {() => void} releases the lock
 */
function holdLock(repo) {
    const lockPath = path.join(repo, 'decisions', '.lock');
    fs.writeFileSync(lockPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
    return () => fs.rmSync(lockPath);
}

/**
 * Makes a scratch git repo.
 * @param {string} base scratch folder
 * @param {string} name the repo's folder name
 * @returns {string} its path
 */
function makeRepo(base, name) {
    const repo = path.join(base, name);
    fs.mkdirSync(repo, { recursive: true });
    runGit(gitExe, ['init', '-q'], repo);
    return repo;
}

/**
 * Runs the hook for a session working in a folder and returns its context lines; the process starts outside every
 * repo, so only the input's cwd leads it to a register.
 * @param {string} cwd the session's working folder
 * @param {string} base scratch folder the process starts in
 * @returns {Promise<{run: object, lines: string[]}>} the run and the lines of its additional context
 */
async function remind(cwd, base) {
    const run = await runNode(REAL_HOOK, [], { input: promptInput(cwd), cwd: base, env: ON_ENV });
    assert.equal(run.code, 0, run.stderr);
    if (run.stdout === '') {
        return { run, lines: [] };
    }
    const out = JSON.parse(run.stdout);
    assert.deepEqual(Object.keys(out), ['hookSpecificOutput']);
    assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    return { run, lines: out.hookSpecificOutput.additionalContext.split('\n') };
}

/**
 * The register's line naming its blocking entries that wait for the user.
 * @param {string} root the repo root the line must name
 * @param {string} items the items as the line lists them
 * @returns {string} the whole line
 */
function blockingLine(root, items = 'D-1 "x" (urgency high)') {
    return `Decision register of ${path.basename(root)} (${root}): blocking and waiting for the user: ${items}.`;
}

/**
 * The register's line above the answers handed over in this prompt.
 * @param {string} root the repo root the line must name
 * @returns {string} the whole line
 */
function handedNowLine(root) {
    return `Decision register of ${path.basename(root)} (${root}): the user's answers, handed to you now:`;
}

/**
 * One answer block as the hook and handover lay it out.
 * @param {string} label the entry's label, such as 'D-2 "x"'
 * @param {object} record the answer's record in the log
 * @returns {string} the label and time line, then the words
 */
function answerBlock(label, record) {
    return `${label}, answered ${record.answeredAt}:\n${record.answer}`;
}

/**
 * The register's line naming the entries handed over earlier that still wait for an agent.
 * @param {string} root the repo root the line must name
 * @param {string} items the items as the line lists them, such as 'D-7 (handed over 2026-10-26 10:15)'
 * @returns {string} the whole line
 */
function earlierLine(root, items) {
    return `Decision register of ${path.basename(root)} (${root}): handed to you earlier and not yet closed or followed up: ${items}.`;
}

/**
 * Runs the hook and gives its whole additional context ('' when it printed nothing).
 * @param {string} cwd the session's working folder
 * @param {string} base scratch folder the process starts in
 * @returns {Promise<{run: object, context: string}>} the run and the context
 */
async function remindText(cwd, base) {
    const { run, lines } = await remind(cwd, base);
    return { run, context: lines.join('\n') };
}

// ---------------------------------------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------------------------------------

test('the blocking line and its instruction first, then the answers handed over now, then those handed over earlier', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind');
    t.after(() => removeScratchDir(base));
    const demo = makeRepo(base, 'Demo');
    const deep = path.join(demo, 'src', 'deep');
    fs.mkdirSync(deep, { recursive: true });
    await fillRegister(demo, [['question', true, 'high'], ['initiative', false, 'low'], ['issue', true, 'medium'], ['question', false, 'low']]);
    await answer(demo, 'D-2');
    await answer(demo, 'D-4');
    const first = await remind(deep, base);
    assert.equal(first.run.stderr, '');
    const records = logRecords(demo);
    assert.deepEqual(first.lines, [
        blockingLine(demo, 'D-1 "x" (urgency high), D-3 "x" (urgency medium)'),
        BLOCKING_INSTRUCTION,
        handedNowLine(demo),
        ...answerBlock('D-2 "x"', records[0]).split('\n'), '',
        ...answerBlock('D-4 "x"', records[1]).split('\n'),
        HANDOVER_INSTRUCTION,
    ]);
    const second = await remind(deep, base);
    assert.equal(second.run.stderr, '');
    assert.deepEqual(second.lines, [
        blockingLine(demo, 'D-1 "x" (urgency high), D-3 "x" (urgency medium)'),
        BLOCKING_INSTRUCTION,
        earlierLine(demo, `D-2 (handed over ${records[0].handedOverAt}), D-4 (handed over ${records[1].handedOverAt})`),
        ANSWERED_INSTRUCTION,
    ]);
});

test('each answer is handed over once: its words in the first prompt, then named as handed earlier until it is closed or followed up', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-once');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', true, 'high'], ['issue', false, 'low']]);
    await answer(chat, 'D-1', 'A,\r\nretry once \u2018quoted\u2019 & za\u017c\u00f3\u0142\u0107');
    await answer(chat, 'D-2', 'typed in the chat', ['--handed-over']);

    const first = await remindText(chat, base);
    const handed = logRecords(chat);
    assert.match(handed[0].handedOverAt, /^\d{4}-\d\d-\d\d \d\d:\d\d$/, 'the hook marks what it handed over');
    assert.equal(handed[1].handedOverAt, handed[1].answeredAt);
    assert.deepEqual([first.run.stderr, first.context], ['', [
        handedNowLine(chat), answerBlock('D-1 "x"', handed[0]), HANDOVER_INSTRUCTION,
        earlierLine(chat, `D-2 (handed over ${handed[1].handedOverAt})`), ANSWERED_INSTRUCTION,
    ].join('\n')]);

    const second = await remindText(chat, base);
    assert.equal(second.context, [
        earlierLine(chat, `D-1 (handed over ${handed[0].handedOverAt}), D-2 (handed over ${handed[1].handedOverAt})`), ANSWERED_INSTRUCTION,
    ].join('\n'));
    assert.equal(second.context.includes('retry once'), false, 'the words are never given twice');
    assert.deepEqual(logRecords(chat), handed, 'a later prompt writes nothing');

    await register(chat, ['follow-up', '--id', 'D-1', '--text', 'which day?']);
    assert.equal((await remindText(chat, base)).context, [
        blockingLine(chat), BLOCKING_INSTRUCTION, earlierLine(chat, `D-2 (handed over ${handed[1].handedOverAt})`), ANSWERED_INSTRUCTION,
    ].join('\n'));
    await register(chat, ['close', '--id', 'D-2', '--outcome', 'answered', '--summary', 'Done.']);
    assert.equal((await remindText(chat, base)).context, [blockingLine(chat), BLOCKING_INSTRUCTION].join('\n'));
});

test('a busy register: no answer is handed over or named, one stderr line, the short wait only; the next prompt hands them over', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-busy');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', false, 'high'], ['question', false, 'high'], ['question', false, 'high']]);
    await answer(chat, 'D-2', 'first words');
    assert.match((await remindText(chat, base)).context, /handed to you now:\nD-2 "x", answered .*:\nfirst words\n/);
    await answer(chat, 'D-1', 'waits');
    await answer(chat, 'D-2', 'second words');
    await answer(chat, 'D-3', 'typed in the chat', ['--handed-over']);
    const stored = fs.readFileSync(logPath(chat), 'utf8');
    const records = logRecords(chat);

    const release = holdLock(chat);
    const busy = await remindText(chat, base);
    release();
    assert.equal(busy.context, [earlierLine(chat, `D-3 (handed over ${records[3].handedOverAt})`), ANSWERED_INSTRUCTION].join('\n'),
        'D-2 has an answer not handed over yet, so it is not named as handed earlier');
    assert.equal(busy.run.stderr.trim().split(/\r?\n/).length, 1, busy.run.stderr);
    assert.match(busy.run.stderr, /^decision-reminder: .*busy: .*\.lock stayed taken for 2 s/);
    assert.ok(busy.run.ms < 8000, `the hook waited ${busy.run.ms} ms, not the register's 10 s`);
    assert.equal(fs.readFileSync(logPath(chat), 'utf8'), stored, 'nothing is written');

    const next = await remindText(chat, base);
    const after = logRecords(chat);
    assert.equal(next.context, [
        handedNowLine(chat), [answerBlock('D-1 "x"', after[1]), answerBlock('D-2 "x"', after[2])].join('\n\n'), HANDOVER_INSTRUCTION,
        earlierLine(chat, `D-3 (handed over ${records[3].handedOverAt})`), ANSWERED_INSTRUCTION,
    ].join('\n'));
});

test('an entry waiting for an agent with no unprocessed answer (an answer cut short by a crash) is not named as handed over', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-no-answer');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', false, 'high']]);
    // answer writes the open file first; a crash before the log leaves the Status changed and no record.
    const openPath = path.join(chat, 'decisions', 'OPEN_DECISIONS_CLAUDE.md');
    fs.writeFileSync(openPath, fs.readFileSync(openPath, 'utf8').replace('- Status: waiting-for-user', '- Status: waiting-for-agent'));
    const { run, context } = await remindText(chat, base);
    assert.deepEqual([context, run.stderr], ['', '']);
});

test('a broken answers log leaves the answers out and writes one stderr line naming it; the blocking line still shows', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-broken-log');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', true, 'high'], ['question', true, 'low']]);
    await answer(chat, 'D-2');
    fs.appendFileSync(logPath(chat), 'not json\r\n');
    const { run, context } = await remindText(chat, base);
    assert.equal(context, [blockingLine(chat), BLOCKING_INSTRUCTION].join('\n'));
    assert.equal(run.stderr.trim().split(/\r?\n/).length, 1, run.stderr);
    assert.match(run.stderr, /^decision-reminder: .*ANSWERS_LOG_CLAUDE\.jsonl line 2 is not valid JSON/);
});

test('entries that wait for the user and block nothing are not mentioned (the user answers them in a tab of their own)', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-quiet');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', false, 'high'], ['issue', false, 'low']]);
    const { run, lines } = await remind(chat, base);
    assert.deepEqual([lines, run.stderr], [[], '']);
});

test('only answers waiting: the handed-now line, the answers and the instruction alone', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-answered');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', true, 'high']]);
    await answer(chat, 'D-1');
    const { lines } = await remind(chat, base);
    assert.deepEqual(lines, [handedNowLine(chat), ...answerBlock('D-1 "x"', logRecords(chat)[0]).split('\n'), HANDOVER_INSTRUCTION]);
});

test('an entry of an older register, without a Status line or an Urgency line, still shows as blocking', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-old');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    fs.mkdirSync(path.join(chat, 'decisions'));
    fs.writeFileSync(path.join(chat, 'decisions', 'OPEN_DECISIONS_CLAUDE.md'), '# Open decisions\r\n\r\nx\r\n\r\n## D-0006 \u00b7 question \u00b7 blocking\r\n- What: old one\r\n');
    const { lines } = await remind(chat, base);
    assert.deepEqual(lines, [blockingLine(chat, 'D-6 "old one"'), BLOCKING_INSTRUCTION]);
});

test('another repo\'s register never shows, blocking and answered entries alike (D-14)', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-other');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'xpp-demo');
    const team = makeRepo(base, 'agent-demo');
    await fillRegister(team, [['question', true, 'high'], ['issue', true, 'high']]);
    await answer(team, 'D-2');
    const teamLog = fs.readFileSync(logPath(team), 'utf8');
    assert.deepEqual((await remind(chat, base)).lines, []);
    await fillRegister(chat, [['question', true, 'low']]);
    const { run, lines } = await remind(chat, base);
    assert.equal(run.stderr, '');
    assert.deepEqual(lines, [blockingLine(chat, 'D-1 "x" (urgency low)'), BLOCKING_INSTRUCTION]);
    assert.equal(fs.readFileSync(logPath(team), 'utf8'), teamLog, 'another repo\'s answers are never handed over');
});

test('a session the team is not switched on for hears nothing and hands nothing over, whatever waits (D-32)', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-off');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat, [['question', true, 'high'], ['issue', true, 'high']]);
    await answer(chat, 'D-2');
    const before = fs.readFileSync(logPath(chat), 'utf8');
    for (const [input, env] of [[promptInput(chat), OFF_ENV], [JSON.stringify({ cwd: chat, hook_event_name: 'UserPromptSubmit', prompt: 'x' }), ON_ENV]]) {
        // Not switched on, and no session id at all: both count as off.
        const run = await runNode(REAL_HOOK, [], { input, cwd: base, env });
        assert.deepEqual([run.code, run.stdout, run.stderr], [0, '', ''], input);
    }
    assert.equal(fs.readFileSync(logPath(chat), 'utf8'), before, 'nothing is handed over');
});

test('with nothing open it prints nothing and creates nothing', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('quiet');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    const { run, lines } = await remind(chat, base);
    assert.deepEqual([lines, run.stderr], [[], '']);
    assert.deepEqual(fs.readdirSync(chat), ['.git']);
});

test('without cwd in the input it uses its own working folder', async (t) => {
    const work = makeScratchDir('nocwd');
    t.after(() => removeScratchDir(work));
    await fillRegister(work);
    const run = await runNode(REAL_HOOK, [], { input: JSON.stringify({ session_id: SESSION, hook_event_name: 'UserPromptSubmit', prompt: 'x' }), cwd: work, env: ON_ENV });
    assert.equal(run.code, 0);
    const lines = JSON.parse(run.stdout).hookSpecificOutput.additionalContext.split('\n');
    assert.equal(lines[0], blockingLine(work));
});

test('the shipped settings name no other repo\'s register, with a why', () => {
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    assert.equal(config.register.showInEveryChat, undefined);
    assert.match(config.register._whyOwnRepoOnly, /D-14\b/);
});

test('the shipped settings give the hook a lock wait of 2 s, shorter than the register\'s, with a why', () => {
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    assert.equal(config.register.hookLockWaitSeconds, 2);
    assert.ok(config.register.hookLockWaitSeconds < config.register.lockWaitSeconds);
    assert.match(config.register._whyHookLockWait, /prompt/);
});

// ---------------------------------------------------------------------------------------------------------------
// Never failing the prompt
// ---------------------------------------------------------------------------------------------------------------

test('broken input or broken settings: nothing on stdout, exit 0, one line on stderr', async (t) => {
    const work = makeScratchDir('broken');
    t.after(() => removeScratchDir(work));
    await fillRegister(work);
    const skill = makeSkillCopy(work, (config) => {
        delete config.register.answeredFile;
        config.teamState.folder = stateRootUnderHome(TEAM_HOME);
    });
    const cases = [
        [REAL_HOOK, 'not json', /decision-reminder/],
        [REAL_HOOK, '', /decision-reminder/],
        [REAL_HOOK, '[1,2]', /decision-reminder/],
        [path.join(skill, 'hooks', 'decision-reminder.mjs'), promptInput(work), /register\.answeredFile/],
    ];
    for (const [hook, input, pattern] of cases) {
        const run = await runNode(hook, [], { input, cwd: work, env: ON_ENV });
        assert.equal(run.code, 0, input);
        assert.equal(run.stdout, '', input);
        assert.match(run.stderr, pattern, input);
        assert.equal(run.stderr.trim().split(/\r?\n/).length, 1, 'one line');
    }
});

test('a register that cannot be read prints nothing and writes one stderr line naming its file', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-unreadable');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    // The chat's own open file is a folder, which cannot be read as a file.
    fs.mkdirSync(path.join(chat, 'decisions', 'OPEN_DECISIONS_CLAUDE.md'), { recursive: true });
    const { run, lines } = await remind(chat, base);
    assert.deepEqual(lines, []);
    assert.equal(run.stderr.trim().split(/\r?\n/).length, 1, run.stderr);
    assert.match(run.stderr, /^decision-reminder: .*OPEN_DECISIONS_CLAUDE\.md/);
});

test('an entry written in points is named by its first point alone, as an entry of one line is', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('remind-points');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    const file = path.join(base, 'points.json');
    fs.writeFileSync(file, JSON.stringify({
        kind: 'question', blocking: true, urgency: 'high', raisedBy: 'lead demo', task: 'Demo',
        what: ['x', 'Status: waiting-for-agent', 'a third point'], example: ['y', 'more'], options: ['A: a (none)', 'B: b (1 hour)'],
        recommendation: ['A', 'because'], meanwhile: 'waits', evidence: ['e.log'],
    }));
    await register(chat, ['add', '--file', file]);
    assert.deepEqual((await remind(chat, base)).lines, [blockingLine(chat), BLOCKING_INSTRUCTION]);
    await answer(chat, 'D-1');
    const { lines } = await remind(chat, base);
    assert.deepEqual(lines, [handedNowLine(chat), ...answerBlock('D-1 "x"', logRecords(chat)[0]).split('\n'), HANDOVER_INSTRUCTION]);
});

// ---------------------------------------------------------------------------------------------------------------
// Run time
// ---------------------------------------------------------------------------------------------------------------

test('it finishes well under one second', { skip: NO_GIT }, async (t) => {
    const base = makeScratchDir('time');
    t.after(() => removeScratchDir(base));
    const chat = makeRepo(base, 'Demo');
    await fillRegister(chat);
    const times = [];
    for (let i = 0; i < 10; i += 1) {
        times.push((await runNode(REAL_HOOK, [], { input: promptInput(chat), cwd: base, env: ON_ENV })).ms);
    }
    t.diagnostic(`decision-reminder wall time over 10 runs: median ${median(times).toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
    // The median, not the maximum: one slow start under machine load says nothing about the hook.
    assert.ok(median(times) < 1000, `median ${median(times)} ms`);
});
