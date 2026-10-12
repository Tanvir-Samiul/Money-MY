import { z } from "zod";

/**
 * Zod schema for the raw AI output.
 * The AI returns slightly loose JSON; we normalise before validating.
 */
const rawSchema = z.object({
  is_receipt: z.boolean(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm")
    .nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  merchant: z.string().nullable(),
  payment_source: z
    .enum(["touch_n_go", "maybank", "merchantrade", "unknown"])
    .nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  issues: z.array(z.string()).default([]),
});

/**
 * Validates raw AI output and applies the business rules from
 * CLAUDE.md section 8.5. Returns:
 *   { ok: true, data }          - all checks passed
 *   { ok: false, reason, data } - saved but flagged for review
 */
export function validateExtraction(raw) {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "Could not read the receipt.",
      data: null,
    };
  }

  const d = parsed.data;

  // Rule 2 - not a receipt
  if (!d.is_receipt) {
    return { ok: false, reason: "This does not look like a receipt.", data: d };
  }

  // Rule 3 - amount
  if (d.amount === null || d.amount <= 0) {
    return { ok: false, reason: "Amount not found.", data: d };
  }

  // Rule 4 - date
  if (!d.date) {
    return { ok: false, reason: "Date missing or invalid.", data: d };
  }
  const today = new Date();
  const t = new Date(d.date + "T00:00:00Z");
  if (Number.isNaN(t.getTime()) || t > today) {
    return { ok: false, reason: "Date missing or invalid.", data: d };
  }

  // Rule 5 - payment source
  if (!d.payment_source || d.payment_source === "unknown") {
    return {
      ok: false,
      reason: "Payment app not recognised. Please choose it.",
      data: d,
    };
  }

  // Rule 7 - confidence
  if (d.confidence === "low") {
    return {
      ok: false,
      reason: "Low confidence. Please check the details.",
      data: d,
    };
  }

  // All checks passed
  return { ok: true, data: d };
}

/**
 * Convert AI amount (RM float) to integer sen.
 */
export function amountToSen(amount) {
  return Math.round(amount * 100);
}
