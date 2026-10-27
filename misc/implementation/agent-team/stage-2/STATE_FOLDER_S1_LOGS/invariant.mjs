// Invariant check of run S1, read-only: resolves the three changed settings from the STAGED config with the real
// environment, and checks that every real marker name under the old %TEMP% folders is accepted by the staged code and
// maps to a path under the new root. Lists folders only; reads, writes and creates no state file.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const staged = process.argv[2];
const { loadConfig, requireStatePath } = await import(pathToFileURL(path.join(staged, 'lib', 'config.mjs')).href);
const { teamOnMarkerPath } = await import(pathToFileURL(path.join(staged, 'lib', 'agent-team.mjs')).href);
const { AGENT_ID_PATTERN, SESSION_ID_PATTERN } = await import(pathToFileURL(path.join(staged, 'lib', 'limit-stop.mjs')).href);

const config = loadConfig(staged);
const root = 'C:\\Users\\user\\.claude\\state\\software-developer-agent';
const expected = {
    'agentTeam.onFolder': `${root}\\team-on`,
    'contextGuard.markerFolder': `${root}\\context-guard`,
    'limitStop.logFile': `${root}\\logs\\limit-stop.log`,
};
let differences = 0;
for (const [key, want] of Object.entries(expected)) {
    const got = requireStatePath(config, key);
    if (got !== want) differences += 1;
    console.log(`${got === want ? 'same' : 'DIFF'} ${key} = ${got}`);
}
console.log(`settings: ${differences} differences on ${Object.keys(expected).length}`);

const temp = process.env.TEMP;
const teamOnNames = fs.readdirSync(path.join(temp, 'claude-agent-team-on'));
let refused = 0;
for (const id of teamOnNames) {
    try {
        const got = teamOnMarkerPath(config, id);
        if (got !== `${root}\\team-on\\${id}`) { refused += 1; console.log(`WRONG PATH ${id} -> ${got}`); }
    } catch (error) {
        refused += 1;
        console.log(`REFUSED ${id}: ${error.message}`);
    }
}
console.log(`team-on: ${refused} refused of ${teamOnNames.length}`);

const guardNames = fs.readdirSync(path.join(temp, 'claude-context-guard')).filter((name) => name.endsWith('.json'));
const markerDir = requireStatePath(config, 'contextGuard.markerFolder');
let guardRefused = 0;
for (const name of guardNames) {
    const id = name.slice(0, -'.json'.length);
    const ok = id.startsWith('session-') ? SESSION_ID_PATTERN.test(id.slice('session-'.length)) : AGENT_ID_PATTERN.test(id);
    const target = path.join(markerDir, name);
    if (!ok || target !== `${root}\\context-guard\\${name}`) {
        guardRefused += 1;
        console.log(`REFUSED ${name} -> ${target}`);
    }
}
console.log(`context-guard: ${guardRefused} refused of ${guardNames.length}`);
console.log(`real root exists: ${fs.existsSync(root)}`);
