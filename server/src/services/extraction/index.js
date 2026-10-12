import { extractWithGroq } from "./engines/groq.js";
import { validateExtraction, amountToSen } from "./validate.js";

/**
 * Engine registry. Add new engines here (e.g. "gemini", "mistral")
 * without touching any caller.
 */
const ENGINES = {
  groq: extractWithGroq,
};

/**
 * Extract receipt data using the engines listed in EXTRACTION_ENGINES,
 * tried in order. Currently just "groq".
 *
 * @param {Object} args
 * @param {Buffer} args.buffer
 * @param {string} args.mimeType
 */
export async function extractReceipt({ buffer, mimeType }) {
  const engines = (process.env.EXTRACTION_ENGINES || "groq")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let lastErr = null;

  for (const name of engines) {
    const fn = ENGINES[name];
    if (!fn) {
      lastErr = new Error(`Unknown extraction engine: ${name}`);
      continue;
    }

    try {
      const { result, raw, engine } = await fn({ buffer, mimeType });
      const validated = validateExtraction(result);

      return {
        ok: validated.ok,
        reason: validated.reason,
        data: validated.data,
        amountSen:
          validated.data?.amount != null
            ? amountToSen(validated.data.amount)
            : null,
        engine,
        raw,
      };
    } catch (err) {
      lastErr = err;
      // Rate limit - bubble up so the queue can back off.
      if (err.code === "RATE_LIMITED") throw err;
      // Otherwise try the next engine in the list.
    }
  }

  throw lastErr || new Error("All extraction engines failed");
}
