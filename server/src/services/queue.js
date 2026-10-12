import config from "../config.js";
import logger from "../lib/logger.js";
import { serviceClient } from "./storage.js";
import { extractReceipt } from "./extraction/index.js";
import { prepareImage } from "./images.js";
import { pdfToPng } from "./pdf.js";

/**
 * Background extraction queue.
 *
 * Runs inside the Express process. Polls `transactions` for rows with
 * status='pending', extracts each one with the Groq engine, and updates
 * the row with the extracted fields.
 *
 * Handles:
 *  - PDF → PNG conversion + image resizing before the AI call
 *  - Rate limits (429): backs off using next_attempt_at
 *  - Other errors: increments extraction_attempts; flags needs_review
 *  - Restarts safely: pending rows are picked up again on boot
 */

const POLL_INTERVAL_MS = 5000;

let running = false;
let timer = null;

/* ---------- Main loop ---------- */
async function tick() {
  if (running) return;
  running = true;

  try {
    const { data: rows, error } = await serviceClient
      .from("transactions")
      .select("*")
      .eq("status", "pending")
      .or(
        `next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`,
      )
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      logger.error({ err: error }, "Queue poll failed");
      return;
    }

    if (!rows || rows.length === 0) return;

    const tx = rows[0];
    await processOne(tx);
  } catch (err) {
    logger.error({ err }, "Queue tick threw");
  } finally {
    running = false;
  }
}

/* ---------- Process one row ---------- */
async function processOne(tx) {
  const log = logger.child({ txId: tx.id });

  try {
    // 1. Download the original file from Storage
    const { data: fileData, error: dlErr } = await serviceClient.storage
      .from(config.SUPABASE_RECEIPTS_BUCKET)
      .download(tx.receipt_path);

    if (dlErr || !fileData) {
      throw new Error(`Download failed: ${dlErr?.message || "no data"}`);
    }

    const originalBuffer = Buffer.from(await fileData.arrayBuffer());

    // 2. Prepare the file for the AI.
    //    - PDF  → convert first page to PNG, then resize
    //    - Image → resize + compress to JPEG
    //    The AI can only read images, never raw PDFs.
    const ext = tx.receipt_path.split(".").pop().toLowerCase();

    let aiBuffer;
    if (ext === "pdf") {
      log.debug("Converting PDF to PNG");
      const png = await pdfToPng(originalBuffer);
      aiBuffer = await prepareImage(png);
    } else {
      aiBuffer = await prepareImage(originalBuffer);
    }

    log.debug(
      { originalBytes: originalBuffer.length, aiBytes: aiBuffer.length },
      "Prepared file for extraction",
    );

    // 3. Run extraction on the prepared image
    const out = await extractReceipt({
      buffer: aiBuffer,
      mimeType: "image/jpeg",
    });

    // 4. Update the transaction
    const updates = {
      extraction_engine: out.engine,
      extraction_raw: out.raw,
      extraction_attempts: tx.extraction_attempts + 1,
    };

    if (out.ok) {
      updates.status = "ok";
      updates.review_reason = null;
      updates.occurred_on = out.data.date;
      updates.occurred_time = out.data.time;
      updates.amount_paid = out.amountSen;
      updates.my_share = out.amountSen;
      updates.merchant = out.data.merchant;
      updates.payment_source = out.data.payment_source;
    } else {
      updates.status = "needs_review";
      updates.review_reason = out.reason;
      if (out.data) {
        if (out.data.date) updates.occurred_on = out.data.date;
        if (out.data.time) updates.occurred_time = out.data.time;
        if (out.amountSen) {
          updates.amount_paid = out.amountSen;
          updates.my_share = out.amountSen;
        }
        if (out.data.merchant) updates.merchant = out.data.merchant;
        if (out.data.payment_source && out.data.payment_source !== "unknown") {
          updates.payment_source = out.data.payment_source;
        }
      }
    }

    const { error: upErr } = await serviceClient
      .from("transactions")
      .update(updates)
      .eq("id", tx.id);

    if (upErr) throw upErr;

    log.debug(
      { status: updates.status, amount: out.amountSen },
      "Receipt extracted",
    );
  } catch (err) {
    // Rate limit - back off but keep pending
    if (err.code === "RATE_LIMITED") {
      const waitSec = err.retryAfter || 60;
      const nextAttempt = new Date(Date.now() + waitSec * 1000);
      await serviceClient
        .from("transactions")
        .update({
          next_attempt_at: nextAttempt.toISOString(),
          extraction_attempts: tx.extraction_attempts + 1,
        })
        .eq("id", tx.id);

      log.debug({ waitSec }, "Rate limited, backing off");
      return;
    }

    // Any other error - increment attempts, flag if we've hit the max
    const attempts = tx.extraction_attempts + 1;
    const maxed = attempts >= config.EXTRACTION_MAX_ATTEMPTS;

    await serviceClient
      .from("transactions")
      .update({
        status: maxed ? "needs_review" : "pending",
        review_reason: maxed ? "Could not read the receipt." : null,
        extraction_attempts: attempts,
        next_attempt_at: maxed
          ? null
          : new Date(Date.now() + 60 * 1000).toISOString(),
      })
      .eq("id", tx.id);

    log.warn({ err: err.message, attempts, maxed }, "Extraction failed");
  }
}

/* ---------- Start / stop ---------- */
export function startQueue() {
  if (timer) return;
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Extraction queue started");
  timer = setInterval(tick, POLL_INTERVAL_MS);
  tick();
}

export function stopQueue() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info("Extraction queue stopped");
  }
}
