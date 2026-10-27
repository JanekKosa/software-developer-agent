// The limit-stop pipe, shared by scripts/limit-stop-server.mjs (which listens on it) and hooks/context-guard.mjs
// (which asks it after every tool call of an agent and of the main session): its name, its settings and one query.
// A query is one JSON line from the client ({"agentId", "agentType"} for an agent, {"role": "main"} for the main
// session, {"role": "check"} for the Usage and context watch's check, {"role": "stop"} to end the server) and one JSON
// line back ({"stop": "<text, or empty>"}), then the server closes the connection.
// Also the server's log (limitStop.logFile), which this module alone writes and reads: besides the server's own
// lines, every hook or check whose query failed writes an "error for" line there, and the main session learns of a
// failure of the server from it (the user chose the pipe so that no signal file is left on disk, 2026-10-25; the log
// existed already). And the commands that both sides' texts give the main session.

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { requireNumberSetting, requireSetting, requireStatePath } from './config.mjs';
import { formatLocalMinute } from './local-time.mjs';
import { readFileTail } from './transcript.mjs';

/**
 * The command the main session runs after its hand-over at the context cap: schedule-relaunch.ps1 -ContextCap, which
 * starts the next chat relaunch.afterCapMinutes later. The hook's SESSION NEAR CAP text and the server's main text
 * both name it, so they cannot drift apart; the Usage and context watch prints the same command.
 * @param {string} skillDir the skill folder, from skillDirOf
 * @returns {string} the command, with <project folder> and <hand-over file> for the session to fill in
 */
export function capRelaunchCommand(skillDir) {
    const script = path.join(skillDir, 'scripts', 'schedule-relaunch.ps1');
    return `& '${script}' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`;
}

/**
 * The command that ends a session's server once the hand-over is written: limit-stop-server.mjs stop. The main
 * session runs it in the step that schedules the relaunch; until then the server lives as long as the session.
 * @param {string} skillDir the skill folder, from skillDirOf
 * @param {string} session the session id
 * @returns {string} the command
 */
export function serverStopCommand(skillDir, session) {
    return `node '${path.join(skillDir, 'scripts', 'limit-stop-server.mjs')}' stop --session ${session}`;
}

/**
 * A session id as Claude Code writes it (a GUID); it becomes part of a pipe name and of the main session's marker
 * name, so nothing else is allowed.
 */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;

/**
 * An agent id as the server takes it in a request; the hook asks with no other, so a refused request is never taken
 * for a failure of the server.
 */
export const AGENT_ID_PATTERN = /^[\w-]{1,128}$/;

/** A process id as the server's --claude-pid takes it: a whole number of one or more, at most ten digits. */
export const PROCESS_ID_PATTERN = /^[1-9]\d{0,9}$/;

/** A pipe prefix from the settings: one plain name part. */
const PIPE_PREFIX_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

/** The longest request or answer line either side reads; a longer one is broken. Structural, not a setting. */
export const MAX_LINE_BYTES = 65536;

/**
 * Reads the settings both sides of the pipe need (limitStop in orchestration.config.json).
 * @param {object} config settings from loadConfig
 * @returns {{pipePrefix: string, connectTimeoutMs: number}} the pipe name prefix and how long a query may take
 * @throws {Error} naming a missing or wrong setting
 */
export function pipeSettings(config) {
    const pipePrefix = requireSetting(config, 'limitStop.pipePrefix');
    if (typeof pipePrefix !== 'string' || !PIPE_PREFIX_PATTERN.test(pipePrefix)) {
        throw new Error(`orchestration.config.json setting 'limitStop.pipePrefix' must be a plain name part, not ${JSON.stringify(pipePrefix)}`);
    }
    return { pipePrefix, connectTimeoutMs: requireNumberSetting(config, 'limitStop.connectTimeoutMs') };
}

/**
 * Gives the pipe of a session: \\.\pipe\<prefix>-<session id>. One pipe per session, so an agent of one session
 * never reaches the server of another.
 * @param {string} pipePrefix from pipeSettings
 * @param {*} sessionId the session id
 * @returns {string} the pipe path
 * @throws {Error} when the session id is not a plain id
 */
export function limitStopPipePath(pipePrefix, sessionId) {
    if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
        throw new Error(`session id ${JSON.stringify(sessionId)} is not a plain id`);
    }
    return `\\\\.\\pipe\\${pipePrefix}-${sessionId}`;
}

/**
 * Asks the session's server what to tell an agent. Never rejects: when no server listens (the normal case) the
 * connect fails at once with ENOENT and the result is 'no-server'; anything else that goes wrong is 'failed'.
 * @param {string} pipePath from limitStopPipePath
 * @param {object} request the agent asking ({agentId, agentType}), or {role}
 * @param {number} timeoutMs how long the whole query may take
 * @returns {Promise<{kind: 'no-server'} | {kind: 'answer', stop: string} | {kind: 'failed', reason: string}>}
 *   what the server said
 */
export function askLimitStop(pipePath, request, timeoutMs) {
    return new Promise((resolve) => {
        const chunks = [];
        let bytes = 0;
        let settled = false;
        const socket = net.connect(pipePath);
        const finish = (result) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                socket.destroy();
                resolve(result);
            }
        };
        const timer = setTimeout(() => finish({ kind: 'failed', reason: `no answer within ${timeoutMs} ms` }), timeoutMs);
        socket.on('connect', () => socket.write(`${JSON.stringify(request)}\n`));
        socket.on('data', (chunk) => {
            chunks.push(chunk);
            bytes += chunk.length;
            if (bytes > MAX_LINE_BYTES) {
                finish({ kind: 'failed', reason: `answer longer than ${MAX_LINE_BYTES} bytes` });
            } else if (chunk.includes(0x0a)) {
                finish(parseAnswer(Buffer.concat(chunks)));
            }
        });
        socket.on('end', () => finish(parseAnswer(Buffer.concat(chunks))));
        socket.on('error', (error) => finish(error.code === 'ENOENT' ? { kind: 'no-server' } : { kind: 'failed', reason: error.code ?? error.message }));
    });
}

/**
 * Reads the server's answer line.
 * @param {Buffer} bytes what the server wrote, decoded only once whole, so a character cut across chunks survives
 * @returns {{kind: 'answer', stop: string} | {kind: 'failed', reason: string}} the stop text, or why it is broken
 */
function parseAnswer(bytes) {
    const line = bytes.toString('utf8').split('\n')[0];
    let answer;
    try {
        answer = JSON.parse(line);
    } catch {
        return { kind: 'failed', reason: 'the answer is not JSON' };
    }
    if (answer === null || typeof answer !== 'object' || typeof answer.stop !== 'string') {
        return { kind: 'failed', reason: 'the answer has no stop text' };
    }
    return { kind: 'answer', stop: answer.stop };
}

// ---------------------------------------------------------------------------------------------------------------
// The log: one line per event, '<YYYY-MM-DD HH:mm:ss> | <session id> | <text>'
// ---------------------------------------------------------------------------------------------------------------

/** The texts of the log lines that mark a server's life; the reader below matches exactly these. */
export const LOG = {
    listening: 'listening on ',
    stopped: 'stopped by the main session; exiting',
    processGone: (pid) => `the session's Claude Code process ${pid} is gone; exiting`,
    pipeFailed: 'the pipe failed: ',
    errorFor: 'error for ',
    toldMain: 'told the main session that the server failed',
};

/** A normal end of a server: the main session stopped it, or the session's Claude Code process is gone. */
const NORMAL_END = /^(stopped by the main session; exiting|the session's Claude Code process \d+ is gone; exiting)$/;

/**
 * The fallback every LIMIT STOP SERVER FAILED line ends with: what the main session does once it knows. The session
 * watch carries the same sentence (a test pins the two together).
 */
export const SERVER_FALLBACK = 'Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended with LEAD STOPPED, and wait for each one\'s LEAD STOPPED, with no deadline. Tell the user in your final message that the limit-stop server failed, and what failed.';

/**
 * Reads where the log is (limitStop.logFile, a path under the team's state folder teamState.folder) and how much of
 * its end is read (limitStop.logTailKB).
 * @param {object} config settings from loadConfig
 * @returns {{logFile: string, tailBytes: number}} the log's absolute path and the window read from its end
 * @throws {Error} naming a missing or wrong setting
 */
export function logSettings(config) {
    return {
        logFile: requireStatePath(config, 'limitStop.logFile'),
        tailBytes: Math.round(requireNumberSetting(config, 'limitStop.logTailKB') * 1024),
    };
}

/**
 * Appends one line to the log.
 * @param {string} logFile from logSettings
 * @param {string} session the session id
 * @param {string} text what happened, on one line
 * @throws {Error} when the line cannot be written
 */
export function appendLimitStopLog(logFile, session, text) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `${formatStamp(new Date())} | ${session} | ${text.replace(/\r\n|\n|\r/g, ' ')}\n`);
}

/**
 * Proves that the log can be appended to before the server listens: creates its folder and opens it for appending,
 * so a server whose log cannot be written never comes up.
 * @param {string} logFile from logSettings, or limitStop.logFile
 * @throws {Error} when it cannot be opened for appending
 */
export function assertLogWritable(logFile) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.closeSync(fs.openSync(logFile, 'a'));
}

/**
 * Reads one session's lines from the end of the log, oldest first. No log at all is no lines.
 * @param {string} logFile from logSettings
 * @param {string} session the session id
 * @param {number} tailBytes how much of the end of the log to read
 * @returns {{stamp: string, text: string}[]} the session's lines
 * @throws {Error} when the log exists but cannot be read
 */
export function readSessionLog(logFile, session, tailBytes) {
    let text;
    try {
        text = readFileTail(logFile, tailBytes);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
    const lines = [];
    for (const line of text.split('\n')) {
        const parts = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) \| ([^|]+) \| (.*)$/.exec(line.replace(/\r$/, ''));
        if (parts && parts[2] === session) {
            lines.push({ stamp: parts[1], text: parts[3] });
        }
    }
    return lines;
}

/**
 * Decides whether the main session must now be told that the server failed. Only the session's lines since the last
 * server started listening count (all of them when none did), and only up to a normal end; nothing once the main
 * session was told in that span. A failure is, in this order: a hook's or check's "error for" line, a "pipe failed"
 * line, a query that failed just now, or a server that listened, logged no end and whose pipe is gone now.
 * @param {{stamp: string, text: string}[]} lines from readSessionLog
 * @param {{kind: string, reason?: string}} asked what asking the pipe just now gave (askLimitStop's result)
 * @param {string} asker who asked just now, as an "error for" line names it ('the main session',
 *   'the Usage and context watch')
 * @param {Date} now the moment of asking
 * @returns {{at: string, what: string}|null} the failure, with the stamp of when it happened or was found, or null
 */
export function findServerFailure(lines, asked, asker, now) {
    const start = lines.findLastIndex((line) => line.text.startsWith(LOG.listening));
    const span = lines.slice(start + 1);
    if (span.some((line) => line.text.startsWith(LOG.toldMain))) {
        return null;
    }
    const end = span.findIndex((line) => NORMAL_END.test(line.text));
    const live = end < 0 ? span : span.slice(0, end);
    for (const line of live) {
        if (line.text.startsWith(LOG.errorFor)) {
            const [who, ...reason] = line.text.slice(LOG.errorFor.length).split(': ');
            return { at: line.stamp, what: `${who} got an error from it: ${reason.join(': ')}` };
        }
        if (line.text.startsWith(LOG.pipeFailed)) {
            return { at: line.stamp, what: `its pipe failed (${line.text.slice(LOG.pipeFailed.length)}) and it exited` };
        }
    }
    if (asked.kind === 'failed' && end < 0) {
        return { at: formatStamp(now), what: `${asker} got an error from it: ${asked.reason}` };
    }
    if (start >= 0 && end < 0 && asked.kind === 'no-server') {
        const listened = lines[start];
        const pid = /\(pid (\d+)\)/.exec(listened.text)?.[1] ?? 'unknown';
        return { at: formatStamp(now), what: `it is gone: it listened from ${clockOf(listened.stamp, now)} as process ${pid} and logged no end` };
    }
    return null;
}

/**
 * Says how the server stands when nothing is to be told, for the check's FINE line.
 * @param {{stamp: string, text: string}[]} lines from readSessionLog
 * @param {{kind: string}} asked what asking the pipe just now gave
 * @returns {string} the state in a few words
 */
export function describeServer(lines, asked) {
    const start = lines.findLastIndex((line) => line.text.startsWith(LOG.listening));
    const span = lines.slice(start + 1);
    if (span.some((line) => line.text.startsWith(LOG.toldMain))) {
        return 'the main session was told of its failure already';
    }
    const ended = span.find((line) => NORMAL_END.test(line.text));
    if (ended) {
        return `it ended: ${ended.text}`;
    }
    if (asked.kind === 'answer') {
        return 'it answers';
    }
    return 'no server has listened for this session';
}

/**
 * The line that tells the main session what failed, when, and only then the fallback.
 * @param {{at: string, what: string}} failure from findServerFailure
 * @param {Date} now the moment, to leave out the date of a stamp from today
 * @returns {string} the LIMIT STOP SERVER FAILED line
 */
export function serverFailedLine(failure, now) {
    return `LIMIT STOP SERVER FAILED | ${clockOf(failure.at, now)} | ${failure.what}. ${SERVER_FALLBACK}`;
}

/**
 * The one line an agent gets when its own hook's query failed: the error, whether the main session hears of it, and
 * to carry on with the stop text it got, if any.
 * @param {string} reason why the query failed
 * @param {boolean} logged whether the error reached the log, through which the main session hears of it
 * @param {Date} now the moment
 * @returns {string} the line
 */
export function agentFailedLine(reason, logged, now) {
    const told = logged
        ? 'the main session hears of it'
        : 'the error could not be written to its log, so the main session may not hear of it: say so in your final message';
    return `LIMIT STOP SERVER FAILED | ${clockOf(formatStamp(now), now)} | this hook got an error from it: ${reason}; ${told}. Carry on with what the last STOP FOR LIMIT text said, if you got one.`;
}

/**
 * A moment as the log writes it: local YYYY-MM-DD HH:mm:ss. The failure that serverFailedLine takes carries one.
 * @param {Date} moment the moment
 * @returns {string} the stamp
 */
export function formatStamp(moment) {
    return `${formatLocalMinute(moment)}:${String(moment.getSeconds()).padStart(2, '0')}`;
}

/**
 * A stamp as the texts show it: HH:mm:ss on the same local day as now, else the whole stamp.
 * @param {string} stamp from formatStamp
 * @param {Date} now the moment
 * @returns {string} the clock text
 */
function clockOf(stamp, now) {
    return stamp.slice(0, 10) === formatLocalMinute(now).slice(0, 10) ? stamp.slice(11) : stamp;
}
