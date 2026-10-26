// An exclusive lock held as a file that only one process can create ('wx'). Hand-written because the scripts must
// run with no dependencies. A lock older than the stale age is taken to belong to a crashed holder and is removed.
//
// Known limit: two processes that find the same stale lock at the same instant can both remove it; the stale age
// is checked twice (before and right before removal) to keep that window to a few microseconds.

import fs from 'node:fs';
import { sleepSync } from './sleep.mjs';

// How often a waiting process tries again. Short, because a holder keeps the lock for a few milliseconds.
const POLL_MS = 25;

// On Windows a file that is being deleted cannot be created again for a moment; that shows as EPERM or EACCES.
const BUSY_ERRORS = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']);

/**
 * Takes the lock, waiting for it up to a limit.
 * @param {string} lockPath the lock file (its folder must exist)
 * @param {{waitMs: number, staleMs: number}} timing how long to keep trying; age after which a lock is stale
 * @returns {(() => void)|null} a function that releases the lock, or null when it could not be taken in time
 */
export function acquireLock(lockPath, { waitMs, staleMs }) {
    const deadline = Date.now() + waitMs;
    for (;;) {
        if (tryCreateLock(lockPath)) {
            return () => fs.rmSync(lockPath, { force: true });
        }
        if (removeIfStale(lockPath, staleMs)) {
            continue;
        }
        if (Date.now() >= deadline) {
            return null;
        }
        sleepSync(Math.min(POLL_MS, Math.max(1, deadline - Date.now())));
    }
}

/**
 * Creates the lock file if nobody holds it.
 * @param {string} lockPath the lock file
 * @returns {boolean} true when this process now holds the lock
 */
function tryCreateLock(lockPath) {
    try {
        const fd = fs.openSync(lockPath, 'wx');
        fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
        fs.closeSync(fd);
        return true;
    } catch (error) {
        if (BUSY_ERRORS.has(error.code)) {
            return false;
        }
        throw error;
    }
}

/**
 * Removes the lock file when it is older than the stale age, checking the age twice.
 * @param {string} lockPath the lock file
 * @param {number} staleMs age after which a lock is stale
 * @returns {boolean} true when a stale lock was removed
 */
function removeIfStale(lockPath, staleMs) {
    const first = statOrNull(lockPath);
    if (!first || Date.now() - first.mtimeMs <= staleMs) {
        return false;
    }
    const second = statOrNull(lockPath);
    if (!second || second.mtimeMs !== first.mtimeMs || second.ino !== first.ino) {
        return false;
    }
    fs.rmSync(lockPath, { force: true });
    return true;
}

/**
 * Stats a file.
 * @param {string} filePath the file
 * @returns {fs.Stats|null} its stats, or null when it is gone
 */
function statOrNull(filePath) {
    return fs.statSync(filePath, { throwIfNoEntry: false }) ?? null;
}
