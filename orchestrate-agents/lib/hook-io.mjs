// Input and output of Claude Code command hooks: read the JSON input from stdin, build the JSON that adds context
// for the model, and report a failure as one stderr line (a hook that fails must never fail the prompt or the
// tool call it belongs to).

/**
 * Reads all of stdin as UTF-8 text.
 * @returns {Promise<string>} the text Claude Code wrote to the hook
 */
export async function readStdinText() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

/**
 * Parses hook input.
 * @param {string} text stdin text
 * @returns {object} the input object
 * @throws {Error} when the text is not a JSON object
 */
export function parseHookInput(text) {
    let input;
    try {
        input = JSON.parse(text);
    } catch (error) {
        throw new Error(`hook input is not JSON: ${error.message}`);
    }
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('hook input is not a JSON object');
    }
    return input;
}

/**
 * Builds the stdout JSON that adds text to the model's context.
 * @param {string} eventName the hook event, for example 'PostToolUse'
 * @param {string} additionalContext the text to add
 * @returns {string} the JSON text
 */
export function hookContextOutput(eventName, additionalContext) {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext } });
}

/**
 * Writes one line about a failure to stderr.
 * @param {string} hookName the hook's name, at the start of the line
 * @param {Error} error what went wrong
 */
export function reportHookError(hookName, error) {
    process.stderr.write(`${hookName}: ${String(error?.message ?? error).replace(/\r\n|\n|\r/g, ' ')}\n`);
}
