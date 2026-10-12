/**
 * Extraction lab - run a folder of receipts through the extraction engine.
 *
 * Usage (from the server/ folder):
 *   node --env-file=.env tools/extraction-lab.js <folder>
 */

import fs from "node:fs";
import path from "node:path";

import { extractReceipt } from "../src/services/extraction/index.js";
import { prepareImage } from "../src/services/images.js";
import { pdfToPng } from "../src/services/pdf.js";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function loadAsImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const pdfBuffer = fs.readFileSync(filePath);
    const png = await pdfToPng(pdfBuffer);
    const prepared = await prepareImage(png);
    return { buffer: prepared, mimeType: "image/jpeg" };
  }

  const mime = MIME[ext];
  if (!mime) throw new Error(`Unsupported type ${ext}`);

  const raw = fs.readFileSync(filePath);
  const prepared = await prepareImage(raw);
  return { buffer: prepared, mimeType: "image/jpeg" };
}

async function main() {
  const folder = process.argv[2] || "./receipts";

  if (!fs.existsSync(folder)) {
    console.error(`❌ Folder not found: ${folder}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(folder)
    .filter((f) => !f.startsWith("."))
    .map((f) => path.join(folder, f));

  if (files.length === 0) {
    console.error(`❌ No files in ${folder}`);
    process.exit(1);
  }

  console.log(`\n🔍 Extraction lab: ${files.length} file(s)\n`);
  console.log("=".repeat(70));

  for (const file of files) {
    const name = path.basename(file);
    console.log(`\n📄 ${name}`);
    console.log("-".repeat(70));

    try {
      const { buffer, mimeType } = await loadAsImage(file);
      const t0 = Date.now();
      const out = await extractReceipt({ buffer, mimeType });
      const elapsed = Date.now() - t0;

      console.log(JSON.stringify(out.data, null, 2));
      console.log(
        out.ok ? "✅ Validated OK" : `⚠️  Needs review: ${out.reason}`,
      );
      console.log(`⏱️  ${elapsed} ms · engine: ${out.engine}`);
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }

    // Respect Groq's ITPM limit (~7000/min, ~2100 tokens per image)
    await new Promise((r) => setTimeout(r, 25000));
  }

  console.log("\n" + "=".repeat(70));
  console.log("Done.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
