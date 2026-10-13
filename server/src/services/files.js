import crypto from "node:crypto";
import { serviceClient } from "./storage.js";
import config from "../config.js";

/**
 * Storage helpers for receipt files.
 *
 * Files are stored at: {userId}/{uuid}.{ext}
 * Bucket is private - access via signed URLs only.
 */

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * SHA-256 hash of a buffer. Used for duplicate detection.
 */
export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Upload a buffer to Supabase Storage with retry on transient failures.
 *
 * Supabase's client sometimes returns "fetch failed" when the connection
 * to their API blips — common on shared free tier. A single retry usually
 * fixes it. We only retry on 5xx or missing-status errors; real 4xx errors
 * (auth, quota, bad request) surface immediately.
 */
async function uploadWithRetry(bucket, path, buffer, opts, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { error } = await serviceClient.storage
      .from(bucket)
      .upload(path, buffer, opts);

    if (!error) return;

    lastError = error;

    // Don't retry on real client errors (4xx)
    const status = error.statusCode ?? error.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    if (attempt === maxRetries) break;

    // Backoff: 1s, 2s
    const waitMs = 1000 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  throw new Error(
    `Storage upload failed after ${maxRetries + 1} attempts: ${lastError.message}`,
  );
}

/**
 * Upload a receipt to Supabase Storage.
 *
 * @param {Object} args
 * @param {string} args.userId
 * @param {Buffer} args.buffer
 * @param {string} args.mimeType
 * @returns {Promise<string>} storage path, e.g. "abc-123/def-456.jpg"
 */
export async function uploadReceipt({ userId, buffer, mimeType }) {
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  const fileId = crypto.randomUUID();
  const storagePath = `${userId}/${fileId}.${ext}`;

  await uploadWithRetry(config.SUPABASE_RECEIPTS_BUCKET, storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  return storagePath;
}

/**
 * Create a signed URL for viewing a receipt (valid ~1 hour).
 *
 * @param {string} storagePath
 * @param {number} [expiresIn=3600] seconds
 * @returns {Promise<string>}
 */
export async function signReceiptUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await serviceClient.storage
    .from(config.SUPABASE_RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Signed URL failed: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a receipt from storage. Swallows "not found" errors so
 * delete is idempotent.
 */
export async function deleteReceipt(storagePath) {
  const { error } = await serviceClient.storage
    .from(config.SUPABASE_RECEIPTS_BUCKET)
    .remove([storagePath]);

  if (error && !/not.?found/i.test(error.message)) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
