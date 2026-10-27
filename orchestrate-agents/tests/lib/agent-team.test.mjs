// Tests of lib/agent-team.mjs and scripts/team-on.mjs: where a session's marker lives (<teamState.folder>\team-on),
// that only a plain session id with a marker counts as switched on, that switching on is safe to repeat, and what the
// script prints. In-process cases pass settings whose root is a scratch folder; the script runs from the real skill
// folder with USERPROFILE (which the shipped root names) and TEMP set to scratch folders, or from a scratch skill copy,
// so neither the real state folder nor the real temp folder is read or written.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isTeamOn, switchTeamOn, teamOnMarkerPath } from '../../lib/agent-team.mjs';
import { loadConfig } from '../../lib/config.mjs';
import {
    REAL_CONFIG_PATH, SKILL_DIR, makeScratchDir, makeSkillCopy, removeScratchDir, runNode, stateRootUnderHome,
} from '../helpers/scratch.mjs';

const SESSION = '7b3870e5-e7c1-4f3a-9961-398d55920189';
const SCRIPT = path.join(SKILL_DIR, 'scripts', 'team-on.mjs');

/**
 * Makes a scratch state root for one test and settings that point at it. It also points os.tmpdir() at a scratch
 * folder of its own until the test ends, so code that wrongly still used the temp folder would write into scratch
 * (and fail the test's path checks), never into the real temp folder.
 * @param {import('node:test').TestContext} t test context
 * @returns {{root: string, config: object, temp: string}} the root, the settings and the scratch temp folder
 */
function scratchRoot(t) {
    const root = makeScratchDir('team-on');
    const temp = makeScratchDir('team-on-temp');
    const saved = { TEMP: process.env.TEMP, TMP: process.env.TMP };
    process.env.TEMP = temp;
    process.env.TMP = temp;
    t.after(() => {
        Object.assign(process.env, saved);
        removeScratchDir(root);
        removeScratchDir(temp);
    });
    return { root, config: { teamState: { folder: root }, agentTeam: { onFolder: 'team-on' } }, temp };
}

test('the marker is one file per session in the configured folder under the state root', (t) => {
    const { root, config } = scratchRoot(t);
    assert.equal(teamOnMarkerPath(config, SESSION), path.join(root, 'team-on', SESSION));
    config.agentTeam.onFolder = 'switch\\on';
    assert.equal(teamOnMarkerPath(config, SESSION), path.join(root, 'switch', 'on', SESSION));
});

test('a session is on only once its marker exists; switching on twice is safe', (t) => {
    const { root, config } = scratchRoot(t);
    assert.equal(isTeamOn(config, SESSION), false);
    const marker = switchTeamOn(config, SESSION, new Date('2026-10-26T22:00:00Z'));
    assert.equal(marker, path.join(root, 'team-on', SESSION));
    assert.equal(fs.readFileSync(marker, 'utf8'), '2026-10-26T22:00:00.000Z');
    switchTeamOn(config, SESSION, new Date('2026-10-26T22:05:00Z'));
    assert.equal(isTeamOn(config, SESSION), true);
    assert.equal(isTeamOn(config, '0b0b0b0b-0000-0000-0000-000000000000'), false, 'another session stays off');
    assert.deepEqual(fs.readdirSync(root), ['team-on']);
});

test('a missing or unsafe session id counts as off and builds no path', (t) => {
    const { root, config } = scratchRoot(t);
    for (const id of [undefined, null, '', 42, '..\\..\\x', 'a/b', 'x'.repeat(129)]) {
        assert.equal(isTeamOn(config, id), false, String(id));
    }
    assert.throws(() => switchTeamOn(config, '..\\x', new Date()), /not a plain id/);
    assert.deepEqual(fs.readdirSync(root), []);
});

test('a missing or refused setting, or a root that is not absolute, is an error naming it', (t) => {
    const { root, temp } = scratchRoot(t);
    assert.throws(() => isTeamOn({ teamState: { folder: root } }, SESSION), /agentTeam\.onFolder/);
    for (const folder of ['..', 'a\\..\\b', 'a/b', '\\x', 'C:x', '', 7]) {
        assert.throws(() => isTeamOn({ teamState: { folder: root }, agentTeam: { onFolder: folder } }, SESSION), /'agentTeam\.onFolder'/, String(folder));
    }
    for (const folder of ['relative', 'C:x']) {
        assert.throws(() => switchTeamOn({ teamState: { folder }, agentTeam: { onFolder: 'team-on' } }, SESSION, new Date()), /'teamState\.folder'/, folder);
    }
    assert.throws(() => isTeamOn({ agentTeam: { onFolder: 'team-on' } }, SESSION), /'teamState\.folder'/);
    assert.deepEqual([fs.readdirSync(root), fs.readdirSync(temp)], [[], []], 'nothing written under the root or the temp folder');
});

test('the shipped settings name the folder under the root, with a why', () => {
    const config = JSON.parse(fs.readFileSync(REAL_CONFIG_PATH, 'utf8'));
    assert.equal(config.agentTeam.onFolder, 'team-on');
    assert.match(config.agentTeam._whyOnFolder, /switched on/);
});

test('team-on.mjs: the session from CLAUDE_CODE_SESSION_ID or --session, its marker under the root; anything else refused with exit 2', async (t) => {
    const home = makeScratchDir('team-on-home');
    const temp = makeScratchDir('team-on-temp');
    t.after(() => { removeScratchDir(home); removeScratchDir(temp); });
    const env = { USERPROFILE: home, TEMP: temp, TMP: temp, CLAUDE_CODE_SESSION_ID: SESSION };
    const marker = path.join(stateRootUnderHome(home), 'team-on', SESSION);
    let run = await runNode(SCRIPT, [], { env });
    assert.deepEqual([run.code, run.stdout], [0, `AGENT TEAM ON | session ${SESSION} | ${marker}\n`]);
    assert.equal(fs.existsSync(marker), true);
    const other = '0b0b0b0b-0000-0000-0000-000000000000';
    run = await runNode(SCRIPT, ['--session', other], { env });
    assert.equal(run.code, 0);
    assert.equal(fs.existsSync(path.join(stateRootUnderHome(home), 'team-on', other)), true);
    for (const [args, extra, why] of [
        [['--bogus'], {}, /unknown arguments/],
        [['--session'], {}, /unknown arguments/],
        [[], { CLAUDE_CODE_SESSION_ID: '' }, /no session id/],
        [['--session', '..\\x'], {}, /not a plain id/],
    ]) {
        run = await runNode(SCRIPT, args, { env: { ...env, ...extra } });
        assert.equal(run.code, 2, JSON.stringify(args));
        assert.match(run.stdout, /^AGENT TEAM NOT ON \| /);
        assert.match(run.stdout, why);
    }
    assert.deepEqual(fs.readdirSync(temp), [], 'nothing in the temp folder');
});

test('team-on.mjs writes the marker isTeamOn finds, with the same shipped settings and USERPROFILE', async (t) => {
    const home = makeScratchDir('team-on-home');
    const temp = makeScratchDir('team-on-temp');
    t.after(() => { removeScratchDir(home); removeScratchDir(temp); });
    const run = await runNode(SCRIPT, ['--session', SESSION], { env: { USERPROFILE: home, TEMP: temp, TMP: temp } });
    assert.equal(run.code, 0, run.stdout);
    const saved = process.env.USERPROFILE;
    process.env.USERPROFILE = home;
    try {
        const config = loadConfig(SKILL_DIR);
        assert.equal(isTeamOn(config, SESSION), true);
        assert.equal(isTeamOn(config, '0b0b0b0b-0000-0000-0000-000000000000'), false);
    } finally {
        process.env.USERPROFILE = saved;
    }
});

test('team-on.mjs: a refused folder or a root that is not absolute is AGENT TEAM NOT ON naming the setting', async (t) => {
    // USERPROFILE and TEMP point at scratch folders too, so even code that let a refused value through would write
    // into scratch, where the last checks see it.
    const base = makeScratchDir('team-on-copy');
    const home = makeScratchDir('team-on-home');
    const temp = makeScratchDir('team-on-temp');
    t.after(() => { removeScratchDir(base); removeScratchDir(home); removeScratchDir(temp); });
    const cases = [
        [(config) => { config.agentTeam.onFolder = '..\\escape'; }, /'agentTeam\.onFolder'/],
        [(config) => { config.agentTeam.onFolder = 'C:\\elsewhere'; }, /'agentTeam\.onFolder'/],
        [(config) => { config.teamState.folder = 'relative\\state'; }, /'teamState\.folder' must be an absolute path/],
        [(config) => { config.teamState.folder = '%OA_TEST_UNSET_TEAM_ON%\\state'; }, /'teamState\.folder' names %OA_TEST_UNSET_TEAM_ON%, which is not set/],
    ];
    for (const [index, [adjust, why]] of cases.entries()) {
        const skill = makeSkillCopy(path.join(base, String(index)), adjust);
        const env = { USERPROFILE: home, TEMP: temp, TMP: temp, OA_TEST_UNSET_TEAM_ON: '' };
        const run = await runNode(path.join(skill, 'scripts', 'team-on.mjs'), ['--session', SESSION], { cwd: base, env });
        assert.equal(run.code, 2, run.stdout);
        assert.match(run.stdout, /^AGENT TEAM NOT ON \| /);
        assert.match(run.stdout, why);
    }
    assert.deepEqual(fs.readdirSync(base).sort(), ['0', '1', '2', '3'], 'no folder written beside the copies');
    assert.deepEqual([fs.readdirSync(home), fs.readdirSync(temp)], [[], []], 'nothing written under the home or the temp folder');
});
