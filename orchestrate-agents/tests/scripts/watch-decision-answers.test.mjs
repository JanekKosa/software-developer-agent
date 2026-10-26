// End-to-end tests of scripts/watch-decision-answers.ps1, run as the background task runs it (pwsh -NoProfile -File)
// against scratch repos built with the real register.mjs: what it prints and when it ends (at the period, and at once
// when every open entry is answered), when its looks run register.mjs at all, the busy register, wrong use, the
// settings, and which repo it reads. Every test stops the watch processes it started, by their ids.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SKILL_DIR, makeScratchDir, makeSkillCopy, removeScratchDir, runNode } from '../helpers/scratch.mjs';

const REAL_WATCH = path.join(SKILL_DIR, 'scripts', 'watch-decision-answers.ps1');
const REAL_REGISTER = path.join(SKILL_DIR, 'scripts', 'register.mjs');
const PWSH = spawnSync('pwsh', ['-NoProfile', '-Command', '[Environment]::ProcessPath'], { encoding: 'utf8' }).stdout.trim();

// The texts the watch and handover print, written out here so the test does not share the script's text.
const RESTART = 'Start the Decision answers watch again (description "Decision answers watch").';
const FAILED = 'DECISION ANSWERS WATCH FAILED | ';
const HANDOVER_INSTRUCTION = 'For each answer: pass it, in the user\'s words, to the lead it concerns; then close the entry with a summary that includes the final answer (register.mjs close --id <id> --outcome <outcome> --summary $summary), or follow it up (register.mjs follow-up --id <id> --text $text); set $summary and $text in a single-quoted here-string, never in double quotes.';
const HOSTILE_WORDS = 'B, but\r\nonly from September;\na lone\rCR, za\u017c\u00f3\u0142\u0107 \u{1f600} \u4e2d\u6587 "plain" \u201ccurly\u201d $env:TEMP `n %PATH% & <b>|';

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

/**
 * A scratch folder for one test, removed after the test once every watch the test started has ended (each one
 * still running is killed by its own process id first).
 * @param {object} t the test context
 * @param {string} label short name part of the folder
 * @returns {{dir: string, track: (watch: object) => object}} the folder, and a function that registers a watch
 */
function scratch(t, label) {
    const dir = makeScratchDir(label);
    const watches = [];
    t.after(async () => {
        for (const watch of watches) {
            if (watch.child.exitCode === null && watch.child.signalCode === null) {
                watch.child.kill();
            }
            await watch.done.catch(() => {});
        }
        removeScratchDir(dir);
    });
    return { dir, track: (watch) => { watches.push(watch); return watch; } };
}

/**
 * Starts the watch the way the background task runs it: pwsh -NoProfile -File <script> <args>.
 * @param {string} script the watch script
 * @param {string[]} args its parameters
 * @param {{cwd?: string, env?: object}} [options] working folder and environment of the pwsh process
 * @returns {{child: object, done: Promise<{code: number, stdout: string, stderr: string, ms: number}>, output: () => string}}
 */
function startWatch(script, args, options = {}) {
    const started = Date.now();
    const child = spawn(PWSH, ['-NoProfile', '-File', script, ...args], {
        cwd: options.cwd ?? process.cwd(), env: options.env ?? process.env, windowsHide: true,
    });
    const out = [];
    const err = [];
    child.stdout.on('data', (chunk) => out.push(chunk));
    child.stderr.on('data', (chunk) => err.push(chunk));
    const done = new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', (code) => resolve({
            code, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), ms: Date.now() - started,
        }));
    });
    return { child, done, output: () => Buffer.concat(out).toString('utf8') };
}

/**
 * Whether a watch process is still running.
 * @param {{child: object}} watch from startWatch
 * @returns {boolean} true while it has not exited
 */
function running(watch) {
    return watch.child.exitCode === null && watch.child.signalCode === null;
}

/**
 * Builds a register in a new folder with the real script: one entry per question.
 * @param {string} parent folder to create the repo folder in
 * @param {string} name the repo folder's name
 * @param {string[]} questions the entries' what, in id order
 * @param {string} [script] the register script
 * @returns {Promise<string>} the repo folder
 */
async function makeRepo(parent, name, questions, script = REAL_REGISTER) {
    const repo = path.join(parent, name);
    fs.mkdirSync(repo);
    for (const what of questions) {
        await addEntry(repo, what, script);
    }
    return repo;
}

/**
 * Adds one entry, waiting for the user, to a repo's register with the real script.
 * @param {string} repo the repo folder
 * @param {string} what the entry's what
 * @param {string} [script] the register script
 */
async function addEntry(repo, what, script = REAL_REGISTER) {
    const file = path.join(path.dirname(repo), `${path.basename(repo)}-entry-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(file, JSON.stringify({
        kind: 'question', blocking: false, urgency: 'medium', raisedBy: 'lead demo (worker run 1)', task: 'Demo task',
        what, example: '10 units, 3 picked, 7 open.', options: ['A: wait (none)', 'B: go (1 hour)'],
        recommendation: 'A', meanwhile: 'work continues assuming A', evidence: ['temp\\demo.log'],
    }));
    const run = await runNode(script, ['add', '--file', file], { cwd: repo });
    assert.equal(run.code, 0, run.stderr);
}

/**
 * Records an answer with the real script.
 * @param {string} repo the repo folder
 * @param {string} id the entry
 * @param {string} words the user's words
 * @param {string[]} [extra] more arguments, such as --handed-over
 * @param {string} [script] the register script
 */
async function answer(repo, id, words, extra = [], script = REAL_REGISTER) {
    const run = await runNode(script, ['answer', '--id', id, '--answer', words, ...extra], { cwd: repo });
    assert.equal(run.code, 0, run.stderr);
}

/**
 * The answers log of a repo, as text and as records.
 * @param {string} repo the repo folder
 * @returns {{text: string, records: object[]}} the file's text and its parsed CRLF-separated records
 */
function answersLog(repo) {
    const text = fs.readFileSync(path.join(repo, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl'), 'utf8');
    return { text, records: text.split('\r\n').slice(0, -1).map((line) => JSON.parse(line)) };
}

/**
 * Waits a number of milliseconds.
 * @param {number} ms how long
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * The register's lock file of a repo.
 * @param {string} repo the repo folder
 * @returns {string} its path
 */
function lockOf(repo) {
    return path.join(repo, 'decisions', '.lock');
}

/**
 * Takes the register's lock the way file-lock.mjs writes it, so every look finds the register busy. Waits while a
 * look holds the lock itself.
 * @param {string} repo the repo folder
 */
async function holdLock(repo) {
    for (let tries = 0; ; tries += 1) {
        try {
            fs.writeFileSync(lockOf(repo), `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
            return;
        } catch (error) {
            if (error.code !== 'EEXIST' || tries > 40) {
                throw error;
            }
            await delay(50);
        }
    }
}

/**
 * Turns the held lock into one ten minutes old, which the register takes for a crashed writer's and removes: the
 * next look removes it and finds the register free. A test sees that look happen by the lock going away.
 * @param {string} repo the repo folder
 */
function ageLock(repo) {
    const old = new Date(Date.now() - 10 * 60 * 1000);
    fs.utimesSync(lockOf(repo), old, old);
}

/**
 * Plants an old lock, which the next look removes: a sensor that lets a test see a look happen.
 * @param {string} repo the repo folder
 */
async function plantSensor(repo) {
    await holdLock(repo);
    ageLock(repo);
}

/**
 * Waits until a look has removed the old lock and finished: no lock file on two checks 250 ms apart (a look holds
 * its own lock for milliseconds).
 * @param {string} repo the repo folder
 * @returns {Promise<number>} the time the look was seen to have ended
 */
async function waitForLook(repo) {
    const deadline = Date.now() + 20000;
    let goneOnce = false;
    while (Date.now() < deadline) {
        await delay(250);
        const gone = !fs.existsSync(lockOf(repo));
        if (gone && goneOnce) {
            return Date.now();
        }
        goneOnce = gone;
    }
    throw new Error('no look removed the old lock within 20 s');
}

/**
 * The environment of this process without node on the PATH (only pwsh's folder and System32 stay).
 * @returns {object} the environment to start pwsh with
 */
function envWithoutNode() {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (key.toLowerCase() !== 'path') {
            env[key] = value;
        }
    }
    env.Path = [path.dirname(PWSH), path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32')].join(';');
    return env;
}

/**
 * A scratch copy of the skill with its own settings and this watch script beside register.mjs (makeSkillCopy leaves
 * the .ps1 files out).
 * @param {string} dir the test's scratch folder
 * @param {(config: object) => void} adjust changes to the settings
 * @returns {{watch: string, register: string, config: string}} the copied watch, register and settings paths
 */
function skillCopy(dir, adjust) {
    const skill = makeSkillCopy(dir, adjust);
    const watch = path.join(skill, 'scripts', 'watch-decision-answers.ps1');
    fs.copyFileSync(REAL_WATCH, watch);
    return { watch, register: path.join(skill, 'scripts', 'register.mjs'), config: path.join(skill, 'orchestration.config.json') };
}

// ---------------------------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------------------------

test('answers already waiting are printed at once, words exactly as given, restart line last; a second watch prints nothing', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-waiting');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?', 'Round VAT per line?', 'Drop the old import?']);
    await answer(repo, 'D-1', HOSTILE_WORDS);
    await answer(repo, 'D-2', 'typed in the chat', ['--handed-over']);
    await answer(repo, 'D-3', 'C, drop it');
    const closed = await runNode(REAL_REGISTER, ['close', '--id', 'D-3', '--outcome', 'answered', '--summary', 'Drop it.'], { cwd: repo });
    assert.equal(closed.code, 0, closed.stderr);
    const before = answersLog(repo).records;

    const first = await track(startWatch(REAL_WATCH, ['-Root', repo, '-EveryMinutes', '1'])).done;
    assert.equal(first.code, 0, first.stderr);
    assert.equal(first.stderr, '');
    assert.ok(first.ms < 15000, `it looks at once instead of after a minute (${first.ms} ms)`);
    assert.equal(first.stdout, [
        'DECISION ANSWERS | D-1',
        `D-1 "Retry a rejected invoice?", answered ${before[0].answeredAt}:`, HOSTILE_WORDS,
        HANDOVER_INSTRUCTION,
        RESTART, '',
    ].join('\n'));
    const after = answersLog(repo).records;
    assert.match(after[0].handedOverAt, /^\d{4}-\d\d-\d\d \d\d:\d\d$/, 'the answer is marked handed over');
    assert.deepEqual(after.slice(1), before.slice(1), 'the answer given in the chat and the processed one are left as they were');

    const logText = answersLog(repo).text;
    await plantSensor(repo);
    const second = track(startWatch(REAL_WATCH, ['-Root', repo, '-EveryMinutes', '1']));
    await waitForLook(repo);
    assert.equal(running(second), true, 'the same answers do not end a second watch');
    assert.equal(second.output(), '');
    assert.equal(answersLog(repo).text, logText);
});

test('with one of two entries answered it keeps looking, silent, and ends at the next full look, at the interval from the settings, with that one answer', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-later');
    const periodMs = 3600;
    const copy = skillCopy(dir, (config) => { config.decisionAnswersWatch = { everyMinutes: periodMs / 60000, lookSeconds: 0.25, failuresBeforeStop: 3 }; });
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?', 'Round VAT per line?'], copy.register);
    await plantSensor(repo);
    const watch = track(startWatch(copy.watch, ['-Root', repo]));
    await waitForLook(repo);
    assert.equal(running(watch), true, 'the look at the start found nothing and it still runs');
    assert.equal(watch.output(), '', 'nothing is printed while it waits');

    await answer(repo, 'D-1', 'A,\r\nretry once', [], copy.register);
    const answeredAt = Date.now();
    const end = await watch.done;
    const waited = Date.now() - answeredAt;
    const records = answersLog(repo).records;
    assert.equal(end.code, 0, end.stderr);
    assert.equal(end.stdout, [
        'DECISION ANSWERS | D-1',
        `D-1 "Retry a rejected invoice?", answered ${records[0].answeredAt}:`, 'A,\r\nretry once',
        HANDOVER_INSTRUCTION,
        RESTART, '',
    ].join('\n'));
    assert.ok(waited >= 1500, `the looks between, which the answer set off, did not hand it over while D-2 waits (${waited} ms)`);
    assert.ok(waited < periodMs + 3000, `ends within about one 3.6 s interval of the answer (${waited} ms)`);
    assert.equal(records.length, 1);
    assert.match(records[0].handedOverAt, /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
});

test('it ends right after every open entry is answered, with every waiting answer in log order; an entry added before the last answer keeps it waiting; chat and processed answers are never printed', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-all');
    // The look interval comes from the settings; the full hand-over (a minute) never comes within the test.
    const copy = skillCopy(dir, (config) => { config.decisionAnswersWatch = { everyMinutes: 1, lookSeconds: 0.5, failuresBeforeStop: 3 }; });
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?', 'Round VAT per line?', 'Drop the old import?', 'Keep the log?'], copy.register);
    await answer(repo, 'D-3', 'C, drop it', [], copy.register);
    const closed = await runNode(copy.register, ['close', '--id', 'D-3', '--outcome', 'answered', '--summary', 'Drop it.'], { cwd: repo });
    assert.equal(closed.code, 0, closed.stderr);
    await answer(repo, 'D-4', 'typed in the chat', ['--handed-over'], copy.register);
    const before = answersLog(repo).records;
    await plantSensor(repo);
    const watch = track(startWatch(copy.watch, ['-Root', repo]));
    await waitForLook(repo);

    await answer(repo, 'D-1', HOSTILE_WORDS, [], copy.register);
    await delay(1200);
    assert.equal(running(watch), true, 'D-2 still waits for the user');
    assert.equal(watch.output(), '');
    await addEntry(repo, 'Added by a lead meanwhile?', copy.register);
    await answer(repo, 'D-2', 'B, per line', [], copy.register);
    await delay(1200);
    assert.equal(running(watch), true, 'D-5, added before the last answer, waits for the user');
    assert.equal(watch.output(), '');
    assert.deepEqual(answersLog(repo).records.slice(2).map((r) => r.handedOverAt), [null, null], 'nothing was handed over yet');

    await answer(repo, 'D-5', 'yes, keep it', [], copy.register);
    const answeredAt = Date.now();
    const end = await watch.done;
    const waited = Date.now() - answeredAt;
    const records = answersLog(repo).records;
    assert.equal(end.code, 0, end.stderr);
    assert.equal(end.stdout, [
        'DECISION ANSWERS | D-1, D-2, D-5',
        `D-1 "Retry a rejected invoice?", answered ${records[2].answeredAt}:`, HOSTILE_WORDS, '',
        `D-2 "Round VAT per line?", answered ${records[3].answeredAt}:`, 'B, per line', '',
        `D-5 "Added by a lead meanwhile?", answered ${records[4].answeredAt}:`, 'yes, keep it',
        HANDOVER_INSTRUCTION,
        RESTART, '',
    ].join('\n'));
    assert.ok(waited < 4000, `ends within about one 0.5 s look of the last answer, not at the minute (${waited} ms)`);
    assert.equal(records.slice(2).every((r) => /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(r.handedOverAt)), true, 'the three are marked');
    assert.deepEqual(records.slice(0, 2), before, 'the processed answer and the one given in the chat are left as they were');
});

test('looks run register.mjs only when the open file or the answers log changed, with --when-all-answered; the full hand-over keeps its period from the start; a failed look is counted and tried again', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-runs');
    const copy = skillCopy(dir, () => {});
    // A stand-in register that writes down when it ran, with what, and whether it failed (it fails, as a busy
    // register does, while the fail file exists); it never finds anything to hand over.
    const runsFile = path.join(dir, 'runs.jsonl');
    const failFile = path.join(dir, 'fail');
    fs.writeFileSync(copy.register, [
        'import fs from \'node:fs\';',
        `const failed = fs.existsSync(${JSON.stringify(failFile)});`,
        `fs.appendFileSync(${JSON.stringify(runsFile)}, JSON.stringify({ at: Date.now(), args: process.argv.slice(2), failed }) + '\\n');`,
        'if (failed) { process.stderr.write(\'stand-in: the register is busy\\n\'); process.exitCode = 1; }', '',
    ].join('\n'));
    const runs = () => (fs.existsSync(runsFile) ? fs.readFileSync(runsFile, 'utf8').split('\n').slice(0, -1).map((l) => JSON.parse(l)) : []);
    const waitForRuns = async (count) => {
        const deadline = Date.now() + 20000;
        while (runs().length < count) {
            assert.ok(Date.now() < deadline, `no run ${count} within 20 s`);
            await delay(50);
        }
        return runs();
    };
    const repo = path.join(dir, 'repo');
    fs.mkdirSync(path.join(repo, 'decisions'), { recursive: true });
    const openFile = path.join(repo, 'decisions', 'OPEN_DECISIONS_CLAUDE.md');
    fs.writeFileSync(openFile, '# Open decisions\r\n');
    const fullArgs = ['handover', '--root', repo];
    const lookArgs = ['handover', '--when-all-answered', '--root', repo];
    const periodMs = 3000;
    const watch = track(startWatch(copy.watch, ['-Root', repo, '-EveryMinutes', String(periodMs / 60000), '-LookSeconds', '0.2']));

    const [first] = await waitForRuns(1);
    assert.deepEqual(first.args, fullArgs, 'a full hand-over at start');
    await delay(900);
    assert.equal(runs().length, 1, 'about four looks without a change run nothing');

    fs.appendFileSync(openFile, '\r\n## D-1\r\n');
    const afterOpen = await waitForRuns(2);
    assert.deepEqual(afterOpen[1].args, lookArgs);
    await delay(Math.max(0, first.at + 1800 - Date.now()));
    fs.writeFileSync(path.join(repo, 'decisions', 'ANSWERS_LOG_CLAUDE.jsonl'), '');
    const afterLog = await waitForRuns(3);
    assert.deepEqual(afterLog[2].args, lookArgs);

    const all = await waitForRuns(4);
    assert.deepEqual(all[3].args, fullArgs, 'the next full hand-over');
    const sinceFirst = all[3].at - first.at;
    assert.ok(sinceFirst >= periodMs - 300 && sinceFirst < periodMs + 1000, `the period counts from the start, not from the last look (${sinceFirst} ms)`);
    await delay(500);
    assert.equal(runs().length, 4, 'nothing changed since, so nothing ran');
    watch.child.kill();
    await watch.done;

    // Failed looks between the full ones: one is tried again at the next look; three in a row end it.
    fs.writeFileSync(runsFile, '');
    const second = track(startWatch(copy.watch, ['-Root', repo, '-EveryMinutes', '1', '-LookSeconds', '0.2', '-FailuresBeforeStop', '3']));
    await waitForRuns(1);
    fs.writeFileSync(failFile, '');
    fs.appendFileSync(openFile, '\r\n## D-2\r\n');
    await waitForRuns(2);
    fs.rmSync(failFile);
    const retried = await waitForRuns(3);
    assert.deepEqual(retried.slice(1).map((r) => [r.args, r.failed]), [[lookArgs, true], [lookArgs, false]], 'the failed look is tried again');
    await delay(600);
    assert.equal(runs().length, 3, 'a look that worked is not repeated');
    const sameSize = fs.readFileSync(openFile, 'utf8').replace('## D-2', '## D-7');
    fs.writeFileSync(openFile, sameSize);
    const rewritten = await waitForRuns(4);
    assert.deepEqual([rewritten[3].args, rewritten[3].failed], [lookArgs, false], 'a change that keeps the size is seen by its write time');
    fs.writeFileSync(failFile, '');
    fs.appendFileSync(openFile, '\r\n## D-3\r\n');
    const end = await second.done;
    assert.equal(end.code, 1, end.stderr);
    assert.equal(end.stdout, `${FAILED}stand-in: the register is busy\n`);
    assert.deepEqual(runs().slice(4).map((r) => [r.args, r.failed]), [[lookArgs, true], [lookArgs, true], [lookArgs, true]],
        'the good look reset the count, and three failed looks in a row end it');
});

test('the settings hold the defaults: a full hand-over every 30 minutes and a look every 5 seconds', () => {
    const real = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'orchestration.config.json'), 'utf8'));
    assert.equal(real.decisionAnswersWatch.everyMinutes, 30);
    assert.equal(real.decisionAnswersWatch.lookSeconds, 5);
});

// ---------------------------------------------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------------------------------------------

test('a busy register does not end it at once; FailuresBeforeStop busy looks in a row end it with the FAILED line, exit 1', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-busy');
    const copy = skillCopy(dir, (config) => { config.register.lockWaitSeconds = 0.5; });
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?'], copy.register);
    await answer(repo, 'D-1', 'A', [], copy.register);
    const logText = answersLog(repo).text;
    await holdLock(repo);

    const end = await track(startWatch(copy.watch, ['-Root', repo, '-EveryMinutes', '0.03', '-FailuresBeforeStop', '3'])).done;
    assert.equal(end.code, 1, end.stderr);
    assert.equal(end.stdout, `${FAILED}register: the decision register is busy: ${lockOf(repo)} stayed taken for 0.5 s. Nothing was written; run the command again.\n`);
    assert.ok(end.ms >= 2 * 1800 + 500, `three busy looks at the start and 1.8 s, 3.6 s after it, each waiting 0.5 s for the lock (${end.ms} ms)`);
    assert.equal(answersLog(repo).text, logText, 'the waiting answer is still waiting');
});

test('a good look resets the count: busy, free, busy, busy needs four looks with FailuresBeforeStop 2', { timeout: 90000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-reset');
    const copy = skillCopy(dir, (config) => { config.register.lockWaitSeconds = 0.5; });
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?'], copy.register);
    const intervalMs = 4000;
    await plantSensor(repo);
    const watch = track(startWatch(copy.watch, ['-Root', repo, '-EveryMinutes', String(intervalMs / 60000), '-FailuresBeforeStop', '2']));

    const firstFree = await waitForLook(repo);
    await holdLock(repo);
    await delay(Math.max(0, firstFree + 1.5 * intervalMs - Date.now()));
    assert.equal(running(watch), true, 'one busy look does not end it');
    ageLock(repo);
    const secondFree = await waitForLook(repo);
    await holdLock(repo);
    await delay(Math.max(0, secondFree + 1.6 * intervalMs - Date.now()));
    assert.equal(running(watch), true, 'busy, free, busy: the free look reset the count, so one failure in a row');
    assert.equal(watch.output(), '');

    const end = await watch.done;
    assert.equal(end.code, 1, end.stderr);
    assert.match(end.stdout, /^DECISION ANSWERS WATCH FAILED \| register: the decision register is busy: .*\n$/);
});

test('a look that fails with another exit code and says nothing is counted; the FAILED line names the exit code', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-silent');
    const copy = skillCopy(dir, () => {});
    // A stand-in for a register that crashes without a word, which the real one cannot be made to do.
    fs.writeFileSync(copy.register, 'process.exitCode = 3;\n');
    const reason = `${FAILED}register.mjs handover ended with exit code 3 and wrote nothing on stderr.\n`;

    const once = await track(startWatch(copy.watch, ['-Root', dir, '-EveryMinutes', '1', '-FailuresBeforeStop', '1'])).done;
    assert.equal(once.code, 1, once.stderr);
    assert.equal(once.stdout, reason);
    assert.ok(once.ms < 15000, `FailuresBeforeStop 1 ends at the first failed look, not a minute later (${once.ms} ms)`);

    // Looks between the full ones every 30 s: the failed full look is tried again at the next full one, 1.2 s later.
    const twice = await track(startWatch(copy.watch, ['-Root', dir, '-EveryMinutes', '0.02', '-LookSeconds', '30', '-FailuresBeforeStop', '2'])).done;
    assert.equal(twice.code, 1, twice.stderr);
    assert.equal(twice.stdout, reason);
    assert.ok(twice.ms >= 1200, `the first such look is counted, not final: a second one 1.2 s later ends it (${twice.ms} ms)`);
    assert.ok(twice.ms < 15000, `the wait before the next full look is cut to it, not a whole look interval (${twice.ms} ms)`);
});

test('-Root that is not a folder ends it at once with the FAILED line, exit 1', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-root');
    const missing = path.join(dir, 'no such folder');
    const end = await track(startWatch(REAL_WATCH, ['-Root', missing, '-EveryMinutes', '1', '-FailuresBeforeStop', '3'])).done;
    assert.equal(end.code, 1, end.stderr);
    assert.equal(end.stdout, `${FAILED}register: --root ${missing} is not an existing folder\n`);
    assert.ok(end.ms < 15000, `a usage error is not retried (${end.ms} ms)`);
});

test('node not found ends it at once with the FAILED line naming node, exit 1, and hands nothing over', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-nonode');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?']);
    await answer(repo, 'D-1', 'A');
    const logText = answersLog(repo).text;
    const end = await track(startWatch(REAL_WATCH, ['-Root', repo, '-EveryMinutes', '1'], { env: envWithoutNode() })).done;
    assert.equal(end.code, 1, end.stderr);
    assert.match(end.stdout, /^DECISION ANSWERS WATCH FAILED \| [^\r\n]*\bnode\b[^\r\n]*\n$/);
    assert.ok(end.ms < 15000, `not retried (${end.ms} ms)`);
    assert.equal(answersLog(repo).text, logText);
});

// ---------------------------------------------------------------------------------------------------------------
// Parameters and settings
// ---------------------------------------------------------------------------------------------------------------

test('a misspelled parameter fails before anything runs', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-param');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?']);
    await answer(repo, 'D-1', 'A');
    const logText = answersLog(repo).text;
    const end = await track(startWatch(REAL_WATCH, ['-Root', repo, '-EveryMinuts', '0.02'])).done;
    assert.notEqual(end.code, 0);
    assert.equal(end.stdout, '');
    assert.match(end.stderr, /EveryMinuts/);
    assert.equal(answersLog(repo).text, logText, 'no look ran');
});

test('a missing setting or settings file is named; a parameter passed instead needs no setting', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-config');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?']);
    const configPath = path.join(dir, 'settings.json');
    const real = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'orchestration.config.json'), 'utf8'));
    for (const key of ['everyMinutes', 'lookSeconds', 'failuresBeforeStop']) {
        const config = structuredClone(real);
        config.decisionAnswersWatch = { everyMinutes: 1, lookSeconds: 5, failuresBeforeStop: 3 };
        delete config.decisionAnswersWatch[key];
        fs.writeFileSync(configPath, JSON.stringify(config));
        const end = await track(startWatch(REAL_WATCH, ['-Root', repo, '-ConfigPath', configPath])).done;
        assert.equal(end.code, 1, end.stderr);
        assert.equal(end.stdout, `${FAILED}${configPath} has no key 'decisionAnswersWatch.${key}'.\n`);
    }
    const noFile = path.join(dir, 'missing.json');
    const missing = await track(startWatch(REAL_WATCH, ['-Root', repo, '-ConfigPath', noFile])).done;
    assert.equal(missing.code, 1, missing.stderr);
    assert.equal(missing.stdout, `${FAILED}The settings file ${noFile} does not exist.\n`);

    // The register's own settings (beside register.mjs) without the open file's name: the register cannot be found.
    const copy = skillCopy(dir, (config) => { delete config.register.openFile; });
    const noRegister = await track(startWatch(copy.watch, ['-Root', repo, '-EveryMinutes', '1', '-LookSeconds', '5', '-FailuresBeforeStop', '3'])).done;
    assert.equal(noRegister.code, 1, noRegister.stderr);
    assert.equal(noRegister.stdout, `${FAILED}Finding the register of ${repo} failed: orchestration.config.json has no setting 'register.openFile'\n`);

    await answer(repo, 'D-1', 'A');
    fs.writeFileSync(configPath, JSON.stringify({ decisionAnswersWatch: {} }));
    const passed = await track(startWatch(REAL_WATCH, ['-Root', repo, '-ConfigPath', configPath, '-EveryMinutes', '1', '-LookSeconds', '5', '-FailuresBeforeStop', '3'])).done;
    assert.equal(passed.code, 0, passed.stderr);
    assert.match(passed.stdout, /^DECISION ANSWERS \| D-1\n/);
});

test('an interval or look of 0 or a failure count below 1 is refused with the FAILED line, from a parameter or the settings', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-range');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?']);
    const configPath = path.join(dir, 'settings.json');
    fs.writeFileSync(configPath, JSON.stringify({ decisionAnswersWatch: { everyMinutes: 1, lookSeconds: 0, failuresBeforeStop: 0 } }));
    const cases = [
        [['-EveryMinutes', '0', '-LookSeconds', '5', '-FailuresBeforeStop', '3'], 'EveryMinutes must be a number greater than 0, not 0.'],
        [['-EveryMinutes', '-1', '-LookSeconds', '5', '-FailuresBeforeStop', '3'], 'EveryMinutes must be a number greater than 0, not -1.'],
        [['-LookSeconds', '-0.5', '-FailuresBeforeStop', '3'], 'LookSeconds must be a number greater than 0, not -0.5.'],
        [['-FailuresBeforeStop', '3'], 'LookSeconds must be a number greater than 0, not 0.'],
        [['-LookSeconds', '5'], 'FailuresBeforeStop must be a whole number of at least 1, not 0.'],
    ];
    for (const [args, message] of cases) {
        const end = await track(startWatch(REAL_WATCH, ['-Root', repo, '-ConfigPath', configPath, ...args])).done;
        assert.equal(end.code, 1, end.stderr);
        assert.equal(end.stdout, `${FAILED}${message}\n`);
    }
});

test('it reads the register of -Root, relative to the current folder, and of the current folder without -Root', { timeout: 60000 }, async (t) => {
    const { dir, track } = scratch(t, 'daw-which');
    const demo = await makeRepo(dir, 'Demo', ['Demo question?']);
    const other = await makeRepo(dir, 'OtherDemo', ['Other question?']);
    await answer(demo, 'D-1', 'demo words');
    await answer(other, 'D-1', 'other words');
    const otherLog = answersLog(other).text;

    const given = await track(startWatch(REAL_WATCH, ['-Root', path.join('..', 'Demo'), '-EveryMinutes', '1'], { cwd: other })).done;
    assert.equal(given.code, 0, given.stderr);
    assert.match(given.stdout, /^DECISION ANSWERS \| D-1\nD-1 "Demo question\?", answered [\d: -]+:\ndemo words\n/);
    assert.equal(answersLog(other).text, otherLog, 'the current folder\'s register is not read when -Root is given');

    const cwd = await track(startWatch(REAL_WATCH, ['-EveryMinutes', '1'], { cwd: other })).done;
    assert.equal(cwd.code, 0, cwd.stderr);
    assert.match(cwd.stdout, /^DECISION ANSWERS \| D-1\nD-1 "Other question\?", answered [\d: -]+:\nother words\n/);
});

test('dot-sourced, it only defines its functions and looks at nothing', { timeout: 60000 }, async (t) => {
    const { dir } = scratch(t, 'daw-dot');
    const repo = await makeRepo(dir, 'repo', ['Retry a rejected invoice?']);
    await answer(repo, 'D-1', 'A');
    const logText = answersLog(repo).text;
    const run = spawnSync(PWSH, ['-NoProfile', '-Command', `. '${REAL_WATCH.replaceAll("'", "''")}' -Root '${repo.replaceAll("'", "''")}'; 'dot-sourced'`], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, '');
    assert.equal(run.stdout, 'dot-sourced\r\n');
    assert.equal(answersLog(repo).text, logText);
});
