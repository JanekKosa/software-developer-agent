// The limit-stop server. When the Usage and context watch decides LIMIT NEAR | HAND OVER it runs this script in 'start'
// mode; so do the watch and the context-guard hook when the main session passes its warning size (contextCaps.main.
// warn), with the window context-cap. start starts the server in 'serve' mode as a detached, hidden process and says
// in one line whether it runs. The server listens on the session's pipe (\\.\pipe\<limitStop.pipePrefix>-<session
// id>) and answers the context-guard hook, which asks after every tool call of every agent of the session, with the
// stop text for that agent the first time it asks, and nothing after that: each agent is told once (the user's
// choice, 2026-10-25: being told is incentive enough). Leads (limitStop.leadAgentTypes), helpers
// (usageLimits.ignoreAgentTypes) and workers (every other type) get their own texts. The hook asks for the main
// session too ({"role":"main"}), which gets its own text once. It remembers in memory only, writes no signal file
// (the user's choice, 2026-10-25: nothing is left behind to delete), and logs to limitStop.logFile; it does not
// start when it cannot write that log, since the log is how the main session learns that it failed.
// It has no end time: it lives as long as the hand-over, and exits when the session's Claude Code process
// (--claude-pid) is gone, checked every limitStop.processCheckSeconds, or when the main session stops it with
// 'stop' after writing the hand-over. A second server for the same session finds the pipe taken and exits at once.
// 'check' is what the Usage and context watch runs each minute during a hand-over: it says in one line whether the main
// session must now be told that the server failed (lib/limit-stop.mjs decides it from the pipe and the log).
//
//   node limit-stop-server.mjs start --session <id> --window five-hour|weekly --percent <p> --resets-at <ISO time>
//       --claude-pid <pid>
//   node limit-stop-server.mjs start --session <id> --window context-cap --claude-pid <pid>
//   node limit-stop-server.mjs check --session <id>
//   node limit-stop-server.mjs stop --session <id>
//
// start prints one line and exits 0 for LIMIT STOP SERVER STARTED | process <pid> | pipe <pipe> | until stop or the
// end of Claude Code process <pid>, or for LIMIT STOP SERVER RUNNING ALREADY | pipe <pipe>, and exits 1 for LIMIT STOP
// SERVER NOT STARTED | <why>.
// check prints LIMIT STOP SERVER FAILED | <time> | <what failed>. <the fallback> (and logs that the main session was
// told, so it is said once) or LIMIT STOP SERVER FINE | <state>, and exits 0; LIMIT STOP SERVER NOT CHECKED | <why>
// and exit 2 for wrong arguments or settings.
// stop prints LIMIT STOP SERVER STOPPED | pipe <pipe> or LIMIT STOP SERVER NOT RUNNING | pipe <pipe> and exits 0,
// LIMIT STOP SERVER NOT STOPPED | <why> and exits 1 (2 for wrong arguments or settings).
// serve (what start runs) exits 0 at its end, 2 for wrong arguments or settings, 3 when the pipe is taken, 1 when the
// pipe fails otherwise, 4 when its log cannot be written.

import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadConfig, requireNumberSetting, requirePathSetting, requireSetting, skillDirOf } from '../lib/config.mjs';
import {
    AGENT_ID_PATTERN, appendLimitStopLog, askLimitStop, assertLogWritable, capRelaunchCommand, describeServer, findServerFailure, limitStopPipePath, LOG,
    logSettings, MAX_LINE_BYTES, pipeSettings, PROCESS_ID_PATTERN, readSessionLog, serverFailedLine, serverStopCommand,
} from '../lib/limit-stop.mjs';
import { formatLocalMinute } from '../lib/local-time.mjs';

const ARGUMENT_OPTIONS = {
    session: { type: 'string' },
    window: { type: 'string' },
    percent: { type: 'string' },
    'resets-at': { type: 'string' },
    'claude-pid': { type: 'string' },
};

/** check and stop take the session only. */
const SESSION_OPTIONS = { session: { type: 'string' } };

const WINDOW_NAMES = { 'five-hour': 'five-hour', weekly: 'weekly' };

/** The window of a stop at the main session's context cap: no percent, no reset. */
const CONTEXT_CAP = 'context-cap';

/** The key the main session is counted under; no agent id can be it, since agent ids hold no spaces. */
const MAIN_KEY = 'the main session';

/** Who asks in check mode, as its "error for" line and its FAILED line name it. */
const CHECK_ASKER = 'the Usage and context watch';

/** How often start looks whether the new server's pipe answers yet, and stop whether it is gone. Only the bound,
 * startCheckSeconds, is a setting. */
const START_POLL_MS = 100;

const EXIT_ENDED = 0;
const EXIT_PIPE_FAILED = 1;
const EXIT_BAD_INPUT = 2;
const EXIT_PIPE_TAKEN = 3;
const EXIT_LOG_FAILED = 4;

// ---------------------------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------------------------

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'start') {
    process.exitCode = await start(rest);
} else if (mode === 'serve') {
    serve(rest);
} else if (mode === 'check') {
    process.exitCode = await check(rest);
} else if (mode === 'stop') {
    process.exitCode = await stop(rest);
} else {
    process.stderr.write(`limit-stop-server: the first argument must be the mode, start, serve, check or stop, not ${JSON.stringify(mode ?? '')}\n`);
    process.exitCode = EXIT_BAD_INPUT;
}

// ---------------------------------------------------------------------------------------------------------------
// Arguments and settings
// ---------------------------------------------------------------------------------------------------------------

/**
 * Reads the arguments and the settings of start and serve, and works out the pipe.
 * @param {string[]} args the arguments after the mode
 * @returns {object} session, window, percent and resetsAt (usage windows only), claudePid, pipePath and the
 *   settings the server uses
 * @throws {Error} saying which argument or setting is wrong
 */
function readSetup(args) {
    const { values } = parseArgs({ args, options: ARGUMENT_OPTIONS, strict: true, allowPositionals: false });
    for (const name of ['session', 'window']) {
        if (values[name] === undefined) {
            throw new Error(`--${name} is missing`);
        }
    }
    const stopWindow = readWindow(values);
    const claudePid = readClaudePid(values['claude-pid']);
    const config = loadConfig(skillDirOf(import.meta.url));
    const { pipePrefix, connectTimeoutMs } = pipeSettings(config);
    return {
        session: values.session,
        ...stopWindow,
        claudePid,
        pipePath: limitStopPipePath(pipePrefix, values.session),
        connectTimeoutMs,
        startCheckMs: requireNumberSetting(config, 'limitStop.startCheckSeconds') * 1000,
        processCheckMs: requireNumberSetting(config, 'limitStop.processCheckSeconds') * 1000,
        logFile: requirePathSetting(config, 'limitStop.logFile'),
        leadTypes: requireTypeList(config, 'limitStop.leadAgentTypes'),
        helperTypes: requireTypeList(config, 'usageLimits.ignoreAgentTypes'),
    };
}

/**
 * Reads the arguments and settings of check and stop: the session alone.
 * @param {string[]} args the arguments after the mode
 * @returns {object} session, pipePath, connectTimeoutMs, startCheckMs and the log settings
 * @throws {Error} saying which argument or setting is wrong
 */
function readSessionSetup(args) {
    const { values } = parseArgs({ args, options: SESSION_OPTIONS, strict: true, allowPositionals: false });
    if (values.session === undefined) {
        throw new Error('--session is missing');
    }
    const config = loadConfig(skillDirOf(import.meta.url));
    const { pipePrefix, connectTimeoutMs } = pipeSettings(config);
    return {
        session: values.session,
        pipePath: limitStopPipePath(pipePrefix, values.session),
        connectTimeoutMs,
        startCheckMs: requireNumberSetting(config, 'limitStop.startCheckSeconds') * 1000,
        ...logSettings(config),
    };
}

/**
 * Reads what the stop is for: a usage window with its percent and reset, or the main session's context cap, which
 * has neither.
 * @param {object} values the parsed arguments
 * @returns {{window: string, percent?: number, resetsAt?: Date}} the window, and for a usage window its numbers
 * @throws {Error} saying which argument is wrong
 */
function readWindow(values) {
    if (values.window === CONTEXT_CAP) {
        if (values.percent !== undefined || values['resets-at'] !== undefined) {
            throw new Error('--percent and --resets-at go with a usage window (five-hour or weekly), not with context-cap');
        }
        return { window: CONTEXT_CAP };
    }
    const window = WINDOW_NAMES[values.window];
    if (window === undefined) {
        throw new Error(`--window must be five-hour, weekly or context-cap, not ${JSON.stringify(values.window)}`);
    }
    for (const name of ['percent', 'resets-at']) {
        if (values[name] === undefined) {
            throw new Error(`--${name} is missing`);
        }
    }
    const percent = Number(values.percent);
    if (values.percent.trim() === '' || !Number.isFinite(percent)) {
        throw new Error(`--percent must be a number, not ${JSON.stringify(values.percent)}`);
    }
    const resetsAt = new Date(values['resets-at']);
    if (Number.isNaN(resetsAt.getTime())) {
        throw new Error(`--resets-at must be a time such as 2026-10-25T15:00:00+02:00, not ${JSON.stringify(values['resets-at'])}`);
    }
    return { window, percent, resetsAt };
}

/**
 * Reads the process id of the session's Claude Code, which the server outlives by at most processCheckSeconds. It
 * is required: with no end time, it is what ends a server whose main session never runs stop.
 * @param {string|undefined} text the --claude-pid argument
 * @returns {number} the id
 * @throws {Error} when it is missing or not a whole number of one or more
 */
function readClaudePid(text) {
    if (text === undefined) {
        throw new Error('--claude-pid is missing');
    }
    if (!PROCESS_ID_PATTERN.test(text)) {
        throw new Error(`--claude-pid must be a process id (a whole number of one or more), not ${JSON.stringify(text)}`);
    }
    return Number(text);
}

/**
 * Tells whether a process runs. Signal 0 only checks: on Windows, Node answers ESRCH for an id no process has, and
 * EPERM for one it may not open, which therefore runs (measured 2026-10-25).
 * @param {number} pid the process id
 * @returns {boolean} true when it runs
 */
function processRuns(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

/**
 * Reads a setting that must be a list of agent type names.
 * @param {object} config settings from loadConfig
 * @param {string} keyPath dotted path
 * @returns {Set<string>} the names
 * @throws {Error} naming the setting
 */
function requireTypeList(config, keyPath) {
    const value = requireSetting(config, keyPath);
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new Error(`orchestration.config.json setting '${keyPath}' must be a list of agent type names`);
    }
    return new Set(value);
}

// ---------------------------------------------------------------------------------------------------------------
// start: launch the server detached and say whether it runs
// ---------------------------------------------------------------------------------------------------------------

/**
 * Starts the server detached and hidden, so it outlives the watch's background task (Start-Process from that task
 * dies with it; a detached Node child does not, measured 2026-10-25), and waits until its pipe answers.
 * @param {string[]} args the arguments after the mode
 * @returns {Promise<number>} the exit code
 */
async function start(args) {
    let setup;
    try {
        setup = readSetup(args);
    } catch (error) {
        return printLine(`LIMIT STOP SERVER NOT STARTED | ${oneLine(error)}`, 1);
    }
    if (!processRuns(setup.claudePid)) {
        return printLine(`LIMIT STOP SERVER NOT STARTED | the session's Claude Code process ${setup.claudePid} is not running`, 1);
    }
    if (await pipeAnswers(setup.pipePath)) {
        return printLine(`LIMIT STOP SERVER RUNNING ALREADY | pipe ${setup.pipePath}`, 0);
    }
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', ...args], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    child.unref();
    let exitCode = null;
    child.on('exit', (code) => { exitCode = code ?? EXIT_PIPE_FAILED; });
    child.on('error', (error) => { exitCode = error.code ?? error.message; });
    const deadline = Date.now() + setup.startCheckMs;
    while (Date.now() < deadline) {
        if (exitCode !== null) {
            return printLine(startFailureLine(exitCode, setup), exitCode === EXIT_PIPE_TAKEN ? 0 : 1);
        }
        if (await pipeAnswers(setup.pipePath)) {
            return printLine(`LIMIT STOP SERVER STARTED | process ${child.pid} | pipe ${setup.pipePath} | until stop or the end of Claude Code process ${setup.claudePid}`, 0);
        }
        await new Promise((resolve) => setTimeout(resolve, START_POLL_MS));
    }
    child.kill();
    return printLine(`LIMIT STOP SERVER NOT STARTED | its pipe did not answer within ${setup.startCheckMs / 1000} s, so it was stopped; its log is ${setup.logFile}`, 1);
}

/**
 * The line start prints when the new server exited before its pipe answered.
 * @param {number|string} exitCode the server's exit code, or the spawn error
 * @param {object} setup from readSetup
 * @returns {string} the line
 */
function startFailureLine(exitCode, setup) {
    if (exitCode === EXIT_PIPE_TAKEN) {
        return `LIMIT STOP SERVER RUNNING ALREADY | pipe ${setup.pipePath}`;
    }
    if (exitCode === EXIT_LOG_FAILED) {
        return `LIMIT STOP SERVER NOT STARTED | its log ${setup.logFile} cannot be written, and a failure reaches the main session only through it`;
    }
    return `LIMIT STOP SERVER NOT STARTED | it exited with ${exitCode}; its log is ${setup.logFile}`;
}

/**
 * Prints a mode's one line.
 * @param {string} line the line
 * @param {number} code the exit code that goes with it
 * @returns {number} the exit code
 */
function printLine(line, code) {
    process.stdout.write(`${line}\n`);
    return code;
}

/**
 * Tells whether a server listens on a pipe: connects and ends at once, sending nothing (the server lets such a
 * client go without counting it).
 * @param {string} pipePath the pipe
 * @returns {Promise<boolean>} true when the connect succeeded
 */
function pipeAnswers(pipePath) {
    return new Promise((resolve) => {
        const socket = net.connect(pipePath, () => { socket.end(); resolve(true); });
        socket.on('error', () => resolve(false));
    });
}

// ---------------------------------------------------------------------------------------------------------------
// check and stop: the Usage and context watch's look, and the main session's end of the server
// ---------------------------------------------------------------------------------------------------------------

/**
 * Says whether the main session must now be told that the server failed. A failed query is logged first, as any
 * hook's is; a FAILED line is logged as told, so the next check, or the main session's hook, does not say it again.
 * @param {string[]} args the arguments after the mode
 * @returns {Promise<number>} the exit code
 */
async function check(args) {
    let setup;
    try {
        setup = readSessionSetup(args);
    } catch (error) {
        return printLine(`LIMIT STOP SERVER NOT CHECKED | ${oneLine(error)}`, EXIT_BAD_INPUT);
    }
    const asked = await askLimitStop(setup.pipePath, { role: 'check' }, setup.connectTimeoutMs);
    if (asked.kind === 'failed') {
        tryLog(setup, `${LOG.errorFor}${CHECK_ASKER}: ${asked.reason}`);
    }
    const now = new Date();
    let lines;
    try {
        lines = readSessionLog(setup.logFile, setup.session, setup.tailBytes);
    } catch (error) {
        return printLine(`LIMIT STOP SERVER NOT CHECKED | its log ${setup.logFile} cannot be read: ${oneLine(error)}`, 1);
    }
    const failure = findServerFailure(lines, asked, CHECK_ASKER, now);
    if (failure === null) {
        return printLine(`LIMIT STOP SERVER FINE | ${describeServer(lines, asked)}`, 0);
    }
    tryLog(setup, `${LOG.toldMain} (by ${CHECK_ASKER})`);
    return printLine(serverFailedLine(failure, now), 0);
}

/**
 * Ends the session's server: asks it to stop, then waits until its pipe is gone, so STOPPED is read back, not
 * assumed.
 * @param {string[]} args the arguments after the mode
 * @returns {Promise<number>} the exit code
 */
async function stop(args) {
    let setup;
    try {
        setup = readSessionSetup(args);
    } catch (error) {
        return printLine(`LIMIT STOP SERVER NOT STOPPED | ${oneLine(error)}`, EXIT_BAD_INPUT);
    }
    const asked = await askLimitStop(setup.pipePath, { role: 'stop' }, setup.connectTimeoutMs);
    if (asked.kind === 'no-server') {
        return printLine(`LIMIT STOP SERVER NOT RUNNING | pipe ${setup.pipePath}`, 0);
    }
    if (asked.kind === 'failed') {
        return printLine(`LIMIT STOP SERVER NOT STOPPED | ${asked.reason}`, 1);
    }
    const deadline = Date.now() + setup.startCheckMs;
    while (await pipeAnswers(setup.pipePath)) {
        if (Date.now() >= deadline) {
            return printLine(`LIMIT STOP SERVER NOT STOPPED | its pipe still answers ${setup.startCheckMs / 1000} s after it was asked to stop`, 1);
        }
        await new Promise((resolve) => setTimeout(resolve, START_POLL_MS));
    }
    return printLine(`LIMIT STOP SERVER STOPPED | pipe ${setup.pipePath}`, 0);
}

/**
 * Appends a log line for check or stop; one that cannot be written is said on stderr, and the mode carries on.
 * @param {{logFile: string, session: string}} setup from readSessionSetup
 * @param {string} text the line's text
 */
function tryLog(setup, text) {
    try {
        appendLimitStopLog(setup.logFile, setup.session, text);
    } catch (error) {
        process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// serve: listen, answer, end
// ---------------------------------------------------------------------------------------------------------------

/**
 * Runs the server until the session's Claude Code process is gone or the main session stops it.
 * @param {string[]} args the arguments after the mode
 */
function serve(args) {
    let setup;
    try {
        setup = readSetup(args);
    } catch (error) {
        process.stderr.write(`limit-stop-server: ${oneLine(error)}\n`);
        process.exitCode = EXIT_BAD_INPUT;
        return;
    }
    const log = (text) => {
        try {
            appendLimitStopLog(setup.logFile, setup.session, text);
        } catch {
            // The listening line was written, so the log works; a line lost later must not stop the server.
        }
    };
    try {
        assertLogWritable(setup.logFile);
    } catch (error) {
        process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
        process.exitCode = EXIT_LOG_FAILED;
        return;
    }
    const told = new Set();
    const server = net.createServer((socket) => handleConnection(socket, setup, told, log));
    server.on('error', (error) => {
        const taken = error.code === 'EADDRINUSE';
        const why = taken ? `another server has the pipe ${setup.pipePath}; this one exits` : `${LOG.pipeFailed}${error.code ?? error.message}`;
        log(why);
        process.stderr.write(`limit-stop-server: ${why}\n`);
        process.exit(taken ? EXIT_PIPE_TAKEN : EXIT_PIPE_FAILED);
    });
    server.listen(setup.pipePath, () => {
        const what = setup.window === CONTEXT_CAP
            ? 'the main session is at its context cap'
            : `the ${setup.window} limit at ${setup.percent}% resets ${formatClock(setup.resetsAt)}`;
        try {
            appendLimitStopLog(setup.logFile, setup.session, `${LOG.listening}${setup.pipePath} (pid ${process.pid}): ${what}; watching the session's Claude Code process ${setup.claudePid}`);
        } catch (error) {
            process.stderr.write(`limit-stop-server: the log ${setup.logFile} cannot be written: ${oneLine(error)}\n`);
            process.exit(EXIT_LOG_FAILED);
        }
        whenProcessGone(setup.claudePid, setup.processCheckMs, () => {
            log(LOG.processGone(setup.claudePid));
            process.exit(EXIT_ENDED);
        });
    });
}

/**
 * Calls back once a process is gone: looks at once, then every checkMs.
 * @param {number} pid the process id
 * @param {number} checkMs how often to look
 * @param {() => void} callback what to do then
 */
function whenProcessGone(pid, checkMs, callback) {
    if (!processRuns(pid)) {
        callback();
        return;
    }
    const timer = setInterval(() => {
        if (!processRuns(pid)) {
            clearInterval(timer);
            callback();
        }
    }, checkMs);
}

/**
 * Answers one client: reads its request line, writes the answer line and closes; a stop request logs the stop and
 * ends the server once the answer is out. A client that sends nothing or something broken gets no answer and counts
 * for nothing; one that takes longer than the hook's own timeout is let go, since the hook has given up by then.
 * @param {net.Socket} socket the client
 * @param {object} setup from readSetup
 * @param {Set<string>} told the agents told so far
 * @param {(text: string) => void} log writes a log line
 */
function handleConnection(socket, setup, told, log) {
    const chunks = [];
    let bytes = 0;
    socket.setTimeout(setup.connectTimeoutMs, () => socket.destroy());
    socket.on('error', () => socket.destroy());
    socket.on('data', (chunk) => {
        chunks.push(chunk);
        bytes += chunk.length;
        if (bytes > MAX_LINE_BYTES) {
            socket.destroy();
            return;
        }
        if (!chunk.includes(0x0a)) {
            return;
        }
        const request = parseRequest(Buffer.concat(chunks));
        if (request === null) {
            socket.destroy();
            return;
        }
        const answer = `${JSON.stringify({ stop: answerFor(request, setup, told, log) })}\n`;
        if (request.role === 'stop') {
            log(LOG.stopped);
            const exit = () => process.exit(EXIT_ENDED);
            socket.on('close', exit);
            socket.end(answer, exit);
            return;
        }
        socket.end(answer);
    });
}

/**
 * Reads a request line.
 * @param {Buffer} bytes what the client wrote
 * @returns {{agentId: string, agentType: string|undefined, role?: 'main'|'check'|'stop'}|null} the request (the main
 *   session's, the check's and the stop's have their role set), or null when it is broken
 */
function parseRequest(bytes) {
    let request;
    try {
        request = JSON.parse(bytes.toString('utf8').split('\n')[0]);
    } catch {
        return null;
    }
    if (request === null || typeof request !== 'object') {
        return null;
    }
    if (['main', 'check', 'stop'].includes(request.role)) {
        return { agentId: MAIN_KEY, agentType: undefined, role: request.role };
    }
    if (typeof request.agentId !== 'string' || !AGENT_ID_PATTERN.test(request.agentId)) {
        return null;
    }
    return { agentId: request.agentId, agentType: typeof request.agentType === 'string' ? request.agentType : undefined };
}

/**
 * Decides what to tell an agent now: its text the first time it asks, nothing after that. The main session is told
 * once too; a check or a stop is told nothing and counts for no one.
 * @param {{agentId: string, agentType: string|undefined, role?: string}} request the agent, the main session, a
 *   check or a stop
 * @param {object} setup from readSetup
 * @param {Set<string>} told the agents told so far
 * @param {(text: string) => void} log writes a log line
 * @returns {string} the stop text, or '' for nothing
 */
function answerFor(request, setup, told, log) {
    if (request.role === 'check' || request.role === 'stop' || told.has(request.agentId)) {
        return '';
    }
    told.add(request.agentId);
    if (request.role === 'main') {
        log('told the main session');
        return mainText(setup);
    }
    const role = roleOf(request.agentType, setup);
    log(`told ${request.agentId} (${request.agentType ?? 'no type'}, ${role})`);
    return firstText(role, setup);
}

/**
 * Gives an agent type's role for the stop.
 * @param {string|undefined} agentType the type the hook passed
 * @param {object} setup from readSetup
 * @returns {'lead'|'helper'|'worker'} the role; an unknown or missing type is a worker
 */
function roleOf(agentType, setup) {
    if (setup.leadTypes.has(agentType)) {
        return 'lead';
    }
    return setup.helperTypes.has(agentType) ? 'helper' : 'worker';
}

// ---------------------------------------------------------------------------------------------------------------
// The texts
// ---------------------------------------------------------------------------------------------------------------

const WORKER_LINE = 'WORKER STOPPED | <run> | hand-off: <progress file>';

/**
 * The text an agent gets, once.
 * @param {'lead'|'helper'|'worker'} role from roleOf
 * @param {object} setup from readSetup
 * @returns {string} the text
 */
function firstText(role, setup) {
    const head = headOf(setup);
    if (role === 'lead') {
        return `${head} Start nothing new: no worker, no check, no heavy command. Your running workers are told the same at their next tool call, so send them nothing; each ends with ${WORKER_LINE}. While a worker still runs, end your turn with WAITING FOR WORKER | <run>. When none runs any more, add a section "## Hand-off" at the end of your lead file: your plan and where it stands, each run with its state and its worker's hand-off path, the register ids still open, and the next runs in order. Then end your turn with LEAD STOPPED | <lead file>.`;
    }
    if (role === 'helper') {
        return `${head} Stop searching: return what you have found so far now, and say first that ${causeOf(setup)} stopped you.`;
    }
    return `${head} Stop building: finish the one command or edit you are in and start no other, not even the suite. Add a section "## Hand-off" at the end of your progress file: what is done, how it was checked, what is on disk but unchecked, what is left, the exact next step, and the files you own. Then end your turn with the line ${WORKER_LINE}. Your lead starts your successor from it.`;
}

/**
 * The text the main session gets, once: its leads are told by the hook, so it waits for every one of them, with no
 * deadline (the user's choice, 2026-10-25), writes the hand-over, schedules the relaunch (at the cap with the
 * command itself, as no watch line may carry it) and in the same step stops this server. It says that the watch's
 * lines (and, at the cap, the hook's) mean the same, and that a LIMIT STOP SERVER FAILED line comes first, should the
 * server fail.
 * @param {object} setup from readSetup
 * @returns {string} the text
 */
function mainText(setup) {
    const atCap = setup.window === CONTEXT_CAP;
    const skillDir = skillDirOf(import.meta.url);
    const sameAs = atCap
        ? 'SESSION NEAR CAP from the context-guard hook or the Usage and context watch means the same'
        : "the Usage and context watch's LIMIT NEAR | HAND OVER lines mean the same";
    const ending = atCap
        ? `run ${capRelaunchCommand(skillDir)}, which starts a new chat with Read <hand-over> and carry on`
        : 'schedule the relaunch for after the reset with schedule-relaunch.ps1, as the watch printed it';
    const last = atCap ? ' Then end the session.' : '';
    return `${headOf(setup)} This is the main session's part; ${sameAs}. Every lead and worker of this session is told to stop at its next tool call: send them no stop message, and start nothing new. Wait for LEAD STOPPED | <lead file> from every running lead, with no deadline; if you are told LIMIT STOP SERVER FAILED meanwhile, do what it says. Then write the hand-over, listing each lead's hand-off, ${ending}, and in the same step stop this server: ${serverStopCommand(skillDir, setup.session)}.${last}`;
}

/**
 * The first sentence of every text: why the session hands over.
 * @param {object} setup from readSetup
 * @returns {string} the sentence
 */
function headOf(setup) {
    if (setup.window === CONTEXT_CAP) {
        return 'STOP FOR LIMIT | this session is at its context cap and hands over to a new one.';
    }
    return `STOP FOR LIMIT | the ${setup.window} usage limit is at ${Number(setup.percent.toFixed(1))}% and resets at ${formatClock(setup.resetsAt)}, so this session hands over to a new one.`;
}

/**
 * What an agent stops for, as the texts name it.
 * @param {object} setup from readSetup
 * @returns {string} 'the usage limit' or "the session's context cap"
 */
function causeOf(setup) {
    return setup.window === CONTEXT_CAP ? "the session's context cap" : 'the usage limit';
}

/**
 * A moment as the texts show it: local HH:mm on the same day, else YYYY-MM-DD HH:mm.
 * @param {Date} moment the moment
 * @returns {string} the clock text
 */
function formatClock(moment) {
    const full = formatLocalMinute(moment);
    return full.slice(0, 10) === formatLocalMinute(new Date()).slice(0, 10) ? full.slice(11) : full;
}

/**
 * An error's message on one line.
 * @param {Error} error what went wrong
 * @returns {string} the message, line breaks replaced by spaces
 */
function oneLine(error) {
    return String(error?.message ?? error).replace(/\r\n|\n|\r/g, ' ');
}
