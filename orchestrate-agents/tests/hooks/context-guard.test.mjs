// Tests of hooks/context-guard.mjs run as a real child process with PostToolUse input on stdin, against scratch
// transcripts and a scratch state root (the skill copy's teamState.folder; TEMP points into the test's scratch folder
// too, so nothing reaches the real state or temp folder).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { makeScratchDir, makeSkillCopy, median, removeScratchDir, runNode } from '../helpers/scratch.mjs';

const SESSION = '7b3870e5-e7c1-4f3a-9961-398d55920189';
const TEST_CAPS = { cap: 100000, warn: 50000, stop: 80000 };
// Fixed caps for the default and one known type, so tuning the real settings never breaks a test.
const TEST_DEFAULT_CAPS = { cap: 200000, warn: 120000, stop: 160000 };
const TEST_DEVELOPER_CAPS = { cap: 300000, warn: 240000, stop: 280000 };
const TEST_MAIN_CAPS = { cap: 100000, warn: 50000 };

/**
 * Builds a scratch world: a skill copy with test caps (a test agent type, the default, software-developer, and a
 * note key that holds no caps), a project folder with a main transcript, and a scratch state root (teamState.folder)
 * for the markers and the log, whose children keep their shipped names: team-on, context-guard, logs\limit-stop.log.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {(config: object) => void} [adjust] further changes to the copy's settings
 * @returns {{teamOnMarker: string, hook: string, server: string, prefix: string, project: string, mainTranscript: string, env: object, log: string, markerDir: string, root: string, temp: string}} the world
 */
function makeWorld(t, adjust = () => {}) {
    const base = makeScratchDir('guard');
    t.after(() => removeScratchDir(base));
    // A pipe prefix of this test's own, so the hook never asks the limit-stop server of a real session.
    const prefix = `oa-test-guard-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
    const root = path.join(base, 'state');
    const skill = makeSkillCopy(base, (config) => {
        Object.assign(config.contextCaps, {
            'probe-type': TEST_CAPS, default: TEST_DEFAULT_CAPS, 'software-developer': TEST_DEVELOPER_CAPS, _why: 'a note, not caps', main: TEST_MAIN_CAPS,
        });
        config.teamState = { ...config.teamState, folder: root };
        // processCheckSeconds 1: a server a test leaves behind ends within a second of the test run (CLAUDE_PID below).
        config.limitStop = { ...config.limitStop, pipePrefix: prefix, connectTimeoutMs: 300, logTailKB: 64, processCheckSeconds: 1, startCheckSeconds: 10 };
        adjust(config);
    });
    const project = path.join(base, 'projects', 'c--Repos-Demo');
    fs.mkdirSync(path.join(project, SESSION, 'subagents'), { recursive: true });
    const mainTranscript = path.join(project, `${SESSION}.jsonl`);
    fs.writeFileSync(mainTranscript, '');
    const temp = path.join(base, 'temp');
    fs.mkdirSync(temp);
    // The session is switched on, as /software-developer-agent does; a test of an ordinary chat deletes the marker.
    const teamOnMarker = path.join(root, 'team-on', SESSION);
    fs.mkdirSync(path.dirname(teamOnMarker), { recursive: true });
    fs.writeFileSync(teamOnMarker, '2026-10-26T22:00:00.000Z');
    return {
        teamOnMarker,
        hook: path.join(skill, 'hooks', 'context-guard.mjs'),
        server: path.join(skill, 'scripts', 'limit-stop-server.mjs'),
        prefix,
        project,
        mainTranscript,
        // CLAUDE_PID is this test process: the test's own shell carries the real session's Claude Code id, which no
        // test may pass on, and a server the hook starts then ends with the test run.
        env: { TEMP: temp, TMP: temp, CLAUDE_PID: String(process.pid) },
        log: path.join(root, 'logs', 'limit-stop.log'),
        markerDir: path.join(root, 'context-guard'),
        root,
        temp,
    };
}

/**
 * Appends an assistant record of the given context size to an agent transcript, creating it if needed.
 * @param {string} file transcript path
 * @param {number} size total context size in tokens
 */
function appendUsage(file, size) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const usage = { input_tokens: 3, cache_creation_input_tokens: 1000, cache_read_input_tokens: size - 1003, output_tokens: 50 };
    fs.appendFileSync(file, `${JSON.stringify({ type: 'user', message: { content: 'x' } })}\n${JSON.stringify({ type: 'assistant', message: { usage } })}\n`);
}

/**
 * PostToolUse hook input as Claude Code sends it inside a subagent.
 * @param {object} world from makeWorld
 * @param {object} fields agent_id, agent_type and any field to replace or remove (undefined removes)
 * @returns {string} JSON text for stdin
 */
function toolInput(world, fields) {
    return JSON.stringify({
        session_id: SESSION,
        transcript_path: world.mainTranscript,
        cwd: 'C:\\Repos\\Demo',
        permission_mode: 'default',
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        tool_input: { file_path: 'C:\\Repos\\Demo\\a.md' },
        tool_response: { type: 'text' },
        tool_use_id: 'toolu_01',
        ...fields,
    });
}

/**
 * Runs the hook once and returns the additional context it sent, or '' when it printed nothing.
 * @param {object} world from makeWorld
 * @param {object} fields input fields, see toolInput
 * @returns {Promise<{context: string, run: object}>} the context text and the raw run
 */
async function fire(world, fields) {
    const run = await runNode(world.hook, [], { input: toolInput(world, fields), env: world.env });
    assert.equal(run.code, 0, run.stderr);
    if (run.stdout === '') {
        return { context: '', run };
    }
    const out = JSON.parse(run.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    return { context: out.hookSpecificOutput.additionalContext, run };
}

const WARN_60 = 'CONTEXT GUARD | you are at 60k of your 100k cap. Stop building and start closing: finish the edit you are in; write your progress file; run the type-check and the suite; write your report; report as your task says. Start no new point.';
const STOP_85 = 'CONTEXT GUARD | STOP NOW | 85k of 100k. One progress-file edit, one report write, then your final report line. Nothing else.';

// ---------------------------------------------------------------------------------------------------------------
// Who is guarded
// ---------------------------------------------------------------------------------------------------------------

test('the main session (no agent_id) below its warn size: nothing, silently, and no marker', async (t) => {
    const world = makeWorld(t);
    appendUsage(world.mainTranscript, 49999);
    const { context, run } = await fire(world, {});
    assert.equal(context, '');
    assert.equal(run.stderr, '');
    assert.equal(fs.existsSync(world.markerDir), false);
});

test('below warn nothing is sent', async (t) => {
    const world = makeWorld(t);
    const agent = 'a1111111111111111';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 49999);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, '');
});

test('a session the team is not switched on for: nothing for its agents or its main session past every size, and nothing written (D-32)', async (t) => {
    const world = makeWorld(t);
    fs.rmSync(world.teamOnMarker);
    const agent = 'a1212121212121212';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 99000);
    appendUsage(world.mainTranscript, 99000);
    for (const fields of [{ agent_id: agent, agent_type: 'probe-type' }, {}]) {
        const { context, run } = await fire(world, fields);
        assert.deepEqual([context, run.stderr], ['', ''], JSON.stringify(fields));
    }
    // No size marker, and no limit-stop server started for the main session past its warn size (it would log).
    assert.equal(fs.existsSync(world.markerDir), false);
    assert.equal(fs.existsSync(world.log), false);
});

test('a session switched on later is guarded from then on', async (t) => {
    const world = makeWorld(t);
    const marker = fs.readFileSync(world.teamOnMarker, 'utf8');
    fs.rmSync(world.teamOnMarker);
    const agent = 'a1313131313131313';
    const fields = { agent_id: agent, agent_type: 'probe-type' };
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    assert.equal((await fire(world, fields)).context, '');
    fs.writeFileSync(world.teamOnMarker, marker);
    assert.equal((await fire(world, fields)).context, WARN_60);
});

// ---------------------------------------------------------------------------------------------------------------
// Thresholds, each sent once
// ---------------------------------------------------------------------------------------------------------------

test('warn is sent once, then stop once, then nothing', async (t) => {
    const world = makeWorld(t);
    const agent = 'a2222222222222222';
    const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
    const fields = { agent_id: agent, agent_type: 'probe-type' };
    appendUsage(file, 60000);
    assert.equal((await fire(world, fields)).context, WARN_60);
    appendUsage(file, 70000);
    assert.equal((await fire(world, fields)).context, '');
    appendUsage(file, 85000);
    assert.equal((await fire(world, fields)).context, STOP_85);
    appendUsage(file, 99000);
    assert.equal((await fire(world, fields)).context, '');
    const marker = JSON.parse(fs.readFileSync(path.join(world.markerDir, `${agent}.json`), 'utf8'));
    assert.equal(marker.level, 'stop');
});

test('jumping straight past stop sends only stop, and warn never follows', async (t) => {
    const world = makeWorld(t);
    const agent = 'a3333333333333333';
    const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
    appendUsage(file, 85000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, STOP_85);
    appendUsage(file, 60000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, '');
});

test('the newest non-zero record counts: a usage-limit turn with zeros does not reset the size', async (t) => {
    const world = makeWorld(t);
    const agent = 'a4444444444444444';
    const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
    appendUsage(file, 60000);
    fs.appendFileSync(file, `${JSON.stringify({ type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', message: { usage: { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })}\n`);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
});

test('six hooks firing at once for one agent send the warning once', async (t) => {
    const world = makeWorld(t);
    const agent = 'a5555555555555555';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    const results = await Promise.all(Array.from({ length: 6 }, () => fire(world, { agent_id: agent, agent_type: 'probe-type' })));
    assert.deepEqual(results.map((r) => r.context).filter(Boolean), [WARN_60]);
});

// ---------------------------------------------------------------------------------------------------------------
// Agent types and transcript locations
// ---------------------------------------------------------------------------------------------------------------

test('an unknown, missing or odd agent type gets the default caps', async (t) => {
    const world = makeWorld(t);
    const types = [{ agent_type: 'some-new-type' }, { agent_type: undefined }, { agent_type: '_why' }, { agent_type: 'constructor' }];
    for (const [i, fields] of types.entries()) {
        const agent = `a66666666666666${i}0`;
        appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 130000);
        const { context } = await fire(world, { agent_id: agent, ...fields });
        assert.equal(context, 'CONTEXT GUARD | you are at 130k of your 200k cap. Stop building and start closing: finish the edit you are in; write your progress file; run the type-check and the suite; write your report; report as your task says. Start no new point.', JSON.stringify(fields));
    }
});

test('a known type uses its own caps, not the default ones, sizes rounded to thousands', async (t) => {
    const world = makeWorld(t);
    const agent = 'a7777777777777777';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 241600);
    assert.match((await fire(world, { agent_id: agent, agent_type: 'software-developer' })).context, /^CONTEXT GUARD \| you are at 242k of your 300k cap\./);
});

test('while another run holds the agent marker lock, nothing is sent; after it, the warning is', async (t) => {
    const world = makeWorld(t);
    const agent = 'acccccccccccccccc';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    fs.mkdirSync(world.markerDir, { recursive: true });
    const lockPath = path.join(world.markerDir, `${agent}.lock`);
    fs.writeFileSync(lockPath, 'another hook run');
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, '');
    fs.unlinkSync(lockPath);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
});

test('a workflow agent is found under subagents\\workflows\\<run>', async (t) => {
    const world = makeWorld(t);
    const agent = 'a8888888888888888';
    appendUsage(path.join(world.project, SESSION, 'subagents', 'workflows', 'wf_96a1032b-a8c', `agent-${agent}.jsonl`), 60000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
});

// ---------------------------------------------------------------------------------------------------------------
// Never failing a tool call
// ---------------------------------------------------------------------------------------------------------------

test('a missing transcript, bad input or an unsafe id: nothing on stdout, exit 0', async (t) => {
    const world = makeWorld(t);
    const inputs = [
        toolInput(world, { agent_id: 'a9999999999999999', agent_type: 'probe-type' }),
        toolInput(world, { agent_id: '..\\..\\evil', agent_type: 'probe-type' }),
        toolInput(world, { agent_id: 'a9999999999999999', transcript_path: undefined }),
        'not json',
        '',
    ];
    for (const input of inputs) {
        const run = await runNode(world.hook, [], { input, env: world.env });
        assert.equal(run.code, 0, input);
        assert.equal(run.stdout, '', input);
    }
});

// ---------------------------------------------------------------------------------------------------------------
// Run time
// ---------------------------------------------------------------------------------------------------------------

test('run time of a typical call (a 2 MB transcript, below warn)', async (t) => {
    const world = makeWorld(t);
    const agent = 'abbbbbbbbbbbbbbbb';
    const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
    const filler = `${JSON.stringify({ type: 'user', message: { content: 'z'.repeat(2000) } })}\n`.repeat(1000);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, filler);
    appendUsage(file, 20000);
    const times = [];
    for (let i = 0; i < 10; i += 1) {
        times.push((await runNode(world.hook, [], { input: toolInput(world, { agent_id: agent, agent_type: 'probe-type' }), env: world.env })).ms);
    }
    t.diagnostic(`context-guard wall time over 10 runs: median ${median(times).toFixed(0)} ms, max ${Math.max(...times).toFixed(0)} ms`);
    // The target is about 150 ms (the diagnostic above reports it). The bound only catches a broken hook: under
    // heavy machine load the median was seen at 518 ms, so a tight bound would fail for reasons outside the code.
    assert.ok(median(times) < 1000, `median ${median(times)} ms`);
});

// ---------------------------------------------------------------------------------------------------------------
// Settings (contextGuard in orchestration.config.json)
// ---------------------------------------------------------------------------------------------------------------

test('the marker and its lock lie in <teamState.folder>\\context-guard, and nothing in the temp folder', async (t) => {
    const world = makeWorld(t);
    const agent = 'ad0d0d0d0d0d0d0d0';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
    assert.deepEqual(fs.readdirSync(path.join(world.root, 'context-guard')), [`${agent}.json`], 'the marker; the lock is gone again');
    assert.deepEqual(fs.readdirSync(world.root).sort(), ['context-guard', 'team-on']);
    assert.deepEqual(fs.readdirSync(world.temp), [], 'nothing in the temp folder');
});

test('the marker folder comes from the settings, as a path under the root', async (t) => {
    const world = makeWorld(t, (config) => { config.contextGuard.markerFolder = 'other\\guard markers'; });
    const agent = 'ad1d1d1d1d1d1d1d1';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
    assert.ok(fs.existsSync(path.join(world.root, 'other', 'guard markers', `${agent}.json`)), 'marker in the configured folder');
    assert.equal(fs.existsSync(world.markerDir), false, 'nothing in the default folder');
});

test('a refused marker folder or a root that is not absolute: nothing on stdout, exit 0, stderr names the setting, nothing written', async (t) => {
    const cases = [
        ['contextGuard.markerFolder', (config) => { config.contextGuard.markerFolder = '..\\escape'; }],
        ['contextGuard.markerFolder', (config) => { config.contextGuard.markerFolder = 'C:\\elsewhere'; }],
        ['contextGuard.markerFolder', (config) => { config.contextGuard.markerFolder = 'a/b'; }],
        ['teamState.folder', (config) => { config.teamState.folder = 'relative\\state'; }],
    ];
    for (const [name, adjust] of cases) {
        const world = makeWorld(t, adjust);
        const agent = 'ad5d5d5d5d5d5d5d5';
        appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
        const run = await runNode(world.hook, [], { input: toolInput(world, { agent_id: agent, agent_type: 'probe-type' }), env: world.env, cwd: world.temp });
        assert.deepEqual([run.code, run.stdout], [0, ''], name);
        assert.match(run.stderr, new RegExp(`'${name.replace('.', '\\.')}'`), name);
        assert.equal(fs.existsSync(world.markerDir), false, name);
        assert.deepEqual(fs.readdirSync(world.temp), [], name);
    }
});

test('only the configured tail of the transcript is read', async (t) => {
    const agent = 'ad2d2d2d2d2d2d2d2';
    const fillTranscript = (world) => {
        const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
        appendUsage(file, 60000);
        fs.appendFileSync(file, `${JSON.stringify({ type: 'user', message: { content: 'y'.repeat(3000) } })}\n`);
    };
    const narrow = makeWorld(t, (config) => { config.contextGuard.transcriptTailKB = 1; });
    fillTranscript(narrow);
    assert.equal((await fire(narrow, { agent_id: agent, agent_type: 'probe-type' })).context, '', 'the usage record lies before the last 1 KB');
    const wide = makeWorld(t, (config) => { config.contextGuard.transcriptTailKB = 8; });
    fillTranscript(wide);
    assert.equal((await fire(wide, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60, 'within the last 8 KB');
});

test('a marker lock older than the configured stale age is broken', async (t) => {
    const world = makeWorld(t, (config) => { config.contextGuard.markerLockStaleSeconds = 2; });
    const agent = 'ad3d3d3d3d3d3d3d3';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    fs.mkdirSync(world.markerDir, { recursive: true });
    const lockPath = path.join(world.markerDir, `${agent}.lock`);
    fs.writeFileSync(lockPath, 'left by a crashed run');
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    fs.utimesSync(lockPath, thirtySecondsAgo, thirtySecondsAgo);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, WARN_60);
});

test('a missing contextGuard setting: nothing on stdout, exit 0, and stderr names the setting', async (t) => {
    for (const name of ['transcriptTailKB', 'markerFolder', 'markerLockStaleSeconds']) {
        const world = makeWorld(t, (config) => { delete config.contextGuard[name]; });
        const agent = 'ad4d4d4d4d4d4d4d4';
        appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
        const run = await runNode(world.hook, [], { input: toolInput(world, { agent_id: agent, agent_type: 'probe-type' }), env: world.env });
        assert.deepEqual([run.code, run.stdout], [0, ''], name);
        assert.match(run.stderr, new RegExp(`contextGuard\\.${name}`), name);
    }
});

// ---------------------------------------------------------------------------------------------------------------
// The limit-stop pipe
// ---------------------------------------------------------------------------------------------------------------

/**
 * Listens on a session's limit-stop pipe in place of the real server, records each request, and answers with
 * whatever `respond` returns: a string is written as it is and the connection closed; null never answers.
 * @param {import('node:test').TestContext} t test context, for cleanup
 * @param {object} world from makeWorld
 * @param {string} session the session id
 * @param {(request: string) => string|null} respond the answer for a raw request line
 * @returns {Promise<{requests: string[]}>} the requests seen so far
 */
async function fakeServer(t, world, session, respond) {
    const requests = [];
    const sockets = new Set();
    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on('error', () => {});
        let text = '';
        socket.on('data', (chunk) => {
            text += chunk.toString('utf8');
            if (text.includes('\n')) {
                requests.push(text.split('\n')[0]);
                const answer = respond(text.split('\n')[0]);
                if (answer !== null) {
                    socket.end(answer);
                }
            }
        });
    });
    await new Promise((resolve) => server.listen(`\\\\.\\pipe\\${world.prefix}-${session}`, resolve));
    t.after(() => new Promise((resolve) => { for (const s of sockets) s.destroy(); server.close(resolve); }));
    return { requests };
}

const STOP_JSON = `${JSON.stringify({ stop: 'STOP FOR LIMIT | test text' })}\n`;

test('no limit-stop server: the size message alone, and nothing on stderr', async (t) => {
    const world = makeWorld(t);
    const agent = 'ae1e1e1e1e1e1e1e1';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    const { context, run } = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.equal(context, WARN_60);
    assert.equal(run.stderr, '');
    const quiet = 'ae1e1e1e1e1e1e1e2';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${quiet}.jsonl`), 20000);
    const below = await fire(world, { agent_id: quiet, agent_type: 'probe-type' });
    assert.deepEqual([below.context, below.run.stderr], ['', '']);
});

test('a server that answers: its stop text comes first, then the size message; below warn the stop text alone', async (t) => {
    const world = makeWorld(t);
    const { requests } = await fakeServer(t, world, SESSION, () => STOP_JSON);
    const agent = 'ae2e2e2e2e2e2e2e2';
    const file = path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`);
    appendUsage(file, 60000);
    const first = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.equal(first.context, `STOP FOR LIMIT | test text\n\n${WARN_60}`);
    assert.equal(first.run.stderr, '');
    const second = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.equal(second.context, 'STOP FOR LIMIT | test text', 'the warning was sent once already');
    assert.deepEqual(requests.map((r) => JSON.parse(r)), [
        { agentId: agent, agentType: 'probe-type' },
        { agentId: agent, agentType: 'probe-type' },
    ]);
});

test('an empty stop answer adds nothing; the main session asks as main; another session\'s pipe is never asked', async (t) => {
    const world = makeWorld(t);
    const empty = await fakeServer(t, world, SESSION, () => `${JSON.stringify({ stop: '' })}\n`);
    const other = await fakeServer(t, world, '7b3870e5-e7c1-4f3a-9961-000000000000', () => STOP_JSON);
    const agent = 'ae3e3e3e3e3e3e3e3';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    const run = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.deepEqual([run.context, run.run.stderr], ['', '']);
    assert.equal((await fire(world, {})).context, '', 'the main session');
    assert.deepEqual(empty.requests.map((r) => JSON.parse(r)), [{ agentId: agent, agentType: 'probe-type' }, { role: 'main' }], 'the agent, then the main session');
    assert.equal(other.requests.length, 0, 'the other session was never asked');
});

/** A clock as the FAILED lines give it: HH:mm:ss today, the whole stamp on another day (a run across midnight). */
const CLOCK = '(?:\\d{4}-\\d\\d-\\d\\d )?\\d\\d:\\d\\d:\\d\\d';

/** What every LIMIT STOP SERVER FAILED line of the main session ends with, written out here on purpose. */
const FALLBACK = 'Only now the fallback: send STOP FOR LIMIT by message (start-messages.md) to every lead that has not ended with LEAD STOPPED, and wait for each one\'s LEAD STOPPED, with no deadline. Tell the user in your final message that the limit-stop server failed, and what failed.';

/**
 * The line an agent gets when its own query failed, as a pattern.
 * @param {string} reason why the query failed
 * @param {boolean} logged whether the error reached the log
 * @returns {string} the pattern of the line
 */
function agentFailedPattern(reason, logged) {
    const told = logged
        ? 'the main session hears of it'
        : 'the error could not be written to its log, so the main session may not hear of it: say so in your final message';
    return `${escaped('LIMIT STOP SERVER FAILED | ')}\\d\\d:\\d\\d:\\d\\d${escaped(` | this hook got an error from it: ${reason}; ${told}. Carry on with what the last STOP FOR LIMIT text said, if you got one.`)}`;
}

/**
 * The line the main session gets when the server failed, as a pattern.
 * @param {string} what the pattern of what failed
 * @returns {RegExp} the pattern of the whole line
 */
function mainFailedPattern(what) {
    return new RegExp(`^${escaped('LIMIT STOP SERVER FAILED | ')}${CLOCK}${escaped(' | ')}${what}${escaped(`. ${FALLBACK}`)}$`);
}

/**
 * The session's lines of the world's log, the stamps cut off.
 * @param {object} world from makeWorld
 * @param {string} [session] the session, SESSION by default
 * @returns {string[]} the texts, oldest first; none when there is no log
 */
function logTexts(world, session = SESSION) {
    if (!fs.existsSync(world.log)) {
        return [];
    }
    const prefix = new RegExp(`^\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d \\| ${session} \\| `);
    return fs.readFileSync(world.log, 'utf8').split('\n').filter((line) => prefix.test(line)).map((line) => line.replace(prefix, ''));
}

test('a broken, oversized, cut or late answer: the agent is told in one line, then the size message; the error is logged', async (t) => {
    const answers = {
        'not JSON': ['garbage\n', 'the answer is not JSON'],
        'no stop text': [`${JSON.stringify({ stop: 5 })}\n`, 'the answer has no stop text'],
        'an array': ['[]\n', 'the answer has no stop text'],
        'closed with nothing': ['', 'the answer is not JSON'],
        'too long': [`${JSON.stringify({ stop: 'x'.repeat(70000) })}\n`, 'answer longer than 65536 bytes'],
        'never answers': [null, 'no answer within 300 ms'],
    };
    for (const [name, [answer, reason]] of Object.entries(answers)) {
        const world = makeWorld(t);
        await fakeServer(t, world, SESSION, () => answer);
        const agent = 'ae4e4e4e4e4e4e4e4';
        appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
        const { context, run } = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
        assert.match(context, new RegExp(`^${agentFailedPattern(reason, true)}\\n\\n${escaped(WARN_60)}$`), name);
        assert.equal(run.stderr, `context-guard: limit stop: ${reason}\n`, name);
        assert.deepEqual(logTexts(world), [`error for agent ${agent} (probe-type): ${reason}`], name);
        assert.ok(run.ms < 2000, `${name}: ${run.ms} ms`);
    }
});

test('an agent with no type whose query fails is logged as no type', async (t) => {
    const world = makeWorld(t);
    await fakeServer(t, world, SESSION, () => 'garbage\n');
    const agent = 'ae4e4e4e4e4e4e4e5';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    const { context } = await fire(world, { agent_id: agent, agent_type: undefined });
    assert.match(context, new RegExp(`^${agentFailedPattern('the answer is not JSON', true)}$`));
    assert.deepEqual(logTexts(world), [`error for agent ${agent} (no type): the answer is not JSON`]);
});

test('an agent id the server would refuse is never sent: no query, no FAILED line, no log line, one stderr line', async (t) => {
    const world = makeWorld(t);
    const { requests } = await fakeServer(t, world, SESSION, () => 'garbage\n');
    const { context, run } = await fire(world, { agent_id: 'a1.b2', agent_type: 'probe-type' });
    assert.deepEqual([context, requests.length, logTexts(world)], ['', 0, []]);
    assert.match(run.stderr, /^context-guard: limit stop: agent id "a1\.b2" is not a plain id\n/);
});

test('a log that cannot be written: the agent hears that the main session may not hear of it, and stderr says why', async (t) => {
    const world = makeWorld(t);
    fs.mkdirSync(world.log, { recursive: true });
    await fakeServer(t, world, SESSION, () => 'garbage\n');
    const agent = 'ae4e4e4e4e4e4e4e6';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
    const { context, run } = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.match(context, new RegExp(`^${agentFailedPattern('the answer is not JSON', false)}\\n\\n${escaped(WARN_60)}$`));
    const lines = run.stderr.split('\n').filter((line) => line !== '');
    assert.equal(lines.length, 2, run.stderr);
    assert.equal(lines[0], 'context-guard: limit stop: the answer is not JSON');
    assert.match(lines[1], new RegExp(`^context-guard: limit stop: the log ${escaped(world.log)} cannot be written: .*EISDIR`));
});

test('a stop answer split across chunks, with a character cut in two, arrives whole', async (t) => {
    const world = makeWorld(t);
    const pipePath = `\\\\.\\pipe\\${world.prefix}-${SESSION}`;
    const bytes = Buffer.from(`${JSON.stringify({ stop: 'STOP FOR LIMIT | Grüße' })}\n`, 'utf8');
    const cut = bytes.indexOf(0xc3) + 1;
    const server = net.createServer((socket) => {
        socket.on('error', () => {});
        socket.once('data', () => {
            socket.write(bytes.subarray(0, cut));
            setTimeout(() => socket.end(bytes.subarray(cut)), 50);
        });
    });
    await new Promise((resolve) => server.listen(pipePath, resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const agent = 'ae5e5e5e5e5e5e5e5';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    assert.equal((await fire(world, { agent_id: agent, agent_type: 'probe-type' })).context, 'STOP FOR LIMIT | Grüße');
});

test('the stop text still reaches an agent whose transcript is missing', async (t) => {
    const world = makeWorld(t);
    await fakeServer(t, world, SESSION, () => STOP_JSON);
    const { context, run } = await fire(world, { agent_id: 'ae6e6e6e6e6e6e6e6', agent_type: 'probe-type' });
    assert.equal(context, 'STOP FOR LIMIT | test text');
    assert.match(run.stderr, /no transcript found/);
});

test('a missing or wrong limitStop setting: the size message still comes, and stderr names the setting', async (t) => {
    const cases = [
        [(config) => { delete config.limitStop.pipePrefix; }, /limitStop\.pipePrefix/],
        [(config) => { config.limitStop.pipePrefix = '..\\evil'; }, /limitStop\.pipePrefix/],
        [(config) => { delete config.limitStop.connectTimeoutMs; }, /limitStop\.connectTimeoutMs/],
        [(config) => { delete config.limitStop; }, /limitStop/],
    ];
    for (const [adjust, why] of cases) {
        const world = makeWorld(t, adjust);
        const agent = 'ae7e7e7e7e7e7e7e7';
        appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 60000);
        const { context, run } = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
        assert.equal(context, WARN_60, String(why));
        assert.match(run.stderr, why);
    }
});

test('an unsafe session id counts as not switched on: no query, no marker path built from it, nothing said', async (t) => {
    const world = makeWorld(t);
    const run = await runNode(world.hook, [], { input: toolInput(world, { agent_id: 'ae8e8e8e8e8e8e8e8', session_id: '..\\..\\x' }), env: world.env });
    assert.deepEqual([run.code, run.stdout, run.stderr], [0, '', '']);
});

test('end to end with the real server: a worker gets its text; an agent of another session gets nothing', async (t) => {
    const world = makeWorld(t);
    const resetsAt = new Date(Date.now() + 2 * 3600 * 1000);
    const child = spawn(process.execPath, [world.server, 'serve', '--session', SESSION, '--window', 'weekly', '--percent', '98', '--resets-at', resetsAt.toISOString(), '--claude-pid', String(process.pid)], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const pipePath = `\\\\.\\pipe\\${world.prefix}-${SESSION}`;
    for (let i = 0; i < 100 && !(await new Promise((resolve) => { const s = net.connect(pipePath, () => { s.end(); resolve(true); }); s.on('error', () => resolve(false)); })); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const agent = 'ae9e9e9e9e9e9e9e9';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    const { context } = await fire(world, { agent_id: agent, agent_type: 'software-developer' });
    assert.match(context, /^STOP FOR LIMIT \| the weekly usage limit is at 98% and resets at .* Stop building: .*WORKER STOPPED \| <run> \| hand-off: <progress file>\. Your lead starts your successor from it\.$/);
    const otherSession = '0b0b0b0b-0000-0000-0000-000000000000';
    // The other session is switched on too, so it is the pipe name, not the switch, that keeps this stop from it.
    fs.writeFileSync(path.join(path.dirname(world.teamOnMarker), otherSession), '2026-10-26T22:00:00.000Z');
    const otherProject = path.join(world.project, otherSession, 'subagents');
    appendUsage(path.join(otherProject, `agent-${agent}.jsonl`), 20000);
    const other = await fire(world, { agent_id: agent, agent_type: 'software-developer', session_id: otherSession, transcript_path: path.join(world.project, `${otherSession}.jsonl`) });
    assert.equal(other.context, '');
    assert.equal(other.run.stderr, '');
});

test('an answer whose server keeps the connection open is taken at its line end, at once', async (t) => {
    const world = makeWorld(t);
    const server = net.createServer((socket) => {
        socket.on('error', () => {});
        socket.once('data', () => socket.write(STOP_JSON));
    });
    const sockets = new Set();
    server.on('connection', (socket) => sockets.add(socket));
    await new Promise((resolve) => server.listen(`\\\\.\\pipe\\${world.prefix}-${SESSION}`, resolve));
    t.after(() => new Promise((resolve) => { for (const s of sockets) s.destroy(); server.close(resolve); }));
    const agent = 'aeaeaeaeaeaeaeaea';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    const { context, run } = await fire(world, { agent_id: agent, agent_type: 'probe-type' });
    assert.deepEqual([context, run.stderr], ['STOP FOR LIMIT | test text', '']);
});

// ---------------------------------------------------------------------------------------------------------------
// The main session: its size, and the stop at its context cap
// ---------------------------------------------------------------------------------------------------------------

/**
 * Escapes text for a regular expression.
 * @param {string} text the text
 * @returns {string} the escaped text
 */
function escaped(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The relaunch command the main session's cap texts name, worked out here from the world's skill copy.
 * @param {object} world from makeWorld
 * @returns {string} the command, placeholders and all
 */
function capRelaunch(world) {
    const script = path.join(path.dirname(path.dirname(world.hook)), 'scripts', 'schedule-relaunch.ps1');
    return `& '${script}' -ProjectDir <project folder> -HandoverPath <hand-over file> -ContextCap`;
}

/**
 * The command that ends the session's server, worked out here from the world's skill copy.
 * @param {object} world from makeWorld
 * @returns {string} the command
 */
function stopCommand(world) {
    return `node '${world.server}' stop --session ${SESSION}`;
}

/**
 * The SESSION NEAR CAP text the hook gives the main session, as a pattern: the clock and the server's line vary.
 * @param {object} world from makeWorld, for the relaunch and stop commands
 * @param {number} sizeK the size in thousands
 * @param {string} serverPart the pattern of the sentence about the server
 * @returns {RegExp} the pattern of the whole text
 */
function nearCapPattern(world, sizeK, serverPart) {
    return new RegExp(`^${escaped(`SESSION NEAR CAP | the context is at ${sizeK}k tokens at `)}\\d\\d:\\d\\d${escaped(` (warning size ${TEST_MAIN_CAPS.warn / 1000}k). Finish the edit in progress, write the hand-over, schedule the next chat and end the session. `)}${serverPart}${escaped(` After the hand-over, run ${capRelaunch(world)}, which starts a new chat with Read <hand-over> and carry on, and in the same step stop the limit-stop server: ${stopCommand(world)}. The Usage and context watch ends with SESSION NEAR CAP too; both mean the same. Start it again then: it stays quiet, and wakes you if the limit-stop server fails.`)}$`);
}

const SERVER_RUNS = (state) => `${escaped('The limit-stop server tells every lead and worker of this session to stop at its next tool call (')}LIMIT STOP SERVER ${state}[^)]*${escaped('): send them no stop message, and wait for LEAD STOPPED from each running lead, with no deadline, before you write the hand-over.')}`;

/**
 * The sentence about a server that did not start, as a pattern: the FAILED line, what failed, and the fallback.
 * @param {string} why the pattern of why it did not start
 * @returns {string} the pattern
 */
function serverNotStarted(why) {
    return `${escaped('LIMIT STOP SERVER FAILED | ')}\\d\\d:\\d\\d:\\d\\d${escaped(' | it did not start: ')}${why}${escaped(`. ${FALLBACK}`)}`;
}

/**
 * Starts the real server in serve mode for the world, as start would, and waits until its pipe answers.
 * @param {import('node:test').TestContext} t test context; the server is killed after the test if it still runs
 * @param {object} world from makeWorld
 * @param {string} claudePid the process the server watches
 * @returns {Promise<import('node:child_process').ChildProcess>} the server process
 */
async function startServe(t, world, claudePid = String(process.pid)) {
    const resetsAt = new Date(Date.now() + 2 * 3600 * 1000);
    const child = spawn(process.execPath, [world.server, 'serve', '--session', SESSION, '--window', 'weekly', '--percent', '98', '--resets-at', resetsAt.toISOString(), '--claude-pid', claudePid], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const pipePath = `\\\\.\\pipe\\${world.prefix}-${SESSION}`;
    for (let i = 0; i < 100; i += 1) {
        if (await new Promise((resolve) => { const s = net.connect(pipePath, () => { s.end(); resolve(true); }); s.on('error', () => resolve(false)); })) {
            return child;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('the server did not listen within 10 s');
}

/**
 * Waits until a child process has exited.
 * @param {import('node:child_process').ChildProcess} child the process
 * @returns {Promise<void>} once it is gone
 */
function exited(child) {
    return child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('exit', () => resolve()));
}
const CAP_MAIN_START = "STOP FOR LIMIT | this session is at its context cap and hands over to a new one. This is the main session's part; SESSION NEAR CAP from the context-guard hook or the Usage and context watch means the same.";

/**
 * Kills, after the test, the server whose STARTED line a text quotes.
 * @param {import('node:test').TestContext} t test context
 * @param {string} text the hook's text
 */
function killServerAfter(t, text) {
    const pid = Number(/LIMIT STOP SERVER STARTED \| process (\d+)/.exec(text)?.[1]);
    t.after(() => { try { process.kill(pid); } catch { /* gone already */ } });
}

test('the main session past its warn size: the server is started, then its stop text and SESSION NEAR CAP, once', async (t) => {
    const world = makeWorld(t);
    appendUsage(world.mainTranscript, 60000);
    const first = await fire(world, {});
    killServerAfter(t, first.context);
    const [stopText, nearCap, ...rest] = first.context.split('\n\n');
    assert.deepEqual(rest, [], first.context);
    assert.ok(stopText.startsWith(`${CAP_MAIN_START} Every lead and worker of this session is told to stop at its next tool call`), stopText);
    assert.ok(stopText.endsWith(`Then write the hand-over, listing each lead's hand-off, run ${capRelaunch(world)}, which starts a new chat with Read <hand-over> and carry on, and in the same step stop this server: ${stopCommand(world)}. Then end the session.`), stopText);
    assert.match(nearCap, nearCapPattern(world, 60, SERVER_RUNS('STARTED')));
    assert.equal(first.run.stderr, '');
    // No deadline and no second telling in any of the texts (the user's choices, 2026-10-25).
    assert.equal(first.context.split('deadline').length, first.context.split('with no deadline').length, first.context);
    assert.doesNotMatch(first.context, /AGAIN|TaskStop|minutes/, first.context);
    appendUsage(world.mainTranscript, 70000);
    assert.equal((await fire(world, {})).context, '', 'once');
    const agent = 'af1f1f1f1f1f1f1f1';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    assert.match((await fire(world, { agent_id: agent, agent_type: 'software-developer' })).context, /^STOP FOR LIMIT \| this session is at its context cap and hands over to a new one\. Stop building: /, 'an agent of the session hears the stop at its next tool call');
    assert.equal(JSON.parse(fs.readFileSync(path.join(world.markerDir, `session-${SESSION}.json`), 'utf8')).level, 'warn');
});

test('three main-session hooks at once past warn: SESSION NEAR CAP once, one server, the main text once', async (t) => {
    const world = makeWorld(t);
    appendUsage(world.mainTranscript, 60000);
    const results = await Promise.all([1, 2, 3].map(() => fire(world, {})));
    for (const r of results) killServerAfter(t, r.context);
    const all = results.map((r) => r.context).join('\n\n');
    assert.equal(all.split('SESSION NEAR CAP | the context is at').length - 1, 1, all);
    assert.ok(all.split(CAP_MAIN_START).length - 1 <= 1, all);
    assert.equal(fs.readFileSync(world.log, 'utf8').split('listening on').length - 1, 1, 'one server');
});

test('the main session past warn when the server cannot start: SESSION NEAR CAP names the failure with the time, then the fallback', async (t) => {
    const gone = spawn(process.execPath, ['-e', ''], { windowsHide: true, stdio: 'ignore' });
    await exited(gone);
    const cases = [
        ['', escaped("CLAUDE_PID, the id of the session's Claude Code process, is not set, and the server needs it to end with the session")],
        ['junk', escaped("CLAUDE_PID, the id of the session's Claude Code process, is \"junk\", not a process id, and the server needs it to end with the session")],
        [String(gone.pid), escaped(`the session's Claude Code process ${gone.pid} is not running`)],
    ];
    for (const [pid, why] of cases) {
        const world = makeWorld(t);
        world.env.CLAUDE_PID = pid;
        appendUsage(world.mainTranscript, 60000);
        const { context, run } = await fire(world, {});
        assert.match(context, nearCapPattern(world, 60, serverNotStarted(why)), pid);
        assert.equal(run.stderr, '', pid);
        assert.equal(logTexts(world).some((text) => text.startsWith('listening on ')), false, `${pid}: no server listened`);
        appendUsage(world.mainTranscript, 70000);
        assert.equal((await fire(world, {})).context, '', `${pid}: said once`);
    }
});

test('the main session hears at its next tool call that the server is gone, with the time, once', async (t) => {
    const world = makeWorld(t);
    const server = await startServe(t, world);
    appendUsage(world.mainTranscript, 20000);
    assert.match((await fire(world, {})).context, /^STOP FOR LIMIT \| the weekly usage limit/, 'told its text while the server runs');
    server.kill();
    await exited(server);
    const { context, run } = await fire(world, {});
    assert.match(context, mainFailedPattern(`it is gone: it listened from ${CLOCK} as process ${server.pid} and logged no end`));
    assert.equal(run.stderr, '');
    assert.equal(logTexts(world).at(-1), 'told the main session that the server failed (by the context-guard hook)');
    assert.deepEqual([(await fire(world, {})).context, (await fire(world, {})).context], ['', ''], 'told once');
});

test('a failure line in <teamState.folder>\\logs\\limit-stop.log, written by hand, reaches the main session', async (t) => {
    const world = makeWorld(t);
    fs.mkdirSync(path.join(world.root, 'logs'));
    fs.writeFileSync(path.join(world.root, 'logs', 'limit-stop.log'), `2026-10-27 10:00:00 | ${SESSION} | error for agent a9 (task-lead): the answer is not JSON\n`);
    appendUsage(world.mainTranscript, 20000);
    assert.match((await fire(world, {})).context, mainFailedPattern(escaped('agent a9 (task-lead) got an error from it: the answer is not JSON')));
    assert.deepEqual(fs.readdirSync(world.temp), [], 'nothing in the temp folder');
});

test('an agent\'s logged error reaches the main session at its next tool call, once', async (t) => {
    const world = makeWorld(t);
    await fakeServer(t, world, SESSION, (request) => (JSON.parse(request).role === 'main' ? `${JSON.stringify({ stop: '' })}\n` : 'garbage\n'));
    const agent = 'af3f3f3f3f3f3f3f3';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    assert.match((await fire(world, { agent_id: agent, agent_type: 'task-lead' })).context, new RegExp(`^${agentFailedPattern('the answer is not JSON', true)}$`));
    appendUsage(world.mainTranscript, 20000);
    const { context, run } = await fire(world, {});
    assert.match(context, mainFailedPattern(escaped(`agent ${agent} (task-lead) got an error from it: the answer is not JSON`)));
    assert.equal(run.stderr, '');
    assert.equal((await fire(world, {})).context, '', 'told once');
});

test('the main session\'s own failed query: told at once with the error logged, then told no more', async (t) => {
    const world = makeWorld(t);
    await fakeServer(t, world, SESSION, () => 'garbage\n');
    appendUsage(world.mainTranscript, 20000);
    const first = await fire(world, {});
    assert.match(first.context, mainFailedPattern(escaped('the main session got an error from it: the answer is not JSON')));
    assert.equal(first.run.stderr, 'context-guard: limit stop: the answer is not JSON\n');
    assert.deepEqual(logTexts(world), ['error for the main session: the answer is not JSON', 'told the main session that the server failed (by the context-guard hook)']);
    assert.equal((await fire(world, {})).context, '', 'told once');
});

test('a log that cannot be read: the main session\'s own failure still reaches it, and stderr says why', async (t) => {
    const world = makeWorld(t);
    // A log the user may append to but not read (a directory reads as empty and a path under a file as missing on
    // Windows, measured 2026-10-25, so only a denied read gives a read error).
    fs.mkdirSync(path.dirname(world.log), { recursive: true });
    fs.writeFileSync(world.log, '');
    const user = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
    const deny = spawnSync('icacls', [world.log, '/deny', `${user}:(RD)`], { windowsHide: true, encoding: 'utf8' });
    assert.equal(deny.status, 0, deny.stdout + deny.stderr);
    try {
        await fakeServer(t, world, SESSION, () => 'garbage\n');
        appendUsage(world.mainTranscript, 20000);
        const { context, run } = await fire(world, {});
        assert.match(context, mainFailedPattern(escaped('the main session got an error from it: the answer is not JSON')));
        assert.match(run.stderr, /^context-guard: limit stop: the answer is not JSON\ncontext-guard: limit stop: the log .* cannot be read: EPERM/, run.stderr);
    } finally {
        spawnSync('icacls', [world.log, '/remove:d', user], { windowsHide: true });
    }
});

test('after stop, or once the session\'s Claude Code process is gone, the main session hears nothing', async (t) => {
    const world = makeWorld(t);
    const server = await startServe(t, world);
    const stopped = await runNode(world.server, ['stop', '--session', SESSION], { env: world.env });
    assert.match(stopped.stdout, /^LIMIT STOP SERVER STOPPED \| /, stopped.stdout);
    await exited(server);
    appendUsage(world.mainTranscript, 20000);
    assert.deepEqual([(await fire(world, {})).context, (await fire(world, {})).run.stderr], ['', '']);
    const claude = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (claude.exitCode === null) claude.kill(); });
    const second = await startServe(t, world, String(claude.pid));
    claude.kill();
    await exited(second);
    assert.equal(logTexts(world).at(-1), `the session's Claude Code process ${claude.pid} is gone; exiting`);
    assert.deepEqual([(await fire(world, {})).context, (await fire(world, {})).run.stderr], ['', '']);
});

test('another session\'s lines tell the main session nothing, even when its id holds this one', async (t) => {
    const world = makeWorld(t);
    const stamp = '2026-10-25 21:00:00';
    const others = [`${SESSION.slice(0, -1)}0`, `${SESSION}-copy`];
    fs.mkdirSync(path.dirname(world.log), { recursive: true });
    fs.writeFileSync(world.log, others.flatMap((other) => [
        `${stamp} | ${other} | listening on \\\\.\\pipe\\x-${other} (pid 4242): the weekly limit at 98% resets 22:00; watching the session's Claude Code process 1`,
        `${stamp} | ${other} | error for agent a1 (task-lead): the answer is not JSON`,
    ]).join('\n'));
    appendUsage(world.mainTranscript, 20000);
    const { context, run } = await fire(world, {});
    assert.deepEqual([context, run.stderr], ['', '']);
});

test('the main session past warn whose own query fails: the FAILED line first, then SESSION NEAR CAP', async (t) => {
    const world = makeWorld(t);
    world.env.CLAUDE_PID = '';
    await fakeServer(t, world, SESSION, () => 'garbage\n');
    appendUsage(world.mainTranscript, 60000);
    const [failed, nearCap, ...rest] = (await fire(world, {})).context.split('\n\n');
    assert.deepEqual(rest, []);
    assert.match(failed, mainFailedPattern(escaped('the main session got an error from it: the answer is not JSON')));
    assert.match(nearCap, /^SESSION NEAR CAP \| /);
});

test('a missing limitStop setting in the main session: stderr names it, and the size part still speaks', async (t) => {
    for (const name of ['logFile', 'logTailKB', 'pipePrefix']) {
        const world = makeWorld(t, (config) => { delete config.limitStop[name]; });
        world.env.CLAUDE_PID = '';
        appendUsage(world.mainTranscript, 60000);
        const run = await runNode(world.hook, [], { input: toolInput(world, {}), env: world.env });
        assert.equal(run.code, 0, name);
        assert.match(JSON.parse(run.stdout).hookSpecificOutput.additionalContext, /^SESSION NEAR CAP \| /, name);
        assert.match(run.stderr, new RegExp(`limitStop\\.${name}`), name);
    }
});

test('a running usage-limit server: the main session gets its own text once, below warn too; past warn the server runs already', async (t) => {
    const world = makeWorld(t);
    const resetsAt = new Date(Date.now() + 2 * 3600 * 1000);
    const child = spawn(process.execPath, [world.server, 'serve', '--session', SESSION, '--window', 'weekly', '--percent', '98', '--resets-at', resetsAt.toISOString(), '--claude-pid', String(process.pid)], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const pipePath = `\\\\.\\pipe\\${world.prefix}-${SESSION}`;
    for (let i = 0; i < 100 && !(await new Promise((resolve) => { const s = net.connect(pipePath, () => { s.end(); resolve(true); }); s.on('error', () => resolve(false)); })); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    appendUsage(world.mainTranscript, 20000);
    const below = await fire(world, {});
    assert.match(below.context, new RegExp(`^STOP FOR LIMIT \\| the weekly usage limit is at 98% and resets at .*This is the main session's part; the Usage and context watch's LIMIT NEAR \\| HAND OVER lines mean the same\\. .*${escaped(`schedule-relaunch.ps1, as the watch printed it, and in the same step stop this server: ${stopCommand(world)}.`)}$`));
    assert.equal((await fire(world, {})).context, '', 'told once');
    appendUsage(world.mainTranscript, 60000);
    assert.match((await fire(world, {})).context, nearCapPattern(world, 60, SERVER_RUNS('RUNNING ALREADY')));
    const agent = 'af2f2f2f2f2f2f2f2';
    appendUsage(path.join(world.project, SESSION, 'subagents', `agent-${agent}.jsonl`), 20000);
    assert.match((await fire(world, { agent_id: agent, agent_type: 'software-developer' })).context, /^STOP FOR LIMIT \| the weekly usage limit/, 'the running server keeps its own texts');
});

test('the main session\'s size passes over side-chain records, as the Usage and context watch does', async (t) => {
    const world = makeWorld(t);
    appendUsage(world.mainTranscript, 40000);
    const usage = { input_tokens: 3, cache_creation_input_tokens: 1000, cache_read_input_tokens: 89000, output_tokens: 50 };
    fs.appendFileSync(world.mainTranscript, `${JSON.stringify({ type: 'assistant', isSidechain: true, message: { usage } })}\n`);
    assert.deepEqual([(await fire(world, {})).context, fs.existsSync(world.markerDir)], ['', false]);
});

test('the hook passes CLAUDE_PID on to the server it starts, and starts none for a pid that is not a number', async (t) => {
    const claude = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { windowsHide: true, stdio: 'ignore' });
    t.after(() => { if (claude.exitCode === null) claude.kill(); });
    for (const [pid, watched] of [[String(claude.pid), true], ['junk', false], ['12x', false]]) {
        const world = makeWorld(t);
        world.env.CLAUDE_PID = pid;
        appendUsage(world.mainTranscript, 60000);
        killServerAfter(t, (await fire(world, {})).context);
        const texts = logTexts(world);
        assert.equal(texts.some((text) => text.startsWith('listening on ') && text.endsWith(`watching the session's Claude Code process ${claude.pid}`)), watched, `${pid}: ${texts.join(' / ')}`);
        assert.equal(texts.some((text) => text.startsWith('listening on ')), watched, pid);
    }
});

test('an unsafe session id from the main session counts as not switched on: nothing said, no marker, exit 0', async (t) => {
    const world = makeWorld(t);
    appendUsage(world.mainTranscript, 60000);
    const run = await runNode(world.hook, [], { input: toolInput(world, { session_id: '..\\..\\x' }), env: world.env });
    assert.deepEqual([run.code, run.stdout, run.stderr, fs.existsSync(world.markerDir)], [0, '', '', false]);
});
