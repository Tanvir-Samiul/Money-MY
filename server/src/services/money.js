/**
 * Money helpers.
 *
 * RULE: All money is stored and calculated as INTEGER SEN.
 * RM 12.50 is stored as 1250.
 * NEVER use floating-point for money.
 */

/**
 * Convert RM (a float from user input) to sen (an integer).
 * @param {number|string} rm - e.g. 12.5 or "12.50"
 * @returns {number} integer sen, e.g. 1250
 */
export function rmToSen(rm) {
  const n = typeof rm === "string" ? parseFloat(rm) : rm;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

/**
 * Convert sen (integer) to RM (float, for display only).
 * @param {number} sen - e.g. 1250
 * @returns {number} RM value, e.g. 12.5
 */
export function senToRm(sen) {
  if (!Number.isInteger(sen)) throw new Error("sen must be an integer");
  return sen / 100;
}

/**
 * Format sen as a display string.
 * @param {number} sen - e.g. 1250
 * @returns {string} e.g. "RM 12.50"
 */
export function formatSen(sen) {
  if (!Number.isInteger(sen)) return "RM —";
  const rm = sen / 100;
  return `RM ${rm.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
