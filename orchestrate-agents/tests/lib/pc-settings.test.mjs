// In-process tests of lib/pc-settings.mjs: register.commitInRepos from this PC's own settings file, else the default
// worked out from where the skill folder really lies (links resolved). Each test builds its own scratch layout:
// <base>\Apps\sda\orchestrate-agents stands for the skill folder of a repo cloned at <base>\Apps\sda, so the default is
// <base>\Apps\*, and <base>\state stands for teamState.folder. The command line is tested in tests/scripts/register.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { commitInRepos, defaultCommitInRepos } from '../../lib/pc-settings.mjs';
import { SKILL_DIR, makeScratchDir, removeScratchDir } from '../helpers/scratch.mjs';

/**
 * Builds a scratch layout: a skill folder inside a repo folder, and the settings that point at a scratch state folder.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {string|null} [fileText] text of the PC settings file, or null for no file (the state folder is then not made)
 * @returns {{base: string, skillDir: string, state: string, file: string, config: object, warnings: string[],
 *   read: () => string[]}} the paths, the settings, the warnings written so far and a reader that collects them
 */
function layout(t, fileText = null) {
    const base = makeScratchDir('pcset');
    t.after(() => removeScratchDir(base));
    const skillDir = path.join(base, 'Apps', 'sda', 'orchestrate-agents');
    fs.mkdirSync(skillDir, { recursive: true });
    const state = path.join(base, 'state');
    const file = path.join(state, 'pc-settings.json');
    if (fileText !== null) {
        fs.mkdirSync(state);
        fs.writeFileSync(file, fileText);
    }
    const config = { teamState: { folder: state }, pcSettings: { file: 'pc-settings.json' }, register: {} };
    const warnings = [];
    return { base, skillDir, state, file, config, warnings, read: () => commitInRepos(config, { skillDir, warn: (line) => warnings.push(line) }) };
}

test('a settings file with a list gives that list, as written', (t) => {
    const it = layout(t, JSON.stringify({ register: { commitInRepos: ['D:\\Work\\*', 'C:\\Other\\one'] }, other: { kept: 1 } }));
    assert.deepEqual(it.read(), ['D:\\Work\\*', 'C:\\Other\\one']);
    assert.deepEqual(it.warnings, []);
});

test('an empty list is a value, not a missing one: no repo commits the register', (t) => {
    const it = layout(t, '{ "register": { "commitInRepos": [] } }');
    assert.deepEqual(it.read(), []);
    assert.deepEqual(it.warnings, []);
});

test('a file that starts with a byte order mark is read', (t) => {
    const it = layout(t, '\uFEFF{ "register": { "commitInRepos": ["E:\\\\Mine\\\\*"] } }');
    assert.deepEqual(it.read(), ['E:\\Mine\\*']);
});

test('no file, and no state folder at all, gives the parent folder of the repo, silently', (t) => {
    const it = layout(t);
    assert.deepEqual(it.read(), [path.join(it.base, 'Apps', '*')]);
    assert.deepEqual(it.warnings, []);
    assert.equal(fs.existsSync(it.state), false, 'reading makes nothing');
});

test('a file without the key gives the default, silently', (t) => {
    for (const text of ['{}', '{ "other": 1 }', '{ "register": {} }', '{ "register": { "folder": "x" } }']) {
        const it = layout(t, text);
        assert.deepEqual(it.read(), [path.join(it.base, 'Apps', '*')], text);
        assert.deepEqual(it.warnings, [], text);
    }
});

test('a file that is not valid JSON gives the default and says so once, naming the file and the default', (t) => {
    const it = layout(t, '{ "register": { "commitInRepos": ["C:\\\\x\\\\*"], } ');
    const def = path.join(it.base, 'Apps', '*');
    assert.deepEqual(it.read(), [def]);
    assert.equal(it.warnings.length, 1);
    assert.match(it.warnings[0], /^PC SETTINGS NOT USED \| /);
    assert.ok(it.warnings[0].includes(it.file), it.warnings[0]);
    assert.match(it.warnings[0], /is not valid JSON/);
    assert.ok(it.warnings[0].includes(def), it.warnings[0]);
});

test('a value of the wrong shape gives the default and says what is wrong', (t) => {
    const cases = [
        ['[]', /is not a JSON object/],
        ['"text"', /is not a JSON object/],
        ['{ "register": [] }', /has a 'register' that is not an object/],
        ['{ "register": "C:\\\\x" }', /has a 'register' that is not an object/],
        ['{ "register": { "commitInRepos": "C:\\\\x\\\\*" } }', /has a 'register\.commitInRepos' that is not a list of paths/],
        ['{ "register": { "commitInRepos": null } }', /has a 'register\.commitInRepos' that is not a list of paths/],
        ['{ "register": { "commitInRepos": ["C:\\\\x\\\\*", 7] } }', /has a 'register\.commitInRepos' that is not a list of paths/],
    ];
    for (const [text, why] of cases) {
        const it = layout(t, text);
        assert.deepEqual(it.read(), [path.join(it.base, 'Apps', '*')], text);
        assert.equal(it.warnings.length, 1, text);
        assert.match(it.warnings[0], why, text);
    }
});

test('a settings path that cannot be read as a file gives the default and says so', (t) => {
    const it = layout(t);
    fs.mkdirSync(it.file, { recursive: true });
    assert.deepEqual(it.read(), [path.join(it.base, 'Apps', '*')]);
    assert.equal(it.warnings.length, 1);
    assert.match(it.warnings[0], /cannot be read \(EISDIR\)/);
});

test('a register.commitInRepos left in the orchestration settings is not read', (t) => {
    const it = layout(t);
    it.config.register.commitInRepos = ['Z:\\Old\\*'];
    assert.deepEqual(it.read(), [path.join(it.base, 'Apps', '*')]);
});

test('the file name comes from the setting pcSettings.file', (t) => {
    const it = layout(t, '{ "register": { "commitInRepos": ["C:\\\\Wrong\\\\*"] } }');
    fs.writeFileSync(path.join(it.state, 'other-pc.json'), '{ "register": { "commitInRepos": ["C:\\\\Right\\\\*"] } }');
    it.config.pcSettings.file = 'other-pc.json';
    assert.deepEqual(it.read(), ['C:\\Right\\*']);
});

test('a missing setting is an error that names it, not a silent default', (t) => {
    const it = layout(t);
    delete it.config.pcSettings;
    assert.throws(() => it.read(), /'pcSettings\.file'/);
    delete it.config.teamState;
    assert.throws(() => it.read(), /'teamState\.folder'/);
});

test('a repo reached through a junction gives the real parent folder, not the junction\'s', (t) => {
    const it = layout(t);
    const link = path.join(it.base, 'Elsewhere');
    fs.symlinkSync(path.join(it.base, 'Apps', 'sda'), link, 'junction');
    try {
        const viaLink = path.join(link, 'orchestrate-agents');
        assert.deepEqual(defaultCommitInRepos(viaLink), [path.join(it.base, 'Apps', '*')]);
        assert.deepEqual(commitInRepos(it.config, { skillDir: viaLink, warn: () => {} }), [path.join(it.base, 'Apps', '*')]);
    } finally {
        // Removes the link only, never what it points at.
        fs.rmdirSync(link);
    }
});

test('without a skill folder given, the default is the parent folder of the repo this code lies in', () => {
    const repo = path.dirname(fs.realpathSync(SKILL_DIR));
    assert.deepEqual(defaultCommitInRepos(), [path.join(path.dirname(repo), '*')]);
});
