import config from "../config.js";

/**
 * Returns today's date in YYYY-MM-DD in the configured APP_TIMEZONE.
 * Uses Intl.DateTimeFormat so it works without extra libraries.
 */
export function todayInAppTz() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns the first and last day of a month in the configured timezone.
 * Accepts "YYYY-MM" or "YYYY-MM-DD" (any day in the target month).
 */
export function monthRangeInAppTz(monthInput) {
  const [y, m] = monthInput.split("-").map(Number);

  const first = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;

  // Last day of the CURRENT month: day 0 of the NEXT month in UTC
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const lastDayNum = new Date(
    Date.UTC(nextYear, nextMonth - 1, 0),
  ).getUTCDate();

  const last = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  return { from: first, to: last };
}

/**
 * Returns the previous month as "YYYY-MM".
 */
export function previousMonth(monthInput) {
  const [y, m] = monthInput.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}
