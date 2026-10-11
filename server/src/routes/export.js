import express from "express";

const router = express.Router();

/* Escape a value for CSV: wrap in quotes if it contains , " \n */
function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/* =========================================================
   GET /api/export.csv
   Streams a CSV of all of the user's transactions.
   ========================================================= */
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from("transactions")
      .select(
        "id, occurred_on, occurred_time, entry_type, amount_paid, my_share, merchant, category_id, payment_source, note, status, created_at"
      )
      .order("occurred_on", { ascending: false });

    if (error) throw error;

    // Category names for the CSV
    const { data: cats } = await req.supabase
      .from("categories")
      .select("id, name");
    const catName = new Map((cats || []).map((c) => [c.id, c.name]));

    const headers = [
      "date",
      "time",
      "merchant",
      "category",
      "payment_source",
      "amount_paid_rm",
      "my_share_rm",
      "status",
      "review_reason",
      "note",
      "entry_type",
      "id",
      "created_at",
    ];

    const rows = (data || []).map((t) => [
      t.occurred_on,
      t.occurred_time,
      t.merchant,
      catName.get(t.category_id) || "",
      t.payment_source,
      t.amount_paid != null ? (t.amount_paid / 100).toFixed(2) : "",
      t.my_share != null ? (t.my_share / 100).toFixed(2) : "",
      t.status,
      "",
      t.note,
      t.entry_type,
      t.id,
      t.created_at,
    ]);

    const csv =
      [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";

    const filename = `calm-ledger-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
