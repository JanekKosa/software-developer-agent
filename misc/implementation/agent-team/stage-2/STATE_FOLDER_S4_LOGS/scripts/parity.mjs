// S4 parity check: the pane's copy of the switch rule (decisions-pane\hooks\team-on.ts, imported as is; Node strips
// its types) against the staged team code (lib\agent-team.mjs teamOnMarkerPath), both read-only. Writes nothing; prints
// one line per case and the counts. The pane's glue (team-switch.ts: USERPROFILE is the only variable it can read) is
// repeated in panePath below, since team-switch.ts needs the engine.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PANE = 'C:\\Repos\\My projects\\claude-code-extensions\\decisions-pane\\hooks\\team-on.ts';
const STAGED = 'C:\\Repos\\My projects\\software-developer-agent\\misc\\implementation\\agent-team\\stage-2\\STATE_FOLDER_STAGING\\orchestrate-agents';
const LIVE = 'C:\\Repos\\My projects\\software-developer-agent\\orchestrate-agents';
const OLD_MARKS = path.join(process.env.TEMP, 'claude-agent-team-on');

const pane = await import(pathToFileURL(process.argv[2] ?? PANE).href);
const { teamOnMarkerPath } = await import(pathToFileURL(path.join(STAGED, 'lib', 'agent-team.mjs')).href);
const { loadConfig } = await import(pathToFileURL(path.join(STAGED, 'lib', 'config.mjs')).href);

/** The pane's answer: a path, or null for no marker. */
function panePath(config, id) {
    const variables = new Map([['USERPROFILE', process.env.USERPROFILE]]);
    return pane.teamOnMarkerPath(pane.stateRootOf(pane.stateFolderOf(config), variables), pane.onFolderOf(config), id);
}

/** The staged team code's answer: a path, or the error it throws. */
function nodePath(config, id) {
    try {
        return { path: teamOnMarkerPath(config, id) };
    } catch (error) {
        return { error: error.message };
    }
}

const staged = loadConfig(STAGED);
const live = loadConfig(LIVE);
const ids = fs.readdirSync(OLD_MARKS);
const withChild = (onFolder) => {
    const agentTeam = { ...staged.agentTeam };
    if (onFolder === undefined) delete agentTeam.onFolder; else agentTeam.onFolder = onFolder;
    return { ...staged, agentTeam };
};
const withRoot = (folder) => ({ ...staged, teamState: folder === undefined ? {} : { ...staged.teamState, folder } });

// 1. The staged settings, the real environment and every real session id with a mark today.
console.log(`== 1. same path: staged config, USERPROFILE=${process.env.USERPROFILE}, ${ids.length} real session ids`);
let diffs = 0;
for (const id of ids) {
    const p = panePath(staged, id);
    const n = nodePath(staged, id);
    const same = n.path !== undefined && p === n.path;
    if (!same) diffs++;
    console.log(`${same ? 'same' : 'DIFF'} | ${id} | pane ${p} | node ${n.path ?? n.error}`);
}
console.log(`RESULT 1: ${diffs} differences on ${ids.length}`);

// 2. Refused values: no marker in the pane, an error in the staged code. Accepted values: the same path.
const ID = ids[0];
const refused = [
    ...[undefined, null, 42, ['team-on'], '', 'C:', 'C:\\x', 'C:\\team-on', 'a:b', 'team:on', '\\team-on', 'team-on\\',
        '/team-on', 'team-on/', '\\\\server\\share', 'team/on', 'team*', 'team?', '"team"', '<team>', 'team|on',
        '%TEMP%\\x', '%TEMP%\\team-on', 'team%', 'team%on', 'a\\\\b', 'state\\\\team-on', '.', '..', 'a\\.\\b',
        'state\\.\\team-on', 'a\\..', 'state\\..\\team-on', '..\\..\\Windows'].map((v) => [`child ${JSON.stringify(v)}`, withChild(v), ID]),
    ...[undefined, 42, '', 'state\\team', '\\state', '\\\\server\\share\\state', 'C:state', 'C:/state', 'CC:\\x', '1:\\x',
        'C:\\state\\%S4_NEVER_SET%', '%S4_NEVER_SET%\\x'].map((v) => [`root ${JSON.stringify(v)}`, withRoot(v), ID]),
    ['no teamState section', (({ teamState, ...rest }) => rest)(staged), ID],
    ...[undefined, null, 42, '', '.', '..', 'a\\b', 'a/b', 'a b', 'C:', 'a_b', 'ab\n', 'a'.repeat(129)].map((v) => [`session id ${JSON.stringify(v)}`, staged, v]),
];
const accepted = [
    ...['team-on', 'team on.v2', 'switch\\team on', 'state\\team-on', 'a\\b\\c', '...', 'a\\...\\b', 'team.', '_x'].map((v) => [`child ${JSON.stringify(v)}`, withChild(v), ID]),
    ...['D:\\team state\\', 'C:\\', 'c:\\x', 'C:\\a\\\\b', 'C:\\a/b', 'C:\\a\\.\\b', 'C:\\a\\..\\b', 'C:\\a\\..\\..\\b', 'C:\\a\\..', 'C:\\a:b\\c',
        '%USERPROFILE%\\x\\..\\y', 'C:\\x\\%USERPROFILE%'].map((v) => [`root ${JSON.stringify(v)}`, withRoot(v), ID]),
    [`session id of 128`, staged, `${'a1-'.repeat(42)}ab`],
];
console.log(`== 2. refused: ${refused.length}, accepted: ${accepted.length}`);
let agree = 0;
const disagreements = [];
for (const [label, config, id] of refused) {
    const p = panePath(config, id);
    const n = nodePath(config, id);
    const ok = p === null && n.error !== undefined;
    if (ok) agree++; else disagreements.push(label);
    console.log(`${ok ? 'agree' : 'DISAGREE'} | refused | ${label} | pane ${p} | node ${n.error ?? `PATH ${n.path}`}`);
}
for (const [label, config, id] of accepted) {
    const p = panePath(config, id);
    const n = nodePath(config, id);
    const ok = p !== null && p === n.path;
    if (ok) agree++; else disagreements.push(label);
    console.log(`${ok ? 'agree' : 'DISAGREE'} | accepted | ${label} | pane ${p} | node ${n.path ?? n.error}`);
}
console.log(`RESULT 2: ${agree} of ${refused.length + accepted.length} agree; disagreements: ${JSON.stringify(disagreements)}`);

// 2b. The known differences, on the pane's safe side: a variable the pane cannot read.
console.log('== 2b. known differences (the pane can read USERPROFILE only)');
for (const v of ['%LOCALAPPDATA%\\state', '%userprofile%\\state']) {
    console.log(`root ${JSON.stringify(v)} | pane ${panePath(withRoot(v), ID)} | node ${nodePath(withRoot(v), ID).path ?? nodePath(withRoot(v), ID).error}`);
}

// 3. The live settings (the shape before the switch-over): no marker in the pane.
console.log('== 3. live config');
let none = 0;
for (const id of ids) {
    const p = panePath(live, id);
    if (p === null) none++;
    console.log(`${p === null ? 'no marker' : 'MARKER'} | ${id} | pane ${p} | node ${nodePath(live, id).path ?? nodePath(live, id).error}`);
}
console.log(`RESULT 3: ${none} of ${ids.length} give no marker with the live config`);
