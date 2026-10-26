// Tests of the small shared helpers: settings loading, text files, the file lock and local time formatting.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, requireNumberSetting, requirePathSetting, requireSetting, skillDirOf } from '../../lib/config.mjs';
import { detectEol, joinLines, readText, splitLines, writeTextAtomic } from '../../lib/text-file.mjs';
import { acquireLock } from '../../lib/file-lock.mjs';
import { formatLocalMinute } from '../../lib/local-time.mjs';
import { SKILL_DIR, makeScratchDir, removeScratchDir } from '../helpers/scratch.mjs';

// ---------------------------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------------------------

test('loadConfig reads the real settings beside the scripts', () => {
    const config = loadConfig(SKILL_DIR);
    assert.equal(requireSetting(config, 'register.folder'), 'decisions');
    for (const key of ['default.cap', 'default.warn', 'default.stop', 'software-developer.warn']) {
        assert.equal(typeof requireSetting(config, `contextCaps.${key}`), 'number', key);
    }
    for (const key of ['register.lockWaitSeconds', 'register.lockStaleSeconds', 'contextGuard.transcriptTailKB', 'contextGuard.markerLockStaleSeconds']) {
        assert.equal(typeof requireSetting(config, key), 'number', key);
    }
    assert.equal(typeof requireSetting(config, 'contextGuard.markerFolder'), 'string');
});

test('requireSetting names the whole missing key path', () => {
    const config = { register: { folder: 'decisions' } };
    assert.throws(() => requireSetting(config, 'register.openFile'), /'register\.openFile'/);
    assert.throws(() => requireSetting(config, 'contextCaps.default.cap'), /'contextCaps\.default\.cap'/);
});

test('requireNumberSetting takes a number of zero or more and names anything else', () => {
    const config = { register: { zero: 0, half: 0.5, text: '10', minus: -1, nan: Number.NaN, list: [3] } };
    assert.equal(requireNumberSetting(config, 'register.zero'), 0);
    assert.equal(requireNumberSetting(config, 'register.half'), 0.5);
    for (const name of ['text', 'minus', 'nan', 'list']) {
        assert.throws(() => requireNumberSetting(config, `register.${name}`), new RegExp(`'register\\.${name}' must be a number`), name);
    }
    assert.throws(() => requireNumberSetting(config, 'register.missing'), /'register\.missing'/);
});

test('requirePathSetting replaces each %NAME% by its variable and names a variable that is not set', (t) => {
    const saved = { OA_TEST_ONE: process.env.OA_TEST_ONE, OA_TEST_TWO: process.env.OA_TEST_TWO, OA_TEST_UNSET: process.env.OA_TEST_UNSET };
    t.after(() => { for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
    process.env.OA_TEST_ONE = 'C:\\Users\\demo';
    process.env.OA_TEST_TWO = 'state';
    delete process.env.OA_TEST_UNSET;
    const config = { limitStop: { log: '%OA_TEST_ONE%\\.claude\\%OA_TEST_TWO%\\x.log', plain: 'D:\\logs\\x.log', unset: '%OA_TEST_UNSET%\\x', empty: '', number: 5 } };
    assert.equal(requirePathSetting(config, 'limitStop.log'), 'C:\\Users\\demo\\.claude\\state\\x.log');
    assert.equal(requirePathSetting(config, 'limitStop.plain'), 'D:\\logs\\x.log');
    assert.throws(() => requirePathSetting(config, 'limitStop.unset'), /'limitStop\.unset' names %OA_TEST_UNSET%, which is not set/);
    for (const name of ['empty', 'number']) {
        assert.throws(() => requirePathSetting(config, `limitStop.${name}`), new RegExp(`'limitStop\\.${name}' must be a path`), name);
    }
    assert.throws(() => requirePathSetting(config, 'limitStop.missing'), /'limitStop\.missing'/);
});

test('requireSetting does not take inherited properties as settings', () => {
    assert.throws(() => requireSetting({}, 'constructor'), /'constructor'/);
});

test('loadConfig names the file when it is missing or not JSON', (t) => {
    const dir = makeScratchDir('cfg');
    t.after(() => removeScratchDir(dir));
    assert.throws(() => loadConfig(dir), /orchestration\.config\.json/);
    fs.writeFileSync(path.join(dir, 'orchestration.config.json'), '{ not json');
    assert.throws(() => loadConfig(dir), /orchestration\.config\.json.*not valid JSON/);
});

test('skillDirOf gives the folder above the module folder', () => {
    const url = new URL('file:///C:/x/orchestrate-agents/hooks/context-guard.mjs');
    assert.equal(skillDirOf(url.href), path.resolve('C:\\x\\orchestrate-agents'));
});

// ---------------------------------------------------------------------------------------------------------------
// Text files
// ---------------------------------------------------------------------------------------------------------------

test('detectEol takes the first line break and says null when there is none', () => {
    assert.equal(detectEol('a\r\nb\nc'), '\r\n');
    assert.equal(detectEol('a\nb\r\nc'), '\n');
    assert.equal(detectEol('a\rb'), '\r\n');
    assert.equal(detectEol('abc'), null);
});

test('splitLines treats CRLF, LF and a lone CR as breaks and drops the final empty piece', () => {
    assert.deepEqual(splitLines('a\r\nb\nc\rd\r\n'), ['a', 'b', 'c', 'd']);
    assert.deepEqual(splitLines('a\n\nb'), ['a', '', 'b']);
    assert.deepEqual(splitLines(''), []);
});

test('joinLines ends every line with the given break', () => {
    assert.equal(joinLines(['a', 'b'], '\r\n'), 'a\r\nb\r\n');
});

test('readText strips a BOM, keeps the rest byte for byte, and gives null for a missing file', (t) => {
    const dir = makeScratchDir('txt');
    t.after(() => removeScratchDir(dir));
    const file = path.join(dir, 'a.md');
    assert.equal(readText(file), null);
    fs.writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('za\u017c\u00f3\u0142\u0107\r\n', 'utf8')]));
    assert.equal(readText(file), 'za\u017c\u00f3\u0142\u0107\r\n');
});

test('writeTextAtomic writes UTF-8 without BOM, replaces the file, and leaves no temp file', (t) => {
    const dir = makeScratchDir('atomic');
    t.after(() => removeScratchDir(dir));
    const file = path.join(dir, 'a.md');
    writeTextAtomic(file, 'one\r\n');
    writeTextAtomic(file, '\u2018two\u2019\r\n');
    const bytes = fs.readFileSync(file);
    assert.notEqual(bytes[0], 0xef);
    assert.equal(bytes.toString('utf8'), '\u2018two\u2019\r\n');
    assert.deepEqual(fs.readdirSync(dir), ['a.md']);
});

// ---------------------------------------------------------------------------------------------------------------
// File lock
// ---------------------------------------------------------------------------------------------------------------

test('acquireLock is exclusive and gives up after the wait', (t) => {
    const dir = makeScratchDir('lock');
    t.after(() => removeScratchDir(dir));
    const lockPath = path.join(dir, '.lock');
    const release = acquireLock(lockPath, { waitMs: 0, staleMs: 60000 });
    assert.equal(typeof release, 'function');
    const started = Date.now();
    assert.equal(acquireLock(lockPath, { waitMs: 300, staleMs: 60000 }), null);
    assert.ok(Date.now() - started >= 250, 'waited for the lock before giving up');
    release();
    assert.equal(fs.existsSync(lockPath), false);
    const again = acquireLock(lockPath, { waitMs: 0, staleMs: 60000 });
    assert.equal(typeof again, 'function');
    again();
});

test('acquireLock breaks a stale lock', (t) => {
    const dir = makeScratchDir('stale');
    t.after(() => removeScratchDir(dir));
    const lockPath = path.join(dir, '.lock');
    fs.writeFileSync(lockPath, 'crashed holder');
    const old = new Date(Date.now() - 120000);
    fs.utimesSync(lockPath, old, old);
    const release = acquireLock(lockPath, { waitMs: 0, staleMs: 60000 });
    assert.equal(typeof release, 'function');
    release();
});

test('acquireLock does not break a lock younger than the stale age', (t) => {
    const dir = makeScratchDir('fresh');
    t.after(() => removeScratchDir(dir));
    const lockPath = path.join(dir, '.lock');
    fs.writeFileSync(lockPath, 'live holder');
    const recent = new Date(Date.now() - 30000);
    fs.utimesSync(lockPath, recent, recent);
    assert.equal(acquireLock(lockPath, { waitMs: 0, staleMs: 60000 }), null);
    assert.equal(fs.readFileSync(lockPath, 'utf8'), 'live holder');
});

// ---------------------------------------------------------------------------------------------------------------
// Local time
// ---------------------------------------------------------------------------------------------------------------

test('formatLocalMinute pads every part', () => {
    assert.equal(formatLocalMinute(new Date(2026, 0, 5, 7, 3, 59)), '2026-01-05 07:03');
    assert.equal(formatLocalMinute(new Date(2026, 9, 25, 23, 59)), '2026-10-25 23:59');
});
