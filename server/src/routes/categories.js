import express from "express";
import { z } from "zod";

const router = express.Router();

/* ---------- Validation schemas ---------- */
const createSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code like #0F766E")
    .default("#0F766E"),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code like #0F766E")
    .optional(),
});

/* =========================================================
   GET /api/categories
   List all categories belonging to the logged-in user.
   RLS ensures we only get our own rows.
   ========================================================= */
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("categories")
      .select("id, name, color, created_at")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   POST /api/categories
   Create a new category.
   ========================================================= */
router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    const { data, error } = await req.supabase
      .from("categories")
      .insert({
        user_id: req.user.id,
        name: parsed.data.name,
        color: parsed.data.color,
      })
      .select("id, name, color, created_at")
      .single();

    if (error) {
      // Unique constraint violation (name already exists for this user)
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "A category with this name already exists." });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   PATCH /api/categories/:id
   Rename or recolor.
   ========================================================= */
router.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message || "Invalid input",
      });
    }

    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await req.supabase
      .from("categories")
      .update(parsed.data)
      .eq("id", req.params.id)
      .select("id, name, color, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "A category with this name already exists." });
      }
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Category not found." });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   DELETE /api/categories/:id
   If the category has transactions, require ?replaceWith=<id>.
   ========================================================= */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const replaceWith = req.query.replaceWith;

    // Check if category has transactions
    const { count, error: countErr } = await req.supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countErr) throw countErr;

    if ((count || 0) > 0) {
      if (!replaceWith) {
        return res.status(400).json({
          error: `This category has ${count} transaction(s). Provide ?replaceWith=<categoryId> to move them.`,
          transactionCount: count,
        });
      }

      if (replaceWith === id) {
        return res
          .status(400)
          .json({ error: "Cannot replace a category with itself." });
      }

      // Move transactions to replacement category
      const { error: moveErr } = await req.supabase
        .from("transactions")
        .update({ category_id: replaceWith })
        .eq("category_id", id);

      if (moveErr) throw moveErr;
    }

    // Delete the category
    const { error: delErr } = await req.supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;

    res.json({ ok: true, movedTransactions: count || 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
