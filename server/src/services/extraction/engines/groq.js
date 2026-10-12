import config from "../../../config.js";
import logger from "../../../lib/logger.js";
import { RECEIPT_SYSTEM_PROMPT } from "../prompts.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Extract receipt data using Groq's vision model.
 *
 * @param {Object} args
 * @param {Buffer} args.buffer   - image bytes (already resized/compressed)
 * @param {string} args.mimeType - e.g. "image/jpeg"
 * @returns {Promise<{ result: Object, raw: Object, engine: string }>}
 */
export async function extractWithGroq({ buffer, mimeType }) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const t0 = Date.now();
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.GROQ_VISION_MODEL,
      temperature: 0,
      max_completion_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RECEIPT_SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const elapsed = Date.now() - t0;
  const json = await res.json();

  // Surface rate limits so the queue can back off correctly.
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    const err = new Error("Groq rate limit reached");
    err.code = "RATE_LIMITED";
    err.retryAfter = retryAfter ? Number(retryAfter) : null;
    throw err;
  }

  if (!res.ok) {
    const message = json.error?.message || `Groq HTTP ${res.status}`;
    throw new Error(message);
  }

  const raw = json.choices?.[0]?.message?.content ?? "";

  logger.trace({ elapsed, usage: json.usage }, "Groq extraction completed");

  const parsed = parseJsonLoose(raw);

  return {
    result: parsed,
    raw: json,
    engine: "groq",
  };
}

/**
 * Groq sometimes wraps JSON in markdown or adds prose.
 * Pull out the first complete JSON object.
 */
function parseJsonLoose(text) {
  if (!text) throw new Error("Empty response from Groq");

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in Groq response");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}
