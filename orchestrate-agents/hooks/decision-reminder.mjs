// UserPromptSubmit hook (plan section 6.3). The user answers decisions in the Decisions pane or in the chat, so the
// prompt no longer lists every open entry (the user, 2026-10-26). It adds to the main session's context only what
// cannot wait, each part only when it has something: one line naming the entries that block work and still wait for the
// user, with what to do; the user's answers that wait to be handed over, handed over now (each answer reaches the main
// session once: this hook or the decision answers watch, whichever comes first, D-18), with what to do; and one line
// naming the answered entries handed over earlier that no agent has closed or followed up yet, so nothing is lost when
// a session was cut off and nothing is acted on twice. Only the register of the session's own repo is read: no decision
// leaks between repos (the user, 2026-10-26, D-14, overturning D-8).
// The hand-over waits for the register's lock only register.hookLockWaitSeconds; a busy register leaves the answers for
// the watch or the next prompt and writes one stderr line. Prints nothing when there is nothing to say. It never fails
// the prompt: any error, an unreadable register included, leaves out what it concerns, exits 0 and writes one stderr
// line.

import path from 'node:path';
import { loadConfig, requireNumberSetting, skillDirOf } from '../lib/config.mjs';
import {
    WAITING_FOR_AGENT, handOverAnswers, handOverText, itemLabel, openItems, registerLocation, unprocessedAnswers,
} from '../lib/decision-register.mjs';
import { hookContextOutput, parseHookInput, readStdinText, reportHookError } from '../lib/hook-io.mjs';

const HOOK_NAME = 'decision-reminder';
const BLOCKING_INSTRUCTION = 'Each blocking entry above stops work until the user answers it. Do not write it out in this chat: the user reads and answers it in the Decisions pane. End your reply with one line naming each blocking id and what, asking the user to answer it there soon.';
const ANSWERED_INSTRUCTION = 'If you are already dealing with it, carry on and do not pass the answer to the lead again; otherwise read it with register.mjs answers --ids <id> and process it.';

try {
    const input = parseHookInput(await readStdinText());
    const config = loadConfig(skillDirOf(import.meta.url));
    const context = registerContext(registerLocation(input.cwd ?? process.cwd(), config), config);
    if (context.length > 0) {
        process.stdout.write(hookContextOutput('UserPromptSubmit', context.join('\n')));
    }
} catch (error) {
    reportHookError(HOOK_NAME, error);
}

/**
 * The register's part of the context, each line naming the repo's folder and root, for example 'Decision register of
 * xpp-agent (C:\Repos\My projects\xpp-agent): blocking and waiting for the user: D-4 "Drop the old path?" (urgency
 * high).' An open file that cannot be read gives nothing; an answers log that cannot be read leaves out the answers.
 * Either writes one stderr line naming its file.
 * @param {object} location from registerLocation
 * @param {object} config the whole settings object (register.hookLockWaitSeconds is read)
 * @returns {string[]} the blocking line and its instruction, the answers handed over now and their instruction, the
 *   line naming answers handed over earlier and its instruction; each pair only when it has something
 */
function registerContext(location, config) {
    let items;
    try {
        items = openItems(location);
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`cannot read the register ${location.openPath}, left out: ${error.message}`));
        return [];
    }
    const label = `Decision register of ${path.basename(location.root) || location.root} (${location.root})`;
    const context = [];
    const blocking = items.filter((item) => item.blocking && item.status !== WAITING_FOR_AGENT)
        .map((item) => `${itemLabel(item)}${item.urgency ? ` (urgency ${item.urgency})` : ''}`);
    if (blocking.length > 0) {
        context.push(`${label}: blocking and waiting for the user: ${blocking.join(', ')}.`, BLOCKING_INSTRUCTION);
    }
    let answers;
    try {
        answers = unprocessedAnswers(location);
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`cannot read the answers ${location.answersLogPath}, left out: ${error.message}`));
        return context;
    }
    const handed = handOverNow(location, config, answers);
    if (handed.length > 0) {
        context.push(`${label}: the user's answers, handed to you now:`, handOverText(handed));
    }
    const earlier = handedEarlier(items, answers);
    if (earlier.length > 0) {
        context.push(`${label}: handed to you earlier and not yet closed or followed up: ${earlier.join(', ')}.`, ANSWERED_INSTRUCTION);
    }
    return context;
}

/**
 * Hands over the answers that wait, when any does, waiting for the lock only the hook's short wait.
 * @param {object} location from registerLocation
 * @param {object} config the whole settings object
 * @param {object[]} answers from unprocessedAnswers, read before the hand-over
 * @returns {object[]} from handOverAnswers; [] when none waited, or when the register was busy or broke (one stderr
 *   line then, and the answers stay for the watch or the next prompt)
 */
function handOverNow(location, config, answers) {
    if (!answers.some((answer) => answer.handedOverAt === null)) {
        return [];
    }
    try {
        const lockWaitMs = requireNumberSetting(config, 'register.hookLockWaitSeconds') * 1000;
        return handOverAnswers(location, new Date(), { lockWaitMs });
    } catch (error) {
        reportHookError(HOOK_NAME, new Error(`answers not handed over, left for the watch or the next prompt: ${error.message}`));
        return [];
    }
}

/**
 * Names the entries that wait for an agent and whose unprocessed answers were all handed over before this prompt.
 * An entry with an answer handed over now, or one still waiting to be, is not named.
 * @param {object[]} items from openItems
 * @param {object[]} answers from unprocessedAnswers, read before the hand-over
 * @returns {string[]} for example 'D-7 (handed over 2026-10-26 10:15)', with the latest hand-over of the entry's answers
 */
function handedEarlier(items, answers) {
    return items.filter((item) => item.status === WAITING_FOR_AGENT).flatMap((item) => {
        const times = answers.filter((answer) => answer.id === item.id).map((answer) => answer.handedOverAt);
        if (times.length === 0 || times.includes(null)) {
            return [];
        }
        return [`${item.id} (handed over ${times.sort().at(-1)})`];
    });
}
