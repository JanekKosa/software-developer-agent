// Tests of the transcript reader: tail reading, the context size of the newest assistant record, and finding an
// agent's transcript file, including workflow agents.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { findAgentTranscript, latestContextSize, readFileTail } from '../../lib/transcript.mjs';
import { makeScratchDir, removeScratchDir } from '../helpers/scratch.mjs';

/**
 * One transcript line of an assistant record with the given usage numbers.
 * @param {number} input input_tokens
 * @param {number} created cache_creation_input_tokens
 * @param {number} read cache_read_input_tokens
 * @returns {string} JSON line without a line break
 */
function assistantLine(input, created, read) {
    return JSON.stringify({
        type: 'assistant',
        message: { usage: { input_tokens: input, cache_creation_input_tokens: created, cache_read_input_tokens: read, output_tokens: 7 } },
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Tail reading
// ---------------------------------------------------------------------------------------------------------------

test('readFileTail returns the whole small file and only complete lines of a big one', (t) => {
    const dir = makeScratchDir('tail');
    t.after(() => removeScratchDir(dir));
    const file = path.join(dir, 'a.jsonl');
    fs.writeFileSync(file, 'first\nsecond\n');
    assert.equal(readFileTail(file, 1024), 'first\nsecond\n');
    fs.writeFileSync(file, `${'x'.repeat(5000)}\nkeep-1\nkeep-2\n`);
    assert.equal(readFileTail(file, 20), 'keep-1\nkeep-2\n');
    assert.equal(readFileTail(file, 14), 'keep-1\nkeep-2\n', 'a window that starts exactly at a line start keeps that line');
    assert.equal(readFileTail(file, 13), 'keep-2\n');
});

test('readFileTail drops a multibyte character cut at the start of the window', (t) => {
    const dir = makeScratchDir('mb');
    t.after(() => removeScratchDir(dir));
    const file = path.join(dir, 'a.jsonl');
    const tailLine = `{"t":"ż\u{1f600}"}\n`;
    fs.writeFileSync(file, `\u{1f600}\u{1f600}\u{1f600}\n${tailLine}`);
    const size = fs.statSync(file).size;
    for (let cut = Buffer.byteLength(tailLine) + 1; cut < Buffer.byteLength(tailLine) + 12; cut += 1) {
        assert.equal(readFileTail(file, cut), cut >= size ? fs.readFileSync(file, 'utf8') : tailLine, `window ${cut}`);
    }
});

// ---------------------------------------------------------------------------------------------------------------
// Context size
// ---------------------------------------------------------------------------------------------------------------

test('latestContextSize adds the three input numbers of the newest assistant record', () => {
    const text = [assistantLine(1, 2, 3), '{"type":"user"}', assistantLine(2, 1000, 300000), '{"type":"attachment"}', ''].join('\n');
    assert.equal(latestContextSize(text), 301002);
});

test('latestContextSize skips zero records (usage-limit and API error turns) and broken lines', () => {
    const zero = JSON.stringify({ type: 'assistant', isApiErrorMessage: true, message: { usage: { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } });
    const text = [assistantLine(5, 5, 5), '{"type":"assist', zero, 'not json at all', ''].join('\r\n');
    assert.equal(latestContextSize(text), 15);
});

test('latestContextSize takes missing numbers as zero and ignores usage on other record types', () => {
    const partial = JSON.stringify({ type: 'assistant', message: { usage: { cache_read_input_tokens: 40 } } });
    const user = JSON.stringify({ type: 'user', quoted: 'assistant', message: { usage: { input_tokens: 999999 } } });
    assert.equal(latestContextSize([partial, user].join('\n')), 40);
    assert.equal(latestContextSize('{"type":"user"}\n'), null);
    assert.equal(latestContextSize(''), null);
});

// ---------------------------------------------------------------------------------------------------------------
// Finding an agent's transcript
// ---------------------------------------------------------------------------------------------------------------

test('findAgentTranscript finds a subagent, a workflow agent, and nothing for an unknown or unsafe id', (t) => {
    const project = makeScratchDir('proj');
    t.after(() => removeScratchDir(project));
    const session = '7b3870e5-e7c1-4f3a-9961-398d55920189';
    const sub = path.join(project, session, 'subagents');
    const wf = path.join(sub, 'workflows', 'wf_96a1032b-a8c');
    fs.mkdirSync(wf, { recursive: true });
    fs.writeFileSync(path.join(sub, 'agent-a208a7e24c007b6b6.jsonl'), '');
    fs.writeFileSync(path.join(wf, 'agent-a03173d4fcb3c2735.jsonl'), '');
    fs.writeFileSync(path.join(wf, 'agent-a03173d4fcb3c27350.jsonl'), '');

    assert.equal(findAgentTranscript(project, session, 'a208a7e24c007b6b6'), path.join(sub, 'agent-a208a7e24c007b6b6.jsonl'));
    assert.equal(findAgentTranscript(project, session, 'a03173d4fcb3c2735'), path.join(wf, 'agent-a03173d4fcb3c2735.jsonl'));
    assert.equal(findAgentTranscript(project, session, 'a0000000000000000'), null);
    assert.equal(findAgentTranscript(project, 'other-session', 'a208a7e24c007b6b6'), null);
    assert.throws(() => findAgentTranscript(project, session, '..\\..\\x'), /agent id/);
    assert.throws(() => findAgentTranscript(project, '..', 'a208a7e24c007b6b6'), /session id/);
});
