// Loads orchestration.config.json, the one settings file of the orchestration hooks and scripts. Every script reads
// it from its own skill folder (the folder above the script's folder); a missing setting is an error that names the
// setting, never a silent default. Every file the team writes for itself lies under one root, teamState.folder, and
// each such setting is a path under it (requireStatePath).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_FILE_NAME = 'orchestration.config.json';

/** The setting that names the root of the team's own files. */
const STATE_ROOT_KEY = 'teamState.folder';

/** An absolute Windows path: a drive letter, a colon and a backslash. */
const ABSOLUTE_ROOT = /^[A-Za-z]:\\/;

/**
 * Why a path under the root is refused, checked in this order; the first that matches is named in the error.
 * Together they keep every such path inside the root.
 */
const STATE_PATH_RULES = [
    [(value) => value === '', 'is empty'],
    [(value) => value.includes(':'), "has a drive or a ':'"],
    [(value) => /^[\\/]|[\\/]$/.test(value), "starts or ends with '\\' or '/'"],
    [(value) => value.includes('/'), "has a '/'; parts are joined by '\\'"],
    [(value) => /[*?"<>|%]/.test(value), 'has one of * ? " < > | %'],
    [(value) => value.split('\\').includes(''), 'has an empty part'],
    [(value) => value.split('\\').some((part) => part === '.' || part === '..'), "has a '.' or '..' part"],
];

/**
 * Gives the skill folder of a script: the folder above the folder the script sits in.
 * @param {string} moduleUrl the script's import.meta.url
 * @returns {string} absolute path of the skill folder
 */
export function skillDirOf(moduleUrl) {
    return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..');
}

/**
 * Reads and parses the settings file of a skill folder.
 * @param {string} skillDir folder that holds orchestration.config.json
 * @returns {object} the parsed settings
 * @throws {Error} naming the file when it is missing or not valid JSON
 */
export function loadConfig(skillDir) {
    const file = path.join(skillDir, CONFIG_FILE_NAME);
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (error) {
        throw new Error(`cannot read ${file}: ${error.code ?? error.message}`);
    }
    try {
        return JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (error) {
        throw new Error(`${file} is not valid JSON: ${error.message}`);
    }
}

/**
 * Reads one setting by its path, for example 'register.folder' or ['contextCaps', agentType, 'warn'].
 * @param {object} config settings from loadConfig
 * @param {string|string[]} keyPath dotted path, or its parts when a part may hold a dot; each part is an own
 *   property name
 * @returns {*} the value
 * @throws {Error} naming the whole path when any part is missing or null
 */
export function requireSetting(config, keyPath) {
    const parts = Array.isArray(keyPath) ? keyPath : keyPath.split('.');
    let value = config;
    for (const part of parts) {
        if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part) || value[part] === null) {
            throw new Error(`${CONFIG_FILE_NAME} has no setting '${parts.join('.')}'`);
        }
        value = value[part];
    }
    return value;
}

/**
 * Reads one setting that must be a number of zero or more, such as a wait in seconds. A wait that is not a number
 * would make a waiting loop run forever, so anything else is refused.
 * @param {object} config settings from loadConfig
 * @param {string|string[]} keyPath as for requireSetting
 * @returns {number} the value
 * @throws {Error} naming the whole path when it is missing, not a finite number, or below zero
 */
export function requireNumberSetting(config, keyPath) {
    const value = requireSetting(config, keyPath);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        const name = Array.isArray(keyPath) ? keyPath.join('.') : keyPath;
        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be a number of zero or more, not ${JSON.stringify(value)}`);
    }
    return value;
}

/**
 * Reads one setting that is a path, with each %NAME% replaced by that environment variable, the way the
 * PowerShell scripts read their paths.
 * @param {object} config settings from loadConfig
 * @param {string|string[]} keyPath as for requireSetting
 * @returns {string} the expanded path
 * @throws {Error} naming the whole path when it is missing or not text, or names a variable that is not set
 */
export function requirePathSetting(config, keyPath) {
    const value = requireSetting(config, keyPath);
    const name = Array.isArray(keyPath) ? keyPath.join('.') : keyPath;
    if (typeof value !== 'string' || value === '') {
        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be a path, not ${JSON.stringify(value)}`);
    }
    return value.replace(/%([^%]+)%/g, (whole, variable) => {
        const found = process.env[variable];
        if (found === undefined || found === '') {
            throw new Error(`${CONFIG_FILE_NAME} setting '${name}' names %${variable}%, which is not set`);
        }
        return found;
    });
}

/**
 * Reads one setting that names a file or folder of the team's own (a marker folder, a log) and gives its absolute
 * path under the root teamState.folder. The root may hold %NAME% parts (as requirePathSetting reads them) and must be
 * absolute once they are filled in. The setting itself is one or more plain names joined by '\', so it can never
 * point outside the root.
 * @param {object} config settings from loadConfig
 * @param {string|string[]} keyPath as for requireSetting, for example 'limitStop.logFile'
 * @returns {string} the root joined with the setting's value
 * @throws {Error} naming teamState.folder when the root is missing, not text, names a variable that is not set, or is
 *   not absolute; naming the setting when it is missing, not text, or breaks one of the rules of STATE_PATH_RULES
 */
export function requireStatePath(config, keyPath) {
    const root = requirePathSetting(config, STATE_ROOT_KEY);
    if (!ABSOLUTE_ROOT.test(root)) {
        throw new Error(`${CONFIG_FILE_NAME} setting '${STATE_ROOT_KEY}' must be an absolute path (a drive letter, ':' and '\\'), not ${JSON.stringify(root)}`);
    }
    const value = requireSetting(config, keyPath);
    const name = Array.isArray(keyPath) ? keyPath.join('.') : keyPath;
    if (typeof value !== 'string') {
        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be text, a path under '${STATE_ROOT_KEY}', not ${JSON.stringify(value)}`);
    }
    const broken = STATE_PATH_RULES.find(([breaks]) => breaks(value));
    if (broken) {
        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be a path under '${STATE_ROOT_KEY}' but ${broken[1]}: ${JSON.stringify(value)}`);
    }
    return path.join(root, value);
}
