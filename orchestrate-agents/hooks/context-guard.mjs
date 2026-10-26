// PostToolUse hook for every tool (plan section 7). Inside a subagent or workflow agent it does two things:
// - it asks the session's limit-stop pipe (scripts/limit-stop-server.mjs, running only after LIMIT NEAR | HAND OVER
//   or once the main session passed its warning size) what to tell this agent, and passes on the STOP FOR LIMIT
//   text it answers; with no server the connect fails at once and nothing is said. When the server answers wrongly
//   or not at all, the agent gets one LIMIT STOP SERVER FAILED line, and the error goes to the server's log, through
//   which the main session hears of it (the user chose the pipe so that no signal file is left on disk, 2026-10-25);
// - it reads the agent's own transcript, takes its context size, and when the size passes the agent type's 'warn'
//   and later its 'stop' threshold it adds a CONTEXT GUARD message, once per level.
// In the main session (no agent_id; the user's choice, 2026-10-25) it reads the session's own transcript: when the
// size passes contextCaps.main.warn it starts the session's limit-stop server for the context cap, so every lead and
// worker hears STOP FOR LIMIT at its next tool call, and adds a SESSION NEAR CAP message once (the Usage and context
// watch's words; the watch says the same). Then it asks the pipe as the main session and passes on its stop text, and
// reads the session's lines of the server's log: when the server failed (it is gone without an end, its pipe failed, or
// a hook got an error from it, the main session's own included), it adds one LIMIT STOP SERVER FAILED line per server
// that names what failed and when, and only then gives the fallback (the user's choice, 2026-10-25: the main session
// is told before any fallback runs). lib/limit-stop.mjs decides it, as it does for the Usage and context watch's check.
// The texts come in this order: the stop text, the FAILED line, the size message. It never blocks or fails a tool
// call: each part that breaks writes one stderr line and the other parts still speak; no server at all writes nothing.

import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { loadConfig, requireNumberSetting, requireSetting, skillDirOf } from '../lib/config.mjs';
import { acquireLock } from '../lib/file-lock.mjs';
import { hookContextOutput, parseHookInput, readStdinText, reportHookError } from '../lib/hook-io.mjs';
import {
    AGENT_ID_PATTERN, agentFailedLine, appendLimitStopLog, askLimitStop, capRelaunchCommand, findServerFailure, formatStamp,
    limitStopPipePath, LOG, logSettings, pipeSettings, PROCESS_ID_PATTERN, readSessionLog, serverFailedLine, serverStopCommand,
    SESSION_ID_PATTERN,
} from '../lib/limit-stop.mjs';
import { formatLocalMinute } from '../lib/local-time.mjs';
import { readText, writeTextAtomic } from '../lib/text-file.mjs';
import { findAgentTranscript, latestContextSize, readFileTail } from '../lib/transcript.mjs';

const HOOK_NAME = 'context-guard';

/**
 * How much longer than limitStop.startCheckSeconds the server's start may take before the hook gives up on it: the
 * start of Node and the reading of the settings. Structural, not a setting.
 */
const START_SLACK_MS = 5000;

/** The server's own first line, as start prints it. */
const SERVER_LINE = /^LIMIT STOP SERVER (STARTED|RUNNING ALREADY|NOT STARTED) \|/;

/** Who asks in the main session, as its "error for" log line and its FAILED line name it. */
const MAIN_ASKER = 'the main session';

/** Who told the main session of a failure, as the log line that keeps it from being said twice names it. */
const TOLD_BY = 'the context-guard hook';

// A marker folder name must stay one folder under %TEMP%: no separators, no drive, no '.' or '..'.
const SINGLE_FOLDER_NAME = /^(?!\.{1,2}$)[^\\/:*?"<>|]+$/;

const LEVEL_RANK = { none: 0, warn: 1, stop: 2 };

// ---------------------------------------------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------------------------------------------

try {
    const message = await guardOutput(parseHookInput(await readStdinText()));
    if (message !== '') {
        process.stdout.write(hookContextOutput('PostToolUse', message));
    }
} catch (error) {
    reportHookError(HOOK_NAME, error);
}

/**
 * Decides what, if anything, to tell the agent after this tool call. The pipe is asked first and answered while the
 * transcript is read, so the query adds no wait of its own.
 * @param {object} input the PostToolUse hook input
 * @returns {Promise<string>} the stop text or the FAILED line, and the CONTEXT GUARD message, or '' for nothing
 */
async function guardOutput(input) {
    const config = loadConfig(skillDirOf(import.meta.url));
    if (!input.agent_id) {
        return mainSessionOutput(config, input);
    }
    const request = { agentId: String(input.agent_id), agentType: typeof input.agent_type === 'string' ? input.agent_type : undefined };
    const asking = askServer(config, input.session_id, request);
    let sizeText = '';
    try {
        sizeText = guardMessage(config, input);
    } catch (error) {
        reportHookError(HOOK_NAME, error);
    }
    const asked = await asking;
    return joinTexts([stopTextOf(asked), agentFailureText(config, input.session_id, request, asked), sizeText]);
}

/**
 * Decides what to tell the main session. The size part comes first, since at the warn size it starts the server
 * whose answer the pipe query then brings on the same tool call.
 * @param {object} config settings from loadConfig
 * @param {object} input the PostToolUse hook input
 * @returns {Promise<string>} the stop text, the FAILED line and the SESSION NEAR CAP message, any of them, or ''
 */
async function mainSessionOutput(config, input) {
    let sizeText = '';
    try {
        sizeText = mainSessionWarning(config, input);
    } catch (error) {
        reportHookError(HOOK_NAME, error);
    }
    const asked = await askServer(config, input.session_id, { role: 'main' });
    const failureText = asked === null ? '' : mainFailureText(config, input.session_id, asked);
    return joinTexts([stopTextOf(asked), failureText, sizeText]);
}

/**
 * Joins the parts that have something to say.
 * @param {string[]} texts the parts, in order
 * @returns {string} the non-empty parts, a blank line between them
 */
function joinTexts(texts) {
    return texts.filter((text) => text !== '').join('\n\n');
}

// ---------------------------------------------------------------------------------------------------------------
// The limit-stop server: the query, and what a failure of it tells the agent and the main session
// ---------------------------------------------------------------------------------------------------------------

/**
 * Asks the session's limit-stop server what to tell this agent or the main session. A failed query writes one stderr
 * line. Settings or ids that cannot make a query write one too and ask nothing: the hook asked wrongly, which is no
 * failure of the server.
 * @param {object} config settings from loadConfig
 * @param {*} sessionId session_id from the hook input
 * @param {{agentId: string, agentType?: string}|{role: 'main'}} request who asks
 * @returns {Promise<{kind: string, stop?: string, reason?: string}|null>} askLimitStop's result, or null when no query
 *   was made
 */
async function askServer(config, sessionId, request) {
    let pipePath;
    let timeoutMs;
    try {
        if (request.agentId !== undefined && !AGENT_ID_PATTERN.test(request.agentId)) {
            throw new Error(`agent id ${JSON.stringify(request.agentId)} is not a plain id`);
        }
        const settings = pipeSettings(config);
        pipePath = limitStopPipePath(settings.pipePrefix, sessionId);
        timeoutMs = settings.connectTimeoutMs;
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`limit stop: ${error.message}`));
        return null;
    }
    const asked = await askLimitStop(pipePath, request, timeoutMs);
    if (asked.kind === 'failed') {
        reportHookError(HOOK_NAME, new Error(`limit stop: ${asked.reason}`));
    }
    return asked;
}

/**
 * Gives the stop text a query brought.
 * @param {{kind: string, stop?: string}|null} asked from askServer
 * @returns {string} the stop text, or '' for none
 */
function stopTextOf(asked) {
    return asked?.kind === 'answer' ? asked.stop : '';
}

/**
 * The one line an agent gets when its own query failed. The error is logged first, as an "error for" line that
 * names the agent, so the main session's hook and the Usage and context watch's check find it.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id, already checked by the query
 * @param {{agentId: string, agentType?: string}} request the agent
 * @param {{kind: string, reason?: string}|null} asked from askServer
 * @returns {string} the LIMIT STOP SERVER FAILED line, or '' when the query did not fail
 */
function agentFailureText(config, sessionId, request, asked) {
    if (asked?.kind !== 'failed') {
        return '';
    }
    const logged = tryLog(config, sessionId, `${LOG.errorFor}agent ${request.agentId} (${request.agentType ?? 'no type'}): ${asked.reason}`);
    return agentFailedLine(asked.reason, logged, new Date());
}

/**
 * Decides whether the main session must now be told that its limit-stop server failed, from what asking it just now
 * gave and the session's lines of the server's log (findServerFailure, as the Usage and context watch's check uses it).
 * The main session's own failed query is logged first; a FAILED line is logged as told, so it is said once per server.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id, already checked by the query
 * @param {{kind: string, reason?: string}} asked from askServer
 * @returns {string} the LIMIT STOP SERVER FAILED line, or ''
 */
function mainFailureText(config, sessionId, asked) {
    if (asked.kind === 'failed') {
        tryLog(config, sessionId, `${LOG.errorFor}${MAIN_ASKER}: ${asked.reason}`);
    }
    const now = new Date();
    const failure = findServerFailure(readLogLines(config, sessionId), asked, MAIN_ASKER, now);
    if (failure === null) {
        return '';
    }
    tryLog(config, sessionId, `${LOG.toldMain} (by ${TOLD_BY})`);
    return serverFailedLine(failure, now);
}

/**
 * Reads the session's lines of the server's log. A log that cannot be read writes one stderr line and gives no
 * lines, so a failure of the main session's own query still reaches it.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id
 * @returns {{stamp: string, text: string}[]} the lines, oldest first
 */
function readLogLines(config, sessionId) {
    try {
        const { logFile, tailBytes } = logSettings(config);
        try {
            return readSessionLog(logFile, sessionId, tailBytes);
        } catch (error) {
            throw new Error(`the log ${logFile} cannot be read: ${error.message}`);
        }
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`limit stop: ${error.message}`));
        return [];
    }
}

/**
 * Appends one line to the server's log. A line that cannot be written writes one stderr line.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id
 * @param {string} text the line's text
 * @returns {boolean} true when the line was written
 */
function tryLog(config, sessionId, text) {
    try {
        const { logFile } = logSettings(config);
        try {
            appendLimitStopLog(logFile, sessionId, text);
        } catch (error) {
            throw new Error(`the log ${logFile} cannot be written: ${error.message}`);
        }
        return true;
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`limit stop: ${error.message}`));
        return false;
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------------------------------------------

/**
 * Decides whether the agent's size calls for a CONTEXT GUARD message after this tool call.
 * @param {object} config settings from loadConfig
 * @param {object} input the PostToolUse hook input
 * @returns {string} the CONTEXT GUARD message, or '' when there is nothing to send
 */
function guardMessage(config, input) {
    const caps = capsFor(config, input.agent_type);
    const guard = guardSettings(config);
    if (typeof input.transcript_path !== 'string') {
        throw new Error('hook input has no transcript_path');
    }
    const transcript = findAgentTranscript(path.dirname(input.transcript_path), input.session_id, input.agent_id);
    if (transcript === null) {
        throw new Error(`no transcript found for agent ${input.agent_id}`);
    }
    const size = latestContextSize(readFileTail(transcript, guard.tailBytes));
    if (size === null) {
        return '';
    }
    const level = size >= caps.stop ? 'stop' : size >= caps.warn ? 'warn' : 'none';
    if (level === 'none' || !claimLevel(guard, input.agent_id, level, size)) {
        return '';
    }
    return level === 'stop' ? stopMessage(size, caps.cap) : warnMessage(size, caps.cap);
}

/**
 * Decides whether the main session's size calls for SESSION NEAR CAP after this tool call; the first time it does,
 * it starts the session's limit-stop server for the context cap.
 * @param {object} config settings from loadConfig
 * @param {object} input the PostToolUse hook input
 * @returns {string} the SESSION NEAR CAP message, or '' when there is nothing to send
 */
function mainSessionWarning(config, input) {
    const warn = requireNumberSetting(config, 'contextCaps.main.warn');
    const guard = guardSettings(config);
    if (typeof input.session_id !== 'string' || !SESSION_ID_PATTERN.test(input.session_id)) {
        throw new Error(`session id ${JSON.stringify(input.session_id)} is not a plain id`);
    }
    if (typeof input.transcript_path !== 'string') {
        throw new Error('hook input has no transcript_path');
    }
    const size = latestContextSize(readFileTail(input.transcript_path, guard.tailBytes), { skipSideChains: true });
    if (size === null || size < warn || !claimLevel(guard, `session-${input.session_id}`, 'warn', size)) {
        return '';
    }
    return nearCapMessage(size, warn, startCapServer(config, input.session_id), input.session_id);
}

/**
 * Starts the session's limit-stop server for the context cap (limit-stop-server.mjs start --window context-cap),
 * passing the session's Claude Code process id from CLAUDE_PID, which the server needs to end with the session. With
 * no id there it starts nothing and says why. A server already running answers RUNNING ALREADY and keeps its own
 * texts.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id, already checked to be a plain id
 * @returns {string} the server's line: STARTED, RUNNING ALREADY or NOT STARTED; anything else becomes NOT STARTED
 */
function startCapServer(config, sessionId) {
    const claudePid = process.env.CLAUDE_PID;
    if (typeof claudePid !== 'string' || !PROCESS_ID_PATTERN.test(claudePid)) {
        const held = typeof claudePid !== 'string' || claudePid === '' ? 'is not set' : `is ${JSON.stringify(claudePid)}, not a process id`;
        return `LIMIT STOP SERVER NOT STARTED | CLAUDE_PID, the id of the session's Claude Code process, ${held}, and the server needs it to end with the session`;
    }
    const script = path.join(skillDirOf(import.meta.url), 'scripts', 'limit-stop-server.mjs');
    const args = [script, 'start', '--session', sessionId, '--window', 'context-cap', '--claude-pid', claudePid];
    const timeout = requireNumberSetting(config, 'limitStop.startCheckSeconds') * 1000 + START_SLACK_MS;
    const run = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, timeout });
    const line = String(run.stdout ?? '').trim().split(/\r?\n/).at(-1);
    if (SERVER_LINE.test(line)) {
        return line;
    }
    const why = run.error ? (run.error.code ?? run.error.message) : `node exited with ${run.status}`;
    return `LIMIT STOP SERVER NOT STARTED | ${why}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Thresholds and messages
// ---------------------------------------------------------------------------------------------------------------

/**
 * Gives the thresholds of an agent type: its own entry under contextCaps, else contextCaps.default.
 * @param {object} config settings from loadConfig
 * @param {*} agentType agent_type from the hook input (may be missing)
 * @returns {{cap: number, warn: number, stop: number}} the thresholds in tokens
 */
function capsFor(config, agentType) {
    const caps = requireSetting(config, 'contextCaps');
    const known = typeof agentType === 'string' && !agentType.startsWith('_') && Object.hasOwn(caps, agentType);
    const type = known ? agentType : 'default';
    return {
        cap: requireSetting(config, ['contextCaps', type, 'cap']),
        warn: requireSetting(config, ['contextCaps', type, 'warn']),
        stop: requireSetting(config, ['contextCaps', type, 'stop']),
    };
}

/**
 * Reads the guard's own settings (contextGuard in orchestration.config.json).
 * @param {object} config settings from loadConfig
 * @returns {{tailBytes: number, markerDir: string, markerLockStaleMs: number}} how much of a transcript to read,
 *   the folder of the markers, and the age after which a marker lock counts as left by a crashed run
 * @throws {Error} naming a missing or wrong setting
 */
function guardSettings(config) {
    const tailKB = requireNumberSetting(config, 'contextGuard.transcriptTailKB');
    const markerFolder = requireSetting(config, 'contextGuard.markerFolder');
    if (typeof markerFolder !== 'string' || !SINGLE_FOLDER_NAME.test(markerFolder)) {
        throw new Error(`orchestration.config.json setting 'contextGuard.markerFolder' must be one folder name, not ${JSON.stringify(markerFolder)}`);
    }
    return {
        tailBytes: Math.round(tailKB * 1024),
        markerDir: path.join(os.tmpdir(), markerFolder),
        markerLockStaleMs: requireNumberSetting(config, 'contextGuard.markerLockStaleSeconds') * 1000,
    };
}

/**
 * The message at the warn threshold.
 * @param {number} size context size in tokens
 * @param {number} cap the agent type's cap in tokens
 * @returns {string} the message
 */
function warnMessage(size, cap) {
    return `CONTEXT GUARD | you are at ${thousands(size)}k of your ${thousands(cap)}k cap. Stop building and start closing: finish the edit you are in; write your progress file; run the type-check and the suite; write your report; report as your task says. Start no new point.`;
}

/**
 * The message at the stop threshold.
 * @param {number} size context size in tokens
 * @param {number} cap the agent type's cap in tokens
 * @returns {string} the message
 */
function stopMessage(size, cap) {
    return `CONTEXT GUARD | STOP NOW | ${thousands(size)}k of ${thousands(cap)}k. One progress-file edit, one report write, then your final report line. Nothing else.`;
}

/**
 * The message the main session gets at its warn size, in the Usage and context watch's words: what the server's line
 * means for the leads (they are waited for with no deadline), or, when it did not start, the FAILED line with its
 * fallback; then the relaunch command and the server's stop command for after the hand-over, and that the session
 * watch, started again, stays quiet and wakes the session should the server fail.
 * @param {number} size context size in tokens
 * @param {number} warn the main session's warn size in tokens
 * @param {string} serverLine from startCapServer
 * @param {string} sessionId the session id, for the stop command
 * @returns {string} the message
 */
function nearCapMessage(size, warn, serverLine, sessionId) {
    const now = new Date();
    const notStarted = /^LIMIT STOP SERVER NOT STARTED \| (.*)$/.exec(serverLine);
    const server = notStarted === null
        ? `The limit-stop server tells every lead and worker of this session to stop at its next tool call (${serverLine}): send them no stop message, and wait for LEAD STOPPED from each running lead, with no deadline, before you write the hand-over.`
        : serverFailedLine({ at: formatStamp(now), what: `it did not start: ${notStarted[1]}` }, now);
    const skillDir = skillDirOf(import.meta.url);
    const relaunch = `After the hand-over, run ${capRelaunchCommand(skillDir)}, which starts a new chat with Read <hand-over> and carry on, and in the same step stop the limit-stop server: ${serverStopCommand(skillDir, sessionId)}.`;
    return `SESSION NEAR CAP | the context is at ${thousands(size)}k tokens at ${formatLocalMinute(now).slice(11)} (warning size ${thousands(warn)}k). Finish the edit in progress, write the hand-over, schedule the next chat and end the session. ${server} ${relaunch} The Usage and context watch ends with SESSION NEAR CAP too; both mean the same. Start it again then: it stays quiet, and wakes you if the limit-stop server fails.`;
}

/**
 * Rounds a token count to thousands.
 * @param {number} tokens the count
 * @returns {number} the count in thousands, rounded
 */
function thousands(tokens) {
    return Math.round(tokens / 1000);
}

// ---------------------------------------------------------------------------------------------------------------
// Marker: each level is sent once
// ---------------------------------------------------------------------------------------------------------------

/**
 * Records that a level is being sent to an agent, unless it or a higher level was sent before. Hooks of tool
 * calls that run at the same time take turns through a lock; one that finds the lock taken sends nothing, because
 * the holder is deciding on the same transcript.
 * @param {{markerDir: string, markerLockStaleMs: number}} guard from guardSettings
 * @param {string} agentId the agent id, or session-<session id> for the main session (already checked to be safe
 *   in a file name)
 * @param {'warn'|'stop'} level the level reached
 * @param {number} size context size in tokens, kept in the marker for whoever looks
 * @returns {boolean} true when this run should send the message
 */
function claimLevel(guard, agentId, level, size) {
    const { markerDir } = guard;
    fs.mkdirSync(markerDir, { recursive: true });
    const release = acquireLock(path.join(markerDir, `${agentId}.lock`), { waitMs: 0, staleMs: guard.markerLockStaleMs });
    if (!release) {
        return false;
    }
    try {
        const markerPath = path.join(markerDir, `${agentId}.json`);
        if (LEVEL_RANK[lastLevelSent(markerPath)] >= LEVEL_RANK[level]) {
            return false;
        }
        writeTextAtomic(markerPath, `${JSON.stringify({ level, sizeTokens: size, sentAt: new Date().toISOString() })}\n`);
        return true;
    } finally {
        release();
    }
}

/**
 * Reads the level last sent to an agent. An unreadable marker counts as nothing sent, so the warning is sent
 * again rather than never.
 * @param {string} markerPath the agent's marker file
 * @returns {'none'|'warn'|'stop'} the level
 */
function lastLevelSent(markerPath) {
    try {
        const level = JSON.parse(readText(markerPath) ?? '{}').level;
        return Object.hasOwn(LEVEL_RANK, level) ? level : 'none';
    } catch {
        return 'none';
    }
}
