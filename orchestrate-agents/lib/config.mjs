// Loads orchestration.config.json, the one settings file of the orchestration hooks and scripts. Every script reads
// it from its own skill folder (the folder above the script's folder); a missing setting is an error that names the
// setting, never a silent default.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_FILE_NAME = 'orchestration.config.json';

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
