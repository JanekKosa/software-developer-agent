// Whether the agent team is switched on for a session. The team runs only in a chat the user switched on with
// /software-developer-agent (the user, 2026-10-26: "i dont want the agent architecture to run for all main chats"):
// scripts/team-on.mjs writes one marker per session in the folder agentTeam.onFolder names under the team's state
// folder (teamState.folder, the one place of every file the team keeps; the user, 2026-10-27, D-36), and the hooks do
// nothing in a session without one. A subagent's hook input carries its main session's id, so one marker covers the
// main session and every agent it starts. Nothing removes a marker: a new chat has a new session id and starts off.

import fs from 'node:fs';
import path from 'node:path';
import { requireStatePath } from './config.mjs';
import { SESSION_ID_PATTERN } from './limit-stop.mjs';

/**
 * Gives the path of a session's marker: <teamState.folder>\<agentTeam.onFolder>\<session id>.
 * @param {object} config settings from loadConfig
 * @param {*} sessionId the session id, as the hook input or CLAUDE_CODE_SESSION_ID gives it
 * @returns {string} absolute path under the team's state folder
 * @throws {Error} when a setting is missing or refused (lib/config.mjs requireStatePath), or the id is not a plain id
 */
export function teamOnMarkerPath(config, sessionId) {
    const folder = requireStatePath(config, 'agentTeam.onFolder');
    if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
        throw new Error(`session id ${JSON.stringify(sessionId)} is not a plain id`);
    }
    return path.join(folder, sessionId);
}

/**
 * Says whether the team is switched on for a session. A missing or unsafe session id counts as off.
 * @param {object} config settings from loadConfig
 * @param {*} sessionId the session id from the hook input
 * @returns {boolean} true only when the session's marker exists
 * @throws {Error} when a setting is missing or refused
 */
export function isTeamOn(config, sessionId) {
    if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
        return false;
    }
    return fs.existsSync(teamOnMarkerPath(config, sessionId));
}

/**
 * Switches the team on for a session by writing its marker, which holds the time it was written. Safe to run twice.
 * @param {object} config settings from loadConfig
 * @param {string} sessionId the session id
 * @param {Date} now the time to write
 * @returns {string} the marker's path
 */
export function switchTeamOn(config, sessionId, now) {
    const marker = teamOnMarkerPath(config, sessionId);
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, now.toISOString());
    return marker;
}
