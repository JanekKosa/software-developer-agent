// Reads Claude Code transcripts (JSONL): finds an agent's transcript file, reads the tail of a file without
// locking it, and takes the context size from the newest assistant record that has usage numbers.

import fs from 'node:fs';
import path from 'node:path';

// Agent and session ids become parts of file paths; anything but these characters is refused.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

// ---------------------------------------------------------------------------------------------------------------
// Finding an agent's transcript
// ---------------------------------------------------------------------------------------------------------------

/**
 * Finds the transcript of a subagent or a workflow agent of a session.
 * @param {string} projectDir the folder that holds the session's own transcript (`<session_id>.jsonl`)
 * @param {string} sessionId the session id
 * @param {string} agentId the agent id
 * @returns {string|null} `<projectDir>\<session>\subagents\agent-<id>.jsonl` when it exists, else the first file of
 *   that name anywhere below `subagents` (workflow agents sit in `subagents\workflows\<run>\`), else null
 * @throws {Error} when an id holds characters that could leave the folder
 */
export function findAgentTranscript(projectDir, sessionId, agentId) {
    if (!SAFE_ID.test(String(sessionId))) {
        throw new Error(`unsafe session id: ${JSON.stringify(sessionId)}`);
    }
    if (!SAFE_ID.test(String(agentId))) {
        throw new Error(`unsafe agent id: ${JSON.stringify(agentId)}`);
    }
    const fileName = `agent-${agentId}.jsonl`;
    const subagentsDir = path.join(projectDir, sessionId, 'subagents');
    const direct = path.join(subagentsDir, fileName);
    if (fs.existsSync(direct)) {
        return direct;
    }
    if (!fs.existsSync(subagentsDir)) {
        return null;
    }
    const found = fs.readdirSync(subagentsDir, { recursive: true }).find((rel) => path.basename(rel) === fileName);
    return found === undefined ? null : path.join(subagentsDir, found);
}

// ---------------------------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------------------------

/**
 * Reads the last bytes of a file and returns only its complete lines. Opens the file for reading only, so a writer
 * that has it open is not disturbed.
 * @param {string} filePath the file
 * @param {number} maxBytes size of the window at the end of the file
 * @returns {string} the text of the complete lines in the window (the whole file when it is smaller)
 */
export function readFileTail(filePath, maxBytes) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const size = fs.fstatSync(fd).size;
        // One byte more than the window, so a line that starts exactly at the window edge is seen as complete.
        const start = Math.max(0, size - maxBytes - 1);
        const buffer = Buffer.alloc(size - start);
        const read = fs.readSync(fd, buffer, 0, buffer.length, start);
        let bytes = buffer.subarray(0, read);
        if (start > 0) {
            const firstBreak = bytes.indexOf(0x0a);
            bytes = firstBreak < 0 ? Buffer.alloc(0) : bytes.subarray(firstBreak + 1);
        }
        return bytes.toString('utf8');
    } finally {
        fs.closeSync(fd);
    }
}

/**
 * Takes the context size from the newest assistant record whose usage numbers are not all zero. A turn stopped by
 * a usage limit or an API error is recorded with zeros and is skipped.
 * @param {string} text JSONL text, newest record last
 * @param {{skipSideChains?: boolean}} [options] skipSideChains: pass over records marked isSidechain, which older
 *   versions wrote into the main session's own transcript for its subagents (an agent's own transcript marks every
 *   record so, so only the main session's reading sets it; the Usage and context watch does the same)
 * @returns {number|null} input + cache creation + cache read tokens, or null when no such record is in the text
 */
export function latestContextSize(text, { skipSideChains = false } = {}) {
    const lines = text.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const size = contextSizeOfLine(lines[i], skipSideChains);
        if (size > 0) {
            return size;
        }
    }
    return null;
}

/**
 * Gives the context size of one transcript line.
 * @param {string} line one JSONL line
 * @param {boolean} skipSideChains true to count a side-chain record as nothing
 * @returns {number} the size of an assistant record with usage numbers; 0 for anything else
 */
function contextSizeOfLine(line, skipSideChains) {
    if (!line.includes('"assistant"')) {
        return 0;
    }
    let record;
    try {
        record = JSON.parse(line);
    } catch {
        return 0;
    }
    const usage = record?.type === 'assistant' && !(skipSideChains && record.isSidechain) ? record.message?.usage : undefined;
    if (!usage) {
        return 0;
    }
    return (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
}
