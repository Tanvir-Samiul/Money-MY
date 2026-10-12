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

  const { error } = await serviceClient.storage
    .from(config.SUPABASE_RECEIPTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

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
