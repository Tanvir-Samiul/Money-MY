import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Convert the FIRST page of a PDF to a PNG using Poppler's pdftoppm.
 * Returns the PNG bytes. Temp files are cleaned up automatically.
 *
 * Requires Poppler installed and on PATH.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer>} PNG bytes
 */
export async function pdfToPng(pdfBuffer) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outPrefix = path.join(tmpDir, "page");

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);

    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      "150",
      "-f",
      "1",
      "-l",
      "1",
      pdfPath,
      outPrefix,
    ]);

    const files = fs
      .readdirSync(tmpDir)
      .filter((f) => f.endsWith(".png"));
    if (files.length === 0) {
      throw new Error("pdftoppm produced no output");
    }

    return fs.readFileSync(path.join(tmpDir, files[0]));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
