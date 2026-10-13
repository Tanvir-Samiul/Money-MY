import express from "express";
import { z } from "zod";
import { deleteReceipt, signReceiptUrl } from "../services/files.js";
import logger from "../lib/logger.js";
import { computeMyShare, validateSplitPlan } from "../services/splits.js";

const router = express.Router();

/* ---------- Validation schemas ---------- */
const PAYMENT_SOURCES = ["touch_n_go", "maybank", "merchantrade", "cash"];

const splitPlanSchema = z
  .object({
    mode: z.enum(["equal", "custom"]),
    people: z.number().int().min(2).max(100).optional(),
    myShareSen: z.number().int().positive().optional(),
  })
  .optional()
  .nullable();

const createManualSchema = z.object({
  amountSen: z.number().int().positive(),
  categoryId: z.string().uuid(),
  paymentSource: z.enum(PAYMENT_SOURCES),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  occurredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format: HH:MM")
    .optional()
    .nullable(),
  merchant: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  splitPlan: splitPlanSchema,
});

const updateSchema = z.object({
  amountSen: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  paymentSource: z.enum(PAYMENT_SOURCES).optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  occurredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  merchant: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  splitPlan: splitPlanSchema,
});

const listQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: z.string().uuid().optional(),
  source: z.enum(PAYMENT_SOURCES).optional(),
  status: z.enum(["pending", "ok", "needs_review"]).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/* =========================================================
   POST /api/transactions/manual
   ========================================================= */
router.post("/manual", async (req, res, next) => {
  try {
    const parsed = createManualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const {
      amountSen,
      categoryId,
      paymentSource,
      occurredOn,
      occurredTime,
      merchant,
      note,
      splitPlan,
    } = parsed.data;

    const splitCheck = validateSplitPlan(splitPlan, amountSen);
    if (!splitCheck.ok) {
      return res.status(400).json({ error: splitCheck.error });
    }

    let myShare = amountSen;
    let splitMode = null;
    let splitMeta = null;

    if (splitPlan) {
      const computed = computeMyShare(
        amountSen,
        splitPlan.mode,
        splitPlan.mode === "equal"
          ? { people: splitPlan.people }
          : { myShareSen: splitPlan.myShareSen },
      );
      myShare = computed.myShareSen;
      splitMode = splitPlan.mode;
      splitMeta =
        splitPlan.mode === "equal"
          ? { people: splitPlan.people }
          : { myShareSen: splitPlan.myShareSen };
    }

    const { data, error } = await req.supabase
      .from("transactions")
      .insert({
        user_id: req.user.id,
        entry_type: "manual",
        occurred_on: occurredOn,
        occurred_time: occurredTime || null,
        amount_paid: amountSen,
        my_share: myShare,
        merchant: merchant || null,
        category_id: categoryId,
        payment_source: paymentSource,
        note: note || null,
        status: "ok",
        split_mode: splitMode,
        split_meta: splitMeta,
      })
      .select("*")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   GET /api/transactions
   ========================================================= */
router.get("/", async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid query",
      });
    }

    const { from, to, category, source, status, q, limit, offset } =
      parsed.data;

    let query = req.supabase
      .from("transactions")
      .select(
        "id, occurred_on, occurred_time, amount_paid, my_share, merchant, category_id, payment_source, note, status, entry_type, created_at, split_mode, split_meta",
        { count: "exact" },
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("occurred_on", from);
    if (to) query = query.lte("occurred_on", to);
    if (category) query = query.eq("category_id", category);
    if (source) query = query.eq("payment_source", source);
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("merchant", `%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, count, limit, offset });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   GET /api/transactions/:id
   ========================================================= */
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("transactions")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Transaction not found." });
      }
      throw error;
    }

    let receipt_url = null;
    if (data.receipt_path) {
      try {
        receipt_url = await signReceiptUrl(data.receipt_path, 3600);
      } catch (signErr) {
        logger.warn(
          { err: signErr, path: data.receipt_path },
          "Failed to sign receipt URL",
        );
      }
    }

    res.json({ ...data, receipt_url });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   PATCH /api/transactions/:id
   ========================================================= */
router.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const updates = {};
    if (parsed.data.amountSen !== undefined) {
      updates.amount_paid = parsed.data.amountSen;
    }
    if (parsed.data.categoryId !== undefined)
      updates.category_id = parsed.data.categoryId;
    if (parsed.data.paymentSource !== undefined)
      updates.payment_source = parsed.data.paymentSource;
    if (parsed.data.occurredOn !== undefined)
      updates.occurred_on = parsed.data.occurredOn;
    if (parsed.data.occurredTime !== undefined)
      updates.occurred_time = parsed.data.occurredTime || null;
    if (parsed.data.merchant !== undefined)
      updates.merchant = parsed.data.merchant || null;
    if (parsed.data.note !== undefined) updates.note = parsed.data.note || null;

    const wantsSplitChange =
      parsed.data.splitPlan !== undefined ||
      parsed.data.amountSen !== undefined;

    if (wantsSplitChange) {
      const { data: current, error: fetchErr } = await req.supabase
        .from("transactions")
        .select("amount_paid, split_mode, split_meta")
        .eq("id", req.params.id)
        .single();

      if (fetchErr) {
        if (fetchErr.code === "PGRST116") {
          return res.status(404).json({ error: "Transaction not found." });
        }
        throw fetchErr;
      }

      const effectiveAmount =
        parsed.data.amountSen !== undefined
          ? parsed.data.amountSen
          : current.amount_paid;

      let nextMode;
      let nextMeta;

      if (parsed.data.splitPlan === undefined) {
        nextMode = current.split_mode;
        nextMeta = current.split_meta;
      } else if (parsed.data.splitPlan === null) {
        nextMode = null;
        nextMeta = null;
      } else {
        nextMode = parsed.data.splitPlan.mode;
        nextMeta =
          parsed.data.splitPlan.mode === "equal"
            ? { people: parsed.data.splitPlan.people }
            : { myShareSen: parsed.data.splitPlan.myShareSen };
      }

      if (effectiveAmount != null) {
        const check = validateSplitPlan(
          nextMode ? { mode: nextMode, ...nextMeta } : null,
          effectiveAmount,
        );
        if (!check.ok) {
          return res.status(400).json({ error: check.error });
        }
      }

      if (effectiveAmount != null && nextMode) {
        const computed = computeMyShare(effectiveAmount, nextMode, nextMeta);
        updates.my_share = computed.myShareSen;
      } else if (effectiveAmount != null) {
        updates.my_share = effectiveAmount;
      }

      updates.split_mode = nextMode;
      updates.split_meta = nextMeta;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    const { data, error } = await req.supabase
      .from("transactions")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Transaction not found." });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   POST /api/transactions/:id/retry
   ========================================================= */
router.post("/:id/retry", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("transactions")
      .update({
        status: "pending",
        review_reason: null,
        extraction_attempts: 0,
        next_attempt_at: null,
      })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Transaction not found." });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   POST /api/transactions/:id/resolve
   ========================================================= */
router.post("/:id/resolve", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("transactions")
      .update({ status: "ok", review_reason: null })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Transaction not found." });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   DELETE /api/transactions/:id
   ========================================================= */
router.delete("/:id", async (req, res, next) => {
  try {
    const { data: tx, error: fetchErr } = await req.supabase
      .from("transactions")
      .select("receipt_path")
      .eq("id", req.params.id)
      .single();

    if (fetchErr && fetchErr.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found." });
    }
    if (fetchErr) throw fetchErr;

    const { error } = await req.supabase
      .from("transactions")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    if (tx?.receipt_path) {
      await deleteReceipt(tx.receipt_path).catch(() => {});
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
