// Tests of requireStatePath (lib/config.mjs): every file the team writes for itself lies under one root,
// teamState.folder (the user, 2026-10-27, D-36), and each such setting is a path relative to that root that can never
// point outside it. The root of every case here is a made-up or scratch path; no case reads or writes the real one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { requireStatePath } from '../../lib/config.mjs';
import { REAL_CONFIG_PATH, makeScratchDir, removeScratchDir, stateRootUnderHome } from '../helpers/scratch.mjs';

const ROOT = 'C:\\oa-test\\state root';

/**
 * Sets environment variables for one test and puts the old values back afterwards (undefined removes one).
 * @param {import('node:test').TestContext} t test context
 * @param {Record<string, string|undefined>} changes the variables to set
 */
function withEnv(t, changes) {
    const saved = Object.fromEntries(Object.keys(changes).map((name) => [name, process.env[name]]));
    t.after(() => {
        for (const [name, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[name]; else process.env[name] = value;
        }
    });
    for (const [name, value] of Object.entries(changes)) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
}

/**
 * Settings with a root and one child setting, agentTeam.onFolder.
 * @param {*} child the child's value
 * @param {*} [root] the root's value
 * @returns {object} the settings
 */
function configWith(child, root = ROOT) {
    return { teamState: { folder: root }, agentTeam: { onFolder: child } };
}

test('a child setting is a path under the root, one part or several', () => {
    const config = {
        teamState: { folder: ROOT },
        agentTeam: { onFolder: 'team-on' },
        limitStop: { logFile: 'logs\\limit-stop.log' },
        contextGuard: { markerFolder: 'a b\\za\u017c\u00f3\u0142\u0107.x\\c' },
    };
    assert.equal(requireStatePath(config, 'agentTeam.onFolder'), 'C:\\oa-test\\state root\\team-on');
    assert.equal(requireStatePath(config, 'limitStop.logFile'), 'C:\\oa-test\\state root\\logs\\limit-stop.log');
    assert.equal(requireStatePath(config, ['limitStop', 'logFile']), 'C:\\oa-test\\state root\\logs\\limit-stop.log');
    assert.equal(requireStatePath(config, 'contextGuard.markerFolder'), 'C:\\oa-test\\state root\\a b\\za\u017c\u00f3\u0142\u0107.x\\c');
    assert.equal(requireStatePath(configWith('team-on', 'D:\\'), 'agentTeam.onFolder'), 'D:\\team-on');
    assert.equal(requireStatePath(configWith('team-on', 'D:\\x\\'), 'agentTeam.onFolder'), 'D:\\x\\team-on');
});

test('the root takes each %NAME% from the environment', (t) => {
    withEnv(t, { OA_TEST_HOME: 'E:\\Users\\demo', OA_TEST_PART: 'state' });
    const config = configWith('team-on', '%OA_TEST_HOME%\\.claude\\%OA_TEST_PART%\\software-developer-agent');
    assert.equal(requireStatePath(config, 'agentTeam.onFolder'), 'E:\\Users\\demo\\.claude\\state\\software-developer-agent\\team-on');
});

test('a root that is missing, not text, names an unset variable, or is not absolute is an error naming teamState.folder', (t) => {
    withEnv(t, { OA_TEST_UNSET_ROOT: undefined, OA_TEST_RELATIVE: 'relative' });
    assert.throws(() => requireStatePath({ agentTeam: { onFolder: 'team-on' } }, 'agentTeam.onFolder'), /has no setting 'teamState\.folder'/);
    for (const root of ['', 7]) {
        assert.throws(() => requireStatePath(configWith('team-on', root), 'agentTeam.onFolder'), /'teamState\.folder' must be a path/, String(root));
    }
    assert.throws(() => requireStatePath(configWith('team-on', '%OA_TEST_UNSET_ROOT%\\x'), 'agentTeam.onFolder'), /'teamState\.folder' names %OA_TEST_UNSET_ROOT%, which is not set/);
    for (const root of ['relative\\x', '%OA_TEST_RELATIVE%\\x', 'C:x', 'C:', '\\x', '\\\\server\\share\\x', 'C:/x', '/x', '1:\\x']) {
        assert.throws(
            () => requireStatePath(configWith('team-on', root), 'agentTeam.onFolder'),
            /'teamState\.folder' must be an absolute path \(a drive letter, ':' and '\\'\)/,
            root,
        );
    }
});

test('a child setting that is missing is an error naming it', () => {
    assert.throws(() => requireStatePath({ teamState: { folder: ROOT } }, 'agentTeam.onFolder'), /has no setting 'agentTeam\.onFolder'/);
});

test('each refused child value is an error naming the setting and what is wrong with it', () => {
    const cases = [
        [7, /must be text/],
        [['team-on'], /must be text/],
        ['', /is empty/],
        ['C:x', /has a drive or a ':'/],
        ['C:\\x', /has a drive or a ':'/],
        ['a:b', /has a drive or a ':'/],
        ['\\x', /starts or ends with '\\' or '\/'/],
        ['x\\', /starts or ends with '\\' or '\/'/],
        ['/x', /starts or ends with '\\' or '\/'/],
        ['x/', /starts or ends with '\\' or '\/'/],
        ['a/b', /has a '\/'; parts are joined by '\\'/],
        ['a\\\\b', /has an empty part/],
        ['.', /has a '\.' or '\.\.' part/],
        ['..', /has a '\.' or '\.\.' part/],
        ['a\\..\\b', /has a '\.' or '\.\.' part/],
        ['.\\a', /has a '\.' or '\.\.' part/],
        ['a\\.', /has a '\.' or '\.\.' part/],
        ...['*', '?', '"', '<', '>', '|', '%'].map((char) => [`a${char}b`, /has one of \* \? " < > \| %:/]),
    ];
    for (const [child, why] of cases) {
        assert.throws(() => requireStatePath(configWith(child), 'agentTeam.onFolder'), (error) => {
            assert.match(error.message, /^orchestration\.config\.json setting 'agentTeam\.onFolder' /, JSON.stringify(child));
            assert.match(error.message, why, JSON.stringify(child));
            assert.ok(error.message.includes(JSON.stringify(child)), `names the value: ${error.message}`);
            return true;
        }, JSON.stringify(child));
    }
});

test('a % in a child is refused, so a %NAME% there is neither filled in nor kept as a folder named %NAME%', (t) => {
    withEnv(t, { TEMP: 'C:\\oa-test\\temp' });
    for (const child of ['%TEMP%\\x', '%TEMP%', '%', 'a%b%c']) {
        assert.throws(
            () => requireStatePath(configWith(child), 'agentTeam.onFolder'),
            { message: `orchestration.config.json setting 'agentTeam.onFolder' must be a path under 'teamState.folder' but has one of * ? " < > | %: ${JSON.stringify(child)}` },
            child,
        );
    }
});

test('the % keeps its place in the order of the rules: after the drive, the edges and the /, before the empty and the dot parts', () => {
    const cases = [
        ['%:x', /has a drive or a ':'/],
        ['\\%x', /starts or ends with '\\' or '\/'/],
        ['%x\\', /starts or ends with '\\' or '\/'/],
        ['a/%', /has a '\/'; parts are joined by '\\'/],
        ['%\\\\x', /has one of \* \? " < > \| %:/],
        ['%\\..', /has one of \* \? " < > \| %:/],
    ];
    for (const [child, why] of cases) {
        assert.throws(() => requireStatePath(configWith(child), 'agentTeam.onFolder'), (error) => {
            assert.match(error.message, why, JSON.stringify(child));
            return true;
        }, JSON.stringify(child));
    }
});

test('names that only look odd stay under the root', () => {
    for (const child of ['...x', 'x..', '.hidden', 'a.b\\c.d', 'team on', '\u4e2d\u6587\\\u{1f600}']) {
        const resolved = requireStatePath(configWith(child), 'agentTeam.onFolder');
        assert.equal(resolved, `${ROOT}\\${child}`, child);
        assert.ok(resolved.startsWith(`${ROOT}\\`), child);
    }
});

test('the shipped settings: one root under the user profile, and the three children of this run under it', () => {
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    assert.equal(config.teamState.folder, '%USERPROFILE%\\.claude\\state\\software-developer-agent');
    assert.match(config.teamState._whyFolder, /all temp files related to this agent in the same place/);
    assert.match(config.teamState._whyFolder, /D-36/);
    assert.match(config.teamState._whyFolder, /one line/);
    assert.equal(config.agentTeam.onFolder, 'team-on');
    assert.equal(config.contextGuard.markerFolder, 'context-guard');
    assert.equal(config.limitStop.logFile, 'logs\\limit-stop.log');
    for (const why of [config.agentTeam._whyOnFolder, config.contextGuard._whyMarkerFolder, config.limitStop._whyLogFile]) {
        assert.match(why, /teamState\.folder/);
        assert.doesNotMatch(why, /%TEMP%|%NAME%/);
    }
});

test('the shipped root under a scratch USERPROFILE is the folder the test helper names', (t) => {
    const home = makeScratchDir('state-home');
    t.after(() => removeScratchDir(home));
    withEnv(t, { USERPROFILE: home });
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    const root = stateRootUnderHome(home);
    assert.equal(requireStatePath(config, 'agentTeam.onFolder'), path.join(root, 'team-on'));
    assert.equal(requireStatePath(config, 'contextGuard.markerFolder'), path.join(root, 'context-guard'));
    assert.equal(requireStatePath(config, 'limitStop.logFile'), path.join(root, 'logs', 'limit-stop.log'));
    assert.deepEqual(fs.readdirSync(home), [], 'resolving writes nothing');
});
