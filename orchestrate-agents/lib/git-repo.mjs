// Finds the repo root of a folder, the repo's info/exclude file, and whether a path matches a wildcard pattern.
//
// The root is the answer `git rev-parse --show-toplevel` gives, found by walking up to the nearest valid `.git`
// instead of starting git: git on PATH is broken on some machines, and a hook that runs on every prompt should not
// start a process. Differences from git, by design: GIT_DIR, GIT_WORK_TREE and GIT_CEILING_DIRECTORIES are not
// read, and the safe.directory ownership check is not made.

import fs from 'node:fs';
import path from 'node:path';
import { detectEol, readText, splitLines } from './text-file.mjs';

// ---------------------------------------------------------------------------------------------------------------
// Repo root and git folder
// ---------------------------------------------------------------------------------------------------------------

/**
 * Finds the repo root of a folder.
 * @param {string} startDir folder to start from
 * @returns {{root: string, gitDir: string|null}} the repo root and its git folder; for a folder outside any repo,
 *   the folder itself and null
 */
export function findRepoRoot(startDir) {
    const start = path.resolve(startDir);
    for (let dir = start; ; dir = path.dirname(dir)) {
        const gitDir = gitDirAt(dir);
        if (gitDir) {
            return { root: dir, gitDir };
        }
        if (path.dirname(dir) === dir) {
            return { root: start, gitDir: null };
        }
    }
}

/**
 * Says whether a folder holds a repo and where its git folder is.
 * @param {string} dir candidate work tree root
 * @returns {string|null} the git folder: `.git` itself, or the folder a `.git` file points to (worktree, submodule)
 */
function gitDirAt(dir) {
    const dotGit = path.join(dir, '.git');
    const stat = fs.statSync(dotGit, { throwIfNoEntry: false });
    if (!stat) {
        return null;
    }
    if (stat.isDirectory()) {
        return fs.existsSync(path.join(dotGit, 'HEAD')) ? dotGit : null;
    }
    const match = /^gitdir:\s*(.+?)\s*$/m.exec(readText(dotGit) ?? '');
    return match ? path.resolve(dir, match[1]) : null;
}

/**
 * Gives the info/exclude file git reads for a git folder. A worktree's git folder names the shared one in its
 * `commondir` file, and git reads info/exclude from there.
 * @param {string} gitDir git folder from findRepoRoot
 * @returns {string} path of the info/exclude file (it may not exist yet)
 */
export function excludeFilePath(gitDir) {
    const commonDir = readText(path.join(gitDir, 'commondir'));
    const base = commonDir === null ? gitDir : path.resolve(gitDir, commonDir.trim());
    return path.join(base, 'info', 'exclude');
}

// ---------------------------------------------------------------------------------------------------------------
// info/exclude
// ---------------------------------------------------------------------------------------------------------------

/**
 * Appends a line to an exclude file unless a line with the same text (ignoring outer spaces) is there already.
 * Keeps the file's line-break style (LF for a new file) and ends a last line that has no break first.
 * @param {string} excludePath the info/exclude file; it and its folder are created when missing
 * @param {string} line the pattern line, for example '/decisions/OPEN_DECISIONS_CLAUDE.md'
 * @returns {boolean} true when the line was appended
 */
export function ensureExcludeLine(excludePath, line) {
    const text = readText(excludePath) ?? '';
    if (splitLines(text).some((existing) => existing.trim() === line)) {
        return false;
    }
    const eol = detectEol(text) ?? '\n';
    const separator = text === '' || /[\r\n]$/.test(text) ? '' : eol;
    fs.mkdirSync(path.dirname(excludePath), { recursive: true });
    fs.appendFileSync(excludePath, `${separator}${line}${eol}`, 'utf8');
    return true;
}

// ---------------------------------------------------------------------------------------------------------------
// Path patterns
// ---------------------------------------------------------------------------------------------------------------

/**
 * Matches a whole path against a wildcard pattern the way PowerShell's -like does: `*` is any run of characters
 * (separators included), `?` is one character, case is ignored. Slashes and backslashes are treated as the same.
 * @param {string} filePath the path to test
 * @param {string} pattern the wildcard pattern, for example 'D:\Work\*'
 * @returns {boolean} true when the whole path matches
 */
export function matchesPathPattern(filePath, pattern) {
    const unify = (p) => p.replace(/\//g, '\\');
    const body = unify(pattern).split('').map((ch) => {
        if (ch === '*') {
            return '.*';
        }
        if (ch === '?') {
            return '.';
        }
        return ch.replace(/[.+^${}()|[\]\\-]/g, '\\$&');
    }).join('');
    return new RegExp(`^${body}$`, 'is').test(unify(filePath));
}
