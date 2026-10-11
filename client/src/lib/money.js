/**
 * Client-side money helpers.
 * Same rules as server: money is integer sen everywhere.
 */

export function rmToSen(rm) {
  const n = typeof rm === "string" ? parseFloat(rm) : rm;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export function senToRm(sen) {
  if (!Number.isInteger(sen)) throw new Error("sen must be an integer");
  return sen / 100;
}

export function formatSen(sen) {
  if (!Number.isInteger(sen)) return "RM —";
  const rm = sen / 100;
  return `RM ${rm.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format an RM number for display, e.g. 12.5 → "RM 12.50"
 */
export function formatRm(rm) {
  const n = typeof rm === "number" ? rm : parseFloat(rm);
  if (!Number.isFinite(n)) return "RM —";
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
