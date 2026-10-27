// Tests of scripts/limit-stop-server.mjs run as real child processes from a scratch skill copy whose pipe prefix is
// made for the test run, so no test can reach the server of a real session. The pipe is asked through a client
// written here with node:net, and log lines are written and read here by hand, sharing no code with the server or
// lib/limit-stop.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { makeScratchDir, makeSkillCopy, removeScratchDir } from '../helpers/scratch.mjs';

const SESSION = '5e551000-aaaa-bbbb-cccc-000000000001';
const OTHER_SESSION = '5e551000-aaaa-bbbb-cccc-000000000002';

/** How long one run of the server script in these tests may take before it is killed and the test fails. */
const RUN_BOUND_MS = 20000;

/** The fallback every FAILED line ends with, written out here. */
const FALLBACK = 'Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended with LEAD STOPPED, and wait for each one\'s LEAD STOPPED, with no deadline. Tell the user in your final message that the limit-stop server failed, and what failed.';

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

/**
 * Builds a scratch skill copy with test settings for the limit stop: a pipe prefix unique to this test and a scratch
 * state root (teamState.folder), so the log is <scratch>\state\logs\limit-stop.log through the shipped
 * limitStop.logFile. The settings runs before K removed (an end time, a repeat count, a lead deadline) are set to small
 * values, so a server that still obeyed them would fail these tests.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {(config: object) => void} [adjust] further changes to the copy's settings
 * @returns {{server: string, prefix: string, log: string, base: string}} the world
 */
function makeWorld(t, adjust = () => {}) {
    const base = makeScratchDir('stop');
    t.after(() => removeScratchDir(base));
    const prefix = `oa-test-stop-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
    const log = path.join(base, 'state', 'logs', 'limit-stop.log');
    const skill = makeSkillCopy(base, (config) => {
        config.teamState = { ...config.teamState, folder: path.join(base, 'state') };
        config.limitStop = {
            ...config.limitStop,
            pipePrefix: prefix,
            connectTimeoutMs: 2000,
            startCheckSeconds: 10,
            logTailKB: 64,
            leadAgentTypes: ['task-lead'],
            processCheckSeconds: 1,
        };
        config.usageLimits.ignoreAgentTypes = ['code-searcher'];
        adjust(config);
    });
    return { server: path.join(skill, 'scripts', 'limit-stop-server.mjs'), prefix, log, base };
}

/**
 * The pipe of a session, built here independently of the code under test.
 * @param {object} world from makeWorld
 * @param {string} session session id
 * @returns {string} the pipe path
 */
function pipeOf(world, session) {
    return `\\\\.\\pipe\\${world.prefix}-${session}`;
}

/**
 * Server arguments for a window that resets at the given moment, watching this test process as the session's
 * Claude Code process, so a server a test leaves behind ends with the test run.
 * @param {string} session session id
 * @param {Date} resetsAt reset moment
 * @returns {string[]} the arguments after the mode
 */
function serverArgs(session, resetsAt) {
    return ['--session', session, '--window', 'five-hour', '--percent', '95.5', '--resets-at', resetsAt.toISOString(), '--claude-pid', String(process.pid)];
}

/**
 * Server arguments for the main session's context cap, watching this test process.
 * @param {string} session session id
 * @returns {string[]} the arguments after the mode
 */
function capArgs(session) {
    return ['--session', session, '--window', 'context-cap', '--claude-pid', String(process.pid)];
}

/**
 * Starts the server in serve mode as an ordinary child of the test and waits until its pipe answers. The child is
 * stopped after the test if it is still running.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {object} world from makeWorld
 * @param {string[]} args from serverArgs or capArgs
 * @returns {Promise<{child: import('node:child_process').ChildProcess, exited: Promise<number>}>} the child and its exit code
 */
async function startServe(t, world, args) {
    const child = spawn(process.execPath, [world.server, 'serve', ...args], { windowsHide: true, stdio: 'ignore' });
    const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const session = args[args.indexOf('--session') + 1];
    await waitForPipe(pipeOf(world, session), true);
    return { child, exited };
}

/**
 * Waits until a pipe answers (or stops answering).
 * @param {string} pipePath the pipe
 * @param {boolean} up true to wait for it to answer, false to wait for it to be gone
 */
async function waitForPipe(pipePath, up) {
    for (let i = 0; i < 100; i += 1) {
        if ((await pipeAnswers(pipePath)) === up) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`pipe ${pipePath} did not ${up ? 'come up' : 'go away'} within 10 s`);
}

/**
 * Tells whether something listens on a pipe: connects and ends at once, sending nothing.
 * @param {string} pipePath the pipe
 * @returns {Promise<boolean>} true when the connect succeeded
 */
function pipeAnswers(pipePath) {
    return new Promise((resolve) => {
        const socket = net.connect(pipePath, () => { socket.end(); resolve(true); });
        socket.on('error', () => resolve(false));
    });
}

/**
 * Sends one raw line to a pipe and returns everything the server wrote back before it closed. A server that cuts
 * the client off (a line over the limit) may raise a write error here; the close that follows still resolves.
 * @param {string} pipePath the pipe
 * @param {string} line what to send, without the newline
 * @returns {Promise<string>} the server's answer text
 */
function rawAsk(pipePath, line) {
    return new Promise((resolve) => {
        const chunks = [];
        const socket = net.connect(pipePath, () => socket.write(`${line}\n`));
        socket.on('data', (chunk) => chunks.push(chunk));
        socket.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
        socket.on('error', () => {});
    });
}

/**
 * Asks the server what to tell an agent, the way the hook does, and returns the stop text.
 * @param {object} world from makeWorld
 * @param {string} session session id
 * @param {string} agentId agent id
 * @param {string} [agentType] agent type
 * @returns {Promise<string>} the stop text ('' for nothing)
 */
async function ask(world, session, agentId, agentType) {
    const answer = await rawAsk(pipeOf(world, session), JSON.stringify({ agentId, agentType }));
    return JSON.parse(answer).stop;
}

/**
 * Asks the server what to tell the main session, the way the hook does.
 * @param {object} world from makeWorld
 * @param {string} session session id
 * @returns {Promise<string>} the stop text ('' for nothing)
 */
async function askMain(world, session) {
    return JSON.parse(await rawAsk(pipeOf(world, session), JSON.stringify({ role: 'main' }))).stop;
}

/**
 * The reset as the texts show it, worked out here without the server's code: HH:mm on the same local day, else
 * YYYY-MM-DD HH:mm.
 * @param {Date} at the reset
 * @returns {string} the clock text
 */
function clockOf(at) {
    const local = at.toLocaleString('sv-SE');
    const today = new Date().toLocaleString('sv-SE').slice(0, 10);
    return local.slice(0, 10) === today ? local.slice(11, 16) : local.slice(0, 16);
}

/**
 * The command that stops a world's server, worked out here.
 * @param {object} world from makeWorld
 * @param {string} session session id
 * @returns {string} the command
 */
function stopCommandOf(world, session) {
    return `node '${world.server}' stop --session ${session}`;
}

/**
 * The texts the server is expected to send, written out in full.
 * @param {string} head the first sentence
 * @param {string} cause what the agent stops for, as the texts name it
 * @returns {object} the texts by role, and main(sameAs, ending, stopCommand, last) for the main session
 */
function textsFor(head, cause) {
    return {
        worker: `${head} Stop building: finish the one command or edit you are in and start no other, not even the suite. Add a section "## Hand-off" at the end of your progress file: what is done, how it was checked, what is on disk but unchecked, what is left, the exact next step, and the files you own. Then end your turn with the line WORKER STOPPED | <run> | hand-off: <progress file>. Your lead starts your successor from it.`,
        lead: `${head} Start nothing new: no worker, no check, no heavy command. Your running workers are told the same at their next tool call, so send them nothing; each ends with WORKER STOPPED | <run> | hand-off: <progress file>. While a worker still runs, end your turn with WAITING FOR WORKER | <run>. When none runs any more, add a section "## Hand-off" at the end of your lead file: your plan and where it stands, each run with its state and its worker's hand-off path, the register ids still open, and the next runs in order. Then end your turn with LEAD STOPPED | <lead file>.`,
        helper: `${head} Stop searching: return what you have found so far now, and say first that ${cause} stopped you.`,
        main: (sameAs, ending, stopCommand, last) => `${head} This is the main session's part; ${sameAs}. Every lead and worker of this session is told to stop at its next tool call: send them no stop message, and start nothing new. Wait for LEAD STOPPED | <lead file> from every running lead, with no deadline; if you are told LIMIT STOP SERVER FAILED meanwhile, do what it says. Then write the hand-over, listing each lead's hand-off, ${ending}, and in the same step stop this server: ${stopCommand}.${last}`,
    };
}

/**
 * The texts at a five-hour usage limit of 95.5%.
 * @param {Date} resetsAt the reset
 * @returns {object} from textsFor
 */
function expectedTexts(resetsAt) {
    return textsFor(`STOP FOR LIMIT | the five-hour usage limit is at 95.5% and resets at ${clockOf(resetsAt)}, so this session hands over to a new one.`, 'the usage limit');
}

/** The texts at the main session's context cap. */
const CAP_TEXTS = textsFor('STOP FOR LIMIT | this session is at its context cap and hands over to a new one.', "the session's context cap");

const USAGE_SAME_AS = "the Usage and context watch's LIMIT NEAR | HAND OVER lines mean the same";
const USAGE_ENDING = 'schedule the relaunch for after the reset with schedule-relaunch.ps1, as the watch printed it';
const CAP_SAME_AS = 'SESSION NEAR CAP from the context-guard hook or the Usage and context watch means the same';

/**
 * How the main text ends at the cap: the relaunch command, worked out here from the world's skill copy.
 * @param {object} world from makeWorld
 * @returns {string} the ending
 */
function capEnding(world) {
    const script = path.join(path.dirname(path.dirname(world.server)), 'scripts', 'schedule-relaunch.ps1');
    return `run & '${script}' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap, which starts a new chat with Read <hand-over> and carry on`;
}

/**
 * Runs the server script to its end as a child of the test, killed after RUN_BOUND_MS so a server that should have
 * refused to start fails its test instead of hanging the suite.
 * @param {object} world from makeWorld
 * @param {string[]} args the mode and its arguments
 * @returns {Promise<{code: number|null, stdout: string, stderr: string, ms: number, timedOut: boolean}>} the run
 */
function runServer(world, args) {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const child = spawn(process.execPath, [world.server, ...args], { windowsHide: true, timeout: RUN_BOUND_MS });
        const out = [];
        const err = [];
        child.stdout.on('data', (chunk) => out.push(chunk));
        child.stderr.on('data', (chunk) => err.push(chunk));
        child.on('error', reject);
        child.on('close', (code, signal) => resolve({
            code,
            stdout: Buffer.concat(out).toString('utf8'),
            stderr: Buffer.concat(err).toString('utf8'),
            ms: Date.now() - started,
            timedOut: signal !== null,
        }));
        child.stdin.end();
    });
}

/**
 * Gives the id of a process that has ended: a Node child that exits at once.
 * @returns {Promise<number>} the pid
 */
async function deadPid() {
    const child = spawn(process.execPath, ['-e', ''], { windowsHide: true, stdio: 'ignore' });
    await new Promise((resolve) => child.on('exit', resolve));
    return child.pid;
}

/**
 * Starts a stand-in for the session's Claude Code process that lives for a while; killed after the test.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {number} ms how long it lives
 * @returns {{pid: number, exited: Promise<void>}} its pid and its end
 */
function standIn(t, ms) {
    const child = spawn(process.execPath, ['-e', `setTimeout(() => {}, ${ms})`], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    return { pid: child.pid, exited: new Promise((resolve) => child.on('exit', () => resolve())) };
}

/**
 * Kills a detached server that start reported, after the test.
 * @param {import('node:test').TestContext} t test context
 * @param {string} line start's STARTED line
 * @returns {number} the pid in the line
 */
function killAfter(t, line) {
    const pid = Number(/process (\d+)/.exec(line)?.[1]);
    t.after(() => { try { process.kill(pid); } catch { /* already gone */ } });
    return pid;
}

/**
 * Appends a line to a world's log in the server's format, written here by hand.
 * @param {object} world from makeWorld
 * @param {string} session session id
 * @param {string} text the line's text
 * @param {Date} [at] its time
 */
function writeLogLine(world, session, text, at = new Date()) {
    const stamp = at.toLocaleString('sv-SE').slice(0, 19);
    fs.mkdirSync(path.dirname(world.log), { recursive: true });
    fs.appendFileSync(world.log, `${stamp} | ${session} | ${text}\n`);
}

/**
 * The clock texts with seconds a moment between two others may show: HH:mm:ss, worked out here.
 * @param {number} before ms
 * @param {number} after ms
 * @returns {string} a pattern matching any second in between
 */
function secondsBetween(before, after) {
    const seconds = [];
    for (let ms = Math.floor(before / 1000) * 1000; ms <= after; ms += 1000) {
        seconds.push(new Date(ms).toLocaleString('sv-SE').slice(11, 19));
    }
    return `(${seconds.join('|')})`;
}

const inTwoHours = () => new Date(Date.now() + 2 * 3600 * 1000);

// ---------------------------------------------------------------------------------------------------------------
// What it answers
// ---------------------------------------------------------------------------------------------------------------

test('a worker is told once and never again, however many calls it makes', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const answers = [];
    for (let i = 0; i < 7; i += 1) {
        answers.push(await ask(world, SESSION, 'a1111111111111111', 'software-developer'));
    }
    assert.deepEqual(answers, [expectedTexts(resetsAt).worker, '', '', '', '', '', '']);
});

test('each agent is told once on its own; a lead, a helper and an unknown or missing type get their own texts', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const texts = expectedTexts(resetsAt);
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), texts.worker);
    assert.equal(await ask(world, SESSION, 'a2222222222222222', 'task-lead'), texts.lead);
    assert.equal(await ask(world, SESSION, 'a3333333333333333', 'code-searcher'), texts.helper);
    assert.equal(await ask(world, SESSION, 'a4444444444444444', 'some-project-worker'), texts.worker);
    assert.equal(await ask(world, SESSION, 'a5555555555555555'), texts.worker);
    for (let i = 0; i < 5; i += 1) {
        for (const [id, type] of [['a1111111111111111', 'software-developer'], ['a2222222222222222', 'task-lead'], ['a3333333333333333', 'code-searcher']]) {
            assert.equal(await ask(world, SESSION, id, type), '', `${type}, call ${i + 2}`);
        }
    }
});

test('a reset on another day is shown with its date', async (t) => {
    const world = makeWorld(t);
    const resetsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const text = await ask(world, SESSION, 'a1111111111111111', 'software-developer');
    assert.match(text, new RegExp(`resets at ${clockOf(resetsAt)},`));
    assert.match(clockOf(resetsAt), /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
});

test('a broken request gets no answer and counts for nothing', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const pipe = pipeOf(world, SESSION);
    for (const line of ['not json', '[]', '{"agentType":"software-developer"}', '{"agentId":"..\\\\evil"}', '{"agentId":5}', `{"agentId":"${'a'.repeat(200)}"}`, '{"role":"bogus"}']) {
        assert.equal(await rawAsk(pipe, line), '', line);
    }
    assert.equal(await rawAsk(pipe, 'x'.repeat(200000)), '', 'a line longer than the limit');
    assert.equal(await pipeAnswers(pipe), true, 'a client that sends nothing is let go');
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker);
});

test('a check request is answered with nothing and counts for no one', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    assert.equal(await rawAsk(pipeOf(world, SESSION), JSON.stringify({ role: 'check' })), `${JSON.stringify({ stop: '' })}\n`);
    assert.equal(await askMain(world, SESSION) !== '', true, 'the main session is still told');
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker, 'an agent is still told');
});

// ---------------------------------------------------------------------------------------------------------------
// One server per session, and how long it lives
// ---------------------------------------------------------------------------------------------------------------

test('a second server for the same session exits at once with code 3; the first keeps its memory', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker);
    const second = await runServer(world, ['serve', ...serverArgs(SESSION, resetsAt)]);
    assert.equal(second.code, 3, second.stderr);
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), '', 'still the first server');
    assert.match(fs.readFileSync(world.log, 'utf8'), /another server has the pipe/);
});

test('the server for one session does not answer for another', async (t) => {
    const world = makeWorld(t);
    await startServe(t, world, serverArgs(SESSION, inTwoHours()));
    assert.equal(await pipeAnswers(pipeOf(world, OTHER_SESSION)), false);
});

test('the server has no end time: a reset long past and a cap server seconds old both still answer', async (t) => {
    const world = makeWorld(t);
    const longAgo = new Date(Date.now() - 31 * 60000);
    const { exited } = await startServe(t, world, serverArgs(SESSION, longAgo));
    const cap = await startServe(t, world, capArgs(OTHER_SESSION));
    await new Promise((resolve) => setTimeout(resolve, 3000));
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(longAgo).worker, 'a reset 31 minutes back');
    assert.equal(await ask(world, OTHER_SESSION, 'a1111111111111111', 'software-developer'), CAP_TEXTS.worker, 'a cap server after 3 s');
    let ended = false;
    exited.then(() => { ended = true; });
    cap.exited.then(() => { ended = true; });
    assert.equal(ended, false, 'neither has exited');
    const log = fs.readFileSync(world.log, 'utf8');
    assert.equal(/ends |end time/.test(log), false, `no end time in the log: ${log}`);
});

test('bad arguments or settings: serve exits 2 and says why', async (t) => {
    const world = makeWorld(t);
    const good = serverArgs(SESSION, inTwoHours());
    const usage = good.slice(0, 8);
    const cases = [
        [['serve'], /--session/],
        [['serve', ...good.slice(2)], /--session/],
        [['serve', '--session', 'bad id!', ...good.slice(2)], /session id/],
        [['serve', ...good.slice(0, 6), '--resets-at', 'soon', ...good.slice(8)], /--resets-at/],
        [['serve', ...good.slice(0, 4), '--percent', 'lots', ...good.slice(6)], /--percent/],
        [['serve', ...good.slice(0, 2), '--window', '', ...good.slice(4)], /--window/],
        [['serve', ...good, '--extra', 'x'], /extra/],
        [['wobble', ...good], /mode/],
        [['serve', ...usage], /--claude-pid is missing/],
        [['serve', '--session', SESSION, '--window', 'context-cap'], /--claude-pid is missing/],
        [['serve', ...capArgs(SESSION), '--percent', '95'], /--percent and --resets-at/],
        [['serve', ...capArgs(SESSION), '--resets-at', inTwoHours().toISOString()], /--percent and --resets-at/],
        [['serve', '--session', SESSION, '--window', 'weekly', '--claude-pid', String(process.pid)], /--percent/],
        ...['abc', '0', '-5', '1.5', '', '12x'].map((pid) => [['serve', ...usage, '--claude-pid', pid], /--claude-pid/]),
    ];
    for (const [args, why] of cases) {
        const run = await runServer(world, args);
        assert.equal(run.code, 2, args.join(' '));
        assert.match(run.stderr, why, args.join(' '));
    }
    for (const name of ['pipePrefix', 'processCheckSeconds', 'startCheckSeconds', 'leadAgentTypes', 'logFile']) {
        const missing = makeWorld(t, (config) => { delete config.limitStop[name]; });
        const run = await runServer(missing, ['serve', ...good]);
        assert.equal(run.code, 2, name);
        assert.match(run.stderr, new RegExp(`limitStop\\.${name}`), name);
    }
});

test('the settings runs before K needed are not needed any more', async (t) => {
    const world = makeWorld(t, (config) => {
        for (const name of ['repeatAfterCalls', 'endMarginMinutes', 'capEndMinutes', 'leadStopFallbackMinutes']) {
            delete config.limitStop[name];
        }
    });
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker);
});

test('the log names the session, each agent told and the process watched, and nothing of what the agents said', async (t) => {
    const world = makeWorld(t);
    await startServe(t, world, serverArgs(SESSION, inTwoHours()));
    await ask(world, SESSION, 'a1111111111111111', 'task-lead');
    const log = fs.readFileSync(world.log, 'utf8');
    assert.match(log, new RegExp(`^\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d \\| ${SESSION} \\| listening on .*${SESSION} \\(pid \\d+\\): .*; watching the session's Claude Code process ${process.pid}\\n`, 'm'));
    assert.match(log, /told a1111111111111111 \(task-lead, lead\)\n/);
    assert.equal(log.includes('STOP FOR LIMIT'), false, 'the texts are not copied into the log');
});

test('the log lies at limitStop.logFile under teamState.folder, its folders made on the first line', async (t) => {
    const world = makeWorld(t, (config) => { config.limitStop.logFile = 'deep\\er\\server.log'; });
    await startServe(t, world, serverArgs(SESSION, inTwoHours()));
    const log = path.join(world.base, 'state', 'deep', 'er', 'server.log');
    assert.match(fs.readFileSync(log, 'utf8'), new RegExp(`\\| ${SESSION} \\| listening on `));
    assert.equal(fs.existsSync(world.log), false, 'nothing at the shipped place');
});

test('a refused limitStop.logFile or a root that is not absolute: serve, start and check exit 2 naming the setting', async (t) => {
    const cases = [
        ['limitStop.logFile', (config) => { config.limitStop.logFile = '..\\limit-stop.log'; }],
        ['limitStop.logFile', (config) => { config.limitStop.logFile = 'C:\\limit-stop.log'; }],
        ['limitStop.logFile', (config) => { config.limitStop.logFile = 'logs/limit-stop.log'; }],
        ['teamState.folder', (config) => { config.teamState.folder = 'relative\\state'; }],
    ];
    for (const [name, adjust] of cases) {
        const world = makeWorld(t, adjust);
        const pattern = new RegExp(`'${name.replace('.', '\\.')}'`);
        const serve = await runServer(world, ['serve', ...serverArgs(SESSION, inTwoHours())]);
        assert.equal(serve.code, 2, `${name} serve`);
        assert.match(serve.stderr, pattern, `${name} serve`);
        for (const mode of ['start', 'check']) {
            const args = mode === 'start' ? serverArgs(SESSION, inTwoHours()) : ['--session', SESSION];
            const run = await runServer(world, [mode, ...args]);
            assert.equal(run.code, mode === 'start' ? 1 : 2, `${name} ${mode}: ${run.stdout}`);
            assert.match(run.stdout, pattern, `${name} ${mode}`);
        }
        assert.deepEqual(fs.readdirSync(world.base).sort(), ['orchestrate-agents'], `${name}: nothing written`);
    }
});

test('a log that cannot be written: serve exits 4 without listening, and start says NOT STARTED, naming the log', async (t) => {
    const world = makeWorld(t);
    fs.mkdirSync(world.log, { recursive: true });
    const served = await runServer(world, ['serve', ...serverArgs(SESSION, inTwoHours())]);
    assert.equal(served.code, 4, served.stderr);
    assert.equal(await pipeAnswers(pipeOf(world, SESSION)), false, 'it does not listen');
    const started = await runServer(world, ['start', ...serverArgs(SESSION, inTwoHours())]);
    assert.equal(started.code, 1, started.stdout);
    assert.equal(started.stdout, `LIMIT STOP SERVER NOT STARTED | its log ${world.log} cannot be written, and a failure reaches the main session only through it\n`);
});

// ---------------------------------------------------------------------------------------------------------------
// The start mode: detached, checked, one line
// ---------------------------------------------------------------------------------------------------------------

test('start launches a detached server and says STARTED with its process id; a second start says RUNNING ALREADY', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    const first = await runServer(world, ['start', ...serverArgs(SESSION, resetsAt)]);
    killAfter(t, first.stdout);
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, new RegExp(`^LIMIT STOP SERVER STARTED \\| process \\d+ \\| pipe .*${SESSION} \\| until stop or the end of Claude Code process ${process.pid}\\n$`));
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker, 'the started server answers after start has exited');
    const second = await runServer(world, ['start', ...serverArgs(SESSION, resetsAt)]);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /^LIMIT STOP SERVER RUNNING ALREADY \| pipe /);
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), '', 'the first server, which told this agent already');
});

test('start with bad arguments, or without the Claude Code process, says NOT STARTED and exits 1', async (t) => {
    const world = makeWorld(t);
    const bad = await runServer(world, ['start', '--session', SESSION]);
    assert.equal(bad.code, 1);
    assert.match(bad.stdout, /^LIMIT STOP SERVER NOT STARTED \| .*--window/);
    const noPid = await runServer(world, ['start', '--session', SESSION, '--window', 'context-cap']);
    assert.equal(noPid.code, 1);
    assert.equal(noPid.stdout, 'LIMIT STOP SERVER NOT STARTED | --claude-pid is missing\n');
});

// ---------------------------------------------------------------------------------------------------------------
// The main session, and the stop at its context cap
// ---------------------------------------------------------------------------------------------------------------

test('the main session is told once, with no deadline and with the stop command, and never again', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const answers = [];
    for (let i = 0; i < 7; i += 1) {
        answers.push(await askMain(world, SESSION));
    }
    assert.equal(answers[0], expectedTexts(resetsAt).main(USAGE_SAME_AS, USAGE_ENDING, stopCommandOf(world, SESSION), ''));
    assert.deepEqual(answers.slice(1), Array(6).fill(''));
    assert.equal(/TaskStop|until \d|still silent/.test(answers[0]), false, 'no deadline and no TaskStop of leads');
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker, 'an agent is still told the first time');
    assert.match(fs.readFileSync(world.log, 'utf8'), /told the main session\n/);
});

test('at the main session\'s context cap every role gets its text, worded for the cap, once', async (t) => {
    const world = makeWorld(t);
    await startServe(t, world, capArgs(SESSION));
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), CAP_TEXTS.worker);
    assert.equal(await ask(world, SESSION, 'a2222222222222222', 'task-lead'), CAP_TEXTS.lead);
    assert.equal(await ask(world, SESSION, 'a3333333333333333', 'code-searcher'), CAP_TEXTS.helper);
    assert.equal(await askMain(world, SESSION), CAP_TEXTS.main(CAP_SAME_AS, capEnding(world), stopCommandOf(world, SESSION), ' Then end the session.'));
    for (let i = 0; i < 4; i += 1) {
        assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), '');
        assert.equal(await ask(world, SESSION, 'a2222222222222222', 'task-lead'), '');
    }
    assert.match(fs.readFileSync(world.log, 'utf8'), /listening on .*: the main session is at its context cap; watching /);
});

// ---------------------------------------------------------------------------------------------------------------
// The session's Claude Code process (--claude-pid)
// ---------------------------------------------------------------------------------------------------------------

test('a Claude Code process that does not exist: start refuses, and serve ends right after it listens', async (t) => {
    const world = makeWorld(t);
    const pid = await deadPid();
    const refused = await runServer(world, ['start', '--session', SESSION, '--window', 'context-cap', '--claude-pid', String(pid)]);
    assert.equal(refused.code, 1, refused.stdout);
    assert.equal(refused.stdout, `LIMIT STOP SERVER NOT STARTED | the session's Claude Code process ${pid} is not running\n`);
    const served = await runServer(world, ['serve', '--session', SESSION, '--window', 'context-cap', '--claude-pid', String(pid)]);
    assert.equal(served.code, 0, served.stderr);
    assert.ok(served.ms < 5000, `${served.ms} ms`);
    assert.match(fs.readFileSync(world.log, 'utf8'), new RegExp(`the session's Claude Code process ${pid} is gone; exiting`));
});

test('the server ends within processCheckSeconds after the Claude Code process exits; start passes the pid on', async (t) => {
    const world = makeWorld(t, (config) => { config.limitStop.processCheckSeconds = 0.5; });
    const claude = standIn(t, 3000);
    const first = await runServer(world, ['start', ...serverArgs(SESSION, inTwoHours()).slice(0, 8), '--claude-pid', String(claude.pid)]);
    killAfter(t, first.stdout);
    assert.equal(first.code, 0, first.stdout);
    assert.equal(await pipeAnswers(pipeOf(world, SESSION)), true, 'it serves while the process runs');
    await claude.exited;
    const gone = Date.now();
    await waitForPipe(pipeOf(world, SESSION), false);
    assert.ok(Date.now() - gone < 3000, `ended ${Date.now() - gone} ms after the process`);
    const log = fs.readFileSync(world.log, 'utf8');
    assert.match(log, new RegExp(`listening on .*watching the session's Claude Code process ${claude.pid}`));
    assert.match(log, new RegExp(`the session's Claude Code process ${claude.pid} is gone; exiting`));
});

test('a process the server may not open counts as running (pid 4, the System process)', async (t) => {
    const world = makeWorld(t, (config) => { config.limitStop.processCheckSeconds = 0.5; });
    const first = await runServer(world, ['start', '--session', SESSION, '--window', 'context-cap', '--claude-pid', '4']);
    killAfter(t, first.stdout);
    assert.match(first.stdout, /^LIMIT STOP SERVER STARTED \| /);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(await pipeAnswers(pipeOf(world, SESSION)), true, 'still serving after three checks');
});

// ---------------------------------------------------------------------------------------------------------------
// The stop mode: the main session ends the server after its hand-over
// ---------------------------------------------------------------------------------------------------------------

test('stop ends the server: STOPPED, the pipe is gone and the log says so; a second stop says NOT RUNNING', async (t) => {
    const world = makeWorld(t);
    const { exited } = await startServe(t, world, capArgs(SESSION));
    const stopped = await runServer(world, ['stop', '--session', SESSION]);
    assert.equal(stopped.code, 0, stopped.stdout + stopped.stderr);
    assert.equal(stopped.stdout, `LIMIT STOP SERVER STOPPED | pipe ${pipeOf(world, SESSION)}\n`);
    assert.equal(await exited, 0);
    assert.equal(await pipeAnswers(pipeOf(world, SESSION)), false);
    assert.match(fs.readFileSync(world.log, 'utf8'), new RegExp(`\\| ${SESSION} \\| stopped by the main session; exiting\\n$`));
    const again = await runServer(world, ['stop', '--session', SESSION]);
    assert.equal(again.code, 0, again.stdout);
    assert.equal(again.stdout, `LIMIT STOP SERVER NOT RUNNING | pipe ${pipeOf(world, SESSION)}\n`);
});

test('stop against a pipe that never answers says NOT STOPPED and exits 1; bad arguments exit 2', async (t) => {
    const world = makeWorld(t, (config) => { config.limitStop.connectTimeoutMs = 300; });
    const sockets = new Set();
    const server = net.createServer((socket) => { sockets.add(socket); socket.on('error', () => {}); });
    await new Promise((resolve) => server.listen(pipeOf(world, SESSION), resolve));
    t.after(() => new Promise((resolve) => { for (const s of sockets) s.destroy(); server.close(resolve); }));
    const run = await runServer(world, ['stop', '--session', SESSION]);
    assert.equal(run.code, 1, run.stdout);
    assert.equal(run.stdout, 'LIMIT STOP SERVER NOT STOPPED | no answer within 300 ms\n');
    for (const args of [['stop'], ['stop', '--session', 'bad id!'], ['stop', '--session', SESSION, '--window', 'weekly']]) {
        const bad = await runServer(world, args);
        assert.equal(bad.code, 2, args.join(' '));
        assert.match(bad.stdout, /^LIMIT STOP SERVER NOT STOPPED \| /, args.join(' '));
    }
});

// ---------------------------------------------------------------------------------------------------------------
// The check mode: what the Usage and context watch asks each minute during a hand-over
// ---------------------------------------------------------------------------------------------------------------

test('check: FINE while the server answers, and while no server has listened for the session', async (t) => {
    const world = makeWorld(t);
    const none = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(none.code, 0, none.stderr);
    assert.equal(none.stdout, 'LIMIT STOP SERVER FINE | no server has listened for this session\n');
    await startServe(t, world, capArgs(SESSION));
    const up = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(up.stdout, 'LIMIT STOP SERVER FINE | it answers\n');
});

test('check: a server killed during a hand-over is FAILED once, with the time and the fallback; after that FINE', async (t) => {
    const world = makeWorld(t);
    const { child, exited } = await startServe(t, world, capArgs(SESSION));
    const listenedAt = fs.readFileSync(world.log, 'utf8').match(/(\d\d:\d\d:\d\d) \| [^|]+ \| listening on /)[1];
    child.kill();
    await exited;
    const before = Date.now();
    const first = await runServer(world, ['check', '--session', SESSION]);
    const after = Date.now();
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, new RegExp(`^LIMIT STOP SERVER FAILED \\| ${secondsBetween(before, after)} \\| it is gone: it listened from ${listenedAt} as process ${child.pid} and logged no end\\. ${FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n$`));
    assert.match(fs.readFileSync(world.log, 'utf8'), /told the main session that the server failed \(by the Usage and context watch\)\n$/);
    const second = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(second.stdout, 'LIMIT STOP SERVER FINE | the main session was told of its failure already\n');
});

test('check: after stop it is FINE, and errors logged after the stop do not count', async (t) => {
    const world = makeWorld(t);
    await startServe(t, world, capArgs(SESSION));
    await runServer(world, ['stop', '--session', SESSION]);
    writeLogLine(world, SESSION, 'error for agent a1111111111111111 (task-lead): ECONNRESET');
    const run = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(run.stdout, 'LIMIT STOP SERVER FINE | it ended: stopped by the main session; exiting\n');
});

test('check: an agent\'s hook error in the log is FAILED, naming the agent and the error\'s time', async (t) => {
    const world = makeWorld(t);
    await startServe(t, world, capArgs(SESSION));
    const at = new Date(Date.now() - 65000);
    writeLogLine(world, OTHER_SESSION, 'error for agent a9999999999999999 (task-lead): of another session');
    writeLogLine(world, SESSION, 'error for agent a2222222222222222 (task-lead): no answer within 300 ms', at);
    const run = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(run.stdout, `LIMIT STOP SERVER FAILED | ${at.toLocaleString('sv-SE').slice(11, 19)} | agent a2222222222222222 (task-lead) got an error from it: no answer within 300 ms. ${FALLBACK}\n`);
});

test('check: a pipe that answers garbage is FAILED, and the error is logged for the session', async (t) => {
    const world = makeWorld(t);
    const server = net.createServer((socket) => { socket.on('error', () => {}); socket.once('data', () => socket.end('garbage\n')); });
    await new Promise((resolve) => server.listen(pipeOf(world, SESSION), resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const before = Date.now();
    const run = await runServer(world, ['check', '--session', SESSION]);
    const after = Date.now();
    assert.match(run.stdout, new RegExp(`^LIMIT STOP SERVER FAILED \\| ${secondsBetween(before, after)} \\| the Usage and context watch got an error from it: the answer is not JSON\\. Only now the fallback: `));
    const log = fs.readFileSync(world.log, 'utf8');
    assert.match(log, new RegExp(`\\| ${SESSION} \\| error for the Usage and context watch: the answer is not JSON\\n`));
    assert.match(log, /told the main session that the server failed \(by the Usage and context watch\)\n$/);
});

test('check: a pipe failure the server logged is FAILED with that line\'s time', async (t) => {
    const world = makeWorld(t);
    const at = new Date(Date.now() - 125000);
    writeLogLine(world, SESSION, `listening on ${pipeOf(world, SESSION)} (pid 4242): the main session is at its context cap; watching the session's Claude Code process 1`, new Date(at.getTime() - 60000));
    writeLogLine(world, SESSION, 'the pipe failed: EPIPE', at);
    const run = await runServer(world, ['check', '--session', SESSION]);
    assert.equal(run.stdout, `LIMIT STOP SERVER FAILED | ${at.toLocaleString('sv-SE').slice(11, 19)} | its pipe failed (EPIPE) and it exited. ${FALLBACK}\n`);
});

test('check with bad arguments says NOT CHECKED and exits 2', async (t) => {
    const world = makeWorld(t);
    for (const args of [['check'], ['check', '--session', '..\\x'], ['check', '--session', SESSION, '--percent', '5']]) {
        const run = await runServer(world, args);
        assert.equal(run.code, 2, args.join(' '));
        assert.match(run.stdout, /^LIMIT STOP SERVER NOT CHECKED \| /, args.join(' '));
    }
});

// ---------------------------------------------------------------------------------------------------------------
// Run G's gaps: the line limit and a start whose pipe does not answer in time
// ---------------------------------------------------------------------------------------------------------------

test('a valid request longer than the line limit gets no answer and counts for nothing', async (t) => {
    const world = makeWorld(t);
    const resetsAt = inTwoHours();
    await startServe(t, world, serverArgs(SESSION, resetsAt));
    const long = JSON.stringify({ agentId: 'a1111111111111111', agentType: 'software-developer', pad: 'p'.repeat(70000) });
    assert.equal(await rawAsk(pipeOf(world, SESSION), long), '', 'no answer to a line over 64 KB');
    assert.equal(await ask(world, SESSION, 'a1111111111111111', 'software-developer'), expectedTexts(resetsAt).worker, 'still told the first time');
});

test('start stops a server whose pipe did not answer within startCheckSeconds', async (t) => {
    const world = makeWorld(t, (config) => { config.limitStop.startCheckSeconds = 0; });
    const run = await runServer(world, ['start', ...serverArgs(SESSION, inTwoHours())]);
    assert.equal(run.code, 1, run.stdout);
    assert.match(run.stdout, /^LIMIT STOP SERVER NOT STARTED \| its pipe did not answer within 0 s, so it was stopped; /);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    assert.equal(await pipeAnswers(pipeOf(world, SESSION)), false, 'the stopped server never listens');
});
