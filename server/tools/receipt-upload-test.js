/**
 * Throwaway test - proves the upload endpoint works.
 *
 * Usage (from server/):
 *   node --env-file=.env tools/receipt-upload-test.js <file> <categoryId> <jwt>
 */

import fs from "node:fs";
import path from "node:path";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

async function main() {
  const [, , filePath, categoryId, jwt] = process.argv;

  if (!filePath || !categoryId || !jwt) {
    console.error(
      "❌ Usage: node --env-file=.env tools/receipt-upload-test.js <file> <categoryId> <jwt>",
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
  const blob = new Blob([buffer], { type: mimeType });

  const formData = new FormData();
  formData.append("file", blob, path.basename(filePath));
  formData.append("categoryId", categoryId);
  formData.append("note", "Test upload from CLI");

  console.log(
    `\n📤 Uploading ${path.basename(filePath)} (${buffer.length} bytes)\n`,
  );

  const res = await fetch("http://localhost:8080/api/transactions/receipt", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  const json = await res.json();

  console.log(`Status: ${res.status}`);
  console.log(JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log(`\n✅ Upload succeeded. Transaction id: ${json.id}`);
    console.log(`   Status: ${json.status}`);
    console.log(`   Receipt path: ${json.receipt_path}`);
    console.log(`   Hash: ${json.receipt_hash?.slice(0, 16)}...\n`);
  } else {
    console.log(`\n❌ Upload failed.\n`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
