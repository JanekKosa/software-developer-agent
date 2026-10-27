// Reads this PC's own settings: one JSON file under teamState.folder (setting pcSettings.file), outside every repo, so
// git never sees it. The init script creates it; each PC keeps its own (the user, 2026-10-27, D-47). Today it holds
// one value, register.commitInRepos. A missing file or key gives that value's default, worked out from where the skill
// folder really lies, so the repo works from any folder it is cloned to. A file that cannot be used is named on
// stderr, never on stdout (the hooks' stdout is read by Claude Code), and its value's default applies.

import fs from 'node:fs';
import path from 'node:path';
import { requireStatePath, skillDirOf } from './config.mjs';

/** The skill folder (orchestrate-agents) this file belongs to: the folder above lib. */
const OWN_SKILL_DIR = skillDirOf(import.meta.url);

/** The start of the line written when the file cannot be used, so a reader of a log can search for it. */
const NOT_USED = 'PC SETTINGS NOT USED';

/**
 * The default of register.commitInRepos: every folder beside the repo, that is the parent folder of the repo that holds
 * the skill folder, with links resolved, then '\*'. A repo cloned at D:\Work\software-developer-agent gives D:\Work\*:
 * the user keeps their own repos beside it.
 * @param {string} [skillDir] the skill folder (orchestrate-agents), as reached; by default the one this file lies in
 * @returns {string[]} the one pattern
 */
export function defaultCommitInRepos(skillDir = OWN_SKILL_DIR) {
    const repo = path.dirname(fs.realpathSync(skillDir));
    return [path.join(path.dirname(repo), '*')];
}

/**
 * Gives register.commitInRepos: the wildcard patterns of the repos that commit the decision register. The value comes
 * from this PC's settings file when it holds it, else from defaultCommitInRepos. A file that is missing, or holds no
 * register.commitInRepos, gives the default silently; a file that cannot be read, is not valid JSON or holds a value of
 * the wrong shape gives the default and one line through warn that names the file and what is wrong with it.
 * @param {object} config the whole orchestration settings (teamState.folder and pcSettings.file are read)
 * @param {{skillDir?: string, warn?: (line: string) => void}} [options] the skill folder the default comes from (by
 *   default this file's own), and where the line goes (by default stderr)
 * @returns {string[]} the patterns
 * @throws {Error} naming teamState.folder or pcSettings.file when that setting is missing or refused (requireStatePath)
 */
export function commitInRepos(config, { skillDir = OWN_SKILL_DIR, warn = writeToStderr } = {}) {
    const file = requireStatePath(config, 'pcSettings.file');
    const found = readCommitInRepos(file);
    if (Array.isArray(found)) {
        return found;
    }
    const fallback = defaultCommitInRepos(skillDir);
    if (found.problem) {
        warn(`${NOT_USED} | ${file} ${found.problem}. register.commitInRepos is the default: ${fallback.join(', ')}. Fix the file or delete it.`);
    }
    return fallback;
}

/**
 * Reads register.commitInRepos from the settings file.
 * @param {string} file the settings file's path
 * @returns {string[]|{problem: string|null}} the patterns, or why there are none: problem null when the file or the key
 *   is missing, else what is wrong with the file, worded to follow its path
 */
function readCommitInRepos(file) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (error) {
        return { problem: error.code === 'ENOENT' ? null : `cannot be read (${error.code ?? error.message})` };
    }
    let settings;
    try {
        settings = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (error) {
        return { problem: `is not valid JSON (${error.message})` };
    }
    if (!isObject(settings)) {
        return { problem: 'is not a JSON object' };
    }
    if (!Object.hasOwn(settings, 'register')) {
        return { problem: null };
    }
    if (!isObject(settings.register)) {
        return { problem: "has a 'register' that is not an object" };
    }
    if (!Object.hasOwn(settings.register, 'commitInRepos')) {
        return { problem: null };
    }
    const patterns = settings.register.commitInRepos;
    if (!Array.isArray(patterns) || !patterns.every((pattern) => typeof pattern === 'string')) {
        return { problem: "has a 'register.commitInRepos' that is not a list of paths" };
    }
    return patterns;
}

/**
 * Whether a parsed JSON value is an object with keys (not null, not a list).
 * @param {*} value the value
 * @returns {boolean} true for an object
 */
function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Writes one line to stderr.
 * @param {string} line the line, without its line break
 */
function writeToStderr(line) {
    process.stderr.write(`${line}\n`);
}
