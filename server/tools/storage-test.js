/**
 * Throwaway test - proves Supabase Storage works end to end.
 *
 * Run from the server/ folder:
 *   node --env-file=.env tools/storage-test.js <path-to-image> <userId>
 */

import fs from "node:fs";
import path from "node:path";
import {
  uploadReceipt,
  signReceiptUrl,
  deleteReceipt,
  hashBuffer,
} from "../src/services/files.js";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const TEST_USER_ID = process.argv[3] || "00000000-0000-0000-0000-000000000000";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "❌ Usage: node --env-file=.env tools/storage-test.js <file> <userId>",
    );
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    console.error(`❌ Unsupported file type: ${ext}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);

  console.log(`\n📄 File: ${path.basename(filePath)}`);
  console.log(`   Size: ${buffer.length} bytes`);
  console.log(`   Type: ${mimeType}`);
  console.log(`   Hash: ${hashBuffer(buffer).slice(0, 16)}...`);
  console.log(`   User: ${TEST_USER_ID}\n`);

  console.log("⬆️  Uploading to Supabase Storage...");
  const storagePath = await uploadReceipt({
    userId: TEST_USER_ID,
    buffer,
    mimeType,
  });
  console.log(`✅ Uploaded: ${storagePath}\n`);

  console.log("🔗 Generating signed URL (1 hour)...");
  const signedUrl = await signReceiptUrl(storagePath, 3600);
  console.log(`✅ Signed URL:\n   ${signedUrl}\n`);
  console.log("👉 Open that URL in your browser to confirm the image loads.\n");

  console.log("⏭️  Skipping delete so the signed URL stays valid.\n");
  // await deleteReceipt(storagePath);

  console.log("🎉 Storage pipeline works end to end.\n");
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
