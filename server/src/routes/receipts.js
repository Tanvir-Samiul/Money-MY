import express from "express";
import multer from "multer";
import { z } from "zod";
import { hashBuffer, uploadReceipt, deleteReceipt } from "../services/files.js";
import logger from "../lib/logger.js";
import { validateSplitPlan } from "../services/splits.js";

const router = express.Router();

/* ---------- Upload config ---------- */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (matches MAX_UPLOAD_MB)
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(
        new Error("Unsupported file type. Use JPEG, PNG, WebP, or PDF."),
      );
    }
    cb(null, true);
  },
});

/* ---------- Body schema ---------- */
const splitPlanSchema = z
  .object({
    mode: z.enum(["equal", "custom"]),
    people: z.number().int().min(2).max(100).optional(),
    myShareSen: z.number().int().positive().optional(),
  })
  .optional()
  .nullable();

const bodySchema = z.object({
  categoryId: z.string().uuid("categoryId must be a UUID"),
  note: z.string().trim().max(500).optional().nullable(),
  paymentSource: z
    .enum(["touch_n_go", "maybank", "merchantrade", "cash"])
    .optional()
    .nullable(),
  force: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true"),
  splitPlan: z
    .union([z.string(), z.record(z.any())])
    .optional()
    .nullable()
    .transform((v) => {
      if (!v) return null;
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      }
      return v;
    })
    .pipe(splitPlanSchema),
});

/* =========================================================
   POST /api/transactions/receipt
   Accepts a multipart file + category, saves the file to storage,
   and creates a transaction with status='pending'.

   Does NOT run extraction — the queue worker (Phase 3c) picks it up.
   ========================================================= */
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const { categoryId, note, paymentSource, force, splitPlan } = parsed.data;

    // Hash the file for duplicate detection
    const receiptHash = hashBuffer(req.file.buffer);

    // Check for an existing transaction with the same hash
    if (!force) {
      const { data: existing } = await req.supabase
        .from("transactions")
        .select("*")
        .eq("receipt_hash", receiptHash)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: "You already saved this receipt.",
          existing,
        });
      }
    }

    // Upload original file to storage
    const receiptPath = await uploadReceipt({
      userId: req.user.id,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    // Validate the split plan (amount is unknown yet — pass null)
    const splitCheck = validateSplitPlan(splitPlan, null);
    if (!splitCheck.ok) {
      // Roll back the storage upload — no orphans
      await deleteReceipt(receiptPath).catch(() => {});
      return res.status(400).json({ error: splitCheck.error });
    }

    const splitMode = splitPlan?.mode || null;
    const splitMeta = splitPlan
      ? splitPlan.mode === "equal"
        ? { people: splitPlan.people }
        : { myShareSen: splitPlan.myShareSen }
      : null;

    // Insert the transaction. If this fails, remove the orphaned file.
    try {
      const { data, error } = await req.supabase
        .from("transactions")
        .insert({
          user_id: req.user.id,
          entry_type: "receipt",
          category_id: categoryId,
          note: note || null,
          payment_source: paymentSource || null,
          receipt_path: receiptPath,
          receipt_hash: receiptHash,
          status: "pending",
          split_mode: splitMode,
          split_meta: splitMeta,
        })
        .select("*")
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (dbErr) {
      // Roll back the storage upload — don't leave orphans
      await deleteReceipt(receiptPath).catch((cleanupErr) => {
        logger.warn(
          { err: cleanupErr, receiptPath },
          "Failed to clean up orphaned receipt after DB insert error",
        );
      });
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
});

export default router;
