// Mutation check of run S1. Copies the staged orchestrate-agents folder to a scratch folder, then for each mutant:
// applies its replacements to the copy (each old text must occur exactly once), checks the file still parses, runs the
// test files that should catch it, records the result, and restores the file. The staged folder is never changed.
//   node mutate.mjs <staged folder> <scratch parent> [mutant id ...]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [staged, scratchParent, ...only] = process.argv.slice(2);
const copy = path.join(scratchParent, 'orchestrate-agents');
if (fs.existsSync(scratchParent)) throw new Error(`scratch parent exists already: ${scratchParent}`);
fs.cpSync(staged, copy, { recursive: true });

const FAST = ['tests/lib/state-path.test.mjs', 'tests/lib/agent-team.test.mjs'];
const GUARD = ['tests/hooks/context-guard.test.mjs'];
const SERVER = ['tests/scripts/limit-stop-server.test.mjs'];
const CONFIG = 'lib/config.mjs';

const mutants = [
    ['empty-rule', CONFIG, [["    [(value) => value === '', 'is empty'],\n", '']], FAST],
    ['colon-rule', CONFIG, [["    [(value) => value.includes(':'), \"has a drive or a ':'\"],\n", '']], FAST],
    ['edge-rule', CONFIG, [["    [(value) => /^[\\\\/]|[\\\\/]$/.test(value), \"starts or ends with '\\\\' or '/'\"],\n", '']], FAST],
    ['slash-rule', CONFIG, [["    [(value) => value.includes('/'), \"has a '/'; parts are joined by '\\\\'\"],\n", '']], FAST],
    ['char-rule', CONFIG, [["    [(value) => /[*?\"<>|]/.test(value), 'has one of * ? \" < > |'],\n", '']], FAST],
    ['empty-part-rule', CONFIG, [["    [(value) => value.split('\\\\').includes(''), 'has an empty part'],\n", '']], FAST],
    ['dot-part-rule', CONFIG, [["    [(value) => value.split('\\\\').some((part) => part === '.' || part === '..'), \"has a '.' or '..' part\"],\n", '']], FAST],
    ['root-not-absolute', CONFIG, [['    if (!ABSOLUTE_ROOT.test(root)) {', '    if (false) {']], FAST],
    ['unset-name-allowed', CONFIG, [["        if (found === undefined || found === '') {", '        if (false) {']], FAST],
    ['child-not-text-allowed', CONFIG, [["    if (typeof value !== 'string') {\n        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be text", "    if (false) {\n        throw new Error(`${CONFIG_FILE_NAME} setting '${name}' must be text"]], FAST],
    ['root-ignored', CONFIG, [['    return path.join(root, value);', '    return path.resolve(value);']], FAST],
    ['team-on-on-tmpdir', 'lib/agent-team.mjs', [
        ["import fs from 'node:fs';", "import fs from 'node:fs';\nimport os from 'node:os';"],
        ['    return path.join(folder, sessionId);', "    return path.join(os.tmpdir(), requireStatePath(config, 'agentTeam.onFolder').split('\\\\').at(-1), sessionId);"],
    ], FAST],
    ['session-id-unchecked', 'lib/agent-team.mjs', [['    if (typeof sessionId !== \'string\' || !SESSION_ID_PATTERN.test(sessionId)) {\n        throw', '    if (false) {\n        throw']], FAST],
    ['guard-on-tmpdir', 'hooks/context-guard.mjs', [
        ["import path from 'node:path';", "import os from 'node:os';\nimport path from 'node:path';"],
        ["        markerDir: requireStatePath(config, 'contextGuard.markerFolder'),", "        markerDir: path.join(os.tmpdir(), requireSetting(config, 'contextGuard.markerFolder')),"],
    ], GUARD],
    ['log-ignores-root-lib', 'lib/limit-stop.mjs', [["        logFile: requireStatePath(config, 'limitStop.logFile'),", "        logFile: requireSetting(config, 'limitStop.logFile'),"]], [...GUARD, ...SERVER]],
    ['log-ignores-root-server', 'scripts/limit-stop-server.mjs', [["        logFile: requireStatePath(config, 'limitStop.logFile'),", "        logFile: requireSetting(config, 'limitStop.logFile'),"]], SERVER],
    ['log-folder-not-made', 'lib/limit-stop.mjs', [["export function appendLimitStopLog(logFile, session, text) {\n    fs.mkdirSync(path.dirname(logFile), { recursive: true });", 'export function appendLimitStopLog(logFile, session, text) {']], GUARD],
];

/** Runs node --test on the given files in the copy and sums up the result. */
function runTests(files) {
    const run = spawnSync(process.execPath, ['--test', ...files], { cwd: copy, encoding: 'utf8', windowsHide: true, timeout: 600000 });
    const out = `${run.stdout}${run.stderr}`;
    const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, 'm').exec(out)?.[1] ?? NaN);
    const failed = out.split('\n').filter((line) => line.startsWith('✖ ') && !line.includes('.test.mjs')).map((line) => line.slice(2, 90));
    return { code: run.status, tests: count('tests'), fail: count('fail'), failed: [...new Set(failed)] };
}

const baseline = runTests([...FAST, ...GUARD, ...SERVER]);
console.log(`baseline (unmutated copy): tests ${baseline.tests}, fail ${baseline.fail}, exit ${baseline.code}`);
if (baseline.fail !== 0 || baseline.code !== 0) throw new Error('the unmutated copy does not pass; stopping');

let caught = 0;
let ran = 0;
for (const [id, file, edits, files] of mutants) {
    if (only.length && !only.includes(id)) continue;
    const target = path.join(copy, file);
    const original = fs.readFileSync(target, 'utf8');
    let text = original;
    for (const [from, to] of edits) {
        const at = text.indexOf(from);
        if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`${id}: text not found exactly once in ${file}: ${from.slice(0, 60)}`);
        text = text.replace(from, () => to);
    }
    fs.writeFileSync(target, text);
    try {
        const parse = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
        if (parse.status !== 0) { console.log(`${id}: DOES NOT PARSE (not counted): ${parse.stderr.split('\n')[0]}`); continue; }
        ran += 1;
        const result = runTests(files);
        const isCaught = result.fail > 0 && result.failed.length > 0;
        if (isCaught) caught += 1;
        console.log(`${id}: ${isCaught ? 'CAUGHT' : 'SURVIVED'} | tests ${result.tests}, fail ${result.fail} | ${result.failed.slice(0, 3).join(' ; ')}`);
    } finally {
        fs.writeFileSync(target, original);
    }
}
console.log(`mutation: ${caught} of ${ran} caught`);
