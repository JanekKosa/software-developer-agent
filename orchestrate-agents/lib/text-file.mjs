// Text file helpers for the register files: read without a BOM, find and keep a file's line-break style, split and
// join lines, and replace a file in one step. Hand-written because the scripts must run with no dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { sleepSync } from './sleep.mjs';

// A rename over a file that another program has open for a moment (a virus scanner, an indexer) fails on Windows
// with EPERM, EACCES or EBUSY. These two values bound the retry: about one second in all.
const REPLACE_ATTEMPTS = 20;
const REPLACE_RETRY_MS = 50;
const SHARING_ERRORS = new Set(['EPERM', 'EACCES', 'EBUSY']);

// ---------------------------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------------------------

/**
 * Reads a UTF-8 text file and drops a leading BOM.
 * @param {string} filePath file to read
 * @returns {string|null} the text, or null when the file does not exist
 */
export function readText(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------------------------------------------

/**
 * Finds a text's line-break style from its first line break.
 * @param {string} text file content
 * @returns {'\r\n'|'\n'|null} LF when the first break is a bare LF, CRLF for CRLF or a lone CR, null with no break
 */
export function detectEol(text) {
    const match = /\r\n|\n|\r/.exec(text);
    if (!match) {
        return null;
    }
    return match[0] === '\n' ? '\n' : '\r\n';
}

/**
 * Splits text into lines at CRLF, LF or a lone CR. A break at the very end does not make an extra empty line.
 * @param {string} text file content
 * @returns {string[]} the lines without their breaks
 */
export function splitLines(text) {
    if (text === '') {
        return [];
    }
    const lines = text.split(/\r\n|\n|\r/);
    if (lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}

/**
 * Joins lines with one line-break style and ends the last line with it too.
 * @param {string[]} lines lines without breaks
 * @param {string} eol the break to use
 * @returns {string} the text
 */
export function joinLines(lines, eol) {
    return lines.length === 0 ? '' : lines.join(eol) + eol;
}

// ---------------------------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------------------------

/**
 * Writes UTF-8 text (no BOM) to a temp file beside the target, then renames it over the target, so a reader or a
 * crash never sees a half-written file.
 * @param {string} filePath file to write
 * @param {string} text the complete new content
 */
export function writeTextAtomic(filePath, text) {
    const tempPath = path.join(path.dirname(filePath), tempFileName(path.basename(filePath), process.pid));
    fs.writeFileSync(tempPath, text, 'utf8');
    for (let attempt = 1; ; attempt += 1) {
        try {
            fs.renameSync(tempPath, filePath);
            return;
        } catch (error) {
            if (!SHARING_ERRORS.has(error.code) || attempt >= REPLACE_ATTEMPTS) {
                fs.rmSync(tempPath, { force: true });
                throw error;
            }
            sleepSync(REPLACE_RETRY_MS);
        }
    }
}

/**
 * Names the temp file writeTextAtomic writes beside a file before renaming it over the file.
 * @param {string} fileName the target's file name, without its folder
 * @param {number|string} writer the writing process id, or '*' for a wildcard pattern that matches every writer
 * @returns {string} the temp file's name, for example '.OPEN_DECISIONS_CLAUDE.md.4242.tmp'
 */
export function tempFileName(fileName, writer) {
    return `.${fileName}.${writer}.tmp`;
}
