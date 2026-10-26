// Blocking sleep for the synchronous scripts (the register CLI and the hooks run start to finish without an event
// loop worth keeping free).

const sleepCell = new Int32Array(new SharedArrayBuffer(4));

/**
 * Blocks the current thread for a number of milliseconds.
 * @param {number} ms how long to wait
 */
export function sleepSync(ms) {
    Atomics.wait(sleepCell, 0, 0, ms);
}
