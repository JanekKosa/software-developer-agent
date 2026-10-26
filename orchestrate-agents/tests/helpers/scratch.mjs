// Test helpers shared by the orchestration Node tests: scratch folders, a scratch copy of the skill folder with
// its own settings, running a script as a real child process, and the git used to build scratch repos.
// Nothing here is imported by production code.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------------------------------------------

/** The real skill folder (orchestrate-agents), two levels above this file. */
export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The real settings file of the skill. */
export const REAL_CONFIG_PATH = path.join(SKILL_DIR, 'orchestration.config.json');

/**
 * Git executables tried in order. The first is Visual Studio 2026's bundled git, because the git on PATH of the
 * development machine is broken (see the machine-pitfalls skill); plain 'git' covers every other machine.
 */
const GIT_CANDIDATES = [
    'C:\\Program Files\\Microsoft Visual Studio\\18\\Enterprise\\Common7\\IDE\\CommonExtensions\\Microsoft\\TeamFoundation\\Team Explorer\\Git\\cmd\\git.exe',
    'git',
];

// ---------------------------------------------------------------------------------------------------------------
// Scratch folders
// ---------------------------------------------------------------------------------------------------------------

/**
 * Creates a fresh scratch folder under the OS temp folder.
 * @param {string} label short ASCII name part, so a leftover folder says which test made it
 * @returns {string} absolute path of the new, empty folder
 */
export function makeScratchDir(label) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `oa-${label}-`));
}

/**
 * Removes a scratch folder and fails loudly when anything is left (a plain rmSync can return clean and leave
 * the folder behind on Windows).
 * @param {string} dir folder made by makeScratchDir
 */
export function removeScratchDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (fs.existsSync(dir)) {
        throw new Error(`scratch folder was not removed: ${dir}`);
    }
}

/**
 * Builds a scratch copy of the skill folder (lib, hooks, scripts) with the given settings, so a test can run the
 * real scripts against settings it controls, through the same "settings beside the scripts" lookup they use.
 * @param {string} parentDir scratch folder to build the copy in
 * @param {(config: object) => void} [adjust] changes applied to a copy of the real settings
 * @returns {string} path of the copied skill folder
 */
export function makeSkillCopy(parentDir, adjust) {
    const copyDir = path.join(parentDir, 'orchestrate-agents');
    for (const sub of ['lib', 'hooks', 'scripts']) {
        const from = path.join(SKILL_DIR, sub);
        if (fs.existsSync(from)) {
            fs.cpSync(from, path.join(copyDir, sub), { recursive: true, filter: (src) => !src.endsWith('.ps1') });
        }
    }
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    if (adjust) {
        adjust(config);
    }
    fs.writeFileSync(path.join(copyDir, 'orchestration.config.json'), JSON.stringify(config, null, 2));
    return copyDir;
}

// ---------------------------------------------------------------------------------------------------------------
// Child processes
// ---------------------------------------------------------------------------------------------------------------

/**
 * Runs a Node script as a child process (no shell, arguments passed as an array).
 * @param {string} script absolute path of the .mjs file
 * @param {string[]} args arguments after the script
 * @param {{cwd?: string, input?: string, env?: object}} [options] working folder, stdin text, extra environment
 * @returns {Promise<{code: number, stdout: string, stderr: string, ms: number}>} exit code, output, wall time
 */
export function runNode(script, args, options = {}) {
    return new Promise((resolve, reject) => {
        const started = process.hrtime.bigint();
        const child = spawn(process.execPath, [script, ...args], {
            cwd: options.cwd ?? process.cwd(),
            env: { ...process.env, ...(options.env ?? {}) },
            windowsHide: true,
        });
        const out = [];
        const err = [];
        child.stdout.on('data', (chunk) => out.push(chunk));
        child.stderr.on('data', (chunk) => err.push(chunk));
        child.on('error', reject);
        child.on('close', (code) => {
            resolve({
                code,
                stdout: Buffer.concat(out).toString('utf8'),
                stderr: Buffer.concat(err).toString('utf8'),
                ms: Number(process.hrtime.bigint() - started) / 1e6,
            });
        });
        child.stdin.end(options.input ?? '');
    });
}

/**
 * Finds a working git executable.
 * @returns {string|null} the first candidate whose `--version` succeeds, or null when none does
 */
export function findGit() {
    for (const candidate of GIT_CANDIDATES) {
        const result = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true });
        if (result.status === 0) {
            return candidate;
        }
    }
    return null;
}

/**
 * Runs git and returns its trimmed stdout; throws with git's stderr when it fails.
 * @param {string} gitExe path from findGit
 * @param {string[]} args git arguments
 * @param {string} cwd working folder
 * @returns {string} trimmed stdout
 */
export function runGit(gitExe, args, cwd) {
    const result = spawnSync(gitExe, args, { cwd, encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
    }
    return result.stdout.trim();
}

/**
 * Median of a list of numbers.
 * @param {number[]} values non-empty list
 * @returns {number} the middle value (mean of the two middle ones for an even count)
 */
export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
