// Local date and time formatting for register entries ("2026-10-25 08:10").

/**
 * Formats a moment as local "YYYY-MM-DD HH:mm".
 * @param {Date} date the moment
 * @returns {string} the formatted local date and minute
 */
export function formatLocalMinute(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
