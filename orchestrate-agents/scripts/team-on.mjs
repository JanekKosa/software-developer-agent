// Switches the agent team on for one chat (the user, 2026-10-26: the team runs only in a chat that asked for it). The
// main session runs it as the first step of the orchestrate-agents skill:
//
//   node <skill>\scripts\team-on.mjs [--session <id>]
//
// The session id defaults to CLAUDE_CODE_SESSION_ID, which Claude Code sets for every tool call. It writes the
// session's marker, <teamState.folder>\<agentTeam.onFolder>\<session id> (lib/agent-team.mjs), after which the two
// hooks speak in this session and its agents. It prints one line: "AGENT TEAM ON | session <id> | <marker path>" and
// exits 0; a missing or unsafe id, a wrong argument or a missing or refused setting prints "AGENT TEAM NOT ON | <why>"
// and exits 2.

import { switchTeamOn } from '../lib/agent-team.mjs';
import { loadConfig, skillDirOf } from '../lib/config.mjs';

try {
    const args = process.argv.slice(2);
    let sessionId = process.env.CLAUDE_CODE_SESSION_ID;
    if (args.length === 2 && args[0] === '--session') {
        sessionId = args[1];
    } else if (args.length !== 0) {
        throw new Error(`unknown arguments ${JSON.stringify(args)}; the only one is --session <id>`);
    }
    if (!sessionId) {
        throw new Error('no session id: CLAUDE_CODE_SESSION_ID is not set and --session was not given');
    }
    const marker = switchTeamOn(loadConfig(skillDirOf(import.meta.url)), sessionId, new Date());
    process.stdout.write(`AGENT TEAM ON | session ${sessionId} | ${marker}\n`);
} catch (error) {
    process.stdout.write(`AGENT TEAM NOT ON | ${error.message}\n`);
    process.exitCode = 2;
}
